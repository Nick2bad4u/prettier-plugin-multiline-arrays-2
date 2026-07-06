import type { Comment, Node } from "estree";

import { check } from "@augment-vir/assert";
import { getObjectTypedKeys } from "@augment-vir/common";
import {
    arrayFirst,
    arrayJoin,
    isEmpty,
    safeCastTo,
    setHas,
    stringSplit,
} from "ts-extras";

import {
    nextLinePatternComment,
    nextWrapThresholdComment,
    resetComment,
    setLinePatternComment,
    setWrapThresholdComment,
    stripTextUntilCommentTrigger,
} from "../options.js";
import { extractComments } from "./comments.js";
import { isArrayLikeNode } from "./supported-node-types.js";

type LineNumberDetails<T> = Record<string, T>;
export type LineCounts = LineNumberDetails<number[]>;
export type WrapThresholds = LineNumberDetails<number>;
export type CommentTriggerWithEnding<T> = {
    [P in keyof T]: { data: T[P]; lineEnd: number };
};

export interface CommentTriggers {
    nextLineCounts: LineCounts;
    nextWrapThresholds: WrapThresholds;
    setLineCounts: CommentTriggerWithEnding<LineCounts>;
    setWrapThresholds: CommentTriggerWithEnding<WrapThresholds>;
}

type InternalCommentTriggers = CommentTriggers & {
    resets: number[];
};

const mappedCommentTriggers = new WeakMap<Node, CommentTriggers>();

const ignoredAstChildKeys = new Set([
    "comments",
    "leadingComments",
    "loc",
    "range",
    "raw",
    "tokens",
    "trailingComments",
    "value",
] as const);

const descendantBoundaryTypes = new Set([
    "ArrowFunctionExpression",
    "ClassDeclaration",
    "ClassExpression",
    "FunctionDeclaration",
    "FunctionExpression",
] as const);

export function getCommentTriggers(key: Node, debug: boolean): CommentTriggers {
    const alreadyExisting = mappedCommentTriggers.get(key);
    if (!alreadyExisting) {
        return setCommentTriggers(key, debug);
    }
    return alreadyExisting;
}

function setCommentTriggers(rootNode: Node, debug: boolean): CommentTriggers {
    // Parse comments only on the root node so it only happens once
    const comments: Comment[] = extractComments(rootNode);
    if (debug) {
        console.info({
            comments,
        });
    }

    const starterTriggers: InternalCommentTriggers = {
        nextLineCounts: {},
        setLineCounts: {},
        nextWrapThresholds: {},
        setWrapThresholds: {},
        resets: [],
    };

    const internalCommentTriggers: InternalCommentTriggers = starterTriggers;

    for (const currentComment of comments) {
        const commentText = safeCastTo<string | undefined>(
            currentComment.value
        )?.replaceAll("\n", " ");

        if (!currentComment.loc) {
            throw new Error(
                `Cannot read line location for comment ${currentComment.value}`
            );
        }

        const nextLineCounts = getLineCounts({
            commentText,
            nextOnly: true,
            debug,
        });
        if (nextLineCounts.length > 0) {
            internalCommentTriggers.nextLineCounts[
                currentComment.loc.end.line
            ] = nextLineCounts;
        }

        const nextWrapThreshold = getWrapThreshold(commentText, true);
        if (nextWrapThreshold != undefined) {
            internalCommentTriggers.nextWrapThresholds[
                currentComment.loc.end.line
            ] = nextWrapThreshold;
        }

        const setLineCounts = getLineCounts({
            commentText,
            nextOnly: false,
            debug,
        });
        if (setLineCounts.length > 0) {
            internalCommentTriggers.setLineCounts[currentComment.loc.end.line] =
                {
                    data: setLineCounts,
                    lineEnd: Infinity,
                };
        }

        const setWrapThreshold = getWrapThreshold(commentText, false);
        if (setWrapThreshold != undefined) {
            internalCommentTriggers.setWrapThresholds[
                currentComment.loc.end.line
            ] = {
                data: setWrapThreshold,
                lineEnd: Infinity,
            };
        }

        const shouldReset = isResetComment(commentText);
        if (shouldReset) {
            internalCommentTriggers.resets.push(currentComment.loc.end.line);
        }
    }

    internalCommentTriggers.resets.sort(
        (firstLine, secondLine) => firstLine - secondLine
    );

    setResets(internalCommentTriggers);
    mapNextCommentTriggers({
        internalCommentTriggers,
        rootNode,
    });

    const commentTriggers = {
        ...internalCommentTriggers,
    };
    delete safeCastTo<Partial<InternalCommentTriggers>>(commentTriggers).resets;

    // Save to a map so we don't have to recalculate these every time
    mappedCommentTriggers.set(rootNode, commentTriggers);
    return commentTriggers;
}

