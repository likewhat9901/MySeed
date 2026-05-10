import json as _json
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from pydantic import AliasChoices, BaseModel, Field

from app.core.config import get_settings
from app.services.aggregation import normalize_aggregation
from app.services.excel_analyzer import (
    SheetSummary,
    find_sheet,
    serialize_summary,
    summarize_workbook,
)
from app.services.excel_grid import build_sheet_matrix, parse_address_to_cells
from app.services.import_mapping_service import (
    get_sheet_range,
    suggest_mapping_address,
)
from app.services.llm_import_mapping import (
    ensure_addresses_parse,
    normalize_widget_type,
    suggest_addresses_with_llm,
)
from app.services.llm_widget_recommendation import recommend_widget_mappings
from app.services.supabase_data import (
    rpc_get_canvas_widgets,
    rpc_replace_canvas_widgets,
    rpc_save_import_mapping,
)
from app.services.widget_binding import (
    build_binding_patch,
    build_binding_with_aggregation,
)

router = APIRouter(tags=["import-mapping"])


class WidgetTarget(BaseModel):
    con_id: UUID = Field(validation_alias=AliasChoices("con_id", "widget_id"))
    widget_type: str


class ImportMappingSuggestRequest(BaseModel):
    map_name: str = Field(default="자동 매핑")
    sheet: str = Field(default="Sheet1")
    headers: list[str] = Field(default_factory=list)
    sample_rows: list[Any] = Field(default_factory=list)
    widgets: list[WidgetTarget] = Field(default_factory=list)
    mem_id: UUID | None = Field(
        default=None,
        description="Supabase 회원 ID(auth user). persist_mapping 시 필요.",
    )
    led_id: UUID | None = Field(
        default=None,
        description="가계부(ledger) ID. apply_canvas 시 필요.",
    )
    persist_mapping: bool = Field(
        default=False,
        description="True이면 save_import_mapping RPC로 템플릿 저장.",
    )
    apply_canvas: bool = Field(
        default=False,
        description="True이면 get_canvas_widgets 후 data_binding 반영하여 replace_canvas_widgets 호출.",
    )


class MappingSuggestion(BaseModel):
    con_id: UUID = Field(description="캔버스 위젯 인스턴스 PK (tb_widget_config.con_id)")
    widget_type: str = Field(description="정규화된 위젯 타입 (예: savings-goal, table, quote)")
    sheet: str = Field(description="요청 본문의 시트 이름")
    address: str = Field(description="엑셀 A1 스타일 주소 (단일 셀 또는 범위, 예: C2:C10)")


class MappingInsight(BaseModel):
    con_id: UUID = Field(description="캔버스 위젯 인스턴스 PK")
    widget_type: str = Field(description="위젯 타입")
    sheet_range: str = Field(
        description="요청에 사용한 헤더+샘플 행이 차지하는 전체 범위 요약 (예: A1:E5)"
    )
    confidence: float = Field(description="해당 주소 추천의 신뢰도 (0.0~1.0)")
    reason: str = Field(description="LLM/휴리스틱이 주소를 고른 근거 (한국어)")


class TbImportMappingsDraft(BaseModel):
    map_id: UUID = Field(
        description="이 응답에서 새로 부여한 템플릿 UUID. persist_mapping 시 DB(map_id)와 동일"
    )
    map_name: str = Field(description="매핑 프리셋 이름")
    mappings: list[MappingSuggestion] = Field(description="위젯별 엑셀 시트·범위 매핑 목록")
    regist_dt: str | None = Field(
        None,
        description="DB에 아직 없으면 null. 저장 후에는 get_import_mappings에서 조회 가능",
    )


class ImportMappingSuggestResponse(BaseModel):
    draft: TbImportMappingsDraft = Field(
        description="템플릿 초안 (con_id·시트·주소). persist 시 그대로 저장되는 구조에 대응"
    )
    insights: list[MappingInsight] = Field(
        description="각 위젯에 대한 시트 범위 개요·신뢰도·설명"
    )
    mapping_saved: bool = Field(
        False,
        description="persist_mapping=true 이고 save_import_mapping이 성공했을 때 true",
    )
    canvas_updated: bool = Field(
        False,
        description="apply_canvas=true 이고 replace_canvas_widgets가 성공했을 때 true",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="mem_id 누락·Supabase 미설정·RPC 실패 등 비치명 메시지",
    )


