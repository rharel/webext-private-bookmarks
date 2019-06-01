"use strict";

(function()
{
    /// Initializes the extension's storage and then invokes the specified callback.
    function initialize_storage_and_then(do_something)
    {
        require(
            ["require", "scripts/utilities/storage"],
            (require, storage) =>
            {
                storage
                    .initialize()
                    .then(() => do_something(require));
            }
        );
    }
    browser.runtime.onInstalled.addListener(details =>
    {
        initialize_storage_and_then(require =>
        {
            require(["scripts/meta/deployment"], deployment_module =>
            {
                deployment_module.on_deploy(details);
            })
        });
    });
    initialize_storage_and_then(require =>
    {
        require(
            ["scripts/background/bookmarks_manager",
             "scripts/background/browser_action",
             "scripts/background/commands",
             "scripts/background/page_action",
             "scripts/background/storage_events",
             "scripts/meta/deployment"]
        );
    });
})();
