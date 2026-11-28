import { books, clubs } from './data/localSocial.ts';
import type { ClubId } from './data/localSocial.ts';
import { genderLabels } from './data/veyra.ts';
import { clubMembers, localSocialIssue, membership, membershipFee, membershipRank, neighbors } from './engine/localSocial.ts';
import type { LocalSocialAction } from './engine/localSocialTypes.ts';
import type { Action, Contact, Life } from './engine/types.ts';
import { activityIssue } from './engine/simulation.ts';
import { money } from './i18n/en.ts';
import { friendshipLabel, personalityLabels } from './socialView.ts';
import type { Emoji } from './theme/tokens.ts';

export const socialPages = {
  neighborhood: 'Neighborhood', neighbor: 'Neighbor', communities: 'Clubs & Communities', community: 'Community',
  'club-member': 'Club Member', 'local-library': 'Library', 'library-books': 'Read a Book', 'reading-history': 'Reading History',
} as const;
export type SocialPage = keyof typeof socialPages;
export const isSocialPage = (page: string): page is SocialPage => Object.hasOwn(socialPages, page);
type Route = { page: SocialPage | 'person'; detail?: string };
type Row = { key?: string; label: string; icon?: Emoji; detail?: string; issue?: string | null; person?: Contact;
  action?: Action; route?: Route };
type Group = { title: string; rows: Row[] };

const go = (label: string, icon: Emoji, page: Route['page'], detail?: string, description?: string): Row =>
  ({ label, icon, detail: description, route: { page, detail } });
const control = (life: Life, action: LocalSocialAction, label: string, icon: Emoji, detail?: string): Row =>
  ({ label, icon, detail, action, issue: localSocialIssue(life, action) });

export function socialActivityLinks(life: Life) {
  return [
    go('Meet a Neighbor', 'location', 'neighborhood', undefined, 'Meet people nearby.'),
    go('Join a Hobby Group', 'art', 'communities', undefined, 'Explore local clubs.'),
    go('Go to Library', 'library', 'local-library', undefined, 'Read and meet other readers'),
  ].map((item, index) => ({ ...item, route: item.route!, issue: life.character.age < (index === 2 ? 5 : 8) ?
    `Available from age ${index === 2 ? 5 : 8}.` : null }));
}

const visitorDetail = (person: Contact) => `Age ${person.age} · ${person.occupation}`;
function personSummary(life: Life, person: Contact, household: string | undefined, interests: string[]) {
  return [
    { label: 'Age & Gender', detail: `${person.age} · ${genderLabels[person.gender]}` },
    { label: 'Occupation', detail: person.occupation },
    { label: 'Household', detail: household === 'family' ? 'Lives with family' : household === 'shared' ? 'Shares a home' :
      household === 'alone' ? 'Lives alone' : undefined },
    { label: 'Interests', detail: interests.join(', ') },
    { label: 'Personality', detail: personalityLabels(life, person) },
  ].filter(({ detail }) => !!detail);
}

const validClub = (id?: string): ClubId | undefined => id && Object.hasOwn(clubs, id) ? id as ClubId : undefined;

export function localSocialTitle(life: Life, page: SocialPage, detail?: string) {
  if (page === 'neighbor') return neighbors(life).find(({ person }) => person.id === detail)?.person.name ?? socialPages[page];
  const [id, member] = detail?.split('~') ?? [];
  const club = validClub(id);
  if (page === 'club-member' && club) return clubMembers(life, club).find(({ person }) => person.id === member)?.person.name ?? socialPages[page];
  return page === 'community' && club ? clubs[club].name : socialPages[page];
}

