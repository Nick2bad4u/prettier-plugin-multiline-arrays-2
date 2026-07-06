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

function logWalkVisit({
    startDoc,
    parents,
    index,
}: Readonly<{
    index: number | undefined;
    parents: Parents[];
    startDoc: Doc;
}>): void {
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

function walkArrayChildren({
    arrayDoc,
    debug,
    visitDoc,
    parents,
}: Readonly<{
    arrayDoc: Doc[];
    debug: boolean;
    parents: Parents[];
    visitDoc: (
        currentDoc: Doc,
        parents: Parents[],
        index: number | undefined
    ) => boolean | undefined;
}>): void {
    if (debug) {
        console.info("walking array children");
    }
    // Once a child returns false, abort walking this array.
    arrayDoc.every((innerDoc, childIndex): boolean =>
        walkDoc({
            startDoc: innerDoc,
            debug,
            callback: visitDoc,
            parents: [
                {
                    parent: arrayDoc,
                    childIndexInThisParent: childIndex,
                },
                ...parents,
            ],
            index: childIndex,
        })
    );
}

function walkDocChildProperty({
    startDoc,
    property,
    debug,
    visitDoc,
    parents,
}: Readonly<{
    debug: boolean;
    parents: Parents[];
    property: DocChildProperty;
    startDoc: Doc & Partial<Record<DocChildProperty, Doc>>;
    visitDoc: (
        currentDoc: Doc,
        parents: Parents[],
        index: number | undefined
    ) => boolean | undefined;
}>): boolean {
    const childDoc = startDoc[property];
    if (childDoc == undefined) {
        return true;
    }

    if (debug) {
        console.info(`walking ${property} property`);
    }

    return walkDoc({
        startDoc: childDoc,
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
        logWalkVisit({
            startDoc,
            parents,
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
        walkArrayChildren({
            arrayDoc: startDoc,
            debug,
            visitDoc,
            parents,
        });
    }

    if (hasDocChildProperty(startDoc, "contents")) {
        return walkDocChildProperty({
            startDoc,
            property: "contents",
            debug,
            parents,
            visitDoc,
        });
    }

    if (hasDocChildProperty(startDoc, "parts")) {
        return walkDocChildProperty({
            startDoc,
            property: "parts",
            debug,
            parents,
            visitDoc,
        });
    }
    return true;
}
