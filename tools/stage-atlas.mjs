import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
const root = new URL("../atlas-artifact/", import.meta.url);
await mkdir(root, { recursive: true });
await cp(new URL("../dist/", import.meta.url), new URL("gex/", root), {
  recursive: true,
});
const manifest = JSON.parse(
  await readFile(
    new URL("../public/models/manifest.json", import.meta.url),
    "utf8",
  ),
);
await writeFile(
  new URL("gex-build.json", root),
  JSON.stringify(
    {
      app: "GEX",
      mount: "/gex",
      routes: ["anatomy", "sm", "kernel", "warp", "memory", "tensor"],
      models: manifest.files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Atlas artifact ready: atlas-artifact/gex/. Merge into the Atlas out/ artifact before publication.",
);
