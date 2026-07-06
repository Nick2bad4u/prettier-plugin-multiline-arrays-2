import { assert, assertWrap } from "@augment-vir/assert";
import {
    awaitedBlockingMap,
    indent,
    log,
    logColors,
} from "@augment-vir/common";
import { readPackageJson, runShellCommand } from "@augment-vir/node";
import {
    calculateRelativeDate,
    createUtcFullDate,
    getNowInUtcTimezone,
    toTimestamp,
} from "date-vir";
import * as path from "node:path";
import {
    assertValidShape,
    defineShape,
    recordShape,
    unknownShape,
} from "object-shape-tester";
import semver from "semver";
import { arrayJoin, objectKeys, objectValues } from "ts-extras";

const repoRootDirPath = path.resolve();
const repoPackageJson = await readPackageJson(repoRootDirPath);

const supportedPrettierRange = assertWrap.isTruthy(
    repoPackageJson.peerDependencies?.prettier,
    "Failed to find supported Prettier version range from peer dependencies."
);

const currentPrettierVersion = assertWrap.isTruthy(
    repoPackageJson.devDependencies?.prettier,
    "Failed to find current Prettier version from dev dependencies."
);

const unknownVersionShape = unknownShape();
const versionMetadataShape = recordShape({
    keys: "",
    values: unknownVersionShape,
});
const publishTimeMetadataShape = recordShape({
    keys: "",
    values: "",
});

async function fetchPrettierV3MinorVersions(): Promise<string[]> {
    const response = await fetch("https://registry.npmjs.org/prettier");
    if (!response.ok) {
        throw new Error(`Failed to fetch npm metadata: ${response.status}`);
    }

    const responseJson = await response.json();

    assertValidShape(
        responseJson,
        defineShape({
            versions: versionMetadataShape,
            time: publishTimeMetadataShape,
        }),
        {
            allowExtraKeys: true,
        }
    );
    const oldestAllowedPublishTime = toTimestamp(
        calculateRelativeDate(getNowInUtcTimezone(), {
            days: -5,
        })
    );
    const rawVersions = objectKeys(responseJson.versions).filter((version) => {
        const publishTime = responseJson.time[version];
        if (!publishTime) {
            log.warning(
                `Failed to find publish time for Prettier version: ${version}`
            );
            return false;
        }

        return (
            toTimestamp(createUtcFullDate(publishTime)) <=
            oldestAllowedPublishTime
        );
    });

    const mappedLatestMinorVersions: Record<string, string> = {};

    for (const version of rawVersions) {
        if (!semver.satisfies(version, supportedPrettierRange)) {
            continue;
        }

        const parsedVersion = semver.parse(version);

        if (!parsedVersion) {
            log.warning(
                `Failed to parse Prettier version with semver: ${version}`
            );
            continue;
        }

        const key = `${parsedVersion.major}.${parsedVersion.minor}`;
        const previousVersion = mappedLatestMinorVersions[key];
        if (!previousVersion || semver.gt(version, previousVersion)) {
            mappedLatestMinorVersions[key] = version;
        }
    }

    return objectValues(mappedLatestMinorVersions).toSorted(semver.compare);
}

async function runPrettierTests() {
    const prettierVersions = await fetchPrettierV3MinorVersions();

    log.info(
        `Testing with prettier versions:\n${indent(arrayJoin(prettierVersions, "\n"))}`
    );

    const versionPasses = await awaitedBlockingMap(
        prettierVersions,
        async (version): Promise<{ success: boolean; version: string }> => {
            log.info(`\n\n>>>>>>>>>> Prettier v${version}\n`);

            try {
                log.faint(`Installing Prettier v${version}...`);
                await runShellCommand(
                    `npm i -D --min-release-age=0 --package-lock=false --no-save prettier@${version}`,
                    {
                        cwd: repoRootDirPath,
                        rejectOnError: true,
                    }
                );
                const { stdout } = await runShellCommand("npm ls prettier", {
                    cwd: repoRootDirPath,
                });
                assert.hasValue(
                    stdout,
                    `└── prettier@${version}`,
                    `Prettier v${version} was not installed.`
                );
            } catch (error) {
                log.faint(error);
                log.error(`Failed to install Prettier v${version}.`);
                return {
                    version,
                    success: false,
                };
            }
            log.faint(`Running tests for Prettier v${version}...`);
            try {
                await runShellCommand("npm test", {
                    cwd: repoRootDirPath,
                    rejectOnError: true,
                    hookUpToConsole: true,
                });

                return {
                    version,
                    success: true,
                };
            } catch {
                return {
                    version,
                    success: false,
                };
            }
        }
    );

    log.faint(`Restoring Prettier v${currentPrettierVersion}...\n\n`);
    await runShellCommand(
        `npm i -D --min-release-age=0 --package-lock=false --no-save prettier@${currentPrettierVersion}`,
        {
            cwd: repoRootDirPath,
            rejectOnError: true,
        }
    );

    for (const { success, version } of versionPasses) {
        log.info(
            `Prettier v${version}: ${success ? logColors.success : logColors.error}${
                success ? "pass" : "fail"
            }${logColors.reset}`
        );
    }
    const success = versionPasses.every(
        ({ success: versionSucceeded }) => versionSucceeded
    );

    if (success) {
        log.success("Versioned tests passed.");
    } else {
        log.error("Versioned tests failed.");
        process.exitCode = 1;
    }
}

await runPrettierTests();
