import { jobById } from '../data/jobs.ts';
import type { RelationshipActivity } from './interactions.ts';
import { activeFor } from './relationships.ts';
import { pickStory } from './stories.ts';
import type { Contact, Life, Person, SchoolContact } from './types.ts';
import { isWorkContact } from './workplace.ts';


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
  else if (!('friend' in person)) stories = parentConversation(life, person);
  else if ('stage' in person && (person.role === 'Teacher' || person.role === 'Professor')) stories = teacherConversation(person);
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
  return pickStory(life, `${person.id}:conversation`, stories, true);
}

export function timeTogetherStory(life: Life, person: Contact, remote = false, used?: Set<string>) {
  const { age, city } = life.character;
  const name = person.name;
  let stories: string[];
  if (remote) {
    stories = [
      `I caught up with ${name} on a video call and we showed each other what our day looked like.`,
      `I called ${name} from a quiet spot. An ordinary check-in turned into a long catch-up.`,
      `I showed ${name} a few old photos on a video call. We ended up telling stories about each one.`,
      `I caught up with ${name} over the phone while the sun went down.`,
      `${name} and I shared our favorite moments of the week on a call.`,
    ];
  } else if (person.role === 'Child') {
    stories = person.age < 5 ? [
      `I read a picture book with ${name}, and we stayed on the page with the biggest animals.`,
      `I rolled a soft ball back and forth with ${name} on the living room rug.`,
      `I took ${name} to the park and we stopped to watch a pair of ducks.`,
      `I stacked blocks with ${name} and laughed when our tower fell over.`,
    ] : [
      `I let ${name} choose what we made for lunch and helped them try out their recipe.`,
      `I went for a walk with ${name} and asked them to show me their favorite spot nearby.`,
      `I worked on a little project with ${name}. We took a break when our plan needed a rethink.`,
      `I went to the market with ${name} and we picked something to bring home.`,
    ];
  } else if (activeFor(life, person.id)) {
    stories = [
      `I cooked dinner with ${name}, and we played the music we used to listen to together.`,
      `${name} and I took a walk at sunset and talked about where we first met.`,
      `I shared pastries with ${name} and took turns choosing places to visit next weekend.`,
      `I wandered through a small gallery with ${name} and learned which piece they would take home.`,
      `I spent a quiet evening with ${name} putting together a puzzle and sharing stories.`,
    ];
  } else if (isWorkContact(person)) {
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
  } else if (!('friend' in person)) {
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
      `${name} and I tried a new card game and had to look up the rules twice.`,
      `I joined ${name} for a relaxed afternoon watching a local match.`,
      `I helped ${name} pick a secondhand book, and they chose one for me in return.`,
      `${name} and I took turns picking songs while we put together a snack for ourselves.`,
      ...(age >= 18 ? [`I joined ${name} at a local café for a long catch-up.`] : []),
    ];
  }
  if (!remote && 'hobby' in person) stories.push(`I spent an afternoon ${person.hobby} with ${name}.`);
  const pattern = (story: string) => story.replaceAll(name, '{person}');
  const unused = used && stories.filter((story) => !used.has(pattern(story)));
  const story = pickStory(life, `${person.id}:together`, unused?.length ? unused : stories, true);
  used?.add(pattern(story));
  return story;
}

export function friendshipStory(life: Life, person: Contact) {
  const where = isWorkContact(person) ? 'at work' : 'stage' in person ? 'in class' : 'in the neighborhood';
  return pickStory(life, `${person.id}:friendship`, [
    `I became friends with ${person.name} after we found something in common ${where}.`,
    `I became friends with ${person.name} when a short chat ${where} turned into a long one.`,
    `I became friends with ${person.name} after we agreed to hang out away from the people we usually see ${where}.`,
  ]);
}

type TogetherActivity = 'family-time' | 'hang-out' | 'work-break';

export function interactionStory(life: Life, person: Contact, activity: RelationshipActivity) {
  if (activity === 'family-time' || activity === 'hang-out' || activity === 'work-break') return timeTogetherStory(life, person);
  const { name, role } = person;
  const compliment = isWorkContact(person) ? ['how clearly they explain a difficult task', 'how calm they stay on busy days', 'how easy they are to work with'] :
    role === 'Teacher' || role === 'Professor' ? ['how patient they are when someone has a question', 'how memorable their examples are', 'how much easier they make a difficult subject'] :
      role === 'Mother' || role === 'Father' ? ['how good they are at making people feel welcome', 'how well their new outfit suits them', 'how thoughtful they are about the little things'] :
        ['their sense of humor', 'how their outfit suited them', 'how easy they are to talk to'];
  const stories = {
    'ask-allowance': [
      `I asked ${name} for pocket money and promised to save some of what they gave me.`,
      `I told ${name} what I wanted to save for, and they gave me some pocket money.`,
      `I asked ${name} for a little spending money. They gave me some and asked what I planned to buy.`,
    ],
    'thank-parent': [
      `I thanked ${name} for the small things they do to make my day easier.`,
      `I told ${name} I remembered a time they helped me when I was upset.`,
      `I left ${name} a little note to say I appreciated being looked after.`,
    ],
    'ask-advice': [
      `I asked ${name} what to do when a friend and I disagree. We talked through how to listen first.`,
      `I told ${name} I was nervous about trying something new. They helped me think of a small first step.`,
      `I asked ${name} how they make tough decisions and wrote down one piece of advice I wanted to remember.`,
    ],
    compliment: compliment.map((topic) => `I complimented ${name} on ${topic}.`),
    'study-together': [
      `I traded quiz questions with ${name} on material we both needed to practice.`,
      `I compared notes with ${name} and we filled in the points we had each missed.`,
      `I worked through a tricky problem with ${name} and we talked through two ways to solve it.`,
    ],
    'academic-help': [
      `I showed ${name} where I got stuck and we worked through the first step together.`,
      `I asked ${name} to review an assignment and they pointed out one change I could make.`,
      `I went over my notes with ${name} and asked them to clarify a concept I kept mixing up.`,
    ],
    'mentor-guidance': [
      `I asked ${name} how to choose a project that I could realistically finish.`,
      `I talked through my study goals with ${name} and left with a clearer idea of what to focus on.`,
      `I asked ${name} how they learned to handle setbacks in their field.`,
    ],
    'thank-educator': [
      `I thanked ${name} for taking time to explain a difficult lesson again.`,
      `I told ${name} that an example they shared had made a topic click for me.`,
      `I stopped after class to thank ${name} for encouraging me when I was stuck.`,
    ],
    'discuss-work': [
      `I compared task lists with ${name} and we agreed on what needed to get done first.`,
      `I asked ${name} how they would tackle a task I had been putting off.`,
      `I talked through a handover with ${name} and noticed a detail we would have missed.`,
    ],
    insult: [
      `I told ${name} their idea was ridiculous. The conversation turned tense.`,
      `I made a cutting remark about ${name} in the middle of a conversation. They went quiet.`,
      `I mocked ${name} over a small mistake, and they took offense.`,
    ],
    'mess-with': [
      `I stuck a silly label on ${name}’s notebook. They peeled it off and asked me to stop.`,
      `I tried to fool ${name} with a made-up story. They were annoyed when I admitted it was a prank.`,
      `I hid ${name}’s pen as a joke, then gave it back when they got upset.`,
    ],
  } satisfies Record<Exclude<RelationshipActivity, TogetherActivity>, readonly string[]>;
  return pickStory(life, `${person.id}:${activity}`, stories[activity], true);
}
