import type { Doc } from "prettier";

import { arrayFirst, objectHasIn } from "ts-extras";

interface Parents {
    childIndexInThisParent: number | undefined;
    parent: Doc;
}

type DocChildProperty = "contents" | "parts";

function hasDocChildProperty<Key extends DocChildProperty>(
    input: Doc,
    key: Key
): input is Doc & Record<Key, Doc> {
    return objectHasIn(input, key);
}

/**
 * Walk a Prettier doc tree from the given starting node.
 *
 * @returns Boolean true means keep walking children and siblings, false means
 *   stop walking children and siblings. Returning false does not stop walking
 *   of aunts/uncles or ancestors.
 */
export function walkDoc({
    startDoc,
    debug,
    callback: visitDoc,
    parents = [],
    index,
}: Readonly<{
    callback: (
        currentDoc: Doc,
        parents: Parents[],
        index: number | undefined
    ) => boolean | undefined;
    debug: boolean;
    index?: number | undefined;
    parents?: Parents[];
    startDoc: Doc;
}>): boolean {
    if (!startDoc) {
        return true;
    }
    if (debug) {
        const parent = arrayFirst(parents);
        const parentDoc = parent?.parent;
        console.info({
            firingCallbackFor: startDoc,
            status: "Calling callback",
            parent: parent
                ? {
                      isArray: Array.isArray(parentDoc),
                      type:
                          parentDoc && objectHasIn(parentDoc, "type")
                              ? parentDoc.type
                              : typeof parentDoc,
                  }
                : undefined,
            index,
        });
    }
    if (!visitDoc(startDoc, parents, index)) {
        // If the callback returns something falsy, don't try to walk its children
        return false;
    }

    if (typeof startDoc === "string") {
        return true;
    }

    if (Array.isArray(startDoc)) {
        if (debug) {
            console.info("walking array children");
        }
        // One a child returns false, abort walking this array
        startDoc.every((innerDoc, childIndex): boolean =>
            walkDoc({
                startDoc: innerDoc,
                debug,
                callback: visitDoc,
                parents: [
                    {
                        parent: startDoc,
                        childIndexInThisParent: childIndex,
                    },
                    ...parents,
                ],
                index: childIndex,
            })
        );
    }

    if (hasDocChildProperty(startDoc, "contents")) {
        if (debug) {
            console.info("walking contents property");
        }
        return walkDoc({
            startDoc: startDoc.contents,
            debug,
            callback: visitDoc,
            parents: [
                {
                    parent: startDoc,
                    childIndexInThisParent: undefined,
                },
                ...parents,
            ],
            index: undefined,
        });
    }

    if (hasDocChildProperty(startDoc, "parts")) {
        if (debug) {
            console.info("walking parts property");
        }
        return walkDoc({
            startDoc: startDoc.parts,
            debug,
            callback: visitDoc,
            parents: [
                {
                    parent: startDoc,
                    childIndexInThisParent: undefined,
                },
                ...parents,
            ],
            index: undefined,
        });
    }
    return true;
}
