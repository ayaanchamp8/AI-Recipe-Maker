import eslint from "@eslint/js";

export default [
  {
    ignores: ["**/dist/**", "**/build/**", "artifacts/*/dist/**", "lib/*/dist/**"]
  },
  eslint.configs.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn"
    }
  }
];
