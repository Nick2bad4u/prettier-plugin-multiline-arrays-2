import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspect } from "node:util";
import semver from "semver";

import { verifyPrettierConsumer } from "./prettier-compatibility-consumer.js";

interface CompatibilityVersion {
    label: string;
    version: string;
}

interface RepositoryPackageJson {
    name: string;
    peerDependencies: {
        prettier: string;
    };
    version: string;
}

interface RunCommandOptions {
    captureOutput?: boolean;
    cwd: string;
}

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function filterInheritedNpmPolicyEnvironment(
    environment: Readonly<Record<string, string | undefined>>
): Record<string, string | undefined> {
    return Object.fromEntries(
        Object.entries(environment).filter(
            ([key]) => key.toLowerCase() !== "npm_config_allow_scripts"
        )
    );
}

export function getPackedFilename(packMetadata: unknown): string {
    let records: unknown[];
    if (Array.isArray(packMetadata)) {
        records = packMetadata;
    } else if (isRecord(packMetadata)) {
        records = Object.values(packMetadata);
    } else {
        records = [];
    }

    if (records.length !== 1) {
        throw new Error(
            `Expected npm pack to describe exactly one package, received ${records.length}.`
        );
    }

    const [record] = records;
    const filename = isRecord(record) ? record.filename : undefined;

    if (typeof filename !== "string" || filename.trim().length === 0) {
        throw new TypeError(
            "Expected npm pack metadata to include a non-empty filename."
        );
    }

    return filename;
}

export function resolveCompatibilityVersions(
    peerRange: string,
    registryVersions: readonly string[]
): readonly CompatibilityVersion[] {
    const minimumVersion = semver.minVersion(peerRange)?.version;

    if (
        minimumVersion === undefined ||
        !registryVersions.includes(minimumVersion)
    ) {
        throw new Error(
            `The declared Prettier peer floor must be a published exact version; resolved ${minimumVersion ?? "nothing"} from ${peerRange}.`
        );
    }

    const latestSupportedVersion = semver.maxSatisfying(
        registryVersions,
        peerRange
    );

    if (latestSupportedVersion === null) {
        throw new Error(
            `No published Prettier version satisfies peer range ${peerRange}.`
        );
    }

    if (minimumVersion === latestSupportedVersion) {
        return [
            {
                label: "minimum and latest supported",
                version: minimumVersion,
            },
        ];
    }

    return [
        {
            label: "minimum supported",
            version: minimumVersion,
        },
        {
            label: "latest supported",
            version: latestSupportedVersion,
        },
    ];
}

function assertSafeTemporaryDirectory(directoryPath: string): void {
    const resolvedTemporaryRoot = path.resolve(tmpdir());
    const resolvedDirectoryPath = path.resolve(directoryPath);
    const relativePath = path.relative(
        resolvedTemporaryRoot,
        resolvedDirectoryPath
    );

    if (
        relativePath.length === 0 ||
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath)
    ) {
        throw new Error(
            `Refusing to manage a directory outside the system temporary root: ${resolvedDirectoryPath}`
        );
    }
}

export async function usingTemporaryDirectory<Result>(
    prefix: string,
    callback: (directoryPath: string) => PromiseLike<Result> | Result
): Promise<Result> {
    const directoryPath = await mkdtemp(path.join(tmpdir(), prefix));

    assertSafeTemporaryDirectory(directoryPath);

    try {
        return await callback(directoryPath);
    } finally {
        await rm(directoryPath, {
            force: true,
            recursive: true,
        });
    }
}

function getNpmExecutable(): string {
    const npmExecutable = process.env.npm_execpath;

    if (
        typeof npmExecutable !== "string" ||
        npmExecutable.trim().length === 0
    ) {
        throw new Error(
            "Expected npm_execpath to be defined. Run this check through npm."
        );
    }

    return npmExecutable;
}

function runCommand(
    executable: string,
    commandArguments: readonly string[],
    { captureOutput = false, cwd }: RunCommandOptions
): string {
    const result = spawnSync(executable, commandArguments, {
        cwd,
        encoding: "utf8",
        env: filterInheritedNpmPolicyEnvironment(process.env),
        stdio: captureOutput ? "pipe" : "inherit",
        timeout: 120_000,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            [
                `Command failed with exit code ${result.status ?? "unknown"}:`,
                executable,
                ...commandArguments,
                result.stdout?.trim(),
                result.stderr?.trim(),
            ]
                .filter(Boolean)
                .join("\n")
        );
    }

    return result.stdout ?? "";
}

function runNpm(
    commandArguments: readonly string[],
    options: RunCommandOptions
): string {
    return runCommand(
        process.execPath,
        [getNpmExecutable(), ...commandArguments],
        options
    );
}

