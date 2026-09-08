import { describe, it, expect } from "vitest";
import {
  memoryAccess,
  laneMask,
  launchShape,
  blockAssignment,
  vectorChecksum,
  vectorElement,
  matrixA,
  matrixB,
  matrixCell,
  matrixResult,
  tileCells,
} from "../src/lib/simulation";
import {
  initialState,
  parseLocation,
  reducer,
  stateUrl,
} from "../src/lib/state";
import { lessons, modes } from "../src/data/lessons";
import { codeForState } from "../src/components/CodePanel";

describe("address model", () => {
  it("groups aligned neighboring float32 elements into four declared 32 B groups", () => {
    const m = memoryAccess("contiguous");
    expect(m.groups).toEqual([0, 1, 2, 3]);
    expect(m.addresses).toHaveLength(32);
    expect(m.usefulBytes).toBe(128);
    expect(m.groupedBytes).toBe(128);
  });
  it.each([
    [1, 4],
    [2, 8],
    [4, 16],
    [8, 32],
  ])("stride %i touches %i groups", (stride, count) => {
    expect(memoryAccess("strided", stride).groups.length).toBe(count);
  });
  it("scatters without duplicate or out-of-range addresses and stays reproducible", () => {
    const a = memoryAccess("scattered");
    expect(new Set(a.addresses).size).toBe(32);
    expect(a.addresses.every((n) => n >= 0 && n < 256)).toBe(true);
    expect(a).toEqual(memoryAccess("scattered"));
    expect(a.groups.length).toBeGreaterThan(4);
  });
});
describe("SIMT masks", () => {
  it("executes complementary branch subsets without deleting lanes", () => {
    const a = laneMask("divergent", 2),
      b = laneMask("divergent", 3);
    expect(a.filter(Boolean)).toHaveLength(16);
    expect(b.filter(Boolean)).toHaveLength(16);
    expect(a.every((v, i) => v !== b[i])).toBe(true);
    expect(laneMask("divergent", 4).every(Boolean)).toBe(true);
  });
  it("does not invent B-path work for uniform A", () => {
    expect(laneMask("uniform", 2).filter(Boolean)).toHaveLength(32);
    expect(laneMask("uniform", 3).filter(Boolean)).toHaveLength(0);
  });
});
describe("launch and result", () => {
  it("handles partial teaching waves without inventing blocks", () => {
    expect(blockAssignment(5, 0)).toEqual([0, 1, 2, 3]);
    expect(blockAssignment(5, 1)).toEqual([4, null, null, null]);
    expect(launchShape(5, 128).waves).toBe(2);
  });
  it("accounts for all launched work across block sizes", () => {
    for (const threads of [32, 64, 128, 256]) {
      const s = launchShape(7, threads);
      expect(s.elements).toBe(7 * threads);
      expect(s.totalWarps * 32).toBe(s.elements);
    }
  });
  it("matches an independently reduced vector reference", () => {
    const n = 1024;
    const actual = Array.from(
      { length: n },
      (_, i) => vectorElement(i).c,
    ).reduce((a, b) => a + b, 0);
    expect(vectorChecksum(n)).toBe(actual);
    expect(vectorElement(31)).toEqual({ i: 31, a: 31, b: 62, c: 93 });
  });
});
describe("tiled matrix reference", () => {
  it("matches an independent row/column dot product for every output", () => {
    const reference = Array.from({ length: 64 }, (_, i) =>
      matrixA
        .slice(Math.floor(i / 8) * 8, Math.floor(i / 8) * 8 + 8)
        .reduce((sum, a, k) => sum + a * matrixB[k * 8 + (i % 8)], 0),
    );
    expect(matrixResult()).toEqual(reference);
  });
  it("accumulation along K preserves the exact final result", () => {
    for (const size of [2, 4])
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
          let sum = 0;
          for (let k = 0; k < 8; k += size)
            sum += matrixCell(r, c, k + size) - matrixCell(r, c, k);
          expect(sum).toBe(matrixCell(r, c));
        }
  });
  it("partitions all 64 outputs without overlapping tiles", () => {
    for (const size of [2, 4]) {
      const cells = [];
      for (let row = 0; row < 8; row += size)
        for (let col = 0; col < 8; col += size)
          cells.push(...tileCells(row * 8 + col, size));
      expect(cells).toHaveLength(64);
      expect(new Set(cells).size).toBe(64);
    }
  });
});
describe("temporal and routing contract", () => {
  it("steps, pauses, stops at completion and restarts a completed lesson", () => {
    let s = { ...initialState, mode: "warp" as const, step: 3, playing: true };
    s = reducer(s, { type: "tick" }) as typeof s;
    expect(s.step).toBe(4);
    expect(s.playing).toBe(false);
    expect(reducer(s, { type: "play" }).step).toBe(0);
    expect(reducer(s, { type: "step", value: 999 }).step).toBe(4);
  });
  it("invalid URL values cannot create impossible experiments", () => {
    const s = parseLocation(
      new URL(
        "https://example.com/gex/warp?step=999&threads=33&blocks=NaN&lane=-1&stride=0",
      ),
    );
    expect(s.step).toBe(4);
    expect(s.threads).toBe(128);
    expect(s.blocks).toBe(8);
    expect(s.selectedLane).toBe(0);
  });
  it.each(modes)(
    "round trips %s deep links and exact selected state",
    (mode) => {
      const s = {
        ...initialState,
        mode,
        locale: "tr" as const,
        step: 2,
        blocks: 5,
        threads: 64,
        pattern: "strided" as const,
        stride: 4,
        branch: "uniform" as const,
        cacheHit: true,
        tileSize: 4,
        tensorPath: false,
        selectedLane: 23,
        selectedCell: 47,
        textView: true,
      };
      const p = parseLocation(new URL(stateUrl(s), "https://example.com"));
      expect(p.mode).toBe(mode);
      expect(p.locale).toBe("tr");
      expect(p.step).toBe(2);
      expect(p.textView).toBe(true);
      if (mode === "kernel") expect([p.blocks, p.threads]).toEqual([5, 64]);
      if (mode === "memory")
        expect([p.pattern, p.stride, p.cacheHit]).toEqual(["strided", 4, true]);
      if (mode === "tensor")
        expect([p.tileSize, p.tensorPath, p.selectedCell]).toEqual([
          4,
          false,
          47,
        ]);
    },
  );
  it("source lines always resolve and parameter changes reach the displayed code", () => {
    for (const lesson of Object.values(lessons))
      expect(
        lesson.steps.every((s) => s.line >= 0 && s.line < lesson.code.length),
      ).toBe(true);
    expect(
      codeForState({
        ...initialState,
        mode: "kernel",
        threads: 64,
        blocks: 5,
      })[9],
    ).toContain("<<<5, 64>>>");
    expect(
      codeForState({
        ...initialState,
        mode: "memory",
        pattern: "strided",
        stride: 4,
      })[1],
    ).toContain("lane * 4");
  });
});
