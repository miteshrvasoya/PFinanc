// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "example/*", "src/screens/**"],
  },
  {
    rules: {
      // @expo/vector-icons resolves at runtime via Expo SDK — suppress false positive
      "import/no-unresolved": ["error", { ignore: ["@expo/vector-icons"] }],
    },
  }
]);
