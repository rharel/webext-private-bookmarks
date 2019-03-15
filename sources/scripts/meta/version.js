"use strict";

(function()
{
    // PB's version string format is: {major}.{minor}.{release}[{tag}]
    // Where {major}, {minor}, {release} are integers and an optional {tag}
    // is either "" (empty), "a" (alpha), or "b" (beta).

    /// Formats the specified version as a string.
    ///
    /// \param version
    ///     Object to format.
    ///     Type: {major: int, minor: int, release: int, [tag: string]}
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

    const version_string = browser.runtime.getManifest().version;
    const last_char = version_string[version_string.length - 1];
    const has_tag = last_char === "a" || last_char === "b";
    const component_substring = (
        has_tag ?
            version_string.slice(0, version_string.length - 1) :
            version_string
    );
    const tag = has_tag ? last_char : "";
    const [major, minor, release] =
        component_substring
            .split(".")
            .map(component => parseInt(component));

    define({
        CURRENT: {major: major, minor: minor, release: release, tag: tag},
        RELEASE_NOTES:
        {
            url: (
                "https://rharel.github.io/webext-private-bookmarks/release-notes/" +
                `${major}-${minor}-${release}.html`
            ),
            // If set, the extension may (per user preference) display the release notes for the
            // installed version upon first user interaction proceeding deployment.
            relevant_to_users: false
        },
        format: format
    });
})();
