import type { Doc, doc } from "prettier";

import { stringify } from "@augment-vir/common";
import { objectHasIn } from "ts-extras";

type NestedStringArray = (NestedStringArray | string)[];

const childProperties = [
    "breakContents",
    "contents",
    "flatContents",
    "parts",
] as const;

export function stringifyDoc(
    input:
        | Doc
        | null
        | undefined,
    recursive = false
): NestedStringArray {
    if (typeof input === "string" || !input) {
        return [stringify(input)];
    }

    if (Array.isArray(input)) {
        return input.map((entry) => stringifyDoc(entry, recursive));
    }

    if (recursive) {
        const children: NestedStringArray = [];
        for (const currentProperty of childProperties) {
            if (objectHasIn(input, currentProperty)) {
                children.push(
                    `${currentProperty}:`,
                    stringifyDoc(
                        input[currentProperty] as
                            | Doc
                            | null
                            | undefined,
                        recursive
                    )
                );
            }
        }
        if (children.length > 0) {
            return [`${input.type}:`, stringifyDoc(children, recursive)];
        }
    }

    return [input.type];
}

export function isDocCommand(
    inputDoc:
        | Doc
        | null
        | undefined
): inputDoc is doc.builders.DocCommand {
    return (
        Boolean(inputDoc) &&
        typeof inputDoc !== "string" &&
        !Array.isArray(inputDoc)
    );
}
