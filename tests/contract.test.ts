import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import contract from "../src/data/model-contract.json";
import { lessons } from "../src/data/lessons";
import {
  BYTES_PER_VALUE,
  MATRIX_N,
  MEMORY_VALUES,
  STRIDE_OPTIONS,
  TEACHING_SMS,
  THREAD_OPTIONS,
  TILE_SIZES,
  VALUES_PER_GROUP,
  WARP_SIZE,
  laneMask,
  launchShape,
  matrixA,
  matrixB,
  matrixCell,
  matrixResult,
  memoryAccess,
} from "../src/lib/simulation";

/* GEX teaches a hardware model, so it publishes numbers: 32 lanes, 4 teaching
   SMs, 1 and 2 waves, 4/8/16/32 address groups, 128 B per request, an 8 × 8
   matrix, the partial sums 7 and 17 and the total 39.

   Every one of them used to be written out by hand - in the lessons, in the
   curriculum document, and as bare literals in the code that draws the
   scene. `model-contract.json` declares the constants, but the matrix
   dimension alone was spelled out in ten places across four files, so the
   contract was a description rather than a contract.

   The numbers below are read out of the model itself: the constants come
   from the contract, the wave counts from the scheduler, the address groups
   from the memory model, the partial sums from the matrix reference. The
   prose keeps its wording; the gate holds the numbers. */

const read = (relative: string) =>
  readFileSync(join(import.meta.dirname, "..", relative), "utf8");

const step = (mode: keyof typeof lessons, scene: string) => {
  const found = lessons[mode].steps.find((item) => item.scene === scene);
  expect(found, `no ${scene} step in ${mode}`).toBeDefined();
  return found!;
};

