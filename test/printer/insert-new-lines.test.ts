import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

import { insertLinesIntoArray } from "../../src/printer/insert-new-lines.js";

type Doc = prettier.Doc;

describe(insertLinesIntoArray, () => {
    it("handles comment-only array doc emitted by Prettier GitHub Issue #75", () => {
        expect.assertions(1);

        const commentOnlyArrayDoc: Doc = [
            "[",
            [
                prettier.doc.builders.indent([
                    prettier.doc.builders.softline,
                    [
                        '// "source.fixAll.eslint",',
                        [
                            prettier.doc.builders.hardline,
                            prettier.doc.builders.breakParent,
                        ],
                        '// "source.fixAll.prettier",',
                    ],
                ]),
                [
                    prettier.doc.builders.hardline,
                    prettier.doc.builders.breakParent,
                ],
            ],
            "]",
        ];

        expect(
            insertLinesIntoArray({
                inputDoc: commentOnlyArrayDoc,
                manualWrap: false,
                lineCounts: [],
                wrapThreshold: Infinity,
                debug: false,
            })
        ).toBe(commentOnlyArrayDoc);
    });
});
