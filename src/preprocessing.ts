import type { Parser, ParserOptions, Plugin, Printer } from "prettier";

import { stringify } from "@augment-vir/common";
import { createWrappedMultiTargetProxy } from "proxy-vir";
import { not, objectHasIn } from "ts-extras";

import { pluginMarker } from "./plugin-marker.js";
import { createMultilineArrayPrinter } from "./printer/multiline-array-printer.js";
import { setOriginalPrinter } from "./printer/original-printer.js";

/** Prettier's type definitions are not true. */
type ActualParserOptions = Partial<Pick<ParserOptions, "plugins">> &
    Partial<{
        astFormat: string;
        printer: Printer;
    }> &
    Pick<ParserOptions, Exclude<keyof ParserOptions, "plugins">>;

type PreprocessStep = (previousProcessedText: string) => Promise<string>;

function hasThisPluginMarker(
    plugin: unknown
): plugin is Plugin & { pluginMarker: unknown } {
    return (
        typeof plugin === "object" &&
        plugin != undefined &&
        !(plugin instanceof URL) &&
        objectHasIn(plugin, "pluginMarker") &&
        plugin.pluginMarker === pluginMarker
    );
}

async function runPreprocessSteps(
    preprocessSteps: readonly PreprocessStep[],
    text: string,
    index = 0
): Promise<string> {
    const preprocessStep = preprocessSteps[index];
    if (!preprocessStep) {
        return text;
    }

    return runPreprocessSteps(
        preprocessSteps,
        await preprocessStep(text),
        index + 1
    );
}

function addMultilinePrinter(options: ActualParserOptions): void {
    if (objectHasIn(options, "printer")) {
        const originalPrinter = options.printer;
        if (!originalPrinter) {
            throw new Error("Could not find printer while adding printer.");
        }

        setOriginalPrinter(originalPrinter);
        /** Overwrite the printer with ours. */
        options.printer = createMultilineArrayPrinter(originalPrinter);
    } else {
        const astFormat = options.astFormat;
        if (!astFormat) {
            throw new Error("Could not find astFormat while adding printer.");
        }
        /**
         * If the printer hasn't already been assigned in options, rearrange
         * plugins so that ours gets chosen.
         */
        const plugins = options.plugins ?? [];
        const firstMatchedPlugin = plugins.find(
            (
                plugin
            ): plugin is Plugin & { printers: Record<string, Printer> } => {
                if (typeof plugin === "string" || plugin instanceof URL) {
                    return false;
                }

                const printers = plugin.printers;
                if (!printers) {
                    return false;
                }

                const matchedPrinter = printers[astFormat];
                return Boolean(matchedPrinter);
            }
        );
        if (!firstMatchedPlugin || typeof firstMatchedPlugin === "string") {
            throw new Error(
                `Matched invalid first plugin: ${String(firstMatchedPlugin)}`
            );
        }
        const matchedPrinter = firstMatchedPlugin.printers[astFormat];
        if (!matchedPrinter) {
            throw new Error(
                `Printer not found on matched plugin: ${stringify(firstMatchedPlugin)}`
            );
        }
        setOriginalPrinter(matchedPrinter);
        const thisPluginIndex = plugins.findIndex((plugin) =>
            hasThisPluginMarker(plugin)
        );
        const thisPlugin = plugins[thisPluginIndex];
        if (!thisPlugin) {
            throw new Error("This plugin was not found.");
        }

        /**
         * Add this plugin to the beginning of the array so its printer is found
         * first.
         */
        options.plugins = [
            thisPlugin,
            ...plugins.toSpliced(thisPluginIndex, 1),
        ];
    }
}

function findPluginsByParserName(
    parserName: string,
    plugins: (
        | Plugin
        | string
        | URL
    )[]
): Plugin[] {
    return plugins.filter((plugin): plugin is Plugin => {
        if (
            typeof plugin !== "object" ||
            plugin instanceof URL ||
            hasThisPluginMarker(plugin)
        ) {
            return false;
        }

        const parsers = plugin.parsers;
        if (!parsers) {
            return false;
        }

        const matchedParser = parsers[parserName];
        return Boolean(matchedParser);
    });
}

export function wrapParser(originalParser: Parser, parserName: string): Parser {
    /**
     * Create a multi-target proxy of parsers so that we don't block other
     * plugins.
     */
    const parserProxy = createWrappedMultiTargetProxy<Parser>({
        initialTarget: originalParser,
    });

    async function multilineArraysPluginPreprocess(
        text: string,
        options: ActualParserOptions
    ) {
        const pluginsFromOptions = options.plugins ?? [];
        const pluginsWithRelevantParsers = findPluginsByParserName(
            parserName,
            pluginsFromOptions
        );
        for (const plugin of pluginsWithRelevantParsers) {
            const currentParser = plugin.parsers?.[parserName];
            if (
                currentParser &&
                (
                    plugin as undefined | { name?: string | undefined }
                )?.name?.includes("prettier-plugin-sort-json")
            ) {
                parserProxy.proxyModifier.addOverrideTarget(currentParser);
            }
        }

        const pluginsWithPreprocessor = pluginsWithRelevantParsers.filter(
            (plugin) => Boolean(plugin.parsers?.[parserName]?.preprocess)
        );

        const preprocessSteps: PreprocessStep[] = pluginsWithPreprocessor.map(
            (pluginWithPreprocessor) =>
                async (previousProcessedText: string) => {
                    const nextText = await pluginWithPreprocessor.parsers?.[
                        parserName
                    ]?.preprocess?.(previousProcessedText, {
                        ...options,
                        plugins: pluginsFromOptions.filter(
                            not(hasThisPluginMarker)
                        ),
                    } as unknown as ParserOptions);

                    return nextText ?? previousProcessedText;
                }
        );

        const processedText = await runPreprocessSteps(preprocessSteps, text);

        addMultilinePrinter(options);

        return processedText;
    }

    parserProxy.proxyModifier.addOverrideTarget({
        preprocess: multilineArraysPluginPreprocess,
    });

    return parserProxy.proxy;
}
