// src/components/ProgressTrack/ProgressTrack.tsx
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
  idle: "Ready",
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

  // Establish strict contextual state tokens from backend messaging strings
  const currentMessage = (translationProgress?.message || "").toLowerCase();
  
  const isDownloading = phase === "downloading";
  const isTranscribing = phase === "uploading" || currentMessage.includes("transcribe") || currentMessage.includes("whisper");
  const isTranslating = phase === "processing" && (currentMessage.includes("translate") || currentMessage.includes("llm") || currentMessage.includes("gemini"));
  const isVoiceCloning = phase === "processing" && (currentMessage.includes("voice") || currentMessage.includes("clone") || currentMessage.includes("tts") || currentMessage.includes("dub"));
  const isComplete = phase === "completed";

  // Convert sequential progression state thresholds into an ordered index matrix map
  let activeIndex = 0;
  if (isDownloading) activeIndex = 0;
  else if (isTranscribing) activeIndex = 1;
  else if (isTranslating) activeIndex = 2;
  else if (isVoiceCloning) activeIndex = 3;
  else if (isComplete) activeIndex = 4;

  const steps = [
    { label: "Download & Extract" },
    { label: "Transcribe" },
    { label: "Translate" },
    { label: "Voice Clone" },
    { label: "Complete" },
  ];

  return (
    <section className="panel" aria-label="Translation progress" style={{ width: "100%", marginBottom: "16px" }}>
      <div className="panel-body progress" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Full horizontal high-density step sequence pipeline */}
        <div 
          className="pipeline-steps" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            width: "100%",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--line-faint)",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          {steps.map((step, idx) => {
            // A step is considered filled if the pipeline runtime has crossed or settled onto it
            const isPassedOrActive = idx <= activeIndex;
            
            return (
              <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <span 
                  style={{ 
                    fontSize: "var(--fs-sm)", 
                    fontWeight: isPassedOrActive ? "var(--fw-semibold)" : "var(--fw-regular)",
                    color: isPassedOrActive ? "var(--text-primary)" : "var(--text-disabled)",
                    transition: "color var(--dur-base) var(--ease-out)"
                  }}
                >
                  {step.label}
                </span>
                {idx < steps.length - 1 && (
                  <span 
                    style={{ 
                      color: idx < activeIndex ? "var(--text-primary)" : "var(--text-disabled)", 
                      fontSize: "var(--fs-xs)", 
                      userSelect: "none",
                      fontWeight: idx < activeIndex ? "var(--fw-bold)" : "var(--fw-regular)",
                      transition: "color var(--dur-base) var(--ease-out)"
                    }}
                  >
                    ➔
                  </span>
                )}
              </div>
            );
          })}
        </div>

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
          <span className="field-help" data-role="label" style={{ color: "var(--text-secondary)" }}>{detail}</span>
        )}
      </div>
    </section>
  );
}