@router.post(
    "/import-mappings/suggest",
    response_model=ImportMappingSuggestResponse,
    summary="엑셀 컬럼 자동 매핑 제안 (LLM + 휴리스틱)",
    description=(
        "헤더/샘플 행/위젯 목록을 받아 OpenAI로 주소를 추천하고, "
        "요청 시 `save_import_mapping`으로 템플릿을 저장하고 "
        "`replace_canvas_widgets`로 위젯 data_binding을 갱신합니다."
    ),
)
async def suggest_import_mappings(
    payload: ImportMappingSuggestRequest = Body(
        ...,
        examples={
            "basic": {
                "summary": "초안만 (저장·캔버스 반영 없음)",
                "value": {
                    "map_name": "월급 명세서 자동 매핑",
                    "sheet": "Sheet1",
                    "headers": ["날짜", "항목", "금액", "메모"],
                    "sample_rows": [
                        ["2026-01-01", "식비", 12000, "점심"],
                        ["2026-01-02", "교통", 2500, "버스"],
                    ],
                    "widgets": [
                        {
                            "con_id": "9c39c8fd-24b1-42a7-af54-7e9372fa0021",
                            "widget_type": "savings-goal",
                        },
                        {
                            "con_id": "09af7b57-6995-4c88-b4bc-7e9bad0e227b",
                            "widget_type": "table",
                        },
                    ],
                },
            },
            "persist": {
                "summary": "저장 + 캔버스 반영",
                "value": {
                    "map_name": "월급 명세서",
                    "sheet": "Sheet1",
                    "headers": ["날짜", "항목", "금액"],
                    "sample_rows": [["2026-01-01", "식비", 12000]],
                    "widgets": [
                        {
                            "con_id": "9c39c8fd-24b1-42a7-af54-7e9372fa0021",
                            "widget_type": "savings-goal",
                        },
                    ],
                    "mem_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                    "led_id": "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
                    "persist_mapping": True,
                    "apply_canvas": True,
                },
            },
        },
    ),
) -> ImportMappingSuggestResponse:
    warnings: list[str] = []
    if not payload.widgets:
        raise HTTPException(status_code=400, detail="widgets must be non-empty")

    widget_pairs = [(w.con_id, w.widget_type) for w in payload.widgets]
    grid = build_sheet_matrix(payload.headers, payload.sample_rows)
    sheet_range_overview = get_sheet_range(payload.headers, payload.sample_rows)

    resolved = await suggest_addresses_with_llm(
        sheet=payload.sheet,
        headers=payload.headers,
        sample_rows=payload.sample_rows,
        widgets=widget_pairs,
    )
    resolved = ensure_addresses_parse(
        grid=grid,
        by_id=resolved,
        widgets=widget_pairs,
        headers=payload.headers,
        sample_rows=payload.sample_rows,
    )

    results: list[MappingSuggestion] = []
    insights: list[MappingInsight] = []

    for w in payload.widgets:
        wtype = normalize_widget_type(w.widget_type)
        address, confidence, reason = resolved[w.con_id]
        results.append(
            MappingSuggestion(
                con_id=w.con_id,
                widget_type=wtype,
                sheet=payload.sheet,
                address=address,
            )
        )
        insights.append(
            MappingInsight(
                con_id=w.con_id,
                widget_type=wtype,
                sheet_range=sheet_range_overview,
                confidence=confidence,
                reason=reason,
            )
        )

    map_id = uuid4()
    draft = TbImportMappingsDraft(
        map_id=map_id,
        map_name=payload.map_name,
        mappings=results,
        regist_dt=None,
    )

    settings = get_settings()
    mapping_saved = False
    canvas_updated = False

    if payload.persist_mapping:
        if not payload.mem_id:
            warnings.append("persist_mapping이 True인데 mem_id가 없어 저장을 건너뜁니다.")
        elif not settings.supabase_configured():
            warnings.append("Supabase 환경변수가 없어 save_import_mapping을 호출하지 않습니다.")
        else:
            rows_for_db = [
                {
                    "con_id": str(m.con_id),
                    "widget_type": m.widget_type,
                    "sheet": m.sheet,
                    "address": m.address,
                }
                for m in results
            ]
            try:
                saved_id = rpc_save_import_mapping(
                    mem_id=payload.mem_id,
                    map_id=map_id,
                    map_name=payload.map_name,
                    mappings=rows_for_db,
                )
                mapping_saved = saved_id is not None
                if not mapping_saved:
                    warnings.append("save_import_mapping이 map_id를 반환하지 않았습니다.")
            except Exception as e:
                warnings.append(f"save_import_mapping 실패: {e!s}")

    if payload.apply_canvas:
        if not payload.led_id:
            warnings.append("apply_canvas가 True인데 led_id가 없어 캔버스를 갱신하지 않습니다.")
        elif not settings.supabase_configured():
            warnings.append("Supabase 환경변수가 없어 replace_canvas_widgets를 호출하지 않습니다.")
        else:
            try:
                canvas_rows = rpc_get_canvas_widgets(payload.led_id)
            except Exception as e:
                warnings.append(f"get_canvas_widgets 실패: {e!s}")
                canvas_rows = []

            if not canvas_rows:
                warnings.append("ledger에 위젯이 없어 캔버스 갱신을 건너뜁니다.")
            else:
                addr_by_con = {m.con_id: m.address for m in results}
                configs: list[dict[str, Any]] = []

                for row in canvas_rows:
                    r = dict(row)
                    try:
                        cid = UUID(str(r["con_id"]))
                    except (KeyError, ValueError):
                        configs.append(r)
                        continue

                    if cid not in addr_by_con:
                        configs.append(r)
                        continue

                    parsed = parse_address_to_cells(grid, addr_by_con[cid])
                    if not parsed:
                        configs.append(r)
                        continue

                    wid_type = str(r.get("wid_type", ""))
                    patch = build_binding_patch(wid_type, parsed, r.get("data_binding"))
                    if patch is not None:
                        r["data_binding"] = patch
                    configs.append(r)

                if configs and rpc_replace_canvas_widgets(payload.led_id, configs):
                    canvas_updated = True
                elif configs:
                    warnings.append("replace_canvas_widgets가 실패했습니다.")

    return ImportMappingSuggestResponse(
        draft=draft,
        insights=insights,
        mapping_saved=mapping_saved,
        canvas_updated=canvas_updated,
        warnings=warnings,
    )


