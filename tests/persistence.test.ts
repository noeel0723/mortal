import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createRepository, migrate } from '../src/database/repository.ts';
import type { Database } from '../src/database/repository.ts';
import { createLife } from '../src/engine/create.ts';
import { eventById } from '../src/data/events.ts';
import { vacancies } from '../src/engine/career.ts';
import { advance } from '../src/engine/simulation.ts';
import { createGameStore } from '../src/stores/gameState.ts';

function adapt(database: DatabaseSync): Database {
  return {
    async execAsync(sql) { database.exec(sql); },
    async runAsync(sql, ...args) { return { changes: Number(database.prepare(sql).run(...args).changes) }; },
    async getFirstAsync<T>(sql: string, ...args: (string | number)[]) { return (database.prepare(sql).get(...args) as T | undefined) ?? null; },
    async getAllAsync<T>(sql: string, ...args: (string | number)[]) { return database.prepare(sql).all(...args) as T[]; },
  };
}

test('SQLite restores pending decisions, RNG, and journal after a full close and reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'mortal-'));
  const file = join(directory, 'lives.db');
  try {
    let database = new DatabaseSync(file);
    let adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    const slot = await repository.insert('test-life', createLife(988));
    let life = slot.life;
    while (life.character.age < 6) {
      const result = advance(life, { type: 'age' });
      assert.ok(result.life, result.error);
      life = result.life;
    }
    assert.equal(life.pending, 'first-classroom');
    const saved = await repository.save(slot, life);
    database.close();

    database = new DatabaseSync(file);
    try {
      adapter = adapt(database);
      await migrate(adapter);
      const reopened = createRepository(adapter);
      assert.deepEqual(await reopened.load(slot.id), saved);
      assert.equal((await reopened.list())[0]?.age, 6);
      const next = advance((await reopened.load(slot.id)).life, { type: 'choose', event: 'first-classroom', choice: 'join' });
      assert.ok(next.life, next.error);
      assert.deepEqual(next, advance(life, { type: 'choose', event: 'first-classroom', choice: 'join' }));
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('revision checks reject concurrent writes, and corrupt slots remain listed', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    const slot = await repository.insert('first', createLife(1));
    await repository.insert('second', createLife(2));
    await repository.save(slot, slot.life);
    await assert.rejects(repository.save(slot, slot.life), /changed since/);
    database.prepare("UPDATE lives SET payload = 'invalid' WHERE id = ?").run(slot.id);
    await assert.rejects(repository.load(slot.id), /damaged/);
    assert.equal((await repository.list()).length, 2);
    assert.ok(await repository.load('second'));
    await repository.remove('second');
    await assert.rejects(repository.load('second'), /no longer exists/);
  } finally {
    database.close();
  }
});

test('SQLite opens a version 1 slot and saves the migrated payload on the next action', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    const slot = await repository.insert('legacy', createLife(988));
    let life = slot.life;
    while (life.character.age < 6) {
      const next = advance(life, { type: 'age' });
      assert.ok(next.life, next.error);
      life = next.life;
    }
    const legacy = { ...life, version: 1, academic: undefined };
    database.prepare('UPDATE lives SET payload = ? WHERE id = ?').run(JSON.stringify(legacy), slot.id);
    const restored = await repository.load(slot.id);
    assert.equal(restored.life.version, 4);
    assert.equal(restored.life.pending, 'first-classroom');
    assert.deepEqual(restored.life.schoolContacts, legacy.schoolContacts);
    assert.deepEqual(restored.life.journal, legacy.journal);
    assert.deepEqual(restored.life.transactions, legacy.transactions);
    assert.deepEqual(restored.life.scheduled, legacy.scheduled);
    assert.equal(restored.life.random, legacy.random);
    const next = advance(restored.life, { type: 'choose', event: 'first-classroom', choice: 'join' });
    assert.ok(next.life, next.error);
    const saved = await repository.save(restored, next.life);
    assert.deepEqual(await repository.load(slot.id), saved);
    const persisted = database.prepare('SELECT payload FROM lives WHERE id = ?').get(slot.id);
    assert.equal(JSON.parse(String(persisted?.payload)).version, 4);
  } finally {
    database.close();
  }
});

