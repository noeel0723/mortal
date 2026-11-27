import type { City } from '../engine/types.ts';

export const doctors = [
  { id: 'community', reputation: 54, chance: 70, price: 1,
    names: { 'Alder Bay': 'Dr. Wells', Bellmere: 'Dr. Sato', Northwick: 'Dr. Lind' } },
  { id: 'experienced', reputation: 76, chance: 85, price: 1.5,
    names: { 'Alder Bay': 'Dr. Chen', Bellmere: 'Dr. Costa', Northwick: 'Dr. Malik' } },
  { id: 'specialist', reputation: 94, chance: 96, price: 2,
    names: { 'Alder Bay': 'Dr. Patel', Bellmere: 'Dr. Marin', Northwick: 'Dr. Rowe' } },
] as const satisfies readonly { id: string; reputation: number; chance: number; price: number; names: Record<City, string> }[];

export type DoctorId = typeof doctors[number]['id'];
