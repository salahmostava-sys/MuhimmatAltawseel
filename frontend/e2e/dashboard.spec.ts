import { expect, test } from '@playwright/test';

const email = process.env.E2E_DASHBOARD_EMAIL;
const password = process.env.E2E_DASHBOARD_PASSWORD;
const shouldAssertAuthenticatedDashboard =
  process.env.E2E_ASSERT_AUTHENTICATED_DASHBOARD === '1' && !!email && !!password;

test.describe('Dashboard smoke', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
  });

  test('logs in and shows dashboard entry UI', async ({ page }) => {
    test.skip(!shouldAssertAuthenticatedDashboard, 'Authenticated dashboard smoke requires confirmed dashboard credentials');

    await page.goto('/login');

    await page.locator('#login-email').fill(email ? email : '');
    await page.locator('#login-password').fill(password ? password : '');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'النظرة العامة' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'التحليلات والتوقعات' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'الطلبات' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'الحضور' })).toBeVisible();
  });
});
