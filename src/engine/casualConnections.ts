import { datingIntent } from './dating.ts';
import { recordNotice } from './eventNotices.ts';
import { changeRomance, isActiveRomance, romanceFor } from './love.ts';
import { ensureNpc, npcRandom, remember } from './npcs.ts';
import { attraction, closeConnection, communicationEnded, earlyConnection } from './relationships.ts';
import { findContact } from './school.ts';
import type { CasualResponse, Contact, Life } from './types.ts';

export const casualResponses = ['keep-in-touch', 'acquaintances', 'romantic-interest', 'end-contact'] as const;

export function offerCasualFollowup(life: Life, person: Contact, enjoyment: number) {
  if (life.notices.some(({ details }) => details?.kind === 'casual-followup' && details.person === person.id)) return;
  recordNotice(life, 'community', 'After the Encounter',
    `I wondered what kind of contact, if any, I wanted to keep with ${person.name}.`).details =
    { kind: 'casual-followup', person: person.id, enjoyment };
}

export function answerCasualFollowup(life: Life, entry: number, response: CasualResponse) {
  const notice = life.notices[0];
  const detail = notice?.details;
  if (notice?.entry !== entry || detail?.kind !== 'casual-followup' || !casualResponses.includes(response) || life.character.age < 18) {
    return 'This follow-up is no longer available.';
  }
  life.notices.shift();
  const person = findContact(life, detail.person);
  if (!person?.alive || person.age < 18 || isActiveRomance(romanceFor(life, person.id)) || communicationEnded(life, person.id)) return null;
  const previous = romanceFor(life, person.id);
  const profile = ensureNpc(life, person);
  const { name } = person;
  let title: string;
  let story: string;
  if (response === 'end-contact') {
    if (earlyConnection(life, person.id)) {
      closeConnection(life, person, `I told ${name} I didn’t want to stay in touch. We said goodbye.`);
      return null;
    }
    profile.casualContact = 'closed';
    title = 'Communication Ended';
    story = `I told ${name} I didn’t want to stay in touch after our encounter. We said goodbye.`;
  } else if (response === 'acquaintances') {
    delete profile.casualContact;
    title = 'We Left It There';
    story = `I said goodbye to ${name} and left our earlier relationship as it was.`;
  } else {
    const stays = npcRandom(life, `casual-contact:${person.id}:${entry}`, life.year).next() <
      .24 + profile.traits.sociability / 370 + detail.enjoyment / 290;
    const intent = datingIntent(life, person, 'date');
    const interest = attraction(life, person);
    const mutual = response === 'romantic-interest' && stays && previous?.ended == null && intent.allowed && interest > 0 &&
      npcRandom(life, `casual-romance:${person.id}:${entry}`, life.year).next() * 100 <
        Math.min(84, 16 + interest * .62 + detail.enjoyment * .22 + intent.adjustment);
    if (mutual) {
      title = 'Mutual Interest';
      story = `${name} said the interest was mutual. We agreed to get to know each other at our own pace.`;
      changeRomance(life, person.id, 'getting-to-know', story);
      profile.casualContact = 'connected';
    } else if (stays) {
      title = 'Keeping in Touch';
      story = response === 'romantic-interest' ? `${name} preferred to keep in touch without dating. I respected their answer.` :
        `${name} wanted to keep in touch too. We agreed we could message each other.`;
      profile.casualContact = 'connected';
    } else if (earlyConnection(life, person.id)) {
      closeConnection(life, person, `${name} said they didn’t want further contact. I respected their decision.`);
      return null;
    } else {
      profile.casualContact = 'closed';
      title = 'We Went Our Separate Ways';
      story = `${name} said they didn’t want to stay in touch. I respected their decision.`;
    }
  }
  remember(life, person, story);
  recordNotice(life, 'community', title, story);
  return null;
}
