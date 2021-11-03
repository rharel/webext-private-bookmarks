import "mockzilla-webextension";

import { Crypto } from "node-webcrypto-ossl";
import { TextDecoder, TextEncoder } from "util";
import { Bookmarks, Manifest } from "webextension-polyfill-ts";

import {
    bookmarks_exist,
    bookmarks_locked,
    BOOKMARKS_NODE_ID_STORAGE_KEY,
    BOOKMARKS_STORAGE_KEY,
    change_password,
    encrypted_bookmarks_export,
    EncryptedBookmarksExport,
    import_encrypted_bookmarks,
    import_plain_bookmarks,
    lock_bookmarks,
    password_correct,
    plain_bookmarks_export,
    PlainBookmarksExport,
    PrivateBookmarks,
    PrunedBookmarkNode,
    PrunedNode,
    save_bookmarks,
    setup_bookmarks,
    unlock_bookmarks,
} from "../source/core/bookmarks";
import { decrypted, encrypted } from "../source/core/crypto";
import {
    LEGACY_BOOKMARKS_MIGRATION_DONE_KEY,
    LEGACY_BOOKMARKS_STORAGE_KEY,
} from "../source/core/legacy";
import { BusyStatusChangeMessage, LockStatusChangeMessage } from "../source/core/messages";

