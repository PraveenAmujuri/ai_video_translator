import type { LogEntry } from "../../types";

interface LogLineProps {
  entry: LogEntry;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function LogLine({ entry }: LogLineProps) {
  return (
    <div role="log" data-level={entry.level}>
      <time dateTime={new Date(entry.timestamp).toISOString()}>
        {formatTimestamp(entry.timestamp)}
      </time>
      <span>{entry.message}</span>
    </div>
  );
}
