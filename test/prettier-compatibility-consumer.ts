import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

interface CompatibilityCase {
    expected: string;
    input: string;
    label: string;
    options: Readonly<Record<string, unknown>>;
}

interface VerifyPrettierConsumerOptions {
    consumerDirectory: string;
    expectedPackageVersion: string;
    expectedPrettierVersion: string;
    packageName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

async function readPackageJson(
    packageDirectory: string
): Promise<Record<string, unknown>> {
    const packageJson: unknown = JSON.parse(
        await readFile(path.join(packageDirectory, "package.json"), "utf8")
    );

    if (!isRecord(packageJson)) {
        throw new TypeError(
            `Expected ${packageDirectory}/package.json to contain an object.`
        );
    }

    return packageJson;
}

async function format(
    prettierModule: Record<string, unknown>,
    input: string,
    options: Readonly<Record<string, unknown>>
): Promise<string> {
    const formatFunction = prettierModule.format;

    if (typeof formatFunction !== "function") {
        throw new TypeError("Expected Prettier to export a format function.");
    }

    const typedFormatFunction = formatFunction as (
        input: string,
        options: Readonly<Record<string, unknown>>
    ) => unknown;
    const result: unknown = await typedFormatFunction(input, options);

    if (typeof result !== "string") {
        throw new TypeError("Expected Prettier format output to be a string.");
    }

    return result;
}

export async function verifyPrettierConsumer({
    consumerDirectory,
    expectedPackageVersion,
    expectedPrettierVersion,
    packageName,
}: Readonly<VerifyPrettierConsumerOptions>): Promise<void> {
    const nodeModulesDirectory = path.join(consumerDirectory, "node_modules");
    const prettierDirectory = path.join(nodeModulesDirectory, "prettier");
    const pluginDirectory = path.join(nodeModulesDirectory, packageName);
    const prettierPackageJson = await readPackageJson(prettierDirectory);
    const pluginPackageJson = await readPackageJson(pluginDirectory);

    assert.equal(prettierPackageJson.version, expectedPrettierVersion);
    assert.equal(pluginPackageJson.version, expectedPackageVersion);
    assert.equal(pluginPackageJson.main, "./dist/index.js");

    const prettierModule: unknown = await import(
        pathToFileURL(path.join(prettierDirectory, "index.mjs")).href
    );
    const pluginModule: unknown = await import(
        pathToFileURL(path.join(pluginDirectory, "dist", "index.js")).href
    );

    if (!isRecord(prettierModule) || !isRecord(pluginModule)) {
        throw new TypeError(
            "Expected Prettier and the plugin to export module objects."
        );
    }

    assert.equal(typeof pluginModule.parsers, "object");
    assert.equal(typeof pluginModule.options, "object");

    const compatibilityCases: readonly CompatibilityCase[] = [
        {
            expected: `const values = [
    1,
    2,
    3,
];
`,
            input: "const values = [1, 2, 3];",
            label: "JavaScript arrays",
            options: {
                multilineArraysWrapThreshold: 2,
                parser: "babel",
            },
        },
        {
            expected: `{ "values": [
        1,
        2,
        3
    ] }
`,
            input: '{"values":[1,2,3]}',
            label: "JSON arrays",
            options: {
                multilineArraysWrapThreshold: 2,
                parser: "json",
            },
        },
        {
            expected: `type ArgumentTemplateId =
    | 'empty'
    | 'identifier'
    | 'literal';
`,
            input: `type ArgumentTemplateId = "empty" | "identifier" | "literal";`,
            label: "TypeScript unions",
            options: {
                multilineTypeUnionsWrapThreshold: 2,
                parser: "typescript",
                singleQuote: true,
                tabWidth: 4,
            },
        },
    ];

    for (const { expected, input, label, options } of compatibilityCases) {
        const formatOptions: Readonly<Record<string, unknown>> = {
            ...options,
            plugins: [pluginModule],
            tabWidth: 4,
        };
        const formatted = await format(prettierModule, input, formatOptions);

        assert.equal(formatted, expected, `${label} output changed.`);
        assert.equal(
            await format(prettierModule, formatted, formatOptions),
            formatted,
            `${label} formatting is not idempotent.`
        );
    }

    process.stdout.write(
        `Verified ${packageName}@${expectedPackageVersion} with Prettier ${expectedPrettierVersion}.\n`
    );
}
