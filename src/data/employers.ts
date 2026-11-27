import type { Industry } from '../engine/careerTypes.ts';
import type { City } from '../engine/types.ts';

type Employer = { id: string; name: string; city: City; industries: readonly Industry[]; stability: number; payFlex: number; culture: number };

export const employers: readonly Employer[] = [
  { id: 'tidebyte', name: 'Tidebyte Systems', city: 'Alder Bay', industries: ['Technology'], stability: 72, payFlex: 68, culture: 62 },
  { id: 'signalworks', name: 'Signalworks Veyra', city: 'Northwick', industries: ['Technology', 'Engineering'], stability: 80, payFlex: 56, culture: 65 },
  { id: 'lifeline', name: 'Lifeline Medical Centre', city: 'Northwick', industries: ['Healthcare'], stability: 91, payFlex: 42, culture: 58 },
  { id: 'mere-health', name: 'Mere Community Clinic', city: 'Bellmere', industries: ['Healthcare'], stability: 82, payFlex: 52, culture: 76 },
  { id: 'aster', name: 'Aster Credit Union', city: 'Alder Bay', industries: ['Finance', 'Administration'], stability: 86, payFlex: 61, culture: 63 },
  { id: 'cedar', name: 'Cedar Advisory', city: 'Bellmere', industries: ['Finance', 'Legal'], stability: 74, payFlex: 71, culture: 57 },
  { id: 'harbour-learning', name: 'Harbour Learning Trust', city: 'Alder Bay', industries: ['Education'], stability: 88, payFlex: 46, culture: 78 },
  { id: 'bellmere-academy', name: 'Bellmere Learning Academy', city: 'Bellmere', industries: ['Education', 'Administration'], stability: 78, payFlex: 56, culture: 73 },
  { id: 'ridge-line', name: 'Ridge Line Engineering', city: 'Northwick', industries: ['Engineering'], stability: 75, payFlex: 74, culture: 59 },
  { id: 'civic-veyra', name: 'Veyra Civic Services', city: 'Northwick', industries: ['Administration', 'Legal'], stability: 94, payFlex: 45, culture: 70 },
  { id: 'orchard', name: 'Orchard Market & Café', city: 'Bellmere', industries: ['Retail', 'Hospitality'], stability: 70, payFlex: 52, culture: 75 },
  { id: 'harbour-hall', name: 'Harbour Hall', city: 'Alder Bay', industries: ['Retail', 'Hospitality'], stability: 67, payFlex: 57, culture: 64 },
  { id: 'switchback', name: 'Switchback Stores', city: 'Northwick', industries: ['Retail', 'Hospitality'], stability: 76, payFlex: 49, culture: 66 },
  { id: 'inkwater', name: 'Inkwater Studio', city: 'Alder Bay', industries: ['Creative & Media'], stability: 65, payFlex: 67, culture: 74 },
  { id: 'northprint', name: 'Northprint Press', city: 'Northwick', industries: ['Creative & Media'], stability: 77, payFlex: 53, culture: 67 },
];
export const employerById = new Map(employers.map((employer) => [employer.id, employer]));
