import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
    filterInheritedNpmPolicyEnvironment,
    getPackedFilename,
    resolveCompatibilityVersions,
    usingTemporaryDirectory,
} from "./prettier-compatibility.script.js";

describe("prettier compatibility test infrastructure", () => {
    it("resolves the exact peer floor and latest supported release", () => {
        expect.assertions(1);
        expect(
            resolveCompatibilityVersions("^3.9.0", [
                "3.8.5",
                "3.9.0",
                "3.9.6",
                "4.0.0",
            ])
        ).toStrictEqual([
            {
                label: "minimum supported",
                version: "3.9.0",
            },
            {
                label: "latest supported",
                version: "3.9.6",
            },
        ]);
    });

    it("does not run the same boundary twice", () => {
        expect.assertions(1);
        expect(
            resolveCompatibilityVersions("3.9.0", ["3.9.0", "3.9.1"])
        ).toStrictEqual([
            {
                label: "minimum and latest supported",
                version: "3.9.0",
            },
        ]);
    });

    it("rejects a peer floor that is not an exact published version", () => {
        expect.assertions(1);
        expect(() =>
            resolveCompatibilityVersions(">=3.9.1 <4", ["3.9.0", "3.9.6"])
        ).toThrow("must be a published exact version");
    });

    it("accepts npm 11 array-shaped pack metadata", () => {
        expect.assertions(1);
        expect(
            getPackedFilename([
                {
                    filename: "package.tgz",
                },
            ])
        ).toBe("package.tgz");
    });

    it("accepts npm 12 package-keyed pack metadata", () => {
        expect.assertions(1);
        expect(
            getPackedFilename({
                package: {
                    filename: "package.tgz",
                },
            })
        ).toBe("package.tgz");
    });

    it("rejects ambiguous or incomplete pack metadata", () => {
        expect.assertions(3);
        expect(() => getPackedFilename([])).toThrow("exactly one package");
        expect(() =>
            getPackedFilename({
                first: {
                    filename: "first.tgz",
                },
                second: {
                    filename: "second.tgz",
                },
            })
        ).toThrow("exactly one package");
        expect(() => getPackedFilename([{}])).toThrow("non-empty filename");
    });

    it("removes inherited npm allow-list policy case-insensitively", () => {
        expect.assertions(1);
        expect(
            filterInheritedNpmPolicyEnvironment({
                npm_config_allow_scripts: "unsafe",
                NPM_CONFIG_ALLOW_SCRIPTS: "also unsafe",
                npm_config_registry: "https://registry.npmjs.org/",
            })
        ).toStrictEqual({
            npm_config_registry: "https://registry.npmjs.org/",
        });
    });

    it("removes its temporary directory after success", async () => {
        expect.assertions(1);

        let temporaryDirectory = "";

        await usingTemporaryDirectory(
            "prettier-compatibility-success-",
            (directoryPath) => {
                temporaryDirectory = directoryPath;
            }
        );

        await expect(access(temporaryDirectory)).rejects.toMatchObject({
            code: "ENOENT",
        });
    });

    it("removes its temporary directory after failure", async () => {
        expect.assertions(2);

        let temporaryDirectory = "";
        const expectedError = new Error("consumer failed");

        await expect(
            usingTemporaryDirectory(
                "prettier-compatibility-failure-",
                (directoryPath) => {
                    temporaryDirectory = directoryPath;
                    throw expectedError;
                }
            )
        ).rejects.toBe(expectedError);

        await expect(access(temporaryDirectory)).rejects.toMatchObject({
            code: "ENOENT",
        });
    });
});
