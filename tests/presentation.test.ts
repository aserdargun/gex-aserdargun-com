import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stepForState } from "../src/lib/presentation";
import {
  initialState,
  parseLocation,
  reducer,
  stateUrl,
} from "../src/lib/state";
import { lessons, modes } from "../src/data/lessons";
import { CodePanel, codeForState } from "../src/components/CodePanel";
import { TextView } from "../src/components/TextView";
import type { ExplorerState } from "../src/data/types";

const patch = () => {};
describe("consistent lesson observations", () => {
  it.each(["en", "tr"] as const)(
    "explains a single waiting warp identically in %s",
    (locale) => {
      const state: ExplorerState = {
        ...initialState,
        mode: "kernel",
        step: 9,
        threads: 32,
        locale,
      };
      const title = stepForState(state).title[locale];
      expect(title).toContain(
        locale === "en" ? "No other warp" : "başka hazır warp yok",
      );
      expect(
        renderToStaticMarkup(createElement(CodePanel, { state })),
      ).toContain(title);
      const text = renderToStaticMarkup(
        createElement(TextView, { state, patch }),
      );
      expect(text).toContain(title);
      expect(text).toContain(locale === "en" ? "waiting" : "bekliyor");
      expect(text).not.toContain('class="active"');
    },
  );
  it("does not claim another wave or B-path instruction when neither exists", () => {
    expect(
      stepForState({ ...initialState, mode: "kernel", step: 13, blocks: 4 })
        .title.en,
    ).toContain("One wave");
    expect(
      stepForState({ ...initialState, mode: "kernel", step: 13, blocks: 5 }),
    ).toEqual(lessons.kernel.steps[13]);
    expect(
      stepForState({
        ...initialState,
        mode: "warp",
        step: 3,
        branch: "uniform",
      }).title.en,
    ).toContain("Skip");
  });
  it("reflects the selected cache and arithmetic paths", () => {
    expect(
      stepForState({ ...initialState, mode: "memory", step: 2, cacheHit: true })
        .title.en,
    ).toContain("L1 hit");
    expect(
      stepForState({
        ...initialState,
        mode: "tensor",
        step: 4,
        tensorPath: false,
      }).label.en,
    ).toBe("FMA");
    const code = codeForState({
      ...initialState,
      mode: "tensor",
      tileSize: 4,
      tensorPath: false,
    });
    expect(code[0]).toBe("acc = zeros(4, 4);");
    expect(code[1]).toContain("k += 4");
    expect(code[5]).toContain("scalar_dot_products");
  });
  it.each(modes)(
    "preserves displayed %s code and explanation after navigation and link reload",
    (mode) => {
      const state = reducer(
        { ...initialState, threads: 64, blocks: 5, selectedLane: 23 },
        { type: "navigate", mode },
      );
      const restored = parseLocation(
        new URL(stateUrl(state), "https://example.com"),
      );
      expect(codeForState(restored)).toEqual(codeForState(state));
      expect(stepForState(restored)).toEqual(stepForState(state));
      if (mode === "anatomy") expect(restored.selectedLane).toBe(23);
    },
  );
  it("camera and selection observers never alter experiment results or the timeline", () => {
    const state: ExplorerState = { ...initialState, mode: "kernel", step: 9 };
    const moved = reducer(state, {
      type: "patch",
      value: { viewReset: 4, labels: false, selectedLane: 31 },
    });
    expect(stepForState(moved)).toEqual(stepForState(state));
    expect(codeForState(moved)).toEqual(codeForState(state));
    expect(moved.step).toBe(9);
  });
});
