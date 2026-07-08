FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install system binaries required for multimedia processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy models first to leverage Docker layer caching (since models change rarely)
COPY models/ ./models/

# Copy application source directories and files explicitly (avoids copying models/ twice and preserves caching)
COPY api/ ./api/
COPY core/ ./core/
COPY services/ ./services/
COPY workers/ ./workers/
COPY scripts/ ./scripts/
COPY main.py .

# Ensure storage directories exist with proper access gates
RUN mkdir -p uploads outputs hls && chmod -R 777 uploads outputs hls

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]