module.exports = {
    extends: ["plugin:prettier/recommended"],
    rules: {
        "prettier/prettier": ["error"],
        "eslint-disable-next-line": "off",
        "max-len": ["error", 100, 2, { ignoreUrls: true, ignoreStrings: true }],
        "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
    },
    plugins: ["prettier"],
    parser: `@typescript-eslint/parser`,
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
    },
    settings: {
        ecmascript: 2020,
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
    },
};
