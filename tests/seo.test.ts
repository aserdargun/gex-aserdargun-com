import { describe, expect, it } from "vitest";
import { lessons } from "../src/data/lessons";
import type { Mode } from "../src/data/types";
import seo from "../src/data/lesson-routes.json";

/**
 * The generated robots.txt, sitemap.xml and per-lesson <head> are asserted
 * against the shipped artifact in tools/verify-azure.mjs. This suite guards the
 * copy itself, so the SEO data cannot drift away from the lesson it describes.
 */
const byMode = new Map(seo.lessons.map((route) => [route.mode, route]));

describe("public SEO surface", () => {
  it("covers every lesson exactly once, in the order the lessons are authored", () => {
    expect([...byMode.keys()]).toEqual(Object.keys(lessons));
    expect(byMode.size).toBe(Object.keys(lessons).length);
  });

  it.each(Object.keys(lessons) as Mode[])(
    "reuses the %s lesson's own English name and summary",
    (mode) => {
      const route = byMode.get(mode);
      const lesson = lessons[mode];
      expect(route).toBeDefined();
      // The served title must equal the title the explorer sets at runtime, so
      // a direct visit does not see the document title change after hydration.
      expect(route!.title).toBe(`${lesson.name.en} · GEX`);
      expect(route!.description).toBe(`${lesson.description.en} ${seo.disclaimer}`);
      // Long enough to be useful, short enough not to be truncated.
      expect(route!.description.length).toBeGreaterThanOrEqual(150);
      expect(route!.description.length).toBeLessThanOrEqual(160);
    },
  );

  it("canonicalises each lesson to its own route, never to the redirecting root", () => {
    for (const route of seo.lessons) {
      expect(route.mode).toBe(lessons[route.mode as Mode].id);
    }
    // `/` 302-redirects to the default lesson, so it is not a canonical URL.
    const locs = seo.lessons.map((route) => `${seo.origin}/gex/${route.mode}`);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).not.toContain(`${seo.origin}/`);
    expect(locs[0]).toBe(`${seo.origin}/gex/anatomy`);
  });

  it("records no per-lesson content date the repository has not verified", () => {
    const serialized = JSON.stringify(seo);
    expect(serialized).not.toMatch(/lastmod|changefreq|priority|updated/i);
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
