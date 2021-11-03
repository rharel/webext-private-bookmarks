import "mockzilla-webextension";

import {
    default_options,
    Options,
    options,
    OPTIONS_STORAGE_KEY,
    save_options,
} from "../source/core/options";

describe("options module", () => {
    const name = "Private Bookmarks";
    const version = {
        major: 1,
        minor: 2,
        release: 3,
    };
    const manifest = {
        name: name,
        manifest_version: 2,
        version: `${version.major}.${version.minor}.${version.release}`,
    };
    const default_options_expected: Options = {
        backup_reminder_enabled: false,
        backup_reminder_interval_days: 7,
        idle_lock_enabled: false,
        idle_lock_threshold_minutes: 30,
        limit_to_private_context: false,
        show_release_notes: true,
        theme: "light",
        version: version,
    };

    it("should have sane defaults", () => {
        mockBrowser.runtime.getManifest.expect().andReturn(manifest);
        expect(default_options()).toEqual(default_options_expected);
    });

    describe("options getter", () => {
        it("should return defaults if no options are in local storage", () => {
            mockBrowser.storage.local.get.expect(OPTIONS_STORAGE_KEY).andResolve({
                [OPTIONS_STORAGE_KEY]: default_options_expected,
            });

            return expect(options()).resolves.toEqual(default_options_expected);
        });

        it("should return local storage options if present", () => {
            const local_storage_options = JSON.parse(JSON.stringify(default_options_expected));
            local_storage_options.show_release_notes = !local_storage_options.show_release_notes;
            mockBrowser.storage.local.get
                .expect(OPTIONS_STORAGE_KEY)
                .andResolve({ [OPTIONS_STORAGE_KEY]: local_storage_options });

            return expect(options()).resolves.toEqual(local_storage_options);
        });
    });

    describe("options setter", () => {
        it("should do nothing if there are no changes", () => {
            mockBrowser.storage.local.get.expect(OPTIONS_STORAGE_KEY).andResolve({
                [OPTIONS_STORAGE_KEY]: default_options_expected,
            });

            return save_options(default_options_expected);
        });

        it("should send a message if there are changes", () => {
            const altered_options = JSON.parse(JSON.stringify(default_options_expected));
            altered_options.show_release_notes = !default_options_expected.show_release_notes;

            mockBrowser.storage.local.get.expect(OPTIONS_STORAGE_KEY).andResolve({
                [OPTIONS_STORAGE_KEY]: default_options_expected,
            });

            mockBrowser.storage.local.set
                .expect({ [OPTIONS_STORAGE_KEY]: altered_options })
                .andResolve();

            mockBrowser.runtime.sendMessage.expect({ kind: "options-change" });

            return save_options(altered_options);
        });
    });
});
