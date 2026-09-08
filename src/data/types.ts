export type Locale = "en" | "tr";
export type Localized = { en: string; tr: string };
export type Mode = "anatomy" | "sm" | "kernel" | "warp" | "memory" | "tensor";
export type Pattern = "contiguous" | "strided" | "scattered";
export type Branch = "uniform" | "divergent";
export type ComponentId =
  | "board"
  | "package"
  | "die"
  | "cluster"
  | "sm"
  | "scheduler"
  | "arithmetic"
  | "tensor"
  | "registers"
  | "shared"
  | "loadstore"
  | "l2"
  | "controller"
  | "global"
  | "host";
export type LessonStep = {
  label: Localized;
  title: Localized;
  body: Localized;
  line: number;
  scene: string;
};
export type Lesson = {
  id: Mode;
  number: string;
  name: Localized;
  heading: Localized;
  description: Localized;
  why: Localized;
  note: Localized;
  category: Localized;
  steps: LessonStep[];
  code: string[];
  codeKind: Localized;
  relatedAtlas: { module: string; name: string };
  relatedConcept: string;
  relatedCodeExample: string;
  relatedExperiment: Localized;
  sources: { title: string; url: string }[];
};
export type ExplorerState = {
  mode: Mode;
  locale: Locale;
  step: number;
  playing: boolean;
  speed: number;
  threads: number;
  blocks: number;
  pattern: Pattern;
  stride: number;
  branch: Branch;
  cacheHit: boolean;
  tileSize: number;
  tensorPath: boolean;
  selectedLane: number;
  selectedComponent: ComponentId;
  selectedCell: number;
  viewReset: number;
  labels: boolean;
  reducedMotion: boolean;
  textView: boolean;
};
export const local = (value: Localized, locale: Locale) => value[locale];
export const l = (en: string, tr: string): Localized => ({ en, tr });
