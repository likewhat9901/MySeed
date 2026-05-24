"""카드/은행 명세: DB `tb_card` 헤더(날짜·가맹점·금액)·파일 열 이름 매칭 후 `tb_record` 적재."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.card_statement_parse import import_card_to_column_map
from app.services.excel_record_import import build_record_rows, read_sheet_tabular
from app.services.supabase_data import fetch_tb_card, insert_tb_records

router = APIRouter(tags=["card-statements"])


class CardStatementNormalizedRow(BaseModel):
    date: str = Field(description="ISO 날짜 YYYY-MM-DD")
    amount: float = Field(description="금액")
    merchant: str = Field(description="가맹점·title")
    excel_row: int = Field(description="엑셀 행 번호(1부터)")


class CardStatementResponse(BaseModel):
    """파싱·적재 결과. `dry_run=true` 일 때만 `rows` 채워짐."""

    inserted: int = Field(0, description="새로 넣은 tb_record 건수")
    skipped_estimate: int = Field(0, description="건너뛴 행 추정치")
    ledger_id: str = Field(description="가계부 UUID")
    sheet: str = Field(description="읽은 시트 이름")
    header_row: int = Field(description="헤더로 인식한 행 번호(1부터)")
    warnings: list[str] = Field(default_factory=list)
    rec_ids_sample: list[str] = Field(default_factory=list, description="생성된 rec_id 앞쪽 샘플(최대 100)")
    dry_run: bool = Field(False, description="true면 삽입 없음")
    rows: list[CardStatementNormalizedRow] = Field(
        default_factory=list,
        description="미리보기 파싱 행 (`dry_run=true` 일 때만)",
    )
    card: dict[str, Any] = Field(default_factory=dict, description="매칭된 tb_card 요약")


def _preview_from_sql_rows(rows_sql: list[dict[str, Any]]) -> list[CardStatementNormalizedRow]:
    preview: list[CardStatementNormalizedRow] = []
    for r in rows_sql:
        d = r.get("data")
        if not isinstance(d, dict):
            continue
        eraw = d.get("excel_row", 0)
        try:
            erow = int(eraw) if eraw is not None else 0
        except (TypeError, ValueError):
            erow = 0
        preview.append(
            CardStatementNormalizedRow(
                date=str(d.get("date") or ""),
                amount=float(d.get("amount") or 0),
                merchant=str(d.get("title") or ""),
                excel_row=erow,
            )
        )
    return preview


def _card_meta(card_row: dict[str, Any]) -> dict[str, Any]:
    return {
        "card_id": card_row.get("card_id"),
        "card_name": card_row.get("card_name"),
        "header_date": card_row.get("header_date"),
        "header_merchant": card_row.get("header_merchant"),
        "header_amount": card_row.get("header_amount"),
    }


@router.post(
    "/card-statement",
    summary="카드/은행 명세 xlsx/xls → 파싱 및 tb_record 적재(단일 API)",
    description=(
        "`tb_card`에 저장된 날짜·가맹점·금액 **헤더 문자열**(은행별)과 같은 열 이름을 파일에서 찾아 "
        "`data.date`·`data.title`(가맹점)·`data.amount`로 적재합니다. "
        "`dry_run=true`면 삽입 없이 `rows` 미리보기."
    ),
    response_model=CardStatementResponse,
)
async def card_statement_import(
    file: UploadFile = File(..., description="Excel (.xlsx 또는 레거시 .xls)"),
    card_company: str = Form(..., description="tb_card.card_name 또는 card_id(UUID)"),
    ledger_id: str = Form(..., description="tb_ledger UUID"),
    data_type: str = Form("expense", description="tb_record.data_type"),
    file_id: str | None = Form(None, description="선택 — tb_file 연결"),
    skip_empty_amount: bool = Form(True),
    dry_run: bool = Form(False, description="true면 삽입 생략·rows 미리보기"),
) -> CardStatementResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(
            status_code=503,
            detail="Supabase 미설치(SUPABASE_URL / SERVICE_ROLE_KEY)",
        )

    fname = (file.filename or "").lower()
    if not (fname.endswith(".xlsx") or fname.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail=".xlsx 또는 .xls 파일만 지원합니다",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty file")

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

    try:
        card_row = fetch_tb_card(card_company)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"카드 조회 실패: {e!s}") from e

    if not card_row:
        raise HTTPException(
            status_code=404,
            detail=f"등록된 카드를 찾을 수 없습니다: {card_company!r}",
        )

    cmap = import_card_to_column_map(card_row)
    sheet_used, hdr_row, headers, data_rows = read_sheet_tabular(raw, None)
    if not sheet_used:
        raise HTTPException(status_code=400, detail="엑셀 시트를 읽을 수 없거나 시트가 없습니다")
    if not headers:
        raise HTTPException(status_code=400, detail="헤더를 찾지 못했습니다")

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
        data_source="card_statement_import",
    )

    total_body = len(data_rows)
    meta_card = _card_meta(card_row)
    preview = _preview_from_sql_rows(rows_to_insert) if dry_run else []

    if dry_run:
        return CardStatementResponse(
            inserted=0,
            skipped_estimate=max(0, total_body - len(rows_to_insert)),
            ledger_id=str(led_uuid),
            sheet=sheet_used,
            header_row=hdr_row,
            warnings=parse_warnings,
            rec_ids_sample=[],
            dry_run=True,
            rows=preview,
            card=meta_card,
        )

    if not rows_to_insert:
        detail = parse_warnings[-1] if parse_warnings else "파싱 결과가 비었습니다."
        raise HTTPException(status_code=422, detail=detail)

    try:
        rec_ids = insert_tb_records(rows_to_insert)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"tb_record 삽입 실패: {e!s}") from e

    inserted_count = len(rec_ids) if rec_ids else len(rows_to_insert)
    return CardStatementResponse(
        inserted=inserted_count,
        skipped_estimate=max(0, total_body - len(rows_to_insert)),
        ledger_id=str(led_uuid),
        sheet=sheet_used,
        header_row=hdr_row,
        warnings=parse_warnings,
        rec_ids_sample=rec_ids[:100],
        dry_run=False,
        rows=[],
        card=meta_card,
    )
