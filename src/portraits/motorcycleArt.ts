import { assetArtSize, box, darken, lighten, oval, stroke } from './assetPixels.ts';
import type { AssetCanvas } from './assetPixels.ts';
import { chassis, chrome, metal, sky, tire, vehicleShadow, windshield } from './vehiclePixels.ts';

type Build = {
  style: 'step-through' | 'maxi' | 'vespa' | 'sport' | 'classic' | 'naked';
  rear: number; front: number; radius: number; steering: number; seat: number; tank: number; seatColor: number;
};
const builds: readonly Build[] = [
  { style: 'step-through', rear: 22, front: 74, radius: 10, steering: 62, seat: 40, tank: 47, seatColor: 0x65504a },
  { style: 'maxi', rear: 21, front: 75, radius: 11, steering: 62, seat: 40, tank: 38, seatColor: 0x33343d },
  { style: 'vespa', rear: 22, front: 73, radius: 10, steering: 61, seat: 39, tank: 45, seatColor: 0x764b40 },
  { style: 'sport', rear: 20, front: 76, radius: 11, steering: 66, seat: 39, tank: 37, seatColor: 0x353445 },
  { style: 'classic', rear: 17, front: 78, radius: 12, steering: 66, seat: 41, tank: 35, seatColor: 0x7f5745 },
  { style: 'naked', rear: 21, front: 76, radius: 12, steering: 64, seat: 41, tank: 35, seatColor: 0x34333f },
  { style: 'naked', rear: 21, front: 75, radius: 12, steering: 63, seat: 41, tank: 34, seatColor: 0x414353 },
  { style: 'naked', rear: 20, front: 75, radius: 12, steering: 64, seat: 40, tank: 33, seatColor: 0x363540 },
  { style: 'sport', rear: 19, front: 77, radius: 12, steering: 67, seat: 39, tank: 33, seatColor: 0x41313a },
  { style: 'sport', rear: 21, front: 77, radius: 12, steering: 68, seat: 39, tank: 35, seatColor: 0x3c4053 },
];

function engine(canvas: AssetCanvas, x: number, y: number, classic: boolean) {
  canvas.polygon([[x - 8, y], [x + 2, y - 4], [x + 9, y - 1], [x + 10, y + 7],
    [x + 3, y + 12], [x - 7, y + 10]], chassis);
  box(canvas, x - 2, y - 1, 10, 4, metal);
  box(canvas, x - 1, y + 1, 10, 1, chrome);
  oval(canvas, x - 2, y + 6, 5, 5, classic ? chrome : metal);
  oval(canvas, x - 2, y + 6, 3, 3, classic ? metal : 0x585966);
  box(canvas, x + 3, y + 5, 5, 2, 0x555a6a);
}

function fender(canvas: AssetCanvas, x: number, y: number, radius: number, paint: number) {
  canvas.polygon([[x - radius, y], [x - radius + 3, y - 5], [x - 5, y - 7], [x + 6, y - 7],
    [x + radius, y - 2], [x + radius + 1, y + 2], [x + 5, y - 2], [x - 4, y - 2]], darken(paint, .38));
  box(canvas, x - 4, y - 6, 12, 2, lighten(paint, .38));
}

function drawScooter(c: AssetCanvas, build: Build, paint: number) {
  const { style, steering, front, rear, seat, seatColor } = build;
  const hi = lighten(paint, .42);
  const low = darken(paint, .38);
  if (style === 'step-through') {
    c.polygon([[rear - 12, 47], [rear - 7, 41], [34, 41], [40, 48], [46, 51], [58, 46], [61, 39],
      [67, 40], [68, 50], [62, 56], [48, 58], [27, 54], [12, 51]], paint);
    box(c, 26, seat, 18, 4, seatColor);
    box(c, 28, seat, 14, 1, lighten(seatColor));
    c.polygon([[47, 48], [56, 45], [60, 34], [64, 33], [64, 46], [58, 53], [48, 55]], 0xe2ddc8);
    stroke(c, [rear, 60], [44, 58], 5, metal);
    stroke(c, [rear, 58], [44, 57], 1, chrome);
  } else if (style === 'maxi') {
    c.polygon([[8, 50], [13, 42], [27, 38], [44, 39], [50, 45], [55, 41], [60, 31], [67, 36],
      [71, 47], [66, 55], [58, 59], [31, 62], [19, 56], [11, 56]], low);
    c.polygon([[10, 49], [18, 43], [33, 43], [44, 47], [53, 49], [59, 41], [63, 36], [69, 40], [68, 47],
      [60, 53], [46, 53], [31, 59], [22, 53]], paint);
    stroke(c, [22, 44], [41, 43], 4, seatColor);
    stroke(c, [40, 42], [53, 45], 3, seatColor);
    c.polygon([[61, 33], [57, 25], [59, 22], [66, 31], [68, 35]], windshield);
    box(c, 65, 38, 5, 2, sky);
  } else {
    oval(c, 27, 48, 17, 11, low);
    oval(c, 27, 47, 15, 9, paint);
    oval(c, 23, 44, 7, 3, hi);
    c.polygon([[27, 53], [42, 55], [52, 53], [56, 42], [58, 35], [65, 33], [68, 38], [66, 49],
      [61, 58], [54, 61], [33, 61]], paint);
    stroke(c, [36, 58], [56, 58], 2, chrome);
    stroke(c, [23, seat], [41, seat], 4, seatColor);
    oval(c, 66, 35, 4, 4, chrome);
  }
  fender(c, front, 54, build.radius, paint);
  box(c, steering + 4, style === 'maxi' ? 39 : 34, 4, 2, 0xf1e6b5);
  box(c, rear - 11, 48, 4, 2, 0xbf5056);
}

