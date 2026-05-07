"""import-mappings/analyze — 엑셀 업로드 + 프론트와 동일한 위젯 JSON으로 스모크 테스트."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from main import app

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "sample_canvas_widgets.json"


def _load_canvas_widgets() -> list[dict]:
    with FIXTURE.open(encoding="utf-8") as f:
        return json.load(f)


def _widgets_for_analyze_api(canvas: list[dict]) -> str:
    """프론트 WidgetItem(id, type) → analyze 폼 widgets JSON (widget_id, widget_type)."""
    return json.dumps(
        [{"widget_id": w["id"], "widget_type": w["type"]} for w in canvas],
        ensure_ascii=False,
    )


def _sample_xlsx_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "가계부"
    ws.append(["날짜", "항목", "금액", "메모"])
    ws.append(["2026-01-01", "식비", 12000, "점심"])
    ws.append(["2026-01-02", "교통", 2500, "버스"])
    ws.append(["2026-01-03", "문화", 15000, "영화"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_analyze_excel_with_frontend_like_widget_json(client: TestClient) -> None:
    canvas = _load_canvas_widgets()
    widgets_param = _widgets_for_analyze_api(canvas)

    r = client.post(
        "/api/import-mappings/analyze",
        files={
            "file": (
                "sample_budget.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
        },
        data={
            "widgets": widgets_param,
            "persist_mapping": "false",
            "apply_canvas": "false",
            "map_name": "pytest 자동 매핑",
        },
    )

    assert r.status_code == 200, r.text
    body = r.json()

    assert "file_summary" in body
    assert body["file_summary"]["sheets"]
    first = body["file_summary"]["sheets"][0]
    assert first["name"] == "가계부"
    assert first["headers"] == ["날짜", "항목", "금액", "메모"]

    assert "recommendations" in body
    assert len(body["recommendations"]) == len(canvas)

    got_ids = {item["widget_id"] for item in body["recommendations"]}
    expect_ids = {w["id"] for w in canvas}
    assert got_ids == expect_ids

    assert "draft" in body
    assert body["draft"]["map_name"] == "pytest 자동 매핑"
    assert len(body["draft"]["mappings"]) == len(canvas)


def test_fixture_matches_frontend_widget_shape() -> None:
    canvas = _load_canvas_widgets()
    for w in canvas:
        assert "id" in w and "type" in w
        assert "x" in w and "y" in w and "w" in w and "h" in w
        assert "style" in w
        assert "data_binding" in w
