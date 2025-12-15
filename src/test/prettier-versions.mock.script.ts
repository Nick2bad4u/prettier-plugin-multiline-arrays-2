import {assertWrap} from '@augment-vir/assert';
import {awaitedBlockingMap, indent, log, logColors} from '@augment-vir/common';
import {readPackageJson, runShellCommand} from '@augment-vir/node';
import {resolve} from 'node:path';
import {assertValidShape, defineShape, recordShape, unknownShape} from 'object-shape-tester';
import semver from 'semver';

const repoRootDirPath = resolve(import.meta.dirname, '..', '..');
const repoPackageJson = await readPackageJson(repoRootDirPath)

const supportedPrettierRange = assertWrap.isTruthy(repoPackageJson.peerDependencies?.prettier, 'Failed to find supported Prettier version range from peer dependencies.')

const currentPrettierVersion = assertWrap.isTruthy(repoPackageJson.devDependencies?.prettier, 'Failed to find current Prettier version from dev dependencies.')

async function fetchPrettierV3MinorVersions(): Promise<string[]> {
    const response = await fetch('https://registry.npmjs.org/prettier');
    if (!response.ok) {
        throw new Error(`Failed to fetch npm metadata: ${response.status}`);
    }

    const responseJson = await response.json();

    assertValidShape(
        responseJson,
        defineShape({
            versions: recordShape({
                keys: '',
                values: unknownShape(),
            }),
        }),
        {
            allowExtraKeys: true,
        },
    );
    const rawVersions = Object.keys(responseJson.versions);

    const mappedLatestMinorVersions = rawVersions.reduce(
        (latestMinorVersions, version) => {
            if (
                !semver.satisfies(
                    version,
                    supportedPrettierRange,
                )
            ) {
                return latestMinorVersions;
            }

            const parsedVersion = semver.parse(version);

            if (!parsedVersion) {
                log.warning(`Failed to parse Prettier version with semver: ${version}`);
                return latestMinorVersions;
            }

            const key = `${parsedVersion.major}.${parsedVersion.minor}`;
            const previousVersion = latestMinorVersions[key];
            if (!previousVersion || semver.gt(version, previousVersion)) {
                latestMinorVersions[key] = version;
            }

            return latestMinorVersions;
        },
        {} as Record<string, string>,
    );

    return Object.values(mappedLatestMinorVersions).sort(semver.compare);
}

async function runPrettierTests() {
    const prettierVersions = await fetchPrettierV3MinorVersions();

    log.info(`Testing with prettier versions:\n${indent(prettierVersions.join('\n'))}`);

    const versionPasses = await awaitedBlockingMap(prettierVersions, async (
        version,
    ): Promise<{version: string; success: boolean}> => {
        log.info(`\n\n>>>>>>>>>> Prettier v${version}\n`);

        try {
            log.faint(`Installing Prettier v${version}...`);
            await runShellCommand(`npm i -D --no-save prettier@${version}`, {
                cwd: repoRootDirPath,
                rejectOnError: true,
            });
        } catch (error) {
            log.faint(error);
            log.error(`Failed to install Prettier v${version}.`);
            return {
                version,
                success: false,
            };
        }
        log.faint('Running tests for Prettier v${version}...');
        try {
            await runShellCommand('npm test', {
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
    });

    log.faint(`Restoring Prettier v${currentPrettierVersion}...\n\n`);
    await runShellCommand(`npm i -D --no-save prettier@${currentPrettierVersion}`, {
        cwd: repoRootDirPath,
        rejectOnError: true,
    });

    versionPasses.forEach(({success, version}) => {
        log.info(
            `Prettier v${version}: ${success ? logColors.success : logColors.error}${success ? 'pass' : 'fail'}${logColors.reset}`,
        );
    });
    const success = versionPasses.every(({success}) => {
        return success;
    });

    if (success) {
        log.success(`Versioned tests passed.`);
        process.exit(0);
    } else {
        log.error(`Versioned tests failed.`);
        process.exit(1);
    }
}

await runPrettierTests();
