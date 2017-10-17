(function()
{
    /// Set in define().
    let bookmarks, domanip;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        download_encrypted_data_button: null,
        download_plain_data_button: null,
    };

    /// Offers the specified URI to the user for download.
    function offer_download(uri, filename)
    {
        const a = document.createElement("a");

        a.href     = `data:text/plain;charset=utf-8,${uri}`;
        a.download = filename;

        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    /// Offers the encrypted private bookmark data for download.
    async function download_encrypted_data()
    {
        const data = (await bookmarks.load()).bookmarks;
        const uri  = encodeURIComponent(JSON.stringify(data));

        offer_download(uri, "encrypted_private_bookmarks.json");
    }
    /// Offers the plaintext private bookmark data for download.
    async function download_plain_data()
    {
        const data = (await browser.bookmarks.getSubTree(await bookmarks.get_front_id()))[0];
        const uri  = encodeURIComponent(JSON.stringify(data));

        offer_download(uri, "private_bookmarks.json");
    }

    /// Disables the plain backup button.
    function disable_plain_backup_option()
    {
        domanip.disable(DOM.download_plain_data_button);

        DOM.download_plain_data_button.title = (
            `(${browser.i18n.getMessage("disabled_due_to_locked_state")})`
        );
        DOM.download_plain_data_button.removeEventListener("click", download_plain_data);
    }
    /// Enables the plain backup button.
    function enable_plain_backup_option()
    {
        DOM.download_plain_data_button.removeAttribute("title");
        DOM.download_plain_data_button.addEventListener("click", download_plain_data);

        domanip.enable(DOM.download_plain_data_button);
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);

        DOM.download_encrypted_data_button.addEventListener("click", download_encrypted_data);

        if (await bookmarks.is_locked()) { disable_plain_backup_option(); }
        else                             { enable_plain_backup_option();  }
        browser.runtime.onMessage.addListener(message =>
        {
            if      (message.type === "lock")   { disable_plain_backup_option(); }
            else if (message.type === "unlock") { enable_plain_backup_option();  }
        });
    }

    require(["scripts/interaction/bookmarks_interface",
             "scripts/utilities/dom_manipulation"],
            (bookmarks_module, dom_module) =>
            {
                bookmarks = bookmarks_module;
                domanip = dom_module;

                initialize();
            });
})();
