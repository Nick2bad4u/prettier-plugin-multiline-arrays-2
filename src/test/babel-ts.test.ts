import { describe } from "@augment-vir/test";
import { runTests } from "./run-tests.mock.js";
import { typescriptTests } from "./typescript-tests.mock.js";

describe("babel-ts multiline array formatting", () => {
    runTests({
        extension: ".ts",
        tests: typescriptTests,
        parser: "babel-ts",
    });
});
