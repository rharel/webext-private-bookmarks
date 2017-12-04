(function()
{
    /// If the extension's privacy context setting indicates Private Bookmarks should be disabled
    /// outside of private browsing, then we need to start monitoring private windows, and lock up
    /// if they are all closed. Other reasons for implicit locking include unexpected deletion of
    /// the front and suspension of the extension. This module implements this behavior.

    /// Imported from other modules.
    let configuration, core, events, storage;

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
    function update_private_window_monitoring(do_limit_to_private_context)
    {
        const onRemoved = browser.windows.onRemoved;

        if (do_limit_to_private_context &&
            !onRemoved.hasListener(lock_if_not_private))
        {
            onRemoved.addListener(lock_if_not_private);
            lock_if_not_private();
        }
        else if (!do_limit_to_private_context &&
                 onRemoved.hasListener(lock_if_not_private))
        {
            onRemoved.removeListener(lock_if_not_private);
        }
    }

    /// Locks up if the front folder is removed by the user.
    browser.bookmarks.onRemoved.addListener(id =>
    {
        if (core.is_unlocked() && id === core.get_front_id()) { core.lock(); }
    });

    // Lock up when suspended. We don't want to leave our private bookmarks out in the open.
    // FIXME: Uncomment the following line when onSuspend becomes available in Firefox:
    // browser.runtime.onSuspend.addListener(() => core.lock());
    // However, until onSuspend is available, we must resort to the following workaround:
    // When unlocking, we save the front's identifier in local storage, and remove it again when
    // locking. If on startup there is an identifier stored, we know there is are private bookmarks
    // that need to be deleted. The following implements this functionality.
    const FRONT_ID_STORAGE_KEY = "front_folder_id";
    /// Deletes the front if it exists.
    async function clean_up_after_suspension()
    {
        const front_id = await storage.load(FRONT_ID_STORAGE_KEY);

        if (front_id !== null)
        {
            try     { await browser.bookmarks.removeTree(front_id); }
            finally { storage.remove(FRONT_ID_STORAGE_KEY); }
        }
    }

    /// Initializes this module.
    function initialize()
    {
        clean_up_after_suspension();

        events.local.add_listener("unlock", () =>
        {
            storage.save(FRONT_ID_STORAGE_KEY, core.get_front_id());
        });
        events.local.add_listener("lock", () =>
        {
            storage.remove(FRONT_ID_STORAGE_KEY);
        });

        events.local.add_listener("context-requirement-change", message =>
        {
            update_private_window_monitoring(message.do_limit_to_private_context);
        });
        configuration.load().then(options =>
        {
            if (options !== null)
            {
                update_private_window_monitoring(options.do_limit_to_private_context);
            }
        });
    }

    require(["scripts/background/bookmarks_manager/core",
             "scripts/meta/configuration",
             "scripts/utilities/events",
             "scripts/utilities/local_storage"],
            (core_module, configuration_module, events_module, storage_module) =>
            {
                core = core_module;
                configuration = configuration_module;
                events = events_module;
                storage = storage_module;

                initialize();
            });
})();
