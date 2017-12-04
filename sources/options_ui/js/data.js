(function()
{
    /// Imported from other modules.
    let bookmarks, domanip, messages;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        clear_data_button: null,
        data_message_container: null,
    };

    /// Enumerates possible error messages.
    const ErrorMessage =
    {
        ClearanceFailed: browser.i18n.getMessage("error_clearing_data"),
    };

    /// Prompts the user to confirm data-clearance, and does so if confirmed.
    async function clear()
    {
        const question = browser.i18n.getMessage("confirm_data_clearance_question");
        const is_confirmed = await messages.confirm(question);

        if (is_confirmed)
        {
            try { await bookmarks.clear(); }
            catch (error)
            {
                messages.error(
                    ErrorMessage.ClearanceFailed,
                    /* Debug info: */ error.message
                );
                return;
            }
            messages.success();
        }
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);
        messages = new messages.Controller(DOM.data_message_container);

        DOM.clear_data_button.addEventListener("click", clear);
    }

    require(["./messages",
             "scripts/interaction/bookmarks_interface",
             "scripts/utilities/dom_manipulation"],
            (messages_module, bookmarks_module, dom_module) =>
            {
                messages = messages_module;
                bookmarks = bookmarks_module;
                domanip = dom_module;

                initialize();
            });
})();
