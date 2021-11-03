import { Bookmarks, browser } from "webextension-polyfill-ts";

import { decrypted, encrypted, random_salt } from "./crypto";
import {
    legacy_bookmarks_migration_needed,
    legacy_password_correct,
    migrate_legacy_bookmarks,
} from "./legacy";
import { send_message } from "./messages";
import { get_from_storage, set_in_storage } from "./storage";
import { extension_version, Version } from "./version";

export const BOOKMARKS_STORAGE_KEY = "bookmarks";
export const BOOKMARKS_NODE_ID_STORAGE_KEY = "bookmarks_node_id";

export interface PrivateBookmarks {
    title: string;
    parent_node_id: string;
    index_in_parent_node: number;
    salt: string;
    encrypted_child_nodes: string;
}

export interface PrunedBookmarkNode {
    kind: "bookmark";
    title: string;
    url: string;
}

export interface PrunedFolderNode {
    kind: "folder";
    title: string;
    children: PrunedNode[];
}

export interface PrunedSeparatorNode {
    kind: "separator";
}

export type PrunedNode = PrunedBookmarkNode | PrunedFolderNode | PrunedSeparatorNode;

export async function bookmarks_exist(): Promise<boolean> {
    return (await get_from_storage(BOOKMARKS_STORAGE_KEY)) !== null;
}

export async function bookmarks_locked(): Promise<boolean> {
    return (await get_from_storage(BOOKMARKS_NODE_ID_STORAGE_KEY)) === null;
}

export async function setup_bookmarks(password: string): Promise<PrivateBookmarks> {
    if (password.length === 0) {
        throw new Error("invalid password");
    }
    if (await bookmarks_exist()) {
        throw new Error("bookmarks have already been setup");
    }

    const salt = random_salt();
    const initial_bookmarks: PrivateBookmarks = {
        title: browser.i18n.getMessage("extension_name"),
        parent_node_id: "",
        index_in_parent_node: 0,
        salt,
        encrypted_child_nodes: await encrypted(JSON.stringify([]), password + salt),
    };
    await set_in_storage(BOOKMARKS_STORAGE_KEY, initial_bookmarks);
    await send_message({ kind: "bookmarks-created" });

    return initial_bookmarks;
}

export async function password_correct(password: string): Promise<boolean> {
    if (await legacy_bookmarks_migration_needed()) {
        return await legacy_password_correct(password);
    }

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);

    if (!bookmarks) {
        return false;
    }

    return (await decrypted(bookmarks.encrypted_child_nodes, password + bookmarks.salt)) !== null;
}

export async function change_password(
    current_password: string,
    new_password: string
): Promise<void> {
    if (
        (await legacy_bookmarks_migration_needed()) &&
        !(await migrate_legacy_bookmarks(current_password))
    ) {
        return;
    }

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);

    if (!bookmarks) {
        return;
    }

    const child_nodes_json = await decrypted(
        bookmarks.encrypted_child_nodes,
        current_password + bookmarks.salt
    );
    if (child_nodes_json === null) {
        return;
    }

    bookmarks.encrypted_child_nodes = await encrypted(
        child_nodes_json,
        new_password + bookmarks.salt
    );

    await set_in_storage(BOOKMARKS_STORAGE_KEY, bookmarks);
}

function pruned_node_size(node: PrunedNode): number {
    if (node.kind === "folder") {
        return 1 + node.children.map(child => pruned_node_size(child)).reduce((a, b) => a + b, 0);
    } else {
        return 1;
    }
}

async function insert_pruned_node_in_tree(
    node: PrunedNode,
    parent_node_id: string,
    index_in_parent_node: number,
    on_node_created?: () => void
): Promise<Bookmarks.BookmarkTreeNode> {
    if (on_node_created) {
        on_node_created();
    }
    if (node.kind === "bookmark") {
        return await browser.bookmarks.create({
            type: "bookmark",
            title: node.title,
            url: node.url,
            parentId: parent_node_id || undefined,
            index: parent_node_id ? index_in_parent_node : undefined,
        });
    } else if (node.kind === "folder") {
        const created_node = await browser.bookmarks.create({
            type: "folder",
            title: node.title,
            parentId: parent_node_id || undefined,
            index: parent_node_id ? index_in_parent_node : undefined,
        });
        for (let child_index = 0; child_index < node.children.length; ++child_index) {
            await insert_pruned_node_in_tree(
                node.children[child_index],
                created_node.id,
                child_index,
                on_node_created
            );
        }
        return created_node;
    } else {
        return await browser.bookmarks.create({
            type: "separator",
            parentId: parent_node_id || undefined,
            index: parent_node_id ? index_in_parent_node : undefined,
        });
    }
}

