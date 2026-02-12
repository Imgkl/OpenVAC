"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (
        file &&
        (file.type.startsWith("video/") ||
          /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name))
      ) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-3 p-6 sm:p-12
        border-2 border-dashed rounded-xl cursor-pointer transition-all
        ${dragging ? "border-accent bg-accent/5 scale-[1.01]" : "border-border hover:border-muted"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <svg
        className="w-10 h-10 text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <div className="text-center">
        <p className="text-foreground text-sm">
          Drop a video file here or click to browse
        </p>
        <p className="text-muted text-xs mt-1">MP4, MOV, AVI, WebM, MKV</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
