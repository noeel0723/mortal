import { box, darken, disc, lighten, stroke } from './assetPixels.ts';
import type { AssetCanvas } from './assetPixels.ts';
import type { Point } from './pixels.ts';
import { chassis, chrome, metal, sky, tire, vehicleShadow, windshield } from './vehiclePixels.ts';

const rubberSeat = 0x494352;
type Body = { shape: readonly Point[]; cabin: readonly Point[]; pillars: readonly number[];
  wheels: readonly [number, number]; radius: number; handle: number; trim?: number };

const bodies: readonly Body[] = [
  // Toyota Yaris: short hood and a tall hatch.
  { shape: [[9, 61], [10, 47], [14, 43], [18, 34], [26, 27], [49, 26], [57, 29], [68, 43], [79, 45], [85, 49], [87, 59], [82, 64], [13, 64]],
    cabin: [[20, 43], [24, 34], [30, 29], [49, 29], [55, 32], [64, 43]], pillars: [39, 54], wheels: [24, 70], radius: 9, handle: 42 },
  // Honda Civic: long four-door fastback sedan.
  { shape: [[5, 60], [8, 49], [24, 46], [35, 35], [46, 29], [60, 30], [69, 34], [78, 43], [87, 46], [91, 50], [90, 60], [84, 64], [11, 64]],
    cabin: [[30, 44], [39, 36], [48, 32], [60, 33], [69, 38], [74, 44]], pillars: [44, 59], wheels: [20, 74], radius: 9, handle: 44 },
  // Volkswagen Golf GTI: squared-off hatch with red rocker trim.
  { shape: [[8, 61], [9, 45], [12, 34], [20, 28], [28, 25], [52, 25], [61, 31], [70, 43], [84, 45], [89, 51], [89, 60], [82, 64], [12, 64]],
    cabin: [[16, 43], [18, 34], [26, 29], [51, 29], [57, 33], [65, 43]], pillars: [32, 49], wheels: [23, 73], radius: 9, handle: 44, trim: 0xa74846 },
  // Mazda MX-5: open cockpit, low windshield, and short rear deck.
  { shape: [[6, 59], [9, 52], [23, 47], [36, 47], [45, 49], [48, 38], [54, 39], [60, 47], [79, 48], [87, 51], [90, 58], [85, 63], [12, 63]],
    cabin: [[48, 47], [50, 40], [53, 41], [57, 48]], pillars: [], wheels: [23, 72], radius: 9, handle: 49 },
  // Subaru WRX: high rear deck, hood scoop, and rally spoiler.
  { shape: [[6, 59], [7, 49], [23, 44], [35, 32], [43, 29], [57, 29], [66, 32], [74, 43], [84, 43], [90, 48], [91, 59], [86, 64], [10, 64]],
    cabin: [[29, 44], [37, 35], [45, 32], [56, 32], [64, 35], [70, 43]], pillars: [44, 59], wheels: [22, 74], radius: 10, handle: 44, trim: 0x30384c },
  // Ford Mustang GT: fastback roof, long hood and short trunk.
  { shape: [[5, 59], [7, 47], [17, 44], [28, 35], [40, 29], [57, 30], [68, 40], [80, 41], [90, 47], [91, 60], [84, 65], [11, 65]],
    cabin: [[24, 44], [33, 36], [42, 32], [56, 33], [64, 41], [63, 44]], pillars: [46], wheels: [21, 75], radius: 10, handle: 45 },
  // BMW M3: four doors, black vents, pronounced wheel arches.
  { shape: [[5, 59], [7, 48], [21, 45], [31, 35], [41, 29], [57, 29], [65, 33], [75, 43], [86, 44], [91, 49], [91, 60], [85, 65], [10, 65]],
    cabin: [[27, 45], [35, 36], [43, 32], [56, 32], [63, 36], [70, 44]], pillars: [39, 55], wheels: [21, 74], radius: 10, handle: 45, trim: 0x303741 },
  // Porsche 911 GT3: curved cabin and a tall rear wing.
  { shape: [[6, 58], [8, 51], [16, 47], [27, 36], [39, 27], [52, 27], [62, 32], [71, 44], [82, 46], [89, 50], [91, 59], [85, 65], [10, 65]],
    cabin: [[24, 44], [31, 36], [41, 30], [51, 30], [59, 34], [65, 43]], pillars: [42], wheels: [22, 73], radius: 10, handle: 45, trim: 0x464957 },
  // Ferrari 296 GTB: flying-buttress roof and a deep side intake.
  { shape: [[5, 60], [7, 49], [24, 46], [33, 40], [42, 33], [53, 32], [63, 35], [72, 42], [84, 45], [91, 51], [91, 61], [86, 64], [10, 64]],
    cabin: [[34, 45], [44, 36], [54, 35], [62, 37], [69, 43]], pillars: [51], wheels: [21, 74], radius: 10, handle: 46, trim: 0x64343c },
  // Lamborghini Revuelto: sharply raked wedge with a black front splitter.
  { shape: [[4, 59], [6, 48], [21, 44], [32, 42], [43, 33], [55, 33], [66, 38], [73, 43], [87, 47], [92, 53], [91, 62], [85, 65], [9, 65]],
    cabin: [[34, 45], [45, 35], [53, 35], [62, 38], [69, 43]], pillars: [52], wheels: [20, 75], radius: 10, handle: 46, trim: 0x3c3740 },
];

