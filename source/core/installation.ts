import browser from "webextension-polyfill";

import { options } from "./options";
import { get_from_storage, set_in_storage } from "./storage";
import { release_notes_url } from "./version";

const SHOW_RELEASE_NOTES = true;
const SHOW_RELEASE_NOTES_STORAGE_KEY = "show_release_notes";

export async function maybe_show_release_notes(): Promise<boolean> {
    const { show_release_notes } = await options();
    if (show_release_notes && (await get_from_storage<boolean>(SHOW_RELEASE_NOTES_STORAGE_KEY))) {
        console.log("Opening release notes.");
        await set_in_storage(SHOW_RELEASE_NOTES_STORAGE_KEY, false);
        await browser.tabs.create({ url: release_notes_url() });
        return true;
    } else {
        return false;
    }
}

export async function manage_installation(): Promise<void> {
    if ((await get_from_storage<boolean>(SHOW_RELEASE_NOTES_STORAGE_KEY)) === null) {
        await set_in_storage(SHOW_RELEASE_NOTES_STORAGE_KEY, SHOW_RELEASE_NOTES);
    }
    browser.runtime.onInstalled.addListener(async details => {
        if (details.reason === "install" || details.reason === "update") {
            console.log(`Extension ${details.reason === "install" ? "installed" : "updated"}.`);
            await set_in_storage(SHOW_RELEASE_NOTES_STORAGE_KEY, SHOW_RELEASE_NOTES);
        }
    });
}