test('unsupported database versions are rejected without clearing saves', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    await repository.insert('keep', createLife(2));
    database.exec('PRAGMA user_version = 2');
    await assert.rejects(migrate(adapter), /Update Mortal/);
    assert.equal((await repository.list()).length, 1);
  } finally {
    database.close();
  }
});

test('SQLite persists an active job, payroll and workplace identities in one turn', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    let life = createLife(4);
    while (life.character.age < 18 || life.pending) {
      const action = life.pending ?
        { type: 'choose' as const, event: life.pending, choice: eventById.get(life.pending)!.choices![0]!.id } : { type: 'age' as const };
      const next = advance(life, action);
      assert.ok(next.life, next.error);
      life = next.life;
    }
    Object.assign(life.character.attributes, { smarts: 95, discipline: 95, charisma: 95, health: 95 });
    const vacancy = vacancies(life).find(({ job }) => job.id === 'records-clerk')!;
    const offered = advance(life, { type: 'apply-job', vacancy: vacancy.id });
    assert.ok(offered.life, offered.error);
    const accepted = advance(offered.life, { type: 'accept-job', vacancy: vacancy.id });
    assert.ok(accepted.life, accepted.error);
    const slot = await repository.insert('employee', accepted.life);
    const worked = advance(slot.life, { type: 'age' });
    assert.ok(worked.life, worked.error);
    const saved = await repository.save(slot, worked.life);
    const reopened = await createRepository(adapter).load(slot.id);
    assert.deepEqual(reopened, saved);
    assert.equal(reopened.life.career.current?.jobId, 'records-clerk');
    assert.equal(reopened.life.career.contacts.length, 5);
    assert.equal(reopened.life.transactions.filter(({ category }) => category === 'salary').length, 1);
    assert.equal(reopened.life.finance.lastSettledYear, reopened.life.year);
  } finally {
    database.close();
  }
});

test('the store prevents Age Up double taps and allows the next intentional turn', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    let now = 0;
    const store = createGameStore(async () => repository, () => now);
    assert.ok(await store.getState().initialize());
    assert.ok(await store.getState().start());
    const { dispatch } = store.getState();
    assert.deepEqual(await Promise.all([dispatch({ type: 'age' }), dispatch({ type: 'age' })]), [true, false]);
    now = 100;
    assert.equal(await dispatch({ type: 'age' }), false);
    now = 400;
    assert.equal(await dispatch({ type: 'age' }), true);
    const slot = store.getState().slot;
    assert.ok(slot);
    assert.equal((await repository.load(slot.id)).life.character.age, 2);
  } finally {
    database.close();
  }
});

test('a failed SQLite write leaves both the active and saved life at the last committed year', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    const store = createGameStore(async () => repository);
    assert.ok(await store.getState().start());
    const before = store.getState().slot;
    assert.ok(before);
    database.exec(`
      CREATE TRIGGER simulate_failed_save BEFORE UPDATE ON lives
      BEGIN SELECT RAISE(ABORT, 'Simulated write failure'); END;
    `);
    assert.equal(await store.getState().dispatch({ type: 'age' }), false);
    assert.equal(store.getState().slot, before);
    assert.match(store.getState().problem ?? '', /Simulated write failure/);
    assert.deepEqual(await repository.load(before.id), before);
  } finally {
    database.close();
  }
});

test('haptics preference persists independently of the selected life', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const adapter = adapt(database);
    await migrate(adapter);
    const repository = createRepository(adapter);
    const store = createGameStore(async () => repository);
    await store.getState().initialize();
    assert.equal(store.getState().haptics, true);
    await store.getState().toggleHaptics();
    const restarted = createGameStore(async () => repository);
    await restarted.getState().initialize();
    assert.equal(restarted.getState().haptics, false);
  } finally {
    database.close();
  }
});
