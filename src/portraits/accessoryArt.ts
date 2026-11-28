import type { Accessories } from '../engine/appearance.ts';
import type { Point } from './pixels.ts';

type Draw = (points: readonly Point[], color: number) => void;
type Mark = (x: number, y: number, w: number, h: number, color: number) => void;
type Style = { form: readonly Point[]; brim: readonly Point[]; main: number; shade: number; accent: number };

const hats: Record<Exclude<Accessories['hat'], 'None'>, Style> = {
  'Ferrari Edition Cap': { form: [[17, 23], [20, 13], [27, 8], [42, 6], [52, 11], [56, 22], [45, 26], [26, 26]],
    brim: [[24, 22], [44, 20], [58, 22], [62, 27], [48, 29], [29, 27]], main: 0xcc2f38, shade: 0x7c2633, accent: 0xf7cc5c },
  'Knit Beanie': { form: [[15, 25], [17, 16], [22, 9], [31, 6], [41, 6], [50, 10], [55, 17], [57, 25]], brim: [[16, 22], [56, 22], [55, 27], [17, 27]],
    main: 0x547b67, shade: 0x304d49, accent: 0x96b79c },
  'Bucket Hat': { form: [[20, 20], [24, 9], [46, 9], [52, 20], [57, 24], [50, 26], [23, 26], [16, 24]],
    brim: [[19, 20], [53, 20], [61, 29], [51, 28], [24, 28], [11, 30]], main: 0xc3a472, shade: 0x7d664d, accent: 0xe3ca96 },
  Fedora: { form: [[21, 22], [26, 9], [32, 7], [38, 12], [47, 8], [52, 23]],
    brim: [[19, 21], [54, 21], [63, 25], [59, 28], [47, 27], [24, 28], [12, 26]], main: 0x534451, shade: 0x2c2937, accent: 0x986a57 },
  'Sun Hat': { form: [[20, 22], [23, 14], [30, 9], [42, 9], [49, 14], [53, 22]],
    brim: [[15, 21], [28, 20], [48, 20], [62, 23], [67, 28], [58, 31], [44, 28], [28, 28], [12, 31], [6, 27]],
    main: 0xe4bb74, shade: 0xa9794d, accent: 0x538997 },
};

const glasses: Record<Exclude<Accessories['glasses'], 'None'>, { lens: readonly Point[]; frame: number; tint?: number }> = {
  'Tony Stark Glasses': { lens: [[21, 29], [34, 28], [35, 31], [33, 38], [25, 39], [22, 36]], frame: 0x554237, tint: 0x5d7499 },
  'Round Frames': { lens: [[23, 28], [31, 28], [35, 32], [34, 36], [31, 39], [24, 39], [21, 35], [21, 31]], frame: 0x684b37 },
  Aviators: { lens: [[20, 29], [34, 28], [35, 33], [31, 39], [25, 40], [21, 37]], frame: 0x9a794e, tint: 0x5f635b },
  'Square Frames': { lens: [[20, 28], [35, 28], [35, 38], [20, 38]], frame: 0x34344d },
  'Cat-Eye Frames': { lens: [[19, 26], [34, 30], [35, 34], [32, 38], [24, 38], [21, 34]], frame: 0x914657 },
};

export function drawAccessories(choices: Accessories, head: Draw, mark: Mark) {
  if (choices.hat !== 'None') {
    const hat = hats[choices.hat];
    head(hat.form, hat.main);
    head(hat.brim, hat.shade);
    mark(25, 19, 23, 2, hat.accent);
    if (choices.hat === 'Ferrari Edition Cap') {
      head([[34, 13], [41, 13], [40, 18], [37, 20], [34, 17]], hat.accent);
      mark(37, 14, 2, 3, 0x47363a);
    } else if (choices.hat === 'Knit Beanie') {
      for (const x of [25, 30, 35, 40, 45]) mark(x, 11, 1, 8, hat.accent);
    }
  }
  if (choices.glasses !== 'None') {
    const { lens, frame, tint } = glasses[choices.glasses];
    for (const flip of [false, true]) {
      const points = lens.map(([x, y]): Point => [flip ? 73 - x : x, y]);
      if (tint !== undefined) {
        head(points, frame);
        head(points.map(([x, y]) => [flip ? 46 + (x - 46) * .79 : 27 + (x - 27) * .79, 33 + (y - 33) * .73]), tint);
      } else {
        points.forEach(([x, y], index) => {
          const [nextX, nextY] = points[(index + 1) % points.length]!;
          const steps = Math.max(Math.abs(nextX - x), Math.abs(nextY - y), 1);
          for (let i = 0; i <= steps; i++) mark(Math.round(x + (nextX - x) * i / steps), Math.round(y + (nextY - y) * i / steps), 1, 1, frame);
        });
      }
    }
    mark(34, 31, 6, 2, frame);
    mark(17, 31, 4, 2, frame);
    mark(52, 31, 4, 2, frame);
    if (tint !== undefined) {
      mark(24, 31, 5, 1, 0xa7bac6);
      mark(43, 31, 5, 1, 0xa7bac6);
    }
  }
}
