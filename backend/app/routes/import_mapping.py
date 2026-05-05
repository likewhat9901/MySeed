from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter
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
)
async def suggest_import_mappings(
    payload: ImportMappingSuggestRequest,
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
