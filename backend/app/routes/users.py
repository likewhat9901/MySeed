from typing import Any

from fastapi import APIRouter

from app.openapi.inline_responses import RESPONSE_GET_USERS

router = APIRouter()


@router.get(
    "/users",
    responses=RESPONSE_GET_USERS,
    summary="사용자 목록 (플레이스홀더)",
    response_description="현재 본문은 빈 배열 `[]`. 아래 표는 항목이 있을 때 칸 이름 옆 의미입니다.",
)
async def get_users() -> list[Any]:
    return []
