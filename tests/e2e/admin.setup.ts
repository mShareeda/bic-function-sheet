// Global auth-state setup: log in once as admin and save the browser storage
// so every test in the "authenticated" project reuses it rather than
// signing in fresh on every spec.

import { test as setup, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers";

const AUTH_FILE = ".playwright/admin.json";

setup("authenticate as admin", async ({ page }) => {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "E2E_ADMIN_PASSWORD is not set. " +
        "Create a .env.test file (see .env.test.example) and set the admin credentials.",
    );
  }

  await page.goto("/signin");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for successful redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Persist the auth cookies/localStorage so tests don't sign in each time
  await page.context().storageState({ path: AUTH_FILE });
});
