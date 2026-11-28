import { seededRandom } from './random.ts';
import type { Life } from './types.ts';

export function pickStory(life: Life, key: string, stories: readonly string[], contextualSuffix = false) {
  let seed = life.seed ^ Math.imul(life.year, 0x9e3779b9);
  for (const letter of key) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  const options = new Set<string>(stories);
  const previous = life.journal.flatMap(({ text }) => {
    const story = options.has(text) ? text : contextualSuffix ? stories.find((item) => text.startsWith(`${item} `)) : undefined;
    return story ? [story] : [];
  });
  const seen = new Set(previous);
  const unused = stories.filter((story) => !seen.has(story));
  const pool = unused.length ? unused : stories.filter((story) => story !== previous.at(-1));
  return pool[seededRandom(seed).integer(0, pool.length - 1)] ?? stories[0]!;
}
