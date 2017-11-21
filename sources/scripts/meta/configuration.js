(function()
{
    /// Set in define().
    let storage, version;

    /// Returns a new configuration object with default values for all options.
    function create()
    {
        return  {
                    version: version.CURRENT,

                    general:
                    {
                        /// True iff the extension is limited to private contexts exclusively.
                        is_private: true
                    },
                    notification:
                    {
                        /// True iff release notes may be displayed proceeding an update.
                        release_notes: true
                    },
                    security:
                    {
                        /// True iff no requirements should be imposed on passwords.
                        disable_password_requirements: false
                    }
                };
    }
    /// Updates a configuration to the latest version.
    function update(configuration)
    {
        // The 'security' property was added in release 12.
        if (!configuration.hasOwnProperty("security"))
        {
            configuration.security = { disable_password_requirements: false };
        }
        // Update the version value:
        configuration.version = version.CURRENT;

        return configuration;
    }

    /// The key for the extension's configuration in local storage.
    const STORAGE_KEY = "configuration";

    /// Loads the configuration from local storage asynchronously.
    /// Resolves to the configuration object if it exists. If not, resolves to null.
    function load() { return storage.load(STORAGE_KEY); }
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
