(function()
{
    /// Imported from other modules.
    let bookmarks, events, notification, storage;

    /// True iff the extension's privacy context setting is set to private.
    let do_limit_to_private_context = false;

    /// Identifiers of tabs known to show the page action.
    let host_tab_ids = {};

    /// Hides the page action in all tabs.
    function hide_in_all_tabs()
    {
        for (const id_string in host_tab_ids)
        {
            browser.pageAction.hide(parseInt(id_string));
        }
        host_tab_ids = {};
    }
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
            delete host_tab_ids[tab.id];
        }
        else
        {
            browser.pageAction.show(tab.id);
            host_tab_ids[tab.id] = true;
        }
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
        if (bookmarks.is_unlocked()) { update_in_active_tabs(); }
    }

    /// Shows/hides the page action in a recently activated tab.
    async function on_tab_activated(info)
    {
        update_in_tab(await browser.tabs.get(info.tabId));
    }
    /// Shows/hides the page action in an recently loaded tab.
    function on_tab_updated(id, change_info, tab)
    {
        if (tab.active && change_info.url) { update_in_tab(tab); }
    }
    /// Tracks closed tabs so that we don't attempt to show/hide the page action in those.
    function on_tab_removed(id) { delete host_tab_ids[id]; }

    /// Enables the page action.
    function enable()
    {
        browser.bookmarks.onRemoved.addListener(update_in_active_tabs);
        browser.tabs.onActivated.addListener(on_tab_activated);
        browser.tabs.onUpdated.addListener(on_tab_updated);
        browser.tabs.onRemoved.addListener(on_tab_removed);

        update_in_active_tabs();
    }
    /// Disables the page action.
    function disable()
    {
        browser.bookmarks.onRemoved.removeListener(update_in_active_tabs);
        browser.tabs.onActivated.removeListener(on_tab_activated);
        browser.tabs.onUpdated.removeListener(on_tab_updated);
        browser.tabs.onRemoved.removeListener(on_tab_removed);

        hide_in_all_tabs();
    }

    /// Initializes this module.
    function initialize()
    {
        events.local.add_listener("unlock", enable);
        events.local.add_listener("lock",   disable);
        events.local.add_listener(
            "context-requirement-change",
            handle_context_requirement_change
        );
        storage.load(storage.Key.Configuration).then(handle_context_requirement_change);

        /// Bookmarks the active tab's page when the action is activated.
        browser.pageAction.onClicked.addListener(bookmark_tab);
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
