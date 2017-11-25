(function()
{
    /// Set in define().
    let bookmarks, notification;

    /// Lock in response to user command.
    browser.commands.onCommand.addListener(async command =>
    {
        if (command === "lock" && bookmarks.is_unlocked())
        {
            await bookmarks.lock();
            notification.locked();
        }
    });

    require(["scripts/background/bookmarks_manager",
             "scripts/utilities/notification"],
            (bookmarks_module, notification_module) =>
            {
                bookmarks = bookmarks_module;
                notification = notification_module;
            });
})();
