import { describe, expect, it } from "vitest";

import { runTests } from "./run-tests.mock.js";
import { typescriptTests } from "./typescript-tests.mock.js";

describe("typescript multiline array formatting", () => {
    it("defines TypeScript fixture cases", () => {
        expect.assertions(1);

        expect(typescriptTests.length).toBeGreaterThan(0);
    });

    runTests({
        extension: ".ts",
        tests: typescriptTests,
        parser: "typescript",
    });
});
