import { describe, expect, it } from "vitest";

import { extractTextBetweenRanges } from "../../src/augments/array.js";

describe(extractTextBetweenRanges, () => {
    it("extracts text from multiple lines", () => {
        expect.assertions(1);

        expect(
            extractTextBetweenRanges(
                [
                    "a b c d e f g h i j k l m n",
                    "o p q r s",
                    "t u v w x y",
                    "z",
                ],
                {
                    start: {
                        line: 0,
                        column: 4,
                    },
                    end: {
                        line: 2,
                        column: 3,
                    },
                }
            )
        ).toBe(" d e f g h i j k l m n\no p q r s\nt u");
    });

    it("extracts text from the same line", () => {
        expect.assertions(1);

        expect(
            extractTextBetweenRanges(["a b c d e f g h i j k l m n"], {
                start: {
                    line: 0,
                    column: 4,
                },
                end: {
                    line: 0,
                    column: 7,
                },
            })
        ).toBe(" d");
    });
});
