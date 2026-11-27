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
  { id: 'social-dating-match', category: 'community', ages: [18, 115], probability: 0,
    text: 'would like to start dating me.',
    choices: [
      { id: 'accept', label: 'Start Dating', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Pass', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-casual-match', category: 'community', ages: [18, 115], probability: 0,
    text: 'suggested a casual date with no expectation of a relationship.',
    choices: [
      { id: 'accept', label: 'Go on the Date', emoji: 'accept', outcome: '', effects: {} },
      { id: 'pass', label: 'Pass', emoji: 'decline', outcome: '', effects: {} },
    ] },
  { id: 'social-affair', category: 'community', ages: [18, 115], probability: 0,
    text: 'found out I have another partner and is ending our relationship.',
    choices: [
      { id: 'apologize', label: 'Take Responsibility', emoji: 'support', outcome: '', effects: {} },
      { id: 'deny', label: 'Deny It', emoji: 'decline', outcome: '', effects: {} },
    ] },
];
