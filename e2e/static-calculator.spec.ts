import { test, expect } from '@playwright/test';

const key = 'detailer-calculator-state-v1';

test('static delivery supports keyboard RPN, undo, redo, conversion and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.getByRole('button', { name: 'Standard', exact: true }).click();
  await page.getByRole('button', { name: 'Clear stack', exact: true }).click();
  const entry = page.getByRole('textbox', { name: 'Calculator entry' });
  await entry.fill('6');
  await entry.press('Enter');
  await entry.fill('3');
  await entry.press('-');
  const stack = page.locator('.stack-display output').last();
  await expect(stack).toHaveText('3.0000');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(stack).toHaveText('6.0000');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(stack).toHaveText('3.0000');
  await page.getByRole('button', { name: 'Convert', exact: true }).click();
  await page.getByRole('button', { name: 'F → IN Feet to decimal inches' }).click();
  await expect(stack).toHaveText('36.0000');
  await page.reload();
  await expect(stack).toHaveText('36.0000');
  expect(errors).toEqual([]);
});

test('migrates every valid legacy persisted setting into the versioned envelope', async ({ page }) => {
  const saved = {
    stack: [12.0608, -3.25], entry: '9.12', mode: 'standard', rounding: 6,
    angles: [10, 20, 30, 40], activeAngle: 2, toolTab: 'weight',
    slopeInput: '6', manualAngle: '23', baseInput: '3', riseInput: '4',
    lengthInput: '8', widthInput: '210', thicknessInput: '0.125',
    lengthUnit: 'inches', widthUnit: 'inches',
  };
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
  await page.goto('/');
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Calculator entry' })).toHaveValue('9.12');
  await expect(page.locator('.weight-result strong')).toContainText('60.984000');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual({ schemaVersion: 2, state: saved });
  await page.getByRole('button', { name: 'Push weight to stack' }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).state.stack.at(-1), key)).toBeCloseTo(60.984);
});

test('mobile keypad and tools operate from static assets', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(process.env.CALC_TEST_URL || 'http://127.0.0.1:18983');
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.getByRole('button', { name: 'Open keypad' }).click();
  await page.getByRole('button', { name: '7', exact: true }).click();
  await expect(page.locator('input[aria-label="Calculator entry"]')).toHaveValue('7');
  await page.getByRole('button', { name: 'Close keypad' }).click();
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose the working angle' })).toBeVisible();
  await context.close();
});

test('migrates a partial legacy record without losing its calculation', async ({ page }) => {
  const saved = { stack: [42], entry: '7', mode: 'standard', rounding: 6 };
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
  await page.goto('/');
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Calculator entry' })).toHaveValue('7');
  const migrated = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.state).toMatchObject({ ...saved, toolTab: 'triangle', lengthUnit: 'feet', widthUnit: 'inches' });
  expect(migrated.state.angles).toHaveLength(4);
});

test('manifest, images, fonts and missing routes are served without an origin', async ({ page, request }) => {
  const failed: string[] = [];
  // Zone-level analytics may be blocked by privacy/network policy; validate
  // the application's own assets independently of optional third-party beacons.
  page.on('requestfailed', req => {
    if (new URL(req.url()).origin === new URL(page.url()).origin) failed.push(req.url());
  });
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  expect(failed).toEqual([]);
  for (const path of ['/manifest.webmanifest', '/favicon.svg', '/og.png']) {
    expect((await request.get(path)).status()).toBe(200);
  }
  expect((await request.get('/this-route-does-not-exist')).status()).toBe(404);
});


test('corrupt state remains untouched while calculator opens with an explicit warning',async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,'{synthetic broken JSON'),key);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByText('Browser saving paused')).toBeVisible();
 await expect(page.locator('.toast[role="status"]')).toContainText('without overwriting');
 await page.getByRole('button',{name:'Standard',exact:true}).click();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe('{synthetic broken JSON');expect(errors).toEqual([]);
});
test('quota failure pauses saving through later edits and retries only after reload', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    (window as Window & { syntheticWriteAttempts: number }).syntheticWriteAttempts = 0;
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage) {
        (window as Window & { syntheticWriteAttempts: number }).syntheticWriteAttempts++;
        if (sessionStorage.getItem('synthetic-storage-recovered') !== '1') {
          throw new DOMException('synthetic quota', 'QuotaExceededError');
        }
      }
      return original.call(this, key, value);
    };
  });
  const attempts = () => page.evaluate(() => (window as Window & { syntheticWriteAttempts: number }).syntheticWriteAttempts);
  const settleEffects = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Browser saving unavailable')).toBeVisible();
  await expect(page.locator('.toast[role="status"]')).toContainText('Saving is paused until you reload');
  expect(await attempts()).toBe(1);
  await page.getByRole('button', { name: 'Standard', exact: true }).click();
  const entry = page.getByRole('textbox', { name: 'Calculator entry' });
  await entry.fill('42');
  await expect(entry).toHaveValue('42');
  await settleEffects();
  expect(await attempts()).toBe(1);
  // Recovery of the storage API alone must not silently resume writes.
  await page.evaluate(() => sessionStorage.setItem('synthetic-storage-recovered', '1'));
  await entry.fill('84');
  await expect(entry).toHaveValue('84');
  await settleEffects();
  expect(await attempts()).toBe(1);
  await page.reload();
  await expect(page.getByText('Saved on this device')).toBeVisible();
  expect(await attempts()).toBe(1);
  expect(errors).toEqual([]);
});
