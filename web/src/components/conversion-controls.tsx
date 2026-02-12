"use client";

import { FONT_OPTIONS, type ConversionSettings } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import ColorPicker from "react-best-gradient-color-picker";

function isGradient(color: string): boolean {
  return color.includes("gradient");
}

interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

function isMonospace(family: string): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.fontSize = "72px";
  probe.style.whiteSpace = "pre";
  document.body.appendChild(probe);

  probe.style.fontFamily = `"${family}", monospace`;
  probe.textContent = "iiiiiiiiii";
  const narrowWidth = probe.getBoundingClientRect().width;
  probe.textContent = "MMMMMMMMMM";
  const wideWidth = probe.getBoundingClientRect().width;

  document.body.removeChild(probe);
  return Math.abs(narrowWidth - wideWidth) < 1;
}

async function getSystemFonts(): Promise<string[]> {
  try {
    if ("queryLocalFonts" in window) {
      const fonts: FontData[] = await (
        window as unknown as { queryLocalFonts: () => Promise<FontData[]> }
      ).queryLocalFonts();
      const families = [...new Set(fonts.map((f) => f.family))];
      const mono = families.filter(isMonospace);
      mono.sort((a, b) => a.localeCompare(b));
      return mono;
    }
  } catch {
    // permission denied or not supported
  }
  return [];
}

interface ConversionControlsProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  disabled?: boolean;
}

