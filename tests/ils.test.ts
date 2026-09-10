import { describe, it, expect } from "vitest";
import {
  validateManifest,
  validateExperiment,
  validateLesson,
  validateCatalog,
  learningLink,
} from "@aserdargun/lab-core";
import { manifest, experiments, guidedLesson } from "../src/ils/catalog";
import concepts from "../src/ils/concepts.json";
describe("ILS catalog", () => {
  it("validates the manifest, every experiment and the real guided lesson", () => {
    expect(validateManifest(manifest).ok).toBe(true);
    expect(experiments.length).toBeGreaterThanOrEqual(2);
    for (const experiment of experiments)
      expect(validateExperiment(experiment).ok).toBe(true);
    expect(validateLesson(guidedLesson).ok).toBe(true);
    expect(
      validateCatalog(
        manifest,
        experiments,
        [guidedLesson],
        concepts.map((c) => c.id),
      ),
    ).toEqual([]);
  });
});
import {
  readGexContext,
  contextMode,
  returnToServing,
} from "../src/ils/context";
import { lessons, modes } from "../src/data/lessons";
import { parseLocation, reducer } from "../src/lib/state";
const c = {
  version: "0.1" as const,
  sourceLab: "tfl",
  sourceExperiment: "single",
  targetLab: "gex",
  targetConcept: "concept:tensor-compute",
  payload: { workload: "prefill", batchClass: "single", sequenceClass: "long" },
};
it("maps actual six scenes and all kernel lesson steps", () => {
  expect(experiments.map((x) => x.id)).toEqual(modes);
  for (const e of experiments) {
    expect(e.config?.mode).toBe(e.id);
    expect(e.title).toEqual(lessons[e.config!.mode].name);
  }
  expect(guidedLesson.steps.map((s) => s.explanation)).toEqual(
    lessons.kernel.steps.map((s) => s.body),
  );
});
it("opens tensor for prefill and memory for decode, with a bounded return link", () => {
  const incoming = readGexContext(
    new URL(learningLink("https://gex.aserdargun.com/gex/tensor", c, "tr")),
  )!;
  expect(contextMode(incoming)).toBe("tensor");
  const url = new URL(returnToServing(incoming, "tensor", "tr"));
  expect(url.hostname).toBe("tfl.aserdargun.com");
  expect(url.searchParams.get("chapter")).toBe("4");
  expect(url.searchParams.get("lang")).toBe("tr");
  const d = {
    ...c,
    targetConcept: "concept:gpu-memory",
    payload: { ...c.payload, workload: "decode" },
  };
  expect(
    contextMode(
      readGexContext(
        new URL(learningLink("https://gex.aserdargun.com/gex/memory", d, "en")),
      )!,
    ),
  ).toBe("memory");
});
it("rejects invalid, unrecognized and wrong-source payloads without changing normal routes", () => {
  for (const invalid of [
    { ...c, payload: { ...c.payload, apiKey: "no" } },
    { ...c, payload: { ...c.payload, workload: "unknown" } },
    { ...c, sourceLab: "bad" },
    { ...c, targetConcept: "concept:kv-cache" },
  ]) {
    expect(
      readGexContext(
        new URL(
          learningLink("https://gex.aserdargun.com/gex/warp", invalid, "en"),
        ),
      ),
    ).toBeNull();
  }
  expect(
    readGexContext(new URL("https://gex.aserdargun.com/gex/warp?ils=bad")),
  ).toBeNull();
  const state = parseLocation(
    new URL("https://gex.aserdargun.com/gex/warp?ils=bad&branch=uniform"),
  );
  expect(state.mode).toBe("warp");
  expect(state.branch).toBe("uniform");
  expect(reducer(state, { type: "step", value: 1 }).step).toBe(1);
});
