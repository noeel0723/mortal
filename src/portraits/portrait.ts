import { noAccessories } from '../engine/appearance.ts';
import type { Appearance } from '../engine/appearance.ts';
import { drawAccessories } from './accessoryArt.ts';
import { pixelCanvas } from './pixels.ts';
import type { Point } from './pixels.ts';

// Each family supplies a dark, mid, and light color. Portraits share a deliberately small palette.
const backgrounds = [0xa93646, 0x405978, 0x4a7774, 0x765976, 0x915a47, 0x516a8b];
const skinTones = [
  [0xe1b3ad, 0xf6d4c4, 0xffe6d5], [0xc99091, 0xeec0ae, 0xf8d8bf], [0xba7881, 0xdca892, 0xefbfa4],
  [0x9b5d6e, 0xba7d69, 0xd6977c], [0x7b495d, 0x995f59, 0xbb7867], [0x5a3c50, 0x794b4d, 0x9c6160],
] as const;
const hairTones = {
  Ink: [0x11121e, 0x252333, 0x565169], Chestnut: [0x271722, 0x492930, 0x845251], Copper: [0x3e201f, 0x793d37, 0xc47152],
  Honey: [0x604032, 0xab774d, 0xe2ac69], Ash: [0x2d2d40, 0x68667f, 0xb5afbd], Plum: [0x231528, 0x492942, 0x975b79],
} as const;
const irisTones = { Brown: 0x8b5b52, Blue: 0x6b9ebc, Green: 0x70a58b, Gray: 0x8e9bad, Amber: 0xbc8452, Violet: 0x907bb2 };
const clothes = [
  [0x1b1b2a, 0x343247, 0x6d6481], [0x182939, 0x334f69, 0x7893a6], [0x263936, 0x466459, 0x9cb09c],
  [0x302235, 0x593b57, 0xb08499], [0x473135, 0x775357, 0xc19a83],
] as const;
const outline = 0x14121d;
const silver = [0x484151, 0x837c8a, 0xd3c8d1] as const;

const eyeShapes: Record<Appearance['eyes'], { white: readonly Point[]; lid: readonly Point[]; irisHeight: number }> = {
  Almond: { white: [[0, 3], [2, 1], [6, 1], [8, 3], [6, 6], [2, 6]],
    lid: [[-1, 3], [2, 1], [6, 0], [9, 2], [8, 3], [5, 2], [2, 2], [0, 4]], irisHeight: 4 },
  Round: { white: [[0, 2], [2, 0], [6, 0], [8, 2], [8, 6], [6, 7], [2, 7], [0, 5]],
    lid: [[-1, 3], [1, 0], [6, -1], [9, 2], [8, 4], [7, 2], [5, 1], [2, 1], [0, 4]], irisHeight: 5 },
  Sharp: { white: [[0, 2], [8, 0], [8, 3], [5, 5], [2, 5], [0, 4]],
    lid: [[-1, 3], [9, -1], [8, 2], [4, 3], [0, 4]], irisHeight: 3 },
  Soft: { white: [[0, 1], [5, 1], [9, 4], [7, 6], [2, 6], [0, 4]],
    lid: [[-1, 2], [1, 0], [6, 1], [10, 3], [9, 5], [6, 3], [1, 2]], irisHeight: 4 },
};

function ageHair(color: number, gray: number) {
  const channel = (shift: number) => Math.round(((color >>> shift & 255) + 3 * (gray >>> shift & 255)) / 4);
  return channel(16) << 16 | channel(8) << 8 | channel(0);
}

