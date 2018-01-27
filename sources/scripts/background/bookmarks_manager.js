(function()
{
    define(["scripts/background/bookmarks_manager/backup",
            "scripts/background/bookmarks_manager/core",
            "scripts/background/bookmarks_manager/idle_auto_locking",
            "scripts/background/bookmarks_manager/implicit_locking",
            "scripts/background/bookmarks_manager/interface_hook"],
           (backup_module, core_module) =>
           {
               return Object.assign(core_module, backup_module);
           });
})();
