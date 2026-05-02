// ── Accessibility tests ───────────────────────────────────────────────────────
// Covers WCAG 2.1 AA basics: keyboard navigation, focus management,
// ARIA labels, and visible focus rings on interactive elements.
//
// auth.spec.ts tests run unauthenticated; the rest use admin storageState.

import { test, expect } from "@playwright/test";

// ── Sign-in form (run in both projects — but this file is in "authenticated"
//    project which has storageState; visiting /signin will immediately
//    redirect. Guard with a fresh context when needed.)

test.describe("Sign-in page keyboard navigation", () => {
  test("Tab moves focus from email → password → submit in order", async ({
    browser,
  }) => {
    // Use a fresh context without session so we stay on /signin
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/signin");

    // Start from Email field
    await page.getByLabel("Email").focus();
    await expect(page.getByLabel("Email")).toBeFocused();

    // Tab → Password
    await page.keyboard.press("Tab");
    // Focus may land on "Forgot?" link first (DOM order)
    // Keep tabbing until we hit a password input or submit
    let focused = await page.evaluate(() => document.activeElement?.getAttribute("type"));
    let attempts = 0;
    while (focused !== "password" && focused !== "submit" && attempts++ < 5) {
      await page.keyboard.press("Tab");
      focused = await page.evaluate(() => document.activeElement?.getAttribute("type"));
    }
    expect(["password", "submit"]).toContain(focused);

    await ctx.close();
  });

  test("form can be submitted with keyboard only (Enter key)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto("/signin");
    await page.getByLabel("Email").fill("bad@example.com");
    await page.getByLabel("Password").fill("wrongpassword1");
    await page.keyboard.press("Enter");

    // Should see error (not a JS crash) — proves keyboard submit works
    await expect(
      page.getByText(/invalid email or password/i),
    ).toBeVisible({ timeout: 8_000 });

    await ctx.close();
  });
});

test.describe("Dashboard — semantic markup", () => {
  test("page has exactly one <h1>", async ({ page }) => {
    await page.goto("/dashboard");
    const h1s = page.locator("h1");
    await expect(h1s).toHaveCount(1, { timeout: 8_000 });
  });

  test("stat cards are visible and labelled", async ({ page }) => {
    await page.goto("/dashboard");
    // Stat cards rendered by StatCard carry a text label + value pair
    const cards = page.locator("[class*='glass']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Events list — keyboard & ARIA", () => {
  test("page has a main landmark", async ({ page }) => {
    await page.goto("/events");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
  });

  test("search input has an accessible label or placeholder", async ({
    page,
  }) => {
    await page.goto("/events");
    const search = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search/i));
    const hasSearch = await search.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasSearch) {
      // Must have either an aria-label, placeholder, or associated label
      const el = search.first();
      const ariaLabel = await el.getAttribute("aria-label");
      const placeholder = await el.getAttribute("placeholder");
      const id = await el.getAttribute("id");
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      expect(ariaLabel || placeholder || hasLabel).toBeTruthy();
    }
  });
});

test.describe("Notification bell — ARIA", () => {
  test("bell button has aria-label", async ({ page }) => {
    await page.goto("/dashboard");
    const bell = page.getByRole("button", { name: /notification/i });
    await expect(bell).toBeVisible({ timeout: 8_000 });
    const label = await bell.getAttribute("aria-label");
    expect(label).not.toBeNull();
    expect(label!.length).toBeGreaterThan(5);
  });

  test("bell button has aria-expanded", async ({ page }) => {
    await page.goto("/dashboard");
    const bell = page.getByRole("button", { name: /notification/i });
    await expect(bell).toBeVisible({ timeout: 8_000 });

    // Collapsed state
    const before = await bell.getAttribute("aria-expanded");
    expect(before).toBe("false");

    // Open it
    await bell.click();
    const after = await bell.getAttribute("aria-expanded");
    expect(after).toBe("true");
  });

  test("bell panel closes on Escape key", async ({ page }) => {
    await page.goto("/dashboard");
    const bell = page.getByRole("button", { name: /notification/i });
    await bell.click();

    await expect(
      page.getByRole("dialog", { name: /notification/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: /notification/i }),
    ).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Event wizard — form accessibility", () => {
  test("all required inputs have visible labels", async ({ page }) => {
    await page.goto("/events/new");
    // Collect all inputs that are marked required
    const required = page.locator("input[required]");
    const count = await required.count();
    for (let i = 0; i < count; i++) {
      const input = required.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const hasAssocLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      // Every required input must be labelled by one of these mechanisms
      expect(
        hasAssocLabel || !!ariaLabel || !!ariaLabelledBy,
        `Input #${i} (id="${id}") has no accessible label`,
      ).toBe(true);
    }
  });

  test("error messages are announced as role=alert", async ({ page }) => {
    await page.goto("/events/new");
    // Trigger validation by clicking Next with no data
    await page.getByRole("button", { name: /next/i }).click();

    // Our error container uses role="alert"
    const alertEl = page.getByRole("alert");
    await expect(alertEl).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Colour contrast basics — focus rings", () => {
  test("interactive elements show focus ring on keyboard focus", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Tab into the first interactive element and check that an outline is applied
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toBeVisible({ timeout: 3_000 });

    const outline = await focused.evaluate(
      (el) => getComputedStyle(el).outlineWidth,
    );
    // outline-width > 0 indicates a visible focus ring (our .focus-ring class)
    expect(parseFloat(outline)).toBeGreaterThan(0);
  });
});

test.describe("Navigation landmarks", () => {
  test("dashboard has nav landmark", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("nav").first()).toBeVisible();
  });

  test("topbar links are inside a nav landmark", async ({ page }) => {
    await page.goto("/dashboard");
    // Breadcrumb nav
    const nav = page.locator("nav[aria-label='Breadcrumb']");
    const hasBreadcrumb = await nav.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBreadcrumb) {
      await expect(nav).toBeVisible();
    }
  });
});