const caps: Record<Appearance['hair'], readonly Point[]> = {
  Crop: [[19, 34], [18, 22], [21, 17], [26, 14], [41, 13], [49, 17], [53, 23], [53, 33], [49, 29], [49, 24], [39, 22], [27, 23], [23, 26], [23, 33]],
  Sweep: [[16, 36], [16, 22], [21, 14], [28, 10], [43, 11], [52, 16], [56, 24], [54, 36], [49, 30], [45, 22], [37, 27], [27, 29], [28, 25], [22, 32], [21, 37]],
  Tousled: [[16, 39], [13, 33], [16, 29], [13, 29], [16, 20], [15, 18], [22, 15], [22, 12], [29, 10], [33, 7], [40, 9], [41, 7], [46, 11], [53, 13], [53, 17], [57, 21], [56, 27], [59, 31], [55, 31], [55, 40], [50, 34], [48, 26], [45, 30], [39, 22], [40, 32], [35, 29], [31, 23], [27, 28], [24, 25], [22, 34], [20, 38], [19, 34]],
  Bob: [[14, 44], [15, 24], [18, 17], [24, 12], [31, 10], [44, 10], [51, 14], [56, 23], [58, 42], [55, 48], [50, 46], [49, 30], [46, 22], [46, 28], [39, 27], [37, 21], [34, 28], [27, 29], [26, 24], [23, 31], [22, 46], [18, 48]],
  Long: [[15, 41], [15, 24], [21, 14], [27, 10], [34, 9], [38, 12], [45, 10], [53, 14], [57, 25], [57, 43], [52, 47], [49, 32], [46, 25], [40, 20], [37, 26], [33, 24], [35, 19], [29, 24], [25, 30], [22, 42], [20, 49]],
  Tied: [[16, 35], [16, 25], [20, 17], [25, 13], [32, 11], [45, 12], [51, 17], [55, 26], [54, 35], [49, 37], [48, 28], [44, 25], [37, 26], [31, 22], [27, 26], [23, 34], [21, 38]],
};

const backHair: Partial<Record<Appearance['hair'], readonly Point[]>> = {
  Bob: [[15, 26], [22, 17], [49, 17], [57, 26], [57, 44], [60, 50], [55, 54], [50, 55], [20, 54], [13, 51], [15, 44]],
  Long: [[16, 24], [24, 17], [50, 17], [56, 22], [57, 39], [61, 55], [59, 67], [50, 68], [46, 63], [25, 62], [18, 67], [10, 62], [14, 53]],
  Tied: [[42, 16], [46, 10], [50, 11], [51, 6], [58, 5], [63, 9], [66, 15], [67, 25], [63, 38], [64, 47], [59, 50], [54, 45], [55, 30], [52, 24]],
};

export function portraitAge(age: number) {
  if (age < 3) return 'infant';
  if (age < 12) return 'child';
  if (age < 18) return 'teen';
  if (age < 45) return 'adult';
  if (age < 65) return 'mature';
  return 'elder';
}

const cache = new Map<string, string>();

