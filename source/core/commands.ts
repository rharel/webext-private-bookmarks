import { browser, Tabs } from "webextension-polyfill-ts";

import { add_bookmark, lock_bookmarks, url_can_be_bookmarked, url_in_bookmarks } from "./bookmarks";
import { options } from "./options";

export const MAIN_PAGE_LOCAL_URL = "/main_ui/main_page.html";

function main_page_url(): string {
    return browser.runtime.getURL(MAIN_PAGE_LOCAL_URL);
}

async function focus_tab(tab: Tabs.Tab): Promise<void> {
    await browser.tabs.update(tab.id, { active: true });
    if (tab.windowId !== undefined) {
        await browser.windows.update(tab.windowId, { focused: true });
    }
}

async function open_main_page_in_new_tab() {
    let main_page_tab;

    if ((await options()).limit_to_private_context) {
        const windows = await browser.windows.getAll({
            windowTypes: ["normal"],
        });
        const private_window = windows.find(window => window.incognito);
        if (private_window === undefined) {
            const new_private_window = await browser.windows.create({
                incognito: true,
                url: main_page_url(),
            });
            main_page_tab = (new_private_window.tabs as Tabs.Tab[])[0];
        } else {
            main_page_tab = await browser.tabs.create({
                active: true,
                url: main_page_url(),
                windowId: private_window.id,
            });
        }
    } else {
        main_page_tab = await browser.tabs.create({
            active: true,
            url: main_page_url(),
        });
    }

    await focus_tab(main_page_tab);
}

export async function show_main_page_in_tab(): Promise<void> {
    const main_page_tabs = await browser.tabs.query({ url: main_page_url() });
    if (main_page_tabs.length > 0) {
        await focus_tab(main_page_tabs[0]);
    } else {
        await open_main_page_in_new_tab();
    }
}

async function bookmark_current_tab() {
    const current_tabs = await browser.tabs.query({ currentWindow: true, active: true });
    for (const tab of current_tabs) {
        if (tab.title !== undefined && tab.url !== undefined) {
            await add_bookmark(tab.title, tab.url);
        }
    }
}

async function bookmark_all_in_current_window() {
    for (const tab of await browser.tabs.query({ currentWindow: true })) {
        if (tab.url && url_can_be_bookmarked(tab.url) && !(await url_in_bookmarks(tab.url))) {
            await add_bookmark(tab.title ?? "Untitled", tab.url);
        }
    }
}

export function manage_commands(): void {
    browser.commands.onCommand.addListener(command => {
        if (command === "bookmark-page") {
            bookmark_current_tab();
        } else if (command === "open-menu") {
            show_main_page_in_tab();
        } else if (command === "lock") {
            lock_bookmarks();
        } else if (command === "bookmark-all") {
            bookmark_all_in_current_window();
        }
    });
}
