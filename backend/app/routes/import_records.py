"""엑셀 업로드 → tb_record 행 적재."""

from __future__ import annotations

import json as _json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.openapi.inline_responses import RESPONSE_POST_IMPORT_RECORDS
from app.services.excel_record_import import (
    RECORD_ROLES_AMOUNT,
    RECORD_ROLES_CATEGORY,
    RECORD_ROLES_DATE,
    RECORD_ROLES_MEMO,
    RECORD_ROLES_TITLE,
    build_record_rows,
    read_sheet_tabular,
)
from app.services.supabase_data import insert_tb_records

router = APIRouter(tags=["import-records"])


class ImportRecordsResponse(BaseModel):
    inserted: int = Field(description="가계부 거래 기록으로 새로 넣은 줄의 개수")
    skipped_estimate: int = Field(
        description="엑셀에 있던 본문 줄 수 가운데, 넣지 않고 건너뛴 줄 수의 어림값(금액 빈칸·날짜 없음 등)"
    )
    ledger_id: str = Field(description="어느 가계부에 넣었는지 가리키는 번호(문자열)")
    sheet: str = Field(description="실제로 읽어 들인 엑셀 시트 이름")
    header_row: int = Field(
        description="맨 위 제목 줄로 인식한 줄 번호(엑셀에서 보는 행 번호, 1부터 시작)"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="열 이름이 안 맞거나 날짜가 비어 넘겼다 같은 주의 사항 문장들",
    )
    rec_ids_sample: list[str] = Field(
        default_factory=list,
        description="새로 들어간 기록마다 붙는 내부 번호를, 앞쪽 일부만 목록으로 보여 준 것(최대 100개)",
    )
    dry_run: bool = Field(
        False,
        description="맞는지 확인만 하고 실제로 DB에 넣지는 않았는지 여부",
    )


@router.post(
    "/import/records",
    responses=RESPONSE_POST_IMPORT_RECORDS,
    summary="엑셀 업로드 → tb_record 적재",
    description=(
        "업로드한 스프레드시트 한 시트에서 헤더 행 아래 각 행을 읽어 `tb_record`에 넣습니다. "
        "Supabase 서비스 롤이 필요합니다. `column_map`은 헤더 셀 문구와 필드 매핑입니다:\n"
        f"- `{RECORD_ROLES_DATE}` (필수), `{RECORD_ROLES_AMOUNT}` (필수),\n"
        f"- 선택: `{RECORD_ROLES_TITLE}`, `{RECORD_ROLES_MEMO}`, `{RECORD_ROLES_CATEGORY}`.\n"
        "예: {\"date\":\"날짜\",\"amount\":\"금액\",\"title\":\"항목\",\"memo\":\"메모\"}"
    ),
)
async def import_records_from_excel(
    file: UploadFile = File(..., description="Excel (.xlsx)"),
    ledger_id: str = Form(..., description="tb_ledger UUID"),
    column_map: str = Form(
        ...,
        description='JSON: {"date":"헤더","amount":"헤더", ...}',
    ),
    sheet_name: str | None = Form(
        None,
        description="시트 이름 없으면 첫 번째 시트",
    ),
    data_type: str = Form(
        "expense",
        description="tb_record.data_type 값 (예: expense, income, import 등)",
    ),
    file_id: str | None = Form(
        None,
        description="선택 tb_file UUID — 있으면 record.file_id 에 연결",
    ),
    skip_empty_amount: bool = Form(True, description="금액 빈 행 무시"),
    dry_run: bool = Form(False, description="파싱만 하고 삽입 생략"),
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="Supabase 미설치(SUPABASE_URL / SERVICE_ROLE_KEY)")

    try:
        led_uuid = UUID(ledger_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"ledger_id 형식 오류: {e!s}") from e

    file_uuid: UUID | None = None
    if file_id:
        try:
            file_uuid = UUID(file_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"file_id 형식 오류: {e!s}") from e

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")

    sheet_used, hdr_row, headers, data_rows = read_sheet_tabular(content, sheet_name)
    if not sheet_used:
        raise HTTPException(status_code=400, detail="엑셀 시트를 읽을 수 없거나 시트가 없습니다")
    if not headers:
        raise HTTPException(status_code=400, detail="헤더를 찾지 못했습니다")

    try:
        cmap_raw = _json.loads(column_map)
        if not isinstance(cmap_raw, dict):
            raise ValueError("column_map은 JSON 객체여야 합니다")
        cmap: dict[str, str] = {str(k): str(v or "") for k, v in cmap_raw.items()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"column_map JSON 오류: {e!s}") from e

    rows_to_insert, parse_warnings = build_record_rows(
        led_id=led_uuid,
        data_type=data_type.strip() or "import",
        sheet=sheet_used,
        header_row_1based=hdr_row,
        headers=headers,
        data_rows=data_rows,
        column_map=cmap,
        file_id=file_uuid,
        skip_empty_amount=skip_empty_amount,
    )

    all_warnings = list(parse_warnings)

    if dry_run:
        total_body = len(data_rows)
        return ImportRecordsResponse(
            inserted=0,
            skipped_estimate=max(0, total_body - len(rows_to_insert)),
            ledger_id=str(led_uuid),
            sheet=sheet_used,
            header_row=hdr_row,
            warnings=all_warnings,
            rec_ids_sample=[],
            dry_run=True,
        ).model_dump(mode="json")

    if not rows_to_insert:
        raise HTTPException(
            status_code=422,
            detail=all_warnings[-1]
            if all_warnings
            else "매핑·데이터 결과가 비어 있습니다. 헤더·column_map 확인",
        )

    try:
        rec_ids = insert_tb_records(rows_to_insert)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"tb_record 삽입 실패: {e!s}",
        ) from e

    total_body = len(data_rows)
    inserted_count = len(rec_ids) if rec_ids else len(rows_to_insert)
    return ImportRecordsResponse(
        inserted=inserted_count,
        skipped_estimate=max(0, total_body - len(rows_to_insert)),
        ledger_id=str(led_uuid),
        sheet=sheet_used,
        header_row=hdr_row,
        warnings=all_warnings,
        rec_ids_sample=rec_ids[:100],
        dry_run=False,
    ).model_dump(mode="json")
