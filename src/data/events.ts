import type { LifeEvent } from '../engine/types.ts';
import { libraryEvents } from './libraryEvents.ts';
import { playerPatient } from '../engine/healthTypes.ts';
import { careerEvents } from './careerEvents.ts';

export const events: readonly LifeEvent[] = [
  { id: 'first-steps', ages: [1, 2], category: 'family', probability: 1, text: 'I took my first steps across the living room.', effects: { happiness: 3 } },
  { id: 'first-word', ages: [2, 3], category: 'family', probability: .8, text: 'I learned to say my own name. My family repeated it back to me all afternoon.', effects: { charisma: 2 } },
  { id: 'rain-puddles', ages: [2, 5], category: 'life', probability: .35, text: 'I stamped through rain puddles until my boots filled with water.', effects: { happiness: 4 } },
  { id: 'picture-book', ages: [2, 6], category: 'family', probability: .45, text: 'We wore out the pages of my favorite picture book by reading it every evening.', effects: { smarts: 2 } },
  { id: 'block-tower', ages: [3, 6], category: 'life', probability: .4, text: 'I built a block tower taller than I was. Watching it fall was half the fun.', effects: { creativity: 3 } },
  {
    id: 'first-classroom', ages: [6, 6], category: 'school', probability: 1,
    text: 'On my first day of primary school, I spotted someone sitting alone at lunch.',
    choices: [
      { id: 'join', label: 'Sit with them', emoji: 'support', outcome: 'I shared my lunch and we talked until the bell rang.', effects: { happiness: 4, charisma: 4 } },
      { id: 'observe', label: 'Take a quiet moment', emoji: 'decline', outcome: 'I took time to get used to my new classroom at my own pace.', effects: { stress: -4, discipline: 2 } },
    ],
  },
  { id: 'loose-tooth', ages: [6, 8], category: 'family', probability: .5, text: 'I lost my first tooth while eating an apple and found a small gift the next morning.', effects: { bank: 500, happiness: 2 } },
  { id: 'paper-kite', ages: [6, 9], category: 'life', probability: .35, text: 'I made a paper kite and finally got it into the air on the third try.', effects: { creativity: 3, discipline: 2 } },
  { id: 'spelling-round', ages: [7, 10], category: 'school', probability: .37, text: 'I stayed up practicing for a spelling round and remembered the hardest word.', effects: { smarts: 3, discipline: 2 } },
  { id: 'harbor-walk', ages: [7, 13], category: 'community', probability: .65, eligible: (life) => life.character.city === 'Alder Bay', text: 'I watched fog lift from the harbor while counting boats with my family.', effects: { stress: -3, happiness: 3 } },
  { id: 'market-stall', ages: [8, 14], category: 'community', probability: .65, eligible: (life) => life.character.city === 'Bellmere', text: 'A fruit seller at the market taught me to tell which pears were ripe by smell.', effects: { smarts: 2, happiness: 2 } },
  { id: 'railway-museum', ages: [8, 14], category: 'community', probability: .65, eligible: (life) => life.character.city === 'Northwick', text: 'I climbed into an old locomotive cab on a school trip to the railway museum.', effects: { smarts: 2, happiness: 2 } },
  { id: 'relay', ages: [8, 13], category: 'school', probability: .32, modifier: (life) => life.character.talent === 'athletic' ? 1.6 : 1, text: 'My relay team dropped the baton and finished the race together anyway.', effects: { athleticism: 4, discipline: 2 } },
  { id: 'garden', ages: [9, 15], category: 'family', probability: .32, text: 'I helped plant beans in a shared garden and measured them every weekend.', effects: { discipline: 3, happiness: 3 } },
  {
    id: 'library-mentor', ages: [10, 11], category: 'school', probability: .85, text: 'A librarian invited me to help run a Saturday reading circle.',
    choices: [
      { id: 'join', label: 'Join the reading circle', emoji: 'study', outcome: 'I read aloud with younger students on Saturdays.', effects: { smarts: 4, stress: 3 }, delayed: { years: 2, text: 'The librarian wrote me a letter recognizing two years of volunteering.', effects: { reputation: 6, charisma: 2 } } },
      { id: 'pass', label: 'Keep Saturdays free', emoji: 'decline', outcome: 'I kept borrowing books and spent Saturdays with my family.', effects: { happiness: 3, stress: -3 } },
    ],
  },
  { id: 'science-fair', ages: [11, 15], category: 'school', probability: .33, eligible: (life) => life.character.attributes.smarts >= 50, text: 'I explained my homemade water filter at the school science fair.', effects: { smarts: 4, reputation: 3 } },
  { id: 'missed-bus', ages: [11, 17], category: 'school', probability: .22, text: 'I missed the school bus and had to explain why I arrived late.', effects: { stress: 4, discipline: 2 } },
  { id: 'family-budget', ages: [12, 17], category: 'family', probability: .45, eligible: (life) => life.character.background === 'working-class', text: 'I started comparing prices with my family before our weekly shop.', effects: { discipline: 4 } },
  { id: 'instrument', ages: [12, 17], category: 'life', probability: .3, modifier: (life) => life.character.talent === 'creative' ? 1.7 : 1, text: 'I borrowed a battered keyboard and learned a song by ear.', effects: { creativity: 5, happiness: 2 } },
  { id: 'tutor', ages: [13, 17], category: 'school', probability: .48, eligible: (life) => life.character.background === 'affluent', text: 'My family arranged tutoring before exams. I learned to explain the problems myself.', effects: { smarts: 5, stress: -2 } },
  {
    id: 'school-festival', ages: [14, 16], category: 'school', probability: .7, text: 'The school festival needed a stage crew and someone to take charge of tickets.',
    choices: [
      { id: 'stage', label: 'Build the set', emoji: 'art', outcome: 'I painted the backdrop with the stage crew.', effects: { creativity: 6, happiness: 2 } },
      { id: 'tickets', label: 'Organize tickets', emoji: 'support', outcome: 'I made the seating plan and kept the queue moving.', effects: { discipline: 4, charisma: 4 } },
      { id: 'pass', label: 'Attend as a guest', emoji: 'decline', outcome: 'I cheered from the audience and went home early.', effects: { happiness: 4, stress: -4 } },
    ],
  },
  { id: 'finals', ages: [16, 17], category: 'school', probability: .7, text: 'My final exams landed in the same week. I made a schedule and stuck to it.', effects: { smarts: 3, discipline: 3, stress: 6 } },
  { id: 'graduation-photo', ages: [18, 18], category: 'school', probability: 1, eligible: () => false, text: 'We took a class photo after graduation. I kept a copy to remember the day.', effects: { happiness: 5 } },
  {
    id: 'graduation-plan', ages: [18, 115], category: 'school', probability: 1, eligible: () => false,
    text: 'With a high school qualification in hand, I had to decide what to do next.',
    choices: [
      { id: 'university', label: 'Apply to University', emoji: 'university', academicPath: 'university', outcome: 'I decided to explore university programs.', effects: {} },
      { id: 'vocational', label: 'Pursue Vocational Education', emoji: 'vocational', academicPath: 'vocational', outcome: 'I decided to explore vocational training.', effects: {} },
      { id: 'workforce', label: 'Enter the Workforce', emoji: 'career', academicPath: 'workforce', outcome: 'I set my sights on joining the workforce.', effects: {} },
      { id: 'gap-year', label: 'Take a Gap Year', emoji: 'study', academicPath: 'gap-year', outcome: 'I planned to take a year away from formal education.', effects: { stress: -4 } },
    ],
  },
  {
    id: 'neighborhood-grant', ages: [19, 28], category: 'community', probability: .46, eligible: (life) => life.character.attributes.discipline >= 48, text: 'The neighborhood council asked for volunteers to restore a neglected courtyard.',
    choices: [
      { id: 'lead', label: 'Help plan the work', emoji: 'accept', outcome: 'I put together a work plan and recruited volunteers.', effects: { reputation: 5, stress: 5 }, delayed: { years: 1, text: 'The courtyard reopened with a public garden after months of work.', effects: { happiness: 6, reputation: 4 } } },
      { id: 'plant', label: 'Help for one afternoon', emoji: 'support', outcome: 'I helped plant herbs near the entrance.', effects: { happiness: 5 } },
      { id: 'pass', label: 'Decline the invitation', emoji: 'decline', outcome: 'I thanked the council and kept my schedule open.', effects: { stress: -3 } },
    ],
  },
  { id: 'lost-wallet', ages: [18, 30], category: 'community', probability: .22, text: 'I returned a wallet I found beneath a tram seat. Its owner sent a thank-you note.', effects: { reputation: 4, happiness: 2 } },
  { id: 'moving-boxes', ages: [19, 36], category: 'community', probability: .25, text: 'I helped a neighbor carry boxes up three flights of stairs.', effects: { athleticism: 2, reputation: 3 } },
  { id: 'class-reunion', ages: [23, 35], category: 'school', probability: .26, text: 'I went to a class reunion and learned what my old classmates had been doing.', effects: { charisma: 3, happiness: 3 } },
  { id: 'open-mic', ages: [20, 40], category: 'community', probability: .25, eligible: (life) => life.character.attributes.creativity >= 50, text: 'I read a short story at a neighborhood open mic and got through it without rushing.', effects: { creativity: 4, charisma: 4 } },
  { id: 'community-run', ages: [21, 45], category: 'health', probability: .23, eligible: (life) => life.character.attributes.athleticism >= 45, text: 'I trained for a local fun run and finished with enough breath to talk.', effects: { athleticism: 4, health: 3 } },
  { id: 'cold-season', ages: [20, 48], category: 'health', probability: .24, text: 'I caught a cold.', illness: 'cold',
    eligible: (life) => !life.illnesses.some(({ patient }) => patient === playerPatient) },
  { id: 'recipe', ages: [24, 49], category: 'family', probability: .28, eligible: (life) => life.family.some((person) => person.alive), text: 'A parent showed me how to make a family recipe from memory. I wrote down the measurements.', effects: { happiness: 4, creativity: 3 } },
  { id: 'flooded-street', ages: [25, 53], category: 'community', probability: .19, text: 'Heavy rain flooded the nearest bus stop. Our street shared updates until the water subsided.', effects: { stress: 4, reputation: 1 } },
  { id: 'old-injury', ages: [31, 57], category: 'health', probability: .24, modifier: (life) => life.character.attributes.athleticism >= 65 ? 1.4 : 1, text: 'A sore knee made me slow down and change how I exercise.', effects: { athleticism: -3, health: -3 } },
  { id: 'oral-histories', ages: [35, 60], category: 'community', probability: .2, eligible: (life) => life.character.attributes.charisma >= 48, text: 'I recorded a neighbor’s memories for the library’s local history collection.', effects: { charisma: 3, reputation: 5 } },
  { id: 'repair-cafe', ages: [32, 61], category: 'community', probability: .22, text: 'I fixed a broken lamp at a repair café with tools I had never used.', effects: { creativity: 3, discipline: 3 } },
  { id: 'tree-planting', ages: [35, 65], category: 'community', probability: .23, text: 'I planted a street tree and signed up to water it through its first summer.', effects: { discipline: 3, happiness: 3 } },
  { id: 'vision-check', ages: [41, 63], category: 'health', probability: .28, text: 'An eye exam explained why I had been squinting at books in the evening.', effects: { stress: -3, health: 1 } },
  { id: 'care-package', ages: [40, 67], category: 'family', probability: .25, eligible: (life) => life.family.some((person) => person.alive), text: 'I brought a care package to a parent during a difficult month.', effects: { happiness: 3, stress: 2 } },
  {
    id: 'time-capsule', ages: [48, 59], category: 'community', probability: .55, text: 'The library asked what I would leave in a neighborhood time capsule.',
    choices: [
      { id: 'write', label: 'Write a letter', emoji: 'art', outcome: 'I wrote about how the streets had changed since my childhood.', effects: { creativity: 5, happiness: 2 } },
      { id: 'help', label: 'Help collect stories', emoji: 'support', outcome: 'I helped other residents record their memories.', effects: { charisma: 4, reputation: 4 } },
    ],
  },
  { id: 'sleep-routine', ages: [43, 68], category: 'health', probability: .25, eligible: (life) => life.character.attributes.stress >= 18, text: 'I set a regular bedtime after several restless weeks and felt more rested.', effects: { stress: -8, energy: 8 } },
  { id: 'old-diary', ages: [50, 76], category: 'life', probability: .22, text: 'I found an old diary and read the plans I had made as a teenager.', effects: { happiness: 3, creativity: 3 } },
  { id: 'new-route', ages: [55, 80], category: 'health', probability: .22, text: 'I found a quieter walking route with benches where I could stop and rest.', effects: { health: 3, stress: -3 } },
  { id: 'family-album', ages: [56, 82], category: 'family', probability: .25, text: 'I labeled the people and places in my family’s oldest photo album.', effects: { happiness: 5 } },
  { id: 'board-games', ages: [58, 86], category: 'community', probability: .24, text: 'I joined a weekly board game table and taught the group a game from my childhood.', effects: { smarts: 2, charisma: 3 } },
  { id: 'winter-stiffness', ages: [64, 94], category: 'health', probability: .26, text: 'Cold mornings made my joints stiff. I adapted my routine so I could keep moving.', effects: { health: -3, discipline: 2 } },
  { id: 'music-archive', ages: [63, 87], category: 'life', probability: .22, text: 'I put together a list of the songs that had stayed with me over the years.', effects: { creativity: 3, happiness: 4 } },
  { id: 'library-donation', ages: [67, 94], category: 'community', probability: .24, text: 'I donated a box of books with handwritten notes tucked into their pages.', effects: { reputation: 3, happiness: 3 } },
  { id: 'balcony', ages: [69, 99], category: 'life', probability: .23, text: 'A pair of birds started visiting my balcony. I learned to recognize their calls.', effects: { happiness: 4, stress: -3 } },
  { id: 'park-bench', ages: [73, 103], category: 'community', probability: .23, text: 'Someone repaired the park bench I used every week. I left a thank-you with the parks office.', effects: { happiness: 4 } },
  { id: 'warm-visit', ages: [79, 110], category: 'community', probability: .27, text: 'A neighbor brought soup during a cold spell and stayed to talk.', effects: { happiness: 6, health: 1 } },
  ...careerEvents,
];

export const eventById = new Map([...events, ...libraryEvents].map((event) => [event.id, event]));
