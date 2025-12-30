import mitt from "mitt";
import browser from "webextension-polyfill";

import { add_listener_safely, remove_listener_safely } from "./utilities";

export interface BookmarksCreatedMessage {
    kind: "bookmarks-created";
}

export interface BookmarksClearedMessage {
    kind: "bookmarks-cleared";
}

export interface OptionsChangeMessage {
    kind: "options-change";
}

export interface BusyStatusChangeMessage {
    kind: "busy-status-begin" | "busy-status-end";
}

export interface LockStatusChangeMessage {
    kind: "lock-status-change";
    password: string;
}

export type Message =
    | BookmarksCreatedMessage
    | BookmarksClearedMessage
    | OptionsChangeMessage
    | BusyStatusChangeMessage
    | LockStatusChangeMessage;

const emitter = mitt<{ message: Message }>();

export function add_message_listener(listener: (message: Message) => void): void {
    emitter.on("message", listener);
    add_listener_safely(browser.runtime.onMessage, listener);
}

export function remove_message_listener(listener: (message: Message) => void): void {
    emitter.off("message", listener);
    remove_listener_safely(browser.runtime.onMessage, listener);
}

export async function send_message(message: Message): Promise<void> {
    emitter.emit("message", message);
    try {
        await browser.runtime.sendMessage(message);
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            error.message === "Could not establish connection. Receiving end does not exist."
        ) {
            // We don't care about this error since we are not interested in guaranteeing a listener
            // to every message we send.
            return;
        }
        throw error;
    }
}
