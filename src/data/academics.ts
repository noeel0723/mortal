import type { ProgramLevel, QualificationLevel } from '../engine/academicTypes.ts';
import type { City, Talent } from '../engine/types.ts';

export type Institution = {
  id: string; name: string; city: City; reputation: number; admissionScore: number;
};

export type Program = {
  id: string; title: string; level: ProgramLevel; category: string; institutionId: string;
  duration: number; minimumScore: number; tuition: number; scholarshipScore?: number;
  aptitude?: Talent; qualification: string; requires: QualificationLevel | null; prerequisite?: string;
  skills: readonly string[]; careerEligibility: readonly string[];
};

export const institutions: readonly Institution[] = [
  { id: 'alder-university', name: 'Alder Bay University', city: 'Alder Bay', reputation: 78, admissionScore: 49 },
  { id: 'bellmere-university', name: 'Bellmere University', city: 'Bellmere', reputation: 72, admissionScore: 46 },
  { id: 'northwick-university', name: 'Northwick University', city: 'Northwick', reputation: 83, admissionScore: 52 },
  { id: 'veyra-technical', name: 'Veyra Technical College', city: 'Bellmere', reputation: 65, admissionScore: 36 },
];

export const programs = [
  { id: 'equivalency', title: 'Adult High School Equivalency', institutionId: 'veyra-technical', level: 'equivalency', category: 'General Education', duration: 1, minimumScore: 25, tuition: 0, requires: null, qualification: 'High School Equivalency', skills: ['Literacy', 'Numeracy'], careerEligibility: ['entry-level'] },
  { id: 'it-support', title: 'IT Support', institutionId: 'veyra-technical', level: 'vocational', category: 'Technology', duration: 2, minimumScore: 38, tuition: 2000, scholarshipScore: 48, aptitude: 'academic', requires: 'high-school', qualification: 'Diploma in IT Support', skills: ['Troubleshooting', 'Networks'], careerEligibility: ['it-support'] },
  { id: 'culinary', title: 'Culinary Operations', institutionId: 'veyra-technical', level: 'vocational', category: 'Hospitality', duration: 2, minimumScore: 36, tuition: 1800, scholarshipScore: 45, aptitude: 'creative', requires: 'high-school', qualification: 'Diploma in Culinary Operations', skills: ['Food preparation', 'Kitchen operations'], careerEligibility: ['food-service', 'hospitality'] },
  { id: 'computer-science', title: 'Computer Science', institutionId: 'alder-university', level: 'undergraduate', category: 'Computer Science', duration: 3, minimumScore: 52, tuition: 4500, scholarshipScore: 63, aptitude: 'academic', requires: 'high-school', qualification: 'Bachelor of Computer Science', skills: ['Programming', 'Algorithms'], careerEligibility: ['software', 'data'] },
  { id: 'business-administration', title: 'Business Administration', institutionId: 'bellmere-university', level: 'undergraduate', category: 'Business Administration', duration: 3, minimumScore: 47, tuition: 3600, scholarshipScore: 57, aptitude: 'social', requires: 'high-school', qualification: 'Bachelor of Business Administration', skills: ['Finance', 'Operations'], careerEligibility: ['administration', 'management'] },
  { id: 'engineering', title: 'Engineering', institutionId: 'northwick-university', level: 'undergraduate', category: 'Engineering', duration: 4, minimumScore: 56, tuition: 5500, scholarshipScore: 64, aptitude: 'academic', requires: 'high-school', qualification: 'Bachelor of Engineering', skills: ['Design', 'Applied mathematics'], careerEligibility: ['engineering'] },
  { id: 'medicine', title: 'Medicine', institutionId: 'northwick-university', level: 'undergraduate', category: 'Medicine', duration: 5, minimumScore: 63, tuition: 7000, scholarshipScore: 71, aptitude: 'academic', requires: 'high-school', qualification: 'Degree in Medicine', skills: ['Clinical reasoning', 'Patient care'], careerEligibility: ['healthcare'] },
  { id: 'law', title: 'Law', institutionId: 'alder-university', level: 'undergraduate', category: 'Law', duration: 4, minimumScore: 54, tuition: 5000, scholarshipScore: 64, aptitude: 'social', requires: 'high-school', qualification: 'Bachelor of Law', skills: ['Argumentation', 'Legal research'], careerEligibility: ['legal'] },
  { id: 'education', title: 'Education', institutionId: 'bellmere-university', level: 'undergraduate', category: 'Education', duration: 3, minimumScore: 46, tuition: 3000, scholarshipScore: 55, aptitude: 'social', requires: 'high-school', qualification: 'Bachelor of Education', skills: ['Teaching', 'Curriculum design'], careerEligibility: ['teaching'] },
  { id: 'psychology', title: 'Psychology', institutionId: 'alder-university', level: 'undergraduate', category: 'Psychology', duration: 3, minimumScore: 49, tuition: 3900, scholarshipScore: 59, aptitude: 'social', requires: 'high-school', qualification: 'Bachelor of Psychology', skills: ['Behavioral research', 'Interviewing'], careerEligibility: ['behavioral-research'] },
  { id: 'arts', title: 'Arts', institutionId: 'bellmere-university', level: 'undergraduate', category: 'Arts', duration: 3, minimumScore: 46, tuition: 2900, scholarshipScore: 55, aptitude: 'creative', requires: 'high-school', qualification: 'Bachelor of Arts', skills: ['Composition', 'Visual communication'], careerEligibility: ['design', 'media'] },
  { id: 'economics', title: 'Economics', institutionId: 'northwick-university', level: 'undergraduate', category: 'Economics', duration: 3, minimumScore: 52, tuition: 4200, scholarshipScore: 61, aptitude: 'academic', requires: 'high-school', qualification: 'Bachelor of Economics', skills: ['Statistics', 'Economic analysis'], careerEligibility: ['finance', 'policy'] },
  { id: 'master-computing', title: 'Advanced Computing', institutionId: 'alder-university', level: 'postgraduate', category: 'Computer Science', duration: 2, minimumScore: 57, tuition: 5500, scholarshipScore: 66, aptitude: 'academic', requires: 'undergraduate', prerequisite: 'computer-science', qualification: 'Master of Advanced Computing', skills: ['Systems research', 'Scientific computing'], careerEligibility: ['advanced-software', 'computing-research'] },
  { id: 'master-education', title: 'Educational Leadership', institutionId: 'bellmere-university', level: 'postgraduate', category: 'Education', duration: 2, minimumScore: 54, tuition: 4300, scholarshipScore: 62, aptitude: 'social', requires: 'undergraduate', qualification: 'Master of Educational Leadership', skills: ['Leadership', 'Education policy'], careerEligibility: ['education-leadership'] },
  { id: 'master-economics', title: 'Applied Economics', institutionId: 'northwick-university', level: 'postgraduate', category: 'Economics', duration: 2, minimumScore: 57, tuition: 5100, scholarshipScore: 66, aptitude: 'academic', requires: 'undergraduate', prerequisite: 'economics', qualification: 'Master of Applied Economics', skills: ['Econometrics', 'Policy research'], careerEligibility: ['economic-research', 'policy'] },
] as const satisfies readonly Program[];

export const programById: ReadonlyMap<string, Program> = new Map(programs.map((program) => [program.id, program]));
export const institutionById = new Map(institutions.map((institution) => [institution.id, institution]));