export function localSocialGroups(life: Life, page: SocialPage, detail?: string): Group[] {
  const { city } = life.character;
  switch (page) {
    case 'neighborhood':
      return [
        { title: `Around Home · ${city}`, rows: neighbors(life).map(({ person, known }) => ({
          ...go(person.name, 'person', 'neighbor', person.id, `${visitorDetail(person)}${known ? ` · ${friendshipLabel(life, person)}` : ''}`), person,
        })) },
        { title: 'Neighborhood Activities', rows: [
          control(life, { type: 'neighborhood', activity: 'gathering' }, 'Neighborhood Gathering', 'together', 'Catch up with people on your street.'),
        ] },
      ];
    case 'neighbor': {
      const visitor = neighbors(life).find(({ person }) => person.id === detail);
      if (!visitor) return [{ title: 'Neighborhood', rows: [{ label: 'This neighbor has moved away or is unavailable.' }] }];
      const { person, profile, known } = visitor;
      const activities = [
        { id: 'introduce', label: known ? 'Say Hello' : 'Introduce Yourself', icon: 'talk' },
        { id: 'visit', label: 'Visit Neighbor', icon: 'home' },
        { id: 'invite', label: 'Invite Over', icon: 'calendar' },
        { id: 'help', label: 'Offer Help', icon: 'support' },
      ] as const;
      return [
        { title: 'Neighbor', rows: [{ person, label: person.name, detail: visitorDetail(person) },
          ...personSummary(life, person, profile.localHousehold, profile.interests)] },
        { title: 'Interactions', rows: [
          ...activities.map(({ id, label, icon }) => control(life, { type: 'neighborhood', person: person.id, activity: id }, label, icon)),
          ...(known ? [go('Open Relationship', 'relationships', 'person', person.id)] : []),
        ] },
      ];
    }
    case 'communities':
      return [{ title: city, rows: (Object.keys(clubs) as ClubId[]).map((club) => {
        const venue = clubs[club];
        const status = membership(life, club);
        const fee = membershipFee(life, club);
        return go(venue.name, venue.icon, 'community', club, status?.active ? membershipRank(status) :
          fee ? `${money(fee)} joining fee` : 'Free to join');
      }) }];
    case 'community': {
      const club = validClub(detail);
      if (!club) return [{ title: 'Communities', rows: [{ label: 'This community is unavailable.' }] }];
      const venue = clubs[club];
      const member = membership(life, club);
      const activities: Row[] = member?.active ? [
        control(life, { type: 'community', club, activity: 'attend' }, 'Attend a Session', 'together'),
        control(life, { type: 'community', club, activity: 'project' }, 'Join a Shared Project', 'work'),
        control(life, { type: 'community', club, activity: 'leave' }, 'Leave Community', 'exit'),
      ] : [control(life, { type: 'community', club, activity: 'join' }, 'Join Community', 'accept',
        membershipFee(life, club) ? money(membershipFee(life, club)) : 'Free')];
      return [
        { title: `${venue.name} · ${city}`, rows: [
          ...(member?.active ? [{ label: membershipRank(member), detail: `Standing ${member.standing}% · Joined ${member.joined}` }] : []),
          ...activities,
        ] },
        { title: 'Members', rows: clubMembers(life, club).map(({ person }) => ({
          ...go(person.name, 'person', 'club-member', `${club}~${person.id}`, visitorDetail(person)), person,
        })) },
        ...(member?.history.length ? [{ title: 'Participation History', rows: [...member.history].reverse().map(({ year, text }, index) =>
          ({ key: String(index), label: String(year), detail: text })) }] : []),
      ];
    }
    case 'club-member': {
      const [id, target] = detail?.split('~') ?? [];
      const club = validClub(id);
      const visitor = club && clubMembers(life, club).find(({ person }) => person.id === target);
      if (!club || !visitor) return [{ title: 'Community', rows: [{ label: 'This member is unavailable.' }] }];
      const { person, profile, known } = visitor;
      return [
        { title: clubs[club].name, rows: [{ person, label: person.name, detail: visitorDetail(person) },
          ...personSummary(life, person, profile.localHousehold, profile.interests)] },
        { title: 'Interactions', rows: [
          control(life, { type: 'community', club, person: person.id, activity: 'meet' }, 'Talk to Member', 'talk'),
          ...(known ? [go('Open Relationship', 'relationships', 'person', person.id)] : []),
        ] },
      ];
    }
    case 'local-library':
      return [{ title: city, rows: [
        go('Read a Book', 'library', 'library-books', undefined, 'Browse the book catalog.'),
        control(life, { type: 'library-visit', activity: 'research' }, 'Study & Research', 'study', 'Work through a question using the collection.'),
        control(life, { type: 'library-visit', activity: 'circle' }, 'Join a Reading Circle', 'classroom', 'Discuss a book with local readers.'),
        control(life, { type: 'library-visit', activity: 'socialize' }, 'Socialize', 'talk', 'Find someone to talk to at the library.'),
        go('Reading History', 'history', 'reading-history', undefined, 'Revisit the books you’ve read.'),
        { label: 'Visit Library', icon: 'library', detail: 'Browse the shelves and see what happens.', issue: activityIssue(life, 'go-to-library'),
          action: { type: 'activity', activity: 'go-to-library' } },
      ] }];
    case 'library-books':
      return [{ title: 'Catalog', rows: Object.entries(books).map(([id, book]) =>
        control(life, { type: 'library-visit', activity: 'read', book: id }, book.title, 'library', `${book.author} · ${book.genre}`)) }];
    case 'reading-history': {
      const history = life.social.local?.reading ?? [];
      return [{ title: 'Books You’ve Read', rows: history.length ? [...history].reverse().map(({ book, year, experience }, index) => ({
        key: String(index), label: books[book]!.title, detail: `${year} · ${books[book]!.author}. ${experience}`,
      })) : [{ label: 'Your reading history is empty.' }] }];
    }
  }
}
