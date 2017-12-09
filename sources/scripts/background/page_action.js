(function()
{
    /// Imported from other modules.
    let bookmarks, events, notification, storage;

    /// True iff the extension's privacy context setting is set to private.
    let do_limit_to_private_context = false;

    /// Shows/hides the page action in the specified tab.
    /// The action is visible when:
    ///     1. Its tab's context matches the extension's privacy context setting.
    ///     2. Its tab's URL is not already bookmarked privately.
    async function update_in_tab(tab)
    {
        if (bookmarks.is_locked() ||
           (do_limit_to_private_context && !tab.incognito) ||
            tab.url.startsWith("about:") ||
           (await bookmarks.contains_url(tab.url)))
        {
            browser.pageAction.hide(tab.id);
        }
        else { browser.pageAction.show(tab.id); }
    }
    /// Shows/hides the page action in active tabs.
    async function update_in_active_tabs()
    {
        (await browser.tabs.query({ active: true })).forEach(update_in_tab);
    }

    /// Bookmarks the specified tab's page.
    async function bookmark_tab(tab)
    {
        await bookmarks.add(tab.url, tab.title);
        update_in_active_tabs();

        notification.item_added();
    }

    /// Handles changes in context requirements.
    function handle_context_requirement_change(new_requirements)
    {
        do_limit_to_private_context = new_requirements.do_limit_to_private_context;
        update_in_active_tabs();
    }

    /// Initializes this module.
    function initialize()
    {
        events.local.add_listener(["lock", "unlock"], update_in_active_tabs);
        events.local.add_listener(
            "context-requirement-change",
            handle_context_requirement_change
        );
        storage.load(storage.Key.Configuration).then(handle_context_requirement_change);

        /// When a bookmark is removed we may need to update the page action's visibility.
        browser.bookmarks.onRemoved.addListener(update_in_active_tabs);

        /// Bookmarks the active tab's page when the action is activated.
        browser.pageAction.onClicked.addListener(bookmark_tab);

        /// Shows/hides the page action in a recently activated tab.
        browser.tabs.onActivated.addListener(async activation_info =>
        {
            update_in_tab(await browser.tabs.get(activation_info.tabId));
        });
        /// Shows/hides the page action in an recently loaded tab.
        browser.tabs.onUpdated.addListener((id, change_info, tab) =>
        {
            if (tab.active && change_info.url) { update_in_tab(tab); }
        });
    }

    define(["scripts/background/bookmarks_manager",
            "scripts/utilities/events",
            "scripts/utilities/notification",
            "scripts/utilities/storage"],
           (bookmarks_module, events_module, notification_module, storage_module) =>
           {
                bookmarks = bookmarks_module;
                events = events_module;
                notification = notification_module;
                storage = storage_module;

                initialize();
           });
})();
