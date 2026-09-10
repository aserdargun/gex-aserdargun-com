import { lessons, modes } from "../data/lessons";
import { components } from "../data/components";
import type { ComponentId, ExplorerState, Mode } from "../data/types";

export const initialState: ExplorerState = {
  mode: "anatomy",
  locale: "en",
  step: 0,
  playing: false,
  speed: 1,
  threads: 128,
  blocks: 8,
  pattern: "contiguous",
  stride: 8,
  branch: "divergent",
  cacheHit: false,
  tileSize: 2,
  tensorPath: true,
  selectedLane: 0,
  selectedComponent: "sm",
  selectedCell: 0,
  viewReset: 0,
  labels: true,
  reducedMotion: false,
  textView: false,
};
export type Action =
  | { type: "navigate"; mode: Mode }
  | { type: "restore"; state: ExplorerState }
  | { type: "step"; value: number }
  | { type: "tick" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "patch"; value: Partial<ExplorerState> };

export function reducer(state: ExplorerState, action: Action): ExplorerState {
  switch (action.type) {
    case "navigate":
      return {
        ...state,
        mode: action.mode,
        step: 0,
        playing: false,
        selectedComponent: action.mode === "sm" ? "scheduler" : "sm",
        viewReset: state.viewReset + 1,
      };
    case "restore":
      return {
        ...action.state,
        playing: false,
        viewReset: state.viewReset + 1,
        reducedMotion: state.reducedMotion,
      };
    case "step":
      return {
        ...state,
        step: Math.max(
          0,
          Math.min(lessons[state.mode].steps.length - 1, action.value),
        ),
        playing: false,
      };
    case "tick": {
      const step = Math.min(
        state.step + 1,
        lessons[state.mode].steps.length - 1,
      );
      return {
        ...state,
        step,
        playing: step < lessons[state.mode].steps.length - 1,
      };
    }
    case "play":
      return {
        ...state,
        playing: !state.playing,
        step:
          state.step === lessons[state.mode].steps.length - 1 ? 0 : state.step,
      };
    case "pause":
      return { ...state, playing: false };
    case "reset":
      return {
        ...state,
        step: 0,
        playing: false,
        viewReset: state.viewReset + 1,
      };
    case "patch":
      return { ...state, ...action.value };
  }
}
const integer = (
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) => {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
export function parseLocation(url: URL): ExplorerState {
  const route = url.pathname.replace(/\/+$/, "").split("/").pop();
  const mode = modes.includes(route as Mode) ? (route as Mode) : "anatomy";
  const q = url.searchParams;
  const threads = integer(q.get("threads"), 128, 32, 256);
  const stride = integer(q.get("stride"), 8, 1, 8);
  const component = q.get("part");
  return {
    ...initialState,
    mode,
    locale: q.get("lang") === "tr" ? "tr" : "en",
    step: integer(q.get("step"), 0, 0, lessons[mode].steps.length - 1),
    threads: [32, 64, 128, 256].includes(threads) ? threads : 128,
    blocks: integer(q.get("blocks"), 8, 1, 16),
    pattern:
      q.get("pattern") === "strided"
        ? "strided"
        : q.get("pattern") === "scattered"
          ? "scattered"
          : "contiguous",
    stride: [1, 2, 4, 8].includes(stride) ? stride : 8,
    branch: q.get("branch") === "uniform" ? "uniform" : "divergent",
    cacheHit: q.get("cache") === "hit",
    tileSize: q.get("tile") === "4" ? 4 : 2,
    tensorPath: q.get("compute") !== "scalar",
    selectedLane: integer(q.get("lane"), 0, 0, 31),
    selectedCell: integer(q.get("cell"), 0, 0, 63),
    textView: q.get("view") === "text",
    selectedComponent:
      component && Object.hasOwn(components, component)
        ? (component as ComponentId)
        : mode === "sm"
          ? "scheduler"
          : "sm",
    labels: q.get("labels") !== "off",
  };
}
export function stateUrl(state: ExplorerState) {
  const q = new URLSearchParams({ lang: state.locale });
  if (state.step) q.set("step", String(state.step));
  if (state.mode === "anatomy" || state.mode === "sm")
    q.set("part", state.selectedComponent);
  if (!state.labels) q.set("labels", "off");
  if (["kernel", "anatomy", "sm"].includes(state.mode)) {
    q.set("blocks", String(state.blocks));
    q.set("threads", String(state.threads));
  }
  if (state.mode === "warp") q.set("branch", state.branch);
  if (state.mode === "memory") {
    q.set("pattern", state.pattern);
    q.set("stride", String(state.stride));
    q.set("cache", state.cacheHit ? "hit" : "cold");
  }
  if (state.mode === "tensor") {
    q.set("tile", String(state.tileSize));
    q.set("compute", state.tensorPath ? "tensor" : "scalar");
    q.set("cell", String(state.selectedCell));
  }
  if (["warp", "memory", "kernel", "anatomy"].includes(state.mode))
    q.set("lane", String(state.selectedLane));
  if (state.textView) q.set("view", "text");
  return `/gex/${state.mode}?${q}`;
}
