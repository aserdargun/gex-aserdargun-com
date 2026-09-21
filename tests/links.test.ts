import { afterEach, describe, expect, it, vi } from "vitest";
import { atlasUrl, portfolioUrl } from "../src/lib/links";
import { lessons } from "../src/data/lessons";
import { matrixCell, memoryAccess } from "../src/lib/simulation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("portfolio learning destinations", () => {
  it.each(["en", "tr"] as const)(
    "opens the public lesson modules in %s",
    (locale) => {
      vi.stubEnv("VITE_ATLAS_DEEP_LINKS", "false");
      vi.stubEnv("VITE_ATLAS_ORIGIN", "");
      for (const lesson of Object.values(lessons)) {
        const url = new URL(atlasUrl(locale, lesson.relatedAtlas.module));
        expect(url.origin).toBe("https://gpu.aserdargun.com");
        expect(url.pathname).toBe(locale === "tr" ? "/" : "/en/");
        expect(url.searchParams.get("module")).toBe(lesson.relatedAtlas.module);
        expect(url.hash).toBe("");
        if (locale === "tr") expect(url.searchParams.get("lang")).toBe("tr");
      }
      expect(portfolioUrl(locale)).toBe(
        locale === "tr"
          ? "https://aserdargun.com/tr/"
          : "https://aserdargun.com/",
      );
    },
  );

  it("retains the pinned integrated bridge and explicit origin override", () => {
    vi.stubGlobal("window", { location: { origin: "https://atlas.example" } });
    vi.stubEnv("VITE_ATLAS_DEEP_LINKS", "true");
    vi.stubEnv("VITE_ATLAS_ORIGIN", "");
    expect(atlasUrl("tr", "memory")).toBe(
      "https://atlas.example/?lang=tr#module=memory",
    );
    vi.stubEnv("VITE_ATLAS_ORIGIN", "https://preview.example");
    expect(atlasUrl("en", "cutlass")).toBe(
      "https://preview.example/en/#module=cutlass",
    );
  });
});

it("reproduces the published memory and tensor exercise observations", () => {
  expect(
    [1, 2, 4, 8].map((stride) => memoryAccess("strided", stride).groups.length),
  ).toEqual([4, 8, 16, 32]);
  for (const stride of [1, 2, 4, 8])
    expect(memoryAccess("strided", stride).usefulBytes).toBe(128);
  expect(matrixCell(0, 0, 2)).toBe(7);
  expect(matrixCell(0, 0, 4)).toBe(17);
  expect(matrixCell(0, 0)).toBe(39);
});
