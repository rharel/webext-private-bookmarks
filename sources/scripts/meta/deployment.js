(function()
{
    /// Imported from other modules.
    let configuration, events, storage, version;

    /// Opens a new tab displaying the release notes for the current version.
    function show_release_notes()
    {
        browser.tabs.create({ url: version.RELEASE_NOTES.url, active: true });
    }

    /// Executes one-time procedures during first user interaction with the current release.
    async function on_first_interaction(deployment_type)
    {
        if (deployment_type !== "update") { return; }

        const options = await configuration.load();

        if (options.do_show_release_notes &&
            version.RELEASE_NOTES.is_relevant_to_users)
        {
            show_release_notes();
        }
    }
    /// Listens for first user interaction with the extension proceeding deployment.
    async function listen_for_first_interaction(deployment_type)
    {
        let listener = events.global.add_listener(["options-open", "popup-open"], () =>
        {
            events.global.remove_listener(listener);
            storage.remove(storage.Key.DeploymentType);
            on_first_interaction(deployment_type);
        });
    }

    /// Handles extension deployment (installation and updates).
    async function on_deploy(details)
    {
        const deployment_type = details.reason;
        
        if      (deployment_type === "install") { on_install(); }
        else if (deployment_type === "update")  { on_update();  }

        await storage.save(storage.Key.DeploymentType, deployment_type);
        listen_for_first_interaction(deployment_type);
    }
    /// Handles extension installation.
    function on_install() { configuration.save(configuration.create()); }
    /// Handles extension update.
    function on_update()
    {
        configuration.load().then(options =>
        {
            configuration.save(configuration.update(options));
        });
    }

    /// Initializes this module.
    async function initialize()
    {
        const deployment_type = await storage.load(storage.Key.DeploymentType);
        if (deployment_type !== null)
        {
            listen_for_first_interaction(deployment_type);
        }
    }

    define(["scripts/meta/configuration",
            "scripts/meta/version",
            "scripts/utilities/events",
            "scripts/utilities/storage"],
           (configuration_module, version_module, events_module, storage_module) =>
           {
                configuration = configuration_module;
                version = version_module;
                events = events_module;
                storage = storage_module;

                initialize();

                return { on_deploy: on_deploy };
           });
})();
