import type { Page } from "@playwright/test";
import type { Turn } from "../../shared/schemas";

/* ============================================================
   Scroll Test Utilities

   These helpers are shared across:

   - scroll.spec.ts
   - scroll-centering.spec.ts

   They intentionally abstract DOM plumbing so tests
   read like behavioral specifications instead of
   browser scripting.
============================================================ */

/* ------------------------------------------------------------
   Turn Factory
------------------------------------------------------------ */

/**
 * Creates a tall turn so that scrolling is meaningful.
 *
 * Each turn contains enough repeated text to produce
 * vertical overflow in the scroll container.
 *
 * This guarantees:
 * - scrollHeight > clientHeight
 * - scrolling physics are observable
 */
export function turn(i: number): Turn {
  return {
    speaker: i % 2 === 0 ? "security_engineer" : "application_engineer",
    mdx: `Turn ${i}\n\n` + "word ".repeat(200),
  };
}

/* ------------------------------------------------------------
   App Readiness
------------------------------------------------------------ */

/**
 * Waits until:
 *
 * 1) The test bridge is installed (window.__socratic exists)
 * 2) The scroll viewport is mounted in the DOM
 *
 * This prevents race conditions where:
 * - React has not mounted yet
 * - The machine has not initialized
 */
export async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => !!window.__socratic);
  await page.waitForSelector("[data-testid='scroll-viewport']");
}

/* ------------------------------------------------------------
   Content Growth
------------------------------------------------------------ */

/**
 * Emits APPEND_TURN events through the test bridge.
 *
 * This simulates replay-driven content growth
 * without invoking the actual replay actor timing.
 *
 * We intentionally bypass delay mechanics
 * so tests run deterministically.
 */
export async function appendTurns(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.evaluate((payload: Turn) => {
      window.__socratic?.emit("APPEND_TURN", payload);
    }, turn(i));
  }
}

/* ------------------------------------------------------------
   Manual Scroll Simulation
------------------------------------------------------------ */

/**
 * Simulates a user scroll by:
 *
 * 1) Mutating scrollTop
 * 2) Manually dispatching a scroll event
 *
 * Why dispatch?
 * Because ownership logic listens to the scroll event,
 * not scrollTop mutation alone.
 */
export async function manualScroll(page: Page, delta: number) {
  await page.evaluate((amount) => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    // Simulate real wheel intent
    el.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: amount,
        bubbles: true,
      }),
    );

    // Apply scroll movement
    el.scrollTop += amount;

    el.dispatchEvent(new Event("scroll"));
  }, delta);
}

/**
 * Force scroll to bottom.
 *
 * Used to simulate a user returning control to the machine.
 *
 * Equivalent invariant:
 *   scrollTop + clientHeight ≈ scrollHeight
 */
export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });
}

/* ------------------------------------------------------------
   Ownership Introspection
------------------------------------------------------------ */

/**
 * Reads scroll ownership from DOM attribute.
 *
 * This reflects XState's parallel "scroll" region.
 *
 * We intentionally assert via DOM rather than machine snapshot
 * so tests validate actual UI integration.
 */
export async function getScrollOwner(page: Page) {
  return page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner");
}

/* ------------------------------------------------------------
   Physical Scroll Geometry
------------------------------------------------------------ */

/**
 * Determines whether the viewport is physically at bottom.
 *
 * Geometry:
 *
 *   scrollTop      → distance from top
 *   clientHeight   → viewport height
 *   scrollHeight   → total content height
 *
 * Bottom invariant:
 *
 *   scrollTop + clientHeight ≈ scrollHeight
 *
 * Due to subpixel rounding and layout jitter,
 * we allow a tolerance of 5px.
 */
export async function isPhysicallyAtBottom(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    const bottomEdge = el.scrollTop + el.clientHeight;
    const contentBottom = el.scrollHeight;

    return bottomEdge >= contentBottom - 5;
  });
}

/* ------------------------------------------------------------
   Centering Geometry (New Invariant)
------------------------------------------------------------ */

/**
 * Measures how far the newest bubble midpoint
 * deviates from viewport midpoint.
 *
 * Used to validate centering behavior.
 *
 * Invariant:
 *
 *   abs(bubbleMid - viewportMid) < tolerance
 *
 * ASCII sketch:
 *
 *   | viewport top
 *   |
 *   |     [ last bubble ]
 *   |         *
 *   |         | midpoint
 *   |
 *   |-----------------------
 *          viewport mid
 */
export async function getLastBubbleMidpointDelta(page: Page) {
  return page.evaluate(() => {
    const bubbles = Array.from(
      document.querySelectorAll("[data-testid='turn-bubble']"),
    ) as HTMLElement[];

    if (bubbles.length === 0) return null;

    const last = bubbles[bubbles.length - 1];
    const rect = last!.getBoundingClientRect();

    const bubbleMid = rect.top + rect.height / 2;
    const viewportMid = window.innerHeight / 2;

    return Math.abs(bubbleMid - viewportMid);
  });
}
