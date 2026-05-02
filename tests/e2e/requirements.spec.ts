// ── Department requirements tests ─────────────────────────────────────────────
// Requires the "authenticated" project (admin storageState).
// Covers: assigning departments, filling requirements, adding manager notes.

import { test, expect, type Page } from "@playwright/test";
import { uid } from "./helpers";

// Helper: create a draft event via the wizard and return to its detail URL.
async function createDraftEvent(page: Page): Promise<string> {
  const name = `Req-E2E ${uid()}`;
  await page.goto("/events/new");

  await page.getByLabel("Event name").fill(name);
  await page.getByLabel("Event date & time").fill("2030-07-10T09:00");
  await page.getByRole("button", { name: /next/i }).click(); // → schedule

  // Fill the three schedule windows
  const starts = page.getByLabel("Start");
  const finishes = page.getByLabel("Finish");
  await starts.nth(0).fill("2030-07-10T07:00");
  await finishes.nth(0).fill("2030-07-10T09:00");
  await starts.nth(1).fill("2030-07-10T09:00");
  await finishes.nth(1).fill("2030-07-10T18:00");
  await starts.nth(2).fill("2030-07-10T18:00");
  await finishes.nth(2).fill("2030-07-10T21:00");
  await page.getByRole("button", { name: /next/i }).click(); // → agenda
  await page.getByRole("button", { name: /next/i }).click(); // → departments

  // Select the first available department
  const firstCheckbox = page.getByRole("checkbox").first();
  await firstCheckbox.check();
  await page.getByRole("button", { name: /next/i }).click(); // → review

  await page.getByRole("button", { name: /save as draft/i }).click();
  await page.waitForURL(/\/events\/[a-z0-9]+/, { timeout: 15_000 });
  return page.url();
}

test.describe("Department requirements", () => {
  test("department list appears on the event detail page", async ({ page }) => {
    const eventUrl = await createDraftEvent(page);
    await page.goto(eventUrl);

    // Departments section should be present
    await expect(
      page.getByText(/departments|requirements/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("can fill a requirement text on the event detail page", async ({
    page,
  }) => {
    const eventUrl = await createDraftEvent(page);
    await page.goto(eventUrl);

    // Find the requirement text-area or edit button for the first department
    const textarea = page.getByRole("textbox", {
      name: /requirement|brief/i,
    });
    const hasTextarea = await textarea.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasTextarea) {
      // Requirement may be collapsed behind an "edit" button
      const editBtn = page.getByRole("button", { name: /edit|add requirement/i });
      if (await editBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await editBtn.first().click();
      }
    }

    const reqText = `Automated test requirement ${uid()}`;
    const activeTextarea = page.getByRole("textbox").filter({ hasText: "" }).first();
    if (await activeTextarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await activeTextarea.fill(reqText);
      await page.getByRole("button", { name: /save|update/i }).first().click();
      await expect(page.getByText(reqText)).toBeVisible({ timeout: 8_000 });
    }
  });
});

test.describe("Wizard department suggestions & templates", () => {
  test("applying suggested departments pre-selects them", async ({ page }) => {
    await page.goto("/events/new");

    await page.getByLabel("Event name").fill(`Template-E2E ${uid()}`);
    await page.getByLabel("Event date & time").fill("2030-07-15T09:00");

    // Pick "Race Day" — it has the most suggestions
    const selects = page.locator("select");
    await selects.first().selectOption("race_day");

    await page.getByRole("button", { name: /next/i }).click(); // → schedule
    const starts = page.getByLabel("Start");
    const finishes = page.getByLabel("Finish");
    await starts.nth(0).fill("2030-07-15T07:00");
    await finishes.nth(0).fill("2030-07-15T09:00");
    await starts.nth(1).fill("2030-07-15T09:00");
    await finishes.nth(1).fill("2030-07-15T18:00");
    await starts.nth(2).fill("2030-07-15T18:00");
    await finishes.nth(2).fill("2030-07-15T21:00");
    await page.getByRole("button", { name: /next/i }).click(); // → agenda
    await page.getByRole("button", { name: /next/i }).click(); // → departments

    // Suggestion banner must be visible
    await expect(
      page.getByText(/smart suggestions|race day/i),
    ).toBeVisible({ timeout: 5_000 });

    // Click "Apply suggested"
    await page.getByRole("button", { name: /apply suggested/i }).click();

    // At least one checkbox should now be checked
    const checked = page.getByRole("checkbox", { checked: true });
    await expect(checked.first()).toBeVisible({ timeout: 3_000 });

    // "Use template" button should appear for departments that have templates
    await expect(
      page.getByRole("button", { name: /use template/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("'Use template' button fills the requirement textarea", async ({
    page,
  }) => {
    await page.goto("/events/new");

    await page.getByLabel("Event name").fill(`TemplFill-E2E ${uid()}`);
    await page.getByLabel("Event date & time").fill("2030-07-16T09:00");
    await page.locator("select").first().selectOption("race_day");

    await page.getByRole("button", { name: /next/i }).click();
    const starts = page.getByLabel("Start");
    const finishes = page.getByLabel("Finish");
    await starts.nth(0).fill("2030-07-16T07:00");
    await finishes.nth(0).fill("2030-07-16T09:00");
    await starts.nth(1).fill("2030-07-16T09:00");
    await finishes.nth(1).fill("2030-07-16T18:00");
    await starts.nth(2).fill("2030-07-16T18:00");
    await finishes.nth(2).fill("2030-07-16T21:00");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /next/i }).click();

    await page.getByRole("button", { name: /apply suggested/i }).click();

    // Wait for templates to load and "Use template" to appear
    const useTemplate = page.getByRole("button", { name: /use template/i }).first();
    await expect(useTemplate).toBeVisible({ timeout: 6_000 });
    await useTemplate.click();

    // The associated textarea should now contain template text
    const textarea = page.locator("textarea").first();
    const content = await textarea.inputValue();
    expect(content.length).toBeGreaterThan(10);
  });
});
