import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

import * as localPlugin from "../src/index.js";

describe("range formatting", () => {
    it("reuses an already-processed array Doc without crashing", async () => {
        expect.assertions(2);

        const input = 'const untouched={a:1};\nconst values=["a","b","c"];\n';
        const rangeStart = input.indexOf("const values");
        const options: prettier.Options = {
            parser: "babel",
            plugins: [localPlugin],
            multilineArraysWrapThreshold: 2,
            rangeStart,
            rangeEnd: input.length,
        };
        const expected = `const untouched={a:1};
const values = [
  "a",
  "b",
  "c",
];
`;

        const formatted = await prettier.format(input, options);

        expect(formatted).toBe(expected);
        await expect(
            prettier.format(formatted, {
                ...options,
                rangeStart: formatted.indexOf("const values"),
                rangeEnd: formatted.length,
            })
        ).resolves.toBe(expected);
    });
});
