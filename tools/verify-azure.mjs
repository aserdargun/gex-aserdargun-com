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
assert.match(release.commit, /^[0-9a-f]{40}$/);
assert.equal(release.repository, "aserdargun/gex-aserdargun-com");
assert.equal(config.mimeTypes[".glb"], "model/gltf-binary");
assert.equal(config.mimeTypes[".cu"], "text/plain");
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
  "Azure artifact verified: six routes, entry assets, GLBs, CUDA examples, MIME and release identity.",
);
