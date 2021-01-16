import * as nodeAssert from "assert";

// Workaround https://github.com/electron/electron/issues/24577
export const assert = {
    strictEqual: (actual: any, expected: any) => {
        // eslint-disable-next-line eqeqeq
        if (actual != expected) {
            throw new nodeAssert.AssertionError({
                actual,
                expected,
                operator: "==",
            });
        }
    },
    ok: (value: Boolean) => {
        if (!value) {
            throw new nodeAssert.AssertionError({
                actual: value,
                expected: true,
                operator: "==",
            });
        }
    },
};
