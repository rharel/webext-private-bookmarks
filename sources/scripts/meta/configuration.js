(function()
{
    /// Set in define().
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

    /// The key for the extension's configuration in local storage.
    const STORAGE_KEY = "configuration";

    /// Loads the configuration from local storage.
    /// Resolves to the configuration object if it exists. If not, resolves to null.
    function load()              { return storage.load(STORAGE_KEY); }
    /// Saves a configuration to local storage asynchronously.
    function save(configuration) { return storage.save(STORAGE_KEY, configuration); }

    define(["scripts/meta/version",
            "scripts/utilities/local_storage"],
           (version_module, storage_module) =>
           {
                version = version_module;
                storage = storage_module;

                return  {
                            STORAGE_KEY: STORAGE_KEY,

                            create: create,
                            update: update,

                            load: load,
                            save: save
                        };
           });
})();
