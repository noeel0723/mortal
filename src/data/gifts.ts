type GiftStyle = 'sentimental' | 'practical' | 'playful' | 'premium';
type GiftItem = readonly [name: string, dollars: number];
type GiftTheme = {
  id: string;
  interests: readonly string[];
  style: GiftStyle;
  childFriendly?: boolean;
  items: readonly GiftItem[];
};

const themes: readonly GiftTheme[] = [
  { id: 'flowers', interests: ['gardening', 'sketching'], style: 'sentimental', items: [
    ['Single Red Rose', 3], ['Fresh Lily Bouquet', 14], ['Fresh Rose Bouquet', 18], ['White Tulips', 10], ['Sunflower Posy', 8],
    ['Orchid in a Ceramic Pot', 29], ['Dried Lavender Bundle', 7], ['Garden Peonies', 23], ['Pressed Flower Frame', 16], ['Mixed Wildflowers', 12],
  ] },
  { id: 'gaming', interests: ['gaming', 'chess', 'programming'], style: 'playful', items: [
    ['PlayStation 5 (PS5)', 499], ['Nintendo Switch OLED', 349], ['Wireless Game Controller', 59], ['Mechanical Arcade Stick', 99], ['Co-op Puzzle Game', 24],
    ['Classic Game Cartridge', 42], ['Racing Wheel', 189], ['Handheld Retro Console', 79], ['Gaming Headset', 65], ['Controller Charging Stand', 19],
  ] },
  { id: 'fashion', interests: ['fashion', 'photography', 'acting'], style: 'premium', items: [
    ['Uniqlo Linen Shirt', 34], ['Levi’s Denim Jacket', 89], ['Nike Hoodie', 62], ['Adidas Track Jacket', 72], ['Ralph Lauren Oxford Shirt', 105],
    ['Patagonia Fleece', 119], ['Handwoven Scarf', 25], ['Converse High Tops', 58], ['Lacoste Polo', 94], ['Designer Silk Scarf', 148],
  ] },
  { id: 'watches', interests: ['fashion', 'engineering', 'fitness'], style: 'premium', items: [
    ['Casio Digital Watch', 27], ['Timex Field Watch', 49], ['Citizen Solar Watch', 245], ['Seiko Automatic Watch', 295], ['Minimalist Dress Watch', 75],
    ['Leather Watch Strap', 19], ['G-Shock Sports Watch', 92], ['Vintage-Style Pocket Watch', 69], ['Watch Travel Case', 24], ['Tissot Everyday Watch', 395],
  ] },
  { id: 'wallets', interests: ['fashion', 'travel', 'business'], style: 'practical', items: [
    ['Leather Bifold Wallet', 31], ['Canvas Card Holder', 12], ['Slim Travel Wallet', 21], ['Coach Card Case', 89], ['Fossil Leather Wallet', 55],
    ['Coin Purse with a Snap', 8], ['Recycled Fabric Wallet', 17], ['Metal Card Wallet', 38], ['Passport Wallet', 24], ['Handstitched Zip Wallet', 64],
  ] },
  { id: 'reading', interests: ['reading', 'writing', 'foreign-languages'], style: 'sentimental', childFriendly: true, items: [
    ['Mystery Paperback', 6], ['Illustrated Poetry Collection', 16], ['Pocket Philosophy Book', 9], ['Secondhand Travel Memoir', 5], ['Hardback History Atlas', 35],
    ['Graphic Novel Box Set', 42], ['Clothbound Classic Novel', 27], ['Magnetic Reading Light', 12], ['Handmade Bookmark', 3], ['Illustrated Fairy Tales', 18],
  ] },
  { id: 'art', interests: ['sketching', 'drawing', 'painting'], style: 'playful', childFriendly: true, items: [
    ['Pocket Sketchbook', 5], ['Watercolor Travel Tin', 24], ['Charcoal Drawing Set', 13], ['Soft Pastel Collection', 23], ['Artist Brush Roll', 17],
    ['Colored Pencil Set', 19], ['Mini Easel and Canvas', 15], ['Linocut Starter Kit', 29], ['Ceramic Paint Palette', 11], ['Drawing Tablet', 129],
  ] },
  { id: 'music', interests: ['music', 'guitar', 'piano', 'violin', 'drums', 'singing'], style: 'sentimental', items: [
    ['Acoustic Guitar Pick Set', 4], ['Piano Sheet Music', 11], ['Vinyl Jazz Record', 22], ['Concert Poster', 15], ['Compact Record Player', 95],
    ['Violin Rosin and Cloth', 9], ['Pair of Maple Drumsticks', 12], ['Pocket Harmonica', 17], ['Instrument Tuner', 21], ['Studio Microphone', 109],
  ] },
  { id: 'film', interests: ['film', 'cinema', 'acting', 'writing', 'photography'], style: 'playful', items: [
    ['Classic Cinema Voucher', 9], ['Director’s Cut Blu-ray', 15], ['Indie Film Collection', 28], ['Illustrated Movie Almanac', 19], ['Film Festival Pass', 48],
    ['Popcorn Seasoning Set', 8], ['Framed Film Print', 32], ['Mini Projector', 135], ['Screenwriting Notebook', 6], ['Silent Film Box Set', 49],
  ] },
  { id: 'photography', interests: ['photography', 'sketching', 'travel'], style: 'practical', items: [
    ['Disposable Film Camera', 17], ['Instant Camera', 89], ['Instant Photo Film Pack', 16], ['Mini Phone Tripod', 12], ['Linen Photo Album', 22],
    ['Camera Cleaning Kit', 8], ['Weatherproof Camera Strap', 24], ['Digital Photo Frame', 72], ['Set of Photo Prints', 5], ['Prime Camera Lens', 215],
  ] },
  { id: 'technology', interests: ['technology', 'programming', 'engineering', 'mathematics'], style: 'practical', items: [
    ['USB-C Cable Kit', 9], ['Portable Power Bank', 29], ['Mechanical Keyboard', 82], ['Wireless Mouse', 24], ['Raspberry Pi Starter Kit', 83],
    ['Programmable LED Kit', 34], ['Braided Cable Organizer', 4], ['Laptop Stand', 27], ['Portable Solid-State Drive', 91], ['Noise-Canceling Headphones', 189],
  ] },
  { id: 'outdoors', interests: ['hiking', 'gardening', 'running', 'photography'], style: 'practical', items: [
    ['Wildflower Seed Packet', 3], ['Small Herb Planter', 9], ['Folding Picnic Blanket', 22], ['Lightweight Hiking Pack', 54], ['Pocket Binoculars', 38],
    ['Trail Thermos', 19], ['Camping Lantern', 25], ['Field Guide to Birds', 13], ['Garden Tool Set', 28], ['Two-Person Hiking Tent', 148],
  ] },
  { id: 'sports', interests: ['fitness', 'running', 'football', 'tennis', 'basketball', 'swimming'], style: 'playful', childFriendly: true, items: [
    ['Skipping Rope', 6], ['Training Football', 18], ['Basketball Pump', 8], ['Pool Goggles', 15], ['Foam Recovery Roller', 19],
    ['Tennis Racket', 49], ['Running Belt', 14], ['Resistance Band Set', 12], ['Climbing Gym Pass', 24], ['Running Shoes', 92],
  ] },
  { id: 'cooking', interests: ['cooking', 'gardening', 'baking'], style: 'practical', items: [
    ['Spice Sampler', 9], ['Sourdough Starter Kit', 20], ['Personalized Apron', 16], ['Olive Wood Spoon', 7], ['Cast-Iron Skillet', 31],
    ['Hand-Crank Pasta Maker', 55], ['Pastry Cutter Set', 8], ['Silicone Baking Mat', 12], ['Japanese Chef’s Knife', 99], ['Seasonal Recipe Journal', 10],
  ] },
  { id: 'coffee', interests: ['cooking', 'coffee', 'reading'], style: 'practical', items: [
    ['Fresh Coffee Beans', 11], ['Ceramic Espresso Cups', 16], ['Loose-Leaf Jasmine Tea', 8], ['Cold Brew Bottle', 21], ['Porcelain Pour-Over', 19],
    ['Hand-Crank Coffee Grinder', 37], ['Reusable Cup Sleeve', 5], ['Matcha Whisk Set', 18], ['Stovetop Espresso Maker', 35], ['Electric Gooseneck Kettle', 72],
  ] },
  { id: 'treats', interests: ['cooking', 'baking'], style: 'sentimental', childFriendly: true, items: [
    ['Homemade Shortbread', 4], ['Dark Chocolate Bar', 5], ['Box of Strawberry Mochi', 9], ['Chocolate Truffle Selection', 17], ['Seasonal Fruit Basket', 24],
    ['Maple Candy Tin', 7], ['Local Honey Trio', 14], ['Macaron Gift Box', 21], ['Dried Mango Pouch', 6], ['Artisan Biscuit Hamper', 39],
  ] },
  { id: 'home', interests: ['gardening', 'reading', 'art'], style: 'sentimental', items: [
    ['Small Ceramic Vase', 9], ['Woven Throw Blanket', 34], ['Cedar Scented Candle', 12], ['Personalized Doormat', 25], ['Linen Cushion Cover', 17],
    ['Handblown Glass Ornament', 19], ['Bedside Reading Lamp', 39], ['Bamboo Desk Tray', 13], ['Decorative Wall Tapestry', 44], ['Hand-Thrown Ceramic Bowl', 28],
  ] },
  { id: 'wellness', interests: ['fitness', 'meditation', 'fashion'], style: 'practical', items: [
    ['Lavender Eye Pillow', 9], ['Soft Sleep Mask', 7], ['Hand Cream Trio', 15], ['Aromatic Bath Salts', 8], ['Travel Grooming Kit', 21],
    ['Cork Yoga Mat', 42], ['Sandalwood Soap Bar', 4], ['Plush House Slippers', 26], ['Insulated Water Bottle', 27], ['Spa Gift Voucher', 85],
  ] },
  { id: 'toys', interests: ['chess', 'gaming', 'mathematics', 'drawing'], style: 'playful', childFriendly: true, items: [
    ['Teddy Bear', 12], ['Wooden Train Set', 26], ['Dinosaur Sticker Book', 4], ['Building Brick Set', 28], ['Solar System Puzzle', 10],
    ['Pocket Chess Set', 9], ['Paper Kite Kit', 7], ['Board Game for Two', 19], ['Miniature Science Kit', 18], ['Soft Fabric Storybook', 11],
  ] },
  { id: 'travel', interests: ['travel', 'foreign-languages', 'photography', 'hiking'], style: 'practical', items: [
    ['Illustrated City Map', 5], ['Travel Journal', 8], ['Language Phrasebook', 9], ['Luggage Tag Set', 11], ['Packable Day Bag', 23],
    ['Weekend Duffel Bag', 57], ['Universal Travel Adapter', 18], ['Museum Day Pass', 19], ['Packing Cube Set', 24], ['Scenic Rail Voucher', 78],
  ] },
];

export type Gift = {
  id: string;
  name: string;
  theme: string;
  basePrice: number;
  interests: readonly string[];
  style: GiftStyle;
  childFriendly?: boolean;
};

export const gifts: readonly Gift[] = themes.flatMap(({ id: theme, items, ...details }) => items.map(([name, dollars]) => ({
  id: `${theme}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`,
  name, theme, basePrice: dollars * 100, ...details,
})));

export const giftById: ReadonlyMap<string, Gift> = new Map(gifts.map((gift) => [gift.id, gift]));
