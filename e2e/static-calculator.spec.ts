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

test('restores every existing persisted setting without a schema migration', async ({ page }) => {
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
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(saved);
  await page.getByRole('button', { name: 'Push weight to stack' }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stack.at(-1), key)).toBeCloseTo(60.984);
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
