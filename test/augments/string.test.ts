import { describe, expect, it } from "vitest";

import { capitalizeFirst, stringify } from "../../src/augments/string.js";

describe(capitalizeFirst, () => {
    it.each([
        {
            input: "",
            output: "",
        },
        {
            input: "multiline arrays",
            output: "Multiline arrays",
        },
        {
            input: "Already capitalized",
            output: "Already capitalized",
        },
    ])("capitalizes '$input'", ({ input, output }) => {
        expect.assertions(1);

        expect(capitalizeFirst(input)).toBe(output);
    });
});

describe(stringify, () => {
    it("handles primitive and circular values", () => {
        expect.assertions(3);

        expect(stringify(undefined)).toBe("undefined");
        expect(stringify({ value: 1n })).toBe('{"value":1}');

        const circular: { self?: unknown } = {};
        circular.self = circular;

        expect(stringify(circular)).toBe("[object Object]");
    });
});
