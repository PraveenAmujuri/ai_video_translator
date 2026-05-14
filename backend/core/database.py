import json
import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from core.config import settings


engine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, default="pending")
    progress = Column(Integer, default=0)
    message = Column(String, default="")
    error = Column(Text, nullable=True)

    source_language = Column(String, nullable=True)
    target_language = Column(String, nullable=True)
    voice = Column(String, nullable=True)

    original_filename = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    audio_path = Column(String, nullable=True)
    output_path = Column(String, nullable=True)
    hls_path = Column(String, nullable=True)
    subtitle_path = Column(String, nullable=True)
    youtube_url = Column(String, nullable=True)
    video_stream_url = Column(String, nullable=True)
    dubbed_audio_path = Column(String, nullable=True)

    duration = Column(Float, nullable=True)
    segments_json = Column(Text, nullable=True)

    tts_rate = Column(String, default="+0%")
    tts_pitch = Column(String, default="+0Hz")
    tts_volume = Column(String, default="+0%")
    preserve_background_audio = Column(Boolean, default=False)
    background_audio_volume = Column(Float, default=0.3)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_segments(self):
        if self.segments_json:
            return json.loads(self.segments_json)
        return []

    def set_segments(self, segments):
        self.segments_json = json.dumps(segments, ensure_ascii=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_job(db: AsyncSession, job_id: str) -> Optional[Job]:
    from sqlalchemy import select
    result = await db.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one_or_none()


async def create_job(db: AsyncSession, **kwargs):
    job = Job(**kwargs)

    db.add(job)

    await db.commit()
    await db.refresh(job)

    return job


async def update_job(db: AsyncSession, job_id: str, **kwargs) -> Optional[Job]:
    from sqlalchemy import update
    kwargs["updated_at"] = datetime.utcnow()
    await db.execute(update(Job).where(Job.id == job_id).values(**kwargs))
    await db.commit()
    return await get_job(db, job_id)