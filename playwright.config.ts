import { defineConfig } from "@playwright/test";

const remoteURL = process.env.GEX_E2E_URL;
const baseURL = remoteURL || "http://127.0.0.1:5296";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // SwiftShader keeps the three.js scene rendering in headless CI so the
    // WebGL path and its fallback are both exercised against real pixels.
    launchOptions: {
      args: [
        "--enable-webgl",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: "npm run dev",
        url: `${baseURL}/gex/`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
