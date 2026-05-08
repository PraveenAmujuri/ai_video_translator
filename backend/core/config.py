import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AI Video Translator"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    DATABASE_URL: str = "sqlite+aiosqlite:///./translator.db"

    UPLOAD_DIR: Path = Path("./uploads")
    OUTPUT_DIR: Path = Path("./outputs")
    HLS_DIR: Path = Path("./hls")

    MAX_UPLOAD_SIZE: int = 2 * 1024 * 1024 * 1024  # 2GB
    ALLOWED_VIDEO_TYPES: list = ["video/mp4", "video/webm", "video/avi", "video/mkv", "video/mov"]
    ALLOWED_AUDIO_TYPES: list = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/mp4"]

    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

    DEFAULT_VOICE: str = "en-US-AriaNeural"
    TTS_RATE: str = "+0%"
    TTS_PITCH: str = "+0Hz"
    TTS_VOLUME: str = "+0%"

    FFMPEG_THREADS: int = 4
    HLS_SEGMENT_TIME: int = 6
    HLS_LIST_SIZE: int = 0

    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173", "http://localhost"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

for directory in [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.HLS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)