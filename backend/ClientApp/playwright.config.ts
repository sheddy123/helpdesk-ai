import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Backend — runs with ASPNETCORE_ENVIRONMENT=Test so appsettings.Test.json is loaded
      command: 'dotnet run --project ../HelpdeskAi.csproj',
      url: 'http://localhost:5285/api/auth/me',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Test',
        ASPNETCORE_URLS: 'http://localhost:5285',
        // Seed credentials for the test database.
        // Override via TEST_ADMIN_PASSWORD / TEST_AGENT_PASSWORD env vars in CI.
        'AdminSeed__Email': process.env.TEST_ADMIN_EMAIL ?? 'admin@test.local',
        'AdminSeed__Password': process.env.TEST_ADMIN_PASSWORD ?? 'Test@Admin1234!',
        'AgentSeed__Email': process.env.TEST_AGENT_EMAIL ?? 'agent@test.local',
        'AgentSeed__Password': process.env.TEST_AGENT_PASSWORD ?? 'Test@Agent1234!',
      },
    },
    {
      // Frontend — always starts a fresh server on port 3001 (separate from the dev server
      // on 3000) so tests always run against the latest compiled source, never stale cache.
      command: 'npm run dev -- --port 3001',
      url: 'http://localhost:3001',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