function mapNextCommentTriggers({
    internalCommentTriggers,
    rootNode,
}: Readonly<{
    internalCommentTriggers: InternalCommentTriggers;
    rootNode: Node;
}>): void {
    internalCommentTriggers.nextLineCounts = mapNextLineTriggers({
        rootNode,
        triggers: internalCommentTriggers.nextLineCounts,
    });
    internalCommentTriggers.nextWrapThresholds = mapNextLineTriggers({
        rootNode,
        triggers: internalCommentTriggers.nextWrapThresholds,
    });
}

function mapNextLineTriggers<T>({
    rootNode,
    triggers,
}: Readonly<{
    rootNode: Node;
    triggers: LineNumberDetails<T>;
}>): LineNumberDetails<T> {
    const mappedTriggers: LineNumberDetails<T> = {};

    for (const triggerLineNumber of getObjectTypedKeys(triggers)) {
        const trigger = triggers[triggerLineNumber];
        const targetLineNumber = findArrayLikeTargetLine({
            nextLineNumber: Number(triggerLineNumber) + 1,
            rootNode,
        });

        if (targetLineNumber != undefined && trigger != undefined) {
            mappedTriggers[targetLineNumber] = trigger;
        }
    }

    return mappedTriggers;
}

function findArrayLikeTargetLine({
    rootNode,
    nextLineNumber,
}: Readonly<{
    nextLineNumber: number;
    rootNode: Node;
}>): number | undefined {
    const descendantLines = findAstNodesStartingOnLine({
        lineNumber: nextLineNumber,
        rootNode,
    }).flatMap((node) =>
        findArrayLikeDescendantLines({
            rootNode: node,
        })
    );

    return descendantLines.length > 0
        ? Math.min(...descendantLines)
        : undefined;
}

function findAstNodesStartingOnLine({
    rootNode,
    lineNumber,
}: Readonly<{
    lineNumber: number;
    rootNode: Node;
}>): Node[] {
    return collectAstNodes({
        input: rootNode,
        shouldInclude: (node) => node.loc?.start.line === lineNumber,
    });
}

function findArrayLikeDescendantLines({
    rootNode,
}: Readonly<{
    rootNode: Node;
}>): number[] {
    return collectAstNodes({
        input: rootNode,
        shouldInclude: (node) => isArrayLikeNode(node) && Boolean(node.loc),
        shouldWalkChildren: (node, isRootNode) =>
            isRootNode || !setHas(descendantBoundaryTypes, node.type),
    }).flatMap((node) => {
        if (!node.loc) {
            return [];
        }

        return [node.loc.start.line];
    });
}

function collectAstNodes({
    input,
    shouldInclude,
    shouldWalkChildren = () => true,
    seenInputs = new WeakSet<object>(),
    isRootNode = true,
}: Readonly<{
    input: unknown;
    isRootNode?: boolean | undefined;
    seenInputs?: undefined | WeakSet<object>;
    shouldInclude: (node: Node, isRootNode: boolean) => boolean;
    shouldWalkChildren?:
        ((node: Node, isRootNode: boolean) => boolean) | undefined;
}>): Node[] {
    if (check.isArray(input)) {
        return input.flatMap((child) =>
            collectAstNodes({
                input: child,
                isRootNode: false,
                seenInputs,
                shouldInclude,
                shouldWalkChildren,
            })
        );
    }

    if (!check.isObject(input) || seenInputs.has(input)) {
        return [];
    }

    seenInputs.add(input);

    if (!isAstNode(input)) {
        return [];
    }

    const matchingNode = shouldInclude(input, isRootNode) ? [input] : [];
    const childNodes = shouldWalkChildren(input, isRootNode)
        ? getObjectTypedKeys(input).flatMap((nodeKey) => {
              if (setHas(ignoredAstChildKeys, String(nodeKey))) {
                  return [];
              }

              return collectAstNodes({
                  input: Reflect.get(input, nodeKey),
                  isRootNode: false,
                  seenInputs,
                  shouldInclude,
                  shouldWalkChildren,
              });
          })
        : [];

    return [...matchingNode, ...childNodes];
}

