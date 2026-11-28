import { box, disc, oval, stroke } from './assetPixels.ts';
import type { AssetCanvas } from './assetPixels.ts';

export const chassis = 0x262a38;
export const rubber = 0x363a4b;
export const metal = 0x8c98a0;
export const chrome = 0xc6cdd0;
export const windshield = 0x45596c;
export const sky = 0x9db9c7;

export function vehicleShadow(canvas: AssetCanvas, y: number) {
  oval(canvas, 48, y, 39, 3, 0xdddcd6);
  oval(canvas, 48, y - 1, 34, 2, 0xc8c6c0);
}

export function tire(canvas: AssetCanvas, x: number, y: number, r: number, hub = metal, spoked = false) {
  disc(canvas, x, y, r, chassis);
  disc(canvas, x, y - 1, r - 2, rubber);
  disc(canvas, x, y, r - 3, hub);
  disc(canvas, x, y, r - 4, 0x454b59);
  const radius = r - 5;
  const diagonal = Math.round(radius * .72);
  for (const [dx, dy] of [[radius, 0], [0, radius], [diagonal, diagonal], [-diagonal, diagonal]] as const) {
    stroke(canvas, [x - dx, y - dy], [x + dx, y + dy], spoked ? 1 : 2, hub);
  }
  disc(canvas, x, y, 2, chrome);
  box(canvas, x - 1, y - 1, 2, 1, 0xe0e7e8);
  box(canvas, x - r + 2, y - r + 3, 2, 1, 0x575b64);
}
