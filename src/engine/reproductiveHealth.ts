import { recordNotice } from './eventNotices.ts';
import { npcRandom } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { findContact } from './school.ts';
import type { Contact, Life } from './types.ts';

export const reproductiveServices = ['sti-screening', 'sti-treatment', 'sti-prevention', 'birth-control'] as const;
export type ReproductiveService = typeof reproductiveServices[number];
export const isReproductiveService = (id: string): id is ReproductiveService => reproductiveServices.some((service) => service === id);
const infections = { chlamydia: 'Chlamydia', hepatitisB: 'Hepatitis B' } as const;
type Infection = keyof typeof infections;
export type InfectionCase = { year: number; diagnosed?: true; chronic?: true; managed?: true };
export type ReproductiveRecord = {
  cases: Partial<Record<Infection, InfectionCase>>;
  vaccinated?: true;
  hepatitisBImmunity?: true;
  birthControlYear?: number;
};
export type ReproductiveHealth = Record<string, ReproductiveRecord>;

export function cloneReproductiveHealth(health: ReproductiveHealth): ReproductiveHealth {
  return Object.fromEntries(Object.entries(health).map(([id, record]) => [id, { ...record, cases: {
    ...(record.cases.chlamydia ? { chlamydia: { ...record.cases.chlamydia } } : {}),
    ...(record.cases.hepatitisB ? { hepatitisB: { ...record.cases.hepatitisB } } : {}),
  } }]));
}

export function reproductiveRecord(life: Life, id = 'self') {
  return life.reproductive && Object.hasOwn(life.reproductive, id) ? life.reproductive[id] : undefined;
}

function ensureRecord(life: Life, id: string) {
  life.reproductive ??= {};
  return life.reproductive[id] ??= { cases: {} };
}

export const protectionEvent = 'social-protection';
export const barrierFee = (life: Life) => localExpense(life.world, life.character.city, 180);
export const birthControlActive = (life: Life, id = 'self') => reproductiveRecord(life, id)?.birthControlYear === life.year;

export function pregnancyFactor(life: Life, carrier: string, barrier: boolean) {
  return (barrier ? .16 : 1) * (birthControlActive(life, carrier) ? .08 : 1);
}

export function hasKnownInfection(life: Life, id: string) {
  return Object.values(reproductiveRecord(life, id)?.cases ?? {}).some((condition) => condition.diagnosed);
}

const fees: Record<ReproductiveService, number> = { 'sti-screening': 400, 'sti-treatment': 850, 'sti-prevention': 650, 'birth-control': 500 };
const treats = (clinic: ReproductiveRecord | undefined) => !!clinic?.cases.chlamydia?.diagnosed ||
  (!!clinic?.cases.hepatitisB?.diagnosed && !!clinic.cases.hepatitisB.chronic && !clinic.cases.hepatitisB.managed);

export function reproductiveQuote(life: Life, service: ReproductiveService) {
  const { character } = life;
  const clinic = reproductiveRecord(life);
  const fee = localExpense(life.world, character.city, fees[service]);
  let rule: string | null = null;
  if (service === 'sti-treatment' && !treats(clinic)) rule = clinic?.cases.hepatitisB?.diagnosed && !clinic.cases.hepatitisB.chronic ?
    'The clinic is monitoring this recent infection.' : 'There is no diagnosed infection that needs this treatment.';
  if (service === 'sti-prevention' && (clinic?.vaccinated || clinic?.hepatitisBImmunity || clinic?.cases.hepatitisB?.diagnosed)) {
    rule = clinic.cases.hepatitisB?.diagnosed ? 'The clinic is already caring for this infection.' : 'Your hepatitis B protection is already on record.';
  }
  if (service === 'birth-control') {
    if (character.gender !== 'woman' || character.age > 45) rule = 'This plan is available to characters who can become pregnant.';
    else if (life.social.pregnancies?.some(({ mother }) => mother === 'self')) rule = 'You already have a pregnancy on record.';
    else if (birthControlActive(life)) rule = 'Your plan is active for this year.';
  }
  return { fee, issue: character.causeOfDeath ? 'This life has already ended.' : life.pending ? 'Resolve the pending decision first.' :
    character.age < 18 ? 'Available from age 18.' : rule ?? (character.bank < fee ? 'Your balance does not cover this visit.' : null) };
}

