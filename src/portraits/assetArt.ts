import type { AssetListing } from '../data/shops.ts';
import { assetArtSize } from './assetPixels.ts';
import { drawCar } from './carArt.ts';
import { drawHouse } from './houseArt.ts';
import { drawMotorcycle } from './motorcycleArt.ts';
import { pixelCanvas } from './pixels.ts';

export { assetArtSize };
const cache = new Map<string, string>();
const drawings = { houses: drawHouse, cars: drawCar, motorcycles: drawMotorcycle };

export function assetArt(listing: AssetListing) {
  const saved = cache.get(listing.id);
  if (saved) return saved;
  const canvas = pixelCanvas(assetArtSize, 0xffffff);
  drawings[listing.kind](canvas, listing.design, listing.color);
  const source = canvas.png();
  cache.set(listing.id, source);
  return source;
}
