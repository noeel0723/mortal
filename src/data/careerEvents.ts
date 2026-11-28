import { jobById } from './jobs.ts';
import type { Industry } from '../engine/careerTypes.ts';
import { outstanding } from '../engine/finance.ts';
import type { Life, LifeEvent } from '../engine/types.ts';

type Details = Pick<LifeEvent, 'effects' | 'careerEffects' | 'choices'>;
const working = (life: Life) => !!life.career.current;
const event = (id: string, text: string, eligible: (life: Life) => boolean = working, details: Details = {}, ages: readonly [number, number] = [18, 115]): LifeEvent =>
  ({ id: `job-${id}`, ages, category: 'career', probability: .22, text, eligible, ...details });

const industryEvents: readonly [Industry, string, string, Details][] = [
  ['Technology', 'code-review', 'A review uncovered a simpler way to solve a technical problem.', { careerEffects: { performance: 3 } }],
  ['Healthcare', 'clinic-rush', 'Our clinic team stayed organized through an unusually busy day.', { effects: { discipline: 2 }, careerEffects: { stress: 4 } }],
  ['Finance', 'ledger-check', 'I caught and corrected a discrepancy during a routine financial check.', { careerEffects: { reputation: 3 } }],
  ['Education', 'learner-milestone', 'A learner finally grasped something they had been struggling with.', { careerEffects: { satisfaction: 5 } }],
  ['Engineering', 'site-review', 'A review uncovered a problem we could fix before the next stage of the project.', { careerEffects: { performance: 3 } }],
  ['Administration', 'office-handoff', 'I left clearer notes for the people taking over my duties while I was away.', { careerEffects: { security: 3 } }],
  ['Hospitality', 'service-rush', 'The rush brought a long line, but our team found a rhythm.', { careerEffects: { performance: 3, stress: 3 } }],
  ['Retail', 'customer-thanks', 'A customer came back to thank me for finding something they needed.', { careerEffects: { satisfaction: 4 } }],
  ['Legal', 'case-prep', 'I double-checked a file and caught a missing document before handing it over.', { careerEffects: { performance: 3 } }],
  ['Creative & Media', 'creative-deadline', 'We shipped a project after one last round of revisions.', { careerEffects: { satisfaction: 4, stress: 4 } }],
];

export const careerEvents: LifeEvent[] = [
  event('first-interview', 'Applying for jobs made me practice explaining my experience out loud.',
    (life) => life.career.applications.some(({ result }) => result !== 'ineligible'), { effects: { charisma: 2 } }),
  event('first-shift', 'By the end of my first few shifts, I finally knew where everything was.',
    (life) => life.career.experience === 1 && working(life), { careerEffects: { satisfaction: 3 } }),
  event('hard-supervisor', 'My supervisor gave me blunt feedback. I had to decide how to respond.',
    (life) => working(life) && life.career.current!.performance < 60, { choices: [
      { id: 'clarify', label: 'Ask for examples', emoji: 'study', outcome: 'The feedback made more sense once we discussed examples.', effects: { discipline: 2 }, careerEffects: { performance: 5 } },
      { id: 'move-on', label: 'Keep my head down', emoji: 'decline', outcome: 'I carried on with the rest of my work.', effects: { stress: 3 }, careerEffects: { satisfaction: -3 } },
    ] }),
  event('disagreement', 'Two people at work disagreed about a task, and I helped find a way forward.', working, { effects: { charisma: 2 } }),
  event('stretch-assignment', 'I was invited to take on an assignment that could strengthen my case for a promotion.',
    (life) => life.career.current !== null && life.career.current.performance >= 62 && !!jobById.get(life.career.current.jobId)?.promotions.length, { choices: [
      { id: 'accept', label: 'Take on the assignment', emoji: 'accept', outcome: 'I showed I could handle more responsibility.', effects: { stress: 6 }, careerEffects: { performance: 6, reputation: 4 } },
      { id: 'decline', label: 'Keep my current workload', emoji: 'decline', outcome: 'I stayed focused on my existing responsibilities.', effects: { stress: -3 } },
    ] }),
  event('pay-conversation', 'I learned what my employer expects before reviewing a raise.',
    (life) => life.career.current !== null && life.year - life.career.current.startedYear >= 1, { careerEffects: { satisfaction: 2 } }),
  event('dissatisfaction', 'I left work wondering whether the job still suited me.',
    (life) => life.career.current !== null && life.career.current.satisfaction < 45, { effects: { happiness: -3 } }),
  event('recognition', 'My work was singled out for praise at a team meeting.',
    (life) => (life.career.current?.performance ?? 0) >= 66, { effects: { happiness: 4 }, careerEffects: { reputation: 5 } }),
  event('exhaustion', 'I struggled to switch off after work and woke up tired the next morning.',
    (life) => (life.career.current?.stress ?? 0) >= 57, { careerEffects: { satisfaction: -3 } }),
  event('career-change', 'I considered whether a different industry would suit me better.',
    (life) => life.career.seeking && life.career.experience >= 2, { effects: { discipline: 2 } }),
  event('redundancy-rumor', 'There was talk of restructuring. I thought about what I would do if my role changed.',
    (life) => life.career.current !== null && life.career.current.security < 58, { effects: { stress: 4 }, careerEffects: { security: -4 } }),
  event('retirement-plan', 'I started to think about how I would spend my time after retiring.', working, { careerEffects: { satisfaction: 2 } }, [60, 105]),
  event('retirement-routine', 'I found a new routine and enjoyed having time for ordinary things.',
    (life) => life.career.retiredYear !== null, { effects: { happiness: 4, stress: -4 } }, [65, 115]),
  event('arrears', 'I sat down with my bills and worked out which payments had carried into the new year.',
    (life) => outstanding(life) > 0, { effects: { discipline: 2, stress: 2 } }),
  event('study-shift', 'I arranged my study schedule around my shifts.',
    (life) => !!life.academic.enrollment && working(life), { effects: { discipline: 2 }, careerEffects: { stress: 3 } }),
  event('training', 'I used my notes from a training session to avoid repeating an old mistake.', working, { careerEffects: { performance: 3 } }),
  ...industryEvents.map(([industry, id, text, details]) => event(id, text, (life) =>
    !!life.career.current && jobById.get(life.career.current.jobId)?.industry === industry, details)),
];
