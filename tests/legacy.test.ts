import "mockzilla-webextension";

import { Crypto } from "node-webcrypto-ossl";
import { TextDecoder, TextEncoder } from "util";
import { bookmarks } from "webextension-polyfill";

import { BOOKMARKS_STORAGE_KEY, PrivateBookmarks } from "../source/core/bookmarks";
import { decrypted, encrypted } from "../source/core/crypto";
import {
    decompressed_legacy,
    decrypted_legacy,
    LEGACY_BOOKMARKS_MIGRATION_DONE_KEY,
    LEGACY_BOOKMARKS_STORAGE_KEY,
    LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY,
    LEGACY_OPTIONS_STORAGE_KEY,
    LegacyBookmarks,
    LegacyNodeSpawnDetails,
    LegacyOptions,
    migrate_legacy_bookmarks,
    migrate_legacy_node_spawn_details,
    migrate_legacy_options,
} from "../source/core/legacy";
import { Options, OPTIONS_STORAGE_KEY } from "../source/core/options";
import { deep_copy } from "../source/core/utilities";

describe("legacy module", () => {
    beforeAll(() => {
        global.crypto = new Crypto();
        global.TextEncoder = TextEncoder as typeof global.TextEncoder;
        global.TextDecoder = TextDecoder as typeof global.TextDecoder;
    });

    it("should not migrate legacy options if there aren't any", () => {
        mockBrowser.storage.local.get
            .expect(LEGACY_OPTIONS_STORAGE_KEY)
            .andResolve({ [LEGACY_OPTIONS_STORAGE_KEY]: null });

        return expect(migrate_legacy_options()).resolves.toEqual(false);
    });

    describe("legacy options migration", () => {
        const version = {
            major: 1,
            minor: 2,
            release: 3,
        };
        const manifest = {
            name: "Private Bookmarks",
            manifest_version: 2,
            version: `${version.major}.${version.minor}.${version.release}`,
        };

        let legacy_options: LegacyOptions;
        let new_options: Options;

        beforeEach(() => {
            legacy_options = {
                backup_reminder: {
                    is_enabled: true,
                    interval_days: 0,
                },
                do_disable_password_requirements: true,
                do_limit_to_private_context: true,
                do_show_release_notes: true,
                do_sync_data_across_devices: true,
                do_use_dark_theme: true,
                folder_title: "",
                idle_auto_lock: {
                    is_enabled: true,
                    threshold_minutes: 0,
                },
                version: {
                    major: 0,
                    minor: 0,
                    release: 0,
                    tag: "",
                },
            };

            new_options = {
                backup_reminder_enabled: true,
                backup_reminder_interval_days: 0,
                idle_lock_enabled: true,
                idle_lock_threshold_minutes: 0,
                limit_to_private_context: true,
                show_release_notes: true,
                theme: "dark",
                version: version,
            };

            mockBrowser.runtime.getManifest.expect().andReturn(manifest).times(2);
            mockBrowser.storage.local.get.expect(LEGACY_OPTIONS_STORAGE_KEY).andResolve({
                [LEGACY_OPTIONS_STORAGE_KEY]: legacy_options,
            });
            mockBrowser.runtime.sendMessage.expect({ kind: "options-change" }).andResolve(true);
            mockBrowser.storage.local.remove.expect(LEGACY_OPTIONS_STORAGE_KEY).andResolve();
        });

        it("should migrate enabled backup reminder flag", () => {
            legacy_options.backup_reminder.is_enabled = true;
            new_options.backup_reminder_enabled = true;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate disabled backup reminder flag", () => {
            legacy_options.backup_reminder.is_enabled = false;
            new_options.backup_reminder_enabled = false;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate backup reminder interval", () => {
            legacy_options.backup_reminder.interval_days = 123;
            new_options.backup_reminder_interval_days = 123;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate enabled idle lock flag", () => {
            legacy_options.idle_auto_lock.is_enabled = true;
            new_options.idle_lock_enabled = true;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate disabled idle lock flag", () => {
            legacy_options.idle_auto_lock.is_enabled = false;
            new_options.idle_lock_enabled = false;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate idle lock interval", () => {
            legacy_options.idle_auto_lock.threshold_minutes = 123;
            new_options.idle_lock_threshold_minutes = 123;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate enabled private context limit flag", () => {
            legacy_options.do_limit_to_private_context = true;
            new_options.limit_to_private_context = true;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate disabled private context limit flag", () => {
            legacy_options.do_limit_to_private_context = false;
            new_options.limit_to_private_context = false;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate enabled release notes flag", () => {
            legacy_options.do_show_release_notes = true;
            new_options.show_release_notes = true;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate disabled release notes flag", () => {
            legacy_options.do_show_release_notes = false;
            new_options.show_release_notes = false;

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate light theme preference", () => {
            legacy_options.do_use_dark_theme = false;
            new_options.theme = "light";

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });

        it("should migrate dark theme preference", () => {
            legacy_options.do_use_dark_theme = true;
            new_options.theme = "dark";

            mockBrowser.storage.local.set
                .expect({
                    [OPTIONS_STORAGE_KEY]: new_options,
                })
                .andResolve();

            return expect(migrate_legacy_options()).resolves.toEqual(true);
        });
    });

    it("should not migrate legacy node spawn details if there aren't any", () => {
        mockBrowser.storage.local.get
            .expect(LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY)
            .andResolve({ [LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY]: null });

        return expect(migrate_legacy_node_spawn_details()).resolves.toEqual(false);
    });

    describe("legacy node spawn details migration", () => {
        const legacy_spawn_details: LegacyNodeSpawnDetails = {
            parent_id: "some id",
            index: 456,
        };

        beforeEach(() => {
            mockBrowser.storage.local.get
                .expect(LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY)
                .andResolve({ [LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY]: legacy_spawn_details });
        });

        it("should not migrate legacy node spawn details to empty bookmarks", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: null });

            return expect(migrate_legacy_node_spawn_details()).resolves.toEqual(false);
        });

        it("should migrate legacy node spawn details to existing bookmarks", () => {
            const bookmarks: PrivateBookmarks = {
                title: "Private Bookmarks",
                parent_node_id: "",
                index_in_parent_node: 0,
                salt: "",
                encrypted_child_nodes: "",
            };

            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: bookmarks });

            const bookmarks_altered = (() => {
                const result = deep_copy(bookmarks);
                result.parent_node_id = legacy_spawn_details.parent_id;
                result.index_in_parent_node = legacy_spawn_details.index;
                return result;
            })();

            mockBrowser.storage.local.set
                .expect({
                    [BOOKMARKS_STORAGE_KEY]: bookmarks_altered,
                })
                .andResolve();

            mockBrowser.storage.local.remove
                .expect(LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY)
                .andResolve();

            return expect(migrate_legacy_node_spawn_details()).resolves.toEqual(true);
        });
    });

    it("should decrypt legacy ciphertext", async () => {
        const password = "some password";
        const legacy_ciphertext_base64 = "L2iSzNwlbx5t2l1hPbujD37velSIN31TP0pRaFnWoB6LDw/haAo13A==";
        const initialization_vector_base64 = "Hyie/V1SaVHZaii/GwkOew==";
        const plaintext = await decrypted_legacy(
            initialization_vector_base64,
            legacy_ciphertext_base64,
            password
        );
        return expect(plaintext).toEqual("private_bookmarks@rharel");
    });

    const legacy_password = "qweqweqwe";
    const legacy_bookmarks: LegacyBookmarks = {
        signature: {
            iv: "some iv",
            ciphertext: "some signature ciphertext",
        },
        bookmarks: {
            iv: "CZuR+KTLAHSFz+jj07vRlw==",
            ciphertext:
                "h9RhuS0eJhw9jf/teFlSdMI1aAcv+kfighB4dajE00Gvjf3gNkKaj4FG6j7Guaf7JUF6ZW3HZyP3C2pzQ2Oimw5r7sGlyotQyUwPcNjVfgvCuvGcgfGpnQsKQXPT/PGn4l/HehuPU3rC31fH/ZZWpi2Bw+4NNa2eVh/HQRaGJtiKUcPuCcdlxTkw3QbTTqCX7fnycPEIEzEd2u5AbeHlFkjwoNL30ENVnKn7N9ori1LnmDZHgGpU1mRCZdVkAJSFVdFVMCuvUJ07ubvBNVlWHT64YF3kHJUqZfgtwl2sytJJKyw4hOBt7sE1rSMwLrRKeGwd9AjC8C1lR9ZM2GipKecP4GeIll59nIz6ikKEX6yvfoWzlm1hyPuF7Pkakfj9/X2wFu4MgPqj325Yegkv63mkI8ahbNT/DzWzvVjp7zOvvewHpsIjYE1l6UCmgvfiG2uplp9RMKFM2V53c0blncKfMWKGLKnd+2QIrtuBtZsou1RWrwKAECgktBHoowRw3/yJh9ZhoR/jk9UxjXqn5ei8Vh6T7uMiKheIJlPz7KO+aIl7H8NSji6wIKrQfXWDvB8GPrga0FXgilBpbr/7V7psol2fP4BeODPo2ds1acO5h5Ueu80TLq2QAcvStvWqb/C/2CYSZYSEcao3E9BJaMkdnSl2FbzIYbFutQtq72BeC2twW/SzLSA=",
        },
        is_compressed: true,
        is_fresh: false,
        version: {
            major: 0,
            minor: 1,
            release: 19,
            tag: "a",
        },
    };
    const legacy_bookmarks_data = {
        id: "2fjA7KZkoYCd",
        title: "Private Bookmarks",
        type: "folder",
        children: [
            {
                id: "QZ2yhTdqydHR",
                title: "Google",
                type: "bookmark",
                url: "https://www.google.com/",
                parentId: "2fjA7KZkoYCd",
            },
            {
                id: "lH3NRKTAXDlG",
                title: "YouTube",
                type: "bookmark",
                url: "https://www.youtube.com/",
                parentId: "2fjA7KZkoYCd",
            },
            {
                id: "MqV_HPRmn2_y",
                title: "Wikipedia, the free encyclopedia",
                type: "bookmark",
                url: "https://en.wikipedia.org/wiki/Main_Page",
                parentId: "2fjA7KZkoYCd",
            },
        ],
        parentId: "toolbar_____",
    };
    const legacy_bookmarks_data_migrated = [
        {
            kind: "bookmark",
            title: "Google",
            url: "https://www.google.com/",
        },
        {
            kind: "bookmark",
            title: "YouTube",
            url: "https://www.youtube.com/",
        },
        {
            kind: "bookmark",
            title: "Wikipedia, the free encyclopedia",
            url: "https://en.wikipedia.org/wiki/Main_Page",
        },
    ];

    it("should decrypt and decompress legacy ciphertext of compressed data", async () => {
        const plaintext_compressed = (await decrypted_legacy(
            legacy_bookmarks.bookmarks.iv,
            legacy_bookmarks.bookmarks.ciphertext,
            legacy_password
        )) as string;
        const plaintext = decompressed_legacy(plaintext_compressed);

        return expect(plaintext).toEqual(JSON.stringify(legacy_bookmarks_data));
    });

    it("should not migrate legacy bookmarks if there aren't any", () => {
        mockBrowser.storage.local.get
            .expect(LEGACY_BOOKMARKS_STORAGE_KEY)
            .andResolve({ [LEGACY_BOOKMARKS_STORAGE_KEY]: null });

        return expect(migrate_legacy_bookmarks("some password")).resolves.toEqual(false);
    });

    it("should migrate legacy bookmarks", async () => {
        const salt = "some salt";

        mockBrowser.storage.local.get.expect(LEGACY_BOOKMARKS_STORAGE_KEY).andResolve({
            [LEGACY_BOOKMARKS_STORAGE_KEY]: legacy_bookmarks,
        });

        const bookmarks: PrivateBookmarks = {
            title: "Private Bookmarks",
            parent_node_id: "",
            index_in_parent_node: 0,
            salt,
            encrypted_child_nodes: "some ciphertext",
        };

        mockBrowser.storage.local.get.expect(BOOKMARKS_STORAGE_KEY).andResolve({
            [BOOKMARKS_STORAGE_KEY]: bookmarks,
        });

        mockBrowser.storage.local.set.spy(async items => {
            const new_ciphertext = items[BOOKMARKS_STORAGE_KEY].encrypted_child_nodes;
            expect(await decrypted(new_ciphertext, legacy_password + bookmarks.salt)).toEqual(
                JSON.stringify(legacy_bookmarks_data_migrated)
            );
        });

        mockBrowser.storage.local.set
            .expect({
                [LEGACY_BOOKMARKS_MIGRATION_DONE_KEY]: true,
            })
            .andResolve();

        return expect(await migrate_legacy_bookmarks(legacy_password)).toEqual(true);
    });
});
