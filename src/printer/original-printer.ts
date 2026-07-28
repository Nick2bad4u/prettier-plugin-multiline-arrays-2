import type { Printer } from "prettier";

import { assert } from "ts-extras";

const originalPrinterState: {
    value: Printer | undefined;
} = {
    value: undefined,
};

export function setOriginalPrinter(input: Printer): void {
    originalPrinterState.value = input;
}

export function getOriginalPrinter(): Printer {
    assert(
        originalPrinterState.value,
        "originalPrinter hasn't been defined yet!"
    );
    return originalPrinterState.value;
}
