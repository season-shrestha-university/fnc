// playwright.config.ts
import { loadEnvFile } from "node:process";
import { defineConfig, devices } from "@playwright/test";

loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Automatically grant camera permissions for the QR scanner test flows
    permissions: ["camera"],
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] }, // Aligns with our mobile-first constraint
    },
  ],
});
