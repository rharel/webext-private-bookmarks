(function()
{
    /// If the extension's privacy context setting indicates Private Bookmarks should be disabled
    /// outside of private browsing, then we need to start monitoring private windows, and lock up
    /// if they are all closed. Other reasons for implicit locking include unexpected deletion of
    /// the front and suspension of the extension. This module implements this behavior.

    /// Imported from other modules.
    let core, events, storage;

    /// Resolves to true iff there is at least one private normal/popup window open.
    async function is_private_browsing()
    {
        return (await browser.windows.getAll({ windowTypes: ["normal", "popup"] }))
               .some(window => window.incognito);
    }
    /// Locks up if there are no private windows open.
    async function lock_if_not_private()
    {
        if (!await is_private_browsing()) { return core.lock(); }
    }

    /// Indicates whether the extension is currently limited to private contexts.
    let is_limited_to_private_context = false;

    /// Begins window monitoring.
    function start_monitoring()
    {
        browser.windows.onRemoved.addListener(lock_if_not_private);
    }
    /// Ends window monitoring.
    function stop_monitoring()
    {
        browser.windows.onRemoved.removeListener(lock_if_not_private);
    }
    /// Enables/disables window monitoring based on the specified privacy context setting.
    function update_private_window_monitoring(do_limit_to_private_context)
    {
        if (do_limit_to_private_context &&
            !is_limited_to_private_context)
        {
            events.local.add_listener("unlock", start_monitoring);
            events.local.add_listener("lock", stop_monitoring);

            if (core.is_unlocked())
            {
                start_monitoring();
                lock_if_not_private();
            }

            is_limited_to_private_context = true;
        }
        else if (!do_limit_to_private_context &&
                 is_limited_to_private_context)
        {
            if (core.is_unlocked()) { stop_monitoring(); }

            events.local.remove_listener("unlock", start_monitoring);
            events.local.remove_listener("lock", stop_monitoring);

            is_limited_to_private_context = false;
        }
    }

    /// Locks up if the front folder is removed by the user.
    function lock_if_removed(id)
    {
        if (core.is_unlocked() && id === core.get_front_id()) { core.lock(); }
    }

    // Lock up when suspended. We don't want to leave our private bookmarks out in the open.
    // FIXME: Uncomment the following line when onSuspend becomes available in Firefox:
    // browser.runtime.onSuspend.addListener(() => core.lock());
    // However, until onSuspend is available, we must resort to the following workaround:
    // When unlocking, we save the front's identifier in local storage, and remove it again when
    // locking. If on startup there is an identifier stored, we know there is are private bookmarks
    // that need to be deleted. The following implements this functionality.

    /// Deletes the front if it exists.
    async function clean_up_after_suspension()
    {
        const front_id = await storage.load(storage.Key.FrontID);

        if (front_id !== null)
        {
            try
            {
                await browser.bookmarks.removeTree(front_id);
                storage.remove(storage.Key.FrontID);
            }
            catch (error) { }
        }
    }

    /// Initializes this module.
    function initialize()
    {
        clean_up_after_suspension();

        events.local.add_listener("unlock", () =>
        {
            storage.save(storage.Key.FrontID, core.get_front_id());
            browser.bookmarks.onRemoved.addListener(lock_if_removed);
        });
        events.local.add_listener("lock", () =>
        {
            storage.remove(storage.Key.FrontID);
            browser.bookmarks.onRemoved.removeListener(lock_if_removed);
        });

        events.local.add_listener("context-requirement-change", message =>
        {
            update_private_window_monitoring(message.do_limit_to_private_context);
        });
        storage.load(storage.Key.Configuration).then(options =>
        {
            update_private_window_monitoring(options.do_limit_to_private_context);
        });
    }

    require(["scripts/background/bookmarks_manager/core",
             "scripts/utilities/events",
             "scripts/utilities/storage"],
            (core_module, events_module, storage_module) =>
            {
                core = core_module;
                events = events_module;
                storage = storage_module;

                initialize();
            });
})();