describe("bookmarks module", () => {
    beforeAll(() => {
        global.crypto = new Crypto();
        global.TextEncoder = TextEncoder as typeof global.TextEncoder;
        global.TextDecoder = TextDecoder as typeof global.TextDecoder;
    });

    it("should detect when bookmarks exist", async () => {
        mockBrowser.storage.local.get.expect(BOOKMARKS_STORAGE_KEY).andReject(new Error());

        expect(await bookmarks_exist()).toEqual(false);

        mockBrowser.storage.local.get
            .expect(BOOKMARKS_STORAGE_KEY)
            .andResolve({ [BOOKMARKS_STORAGE_KEY]: {} });

        expect(await bookmarks_exist()).toEqual(true);
    });

    it("should detect when bookmarks are locked", async () => {
        mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andReject(new Error());

        expect(await bookmarks_locked()).toEqual(true);

        mockBrowser.storage.local.get
            .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
            .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: "" });

        expect(await bookmarks_locked()).toEqual(false);
    });

    it("should consider passwords incorrect when there are no bookmarks", () => {
        mockBrowser.storage.local.get
            .expect(BOOKMARKS_STORAGE_KEY)
            .andResolve({ [BOOKMARKS_STORAGE_KEY]: null });

        return expect(password_correct("some password")).resolves.toEqual(false);
    });

    it("should detect when password is correct", async () => {
        const plaintext = JSON.stringify([1, "2", true, false, null, { foo: "bar" }]);
        const password = "abc123👌🧀🌯";
        const salt = "def456🐄😀";
        const ciphertext = await encrypted(plaintext, password + salt);

        mockBrowser.storage.local.get.expect(LEGACY_BOOKMARKS_MIGRATION_DONE_KEY).andResolve({
            [LEGACY_BOOKMARKS_MIGRATION_DONE_KEY]: false,
        });
        mockBrowser.storage.local.get.expect(LEGACY_BOOKMARKS_STORAGE_KEY).andResolve({
            [LEGACY_BOOKMARKS_STORAGE_KEY]: null,
        });
        mockBrowser.storage.local.get
            .expect(BOOKMARKS_STORAGE_KEY)
            .andResolve({ [BOOKMARKS_STORAGE_KEY]: { encrypted_child_nodes: ciphertext, salt } });

        expect(await password_correct(password)).toEqual(true);
        expect(await password_correct(`wrong ${password}`)).toEqual(false);
    });

    it("should allow changing passwords", async () => {
        const plaintext = JSON.stringify([1, "2", true, false, null, { foo: "bar" }]);
        const password = "some password";
        const new_password = "some new password";
        const salt = "some salt";
        const ciphertext = await encrypted(plaintext, password + salt);

        mockBrowser.storage.local.get.expect(LEGACY_BOOKMARKS_MIGRATION_DONE_KEY).andResolve({
            [LEGACY_BOOKMARKS_MIGRATION_DONE_KEY]: false,
        });
        mockBrowser.storage.local.get.expect(LEGACY_BOOKMARKS_STORAGE_KEY).andResolve({
            [LEGACY_BOOKMARKS_STORAGE_KEY]: null,
        });

        mockBrowser.storage.local.get
            .expect(BOOKMARKS_STORAGE_KEY)
            .andResolve({ [BOOKMARKS_STORAGE_KEY]: { encrypted_child_nodes: ciphertext, salt } });

        mockBrowser.storage.local.set.spy(async items => {
            const new_ciphertext = items[BOOKMARKS_STORAGE_KEY].encrypted_child_nodes;
            expect(await decrypted(new_ciphertext, new_password + salt)).toEqual(plaintext);
        });

        await change_password(password, new_password);
    });

    it("should do nothing if changing passwords when there are no bookmarks", () => {
        mockBrowser.storage.local.get
            .expect(BOOKMARKS_STORAGE_KEY)
            .andResolve({ [BOOKMARKS_STORAGE_KEY]: null });

        return change_password("some password", "some new password");
    });

    describe("bookmarks setup", () => {
        const password = "some password";

        it("should reject invalid passwords", () => {
            return expect(setup_bookmarks("")).rejects.toThrowError("invalid password");
        });

        it("should reject if bookmarks have already been setup", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: {} });

            return expect(setup_bookmarks(password)).rejects.toThrowError(
                "bookmarks have already been setup"
            );
        });

        it("should setup bookmarks in storage", async () => {
            mockBrowser.i18n.getMessage.expect("extension_name").andReturn("Private Bookmarks");
            mockBrowser.storage.local.set.expect.andResolve();
            mockBrowser.runtime.sendMessage.expect({ kind: "bookmarks-created" });

            const bookmarks = await setup_bookmarks(password);
            const child_nodes = JSON.parse(
                (await decrypted(
                    bookmarks.encrypted_child_nodes,
                    password + bookmarks.salt
                )) as string
            );

            expect(mockBrowser.storage.local.set.getMockCalls()[0]).toEqual([
                { [BOOKMARKS_STORAGE_KEY]: bookmarks },
            ]);
            expect(bookmarks.title).toEqual("Private Bookmarks");
            expect(bookmarks.parent_node_id).toEqual("");
            expect(bookmarks.index_in_parent_node).toEqual(0);
            expect(bookmarks.salt).not.toEqual("");
            expect(child_nodes).toEqual([]);
        });
    });

    describe("unlocking bookmarks", () => {
        const password = "some password";
        const pruned_child_nodes: PrunedNode[] = [
            {
                kind: "bookmark",
                title: "some bookmark",
                url: "some url",
            },
            {
                kind: "folder",
                title: "some bookmark folder",
                children: [
                    {
                        kind: "bookmark",
                        title: "some child",
                        url: "some child url",
                    },
                    {
                        kind: "separator",
                    },
                ],
            },
        ];
        const plaintext = JSON.stringify(pruned_child_nodes);

        it("should do nothing if bookmarks are already unlocked", () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: "some node id",
            });

            return unlock_bookmarks(password);
        });

        it("should do nothing if password is incorrect", async () => {
            const private_bookmarks: PrivateBookmarks = {
                title: "some title",
                parent_node_id: "some parent node id",
                index_in_parent_node: 123,
                salt: "some salt",
                encrypted_child_nodes: await encrypted(plaintext, password),
            };
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: null,
            });
            mockBrowser.storage.local.get.expect(BOOKMARKS_STORAGE_KEY).andResolve({
                [BOOKMARKS_STORAGE_KEY]: private_bookmarks,
            });

            await unlock_bookmarks(`wrong ${password}`);
        });

        it("should do nothing if there are no bookmarks", () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: null,
            });
            mockBrowser.storage.local.get.expect(BOOKMARKS_STORAGE_KEY).andResolve({
                [BOOKMARKS_STORAGE_KEY]: null,
            });

            return unlock_bookmarks(password);
        });

        describe("adding bookmarks to the tree", () => {
            const created_node_id = "some node id";
            const private_bookmarks: PrivateBookmarks = {
                title: "some title",
                parent_node_id: "some parent node id",
                index_in_parent_node: 123,
                salt: "some salt",
                encrypted_child_nodes: "",
            };

            function expect_bookmark_creation(
                parent_node_id?: string,
                index_in_parent_node?: number
            ) {
                mockBrowser.bookmarks.create
                    .expect({
                        type: "folder",
                        title: private_bookmarks.title,
                        parentId: parent_node_id,
                        index: index_in_parent_node,
                    })
                    .andResolve({ id: created_node_id, title: private_bookmarks.title });
                mockBrowser.bookmarks.create.expect({
                    type: "bookmark",
                    title: "some bookmark",
                    url: "some url",
                    parentId: created_node_id,
                    index: 0,
                });
                mockBrowser.bookmarks.create
                    .expect({
                        type: "folder",
                        title: "some bookmark folder",
                        parentId: created_node_id,
                        index: 1,
                    })
                    .andResolve({ id: created_node_id + 1, title: "some bookmark folder" });
                mockBrowser.bookmarks.create.expect({
                    type: "bookmark",
                    title: "some child",
                    url: "some child url",
                    parentId: created_node_id + 1,
                    index: 0,
                });
                mockBrowser.bookmarks.create.expect({
                    type: "separator",
                    parentId: created_node_id + 1,
                    index: 1,
                });
            }

            beforeEach(async () => {
                private_bookmarks.encrypted_child_nodes = await encrypted(
                    plaintext,
                    password + private_bookmarks.salt
                );
                mockBrowser.storage.local.get
                    .expect(LEGACY_BOOKMARKS_MIGRATION_DONE_KEY)
                    .andResolve({
                        [LEGACY_BOOKMARKS_MIGRATION_DONE_KEY]: false,
                    });
                mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                    [BOOKMARKS_NODE_ID_STORAGE_KEY]: null,
                });
                mockBrowser.storage.local.get.expect(BOOKMARKS_STORAGE_KEY).andResolve({
                    [BOOKMARKS_STORAGE_KEY]: private_bookmarks,
                });

                mockBrowser.storage.local.set.expect({
                    [BOOKMARKS_NODE_ID_STORAGE_KEY]: created_node_id,
                });
                mockBrowser.runtime.sendMessage.expect({
                    kind: "busy-status-begin",
                } as BusyStatusChangeMessage);
                mockBrowser.runtime.sendMessage.expect({
                    kind: "busy-status-end",
                } as BusyStatusChangeMessage);
                mockBrowser.runtime.sendMessage.expect({
                    kind: "lock-status-change",
                    password,
                } as LockStatusChangeMessage);
            });

            it("should create bookmarks under requested parent", async () => {
                mockBrowser.bookmarks.get.expect(private_bookmarks.parent_node_id).andResolve([
                    {
                        id: private_bookmarks.parent_node_id,
                        title: "some parent node title",
                    },
                ]);
                expect_bookmark_creation(
                    private_bookmarks.parent_node_id,
                    private_bookmarks.index_in_parent_node
                );

                await unlock_bookmarks(password);
            });

            it("should create bookmarks under default parent if requested parent doesn't exist", async () => {
                mockBrowser.bookmarks.get.expect(private_bookmarks.parent_node_id).andResolve([]);
                expect_bookmark_creation();

                await unlock_bookmarks(password);
            });
        });
    });

    describe("locking bookmarks", () => {
        const node_id = "some node id";
        const bookmarks: PrivateBookmarks = {
            title: "some title",
            parent_node_id: "some parent node id",
            index_in_parent_node: 123,
            salt: "some salt",
            encrypted_child_nodes: "some data",
        };

        it("should do nothing if bookmarks are already locked", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: null });

            return lock_bookmarks();
        });

        it("should do nothing if there are no bookmarks", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node_id });
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: null });
            mockBrowser.storage.local.set.expect({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: null });
            mockBrowser.runtime.sendMessage.expect({
                kind: "lock-status-change",
                password: "",
            } as LockStatusChangeMessage);

            return lock_bookmarks();
        });

        it("should do nothing if bookmarks node doesn't exist", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node_id });
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: bookmarks });
            mockBrowser.storage.local.set.expect({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: null });
            mockBrowser.bookmarks.get.expect(node_id).andResolve([]);
            mockBrowser.runtime.sendMessage.expect({
                kind: "lock-status-change",
                password: "",
            } as LockStatusChangeMessage);

            return lock_bookmarks();
        });

        it("should remove bookmarks from the tree", () => {
            const bookmarks_node: Bookmarks.BookmarkTreeNode = {
                id: node_id,
                title: `altered ${bookmarks.title}`,
                parentId: `altered ${bookmarks.parent_node_id}`,
                index: bookmarks.index_in_parent_node + 1,
            };
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node_id });
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: bookmarks });
            mockBrowser.storage.local.set.expect({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: null });
            mockBrowser.bookmarks.get.expect(node_id).andResolve([bookmarks_node]);
            mockBrowser.storage.local.set.expect({
                [BOOKMARKS_STORAGE_KEY]: {
                    title: bookmarks_node.title,
                    parent_node_id: bookmarks_node.parentId,
                    index_in_parent_node: bookmarks_node.index,
                    salt: bookmarks.salt,
                    encrypted_child_nodes: bookmarks.encrypted_child_nodes,
                } as PrivateBookmarks,
            });
            mockBrowser.bookmarks.removeTree.expect(node_id);
            mockBrowser.runtime.sendMessage.expect({
                kind: "lock-status-change",
                password: "",
            } as LockStatusChangeMessage);

            return lock_bookmarks();
        });
    });

    describe("saving bookmarks", () => {
        const password = "some password";
        const node_id = "some node id";

        it("should do nothing if bookmarks are locked", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: null });

            return save_bookmarks(password);
        });

        it("should do nothing if there are no bookmarks", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node_id });
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: null });

            return save_bookmarks(password);
        });

        it("should save pruned bookmarks", () => {
            const bookmarks: PrivateBookmarks = {
                title: "some title",
                parent_node_id: "some parent node id",
                index_in_parent_node: 123,
                salt: "some salt",
                encrypted_child_nodes: "some data",
            };
            const child_nodes: Bookmarks.BookmarkTreeNode[] = [
                {
                    id: "A",
                    type: "bookmark",
                    title: "some bookmark",
                    url: "some url",
                },
                {
                    id: "B",
                    type: "folder",
                    title: "some bookmark folder",
                    children: [
                        {
                            id: "C",
                            type: "bookmark",
                            title: "some child",
                            url: "some child url",
                        },
                        {
                            id: "D",
                            type: "separator",
                            title: "",
                        },
                    ],
                },
            ];
            const pruned_child_nodes: PrunedNode[] = [
                {
                    kind: "bookmark",
                    title: child_nodes[0].title,
                    url: child_nodes[0].url as string,
                },
                {
                    kind: "folder",
                    title: child_nodes[1].title,
                    children: [
                        {
                            kind: "bookmark",
                            title: (child_nodes[1].children as Bookmarks.BookmarkTreeNode[])[0]
                                .title as string,
                            url: (child_nodes[1].children as Bookmarks.BookmarkTreeNode[])[0]
                                .url as string,
                        },
                        {
                            kind: "separator",
                        },
                    ],
                },
            ];

            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node_id });
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: bookmarks });
            mockBrowser.bookmarks.getSubTree
                .expect(node_id)
                .andResolve([{ id: node_id, title: bookmarks.title, children: child_nodes }]);
            mockBrowser.runtime.sendMessage.expect({
                kind: "busy-status-begin",
            } as BusyStatusChangeMessage);
            mockBrowser.runtime.sendMessage.expect({
                kind: "busy-status-end",
            } as BusyStatusChangeMessage);

            mockBrowser.storage.local.set.spy(async items => {
                const ciphertext = items[BOOKMARKS_STORAGE_KEY].encrypted_child_nodes;
                expect(await decrypted(ciphertext, password + bookmarks.salt)).toEqual(
                    JSON.stringify(pruned_child_nodes)
                );
            });

            return save_bookmarks(password);
        });
    });

    describe("exporting encrypted bookmarks", () => {
        it("should reject if there are no bookmarks", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: null });

            return expect(encrypted_bookmarks_export()).rejects.toThrowError(
                "no bookmarks to export"
            );
        });

        it("should export encrypted data", async () => {
            mockBrowser.runtime.getManifest
                .expect()
                .andReturn({ version: "1.2.3" } as Manifest.ManifestBase);

            const bookmarks: PrivateBookmarks = {
                title: "some title",
                parent_node_id: "parent node id",
                index_in_parent_node: 0,
                salt: "some salt",
                encrypted_child_nodes: "some encrypted data",
            };
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_STORAGE_KEY]: bookmarks });

            const bookmarks_export = await encrypted_bookmarks_export();

            expect(bookmarks_export.version).toEqual({ major: 1, minor: 2, release: 3 });
            expect(bookmarks_export.salt).toEqual(bookmarks.salt);
            expect(bookmarks.encrypted_child_nodes).toEqual(bookmarks.encrypted_child_nodes);
        });
    });

    describe("exporting plain bookmarks", () => {
        it("should reject if bookmarks are locked", () => {
            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: null });

            return expect(plain_bookmarks_export()).rejects.toThrowError(
                "requires unlocked bookmarks"
            );
        });

        it("should reject if bookmarks node cannot be found", () => {
            const node_id = "some node id";

            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node_id });

            mockBrowser.bookmarks.getSubTree.expect(node_id).andResolve([]);

            return expect(plain_bookmarks_export()).rejects.toThrowError(
                "requires unlocked bookmarks"
            );
        });

        it("should export plain data", async () => {
            mockBrowser.runtime.getManifest
                .expect()
                .andReturn({ version: "1.2.3" } as Manifest.ManifestBase);

            const node_children: Bookmarks.BookmarkTreeNode[] = [
                {
                    id: "child id 1",
                    type: "bookmark",
                    title: "child title 1",
                    url: "child url 1",
                },
                {
                    id: "child id 2",
                    type: "bookmark",
                    title: "child title 2",
                    url: "child url 2",
                },
            ];
            const node: Bookmarks.BookmarkTreeNode = {
                id: "some id",
                type: "folder",
                title: "some title",
                children: node_children,
            };

            mockBrowser.storage.local.get
                .expect(BOOKMARKS_NODE_ID_STORAGE_KEY)
                .andResolve({ [BOOKMARKS_NODE_ID_STORAGE_KEY]: node.id });

            mockBrowser.bookmarks.getSubTree.expect(node.id).andResolve([node]);

            const bookmarks_export = await plain_bookmarks_export();

            expect(bookmarks_export.version).toEqual({ major: 1, minor: 2, release: 3 });
            expect(bookmarks_export.child_nodes).toEqual([
                {
                    kind: "bookmark",
                    title: node_children[0].title,
                    url: node_children[0].url,
                },
                {
                    kind: "bookmark",
                    title: node_children[1].title,
                    url: node_children[1].url,
                },
            ] as PrunedNode[]);
        });
    });

    describe("importing encrypted bookmarks", () => {
        const password = "some password";
        const salt = "some salt";
        const child_nodes: PrunedBookmarkNode[] = [
            {
                kind: "bookmark",
                title: "node title 1",
                url: "node url 1",
            },
            {
                kind: "bookmark",
                title: "node title 2",
                url: "node url 2",
            },
        ];
        const bookmarks_node: Bookmarks.BookmarkTreeNode = {
            type: "folder",
            id: "bookmarks node id",
            title: "bookmarks node title",
            children: [],
        };

        let bookmarks_export: EncryptedBookmarksExport;

        beforeAll(async () => {
            bookmarks_export = {
                kind: "encrypted",
                version: { major: 1, minor: 2, release: 3 },
                salt,
                encrypted_child_nodes: await encrypted(
                    JSON.stringify(child_nodes),
                    password + salt
                ),
            };
        });

        it("should do nothing if password is incorrect", () => {
            return expect(
                import_encrypted_bookmarks(bookmarks_export, `wrong ${password}`)
            ).resolves.toEqual(false);
        });

        it("should do nothing if bookmarks are locked", () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: null,
            });

            return expect(import_encrypted_bookmarks(bookmarks_export, password)).resolves.toEqual(
                false
            );
        });

        it("should import bookmarks", () => {
            const import_node: Bookmarks.BookmarkTreeNode = {
                type: "folder",
                id: "import node id",
                title: "import node title",
            };

            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: bookmarks_node.id,
            });

            mockBrowser.i18n.getMessage
                .expect("import_folder_title", expect.any(Array))
                .andReturn(import_node.title);

            mockBrowser.bookmarks.create
                .expect({
                    type: "folder",
                    title: import_node.title,
                    parentId: bookmarks_node.id,
                    index: 0,
                })
                .andResolve(import_node);

            mockBrowser.bookmarks.create.expect({
                type: "bookmark",
                title: child_nodes[0].title,
                url: child_nodes[0].url,
                parentId: import_node.id,
                index: 0,
            });

            mockBrowser.bookmarks.create.expect({
                type: "bookmark",
                title: child_nodes[1].title,
                url: child_nodes[1].url,
                parentId: import_node.id,
                index: 1,
            });

            mockBrowser.runtime.sendMessage.expect({
                kind: "busy-status-begin",
            } as BusyStatusChangeMessage);
            mockBrowser.runtime.sendMessage.expect({
                kind: "busy-status-end",
            } as BusyStatusChangeMessage);

            return expect(import_encrypted_bookmarks(bookmarks_export, password)).resolves.toEqual(
                true
            );
        });
    });

    describe("importing plain bookmarks", () => {
        const child_nodes: PrunedBookmarkNode[] = [
            {
                kind: "bookmark",
                title: "node title 1",
                url: "node url 1",
            },
            {
                kind: "bookmark",
                title: "node title 2",
                url: "node url 2",
            },
        ];
        const bookmarks_node: Bookmarks.BookmarkTreeNode = {
            type: "folder",
            id: "bookmarks node id",
            title: "bookmarks node title",
            children: [],
        };

        const bookmarks_export: PlainBookmarksExport = {
            kind: "plain",
            version: { major: 1, minor: 2, release: 3 },
            child_nodes,
        };

        it("should do nothing if bookmarks are locked", () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: null,
            });

            return expect(import_plain_bookmarks(bookmarks_export)).resolves.toEqual(false);
        });

        it("should import bookmarks", () => {
            const import_node: Bookmarks.BookmarkTreeNode = {
                type: "folder",
                id: "import node id",
                title: "import node title",
            };

            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: bookmarks_node.id,
            });

            mockBrowser.i18n.getMessage
                .expect("import_folder_title", expect.any(Array))
                .andReturn(import_node.title);

            mockBrowser.bookmarks.create
                .expect({
                    type: "folder",
                    title: import_node.title,
                    parentId: bookmarks_node.id,
                    index: 0,
                })
                .andResolve(import_node);

            mockBrowser.bookmarks.create.expect({
                type: "bookmark",
                title: child_nodes[0].title,
                url: child_nodes[0].url,
                parentId: import_node.id,
                index: 0,
            });

            mockBrowser.bookmarks.create.expect({
                type: "bookmark",
                title: child_nodes[1].title,
                url: child_nodes[1].url,
                parentId: import_node.id,
                index: 1,
            });

            mockBrowser.runtime.sendMessage.expect({
                kind: "busy-status-begin",
            } as BusyStatusChangeMessage);
            mockBrowser.runtime.sendMessage.expect({
                kind: "busy-status-end",
            } as BusyStatusChangeMessage);

            return expect(import_plain_bookmarks(bookmarks_export)).resolves.toEqual(true);
        });
    });
});
