(function()
{
    /// Set in define().
    let STORAGE_KEY, events;

    /// Listens to changes in local storage to keep up with changes to options.
    browser.storage.onChanged.addListener((changes, area) =>
    {
        if (area === "local" &&
            changes.hasOwnProperty(STORAGE_KEY))
        {
            const {oldValue, newValue} = changes[STORAGE_KEY];

            if (oldValue.general.is_private !== newValue.general.is_private)
            {
                events.emitEvent("privacy-change", [newValue.general.is_private]);
            }
        }
    });

    define(["libraries/EventEmitter.min",
            "scripts/meta/configuration"],
           (EventEmitter, configuration_module) =>
           {
                events = new EventEmitter();
                STORAGE_KEY = configuration_module.STORAGE_KEY;

                return { events: events };
           });
})();
