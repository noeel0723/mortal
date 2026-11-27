import type { LifeEvent } from '../engine/types.ts';

export const libraryFriendEvent = 'a-shared-hobby';
export const libraryHobbies = ['reading mystery stories', 'drawing comics', 'looking at star maps', 'playing chess', 'making paper crafts', 'reading about animals'] as const;

export const libraryEvents: readonly LifeEvent[] = [
  { id: libraryFriendEvent, ages: [5, 115], category: 'community', probability: .2, text: 'I met someone with a shared hobby at the library.', choices: [
    { id: 'befriend', label: 'Become Friends', emoji: 'support', outcome: 'We decided to stay in touch.', effects: { happiness: 4, charisma: 2 } },
    { id: 'chat', label: 'Chat About the Hobby', emoji: 'accept', outcome: 'We swapped recommendations before heading home.', effects: { happiness: 2, smarts: 1 } },
    { id: 'read', label: 'Keep Reading', emoji: 'decline', outcome: 'I smiled and went back to my book.', effects: { stress: -2 } },
  ] },
  { id: 'reading-circle-invitation', ages: [7, 115], category: 'community', probability: .2, text: 'A librarian invited me to share a favorite story with the reading circle.', choices: [
    { id: 'share', label: 'Share a Story', emoji: 'support', outcome: 'I told the group why I loved the story and heard their recommendations.', effects: { charisma: 3, happiness: 2 } },
    { id: 'listen', label: 'Sit and Listen', emoji: 'study', outcome: 'I stayed to listen and left with a few titles to look up.', effects: { smarts: 2 } },
  ] },
  { id: 'lost-library-notebook', ages: [5, 115], category: 'community', probability: .2, text: 'I spotted a small notebook on an empty library table. Someone had left it behind.', choices: [
    { id: 'return', label: 'Take It to the Front Desk', emoji: 'support', outcome: 'I handed the notebook to the librarian so its owner could find it.', effects: { reputation: 2, happiness: 1 } },
    { id: 'leave', label: 'Leave It on the Table', emoji: 'decline', outcome: 'I left the notebook where I found it and returned to the shelves.', effects: {} },
  ] },
  { id: 'local-history-display', ages: [10, 115], category: 'community', probability: .2, text: 'The library put out a box of old maps and asked visitors to help label places they recognized.', choices: [
    { id: 'help', label: 'Help Label the Maps', emoji: 'art', outcome: 'I compared old street names and found the block where I grew up.', effects: { smarts: 3, creativity: 2 } },
    { id: 'skip', label: 'Browse the Shelves', emoji: 'decline', outcome: 'I left the maps for another visitor and picked a book to read.', effects: { stress: -1 } },
  ] },
];
