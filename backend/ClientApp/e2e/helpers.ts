import type { Page } from '@playwright/test';

export const ADMIN = { email: 'admin@test.local', password: 'Test@Admin1234!' };
export const AGENT = { email: 'agent@test.local', password: 'Test@Agent1234!' };

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');
  // Wait for the Layout to fully commit — sign-out button only appears once the
  // auth state has been written to context and the component tree has re-rendered.
  await page.getByRole('button', { name: 'Sign out' }).waitFor({ state: 'visible', timeout: 10_000 });
}
