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

# Modern lifespan setup for DB initialization and dynamic cookie writing
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create cookies file from Railway variable if it exists
    cookie_content = os.getenv("YT_COOKIES")
    if cookie_content:
        logging.info("YT_COOKIES environment variable found. Generating runtime cookiefile...")
        with open("youtube_cookies.txt", "w", encoding="utf-8") as f:
            f.write(cookie_content)
    else:
        logging.warning("No YT_COOKIES environment variable found. yt-dlp might fail on cloud hosting.")

    # 2. Initialize the database
    await init_db()
    
    yield
    
    # 3. Clean up the cookies file on application shutdown for security
    if os.path.exists("youtube_cookies.txt"):
        os.remove("youtube_cookies.txt")
        logging.info("Runtime cookiefile cleared successfully.")

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