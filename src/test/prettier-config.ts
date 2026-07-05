import type { Options } from "prettier";
// @ts-expect-error: ignore this import cause it's not typed. This file itself is manually typing it.
import importedRepoConfig from "../../prettier.config.mjs";

export const repoConfig: Options = importedRepoConfig as Options;

Object.assign(repoConfig, {
    bracketSpacing: false,
    jsonRecursiveSort: false,
    plugins: (repoConfig.plugins ?? []).filter(
        (plugin) => plugin !== "prettier-plugin-sort-json"
    ),
    printWidth: 100,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: "all",
} satisfies Options);
