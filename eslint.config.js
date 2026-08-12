import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// Node-side packages and apps. apps/web has its own config (React rules).
export default defineConfig([
  globalIgnores(["**/dist/**", "**/node_modules/**", "apps/web/**"]),
  {
    files: ["packages/*/src/**/*.ts", "apps/{api,worker}/src/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
