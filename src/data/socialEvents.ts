import type { LifeEvent } from '../engine/types.ts';

const invitations = [
  { id: 'social-dinner', text: 'asked me to join them for dinner.', label: 'Join Them' },
  { id: 'social-time', text: 'said they missed spending time with me.', label: 'Make Time Together' },
  { id: 'social-proposal', text: 'asked if I would marry them.', label: 'Accept the Proposal' },
  { id: 'social-support', text: 'asked if I could help with $12 of household expenses.', label: 'Send $12' },
  { id: 'social-school', text: 'asked me to help with a school assignment.', label: 'Help with School' },
  { id: 'social-finances', text: 'wanted to talk through a difficult month financially.', label: 'Make a Budget Together' },
] as const;

const regularInvitations: LifeEvent[] = invitations.map(({ id, text, label }) => ({
  id, category: id === 'social-dinner' ? 'community' : 'family', ages: [8, 115], probability: 0, text,
  choices: [
    { id: 'accept', label, emoji: 'accept', outcome: '', effects: {} },
    { id: 'pass', label: 'Decline for Now', emoji: 'decline', outcome: '', effects: {} },
  ],
}));

export const socialEventCatalog: readonly LifeEvent[] = [
  ...regularInvitations,
  { id: 'social-dating-discovery', category: 'community', ages: [18, 115], probability: 0, text: 'I found a dating profile.',
    choices: [
      { id: 'like', label: 'Send Like', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Pass', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-meeting', category: 'community', ages: [5, 115], probability: 0, text: 'I met someone new.',
    choices: [
      { id: 'accept', label: 'Talk and Keep in Touch', emoji: 'support', outcome: '', effects: {} },
      { id: 'pass', label: 'Move On', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-dating-match', category: 'community', ages: [18, 115], probability: 0,
    text: 'would like to get to know me. We could meet for a first date or take it slowly.',
    choices: [
      { id: 'accept', label: 'Go on a First Date', emoji: 'accept', outcome: '', effects: {} },
      { id: 'slow', label: 'Get to Know Them', emoji: 'support', outcome: '', effects: {} },
      { id: 'pass', label: 'Pass', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-casual-match', category: 'community', ages: [18, 115], probability: 0,
    text: 'suggested a casual date with no expectation of a relationship.',
    choices: [
      { id: 'accept', label: 'Go on the Date', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Pass', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-affair', category: 'community', ages: [18, 115], probability: 0,
    text: 'learned I crossed a boundary we had agreed on.',
    choices: [
      { id: 'apologize', label: 'Take Responsibility', emoji: 'support', outcome: '', effects: {} },
      { id: 'deny', label: 'Deny It', emoji: 'decline', outcome: '', effects: {} },
      { id: 'space', label: 'Offer Time Apart', emoji: 'support', outcome: '', effects: {} },
    ] },
  { id: 'social-make-love', category: 'community', ages: [18, 115], probability: 0,
    text: 'I’ll only go ahead if they feel the same.',
    choices: [
      { id: 'accept', label: 'Ask Them', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Not Now', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-hookup', category: 'community', ages: [18, 115], probability: 0,
    text: 'is interested in a one-night stand. We can go our separate ways in the morning.',
    choices: [
      { id: 'accept', label: 'Spend the Night', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Pass', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-threesome', category: 'community', ages: [18, 115], probability: 0,
    text: 'Would I like to invite both of them to spend a private evening together?',
    choices: [
      { id: 'accept', label: 'Ask Both', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Keep Our Plans', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-protection', category: 'community', ages: [18, 115], probability: 0, text: 'Everyone must agree before continuing.',
    choices: [
      { id: 'barrier', label: 'Use Barrier Protection', emoji: 'accept', outcome: '', effects: {} },
      { id: 'no-barrier', label: 'Continue Without a Barrier', emoji: 'support', outcome: '', effects: {} },
      { id: 'pass', label: 'Call It Off', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-friendship', category: 'community', ages: [6, 115], probability: 0,
    text: 'said they’d like to be friends after getting to know me. How should I respond?',
    choices: [
      { id: 'accept', label: 'Become Friends', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Stay Acquaintances', emoji: 'decline', outcome: '', effects: {} },
    ] },
  ...([
    ['social-expectations', 'wants to talk about what we expect from this relationship.', 'Agree Together'],
    ['social-space', 'asked for some time apart to think things through.', 'Respect Their Space'],
    ['social-concern', 'wants to talk through a concern that’s still bothering them.', 'Talk It Through'],
    ['social-reconnect', 'reached out after a long time apart and asked if we could reconnect.', 'Reconnect'],
  ] as const).map(([id, text, label]): LifeEvent => ({
    id, text, category: 'community', ages: [18, 115], probability: 0,
    choices: [{ id: 'accept', label, emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Decline for Now', emoji: 'decline', outcome: '', effects: {} }],
  })),
];
