import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { GenericAudioIcon } from "../../assets/platform-icons";

interface DragDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

interface AudioDropZoneProps {
  onFileSelected: (path: string) => void;
  disabled: boolean;
}

const AUDIO_EXTENSIONS = ["mp3", "aac", "wav", "flac", "ogg", "m4a", "opus", "wma", "aiff"];

export function AudioDropZone({ onFileSelected, disabled }: AudioDropZoneProps) {
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
      if (!path) return;
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (AUDIO_EXTENSIONS.includes(ext)) {
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
        {
          name: "Audio",
          extensions: AUDIO_EXTENSIONS,
        },
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
      className="dropzone"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Drop audio file or click to browse"
      data-drag-over={isDragOver || undefined}
      data-has-file={displayName ? true : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <span className="dropzone-icon" aria-hidden="true">
        <GenericAudioIcon size={22} />
      </span>
      {displayName ? (
        <>
          <span className="dropzone-filename" data-role="filename" title={selectedPath ?? undefined}>
            {displayName}
          </span>
          <span className="dropzone-sub">Click to choose a different file</span>
        </>
      ) : (
        <>
          <span className="dropzone-prompt" data-role="prompt">
            Drop an audio file here, or click to browse
          </span>
          <span className="dropzone-sub">
            .mp3 · .aac · .wav · .flac · .ogg · .m4a · .opus · .wma  ·  up to 200 MB
          </span>
        </>
      )}
    </div>
  );
}