function drawFrame(c: AssetCanvas, build: Build, design: number, paint: number) {
  const { rear, front, seat, steering, tank, seatColor, style } = build;
  const hi = lighten(paint, .42);
  const low = darken(paint, .46);
  const classic = style === 'classic';
  const racing = style === 'sport';
  const frame = design === 5 ? 0xc96843 : metal;
  stroke(c, [rear, 60], [42, 53], 5, chassis);
  stroke(c, [rear, 58], [42, 52], 2, metal);
  stroke(c, [38, seat + 3], [49, 57], 3, frame);
  stroke(c, [49, 57], [steering - 2, 42], 3, frame);
  if (design === 5) stroke(c, [38, seat + 3], [57, 48], 2, frame);
  engine(c, 48, 48, classic);
  if (!racing) {
    stroke(c, [54, 49], [59, 58], 4, classic ? chrome : metal);
    stroke(c, [59, 58], [rear + 8, 61], classic ? 5 : 4, classic ? chrome : 0x646978);
    stroke(c, [rear + 8, 59], [54, 57], 1, classic ? 0xe7e4d6 : metal);
  }
  if (classic) {
    fender(c, rear, 51, 14, paint);
    oval(c, 52, tank + 5, 13, 7, low);
    oval(c, 52, tank + 4, 11, 5, paint);
    box(c, 45, tank + 1, 11, 2, hi);
    box(c, 47, tank + 4, 11, 2, 0xe3cc9f);
    oval(c, steering + 3, 34, 5, 5, chrome);
    oval(c, steering + 5, 34, 3, 3, 0xe8dcab);
  } else {
    c.polygon([[rear - 10, seat - 4], [rear + 4, seat - 7], [38, seat - 1], [41, seat + 4], [26, seat + 5],
      [rear - 6, seat]], low);
    stroke(c, [rear - 6, seat - 3], [rear + 9, seat - 3], 2, hi);
    c.polygon([[37, seat + 3], [42, tank + 3], [48, tank], [58, tank], [64, tank + 6], [60, tank + 12],
      [48, tank + 13]], paint);
    stroke(c, [45, tank + 3], [57, tank + 2], 2, hi);
    if (!racing) {
      c.polygon([[57, tank + 10], [62, tank + 7], [66, tank + 11], [56, 53], [48, 54]], low);
      box(c, steering + 1, design === 7 ? 32 : 34, design === 7 ? 9 : 7, 4, chassis);
      box(c, steering + 3, design === 7 ? 33 : 35, design === 7 ? 6 : 4, 1, sky);
    }
  }
  stroke(c, [28, seat], [40, seat + 2], 4, seatColor);
  if (racing) {
    const nose = design === 8 ? 84 : 80;
    c.polygon([[61, tank + 4], [67, tank - 5], [74, tank - 3], [nose, tank + 5], [79, tank + 12],
      [71, 52], [66, 57], [48, 58], [52, 49]], low);
    c.polygon([[62, tank + 4], [69, tank - 3], [74, tank - 1], [nose - 2, tank + 6], [76, tank + 12],
      [68, 53], [53, 55]], paint);
    c.polygon([[67, tank - 6], [68, tank - 12], [73, tank - 9], [76, tank - 3]], windshield);
    stroke(c, [68, tank - 11], [73, tank - 7], 1, sky);
    c.polygon([[63, 44], [72, 42], [69, 47], [60, 49]], chassis);
    stroke(c, [74, tank + 4], [nose - 2, tank + 6], 2, 0xe4ebdc);
    if (design === 9) {
      stroke(c, [56, 53], [68, 50], 3, 0xf0e7df);
      stroke(c, [57, 55], [64, 53], 2, 0xb84b58);
      box(c, 75, 43, 8, 2, chassis);
    } else if (design === 8) stroke(c, [56, 54], [68, 51], 2, hi);
  }
  fender(c, front, 52, build.radius, classic ? low : paint);
  box(c, rear - 9, seat + 1, 4, 2, 0xa84b51);
}

export function drawMotorcycle(canvas: AssetCanvas, design: number, paint: number) {
  // The profile faces left, like a vehicle sprite viewed from the opposite sidewalk.
  const c: AssetCanvas = { ...canvas, polygon: (points, color) => canvas.polygon(points.map(([x, y]) => [assetArtSize - x, y]), color) };
  const build = builds[design]!;
  const { front, rear, radius, steering, style } = build;
  const classic = style === 'classic';
  vehicleShadow(c, 72);
  tire(c, rear, 61, radius, classic ? chrome : metal, classic || style === 'step-through');
  tire(c, front, 61, radius, classic ? chrome : metal, classic || style === 'step-through');
  stroke(c, [steering, 34], [front, 61], 5, chassis);
  stroke(c, [steering + 1, 35], [front, 60], 2, design === 5 || design === 8 ? 0xb69768 : chrome);
  stroke(c, [steering, 34], [steering - 6, 27], 3, metal);
  stroke(c, [steering - 6, 27], [steering + 2, 27], 2, chassis);
  if (style !== 'sport') {
    stroke(c, [steering - 1, 31], [steering - 4, 23], 1, metal);
    box(c, steering - 8, 22, 5, 2, chassis);
  }
  if (style === 'step-through' || style === 'maxi' || style === 'vespa') drawScooter(c, build, paint);
  else drawFrame(c, build, design, paint);
}
