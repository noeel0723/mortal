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

The shared codec upgrades version 1–4 life payloads to version 5 on load for both SQLite and IndexedDB. It preserves the character, calendar, bank and ledger, journal, contact identities and friendships, RNG position, pending decision, delayed outcomes, and existing academic and career data. Version 1 initializes the old school stage and restores a diploma for a completed school stage, with earlier grades and attendance unavailable. Version 1 and 2 acquire stable portraits. Versions 1–3 start with a neutral career and finance state. Versions 1–4 start with empty active illnesses and unread notices. Both storage schemas remain at version 1 because the change is confined to the payload.

Version 5 stores active illnesses by patient ID and unread notices by journal entry index. Acknowledging the oldest unread notice leaves the entry in the journal. Mandatory choices take precedence over those notices, and both clients save each response before opening the next pop-up.

The engine stores portrait choices and contact gender identity in each life payload. Older contacts get appearance data from a cosmetic seed derived from the existing life seed and contact ID. The same pixel renderer in `src/portraits/` produces images on web and native from the stored choices and current age. Portrait changes run through normal saved turns and the cosmetic generator leaves the simulation RNG position intact.

The job and employer catalogs in `src/data/` define salaries, requirements, hours, and promotion paths. `src/engine/career.ts` and `finance.ts` own career and financial mutations. Vacancies use a separate seed derived from the life seed and year, while application decisions use the saved simulation RNG. `src/careerView.ts` supplies both clients with listings, statuses, summaries, and category labels. Legacy transactions retain their original fields, with known tuition and scholarship labels classified for display.

Engine and store tests use the Node test runner. Persistence tests use a real on-disk or in-memory SQLite database through a Node adapter that implements the same repository boundary as Expo SQLite. Browser smoke tests exercise the app through its real IndexedDB store.
