import type { PipelinePhase } from "../../types";

interface StatusChipProps {
  phase: PipelinePhase;
}

const PHASE_LABELS: Record<PipelinePhase, string> = {
  idle: "Ready",
  downloading: "Downloading",
  uploading: "Uploading",
  processing: "Processing",
  completed: "Completed",
  error: "Error",
};

export function StatusChip({ phase }: StatusChipProps) {
  return (
    <span role="status" aria-label={`Pipeline status: ${PHASE_LABELS[phase]}`} data-phase={phase}>
      {PHASE_LABELS[phase]}
    </span>
  );
}
