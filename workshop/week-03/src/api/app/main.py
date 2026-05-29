from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .neis_client import NeisClient
from .routers import health, meals, schools


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.neis_client = NeisClient(settings)
    try:
        yield
    finally:
        await app.state.neis_client.aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="급식 정보 조회 API",
        description="NEIS 오픈 API 프록시 — 학교 검색 및 중식(점심) 식단 조회.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api")
    app.include_router(schools.router, prefix="/api")
    app.include_router(meals.router, prefix="/api")
    return app


app = create_app()
