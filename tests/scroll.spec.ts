import { test, expect } from "@playwright/test";
import {
  waitForAppReady,
  appendTurns,
  manualScroll,
  scrollToBottom,
  getScrollOwner,
  isPhysicallyAtBottom,
} from "./utils/scrollTestUtils";

/* ============================================================
   Scroll Ownership E2E Tests

   These tests validate two layers simultaneously:

   1) Control Plane (XState)
      - machineOwned vs userOwned
      - USER_SCROLLED_UP / USER_AT_BOTTOM transitions

   2) Physical Scroll Geometry
      - Whether the viewport is actually at bottom
      - Whether auto-scroll truly occurred

   IMPORTANT:
   We are NOT asserting internal machine snapshots.
   We assert via DOM attributes + rendered geometry.

   The test utilities abstract DOM mechanics so this
   file reads like a specification of invariants.
============================================================ */

/* ------------------------------------------------------------
   Console passthrough (useful during debugging)
------------------------------------------------------------ */

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}]`, msg.text());
  });
});

/* ------------------------------------------------------------
   Fresh State Invariant
------------------------------------------------------------ */

/**
 * On first load:
 *
 * - No content overflow yet.
 * - Scroll position is naturally at top.
 * - But since top === bottom (no overflow),
 *   machine should own scroll.
 *
 * This validates:
 * - Initial scroll region state
 * - Machine/DOM integration
 */
test("fresh load starts machineOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  const owner = await getScrollOwner(page);
  expect(owner).toBe("machineOwned");
});

/* ------------------------------------------------------------
   Auto-scroll Invariant
------------------------------------------------------------ */

/**
 * Core invariant:
 *
 * When machineOwned and content is appended,
 * the viewport must automatically scroll to bottom.
 *
 * We validate BOTH:
 *   1) Ownership state remains machineOwned
 *   2) Physical geometry reflects bottom alignment
 *
 * Geometry Definition:
 *
 *   scrollTop      → distance from top
 *   clientHeight   → viewport height
 *   scrollHeight   → total content height
 *
 * Bottom condition:
 *
 *   scrollTop + clientHeight ≈ scrollHeight
 *
 * Tolerance: 5px (subpixel rounding, layout jitter)
 */
test("machineOwned auto-scrolls on append", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  // Grow content beyond viewport height
  await appendTurns(page, 8);

  // Machine should retain ownership
  await expect.poll(() => getScrollOwner(page)).toBe("machineOwned");

  // Verify physical scroll invariant
  await expect.poll(() => isPhysicallyAtBottom(page)).toBeTruthy();
});

/* ------------------------------------------------------------
   Manual Scroll → userOwned
------------------------------------------------------------ */

/**
 * If the user scrolls upward:
 *
 * - We are no longer at bottom
 * - Ownership must transfer to userOwned
 *
 * This ensures:
 *   The machine does not fight user scroll input.
 */
test("manual scroll up transitions to userOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);
  await scrollToBottom(page);

  // Simulate user scrolling upward
  await manualScroll(page, -600);

  await expect.poll(() => getScrollOwner(page)).toBe("userOwned");
});

/* ------------------------------------------------------------
   Return to Bottom → machineOwned
------------------------------------------------------------ */

/**
 * If the user scrolls back to bottom:
 *
 * - USER_AT_BOTTOM should fire
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

  await expect.poll(() => getScrollOwner(page)).toBe("userOwned");

  // Simulate user returning to bottom
  await scrollToBottom(page);

  await expect.poll(() => getScrollOwner(page)).toBe("machineOwned");
});

/* ------------------------------------------------------------
   userOwned Must Block Auto-scroll
------------------------------------------------------------ */

/**
 * Critical invariant:
 *
 * If the user has scrolled up (userOwned),
 * appending new content must NOT auto-scroll.
 *
 * We validate BOTH:
 *   1) Ownership remains userOwned
 *   2) Physical geometry is NOT at bottom
 *
 * This ensures the machine never overrides
 * explicit user intent.
 */
test("userOwned prevents auto-scroll on append", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  // Grow content
  await appendTurns(page, 8);
  await scrollToBottom(page);

  // User scrolls up
  await manualScroll(page, -600);

  await expect.poll(() => getScrollOwner(page)).toBe("userOwned");

  // Sanity check: we are not at bottom
  expect(await isPhysicallyAtBottom(page)).toBeFalsy();

  // Append new content while userOwned
  await appendTurns(page, 1);

  // Ownership must remain userOwned
  await expect.poll(() => getScrollOwner(page)).toBe("userOwned");

  // The viewport must NOT snap to bottom
  await expect.poll(() => isPhysicallyAtBottom(page)).toBeFalsy();
});
