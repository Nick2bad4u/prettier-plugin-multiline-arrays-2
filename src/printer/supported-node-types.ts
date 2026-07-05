import type { ArrayExpression, ArrayPattern, BaseNode, Node } from "estree";

type TSTupleType = BaseNode & {
    type: "TSTupleType";
    elementTypes: (BaseNode | null)[];
};

export type ArrayLikeNode = ArrayExpression | ArrayPattern | TSTupleType;

const arrayLikeNodeTypes: string[] = [
    "ArrayExpression",
    "ArrayPattern",
    // this expression type isn't accounted for in the types, but I saw it used in another plugin
    "TupleExpression",
    "TSTupleType",
];

export function isArrayLikeNode(node: Node): boolean {
    return arrayLikeNodeTypes.includes(node.type);
}

export function getArrayLikeElements(node: ArrayLikeNode): (BaseNode | null)[] {
    if (node.type === "TSTupleType") {
        return node.elementTypes;
    }
    return node.elements;
}
