import { describe, it, expect } from "vitest";
import { buildLearningLink, type SemanticContext } from "@aserdargun/lab-core";
import { learningGraph } from "../src/ils/graph";
import {
  readGexContext,
  contextMode,
  returnToServing,
} from "../src/ils/context";
const context: SemanticContext<"gpu-execution"> = {
  version: "0.1",
  id: "test-execution",
  sourceLab: "tfl",
  sourceExperiment: "kv",
  targetLab: "gex",
  targetConcept: "concept:tensor-compute",
  intent: "dive-deeper",
  profile: "gpu-execution",
  payload: {
    workloadClass: "transformer-serving",
    phase: "prefill",
    accessPattern: "context-dependent",
    computePattern: "matrix-heavy",
  },
  returnTo: { appId: "tfl", experimentId: "kv", conceptId: "concept:kv-cache" },
};
describe("GEX semantic receiver", () => {
  it("opens the right scene and returns to the real source experiment", () => {
    const u = new URL(
      buildLearningLink(learningGraph, { targetApp: "gex", context }),
    );
    const c = readGexContext(u)!;
    expect(contextMode(c)).toBe("tensor");
    const back = new URL(returnToServing(c, "tensor", "tr"));
    expect(back.hostname).toBe("tfl.aserdargun.com");
    expect(back.searchParams.get("experiment")).toBe("kv");
    expect(back.searchParams.get("concept")).toBe("concept:kv-cache");
    expect(back.searchParams.has("ils")).toBe(false);
  });
  it("rejects conflicting concepts and unsafe metadata", () => {
    for (const patch of [
      { targetConcept: "concept:gpu-memory" },
      { payload: { ...context.payload, credentials: "bad" } },
      { version: "9" },
    ]) {
      const u = new URL("https://gex.aserdargun.com/gex/tensor");
      u.searchParams.set("ils", JSON.stringify({ ...context, ...patch }));
      expect(readGexContext(u)).toBeNull();
    }
  });
});
