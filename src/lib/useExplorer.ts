import { useCallback, useEffect, useReducer, useState } from "react";
import { parseLocation, reducer, stateUrl, type Action } from "./state";
import type { ExplorerState, Mode } from "../data/types";

import { CONTEXT_PARAM, encodeLearningContext } from "@aserdargun/lab-core";
import { readGexContext, contextMode } from "../ils/context";
function entryState(url: URL) {
  const context = readGexContext(url);
  if (context) {
    url = new URL(url);
    url.pathname = `/gex/${contextMode(context)}`;
  }
  return parseLocation(url);
}
export function useExplorer() {
  const [learningContext, setLearningContext] = useState(() =>
    readGexContext(new URL(window.location.href)),
  );
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...entryState(new URL(window.location.href)),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  }));
  const navigate = useCallback(
    (mode: Mode) => {
      setLearningContext(null);
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
    const url = new URL(stateUrl(state), window.location.origin);
    if (learningContext)
      url.searchParams.set(
        CONTEXT_PARAM,
        encodeLearningContext(learningContext),
      );
    window.history.replaceState(null, "", url);
    document.documentElement.lang = state.locale;
  }, [state, learningContext]);
  useEffect(() => {
    const pop = () => {
      const url = new URL(window.location.href);
      setLearningContext(readGexContext(url));
      dispatch({ type: "restore", state: entryState(url) });
    };
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
  return { state, act, patch, navigate, learningContext };
}
export type Explorer = ReturnType<typeof useExplorer>;
