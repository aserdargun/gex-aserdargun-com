import type { Branch, Pattern } from "../data/types";

import contract from "../data/model-contract.json";
export const WARP_SIZE = contract.constants.warpSize;
export const TEACHING_SMS = contract.constants.teachingSms;
export const VALUES_PER_GROUP = contract.constants.valuesPerGroup;
export const MEMORY_VALUES = contract.constants.memoryValues;
export const BYTES_PER_VALUE = contract.constants.bytesPerValue;

/** A reproducible permutation, deliberately unlike contiguous addresses. */
export function addressForLane(lane: number, pattern: Pattern, stride = 8) {
  if (pattern === "strided") return lane * stride;
  if (pattern === "scattered") return (lane * 73 + 19) % MEMORY_VALUES;
  return lane;
}
export function memoryAccess(pattern: Pattern, stride = 8) {
  const addresses = Array.from({ length: WARP_SIZE }, (_, lane) =>
    addressForLane(lane, pattern, stride),
  );
  const groups = [
    ...new Set(addresses.map((a) => Math.floor(a / VALUES_PER_GROUP))),
  ].sort((a, b) => a - b);
  return {
    addresses,
    groups,
    usefulBytes: WARP_SIZE * BYTES_PER_VALUE,
    groupedBytes: groups.length * VALUES_PER_GROUP * BYTES_PER_VALUE,
  };
}

export function laneMask(branch: Branch, step: number): boolean[] {
  return Array.from({ length: WARP_SIZE }, (_, lane) => {
    if (step === 2) return branch === "uniform" || lane % 2 === 0;
    if (step === 3) return branch === "divergent" && lane % 2 === 1;
    return true;
  });
}

export function launchShape(blocks: number, threads: number) {
  return {
    blocks,
    threads,
    elements: blocks * threads,
    warpsPerBlock: Math.ceil(threads / WARP_SIZE),
    totalWarps: blocks * Math.ceil(threads / WARP_SIZE),
    waves: Math.ceil(blocks / TEACHING_SMS),
  };
}
export function blockAssignment(blocks: number, wave: number) {
  return Array.from({ length: TEACHING_SMS }, (_, sm) => {
    const block = wave * TEACHING_SMS + sm;
    return block < blocks ? block : null;
  });
}
export function vectorElement(i: number) {
  return { i, a: i, b: i * 2, c: i * 3 };
}
export function vectorChecksum(elements: number) {
  return (3 * elements * (elements - 1)) / 2;
}

export const MATRIX_N = contract.constants.matrixN;
export const matrixA = Array.from(
  { length: 64 },
  (_, i) => ((Math.floor(i / 8) + (i % 8)) % 4) + 1,
);
export const matrixB = Array.from(
  { length: 64 },
  (_, i) => ((Math.floor(i / 8) * 2 + (i % 8)) % 3) + 1,
);
export function matrixCell(row: number, col: number, kEnd = MATRIX_N) {
  let sum = 0;
  for (let k = 0; k < Math.min(MATRIX_N, kEnd); k++)
    sum += matrixA[row * MATRIX_N + k] * matrixB[k * MATRIX_N + col];
  return sum;
}
export function matrixResult(kEnd = MATRIX_N) {
  return Array.from({ length: 64 }, (_, i) =>
    matrixCell(Math.floor(i / 8), i % 8, kEnd),
  );
}
export function selectedTile(cell: number, tileSize: number) {
  return {
    row: Math.floor(Math.floor(cell / 8) / tileSize) * tileSize,
    col: Math.floor((cell % 8) / tileSize) * tileSize,
  };
}
export function tileCells(cell: number, tileSize: number) {
  const { row, col } = selectedTile(cell, tileSize);
  return Array.from(
    { length: tileSize * tileSize },
    (_, i) => (row + Math.floor(i / tileSize)) * 8 + col + (i % tileSize),
  );
}
