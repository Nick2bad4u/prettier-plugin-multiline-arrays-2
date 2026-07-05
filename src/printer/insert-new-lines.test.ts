import { assert } from "@augment-vir/assert";
import { describe, it } from "@augment-vir/test";
import { doc } from "prettier";
import type { Doc } from "prettier";
import { insertLinesIntoArray } from "./insert-new-lines.js";

describe(insertLinesIntoArray.name, () => {
    it("handles comment-only array doc emitted by Prettier GitHub Issue #75", () => {
        const commentOnlyArrayDoc: Doc = [
            "[",
            [
                doc.builders.indent([
                    doc.builders.softline,
                    [
                        '// "source.fixAll.eslint",',
                        [doc.builders.hardline, doc.builders.breakParent],
                        '// "source.fixAll.prettier",',
                    ],
                ]),
                [doc.builders.hardline, doc.builders.breakParent],
            ],
            "]",
        ];

        assert.strictEquals(
            insertLinesIntoArray({
                inputDoc: commentOnlyArrayDoc,
                manualWrap: false,
                lineCounts: [],
                wrapThreshold: Infinity,
                debug: false,
            }),
            commentOnlyArrayDoc
        );
    });
});