export type ProgressCallback = (current: number, total: number) => void;

export async function unlock_bookmarks(
    password: string,
    on_progress: ProgressCallback = () => {
        /* No callback by default. */
    }
): Promise<void> {
    if (!(await bookmarks_locked())) {
        return;
    }

    if (
        (await legacy_bookmarks_migration_needed()) &&
        !(await migrate_legacy_bookmarks(password))
    ) {
        return;
    }

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);

    if (!bookmarks) {
        return;
    }

    let parent_node_exists = false;
    if (bookmarks.parent_node_id) {
        try {
            const parent_node = (await browser.bookmarks.get(bookmarks.parent_node_id)).pop();
            parent_node_exists = parent_node !== undefined;
        } catch {
            parent_node_exists = false;
        }
    }

    const child_nodes_json = await decrypted(
        bookmarks.encrypted_child_nodes,
        password + bookmarks.salt
    );
    if (child_nodes_json === null) {
        return;
    }

    const pruned_node: PrunedNode = {
        kind: "folder",
        title: bookmarks.title,
        children: JSON.parse(child_nodes_json),
    };

    await send_message({ kind: "busy-status-begin" });
    let node: Bookmarks.BookmarkTreeNode;
    try {
        let nr_nodes_created = 0;
        const nr_nodes_to_create = pruned_node_size(pruned_node);
        node = await insert_pruned_node_in_tree(
            pruned_node,
            parent_node_exists ? bookmarks.parent_node_id : "",
            parent_node_exists ? bookmarks.index_in_parent_node : 0,
            () => {
                nr_nodes_created += 1;
                on_progress(nr_nodes_created, nr_nodes_to_create);
            }
        );
    } finally {
        await send_message({ kind: "busy-status-end" });
    }

    await set_in_storage(BOOKMARKS_NODE_ID_STORAGE_KEY, node.id);
    await send_message({ kind: "lock-status-change", password });
}

export async function lock_bookmarks(): Promise<void> {
    const node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (node_id === null) {
        return;
    }

    await set_in_storage(BOOKMARKS_NODE_ID_STORAGE_KEY, null);
    await send_message({ kind: "lock-status-change", password: "" });

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);
    if (!bookmarks) {
        return;
    }

    const node = (await browser.bookmarks.get(node_id)).pop();
    if (!node) {
        return;
    }

    // Remember where the node is located, and its name.
    bookmarks.title = node.title;
    bookmarks.parent_node_id = node.parentId ?? "";
    bookmarks.index_in_parent_node = node.index ?? 0;

    await set_in_storage(BOOKMARKS_STORAGE_KEY, bookmarks);
    await browser.bookmarks.removeTree(node.id);
}

export function pruned_node(node: Bookmarks.BookmarkTreeNode): PrunedNode {
    if (node.type === "bookmark") {
        return {
            kind: "bookmark",
            title: node.title,
            url: node.url ?? "",
        };
    } else if (node.type === "folder") {
        return {
            kind: "folder",
            title: node.title,
            children: node.children?.map(child => pruned_node(child)) ?? [],
        };
    } else {
        return {
            kind: "separator",
        };
    }
}

export async function save_bookmarks(password: string): Promise<void> {
    const node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (node_id === null) {
        return;
    }

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);
    if (!bookmarks) {
        return;
    }

    const node = (await browser.bookmarks.getSubTree(node_id)).pop();
    if (!node) {
        return;
    }
    const pruned_child_nodes = node.children?.map(child_node => pruned_node(child_node)) ?? [];

    bookmarks.encrypted_child_nodes = await encrypted(
        JSON.stringify(pruned_child_nodes),
        password + bookmarks.salt
    );
    await send_message({ kind: "busy-status-begin" });
    await set_in_storage(BOOKMARKS_STORAGE_KEY, bookmarks);
    await send_message({ kind: "busy-status-end" });
}

