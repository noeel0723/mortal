import type { SkillId } from './skills.ts';
import type { Emoji } from '../theme/tokens.ts';

type Club = { name: string; icon: Emoji; skill: SkillId; fee: number; session: string; project: string };
export const clubs = {
  reading: { name: 'Reading Club', icon: 'library', skill: 'writing', fee: 0,
    session: 'compared different endings to the same story', project: 'put together a reading guide for the next meeting' },
  film: { name: 'Film Society', icon: 'cinema', skill: 'acting', fee: 300,
    session: 'discussed how a short film built tension', project: 'planned a short film using one room and a borrowed camera' },
  football: { name: 'Football Community', icon: 'football', skill: 'football', fee: 350,
    session: 'ran passing drills and swapped positions', project: 'organized a friendly match for newcomers' },
  chess: { name: 'Chess Club', icon: 'chess', skill: 'chess', fee: 0,
    session: 'played a few training games and reviewed mistakes', project: 'made a puzzle sheet for the next club night' },
  music: { name: 'Music Community', icon: 'music', skill: 'guitar', fee: 400,
    session: 'rehearsed a simple tune in small groups', project: 'put together a set for the community open mic' },
  photography: { name: 'Photography Club', icon: 'photography', skill: 'photography', fee: 250,
    session: 'compared photos taken on the same street', project: 'selected photographs for a local exhibit' },
  programming: { name: 'Programming Club', icon: 'laptop', skill: 'programming', fee: 0,
    session: 'worked through a coding puzzle in pairs', project: 'built a small calendar for community events' },
  art: { name: 'Art Community', icon: 'art', skill: 'drawing', fee: 300,
    session: 'tried drawing the same scene in different styles', project: 'worked on a collage for the community hall' },
} as const satisfies Record<string, Club>;
export type ClubId = keyof typeof clubs;

type Book = { title: string; author: string; genre: string; experience: string; skill?: SkillId; mood?: 'happiness' | 'smarts' | 'creativity' };
export const books: Record<string, Book> = {
  'last-ferry': { title: 'The Last Ferry to Brinewick', author: 'Tess Mallory', genre: 'Fiction',
    experience: 'The story made a missed ferry feel like the beginning of a different life.', skill: 'writing', mood: 'happiness' },
  'ordinary-doubt': { title: 'An Ordinary Doubt', author: 'Ren Arakawa', genre: 'Philosophy',
    experience: 'I kept thinking about a chapter on changing your mind.', mood: 'smarts' },
  'small-skies': { title: 'Small Skies', author: 'Mira Bell', genre: 'Science',
    experience: 'The diagrams helped me understand why the same sky can look different from one night to the next.', skill: 'mathematics', mood: 'smarts' },
  'river-archives': { title: 'The River Archives', author: 'Elliot Ford', genre: 'History',
    experience: 'The archive letters told a different story than the official maps.', mood: 'smarts' },
  'quiet-habits': { title: 'Quiet Habits', author: 'Naomi Ives', genre: 'Psychology',
    experience: 'One chapter asked me to notice the habits I take for granted.' },
  'corner-shop': { title: 'The Corner Shop Ledger', author: 'Hana Cole', genre: 'Business',
    experience: 'The shopkeeper’s notes turned out to be as much about the neighborhood as about money.', skill: 'leadership' },
  'machines-listen': { title: 'How Machines Listen', author: 'Jude Okada', genre: 'Technology',
    experience: 'I sketched out how one of the examples might work.', skill: 'programming', mood: 'smarts' },
  'second-stage': { title: 'A Second Stage', author: 'Mason Gray', genre: 'Biography',
    experience: 'I liked the honest account of a career that took several tries to get going.' },
  'tide-panels': { title: 'Tide Station Seven', author: 'Iris Kato', genre: 'Comics',
    experience: 'The panel layouts made me want to draw a few scenes myself.', skill: 'drawing', mood: 'creativity' },
};
