"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface ASCIIAnimationHandle {
  seekTo: (frame: number) => void;
}

interface ASCIIAnimationProps {
  frames: string[];
  className?: string;
  fps?: number;
  paused?: boolean;
  showFrameCounter?: boolean;
  fontFamily?: string;
  textColor?: string;
  colorMap?: string[][] | null;
  onFrameChange?: (index: number) => void;
}

export const ASCIIAnimation = forwardRef<
  ASCIIAnimationHandle,
  ASCIIAnimationProps
>(function ASCIIAnimation(
  {
    frames,
    className,
    fps = 24,
    paused = false,
    showFrameCounter = false,
    fontFamily = "var(--font-geist-mono), ui-monospace, monospace",
    textColor,
    colorMap,
    onFrameChange,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const maskedPreRef = useRef<HTMLPreElement>(null);
  const gridRef = useRef<HTMLSpanElement[][]>([]);
  const rafRef = useRef<number>(0);
  const frameIdxRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const pausedRef = useRef(paused);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [fontSize, setFontSize] = useState(1);

  pausedRef.current = paused;

  useImperativeHandle(ref, () => ({
    seekTo(frame: number) {
      const clamped = Math.max(0, Math.min(frame, frames.length - 1));
      frameIdxRef.current = clamped;
      setCurrentFrame(clamped);
      onFrameChange?.(clamped);
    },
  }));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const recalcSize = useCallback(() => {
    const container = containerRef.current;
    if (!container || frames.length === 0) return;

    const lines = frames[0].split("\n").filter((l) => l.length > 0);
    const maxLineLen = Math.max(...lines.map((l) => l.length), 1);

    const containerWidth = container.clientWidth;
    if (containerWidth === 0) return;

    const probe = document.createElement("span");
    probe.style.fontFamily = fontFamily;
    probe.style.fontSize = "100px";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.textContent = "M".repeat(maxLineLen);
    document.body.appendChild(probe);
    const fullWidth = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);

    if (fullWidth === 0) return;

    const charWidthPer1px = fullWidth / 100;
    const idealSize = containerWidth / charWidthPer1px;
    const newSize = Math.max(1, Math.floor(idealSize * 100) / 100);
    setFontSize(newSize);
  }, [frames, fontFamily]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(recalcSize);
    ro.observe(container);
    recalcSize();
    return () => ro.disconnect();
  }, [recalcSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    io.observe(container);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (frames.length === 0) return;

    const interval = 1000 / fps;

    const tick = (time: number) => {
      if (
        !isVisibleRef.current ||
        reducedMotionRef.current ||
        pausedRef.current
      ) {
        lastTimeRef.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (time - lastTimeRef.current >= interval) {
        lastTimeRef.current = time - ((time - lastTimeRef.current) % interval);
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
        const idx = frameIdxRef.current;
        setCurrentFrame(idx);
        onFrameChange?.(idx);
        updateMaskedGrid(idx);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, fps, onFrameChange]);

  const updateMaskedGrid = useCallback(
    (frameIdx: number) => {
      const grid = gridRef.current;
      if (grid.length === 0 || frames.length === 0) return;
      const frame = frames[frameIdx] ?? "";
      const lines = frame.split("\n");
      for (let row = 0; row < grid.length; row++) {
        const rowSpans = grid[row];
        const line = lines[row] ?? "";
        for (let col = 0; col < rowSpans.length; col++) {
          const ch = col < line.length ? line[col] : " ";
          if (rowSpans[col].textContent !== ch) {
            rowSpans[col].textContent = ch;
          }
        }
      }
    },
    [frames],
  );

  useEffect(() => {
    const pre = maskedPreRef.current;
    if (!pre || !colorMap || colorMap.length === 0 || frames.length === 0) {
      gridRef.current = [];
      return;
    }

    const firstFrame = frames[0] ?? "";
    const lines = firstFrame.split("\n").filter((l) => l.length > 0);

    pre.textContent = "";
    const grid: HTMLSpanElement[][] = [];

    for (let row = 0; row < lines.length; row++) {
      const rowColors = colorMap[row];
      const rowSpans: HTMLSpanElement[] = [];
      for (let col = 0; col < lines[row].length; col++) {
        const span = document.createElement("span");
        span.style.color = rowColors?.[col] ?? "";
        span.textContent = lines[row][col];
        pre.appendChild(span);
        rowSpans.push(span);
      }
      if (row < lines.length - 1) {
        pre.appendChild(document.createTextNode("\n"));
      }
      grid.push(rowSpans);
    }

    gridRef.current = grid;
    updateMaskedGrid(frameIdxRef.current);

    return () => {
      gridRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMap]);

  useEffect(() => {
    updateMaskedGrid(currentFrame);
  }, [currentFrame, updateMaskedGrid]);

  if (frames.length === 0) return null;

  const hasMask = !!colorMap && colorMap.length > 0;
  const hasGradient = !!textColor && textColor.includes("gradient");

  const basePreStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: 1,
    whiteSpace: "pre",
    fontFamily,
    margin: 0,
    padding: 0,
  };

  const colorStyle: React.CSSProperties = hasGradient
    ? {
        backgroundImage: textColor,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }
    : { color: textColor };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", width: "100%" }}
    >
      <pre
        ref={preRef}
        style={{
          ...basePreStyle,
          ...colorStyle,
          display: hasMask ? "none" : undefined,
        }}
      >
        {frames[currentFrame]}
      </pre>
      <pre
        ref={maskedPreRef}
        style={{
          ...basePreStyle,
          display: hasMask ? undefined : "none",
        }}
      />
      {showFrameCounter && (
        <span className="absolute bottom-1 right-2 font-mono text-xs text-muted opacity-60 select-none pointer-events-none">
          {currentFrame + 1}/{frames.length}
        </span>
      )}
    </div>
  );
});
