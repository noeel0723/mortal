import type { pixelCanvas, Point } from './pixels.ts';

export type AssetCanvas = ReturnType<typeof pixelCanvas>;
export const assetArtSize = 96;

export function tint(color: number, target: number, amount: number) {
  const channel = (offset: number) => Math.round((color >>> offset & 255) * (1 - amount) + (target >>> offset & 255) * amount);
  return channel(16) << 16 | channel(8) << 8 | channel(0);
}

export const darken = (color: number, amount = .28) => tint(color, 0x24212c, amount);
export const lighten = (color: number, amount = .28) => tint(color, 0xfff5df, amount);

export function box(canvas: AssetCanvas, x: number, y: number, width: number, height: number, color: number) {
  if (width > 0 && height > 0) canvas.polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], color);
}

export function oval(canvas: AssetCanvas, x: number, y: number, rx: number, ry: number, color: number) {
  const dx = Math.max(1, Math.round(rx * .69));
  const dy = Math.max(1, Math.round(ry * .69));
  canvas.polygon([[x - rx, y - dy], [x - dx, y - ry], [x + dx, y - ry], [x + rx, y - dy],
    [x + rx, y + dy], [x + dx, y + ry], [x - dx, y + ry], [x - rx, y + dy]], color);
}

export function disc(canvas: AssetCanvas, x: number, y: number, radius: number, color: number) {
  for (let dy = -radius; dy <= radius; dy++) {
    const half = Math.floor(Math.sqrt(radius * radius - dy * dy));
    box(canvas, x - half, y + dy, half * 2 + 1, 1, color);
  }
}

export function stroke(canvas: AssetCanvas, from: Point, to: Point, width: number, color: number) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (width === 1) {
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let step = 0; step <= steps; step++) {
      box(canvas, Math.round(from[0] + dx * step / steps), Math.round(from[1] + dy * step / steps), 1, 1, color);
    }
    return;
  }
  const length = Math.hypot(dx, dy) || 1;
  const x = -dy * width / length / 2;
  const y = dx * width / length / 2;
  const offset = ([px, py]: Point, side: number): Point =>
    [Math.round(px + side * x), Math.round(py + side * y)];
  canvas.polygon([offset(from, 1), offset(to, 1), offset(to, -1), offset(from, -1)], color);
}
