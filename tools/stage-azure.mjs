import { cp, mkdir, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const output = new URL("../azure-artifact/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(
  new URL("../dist/index.html", import.meta.url),
  new URL("index.html", output),
);
await cp(new URL("../dist/", import.meta.url), new URL("gex/", output), {
  recursive: true,
});
await cp(
  new URL("../staticwebapp.config.json", import.meta.url),
  new URL("staticwebapp.config.json", output),
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = {};
async function inventory(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      await inventory(new URL(`${entry.name}/`, dir), `${path}/`);
    else files[path] = sha256(await readFile(new URL(entry.name, dir)));
  }
}
await inventory(output);
const release = {
  schemaVersion: "1.1.0",
  modelVersions: JSON.parse(
    await readFile(new URL("gex/model-contract.json", output), "utf8"),
  ).versions,
  sourceTreeDirty: !!execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=normal"],
    { encoding: "utf8" },
  ).trim(),
  files,
  repository: "aserdargun/gex-aserdargun-com",
  commit:
    process.env.GITHUB_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  builtAt: new Date().toISOString(),
};
for (const path of ["release.json", "gex/release.json"]) {
  await writeFile(
    new URL(path, output),
    JSON.stringify(release, null, 2) + "\n",
  );
}
console.log(`Azure artifact staged for ${release.commit}.`);
