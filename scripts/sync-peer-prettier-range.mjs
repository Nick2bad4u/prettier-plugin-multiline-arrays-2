#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const packageJsonPath = fileURLToPath(
    new URL("../package.json", import.meta.url)
);
const minimumSupportedPrettierRange = "^3.0.0";

function isRecord(value) {
    return typeof value === "object" && value !== null;
}

async function readPackageJson() {
    const packageJsonContent = await readFile(packageJsonPath, "utf8");

    return JSON.parse(packageJsonContent);
}

function getCaretRangeMajor(range) {
    const match = /^\^(\d+)\./u.exec(range.trim());
    const major = match?.[1];

    return major === undefined ? undefined : Number.parseInt(major, 10);
}

function resolvePeerFloorRange(existingPeerRange) {
    if (typeof existingPeerRange !== "string") {
        return minimumSupportedPrettierRange;
    }

    const [floorCandidate] = existingPeerRange
        .split("||")
        .map((part) => part.trim());

    if (!floorCandidate) {
        return minimumSupportedPrettierRange;
    }

    const floorCandidateMajor = getCaretRangeMajor(floorCandidate);
    const minimumSupportedMajor = getCaretRangeMajor(
        minimumSupportedPrettierRange
    );

    return floorCandidateMajor === minimumSupportedMajor
        ? minimumSupportedPrettierRange
        : floorCandidate;
}

function createPeerRange(peerFloorRange, devDependencyRange) {
    const peerFloorMajor = getCaretRangeMajor(peerFloorRange);
    const devDependencyMajor = getCaretRangeMajor(devDependencyRange);

    if (
        peerFloorMajor !== undefined &&
        devDependencyMajor !== undefined &&
        peerFloorMajor === devDependencyMajor
    ) {
        return peerFloorRange;
    }

    return peerFloorRange === devDependencyRange
        ? peerFloorRange
        : `${peerFloorRange} || ${devDependencyRange}`;
}

async function main() {
    const packageJson = await readPackageJson();
    const devDependencies = packageJson["devDependencies"];
    const peerDependencies = packageJson["peerDependencies"];

    if (!isRecord(devDependencies) || !isRecord(peerDependencies)) {
        throw new TypeError(
            "Expected package.json to include object-valued devDependencies and peerDependencies."
        );
    }

    const devDependencyPrettierRange = devDependencies["prettier"];

    if (
        typeof devDependencyPrettierRange !== "string" ||
        devDependencyPrettierRange.trim().length === 0
    ) {
        throw new TypeError(
            "Expected devDependencies.prettier to be a non-empty string range."
        );
    }

    const peerFloorRange = resolvePeerFloorRange(peerDependencies["prettier"]);
    const nextPeerPrettierRange = createPeerRange(
        peerFloorRange,
        devDependencyPrettierRange
    );

    if (peerDependencies["prettier"] === nextPeerPrettierRange) {
        console.log(
            `peerDependencies.prettier already aligned: ${nextPeerPrettierRange}`
        );
        return;
    }

    peerDependencies["prettier"] = nextPeerPrettierRange;
    await writeFile(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 4)}\n`,
        "utf8"
    );
    console.log(
        `Updated peerDependencies.prettier to: ${nextPeerPrettierRange}`
    );
}

try {
    await main();
} catch (error) {
    console.error("Failed to synchronize peerDependencies.prettier:", error);
    process.exitCode = 1;
}
