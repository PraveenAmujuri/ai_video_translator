import { useState } from "react";

interface YouTubeInputProps {
  onUrlSubmit: (url: string) => void;
  disabled: boolean;
}

const YOUTUBE_ID_PATTERN = /[\w-]{11}/;
const YOUTUBE_MATCH =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;

function normalizeYouTubeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const match = YOUTUBE_MATCH.exec(withScheme);
  if (!match || !YOUTUBE_ID_PATTERN.test(match[1])) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

export function YouTubeInput({ onUrlSubmit, disabled }: YouTubeInputProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeYouTubeUrl(url);
    if (!normalized) {
      setValidationError("Enter a valid YouTube URL");
      return;
    }
    setValidationError(null);
    onUrlSubmit(normalized);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.currentTarget.value);
    if (validationError) setValidationError(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="YouTube URL input"
      className="field"
    >
      <label htmlFor="yt-url" className="field-label">YouTube URL</label>
      <div className="input-group">
        <span className="input-affix">
          <span className="input-affix-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 9.5 9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M7 3.5h-2A2.5 2.5 0 0 0 2.5 6v0A2.5 2.5 0 0 0 5 8.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M9 12.5h2a2.5 2.5 0 0 0 2.5-2.5v0A2.5 2.5 0 0 0 11 7.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            id="yt-url"
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="youtube.com/watch?v=…  or  youtu.be/…"
            disabled={disabled}
            aria-invalid={validationError !== null}
            aria-describedby={validationError ? "yt-error" : undefined}
            autoComplete="off"
            spellCheck={false}
            className="input"
          />
        </span>
        <button
          type="submit"
          disabled={disabled || url.trim().length === 0}
          className="btn btn--primary"
        >
          <span className="btn-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="m9 4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Translate
        </button>
      </div>
      {validationError ? (
        <span id="yt-error" role="alert" className="field-error">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="0.7" fill="currentColor"/>
          </svg>
          {validationError}
        </span>
      ) : (
        <span className="field-help">
          Public videos only. The file downloads locally before translation.
        </span>
      )}
    </form>
  );
}
