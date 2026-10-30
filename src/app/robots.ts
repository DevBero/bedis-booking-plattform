import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Internal tool: no crawling at all (pages also carry noindex, docs/HOSTING.md)
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
