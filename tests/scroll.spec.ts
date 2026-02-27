import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Turn } from "../shared/schemas";

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */

function turn(i: number): Turn {
  return {
    speaker: i % 2 === 0 ? "security_engineer" : "application_engineer",
    mdx: `Turn ${i}\n\n` + "word ".repeat(200),
  };
}

async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => !!window.__socratic);
  await page.waitForSelector("[data-testid='scroll-viewport']");
}

async function appendTurns(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.evaluate((payload: Turn) => {
      window.__socratic?.emit("APPEND_TURN", payload);
    }, turn(i));
  }
}

async function manualScroll(page: Page, delta: number) {
  await page.evaluate((amount) => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    el.scrollTop += amount;
    el.dispatchEvent(new Event("scroll"));
  }, delta);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });
}

async function getOwner(page: Page) {
  return page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner");
}

/* ------------------------------------------------------------
   Console passthrough
------------------------------------------------------------ */

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}]`, msg.text());
  });
});

/* ------------------------------------------------------------
   Fresh State
------------------------------------------------------------ */

test("fresh load starts machineOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  const owner = await getOwner(page);
  expect(owner).toBe("machineOwned");
});

/* ------------------------------------------------------------
   Auto-scroll behavior
------------------------------------------------------------ */

test("machineOwned auto-scrolls on append", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);

  await expect.poll(() => getOwner(page)).toBe("machineOwned");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const el = document.querySelector(
          "[data-testid='scroll-viewport']",
        ) as HTMLElement;
        return el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
      }),
    )
    .toBeTruthy();
});

/* ------------------------------------------------------------
   Manual Scroll Behavior
------------------------------------------------------------ */

test("manual scroll up transitions to userOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);
  await scrollToBottom(page);
  await manualScroll(page, -600);

  await expect.poll(() => getOwner(page)).toBe("userOwned");
});

/* ------------------------------------------------------------
   Returning to bottom
------------------------------------------------------------ */

test("scrolling back to bottom transitions to machineOwned", async ({
  page,
}) => {
  await page.goto("/");
  await waitForAppReady(page);

  await appendTurns(page, 8);
  await scrollToBottom(page);
  await manualScroll(page, -600);

  await expect.poll(() => getOwner(page)).toBe("userOwned");

  await scrollToBottom(page);

  await expect.poll(() => getOwner(page)).toBe("machineOwned");
});
