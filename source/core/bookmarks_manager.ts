import { debounce } from "debounce";
import { Bookmarks, browser } from "webextension-polyfill-ts";

import {
    BOOKMARKS_NODE_ID_STORAGE_KEY,
    lock_bookmarks,
    save_bookmarks,
    node_in_bookmarks,
} from "./bookmarks";
import { add_message_listener } from "./messages";
import { get_from_storage } from "./storage";

const save_bookmarks_debounced = debounce(save_bookmarks, 1000);

async function on_created(created_node_id: string, password: string) {
    const created_node = (await browser.bookmarks.get(created_node_id)).pop();
    if (created_node && (await node_in_bookmarks(created_node))) {
        await save_bookmarks_debounced(password);
    }
}

async function on_changed(changed_node_id: string, password: string) {
    const changed_node = (await browser.bookmarks.get(changed_node_id)).pop();
    if (changed_node && (await node_in_bookmarks(changed_node))) {
        await save_bookmarks_debounced(password);
    }
}

async function on_moved(old_parent_node_id: string, new_parent_node_id: string, password: string) {
    const old_parent_node = (await browser.bookmarks.get(old_parent_node_id)).pop();
    const new_parent_node = (await browser.bookmarks.get(new_parent_node_id)).pop();
    if (
        (old_parent_node && (await node_in_bookmarks(old_parent_node))) ||
        (new_parent_node && (await node_in_bookmarks(new_parent_node)))
    ) {
        await save_bookmarks_debounced(password);
    }
}

async function on_removed(
    removed_node_id: string,
    removed_node_parent_id: string,
    password: string
) {
    const bookmarks_node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (bookmarks_node_id === null) {
        return;
    } else if (bookmarks_node_id === removed_node_id) {
        await lock_bookmarks();
    } else {
        const removed_node_parent = (await browser.bookmarks.get(removed_node_parent_id)).pop();
        if (removed_node_parent && (await node_in_bookmarks(removed_node_parent))) {
            await save_bookmarks_debounced(password);
        }
    }
}

export function manage_bookmarks(): void {
    add_message_listener(message => {
        if (message.kind === "lock-status-change") {
            const on_created_proxy = (created_node_id: string) => {
                return on_created(created_node_id, message.password);
            };
            const on_changed_proxy = (changed_node_id: string) => {
                return on_changed(changed_node_id, message.password);
            };
            const on_moved_proxy = (_id: string, move_info: Bookmarks.OnMovedMoveInfoType) => {
                return on_moved(move_info.oldParentId, move_info.parentId, message.password);
            };
            const on_removed_proxy = (id: string, info: Bookmarks.OnRemovedRemoveInfoType) => {
                return on_removed(id, info.parentId, message.password);
            };
            if (message.password) {
                // Bookmarks were unlocked. Start watching.
                browser.bookmarks.onCreated.addListener(on_created_proxy);
                browser.bookmarks.onChanged.addListener(on_changed_proxy);
                browser.bookmarks.onMoved.addListener(on_moved_proxy);
                browser.bookmarks.onRemoved.addListener(on_removed_proxy);
            } else {
                // Bookmarks were locked. Stop watching.
                browser.bookmarks.onCreated.removeListener(on_created_proxy);
                browser.bookmarks.onChanged.removeListener(on_changed_proxy);
                browser.bookmarks.onMoved.removeListener(on_moved_proxy);
                browser.bookmarks.onRemoved.removeListener(on_removed_proxy);
            }
        }
    });
}
