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
    <form onSubmit={handleSubmit} aria-label="YouTube URL input">
      <input
        type="text"
        value={url}
        onChange={handleChange}
        placeholder="youtube.com/watch?v=... or youtu.be/..."
        disabled={disabled}
        aria-invalid={validationError !== null}
        aria-describedby={validationError ? "yt-error" : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {validationError && (
        <span id="yt-error" role="alert">
          {validationError}
        </span>
      )}
      <button type="submit" disabled={disabled || url.trim().length === 0}>
        Download &amp; Translate
      </button>
    </form>
  );
}