# ─── /analyze: 엑셀 파일을 직접 받아 위젯별 추천(시트·범위·집계·표현) ────────────


class AnalyzeMapping(BaseModel):
    con_id: UUID = Field(description="캔버스 위젯 인스턴스 PK")
    widget_type: str = Field(description="정규화된 위젯 타입")
    sheet: str = Field(description="추천이 적용되는 엑셀 시트 이름")
    address: str = Field(description="엑셀 A1 스타일 범위")
    aggregation: str = Field(
        description="집계 방식 (none|sum|avg|…). 테이블·리스트류는 보통 none"
    )
    display_form: str = Field(description="데이터 표현 힌트 (single|table|list|text 등)")


class AnalyzeRecommendation(BaseModel):
    con_id: UUID = Field(description="캔버스 위젯 인스턴스 PK")
    widget_type: str = Field(description="위젯 타입")
    sheet: str = Field(description="선택된 시트 이름")
    address: str = Field(description="읽을 셀/범위")
    aggregation: str = Field(description="적용 권장 집계 방식")
    display_form: str = Field(description="위젯에 맞는 표현 형태")
    confidence: float = Field(description="추천 신뢰도 (0~1)")
    reason: str = Field(description="추천 근거 (한국어)")
    preview: Any = Field(
        None,
        description="파싱된 값의 앞부분 샘플(최대 ~20개). 디버깅·미리보기용 JSON",
    )


class AnalyzeDraft(BaseModel):
    map_id: UUID = Field(description="이번 분석에서 발급한 템플릿 UUID. persist 시 DB와 동일")
    map_name: str = Field(description="요청 폼의 map_name")
    mappings: list[AnalyzeMapping] = Field(description="persist 직전 형태의 위젯별 매핑(집계·표현 포함)")
    regist_dt: str | None = Field(
        None,
        description="미저장 응답에서는 null",
    )


