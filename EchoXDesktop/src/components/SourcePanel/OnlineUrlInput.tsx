import { useState, useMemo } from "react";
import { detectPlatform, isValidUrl, normalizeUrl } from "../../lib/url-detector";
import { PlatformIcon, CheckCircleIcon } from "../../assets/platform-icons";

interface OnlineUrlInputProps {
  onUrlSubmit: (url: string) => void;
  disabled: boolean;
  onViewSources: () => void;
}

export function OnlineUrlInput({
  onUrlSubmit,
  disabled,
  onViewSources,
}: OnlineUrlInputProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const detection = useMemo(() => {
    if (!url.trim()) return null;
    return detectPlatform(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(url)) {
      setValidationError("Enter a valid video URL");
      return;
    }
    setValidationError(null);
    onUrlSubmit(normalizeUrl(url));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.currentTarget.value);
    if (validationError) setValidationError(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Online video URL input"
      className="field"
    >
      <label htmlFor="online-url" className="field-label">
        Video URL
      </label>

      <div className="input-group">
        <span className="input-affix">
          <span className="input-affix-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 9.5 9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M7 3.5H5A2.5 2.5 0 0 0 2.5 6v0A2.5 2.5 0 0 0 5 8.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M9 12.5h2A2.5 2.5 0 0 0 13.5 10v0A2.5 2.5 0 0 0 11 7.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            id="online-url"
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="Paste a video URL from any supported site…"
            disabled={disabled}
            aria-invalid={validationError !== null}
            aria-describedby={
              validationError
                ? "url-error"
                : detection
                ? "url-detection"
                : "url-help"
            }
            autoComplete="off"
            spellCheck={false}
            className="input"
          />
        </span>
        <button
          type="submit"
          disabled={disabled || !url.trim()}
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
        <span id="url-error" role="alert" className="field-error">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
          </svg>
          {validationError}
        </span>
      ) : detection ? (
        <span
          id="url-detection"
          className={`detection-badge ${detection.isKnown ? "detection-badge--known" : "detection-badge--other"}`}
          role="status"
          aria-live="polite"
        >
          <CheckCircleIcon size={13} />
          <PlatformIcon type={detection.iconType} size={14} />
          Detected: {detection.label}
        </span>
      ) : (
        <span id="url-help" className="field-help url-help">
          YouTube, Instagram, TikTok, Reddit, Vimeo, Twitch, and{" "}
          <button
            type="button"
            className="btn-link"
            onClick={onViewSources}
            tabIndex={0}
          >
            1000+ more sites
          </button>
        </span>
      )}
    </form>
  );
}
