import { browser, Tabs } from "webextension-polyfill-ts";

import {
    add_bookmark,
    bookmarks_locked,
    url_can_be_bookmarked,
    url_in_bookmarks,
} from "./bookmarks";
import { add_message_listener } from "./messages";

async function update_in_tab(tab: Tabs.Tab) {
    if (tab.id === undefined) {
        return;
    } else if (
        tab.url === undefined ||
        (await bookmarks_locked()) ||
        !url_can_be_bookmarked(tab.url) ||
        (await url_in_bookmarks(tab.url))
    ) {
        await browser.pageAction.hide(tab.id);
    } else {
        await browser.pageAction.show(tab.id);
    }
}

async function update_in_active_tabs() {
    const active_tabs = await browser.tabs.query({ active: true });
    for (const active_tab of active_tabs) {
        await update_in_tab(active_tab);
    }
}

async function on_tab_activated(info: Tabs.OnActivatedActiveInfoType) {
    await update_in_tab(await browser.tabs.get(info.tabId));
}

async function on_tab_updated(
    _id: number,
    change_info: Tabs.OnUpdatedChangeInfoType,
    tab: Tabs.Tab
) {
    if (tab.active && change_info.url) {
        await update_in_tab(tab);
    }
}

export function manage_page_action(): void {
    add_message_listener(async message => {
        if (message.kind === "lock-status-change") {
            if (await bookmarks_locked()) {
                browser.bookmarks.onCreated.removeListener(update_in_active_tabs);
                browser.bookmarks.onRemoved.removeListener(update_in_active_tabs);
                browser.tabs.onActivated.removeListener(on_tab_activated);
                browser.tabs.onUpdated.removeListener(on_tab_updated);
                const tabs = await browser.tabs.query({});
                for (const tab of tabs) {
                    if (tab.id !== undefined) {
                        browser.pageAction.hide(tab.id);
                    }
                }
            } else {
                browser.bookmarks.onCreated.addListener(update_in_active_tabs);
                browser.bookmarks.onRemoved.addListener(update_in_active_tabs);
                browser.tabs.onActivated.addListener(on_tab_activated);
                browser.tabs.onUpdated.addListener(on_tab_updated);
                await update_in_active_tabs();
            }
        }
    });
    browser.pageAction.onClicked.addListener(async tab => {
        if (tab.title !== undefined && tab.url !== undefined) {
            await add_bookmark(tab.title, tab.url);
        }
    });
}
