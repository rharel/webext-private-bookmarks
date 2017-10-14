(function()
{
    /// Set in define().
    let configuration, version;

    /// Release notes are hosted in the following directory:
    const RELEASE_NOTES_URL =
        "https://rharel.github.io/webext-private-bookmarks/release-notes/";

    /// Opens a new tab displaying the release notes for the current version.
    function show_release_notes()
    {
        const {major, minor, release} = version.CURRENT;
        const url = RELEASE_NOTES_URL + `${major}-${minor}-${release}.html`;

        browser.tabs.create({ url: url, active: true });
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
                version.HAS_RELEASE_NOTES)
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
