import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(new URL('../.expo/web-qa/runner.cjs', import.meta.url));
const { chromium } = require('playwright-core');
const edge = join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe');
const executablePath = process.env.MORTAL_BROWSER_PATH || (existsSync(edge) ? edge : undefined);

export const url = process.env.MORTAL_WEB_URL || 'http://127.0.0.1:5173/';
export const startBrowser = () => chromium.launch({ executablePath, headless: true });

export async function acknowledgeEvents(page, chooseFirst = false, untilTitle) {
  const popup = page.locator('dialog[data-life-event][open]');
  while (await popup.isVisible()) {
    if (untilTitle && await popup.getByRole('heading', { name: untilTitle, exact: true }).count()) return;
    const key = await popup.getAttribute('data-life-event');
    if (key.startsWith('decision-') && !chooseFirst) return;
    const kind = await popup.getAttribute('data-event-kind');
    const remain = popup.getByRole('button', { name: 'Remain Acquaintances', exact: true });
    const button = key.startsWith('decision-') ? popup.locator('.event-options button').first() :
      kind === 'death' ? popup.getByRole('button', { name: /^(Skip Funeral|Continue|View Life Summary)$/ }) :
        kind === 'family' ? popup.getByRole('button', { name: /^(Continue$|Keep Our Names$|Maybe Later$|Mother’s Surname|Your Surname)/ }).first() :
        await remain.count() ? remain : popup.getByRole('button', { name: 'Continue', exact: true });
    await button.click();
    await page.locator(`dialog[data-life-event="${key}"]`).waitFor({ state: 'hidden' });
  }
}

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
