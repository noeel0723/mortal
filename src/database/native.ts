import { openDatabaseAsync } from 'expo-sqlite';
import { createRepository, migrate } from './repository.ts';

let opening: Promise<ReturnType<typeof createRepository>> | undefined;

export function openSaves() {
  opening ??= openDatabaseAsync('mortal.db').then(async (database) => {
    try {
      await migrate(database);
      return createRepository(database);
    } catch (error) {
      await database.closeAsync();
      throw error;
    }
  }).catch((error: unknown) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
