export type JobStatus = "pending" | "processing" | "completed" | "error";

export interface TranslationJobProgress {
  job_id: string;
  status: JobStatus;
  progress: number;
  message: string;
  error: string | null;
  source_language: string | null;
  target_language: string | null;
  stream_url: string | null;
  subtitle_url: string | null;
}

export interface TranslationPipelineParams {
  file_path: string;
  target_language: string;
  voice: string;
  source_language?: string;
}

export interface TranslationOptions {
  targetLanguage: string;
  voice: string;
  sourceLanguage: string;
  preserveBackgroundMusicEffects?: boolean;
  backgroundAudioVolume?: number;
}

export interface TranslationParams {
  filePath: string;
  targetLanguage: string;
  voice: string;
  sourceLanguage?: string;
}

export interface SubtitleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface StreamEndpointsResponse {
  videoUrl: string;
  subtitleUrl: string | null;
}

export interface DownloadProgressEvent {
  percentage: number;
  speed: string;
  eta: string;
}

export interface SaveProgressEvent {
  percentage: number;
  downloaded_bytes: number;
  total_bytes: number;
}

export type PipelinePhase =
  | "idle"
  | "downloading"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

export interface PipelineState {
  phase: PipelinePhase;
  jobId: string | null;
  localFilePath: string | null;
  downloadProgress: DownloadProgressEvent | null;
  translationProgress: TranslationJobProgress | null;
  error: string | null;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: number;
  message: string;
  level: "info" | "warn" | "error";
}

export interface LanguageOption {
  code: string;
  label: string;
}

export interface VoiceOption {
  code: string;
  label: string;
  languageCode: string;
  gender: "male" | "female";
}
