export async function buildColorMap(
  maskDataUrl: string,
  cols: number,
  rows: number
): Promise<string[][]> {
  const img = await loadImage(maskDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, cols, rows);

  const imageData = ctx.getImageData(0, 0, cols, rows);
  const pixels = imageData.data;

  const colorMap: string[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowColors: string[] = [];
    for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4;
      rowColors.push(`rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`);
    }
    colorMap.push(rowColors);
  }

  return colorMap;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function getFrameDimensions(frame: string): { cols: number; rows: number } {
  const lines = frame.split("\n").filter((l) => l.length > 0);
  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length), 1);
  return { cols, rows };
}
