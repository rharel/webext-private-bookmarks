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
        DOM.import_button.removeEventListener("click", import_selected_files);
    }
    /// Enables the import button.
    function enable_import_button()
    {
        DOM.import_button.removeAttribute("title");
        DOM.import_button.addEventListener("click", import_selected_files);

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

    /// Assigned the JSON contents of the selected files.
    let file_contents = [];
    /// True if at least one selected file appears to be encrypted.
    let requires_password = false;

    /// Resets the import process.
    function reset()
    {
        file_contents = [];
        requires_password = false;

        DOM.import_password_input.value = "";
        DOM.import_password_panel.style.display = "none";
        DOM.import_button_panel.style.display = "none";
        DOM.import_status_message.textContent = "";

        clear_status();
        hide_error_display();
    }

    /// Examines the contents of the selected files to import.
    async function process_selected_files()
    {
        const files = DOM.import_file_input.files;

        if (files.length === 0) { return; }

        for (let i = 0; i < files.length; ++i)
        {
            try
            {
                file_contents.push(await process_selected_file(files.item(i)));
            }
            catch { return; }
        }
        requires_password = file_contents.some(data => is_encrypted(data));

        DOM.import_button_panel.style.display = "block";
        if (requires_password)
        {
            DOM.import_password_panel.style.display = "block";
        }
    }
    /// Reads the contents of the selected file to import.
    function process_selected_file(file)
    {
        return new Promise((resolve, reject) =>
        {
            const reader = new FileReader();
            reader.onerror = () =>
            {
                const error_message = `${file.name}: ${ErrorMessage.InvalidFile}`;
                display_error(error_message);
                reject(error_message);
            };
            reader.onload = () =>
            {
                try { resolve(JSON.parse(reader.result)); }
                catch (error)
                {
                    const error_message = `${file.name}: ${ErrorMessage.InvalidFile}`;
                    display_error(error_message);
                    reject(error_message);
                }
            };
            reader.readAsText(file);
        });
    }

    /// Imports bookmarks from the decoded contents of the selected files.
    async function import_selected_files()
    {
        hide_error_display();
        disable_import_button();

        let key = null;
        if (requires_password)
        {
            const password = DOM.import_password_input.value;
            key = await security.hash(password);
        }
        for (let i = 0; i < file_contents.length; ++i)
        {
            const data = file_contents[i];

            clear_status();
            try
            {
                if (is_encrypted(data))
                {
                    await bookmarks.import_encrypted_data(data, key);
                }
                else { await bookmarks.import_plain_data(data); }
            }
            catch (error)
            {
                DOM.import_error_message_bar.title = error.message;
                display_error(
                    `${DOM.import_file_input.files.item(i).name}: ` +
                    `${is_encrypted(data) ? 
                        ErrorMessage.EncryptedImportFailed :
                        ErrorMessage.PlainImportFailed}`
                );
                break;
            }
        }
        DOM.import_password_input.value = "";
        update_import_button_availability();
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        reset();
        DOM.import_file_input.addEventListener("change", () =>
        {
            reset();
            process_selected_files();
        });

        update_import_button_availability();
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
