import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Turn } from "../shared/schemas";

/* ============================================================
   Scroll Ownership E2E Tests

   These tests validate two layers simultaneously:

   1) Control plane (XState)
      - machineOwned vs userOwned
      - USER_SCROLLED_UP / USER_AT_BOTTOM transitions

   2) Physical scroll geometry
      - Whether the viewport is actually at bottom
      - Whether auto-scroll truly occurred

   We are NOT just checking state flags.
   We are validating that physical scroll behavior matches
   machine authority semantics.
============================================================ */

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */

/**
 * Creates a tall turn so that scrolling is meaningful.
 * Each turn contains enough repeated text to produce
 * vertical overflow in the scroll container.
 */
function turn(i: number): Turn {
  return {
    speaker: i % 2 === 0 ? "security_engineer" : "application_engineer",
    mdx: `Turn ${i}\n\n` + "word ".repeat(200),
  };
}

/**
 * Waits until:
 * 1) The test bridge is installed (window.__socratic exists)
 * 2) The scroll viewport is mounted in the DOM
 *
 * This prevents DOM race conditions where React has not yet mounted.
 */
async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => !!window.__socratic);
  await page.waitForSelector("[data-testid='scroll-viewport']");
}

/**
 * Emits APPEND_TURN events through the bridge.
 * This simulates replay-driven content growth.
 */
async function appendTurns(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.evaluate((payload: Turn) => {
      window.__socratic?.emit("APPEND_TURN", payload);
    }, turn(i));
  }
}

/**
 * Simulates a user scroll by mutating scrollTop and
 * manually dispatching a scroll event.
 *
 * This ensures ownership logic is triggered.
 */
async function manualScroll(page: Page, delta: number) {
  await page.evaluate((amount) => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    el.scrollTop += amount;
    el.dispatchEvent(new Event("scroll"));
  }, delta);
}

/**
 * Force scroll to bottom.
 * Used to simulate a user returning control to the machine.
 */
async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });
}

/**
 * Reads scroll ownership from DOM attribute.
 * This reflects XState's parallel "scroll" region.
 */
async function getOwner(page: Page) {
  return page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner");
}

/* ------------------------------------------------------------
   Console passthrough (useful during debugging)
------------------------------------------------------------ */

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}]`, msg.text());
  });
});

/* ------------------------------------------------------------
   Fresh State
------------------------------------------------------------ */

/**
 * On first load:
 *
 * - No content overflow yet.
 * - Scroll position is naturally at top.
 * - But since top === bottom (no overflow),
 *   machine should own scroll.
 */
test("fresh load starts machineOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  const owner = await getOwner(page);
  expect(owner).toBe("machineOwned");
});

/* ------------------------------------------------------------
   Auto-scroll behavior
------------------------------------------------------------ */

/**
 * This test verifies the core invariant:
 *
 * When machineOwned and content is appended,
 * the viewport must automatically scroll to bottom.
 *
 * We validate BOTH:
 *   1) Ownership state
 *   2) Physical geometry
 *
 * ------------------------------------------------------------
 * Geometry Explanation:
 *
 *   scrollTop      → distance from top
 *   clientHeight   → viewport height
 *   scrollHeight   → total content height
 *
 * If the viewport is at bottom:
 *
 *   scrollTop + clientHeight ≈ scrollHeight
 *
 * ASCII diagram:
 *
 *   |----------------------|   <- scrollHeight (content bottom)
 *   |                      |
 *   |                      |
 *   |   visible viewport   |   <- clientHeight
 *   |                      |
 *   |----------------------|
 *   ^
 *   scrollTop
 *
 * Due to subpixel rounding and layout jitter,
 * we allow a tolerance of 5px.
 */
test("machineOwned auto-scrolls on append", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  // Grow content beyond viewport height
  await appendTurns(page, 8);

  // Machine should retain ownership
  await expect.poll(() => getOwner(page)).toBe("machineOwned");

  // Verify physical scroll invariant
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const el = document.querySelector(
          "[data-testid='scroll-viewport']",
        ) as HTMLElement;

        const bottomEdge = el.scrollTop + el.clientHeight;
        const contentBottom = el.scrollHeight;

        // Allow 5px tolerance for layout rounding
        return bottomEdge >= contentBottom - 5;
      }),
    )
    .toBeTruthy();
});

/* ------------------------------------------------------------
   Manual Scroll Behavior
------------------------------------------------------------ */

/**
 * If the user scrolls upward:
 *
 * - We are no longer at bottom
 * - Ownership must transfer to userOwned
 *
 * This ensures:
 *   machine does not fight the user
 */
test("manual scroll up transitions to userOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);
  await scrollToBottom(page);

  // Simulate user scrolling upward
  await manualScroll(page, -600);

  await expect.poll(() => getOwner(page)).toBe("userOwned");
});

/* ------------------------------------------------------------
   Returning to bottom
------------------------------------------------------------ */

/**
 * If the user scrolls back to bottom:
 *
 * - USER_AT_BOTTOM event should fire
 * - Ownership must return to machineOwned
 *
 * This restores auto-scroll authority.
 */
test("scrolling back to bottom transitions to machineOwned", async ({
  page,
}) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);
  await scrollToBottom(page);
  await manualScroll(page, -600);

  await expect.poll(() => getOwner(page)).toBe("userOwned");

  // Simulate user returning to bottom
  await scrollToBottom(page);

  await expect.poll(() => getOwner(page)).toBe("machineOwned");
});
