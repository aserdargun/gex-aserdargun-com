import { execFileSync } from "node:child_process";
import { cp, access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (!target)
  throw new Error(
    "Usage: node tools/prepare-atlas.mjs /absolute/path/to/an-isolated-gpu-atlas-checkout",
  );
const root = resolve(target);
const patch = fileURLToPath(
  new URL("../integration/gpu-atlas-gex.patch", import.meta.url),
);
const artifact = fileURLToPath(
  new URL("../atlas-artifact/gex/", import.meta.url),
);
await access(resolve(artifact, "index.html"));
await access(resolve(root, "app/kernel-atlas.tsx"));
const remote = execFileSync(
  "git",
  ["-C", root, "remote", "get-url", "origin"],
  { encoding: "utf8" },
).trim();
if (!/[:/]aserdargun\/gpu-aserdargun-com(?:\.git)?$/.test(remote))
  throw new Error("Target is not the GPU Kernel Atlas repository.");
execFileSync("git", ["-C", root, "apply", "--check", patch], {
  stdio: "inherit",
});
execFileSync("git", ["-C", root, "apply", patch], { stdio: "inherit" });
await cp(artifact, resolve(root, "gex-dist"), { recursive: true });
console.log(
  "Local Atlas integration prepared. Run npm run build:azure in that checkout. Nothing was published.",
);
