import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site from S3 + CloudFront; everything that changes comes from /api/* at runtime (docs/TECH.md)
  output: "export",
  // /foo/ -> /foo/index.html, matches the CloudFront router
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
