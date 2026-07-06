import { describe } from "vitest";

import { nextWrapThresholdComment } from "../options.js";
import { type MultilineArrayTest, runTests } from "./run-tests.mock.js";

const jsonTests: MultilineArrayTest[] = [
    {
        it: "formats ending array correctly",
        code: `
            {
                "files": [],
                "references": [
                    {"path": "./tsconfig.app.json"},
                    {"path": "./tsconfig.node.json"}
                ]
            }
        `,
    },
    {
        it: "basic JSON format",
        code: `
            {
                "hello": "there",
                "stuff": ["a", "b", "c", "d", "e"],
                "object": {"example": "instance"}
            }
        `,
        expect: `
            {
                "hello": "there",
                "stuff": [
                    "a",
                    "b",
                    "c",
                    "d",
                    "e"
                ],
                "object": {"example": "instance"}
            }
        `,
        options: {
            multilineArraysWrapThreshold: 0,
        },
    },
    {
        it: "still formats tsconfig.json keys",
        code: `
            {
                "exclude": [
                    "./configs",
                    "./coverage",
                    "./dist",
                    "./node_modules",
                    "./test-files"
                ],
                "compilerOptions": {
                    "outDir": "./dist",
                    "rootDir": "./src"
                }
            }
        `,
        expect: `
            {
                "exclude": [
                    "./configs",
                    "./coverage",
                    "./dist",
                    "./node_modules",
                    "./test-files"
                ],
                "compilerOptions": {
                    "outDir": "./dist",
                    "rootDir": "./src"
                }
            }
        `,
    },
    {
        it: "basic wrap threshold comment",
        code: `
            // ${nextWrapThresholdComment} 3
            ["hello"]
        `,
    },
    {
        it: "invalid wrap threshold triggers error",
        code: `
            ["hello"]
        `,
        options: {
            multilineArraysWrapThreshold: "fifty two" as unknown as number,
        },
        failureMessage:
            'Invalid multilineArraysWrapThreshold value. Expected an integer, but received "fifty two".',
    },
    {
        it: "exact code desired by Robinfr",
        code: `
            [
                ["thing1"],
                ["thing2"]
            ]
        `,
        options: {
            multilineArraysWrapThreshold: 1,
        },
    },
    {
        it: "wrap threshold through options",
        code: `
            ["hello"]
        `,
        options: {
            multilineArraysWrapThreshold: 3,
        },
    },
    {
        it: "line count through options",
        code: `
            ["a", "b", "c", "d", "e", "f", "g", "h"]
        `,
        expect: `
            [
                "a",
                "b", "c",
                "d", "e", "f",
                "g",
                "h"
            ]
        `,
        options: {
            multilineArraysLinePattern: "1 2 3",
        },
    },
    {
        it: "line count overrides threshold",
        code: `
            ["a", "b", "c", "d", "e", "f", "g", "h"]
        `,
        expect: `
            [
                "a",
                "b", "c",
                "d", "e", "f",
                "g",
                "h"
            ]
        `,
        options: {
            multilineArraysLinePattern: "1 2 3",
            multilineArraysWrapThreshold: 20,
        },
    },
    {
        it: "pointless wrap threshold comment",
        code: `
            // ${nextWrapThresholdComment} 0
            [
                "hello"
            ]
        `,
    },
    {
        it: "leaves trailing newline",
        code: `
            {
                "import": ".cspell-base.json",
                "words": [
                    "estree",
                    "hardline",
                    "jsplugin",
                    "mmultiline",
                    "vite"
                ]
            }
        `,
    },
    {
        /**
         * This test is weird, it won't work if the newline before "example"
         * isn't there.
         */
        it: "with object array element",
        code: `
            {
                "hello": "there",
                "stuff": ["a", "b", "c", "d", "e", {
                    "example": "instance"}],
                "object": {"example": "instance"}
            }
        `,
        expect: `
            {
                "hello": "there",
                "stuff": [
                    "a",
                    "b",
                    "c",
                    "d",
                    "e",
                    {
                        "example": "instance"
                    }
                ],
                "object": {"example": "instance"}
            }
        `,
    },
    {
        it: "with nested array",
        code: `
            {
                "hello": "there",
                "stuff": ["a", "b", "c", "d", "e", ["f", "g", "h", "i", "j"]],
                "object": {"example": "instance"}
            }
        `,
        expect: `
            {
                "hello": "there",
                "stuff": [
                    "a",
                    "b",
                    "c",
                    "d",
                    "e",
                    [
                        "f",
                        "g",
                        "h",
                        "i",
                        "j"
                    ]
                ],
                "object": {"example": "instance"}
            }
        `,
        options: {
            multilineArraysWrapThreshold: 0,
        },
    },
    {
        it: "with multiple nested arrays",
        code: `
            {
                "hello": "there",
                "stuff": ["a", "b", ["f", "g", "h", "i", "j"], "c", "d", "e", ["f", "g", "h", "i", "j"]],
                "object": {"example": "instance"}
            }
        `,
        expect: `
            {
                "hello": "there",
                "stuff": [
                    "a",
                    "b",
                    [
                        "f",
                        "g",
                        "h",
                        "i",
                        "j"
                    ],
                    "c",
                    "d",
                    "e",
                    [
                        "f",
                        "g",
                        "h",
                        "i",
                        "j"
                    ]
                ],
                "object": {"example": "instance"}
            }
        `,
        options: {
            multilineArraysWrapThreshold: 0,
        },
    },
    {
        it: "basic JSON array with a comment",
        code: `
            {
                "data": [
                    "one",
                    // comment
                    "two"
                ]
            }
        `,
    },
    {
        it: "basic JSON array with multiple comments",
        code: `
            {
                // comment
                "data": [
                    // comment
                    "one",
                    // comment
                    "two"
                    // comment
                ]
                // comment
            }
            // comment
        `,
    },
    {
        it: "basic JSON array with multiline comments",
        code: `
            {
                /*
                    comment
                    comment
                    comment
                */
                "data": [
                    /*
                        comment
                        comment
                        comment
                    */
                    "one",
                    /*
                        comment
                        comment
                        comment
                    */
                    "two"
                    /*
                        comment
                        comment
                        comment
                    */
                ]
                /*
                    comment
                    comment
                    comment
                */
            }
            /*
                comment
                comment
                comment
            */
        `,
    },
    {
        it: "handles array with only comments GitHub Issue #75",
        code: `
            {
                "editor.codeActionsOnSave": [
                    // "hello",
                    // "source.fixAll.eslint",
                    // "source.fixAll.prettier",
                ]
            }
        `,
    },
    {
        it: "basic JSON array",
        code: `
            {
                "data": [
                    "one",
                    "two"
                ]
            }
        `,
    },
    {
        it: "basic lone element JSON array",
        code: `
            {
                "data": [
                    "one one one one one one one one one one one one one one one one one one one one",
                    "two two two two two two two two two two two two two two two two two two two two"
                ]
            }
        `,
    },
    {
        it: "keeps closing bracket on its own line for array of objects with bracketSpacing GitHub Issue #70",
        code: `
            {
                "test": [
                    { "foo": 1 },
                    { "bar": 2 },
                    { "baz": 3 }
                ]
            }
        `,
        options: {
            bracketSpacing: true,
            multilineArraysWrapThreshold: 1,
        },
    },
];

describe("json multiline array formatting", () => {
    runTests({
        extension: ".json",
        tests: jsonTests,
        parser: "json",
    });
});
