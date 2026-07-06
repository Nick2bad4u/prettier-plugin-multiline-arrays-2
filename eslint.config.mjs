import {
    allowDefaultProjectFilePatternPresets,
    createConfig,
} from "eslint-config-nick2bad4u";

/**
 * @param {readonly string[]} ruleNames
 *
 * @returns {Record<string, "off">}
 */
function turnOffRules(ruleNames) {
    return Object.fromEntries(ruleNames.map((ruleName) => [ruleName, "off"]));
}

const prettierAstBoundaryFiles = [
    "src/augments/array.ts",
    "src/augments/doc.ts",
    "src/index.ts",
    "src/options.ts",
    "src/preprocessing.ts",
    "src/printer/**/*.ts",
    "test/prettier-config.ts",
    "test/prettier-versions.mock.script.ts",
    "test/run-tests.mock.ts",
];

const fixtureTestFiles = ["docs/readme-examples/**/*.ts", "test/**/*.ts"];

/** @type {import("eslint").Linter.Config[]} */
const config = [
    {
        ignores: [
            ".cache",
            "coverage",
            "dist",
            "node_modules",
        ],
    },
    ...createConfig({
        allowDefaultProjectFilePatterns: [
            ...allowDefaultProjectFilePatternPresets.defaultRootFiles,
            ...allowDefaultProjectFilePatternPresets.rootConfigFiles,
        ],
    }),
    {
        files: [
            "actionlint.yaml",
            ".github/labeler.yml",
            ".github/workflows/*-caller.yml",
            ".github/secret_scanning.yml",
            ".github/stale.yml",
        ],
        name: "Imported workflow support YAML",
        rules: turnOffRules([
            "github-actions/action-name-casing",
            "yamllint/yamllint",
        ]),
    },
    {
        files: ["src/index.ts"],
        name: "Package entrypoint exports",
        rules: turnOffRules([
            "canonical/filename-no-index",
            "canonical/no-re-export",
            "no-barrel-files/no-barrel-files",
        ]),
    },
    {
        files: ["test/prettier-config.ts"],
        name: "Local Prettier config import",
        rules: turnOffRules(["import-x/extensions"]),
    },
    {
        files: ["src/printer/multiline-array-printer.ts"],
        name: "Environment-gated debug flag",
        rules: turnOffRules(["n/no-process-env"]),
    },
    {
        files: ["src/printer/**/*.ts", "test/run-tests.mock.ts"],
        name: "Debug logging paths",
        rules: turnOffRules(["no-console"]),
    },
    {
        files: fixtureTestFiles,
        name: "Multiline code fixtures",
        rules: turnOffRules(["etc-misc/no-unnecessary-template-literal"]),
    },
    {
        files: [
            "src/options.ts",
            "src/printer/comment-triggers.ts",
            "test/typescript-tests.mock.ts",
        ],
        name: "Public option and comment trigger naming",
        rules: turnOffRules(["unicorn/no-non-function-verb-prefix"]),
    },
    {
        files: [
            "src/augments/doc.ts",
            "src/printer/**/*.ts",
            "test/prettier-versions.mock.script.ts",
        ],
        name: "Existing boolean terminology",
        rules: turnOffRules(["unicorn/consistent-boolean-name"]),
    },
    {
        files: ["src/preprocessing.ts", "src/printer/child-docs.ts"],
        name: "Recursive Prettier traversal",
        rules: turnOffRules(["unicorn/no-useless-recursion"]),
    },
    {
        files: ["test/run-tests.mock.ts"],
        name: "Fixture runner test definitions",
        rules: turnOffRules([
            "unicorn/prefer-error-is-error",
            "vitest/consistent-test-it",
            "vitest/expect-expect",
            "vitest/no-conditional-expect",
            "vitest/no-conditional-in-test",
            "vitest/no-disabled-tests",
            "vitest/no-focused-tests",
            "vitest/padding-around-expect-groups",
            "vitest/prefer-each",
            "vitest/prefer-expect-assertions",
            "vitest/require-top-level-describe",
        ]),
    },
    {
        files: ["src/printer/insert-new-lines.ts"],
        name: "Prettier doc mutation complexity",
        rules: turnOffRules(["complexity"]),
    },
    {
        files: [".gitleaks.toml", "cliff.toml"],
        name: "Prettier doc mutation complexity",
        rules: turnOffRules(["tombi/tombi"]),
    },
    {
        files: prettierAstBoundaryFiles,
        name: "Prettier AST and doc type boundaries",
        rules: turnOffRules([
            "@typescript-eslint/no-unsafe-argument",
            "@typescript-eslint/no-unsafe-assignment",
            "@typescript-eslint/no-unsafe-member-access",
            "@typescript-eslint/no-unsafe-return",
            "@typescript-eslint/no-unsafe-type-assertion",
            "@typescript-eslint/prefer-readonly-parameter-types",
            "@typescript-eslint/strict-boolean-expressions",
        ]),
    },
    {
        files: [...fixtureTestFiles, "src/**/*.ts"],
        name: "Legacy declaration and object ordering",
        rules: turnOffRules([
            "perfectionist/sort-modules",
            "perfectionist/sort-objects",
        ]),
    },
    {
        files: ["src/**/*.ts"],
        name: "Documentation coverage backlog",
        rules: turnOffRules([
            "typedoc/require-exported-doc-comment",
            "tsdoc-require-2/require",
        ]),
    },
    {
        files: fixtureTestFiles,
        name: "Generated-style test cases",
        rules: turnOffRules([
            "test-signal/require-assertions",
            "test-signal/require-negative-path",
            "vitest/no-conditional-tests",
            "vitest/padding-around-all",
            "vitest/padding-around-test-blocks",
            "vitest/prefer-importing-vitest-globals",
        ]),
    },
];

export default config;
