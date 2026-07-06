import type { Options } from "prettier";

import prettierConfig from "prettier-config-nick2bad4u";
import { safeCastTo } from "ts-extras";

import * as localPlugin from "../index.js";

const typedRepoConfig = safeCastTo<Options>(prettierConfig);

export const repoConfig: Options = {
    ...typedRepoConfig,
    bracketSpacing: false,
    jsonRecursiveSort: false,
    plugins: [
        ...(typedRepoConfig.plugins ?? []).filter(
            (plugin) => plugin !== "prettier-plugin-sort-json"
        ),
        "prettier-plugin-organize-imports",
        localPlugin,
    ],
    printWidth: 100,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: "all",
};
