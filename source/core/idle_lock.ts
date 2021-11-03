import { browser } from "webextension-polyfill-ts";
import { Idle } from "webextension-polyfill-ts";

import { bookmarks_locked, lock_bookmarks } from "./bookmarks";
import { add_message_listener } from "./messages";
import { options } from "./options";

async function lock_if_idle(idle_state: Idle.IdleState) {
    if (idle_state !== "active") {
        await lock_bookmarks();
    }
}

async function try_enabling_idle_lock(): Promise<boolean> {
    if (
        !(await browser.permissions.contains({ permissions: ["idle"] })) ||
        browser.idle.onStateChanged.hasListener(lock_if_idle)
    ) {
        return false;
    }

    const { idle_lock_threshold_minutes } = await options();
    browser.idle.setDetectionInterval(idle_lock_threshold_minutes * 60);
    browser.idle.onStateChanged.addListener(lock_if_idle);

    return true;
}

function disable_idle_lock() {
    if (browser.idle && browser.idle.onStateChanged.hasListener(lock_if_idle)) {
        browser.idle.onStateChanged.removeListener(lock_if_idle);
    }
}

export function manage_idle_lock(): void {
    add_message_listener(async message => {
        const { idle_lock_enabled } = await options();

        if (message.kind === "options-change") {
            if (!idle_lock_enabled) {
                disable_idle_lock();
            } else if (!(await bookmarks_locked())) {
                try_enabling_idle_lock();
            }
        } else if (message.kind === "lock-status-change") {
            if (await bookmarks_locked()) {
                disable_idle_lock();
            } else if (idle_lock_enabled) {
                await try_enabling_idle_lock();
            }
        }
    });
}
