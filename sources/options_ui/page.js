(function()
{
    /// Set in define().
    let configuration, CURRENT_VERSION, populate_with_elements;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        is_private_checkbox: null,
        do_notify_about_release_notes_checkbox: null,
        error_message: null,
        error_message_bar: null
    };

    /// Hooks up events from all option controls so that when they are changed the new configuration
    /// indicated by the page is saved.
    function initialize_options_change_listeners()
    {
        const checkboxes = document.querySelectorAll("input[type='checkbox'].option");
        checkboxes.forEach(checkbox =>
        {
            checkbox.addEventListener("change", save_page_configuration);
        });
    }

    /// Initializes this module.
    function initialize()
    {
        populate_with_elements(DOM);
        initialize_options_change_listeners();

        load_page_configuration();
    }

    /// Enumerates possible error messages.
    const ErrorMessage =
    {
        LoadingConfiguration: "Error when loading options",
        SavingConfiguration:  "Error when saving options"
    };
    /// Displays (and logs) an error.
    function report_error(message, debug_info)
    {
        console.error(message + "\n" +
                      "Debug info: " + debug_info);

        DOM.error_message.textContent = message;
        DOM.error_message_bar.classList.remove("hidden");
    }

    /// Extracts the configuration indicated by the controls on the page.
    function extract_configuration_from_page()
    {
        return  {
                    version: CURRENT_VERSION,

                    notification:
                    {
                        release_notes: DOM.do_notify_about_release_notes_checkbox.checked
                    },
                    general:
                    {
                        is_private: DOM.is_private_checkbox.checked
                    }
                };
    }
    /// Applies the specified configuration to the controls on the page.
    function apply_configuration_to_page(options)
    {
        DOM.do_notify_about_release_notes_checkbox.checked = (
            options.notification.release_notes
        );
        DOM.is_private_checkbox.checked = (
            options.general.is_private
        );
    }

    /// Loads the configuration from local storage onto the controls on the page asynchronously.
    function load_page_configuration()
    {
        return configuration.load()
                    .then(options =>
                    {
                        if (options === null)
                        {
                            report_error(ErrorMessage.LoadingConfiguration, "options === null");
                        }
                        else { apply_configuration_to_page(options); }
                    })
                    .catch(reason => report_error(ErrorMessage.LoadingConfiguration, reason));
    }
    /// Saves the configuration indicated by the controls on the page to local storage
    /// asynchronously.
    function save_page_configuration()
    {
        return configuration.save(extract_configuration_from_page())
                    .catch(reason => report_error(ErrorMessage.SavingConfiguration, reason));
    }

    require.config({
                        paths: { scripts: "/scripts" }
                   });
    require(["scripts/meta/configuration",
             "scripts/meta/version",
             "scripts/utilities/dom_manipulation"],
            (configuration_module, version_module, dom_module) =>
            {
                configuration = configuration_module;
                CURRENT_VERSION = version_module.CURRENT;
                populate_with_elements = dom_module.populate;

                initialize();
            });
})();