export async function node_in_bookmarks(node: Bookmarks.BookmarkTreeNode): Promise<boolean> {
    const bookmarks_node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (bookmarks_node_id === null) {
        return false;
    }

    if (bookmarks_node_id === node.id) {
        return true;
    }

    let query_node = node;
    while (query_node.parentId !== bookmarks_node_id && query_node.parentId) {
        query_node = (await browser.bookmarks.get(query_node.parentId))[0];
    }

    return query_node.parentId === bookmarks_node_id;
}

export function url_can_be_bookmarked(url: string): boolean {
    return url.startsWith("http");
}

export async function url_in_bookmarks(url: string): Promise<boolean> {
    const nodes = await browser.bookmarks.search({ url });
    for (const node of nodes) {
        if (await node_in_bookmarks(node)) {
            return true;
        }
    }
    return false;
}

export async function add_bookmark(title: string, url: string): Promise<string | null> {
    const bookmarks_node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (bookmarks_node_id) {
        const created_node = await browser.bookmarks.create({
            title,
            url,
            parentId: bookmarks_node_id,
        });
        return created_node.id;
    } else {
        return null;
    }
}

export async function clear_bookmarks(): Promise<void> {
    await lock_bookmarks();
    await set_in_storage(BOOKMARKS_STORAGE_KEY, null);
    await send_message({ kind: "bookmarks-cleared" });
}

export interface EncryptedBookmarksExport {
    kind: "encrypted";
    version: Version;
    salt: string;
    encrypted_child_nodes: string;
}

export interface PlainBookmarksExport {
    kind: "plain";
    version: Version;
    child_nodes: PrunedNode[];
}

export type BookmarksExport = EncryptedBookmarksExport | PlainBookmarksExport;

export async function encrypted_bookmarks_export(): Promise<EncryptedBookmarksExport> {
    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);
    if (!bookmarks) {
        throw new Error("no bookmarks to export");
    }

    return {
        kind: "encrypted",
        version: extension_version(),
        salt: bookmarks.salt,
        encrypted_child_nodes: bookmarks.encrypted_child_nodes,
    };
}

export async function plain_bookmarks_export(): Promise<PlainBookmarksExport> {
    const node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (node_id === null) {
        throw new Error("requires unlocked bookmarks");
    }

    const node = (await browser.bookmarks.getSubTree(node_id)).pop();
    if (!node) {
        throw new Error("requires unlocked bookmarks");
    }

    const pruned_child_nodes = node.children?.map(child_node => pruned_node(child_node)) ?? [];

    return {
        kind: "plain",
        version: extension_version(),
        child_nodes: pruned_child_nodes,
    };
}

async function import_bookmark_nodes(
    nodes: PrunedNode[],
    on_progress: ProgressCallback
): Promise<boolean> {
    const bookmarks_node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
    if (bookmarks_node_id === null) {
        return false;
    }

    const today = new Date();
    const dd = today.getDate();
    const mm = today.getMonth() + 1;
    const yyyy = today.getFullYear();

    const imported_node: PrunedNode = {
        kind: "folder",
        title: browser.i18n.getMessage("import_folder_title", [dd, mm, yyyy]),
        children: nodes,
    };

    await send_message({ kind: "busy-status-begin" });
    try {
        let nr_nodes_created = 0;
        const nr_nodes_to_create = pruned_node_size(imported_node);
        await insert_pruned_node_in_tree(imported_node, bookmarks_node_id, 0, () => {
            nr_nodes_created += 1;
            on_progress(nr_nodes_created, nr_nodes_to_create);
        });
    } finally {
        await send_message({ kind: "busy-status-end" });
    }

    return true;
}

export async function import_plain_bookmarks(
    bookmarks_export: PlainBookmarksExport,
    on_progress: ProgressCallback = () => {
        /* No callback by default. */
    }
): Promise<boolean> {
    return await import_bookmark_nodes(bookmarks_export.child_nodes, on_progress);
}

export async function import_encrypted_bookmarks(
    bookmarks_export: EncryptedBookmarksExport,
    password: string,
    on_progress: ProgressCallback = () => {
        /* No callback by default. */
    }
): Promise<boolean> {
    const child_nodes_json = await decrypted(
        bookmarks_export.encrypted_child_nodes,
        password + bookmarks_export.salt
    );
    if (child_nodes_json === null) {
        return false;
    }

    const child_nodes = JSON.parse(child_nodes_json);

    return await import_bookmark_nodes(child_nodes, on_progress);
}
