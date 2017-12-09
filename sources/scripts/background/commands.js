(function()
{
    /// Imported from other modules.
    let bookmarks, notification;

    /// Handles user commands.
    async function handle_command(command)
    {
        if (command === "lock" && bookmarks.is_unlocked())
        {
            await bookmarks.lock();
            notification.locked();
        }
    }

    require(["scripts/background/bookmarks_manager",
             "scripts/utilities/notification"],
            (bookmarks_module, notification_module) =>
            {
                bookmarks = bookmarks_module;
                notification = notification_module;

                browser.commands.onCommand.addListener(handle_command);
            });
})();
