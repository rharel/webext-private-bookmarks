jest.mock("debounce", () => ({
    debounce(callback: unknown) {
        return callback;
    },
}));

const save_bookmarks = jest.fn();
const lock_bookmarks = jest.fn();
const node_in_bookmarks = jest.fn();
jest.mock("../source/core/bookmarks", () => ({
    BOOKMARKS_NODE_ID_STORAGE_KEY: "bookmarks_node_id",
    save_bookmarks,
    lock_bookmarks,
    node_in_bookmarks,
}));

import { mockEvent } from "mockzilla-webextension";
import { Bookmarks } from "webextension-polyfill-ts";

import { BOOKMARKS_NODE_ID_STORAGE_KEY } from "../source/core/bookmarks";
import { manage_bookmarks } from "../source/core/bookmarks_manager";
import { LockStatusChangeMessage } from "../source/core/messages";
import { sleep } from "../source/core/utilities";

describe("bookmarks watcher module", () => {
    const bookmarks_node: Bookmarks.BookmarkTreeNode = {
        id: "bookmarks node id",
        parentId: "bookmarks node parent id",
        title: "Private Bookmarks",
    };
    const inside_node: Bookmarks.BookmarkTreeNode = {
        id: "some id",
        parentId: bookmarks_node.id,
        title: "some title",
        url: "some url",
    };
    const outside_node_parent: Bookmarks.BookmarkTreeNode = {
        id: "some parent id",
        parentId: undefined,
        title: "some parent title",
    };
    const outside_node: Bookmarks.BookmarkTreeNode = {
        id: "some id",
        parentId: outside_node_parent.id,
        title: "some title",
        url: "some url",
    };
    const password = "some password";

    describe("when unlocked", () => {
        const on_message = mockEvent(mockBrowser.runtime.onMessage);
        const on_created = mockEvent(mockBrowser.bookmarks.onCreated);
        const on_changed = mockEvent(mockBrowser.bookmarks.onChanged);
        const on_moved = mockEvent(mockBrowser.bookmarks.onMoved);
        const on_removed = mockEvent(mockBrowser.bookmarks.onRemoved);

        beforeAll(async () => {
            await manage_bookmarks();

            on_message.emit(
                { kind: "lock-status-change", password } as LockStatusChangeMessage,
                {}
            );

            expect(on_created.hasListeners()).toEqual(true);
            expect(on_changed.hasListeners()).toEqual(true);
            expect(on_moved.hasListeners()).toEqual(true);
            expect(on_removed.hasListeners()).toEqual(true);
        });

        beforeEach(() => {
            node_in_bookmarks.mockImplementation(node => {
                return node === bookmarks_node || node === inside_node;
            });
        });

        afterEach(() => {
            save_bookmarks.mockReset();
            lock_bookmarks.mockReset();
            node_in_bookmarks.mockReset();
        });

        it("should trigger a save when inside node is created", async () => {
            mockBrowser.bookmarks.get.expect(inside_node.id).andResolve([inside_node]);

            on_created.emit(inside_node.id, inside_node);

            await sleep(1);

            expect(save_bookmarks).toHaveBeenCalledWith(password);
        });

        it("should not trigger a save when outside node is created", async () => {
            mockBrowser.bookmarks.get.expect(outside_node.id).andResolve([outside_node]);

            on_created.emit(outside_node.id, outside_node);

            await sleep(1);

            expect(save_bookmarks).not.toHaveBeenCalled();
        });

        it("should trigger a save when inside node is changed", async () => {
            mockBrowser.bookmarks.get.expect(inside_node.id).andResolve([inside_node]);

            on_changed.emit(inside_node.id, inside_node);

            await sleep(1);

            expect(save_bookmarks).toHaveBeenCalledWith(password);
        });

        it("should not trigger a save when outside node is changed", async () => {
            mockBrowser.bookmarks.get.expect(outside_node.id).andResolve([outside_node]);

            on_changed.emit(outside_node.id, outside_node);

            await sleep(1);

            expect(save_bookmarks).not.toHaveBeenCalled();
        });

        it("should trigger a save when inside node is moved outside", async () => {
            mockBrowser.bookmarks.get.expect(bookmarks_node.id).andResolve([bookmarks_node]);
            mockBrowser.bookmarks.get
                .expect(outside_node_parent.id)
                .andResolve([outside_node_parent]);

            on_moved.emit(outside_node.id, {
                oldParentId: bookmarks_node.id,
                oldIndex: 0,
                parentId: outside_node_parent.id,
                index: 0,
            });

            await sleep(1);

            expect(save_bookmarks).toHaveBeenCalledWith(password);
        });

        it("should trigger a save when outside node is moved inside", async () => {
            mockBrowser.bookmarks.get
                .expect(outside_node_parent.id)
                .andResolve([outside_node_parent]);
            mockBrowser.bookmarks.get.expect(bookmarks_node.id).andResolve([bookmarks_node]);

            on_moved.emit(inside_node.id, {
                oldParentId: outside_node_parent.id,
                oldIndex: 0,
                parentId: bookmarks_node.id,
                index: 0,
            });

            await sleep(1);

            expect(save_bookmarks).toHaveBeenCalledWith(password);
        });

        it("should not trigger a save when outside node is moved outside", async () => {
            mockBrowser.bookmarks.get
                .expect(outside_node_parent.id)
                .andResolve([outside_node_parent])
                .times(2);

            on_moved.emit(inside_node.id, {
                oldParentId: outside_node_parent.id,
                oldIndex: 0,
                parentId: outside_node_parent.id,
                index: 0,
            });

            await sleep(1);

            expect(save_bookmarks).not.toHaveBeenCalled();
        });

        it("should trigger a lock when root bookmarks node is removed", async () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: bookmarks_node.id,
            });

            on_removed.emit(bookmarks_node.id, {
                parentId: bookmarks_node.parentId as string,
                index: 0,
                node: bookmarks_node,
            });

            await sleep(1);

            expect(save_bookmarks).not.toHaveBeenCalled();
            expect(lock_bookmarks).toHaveBeenCalled();
        });

        it("should trigger a save when inside node is removed", async () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: bookmarks_node.id,
            });
            mockBrowser.bookmarks.get
                .expect(inside_node.parentId as string)
                .andResolve([bookmarks_node]);

            on_removed.emit(inside_node.id, {
                parentId: inside_node.parentId as string,
                index: 0,
                node: inside_node,
            });

            await sleep(1);

            expect(save_bookmarks).toHaveBeenCalledWith(password);
        });

        it("should not trigger a save when outside node is removed", async () => {
            mockBrowser.storage.local.get.expect(BOOKMARKS_NODE_ID_STORAGE_KEY).andResolve({
                [BOOKMARKS_NODE_ID_STORAGE_KEY]: bookmarks_node.id,
            });
            mockBrowser.bookmarks.get
                .expect(outside_node.parentId as string)
                .andResolve([outside_node_parent]);

            on_removed.emit(outside_node.id, {
                parentId: outside_node.parentId as string,
                index: 0,
                node: outside_node,
            });

            await sleep(1);

            expect(save_bookmarks).not.toHaveBeenCalled();
        });
    });

    it("should remove listeners when locked", async () => {
        const on_message = mockEvent(mockBrowser.runtime.onMessage);

        await manage_bookmarks();

        mockBrowser.bookmarks.onCreated.hasListener.expect.andReturn(false);
        mockBrowser.bookmarks.onChanged.hasListener.expect.andReturn(false);
        mockBrowser.bookmarks.onMoved.hasListener.expect.andReturn(false);
        mockBrowser.bookmarks.onRemoved.hasListener.expect.andReturn(false);

        mockBrowser.bookmarks.onCreated.addListener.expect;
        mockBrowser.bookmarks.onChanged.addListener.expect;
        mockBrowser.bookmarks.onMoved.addListener.expect;
        mockBrowser.bookmarks.onRemoved.addListener.expect;

        on_message.emit({ kind: "lock-status-change", password } as LockStatusChangeMessage, {});

        mockBrowser.bookmarks.onCreated.hasListener.expect.andReturn(true);
        mockBrowser.bookmarks.onChanged.hasListener.expect.andReturn(true);
        mockBrowser.bookmarks.onMoved.hasListener.expect.andReturn(true);
        mockBrowser.bookmarks.onRemoved.hasListener.expect.andReturn(true);

        mockBrowser.bookmarks.onCreated.removeListener.expect;
        mockBrowser.bookmarks.onChanged.removeListener.expect;
        mockBrowser.bookmarks.onMoved.removeListener.expect;
        mockBrowser.bookmarks.onRemoved.removeListener.expect;

        on_message.emit({ kind: "lock-status-change" } as LockStatusChangeMessage, {});
    });
});
