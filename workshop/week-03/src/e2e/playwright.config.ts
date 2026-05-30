import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_WEB_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // The web app must be pre-built (`npm --prefix ../web run build`).
    // `npm test` does this automatically via the `pretest` hook.
    // Invoke vite's binary directly to avoid npm's signal-forwarding quirks
    // that confuse Playwright's webServer health probe.
    command: `./node_modules/.bin/vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    cwd: "../web",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
