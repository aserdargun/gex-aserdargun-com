import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * AGENTS.md asks contributors to verify `npm run validate:codex`, and says a
 * run whose Azure routes or versioned configs drift must be rejected. The gate
 * that can actually reject those is `build:azure`: it stages the artifact and
 * runs tools/verify-azure.mjs against it. `validate:codex` used to call the
 * plain `build` instead, so following the documented instruction verified a
 * dist/ that is never deployed — the Azure artifact was never checked at all.
 *
 * Nothing asserted the workflow either. This suite binds both: the local gate
 * to the Azure gate, and the workflow to the steps it is supposed to run, so a
 * later edit cannot quietly downgrade either one.
 */

const workflow = readFileSync(
  ".github/workflows/deploy-swa-gex-aserdargun-com.yml",
  "utf8",
);
const runSteps = [...workflow.matchAll(/^\s*-\s*run:\s*(.+)$/gm)].map((m) =>
  m[1].trim().replace(/^["']|["']$/g, ""),
);
const project = JSON.parse(readFileSync("package.json", "utf8"));

describe("the gate contributors are told to run", () => {
  it("verifies the Azure artifact rather than a directory nothing deploys", () => {
    expect(project.scripts["build:azure"]).toContain("tools/verify-azure.mjs");
    expect(project.scripts["validate:codex"]).toContain("npm run build:azure");
    // The plain build neither stages nor verifies, so it must not be the gate.
    expect(project.scripts["validate:codex"]).not.toMatch(/npm run build &&/);
  });

  it("keeps the other four checks the contract also requires", () => {
    for (const step of [
      "npm run lint",
      "npm test",
      "npm run test:e2e",
      "git diff --check",
    ])
      expect(project.scripts["validate:codex"]).toContain(step);
  });
});

describe("the deployed workflow", () => {
  it("runs the same gate it asks contributors to run locally", () => {
    // A divergence here is how a green local run becomes a broken deploy.
    expect(runSteps).toEqual([
      "npm ci --legacy-peer-deps",
      "npx playwright install --with-deps chromium",
      "npm run lint",
      "npm test",
      "npm run build:azure",
      "npm run test:e2e",
      "git diff --check",
    ]);
  });

  it("never drops the Azure verification from the deploy path", () => {
    // The single most valuable assertion here: without this, a well-meaning
    // edit could replace build:azure with build and every gate would stay
    // green while the deployed artifact went unverified.
    expect(runSteps).toContain("npm run build:azure");
    expect(runSteps.some((s) => /^npm run build$/.test(s))).toBe(false);
  });
});