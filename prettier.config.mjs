import prettierConfig from "prettier-config-nick2bad4u";

const localPluginUrl = new URL("dist/index.js", import.meta.url);
const localPlugin = localPluginUrl.href;

/**
 * Prettier 3.9 selects the last plugin-provided parser for a parser name. Keep
 * this plugin last so its parser can wrap the built-in parser and run companion
 * plugin preprocessors.
 *
 * @type {import("prettier").Config}
 */
const localConfig = {
    ...prettierConfig,
    plugins: [
        ...(prettierConfig.plugins ?? []).filter(
            (plugin) => plugin !== "prettier-plugin-multiline-arrays"
        ),
        "prettier-plugin-organize-imports",
        localPlugin,
    ],
};

export default localConfig;
