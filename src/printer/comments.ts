import type { Comment } from "estree";

import { arrayIncludes, objectEntries, objectHasIn } from "ts-extras";

const commentTypes = [
    "Block",
    "CommentBlock",
    "CommentLine",
    "Line",
] as const;

function isMaybeComment(input: unknown): input is Comment {
    return Boolean(
        input &&
        typeof input === "object" &&
        objectHasIn(input, "type") &&
        arrayIncludes(commentTypes, input.type) &&
        objectHasIn(input, "value")
    );
}

export function extractComments(node: unknown): Comment[] {
    if (!node || typeof node !== "object") {
        return [];
    }
    const comments: Comment[] = [];

    if (Array.isArray(node)) {
        comments.push(...node.filter(isMaybeComment));
    }

    for (const [nodeKey, nodeChild] of objectEntries(node)) {
        if (nodeKey === "tokens") {
            continue;
        }

        if (typeof nodeChild !== "number" && typeof nodeChild !== "string") {
            comments.push(...extractComments(nodeChild));
        }
    }

    // This might duplicate comments but our later code doesn't care
    return comments;
}
