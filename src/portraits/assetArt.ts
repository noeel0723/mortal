import type { AssetListing } from '../data/shops.ts';
import { pixelCanvas } from './pixels.ts';

type Canvas = ReturnType<typeof pixelCanvas>;
const ink = 0x222c46;
const glass = 0x41667d;
const reflection = 0xa7d5db;
const light = 0xf9e6b0;
const cache = new Map<string, string>();

function shade(color: number, factor: number) {
  const channel = (offset: number) => Math.min(255, Math.round((color >>> offset & 255) * factor));
  return channel(16) << 16 | channel(8) << 8 | channel(0);
}

function rect(canvas: Canvas, x: number, y: number, width: number, height: number, color: number) {
  canvas.polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], color);
}

function circle(canvas: Canvas, x: number, y: number, r: number, color: number) {
  const mid = Math.round(r * .7);
  canvas.polygon([[x - r, y - mid], [x - mid, y - r], [x + mid, y - r], [x + r, y - mid],
    [x + r, y + mid], [x + mid, y + r], [x - mid, y + r], [x - r, y + mid]], color);
}

const housePlans = [
  { x: 16, width: 39, top: 35, floors: 1, roof: 'gable', peak: 22, windows: 3, trim: 0xa65a52 },
  { x: 13, width: 45, top: 34, floors: 1, roof: 'gable', peak: 17, windows: 3, trim: 0x587367 },
  { x: 22, width: 30, top: 24, floors: 2, roof: 'flat', peak: 0, windows: 2, trim: 0x764c55 },
  { x: 9, width: 53, top: 37, floors: 1, roof: 'hip', peak: 27, windows: 4, trim: 0xb06550 },
  { x: 12, width: 49, top: 22, floors: 2, roof: 'flat', peak: 0, windows: 4, trim: 0x635569 },
  { x: 14, width: 44, top: 34, floors: 2, roof: 'gable', peak: 10, windows: 3, trim: 0x554a56 },
  { x: 8, width: 55, top: 26, floors: 2, roof: 'hip', peak: 20, windows: 4, trim: 0xab6755 },
  { x: 9, width: 54, top: 21, floors: 2, roof: 'flat', peak: 0, windows: 5, trim: 0x345365 },
  { x: 7, width: 57, top: 25, floors: 2, roof: 'hip', peak: 15, windows: 5, trim: 0x66778f },
  { x: 15, width: 43, top: 13, floors: 3, roof: 'flat', peak: 0, windows: 4, trim: 0x3c5a76 },
] as const;

