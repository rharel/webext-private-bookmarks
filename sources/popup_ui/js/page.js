(function()
{
    /// Set in define().
    let CURRENT_VERSION, populate_with_elements;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        extension_version: null,
        options_button:    null
    };

    /// Initializes this module.
    function initialize()
    {
        populate_with_elements(DOM);

        {
            const {major, minor, release} = CURRENT_VERSION;
            DOM.extension_version.textContent = `${major}.${minor}.${release}`;
        }

        DOM.options_button.addEventListener("click", () => { browser.runtime.openOptionsPage(); });

        browser.runtime.sendMessage({ type: "popup-open" });
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
             "scripts/utilities/dom_manipulation"],
            (panels_controller_module, version_module, dom_module) =>
            {
                CURRENT_VERSION = version_module.CURRENT;
                populate_with_elements = dom_module.populate;

                initialize();
            });
})();
