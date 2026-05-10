"""Swagger에 `$ref`/이름 있는 스키마 없이 바로 묶여 보이도록 하는 인라인 응답 스키마."""

from __future__ import annotations

from typing import Any


def _s(desc: str, *, fmt: str | None = None, nullable: bool = False) -> dict[str, Any]:
    x: dict[str, Any] = {"type": "string", "description": desc}
    if fmt:
        x["format"] = fmt
    if nullable:
        x["nullable"] = True
    return x


def _b(desc: str) -> dict[str, Any]:
    return {"type": "boolean", "description": desc}


def _i(desc: str) -> dict[str, Any]:
    return {"type": "integer", "description": desc}


def _n(desc: str) -> dict[str, Any]:
    return {"type": "number", "description": desc}


def _obj(desc: str, properties: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "description": desc,
        "properties": properties,
    }


def _arr(desc: str, items: dict[str, Any]) -> dict[str, Any]:
    return {"type": "array", "description": desc, "items": items}


ANY_PREVIEW: dict[str, Any] = {
    "description": "엑셀에서 읽어 온 값 일부를 미리 보여 주는 내용(점검용, 앞쪽 몇 개만)"
}


IMPORT_MAPPING_SUGGEST_200_SCHEMA: dict[str, Any] = {
    "type": "object",
    "description": (
        "응답 본문. 아래 줄마다 항목 이름 옆 한국어 설명이 붙습니다. "
        "(중첩 객체는 접어서 같은 방식으로 볼 수 있습니다.)"
    ),
    "properties": {
        "draft": _obj(
            "엑셀과 위젯 연결 설정의 초안 전체(번호·이름·연결 목록)",
            {
                "map_id": _s(
                    "이번에 만든 엑셀 연결 템플릿의 번호(저장 요청 시 같은 값이 DB에 들어감)",
                    fmt="uuid",
                ),
                "map_name": _s("사람이 부른 이 연결 설정의 이름"),
                "mappings": _arr(
                    "위젯마다 어느 시트·어느 칸을 볼지 나열한 목록",
                    {
                        "type": "object",
                        "properties": {
                            "con_id": _s(
                                "가계부 화면에서 위젯 한 개를 구분하는 고유 번호",
                                fmt="uuid",
                            ),
                            "widget_type": _s(
                                "위젯 종류(저축 목표·표 등 내부에서 쓰는 타입 이름)"
                            ),
                            "sheet": _s("엑셀에서 데이터를 읽을 시트 이름"),
                            "address": _s(
                                "엑셀에서 읽을 위치(예: 한 칸 C2 또는 영역 C2:C10처럼 적는 주소)"
                            ),
                        },
                    },
                ),
                "regist_dt": _s(
                    "처음 응답일 때는 비어 있음. DB에 저장된 뒤에는 저장 시각 문자열이 생김",
                    nullable=True,
                ),
            },
        ),
        "insights": _arr(
            "위젯마다 추천 이유와 점수 같은 부가 설명 목록",
            {
                "type": "object",
                "properties": {
                    "con_id": _s(
                        "가계부 화면에서 위젯 한 개를 구분하는 고유 번호",
                        fmt="uuid",
                    ),
                    "widget_type": _s("위젯 종류 이름"),
                    "sheet_range": _s(
                        "요청에 넣은 표 샘플 전체가 차지하는 영역을 한 줄로 요약한 문자열"
                    ),
                    "confidence": _n(
                        "위 주소 추천을 얼마나 믿어도 되는지에 대한 점수(0~1)"
                    ),
                    "reason": _s(
                        "왜 그 열·범위를 골랐는지에 대한 짧은 한국어 설명"
                    ),
                },
            },
        ),
        "mapping_saved": _b(
            "연결 템플릿을 저장하라고 요청했고, 실제로 DB에 저장까지 됐는지 여부"
        ),
        "canvas_updated": _b(
            "가계부 화면의 위젯 내용까지 갱신하라고 했고, 그게 성공했는지 여부"
        ),
        "warnings": _arr(
            "일부만 처리했거나 건너뛴 경우 그 이유를 적은 문장들",
            _s("(문구 하나)"),
        ),
    },
}

