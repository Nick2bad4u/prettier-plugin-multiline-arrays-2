import { check } from "@augment-vir/assert";
import {
    omitObjectKeys,
    type PartialWithNullable,
    removeColor,
    removeNullishValues,
} from "@augment-vir/common";
import * as prettier from "prettier";
import { objectHasIn } from "ts-extras";
import { expect, it } from "vitest";

import type { MultilineArrayOptions } from "../src/options.js";

import { repoConfig } from "./prettier-config.js";

type PrettierOptions = prettier.Options;

async function runPrettierFormat({
    code,
    extension,
    options = {},
    parser,
}: Readonly<{
    code: string;
    extension: string;
    options?:
        | (Partial<MultilineArrayOptions> &
              PartialWithNullable<PrettierOptions>)
        | undefined;
    parser: string | undefined;
}>): Promise<string> {
    const normalizedExtension = extension.startsWith(".")
        ? extension.slice(1)
        : extension;

    const filepathOptions: Partial<Pick<PrettierOptions, "filepath">> =
        check.isString(options.filepath)
            ? {
                  filepath: options.filepath,
              }
            : objectHasIn(options, "filepath")
              ? {}
              : {
                    filepath: `blah.${normalizedExtension}`,
                };

    const prettierOptions: PrettierOptions = {
        ...repoConfig,
        ...removeNullishValues(omitObjectKeys(options, ["filepath"])),
        ...filepathOptions,
        ...(parser && {
            parser,
        }),
    };

    return await prettier.format(code, prettierOptions);
}

export interface MultilineArrayTest {
    code: string;
    expect?: string | undefined;
    failureMessage?: string;
    it: string;
    options?:
        | (Partial<MultilineArrayOptions> &
              PartialWithNullable<PrettierOptions>)
        | undefined;
}

function removeLeadingBlankLine(input: string): string {
    const firstNewLineIndex = input.indexOf("\n");

    if (
        firstNewLineIndex === -1 ||
        input.slice(0, firstNewLineIndex).trim() !== ""
    ) {
        return input;
    }

    return input.slice(firstNewLineIndex + 1).trimStart();
}

function isIndentOnly(input: string): boolean {
    for (const character of input) {
        if (character !== "\t" && character !== " ") {
            return false;
        }
    }

    return true;
}

function removeTrailingIndent(input: string): string {
    const lastNewLineIndex = input.lastIndexOf("\n");
    const trailingIndent = input.slice(lastNewLineIndex + 1);

    if (
        lastNewLineIndex === -1 ||
        trailingIndent.length === 0 ||
        !isIndentOnly(trailingIndent)
    ) {
        return input;
    }

    return input.slice(0, lastNewLineIndex + 1);
}

function removeIndent(input: string): string {
    return removeTrailingIndent(
        removeLeadingBlankLine(input).replaceAll("\n            ", "\n")
    );
}

export function runTests({
    extension,
    tests,
    parser,
}: Readonly<{
    extension: string;
    parser: string;
    tests: MultilineArrayTest[];
}>): void {
    function createTestCallback(test: MultilineArrayTest) {
        return async function testCallback() {
            try {
                const inputCode = removeIndent(test.code);
                const expected = removeIndent(test.expect ?? test.code);
                const formatted = await runPrettierFormat({
                    code: inputCode,
                    extension,
                    options: test.options,
                    parser,
                });
                expect(formatted).toBe(expected);
            } catch (error) {
                if (test.failureMessage && error instanceof Error) {
                    const strippedMessage = removeColor(error.message);
                    if (test.failureMessage !== strippedMessage) {
                        console.info({
                            strippedMessage,
                        });
                    }
                    expect(removeColor(strippedMessage)).toBe(
                        test.failureMessage
                    );
                } else {
                    throw error;
                }
            }
        };
    }

    for (const test of tests) {
        const testCallback = createTestCallback(test);
        it(test.it, testCallback);
    }
}
