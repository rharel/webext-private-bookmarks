(function()
{
    /// Imported from other modules.
    let domanip, events, version;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        extension_version: null,
        options_button:    null
    };

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        DOM.extension_version.textContent = version.format(
            /* include minor:    */ true,
            /* include release:  */ true,
            /* include tag:      */ true,
            /* include revision: */ false
        );
        DOM.options_button.addEventListener("click", () => { browser.runtime.openOptionsPage(); });

        events.global.emit("popup-open");
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
             "scripts/utilities/events"],
            (panels_controller_module, version_module,
             dom_module, events_module) =>
            {
                version = version_module;
                domanip = dom_module;
                events = events_module;

                domanip.when_ready(initialize);
            });
})();
