import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

test.describe('Skenario 3: Smoke Test — Kesiapan Instansi & Ruang Virtual', () => {
  test('Jaksa dan Rutan dapat mengakses halaman Kesiapan & Pemberitahuan', async ({ page }) => {
    // Test Jaksa
    await loginAs(page, 'jaksa');
    await page.click('a:has-text("Pemberitahuan")');
    await expect(page.locator('h2', { hasText: /Pemberitahuan/ })).toBeVisible();
    await page.click('a:has-text("Kesiapan")');
    await expect(page.locator('h2', { hasText: /Kesiapan/ })).toBeVisible();
    await logout(page);

    // Test Rutan
    await loginAs(page, 'rutan');
    await page.click('a:has-text("Kesiapan")');
    await expect(page.locator('h2', { hasText: /Kesiapan/ })).toBeVisible();
    await logout(page);
  });

  test('Operator TI dapat mengakses menu Ruang Virtual', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.click('a:has-text("Ruang Virtual")');
    await expect(page.locator('h2', { hasText: /Ruang Virtual/ })).toBeVisible();

    await logout(page);
  });
});
