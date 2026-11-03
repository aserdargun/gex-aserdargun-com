import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stepForState, warpLabel } from "../src/lib/presentation";
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
import {
  laneMask,
  spelledCount,
  TEACHING_SMS,
  WARP_SIZE,
} from "../src/lib/simulation";

const patch = () => {};
describe("consistent lesson observations", () => {
  it.each([1, 3, 4, 5, 16])(
    "describes the occupied and waiting slots for %i blocks",
    (blocks) => {
      const step = stepForState({
        ...initialState,
        mode: "kernel",
        step: 2,
        blocks,
      });
      expect(step.body.en).toContain(`${Math.min(blocks, 4)} of 4`);
      expect(step.body.en).toContain(`${Math.max(0, blocks - 4)} blocks wait`);
      expect(step.body.tr).toContain(
        `yerlerin ${Math.min(blocks, 4)} tanesini`,
      );
      expect(step.body.tr).toContain(`${Math.max(0, blocks - 4)} blok sonraki`);
    },
  );
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
        .label,
    ).toEqual({ en: "L1 hit", tr: "L1 isabeti" });
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

describe("the scene and the explanation read the model's own numbers", () => {
  it("labels a warp with the lanes the mask selects", () => {
    for (const branch of ["uniform", "divergent"] as const) {
      for (let step = 0; step < 6; step++) {
        const active = laneMask(branch, step).filter(Boolean).length;
        const label = warpLabel(branch, step, "en");
        expect(label, `${branch} step ${step}`).toContain(
          `${active} / ${WARP_SIZE}`,
        );
      }
    }
    // The path the label names is the path the mask shows.
    expect(warpLabel("divergent", 2, "en")).toBe(`PATH A · 16 / ${WARP_SIZE}`);
    expect(warpLabel("divergent", 3, "en")).toBe(`PATH B · 16 / ${WARP_SIZE}`);
    expect(warpLabel("uniform", 3, "en")).toBe(`PATH B · 0 / ${WARP_SIZE}`);
    expect(warpLabel("uniform", 2, "en")).toBe(`WARP 0 · 32 / ${WARP_SIZE}`);
    // The Turkish label names the same path with the same count.
    expect(warpLabel("divergent", 2, "tr")).toBe(`A YOLU · 16 / ${WARP_SIZE}`);
    expect(warpLabel("uniform", 3, "tr")).toBe(`B YOLU · 0 / ${WARP_SIZE}`);
  });

  it("names the teaching SM count in the explanation the way the model counts it", () => {
    const body = stepForState({
      ...initialState,
      mode: "kernel",
      step: 13,
      blocks: TEACHING_SMS,
    }).body;
    expect(body.en).toContain(
      `the ${spelledCount(TEACHING_SMS, "en")} teaching SM slots`,
    );
    expect(body.tr).toContain(
      `${spelledCount(TEACHING_SMS, "tr")} eğitim SM’sindeki yerlere`,
    );
  });

  it("writes no model number into the scene by hand", () => {
    const scene = readFileSync(
      new URL("../src/scene/Execution.tsx", import.meta.url),
      "utf8",
    );
    // The scene used to spell out the warp size, the lane counts and the
    // number of teaching SM slots while importing the same constants.
    expect(scene).toContain("warpLabel(");
    expect(scene).toContain("WARP_SIZE");
    expect(scene).toContain("TEACHING_SMS");
    expect(scene).not.toMatch(/· \d+ \/ \d+/);
    expect(scene).not.toMatch(/\b(id % 32|id \/ 32|Math\.floor\(id \/ 32\))/);
    expect(scene).not.toMatch(/length: 4[,)]/);
    expect(scene).not.toMatch(/Math\.min\(4,/);
  });
});
