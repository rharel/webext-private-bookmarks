(function()
{
    /// Imported from other modules.
    let events;

    /// Convert changes to configuration to relevant events.
    browser.storage.onChanged.addListener((changes, area) =>
    {
        if (area === "local" &&
            changes.hasOwnProperty("configuration"))
        {
            const {oldValue, newValue} = changes["configuration"];

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

    require(["scripts/utilities/events"],
            events_module =>
            {
                events = events_module;
            });
})();
