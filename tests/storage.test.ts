import "mockzilla-webextension";

import { get_from_storage, set_in_storage } from "../source/core/storage";

describe("storage module", () => {
    const key = "foo";
    const value = { bar: "baz" };

    it("should associate keys with values", () => {
        mockBrowser.storage.local.set.expect.andResolve();

        return set_in_storage(key, value);
    });

    it("should yield null if key is not present", () => {
        mockBrowser.storage.local.get.expect(key).andReject(new Error());

        return expect(get_from_storage(key)).resolves.toEqual(null);
    });

    it("should yield value if key is present", () => {
        mockBrowser.storage.local.get.expect(key).andResolve({ [key]: value });

        return expect(get_from_storage(key)).resolves.toEqual(value);
    });
});
