(function()
{
    /// Imported from other modules.
    let version;

    /// Returns a new configuration object with default values for all options.
    function create()
    {
        return  {
                    version: version.CURRENT,

                    /// True iff no requirements should be imposed on passwords.
                    do_disable_password_requirements: false,
                    /// True iff the extension is limited to private contexts exclusively.
                    do_limit_to_private_context: true,
                    /// True iff release notes may be displayed proceeding an update.
                    do_show_release_notes: true,
                    /// True iff preferences and bookmarks should be synced across devices.
                    do_sync_data_across_devices: false,
                    /// True iff a dark theme is preferred.
                    do_use_dark_theme: false,

                    /// Properties of the idle auto-lock feature.
                    idle_auto_lock:
                    {
                        /// True iff the feature is enabled.
                        is_enabled: false,
                        /// The number of minutes of inactivity required for the system to be
                        /// considered idle.
                        threshold_minutes: 30
                    },

                    /// String used to refer to the Private Bookmarks folder.
                    folder_title: browser.i18n.getMessage("extension_name")
                };
    }
    /// Updates a configuration to the latest version.
    /// Supports migration from any earlier version in the 0.*.* range.
    function update(configuration)
    {
        const previous_release = configuration.version.release;

        // Release 12: The 'security' property is added.
        if (previous_release < 12)
        {
            configuration.security = { disable_password_requirements: false };
        }
        // Release 13: structure is flattened, existing properties renamed, and a new syncing option
        // is added.
        if (previous_release < 13)
        {
            // Flatten and rename existing properties
            configuration.do_disable_password_requirements = (
                configuration.security.disable_password_requirements
            );
            configuration.do_limit_to_private_context = (
                configuration.general.is_private
            );
            configuration.do_show_release_notes = (
                configuration.notification.release_notes
            );
            delete configuration.general;
            delete configuration.notification;
            delete configuration.security;

            // Add an opt-in to sync data across devices.
            configuration.do_sync_data_across_devices = false;
        }
        // Release 14: The light/dark theme flag is added.
        if (previous_release < 14)
        {
            configuration.do_use_dark_theme = false;
        }
        // Release 15: The idle auto-lock feature is added.
        if (previous_release < 15)
        {
            configuration.idle_auto_lock =
            {
                is_enabled: false,
                threshold_minutes: 30
            };
        }
        // Release 17: The custom folder title feature is added.
        if (previous_release < 17)
        {
            configuration.folder_title = browser.i18n.getMessage("extension_name");
        }

        // Update the version value.
        configuration.version = version.CURRENT;

        return configuration;
    }

    define(["scripts/meta/version"],
           version_module =>
           {
                version = version_module;

                return  {
                            create: create,
                            update: update,
                        };
           });
})();
