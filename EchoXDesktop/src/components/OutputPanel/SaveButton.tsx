import type { SaveProgressEvent } from "../../types";

interface SaveButtonProps {
  onSave: () => void;
  saveProgress: SaveProgressEvent | null;
}

export function SaveButton({ onSave, saveProgress }: SaveButtonProps) {
  const isSaving =
    saveProgress !== null && saveProgress.percentage < 100;

  const label = isSaving
    ? `Saving… ${Math.round(saveProgress!.percentage)}%`
    : "Save to disk";

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      aria-busy={isSaving}
      aria-label={label}
    >
      {label}
    </button>
  );
}
