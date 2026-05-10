from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class UserItem(BaseModel):
    """사용자 한 명을 나타내는 항목(지금 API는 빈 목록만 줌; 나중에 채울 때 쓰는 틀)."""

    id: str = Field(description="이 사람 계정을 구분하는 고유 번호")
    name: str | None = Field(None, description="화면에 보일 이름")
    email: str | None = Field(None, description="로그인 등에 쓰는 전자메일 주소(없으면 비움)")


@router.get(
    "/users",
    response_model=list[UserItem],
    summary="사용자 목록 (플레이스홀더)",
    response_description="현재는 빈 배열 `[]`만 반환합니다. 스키마는 향후 확장용입니다.",
)
async def get_users() -> list[UserItem]:
    return []
