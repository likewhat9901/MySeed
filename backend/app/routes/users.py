from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class UserItem(BaseModel):
    """사용자 목록 항목 스키마 (현재 엔드포인트는 빈 배열만 반환)."""

    id: str = Field(description="사용자 식별자 (예: auth user id / mem_id)")
    name: str | None = Field(None, description="표시 이름")
    email: str | None = Field(None, description="이메일 (있을 경우)")


@router.get(
    "/users",
    response_model=list[UserItem],
    summary="사용자 목록 (플레이스홀더)",
    response_description="현재는 빈 배열 `[]`만 반환합니다. 스키마는 향후 확장용입니다.",
)
async def get_users() -> list[UserItem]:
    return []
