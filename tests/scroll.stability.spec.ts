import { test, expect, type Page } from "@playwright/test";
import {
  waitForAppReady,
  appendTurns,
  getScrollOwner,
  isPhysicallyAtBottom,
} from "./utils/scrollTestUtils";

/* ============================================================
   Types
============================================================ */

type Sample = {
  scrollTop: number;
  scrollHeight: number;
  owner: string | null;
  intensity: number;
};

/* ============================================================
   Frame Sampler (Deterministic)
============================================================ */

async function sampleFrames(
  page: Page,
  frames: number = 100,
  intervalMs: number = 10,
): Promise<Sample[]> {
  return page.evaluate(
    async ({ frameCount, interval }) => {
      const el = document.querySelector(
        "[data-testid='scroll-viewport']",
      ) as HTMLElement | null;

      const grad = document.querySelector(
        "[data-testid='background-gradient']",
      ) as HTMLElement | null;

      if (!el) throw new Error("scroll-viewport not found");
      if (!grad) throw new Error("background-gradient not found");

      const samples: Sample[] = [];

      for (let i = 0; i < frameCount; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, interval));

        samples.push({
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          owner: el.getAttribute("data-scroll-owner"),
          intensity: parseFloat(grad.getAttribute("data-intensity") ?? "0"),
        });
      }

      return samples;
    },
    { frameCount: frames, interval: intervalMs },
  );
}

/* ============================================================
   1️⃣ Scroll Monotonicity
============================================================ */

test("auto-scroll is monotonic", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await appendTurns(page, 6);

  const samples = await sampleFrames(page);

  expect(samples.length).toBeGreaterThan(1);

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    const curr = samples[i]!;

    expect(curr.scrollTop).toBeGreaterThanOrEqual(prev.scrollTop - 2);
  }
});

/* ============================================================
   2️⃣ Ownership Stability
============================================================ */

test("machine ownership does not flip during auto-follow", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await appendTurns(page, 6);

  const samples = await sampleFrames(page);

  const owners = new Set(samples.map((s) => s.owner));
  expect(owners).toEqual(new Set(["machineOwned"]));
});

/* ============================================================
   3️⃣ Gradient Stability
============================================================ */

test("gradient does not flicker off during auto-follow", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await appendTurns(page, 6);

  const samples = await sampleFrames(page);

  const intensities = samples.map((s) => s.intensity);

  const min = Math.min(...intensities);
  const max = Math.max(...intensities);

  expect(max).toBeGreaterThan(0.05);
  expect(min).toBeGreaterThan(0);
});

/* ============================================================
   4️⃣ Layout Stabilization
============================================================ */

test("scrollHeight stabilizes quickly", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await appendTurns(page, 6);

  const samples = await sampleFrames(page);

  let heightChanges = 0;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    const curr = samples[i]!;

    if (Math.abs(curr.scrollHeight - prev.scrollHeight) > 5) {
      heightChanges++;
    }
  }

  expect(heightChanges).toBeLessThan(3);
});

/* ============================================================
   5️⃣ End State Contract
============================================================ */

test("auto-follow ends at bottom and machineOwned", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await appendTurns(page, 6);

  await expect.poll(() => isPhysicallyAtBottom(page)).toBeTruthy();
  await expect.poll(() => getScrollOwner(page)).toBe("machineOwned");
});
