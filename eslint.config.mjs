import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Mobile native build artifacts
    "android/**",
    "ios/**",
    // Python runtime and generated cache files are not application sources.
    "**/.venv/**",
    "**/__pycache__/**",
  ]),
]);

export default eslintConfig;
