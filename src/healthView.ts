import { doctors } from './data/doctors.ts';
import { findContact } from './engine/school.ts';
import { activeIllness, canAccompany, donations, healthcareQuote, matchesService } from './engine/health.ts';
import { illnesses, playerPatient } from './engine/healthTypes.ts';
import type { HealthService, HealthVisit, IllnessCase, PatientService } from './engine/healthTypes.ts';
import type { Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export const careSections = [
  { title: 'Treatment', services: ['doctor', 'emergency', 'optometrist', 'psychiatrist'] },
  { title: 'Donations', services: ['donate-blood', 'donate-plasma'] },
] as const;

export const careServices = {
  doctor: { title: 'Doctor', icon: 'medical', detail: 'Compare local doctors by reputation and cost.',
    prompt: 'Choose a doctor for this visit.', empty: 'You and your family and friends have no active illnesses.' },
  emergency: { title: 'Emergency Room', icon: 'ambulance', detail: 'Stabilize a severe illness.',
    prompt: 'Emergency care stabilizes a severe illness to moderate in one visit.', empty: 'No patient has a severe illness.' },
  optometrist: { title: 'Optometrist', icon: 'eye', detail: 'Get care for eye strain.',
    prompt: 'An eye care visit can clear an active case of eye strain.', empty: 'No patient has active eye strain.' },
  psychiatrist: { title: 'Psychiatrist', icon: 'thoughts', detail: 'Book a session to manage stress.',
    prompt: 'A session reduces stress and improves happiness.' },
  'donate-blood': { title: 'Donate Blood', icon: 'blood', detail: 'Help the community with a blood donation.',
    prompt: `A donation uses ${donations['donate-blood'].energy} energy and improves happiness.` },
  'donate-plasma': { title: 'Donate Plasma', icon: 'syringe', detail: 'Make a compensated plasma donation.',
    prompt: `A donation uses ${donations['donate-plasma'].energy} energy and pays ${money(donations['donate-plasma'].reward)}.` },
} as const satisfies Record<HealthService, { title: string; icon: Emoji; detail: string; prompt: string; empty?: string }>;

export function isPatientService(service: HealthService): service is PatientService {
  return service === 'doctor' || service === 'emergency' || service === 'optometrist';
}

export function illnessSummary(condition: IllnessCase) {
  const level = condition.level.charAt(0).toUpperCase() + condition.level.slice(1);
  return `${illnesses[condition.illness].name} · ${level}`;
}

export function carePatients(life: Life, service: HealthService) {
  if (!isPatientService(service)) return [];
  return life.illnesses.flatMap((condition) => {
    if (!matchesService(condition, service)) return [];
    const id = condition.patient;
    const self = id === playerPatient;
    const person = self ? undefined : findContact(life, id);
    if (!self && (!person?.alive || !canAccompany(life, person))) return [];
    return [{ id, name: person?.name ?? 'You', condition: illnessSummary(condition), level: condition.level }];
  }).sort((first, second) => Number(second.id === playerPatient) - Number(first.id === playerPatient));
}

type VisitOption = { visit: HealthVisit; label: string; fee?: string; chance?: number; reputation?: number; issue: string | null };

export function careOptions(life: Life, service: HealthService, patient?: string): VisitOption[] {
  const option = (visit: HealthVisit, label: string, reputation?: number): VisitOption => {
    const { fee, chance, issue } = healthcareQuote(life, visit);
    const showFee = 'patient' in visit ? chance !== undefined : visit.service === 'psychiatrist';
    return { visit, label, reputation, chance, issue,
      fee: showFee ? (fee ? money(fee) : 'Free') : undefined };
  };

  if (!isPatientService(service)) return [option({ service }, service === 'psychiatrist' ? 'Book Session' : 'Confirm Donation')];
  if (service === 'doctor') return doctors.map((doctor) => option({ service, patient: patient ?? playerPatient, provider: doctor.id },
    doctor.names[life.character.city], doctor.reputation));
  return patient ? [option({ service, patient }, service === 'emergency' ? 'Visit Emergency Room' : 'Book Eye Care')] : [];
}

export function careSelection(life: Life, selection?: { service: HealthService; patient?: string }) {
  if (!selection) return;
  const { service } = selection;
  const info = careServices[service];
  const patients = carePatients(life, service);
  const patient = patients.find(({ id }) => id === selection.patient) ?? patients[0];
  const options = careOptions(life, service, patient?.id);
  const empty = !patient && 'empty' in info;
  const sharedIssue = options[0]?.issue && options.length > 1 && options.every((option) => option.issue === options[0]?.issue)
    ? options[0].issue : null;
  return { service, info, patients, patient, options, empty, sharedIssue, prompt: empty ? info.empty : info.prompt };
}

export function profileHealthRows(life: Life, id = playerPatient) {
  const condition = activeIllness(life, id);
  return condition ? [{ label: 'Illness', value: illnessSummary(condition) }] : [];
}
