import { box, darken, lighten, oval, stroke } from './assetPixels.ts';
import type { AssetCanvas } from './assetPixels.ts';

const ivory = 0xf0dfb2;
const stone = 0x918b7f;
const mortar = 0x76645c;
const timber = 0x584041;
const glass = 0x7092a5;
const steel = 0x333f4a;
const reflection = 0xbad4d3;

function facade(canvas: AssetCanvas, x: number, y: number, w: number, h: number, wall: number, texture: 'boards' | 'brick' | 'render' = 'boards') {
  box(canvas, x, y, w, h, darken(wall, .48));
  box(canvas, x + 1, y, w - 2, h - 2, wall);
  box(canvas, x + w - 5, y + 1, 4, h - 3, darken(wall));
  const course = texture === 'brick' ? 4 : 5;
  if (texture !== 'render') {
    for (let row = y + 2; row < y + h - 3; row += course) {
      box(canvas, x + 1, row, w - 6, 1, darken(wall, .19));
      if (texture === 'brick') {
        for (let joint = x + 3 + (row % 8 ? 4 : 0); joint < x + w - 5; joint += 9) {
          box(canvas, joint, row + 1, 1, 3, darken(wall, .16));
          box(canvas, joint + 2, row + 1, 3, 1, lighten(wall, .2));
        }
      }
    }
  }
  box(canvas, x - 1, y + h - 3, w + 2, 3, darken(wall, .43));
}

function roof(canvas: AssetCanvas, left: number, right: number, top: number, eave: number, ridge: number, terrace: number, color: number) {
  canvas.polygon([[left, eave], [ridge, top], [terrace, top], [right, eave]], darken(color, .45));
  canvas.polygon([[left + 2, eave - 2], [ridge, top + 1], [terrace, top + 1], [right - 2, eave - 2]], color);
  for (let y = top + 4; y < eave - 2; y += 4) {
    const fraction = (y - top) / (eave - top);
    const start = Math.ceil(ridge + (left - ridge) * fraction) + 2;
    const end = Math.floor(terrace + (right - terrace) * fraction) - 2;
    box(canvas, start, y, end - start, 1, darken(color, .22));
    for (let x = start + 3 + y % 9; x < end - 4; x += 12) box(canvas, x, y - 1, 5, 1, lighten(color, .19));
  }
  box(canvas, left, eave - 1, right - left, 3, darken(color, .55));
  box(canvas, left + 1, eave - 1, right - left - 3, 1, lighten(color, .32));
}

function gable(canvas: AssetCanvas, left: number, right: number, top: number, eave: number, wall: number, trim = ivory) {
  const peak = Math.round((left + right) / 2);
  canvas.polygon([[left, eave], [peak, top], [right, eave]], darken(trim, .45));
  canvas.polygon([[left + 4, eave], [peak, top + 5], [right - 4, eave]], wall);
  for (let y = eave - 4; y > top + 8; y -= 4) {
    const inset = Math.ceil((eave - y) * (peak - left) / (eave - top));
    box(canvas, left + inset + 4, y, right - left - 2 * inset - 8, 1, darken(wall, .18));
  }
  stroke(canvas, [left + 1, eave], [peak, top + 2], 2, trim);
  stroke(canvas, [peak, top + 2], [right - 1, eave], 2, darken(trim, .14));
}

function window(canvas: AssetCanvas, x: number, y: number, w: number, h: number, trim = ivory, bars = true) {
  box(canvas, x - 1, y - 1, w + 2, h + 3, darken(trim, .47));
  box(canvas, x, y, w, h, trim);
  box(canvas, x + 2, y + 2, w - 4, h - 4, glass);
  if (w > 9) canvas.polygon([[x + 2, y + 4], [x + 7, y + 2], [x + 10, y + 2], [x + 2, y + 9]], reflection);
  box(canvas, x + 2, y + h - 5, w - 4, 2, darken(glass, .31));
  if (bars) {
    box(canvas, x + Math.floor(w / 2), y + 1, 1, h - 2, trim);
    box(canvas, x + 1, y + Math.floor(h / 2), w - 2, 1, trim);
  }
  box(canvas, x - 1, y + h, w + 2, 1, lighten(trim, .34));
}

function entrance(canvas: AssetCanvas, x: number, y: number, w: number, color: number, trim = ivory) {
  const h = 77 - y;
  box(canvas, x - 2, y - 2, w + 4, h + 2, trim);
  box(canvas, x, y, w, h, darken(color, .54));
  box(canvas, x + 1, y + 1, w - 2, h - 2, color);
  box(canvas, x + 2, y + 3, w - 4, Math.max(4, h - 11), darken(glass, .33));
  box(canvas, x + 2, y + 3, w - 4, 1, glass);
  box(canvas, x + w - 3, y + h - 7, 1, 2, 0xe6b75c);
  box(canvas, x - 3, 77, w + 6, 2, lighten(stone));
  box(canvas, x - 4, 79, w + 8, 2, stone);
  box(canvas, x - 5, 81, w + 10, 2, darken(stone, .24));
}

