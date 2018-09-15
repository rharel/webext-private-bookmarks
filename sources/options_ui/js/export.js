(function()
{
    /// Imported from other modules.
    let bookmarks, CURRENT_VERSION, domanip, events;

    /// Prefixes the name of exported files.
    const FILENAME_PREFIX = "Private Bookmarks";
    /// Extension of exported files.
    const FILENAME_EXTENSION = "json";

    /// Enumerates exported file types.
    const ExportType =
    {
        Encrypted: "encrypted",
        Plain: "plain"
    };

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        export_encrypted_data_button: null,
        export_plain_data_button: null,
    };

    /// Composes an exported file name given its type.
    ///
    /// @param export_type
    ///     A member of the ExportType enumeration
    function compose_filename(export_type)
    {
        const today = new Date();
        const locale = browser.i18n.getUILanguage();
        return (
            `${FILENAME_PREFIX} ` +
            `[${export_type}] ` +
            `(${today.toLocaleDateString(locale)})` +
            `.${FILENAME_EXTENSION}`
        );
    }

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
        if (data === null) { return; }

        const uri = encodeURIComponent(JSON.stringify(data));
        offer_download(uri, compose_filename(ExportType.Encrypted));
    }
    /// Offers the plaintext private bookmark data for download.
    async function export_plain_data()
    {
        const data = await bookmarks.export_plain_data();
        const uri  = encodeURIComponent(JSON.stringify(data));

        offer_download(uri, compose_filename(ExportType.Plain));
    }

    /// Disables the plain backup button.
    function disable_plain_export_option()
    {
        domanip.disable(DOM.export_plain_data_button);

        DOM.export_plain_data_button.title = (
            `(${browser.i18n.getMessage("requirement_unlocked_state")})`
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

        events.global.add_listener(["lock"],   disable_plain_export_option);
        events.global.add_listener(["unlock"], enable_plain_export_option);
    }

    require(["scripts/foreground/bookmarks_interface",
             "scripts/meta/version",
             "scripts/utilities/dom_manipulation",
             "scripts/utilities/events"],
            (bookmarks_module, version_module, dom_module, events_module) =>
            {
                bookmarks = bookmarks_module;
                CURRENT_VERSION = version_module.CURRENT;
                domanip = dom_module;
                events = events_module;

                domanip.when_ready(initialize);
            });
})();
