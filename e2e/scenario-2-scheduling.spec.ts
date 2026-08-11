import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

test.describe('Skenario 2: Smoke Test — Penjadwalan & Kontrol Sidang', () => {
  test('Panitera dapat mengakses fitur manajemen jadwal dan peserta', async ({ page }) => {
    await loginAs(page, 'panitera');

    await page.click('a:has-text("Jadwal Sidang")');
    await expect(page.locator('h2', { hasText: /Jadwal/ })).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Rincian Agenda")')).toBeVisible();

    await page.click('a:has-text("Peserta")');
    await expect(page.locator('h2', { hasText: /Peserta/ })).toBeVisible();

    await logout(page);
  });

  test('Hakim dapat melihat Kontrol Sidang', async ({ page }) => {
    await loginAs(page, 'hakim');

    await page.click('a:has-text("Kontrol Sidang")');
    await expect(page.locator('h2', { hasText: /Kontrol Sidang/ })).toBeVisible();

    await logout(page);
  });
});
