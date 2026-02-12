"use client";

import type { Quality } from "@/lib/types";

interface PlayerControlsProps {
  playing: boolean;
  onTogglePlay: () => void;
  currentFrame: number;
  totalFrames: number;
  onSeek: (frame: number) => void;
  quality: Quality;
  onQualityChange: (q: Quality) => void;
  fps: number;
  onFpsChange: (fps: number) => void;
}

const QUALITIES: Quality[] = ["low", "medium", "high"];

export function PlayerControls({
  playing,
  onTogglePlay,
  currentFrame,
  totalFrames,
  onSeek,
  quality,
  onQualityChange,
  fps,
  onFpsChange,
}: PlayerControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <input
        type="range"
        min={0}
        max={totalFrames - 1}
        value={currentFrame}
        onChange={(e) => onSeek(parseInt(e.target.value))}
        className="w-full accent-accent h-1.5 cursor-pointer"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
            title="First frame"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" />
            </svg>
          </button>

          <button
            onClick={onTogglePlay}
            className="p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
            title={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <button
            onClick={() => onSeek(totalFrames - 1)}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
            title="Last frame"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0zm6 0a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" />
            </svg>
          </button>

          <span className="text-xs text-muted tabular-nums ml-2">
            {currentFrame + 1} / {totalFrames}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">FPS</span>
            <input
              type="range"
              min={1}
              max={60}
              value={fps}
              onChange={(e) => onFpsChange(parseInt(e.target.value))}
              className="w-16 sm:w-20 accent-accent h-1"
            />
            <span className="text-xs text-foreground tabular-nums w-5 text-right">
              {fps}
            </span>
          </div>

          <div className="flex rounded-lg overflow-hidden border border-border">
            {QUALITIES.map((q) => (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`px-2 sm:px-3 py-1 text-xs transition-colors ${
                  quality === q
                    ? "bg-accent text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
