export const assetKinds = ['houses', 'cars', 'motorcycles'] as const;
export type AssetKind = typeof assetKinds[number];
type Listing = { id: string; name: string; detail: string; price: number; color: number };

export const shops = {
  houses: [
    { id: 'cedar-starter', name: 'Cedar Starter House', detail: 'A simple one-bedroom house with a small front porch.', price: 42000, color: 0xf1c284 },
    { id: 'maple-cottage', name: 'Maple Cottage', detail: 'A two-bedroom cottage with a pitched roof and a garden.', price: 62000, color: 0xf4d1ac },
    { id: 'brick-terrace', name: 'Redbrick Terrace', detail: 'A narrow brick townhouse with three bedrooms.', price: 84000, color: 0xca7b68 },
    { id: 'sunset-bungalow', name: 'Sunset Bungalow', detail: 'A single-storey home with a shaded veranda.', price: 105000, color: 0xf9d195 },
    { id: 'harbor-loft', name: 'Harbor Loft', detail: 'A converted warehouse loft with wide windows.', price: 142000, color: 0xbc8380 },
    { id: 'pine-chalet', name: 'Pine Ridge Chalet', detail: 'A timber chalet with a steep roof and a balcony.', price: 188000, color: 0xb47654 },
    { id: 'courtyard-villa', name: 'Courtyard Villa', detail: 'A spacious villa built around a private courtyard.', price: 255000, color: 0xf4d6aa },
    { id: 'glasshouse', name: 'Hilltop Glass House', detail: 'A modern home with floor-to-ceiling windows.', price: 340000, color: 0x98c5d2 },
    { id: 'lakeside-manor', name: 'Lakeside Manor', detail: 'A large estate with symmetrical wings and a lakeside garden.', price: 490000, color: 0xe8deca },
    { id: 'skyline-penthouse', name: 'Skyline Penthouse', detail: 'A top-floor residence with a wraparound terrace.', price: 680000, color: 0x80a4be },
  ],
  cars: [
    { id: 'toyota-yaris', name: 'Toyota Yaris', detail: 'City hatchback', price: 14500, color: 0x72bcb5 },
    { id: 'honda-civic', name: 'Honda Civic', detail: 'Compact sedan', price: 21000, color: 0x8ab1d3 },
    { id: 'golf-gti', name: 'Volkswagen Golf GTI', detail: 'Sport hatchback', price: 28000, color: 0xd4dbe6 },
    { id: 'mazda-mx5', name: 'Mazda MX-5', detail: 'Open-top roadster', price: 35000, color: 0xe56570 },
    { id: 'subaru-wrx', name: 'Subaru WRX', detail: 'Sport sedan', price: 46500, color: 0x6388e0 },
    { id: 'mustang-gt', name: 'Ford Mustang GT', detail: 'Muscle coupe', price: 64000, color: 0xe4a759 },
    { id: 'bmw-m3', name: 'BMW M3', detail: 'Performance sedan', price: 88000, color: 0x77ad86 },
    { id: 'porsche-gt3', name: 'Porsche 911 GT3', detail: 'Track-focused sports car', price: 152000, color: 0xa9d5e7 },
    { id: 'ferrari-296', name: 'Ferrari 296 GTB', detail: 'Mid-engine supercar', price: 272000, color: 0xdc525c },
    { id: 'lamborghini-revuelto', name: 'Lamborghini Revuelto', detail: 'Flagship supercar', price: 435000, color: 0xedc053 },
  ],
  motorcycles: [
    { id: 'honda-super-cub', name: 'Honda Super Cub', detail: 'Step-through commuter', price: 6500, color: 0x78b9ae },
    { id: 'yamaha-nmax', name: 'Yamaha NMAX', detail: 'City scooter', price: 9200, color: 0x8996b7 },
    { id: 'vespa-primavera', name: 'Vespa Primavera', detail: 'Classic scooter', price: 12500, color: 0xffcf91 },
    { id: 'ninja-400', name: 'Kawasaki Ninja 400', detail: 'Lightweight sportbike', price: 17600, color: 0x8fc86a },
    { id: 'enfield-classic', name: 'Royal Enfield Classic 350', detail: 'Retro roadster', price: 20900, color: 0xab886d },
    { id: 'ktm-duke', name: 'KTM 390 Duke', detail: 'Street naked', price: 26800, color: 0xf39558 },
    { id: 'yamaha-mt07', name: 'Yamaha MT-07', detail: 'Middleweight naked', price: 39000, color: 0x659bc7 },
    { id: 'triumph-street', name: 'Triumph Street Triple', detail: 'Performance naked', price: 58500, color: 0xe4c866 },
    { id: 'ducati-panigale', name: 'Ducati Panigale V4', detail: 'Italian superbike', price: 104000, color: 0xe75961 },
    { id: 'bmw-m1000rr', name: 'BMW M 1000 RR', detail: 'Track superbike', price: 149000, color: 0xacc8f0 },
  ],
} as const satisfies Record<AssetKind, readonly Listing[]>;

export type AssetListing = Listing & { kind: AssetKind; design: number };
export const assetCatalog: readonly AssetListing[] = assetKinds.flatMap((kind) =>
  shops[kind].map((listing, design) => ({ ...listing, kind, design })));
export const assetById = new Map(assetCatalog.map((listing) => [listing.id, listing]));
export const starterHome = assetById.get(shops.houses[0].id)!;
