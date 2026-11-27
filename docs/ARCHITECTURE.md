# Mortal architecture

| Area | Responsibility |
| --- | --- |
| `app/` | Expo Router layouts and native screens |
| `web/` | Mobile browser screens, Vite entry point, and IndexedDB adapter |
| `src/components/` | Shared controls, character card, and stat meters |
| `src/engine/` | Pure TypeScript character creation, random generator, and turn processing |
| `src/data/` | Fictional places, names, and contextual event definitions |
| `src/database/` | SQLite schema migration, save validation, and persistence |
| `src/stores/` | Zustand's active save, mutation lock, and transient feedback |
| `src/theme/`, `src/i18n/` | Visual tokens, emoji registry, and shared English strings |

A screen dispatches a typed action to Zustand. The engine returns a new snapshot or a rule error. Zustand publishes the new snapshot after SQLite commits it. Each slot stores its complete simulation payload, including the random generator state, pending decision, scheduled consequences, journal, family, and ledger.

The browser entry point uses the same engine and Zustand store with IndexedDB. Updates check the save revision in the same read-write transaction as the write. The static web build caches its app shell through a service worker on secure origins.

The SQLite database uses `PRAGMA user_version` for storage migrations. Each life separately carries a payload version. Conditional updates use the slot revision to prevent stale writes. A malformed or unsupported save surfaces an error when opened and remains in the list until explicitly deleted. Haptics preferences are stored separately.

Engine and store tests use the Node test runner. Persistence tests use a real on-disk or in-memory SQLite database through a Node adapter that implements the same repository boundary as Expo SQLite.
