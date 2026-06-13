import sys
import asyncio
import os
import logging
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(
        asyncio.WindowsProactorEventLoopPolicy()
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from core.config import settings
from core.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB
    await init_db()
    
    # 2. CRITICAL CRASH RECOVERY: Mark dead jobs from previous crashes as failed
    try:
        from core.database import AsyncSessionLocal
        from sqlalchemy import text
        
        logging.info("Running system startup crash recovery checks...")
        async with AsyncSessionLocal() as session:
            # Updates stuck statuses automatically on reboot
            await session.execute(
                text("UPDATE jobs SET status='failed' WHERE status='processing'")
            )
            await session.commit()
            logging.info("Stuck processing jobs recovered successfully.")
    except Exception as e:
        logging.error(f"Crash recovery failed: {str(e)}")
        
    yield
    # Cleanup tasks on application shutdown can go here if needed later

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

app.mount(
    "/outputs",
    StaticFiles(directory=settings.OUTPUT_DIR),
    name="outputs",
)
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)
app.mount(
    "/hls",
    StaticFiles(directory=settings.HLS_DIR),
    name="hls",
)

@app.get("/")
async def root():
    return {
        "message": "AI Video Translator API Running"
    }