import { Page, expect } from '@playwright/test';

// Akun pengujian berdasarkan database seed nonproduction
// Semua menggunakan password: password123
export const TEST_ACCOUNTS = {
  paniterapengganti: 'panitera', // SUBSTITUTE_CLERK fallback
  panitera: 'panitera', // COURT_CLERK
  hakim: 'hakim', // JUDGE
  jaksa: 'jaksa', // PROSECUTOR
  rutan: 'rutan', // CORRECTIONS
  operator: 'admin', // IT_OPERATOR fallback
  admin: 'admin' // SYSTEM_ADMIN
};

export async function loginAs(page: Page, username: string, password = 'password123') {
  await page.goto('/login');

  // Tunggu form login muncul
  const usernameInput = page.locator('#username');
  await expect(usernameInput).toBeVisible({ timeout: 10000 });

  // Isi kredensial
  await usernameInput.fill(username);
  await page.locator('#password').fill(password);

  // Klik tombol submit form
  await page.locator('button[type="submit"]:not([disabled])').first().click();

  // Tunggu navigasi ke dashboard berhasil
  await page.waitForURL('**/dashboard', { timeout: 20000 });
}

export async function logout(page: Page) {
  await page.locator('a', { hasText: 'Keluar (Ganti Peran)' }).click();
  await page.waitForURL('**/login', { timeout: 8000 });
}
