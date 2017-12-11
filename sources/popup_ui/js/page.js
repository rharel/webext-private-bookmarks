(function()
{
    /// Imported from other modules.
    let domanip, events, url_query, version;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        extension_version: null,
        options_button:    null
    };

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
             "scripts/utilities/url_query"],
            (panels_controller_module, version_module,
             dom_module, events_module, url_query_module) =>
            {
                version = version_module;
                domanip = dom_module;
                events = events_module;
                url_query = url_query_module;

                domanip.when_ready(initialize);
            });
})();
