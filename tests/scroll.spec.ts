import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Turn } from "../shared/schemas";

function turn(i: number): Turn {
  return {
    speaker: i % 2 === 0 ? "security_engineer" : "application_engineer",
    mdx: `Turn ${i}\n\n` + "word ".repeat(200),
  };
}

async function appendTurns(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.evaluate((payload: Turn) => {
      (window as any).__socratic?.emit("APPEND_TURN", payload);
    }, turn(i));
  }
}

async function dumpScrollState(page: Page, label: string) {
  const state = await page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='scroll-viewport']",
    ) as HTMLElement;

    return {
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 5,
      owner: el.getAttribute("data-scroll-owner"),
    };
  });

  console.log(`\n[${label}]`, state);
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
  await dumpScrollState(page, "fresh load");

  const owner = await page
    .getByTestId("scroll-viewport")
    .getAttribute("data-scroll-owner");

  expect(owner).toBe("machineOwned");
});

/* ------------------------------------------------------------
   Auto-scroll behavior
------------------------------------------------------------ */

test("machineOwned auto-scrolls on append", async ({ page }) => {
  await page.goto("/");

  await appendTurns(page, 8);

  await expect
    .poll(async () =>
      page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner"),
    )
    .toBe("machineOwned");

  await dumpScrollState(page, "after append");

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

  await dumpScrollState(page, "after auto-scroll settle");
});

test("machineOwned stays machineOwned when appending", async ({ page }) => {
  await page.goto("/");

  await appendTurns(page, 8);
  await appendTurns(page, 1);

  await dumpScrollState(page, "after second append");

  const owner = await page
    .getByTestId("scroll-viewport")
    .getAttribute("data-scroll-owner");

  expect(owner).toBe("machineOwned");
});

/* ------------------------------------------------------------
   Manual Scroll Behavior
------------------------------------------------------------ */

test("manual scroll up transitions to userOwned", async ({ page }) => {
  await page.goto("/");

  await appendTurns(page, 8);

  // Ensure starting at bottom
  await scrollToBottom(page);

  await manualScroll(page, -600);

  await dumpScrollState(page, "after manual scroll up");

  await expect
    .poll(async () =>
      page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner"),
    )
    .toBe("userOwned");

  await dumpScrollState(page, "after ownership transition");
});

test("userOwned remains userOwned when appending", async ({ page }) => {
  await page.goto("/");

  await appendTurns(page, 8);

  await scrollToBottom(page);
  await manualScroll(page, -600);

  await expect
    .poll(async () =>
      page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner"),
    )
    .toBe("userOwned");

  await appendTurns(page, 1);

  await dumpScrollState(page, "after append while userOwned");

  const owner = await page
    .getByTestId("scroll-viewport")
    .getAttribute("data-scroll-owner");

  expect(owner).toBe("userOwned");
});

/* ------------------------------------------------------------
   Returning to bottom
------------------------------------------------------------ */

test("scrolling back to bottom transitions to machineOwned", async ({
  page,
}) => {
  await page.goto("/");

  await appendTurns(page, 8);

  await scrollToBottom(page);
  await manualScroll(page, -600);

  await expect
    .poll(async () =>
      page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner"),
    )
    .toBe("userOwned");

  await dumpScrollState(page, "after scroll up");

  await scrollToBottom(page);

  await dumpScrollState(page, "after scroll to bottom");

  await expect
    .poll(async () =>
      page.getByTestId("scroll-viewport").getAttribute("data-scroll-owner"),
    )
    .toBe("machineOwned");

  await dumpScrollState(page, "final state");
});
