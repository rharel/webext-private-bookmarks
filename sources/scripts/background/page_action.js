(function()
{
    /// Set in define().
    let bookmarks, notification;

    /// True iff the extension's privacy context setting is set to private.
    let is_private;

    /// Shows/hides the page action in the specified tab.
    /// The action is visible when:
    ///     1. Its tab's context matches the extension's privacy context setting.
    ///     2. Its tab's URL is not already bookmarked privately.
    async function update_in_tab(tab)
    {
        if (bookmarks.is_locked()         ||
           (is_private && !tab.incognito) ||
            tab.url.startsWith("about:")  ||
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

    /// Bookmarks the active tab's page when the action is activated.
    browser.pageAction.onClicked.addListener(async tab =>
    {
        await bookmarks.add(tab.url, tab.title);
        update_in_active_tabs();

        notification.item_added();
    });
    /// When a bookmarks is removed we may need to update the page action's visibility.
    browser.bookmarks.onRemoved.addListener(update_in_active_tabs);

    define(["scripts/background/bookmarks_manager",
            "scripts/background/configuration_monitor",
            "scripts/meta/configuration",
            "scripts/utilities/notification"],
           (bookmarks_module, configuration_monitor_module, configuration_module,
            notification_module) =>
           {
                bookmarks = bookmarks_module;
                bookmarks.events.addListener("lock",   update_in_active_tabs);
                bookmarks.events.addListener("unlock", update_in_active_tabs);

                configuration_monitor_module
                    .events.addListener("privacy-change", value =>
                    {
                        is_private = value;
                        update_in_active_tabs();
                    });
                configuration_module.load().then(options =>
                {
                    if (options !== null)
                    {
                        is_private = options.general.is_private;
                        update_in_active_tabs();
                    }
                });

                notification = notification_module;
           });
})();
