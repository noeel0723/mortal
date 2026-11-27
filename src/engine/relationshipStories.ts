import { jobById } from '../data/jobs.ts';
import { seededRandom } from './random.ts';
import type { Contact, Life, Person, SchoolContact } from './types.ts';
import { isWorkContact } from './workplace.ts';

type Moment = 'conversation' | 'together';

function pickStory(life: Life, person: Contact, moment: Moment, stories: readonly string[]) {
  let seed = life.seed ^ Math.imul(life.year, 0x9e3779b9);
  for (const letter of `${person.id}:${moment}`) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  const options = new Set(stories);
  const previous = life.journal.filter(({ text }) => options.has(text));
  const seen = new Set(previous.map(({ text }) => text));
  const unused = stories.filter((story) => !seen.has(story));
  const pool = unused.length ? unused : stories.filter((story) => story !== previous.at(-1)?.text);
  return pool[seededRandom(seed).integer(0, pool.length - 1)]!;
}

function parentConversation(life: Life, parent: Person) {
  const name = `my ${parent.role.toLowerCase()}, ${parent.name}`;
  const { age } = life.character;
  const topics = age < 6 ? [
    'which animals would make the funniest pets',
    'what I might see on my next trip to the park',
    'why some clouds look like animals',
    'what we should put in our Sunday pancakes',
  ] : [
    'which neighborhood spot makes the best snacks',
    'what we would do on a rainy day with nowhere to be',
    'who played better, Ronaldo or Messi',
    'the best meal we ever made together',
    ...(age >= 12 ? ['what I was like as a child', 'the things we remember differently about my childhood'] : []),
  ];
  const current = life.career.current;
  const title = current && jobById.get(current.jobId)?.title;
  if (title) topics.push(`how work has been going in my role as ${title.toLowerCase()}`, 'what a typical day at my workplace looks like',
    'which parts of my working week I enjoy most');
  if (life.academic.enrollment) topics.push('what I have been learning lately', 'how I get ready for a busy week of classes');
  if (life.career.retiredYear !== null) topics.push('how I have been spending my time in retirement');
  return topics.map((topic) => `I talked with ${name}, about ${topic}.`);
}

function teacherConversation(person: SchoolContact) {
  const professor = person.role === 'Professor';
  const topics = professor ? [
    'a recent lecture we both found interesting',
    'how researchers choose a question worth investigating',
    'which book would help me understand a difficult topic',
    'how to plan a semester around a long project',
    'what they enjoy about teaching their subject',
  ] : [
    'the most surprising thing we learned in class',
    'how to get unstuck when homework feels difficult',
    'which book would be fun to read next',
    'an example from class that helped me understand the lesson',
    'what made them want to become a teacher',
  ];
  return topics.map((topic) => `I talked with my ${person.role.toLowerCase()}, ${person.name}, about ${topic}.`);
}

export function conversationStory(life: Life, person: Contact) {
  let stories: string[];
  if (isWorkContact(person)) {
    const active = life.career.current?.employerId === person.employerId;
    const topics = active ? [
      'how the week at work was going',
      'which lunch spots are worth the walk from work',
      'a task that took longer than either of us expected',
      'what helps us focus when the workplace gets busy',
      ...(person.role !== 'Co-worker' ? ['how our team can make handovers clearer', 'what they wish they had learned in their first job'] : []),
    ] : [
      'an old story from our former workplace',
      'how much our daily routines have changed since we worked together',
      'what we miss about the team we used to work with',
      'the funniest thing we remember from our old break room',
    ];
    stories = topics.map((topic) => `I talked with ${person.name} about ${topic}.`);
  } else if ('hobby' in person) stories = [
    `I talked with ${person.name} about ${person.hobby}, the hobby we bonded over at the library.`,
    `I asked ${person.name} what they had been reading since we last met.`,
    `I swapped library recommendations with ${person.name}.`,
  ];
  else if (!('stage' in person)) stories = parentConversation(life, person);
  else if (person.role === 'Teacher' || person.role === 'Professor') stories = teacherConversation(person);
  else {
    const topics = life.character.age < 12 ? [
      'what aliens might eat for breakfast',
      'the funniest thing that happened during recess',
      'which cartoon character we would take on an adventure',
      'how to build the best blanket fort',
    ] : [
      'who played better, Ronaldo or Messi',
      'the last film that surprised us',
      'which songs we would put on a shared playlist',
      'what we would do with a whole weekend free',
      ...(life.academic.enrollment ? ['how we stay motivated during a week full of assignments'] : []),
      ...(person.friend ? ['how much our lives have changed since we first met'] : []),
    ];
    stories = topics.map((topic) => `I talked with ${person.name} about ${topic}.`);
  }
  return pickStory(life, person, 'conversation', stories);
}

export function timeTogetherStory(life: Life, person: Contact) {
  const { age, city } = life.character;
  const name = person.name;
  let stories: string[];
  if (isWorkContact(person)) {
    stories = life.career.current?.employerId === person.employerId ? [
      `I had coffee with ${name} after work and we stayed until the café was nearly empty.`,
      `I ate lunch with ${name} in the park instead of staying at work.`,
      `I took the long way home with ${name} after work so we could keep talking.`,
      `I joined ${name} for a quiz night after we finished work.`,
    ] : [
      `I met up with ${name} for coffee and we laughed about how we first met at our old job.`,
      `I went for a walk with ${name} and we caught up on life since our days as co-workers.`,
      `I shared a picnic with ${name} and talked about the things we do outside work now.`,
    ];
  } else if (!('stage' in person) && !('hobby' in person)) {
    const parent = `my ${person.role.toLowerCase()}, ${name},`;
    stories = age < 6 ? [
      `I built a blanket fort with ${parent} and we read a story inside it.`,
      `I baked cookies with ${parent} and got flour all over the kitchen.`,
      `I went to the park with ${parent} and we took turns spotting birds.`,
      `I worked on a jigsaw with ${parent} until we found the missing corner piece.`,
    ] : [
      `I went fishing with ${parent} at a pond near ${city}.`,
      `I went to the mall with ${parent} and we hunted for bargains together.`,
      `I picked out ingredients at the market with ${parent} and we cooked dinner together.`,
      `I went on a picnic with ${parent} and we ended up sharing most of our snacks.`,
      `I took a long walk with ${parent} and we found a street neither of us had visited before.`,
      ...(age >= 12 ? [`I looked through old family photos with ${parent} and listened to the stories behind them.`] : []),
    ];
  } else {
    stories = age < 12 ? [
      `I raced paper boats with ${name} and we both cheered when one made it past the bridge.`,
      `I played tag with ${name} at the park until we needed a water break.`,
      `I invented a board game with ${name} and we kept changing the rules as we played.`,
      `I drew a comic with ${name} and we gave all the characters ridiculous names.`,
    ] : [
      `I played a round of badminton with ${name} and our rally lasted longer than either of us expected.`,
      `I had a movie night with ${name} and we spent more time guessing the ending than watching it.`,
      `I browsed a street market with ${name} and we picked out the strangest thing at each stall.`,
      `I met ${name} for a walk around the neighborhood and we ended up talking for hours.`,
      ...(age >= 18 ? [`I joined ${name} at a local café for a long catch-up.`] : []),
    ];
  }
  if ('hobby' in person) stories.push(`I spent an afternoon ${person.hobby} with ${name}.`);
  return pickStory(life, person, 'together', stories);
}
