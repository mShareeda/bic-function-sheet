// ── Auth flow tests ───────────────────────────────────────────────────────────
// These run WITHOUT a stored session (unauthenticated project).
// They test sign-in, wrong-password error display, and the forgot-password flow.

import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers";

test.describe("Sign-in page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signin");
  });

  test("renders the sign-in form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("shows 'Forgot?' link that leads to forgot-password page", async ({
    page,
  }) => {
    const link = page.getByRole("link", { name: "Forgot?" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("shows inline error for wrong credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword123");
    await page.getByRole("button", { name: "Sign in" }).click();

    const error = page.getByText(/invalid email or password/i);
    await expect(error).toBeVisible({ timeout: 8_000 });
    // Must stay on sign-in
    await expect(page).toHaveURL(/\/signin/);
  });

  test("does not submit with empty fields (HTML required validation)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    // Browser native validation prevents the form from submitting;
    // we remain on the sign-in URL.
    await expect(page).toHaveURL(/\/signin/);
  });

  test("redirects to /dashboard on valid credentials", async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, "E2E_ADMIN_PASSWORD not set — skipping live sign-in");

    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("redirects unauthenticated users away from protected routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin/, { timeout: 8_000 });
  });

  test("includes ?from= parameter when redirecting to sign-in", async ({
    page,
  }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/\/signin\?from=%2Fevents/, { timeout: 8_000 });
  });
});

test.describe("Forgot-password page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("renders the forgot-password form", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset/i }),
    ).toBeVisible();
  });

  test("shows success message for any email (prevents enumeration)", async ({
    page,
  }) => {
    await page.getByLabel(/email/i).fill("nosuchuser@example.com");
    await page.getByRole("button", { name: /send reset/i }).click();

    // The app always returns a success message whether the email exists or not
    await expect(
      page.getByText(/check your email|if an account exists/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows success message for a known email too (no enumeration leak)", async ({
    page,
  }) => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: /send reset/i }).click();

    await expect(
      page.getByText(/check your email|if an account exists/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("has a link back to sign-in", async ({ page }) => {
    const link = page.getByRole("link", { name: /sign in|back/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/signin/);
  });
});

test.describe("Reset-password page", () => {
  test("invalid token shows error, not a crash", async ({ page }) => {
    await page.goto("/reset-password/definitely-not-a-valid-token");
    await expect(
      page.getByText(/invalid|expired|not found/i),
    ).toBeVisible({ timeout: 8_000 });
  });
});
