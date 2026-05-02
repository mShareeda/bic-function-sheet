import type { Page } from "@playwright/test";

// ── Credentials ───────────────────────────────────────────────────────────────
// Set these in a .env.test file (see .env.test.example).

export const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? "admin@bic.local";

export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Unique suffix to isolate test-created records. */
export function uid() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Sign in via the credentials form and wait for dashboard. */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

/** Sign in as the E2E admin user. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

/** Navigate to the sign-in page and return without logging in. */
export async function goToSignIn(page: Page): Promise<void> {
  await page.goto("/signin");
  await page.waitForURL("**/signin");
}
