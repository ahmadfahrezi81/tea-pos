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
    // public/ is served verbatim and holds generated PWA output — kept in step
    // with seller so both apps report the same set of real findings.
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "public/**", "next-env.d.ts"]
}];

export default eslintConfig;
