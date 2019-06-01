(function()
{
    /// Imported from other modules.
    let domanip, events, messages, storage, version;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        backup_reminder_interval_days_field: null,
        do_auto_lock_when_idle_checkbox: null,
        do_backup_reminder_checkbox: null,
        do_disable_password_requirements_checkbox: null,
        do_limit_to_private_context_checkbox: null,
        do_show_release_notes_checkbox: null,
        idle_auto_lock_threshold_minutes_field: null,
        top_level_message_container: null,
        release_notes_link: null
    };

    /// Enumerates possible error messages.
    const ErrorMessage =
    {
        LoadingConfiguration: browser.i18n.getMessage("error_options_load"),
        SavingConfiguration:  browser.i18n.getMessage("error_options_save")
    };

    /// Extracts the configuration indicated by the controls on the page.
    function extract_configuration_from_page()
    {
        return  {
                    version: version.CURRENT,

                    do_disable_password_requirements: (
                        DOM.do_disable_password_requirements_checkbox.checked
                    ),
                    do_limit_to_private_context: (
                        DOM.do_limit_to_private_context_checkbox.checked
                    ),
                    do_show_release_notes: (
                        DOM.do_show_release_notes_checkbox.checked
                    ),

                    backup_reminder:
                    {
                        is_enabled: (
                            DOM.do_backup_reminder_checkbox.checked
                        ),
                        interval_days: (
                            parseInt(DOM.backup_reminder_interval_days_field.value)
                        )
                    },
                    idle_auto_lock:
                    {
                        is_enabled: (
                            DOM.do_auto_lock_when_idle_checkbox.checked
                        ),
                        threshold_minutes: (
                            parseInt(DOM.idle_auto_lock_threshold_minutes_field.value)
                        )
                    }
                };
    }
    /// Applies the specified configuration to the controls on the page.
    function apply_configuration_to_page(options)
    {
        DOM.do_disable_password_requirements_checkbox.checked = (
            options.do_disable_password_requirements
        );
        DOM.do_limit_to_private_context_checkbox.checked = (
            options.do_limit_to_private_context
        );
        DOM.do_show_release_notes_checkbox.checked = (
            options.do_show_release_notes
        );

        DOM.do_auto_lock_when_idle_checkbox.checked = (
            options.idle_auto_lock.is_enabled
        );
        DOM.idle_auto_lock_threshold_minutes_field.disabled = (
            !options.idle_auto_lock.is_enabled
        );
        DOM.idle_auto_lock_threshold_minutes_field.value = (
            options.idle_auto_lock.threshold_minutes.toString()
        );

        DOM.do_backup_reminder_checkbox.checked = (
            options.backup_reminder.is_enabled
        );
        DOM.backup_reminder_interval_days_field.disabled = (
            !options.backup_reminder.is_enabled
        );
        DOM.backup_reminder_interval_days_field.value = (
            options.backup_reminder.interval_days.toString()
        );
    }

    /// Loads the configuration from local storage onto the controls on the page.
    async function load_page_configuration()
    {
        let options;
        try           { options = await storage.load(storage.Key.Configuration); }
        catch (error) { messages.error(ErrorMessage.LoadingConfiguration, error); return; }

        apply_configuration_to_page(options);
    }
    /// Saves the configuration indicated by the controls on the page to local storage.
    async function save_page_configuration()
    {
        try
        {
            const oldValue = await storage.load(storage.Key.Configuration);
            const newValue = Object.assign(oldValue, extract_configuration_from_page());
            await storage.save(storage.Key.Configuration, newValue);
        }
        catch (error) { messages.error(ErrorMessage.SavingConfiguration, error); }
    }

    /// Hooks up events from all option controls so that when they are changed the new configuration
    /// indicated by the page is saved.
    function initialize_options_change_listeners()
    {
        document.querySelectorAll("input[type='checkbox'].option")
                .forEach(item =>
        {
            item.addEventListener("change", save_page_configuration);
        });
        document.querySelectorAll("select.option")
                .forEach(item =>
        {
            item.addEventListener("change", save_page_configuration);
        });

        // Replace the simple event handler with one that first requests the necessary API
        // permissions for the idle auto-locking feature.
        DOM.do_auto_lock_when_idle_checkbox.removeEventListener("change", save_page_configuration);
        DOM.do_auto_lock_when_idle_checkbox.addEventListener("change", () =>
        {
            const box = DOM.do_auto_lock_when_idle_checkbox;
            const idle_api_permission = { permissions: ["idle"] };
            if (box.checked)
            {
                browser.permissions.request(idle_api_permission).then(is_granted =>
                {
                    if (is_granted) { save_page_configuration(); }
                    else            { box.checked = false; }
                    DOM.idle_auto_lock_threshold_minutes_field.disabled = !box.checked;
                });
            }
            else
            {
                save_page_configuration();
                DOM.idle_auto_lock_threshold_minutes_field.disabled = !box.checked;
            }
        });
    }
    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);
        messages = new messages.Controller(DOM.top_level_message_container);

        initialize_options_change_listeners();

        load_page_configuration().then(
            () => require(["./data", "./export", "./import", "./synchronization"])
        );

        DOM.release_notes_link.href = version.RELEASE_NOTES.url;

        // Changes to configuration may also originate from other parts of the extension, so listen
        // for them.
        events.global.add_listener(["configuration-change"], () => load_page_configuration());

        events.global.emit("options-open");
    }

    require.config({
        paths:
        {
            libraries: "/libraries",
            scripts: "/scripts"
        }
    });
    require(["./messages",
             "scripts/meta/version",
             "scripts/utilities/dom_manipulation",
             "scripts/utilities/events",
             "scripts/utilities/storage"],
            (messages_module, version_module,
             dom_module, events_module, storage_module) =>
            {
                messages = messages_module;
                version = version_module;
                domanip = dom_module;
                events = events_module;
                storage = storage_module;

                domanip.when_ready(initialize);
            });
})();