async function readRepositoryPackageJson(): Promise<RepositoryPackageJson> {
    const packageJsonPath = path.join(repositoryRoot, "package.json");
    const packageJson: unknown = JSON.parse(
        await readFile(packageJsonPath, "utf8")
    );

    if (!isRecord(packageJson)) {
        throw new TypeError("Expected package.json to contain an object.");
    }

    const packageName = packageJson.name;
    const packageVersion = packageJson.version;
    const peerDependencies = packageJson.peerDependencies;
    const prettierPeerRange = isRecord(peerDependencies)
        ? peerDependencies.prettier
        : undefined;

    if (
        typeof packageName !== "string" ||
        typeof packageVersion !== "string" ||
        typeof prettierPeerRange !== "string"
    ) {
        throw new TypeError(
            "Expected package.json to define string-valued name, version, and peerDependencies.prettier fields."
        );
    }

    return {
        name: packageName,
        peerDependencies: {
            prettier: prettierPeerRange,
        },
        version: packageVersion,
    };
}

function fetchPublishedPrettierVersions(): readonly string[] {
    const rawVersions = runNpm(
        [
            "view",
            "prettier",
            "versions",
            "--json",
        ],
        {
            captureOutput: true,
            cwd: repositoryRoot,
        }
    );
    const versions: unknown = JSON.parse(rawVersions);

    if (
        !Array.isArray(versions) ||
        versions.some((version) => typeof version !== "string")
    ) {
        throw new TypeError(
            "Expected npm to return an array of published Prettier versions."
        );
    }

    return versions.map(String);
}

function packCurrentPackage(temporaryRoot: string): string {
    const rawPackMetadata = runNpm(
        [
            "pack",
            "--json",
            "--pack-destination",
            temporaryRoot,
        ],
        {
            captureOutput: true,
            cwd: repositoryRoot,
        }
    );
    const filename = getPackedFilename(JSON.parse(rawPackMetadata) as unknown);

    return path.join(temporaryRoot, filename);
}

async function testConsumer({
    label,
    packageName,
    packageTarballPath,
    packageVersion,
    prettierVersion,
    temporaryRoot,
}: Readonly<{
    label: string;
    packageName: string;
    packageTarballPath: string;
    packageVersion: string;
    prettierVersion: string;
    temporaryRoot: string;
}>): Promise<void> {
    const consumerDirectory = path.join(
        temporaryRoot,
        `prettier-${prettierVersion}`
    );

    await mkdir(consumerDirectory);
    await writeFile(
        path.join(consumerDirectory, "package.json"),
        `${JSON.stringify(
            {
                allowScripts: {},
                dependencies: {
                    [packageName]: `file:${packageTarballPath.replaceAll("\\", "/")}`,
                    prettier: prettierVersion,
                },
                name: `prettier-compatibility-${prettierVersion}`,
                private: true,
                type: "module",
            },
            undefined,
            4
        )}\n`,
        "utf8"
    );
    await writeFile(
        path.join(consumerDirectory, ".npmrc"),
        "package-lock=false\nstrict-allow-scripts=true\n",
        "utf8"
    );

    process.stdout.write(
        `\nTesting ${label} Prettier ${prettierVersion} in ${consumerDirectory}\n`
    );
    runNpm(["install", "--min-release-age=0"], {
        cwd: consumerDirectory,
    });
    await verifyPrettierConsumer({
        consumerDirectory,
        expectedPackageVersion: packageVersion,
        expectedPrettierVersion: prettierVersion,
        packageName,
    });
}

export async function main(): Promise<void> {
    const packageJson = await readRepositoryPackageJson();
    const packageName = packageJson.name;
    const packageVersion = packageJson.version;
    const prettierPeerRange = packageJson.peerDependencies.prettier;
    const registryVersions = fetchPublishedPrettierVersions();
    const compatibilityVersions = resolveCompatibilityVersions(
        prettierPeerRange,
        registryVersions
    );

    process.stdout.write(
        `Testing packed ${packageName}@${packageVersion} with Prettier ${prettierPeerRange} boundaries:\n${compatibilityVersions
            .map(({ label, version }) => `- ${label}: ${version}`)
            .join("\n")}\n`
    );

    await usingTemporaryDirectory(
        "prettier-plugin-compatibility-",
        async (temporaryRoot) => {
            const packageTarballPath = packCurrentPackage(temporaryRoot);

            for (const { label, version } of compatibilityVersions) {
                await testConsumer({
                    label,
                    packageName,
                    packageTarballPath,
                    packageVersion,
                    prettierVersion: version,
                    temporaryRoot,
                });
            }
        }
    );

    process.stdout.write("\nPrettier compatibility checks passed.\n");
}

const isMainModule =
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
    try {
        await main();
    } catch (error) {
        process.stderr.write(
            `Prettier compatibility checks failed:\n${inspect(error)}\n`
        );
        process.exitCode = 1;
    }
}
