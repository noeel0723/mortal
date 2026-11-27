# Mortal architecture

| Area | Responsibility |
| --- | --- |
| `app/` | Expo Router layouts and native screens |
| `web/` | Mobile browser screens, Vite entry point, and IndexedDB adapter |
| `src/components/` | Shared controls, character card, and stat meters |
| `src/engine/` | Pure TypeScript character creation, random generator, coursework, admissions, and turn processing |
| `src/data/` | Fictional places, names, institution and program catalog, and contextual event definitions |
| `src/database/` | SQLite schema migration, save validation, and persistence |
| `src/stores/` | Zustand's active save, mutation lock, and transient feedback |
| `src/theme/`, `src/i18n/` | Visual tokens, emoji registry, and shared English strings |

A screen dispatches a typed action to Zustand. The engine returns a new snapshot or a rule error. Zustand publishes the new snapshot after the repository commits it. Each slot stores its complete simulation payload, including the random generator state, pending decision, scheduled consequences, journal, family, academic state, and ledger. Native and Vite use the same view models in `src/educationView.ts` to display academic options and eligibility.

The browser entry point uses the same engine and Zustand store with IndexedDB. Updates check the save revision in the same read-write transaction as the write. The static web build caches its app shell through a service worker on secure origins.

The SQLite database uses `PRAGMA user_version` for storage migrations. Each life separately carries a payload version. Conditional updates use the slot revision to prevent stale writes. A malformed or unsupported save surfaces an error when opened and remains in the list until explicitly deleted. Haptics preferences are stored separately.

## NPC identity and social state

The shared lookup resolves NPC IDs across the original parent, education, employer, and library collections plus the new social roster. Only newly generated acquaintances and relatives enter the social roster. Profiles, romances, ancestry, and childcare reference those identities by ID. School and workplace roles stay attached to their original records.

Version 7 initializes missing personality and financial snapshots deterministically. Versions 1–6 retain the previous migration paths and existing journal, assets, illness references, and decisions. New timelines and family links are recorded only when gameplay creates them. The codec validates unique IDs, parent age gaps and references, active relationship consistency, and the participant for an unresolved contextual decision.

The annual loop ages each collection once and advances up to 18 selected NPC careers with relatives, partners, and co-parents prioritized. New social identities are capped at 36. Memories keep the last 12 entries per NPC and romance histories keep the last 30, with the journal retaining event history.

Contextual NPC events use the existing pending event ID and a saved participant ID. Scheduled and ordinary life events resolve first. At most one NPC invitation enters the decision slot once it is free. Informational notices keep their journal order and wait behind any decision.

The shared codec upgrades version 1–7 life payloads to version 8 on load for both SQLite and IndexedDB. It preserves the character, calendar, bank and ledger, journal, contact identities and friendships, RNG position, pending decision, delayed outcomes, and existing academic and career data. Version 1 initializes the old school stage and restores a diploma for a completed school stage, with earlier grades and attendance unavailable. Versions 1 and 2 acquire stable portraits. Versions 1–3 start with a neutral career and finance state. Versions 1–4 start with empty active illnesses and unread notices. Versions 1–5 start at the family residence with empty ownership and library friendships. Both storage schemas remain at version 1 because the change is confined to the payload.

Version 5 stores active illnesses by patient ID and unread notices by journal entry index. Acknowledging the oldest unread notice leaves the entry in the journal. Mandatory choices take precedence over those notices, and both clients save each response before opening the next pop-up.

The engine stores portrait choices and contact gender identity in each life payload. Older contacts get appearance data from a cosmetic seed derived from the existing life seed and contact ID. The same pixel renderer in `src/portraits/` produces images on web and native from the stored choices and current age. Portrait changes run through normal saved turns and the cosmetic generator leaves the simulation RNG position intact.

The job and employer catalogs in `src/data/` define salaries, requirements, hours, and promotion paths. `src/engine/career.ts` and `finance.ts` own career and financial mutations. Vacancies use a separate seed derived from the life seed and year, while application decisions use the saved simulation RNG. `src/careerView.ts` supplies both clients with listings, statuses, summaries, and category labels. Legacy transactions retain their original fields, with known tuition and scholarship labels classified for display.

Engine and store tests use the Node test runner. Persistence tests use a real on-disk or in-memory SQLite database through a Node adapter that implements the same repository boundary as Expo SQLite. Browser smoke tests exercise the app through its real IndexedDB store.

## Personal development

`src/data/skills.ts` defines stable skill IDs, categories, training methods, age gates, and attribute and talent associations. `src/data/skillLinks.ts` maps existing academic labels and job tags to those IDs. Both clients use `src/skillView.ts` for availability and presentation and dispatch the same actions to the shared engine.

Version 8 adds a sparse skill ledger. Untouched skills resolve from the seed at zero proficiency. Practice records aptitude, experience, dates, progress, and aggregate history. Per-skill competition records retain the last six outcomes and a lifetime award total. A child can have up to three compact interest records keyed by the existing NPC ID. Annual counters reset when the calendar advances. Seeded rolls for training, children, and competitions use separate streams so they do not advance the main event RNG.

`src/database/skillCodec.ts` validates the known skill IDs, ranges, dates, child references, and training caps. Portraits, family records, journals, and outstanding decisions keep their existing payload fields. Fully tapered leisure, walks, and library visits reuse the same state snapshot and skip the save write.
