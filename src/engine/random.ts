export function seededRandom(state: number) {
  let current = state >>> 0;
  return {
    get state() {
      return current;
    },
    next() {
      current = (current + 0x6d2b79f5) >>> 0;
      let value = Math.imul(current ^ (current >>> 15), current | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    integer(min: number, max: number) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    pick<T>(items: readonly [T, ...T[]]) {
      return items[this.integer(0, items.length - 1)] ?? items[0];
    },
  };
}
