import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const output = new URL("../azure-artifact/", import.meta.url);
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
for (const mode of ["anatomy", "sm", "kernel", "warp", "memory", "tensor"]) {
  const html = await readFile(
    new URL(`gex/${mode}/index.html`, output),
    "utf8",
  );
  assert.match(html, /GEX/);
  for (const [, path] of html.matchAll(/(?:src|href)="(\/gex\/[^"?#]+)"/g)) {
    await readFile(new URL(path.slice(1), output));
  }
  assert.ok(
    config.routes.some(
      (r) =>
        r.route === `/gex/${mode}` && r.rewrite === `/gex/${mode}/index.html`,
    ),
  );
}
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
  "Azure artifact verified: six routes, entry assets, GLBs, CUDA examples, MIME, model versions, file hashes and release identity.",
);
