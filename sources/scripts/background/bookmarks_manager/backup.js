(function()
{
    /// Set in define().
    let back, CURRENT_VERSION, front, tree;

    /// Returns a JSON object containing encrypted bookmarks' data.
    async function export_encrypted_data()
    {
        const data   = (await back.load()).bookmarks;
        data.version = CURRENT_VERSION;

        return data;
    }
    /// Returns a JSON object containing plaintext bookmarks' data.
    async function export_plain_data()
    {
        if (!front.exists())
        {
            return Promise.reject(new Error("Cannot export plain data while locked."));
        }
        return tree.prune(await front.get_node())
    }

    define(["scripts/background/bookmarks_manager/back",
            "scripts/background/bookmarks_manager/front",
            "scripts/background/bookmarks_manager/tree_utilities",
            "scripts/meta/version"],
           (back_module, front_module, tree_module, version_module) =>
           {
                back = back_module;
                CURRENT_VERSION = version_module.CURRENT;
                front = front_module;
                tree = tree_module;

                return  {
                            export_encrypted_data: export_encrypted_data,
                            export_plain_data:     export_plain_data
                        };
           });
})();
