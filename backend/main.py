import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from core.config import settings
from core.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

app.mount(
    "/hls",
    StaticFiles(directory=settings.HLS_DIR),
    name="hls"
)

app.mount(
    "/outputs",
    StaticFiles(directory=settings.OUTPUT_DIR),
    name="outputs"
)


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }