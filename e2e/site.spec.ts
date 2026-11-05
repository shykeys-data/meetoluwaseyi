import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

/* Phase 5 "Done when", as browser tests. */

const intro = (page: Page) => page.locator('.intro');

test.describe('first visit: intro first, then the playful home', () => {
  for (const [label, iso, look] of [
    ['10:00', '2026-11-06T10:00:00', 'sun'],
    ['21:00', '2026-11-06T21:00:00', 'moon'],
  ] as const) {
    test(`plays the intro at ${label} (${look}) and lands on playful @phone`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(iso));
      await page.goto('/');
      await expect(intro(page)).toBeVisible();
      await expect(page.locator('html')).toHaveClass(/intro-on/);
      // Intro look follows the visitor's clock: stars only at night.
      const stars = await page.locator('.intro .star').count();
      if (look === 'moon') expect(stars).toBeGreaterThan(0);
      else expect(stars).toBe(0);
      await page.waitForTimeout(4000);
      await expect(intro(page)).toHaveCount(0);
      await expect(page.locator('html')).not.toHaveClass(/intro-on/);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'playful');
      await expect(page.getByRole('status').filter({ hasText: 'serious version' })).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('a return visit goes straight to the playful home with no intro', async ({ page, context }) => {
    await context.addCookies([{ name: 'mo_seen', value: '1', url: 'http://localhost:3200' }]);
    await page.goto('/');
    await expect(intro(page)).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'playful');
  });

  test('skip intro works and the replay link plays it again', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(intro(page)).toHaveCount(0);
    await page.getByRole('button', { name: /replay intro/i }).click();
    await expect(intro(page)).toBeVisible();
  });

  test('?mode=serious lands on the serious home and skips the intro', async ({ page }) => {
    await page.goto('/?mode=serious');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'serious');
    await expect(intro(page)).toHaveCount(0);
  });

  test('without JavaScript the homepage shows straight away @phone', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(intro(page)).toBeHidden();
    await ctx.close();
  });
});

test('switching mode carries to every page and to an open tab', async ({ page, context }) => {
  await context.addCookies([{ name: 'mo_seen', value: '1', url: 'http://localhost:3200' }]);
  await page.goto('/work');
  const other = await context.newPage();
  await other.goto('/about');
  await expect(other.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'playful');
  await page.getByRole('button', { name: 'Switch to serious mode' }).click();
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'serious');
  await expect(other.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'serious');
  await page.goto('/writing');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'serious');
});

test.describe('contact', () => {
  test('shows validation errors in words and keeps what was typed', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('#c-name', 'A');
    await page.getByRole('button', { name: 'Send my message' }).click();
    await expect(page.locator('#c-name-err')).toBeVisible();
    await expect(page.locator('#c-name')).toBeFocused();
    await expect(page.locator('#c-name')).toHaveValue('A');
  });

  test('sends a message and shows the thank-you panel', async ({ page }) => {
    await page.goto('/contact');
    await page
      .getByText('I’m hiring', { exact: false })
      .or(page.getByText('Hire', { exact: true }))
      .first()
      .click();
    await page.fill('#c-name', 'Ada Lovelace');
    await page.fill('#c-email', 'ada@example.com');
    await page.fill('#c-msg', 'I would love to talk about a community role.');
    await page.getByRole('button', { name: 'Send my message' }).click();
    await expect(page.getByRole('status').filter({ hasText: /message/i })).toBeVisible();
  });

  test('works with JavaScript off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/contact');
    await page.fill('#c-name', 'Grace Hopper');
    await page.fill('#c-email', 'grace@example.com');
    await page.fill('#c-msg', 'Sent from a browser with JavaScript turned off.');
    await page.getByRole('button', { name: 'Send my message' }).click();
    await expect(page).toHaveURL(/\/contact\/thanks$/);
    await expect(page.locator('h1')).toContainText('Thank you');
    await ctx.close();
  });
});

function totp(secret: string): string {
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of secret) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = createHmac('sha1', Buffer.from(bytes)).update(msg).digest();
  const o = mac[mac.length - 1]! & 15;
  return ((mac.readUInt32BE(o) & 0x7fffffff) % 1e6).toString().padStart(6, '0');
}

test('admin: 2FA login, publish a project, and it appears on /work', async ({ page }) => {
  const secret = readFileSync('e2e/.admin-secret', 'utf8').trim();
  await page.goto('/myadm');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('e2e correct horse battery staple');
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Title').fill('E2E Test Project');
  await page.getByLabel(/Address \(slug\)/).fill('e2e-test-project');
  await page.getByLabel(/Summary/).fill('A project created by the end-to-end test.');
  await page.getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.goto('/work');
  await expect(page.getByText('E2E Test Project')).toBeVisible();
  await expect(page.locator('meta[name=robots]')).toHaveCount(0);
});

test('404 page links home and to work, in both modes', async ({ page, context }) => {
  const r = await page.goto('/no-such-page');
  expect(r?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible();
  await context.addCookies([{ name: 'mo_mode', value: 'serious', url: 'http://localhost:3200' }]);
  await page.goto('/no-such-page');
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'serious');
  await expect(page.getByRole('link', { name: 'See the work' })).toBeVisible();
});
