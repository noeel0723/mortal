import { decodeLife } from '../src/database/codec.ts';
import { summarize } from '../src/database/repository.ts';
import type { createRepository, SaveSummary, Slot } from '../src/database/repository.ts';
import type { Life } from '../src/engine/types.ts';
import { createGameStore } from '../src/stores/gameState.ts';

type SaveRecord = SaveSummary & { payload: string };

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
}

async function openRepository(): Promise<ReturnType<typeof createRepository>> {
  if (!window.indexedDB) throw new Error('This browser doesn’t support Mortal’s local saves.');
  const opening = indexedDB.open('mortal-web', 1);
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore('lives', { keyPath: 'id' });
    opening.result.createObjectStore('settings');
  };
  const database = await request(opening);
  database.onversionchange = () => {
    database.close();
    repository = undefined;
  };

  async function transaction<T>(table: 'lives' | 'settings', mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>) {
    const change = database.transaction(table, mode);
    const completion = new Promise<void>((resolve, reject) => {
      change.oncomplete = () => resolve();
      change.onabort = () => reject(change.error ?? new Error('Mortal couldn’t complete the save.'));
    });
    const [result] = await Promise.all([run(change.objectStore(table)), completion]);
    return result;
  }

  function record(slot: Slot): SaveRecord {
    return { ...summarize(slot), payload: JSON.stringify(slot.life) };
  }

  return {
    list: () => transaction('lives', 'readonly', async (store) => {
      const rows: SaveRecord[] = await request(store.getAll());
      return rows.sort((a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id))
        .map(({ id, name, city, age, year, completed, revision, updatedAt }) => ({
          id, name, city, age, year, completed, revision, updatedAt,
        }));
    }),
    load: (id) => transaction('lives', 'readonly', async (store) => {
      const row: SaveRecord | undefined = await request(store.get(id));
      if (!row) throw new Error('This saved life no longer exists.');
      return { id, life: decodeLife(row.payload), revision: row.revision, updatedAt: row.updatedAt };
    }),
    insert: (id, life) => transaction('lives', 'readwrite', async (store) => {
      const slot = { id, life, revision: 0, updatedAt: Date.now() };
      await request(store.add(record(slot)));
      return slot;
    }),
    save: (slot, life: Life) => transaction('lives', 'readwrite', (store) => new Promise<Slot>((resolve, reject) => {
      const reading = store.get(slot.id);
      reading.onerror = () => reject(reading.error);
      reading.onsuccess = () => {
        const previous: SaveRecord | undefined = reading.result;
        if (!previous || previous.revision !== slot.revision) {
          reject(new Error('This save changed in another tab. Reload the page to continue.'));
          return;
        }
        const next = { ...slot, life, revision: slot.revision + 1, updatedAt: Date.now() };
        void request(store.put(record(next))).then(() => resolve(next), reject);
      };
    })),
    remove: (id) => transaction('lives', 'readwrite', (store) => request(store.delete(id))),
    haptics: () => transaction('settings', 'readonly', async (store) => (await request(store.get('haptics'))) === true),
    setHaptics: (enabled) => transaction('settings', 'readwrite', async (store) => {
      await request(store.put(enabled, 'haptics'));
    }),
  };
}

let repository: Promise<Awaited<ReturnType<typeof openRepository>>> | undefined;

export const useGame = createGameStore(() => {
  repository ??= openRepository().catch((error: unknown) => {
    repository = undefined;
    throw error;
  });
  return repository;
});
