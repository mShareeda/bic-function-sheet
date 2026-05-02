import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // Run tests serially to avoid DB conflicts (shared state)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["line"],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Colour scheme used in tests matches the default app theme
    colorScheme: "light",
  },

  projects: [
    // ── Auth state setup ──────────────────────────────────────────────────
    {
      name: "admin-setup",
      testMatch: "**/admin.setup.ts",
    },
    // ── Tests that require an admin session ───────────────────────────────
    {
      name: "authenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".playwright/admin.json",
      },
      dependencies: ["admin-setup"],
      testIgnore: ["**/auth.spec.ts", "**/admin.setup.ts"],
    },
    // ── Auth tests run without a stored session ───────────────────────────
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/auth.spec.ts",
    },
  ],

  // Start the dev server if it isn't already running.
  // Set SKIP_WEBSERVER=1 to disable (e.g., in CI where the server is already up).
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
