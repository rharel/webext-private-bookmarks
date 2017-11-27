(function()
{
    /// Set in define().
    let configuration, version;

    /// Opens a new tab displaying the release notes for the current version.
    function show_release_notes()
    {
        browser.tabs.create({ url: version.RELEASE_NOTES.url, active: true });
    }

    /// Handles extension deployment (installation and updates).
    function on_deploy(details)
    {
        if      (details.reason === "install") { on_install(); }
        else if (details.reason === "update")  { on_update();  }
    }
    /// Handles extension installation.
    function on_install() { configuration.save(configuration.create()); }
    /// Handles extension update.
    function on_update()
    {
        configuration.load().then(options =>
        {
            if (options.notification.release_notes &&
                version.RELEASE_NOTES.is_relevant_to_users)
            {
                show_release_notes();
            }
            configuration.save(configuration.update(options));
        });
    }

    define(["scripts/meta/configuration",
            "scripts/meta/version"],
           (configuration_module, version_module) =>
           {
                configuration = configuration_module;
                version = version_module;

                return   { on_deploy: on_deploy };
           });
})();
