import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { lessons } from "../src/data/lessons";

describe("educational asset contract", () => {
  it.each(["gpu", "sm"])(
    "loads a named, self-contained %s GLB within the web budget",
    (kind) => {
      const bytes = readFileSync(
        new URL(`../public/models/gex-${kind}.glb`, import.meta.url),
      );
      expect(bytes.toString("utf8", 0, 4)).toBe("glTF");
      expect(bytes.readUInt32LE(4)).toBe(2);
      expect(bytes.length).toBeLessThan(1_000_000);
      const length = bytes.readUInt32LE(12);
      const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + length));
      expect(
        gltf.nodes.some((n: { name: string }) =>
          n.name?.startsWith("GEX_ANCHOR_"),
        ),
      ).toBe(true);
      expect(
        gltf.meshes.every((m: { name: string }) => m.name.startsWith("GEX_")),
      ).toBe(true);
      expect(gltf.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
      if (kind === "gpu") {
        const sms = gltf.nodes.filter((n: { name: string }) =>
          /^GEX_SM_\d+$/.test(n.name),
        );
        expect(sms).toHaveLength(16);
        // Repeated SMs reuse the same glTF mesh instead of duplicating geometry.
        expect(
          new Set(sms.map((n: { mesh: number }) => n.mesh)).size,
        ).toBeLessThan(16);
      }
    },
  );
  it("every lesson links to an existing executable example and a first-party source", () => {
    for (const lesson of Object.values(lessons)) {
      const code = readFileSync(
        new URL(`../public/${lesson.relatedCodeExample}`, import.meta.url),
        "utf8",
      );
      expect(code).toContain("int main()");
      expect(code).toContain("cudaGetLastError");
      expect(
        lesson.sources.every(
          (s) => new URL(s.url).hostname === "docs.nvidia.com",
        ),
      ).toBe(true);
    }
  });
});
