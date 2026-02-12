import { spawn } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

const JOBS_DIR = join(tmpdir(), "openvac-jobs");
const SCRIPT_PATH = join(process.cwd(), "..", "openvac.sh");

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  const fps = formData.get("fps")?.toString() || "15";
  const aspect = formData.get("aspect")?.toString() || "2.0";
  const threshold = formData.get("threshold")?.toString() || "10";
  const motion = formData.get("motion")?.toString() || "0";

  if (!file) {
    return new Response(JSON.stringify({ error: "No video file provided" }), {
      status: 400,
    });
  }

  const jobId = randomUUID();
  const jobDir = join(JOBS_DIR, jobId);
  const framesDir = join(jobDir, "frames");
  const videoPath = join(jobDir, "input" + getExt(file.name));

  await mkdir(framesDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(videoPath, buffer);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const proc = spawn("bash", [
        SCRIPT_PATH,
        "-i", videoPath,
        "-f", fps,
        "-a", aspect,
        "-t", threshold,
        "-m", motion,
        "-o", framesDir,
        "-c",
      ]);

      let totalFrames = 0;

      proc.stdout.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          const extractMatch = line.match(/Extracted (\d+) frames/);
          if (extractMatch) {
            totalFrames = parseInt(extractMatch[1]);
            send({ type: "extracting", total: totalFrames });
          }

          const progressMatch = line.match(/Converting frame (\d+)\/(\d+)/);
          if (progressMatch) {
            send({
              type: "progress",
              current: parseInt(progressMatch[1]),
              total: parseInt(progressMatch[2]),
            });
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        console.error("[openvac.sh stderr]", chunk.toString());
      });

      proc.on("close", (code) => {
        if (code === 0) {
          send({ type: "done", jobId, frameCount: totalFrames });
        } else {
          send({ type: "error", message: `Script exited with code ${code}` });
        }
        controller.close();
      });

      proc.on("error", (err) => {
        send({ type: "error", message: err.message });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function getExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : ".mp4";
}