export function visitReproductiveCare(life: Life, service: ReproductiveService, fee: number) {
  const clinic = ensureRecord(life, 'self');
  let title: string;
  let story: string;
  if (service === 'sti-screening') {
    const detected: string[] = [];
    for (const infection of Object.keys(infections) as Infection[]) {
      const condition = clinic.cases[infection];
      if (!condition) continue;
      condition.diagnosed = true;
      detected.push(infections[infection]);
    }
    title = 'Screening Results';
    story = detected.length ? `The clinic detected ${detected.join(' and ')} and explained the next steps.` :
      'The clinic found no signs of chlamydia or hepatitis B in this screening.';
  } else if (service === 'sti-treatment') {
    title = 'STI Treatment';
    const outcomes: string[] = [];
    if (clinic.cases.chlamydia?.diagnosed) {
      delete clinic.cases.chlamydia;
      outcomes.push('I completed treatment for chlamydia and the infection cleared.');
    }
    if (clinic.cases.hepatitisB?.diagnosed && clinic.cases.hepatitisB.chronic && !clinic.cases.hepatitisB.managed) {
      clinic.cases.hepatitisB.managed = true;
      outcomes.push('The clinic started ongoing care for my chronic hepatitis B.');
    }
    story = outcomes.join(' ');
  } else if (service === 'sti-prevention') {
    clinic.vaccinated = true;
    title = 'Hepatitis B Vaccination';
    story = 'I completed the clinic’s hepatitis B vaccination program. The protection is specific to hepatitis B.';
  } else {
    clinic.birthControlYear = life.year;
    title = 'Birth Control Plan';
    story = 'I started a birth control plan for this year. It lowers the chance of pregnancy. Barrier protection still helps reduce STI risk.';
  }
  recordNotice(life, 'health', title, story, { bank: -fee }, 'medical');
}

function prepareNpcHealth(life: Life, person: Contact) {
  if (reproductiveRecord(life, person.id)) return;
  const baseline = ensureRecord(life, person.id);
  const random = npcRandom(life, `clinic-background:${person.id}`);
  if (random.next() < .56) baseline.vaccinated = true;
  if (random.next() < .065) baseline.cases.chlamydia = { year: life.year };
  if (!baseline.vaccinated && random.next() < .025) baseline.cases.hepatitisB = { year: life.year, chronic: true };
}

export function assessEncounterHealth(life: Life, participants: readonly Contact[], barrier: boolean, entry: number) {
  for (const contact of participants) prepareNpcHealth(life, contact);
  const ids = ['self', ...participants.map(({ id }) => id).sort()];
  const sources = ids.map((id) => ({ id, cases: { ...reproductiveRecord(life, id)?.cases } }));
  for (const id of ids) {
    const clinic = reproductiveRecord(life, id);
    for (const infection of Object.keys(infections) as Infection[]) {
      if (clinic?.cases[infection] || (infection === 'hepatitisB' && clinic?.hepatitisBImmunity)) continue;
      const protection = (barrier ? .24 : 1) * (infection === 'hepatitisB' && clinic?.vaccinated ? .06 : 1);
      const exposed = sources.some((source) => {
        const condition = source.cases[infection];
        if (source.id === id || !condition) return false;
        const risk = (infection === 'chlamydia' ? .27 : .19) * (condition.managed ? .33 : 1);
        return npcRandom(life, `clinic-exposure:${entry}:${infection}:${source.id}:${id}`, life.year).next() < risk * protection;
      });
      if (exposed) ensureRecord(life, id).cases[infection] = { year: life.year };
    }
  }
}

export function advanceReproductiveHealth(life: Life) {
  for (const [id, clinic] of Object.entries(life.reproductive ?? {})) {
    if (id !== 'self' && !findContact(life, id)?.alive) continue;
    const hepatitis = clinic.cases.hepatitisB;
    if (!hepatitis || hepatitis.chronic || hepatitis.year === life.year) continue;
    if (npcRandom(life, `clinic-course:${id}:${hepatitis.year}`).next() < .05) {
      hepatitis.chronic = true;
      if (id === 'self' && hepatitis.diagnosed) recordNotice(life, 'health', 'Hepatitis B Follow-up',
        'The clinic confirmed that my hepatitis B had become chronic. Ongoing care is available in Doctors.');
    } else {
      delete clinic.cases.hepatitisB;
      clinic.hepatitisBImmunity = true;
      if (id === 'self' && hepatitis.diagnosed) recordNotice(life, 'health', 'Hepatitis B Follow-up',
        'My follow-up confirmed the recent hepatitis B infection had cleared.');
    }
  }
}

export function reproductiveSummary(life: Life) {
  const clinic = reproductiveRecord(life);
  if (!clinic) return [];
  const rows: { label: string; value: string }[] = [];
  if (clinic.cases.chlamydia?.diagnosed) rows.push({ label: 'Chlamydia', value: 'Treatment available' });
  const hepatitis = clinic.cases.hepatitisB;
  if (hepatitis?.diagnosed) rows.push({ label: 'Hepatitis B', value: hepatitis.managed ? 'Chronic · in care' :
    hepatitis.chronic ? 'Chronic · care available' : 'Recent infection · monitoring' });
  if (clinic.vaccinated) rows.push({ label: 'Hepatitis B Vaccination', value: 'On record' });
  if (birthControlActive(life)) rows.push({ label: 'Birth Control', value: 'Active this year' });
  return rows;
}
