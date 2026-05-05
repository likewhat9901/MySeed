from fastapi import FastAPI

from app.routes.import_mapping import router as import_mapping_router
from app.routes.users import router as users_router

app = FastAPI(title="MySeed Backend")

app.include_router(users_router, prefix="/api")
app.include_router(import_mapping_router, prefix="/api")
