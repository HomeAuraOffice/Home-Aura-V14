import globals from "globals";
export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        Vue: "readonly"
      }
    },
    rules: {
      "no-undef": "error"
    }
  }
];
