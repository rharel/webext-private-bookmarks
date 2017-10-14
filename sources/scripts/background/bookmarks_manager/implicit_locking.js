(function()
{
    /// If the extension's privacy context setting indicates Private Bookmarks should be disabled
    /// outside of private browsing, then we need to start monitoring private windows, and lock up
    /// if they are all closed. Other reasons for implicit locking include unexpected deletion of
    /// the front and suspension of the extension. This module implements this behavior.

    /// Set in define().
    let core;

    /// Resolves to true iff there is at least one private normal/popup window open.
    async function is_private_browsing()
    {
        return (await browser.windows.getAll({ windowTypes: ["normal", "popup"] }))
               .some(window => window.incognito);
    }
    /// Locks up if there are no private windows open.
    async function lock_if_not_private()
    {
        if (core.is_unlocked() && !(await is_private_browsing())) { return core.lock(); }
    }
    /// Enables/disables window monitoring based on the specified privacy context setting.
    function update_private_window_monitoring(is_private)
    {
        const onRemoved = browser.windows.onRemoved;

        if (is_private && !onRemoved.hasListener(lock_if_not_private))
        {
            onRemoved.addListener(lock_if_not_private);
            lock_if_not_private();
        }
        else if (!is_private && onRemoved.hasListener(lock_if_not_private))
        {
            onRemoved.removeListener(lock_if_not_private);
        }
    }

    /// Lock up without syncing if the front folder is removed by the user.
    browser.bookmarks.onRemoved.addListener(id =>
    {
        if (core.is_unlocked() && id === core.get_front_id()) { core.lock_immediately(); }
    });

    // Lock up when suspended. We don't want to leave our private bookmarks out in the open.
    // FIXME: Uncomment the following line when onSuspend becomes available in Firefox:
    // browser.runtime.onSuspend.addListener(() => core.lock());

    require(["scripts/background/bookmarks_manager/core",
             "scripts/background/configuration_monitor",
             "scripts/meta/configuration"],
            (core_module, configuration_monitor_module, configuration_module) =>
            {
                core = core_module;

                configuration_monitor_module
                    .events.addListener("privacy-change", update_private_window_monitoring);
                configuration_module.load().then(options =>
                {
                    if (options !== null)
                    {
                        update_private_window_monitoring(options.general.is_private);
                    }
                });
            });
})();
