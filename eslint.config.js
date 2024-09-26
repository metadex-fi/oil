import jsdoc from "eslint-plugin-jsdoc";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"], // Specify TypeScript files
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json", // If you have a tsconfig.json, specify its path
        sourceType: "module",
        ecmaVersion: 2020,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      jsdoc,
    },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
      "jsdoc/check-alignment": "error",
      "jsdoc/check-indentation": "error",
      "jsdoc/require-param": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-type": "error", // Ensure @returns has a type
      "jsdoc/check-tag-names": "error",
    },
  },
];
