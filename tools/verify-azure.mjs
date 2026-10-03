import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  LESSON_ROUTES,
  SITEMAP_URL,
  lessonUrl,
  robots,
  sitemap,
} from "./lesson-routes.mjs";

const output = new URL("../azure-artifact/", import.meta.url);

/** A referenced /gex path is either a shipped file or a rewritten route directory. */
async function assertResolvable(path) {
  const target = new URL(path, output);
  if ((await stat(target)).isDirectory()) await readFile(new URL("index.html", target));
}

const attribute = (html, pattern) => html.match(pattern)?.[1];
assert.match(await readFile(new URL("index.html", output), "utf8"), /GEX/);
const config = JSON.parse(
  await readFile(new URL("staticwebapp.config.json", output), "utf8"),
);
const release = JSON.parse(
  await readFile(new URL("release.json", output), "utf8"),
);
assert.deepEqual(
  config,
  JSON.parse(
    await readFile(
      new URL("../staticwebapp.config.json", import.meta.url),
      "utf8",
    ),
  ),
  "Azure route/config drift",
);
const contract = JSON.parse(
  await readFile(
    new URL("../src/data/model-contract.json", import.meta.url),
    "utf8",
  ),
);
assert.deepEqual(
  JSON.parse(
    await readFile(new URL("gex/model-contract.json", output), "utf8"),
  ),
  contract,
  "Model contract drift",
);
assert.deepEqual(release.modelVersions, contract.versions);
assert.equal(release.schemaVersion, "1.1.0");
assert.equal(typeof release.sourceTreeDirty, "boolean");
for (const key of [
  "behavior",
  "experiment",
  "world",
  "simulation",
  "metric",
  "export",
])
  assert.match(contract.versions[key], /^\d+\.\d+\.\d+$/);
assert.ok(
  Object.keys(release.files).length > 10,
  "Release inventory is missing",
);
for (const [path, hash] of Object.entries(release.files)) {
  assert.ok(
    !path.startsWith("/") && !path.split("/").includes(".."),
    "Invalid release inventory path",
  );
  assert.equal(
    createHash("sha256")
      .update(await readFile(new URL(path, output)))
      .digest("hex"),
    hash,
    `Artifact drift: ${path}`,
  );
}
assert.match(release.commit, /^[0-9a-f]{40}$/);
assert.equal(release.repository, "aserdargun/gex-aserdargun-com");
assert.equal(config.mimeTypes[".glb"], "model/gltf-binary");
assert.equal(config.mimeTypes[".cu"], "text/plain");
const normalizedRoutes = config.routes.map(
  (r) => r.route.replace(/\/+$/, "") || "/",
);
assert.equal(
  new Set(normalizedRoutes).size,
  normalizedRoutes.length,
  "Azure treats trailing-slash routes as duplicates",
);
for (const route of LESSON_ROUTES) {
  const html = await readFile(
    new URL(`gex/${route.mode}/index.html`, output),
    "utf8",
  );
  assert.match(html, /GEX/);
  for (const [, path] of html.matchAll(/(?:src|href)="(\/gex\/[^"?#]+)"/g)) {
    await assertResolvable(path.slice(1));
  }
  assert.ok(
    config.routes.some(
      (r) => r.route === route.path && r.rewrite === `${route.path}/index.html`,
    ),
  );
  // Every lesson is its own indexable page: the canonical, the social URL and
  // the served title all name this route, never the redirecting site root.
  const url = lessonUrl(route);
  assert.equal(
    attribute(html, /<link\s+rel="canonical"\s+href="([^"]+)"/),
    url,
    `Canonical drift for ${route.mode}`,
  );
  assert.equal(
    attribute(html, /<meta\s+property="og:url"\s+content="([^"]+)"/),
    url,
    `og:url drift for ${route.mode}`,
  );
  assert.equal(
    attribute(html, /<title>([^<]*)<\/title>/),
    route.title,
    `Title drift for ${route.mode}`,
  );
  assert.equal(
    attribute(html, /<meta\s+name="description"\s+content="([^"]*)"/),
    route.description,
    `Description drift for ${route.mode}`,
  );
  assert.equal(
    attribute(html, /<meta\s+property="og:description"\s+content="([^"]*)"/),
    route.description,
    `og:description drift for ${route.mode}`,
  );
  assert.ok(
    !html.includes('href="https://gex.aserdargun.com/"'),
    `${route.mode} still advertises the redirecting site root as canonical`,
  );
}

// The crawl surface ships at the site root and under /gex.
const expected = { "sitemap.xml": sitemap(), "robots.txt": robots() };
for (const [file, body] of Object.entries(expected)) {
  for (const base of ["", "gex/"]) {
    assert.equal(
      await readFile(new URL(`${base}${file}`, output), "utf8"),
      body,
      `${base}${file} drift`,
    );
    assert.ok(
      release.files[`${base}${file}`],
      `${base}${file} is missing from the release inventory`,
    );
  }
}
assert.deepEqual(
  [...sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc),
  LESSON_ROUTES.map(lessonUrl),
  "The sitemap must list exactly the six canonical lesson URLs",
);
assert.ok(
  !/lastmod|changefreq|priority/.test(sitemap()),
  "No per-lesson content date is verified, so none may be asserted",
);
assert.ok(robots().includes(SITEMAP_URL), "robots.txt must name the sitemap");
for (const file of ["gex-gpu.glb", "gex-sm.glb"]) {
  const data = await readFile(new URL(`gex/models/${file}`, output));
  assert.equal(data.subarray(0, 4).toString(), "glTF");
}
for (const file of [
  "vector-add.cu",
  "branch-masks.cu",
  "memory-patterns.cu",
  "tiled-gemm.cu",
]) {
  assert.match(
    await readFile(new URL(`gex/examples/${file}`, output), "utf8"),
    /__global__/,
  );
}
console.log(
  "Azure artifact verified: six routes, per-route canonical titles, robots/sitemap, entry assets, GLBs, CUDA examples, MIME, model versions, file hashes and release identity.",
);
