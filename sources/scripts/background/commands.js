(function()
{
    /// Set in define().
    let core, notification;

    /// Lock in response to user command.
    browser.commands.onCommand.addListener(async command =>
    {
        if (command === "lock" && core.is_unlocked())
        {
            await core.lock();
            notification.locked();
        }
    });

    require(["scripts/background/bookmarks_manager/core",
             "scripts/utilities/notification"],
            (core_module, notification_module) =>
            {
                core = core_module;
                notification = notification_module;
            });
})();
