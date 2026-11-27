import { pickStory } from './stories.ts';
import type { activities } from './simulation.ts';
import type { Life } from './types.ts';

export function activityStory(life: Life, activity: keyof typeof activities, adviser?: string) {
  const { age, city } = life.character;
  const stories = {
    'go-to-library': [
      'I visited the public library, found a book on the returns cart, and read the first chapter by the window.',
      'I browsed the library shelves and came home with a story I picked for its cover.',
      'I found a quiet table at the library and lost track of time reading a collection of short stories.',
      'I asked the librarian for a recommendation and read something I would have passed over on my own.',
    ],
    rest: [
      'I took a nap and woke up feeling like I could take on the rest of the day.',
      'I turned down the noise around me and gave myself a quiet afternoon.',
      'I left a few chores for later, put on some music, and let myself unwind.',
    ],
    walk: [
      `I took a walk through ${city} and went down a street I had never noticed before.`,
      'I walked through the park and stopped to watch a pair of birds hop around a puddle.',
      'I followed the shady side of the street and came home by the long route.',
      age < 12 ? 'I walked around the neighborhood and counted how many dogs I could spot.' :
        'I took a walk just as the lights in the neighborhood started coming on.',
    ],
    study: [
      'I rewrote my notes from memory and marked the ideas I still needed to review.',
      'I worked through a few tricky exercises and checked the steps where I usually got stuck.',
      'I explained a lesson out loud until I could get through it without looking at my notes.',
    ],
    library: [
      'I used the school library to look up a question we had left unanswered in class.',
      'I found a reference book in the school library and used it to fill a gap in my notes.',
      'I spread my coursework across a quiet school library table and finished the hardest part first.',
    ],
    socialize: [
      'I joined a conversation between classes and found out what my classmates do on weekends.',
      'I stayed with a few classmates after a lesson and we compared the funniest parts of our week.',
      'I sat with a different group during the break and learned a few names I had never caught before.',
    ],
    extracurricular: [
      'I helped set up the club room and stayed late to finish what we had started.',
      'I tried a new role during a club activity and discovered I liked organizing things.',
      'I helped my club practice for an upcoming event and got to know the other members.',
    ],
    'academic-talk': [
      `I asked ${adviser ?? 'my adviser'} for academic feedback on an assignment I wanted to improve.`,
      `I brought a set of questions to ${adviser ?? 'my adviser'} and used the academic feedback to plan what to study.`,
      `I talked through my recent progress with ${adviser ?? 'my adviser'} and left with academic feedback I could put to use.`,
    ],
    exams: [
      'I timed myself on a practice exam and set aside the questions I needed to revisit.',
      'I broke my exam preparation into short sessions and started with my weakest subject.',
      'I made practice questions from old notes and tested how much I could answer without looking.',
    ],
  } as const;
  return pickStory(life, activity, stories[activity]);
}
