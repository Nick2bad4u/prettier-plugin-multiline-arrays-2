import type { Printer } from "prettier";

const originalPrinterState: {
    value: Printer | undefined;
} = {
    value: undefined,
};

export function setOriginalPrinter(input: Printer): void {
    originalPrinterState.value = input;
}

export function getOriginalPrinter(): Printer {
    if (!originalPrinterState.value) {
        throw new Error("originalPrinter hasn't been defined yet!");
    }
    return originalPrinterState.value;
}
