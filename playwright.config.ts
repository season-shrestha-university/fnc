// playwright.config.ts
import { loadEnvFile } from "node:process";
import { defineConfig, devices } from "@playwright/test";

loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Auth specs share a single Supabase test account whose global signOut revokes other workers' sessions.
  workers: 1,
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
