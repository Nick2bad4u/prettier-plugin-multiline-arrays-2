import fc from "fast-check";
import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

import type { MultilineArrayOptions } from "../src/options.js";

import { repoConfig } from "./prettier-config.js";

type ArrayParserName =
    | "babel"
    | "babel-ts"
    | "json5"
    | "json"
    | "typescript";

interface ArrayFormattingCase {
    code: string;
    parser: ArrayParserName;
    printWidth: number;
}

interface ExpressionArrayContext {
    buildCode: (arrayExpression: string) => string;
    name: string;
}

const expressionArrayElements = [
    "0",
    "1",
    "'alpha'",
    "'beta'",
    "'gamma'",
    "() => value",
    "[1, 2]",
    "false",
    "null",
    "true",
    "undefined",
    "value",
    "value?.id ?? 'fallback'",
    "{id: 1}",
] as const;

const jsonArrayElements = [
    "0",
    "1",
    '"alpha"',
    '"beta"',
    '"gamma"',
    "false",
    "null",
    "true",
    '{"id": 1}',
] as const;

const expressionArrayContexts = [
    {
        buildCode: (arrayExpression) =>
            `const generated = callGenerated(${arrayExpression});`,
        name: "call argument",
    },
    {
        buildCode: (arrayExpression) => `export default ${arrayExpression};`,
        name: "default export",
    },
    {
        buildCode: (arrayExpression) =>
            `const generated = {items: ${arrayExpression}};`,
        name: "object property",
    },
    {
        buildCode: (arrayExpression) => `const generated = ${arrayExpression};`,
        name: "variable initializer",
    },
    {
        buildCode: (arrayExpression) =>
            `while (${arrayExpression}.includes(value)) { break; }`,
        name: "while condition",
    },
] as const satisfies readonly ExpressionArrayContext[];

const expressionParserArbitrary = fc.constantFrom<ArrayParserName>(
    "babel",
    "babel-ts",
    "typescript"
);
const jsonParserArbitrary = fc.constantFrom<ArrayParserName>("json", "json5");

const expressionArrayCaseArbitrary = fc
    .record({
        context: fc.constantFrom(...expressionArrayContexts),
        elements: fc.uniqueArray(fc.constantFrom(...expressionArrayElements), {
            maxLength: 7,
            minLength: 4,
        }),
        parser: expressionParserArbitrary,
        printWidth: fc.integer({
            max: 120,
            min: 40,
        }),
    })
    .map(({ context, elements, parser, printWidth }) => {
        const arrayExpression = `[${elements.join(", ")}]`;

        return {
            code: context.buildCode(arrayExpression),
            parser,
            printWidth,
        } satisfies ArrayFormattingCase;
    });

const jsonArrayCaseArbitrary = fc
    .record({
        elements: fc.uniqueArray(fc.constantFrom(...jsonArrayElements), {
            maxLength: 7,
            minLength: 4,
        }),
        parser: jsonParserArbitrary,
        printWidth: fc.integer({
            max: 120,
            min: 40,
        }),
    })
    .map(
        ({ elements, parser, printWidth }) =>
            ({
                code: `[${elements.join(", ")}]`,
                parser,
                printWidth,
            }) satisfies ArrayFormattingCase
    );

const arrayFormattingCaseArbitrary = fc.oneof(
    expressionArrayCaseArbitrary,
    jsonArrayCaseArbitrary
);

const parserFileExtensions = {
    babel: "js",
    "babel-ts": "ts",
    json: "json",
    json5: "json5",
    typescript: "ts",
} as const satisfies Readonly<Record<ArrayParserName, string>>;

const formatArraySource = async ({
    code,
    parser,
    printWidth,
}: Readonly<ArrayFormattingCase>): Promise<string> => {
    const prettierOptions: Partial<MultilineArrayOptions> & prettier.Options = {
        ...repoConfig,
        filepath: `generated.${parserFileExtensions[parser]}`,
        multilineArraysLinePattern: "",
        multilineArraysWrapThreshold: 2,
        parser,
        printWidth,
    };

    return await prettier.format(code, prettierOptions);
};

function hasWrappedArray(input: string): boolean {
    return (
        input.includes("[\n") &&
        input.split("\n").some((line) => line.trimStart().startsWith("]"))
    );
}

describe("array property formatting", () => {
    it("keeps generated wrapped arrays parseable, idempotent, and multiline", async () => {
        expect.assertions(1);

        await expect(
            fc.assert(
                fc.asyncProperty(
                    arrayFormattingCaseArbitrary,
                    async ({ code, parser, printWidth }) => {
                        const formatted = await formatArraySource({
                            code,
                            parser,
                            printWidth,
                        });
                        const reformatted = await formatArraySource({
                            code: formatted,
                            parser,
                            printWidth,
                        });

                        if (reformatted !== formatted) {
                            throw new Error(
                                [
                                    `Non-idempotent array formatting with ${parser}.`,
                                    `Input: ${code}`,
                                    `Formatted: ${formatted}`,
                                    `Reformatted: ${reformatted}`,
                                ].join("\n")
                            );
                        }

                        if (!hasWrappedArray(formatted)) {
                            throw new Error(
                                [
                                    `Expected multiline array formatting with ${parser}.`,
                                    `Input: ${code}`,
                                    `Formatted: ${formatted}`,
                                ].join("\n")
                            );
                        }
                    }
                ),
                {
                    numRuns: 128,
                }
            )
        ).resolves.toBeUndefined();
    });
});
