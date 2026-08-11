import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

test.describe('Skenario 1: Smoke Test — Pendaftaran Perkara & Navigasi Alur Sidang', () => {
  test('Panitera dapat login dan navigasi ke seluruh halaman utama', async ({ page }) => {
    await loginAs(page, 'panitera');

    // Verifikasi Dashboard muncul
    await expect(
      page
        .locator('h1', { hasText: 'Court Intelligence Management System' })
        .or(page.locator('h1', { hasText: 'CIMS' }))
    ).toBeVisible();

    // Navigasi ke Data Persidangan
    await page.click('a:has-text("Data Persidangan")');
    await expect(page.locator('h2', { hasText: 'Data Awal Persidangan' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Simpan Draf' })).toBeVisible();

    // Navigasi ke Jadwal Sidang
    await page.click('a:has-text("Jadwal Sidang")');
    await expect(page.locator('h2', { hasText: 'Jadwal & Agenda Sidang' })).toBeVisible();

    // Navigasi ke Pemberitahuan
    await page.click('a:has-text("Pemberitahuan")');
    await expect(page.locator('h2', { hasText: 'Pemberitahuan & Tanda Terima' })).toBeVisible();

    await logout(page);
  });

  test('Hakim dapat login dan navigasi ke halaman Penetapan', async ({ page }) => {
    await loginAs(page, 'hakim');

    await page.click('a:has-text("Penetapan Hakim")');
    await expect(page.locator('h2', { hasText: /Penetapan/ })).toBeVisible();

    await logout(page);
  });
});
