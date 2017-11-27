(function()
{
    /// Set in define().
    let clamp;

    /// Minimum and maximum component values.
    const MINIMUM_COMPONENT = 0,
          MAXIMUM_COMPONENT = 65535;

    /// Creates a new version object with the given major, minor, and release components.
    /// All components must be integers in the range [0, 65535].
    function create(major, minor, release)
    {
        return  {
                    major:   clamp(major,   MINIMUM_COMPONENT, MAXIMUM_COMPONENT),
                    minor:   clamp(minor,   MINIMUM_COMPONENT, MAXIMUM_COMPONENT),
                    release: clamp(release, MINIMUM_COMPONENT, MAXIMUM_COMPONENT)
                };
    }

    const CURRENT = (function()
    {
        const [major, minor, release] = (
            browser.runtime.getManifest().version
                .split(".")
                .map(component_string => parseInt(component_string))
        );
        return create(major, minor, release);
    })();

    /// Release notes are hosted in this directory.
    const RELEASE_NOTES_URL = (
        "https://rharel.github.io/webext-private-bookmarks/release-notes/" +
        `${CURRENT.major}-${CURRENT.minor}-${CURRENT.release}.html`
    );

    define(["scripts/utilities/math"],
           math_module =>
           {
                clamp = math_module.clamp;

                return  {
                            CURRENT: CURRENT,
                            RELEASE_NOTES:
                            {
                                url: RELEASE_NOTES_URL,
                                is_relevant_to_users: false
                            }
                        };
           });
})();
