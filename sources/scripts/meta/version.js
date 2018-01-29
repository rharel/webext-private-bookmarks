(function()
{
    const components = browser.runtime.getManifest().version.split(".");
    const [major, minor, release] = (
        components.slice(0, 3)
                  .map(string => parseInt(string))
    );
    /// The current version identifier.
    const CURRENT =
    {
        major:   major,
        minor:   minor,
        release: release
    };
    if (components.length === 4)
    {
        const n = components[3].length;
        CURRENT.tag      = components[3][n - 1];
        CURRENT.revision = parseInt(components[3].slice(0, n - 1));
    }

    /// Release notes are hosted here.
    const RELEASE_NOTES_URL = (
        "https://rharel.github.io/webext-private-bookmarks/release-notes/" +
        `${major}-${minor}-${release}.html`
    );

    /// Formats the specified version.
    function format(
        include_minor = true, include_release  = true,
        include_tag   = true, include_revision = true)
    {
        let result = `${CURRENT.major}`;
        if (include_minor)
        {
            result += `.${CURRENT.minor}`;
            if (include_release) { result += `.${CURRENT.release}`; }
        }
        if (include_tag)
        {
            const full_name = { a: "alpha",  b: "beta" };
            result += ` (${full_name[CURRENT.tag]}`;
            if (include_revision) { result += `-${CURRENT.revision}`; }
            result += ")";
        }
        return result;
    }

    define({
        CURRENT: CURRENT,
        RELEASE_NOTES:
        {
            url: RELEASE_NOTES_URL,

            // If set, the extension may (per user preference) display the release notes for the
            // installed version upon first user interaction proceeding deployment.
            is_relevant_to_users: false
        },

        format: format
    });
})();
