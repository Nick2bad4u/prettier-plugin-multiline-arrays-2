import type {
    BooleanSupportOption,
    IntSupportOption,
    Parser,
    Plugin,
    Printer,
    RequiredOptions,
    StringSupportOption,
    SupportOption,
} from "prettier";

import { parsers as babelParsers } from "prettier/plugins/babel";
import { parsers as tsParsers } from "prettier/plugins/typescript";
import { objectKeys } from "ts-extras";

import {
    defaultMultilineArrayOptions,
    type MultilineArrayOptions,
    optionHelp,
} from "./options.js";
import { wrapParser } from "./preprocessing.js";
import { multilineArrayPrinter } from "./printer/multiline-array-printer.js";

// exports in case others want to utilize these
export * from "./options.js";
export { pluginMarker } from "./plugin-marker.js";

export const parsers: Record<string, Parser> = {
    typescript: wrapParser(tsParsers.typescript, "typescript"),
    babel: wrapParser(babelParsers.babel, "babel"),
    "babel-ts": wrapParser(babelParsers["babel-ts"], "babel-ts"),
    json: wrapParser(babelParsers.json, "json"),
    json5: wrapParser(babelParsers.json5, "json5"),
};

const printers: Record<string, Printer> = {
    estree: multilineArrayPrinter,
    "estree-json": multilineArrayPrinter,
};

function createOptions(): Record<keyof MultilineArrayOptions, SupportOption> {
    const output = {} as Record<keyof MultilineArrayOptions, SupportOption>;

    for (const key of objectKeys(defaultMultilineArrayOptions)) {
        const defaultValue = defaultMultilineArrayOptions[key];
        let supportOption: SupportOption;

        if (typeof defaultValue === "number") {
            supportOption = {
                name: key,
                type: "int",
                category: "multilineArray",
                default: defaultValue,
                description: optionHelp[key],
            } satisfies IntSupportOption;
        } else if (typeof defaultValue === "boolean") {
            supportOption = {
                name: key,
                type: "boolean",
                category: "multilineArray",
                default: defaultValue,
                description: optionHelp[key],
            } satisfies BooleanSupportOption;
        } else {
            supportOption = {
                name: key,
                type: "string",
                category: "multilineArray",
                default: defaultValue,
                description: optionHelp[key],
            } satisfies StringSupportOption;
        }

        output[key] = supportOption;
    }

    return output;
}

export const options: Record<keyof MultilineArrayOptions, SupportOption> =
    createOptions();

export const defaultOptions: Partial<RequiredOptions> &
    Required<MultilineArrayOptions> = {
    ...defaultMultilineArrayOptions,
};

/*
 * Augment Prettier's `Options` interface with multiline array options.
 */
declare module "prettier" {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation requires extends
    interface Options extends Partial<MultilineArrayOptions> {}
}

/** Not actually exported: this is just for type checking purposes. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- The sentinel validates named exports against Prettier's Plugin shape.
const plugin: Plugin = {
    options,
    printers,
    defaultOptions,
    parsers,
};
