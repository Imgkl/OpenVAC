"use client";

import { useState, useCallback } from "react";
import type { Quality } from "@/lib/types";
import JSZip from "jszip";

const QUALITIES: Quality[] = ["low", "medium", "high"];

interface ExportPanelProps {
  frames: Record<Quality, string[]>;
  fps: number;
  textColor: string;
  fontFamily: string;
  quality: Quality;
  onQualityChange: (q: Quality) => void;
  colorMap?: string[][] | null;
}

type SnippetTab = "react" | "vanilla" | "html";

export function ExportPanel({
  frames,
  fps,
  textColor,
  fontFamily,
  quality,
  onQualityChange,
  colorMap,
}: ExportPanelProps) {
  const [activeTab, setActiveTab] = useState<SnippetTab>("react");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const activeFrames = frames[quality].length > 0 ? frames[quality] : frames.medium.length > 0 ? frames.medium : frames.low.length > 0 ? frames.low : frames.high;

  const totalFrames = Math.max(
    frames.low.length,
    frames.medium.length,
    frames.high.length,
  );

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const downloadJSON = useCallback(async () => {
    setDownloading("json");
    try {
      const data = {
        meta: { quality, fps, textColor, fontFamily, generatedAt: new Date().toISOString() },
        frames: activeFrames,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      triggerDownload(blob, `openvac-${quality}.json`);
    } finally {
      setDownloading(null);
    }
  }, [activeFrames, quality, fps, textColor, fontFamily]);

  const downloadZIP = useCallback(async () => {
    setDownloading("zip");
    try {
      const zip = new JSZip();
      activeFrames.forEach((frame, i) => {
        zip.file(`frame_${String(i + 1).padStart(3, "0")}.txt`, frame);
      });
      zip.file(
        "meta.json",
        JSON.stringify({ quality, fps, textColor, fontFamily, generatedAt: new Date().toISOString() }, null, 2),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `openvac-${quality}.zip`);
    } finally {
      setDownloading(null);
    }
  }, [activeFrames, quality, fps, textColor, fontFamily]);

  const downloadHTML = useCallback(() => {
    setDownloading("html");
    try {
      const html = buildStandaloneHTML(activeFrames, fps, textColor, fontFamily, colorMap);
      const blob = new Blob([html], { type: "text/html" });
      triggerDownload(blob, "openvac-animation.html");
    } finally {
      setDownloading(null);
    }
  }, [frames, fps, textColor, fontFamily, colorMap]);

  const snippet = getSnippet(activeTab, fps, textColor, fontFamily);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 pb-3 border-b border-border mb-4">
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span className="text-sm font-semibold">Export &amp; Embed</span>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wider">
              Download
            </span>
            <div className="flex rounded-md overflow-hidden border border-border">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  onClick={() => onQualityChange(q)}
                  disabled={frames[q].length === 0}
                  className={`px-2 py-0.5 text-[10px] transition-colors disabled:opacity-30 ${
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
          <div className="flex gap-2">
            <button
              onClick={downloadJSON}
              disabled={downloading !== null}
              className="group flex items-center gap-0 h-9 px-2.5 border border-border rounded-lg text-foreground hover:border-accent hover:text-accent transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="overflow-hidden max-w-0 group-hover:max-w-24 group-hover:ml-1.5 transition-all duration-200 text-xs whitespace-nowrap">
                {downloading === "json" ? "Preparing..." : "JSON"}
              </span>
            </button>
            <button
              onClick={downloadZIP}
              disabled={downloading !== null}
              className="group flex items-center gap-0 h-9 px-2.5 border border-border rounded-lg text-foreground hover:border-accent hover:text-accent transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span className="overflow-hidden max-w-0 group-hover:max-w-24 group-hover:ml-1.5 transition-all duration-200 text-xs whitespace-nowrap">
                {downloading === "zip" ? "Zipping..." : "ZIP"}
              </span>
            </button>
            <button
              onClick={downloadHTML}
              disabled={downloading !== null}
              className="group flex items-center gap-0 h-9 px-2.5 border border-border rounded-lg text-foreground hover:border-accent hover:text-accent transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              <span className="overflow-hidden max-w-0 group-hover:max-w-24 group-hover:ml-1.5 transition-all duration-200 text-xs whitespace-nowrap">
                {downloading === "html" ? "Building..." : "HTML"}
              </span>
            </button>
          </div>
          <p className="text-[10px] text-muted">
            {activeFrames.length} frames &middot; {quality} quality
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted uppercase tracking-wider">
            Use in Your Project
          </span>
          <div className="flex gap-1 bg-background rounded-lg p-1">
            {(["react", "vanilla", "html"] as SnippetTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCopied(false); }}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-card text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab === "react" ? "React" : tab === "vanilla" ? "Vanilla JS" : "HTML"}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="bg-background border border-border rounded-lg p-3 text-[11px] text-foreground overflow-auto max-h-[calc(100vh-20rem)] leading-relaxed">
              {snippet}
            </pre>
            <button
              onClick={() => copyToClipboard(snippet)}
              className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-card border border-border rounded text-muted hover:text-accent hover:border-accent transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {activeTab !== "html" && (
            <p className="text-[10px] text-muted">
              Place the downloaded JSON file alongside your component, then import it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getSnippet(tab: SnippetTab, fps: number, textColor: string, fontFamily: string): string {
  if (tab === "react") {
    return `import { useEffect, useRef, useState, useCallback } from "react";
import data from "./openvac-frames.json";

const { fps, textColor, fontFamily } = data.meta;
const frames = Array.isArray(data.frames)
  ? data.frames
  : data.frames.medium ?? data.frames.low ?? data.frames.high ?? [];

export function OpenVACPlayer({
  width = "100%",
  height = "auto",
  background = "transparent",
  className = "",
  style = {},
}) {
  const containerRef = useRef(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fontSize, setFontSize] = useState(1);
  const frameRef = useRef(0);

  const recalcSize = useCallback(() => {
    const el = containerRef.current;
    if (!el || frames.length === 0) return;
    const lines = frames[0].split("\\n").filter(Boolean);
    const maxLen = Math.max(...lines.map((l) => l.length), 1);
    const probe = document.createElement("span");
    probe.style.cssText =
      \`font-family:\${fontFamily};font-size:100px;position:absolute;visibility:hidden;white-space:pre\`;
    probe.textContent = "M".repeat(maxLen);
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    if (w > 0) setFontSize(Math.max(1, Math.floor((el.clientWidth / (w / 100)) * 100) / 100));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recalcSize);
    ro.observe(el);
    recalcSize();
    return () => ro.disconnect();
  }, [recalcSize]);

  useEffect(() => {
    if (frames.length === 0) return;
    const interval = 1000 / fps;
    let last = 0;
    let raf;
    const tick = (t) => {
      if (t - last >= interval) {
        last = t - ((t - last) % interval);
        frameRef.current = (frameRef.current + 1) % frames.length;
        setCurrentFrame(frameRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (frames.length === 0) return null;
  const isGradient = textColor.includes("gradient");
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: "hidden", width, height, background, ...style }}
    >
      <pre style={{
        fontSize: fontSize + "px", lineHeight: 1,
        whiteSpace: "pre", fontFamily, margin: 0, padding: 0,
        ...(isGradient
          ? { backgroundImage: textColor, backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
          : { color: textColor }),
      }}>
        {frames[currentFrame]}
      </pre>
    </div>
  );
}

// Usage:
// <OpenVACPlayer />
// <OpenVACPlayer width={800} height={400} />
// <OpenVACPlayer width="50vw" height="100vh" background="#09090b" />
// <OpenVACPlayer className="my-player" style={{ borderRadius: 12 }} />`;
  }

  if (tab === "vanilla") {
    return `// All settings (fps, color, font) are read from the JSON meta.
// You only configure layout below.
const LAYOUT = {
  src: "./openvac-frames.json",
  width: "100%",     // any CSS value: "800px", "50vw", "100%"
  height: "auto",    // any CSS value: "400px", "100vh", "auto"
  background: "transparent",
};

fetch(LAYOUT.src)
  .then((r) => r.json())
  .then((data) => {
    const { fps, textColor, fontFamily } = data.meta;
    const frames = Array.isArray(data.frames)
      ? data.frames
      : data.frames.medium ?? data.frames.low ?? data.frames.high ?? [];
    const container = document.getElementById("openvac-player");
    const pre = document.createElement("pre");
    const isGradient = textColor.includes("gradient");
    pre.style.cssText = \`
      line-height:1; white-space:pre; margin:0; padding:0;
      font-family: \${fontFamily};
    \` + (isGradient
      ? \`background-image: \${textColor}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;\`
      : \`color: \${textColor};\`);
    container.style.overflow = "hidden";
    container.style.background = LAYOUT.background;
    container.style.width = typeof LAYOUT.width === "number" ? LAYOUT.width + "px" : LAYOUT.width;
    container.style.height = typeof LAYOUT.height === "number" ? LAYOUT.height + "px" : LAYOUT.height;
    container.appendChild(pre);

    function resize() {
      if (!frames.length) return;
      const lines = frames[0].split("\\n").filter(Boolean);
      const maxLen = Math.max(...lines.map((l) => l.length), 1);
      const probe = document.createElement("span");
      probe.style.cssText =
        \`font-family:\${fontFamily};font-size:100px;position:absolute;visibility:hidden;white-space:pre\`;
      probe.textContent = "M".repeat(maxLen);
      document.body.appendChild(probe);
      const w = probe.getBoundingClientRect().width;
      document.body.removeChild(probe);
      if (w > 0) pre.style.fontSize = Math.max(1, Math.floor((container.clientWidth / (w / 100)) * 100) / 100) + "px";
    }
    new ResizeObserver(resize).observe(container);
    resize();

    let idx = 0, last = 0;
    const interval = 1000 / fps;
    function tick(t) {
      if (t - last >= interval) {
        last = t - ((t - last) % interval);
        pre.textContent = frames[idx];
        idx = (idx + 1) % frames.length;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

// HTML: <div id="openvac-player"></div>`;
  }

  // HTML standalone
  return `<!-- Download the "Standalone HTML" file above for a
     self-contained, ready-to-open animation.

     It bundles the frame data + player inline.
     Just open openvac-animation.html in any browser. -->

How it works:
• Frame data + all settings (fps, color, font) are baked in
• A minimal player auto-scales the font to fit the viewport
• Uses requestAnimationFrame for smooth ${fps}fps playback
• Zero dependencies — works offline

To customize layout after download:
• Adjust max-width / height in the container style
• Change the background color in the body/container CSS`;
}

function buildStandaloneHTML(
  frames: string[],
  fps: number,
  textColor: string,
  fontFamily: string,
  colorMap?: string[][] | null,
): string {
  const escapedFrames = JSON.stringify(frames);
  const escapedColorMap = colorMap ? JSON.stringify(colorMap) : "null";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>openVAC Animation</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #09090b;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: hidden;
  }
  #container {
    width: 100%;
    max-width: 1200px;
    padding: 16px;
    overflow: hidden;
    position: relative;
  }
  #player {
    line-height: 1;
    white-space: pre;
    font-family: ${fontFamily};
    margin: 0;
    padding: 0;${textColor.includes("gradient") ? `
    background: ${textColor};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;` : `
    color: ${textColor};`}
  }
  #counter {
    position: absolute;
    bottom: 4px;
    right: 12px;
    font-family: monospace;
    font-size: 11px;
    color: #71717a;
    opacity: 0.6;
    user-select: none;
  }
  /* scanlines */
  #container::after {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
    pointer-events: none;
  }
