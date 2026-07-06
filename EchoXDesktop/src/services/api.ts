import type {
  TranslationJobProgress,
  TranslationParams,
  SubtitleSegment,
  StreamEndpointsResponse,
} from "../types";

const BASE_URL = "https://api.praveenai.tech";
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;

export class FileSizeError extends Error {
  constructor(sizeBytes: number) {
    super(
      `File exceeds 200MB limit (${(sizeBytes / 1024 / 1024).toFixed(1)} MB)`
    );
    this.name = "FileSizeError";
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function submitTranslationJob(
  params: TranslationParams,
  fileBlob: Blob,
  fileName: string
): Promise<string> {
  if (fileBlob.size > MAX_FILE_BYTES) {
    throw new FileSizeError(fileBlob.size);
  }

  const form = new FormData();
  form.append("file", fileBlob, fileName);
  form.append("target_language", params.targetLanguage);
  form.append("voice", params.voice);

  if (params.sourceLanguage) {
    form.append("source_language", params.sourceLanguage);
  }

  const response = await fetch(`${BASE_URL}/translate-stream`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, text);
  }

  const data = (await response.json()) as { job_id: string };
  return data.job_id;
}

export async function fetchJobProgress(
  jobId: string
): Promise<TranslationJobProgress> {
  const url = `${BASE_URL}/progress/${jobId}`;
  console.log(`[api] polling progress: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, text);
  }

  return response.json() as Promise<TranslationJobProgress>;
}

export function pollJobProgress(
  jobId: string,
  onUpdate: (progress: TranslationJobProgress) => void,
  onError: (error: Error) => void,
  signal: AbortSignal
): void {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (signal.aborted) return;

    try {
      const progress = await fetchJobProgress(jobId);
      onUpdate(progress);

      if (
        progress.status === "completed" ||
        progress.status === "error"
      ) {
        return;
      }

      if (!signal.aborted) {
        timeoutHandle = setTimeout(tick, POLL_INTERVAL_MS);
      }
    } catch (err) {
      if (!signal.aborted) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  signal.addEventListener("abort", () => {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  });

  timeoutHandle = setTimeout(tick, POLL_INTERVAL_MS);
}

export async function fetchSubtitles(
  jobId: string
): Promise<SubtitleSegment[]> {
  const response = await fetch(`${BASE_URL}/subtitles/${jobId}`);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, text);
  }

  return response.json() as Promise<SubtitleSegment[]>;
}

export function resolveStreamEndpoints(jobId: string): StreamEndpointsResponse {
  return {
    videoUrl: `${BASE_URL}/outputs/${jobId}/output.mp4`,
    subtitleUrl: `${BASE_URL}/subtitles/${jobId}`,
  };
}