export function drawCar(canvas: AssetCanvas, design: number, paint: number) {
  const { shape, cabin, pillars, wheels, radius, handle, trim = darken(paint, .48) } = bodies[design]!;
  const [rear, front] = wheels;
  const highlight = lighten(paint, .54);
  const shadow = darken(paint, .36);
  const belt = darken(paint, .24);
  vehicleShadow(canvas, 70);
  if (design === 4 || design === 7) {
    box(canvas, 7, design === 7 ? 36 : 40, 19, 3, chassis);
    box(canvas, 9, design === 7 ? 35 : 39, 13, 1, highlight);
    stroke(canvas, [14, design === 7 ? 38 : 42], [17, 49], 3, trim);
  }
  canvas.polygon(shape, paint);
  for (let index = 0; index < shape.length; index++) {
    stroke(canvas, shape[index]!, shape[(index + 1) % shape.length]!, 2, index >= shape.length - 3 ? chassis : belt);
  }
  canvas.polygon([[10, 54], [25, 52], [61, 51], [86, 53], [89, 60], [83, 63], [12, 63]], shadow);
  canvas.polygon([[12, 52], [25, 49], [65, 47], [83, 49], [87, 52], [63, 50], [24, 52], [12, 54]], highlight);
  box(canvas, rear + 9, 60, front - rear - 18, 2, trim);
  canvas.polygon(cabin, chassis);
  const reflected = cabin.map(([x, y], index): Point => [x + (index < 2 ? 2 : -2), y + (y >= 43 ? -1 : 2)]);
  canvas.polygon(reflected, windshield);
  if (design !== 3) {
    const [first] = cabin;
    const x = first![0] + 4;
    canvas.polygon([[x, 41], [x + 8, 35], [x + 12, 35], [x + 5, 41]], sky);
  } else {
    box(canvas, 33, 47, 13, 2, chassis);
    box(canvas, 40, 43, 5, 5, rubberSeat);
  }
  for (const x of pillars) stroke(canvas, [x + 1, 32], [x, 43], 2, chassis);
  if (design < 3 || design === 4 || design === 6) {
    stroke(canvas, [rear + 5, 47], [rear + 8, 56], 1, trim);
    stroke(canvas, [52, 45], [51, 59], 1, trim);
    box(canvas, 38, 51, 5, 1, chassis);
  }
  stroke(canvas, [front - 10, 46], [front - 9, 59], 1, trim);
  box(canvas, 56, handle + 6, 5, 1, chassis);
  box(canvas, 57, handle + 5, 4, 1, highlight);
  box(canvas, 67, 44, 5, 2, trim);
  if (design === 4) box(canvas, 76, 44, 8, 2, chassis);
  if (design >= 8) canvas.polygon([[29, 53], [45, 52], [56, 48], [51, 58], [40, 60], [29, 59]], trim);
  if (design === 6 || design === 9) box(canvas, 84, 54, 6, 5, chassis);
  if (design === 2) box(canvas, rear + 9, 61, front - rear - 18, 1, 0xbf4948);
  box(canvas, 9, 53, design === 5 ? 6 : 5, 3, 0xa63744);
  box(canvas, 10, 53, 3, 1, 0xf88778);
  box(canvas, 83, 49, 5, 2, design === 9 ? chrome : 0xf4e2ac);
  box(canvas, 85, 51, 3, 1, 0xaabcc3);
  box(canvas, 7, 58, 5, 2, trim);
  box(canvas, 85, 59, 5, 2, trim);
  for (const x of wheels) {
    disc(canvas, x, 59, radius + 1, chassis);
    tire(canvas, x, 60, radius, design === 4 ? 0xbd9c62 : design >= 7 ? 0x727e89 : metal);
  }
}