export function ConversionControls({
  settings,
  onChange,
  disabled,
}: ConversionControlsProps) {
  const maskInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  const loadFonts = async () => {
    if (fontsLoaded) {
      setShowFontPicker(!showFontPicker);
      return;
    }
    const fonts = await getSystemFonts();
    setSystemFonts(fonts);
    setFontsLoaded(true);
    setShowFontPicker(true);
  };

  useEffect(() => {
    if (!showFontPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowFontPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFontPicker]);

  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColorPicker]);

  const filteredFonts = fontSearch
    ? systemFonts.filter((f) =>
        f.toLowerCase().includes(fontSearch.toLowerCase()),
      )
    : systemFonts;

  const currentLabel =
    FONT_OPTIONS.find((f) => f.value === settings.font)?.label || settings.font;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">
          Font
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onChange({ ...settings, font: f.value });
                setShowFontPicker(false);
              }}
              disabled={disabled}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                settings.font === f.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-foreground hover:border-muted"
              }`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={loadFonts}
            disabled={disabled}
            className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
              !FONT_OPTIONS.some((f) => f.value === settings.font)
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:text-foreground hover:border-muted"
            }`}
          >
            System Fonts...
          </button>
        </div>

        {showFontPicker && (
          <div
            ref={pickerRef}
            className="mt-1 bg-card border border-border rounded-lg overflow-hidden"
          >
            {systemFonts.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted text-center">
                {fontsLoaded
                  ? "No monospace fonts detected. Your browser may not support the Local Font Access API — try Chrome or Edge."
                  : "Loading fonts..."}
              </div>
            ) : (
              <>
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search fonts..."
                    autoFocus
                    className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredFonts.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-muted text-center">
                      No matches
                    </div>
                  ) : (
                    filteredFonts.map((family) => (
                      <button
                        key={family}
                        type="button"
                        onClick={() => {
                          onChange({
                            ...settings,
                            font: `"${family}", monospace`,
                          });
                          setShowFontPicker(false);
                          setFontSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors flex items-center justify-between ${
                          settings.font === `"${family}", monospace`
                            ? "text-accent bg-accent/5"
                            : "text-foreground"
                        }`}
                      >
                        <span style={{ fontFamily: `"${family}", monospace` }}>
                          {family}
                        </span>
                        <span
                          className="text-muted text-[10px]"
                          style={{ fontFamily: `"${family}", monospace` }}
                        >
                          AaBb123
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted">
                  {systemFonts.length} monospace fonts found
                </div>
              </>
            )}
          </div>
        )}

        {!FONT_OPTIONS.some((f) => f.value === settings.font) &&
          !showFontPicker && (
            <div
              className="mt-1 px-3 py-2 text-xs bg-background border border-border rounded-lg flex items-center justify-between"
              style={{ fontFamily: settings.font }}
            >
              <span className="text-foreground">{currentLabel}</span>
              <span className="text-muted">AaBb 0123 @#$%</span>
            </div>
          )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted uppercase tracking-wider">
            FPS
          </span>
          <input
            type="range"
            min={1}
            max={30}
            value={settings.fps}
            onChange={(e) =>
              onChange({ ...settings, fps: parseInt(e.target.value) })
            }
            disabled={disabled}
            className="accent-accent"
          />
          <span className="text-xs text-foreground text-center tabular-nums">
            {settings.fps}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted uppercase tracking-wider">
            Aspect Ratio
          </span>
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            value={settings.aspect}
            onChange={(e) =>
              onChange({ ...settings, aspect: parseFloat(e.target.value) })
            }
            disabled={disabled}
            className="accent-accent"
          />
          <span className="text-xs text-foreground text-center tabular-nums">
            {settings.aspect.toFixed(1)}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted uppercase tracking-wider">
            Black Clip
          </span>
          <input
            type="range"
            min={0}
            max={50}
            value={settings.threshold}
            onChange={(e) =>
              onChange({ ...settings, threshold: parseInt(e.target.value) })
            }
            disabled={disabled}
            className="accent-accent"
          />
          <span className="text-xs text-foreground text-center tabular-nums">
            {settings.threshold}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted uppercase tracking-wider">
            Motion Filter
          </span>
          <input
            type="range"
            min={0}
            max={80}
            value={settings.motion}
            onChange={(e) =>
              onChange({ ...settings, motion: parseInt(e.target.value) })
            }
            disabled={disabled}
            className="accent-accent"
          />
        <span className="text-xs text-foreground text-center tabular-nums">
          {settings.motion === 0 ? "off" : settings.motion}
        </span>
      </label>
    </div>

      <div className="flex flex-col gap-1.5" ref={colorPickerRef}>
        <span className="text-xs text-muted uppercase tracking-wider">
          Text Color
        </span>
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-lg hover:border-muted transition-colors"
        >
          <div
            className="w-5 h-5 rounded-md border border-border shrink-0"
            style={{ background: settings.textColor }}
          />
          <span className="text-foreground truncate text-[11px]">
            {isGradient(settings.textColor) ? "Gradient" : settings.textColor}
          </span>
          <svg className={`w-3 h-3 text-muted ml-auto transition-transform ${showColorPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showColorPicker && (
          <div className="mt-1 bg-card border border-border rounded-lg p-3 overflow-hidden">
            <ColorPicker
              value={settings.textColor}
              onChange={(val: string) => onChange({ ...settings, textColor: val })}
              width={260}
              height={140}
              disableLightMode
              hidePresets
              hideAdvancedSliders
              hideColorGuide
              hideInputType
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">
          Color Mask
        </span>
        {settings.maskImage ? (
          <div className="flex items-center gap-3">
            <img
              src={settings.maskImage}
              alt="Mask"
              className="w-16 h-16 object-cover rounded-lg border border-border"
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground">Mask active</span>
              <span className="text-[10px] text-muted">
                Each character gets the color of the corresponding pixel
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...settings, maskImage: null })}
              className="ml-auto text-xs text-muted hover:text-red-400 transition-colors px-2 py-1 border border-border rounded-lg shrink-0"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => maskInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center justify-center gap-2 px-3 py-3 text-xs border border-dashed border-border rounded-lg text-muted hover:text-foreground hover:border-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.068 2.068M12 6.75h.008v.008H12V6.75z" />
            </svg>
            Upload mask image
          </button>
        )}
        <input
          ref={maskInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              onChange({ ...settings, maskImage: reader.result as string });
            };
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
