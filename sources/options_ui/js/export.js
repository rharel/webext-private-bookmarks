(function()
{
    /// Set in define().
    let bookmarks, CURRENT_VERSION, domanip, events;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        export_encrypted_data_button: null,
        export_plain_data_button: null,
    };

    /// Offers the specified URI to the user for download.
    function offer_download(uri, filename)
    {
        const a = document.createElement("a");

        a.href     = `data:application/json;charset=utf-8,${uri}`;
        a.download = filename;

        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /// Offers the encrypted private bookmark data for download.
    async function export_encrypted_data()
    {
        const data = await bookmarks.export_encrypted_data();
        const uri  = encodeURIComponent(JSON.stringify(data));

        offer_download(uri, "encrypted_private_bookmarks.json");
    }
    /// Offers the plaintext private bookmark data for download.
    async function export_plain_data()
    {
        const data = await bookmarks.export_plain_data();
        const uri  = encodeURIComponent(JSON.stringify(data));

        offer_download(uri, "private_bookmarks.json");
    }

    /// Disables the plain backup button.
    function disable_plain_export_option()
    {
        domanip.disable(DOM.export_plain_data_button);

        DOM.export_plain_data_button.title = (
            `(${browser.i18n.getMessage("disabled_due_to_locked_state")})`
        );
        DOM.export_plain_data_button.removeEventListener("click", export_plain_data);
    }
    /// Enables the plain backup button.
    function enable_plain_export_option()
    {
        DOM.export_plain_data_button.removeAttribute("title");
        DOM.export_plain_data_button.addEventListener("click", export_plain_data);

        domanip.enable(DOM.export_plain_data_button);
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);

        DOM.export_encrypted_data_button.addEventListener("click", export_encrypted_data);

        if (await bookmarks.is_locked()) { disable_plain_export_option(); }
        else                             { enable_plain_export_option();  }

        events.global.add_listener("lock",   disable_plain_export_option);
        events.global.add_listener("unlock", enable_plain_export_option);
    }

    require(["scripts/interaction/bookmarks_interface",
             "scripts/meta/version",
             "scripts/utilities/dom_manipulation",
             "scripts/utilities/events"],
            (bookmarks_module, version_module, dom_module, events_module) =>
            {
                bookmarks = bookmarks_module;
                CURRENT_VERSION = version_module.CURRENT;
                domanip = dom_module;
                events = events_module;

                initialize();
            });
})();
