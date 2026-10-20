import { expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { lessons } from "../src/data/lessons";
import { components } from "../src/data/components";

/* AGENTS.md requires Turkish and English controls and explanations to stay
   equivalent, and GEX had no gate for it at all. The surface is large: six
   lessons with a per-step label, title and body, sixteen hardware components,
   the conditional explanation overrides in lib/presentation.ts, and the
   control, inspector, code panel, text view and scene copy in the components.

   Nothing read the two halves against each other. A Turkish half that was
   empty would render an empty label on the Turkish page, and a Turkish half
   that was the English string would ship untranslated copy, with the whole
   suite still green.

   The gate has two halves. The first walks the data, where every string is a
   Localized pair, so the two halves can be compared directly. The second
   reads the source of the components, where the pair is written as a locale
   ternary, because there is no runtime object to walk there. */

const locales = ["en", "tr"] as const;

/** Terms with no Turkish spelling, so the Turkish half is the same string:
 * SM, MMA and L1 are hardware abbreviations, Warp is the SIMT term used as-is
 * in Turkish prose, and the rest are product, instruction set and
 * fused-multiply-add names. Every entry must still be present in the
 * surface, so a renamed or removed term cannot leave a stale exemption. */
const sameInBothLocales = new Set([
  "SM",
  "MMA",
  "L1",
  "Warp",
  "Warp / SIMT",
  "FMA",
  "Streaming multiprocessor",
  "CUTLASS · CuTe · Tensor Core · PTX",
]);

type Pair = { en: string; tr: string };

const isLocalized = (value: unknown): value is Pair =>
  value !== null &&
  typeof value === "object" &&
  locales.every((locale) => typeof (value as Record<string, unknown>)[locale] === "string");

function collect(value: unknown, path = "$", found: [string, Pair][] = []) {
  if (isLocalized(value)) found.push([path, value]);
  else if (Array.isArray(value))
    value.forEach((item, index) => collect(item, `${path}[${index}]`, found));
  else if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value))
      collect(child, `${path}.${key}`, found);
  return found;
}

const dataPairs = [
  ...collect(lessons, "$.lessons"),
  ...collect(components, "$.components"),
];

/** Reads a quoted literal at `index`, returning its value and the position
 * after the closing quote. */
const readLiteral = (source: string, index: number) => {
  const quote = source[index];
  let value = "";
  for (let i = index + 1; i < source.length; i++) {
    if (source[i] === "\\") {
      value += source[i + 1];
      i++;
      continue;
    }
    if (source[i] === quote) return { value, end: i + 1 };
    value += source[i];
  }
  return null;
};

type SourcePair = Pair & { file: string; line: number; strict: boolean };

const sourcePairs = (): SourcePair[] => {
  const root = join(import.meta.dirname, "..", "src");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(path)) files.push(path);
    }
  };
  walk(root);

  const pairs: SourcePair[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const relative = file.slice(root.length + 1);
    const lineAt = (index: number) => source.slice(0, index).split("\n").length;

    // l("english", "turkish") - the data and the explanation override form.
    const lCall = /\bl\(\s*(["'`])/g;
    let match: RegExpExecArray | null;
    while ((match = lCall.exec(source))) {
      const first = readLiteral(source, match.index + match[0].length - 1);
      if (!first) continue;
      const after = source.slice(first.end).match(/^\s*,\s*(["'`])/);
      if (!after) continue;
      const second = readLiteral(source, first.end + after[0].length - 1);
      if (!second) continue;
      pairs.push({
        file: relative,
        line: lineAt(match.index),
        en: first.value,
        tr: second.value,
        strict: true,
      });
    }

    // tr ? "turkish" : "english" - the component form. The `tr` flag is the
    // locale boolean every component derives from the state, and both halves
    // of this form are copy, so both must be present.
    const ternary = /(\?)\s*(["'`])/g;
    while ((match = ternary.exec(source))) {
      const before = source.slice(Math.max(0, match.index - 80), match.index);
      const isFlagForm = /\btr\s*$/.test(before);
      const isComparisonForm = /locale\s*===\s*"tr"\s*$/.test(before);
      if (!isFlagForm && !isComparisonForm) continue;
      const first = readLiteral(source, match.index + match[0].length - 1);
      if (!first) continue;
      const after = source.slice(first.end).match(/^\s*:\s*(["'`])/);
      if (!after) continue;
      const second = readLiteral(source, first.end + after[0].length - 1);
      if (!second) continue;
      // The comparison form also builds URL path fragments, where the English
      // half is legitimately empty. The Turkish half is copy in both forms and
      // must never be empty.
      pairs.push({
        file: relative,
        line: lineAt(match.index),
        en: second.value,
        tr: first.value,
        strict: isFlagForm,
      });
    }
  }
  return pairs;
};

it("keeps every lesson and component string bilingual", () => {
  // Floors measured from the current data, so a surface cannot be dropped
  // out of the walk without the count changing.
  expect(dataPairs.length).toBeGreaterThanOrEqual(231);
  expect(dataPairs.filter(([path]) => path.startsWith("$.lessons")).length).toBeGreaterThanOrEqual(186);
  expect(dataPairs.filter(([path]) => path.startsWith("$.components")).length).toBeGreaterThanOrEqual(45);

  for (const [path, value] of dataPairs) {
    for (const locale of locales)
      expect(value[locale].trim(), `${path} ${locale}`).not.toBe("");
    // A pair that ships the English string as its own Turkish translation is
    // untranslated copy, whatever its length.
    if (!sameInBothLocales.has(value.en.trim()))
      expect(value.tr.trim(), `${path} shipped as its own translation`).not.toBe(
        value.en.trim(),
      );
  }
});

it("keeps every source-level bilingual pair bilingual", () => {
  const pairs = sourcePairs();
  // A scanner that silently stopped reaching content would pass by finding
  // nothing at all.
  expect(pairs.length).toBeGreaterThanOrEqual(260);
  expect(pairs.filter((pair) => pair.strict).length).toBeGreaterThanOrEqual(245);

  for (const pair of pairs) {
    const label = `${pair.file}:${pair.line}`;
    // The Turkish half is copy in every form and must never be empty.
    expect(pair.tr.trim(), `${label} tr`).not.toBe("");
    if (pair.strict) expect(pair.en.trim(), `${label} en`).not.toBe("");
    if (!sameInBothLocales.has(pair.en.trim()))
      expect(pair.tr.trim(), `${label} shipped as its own translation`).not.toBe(
        pair.en.trim(),
      );
  }
});

it("keeps every exemption attached to a term that still exists", () => {
  const present = new Set([
    ...dataPairs.map(([, value]) => value.en.trim()),
    ...sourcePairs().map((pair) => pair.en.trim()),
  ]);
  for (const term of sameInBothLocales)
    expect(present.has(term), `${term} is exempted but no longer present`).toBe(
      true,
    );
});