function planting(canvas: AssetCanvas, x: number, y: number, w: number, bloom = 0xb15255) {
  box(canvas, x, y + 2, w, 2, 0x685849);
  for (let dx = 2; dx < w - 1; dx += 4) {
    oval(canvas, x + dx, y, 3, dx % 3 ? 2 : 3, 0x3e5940);
    box(canvas, x + dx - 2, y - 1, 2, 2, 0x83915b);
    box(canvas, x + dx, y - 2 - dx % 2, 2, 2, bloom);
  }
}

function chimney(canvas: AssetCanvas, x: number, y: number, h: number) {
  const brick = 0x8c554a;
  box(canvas, x, y + 1, 7, h, brick);
  box(canvas, x + 4, y + 1, 3, h, darken(brick, .42));
  for (let row = y + 4; row < y + h; row += 4) box(canvas, x, row, 6, 1, darken(brick));
  box(canvas, x - 2, y, 11, 3, darken(brick, .47));
}

function cornice(canvas: AssetCanvas, x: number, y: number, w: number, color: number) {
  box(canvas, x, y, w, 4, darken(color, .5));
  box(canvas, x - 1, y, w + 2, 1, lighten(color, .22));
  box(canvas, x + 2, y + 1, w - 4, 1, color);
}

function balcony(canvas: AssetCanvas, x: number, y: number, w: number, trim: number) {
  box(canvas, x, y, w, 2, trim);
  for (let post = x; post < x + w; post += 4) box(canvas, post, y, 1, 7, trim);
  cornice(canvas, x - 1, y + 6, w + 2, trim);
}

