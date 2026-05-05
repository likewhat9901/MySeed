from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.routes.import_mapping import router as import_mapping_router
from app.routes.users import router as users_router

app = FastAPI(
    title="MySeed Backend",
    description=(
        "MySeed backend API. 루트(`/`) 접속 시 `/docs`로 이동하며, "
        "Swagger UI에서 모든 API를 바로 테스트할 수 있습니다."
    ),
)


@app.get("/", include_in_schema=False)
async def redirect_to_docs() -> RedirectResponse:
    return RedirectResponse(url="/docs")

app.include_router(users_router, prefix="/api")
app.include_router(import_mapping_router, prefix="/api")
