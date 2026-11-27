import { decodeLife } from './codec.ts';
import type { Life } from '../engine/types.ts';

type Bind = string | number;
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...args: Bind[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...args: Bind[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...args: Bind[]): Promise<T[]>;
}
export type SaveSummary = {
  id: string;
  name: string;
  city: string;
  age: number;
  year: number;
  completed: number;
  revision: number;
  updatedAt: number;
};
export type Slot = { id: string; revision: number; updatedAt: number; life: Life };

export async function migrate(database: Database) {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  const version = (await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (version > 1) throw new Error('Update Mortal to open this save database.');
  if (version === 1) return;
  await database.execAsync('BEGIN IMMEDIATE');
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS lives (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        age INTEGER NOT NULL,
        year INTEGER NOT NULL,
        completed INTEGER NOT NULL,
        revision INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS recent_lives ON lives (updatedAt DESC);
      CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      PRAGMA user_version = 1;
      COMMIT;
    `);
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export function summarize({ life, id, revision, updatedAt }: Slot): SaveSummary {
  const { character, year } = life;
  return { id, revision, updatedAt, name: `${character.firstName} ${character.lastName}`, city: character.city,
    age: character.age, year, completed: Number(!!character.causeOfDeath) };
}

function row(slot: Slot) {
  const { name, city, age, year, completed, updatedAt } = summarize(slot);
  return [name, city, age, year, completed, updatedAt, JSON.stringify(slot.life)] as const;
}

export function createRepository(database: Database) {
  return {
    list() {
      return database.getAllAsync<SaveSummary>(
        'SELECT id, name, city, age, year, completed, revision, updatedAt FROM lives ORDER BY updatedAt DESC, rowid DESC',
      );
    },
    async load(id: string): Promise<Slot> {
      const entry = await database.getFirstAsync<{ payload: string; revision: number; updatedAt: number }>(
        'SELECT payload, revision, updatedAt FROM lives WHERE id = ?', id,
      );
      if (!entry) throw new Error('This saved life no longer exists.');
      return { id, revision: entry.revision, updatedAt: entry.updatedAt, life: decodeLife(entry.payload) };
    },
    async insert(id: string, life: Life): Promise<Slot> {
      const slot = { id, life, revision: 0, updatedAt: Date.now() };
      await database.runAsync(
        'INSERT INTO lives (id, revision, name, city, age, year, completed, updatedAt, payload) VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?)',
        id, ...row(slot),
      );
      return slot;
    },
    async save(slot: Slot, life: Life): Promise<Slot> {
      const saved = { ...slot, life, revision: slot.revision + 1, updatedAt: Date.now() };
      const result = await database.runAsync(
        'UPDATE lives SET name = ?, city = ?, age = ?, year = ?, completed = ?, updatedAt = ?, payload = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
        ...row(saved), slot.id, slot.revision,
      );
      if (result.changes !== 1) throw new Error('This save changed since it was opened. Reload it from Saved Lives.');
      return saved;
    },
    async remove(id: string) {
      await database.runAsync('DELETE FROM lives WHERE id = ?', id);
    },
    async haptics() {
      const setting = await database.getFirstAsync<{ value: number }>("SELECT value FROM preferences WHERE key = 'haptics'");
      return setting?.value !== 0;
    },
    async setHaptics(enabled: boolean) {
      await database.runAsync("INSERT OR REPLACE INTO preferences (key, value) VALUES ('haptics', ?)", Number(enabled));
    },
  };
}