const buildings: readonly ((canvas: AssetCanvas, color: number) => void)[] = [
  // Cedar Starter House
  (c, color) => {
    const wall = lighten(color, .27);
    facade(c, 18, 47, 60, 31, wall);
    chimney(c, 62, 24, 19);
    roof(c, 12, 83, 26, 49, 38, 58, 0x6a625c);
    gable(c, 16, 62, 25, 50, wall);
    window(c, 32, 36, 14, 10);
    window(c, 23, 56, 20, 15);
    window(c, 62, 55, 10, 13);
    planting(c, 23, 72, 20, 0xd68b71);
    entrance(c, 48, 55, 10, 0x556462);
    roof(c, 45, 64, 49, 54, 47, 59, 0x5b625b);
    box(c, 44, 54, 2, 22, ivory);
    box(c, 61, 54, 2, 22, ivory);
  },
  // Maple Cottage
  (c, color) => {
    const wall = darken(lighten(color, .22), .12);
    facade(c, 12, 39, 71, 39, wall);
    chimney(c, 20, 15, 25);
    roof(c, 7, 87, 25, 54, 32, 75, 0x665356);
    gable(c, 8, 62, 13, 54, wall, 0xf7e9c7);
    window(c, 25, 34, 17, 15, 0xf7e9c7);
    planting(c, 24, 48, 19);
    facade(c, 48, 55, 26, 23, lighten(wall, .22));
    gable(c, 43, 80, 35, 57, lighten(wall, .22));
    oval(c, 61, 49, 4, 4, ivory);
    oval(c, 61, 49, 3, 3, glass);
    window(c, 16, 59, 21, 14);
    entrance(c, 56, 60, 11, 0x70484b);
    planting(c, 16, 73, 21);
    planting(c, 72, 73, 11);
  },
  // Redbrick Terrace
  (c, color) => {
    facade(c, 25, 18, 48, 61, color, 'brick');
    chimney(c, 34, 11, 15);
    cornice(c, 22, 19, 53, 0x6d6766);
    box(c, 25, 34, 46, 2, mortar);
    box(c, 25, 53, 46, 2, mortar);
    for (const x of [30, 46, 61]) window(c, x, 25, 9, 8);
    for (const x of [30, 46, 61]) window(c, x, 39, 9, 12);
    window(c, 51, 59, 15, 14);
    entrance(c, 32, 59, 12, 0x3f5b55);
    planting(c, 53, 75, 14, 0xefc26f);
  },
  // Sunset Bungalow
  (c, color) => {
    facade(c, 10, 53, 76, 24, lighten(color), 'render');
    roof(c, 5, 90, 38, 55, 24, 70, 0xab614d);
    window(c, 15, 58, 14, 13);
    window(c, 64, 58, 14, 13);
    entrance(c, 43, 58, 11, 0x476758);
    for (const x of [11, 32, 61, 83]) box(c, x, 54, 2, 23, 0xdfc58e);
    balcony(c, 12, 68, 22, 0x698270);
    balcony(c, 61, 68, 24, 0x698270);
  },
  // Harbor Loft
  (c, color) => {
    facade(c, 11, 27, 75, 50, color, 'brick');
    cornice(c, 9, 25, 80, 0x5f5154);
    for (const x of [17, 39, 61]) {
      oval(c, x + 8, 37, 8, 7, mortar);
      window(c, x, 37, 17, 14, 0x5a6265);
      window(c, x, 55, 17, 16, 0x5a6265);
    }
    box(c, 13, 51, 71, 2, darken(color));
    entrance(c, 41, 61, 11, steel, 0xd4c6ae);
  },
  // Pine Ridge Chalet
  (c, color) => {
    facade(c, 17, 48, 62, 30, color);
    chimney(c, 60, 23, 23);
    roof(c, 8, 89, 16, 55, 44, 61, 0x53494a);
    gable(c, 9, 77, 13, 55, color, 0xb48a67);
    window(c, 32, 33, 19, 18, 0xe3bd85);
    balcony(c, 19, 48, 50, timber);
    window(c, 23, 60, 15, 13, 0xd9ba8f);
    window(c, 58, 60, 14, 13, 0xd9ba8f);
    entrance(c, 42, 58, 12, timber, 0xb08465);
  },
  // Courtyard Villa
  (c, color) => {
    facade(c, 29, 39, 38, 36, darken(color, .2), 'render');
    roof(c, 23, 73, 30, 44, 33, 64, 0xab6751);
    for (const x of [35, 55]) window(c, x, 47, 9, 13, 0xf4e5c2);
    entrance(c, 44, 58, 10, 0x6c5444);
    for (const x of [8, 66]) {
      facade(c, x, 53, 22, 25, color, 'render');
      roof(c, x - 2, x + 24, 43, 56, x + 8, x + 15, 0xb37052);
      window(c, x + 5, 59, 12, 13, 0xf7e8c5);
      planting(c, x + 1, 76, 20, 0xb77a9d);
    }
  },
  // Hilltop Glass House
  (c, color) => {
    const concrete = 0xbcb1a0;
    facade(c, 12, 51, 71, 26, concrete, 'render');
    for (const x of [15, 30, 45, 60]) window(c, x, 55, 14, 20, 0x657780, false);
    cornice(c, 9, 49, 76, steel);
    facade(c, 29, 28, 59, 23, color, 'render');
    for (const x of [33, 46, 59, 72]) window(c, x, 30, 12, 18, 0x52616c, false);
    cornice(c, 25, 26, 65, steel);
    balcony(c, 13, 43, 14, 0x949d9b);
    planting(c, 15, 77, 23, 0xddbc63);
    entrance(c, 71, 56, 9, steel, concrete);
  },
  // Lakeside Manor
  (c, color) => {
    facade(c, 7, 47, 82, 30, color, 'render');
    roof(c, 4, 91, 36, 49, 15, 80, 0x667486);
    for (const x of [11, 21, 66, 76]) window(c, x, 55, 8, 14);
    facade(c, 30, 40, 35, 38, lighten(color), 'render');
    gable(c, 27, 69, 24, 43, color, 0xe9dfc5);
    window(c, 43, 34, 10, 11, 0xe8dbbc);
    window(c, 32, 54, 9, 15, 0xe7d8b6);
    window(c, 55, 54, 9, 15, 0xe7d8b6);
    entrance(c, 43, 55, 10, 0x465866);
    planting(c, 8, 74, 20, 0xc58097);
    planting(c, 67, 74, 20, 0xc58097);
    oval(c, 73, 83, 13, 2, 0xa5c9cb);
  },
  // Skyline Penthouse
  (c, color) => {
    facade(c, 21, 37, 55, 39, darken(color, .21), 'render');
    for (const y of [43, 57]) {
      for (const x of [25, 37, 49, 61]) window(c, x, y, 11, 11, 0x5b6c7a, false);
      cornice(c, 19, y + 11, 58, 0x9cabb2);
    }
    facade(c, 29, 20, 36, 20, color, 'render');
    for (const x of [32, 42, 52]) window(c, x, 23, 10, 15, 0x6e818e, false);
    cornice(c, 26, 18, 41, 0x778799);
    balcony(c, 18, 33, 60, 0x8eaaa3);
    box(c, 65, 36, 13, 4, 0x70aaa9);
    box(c, 65, 36, 10, 1, reflection);
    planting(c, 19, 36, 11, 0xbd9a84);
    box(c, 19, 73, 59, 4, 0xa9a499);
  },
];

export function drawHouse(canvas: AssetCanvas, design: number, color: number) {
  oval(canvas, 48, 80, 42, 5, 0xd9d4c7);
  oval(canvas, 49, 79, 39, 4, 0xaeb08a);
  buildings[design]!(canvas, color);
}
