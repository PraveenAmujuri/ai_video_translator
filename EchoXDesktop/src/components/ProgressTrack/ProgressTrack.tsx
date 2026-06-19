import type {
  PipelinePhase,
  TranslationJobProgress,
  DownloadProgressEvent,
} from "../../types";

interface ProgressTrackProps {
  phase: PipelinePhase;
  translationProgress: TranslationJobProgress | null;
  downloadProgress: DownloadProgressEvent | null;
}

const PHASE_HEADING: Record<PipelinePhase, string> = {
  idle: "Idle",
  downloading: "Downloading source",
  uploading: "Uploading to translator",
  processing: "Translating",
  completed: "Translation complete",
  error: "Failed",
};

function resolveProgress(
  phase: PipelinePhase,
  translationProgress: TranslationJobProgress | null,
  downloadProgress: DownloadProgressEvent | null
): number {
  if (phase === "downloading") return downloadProgress?.percentage ?? 0;
  if (phase === "uploading") return 0;
  if (phase === "processing") return translationProgress?.progress ?? 0;
  if (phase === "completed") return 100;
  return 0;
}

function resolveDetail(
  phase: PipelinePhase,
  translationProgress: TranslationJobProgress | null,
  downloadProgress: DownloadProgressEvent | null
): string {
  if (phase === "downloading" && downloadProgress) {
    return `${downloadProgress.speed}  ·  ETA ${downloadProgress.eta}`;
  }
  if (phase === "uploading") return "Streaming file to backend…";
  if (phase === "processing" && translationProgress) {
    return translationProgress.message || "Working…";
  }
  if (phase === "completed") return "Output ready for download";
  return "";
}

export function ProgressTrack({
  phase,
  translationProgress,
  downloadProgress,
}: ProgressTrackProps) {
  const progress = resolveProgress(phase, translationProgress, downloadProgress);
  const detail = resolveDetail(phase, translationProgress, downloadProgress);

  const isVisible = phase !== "idle" && phase !== "error";
  if (!isVisible) return null;

  const isIndeterminate = phase === "uploading";

  return (
    <section
      className="panel"
      aria-label="Translation progress"
    >
      <div className="panel-body progress">
        <div className="progress-meta">
          <span className="progress-label">{PHASE_HEADING[phase]}</span>
          <span className="progress-value">
            {isIndeterminate ? "—" : `${Math.round(progress)}%`}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Translation progress"
          data-indeterminate={isIndeterminate || undefined}
        >
          <div
            className="progress-fill"
            data-role="fill"
            data-phase={phase}
            style={{ ["--progress" as string]: `${progress}%` }}
          />
        </div>
        {detail && (
          <span className="field-help" data-role="label">{detail}</span>
        )}
      </div>
    </section>
  );
}
