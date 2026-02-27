import { test, expect } from "@playwright/test";
import {
  waitForAppReady,
  appendTurns,
  getScrollOwner,
} from "./utils/scrollTestUtils";

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}]`, msg.text());
  });
});

test("machineOwned ensures last bubble is fully visible", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);

  await expect.poll(() => getScrollOwner(page)).toBe("machineOwned");

  // 🔥 Wait until scroll is actually at bottom
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const viewport = document.querySelector(
          '[data-testid="scroll-viewport"]',
        ) as HTMLElement;

        return Math.abs(
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight,
        );
      });
    })
    .toBeLessThan(5);

  const visibility = await page.evaluate(() => {
    const viewport = document.querySelector(
      '[data-testid="scroll-viewport"]',
    ) as HTMLElement;

    const bubbles = document.querySelectorAll('[data-testid="turn-bubble"]');

    const last = bubbles[bubbles.length - 1] as HTMLElement;

    const viewportRect = viewport.getBoundingClientRect();
    const bubbleRect = last.getBoundingClientRect();

    return {
      viewport: {
        top: viewportRect.top,
        bottom: viewportRect.bottom,
      },
      bubble: {
        top: bubbleRect.top,
        bottom: bubbleRect.bottom,
      },
      fullyVisible:
        bubbleRect.top >= viewportRect.top &&
        bubbleRect.bottom <= viewportRect.bottom,
    };
  });

  console.log("\n===== VISIBILITY SNAPSHOT =====");
  console.log(JSON.stringify(visibility, null, 2));
  console.log("================================\n");

  expect(visibility.fullyVisible).toBe(true);
});
