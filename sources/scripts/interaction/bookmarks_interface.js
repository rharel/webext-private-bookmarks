(function()
{
    /// This module is an intermediary between non-background scripts and the bookmarks manger
    /// background script.

    const this_module = { MESSAGE_TYPE: "bookmarks_interface" };

    ["clear", "needs_setup", "setup",
     "authenticate", "change_authentication",
     "lock", "unlock", "is_locked", "is_unlocked"]
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

    define(this_module);
})();
