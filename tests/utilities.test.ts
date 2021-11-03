import "mockzilla-webextension";

import { deep_copy, deep_equals } from "../source/core/utilities";

describe("utilities module", () => {
    const original = {
        a: {
            b: "c",
        },
    };

    it("should provide deep copy", () => {
        const copy = deep_copy(original);

        expect(copy).not.toBe(original);
        expect(copy.a).not.toBe(original.a);
        expect(copy).toEqual(original);
    });

    it("should provide deep equality", () => {
        const copy = {
            a: {
                b: "c",
            },
        };
        const flawed_copy = {
            a: {
                b: "d",
            },
        };

        expect(deep_equals(original, copy)).toEqual(true);
        expect(deep_equals(original, flawed_copy)).toEqual(false);
    });
});
