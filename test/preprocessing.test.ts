import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

import * as localPlugin from "../src/index.js";

const inputJson = '{"z":[3,2],"a":[1,0]}';

describe("parser plugin delegation", () => {
    it("delegates to sort-json without leaking it into later formats", async () => {
        expect.assertions(2);

        await expect(
            prettier.format(inputJson, {
                jsonRecursiveSort: true,
                multilineArraysWrapThreshold: 1,
                parser: "json",
                plugins: ["prettier-plugin-sort-json", localPlugin],
                tabWidth: 4,
            })
        ).resolves.toBe(`{ "a": [
        1,
        0
    ], "z": [
        3,
        2
    ] }
`);

        await expect(
            prettier.format(inputJson, {
                multilineArraysWrapThreshold: 1,
                parser: "json",
                plugins: [localPlugin],
                tabWidth: 4,
            })
        ).resolves.toBe(`{ "z": [
        3,
        2
    ], "a": [
        1,
        0
    ] }
`);
    });
});
