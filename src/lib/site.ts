// Build-time settings (set per environment by scripts/deploy-site.sh)
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === "true";
export const API_MOCK = process.env.NEXT_PUBLIC_API_MOCK === "true";
