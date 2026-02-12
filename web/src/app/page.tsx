"use client";

import {
  ASCIIAnimation,
  type ASCIIAnimationHandle,
} from "@/components/openvac-animation";
import { ConversionControls } from "@/components/conversion-controls";
import { ExportPanel } from "@/components/export-panel";
import { PlayerControls } from "@/components/player-controls";
import { ProgressBar } from "@/components/progress-bar";
import { UploadZone } from "@/components/upload-zone";
import {
  FONT_OPTIONS,
  type ConversionSettings,
  type Quality,
  type SSEEvent,
} from "@/lib/types";
import { buildColorMap, getFrameDimensions } from "@/lib/mask";
import { useCallback, useEffect, useRef, useState } from "react";

type AppState = "upload" | "converting" | "preview";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>({
    fps: 15,
    aspect: 2.0,
    threshold: 10,
    motion: 0,
    font: FONT_OPTIONS[0].value,
    textColor: "#34d399",
    maskImage: null,
  });

  const [colorMap, setColorMap] = useState<string[][] | null>(null);

  const [previewFrames, setPreviewFrames] = useState<Record<Quality, string[]>>(
    {
      low: [],
      medium: [],
      high: [],
    },
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparing...");

  const [jobId, setJobId] = useState("");
  const [frameCount, setFrameCount] = useState(0);
  const [frames, setFrames] = useState<Record<Quality, string[]>>({
    low: [],
    medium: [],
    high: [],
  });
  const [quality, setQuality] = useState<Quality>("medium");
  const [playing, setPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackFps, setPlaybackFps] = useState(15);
  const [error, setError] = useState("");

  const animRef = useRef<ASCIIAnimationHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback(
    async (videoFile: File, s: ConversionSettings) => {
      previewAbortRef.current?.abort();
      previewAbortRef.current = new AbortController();
      setPreviewLoading(true);

      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("fps", s.fps.toString());
      formData.append("aspect", s.aspect.toString());
      formData.append("threshold", s.threshold.toString());
      formData.append("motion", s.motion.toString());

      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          body: formData,
          signal: previewAbortRef.current.signal,
        });
        if (!res.ok) throw new Error("Preview failed");
        const data = await res.json();
        const pf: Record<Quality, string[]> = { low: [], medium: [], high: [] };
        if (data.frames) {
          if (data.frames.low) pf.low = data.frames.low;
          if (data.frames.medium) pf.medium = data.frames.medium;
          if (data.frames.high) pf.high = data.frames.high;
        }
        setPreviewFrames(pf);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Preview error:", e);
        }
      } finally {
        setPreviewLoading(false);
      }
    },
    [],
  );

  const handleFileSelect = useCallback(
    (f: File) => {
      setFile(f);
      setPreviewFrames({ low: [], medium: [], high: [] });
      fetchPreview(f, settings);
    },
    [settings, fetchPreview],
  );

  const handleSettingsChange = useCallback(
    (newSettings: ConversionSettings) => {
      setSettings(newSettings);

      const needsReconvert =
        newSettings.fps !== settings.fps ||
        newSettings.aspect !== settings.aspect ||
        newSettings.threshold !== settings.threshold ||
        newSettings.motion !== settings.motion;

      if (file && needsReconvert) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          fetchPreview(file, newSettings);
        }, 800);
      }
    },
    [file, settings, fetchPreview],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      previewAbortRef.current?.abort();
    };
  }, []);

  const pickBest = (src: Record<Quality, string[]>) =>
    src[quality].length > 0
      ? src[quality]
      : src.medium.length > 0
        ? src.medium
        : src.low.length > 0
          ? src.low
          : src.high;

  const activeFrames = pickBest(frames);
  const activePreviewFrames = pickBest(previewFrames);

  useEffect(() => {
    if (!settings.maskImage) {
      setColorMap(null);
      return;
    }
    const referenceFrames =
      activeFrames.length > 0 ? activeFrames : activePreviewFrames.length > 0 ? activePreviewFrames : null;
    if (!referenceFrames || referenceFrames.length === 0) {
      setColorMap(null);
      return;
    }
    const { cols, rows } = getFrameDimensions(referenceFrames[0]);
    let cancelled = false;
    buildColorMap(settings.maskImage, cols, rows).then((map) => {
      if (!cancelled) setColorMap(map);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.maskImage, frames, previewFrames, quality]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setError("");
    setState("converting");
    setProgressCurrent(0);
    setProgressTotal(0);
    setProgressLabel("Uploading...");

    const formData = new FormData();
    formData.append("video", file);
    formData.append("fps", settings.fps.toString());
    formData.append("aspect", settings.aspect.toString());
    formData.append("threshold", settings.threshold.toString());
    formData.append("motion", settings.motion.toString());

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setError("Upload failed");
        setState("upload");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));

            if (event.type === "extracting") {
              setProgressLabel("Extracting frames...");
              setProgressTotal(event.total);
            } else if (event.type === "progress") {
              setProgressLabel("Converting frames...");
              setProgressCurrent(event.current);
              setProgressTotal(event.total);
            } else if (event.type === "done") {
              setJobId(event.jobId);
              setFrameCount(event.frameCount);
              setPlaybackFps(settings.fps);
              await loadFrames(event.jobId, event.frameCount);
              setState("preview");
            } else if (event.type === "error") {
              setError(event.message);
              setState("upload");
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("Connection failed");
        setState("upload");
      }
    }
  }, [file, settings]);

  const loadFrames = async (jid: string, count: number) => {
    const loaded: Record<Quality, string[]> = {
      low: [],
      medium: [],
      high: [],
    };

    for (const q of ["medium", "low", "high"] as Quality[]) {
      const arr: string[] = [];
      let ok = true;
      for (let i = 1; i <= count; i++) {
        const pad = String(i).padStart(3, "0");
        try {
          const res = await fetch(`/api/frames/${jid}/${q}/frame_${pad}.txt`);
          if (!res.ok) {
            ok = false;
            break;
          }
          arr.push(await res.text());
        } catch {
          ok = false;
          break;
        }
      }
      if (ok) loaded[q] = arr;
    }

    setFrames(loaded);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setState("upload");
  };

  const handleReset = () => {
    setState("upload");
    setFile(null);
    setPreviewFrames({ low: [], medium: [], high: [] });
    setFrames({ low: [], medium: [], high: [] });
    setColorMap(null);
    setJobId("");
    setFrameCount(0);
    setCurrentFrame(0);
    setError("");
  };

  const handleSeek = (frame: number) => {
    animRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  };

  return (
    <main
      className={`min-h-screen flex flex-col ${state === "preview" ? "" : "items-center justify-center px-3 py-4 sm:p-6"}`}
    >
      <div
        className={`w-full flex flex-col ${state === "preview" ? "h-screen" : "gap-3 sm:gap-4 max-w-5xl"}`}
      >
        {state !== "preview" && (
          <header className="flex items-center gap-2 sm:gap-3">
            <span className="text-accent text-base sm:text-lg">&gt;_</span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              openVAC
            </h1>
            <span className="text-muted text-xs sm:text-sm hidden sm:inline">
              Open Video ASCII Conversions
            </span>
          </header>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {state === "upload" && (
          <div className="flex flex-col gap-6">
            {!file && (
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <UploadZone onFileSelect={handleFileSelect} />
              </div>
            )}

            {file && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 bg-card border border-border rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 px-3 py-2 bg-background rounded-lg border border-border">
                    <svg
                      className="w-5 h-5 text-accent shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <span className="text-xs text-muted">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      onClick={handleReset}
                      className="text-xs text-muted hover:text-red-400 transition-colors"
                    >
                      &times;
                    </button>
                  </div>

                  <ConversionControls
                    settings={settings}
                    onChange={handleSettingsChange}
                  />

                  <button
                    onClick={handleConvert}
                    className="w-full py-3 bg-accent text-background font-bold rounded-lg hover:brightness-110 transition-all active:scale-[0.99]"
                  >
                    Convert Full Video
                  </button>
                </div>

                <div className="flex flex-col gap-2 bg-card border border-border rounded-xl p-3 sm:p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted uppercase tracking-wider">
                      Preview
                    </span>
                    {previewLoading && (
                      <span className="text-xs text-accent animate-pulse">
                        Generating...
                      </span>
                    )}
                    {!previewLoading && activePreviewFrames.length > 0 && (
                      <span className="text-xs text-muted">
                        {activePreviewFrames.length} frames from middle
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-[200px] flex items-center justify-center scanlines rounded-lg overflow-hidden bg-background/50">
                    {activePreviewFrames.length > 0 ? (
                      <ASCIIAnimation
                        frames={activePreviewFrames}
                        fps={settings.fps}
                        fontFamily={settings.font}
                        textColor={settings.textColor}
                        colorMap={colorMap}
                        className="w-full"
                      />
                    ) : previewLoading ? (
                      <div className="text-xs text-muted animate-pulse">
                        Processing preview...
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        Upload a video to see preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {state === "converting" && (
          <div className="flex flex-col gap-4 sm:gap-6 bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{progressLabel}</h2>
                <p className="text-xs text-muted mt-0.5 truncate">
                  {file?.name}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-xs text-muted hover:text-red-400 transition-colors px-3 py-1.5 border border-border rounded-lg shrink-0"
              >
                Cancel
              </button>
            </div>
            <ProgressBar
              current={progressCurrent}
              total={progressTotal}
              label={progressLabel}
            />
            <div className="text-center text-xs text-muted animate-pulse">
              This may take a while for long videos...
            </div>
          </div>
        )}

        {state === "preview" && (
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 border-b border-border bg-card shrink-0">
                <button onClick={handleReset} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <span className="text-accent text-sm">&gt;_</span>
                  <span className="text-sm font-bold tracking-tight">openVAC</span>
                </button>
                <span className="text-muted text-xs hidden sm:inline">Open Video ASCII Conversions</span>
                <div className="ml-auto">
                  <button
                    onClick={handleReset}
                    className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 border border-border rounded-md hover:border-muted"
                  >
                    &larr; New video
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden scanlines bg-background flex items-center justify-center p-2 sm:p-4">
                <ASCIIAnimation
                  ref={animRef}
                  frames={activeFrames}
                  fps={playbackFps}
                  paused={!playing}
                  fontFamily={settings.font}
                  textColor={settings.textColor}
                  colorMap={colorMap}
                  onFrameChange={setCurrentFrame}
                  className="w-full"
                />
              </div>

              <div className="shrink-0 border-t border-border bg-card px-3 py-2 sm:px-4 sm:py-3">
                <PlayerControls
                  playing={playing}
                  onTogglePlay={() => setPlaying(!playing)}
                  currentFrame={currentFrame}
                  totalFrames={activeFrames.length}
                  onSeek={handleSeek}
                  quality={quality}
                  onQualityChange={setQuality}
                  fps={playbackFps}
                  onFpsChange={setPlaybackFps}
                />
              </div>
            </div>

            <aside className="lg:w-80 xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto sidebar-scroll">
              <div className="p-3 sm:p-4 flex flex-col gap-4">
                <ExportPanel
                  frames={frames}
                  fps={playbackFps}
                  textColor={settings.textColor}
                  fontFamily={settings.font}
                  quality={quality}
                  onQualityChange={setQuality}
                  colorMap={colorMap}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
