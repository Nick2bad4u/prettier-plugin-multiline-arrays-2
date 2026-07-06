import type { Node } from "estree";
import type { AstPath, ParserOptions, Printer } from "prettier";

import { assertWrap } from "@augment-vir/assert";
import estreePluginModule from "prettier/plugins/estree";
import { safeCastTo } from "ts-extras";

import {
    envDebugKey,
    fillInOptions,
    type MultilineArrayOptions,
} from "../options.js";
import { printWithMultilineArrays } from "./insert-new-lines.js";

/**
 * The estree plugin is bundled with Prettier and exposes the base printers we
 * want to wrap. Its types don't currently export `printers`, so we access it
 * via the module's exported value.
 */
const estreePlugin = estreePluginModule as unknown as {
    printers: Record<string, Printer<Node>>;
};

type PrinterPrint = Printer<Node>["print"];
type PrinterPrintCallback = Parameters<PrinterPrint>[2];

const debugEnvValue = process.env[envDebugKey];
const debug = Boolean(debugEnvValue);

export function createMultilineArrayPrinter(
    basePrinter: Printer<Node>
): Printer<Node> {
    return {
        ...basePrinter,
        /**
         * The 4th parameter `args` is used by Prettier internally. We must
         * declare it to preserve the function's arity (Function.length), which
         * Prettier checks to determine behavior. Without this 4th parameter,
         * Prettier's internal printing logic behaves differently, causing
         * incorrect output for non-array code (like function calls).
         */
        print(
            path: AstPath<Node>,
            options: ParserOptions,
            print: PrinterPrintCallback,
            args?: unknown
        ) {
            if (debug) {
                console.info(
                    "[multiline-arrays] multilineArrayPrinter.print for node:",
                    path.getNode()?.type
                );
            }
            const originalOutput = basePrinter.print(
                path,
                options,
                print,
                args
            );

            if (
                safeCastTo<string | undefined>(options.filepath)?.endsWith(
                    "package.json"
                ) &&
                options.plugins.some(
                    (plugin) =>
                        typeof plugin === "object" &&
                        (plugin as { name?: string }).name?.includes(
                            "prettier-plugin-packagejson"
                        )
                )
            ) {
                return originalOutput;
            }

            const multilineOptions: MultilineArrayOptions & ParserOptions =
                fillInOptions(options);

            return printWithMultilineArrays({
                originalFormattedOutput: originalOutput,
                path,
                inputOptions: multilineOptions,
                debug,
            });
        },
    };
}

export const multilineArrayPrinter: Printer<Node> = createMultilineArrayPrinter(
    assertWrap.isDefined(
        estreePlugin.printers.estree,
        "No ESTree printer found."
    )
);
