from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Body
from pydantic import BaseModel, Field

from app.services.import_mapping_service import suggest_mapping_address

router = APIRouter(tags=["import-mapping"])


class WidgetTarget(BaseModel):
    widget_id: UUID
    widget_type: str


class ImportMappingSuggestRequest(BaseModel):
    map_name: str = Field(default="자동 매핑")
    sheet: str = Field(default="Sheet1")
    headers: list[str] = Field(default_factory=list)
    sample_rows: list[Any] = Field(default_factory=list)
    widgets: list[WidgetTarget] = Field(default_factory=list)


class MappingSuggestion(BaseModel):
    widget_id: UUID
    widget_type: str
    sheet: str
    address: str


class MappingInsight(BaseModel):
    widget_id: UUID
    widget_type: str
    sheet_range: str
    confidence: float
    reason: str


class TbImportMappingsDraft(BaseModel):
    map_id: UUID
    map_name: str
    mappings: list[MappingSuggestion]
    regist_dt: str | None = None


class ImportMappingSuggestResponse(BaseModel):
    draft: TbImportMappingsDraft
    insights: list[MappingInsight]


@router.post(
    "/import-mappings/suggest",
    response_model=ImportMappingSuggestResponse,
    summary="엑셀 컬럼 자동 매핑 제안",
    description=(
        "헤더/샘플 데이터/위젯 목록을 받아 `tb_import_mappings` 저장용 draft와 "
        "추천 근거(insights)를 반환합니다."
    ),
)
async def suggest_import_mappings(
    payload: ImportMappingSuggestRequest = Body(
        ...,
        examples={
            "basic": {
                "summary": "기본 테스트 예시",
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
                            "widget_id": "9c39c8fd-24b1-42a7-af54-7e9372fa0021",
                            "widget_type": "savings-goal",
                        },
                        {
                            "widget_id": "09af7b57-6995-4c88-b4bc-7e9bad0e227b",
                            "widget_type": "table",
                        },
                    ],
                },
            }
        },
    ),
) -> ImportMappingSuggestResponse:
    results: list[MappingSuggestion] = []
    insights: list[MappingInsight] = []

    for widget in payload.widgets:
        sheet_range, address, confidence, reason = suggest_mapping_address(
            widget_type=widget.widget_type,
            headers=payload.headers,
            sample_rows=payload.sample_rows,
        )
        results.append(
            MappingSuggestion(
                widget_id=widget.widget_id,
                widget_type=widget.widget_type,
                sheet=payload.sheet,
                address=address,
            )
        )
        insights.append(
            MappingInsight(
                widget_id=widget.widget_id,
                widget_type=widget.widget_type,
                sheet_range=sheet_range,
                confidence=confidence,
                reason=reason,
            )
        )

    return ImportMappingSuggestResponse(
        draft=TbImportMappingsDraft(
            map_id=uuid4(),
            map_name=payload.map_name,
            mappings=results,
            regist_dt=None,
        ),
        insights=insights,
    )
