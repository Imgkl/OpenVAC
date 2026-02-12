export type Quality = "low" | "medium" | "high";

export interface ConversionSettings {
  fps: number;
  aspect: number;
  threshold: number;
  motion: number;
  font: string;
  textColor: string;
  maskImage: string | null;
}

export const FONT_OPTIONS = [
  { id: "geist-mono", label: "Geist Mono", value: "var(--font-geist-mono), ui-monospace, monospace" },
  { id: "system-mono", label: "System Mono", value: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace" },
  { id: "courier", label: "Courier New", value: "'Courier New', Courier, monospace" },
  { id: "lucida", label: "Lucida Console", value: "'Lucida Console', 'Lucida Sans Typewriter', monospace" },
  { id: "monaco", label: "Monaco", value: "Monaco, 'Cascadia Code', monospace" },
] as const;

export type SSEEvent =
  | { type: "extracting"; total: number }
  | { type: "progress"; current: number; total: number }
  | { type: "done"; jobId: string; frameCount: number }
  | { type: "error"; message: string };

export interface JobResult {
  jobId: string;
  frameCount: number;
}
