(function()
{
    /// Imported from other modules.
    let bookmarks, events, notification, storage;

    /// Locks private bookmarks and notifies the user.
    async function lock()
    {
        if (bookmarks.is_locked()) { return; }

        await bookmarks.lock();
        notification.locked();
    }

    /// The URL of the menu page.
    const MENU_PAGE_URL = browser.runtime.getURL("/popup_ui/page.html?is_in_tab");
    /// Assigned the identifier of an open menu tab (if it exists).
    let menu_tab_id = null;
    /// Focuses an open menu tab.
    async function focus_menu_tab()
    {
        const tab = await browser.tabs.get(menu_tab_id);

        browser.tabs.update(tab.id, { active: true });
        browser.windows.update(tab.windowId, { focused: true });
    }
    /// Opens the menu panel in a tab instead of a popup.
    async function open_menu_in_new_tab()
    {
        if (menu_tab_id !== null) { focus_menu_tab(); return; }

        const options = await storage.load(storage.Key.Configuration);
        if (options.do_limit_to_private_context)
        {
            const windows = await browser.windows.getAll({ windowTypes: ["normal"] });
            const private_window_index = windows.findIndex(window => window.incognito);
            if (private_window_index === -1)
            {
                const new_window = await browser.windows.create({
                    incognito: true,
                    url: MENU_PAGE_URL
                });
                menu_tab_id = new_window.tabs[0].id;
            }
            else
            {
                const tab = await browser.tabs.create({
                    active: true,
                    url: MENU_PAGE_URL,
                    windowId: windows[private_window_index].id
                });
                menu_tab_id = tab.id;
            }
        }
        else
        {
            const tab = await browser.tabs.create({
                active: true,
                url: MENU_PAGE_URL
            });
            menu_tab_id = tab.id;
        }

        function hook()
        {
            browser.tabs.onRemoved.addListener(on_removed);
            browser.tabs.onUpdated.addListener(on_updated);
            events.local.emit("menu-tab-hooked", { id: menu_tab_id });
        }
        function unhook()
        {
            menu_tab_id = null;
            browser.tabs.onRemoved.removeListener(on_removed);
            browser.tabs.onUpdated.removeListener(on_updated);
            events.local.emit("menu-tab-unhooked");
        }
        function on_removed(id) { if (id === menu_tab_id) { unhook(); } }
        function on_updated(id, changes, new_state)
        {
            if (id === menu_tab_id &&
                changes.hasOwnProperty("url") &&
                new_state.url !== MENU_PAGE_URL)
            {
                unhook();
            }
        }
        hook();
        focus_menu_tab();
    }

    /// Handles user commands.
    async function handle_command(command)
    {
        switch (command)
        {
            case "lock":      lock();                 return;
            case "open-menu": open_menu_in_new_tab(); return;
        }
    }

    /// Initializes this module.
    function initialize()
    {
        browser.commands.onCommand.addListener(handle_command);
        events.local.add_listener("context-requirement-change", async change =>
        {
            if (change.do_limit_to_private_context &&
                menu_tab_id !== null)
            {
                const tab = await browser.tabs.get(menu_tab_id);
                if (!tab.incognito) { browser.tabs.remove(menu_tab_id); }
            }
        });
    }

    require(["scripts/background/bookmarks_manager",
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
