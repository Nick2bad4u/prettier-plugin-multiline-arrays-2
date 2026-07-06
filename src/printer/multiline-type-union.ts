import type { Node } from "estree";
import type { AstPath, Doc, ParserOptions, Printer } from "prettier";

import * as prettier from "prettier";
import { safeCastTo } from "ts-extras";

import type { MultilineArrayOptions } from "../options.js";

type PrinterPrint = Printer<Node>["print"];
type PrinterPrintCallback = Parameters<PrinterPrint>[2];

interface TypeScriptUnionNode {
    type: "TSUnionType";
    types: unknown[];
}

function isTypeScriptUnionNode(input: unknown): input is TypeScriptUnionNode {
    if (!input || typeof input !== "object") {
        return false;
    }

    const possibleUnionNode = safeCastTo<{
        type?: unknown;
        types?: unknown;
    }>(input);

    return (
        possibleUnionNode.type === "TSUnionType" &&
        Array.isArray(possibleUnionNode.types)
    );
}

export function printWithMultilineTypeUnions({
    inputOptions,
    path,
    print,
}: Readonly<{
    inputOptions: MultilineArrayOptions & ParserOptions;
    path: AstPath<Node>;
    print: PrinterPrintCallback;
}>): Doc | undefined {
    const node: unknown = path.getNode();

    if (!isTypeScriptUnionNode(node)) {
        return undefined;
    }

    const wrapThreshold =
        inputOptions.multilineTypeUnionsWrapThreshold < 0
            ? Infinity
            : inputOptions.multilineTypeUnionsWrapThreshold;

    if (node.types.length <= wrapThreshold) {
        return undefined;
    }

    const printedTypes = node.types.map((_, index) => print(["types", index]));
    const unionMembers = printedTypes.map((typeDoc) => ["| ", typeDoc]);

    return prettier.doc.builders.group(
        prettier.doc.builders.join(prettier.doc.builders.hardline, unionMembers)
    );
}
