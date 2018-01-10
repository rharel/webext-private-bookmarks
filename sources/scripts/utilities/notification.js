(function()
{
    /// Default post options.
    const DEFAULT_OPTIONS =
    {
        id: "",
        title: browser.i18n.getMessage("extension_name"),
        icon_url: "/icons/main/private-bookmarks.svg",
        lifetime: 5000  /// The number of milliseconds until a post is cleared.
    };

    /// Enumerates notification identifiers.
    const Identifier =
    {
        BookmarkAddition: "BookmarkAddition",
        Locked:           "Locked"
    };

    /// Maps a message identifier to its timeout.
    const timeout = {};

    /// Posts a notification with the specified message and display options.
    ///
    /// Display options are specified via an object with all-optional keys:
    /// { title, icon_url, lifetime } indicating the notification's title text, accompanying icon,
    /// and lifetime (in milliseconds).
    ///
    /// The notification is cleared once its lifetime has expired.
    async function post(message, options)
    {
        options = Object.assign({}, DEFAULT_OPTIONS, options);

        const id = await browser.notifications.create(
            options.id,
            {
                type:    "basic",
                title:   options.title,
                message: message,
                iconUrl: options.icon_url
            }
        );
        if (timeout.hasOwnProperty(id)) { clearTimeout(timeout[id]); }
        timeout[id] = setTimeout(() =>
        {
            browser.notifications.clear(id);
            delete timeout[id];
        }, options.lifetime);

        return id;
    }
    /// Notifies that a new item has been added to the private bookmarks folder.
    function notify_item_added()
    {
        return post(
            browser.i18n.getMessage("notification_item_added"),
            {
                id: Identifier.BookmarkAddition,
                title: browser.i18n.getMessage("notification_item_added_title")
            }
        );
    }
    /// Notifies that private bookmarks have been locked.
    function notify_locked()
    {
        return post(
            browser.i18n.getMessage("notification_locked"),
            {
                id: Identifier.Locked,
                title: browser.i18n.getMessage("notification_locked_title")
            }
        );
    }

    define({
                Identifier: Identifier,

                item_added: notify_item_added,
                locked:     notify_locked
           });
})();
