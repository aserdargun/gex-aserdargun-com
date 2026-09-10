import {
  parseManifest,
  type ExperimentDefinition,
  type LessonDefinition,
} from "@aserdargun/lab-core";
import rawManifest from "../../lab.manifest.json";
import rawExperiments from "./experiments.json";
import { lessons } from "../data/lessons";
import type { Mode } from "../data/types";
export const manifest = parseManifest(rawManifest);
export const experiments = rawExperiments as ExperimentDefinition<{
  mode: Mode;
}>[];
export const guidedLesson: LessonDefinition = {
  schemaVersion: "0.1",
  id: "follow-a-kernel",
  title: manifest.lessons![0].title,
  concepts: ["concept:kernel-execution", "concept:simt"],
  steps: lessons.kernel.steps.map((step, index) => ({
    id: `kernel-${index + 1}`,
    title: step.title,
    explanation: step.body,
    experimentId: "kernel",
    focus: [step.scene],
    mode: "kernel",
    completion: { kind: "app-signal", signal: `kernel-step-${index}` },
  })),
};
