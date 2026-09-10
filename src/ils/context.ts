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

export function readGexContext(
  url: URL,
): LearningContext<ComputePayload> | null {
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
export function contextMode(context: LearningContext<ComputePayload>) {
  return context.payload.workload === "prefill" ? "tensor" : "memory";
}
export function returnToServing(
  context: LearningContext<ComputePayload> | null,
  mode: string,
  locale: Locale,
): string {
  const workload =
    context?.payload.workload ?? (mode === "memory" ? "decode" : "prefill");
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
      payload: context?.payload ?? {
        workload,
        batchClass: "single",
        sequenceClass: "short",
      },
    },
    locale,
  );
}
export const contextExplanation = {
  en: "Serving compute maps to an existing GPU teaching scene. Batch and sequence classes describe the source; no request state, exact timing or hardware workload is transferred.",
  tr: "Sunum hesaplaması mevcut GPU eğitim sahnesine eşlenir. Grup ve dizi sınıfları kaynağı tanımlar; istek durumu, kesin süre veya donanım iş yükü aktarılmaz.",
};
