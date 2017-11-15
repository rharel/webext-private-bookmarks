(function()
{
    /// Set in define().
    let bookmarks, domanip, security;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        import_file_input: null,
        import_password_panel: null,
        import_password_input: null,
        import_button_panel: null,
        import_button: null,
        import_status_message: null,
        import_error_message: null,
        import_error_message_bar: null
    };

    /// Enumerates possible error messages.
    const ErrorMessage =
    {
        InvalidFile:           browser.i18n.getMessage("import_error_invalid_file"),
        PlainImportFailed:     browser.i18n.getMessage("import_error_plain_import_failed"),
        EncryptedImportFailed: browser.i18n.getMessage("import_error_encrypted_import_failed")
    };
    /// Displays an error.
    function display_error(message)
    {
        DOM.import_error_message.textContent = message;
        DOM.import_error_message_bar.style.display = "block";
    }
    /// Hides the error bar.
    function hide_error_display()
    {
        DOM.import_error_message_bar.removeAttribute("title");
        DOM.import_error_message_bar.style.display = "none";
    }

    /// Disables the import button.
    function disable_import_button(reason)
    {
        domanip.disable(DOM.import_button);

        if (reason) { DOM.import_button.title = `(${reason})`; }
        DOM.import_button.removeEventListener("click", import_data);
    }
    /// Enables the import button.
    function enable_import_button()
    {
        DOM.import_button.removeAttribute("title");
        DOM.import_button.addEventListener("click", import_data);

        domanip.enable(DOM.import_button);
    }
    /// Enables/disables the import button based on the current lock state.
    async function update_import_button_availability()
    {
        if (await bookmarks.is_locked())
        {
            disable_import_button(
                browser.i18n.getMessage("disabled_due_to_locked_state")
            );
        }
        else { enable_import_button(); }
    }

    /// The index of the previous status update event.
    let previous_status_update_index = -1;
    /// Clears the import status progress and message.
    function clear_status()
    {
        DOM.import_status_message.textContent = "";
        previous_status_update_index = -1;
    }
    /// The the import progress status message based on the specified update event.
    function update_status_message(update)
    {
        if (update.index <= previous_status_update_index) { return; }

        const {current, total} = update;
        DOM.import_status_message.textContent = `${current} / ${total}`;
        previous_status_update_index = update.index;
    }

    /// Determines whether the specified object is an encrypted backup.
    function is_encrypted(data)
    {
        return data.hasOwnProperty("iv") &&
               data.hasOwnProperty("ciphertext");
    }

    /// Resets the import process.
    function reset()
    {
        DOM.import_password_input.value = "";
        DOM.import_password_panel.style.display = "none";
        DOM.import_button_panel.style.display = "none";
        DOM.import_status_message.textContent = "";
        clear_status();
        hide_error_display();
    }

    /// Assigned the JSON contents of a processed file.
    let file_contents;
    /// Examines the contents of the selected file to import.
    function process_selected_file()
    {
        const files = DOM.import_file_input.files;

        if (files.length === 0) { return; }

        const reader = new FileReader();
        reader.onerror = () => { display_error(ErrorMessage.InvalidFile); };
        reader.onload  = () =>
        {
            try           { file_contents = JSON.parse(reader.result); }
            catch (error) { display_error(ErrorMessage.InvalidFile); return; }

            DOM.import_button_panel.style.display = "block";
            if (is_encrypted(file_contents))
            {
                DOM.import_password_panel.style.display = "block";
            }
        };
        reader.readAsText(files.item(0));
    }

    /// Imports bookmarks from the decoded contents of the selected file.
    async function import_data()
    {
        hide_error_display();

        let importing;
        if (is_encrypted(file_contents))
        {
            const password        = DOM.import_password_input.value,
                  hashed_password = await security.hash(password);

            importing = bookmarks.import_encrypted_data(file_contents, hashed_password);
        }
        else { importing = bookmarks.import_plain_data(file_contents); }

        clear_status();

        disable_import_button();
        try { await importing; }
        catch (error)
        {
            DOM.import_error_message_bar.title = error.message;
            display_error(
                is_encrypted(file_contents) ?
                    ErrorMessage.EncryptedImportFailed :
                    ErrorMessage.PlainImportFailed
            );
            return;
        }
        finally { update_import_button_availability(); }

        DOM.import_password_input.value = "";
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);

        reset();
        DOM.import_file_input.addEventListener("change", () =>
        {
            reset();
            process_selected_file();
        });

        update_import_button_availability(await bookmarks.is_locked());
        browser.runtime.onMessage.addListener(message =>
        {
            if (message.type === "lock" ||
                message.type === "unlock")
            {
                update_import_button_availability();
            }
            else if (message.type === "import-status-update") { update_status_message(message); }
        });
    }

    require(["scripts/interaction/bookmarks_interface",
             "scripts/interaction/security",
             "scripts/utilities/dom_manipulation"],
            (bookmarks_module, security_module, dom_module) =>
            {
                bookmarks = bookmarks_module;
                security = security_module;
                domanip = dom_module;

                initialize();
            });
})();
