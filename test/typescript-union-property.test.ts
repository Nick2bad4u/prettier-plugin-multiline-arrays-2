import fc from "fast-check";
import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

import type { MultilineArrayOptions } from "../src/options.js";

import { repoConfig } from "./prettier-config.js";

type TypeScriptParserName = "babel-ts" | "typescript";

interface TypeUnionContext {
    buildCode: (unionType: string) => string;
    memberArbitrary: fc.Arbitrary<string[]>;
    name: string;
}

const scalarTypeMembers = [
    '"empty"',
    '"identifier"',
    '"literal"',
    "Array<string>",
    "boolean",
    "null",
    "number",
    "readonly string[]",
    "string",
    "undefined",
] as const;

const stringLiteralTypeMembers = [
    '"empty"',
    '"identifier"',
    '"literal"',
    '"multiple"',
    '"spread"',
] as const;

const objectTypeMembers = [
    "{ readonly empty: 1 }",
    "{ readonly identifier: 2 }",
    "{ readonly literal: 3 }",
    "{ readonly multiple: 4 }",
    "{ readonly spread: 5 }",
] as const;

const scalarUnionArbitrary = fc.uniqueArray(
    fc.constantFrom(...scalarTypeMembers),
    {
        maxLength: 5,
        minLength: 3,
    }
);
const stringLiteralUnionArbitrary = fc.uniqueArray(
    fc.constantFrom(...stringLiteralTypeMembers),
    {
        maxLength: 5,
        minLength: 3,
    }
);
const objectUnionArbitrary = fc.uniqueArray(
    fc.constantFrom(...objectTypeMembers),
    {
        maxLength: 5,
        minLength: 3,
    }
);

const typeUnionContexts = [
    {
        buildCode: (unionType) => `type Generated = ${unionType};`,
        memberArbitrary: scalarUnionArbitrary,
        name: "type alias",
    },
    {
        buildCode: (unionType) => `const value = input as ${unionType};`,
        memberArbitrary: stringLiteralUnionArbitrary,
        name: "as assertion",
    },
    {
        buildCode: (unionType) =>
            `const config = { empty: 1 } satisfies ${unionType};`,
        memberArbitrary: objectUnionArbitrary,
        name: "satisfies expression",
    },
    {
        buildCode: (unionType) =>
            `const fn = (value: ${unionType}): void => { void value; };`,
        memberArbitrary: scalarUnionArbitrary,
        name: "parameter annotation",
    },
    {
        buildCode: (unionType) =>
            `const fn = (): ${unionType} => undefined as never;`,
        memberArbitrary: scalarUnionArbitrary,
        name: "return annotation",
    },
    {
        buildCode: (unionType) =>
            `type Generated = Record<string, ${unionType}>;`,
        memberArbitrary: scalarUnionArbitrary,
        name: "generic type argument",
    },
    {
        buildCode: (unionType) =>
            `declare const values: readonly (${unionType})[];`,
        memberArbitrary: scalarUnionArbitrary,
        name: "readonly array type",
    },
    {
        buildCode: (unionType) =>
            `type Generated<Value> = Value extends ${unionType} ? true : false;`,
        memberArbitrary: scalarUnionArbitrary,
        name: "conditional extends type",
    },
    {
        buildCode: (unionType) =>
            `type Generated<Value> = ${unionType} extends Value ? true : false;`,
        memberArbitrary: scalarUnionArbitrary,
        name: "conditional check type",
    },
    {
        buildCode: (unionType) =>
            `type Generated<Value> = Value[${unionType}];`,
        memberArbitrary: stringLiteralUnionArbitrary,
        name: "indexed access index type",
    },
    {
        buildCode: (unionType) => `type Generated = (${unionType})["empty"];`,
        memberArbitrary: objectUnionArbitrary,
        name: "indexed access object type",
    },
    {
        buildCode: (unionType) => `type Generated = keyof (${unionType});`,
        memberArbitrary: objectUnionArbitrary,
        name: "keyof type operator",
    },
    {
        buildCode: (unionType) =>
            `function isGenerated(input: unknown): input is ${unionType} { return true; }`,
        memberArbitrary: stringLiteralUnionArbitrary,
        name: "type predicate",
    },
    {
        buildCode: (unionType) =>
            `type Generated = { [Key in ${unionType}]: Key };`,
        memberArbitrary: stringLiteralUnionArbitrary,
        name: "mapped type key",
    },
    {
        buildCode: (unionType) =>
            `type Generated<Value extends ${unionType}> = Value;`,
        memberArbitrary: scalarUnionArbitrary,
        name: "type parameter constraint",
    },
    {
        buildCode: (unionType) =>
            `type Generated<Value = ${unionType}> = Value;`,
        memberArbitrary: scalarUnionArbitrary,
        name: "type parameter default",
    },
] as const satisfies readonly TypeUnionContext[];

