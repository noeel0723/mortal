import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(new URL('../.expo/web-qa/runner.cjs', import.meta.url));
const { chromium } = require('playwright-core');
const edge = join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe');
const executablePath = process.env.MORTAL_BROWSER_PATH || (existsSync(edge) ? edge : undefined);

export const url = process.env.MORTAL_WEB_URL || 'http://127.0.0.1:5173/';
export const startBrowser = () => chromium.launch({ executablePath, headless: true });

export function saveSlot({ id, entry }) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('mortal-web', 1);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      const transaction = db.transaction('lives', entry ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('lives');
      const request = entry ? store.put(entry) : store.get(id);
      transaction.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
