import re
from difflib import SequenceMatcher
from typing import Any


WIDGET_KEYWORDS: dict[str, list[str]] = {
    "savings-goal": [
        "saving",
        "savings",
        "goal",
        "budget",
        "target",
        "저축",
        "목표",
        "예산",
    ],
    "table": [
        "table",
        "row",
        "amount",
        "date",
        "memo",
        "expense",
        "income",
        "금액",
        "일자",
        "메모",
        "지출",
        "수입",
    ],
    "checklist": ["check", "todo", "task", "완료", "할일", "체크"],
    "checkList": ["check", "todo", "task", "완료", "할일", "체크"],
}


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9가-힣]+", "", value.strip().lower())


def _column_to_excel_label(index_zero_based: int) -> str:
    n = index_zero_based + 1
    out = []
    while n > 0:
        n, rem = divmod(n - 1, 26)
        out.append(chr(65 + rem))
    return "".join(reversed(out))


def _score_header(header: str, keywords: list[str]) -> float:
    normalized_header = _normalize(header)
    if not normalized_header:
        return 0.0

    score = 0.0
    for keyword in keywords:
        normalized_keyword = _normalize(keyword)
        if not normalized_keyword:
            continue

        if normalized_header == normalized_keyword:
            score = max(score, 1.0)
            continue
        if normalized_keyword in normalized_header or normalized_header in normalized_keyword:
            score = max(score, 0.82)
            continue

        ratio = SequenceMatcher(None, normalized_header, normalized_keyword).ratio()
        score = max(score, ratio * 0.75)

    return score


def get_sheet_range(headers: list[str], sample_rows: list[Any]) -> str:
    if not headers:
        return "A1:A1"
    last_col = _column_to_excel_label(max(0, len(headers) - 1))
    last_row = max(2, len(sample_rows) + 1)
    return f"A1:{last_col}{last_row}"


def suggest_mapping_address(
    widget_type: str,
    headers: list[str],
    sample_rows: list[Any],
) -> tuple[str, str, float, str]:
    if not headers:
        return "A1:A1", "A1", 0.0, "headers가 비어 있어 기본값 A1을 사용합니다."

    normalized_widget_type = widget_type.strip()
    keywords = WIDGET_KEYWORDS.get(normalized_widget_type, [normalized_widget_type])
    sheet_range = get_sheet_range(headers, sample_rows)
    last_row = max(2, len(sample_rows) + 1)

    if normalized_widget_type.lower() == "table":
        last_col = _column_to_excel_label(max(0, len(headers) - 1))
        return (
            sheet_range,
            f"A1:{last_col}{last_row}",
            0.72,
            "table 위젯은 전체 시트 표 범위를 그대로 매핑합니다.",
        )

    best_index = 0
    best_score = -1.0
    for i, header in enumerate(headers):
        score = _score_header(header, keywords)
        if score > best_score:
            best_score = score
            best_index = i

    if best_score < 0:
        best_score = 0.0

    col_label = _column_to_excel_label(best_index)
    suggested_address = f"{col_label}2:{col_label}{last_row}"
    reason = (
        f"'{headers[best_index]}' 컬럼이 '{normalized_widget_type}'와 가장 유사하여 "
        f"{suggested_address}를 추천합니다."
    )
    return sheet_range, suggested_address, float(round(best_score, 3)), reason
