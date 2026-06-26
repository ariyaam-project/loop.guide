// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// Update this to the production domain before deploy.
const SITE = "https://loop.guide";

export default defineConfig({
  site: SITE,
  // Static-first: every page is prerendered EXCEPT routes that opt out with
  // `export const prerender = false` (the /api/should-i-loop endpoint).
  output: "static",
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [sitemap()],
  prefetch: { prefetchAll: true },
});
