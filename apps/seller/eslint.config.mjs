import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
    rules: {
        // A leading underscore is the codebase's existing marker for "required
        // by the signature, deliberately unused" — honour it instead of
        // reporting it.
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
        ],
        "@next/next/no-img-element": "warn",
    },
}, {
    // public/ is served verbatim and holds the next-pwa output (sw.js,
    // workbox-*.js) — minified, generated, and already gitignored. Linting it
    // buried the real findings under ~90 warnings about mangled variables.
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "public/**", "next-env.d.ts"]
}];

export default eslintConfig;
