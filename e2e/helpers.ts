import { expect, type Page } from '@playwright/test';
import bank from './fixtures/bank.json' with { type: 'json' };

export { bank };

export async function start(page: Page, hash = '') {
  await page.route('**/bank.json', (route) => route.fulfill({ json: bank }));
  await page.goto('/' + hash);
}

export const qid = (page: Page) => page.locator('[data-qid]').getAttribute('data-qid');
export const check = (page: Page) => page.getByRole('button', { name: 'Check', exact: true });
export const next = (page: Page) => page.getByRole('button', { name: 'Next', exact: true });

/** Wait for the first question, then make it show the given question id. */
export async function openQuestion(page: Page, id: string) {
  await start(page);
  await expect(page.locator('[data-qid]')).toBeVisible();
  await page.evaluate((s) => new Promise<void>((res, rej) => {
    const r = indexedDB.open('french-practice', 1);
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const db = r.result;
      const t = db.transaction('meta', 'readwrite');
      t.objectStore('meta').put(s, 'session');
      t.oncomplete = () => { db.close(); res(); };
      t.onerror = () => rej(t.error);
    };
  }), { currentQuestionId: id });
  await page.reload();
  await expect(page.locator(`[data-qid="${id}"]`)).toBeVisible();
}

export async function attemptCount(page: Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((res, rej) => {
    const r = indexedDB.open('french-practice', 1);
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const db = r.result;
      const c = db.transaction('attempts').objectStore('attempts').count();
      c.onsuccess = () => { db.close(); res(c.result); };
    };
  }));
}

/** Answer whatever is on screen (probably wrongly) and press Check. */
export async function answerAny(page: Page) {
  const input = page.getByRole('textbox', { name: 'Your answer' });
  if (await input.count()) {
    await input.fill('x');
  } else if (await page.getByRole('group', { name: 'Choices' }).count()) {
    await page.getByRole('group', { name: 'Choices' }).getByRole('button').first().click();
  } else {
    await page.getByRole('group', { name: 'Words' }).getByRole('button').first().click();
  }
  await check(page).click();
}

export async function readDownload(dl: import('@playwright/test').Download): Promise<string> {
  const stream = await dl.createReadStream();
  let out = '';
  for await (const chunk of stream as any) out += chunk.toString();
  return out;
}
