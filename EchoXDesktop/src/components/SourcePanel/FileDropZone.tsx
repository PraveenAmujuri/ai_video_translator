import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

interface DragDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

interface FileDropZoneProps {
  onFileSelected: (path: string) => void;
  disabled: boolean;
}

export function FileDropZone({ onFileSelected, disabled }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const onFileSelectedRef = useRef(onFileSelected);
  const disabledRef = useRef(disabled);
  useEffect(() => { onFileSelectedRef.current = onFileSelected; });
  useEffect(() => { disabledRef.current = disabled; });

  useEffect(() => {
    let unlistenDrop: (() => void) | undefined;
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    listen<DragDropPayload>("tauri://drag-drop", (event) => {
      setIsDragOver(false);
      if (disabledRef.current) return;
      const path = event.payload.paths[0];
      if (path) {
        setSelectedPath(path);
        onFileSelectedRef.current(path);
      }
    }).then((fn) => { unlistenDrop = fn; });

    listen<void>("tauri://drag-enter", () => {
      if (!disabledRef.current) setIsDragOver(true);
    }).then((fn) => { unlistenEnter = fn; });

    listen<void>("tauri://drag-leave", () => {
      setIsDragOver(false);
    }).then((fn) => { unlistenLeave = fn; });

    return () => {
      unlistenDrop?.();
      unlistenEnter?.();
      unlistenLeave?.();
    };
  }, []);

  const handleClick = async () => {
    if (disabled) return;
    const result = await open({
      multiple: false,
      filters: [
        { name: "Video", extensions: ["mp4", "mov", "webm", "mkv", "avi"] },
      ],
    });
    if (typeof result === "string") {
      setSelectedPath(result);
      onFileSelected(result);
    }
  };

  const displayName = selectedPath
    ? selectedPath.split(/[\\/]/).pop() ?? selectedPath
    : null;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Drop video file or click to browse"
      data-drag-over={isDragOver || undefined}
      data-has-file={displayName ? true : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {displayName ? (
        <span data-role="filename">{displayName}</span>
      ) : (
        <span data-role="prompt">Drop video file here or click to browse</span>
      )}
    </div>
  );
}
