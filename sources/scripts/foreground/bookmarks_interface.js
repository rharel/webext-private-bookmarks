"use strict";

(function()
{
    // This module is an intermediary between non-background scripts and the bookmarks manager.

    /// Imported from other modules.
    let events;

    const this_module = {};

    ["add", "contains_url", "get_front_id",
     "get_front_title", "get_front_parent_title",
     "needs_setup", "authenticate", "load",
     "clear", "setup", "change_authentication",
     "lock", "unlock", "is_locked", "is_unlocked",
     "export_encrypted_data", "export_plain_data",
     "import_encrypted_data", "import_plain_data"]
        .forEach(method_name =>
    {
        this_module[method_name] = (...forwarded_arguments) =>
        {
            return events.global.emit("bookmarks-interface",
            {
                method_name: method_name,
                arguments:   forwarded_arguments
            });
        }
    });

    define(["scripts/utilities/events"], events_module =>
    {
        events = events_module;

        return this_module;
    });
})();
