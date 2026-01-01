import { lock_bookmarks } from "./bookmarks";
import { manage_bookmarks } from "./bookmarks_manager";
import { manage_browser_action } from "./browser_action";
import { manage_commands } from "./commands";
import { manage_context_lock } from "./context_lock";
import { manage_idle_lock } from "./idle_lock";
import { manage_installation } from "./installation";
import { manage_legacy_migration } from "./legacy";
import { manage_page_action } from "./page_action";

async function main() {
    console.log("Background script is running.");
    await manage_legacy_migration();
    await lock_bookmarks(); // In case they were unlocked last when browser closed.
    await manage_installation();
    await manage_browser_action();
    manage_bookmarks();
    manage_context_lock();
    manage_idle_lock();
    manage_page_action();
    manage_commands();
}

main();
