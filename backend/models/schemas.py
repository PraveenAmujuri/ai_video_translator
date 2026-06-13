import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    TRANSLATING = "translating"
    GENERATING_TTS = "generating_tts"
    MERGING = "merging"
    GENERATING_HLS = "generating_hls"
    COMPLETED = "completed"
    FAILED = "failed"


class MediaType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    YOUTUBE = "youtube"


class SubtitleEntry(BaseModel):
    index: int
    start: float
    end: float
    text: str
    translated_text: Optional[str] = None


class VoiceInfo(BaseModel):
    name: str
    display_name: str
    locale: str
    language: str
    gender: str
    neural: bool = True


class JobCreate(BaseModel):
    source_language: Optional[str] = "auto"
    target_language: str = "en"
    voice: str = "en-US-AriaNeural"
    youtube_url: Optional[str] = None
    tts_rate: str = "+0%"
    tts_pitch: str = "+0Hz"
    tts_volume: str = "+0%"
    preserve_background_audio: bool = False
    background_audio_volume: float = 0.3
    video_stream_url: Optional[str] = None


class JobProgress(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    message: str = ""
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    voice: Optional[str] = None
    subtitles_url: Optional[str] = None
    stream_url: Optional[str] = None
    download_url: Optional[str] = None
    original_filename: Optional[str] = None
    duration: Optional[float] = None


class TranslationSegment(BaseModel):
    id: int
    start: float
    end: float
    original: str
    translated: str


class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    segments: List[TranslationSegment] = []
    subtitles_url: Optional[str] = None
    stream_url: Optional[str] = None
    download_url: Optional[str] = None
    duration: Optional[float] = None


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    flag: str = ""
    supported_voices: int = 0


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    media_type: MediaType
    status: str = "uploaded"