import { test, expect } from "@playwright/test";
import {
  waitForAppReady,
  appendTurns,
  getScrollOwner,
} from "./utils/scrollTestUtils";

/* ============================================================
   Scroll Centering E2E Tests (Instrumented)

   Validates geometric invariant:

   When machineOwned and content is appended,
   the newest block must be vertically centered
   inside the SCROLL VIEWPORT.

   This version logs full layout geometry so we
   can reason numerically instead of guessing.
============================================================ */

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}]`, msg.text());
  });
});

test("machineOwned centers newest block after append", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);

  await expect.poll(() => getScrollOwner(page)).toBe("machineOwned");

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const el = document.querySelector(
          "[data-testid='scroll-viewport']",
        ) as HTMLElement;
        return el.scrollTop;
      });
    })
    .not.toBe(0);

  const geometry = await page.evaluate(() => {
    const viewport = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    const bubbles = Array.from(
      document.querySelectorAll("[data-testid='turn-bubble']"),
    ) as HTMLElement[];

    const spacer = document.querySelector(
      "[data-testid='bottom-spacer']",
    ) as HTMLElement | null;

    const observer = document.querySelector(
      "[data-testid='observer-anchor']",
    ) as HTMLElement | null;

    if (!viewport || bubbles.length === 0) {
      return { error: "Missing viewport or bubbles" };
    }

    const last = bubbles[bubbles.length - 1];

    const bubbleRect = last!.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    const bubbleMid = bubbleRect.top + bubbleRect.height / 2;

    const viewportMid = viewportRect.top + viewport.clientHeight / 2;

    return {
      viewport: {
        clientHeight: viewport.clientHeight,
        scrollHeight: viewport.scrollHeight,
        scrollTop: viewport.scrollTop,
        rectTop: viewportRect.top,
        rectBottom: viewportRect.bottom,
      },
      window: {
        innerHeight: window.innerHeight,
      },
      bubble: {
        top: bubbleRect.top,
        height: bubbleRect.height,
        bottom: bubbleRect.bottom,
        midpoint: bubbleMid,
      },
      computed: {
        viewportMid,
        delta: Math.abs(bubbleMid - viewportMid),
      },
      spacer: spacer
        ? {
            height: spacer.getBoundingClientRect().height,
          }
        : null,
      observer: observer
        ? {
            top: observer.getBoundingClientRect().top,
          }
        : null,
      bubbleCount: bubbles.length,
    };
  });

  console.log("\n===== GEOMETRY SNAPSHOT =====");
  console.log(JSON.stringify(geometry, null, 2));
  console.log("================================\n");

  if ((geometry as any).error) {
    throw new Error((geometry as any).error);
  }

  expect((geometry as any).computed.delta).toBeLessThan(8);
});
