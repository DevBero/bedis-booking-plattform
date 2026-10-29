import type { MetadataRoute } from "next";
import { NOINDEX } from "@/lib/site";

export const dynamic = "force-static";

// Production: booking page indexable, Studio and API not. Staging is locked here and again by
// scripts/deploy-site.sh, which replaces the file with Disallow: /
export default function robots(): MetadataRoute.Robots {
  return {
    rules: NOINDEX ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/storno/"] },
  };
}
