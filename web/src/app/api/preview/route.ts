import { execSync, spawn } from "child_process";
import { randomUUID } from "crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const SCRIPT_PATH = join(process.cwd(), "..", "openvac.sh");

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  const fps = formData.get("fps")?.toString() || "15";
  const aspect = formData.get("aspect")?.toString() || "2.0";
  const threshold = formData.get("threshold")?.toString() || "10";
  const motion = formData.get("motion")?.toString() || "0";

  if (!file) {
    return new Response(JSON.stringify({ error: "No video file" }), {
      status: 400,
    });
  }

  const workDir = join(tmpdir(), "openvac-preview-" + randomUUID());
  const framesDir = join(workDir, "frames");
  const videoPath = join(workDir, "input" + getExt(file.name));
  const clipPath = join(workDir, "clip.mp4");

  try {
    await mkdir(framesDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, buffer);

    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: "utf-8" },
    ).trim();
    const duration = parseFloat(durationStr) || 10;
    const fpsNum = parseFloat(fps) || 15;

    const clipDuration = 10 / fpsNum;
    const midpoint = Math.max(0, duration / 2 - clipDuration / 2);

    execSync(
      `ffmpeg -v error -ss ${midpoint} -i "${videoPath}" -t ${clipDuration} -vframes 10 -r ${fpsNum} -an "${clipPath}"`,
      { encoding: "utf-8" },
    );

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("bash", [
        SCRIPT_PATH,
        "-i",
        clipPath,
        "-f",
        fps,
        "-a",
        aspect,
        "-t",
        threshold,
        "-m",
        motion,
        "-o",
        framesDir,
        "-c",
      ]);

      proc.stderr.on("data", (chunk: Buffer) => {
        console.error("[preview stderr]", chunk.toString());
      });

      proc.on("close", (code) => {
        if (code !== 0) reject(new Error(`Script exited with code ${code}`));
        else resolve();
      });

      proc.on("error", reject);
    });

    const tiers = ["medium", "low", "high"];
    const result: Record<string, string[]> = {};

    for (const tier of tiers) {
      const tierDir = join(framesDir, tier);
      try {
        const files = await readdir(tierDir);
        const sorted = files.filter((f) => f.endsWith(".txt")).sort();
        const tierFrames: string[] = [];
        for (const f of sorted) {
          tierFrames.push(await readFile(join(tierDir, f), "utf-8"));
        }
        if (tierFrames.length > 0) result[tier] = tierFrames;
      } catch {
        // tier dir doesn't exist
      }
    }

    await rm(workDir, { recursive: true, force: true });

    return new Response(JSON.stringify({ frames: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
    });
  }
}

function getExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : ".mp4";
}
