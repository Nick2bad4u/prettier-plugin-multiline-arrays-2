#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const npmExecutable = process.env["npm_execpath"];

if (!npmExecutable) {
    throw new Error("Expected npm_execpath to be defined by npm run.");
}

const projectPolicyEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
        ([key]) => key.toLowerCase() !== "npm_config_allow_scripts"
    )
);

const installResult = spawnSync(
    process.execPath,
    [
        npmExecutable,
        "install",
        "--min-release-age=0",
        "--package-lock=false",
        "--no-save",
        "--save-dev",
        "prettier@latest",
    ],
    {
        env: projectPolicyEnvironment,
        stdio: "inherit",
    }
);

if (installResult.error) {
    throw installResult.error;
}

if (installResult.status !== 0) {
    throw new Error(
        `Installing the latest Prettier failed with exit code ${
            installResult.status ?? "unknown"
        }.`
    );
}
