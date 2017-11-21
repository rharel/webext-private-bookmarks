(function()
{
    /// This module is an intermediary between non-background scripts and the bookmarks manger
    /// background script.

    const this_module = { MESSAGE_TYPE: "bookmarks_interface" };

    ["add", "contains_url", "get_front_id", "get_front_title", "get_front_parent_title",
     "needs_setup", "authenticate", "load",
     "clear", "setup", "change_authentication",
     "lock", "unlock", "is_locked", "is_unlocked",
     "export_encrypted_data", "export_plain_data",
     "import_encrypted_data", "import_plain_data"]
    .forEach(method_name =>
    {
        this_module[method_name] = (...arguments) =>
        {
            return browser.runtime.sendMessage({
                type: this_module.MESSAGE_TYPE,
                method_name: method_name,
                arguments:   arguments
            });
        }
    });
    ["events"].forEach(property_name =>
    {
        this_module[property_name] = () =>
        {
            return browser.runtime.sendMessage({
                type: this_module.MESSAGE_TYPE,
                property_name: property_name
            });
        }
    });

    define(this_module);
})();
