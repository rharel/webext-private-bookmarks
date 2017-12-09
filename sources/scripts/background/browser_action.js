(function()
{
    /// Imported from other modules.
    let bookmarks, configuration, events;

    /// True iff the extension's privacy context setting is set to private.
    let do_limit_to_private_context = false;

    /// The button's title when enabled.
    const TITLE_WHEN_ENABLED = browser.i18n.getMessage("extension_name");
    /// The button's title when disabled.
    const TITLE_WHEN_DISABLED = (
        browser.i18n.getMessage("extension_name") +
        ` (${browser.i18n.getMessage("disabled_due_to_invalid_privacy_context")})`
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

    /// Initializes this module.
    function initialize()
    {
        events.local.add_listener(["busy-begin", "busy-end"], update_badge);
        browser.browserAction.setBadgeBackgroundColor({ color: "rgb(45, 45, 45)" });

        events.local.add_listener(["lock", "unlock"], update_icon);
        update_icon();

        function on_context_requirement_change(new_requirements)
        {
            do_limit_to_private_context = new_requirements.do_limit_to_private_context;
            update_in_active_tabs();
        }
        events.local.add_listener(
            "context-requirement-change",
            on_context_requirement_change
        );
        configuration.load().then(on_context_requirement_change);
    }

    define(["scripts/background/bookmarks_manager",
            "scripts/meta/configuration",
            "scripts/utilities/events"],
           (bookmarks_module, configuration_module, events_module) =>
           {
                bookmarks = bookmarks_module;
                configuration = configuration_module;
                events = events_module;

                initialize();
           });
})();
