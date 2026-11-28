import type { Contact, Life } from './types.ts';

type Kinship = 'parent' | 'child' | 'grandparent' | 'grandchild' | 'sibling' | 'half-sibling' | 'step-parent' | 'step-sibling' |
  'aunt-uncle' | 'cousin' | 'niece-nephew' | 'parent-in-law' | 'sibling-in-law';

export function familyRelation(life: Life, id: string): Kinship | undefined {
  const parents = life.social.parents;
  const mine = parents.self ?? [];
  if (mine.includes(id)) return 'parent';
  const theirs = parents[id] ?? [];
  if (theirs.includes('self')) return 'child';
  const grandparents = (person: string) => (parents[person] ?? []).flatMap((parent) => parents[parent] ?? []);
  if (grandparents('self').includes(id)) return 'grandparent';
  if (grandparents(id).includes('self')) return 'grandchild';
  const common = mine.filter((parent) => theirs.includes(parent));
  if (common.length) return common.length === 1 && mine.length === 2 && theirs.length === 2 ? 'half-sibling' : 'sibling';
  const siblings = (first: string, second: string) => first !== second &&
    (parents[first] ?? []).some((parent) => parents[second]?.includes(parent));
  if (mine.some((parent) => siblings(parent, id))) return 'aunt-uncle';
  if (theirs.some((parent) => siblings('self', parent))) return 'niece-nephew';
  if (theirs.some((theirParent) => mine.some((myParent) => siblings(myParent, theirParent)))) return 'cousin';
  const stepParents = mine.flatMap((parent) => life.social.unions?.filter(({ people, married }) => married && people.includes(parent))
    .flatMap(({ people }) => people.filter((person) => person !== parent && !mine.includes(person))) ?? []);
  if (stepParents.includes(id)) return 'step-parent';
  if (theirs.some((parent) => stepParents.includes(parent))) return 'step-sibling';
  const spouse = life.social.romances.find(({ status }) => status === 'married')?.person;
  if (spouse && parents[spouse]?.includes(id)) return 'parent-in-law';
  if (spouse && siblings(spouse, id)) return 'sibling-in-law';
  if (life.social.unions?.some(({ people, married }) => married && people.includes(id) && people.some((person) => siblings('self', person)))) {
    return 'sibling-in-law';
  }
  return undefined;
}

export function familyRole(life: Life, person: Contact) {
  const type = familyRelation(life, person.id);
  const { gender } = person;
  const role = (woman: string, man: string, neutral: string) => gender === 'woman' ? woman : gender === 'man' ? man : neutral;
  if (type === 'step-parent') return role('Stepmother', 'Stepfather', 'Stepparent');
  if (type === 'step-sibling') return 'Stepsibling';
  if (type === 'half-sibling') return 'Half-sibling';
  if (type === 'grandparent') return role('Grandmother', 'Grandfather', 'Grandparent');
  if (type === 'grandchild') return 'Grandchild';
  if (type === 'aunt-uncle') return role('Aunt', 'Uncle', 'Parent’s Sibling');
  if (type === 'cousin') return 'Cousin';
  if (type === 'niece-nephew') return role('Niece', 'Nephew', 'Sibling’s Child');
  if (type === 'parent-in-law') return role('Mother-in-law', 'Father-in-law', 'Parent-in-law');
  if (type === 'sibling-in-law') return 'Sibling-in-law';
  return type ? person.role : undefined;
}

export function closeKin(life: Life, first: string, second: string) {
  if (first === 'self' || second === 'self') return !!familyRelation(life, first === 'self' ? second : first);
  const direct = (id: string) => life.social.parents[id] ?? [];
  const ancestry = (id: string) => new Set([...direct(id), ...direct(id).flatMap(direct)]);
  const firstAncestors = ancestry(first);
  const secondAncestors = ancestry(second);
  if (firstAncestors.has(second) || secondAncestors.has(first) || [...firstAncestors].some((id) => secondAncestors.has(id))) return true;
  const firstParents = new Set(direct(first));
  const secondParents = new Set(direct(second));
  return life.social.unions?.some(({ people: [a, b], married }) => married && (
    (firstParents.has(a) && (b === second || secondParents.has(b))) || (firstParents.has(b) && (a === second || secondParents.has(a))) ||
    (secondParents.has(a) && b === first) || (secondParents.has(b) && a === first))) ?? false;
}