function isAstNode(input: object): input is Node {
    return check.isObject(input) && check.isString(input.type);
}

function isIntegerString(entry: string): boolean {
    if (entry.length === 0) {
        return false;
    }

    for (const character of entry) {
        if (character < "0" || character > "9") {
            return false;
        }
    }

    return true;
}

function setResets(internalCommentTriggers: InternalCommentTriggers): void {
    if (isEmpty(internalCommentTriggers.resets)) {
        return;
    }

    const setLineCountLineNumbers = getObjectTypedKeys(
        internalCommentTriggers.setLineCounts
    );
    if (setLineCountLineNumbers.length > 0) {
        for (const lineNumber of setLineCountLineNumbers) {
            const currentLineNumberStats =
                internalCommentTriggers.setLineCounts[lineNumber];
            if (!currentLineNumberStats) {
                throw new Error(
                    `Line number stats were undefined for "${lineNumber}" in "${JSON.stringify(
                        internalCommentTriggers.setLineCounts
                    )}"`
                );
            }
            const endLineNumber: number =
                internalCommentTriggers.resets.find(
                    (resetLineNumber): boolean =>
                        Number(lineNumber) < resetLineNumber
                ) ?? currentLineNumberStats.lineEnd;

            currentLineNumberStats.lineEnd = endLineNumber;
        }
    }
}

function getWrapThreshold(
    commentText: string | undefined,
    nextOnly: boolean
): number | undefined {
    const searchText = nextOnly
        ? nextWrapThresholdComment
        : setWrapThresholdComment;

    if (commentText?.toLowerCase().includes(searchText)) {
        const thresholdValue = Number(
            stripTextUntilCommentTrigger(
                commentText.toLowerCase(),
                searchText
            ).trim()
        );
        if (Number.isNaN(thresholdValue)) {
            return undefined;
        }

        return thresholdValue;
    }

    return undefined;
}

export function parseNextLineCounts({
    input,
    nextOnly,
    debug,
}: Readonly<{ debug: boolean; input: string; nextOnly: boolean }>): number[] {
    if (!input) {
        return [];
    }

    const searchText = nextOnly
        ? nextLinePatternComment
        : setLinePatternComment;

    let split = stringSplit(
        stripTextUntilCommentTrigger(
            input.toLowerCase(),
            searchText
        ).replaceAll(",", ""),
        " "
    ).filter(Boolean);

    const firstSplit = arrayFirst(split);
    if (firstSplit === "[") {
        split = split.slice(1);
    } else if (firstSplit?.startsWith("[")) {
        split[0] = firstSplit.slice(1);
    }

    const [lastSplit] = split.toReversed();
    if (lastSplit === "]") {
        split = split.slice(0, -1);
    } else if (lastSplit?.endsWith("]")) {
        const lastSplitIndex = split.length - 1;
        split[lastSplitIndex] = lastSplit.slice(0, -1);
    }

    const numbers = split.map((entry) =>
        isIntegerString(entry.trim()) ? Number(entry.trim()) : Number.NaN
    );

    const invalidNumbers = numbers
        .map((entry, index) => ({
            index,
            entry,
            original: split[index],
        }))
        .filter((entry) => Number.isNaN(entry.entry));

    if (invalidNumbers.length > 0) {
        if (debug) {
            console.error(
                invalidNumbers.map((entry) => ({
                    index: entry.index,
                    original: entry.original,
                    parsed: entry,
                    split,
                    input,
                    numbers,
                    trim: entry.original?.trim(),
                    matched: isIntegerString(entry.original?.trim() ?? ""),
                }))
            );
        }
        console.error(
            `Invalid number(s) for elements per line option/comment: ${arrayJoin(
                invalidNumbers.map((entry) => entry.original),
                ","
            )}`
        );
        return [];
    }
    return numbers;
}

function isResetComment(commentText: string | undefined): boolean {
    return Boolean(commentText?.toLowerCase().includes(resetComment));
}

function getLineCounts({
    commentText,
    nextOnly,
    debug,
}: Readonly<{
    commentText: string | undefined;
    debug: boolean;
    nextOnly: boolean;
}>): number[] {
    const searchText = nextOnly
        ? nextLinePatternComment
        : setLinePatternComment;

    if (commentText?.toLowerCase().includes(searchText)) {
        return parseNextLineCounts({
            input: commentText,
            nextOnly,
            debug,
        });
    }

    return [];
}