function drawHouse(canvas: Canvas, design: number, color: number) {
  const { x, width, top, roof, peak, floors, windows, trim } = housePlans[design]!;
  const right = x + width;
  rect(canvas, 0, 53, 72, 19, 0x94b393);
  rect(canvas, 0, 65, 72, 7, 0xc6cfab);
  rect(canvas, 5, 13, 11, 3, 0xe9eff0);
  rect(canvas, 54, 15, 13, 3, 0xe9eff0);
  rect(canvas, x + 2, top, width, 60 - top, shade(color, .72));
  rect(canvas, x, top, width - 5, 60 - top, color);
  rect(canvas, x, 57, width + 3, 5, shade(trim, .8));

  if (roof === 'flat') {
    if (design === 9) rect(canvas, x + 6, top - 6, width - 17, 7, shade(color, .77));
    rect(canvas, x - 2, top - 3, width + 6, 4, trim);
    rect(canvas, x - 1, top - 3, width + 1, 1, shade(trim, 1.42));
  } else {
    const setback = roof === 'gable' ? width / 2 : 11;
    canvas.polygon([[x - 4, top + 2], [x + Math.round(setback), peak], [right - Math.round(setback), peak], [right + 4, top + 2]], trim);
    rect(canvas, x - 3, top, width + 7, 2, shade(trim, .67));
    if (design === 1 || design === 5) rect(canvas, right - 16, peak - 1, 5, 11, shade(trim, .75));
    if (design === 5) canvas.polygon([[27, top], [36, peak + 6], [44, top]], color);
  }

  const step = Math.floor((width - 10) / windows);
  const windowWidth = design === 7 ? step - 1 : Math.max(3, step - 3);
  for (let floor = 0; floor < floors; floor++) {
    const y = 44 - floor * Math.max(10, Math.round((46 - top) / floors));
    for (let index = 0; index < windows; index++) {
      const left = x + 4 + index * step;
      rect(canvas, left - 1, y - 1, windowWidth + 2, 9, shade(trim, .85));
      rect(canvas, left, y, windowWidth, 6, glass);
      rect(canvas, left, y, windowWidth, 2, reflection);
    }
  }
  const door = design === 2 || design === 4 ? x + 3 : x + Math.round(width / 2) - 5;
  rect(canvas, door, 48, 7, 13, shade(trim, .68));
  rect(canvas, door + 5, 53, 1, 2, light);
  rect(canvas, door - 2, 61, 12, 3, 0xd6c3a0);
  if (design === 0 || design === 3 || design === 6) {
    rect(canvas, x - 1, 42, width - 2, 2, shade(trim, 1.1));
    rect(canvas, x, 44, 2, 12, 0xf0ddbc);
    rect(canvas, right - 8, 44, 2, 12, 0xf0ddbc);
  }
  if (design === 7 || design === 9) rect(canvas, x - 2, 34, width + 4, 2, 0xe4eaf0);
  if (design === 8) {
    rect(canvas, 0, 66, 72, 6, 0x82adbb);
    rect(canvas, 12, 68, 18, 1, reflection);
  }
  for (const tree of [8, 64]) {
    rect(canvas, tree, 56, 2, 6, 0x705c5d);
    circle(canvas, tree + 1, 53, 5, 0x588770);
    rect(canvas, tree - 2, 50, 3, 2, 0x80a784);
  }
}

function wheel(canvas: Canvas, x: number, y: number, radius: number, hub: number) {
  circle(canvas, x, y, radius, ink);
  circle(canvas, x, y, radius - 2, 0x4c5b70);
  circle(canvas, x, y, radius - 4, hub);
  rect(canvas, x - 1, y - 1, 2, 2, ink);
}

// The roofline, hood length, greenhouse and rear deck vary with each body style.
const carProfiles = [
  [16, 25, 24, 36, 24, 50, 43], [16, 25, 27, 42, 27, 54, 45], [14, 24, 25, 41, 25, 54, 45],
  [15, 27, 39, 40, 33, 53, 46], [13, 22, 26, 41, 26, 54, 44], [12, 23, 28, 39, 28, 52, 43],
  [13, 22, 27, 44, 27, 55, 44], [12, 21, 30, 39, 29, 55, 46], [11, 25, 31, 43, 31, 57, 46], [11, 26, 33, 44, 33, 58, 47],
] as const;

function drawCar(canvas: Canvas, design: number, color: number) {
  const [rear, roofStart, roofBack, roofEnd, roofFront, hood, body] = carProfiles[design]!;
  rect(canvas, 0, 52, 72, 20, 0xa1a7b8);
  rect(canvas, 0, 63, 72, 1, 0xe5d5a4);
  rect(canvas, 8, 58, 60, 3, 0x69768c);
  canvas.polygon([[6, 54], [7, body], [rear, body - 2], [roofStart, roofBack], [roofEnd, roofFront], [hood, body - 4],
    [63, body - 2], [67, body + 2], [67, 53], [61, 57], [12, 57]], ink);
  canvas.polygon([[8, 52], [9, body + 1], [rear + 1, body], [roofStart + 1, roofBack + 2], [roofEnd - 1, roofFront + 2],
    [hood - 1, body - 2], [62, body], [65, body + 3], [65, 52], [61, 55], [12, 55]], color);
  if (design === 3) rect(canvas, 23, 38, 11, 3, ink);
  else canvas.polygon([[rear + 5, body - 3], [roofStart + 2, roofBack + 4], [roofEnd - 2, roofFront + 4], [hood - 4, body - 4]], glass);
  canvas.polygon([[roofEnd - 2, roofFront + 4], [roofEnd, roofFront + 4], [hood - 4, body - 3], [hood - 8, body - 4]], reflection);
  rect(canvas, 15, body + 3, 43, 2, shade(color, 1.2));
  rect(canvas, 12, 52, 49, 3, shade(color, .68));
  rect(canvas, 34, body + 5, 5, 1, shade(color, .6));
  rect(canvas, 60, body, 6, 2, 0xffedb6);
  rect(canvas, 8, body + 2, 4, 2, 0xf38c92);
  if (design === 4 || design >= 7) {
    rect(canvas, 8, body - 8, 12, 2, ink);
    rect(canvas, 12, body - 7, 2, 5, shade(color, .65));
  }
  if (design === 5 || design === 9) rect(canvas, 46, 49, 13, 2, ink);
  wheel(canvas, design >= 7 ? 19 : 18, 54, 7, 0xbac9db);
  wheel(canvas, design >= 7 ? 56 : 55, 54, 7, 0xbac9db);
}

