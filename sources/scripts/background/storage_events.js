(function()
{
    /// Imported from other modules.
    let events, storage;

    /// Convert changes to configuration to relevant events.
    browser.storage.onChanged.addListener((changes, area) =>
    {
        if (area === "local" &&
            changes.hasOwnProperty(storage.Key.Configuration))
        {
            const {oldValue, newValue} = changes[storage.Key.Configuration];

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

    require(["scripts/utilities/events",
             "scripts/utilities/storage"],
            (events_module, storage_module) =>
            {
                events = events_module;
                storage = storage_module;
            });
})();
