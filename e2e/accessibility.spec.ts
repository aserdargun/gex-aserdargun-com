import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility contract for the GEX explorer.
 *
 * The README claims a text-view fallback that needs no WebGL, reduced-motion
 * handling, and arrow-key step navigation. These specs assert those claims
 * against the rendered application rather than against the stylesheet.
 *
 * Scene numbers stay in the educational execution model: nothing here asserts
 * a measurement, a profiler trace or real hardware behaviour.
 */

const modes = [
  "anatomy",
  "sm",
  "kernel",
  "warp",
  "memory",
  "tensor",
] as const;
const locales = ["en", "tr"] as const;
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function open(page: Page, mode: string, locale: string) {
  await page.goto(`/gex/${mode}?lang=${locale}`);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.getByTestId("scene-status")).not.toHaveText(/loading/, {
    timeout: 20_000,
  });
}

async function wcagViolations(page: Page) {
  const scan = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  return scan.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));
}

test.describe("automated accessibility", () => {
  for (const locale of locales) {
    test(`every lesson has an accessible name and zero WCAG A/AA violations: ${locale}`, async ({
      page,
    }) => {
      for (const mode of modes) {
        await open(page, mode, locale);
        expect(await wcagViolations(page), `mode ${mode}`).toEqual([]);
        // The WebGL surface must be announced, not silent.
        await expect(page.locator("canvas")).toHaveAttribute("aria-label", /.+/, {
          timeout: 20_000,
        });
      }
    });
  }

  test("interactive text view is readable and violation-free at both viewports", async ({
    page,
  }) => {
    for (const locale of locales) {
      await open(page, "anatomy", locale);
      const toggle = page.getByRole("button", {
        name: locale === "tr" ? "Metin görünümünü aç/kapat" : "Toggle text view",
        exact: true,
      });
      await toggle.click();
      const textView = page.locator(".text-view");
      await expect(textView).toBeVisible();
      await expect(textView).not.toBeEmpty();
      await expect(textView.getByRole("heading", { level: 3 })).toBeVisible();
      // The same numerical state is exposed without WebGL.
      await expect(page.locator(".component-list button").first()).toBeVisible();
      expect(await wcagViolations(page), `locale ${locale}`).toEqual([]);
    }
  });
});

test("the documented text-view fallback stays usable when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
      if (String(args[0]).includes("webgl")) return null;
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    };
  });
  await page.goto("/gex/anatomy?lang=en");
  // The app must not depend on a live WebGL context to expose its content.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "GPU Execution Explorer",
  );
  const toggle = page.getByRole("button", { name: "Toggle text view", exact: true });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const textView = page.locator(".text-view");
  await expect(textView).toBeVisible();
  await expect(textView).toContainText("INTERACTIVE TEXT VIEW");
  await expect(textView.getByRole("button")).not.toHaveCount(0);
  expect(await wcagViolations(page)).toEqual([]);
});

test("a lost WebGL context surfaces the text view and the announced unavailable state", async ({
  page,
}) => {
  await open(page, "anatomy", "en");
  await expect(page.getByTestId("scene-status")).toHaveText("3D ready");
  await page.evaluate(() => {
    document
      .querySelector("canvas")!
      .dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  });
  await expect(page.getByTestId("scene-status")).toHaveText("3D unavailable");
  const fallback = page.locator(".scene-fallback");
  await expect(fallback).toContainText("3D is unavailable");
  await expect(fallback.locator(".text-view")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload the 3D view" })).toBeVisible();
  expect(await wcagViolations(page)).toEqual([]);
});

test("reduced motion removes transitions and stops animated playback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "kernel", "en");
  const transitions = await page.locator("body *").evaluateAll((nodes) =>
    nodes
      .map((node) => getComputedStyle(node))
      .filter((style) => style.transitionDuration.split(",").some((d) => parseFloat(d) > 0))
      .length,
  );
  expect(transitions).toBe(0);
  const animations = await page.locator("body *").evaluateAll((nodes) =>
    nodes.filter((node) => getComputedStyle(node).animationName !== "none").length,
  );
  expect(animations).toBe(0);
  // Reduced motion must not auto-start the timed event playback.
  // The call-to-action only renders outside a lesson at narrow widths.
  await open(page, "anatomy", "en");
  await page.getByRole("button", { name: "Follow a kernel" }).click();
  await expect(page).toHaveURL(/\/gex\/kernel/);
  await expect(page.locator(".play-button")).toHaveAttribute("aria-label", "Play");
  await page.waitForTimeout(3200);
  await expect(page.locator(".play-button")).toHaveAttribute("aria-label", "Play");
  expect(await wcagViolations(page)).toEqual([]);
});

test("the skip link, lesson navigation and step controls work with the keyboard alone", async ({
  page,
  }) => {
    await open(page, "anatomy", "en");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#gex-main$/);

    // Primary navigation: the lesson list is reachable and activates by Enter.
    // Narrow viewports replace the sidebar list with the labelled lesson select.
    const narrow = (page.viewportSize()?.width ?? 1440) <= 800;
    if (narrow) {
      const select = page.getByRole("combobox", { name: "Choose lesson" });
      await select.focus();
      await select.selectOption("sm");
      await expect(page).toHaveURL(/\/gex\/sm/);
    } else {
      const lessons = page.getByRole("navigation", { name: "GEX lessons" });
      await lessons.getByRole("link", { name: /Inside an SM/ }).focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/gex\/sm/);
      await expect(
        lessons.getByRole("link", { name: /Inside an SM/ }),
      ).toHaveAttribute("aria-current", "page");
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Step navigation: focus the scene and use only arrow keys.
    const viewport = page.locator(".viewport[role='group']");
    await viewport.focus();
    await expect(viewport).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".scale-path b")).not.toHaveText("");
    const forward = await page.locator(".scale-path b").innerText();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".scale-path b")).not.toHaveText(forward);
  });

test("playback controls are operable by keyboard and announce their state", async ({
  page,
  }) => {
    await open(page, "kernel", "en");
    const play = page.locator(".play-button");
    await play.focus();
    await page.keyboard.press("Enter");
    await expect(play).toHaveAttribute("aria-label", "Pause");
    await page.keyboard.press("Enter");
    await expect(play).toHaveAttribute("aria-label", "Play");
    const next = page.getByRole("button", { name: "Next event", exact: true });
    await next.focus();
    const before = await page.locator(".scale-path b").innerText();
    await page.keyboard.press("Enter");
    await expect(page.locator(".scale-path b")).not.toHaveText(before);
  });
