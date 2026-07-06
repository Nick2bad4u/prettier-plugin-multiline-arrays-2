import type { ArrayExpression, ArrayPattern, BaseNode, Node } from "estree";

import { setHas } from "ts-extras";

type TSTupleType = BaseNode & {
    elementTypes: (BaseNode | null)[];
    type: "TSTupleType";
};

export type ArrayLikeNode = ArrayExpression | ArrayPattern | TSTupleType;

const arrayLikeNodeTypes = new Set<string>([
    "ArrayExpression",
    "ArrayPattern",
    "TSTupleType",
    // This expression type isn't accounted for in the types, but I saw it used in another plugin
    "TupleExpression",
]);

export function isArrayLikeNode(node: Node): boolean {
    return setHas<string>(arrayLikeNodeTypes, node.type);
}

export function getArrayLikeElements(node: ArrayLikeNode): (BaseNode | null)[] {
    if (node.type === "TSTupleType") {
        return node.elementTypes;
    }
    return node.elements;
}
