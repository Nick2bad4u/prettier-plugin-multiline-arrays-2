import type { BaseNode } from "estree";

import { extractTextBetweenRanges } from "../augments/array.js";

export function containsTrailingComma({
    nodeLocation,
    children,
    originalLines,
}: Readonly<{
    children: (BaseNode | null)[];
    nodeLocation: BaseNode["loc"];
    originalLines: string[];
}>): boolean {
    const [lastElement] = children.toReversed();
    if (lastElement) {
        const startLocation = lastElement.loc?.end;
        if (!startLocation) {
            return false;
        }
        const endLocation = nodeLocation?.end;
        if (!endLocation) {
            return false;
        }
        const textPastLastElement = extractTextBetweenRanges(originalLines, {
            start: {
                column: startLocation.column - 1,
                line: startLocation.line - 1,
            },
            end: {
                column: endLocation.column - 1,
                line: endLocation.line - 1,
            },
        });

        if (textPastLastElement.includes(",")) {
            return true;
        }
    }
    return false;
}
