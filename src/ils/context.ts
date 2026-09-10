import {
  semanticContextFromUrl,
  buildReturnLearningLink,
  buildLearningLink,
  type SemanticContext,
} from "@aserdargun/lab-core";
import { learningGraph } from "./graph";
import {
  contextFromUrl,
  learningLink,
  type LearningContext,
  type Locale,
} from "@aserdargun/lab-core";
import profile from "./compute-handoff.schema.json";
import { manifest } from "./catalog";
export type ComputePayload = {
  workload: "prefill" | "decode";
  batchClass: "single" | "multiple";
  sequenceClass: "short" | "long";
};
function isComputePayload(
  value: Record<string, unknown>,
): value is ComputePayload {
  return (
    Object.keys(value).length === profile.required.length &&
    Object.entries(profile.properties).every(
      ([key, spec]) =>
        typeof value[key] === "string" &&
        spec.enum.includes(value[key] as string),
    )
  );
}

export type GexContext =
  | LearningContext<ComputePayload>
  | SemanticContext<"gpu-execution">;
export function readGexContext(url: URL): GexContext | null {
  const semantic = semanticContextFromUrl(url, "gex", learningGraph);
  if (
    semantic?.profile === "gpu-execution" &&
    semantic.sourceLab === "tfl" &&
    semantic.targetConcept ===
      (semantic.payload.phase === "prefill"
        ? "concept:tensor-compute"
        : "concept:gpu-memory")
  )
    return semantic;
  const c = contextFromUrl(url, "gex");
  if (!c || c.sourceLab !== "tfl" || !isComputePayload(c.payload)) return null;
  if (
    c.targetConcept !==
    (c.payload.workload === "prefill"
      ? "concept:tensor-compute"
      : "concept:gpu-memory")
  )
    return null;
  return { ...c, payload: c.payload };
}
export function contextMode(context: GexContext) {
  return ("phase" in context.payload
    ? context.payload.phase
    : context.payload.workload) === "prefill"
    ? "tensor"
    : "memory";
}
export function returnToServing(
  context: GexContext | null,
  mode: string,
  locale: Locale,
): string {
  if (context && "phase" in context.payload)
    return (
      buildReturnLearningLink(
        learningGraph,
        context as SemanticContext<"gpu-execution">,
        locale,
      ) ??
      buildLearningLink(learningGraph, {
        targetApp: "tfl",
        experimentId: "single",
        locale,
      })
    );
  const legacy = context as LearningContext<ComputePayload> | null;
  const workload =
    legacy?.payload.workload ?? (mode === "memory" ? "decode" : "prefill");
  const destination = new URL(
    manifest.related.labs!.find((x) => x.id === "tfl")!.url,
  );
  destination.searchParams.set("lesson", "token-flow-101");
  destination.searchParams.set("chapter", workload === "prefill" ? "4" : "6");
  return learningLink(
    destination.href,
    {
      version: "0.1",
      sourceLab: "gex",
      sourceExperiment: mode,
      targetLab: "tfl",
      targetConcept: `concept:${workload}`,
      payload: legacy?.payload ?? {
        workload,
        batchClass: "single",
        sequenceClass: "short",
      },
    },
    locale,
  );
}
export const contextExplanation = {
  en: "Serving compute maps to an existing GPU teaching scene. The context describes the source educational workload; no request state, exact timing or hardware workload is transferred.",
  tr: "Sunum hesaplaması mevcut GPU eğitim sahnesine eşlenir. Bağlam kaynak eğitim iş yükünü tanımlar; istek durumu, kesin süre veya donanım iş yükü aktarılmaz.",
};
