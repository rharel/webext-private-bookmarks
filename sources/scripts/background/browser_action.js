(function()
{
    /// Set in define().
    let bookmarks;

    /// True iff the extension's privacy context setting is set to private.
    let do_limit_to_private_context = false;

    /// Enables the browser action in the specified tab.
    function enable_in_tab(id)
    {
        browser.browserAction.setTitle({
            title: browser.i18n.getMessage("extension_name"),
            tabId: id
        });
        browser.browserAction.enable(id);
    }
    /// Disables the browser action in the specified tab for the specified reason.
    function disable_in_tab(id, reason)
    {
        browser.browserAction.setTitle({
            title: `${browser.i18n.getMessage("extension_name")} (${reason})`,
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
            disable_in_tab(tab.id,
                           browser.i18n.getMessage("disabled_due_to_invalid_privacy_context"));
        }
        else { enable_in_tab(tab.id); }
    }
    /// Enables/disables the browser action in the current tab based on the extension's privacy
    /// context.
    async function update_in_active_tabs()
    {
        (await browser.tabs.query({ active: true })).forEach(update_in_tab);
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
        const path = `icons/main/${icon}`;
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
    function update_badge(is_busy)
    {
        clearTimeout(badge_clear_timeout);
        if (is_busy)
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

    /// Listen to changes in privacy context requirements.
    browser.runtime.onMessage.addListener(message =>
    {
        if (message.type !== "context-requirement-change") { return; }

        do_limit_to_private_context = message.do_limit_to_private_context;
        update_in_active_tabs();
    });

    define(["scripts/background/bookmarks_manager",
            "scripts/meta/configuration"],
           (bookmarks_module, configuration) =>
           {
                bookmarks = bookmarks_module;

                bookmarks.events.addListener("busy", update_badge);
                browser.browserAction.setBadgeBackgroundColor({ color: "rgb(45, 45, 45)" });

                bookmarks.events.addListener("lock",   update_icon);
                bookmarks.events.addListener("unlock", update_icon);
                update_icon();

                configuration.load().then(options =>
                {
                    if (options !== null)
                    {
                        do_limit_to_private_context = options.do_limit_to_private_context;
                        update_in_active_tabs();
                    }
                });
           });
})();
