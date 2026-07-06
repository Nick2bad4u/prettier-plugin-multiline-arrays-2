import { describe, expect, it } from "vitest";

import { capitalizeFirst } from "../../src/augments/string.js";

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
