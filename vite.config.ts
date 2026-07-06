import {
    coverageConfigDefaults,
    defaultExclude,
    defineConfig,
} from "vitest/config";

const isCiEnvironment = process.env.CI === "true";
const configuredMaxWorkers =
    process.env.MAX_THREADS ?? (isCiEnvironment ? "1" : "8");
const parsedMaxWorkers = Math.trunc(Number(configuredMaxWorkers));
const maxWorkerCount =
    Number.isFinite(parsedMaxWorkers) && parsedMaxWorkers > 0
        ? parsedMaxWorkers
        : 1;

const rawHangingReporterFlag =
    process.env.MULTILINE_ARRAYS_VITEST_HANGING_PROCESS_REPORTER ??
    process.env.VITEST_HANGING_PROCESS_REPORTER ??
    "false";
const shouldEnableHangingProcessReporter = [
    "1",
    "on",
    "true",
    "yes",
].includes(rawHangingReporterFlag.toLowerCase());
const vitestReporters = shouldEnableHangingProcessReporter
    ? ["default", "hanging-process"]
    : ["default"];

export default defineConfig({
    cacheDir: "./.cache/vitest",
    test: {
        bail: 200,
        coverage: {
            clean: true,
            cleanOnRerun: true,
            exclude: [
                "**/*.config.*",
                "**/*.d.ts",
                "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
                "coverage/**",
                "dist/**",
                "scripts/**",
                "src/readme-examples/**",
                "src/test/**",
                ...coverageConfigDefaults.exclude,
            ],
            include: ["src/**/*.ts"],
            provider: "v8",
            reporter: [
                "text",
                "json",
                "lcov",
                "html",
            ],
            reportsDirectory: "./coverage",
            thresholds: {
                branches: 65,
                functions: 80,
                lines: 70,
                statements: 70,
            },
        },
        environment: "node",
        exclude: [
            "**/.cache/**",
            "**/coverage/**",
            "**/dist/**",
            "**/node_modules/**",
            ...defaultExclude,
        ],
        fileParallelism: !isCiEnvironment,
        globals: false,
        hookTimeout: 15_000,
        include: ["src/**/*.test.ts"],
        maxWorkers: maxWorkerCount,
        outputFile: {
            json: "./coverage/test-results.json",
            junit: "./coverage/test-report.junit.xml",
        },
        pool: "threads",
        reporters: vitestReporters,
        restoreMocks: true,
        retry: 0,
        slowTestThreshold: 300,
        teardownTimeout: 15_000,
        testTimeout: 15_000,
    },
});
