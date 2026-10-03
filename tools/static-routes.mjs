import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { LESSON_ROUTES, lessonUrl, robots, sitemap } from "./lesson-routes.mjs";

const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const setMeta = (html, selector, value) =>
  html.replace(
    new RegExp(`(<meta\\s+${selector}\\s+content=")[\\s\\S]*?(")`, "i"),
    (_match, open, close) => `${open}${escapeAttribute(value)}${close}`,
  );

/**
 * Each lesson is a crawlable page in its own right, so the entry document is
 * rewritten per route instead of being copied verbatim. The document title
 * matches the English title the explorer sets at runtime, and the canonical
 * points at this route rather than at the redirecting site root.
 */
const headFor = (index, route) => {
  const url = lessonUrl(route);
  let html = setMeta(index, 'name="description"', route.description);
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/i,
    (_match, open, close) => `${open}${url}${close}`,
  );
  html = setMeta(html, 'property="og:title"', route.title);
  html = setMeta(html, 'property="og:description"', route.description);
  html = setMeta(html, 'property="og:url"', url);
  html = setMeta(html, 'name="twitter:title"', route.title);
  html = setMeta(html, 'name="twitter:description"', route.description);
  return html.replace(
    /(<title>)[\s\S]*?(<\/title>)/i,
    (_match, open, close) => `${open}${escapeAttribute(route.title)}${close}`,
  );
};

const index = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
for (const route of LESSON_ROUTES) {
  const dir = new URL(`../dist/${route.mode}/`, import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL("index.html", dir), headFor(index, route));
}
console.log(
  "Six /gex lesson entry points generated with per-route titles, descriptions and canonicals.",
);

await writeFile(new URL("../dist/robots.txt", import.meta.url), robots());
await writeFile(new URL("../dist/sitemap.xml", import.meta.url), sitemap());
console.log("robots.txt and sitemap.xml generated from the same route table.");

await copyFile(
  new URL("../staticwebapp.config.json", import.meta.url),
  new URL("../dist/staticwebapp.config.json", import.meta.url),
);
await copyFile(
  new URL("../src/data/model-contract.json", import.meta.url),
  new URL("../dist/model-contract.json", import.meta.url),
);
