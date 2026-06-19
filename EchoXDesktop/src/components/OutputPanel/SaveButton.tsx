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
      className="btn btn--primary"
    >
      <span className="btn-icon" aria-hidden="true">
        {isSaving ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/>
            </path>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 12.5v.5A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5v-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}
