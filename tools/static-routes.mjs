import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
const index = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
for (const mode of ["anatomy", "sm", "kernel", "warp", "memory", "tensor"]) {
  const dir = new URL(`../dist/${mode}/`, import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL("index.html", dir), index);
}
console.log("Six /gex lesson entry points generated.");

await copyFile(
  new URL("../staticwebapp.config.json", import.meta.url),
  new URL("../dist/staticwebapp.config.json", import.meta.url),
);
await copyFile(
  new URL("../src/data/model-contract.json", import.meta.url),
  new URL("../dist/model-contract.json", import.meta.url),
);
