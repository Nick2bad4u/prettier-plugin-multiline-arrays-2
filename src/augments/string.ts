export function capitalizeFirst(input: string): string {
    if (!input) {
        return input;
    }
    return (input[0] ?? "").toUpperCase() + input.slice(1);
}

export function stringify(input: unknown): string {
    if (typeof input === "string") {
        return input;
    }

    try {
        const stringified: unknown = JSON.stringify(
            input,
            (_key, value: unknown) => {
                if (typeof value === "bigint") {
                    return Number(value);
                }

                return value;
            }
        );

        return typeof stringified === "string" ? stringified : String(input);
    } catch {
        return String(input);
    }
}
