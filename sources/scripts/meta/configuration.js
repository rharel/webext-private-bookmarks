(function()
{
    /// Imported from other modules.
    let storage, version;

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
                    do_show_release_notes: true
                };
    }
    /// Updates a configuration to the latest version.
    /// Supports migration from any earlier version in the 0.0.* range.
    function update(configuration)
    {
        const previous_release = configuration.version.release;

        // Release 12: The 'security' property is added.
        if (previous_release < 12)
        {
            configuration.security = { disable_password_requirements: false };
        }
        // Release 13: structure is flattened and properties renamed.
        if (previous_release < 13)
        {
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
        }
        // Update the version value.
        configuration.version = version.CURRENT;

        return configuration;
    }

    /// Loads the configuration from local storage.
    /// If none exists, creates, saves and returns a default one.
    async function load()
    {
        let value = await storage.load(storage.Key.Configuration);
        if (value === null)
        {
            value = create();
            await storage.save(storage.Key.Configuration, value);
        }
        return value;
    }
    /// Saves a configuration to local storage asynchronously.
    function save(value) { return storage.save(storage.Key.Configuration, value); }

    define(["scripts/meta/version",
            "scripts/utilities/storage"],
           (version_module, storage_module) =>
           {
                version = version_module;
                storage = storage_module;

                return  {
                            create: create,
                            update: update,

                            load: load,
                            save: save
                        };
           });
})();
