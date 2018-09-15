"use strict";

(function()
{
    // PB's version string format is:
    //      {major}.{minor}.{release}.{revision}{tag}
    // Where {major}, {minor}, {release}, {revision} integers,
    // and {tag} is either "" (empty), "a" (alpha), or "b" (beta).
    //
    // Also, the last component {revision}{tag} is optional.

    /// Formats the specified version as a string.
    ///
    /// \param version
    ///     Object to format: {
    ///         major: int,
    ///         minor: int,
    ///         release: int,
    ///         [tag: String]
    ///     }
    ///
    /// \returns
    ///     Formatted string.
    function format(version)
    {
        let result = `${version.major}.${version.minor}.${version.release}`;

        if (version.tag === "a") { result += " (alpha)"; }
        if (version.tag === "b") { result += " (beta)"; }

        return result;
    }

    const stringComponents =
        browser.runtime.getManifest().version.split(".");
    const [major, minor, release] = (
        stringComponents
            .slice(0, 3)
            .map(string => parseInt(string))
    );
    const current_version =
    {
        major:   major,
        minor:   minor,
        release: release
    };
    if (stringComponents.length === 4)
    {
        const last = stringComponents[3];
        const iTag = last.length - 1;
        current_version.tag      = last[iTag];
        current_version.revision = parseInt(last.slice(0, iTag));
    }

    const release_notes_url = (
        "https://rharel.github.io/webext-private-bookmarks/release-notes/" +
        `${major}-${minor}-${release}.html`
    );

    define({
        CURRENT: current_version,
        RELEASE_NOTES:
        {
            url: release_notes_url,

            // If set, the extension may (per user preference) display the release notes for the
            // installed version upon first user interaction proceeding deployment.
            relevant_to_users: false
        },
        format: format
    });
})();
