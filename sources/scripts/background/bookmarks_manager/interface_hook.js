(function()
{
    /// Set in define().
    let core, INTERFACE_MESSAGE;

    /// Listen for and handle non-background commands via the bookmarks interface
    /// (see scripts/interaction/bookmarks_interface.js).
    browser.runtime.onMessage.addListener(message =>
    {
        if (message.type === INTERFACE_MESSAGE)
        {
            if (message.property_name)
            {
                return Promise.resolve(core[message.property_name]);
            }
            else
            {
                return Promise.resolve(core[message.method_name](...message.arguments));
            }
        }
    });

    require(["scripts/background/bookmarks_manager/core",
             "scripts/interaction/bookmarks_interface"],
            (core_module, interface_module) =>
            {
                core = core_module;
                INTERFACE_MESSAGE = interface_module.MESSAGE_TYPE;
            });
})();
