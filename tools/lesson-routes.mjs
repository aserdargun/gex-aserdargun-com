import { readFileSync } from "node:fs";

/**
 * Canonical public route table for the six GEX lessons.
 *
 * The data lives in src/data/lesson-routes.json so the SEO contract test can
 * type-check it against src/data/lessons.ts; this module only derives the
 * build-time shapes used by tools/static-routes.mjs and tools/stage-azure.mjs.
 *
 * Titles mirror the English `document.title` the explorer sets at runtime
 * (src/lib/useExplorer.ts) and each description reuses that lesson's own
 * English summary plus the site-wide disclaimer, so a shared or direct visit
 * never shows a document title that then changes under the reader.
 *
 * No `lastmod`, `changefreq` or publication date is emitted: this repository
 * records no verified content date per lesson, and a date is never invented to
 * fill a sitemap field.
 */
const spec = JSON.parse(
  readFileSync(new URL("../src/data/lesson-routes.json", import.meta.url), "utf8"),
);

export const SITE_ORIGIN = spec.origin;
export const DISCLAIMER = spec.disclaimer;

export const LESSON_ROUTES = spec.lessons.map((route) => ({
  ...route,
  path: `/gex/${route.mode}`,
}));

/** The lesson the bare `/` redirect and the shell document resolve to. */
export const DEFAULT_ROUTE = LESSON_ROUTES[0];

export const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
export const lessonUrl = (route) => `${SITE_ORIGIN}${route.path}`;

/** `/sitemap.xml` lists exactly the six canonical lesson URLs. */
export const sitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  LESSON_ROUTES.map(
    (route) => `  <url>\n    <loc>${lessonUrl(route)}</loc>\n  </url>`,
  ).join("\n") +
  `\n</urlset>\n`;

/** Every public path is crawlable; the one authority is the sitemap above. */
export const robots = () =>
  `User-agent: *\nAllow: /\n\nSitemap: ${SITEMAP_URL}\n`;
