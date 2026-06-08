import { test, expect } from '@playwright/test';
import { login, ADMIN, AGENT } from './helpers';

test.describe('users page', () => {
  test('admin sees Users nav link, agent does not', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  });

  test('agent does not see Users nav link', async ({ page }) => {
    await login(page, AGENT.email, AGENT.password);
    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible();
  });

  test('agent navigating to /users is redirected to /', async ({ page }) => {
    await login(page, AGENT.email, AGENT.password);
    await page.goto('/users');
    await expect(page).toHaveURL('/');
  });

  test('admin can open users page', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Agent' })).toBeVisible();
  });

  test('admin can create a new agent', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/users');

    const suffix = Date.now();
    const email = `agent-${suffix}@test.local`;
    const username = `agent${suffix}`;

    await page.getByRole('button', { name: 'Add Agent' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('Test@New1234!');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(username)).toBeVisible();
  });

  test('admin can deactivate an agent', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/users');

    const suffix = Date.now();
    const email = `agent-${suffix}@test.local`;

    // Create agent first
    await page.getByRole('button', { name: 'Add Agent' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Username').fill(`agent${suffix}`);
    await page.getByLabel('Password').fill('Test@New1234!');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Deactivate
    const row = page.locator('tr').filter({ hasText: email });
    await expect(row.getByText('Active')).toBeVisible();
    await row.getByRole('button', { name: 'Deactivate' }).click();
    await expect(row.getByText('Inactive')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Deactivate' })).not.toBeVisible();
  });

  test('create form rejects short password', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/users');

    await page.getByRole('button', { name: 'Add Agent' }).click();
    await page.getByLabel('Email').fill('x@test.local');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('tooshort');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Password must be at least 12 characters')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('create form rejects invalid email', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/users');

    await page.getByRole('button', { name: 'Add Agent' }).click();
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('Test@Valid1234!');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
