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

function resolveLabel(
  phase: PipelinePhase,
  translationProgress: TranslationJobProgress | null,
  downloadProgress: DownloadProgressEvent | null
): string {
  if (phase === "downloading" && downloadProgress) {
    return `${downloadProgress.percentage.toFixed(1)}% @ ${downloadProgress.speed} — ETA ${downloadProgress.eta}`;
  }
  if (phase === "uploading") return "Uploading…";
  if (phase === "processing" && translationProgress) {
    return translationProgress.message || `${translationProgress.progress}%`;
  }
  if (phase === "completed") return "Done";
  return "";
}

export function ProgressTrack({
  phase,
  translationProgress,
  downloadProgress,
}: ProgressTrackProps) {
  const progress = resolveProgress(phase, translationProgress, downloadProgress);
  const label = resolveLabel(phase, translationProgress, downloadProgress);

  const isVisible =
    phase !== "idle" && phase !== "error";

  if (!isVisible) return null;

  const translateX = `${progress - 100}%`;

  return (
    <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Translation progress">
      <div
        data-role="track"
        style={{ overflow: "hidden", position: "relative" }}
      >
        <div
          data-role="fill"
          data-phase={phase}
          style={{
            width: "100%",
            transform: `translateX(${translateX})`,
            willChange: "transform",
          }}
        />
      </div>
      {label && <span data-role="label">{label}</span>}
    </div>
  );
}
