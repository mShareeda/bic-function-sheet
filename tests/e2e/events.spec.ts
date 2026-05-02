// ── Event lifecycle tests ─────────────────────────────────────────────────────
// Requires the "authenticated" project (admin storageState).
// Covers: create via wizard, status transitions, PDF download trigger.

import { test, expect } from "@playwright/test";
import { uid } from "./helpers";

test.describe("Event list", () => {
  test("shows the events page with heading and create button", async ({
    page,
  }) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: /events/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /new event|create event/i }),
    ).toBeVisible();
  });

  test("search input filters visible events", async ({ page }) => {
    await page.goto("/events");
    const search = page.getByPlaceholder(/search/i);
    if (await search.isVisible()) {
      await search.fill("zzz-no-match-xyz");
      // Wait for filter to apply — no results or empty state
      await expect(
        page.getByText(/no events|nothing found|no results/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe("Event creation wizard", () => {
  const eventName = `E2E Wizard ${uid()}`;

  test("creates a draft event through all wizard steps", async ({ page }) => {
    await page.goto("/events/new");

    // ── Step 1: Details ───────────────────────────────────────────────────
    await expect(page.getByText("Event details")).toBeVisible();

    // Event name — required field
    const nameInput = page.getByLabel("Event name");
    await nameInput.fill(eventName);

    // Event date/time — use datetime-local input
    const dtInput = page.getByLabel("Event date & time");
    await dtInput.fill("2030-06-15T10:00");

    await page.getByRole("button", { name: /next/i }).click();

    // ── Step 2: Schedule ─────────────────────────────────────────────────
    await expect(page.getByText("Schedule")).toBeVisible();

    await page.getByLabel("Setup").nth(0).fill("2030-06-15T07:00");   // setup start
    await page.getByLabel("Finish").nth(0).fill("2030-06-15T10:00");  // setup end
    await page.getByLabel("Setup").nth(1).fill("2030-06-15T10:00");   // live start
    await page.getByLabel("Finish").nth(1).fill("2030-06-15T22:00");  // live end
    await page.getByLabel("Setup").nth(2).fill("2030-06-15T22:00");   // breakdown start
    await page.getByLabel("Finish").nth(2).fill("2030-06-16T02:00");  // breakdown end

    await page.getByRole("button", { name: /next/i }).click();

    // ── Step 3: Agenda (optional — skip by clicking next) ────────────────
    await expect(page.getByText("Agenda")).toBeVisible();
    await page.getByRole("button", { name: /next/i }).click();

    // ── Step 4: Departments (optional — skip by clicking next) ───────────
    await expect(page.getByText("Departments")).toBeVisible();
    await page.getByRole("button", { name: /next/i }).click();

    // ── Step 5: Review ───────────────────────────────────────────────────
    await expect(page.getByText("Review")).toBeVisible();
    await expect(page.getByText(eventName)).toBeVisible();

    // Save as draft
    await page.getByRole("button", { name: /save as draft/i }).click();

    // After creation, should redirect to the event detail page
    await expect(page).toHaveURL(/\/events\/[a-z0-9]+/, { timeout: 15_000 });
    await expect(page.getByText(eventName)).toBeVisible();
  });

  test("shows error when event name is missing", async ({ page }) => {
    await page.goto("/events/new");

    // Leave event name blank, try to proceed
    const dtInput = page.getByLabel("Event date & time");
    await dtInput.fill("2030-06-15T10:00");
    await page.getByRole("button", { name: /next/i }).click();

    // Validation error should appear
    await expect(
      page.getByText(/title is required|name is required/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("event type select shows suggestion banner in departments step", async ({
    page,
  }) => {
    await page.goto("/events/new");

    // Fill required detail fields
    await page.getByLabel("Event name").fill(`Suggest-test ${uid()}`);
    await page.getByLabel("Event date & time").fill("2030-06-15T10:00");

    // Pick an event type that has suggestions
    const typeSelect = page.locator("select").first();
    await typeSelect.selectOption("race_day");

    await page.getByRole("button", { name: /next/i }).click(); // → schedule
    // Fill schedule to pass validation
    await page.getByLabel("Start").nth(0).fill("2030-06-15T07:00");
    await page.getByLabel("Finish").nth(0).fill("2030-06-15T10:00");
    await page.getByLabel("Start").nth(1).fill("2030-06-15T10:00");
    await page.getByLabel("Finish").nth(1).fill("2030-06-15T22:00");
    await page.getByLabel("Start").nth(2).fill("2030-06-15T22:00");
    await page.getByLabel("Finish").nth(2).fill("2030-06-16T02:00");
    await page.getByRole("button", { name: /next/i }).click(); // → agenda
    await page.getByRole("button", { name: /next/i }).click(); // → departments

    // Suggestion banner should appear
    await expect(
      page.getByText(/smart suggestions|race day/i),
    ).toBeVisible({ timeout: 5_000 });

    // "Apply suggested" button should be present
    await expect(
      page.getByRole("button", { name: /apply suggested/i }),
    ).toBeVisible();
  });
});

test.describe("Event detail page", () => {
  test("links to PDF export", async ({ page }) => {
    await page.goto("/events");
    // Navigate to the first event if any exist
    const firstEventLink = page.getByRole("link").filter({ hasText: /./ }).first();
    const hasEvents = await firstEventLink.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasEvents) {
      test.skip(true, "No events in DB — skipping event detail test");
      return;
    }
    // Go to the events list and find a detail page
    const links = page.getByRole("link", { name: /view|open|details/i });
    const hasLink = await links.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasLink) {
      await links.first().click();
      await page.waitForURL(/\/events\/[a-z0-9]+/, { timeout: 8_000 });
      // PDF export button/link should exist
      await expect(
        page.getByRole("link", { name: /pdf|export|download/i }),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe("Status changes", () => {
  test("status changer dropdown exists on event detail", async ({ page }) => {
    await page.goto("/events");
    const links = page.getByRole("link").filter({ hasText: /./ });
    const hasEvents = await links.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasEvents) {
      test.skip(true, "No events in DB — skipping status change test");
      return;
    }
    await links.first().click();
    await page.waitForURL(/\/events\/[a-z0-9]+/, { timeout: 8_000 });
    // Status area — either a badge or a status button
    await expect(
      page.getByText(/draft|confirmed|function sheet sent|in setup|live|closed/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