</style>
</head>
<body>
<div id="container">
  <pre id="player"></pre>
  <span id="counter"></span>
</div>
<script>
(function() {
  var frames = ${escapedFrames};
  var colorMap = ${escapedColorMap};
  var fps = ${fps};
  var container = document.getElementById("container");
  var pre = document.getElementById("player");
  var counter = document.getElementById("counter");
  var interval = 1000 / fps;
  var idx = 0;
  var last = 0;
  var grid = [];

  function resize() {
    if (!frames.length) return;
    var lines = frames[0].split("\\n").filter(function(l) { return l.length > 0; });
    var maxLen = Math.max.apply(null, lines.map(function(l) { return l.length; }).concat([1]));
    var probe = document.createElement("span");
    probe.style.cssText = "font-family:${fontFamily.replace(/"/g, '\\"')};font-size:100px;position:absolute;visibility:hidden;white-space:pre";
    probe.textContent = Array(maxLen + 1).join("M");
    document.body.appendChild(probe);
    var w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    if (w > 0) {
      var size = Math.max(1, Math.floor((container.clientWidth / (w / 100)) * 100) / 100);
      pre.style.fontSize = size + "px";
    }
  }

  function buildGrid() {
    if (!colorMap || !colorMap.length || !frames.length) return;
    pre.textContent = "";
    grid = [];
    var lines = frames[0].split("\\n").filter(function(l) { return l.length > 0; });
    for (var r = 0; r < lines.length; r++) {
      var rowSpans = [];
      var rowColors = colorMap[r] || [];
      for (var c = 0; c < lines[r].length; c++) {
        var span = document.createElement("span");
        span.style.color = rowColors[c] || "";
        span.textContent = lines[r][c];
        pre.appendChild(span);
        rowSpans.push(span);
      }
      if (r < lines.length - 1) pre.appendChild(document.createTextNode("\\n"));
      grid.push(rowSpans);
    }
  }

  function updateGrid(fi) {
    var lines = frames[fi].split("\\n");
    for (var r = 0; r < grid.length; r++) {
      var line = lines[r] || "";
      var row = grid[r];
      for (var c = 0; c < row.length; c++) {
        var ch = c < line.length ? line[c] : " ";
        if (row[c].textContent !== ch) row[c].textContent = ch;
      }
    }
  }

  new ResizeObserver(resize).observe(container);
  resize();

  var useMask = colorMap && colorMap.length > 0;
  if (useMask) buildGrid();

  function tick(t) {
    if (t - last >= interval) {
      last = t - ((t - last) % interval);
      if (useMask) {
        updateGrid(idx);
      } else {
        pre.textContent = frames[idx];
      }
      counter.textContent = (idx + 1) + "/" + frames.length;
      idx = (idx + 1) % frames.length;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
</script>
</body>
</html>`;
}
