module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: [
      "@typescript-eslint",
      "import"
  ],
  extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:import/errors",
      "plugin:import/warnings",
      "plugin:import/typescript"
  ],
  rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-ignore": "off",
      "@typescript-eslint/explicit-function-return-type": ["error", {
          allowExpressions: true
      }],
      "no-inner-declarations": "off",
      "import/no-unresolved": "off", // fails for 'estree' (types-only module)
      "import/no-self-import": "error",
      "import/no-cycle": "error"
  },
};