/** The numbers a sentence publishes. */
const numbers = (text: string) => (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

/**
 * The sentence publishes exactly these numbers - none others, all of them.
 *
 * Order is not checked, because Turkish states the same facts in a different
 * order: the memory experiment puts the request size before the group counts
 * in one locale and after them in the other.
 */
const holds = (text: string, expected: number[]) => {
  const found = numbers(text);
  for (const value of found)
    expect(expected, `unaccounted number ${value} in: ${text}`).toContain(value);
  for (const value of expected)
    expect(found, `missing number ${value} in: ${text}`).toContain(value);
};

/** Both locales carry the same numbers, whatever order they use. */
const sameNumbers = (en: string, tr: string) => {
  const a = numbers(en).sort((x, y) => x - y);
  const b = numbers(tr).sort((x, y) => x - y);
  expect(b).toEqual(a);
};

const curriculum = read("docs/curriculum.md");
const sentence = (needle: string) => {
  const found = curriculum
    .split(/\.\s+/)
    .find((part) => part.includes(needle));
  expect(found, `no curriculum sentence containing "${needle}"`).toBeDefined();
  return found!;
};

it("reads every model constant from the contract", () => {
  expect(WARP_SIZE).toBe(contract.constants.warpSize);
  expect(TEACHING_SMS).toBe(contract.constants.teachingSms);
  expect(VALUES_PER_GROUP).toBe(contract.constants.valuesPerGroup);
  expect(BYTES_PER_VALUE).toBe(contract.constants.bytesPerValue);
  expect(MEMORY_VALUES).toBe(contract.constants.memoryValues);
  expect(MATRIX_N).toBe(contract.constants.matrixN);
});

it("keeps the matrix reference on the contract's size", () => {
  expect(matrixA.length).toBe(MATRIX_N * MATRIX_N);
  expect(matrixB.length).toBe(MATRIX_N * MATRIX_N);
  expect(matrixResult().length).toBe(MATRIX_N * MATRIX_N);
  // The reference is built one way and indexed another; if the two ever
  // disagreed, the displayed result would stop matching the cell it is
  // computed from.
  expect(matrixResult()).toEqual(
    Array.from({ length: MATRIX_N * MATRIX_N }, (_, i) =>
      matrixCell(Math.floor(i / MATRIX_N), i % MATRIX_N),
    ),
  );
});

it("publishes the warp size the model runs on", () => {
  const anatomy = step("anatomy", "warp");
  holds(anatomy.body.en, [WARP_SIZE]);
  holds(anatomy.body.tr, [WARP_SIZE]);
  sameNumbers(anatomy.body.en, anatomy.body.tr);

  holds(lessons.warp.description.en, [WARP_SIZE]);
  holds(lessons.warp.description.tr, [WARP_SIZE]);

  const lanes = step("kernel", "lanes");
  holds(lanes.body.en, [WARP_SIZE]);
  holds(lanes.body.tr, [WARP_SIZE]);

  const address = step("kernel", "address");
  holds(address.body.en, [0, WARP_SIZE - 1]);
  holds(address.body.tr, [0, WARP_SIZE - 1]);

  const request = step("memory", "addresses");
  holds(request.title.en, [WARP_SIZE]);
  holds(request.title.tr, [WARP_SIZE]);

  // The code sample derives the lane from the warp size. It is checked as a
  // phrase: the sample also contains a multiplication factor, which is not a
  // model parameter.
  expect(lessons.memory.code.join(" ")).toContain(`threadIdx.x % ${WARP_SIZE}`);
});

it("publishes the lane counts the masks select", () => {
  const divergent = laneMask("divergent", 2).filter(Boolean).length;
  const uniform = laneMask("uniform", 2).filter(Boolean).length;
  // The two paths are the ones the lesson's own code sample draws.
  const paths = lessons.warp.code.filter((line) => /path[AB]\(/.test(line)).length;
  const expected = [divergent, WARP_SIZE, uniform, WARP_SIZE, paths];
  holds(lessons.warp.relatedExperiment.en, expected);
  holds(lessons.warp.relatedExperiment.tr, expected);
  sameNumbers(
    lessons.warp.relatedExperiment.en,
    lessons.warp.relatedExperiment.tr,
  );
});

it("publishes the waves the scheduler produces", () => {
  const blocks = TEACHING_SMS;
  const extra = TEACHING_SMS + 1;
  const firstWave = launchShape(blocks, WARP_SIZE).waves;
  const secondWave = launchShape(extra, WARP_SIZE).waves;
  expect(firstWave).toBe(1);
  expect(secondWave).toBe(2);
  const expected = [blocks, extra, firstWave, secondWave, WARP_SIZE];
  holds(lessons.kernel.relatedExperiment.en, expected);
  holds(lessons.kernel.relatedExperiment.tr, expected);
  sameNumbers(
    lessons.kernel.relatedExperiment.en,
    lessons.kernel.relatedExperiment.tr,
  );
});

it("publishes the address groups the model counts", () => {
  const groups = STRIDE_OPTIONS.map(
    (stride) => memoryAccess("strided", stride).groups.length,
  );
  const bytes = memoryAccess("strided", STRIDE_OPTIONS[0]).usefulBytes;
  holds(lessons.memory.note.en, [
    VALUES_PER_GROUP,
    VALUES_PER_GROUP * BYTES_PER_VALUE,
  ]);
  holds(lessons.memory.note.tr, [
    VALUES_PER_GROUP,
    VALUES_PER_GROUP * BYTES_PER_VALUE,
  ]);
  const expected = [...STRIDE_OPTIONS, ...groups, bytes];
  holds(lessons.memory.relatedExperiment.en, expected);
  holds(lessons.memory.relatedExperiment.tr, expected);
  sameNumbers(
    lessons.memory.relatedExperiment.en,
    lessons.memory.relatedExperiment.tr,
  );
});

it("publishes the matrix size and the sums the reference computes", () => {
  holds(lessons.tensor.note.en, [MATRIX_N, MATRIX_N, ...TILE_SIZES]);
  holds(lessons.tensor.note.tr, [MATRIX_N, MATRIX_N, ...TILE_SIZES]);
  sameNumbers(lessons.tensor.note.en, lessons.tensor.note.tr);

  const partials = TILE_SIZES.map((tile) => matrixCell(0, 0, tile));
  const total = matrixCell(0, 0, MATRIX_N);
  const expected = [0, ...TILE_SIZES.flatMap((tile, i) => [tile, partials[i]]), total];
  holds(lessons.tensor.relatedExperiment.en, expected);
  holds(lessons.tensor.relatedExperiment.tr, expected);
  sameNumbers(
    lessons.tensor.relatedExperiment.en,
    lessons.tensor.relatedExperiment.tr,
  );
});

it("publishes the same numbers in the curriculum document", () => {
  // The curriculum spells some of them out, so the words are checked too.
  const spelled: Record<number, string> = { 1: "one", 4: "four", 8: "eight" };
  expect(curriculum).toContain(`${spelled[TEACHING_SMS]} teaching SMs`);
  expect(curriculum).toContain(
    `${spelled[VALUES_PER_GROUP]} ${BYTES_PER_VALUE * 8}-bit values`,
  );
  holds(sentence("32-bit values"), [
    BYTES_PER_VALUE * 8,
    VALUES_PER_GROUP * BYTES_PER_VALUE,
  ]);
  holds(sentence("logical lanes"), [WARP_SIZE]);
  holds(sentence("thread warps"), [WARP_SIZE]);
  holds(sentence("first K contribution"), [
    0,
    ...TILE_SIZES.flatMap((tile) => [tile, matrixCell(0, 0, tile)]),
    matrixCell(0, 0, MATRIX_N),
  ]);
});

it("offers only the block sizes, strides and tiles it publishes", () => {
  expect(THREAD_OPTIONS[0]).toBe(WARP_SIZE);
  expect(THREAD_OPTIONS).toContain(128);
  expect(STRIDE_OPTIONS).toEqual([1, 2, 4, 8]);
  expect(TILE_SIZES).toEqual([2, 4]);
});
