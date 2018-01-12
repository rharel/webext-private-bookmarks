(function()
{
    /// Imported from other modules.
    let domanip, events, storage, url_query, version;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        extension_version: null,
        options_button:    null,
        theme_button:      null,
        theme_stylesheet:  null
    };

    /// Initializes the page's theme.
    async function initialize_theme()
    {
        const configuration = await storage.load(storage.Key.Configuration);
        const name = configuration.do_use_dark_theme ? "dark" : "light";
        apply_theme(name);
    }
    /// Applies the theme of the specified name.
    function apply_theme(name)
    {
        DOM.theme_stylesheet.href = `css/${name}.css`;
        localStorage.setItem("theme", name);
    }
    /// Indicates whether a dark theme is currently in use.
    function is_using_dark_theme() { return localStorage.getItem("theme") === "dark"; }
    /// Toggles between a light/dark theme.
    async function toggle_theme()
    {
        if (is_using_dark_theme()) { apply_theme("light"); }
        else                       { apply_theme("dark");  }

        const configuration = await storage.load(storage.Key.Configuration);
        configuration.do_use_dark_theme = is_using_dark_theme();
        return storage.save(storage.Key.Configuration, configuration);
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);

        DOM.extension_version.textContent = version.format(
            /* include minor:    */ true,
            /* include release:  */ true,
            /* include tag:      */ true,
            /* include revision: */ false
        );
        DOM.options_button.addEventListener("click", () => { browser.runtime.openOptionsPage(); });
        DOM.theme_button.addEventListener("click", toggle_theme);

        if (localStorage.getItem("theme") === null) { initialize_theme(); }

        const menu_open_event_properties = {};
        if (url_query.parse().is_in_tab)
        {
            const tab = await browser.tabs.getCurrent();
            menu_open_event_properties.tab_id = tab.id;
        }
        events.global.emit("menu-open", menu_open_event_properties);
    }

    require.config({
                        paths:
                        {
                            libraries: "/libraries",
                            popup:     "/popup_ui/js",
                            scripts:   "/scripts"
                        }
                   });
    require(["popup/panels/controller",
             "scripts/meta/version",
             "scripts/utilities/dom_manipulation",
             "scripts/utilities/events",
             "scripts/utilities/storage",
             "scripts/utilities/url_query"],
            (panels_controller_module, version_module, dom_module,
             events_module, storage_module, url_query_module) =>
            {
                version = version_module;
                domanip = dom_module;
                events = events_module;
                storage = storage_module;
                url_query = url_query_module;

                domanip.when_ready(initialize);
            });
})();
