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
    const Identifier = { BookmarkAddition: "BookmarkAddition" };

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
        setTimeout(() => browser.notifications.clear(id), options.lifetime);

        return id;
    }

    define({
                Identifier: Identifier,
                post: post
           });
})();
