import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || "staging",
  },
  // The Studio is served from our own domain under /admin (no *.sanity.studio hosting)
  project: { basePath: "/admin" },
  // Pinned versions from package.json; update deliberately
  deployment: { autoUpdates: false },
});
