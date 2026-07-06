import { describe, expect, it } from "vitest";

import {
    type MultilineArrayOptions,
    optionPropertyValidators,
} from "./options.js";

describe("optionPropertyValidators", () => {
    const cases: readonly {
        expect: boolean;
        input: unknown;
        optionType: keyof MultilineArrayOptions;
        title: string;
    }[] = [
        {
            title: "allows -1 for multilineArraysWrapThreshold",
            optionType: "multilineArraysWrapThreshold",
            input: -1,
            expect: true,
        },
        {
            title: "allows numbers for multilineArraysWrapThreshold",
            optionType: "multilineArraysWrapThreshold",
            input: 63,
            expect: true,
        },
        {
            title: "rejects strings for multilineArraysWrapThreshold",
            optionType: "multilineArraysWrapThreshold",
            input: "63",
            expect: false,
        },
        {
            title: "allows numeric strings for multilineArraysLinePattern",
            optionType: "multilineArraysLinePattern",
            input: "63",
            expect: true,
        },
        {
            title: "rejects non-numeric strings for multilineArraysLinePattern",
            optionType: "multilineArraysLinePattern",
            input: "63 keys",
            expect: false,
        },
    ];

    for (const testCase of cases) {
        it(testCase.title, () => {
            expect(
                optionPropertyValidators[testCase.optionType](testCase.input)
            ).toBe(testCase.expect);
        });
    }
});
