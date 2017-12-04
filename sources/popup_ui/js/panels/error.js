(function()
{
    /// Imported from other modules.
    let domanip;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        error_report_button: null
    };

    /// Invoked when this panel is activated.
    function on_activate(details)
    {
        console.log("Error panel activated.");

        if (!details) { return; }

        const {title, message} = details;

        console.error(`Title: ${title}\n` +
                      `Info: ${message}`);

        const body = `Debug info: \`${message}\``;

        DOM.error_report_button.href =
            "https://github.com/rharel/webext-private-bookmarks/issues/new" +
            `?title=${encodeURIComponent(title)}&` +
            `body=${encodeURIComponent(body)}`;
        DOM.error_report_button.title = body;
    }

    /// Initializes this module.
    function initialize() { domanip.populate(DOM); }

    define(["scripts/utilities/dom_manipulation"],
           dom_module =>
           {
               domanip = dom_module;

               initialize();

               return   {
                            ID: "error",
                            TITLE: browser.i18n.getMessage("error_title"),

                            on_activate: on_activate
                        };
           });
})();