const invalidInlineUnionStartFragments = [
    ": |",
    "= |",
    "[ |",
    "[|",
    "as |",
    "extends |",
    "in |",
    "is |",
    "keyof |",
    "satisfies |",
] as const;

function collapseInlineWhitespace(input: string): string {
    let collapsedInput = input.replaceAll("\t", " ");

    while (collapsedInput.includes("  ")) {
        collapsedInput = collapsedInput.replaceAll("  ", " ");
    }

    return collapsedInput;
}

function hasInvalidInlineUnionStart(input: string): boolean {
    return input
        .split("\n")
        .some((line) =>
            invalidInlineUnionStartFragments.some((fragment) =>
                collapseInlineWhitespace(line).includes(fragment)
            )
        );
}

const unionFormattingCaseArbitrary = fc
    .record({
        context: fc.constantFrom(...typeUnionContexts),
        parser: fc.constantFrom<TypeScriptParserName>("typescript", "babel-ts"),
        printWidth: fc.integer({
            max: 120,
            min: 40,
        }),
    })
    .chain(({ context, parser, printWidth }) =>
        context.memberArbitrary.map((members) => ({
            context,
            members,
            parser,
            printWidth,
        }))
    );

const formatTypeScript = async ({
    code,
    parser,
    printWidth,
}: Readonly<{
    code: string;
    parser: TypeScriptParserName;
    printWidth: number;
}>): Promise<string> => {
    const prettierOptions: Partial<MultilineArrayOptions> & prettier.Options = {
        ...repoConfig,
        filepath: `generated.${parser === "babel-ts" ? "ts" : "mts"}`,
        multilineTypeUnionsWrapThreshold: 2,
        parser,
        printWidth,
    };

    return await prettier.format(code, prettierOptions);
};

describe("union property formatting", () => {
    it("keeps generated wrapped unions parseable, idempotent, and detached from introducers", async () => {
        expect.assertions(1);

        await expect(
            fc.assert(
                fc.asyncProperty(
                    unionFormattingCaseArbitrary,
                    async ({ context, members, parser, printWidth }) => {
                        const unionType = members.join(" | ");
                        const code = context.buildCode(unionType);
                        const formatted = await formatTypeScript({
                            code,
                            parser,
                            printWidth,
                        });
                        const reformatted = await formatTypeScript({
                            code: formatted,
                            parser,
                            printWidth,
                        });

                        if (reformatted !== formatted) {
                            throw new Error(
                                [
                                    `Non-idempotent union formatting for ${context.name} with ${parser}.`,
                                    `Input: ${code}`,
                                    `Formatted: ${formatted}`,
                                    `Reformatted: ${reformatted}`,
                                ].join("\n")
                            );
                        }

                        if (hasInvalidInlineUnionStart(formatted)) {
                            throw new Error(
                                [
                                    `Invalid inline union start for ${context.name} with ${parser}.`,
                                    `Input: ${code}`,
                                    `Formatted: ${formatted}`,
                                ].join("\n")
                            );
                        }
                    }
                ),
                {
                    numRuns: 96,
                }
            )
        ).resolves.toBeUndefined();
    });
});
