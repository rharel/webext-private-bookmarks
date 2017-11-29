(function()
{
    /// Set in define().
    let configuration, domanip, messages, version;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        is_private_checkbox: null,
        disable_password_requirements_checkbox: null,
        do_notify_about_release_notes_checkbox: null,
        top_level_message_container: null,
        release_notes_link: null
    };

    /// Enumerates possible error messages.
    const ErrorMessage =
    {
        LoadingConfiguration: browser.i18n.getMessage("error_loading_options"),
        SavingConfiguration:  browser.i18n.getMessage("error_saving_options")
    };

    /// Extracts the configuration indicated by the controls on the page.
    function extract_configuration_from_page()
    {
        return  {
                    version: version.CURRENT,

                    general:
                    {
                        is_private: DOM.is_private_checkbox.checked
                    },
                    notification:
                    {
                        release_notes: DOM.do_notify_about_release_notes_checkbox.checked
                    },
                    security:
                    {
                        disable_password_requirements: (
                            DOM.disable_password_requirements_checkbox.checked
                        )
                    }
                };
    }
    /// Applies the specified configuration to the controls on the page.
    function apply_configuration_to_page(options)
    {
        DOM.disable_password_requirements_checkbox.checked = (
            options.security.disable_password_requirements
        );
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
                    messages.error(
                        ErrorMessage.LoadingConfiguration,
                        "options === null"
                    );
                }
                else { apply_configuration_to_page(options); }
            })
            .catch(reason => messages.error(
                ErrorMessage.LoadingConfiguration,
                reason
            ));
    }
    /// Saves the configuration indicated by the controls on the page to local storage
    /// asynchronously.
    function save_page_configuration()
    {
        return configuration.save(extract_configuration_from_page())
            .catch(reason => messages.error(
                ErrorMessage.SavingConfiguration, reason
            ));
    }

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
        domanip.populate(DOM);
        messages = new messages.Controller(DOM.top_level_message_container);

        initialize_options_change_listeners();

        load_page_configuration();

        DOM.release_notes_link.href = version.RELEASE_NOTES.url;
    }

    require.config({
        paths:
        {
            libraries: "/libraries",
            scripts: "/scripts"
        }
    });
    require(["./data", "./export", "./import"]);
    require(["./messages",
             "scripts/meta/configuration",
             "scripts/meta/version",
             "scripts/utilities/dom_manipulation"],
            (messages_module, configuration_module, version_module, dom_module) =>
            {
                messages = messages_module;
                configuration = configuration_module;
                version = version_module;
                domanip = dom_module;

                initialize();
            });
})();
