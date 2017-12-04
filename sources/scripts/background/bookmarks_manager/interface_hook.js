(function()
{
    /// Set in define().
    let core, events;

    /// Initializes this module.
    function initialize()
    {
        /// Listen for and handle commands from other frames via the bookmarks interface
        /// (see scripts/interaction/bookmarks_interface.js).
        events.global.add_listener("bookmarks-interface", message =>
        {
            return Promise.resolve(core[message.method_name](...message.arguments));
        });
    }

    require(["scripts/background/bookmarks_manager/core",
             "scripts/utilities/events"],
            (core_module, events_module) =>
            {
                core = core_module;
                events = events_module;

                initialize();
            });
})();