class AnalyzeResponse(BaseModel):
    file_summary: dict[str, Any] = Field(
        description="업로드한 통합문서 요약 JSON (시트명·헤더·샘플·컬럼 프로필 등)"
    )
    recommendations: list[AnalyzeRecommendation] = Field(
        description="각 위젯에 대한 시트·범위·집계·표현 및 미리보기"
    )
    draft: AnalyzeDraft = Field(description="save_import_mapping에 넣기 좋은 mappings 초안")
    mapping_saved: bool = Field(False, description="persist_mapping 성공 여부")
    canvas_updated: bool = Field(False, description="apply_canvas 성공 여부")
    warnings: list[str] = Field(
        default_factory=list,
        description="헤더 검증 실패·대체 추천·Supabase SKIP 등 안내",
    )


def _default_recommendation_for_sheet(
    con_id: UUID,
    widget_type: str,
    sheet: SheetSummary,
) -> tuple[str, str, str, float, str]:
    """Returns (address, aggregation, display_form, confidence, reason) heuristically."""
    headers = sheet.headers
    sample = [list(r) for r in sheet.sample_rows]
    _range, address, conf, reason = suggest_mapping_address(
        widget_type=widget_type, headers=headers, sample_rows=sample
    )

    wt = widget_type
    if wt == "table":
        return address, "none", "table", conf, reason
    if wt == "check-list":
        return address, "none", "list", conf, reason
    if wt == "post-it":
        return address, "none", "list", conf, reason
    if wt == "savings-goal":
        return address, "sum", "single", conf, reason + " (집계 기본값: sum)"
    if wt == "quote":
        return address, "first", "text", conf, reason + " (텍스트 첫 값)"
    return address, "none", "list", conf, reason


def _pick_default_sheet(summary, fallback_name: str | None) -> SheetSummary | None:
    if not summary.sheets:
        return None
    if fallback_name:
        s = find_sheet(summary, fallback_name)
        if s:
            return s
    for s in summary.sheets:
        if s.n_cols and s.headers:
            return s
    return summary.sheets[0]


