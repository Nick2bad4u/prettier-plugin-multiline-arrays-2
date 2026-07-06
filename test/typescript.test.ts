import { describe } from "vitest";

import { runTests } from "./run-tests.mock.js";
import { typescriptTests } from "./typescript-tests.mock.js";

describe("typescript multiline array formatting", () => {
    runTests({
        extension: ".ts",
        tests: typescriptTests,
        parser: "typescript",
    });
});
