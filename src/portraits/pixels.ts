const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

const bytes = (number: number) => [number >>> 24, number >>> 16 & 255, number >>> 8 & 255, number & 255];

function chunk(name: string, data: readonly number[]) {
  const body = [...Array.from(name, (letter) => letter.charCodeAt(0)), ...data];
  const crc = body.reduce((value, byte) => (value >>> 8) ^ crcTable[(value ^ byte) & 255]!, 0xffffffff);
  return [...bytes(data.length), ...body, ...bytes(crc ^ 0xffffffff)];
}

function zlib(raw: readonly number[]) {
  let a = 1;
  let b = 0;
  for (const byte of raw) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  // A single uncompressed DEFLATE block is enough for a small indexed sprite.
  const length = raw.length;
  return [0x78, 0x01, 0x01, length & 255, length >>> 8, ~length & 255, ~length >>> 8 & 255,
    ...raw, ...bytes(b << 16 | a)];
}

function base64(data: readonly number[]) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < data.length; index += 3) {
    const a = data[index]!;
    const b = data[index + 1] ?? 0;
    const c = data[index + 2] ?? 0;
    result += alphabet[a >>> 2]! + alphabet[(a & 3) << 4 | b >>> 4]! +
      (index + 1 < data.length ? alphabet[(b & 15) << 2 | c >>> 6]! : '=') +
      (index + 2 < data.length ? alphabet[c & 63]! : '=');
  }
  return result;
}

export type Point = readonly [x: number, y: number];

export function pixelCanvas(size: number, background: number) {
  const pixels = new Uint8Array(size * size);
  const palette: number[] = [background];

  function index(color: number) {
    const existing = palette.indexOf(color);
    if (existing !== -1) return existing;
    palette.push(color);
    return palette.length - 1;
  }

  function span(x: number, end: number, y: number, color: number) {
    const left = Math.max(0, x);
    const right = Math.min(size, end + 1);
    if (y >= 0 && y < size && left < right) pixels.fill(color, y * size + left, y * size + right);
  }

  return {
    polygon(points: readonly Point[], color: number) {
      const bottom = Math.min(size - 1, Math.max(...points.map((point) => point[1])));
      const top = Math.max(0, Math.min(...points.map((point) => point[1])));
      const ink = index(color);
      for (let y = top; y <= bottom; y++) {
        const scan = y + .5;
        const edges: number[] = [];
        let previous = points[points.length - 1]!;
        for (const point of points) {
          const [x0, y0] = previous;
          const [x1, y1] = point;
          if ((y0 <= scan && y1 > scan) || (y1 <= scan && y0 > scan)) edges.push(x0 + (scan - y0) * (x1 - x0) / (y1 - y0));
          previous = point;
        }
        edges.sort((a, b) => a - b);
        for (let i = 0; i + 1 < edges.length; i += 2) span(Math.ceil(edges[i]! - .5), Math.floor(edges[i + 1]! - .5), y, ink);
      }
    },
    png() {
      const raw: number[] = [];
      for (let y = 0; y < size; y++) raw.push(0, ...pixels.subarray(y * size, (y + 1) * size));
      const colors = palette.flatMap((color) => [color >> 16, color >> 8 & 255, color & 255]);
      const data = [137, 80, 78, 71, 13, 10, 26, 10,
        ...chunk('IHDR', [...bytes(size), ...bytes(size), 8, 3, 0, 0, 0]), ...chunk('PLTE', colors),
        ...chunk('IDAT', zlib(raw)), ...chunk('IEND', [])];
      return `data:image/png;base64,${base64(data)}`;
    },
  };
}
