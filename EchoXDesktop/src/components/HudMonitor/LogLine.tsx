import type { LogEntry } from "../../types";

interface LogLineProps {
  entry: LogEntry;
}

const LEVEL_GLYPH: Record<LogEntry["level"], string> = {
  info: "›",
  warn: "!",
  error: "×",
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function LogLine({ entry }: LogLineProps) {
  return (
    <div className="log" data-level={entry.level}>
      <time
        className="log-time"
        dateTime={new Date(entry.timestamp).toISOString()}
      >
        {formatTimestamp(entry.timestamp)}
      </time>
      <span className="log-level" aria-hidden="true">{LEVEL_GLYPH[entry.level]}</span>
      <span className="log-message">{entry.message}</span>
    </div>
  );
}
