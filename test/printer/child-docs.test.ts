import { doc, type Doc } from "prettier";
import { describe, expect, it } from "vitest";

import { walkDoc } from "../../src/printer/child-docs.js";

describe(walkDoc, () => {
    it("walks array, contents, and parts children with parent metadata", () => {
        expect.assertions(1);

        const visited: string[] = [];
        const fillDoc = {
            type: "fill",
            parts: ["filled", doc.builders.line],
        } as unknown as Doc;
        const inputDoc = ["root", doc.builders.group(["grouped", fillDoc])];

        walkDoc({
            startDoc: inputDoc,
            debug: false,
            callback: (currentDoc, parents, index) => {
                const label =
                    typeof currentDoc === "string"
                        ? currentDoc
                        : Array.isArray(currentDoc)
                          ? "array"
                          : currentDoc.type;
                visited.push(`${label}:${String(index)}:${parents.length}`);
                return true;
            },
        });

        expect(visited).toStrictEqual([
            "array:undefined:0",
            "root:0:1",
            "group:1:1",
            "array:undefined:2",
            "grouped:0:3",
            "fill:1:3",
            "array:undefined:4",
            "filled:0:5",
            "line:1:5",
        ]);
    });

    it("stops walking a node's children when the callback returns false", () => {
        expect.assertions(1);

        const visited: string[] = [];

        walkDoc({
            startDoc: [
                "first",
                ["blocked-child"],
                "last",
            ],
            debug: false,
            callback: (currentDoc) => {
                const label = Array.isArray(currentDoc)
                    ? "array"
                    : typeof currentDoc === "string"
                      ? currentDoc
                      : currentDoc.type;
                visited.push(label);
                return label !== "array" || visited.length === 1;
            },
        });

        expect(visited).toStrictEqual([
            "array",
            "first",
            "array",
        ]);
    });

    it("treats empty docs as a successful no-op walk", () => {
        expect.assertions(1);

        const visited: unknown[] = [];

        expect(
            walkDoc({
                startDoc: "",
                debug: false,
                callback: (currentDoc) => {
                    visited.push(currentDoc);
                    return true;
                },
            })
        ).toBe(true);
    });
});
