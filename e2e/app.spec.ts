import { test, expect } from '@playwright/test';
import { answerAny, attemptCount, check, next, openQuestion, qid, readDownload, start } from './helpers';

const choice = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('group', { name: 'Choices' }).getByRole('button', { name, exact: true });

test('correct mcq answer, then Next shows a different question', async ({ page }) => {
  await start(page);
  await expect(page.locator('[data-qid]')).toBeVisible();
  const first = await qid(page);
  const prompt = await page.getByTestId('prompt').textContent();
  await choice(page, 'suis').click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await next(page).click();
  await expect(page.getByTestId('prompt')).not.toHaveText(prompt!);
  expect(await qid(page)).not.toBe(first);
});

test('wrong answer shows feedback and explanation; Retry works', async ({ page }) => {
  await openQuestion(page, 'fx-q01');
  await choice(page, 'es').click();
  await check(page).click();
  await expect(page.getByText('Not quite.')).toBeVisible();
  await expect(page.getByText('es goes with tu, not je.')).toBeVisible();
  await expect(page.getByText('Je goes with suis.')).toBeVisible();
  await expect(page.locator('.accepted')).toHaveText('suis');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Not quite.')).toHaveCount(0);
  await choice(page, 'suis').click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  await expect(page.getByText('Je goes with suis.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Why?' }).click();
  await expect(page.getByText('Je goes with suis.')).toBeVisible();
});

test('hint is revealed on request', async ({ page }) => {
  await openQuestion(page, 'fx-q02');
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.getByTestId('hint')).toContainText('The verb goes with tu.');
});

test('missing accent is a near miss', async ({ page }) => {
  await openQuestion(page, 'fx-q05');
  await page.getByRole('textbox', { name: 'Your answer' }).fill('fatiguee');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Almost — check the accents.')).toBeVisible();
  await expect(page.locator('.accepted')).toHaveText('fatiguée');
});

test('strict accent setting counts missing accent as wrong', async ({ page }) => {
  await start(page, '#/settings');
  await page.getByLabel('Count answers with missing accents as wrong').check();
  await page.goto('/#/practice');
  await expect(page.locator('[data-qid]')).toBeVisible();
  await page.evaluate(() => 0);
  await openQuestion(page, 'fx-q05');
  await page.getByRole('textbox', { name: 'Your answer' }).fill('fatiguee');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Not quite.')).toBeVisible();
});

test('sentence order: build, return a token, clear', async ({ page }) => {
  await openQuestion(page, 'fx-q03');
  const words = page.getByRole('group', { name: 'Words' });
  const line = page.getByLabel('Your answer');
  await words.getByRole('button', { name: 'Je' }).click();
  await words.getByRole('button', { name: 'suis' }).click();
  await expect(line.getByRole('button')).toHaveText(['Je', 'suis']);
  await line.getByRole('button', { name: 'suis' }).click();
  await expect(line.getByRole('button')).toHaveText(['Je']);
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(line.getByRole('button')).toHaveCount(0);
  for (const w of ['Je', 'suis', 'étudiant']) await words.getByRole('button', { name: w }).click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
});

test('reload resumes the same question and progress persists', async ({ page }) => {
  await start(page);
  await expect(page.locator('[data-qid]')).toBeVisible();
  const first = await qid(page);
  await page.reload();
  await expect(page.locator('[data-qid]')).toBeVisible();
  expect(await qid(page)).toBe(first);

  await openQuestion(page, 'fx-q01');
  await choice(page, 'suis').click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await expect.poll(() => attemptCount(page)).toBe(1);
  await page.reload();
  await expect(page.locator('[data-qid="fx-q01"]')).toBeVisible();
  expect(await attemptCount(page)).toBe(1);
});

test('topic selection limits questions to that skill', async ({ page }) => {
  await start(page, '#/topics');
  await page.getByRole('button', { name: 'Everyday words' }).click();
  await expect(page.locator('[data-qid]')).toBeVisible();
  await expect(page.locator('.topic')).toContainText('Everyday words');
  for (let i = 0; i < 4; i++) {
    expect(['fx-q04', 'fx-q05', 'fx-q06']).toContain(await qid(page));
    await answerAny(page);
    await next(page).click();
  }
  expect(['fx-q04', 'fx-q05', 'fx-q06']).toContain(await qid(page));
});

test('progress shows an attempted skill with its stage', async ({ page }) => {
  await openQuestion(page, 'fx-q01');
  await choice(page, 'suis').click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await page.getByRole('link', { name: 'Progress' }).click();
  const row = page.locator('[data-objective="FR-A1-GRM-001"]');
  await expect(row).toContainText('Present tense of être');
  await expect(row).toContainText('Right with help');
  await expect(row).toContainText('100%');
  await expect(page.locator('[data-objective="FR-A1-VOC-001"]')).toContainText('Not started');
  await expect(page.getByText('This shows accuracy on these questions. It is not a CEFR level.')).toBeVisible();
});

