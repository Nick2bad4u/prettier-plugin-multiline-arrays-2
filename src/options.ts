import { getObjectTypedKeys, type Values } from "@augment-vir/common";
import { objectHasIn, safeCastTo, stringSplit } from "ts-extras";

export const envDebugKey = "MULTILINE_DEBUG";

export const nextLinePatternComment =
    "prettier-multiline-arrays-next-line-pattern:";
export const setLinePatternComment =
    "prettier-multiline-arrays-set-line-pattern:";

export const nextWrapThresholdComment =
    "prettier-multiline-arrays-next-threshold:";
export const setWrapThresholdComment =
    "prettier-multiline-arrays-set-threshold:";

export const resetComment = "prettier-multiline-arrays-reset";

export function stripTextUntilCommentTrigger(
    input: string,
    commentTrigger: string
): string {
    const triggerIndex = input.indexOf(commentTrigger);

    if (triggerIndex === -1) {
        return input;
    }

    return input.slice(triggerIndex + commentTrigger.length);
}

export interface MultilineArrayOptions {
    multilineArraysLinePattern: string;
    /**
     * If there are MORE elements in the array than this, the array will be
     * forced to wrap.
     *
     * This defaults to -1, indicating that no special wrapping enforcement will
     * take place.
     *
     * Set to 2 to only wrap if there are more than 2 element. Etc.
     */
    multilineArraysWrapThreshold: number;
}

export const optionHelp: Record<keyof MultilineArrayOptions, string> = {
    multilineArraysWrapThreshold: `A number indicating that all arrays should wrap when they have MORE than the specified number. Defaults to -1, indicating that no special wrapping enforcement will take place.\nExample: multilineArraysWrapThreshold: 3\nCan be overridden with a comment starting with ${nextWrapThresholdComment}.\nComment example: // ${nextWrapThresholdComment} 5`,
    multilineArraysLinePattern: `A string with a space separated list of numbers indicating how many elements should be on each line. The pattern repeats if an array is longer than the pattern. Defaults to an empty string. Any invalid numbers causes the whole pattern to revert to the default. This overrides the wrap threshold option.\nExample: elementsPerLinePattern: "3 2 1"\nCan be overridden with a comment starting with ${nextLinePatternComment}.\nComment example: // ${nextLinePatternComment} 3 2 1\nThis option overrides Prettier's default wrapping; multiple elements on one line will not be wrapped even if they don't fit within the column count.`,
};

export const optionPropertyValidators: {
    [Property in keyof MultilineArrayOptions]: (
        input: unknown
    ) => input is MultilineArrayOptions[Property];
} = {
    multilineArraysWrapThreshold: (input): input is number =>
        typeof input === "number" && !Number.isNaN(input),
    multilineArraysLinePattern(input): input is string {
        if (typeof input !== "string") {
            return false;
        }

        const splitNumbers = stringSplit(input, " ");

        return splitNumbers.every((splitNumber) => {
            const numericSplit = Number(splitNumber);
            return !Number.isNaN(numericSplit);
        });
    },
};

export const defaultMultilineArrayOptions: MultilineArrayOptions = {
    multilineArraysWrapThreshold: -1,
    multilineArraysLinePattern: "",
};

const optionTypeToPrettierOptionTypeMapping: Record<
    string,
    MultilinePrettierOptionType
> = {
    number: "int",
    boolean: "boolean",
    string: "string",
} as const satisfies Record<
    "boolean" | "number" | "string",
    MultilinePrettierOptionType
>;

export type MultilinePrettierOptionType = "boolean" | "int" | "string";

export function getPrettierOptionType(
    input: Values<MultilineArrayOptions>
): MultilinePrettierOptionType {
    const mappedType = optionTypeToPrettierOptionTypeMapping[typeof input];

    if (mappedType) {
        return mappedType;
    }

    throw new Error(`Unmapped option type: '${typeof input}'`);
}

export function fillInOptions<T extends object>(
    input: T | undefined
): MultilineArrayOptions & T {
    if (!input || typeof input !== "object") {
        return defaultMultilineArrayOptions as MultilineArrayOptions & T;
    }
    const newOptions: MultilineArrayOptions & T = {
        ...input,
    } as MultilineArrayOptions & T;
    for (const optionsKey of getObjectTypedKeys(defaultMultilineArrayOptions)) {
        const inputValue: unknown = objectHasIn(input, optionsKey)
            ? input[optionsKey]
            : undefined;
        const defaultValue = defaultMultilineArrayOptions[optionsKey];
        safeCastTo<Record<typeof optionsKey, typeof inputValue>>(newOptions)[
            optionsKey
        ] = optionPropertyValidators[optionsKey](inputValue)
            ? inputValue
            : defaultValue;
    }

    return newOptions;
}
