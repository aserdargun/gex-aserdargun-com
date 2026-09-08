import { cp, mkdir, rm, writeFile } from "node:fs/promises";
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
const release = {
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