test('glossary opens, closes with Escape, and keeps the typed answer', async ({ page }) => {
  await openQuestion(page, 'fx-q05');
  const input = page.getByRole('textbox', { name: 'Your answer' });
  await input.fill('fatig');
  const btn = page.getByRole('button', { name: 'Glossary' });
  await btn.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('dt')).toHaveText(['Accent', 'Article', 'Conjugation']);
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  await expect(btn).toBeFocused();
  await expect(input).toHaveValue('fatig');
  await btn.click();
  await dlg.getByRole('button', { name: 'Close' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(input).toHaveValue('fatig');
});

test('settings: export gives valid JSON; invalid import shows an error', async ({ page }) => {
  await openQuestion(page, 'fx-q01');
  await choice(page, 'suis').click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await expect.poll(() => attemptCount(page)).toBe(1);
  await page.getByRole('link', { name: 'Settings' }).click();
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export progress' }).click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^french-practice-progress-\d{4}-\d{2}-\d{2}\.json$/);
  const json = JSON.parse(await readDownload(dl));
  expect(json.schemaVersion).toBe(1);
  expect(json.attempts).toHaveLength(1);

  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: (globalThis as any).Buffer.from('not json') });
  await expect(page.getByRole('status')).toContainText('Import failed');
  await page.locator('input[type=file]').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: (globalThis as any).Buffer.from(JSON.stringify(json)) });
  await expect(page.getByRole('status')).toHaveText('Progress imported.');
});

test('settings: reset needs two steps', async ({ page }) => {
  await openQuestion(page, 'fx-q01');
  await choice(page, 'suis').click();
  await check(page).click();
  await expect.poll(() => attemptCount(page)).toBe(1);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  expect(await attemptCount(page)).toBe(1);
  await page.getByRole('button', { name: 'Yes, delete all progress' }).click();
  await expect(page.getByRole('status')).toHaveText('All progress deleted.');
  expect(await attemptCount(page)).toBe(0);
});

test('keyboard only: number key, Enter, Next', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only');
  await start(page);
  await expect(page.locator('[data-qid]')).toBeVisible();
  const first = await qid(page);
  await expect(choice(page, 'suis')).toBeFocused();
  await page.keyboard.press('1');
  await expect(check(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Correct.')).toBeVisible();
  await expect(next(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-qid]')).not.toHaveAttribute('data-qid', first!);
});

test('no horizontal scroll at 390px on every screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openQuestion(page, 'fx-q06');
  const fits = async () => {
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
  };
  await fits();
  await answerAny(page);
  await expect(page.locator('.feedback')).toBeVisible();
  await fits();
  await page.getByRole('button', { name: 'Glossary' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await fits();
  await page.keyboard.press('Escape');
  for (const h of ['topics', 'progress', 'settings', 'placement']) {
    await page.goto(`/#/${h}`);
    await expect(page.locator('h1')).toBeVisible();
    await fits();
  }
});

test('placement runs to the end screen without touching practice cards', async ({ page }) => {
  await start(page, '#/placement');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0);
  await answerAny(page);
  await expect(page.getByText('Answer recorded.')).toBeVisible();
  await expect(page.getByText('Not quite.')).toHaveCount(0);
  await next(page).click();
  await expect(page.getByRole('heading', { name: 'Question 2' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => new Promise<boolean>((res) => {
    const r = indexedDB.open('french-practice', 1);
    r.onsuccess = () => {
      const g = r.result.transaction('meta').objectStore('meta').get('diagnostic');
      g.onsuccess = () => { r.result.close(); res(!!g.result); };
    };
  }))).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Question 2' })).toBeVisible();
  for (let i = 0; i < 30; i++) {
    if (await page.getByRole('heading', { name: 'Placement result' }).count()) break;
    await answerAny(page);
    await next(page).click();
  }
  await expect(page.getByRole('heading', { name: 'Placement result' })).toBeVisible();
  await expect(page.getByText('Grammar and sentence building')).toBeVisible();
  await expect(page.getByText('Vocabulary')).toBeVisible();
  await expect(page.getByText('Provisional. Based on a small number of questions. It is not a CEFR certificate.')).toBeVisible();
  expect(await attemptCount(page)).toBe(0);
});

test('no gamified or praise wording on any screen', async ({ page }) => {
  await openQuestion(page, 'fx-q01');
  const bad = /points|streak|badge|great|well done/i;
  const scan = async () => expect(await page.evaluate(() => document.body.innerText)).not.toMatch(bad);
  await scan();
  await choice(page, 'suis').click();
  await check(page).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await scan();
  await page.getByRole('button', { name: 'Glossary' }).click();
  await scan();
  await page.keyboard.press('Escape');
  for (const h of ['topics', 'progress', 'settings', 'placement']) {
    await page.goto(`/#/${h}`);
    await expect(page.locator('h1')).toBeVisible();
    await scan();
  }
});