function drawMotorcycle(canvas: Canvas, design: number, color: number) {
  rect(canvas, 0, 52, 72, 20, 0x9fa8af);
  rect(canvas, 0, 65, 72, 1, 0xdac89d);
  rect(canvas, 9, 60, 55, 2, 0x6a7987);
  wheel(canvas, 17, 52, design === 2 ? 8 : 9, 0xd0d5e1);
  wheel(canvas, 55, 52, design === 2 ? 8 : 9, 0xd0d5e1);
  const scooter = design < 3;
  const sport = design === 3 || design >= 8;
  const nose = design === 9 ? 59 : 55;
  canvas.polygon([[20, 48], [39, 45], [48, 29], [51, 29], [43, 48], [35, 54], [16, 54]], ink);
  canvas.polygon([[47, 31], [50, 29], [58, 52], [54, 53]], 0xb5c7d7);
  rect(canvas, 45, 23, 3, 9, ink);
  rect(canvas, 42, 22, 11, 2, ink);
  if (scooter) {
    canvas.polygon([[11, 41], [15, 34], [29, 35], [33, 46], [42, 46], [43, 30], [50, 28], [54, 40], [49, 50], [24, 53]], color);
    rect(canvas, 14, 34, 17, 4, ink);
    canvas.polygon([[21, 42], [28, 41], [31, 47], [24, 49]], shade(color, .63));
  } else {
    rect(canvas, 29, 42, 15, 10, 0x455367);
    rect(canvas, 34, 45, 9, 2, 0xb0c5d7);
    canvas.polygon([[10, 32], [23, 31], [29, 36], [35, 30], [47, 31], [51, 39], [39, 43], [24, 40], [16, 37]], color);
    rect(canvas, 20, 34, 11, 3, ink);
    rect(canvas, 36, 32, 8, 2, shade(color, 1.3));
    if (sport) {
      canvas.polygon([[41, 29], [49, 26], [nose, 34], [55, 40], [47, 47], [34, 49], [37, 40]], color);
      canvas.polygon([[48, 25], [52, 26], [nose - 2, 32], [49, 31]], glass);
      rect(canvas, 48, 34, 7, 2, reflection);
      if (design >= 8) rect(canvas, 40, 40, 12, 2, 0xece2cc);
    }
  }
  rect(canvas, 19, 53, 17, 3, design === 4 ? 0xd3c6b3 : 0x65748a);
  rect(canvas, 50, scooter ? 29 : 31, 4, 2, light);
}

export function assetArt(listing: AssetListing) {
  const saved = cache.get(listing.id);
  if (saved) return saved;
  const canvas = pixelCanvas(72, listing.kind === 'houses' ? 0xb6d3df : 0xc6d8e8);
  const draw = listing.kind === 'houses' ? drawHouse : listing.kind === 'cars' ? drawCar : drawMotorcycle;
  draw(canvas, listing.design, listing.color);
  const src = canvas.png();
  cache.set(listing.id, src);
  return src;
}
