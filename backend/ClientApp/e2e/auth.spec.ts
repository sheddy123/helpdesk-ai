import { test, expect } from '@playwright/test';
import { login, ADMIN, AGENT } from './helpers';

test.describe('authentication', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('wrong credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('admin can sign in and reaches home page', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  });

  test('agent can sign in and reaches home page', async ({ page }) => {
    await login(page, AGENT.email, AGENT.password);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  });

  test('sign out returns to /login', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('already-authenticated visit to /login redirects to /', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });
});
