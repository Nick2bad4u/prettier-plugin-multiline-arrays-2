import type { Node } from "estree";
import type { AstPath, Doc, ParserOptions, Printer } from "prettier";

import * as prettier from "prettier";
import { safeCastTo, setHas } from "ts-extras";

import type { MultilineArrayOptions } from "../options.js";

type PrinterPrint = Printer<Node>["print"];
type PrinterPrintCallback = Parameters<PrinterPrint>[2];

interface TypeScriptUnionNode {
    type: "TSUnionType";
    types: unknown[];
}

interface TypeScriptArrayNode {
    type: "TSArrayType";
}

const typeScriptUnionLeadingLineParentTypes: ReadonlySet<string> = new Set([
    "TSAsExpression",
    "TSConditionalType",
    "TSMappedType",
    "TSSatisfiesExpression",
    "TSTypeAnnotation",
    "TSTypeParameter",
    "TSTypePredicate",
]);

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

function isTypeScriptArrayNode(input: unknown): input is TypeScriptArrayNode {
    if (!input || typeof input !== "object") {
        return false;
    }

    return safeCastTo<{ type?: unknown }>(input).type === "TSArrayType";
}

function getNodeType(input: unknown): string | undefined {
    if (!input || typeof input !== "object") {
        return undefined;
    }

    const nodeType = safeCastTo<{ type?: unknown }>(input).type;

    return typeof nodeType === "string" ? nodeType : undefined;
}

function isTypeScriptUnionLeadingLineParent(input: unknown): boolean {
    const parentType = getNodeType(input);

    return Boolean(
        parentType && setHas(typeScriptUnionLeadingLineParentTypes, parentType)
    );
}

function buildIndentedUnionDoc(unionDoc: Doc): Doc {
    return prettier.doc.builders.indent([
        prettier.doc.builders.hardline,
        unionDoc,
    ]);
}

function buildParenthesizedUnionDoc(unionDoc: Doc): Doc {
    return prettier.doc.builders.group([
        "(",
        buildIndentedUnionDoc(unionDoc),
        prettier.doc.builders.hardline,
        ")",
    ]);
}

export function printWithMultilineTypeUnions({
    inputOptions,
    path,
    print,
}: Readonly<{
    inputOptions: MultilineArrayOptions & ParserOptions;
    path: AstPath<Node>;
    print: PrinterPrintCallback;
}>): { matched: false } | { matched: true; output: Doc } {
    const node: unknown = path.getNode();

    if (!isTypeScriptUnionNode(node)) {
        return { matched: false };
    }

    const wrapThreshold =
        inputOptions.multilineTypeUnionsWrapThreshold < 0
            ? Infinity
            : inputOptions.multilineTypeUnionsWrapThreshold;

    if (node.types.length <= wrapThreshold) {
        return { matched: false };
    }

    const printedTypes = node.types.map((_, index) => print(["types", index]));
    const unionMembers = printedTypes.map((typeDoc) => ["| ", typeDoc]);
    const unionDoc = prettier.doc.builders.join(
        prettier.doc.builders.hardline,
        unionMembers
    );
    const parentNode = path.getParentNode();
    const parentNodeType = getNodeType(parentNode);

    if (isTypeScriptArrayNode(parentNode)) {
        return {
            matched: true,
            output: buildParenthesizedUnionDoc(unionDoc),
        };
    }

    const pathKey = path.key;

    if (parentNodeType === "TSIndexedAccessType") {
        if (pathKey === "indexType") {
            return {
                matched: true,
                output: prettier.doc.builders.group([
                    buildIndentedUnionDoc(unionDoc),
                    prettier.doc.builders.hardline,
                ]),
            };
        }

        return {
            matched: true,
            output: buildParenthesizedUnionDoc(unionDoc),
        };
    }

    if (
        parentNodeType === "TSTypeOperator" ||
        (parentNodeType === "TSConditionalType" && pathKey === "checkType")
    ) {
        return {
            matched: true,
            output: buildParenthesizedUnionDoc(unionDoc),
        };
    }

    if (isTypeScriptUnionLeadingLineParent(parentNode)) {
        return {
            matched: true,
            output: prettier.doc.builders.group(
                buildIndentedUnionDoc(unionDoc)
            ),
        };
    }

    return {
        matched: true,
        output: prettier.doc.builders.group(unionDoc),
    };
}