@router.post(
    "/import-mappings/analyze",
    response_model=AnalyzeResponse,
    summary="엑셀 파일 업로드 → 위젯별 시트·범위·집계 추천 (LLM)",
    description=(
        "Excel(.xlsx) 파일을 multipart로 업로드하면 시트별 컬럼 프로필을 분석한 뒤 "
        "각 위젯에 어떤 시트의 어떤 범위를, 어떤 집계(sum/avg/...)와 표현(table/list/single/text)으로 "
        "넣을지 추천합니다. `persist_mapping=true`이면 `save_import_mapping`로 템플릿 저장, "
        "`apply_canvas=true`이면 `replace_canvas_widgets`로 캔버스 data_binding을 갱신합니다."
    ),
)
async def analyze_excel_file(
    file: UploadFile = File(..., description="Excel(.xlsx) 파일"),
    map_name: str = Form("자동 매핑"),
    widgets: str = Form(
        "[]",
        description='JSON 문자열: [{"con_id":"...","widget_type":"savings-goal"}, ...] (비우면 led_id로 조회; 구형 키 widget_id도 허용)',
    ),
    mem_id: str | None = Form(None, description="persist_mapping 시 필요"),
    led_id: str | None = Form(
        None,
        description="apply_canvas 시 필요. widgets 비어있을 때 캔버스에서 위젯 목록을 자동 조회.",
    ),
    persist_mapping: bool = Form(False),
    apply_canvas: bool = Form(False),
) -> AnalyzeResponse:
    warnings: list[str] = []

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")
    try:
        wb_summary = summarize_workbook(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"엑셀 파싱 실패: {e!s}") from e
    if not wb_summary.sheets:
        raise HTTPException(status_code=400, detail="엑셀에 시트가 없습니다")

    try:
        widgets_raw = _json.loads(widgets) if widgets else []
        if not isinstance(widgets_raw, list):
            raise ValueError("widgets must be a JSON array")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"widgets JSON 파싱 실패: {e!s}") from e

    led_uuid: UUID | None = None
    if led_id:
        try:
            led_uuid = UUID(led_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"led_id 형식 오류: {e!s}") from e
    mem_uuid: UUID | None = None
    if mem_id:
        try:
            mem_uuid = UUID(mem_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"mem_id 형식 오류: {e!s}") from e

    settings = get_settings()
    widget_pairs: list[tuple[UUID, str]] = []
    canvas_rows_cache: list[dict[str, Any]] | None = None

    if widgets_raw:
        for w in widgets_raw:
            if not isinstance(w, dict):
                continue
            raw_id = w.get("con_id", w.get("widget_id"))
            if raw_id is None:
                continue
            try:
                cid = UUID(str(raw_id))
            except ValueError:
                continue
            wtype = normalize_widget_type(str(w.get("widget_type", "")))
            widget_pairs.append((cid, wtype))
    elif led_uuid and settings.supabase_configured():
        try:
            canvas_rows_cache = rpc_get_canvas_widgets(led_uuid)
        except Exception as e:
            warnings.append(f"get_canvas_widgets 실패: {e!s}")
            canvas_rows_cache = []
        for row in canvas_rows_cache or []:
            try:
                wid = UUID(str(row["con_id"]))
            except (KeyError, ValueError):
                continue
            wtype = normalize_widget_type(str(row.get("wid_type", "")))
            widget_pairs.append((wid, wtype))
    else:
        raise HTTPException(
            status_code=400,
            detail="widgets 또는 (led_id + Supabase 설정) 중 하나가 필요합니다",
        )

    if not widget_pairs:
        raise HTTPException(status_code=400, detail="추천할 위젯이 없습니다")

    workbook_serialized = serialize_summary(wb_summary)
    llm_recs = await recommend_widget_mappings(
        workbook_summary=workbook_serialized,
        widgets=widget_pairs,
    )
    rec_by_id = {UUID(r.con_id.strip()): r for r in llm_recs if r.con_id.strip()}

    recommendations: list[AnalyzeRecommendation] = []
    mappings_for_db: list[dict[str, Any]] = []
    mappings_for_draft: list[AnalyzeMapping] = []
    bindings_to_apply: list[tuple[UUID, str, str, str, list[Any]]] = []
    # tuple: (con_id, widget_type, sheet_name, aggregation, parsed_values)

    for wid, wtype in widget_pairs:
        rec = rec_by_id.get(wid)
        chosen_sheet: SheetSummary | None = None
        if rec:
            chosen_sheet = find_sheet(wb_summary, rec.sheet)
        if chosen_sheet is None:
            chosen_sheet = _pick_default_sheet(wb_summary, rec.sheet if rec else None)

        if chosen_sheet is None:
            warnings.append(f"{wid}: 사용 가능한 시트를 찾지 못해 건너뜁니다.")
            continue

        sheet_grid = build_sheet_matrix(
            chosen_sheet.headers, [list(r) for r in chosen_sheet.sample_rows]
        )

        if rec:
            address = rec.address.strip().upper().replace("$", "")
            aggregation = normalize_aggregation(rec.aggregation)
            display_form = rec.display_form or ""
            confidence = float(rec.confidence)
            reason = rec.reason or "LLM 추천"
        else:
            address, aggregation, display_form, confidence, reason = (
                _default_recommendation_for_sheet(wid, wtype, chosen_sheet)
            )

        parsed = parse_address_to_cells(sheet_grid, address)
        if parsed is None:
            fb_addr, fb_agg, fb_form, fb_conf, fb_reason = (
                _default_recommendation_for_sheet(wid, wtype, chosen_sheet)
            )
            warnings.append(
                f"{wid}: 추천 주소 '{address}'가 유효하지 않아 휴리스틱으로 대체."
            )
            address, aggregation, display_form = fb_addr, fb_agg, fb_form
            confidence = min(confidence, fb_conf)
            reason = f"{reason} | 대체: {fb_reason}"
            parsed = parse_address_to_cells(sheet_grid, address)

        if parsed is None:
            warnings.append(f"{wid}: 주소 파싱 불가, 추천에서 제외.")
            continue

        if wtype in {"table", "check-list", "post-it"} and aggregation != "none":
            aggregation = "none"

        recommendations.append(
            AnalyzeRecommendation(
                con_id=wid,
                widget_type=wtype,
                sheet=chosen_sheet.name,
                address=address,
                aggregation=aggregation,
                display_form=display_form or "",
                confidence=confidence,
                reason=reason,
                preview=parsed.values[:20] if isinstance(parsed.values, list) else None,
            )
        )
        mappings_for_draft.append(
            AnalyzeMapping(
                con_id=wid,
                widget_type=wtype,
                sheet=chosen_sheet.name,
                address=address,
                aggregation=aggregation,
                display_form=display_form or "",
            )
        )
        mappings_for_db.append(
            {
                "con_id": str(wid),
                "widget_type": wtype,
                "sheet": chosen_sheet.name,
                "address": address,
                "aggregation": aggregation,
                "display_form": display_form or "",
            }
        )
        bindings_to_apply.append(
            (wid, wtype, chosen_sheet.name, aggregation, parsed.values)
        )

    if not recommendations:
        raise HTTPException(status_code=422, detail="추천 결과가 없습니다")

    map_id = uuid4()
    draft = AnalyzeDraft(
        map_id=map_id,
        map_name=map_name,
        mappings=mappings_for_draft,
        regist_dt=None,
    )

    mapping_saved = False
    canvas_updated = False

    if persist_mapping:
        if not mem_uuid:
            warnings.append("persist_mapping이 True인데 mem_id가 없어 저장을 건너뜁니다.")
        elif not settings.supabase_configured():
            warnings.append("Supabase 환경변수가 없어 save_import_mapping을 호출하지 않습니다.")
        else:
            try:
                saved_id = rpc_save_import_mapping(
                    mem_id=mem_uuid,
                    map_id=map_id,
                    map_name=map_name,
                    mappings=mappings_for_db,
                )
                mapping_saved = saved_id is not None
                if not mapping_saved:
                    warnings.append("save_import_mapping이 map_id를 반환하지 않았습니다.")
            except Exception as e:
                warnings.append(f"save_import_mapping 실패: {e!s}")

    if apply_canvas:
        if not led_uuid:
            warnings.append("apply_canvas가 True인데 led_id가 없어 캔버스를 갱신하지 않습니다.")
        elif not settings.supabase_configured():
            warnings.append(
                "Supabase 환경변수가 없어 replace_canvas_widgets를 호출하지 않습니다."
            )
        else:
            if canvas_rows_cache is None:
                try:
                    canvas_rows_cache = rpc_get_canvas_widgets(led_uuid)
                except Exception as e:
                    warnings.append(f"get_canvas_widgets 실패: {e!s}")
                    canvas_rows_cache = []

            if not canvas_rows_cache:
                warnings.append("ledger에 위젯이 없어 캔버스 갱신을 건너뜁니다.")
            else:
                bindings_by_wid: dict[UUID, tuple[str, str, list[Any]]] = {}
                for wid, _wtype, sname, agg, vals in bindings_to_apply:
                    bindings_by_wid[wid] = (sname, agg, vals)

                configs: list[dict[str, Any]] = []
                for row in canvas_rows_cache:
                    r = dict(row)
                    try:
                        cid = UUID(str(r["con_id"]))
                    except (KeyError, ValueError):
                        configs.append(r)
                        continue

                    if cid not in bindings_by_wid:
                        configs.append(r)
                        continue

                    sname, agg, vals = bindings_by_wid[cid]
                    sheet_obj = find_sheet(wb_summary, sname)
                    if sheet_obj is None:
                        configs.append(r)
                        continue

                    sheet_grid = build_sheet_matrix(
                        sheet_obj.headers, [list(rr) for rr in sheet_obj.sample_rows]
                    )
                    # use the same address we recommended to re-parse against the sheet grid
                    rec_for_wid = next(
                        (rc for rc in recommendations if rc.con_id == cid), None
                    )
                    if rec_for_wid is None:
                        configs.append(r)
                        continue
                    parsed = parse_address_to_cells(sheet_grid, rec_for_wid.address)
                    if parsed is None:
                        configs.append(r)
                        continue

                    wid_type = normalize_widget_type(str(r.get("wid_type", "")))
                    if agg == "none":
                        patch = build_binding_patch(wid_type, parsed, r.get("data_binding"))
                    else:
                        patch = build_binding_with_aggregation(
                            wid_type, parsed, agg, r.get("data_binding")
                        )
                    if patch is not None:
                        r["data_binding"] = patch
                    configs.append(r)

                if configs and rpc_replace_canvas_widgets(led_uuid, configs):
                    canvas_updated = True
                elif configs:
                    warnings.append("replace_canvas_widgets가 실패했습니다.")

    if not settings.openai_api_key:
        warnings.append("OPENAI_API_KEY가 없어 휴리스틱 추천만 사용했습니다.")

    return AnalyzeResponse(
        file_summary=workbook_serialized,
        recommendations=recommendations,
        draft=draft,
        mapping_saved=mapping_saved,
        canvas_updated=canvas_updated,
        warnings=warnings,
    )
