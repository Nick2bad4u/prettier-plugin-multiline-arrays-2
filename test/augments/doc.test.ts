import { doc, type Doc } from "prettier";
import { describe, expect, it } from "vitest";

import { isDocCommand, stringifyDoc } from "../../src/augments/doc.js";

function flattenUnknown(input: unknown): unknown[] {
    return Array.isArray(input) ? input.flatMap(flattenUnknown) : [input];
}

describe(stringifyDoc, () => {
    it("stringifies primitive doc values", () => {
        expect.assertions(3);

        expect(stringifyDoc("literal")).toStrictEqual(["literal"]);
        expect(stringifyDoc(null)).toStrictEqual(["null"]);
        expect(stringifyDoc(undefined)).toStrictEqual(["undefined"]);
    });

    it("stringifies nested doc arrays recursively", () => {
        expect.assertions(1);

        expect(
            stringifyDoc([
                "[",
                ["value"],
                "]",
            ])
        ).toStrictEqual([
            ["["],
            [["value"]],
            ["]"],
        ]);
    });

    it("includes command child properties when recursive output is enabled", () => {
        expect.assertions(1);

        const groupDoc = {
            type: "group",
            contents: [
                "before",
                doc.builders.line,
                "after",
            ],
        } as unknown as Doc;
        const flattenedDoc = flattenUnknown(stringifyDoc(groupDoc, true));

        expect(flattenedDoc).toStrictEqual([
            "group:",
            "contents:",
            "before",
            "line",
            "after",
        ]);
    });
});

describe(isDocCommand, () => {
    it("detects Prettier doc command objects", () => {
        expect.assertions(4);

        expect(isDocCommand(doc.builders.line)).toBe(true);
        expect(isDocCommand("literal")).toBe(false);
        expect(isDocCommand(["literal"])).toBe(false);
        expect(isDocCommand(undefined)).toBe(false);
    });
});
