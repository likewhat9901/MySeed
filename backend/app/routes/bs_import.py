"""가계부 엑셀(`가계부 내역` 시트) → `tb_record` 적재."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.bs_household_import import build_tb_rows_from_bs_household_excel
from app.services.supabase_data import insert_tb_records

router = APIRouter(tags=["bs-import"])


class BsImportResponse(BaseModel):
    inserted: int = Field(description="삽입한 tb_record 개수")
    warnings: list[str] = Field(default_factory=list)


@router.post(
    "/bsimport",
    summary="가계부 엑셀(`가계부 내역`) → tb_record",
    description=(
        "시트 이름 `가계부 내역`(없으면 파일의 두 번째 시트)에서 "
        "날짜·시간·타입·대분류·내용·금액·화폐·결제수단·메모 열을 읽어 적재합니다. "
        "`tb_record.data_type`은 타입 열에서 지출/수입을 추정할 수 있으면 expense|income, "
        "아니면 bsimport 입니다."
    ),
    response_model=BsImportResponse,
)
async def import_household_book(
    file: UploadFile = File(...),
    ledger_id: str = Form(..., description="tb_ledger UUID"),
) -> BsImportResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요",
        )

    fname = (file.filename or "").lower()
    if not (fname.endswith(".xlsx") or fname.endswith(".xls")):
        raise HTTPException(status_code=400, detail=".xlsx 또는 .xls 만 지원합니다")

    try:
        led = UUID(ledger_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"ledger_id UUID 오류: {e}") from e

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="파일 내용 없음")

    rows_sql, warns = build_tb_rows_from_bs_household_excel(led_id=led, excel_bytes=raw)

    if not rows_sql:
        tail = warns[-10:] if len(warns) > 10 else warns
        msg = "유효한 행이 없습니다."
        if tail:
            msg += " " + " | ".join(tail)
        raise HTTPException(status_code=422, detail=msg)

    try:
        rec_ids = insert_tb_records(rows_sql)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"삽입 실패: {e}") from e

    n = len(rec_ids) if rec_ids else len(rows_sql)
    return BsImportResponse(inserted=n, warnings=warns)
