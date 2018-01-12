(function()
{
    /// Imported from other modules.
    let bookmarks, events, storage;

    /// True iff the extension's privacy context setting is set to private.
    let do_limit_to_private_context = false;

    /// The button's title when enabled.
    const TITLE_WHEN_ENABLED = (
        browser.i18n.getMessage("extension_name") +
        " (Alt+Shift+8)"
    );
    /// The button's title when disabled.
    const TITLE_WHEN_DISABLED = (
        browser.i18n.getMessage("extension_name") +
        ` (${browser.i18n.getMessage("requirement_private_context")})`
    );

    /// Enables the browser action in the specified tab.
    function enable_in_tab(id)
    {
        browser.browserAction.setTitle({
            title: TITLE_WHEN_ENABLED,
            tabId: id
        });
        browser.browserAction.enable(id);
    }
    /// Disables the browser action in the specified tab.
    function disable_in_tab(id)
    {
        browser.browserAction.setTitle({
            title: TITLE_WHEN_DISABLED,
            tabId: id
        });
        browser.browserAction.disable(id);
    }

    /// Enables/disables the browser action in the specified tab based on the extension's privacy
    /// context setting.
    function update_in_tab(tab)
    {
        if (do_limit_to_private_context && !tab.incognito)
        {
            disable_in_tab(tab.id);
        }
        else { enable_in_tab(tab.id); }
    }
    /// Enables/disables the browser action in the current tab based on the extension's privacy
    /// context.
    async function update_in_active_tabs()
    {
        (await browser.tabs.query({ active: true })).forEach(tab =>
        {
            update_in_tab(tab);
        });
    }
    /// Enables/disables the browser action in a newly activated tab based on the extension's
    /// privacy context setting.
    browser.tabs.onActivated.addListener(async activation_info =>
    {
        update_in_tab(await browser.tabs.get(activation_info.tabId));
    });
    /// Enables/disables the browser action in a newly updated tab based on the extension's
    /// privacy context setting.
    browser.tabs.onUpdated.addListener((id, change_info, tab) =>
    {
        if (tab.active && change_info.url) { update_in_tab(tab); }
    });

    /// Updates the action's icon based on the current locked/unlocked state.
    function update_icon()
    {
        const icon = bookmarks.is_unlocked() ? "unlocked-bookmarks.svg" :
                                               "locked-bookmarks.svg";
        const path = `/icons/main/${icon}`;
        browser.browserAction.setIcon({
            path:
            {
                "16":  path,
                "32":  path,
                "48":  path,
                "64":  path,
                "96":  path,
                "128": path,
                "256": path
            }
        });
    }

    /// The "busy" badge is displayed at least this amount of time (in milliseconds).
    const MINIMUM_BUSY_BADGE_DISPLAY_DURATION = 1000;
    /// The timeout for a "busy" badge clear.
    let badge_clear_timeout = null;
    /// Updates the action's badge based on the current busy state.
    function update_badge(busy_event)
    {
        clearTimeout(badge_clear_timeout);
        if (busy_event.type === "busy-begin")
        {
            browser.browserAction.setBadgeText({ text: "⌛" });
        }
        else
        {
            badge_clear_timeout = setTimeout(() =>
            {
                browser.browserAction.setBadgeText({ text: "" });
            }, MINIMUM_BUSY_BADGE_DISPLAY_DURATION);
        }
    }

    /// Assigned the identifier of an open menu page to delegate to (if it exists).
    let menu_tab_id = null;
    /// Clears the menu tab identifier when the tab is closed.
    browser.tabs.onRemoved.addListener(id =>
    {
        if (id === menu_tab_id) { cancel_delegation(); }
    });
    /// Focuses the open menu tab.
    async function focus_menu_tab()
    {
        const tab = await browser.tabs.get(menu_tab_id);

        await browser.tabs.update(tab.id, { active: true });
        await browser.windows.update(tab.windowId, { focused: true });
    }
    /// Instead of opening the menu in a popup, redirects to an already open tab containing the
    /// menu.
    function delegate_to(tab_id)
    {
        menu_tab_id = tab_id;
        browser.browserAction.setPopup({ popup: "" });
        browser.browserAction.onClicked.addListener(focus_menu_tab);
    }
    /// Undoes the effect of delegate_to().
    function cancel_delegation()
    {
        browser.browserAction.onClicked.removeListener(focus_menu_tab);
        browser.browserAction.setPopup({ popup: "/popup_ui/page.html" });
        menu_tab_id = null;
    }

    /// Initializes this module.
    function initialize()
    {
        events.local.add_listener(["busy-begin", "busy-end"], update_badge);
        browser.browserAction.setBadgeBackgroundColor({ color: "rgb(45, 45, 45)" });

        events.local.add_listener(["lock", "unlock"], update_icon);
        update_icon();

        events.global.add_listener("menu-open", page =>
        {
            if (page.hasOwnProperty("tab_id")) { delegate_to(page.tab_id); }
        });

        function on_context_requirement_change(new_requirements)
        {
            do_limit_to_private_context = new_requirements.do_limit_to_private_context;
            update_in_active_tabs();
        }
        events.local.add_listener(
            "context-requirement-change",
            on_context_requirement_change
        );
        storage.load(storage.Key.Configuration).then(configuration =>
        {
            on_context_requirement_change(configuration);
            localStorage.setItem(
                "theme",
                configuration.do_use_dark_theme ? "dark" : "light"
            );
        });
    }

    define(["scripts/background/bookmarks_manager",
            "scripts/utilities/events",
            "scripts/utilities/storage"],
           (bookmarks_module, events_module, storage_module) =>
           {
                bookmarks = bookmarks_module;
                events = events_module;
                storage = storage_module;

                initialize();
           });
})();
