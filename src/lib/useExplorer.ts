import { useCallback, useEffect, useReducer } from "react";
import { parseLocation, reducer, stateUrl, type Action } from "./state";
import type { ExplorerState, Mode } from "../data/types";

export function useExplorer() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...parseLocation(new URL(window.location.href)),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  }));
  const navigate = useCallback(
    (mode: Mode) => {
      const next = reducer(state, { type: "navigate", mode });
      window.history.pushState(null, "", stateUrl(next));
      dispatch({ type: "navigate", mode });
    },
    [state],
  );
  const patch = useCallback(
    (value: Partial<ExplorerState>) => dispatch({ type: "patch", value }),
    [],
  );
  const act = useCallback((action: Action) => dispatch(action), []);
  useEffect(() => {
    window.history.replaceState(null, "", stateUrl(state));
    document.documentElement.lang = state.locale;
  }, [state]);
  useEffect(() => {
    const pop = () =>
      dispatch({
        type: "restore",
        state: parseLocation(new URL(window.location.href)),
      });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () =>
      dispatch({
        type: "patch",
        value: { reducedMotion: mq.matches, playing: false },
      });
    const visibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    window.addEventListener("popstate", pop);
    mq.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("popstate", pop);
      mq.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!state.playing) return;
    const id = window.setTimeout(
      () => dispatch({ type: "tick" }),
      2400 / state.speed,
    );
    return () => window.clearTimeout(id);
  }, [state.playing, state.step, state.mode, state.speed]);
  return { state, act, patch, navigate };
}
export type Explorer = ReturnType<typeof useExplorer>;
