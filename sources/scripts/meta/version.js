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

    define(["scripts/utilities/math"],
           math_module =>
           {
                clamp = math_module.clamp;

                return  {
                            CURRENT: (() =>
                            {
                                const [major, minor, release] = (
                                    browser.runtime.getManifest().version
                                        .split(".")
                                        .map(component_string => parseInt(component_string))
                                );
                                return create(major, minor, release);
                            })(),
                            HAS_RELEASE_NOTES: false,
                            create: create
                        };
           });
})();
