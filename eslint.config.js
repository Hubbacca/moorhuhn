import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/game-logic.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "eqeqeq": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["src/chickens.js", "src/effects.js", "src/world.js", "src/main.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        THREE: "readonly",
        // cross-file globals (script-tag loaded, not imported)
        buildWorld: "readonly",
        ChickenManager: "readonly",
        FeatherBurst: "readonly",
        GrillSizzle: "readonly",
        updateAmmoDisplay: "readonly",
        muzzleFlash: "readonly",
        showHitMarker: "readonly",
        showMissMarker: "readonly",
        showSpeechBubble: "readonly",
        CHICKEN_TYPES: "readonly",
        buildChickenMesh: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-redeclare": "off",
      "no-console": "off",
      "eqeqeq": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
