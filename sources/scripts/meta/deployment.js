"use strict";

(function()
{
    /// Imported from other modules.
    let configuration, events, storage, version;

    /// Opens a new tab displaying the release notes for the current version.
    async function show_release_notes()
    {
        await browser.tabs.create({
            url: version.RELEASE_NOTES.url,
            active: true
        });
    }

    /// Handles the first user interaction with the current release.
    ///
    /// \param deployment_type
    ///     Either "install" or "update".
    async function on_first_interaction(deployment_type)
    {
        // We only care about updates.
        if (deployment_type !== "update") { return; }

        const options = await storage.load(storage.Key.Configuration);

        if (options.do_show_release_notes &&
            version.RELEASE_NOTES.relevant_to_users)
        {
            await show_release_notes();
        }
    }
    /// Listens for first user interaction with the extension proceeding deployment.
    ///
    /// \param deployment_type
    ///     Either "install" or "update", forwarded to the first interaction handler.
    function listen_for_first_interaction(deployment_type)
    {
        const listener = events.global.add_listener(
            ["menu-open", "options-open"],
            async () =>
            {
                events.global.remove_listener(listener);
                await Promise.all([
                    storage.remove(storage.Key.DeploymentType),
                    on_first_interaction(deployment_type)
                ]);
            }
        );
    }

    /// Handles extension update.
    async function on_update()
    {
        const options = await storage.load(storage.Key.Configuration);
        await storage.save(
            storage.Key.Configuration,
            configuration.update(options)
        );
    }

    /// Handles extension deployment.
    ///
    /// \param details
    ///     Deployment details as supplied by the browser
    ///     to the 'runtime.onInstalled' handler.
    async function on_deploy(details)
    {
        const deployment_type = details.reason;
        
        if (deployment_type === "update") { await on_update(); }

        await storage.save(
            storage.Key.DeploymentType,
            deployment_type
        );
        listen_for_first_interaction(deployment_type);
    }

    /// Initializes this module.
    async function initialize()
    {
        // The deployment type storage value is used as a marker.
        // If it is present, it means no first interaction handling was invoked
        // since the last installation/update, and so we should listen for it.
        const deployment_type = await storage.load(storage.Key.DeploymentType);
        if (deployment_type !== null)
        {
            listen_for_first_interaction(deployment_type);
        }
    }

    define(
        ["scripts/meta/configuration",
         "scripts/meta/version",
         "scripts/utilities/events",
         "scripts/utilities/storage"],
        (configuration_module, version_module, events_module, storage_module) =>
        {
            configuration = configuration_module;
            version = version_module;
            events = events_module;
            storage = storage_module;

            initialize().then(() => {});  // Ignore.

            return { on_deploy: on_deploy };
        }
    );
})();
