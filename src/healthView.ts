import { findContact } from './engine/school.ts';
import { activeIllness, canAccompany, doctorIssue, visitCost } from './engine/health.ts';
import { illnesses, playerPatient } from './engine/healthTypes.ts';
import type { IllnessCase } from './engine/healthTypes.ts';
import type { Life } from './engine/types.ts';
import { money } from './i18n/en.ts';

export function illnessSummary(condition: IllnessCase) {
  const level = condition.level.charAt(0).toUpperCase() + condition.level.slice(1);
  return `${illnesses[condition.illness].name} · ${level}`;
}

export function patientRows(life: Life) {
  return life.illnesses.flatMap((condition) => {
    const id = condition.patient;
    const self = id === playerPatient;
    const person = self ? undefined : findContact(life, id);
    if (!self && (!person?.alive || !canAccompany(life, person))) return [];
    const cost = visitCost(life, condition);
    return [{ id, self, name: person?.name ?? 'You', condition: illnessSummary(condition),
      fee: cost ? money(cost) : 'Free', issue: doctorIssue(life, id) }];
  }).sort((first, second) => Number(second.self) - Number(first.self));
}

export function profileHealthRows(life: Life, id = playerPatient) {
  const condition = activeIllness(life, id);
  return condition ? [{ label: 'Illness', value: illnessSummary(condition) }] : [];
}
