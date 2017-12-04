(function()
{
    /// Set in require().
    let CONFIGURATION_STORAGE_KEY, events;

    /// Convert changes to storage to relevant events.
    browser.storage.onChanged.addListener((changes, area) =>
    {
        if (area === "local" &&
            changes.hasOwnProperty(CONFIGURATION_STORAGE_KEY))
        {
            const {oldValue, newValue} = changes[CONFIGURATION_STORAGE_KEY];

            if (!oldValue ||
                oldValue.do_limit_to_private_context !==
                newValue.do_limit_to_private_context)
            {
                events.emit("context-requirement-change",
                {
                    do_limit_to_private_context: newValue.do_limit_to_private_context
                });
            }
        }
    });

    require(["scripts/meta/configuration",
             "scripts/utilities/events"],
            (configuration_module, events_module) =>
            {
                CONFIGURATION_STORAGE_KEY = configuration_module.STORAGE_KEY;
                events = events_module;
            });
})();