IMPORT_MAPPING_ANALYZE_200_SCHEMA: dict[str, Any] = {
    "type": "object",
    "description": (
        "응답 본문. 항목 이름마다 무슨 뜻인지 설명했습니다."
    ),
    "properties": {
        "file_summary": {
            "type": "object",
            "description": "올린 파일 안에 시트마다 어떤 열·어떤 성격의 값이 있는지 요약한 표현",
            "additionalProperties": True,
        },
        "recommendations": _arr(
            "각 위젯에 대해 어디를 읽고 어떻게 보여줄지 제안한 결과 목록",
            _obj(
                "한 위젯에 대한 추천 결과 한 건",
                {
                    "con_id": _s(
                        "가계부 화면에서 위젯 한 개를 구분하는 고유 번호",
                        fmt="uuid",
                    ),
                    "widget_type": _s("위젯 종류 이름"),
                    "sheet": _s("값을 가져오기로 한 시트 이름"),
                    "address": _s("값을 가져올 엑셀 칸(또는 영역)"),
                    "aggregation": _s(
                        "값을 어떻게 한 덩어리로 만들지에 대한 권장 방법"
                    ),
                    "display_form": _s(
                        "위젯에 넣을 때 권장되는 표시 형태"
                    ),
                    "confidence": _n(
                        "이 추천이 맞을 가능성에 대한 점수(0~1)"
                    ),
                    "reason": _s(
                        "왜 이 시트·범위·합치기 방식을 추천했는지 설명"
                    ),
                    "preview": ANY_PREVIEW,
                },
            ),
        ),
        "draft": _obj(
            "연결 설정을 DB에 넣을 때 쓰기 좋게 정리한 초안(이름·번호·연결 목록)",
            {
                "map_id": _s(
                    "이번에 만든 엑셀 연결 템플릿 번호(저장하면 DB에도 같은 번호로 들어감)",
                    fmt="uuid",
                ),
                "map_name": _s("사용자가 붙인 이 연결 설정의 이름"),
                "mappings": _arr(
                    "위젯마다 어느 시트·범위·어떻게 합칠지까지 담은 목록(저장용 형태)",
                    _obj(
                        "한 위젯에 대한 저장용 매핑 한 건",
                        {
                            "con_id": _s(
                                "가계부 화면에서 위젯 한 개를 구분하는 고유 번호",
                                fmt="uuid",
                            ),
                            "widget_type": _s("위젯 종류 이름"),
                            "sheet": _s("엑셀에서 쓸 시트 이름"),
                            "address": _s(
                                "엑셀에서 읽을 칸 또는 칸들의 범위"
                            ),
                            "aggregation": _s(
                                "숫자 여러 칸을 하나로 합칠 때 방법(합·평균·안 함 등). "
                                "표나 목록형은 보통 합치지 않음"
                            ),
                            "display_form": _s(
                                "위젯에 값을 어떤 모양으로 넣을지에 대한 힌트"
                            ),
                        },
                    ),
                ),
                "regist_dt": _s(
                    "아직 저장 전이면 비어 있음. 저장 후에는 기록 시각이 붙을 수 있음",
                    nullable=True,
                ),
            },
        ),
        "mapping_saved": _b(
            "연결 템플릿 저장을 요청했을 때 실제 저장 성공 여부"
        ),
        "canvas_updated": _b(
            "가계부 화면 위젯 내용까지 바꾸라고 했을 때 그게 끝까지 됐는지 여부"
        ),
        "warnings": _arr(
            "중간에 규칙을 바꿨거나 일부를 못 했을 때 그 사유를 적은 문장들",
            _s("(문구 하나)"),
        ),
    },
}


IMPORT_RECORDS_200_SCHEMA: dict[str, Any] = {
    "type": "object",
    "description": "응답 본문. 각 줄이 무슨 값인지 옆 설명 참고.",
    "properties": {
        "inserted": _i("가계부 거래 기록으로 새로 넣은 줄의 개수"),
        "skipped_estimate": _i(
            "엑셀에 있던 본문 줄 수 가운데, 넣지 않고 건너뛴 줄 수의 어림값(금액 빈칸·날짜 없음 등)"
        ),
        "ledger_id": _s(
            "어느 가계부에 넣었는지 가리키는 번호(문자열)"
        ),
        "sheet": _s("실제로 읽어 들인 엑셀 시트 이름"),
        "header_row": _i(
            "맨 위 제목 줄로 인식한 줄 번호(엑셀에서 보는 행 번호, 1부터 시작)"
        ),
        "warnings": _arr(
            "열 이름이 안 맞거나 날짜가 비어 넘겼다 같은 주의 사항 문장들",
            _s("(문구 하나)"),
        ),
        "rec_ids_sample": _arr(
            "새로 들어간 기록마다 붙는 내부 번호를, 앞쪽 일부만 목록으로 보여 준 것(최대 100개)",
            _s("(기록 하나의 내부 번호 문자열)"),
        ),
        "dry_run": _b(
            "맞는지 확인만 하고 실제로 DB에 넣지는 않았는지 여부"
        ),
    },
}


USERS_GET_200_SCHEMA: dict[str, Any] = {
    "type": "array",
    "description": "사용자 목록(지금 구현에서는 비어 있습니다). 배열 각 칸 안 설명 참고.",
    "items": {
        "type": "object",
        "properties": {
            "id": _s("이 사람 계정을 구분하는 고유 번호"),
            "name": _s(
                "화면에 보일 이름",
                nullable=True,
            ),
            "email": _s(
                "로그인 등에 쓰는 전자메일 주소(없으면 비움)",
                nullable=True,
            ),
        },
    },
}


def _resp_200(schema: dict[str, Any], desc: str) -> dict[int, dict[str, Any]]:
    return {
        200: {
            "description": desc,
            "content": {
                "application/json": {
                    "schema": schema,
                }
            },
        }
    }


RESPONSE_POST_IMPORT_MAPPING_SUGGEST = _resp_200(
    IMPORT_MAPPING_SUGGEST_200_SCHEMA,
    "매핑 제안 결과(아래 한국어 컬럼 설명 포함)",
)


RESPONSE_POST_IMPORT_MAPPING_ANALYZE = _resp_200(
    IMPORT_MAPPING_ANALYZE_200_SCHEMA,
    "파일 분석·위젯별 추천 결과(아래 한국어 컬럼 설명 포함)",
)


RESPONSE_POST_IMPORT_RECORDS = _resp_200(
    IMPORT_RECORDS_200_SCHEMA,
    "엑셀에서 읽어 tb_record 적재 결과(아래 한국어 컬럼 설명 포함)",
)


RESPONSE_GET_USERS = _resp_200(
    USERS_GET_200_SCHEMA,
    "사용자 목록(현재 빈 배열. 아래는 항목이 있을 때의 칸 설명)",
)
