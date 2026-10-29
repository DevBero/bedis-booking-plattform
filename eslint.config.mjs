import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sanity Studio is its own package with its own checks
    "studio/**",
    // CDK synth output (bundled Lambda code)
    "cdk.out/**",
    "print/**",
  ]),
]);

export default eslintConfig;
