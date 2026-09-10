import { copyFile, mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await copyFile("lab.manifest.json", "dist/lab.manifest.json");
