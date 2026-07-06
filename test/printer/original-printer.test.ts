import type { Printer } from "prettier";

import { describe, expect, it } from "vitest";

import {
    getOriginalPrinter,
    setOriginalPrinter,
} from "../../src/printer/original-printer.js";

describe("original printer registry", () => {
    it("throws before the original printer is registered", () => {
        expect.assertions(1);

        expect(() => getOriginalPrinter()).toThrow(
            "originalPrinter hasn't been defined yet!"
        );
    });

    it("returns the registered original printer", () => {
        expect.assertions(1);

        const printer = {
            print: () => "",
        } as unknown as Printer;

        setOriginalPrinter(printer);

        expect(getOriginalPrinter()).toBe(printer);
    });
});