export function portraitSrc(appearance: Appearance, age: number) {
  const stage = portraitAge(age);
  const { skin, background, outfit, hair, hairColor, eyes, eyeColor, nose, mouth } = appearance;
  const accessories = appearance.accessories ?? noAccessories;
  const key = `${stage}/${skin}/${background}/${outfit}/${hair}/${hairColor}/${eyes}/${eyeColor}/${nose}/${mouth}/${accessories.hat}/${accessories.glasses}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const infant = stage === 'infant';
  const child = stage === 'child';
  const elder = stage === 'elder';
  const mature = stage === 'mature' || elder;
  const headWidth = infant ? 1.04 : child ? 1.03 : 1;
  const headHeight = infant ? .81 : child ? .91 : 1;
  const faceY = infant ? 39 : child ? 35 : stage === 'teen' ? 33 : 31;
  const shoulderWidth = infant ? .68 : child ? .78 : stage === 'teen' ? .89 : 1;
  const shoulderDrop = infant ? 4 : child ? 3 : stage === 'teen' ? 1 : 0;
  const [skinShadow, flesh, skinLight] = skinTones[skin]!;
  const [baseDark, baseMid, baseLight] = hairTones[hairColor];
  const hairDark = elder ? ageHair(baseDark, silver[0]) : baseDark;
  const hairMid = elder ? ageHair(baseMid, silver[1]) : baseMid;
  const hairLight = elder ? ageHair(baseLight, silver[2]) : baseLight;
  const [clothDark, cloth, clothLight] = clothes[outfit]!;
  const canvas = pixelCanvas(72, backgrounds[background]!);
  const head = (points: readonly Point[], color: number) => canvas.polygon(points.map(([x, y]) => [
    Math.round(36 + (x - 36) * headWidth), Math.round(faceY + (y - 32) * headHeight),
  ]), color);
  const mark = (x: number, y: number, w: number, h: number, color: number) => head([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color);
  const body = (points: readonly Point[], color: number) => canvas.polygon(points.map(([x, y]) => [
    Math.round(36 + (x - 36) * shoulderWidth), y + shoulderDrop,
  ]), color);

  const back = backHair[hair];
  if (back && !infant) head(back, outline);
  body([[2, 73], [5, 65], [12, 59], [25, 54], [30, 48], [43, 48], [48, 54], [61, 59], [67, 65], [71, 73]], outline);
  body([[5, 73], [8, 66], [14, 61], [28, 55], [32, 50], [42, 50], [47, 56], [60, 61], [65, 67], [69, 73]], clothDark);
  if (infant || child) {
    body([[11, 73], [14, 62], [27, 55], [34, 58], [42, 57], [50, 55], [61, 63], [64, 73]], cloth);
    body([[18, 63], [28, 57], [36, 63], [49, 57], [56, 61], [48, 65], [37, 70], [30, 69]], clothLight);
  } else {
    body([[7, 73], [12, 63], [27, 55], [29, 63], [34, 73]], cloth);
    body([[38, 73], [44, 63], [46, 55], [60, 61], [66, 67], [68, 73]], cloth);
    body([[24, 60], [28, 55], [30, 60], [33, 68], [25, 66], [19, 67]], clothLight);
    body([[40, 68], [44, 57], [47, 56], [53, 64], [49, 65]], clothLight);
    body([[15, 65], [15, 68], [12, 73], [11, 73], [12, 69]], outline);
    body([[57, 66], [60, 69], [62, 73], [60, 73]], outline);
  }
  head([[29, 44], [43, 44], [43, 54], [40, 58], [33, 59], [28, 55]], outline);
  head([[31, 45], [41, 45], [42, 54], [39, 56], [33, 57], [30, 54]], skinShadow);
  head([[32, 51], [40, 51], [39, 56], [33, 56]], flesh);
  if (back && !infant && hair === 'Long') {
    head([[16, 35], [22, 40], [22, 53], [19, 62], [14, 64], [12, 61]], hairDark);
    head([[51, 35], [56, 35], [59, 55], [57, 63], [53, 64], [48, 61], [51, 53]], hairMid);
  }

  const adultFace: readonly Point[] = [[20, 23], [25, 17], [32, 14], [43, 14], [50, 19], [54, 26], [54, 34],
    [57, 34], [56, 41], [52, 45], [50, 48], [46, 52], [40, 55], [34, 56], [28, 53], [23, 49], [20, 44], [16, 42], [15, 36], [18, 33]];
  const youngerFace: readonly Point[] = [[18, 24], [22, 17], [28, 13], [42, 12], [51, 17], [55, 25], [55, 35], [58, 35],
    [57, 43], [53, 46], [50, 51], [44, 55], [35, 56], [27, 54], [21, 50], [18, 45], [15, 43], [14, 37], [17, 35]];
  head(infant || child ? youngerFace : adultFace, outline);
  head([[20, 26], [25, 19], [32, 15], [43, 15], [49, 20], [53, 27], [53, 36], [55, 35], [55, 40], [51, 44],
    [49, 48], [45, 51], [39, 54], [34, 55], [28, 52], [23, 48], [21, 43], [17, 41], [16, 37], [19, 35]], skinShadow);
  head([[21, 25], [26, 20], [33, 17], [42, 16], [48, 21], [51, 28], [51, 41], [47, 47], [41, 51], [35, 53],
    [29, 51], [24, 47], [21, 41]], flesh);
  head([[23, 29], [29, 25], [38, 24], [47, 26], [49, 34], [48, 43], [43, 48], [35, 51], [28, 49], [24, 44]], skinLight);
  mark(18, 37, 2, 3, flesh);
  mark(53, 37, 2, 2, flesh);

  function eye(x: number, mirrored: boolean) {
    const { white, lid, irisHeight } = eyeShapes[eyes];
    const y = infant ? 32 : 31;
    const detail = (points: readonly Point[], color: number) => head(points.map(([dx, dy]) => [
      x + (mirrored ? 8 - dx : dx), y + dy * (infant ? 1.18 : 1),
    ]), color);
    detail(white, 0xffeae0);
    mark(x + 3, y + 2, 4, irisHeight + (infant ? 1 : 0), irisTones[eyeColor]);
    mark(x + 4, y + 2, 2, irisHeight - (infant ? 0 : 1), outline);
    mark(x + 3, y + 2, 1, 1, 0xfefff5);
    detail(lid, outline);
    mark(x + 2, y + (eyes === 'Round' ? 7 : 6) + (infant ? 1 : 0), 5, 1, skinShadow);
    if (!infant) head([[x, y - 3], [x + 2, y - 5], [x + 7, y - 4], [x + 8, y - 3]], hairMid);
  }
  eye(24, true);
  eye(41, false);

  if (nose === 'Wide') { mark(34, 41, 2, 1, skinShadow); mark(38, 41, 2, 1, skinShadow); }
  else if (nose === 'Straight') { mark(36, 38, 1, 4, flesh); mark(37, 41, 2, 1, skinShadow); }
  else if (nose === 'Upturned') { mark(35, 40, 3, 1, skinShadow); mark(36, 39, 1, 1, flesh); }
  else mark(36, 41, 2, 1, skinShadow);

  if (mouth === 'Smile') head([[32, 45], [34, 46], [39, 46], [41, 44], [40, 47], [34, 48]], skinShadow);
  else {
    const width = mouth === 'Small' ? 3 : mouth === 'Full' ? 7 : 5;
    const x = Math.ceil(36 - width / 2);
    mark(x, 46, width, mouth === 'Full' ? 2 : 1, skinShadow);
    if (mouth === 'Full') mark(x + 2, 47, 3, 1, flesh);
  }
  if (infant || child) { mark(23, 40, 4, 1, skinShadow); mark(46, 40, 4, 1, skinShadow); }
  if (mature) {
    mark(25, 39, 5, 1, flesh);
    mark(43, 39, 5, 1, flesh);
    head([[30, 21], [38, 20], [44, 21], [35, 21]], skinShadow);
    head([[29, 44], [31, 43], [31, 45], [29, 47]], flesh);
    head([[41, 43], [43, 44], [43, 47], [42, 46]], flesh);
  }
  if (elder) { mark(30, 23, 13, 1, flesh); mark(25, 40, 5, 1, skinShadow); mark(44, 40, 5, 1, skinShadow); }

  if (infant) {
    const side = { Crop: 0, Sweep: 3, Tousled: -2, Bob: -3, Long: 2, Tied: 4 }[hair];
    const top = hair === 'Crop' ? 13 : hair === 'Tousled' || hair === 'Tied' ? 9 : 11;
    head([[24 + side, 19], [27 + side, 14], [32, top], [40, top], [44, 15], [48, 15], [48, 20], [44, 22], [41, 18],
      [35, 21], [35, 17], [31, 21]], hairDark);
    head([[29 + side, 16], [34, top + 1], [40, top + 1], [43, 15], [39, 15], [36, 17]], hairLight);
  } else {
    head(caps[hair], outline);
    head(caps[hair].map(([x, y]) => [36 + (x - 36) * .91, 23 + (y - 23) * .89]), hairDark);
    head([[20, 24], [23, 18], [31, 13], [39, 12], [34, 15], [29, 17], [23, 23]], hairMid);
    head([[21, 24], [24, 19], [29, 16], [26, 20], [23, 22]], hairLight);
    head([[42, 13], [49, 16], [53, 22], [49, 21], [45, 17]], hairMid);
    if (hair !== 'Crop') head([[49, 18], [51, 19], [53, 23], [52, 23]], hairLight);
    if (hair === 'Tied') head([[53, 12], [58, 8], [61, 10], [60, 13], [58, 12], [56, 16]], hairMid);
  }

  drawAccessories(accessories, head, mark);
  const src = canvas.png();
  if (cache.size >= 96) cache.delete(cache.keys().next().value!);
  cache.set(key, src);
  return src;
}
