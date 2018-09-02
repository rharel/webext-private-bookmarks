(function()
{
    /// Imported from other modules.
    let storage;

    /// The folder's identifier in the browser's bookmarks collection.
    let id = null;

    /// Returns true iff the folder exists.
    function exists() { return id !== null; }

    /// Gets the folder's identifier.
    function get_id() { return id; }
    /// Gets the folder's node.
    /// Rejects if the folder does not exist.
    async function get_node()
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot get front node when none exists."));
        }
        return (await browser.bookmarks.get(id))[0];
    }
    /// Gets the folder's sub tree.
    /// Rejects if the folder does not exist.
    async function get_tree()
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot get front node when none exists."));
        }
        return (await browser.bookmarks.getSubTree(id))[0];
    }
    /// Gets the folder's parent.
    /// Rejects if the folder does not exist.
    async function get_parent()
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot get front node when none exists."));
        }
        const node = await get_node();
        return (await browser.bookmarks.get(node.parentId))[0];
    }

    /// Creates the folder (it is empty) and returns its node.
    /// Rejects if the folder already exists.
    async function create()
    {
        if (exists())
        {
            return Promise.reject(new Error("Cannot create front when it already exists."));
        }

        const options = await storage.load(storage.Key.Configuration);
        const creation_details = { title: options.folder_title };

        const spawn_location = await storage.load(storage.Key.FrontSpawnLocation);
        if (spawn_location !== null)
        {
            let parent_exists;
            try
            {
                await browser.bookmarks.get(spawn_location.parent_id);
                parent_exists = true;
            }
            catch (error) { parent_exists = false; }

            if (parent_exists)
            {
                creation_details.parentId = spawn_location.parent_id;
                creation_details.index    = spawn_location.index;
            }
        }

        const node = await browser.bookmarks.create(creation_details);
        id = node.id;

        return node;
    }
    /// Removes the folder.
    /// Rejects if the folder does not exist.
    async function remove()
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot remove front when none exists."));
        }
        try
        {
            // Remember where the folder is moved to, i.e. its new parent and index within it, so
            // that the next time it is created, it will try to spawn there (if that location is
            // still available).
            const node = await get_node();
            storage.save(storage.Key.FrontSpawnLocation,
            {
                parent_id: node.parentId,
                index:     node.index
            });
            // Remember the folder's title (up to a predefined character limit).
            storage.load(storage.Key.Configuration).then(options =>
            {
                const CHARACTER_LIMIT = 128;
                options.folder_title = node.title.slice(
                    0, Math.min(node.title.length, CHARACTER_LIMIT)
                );
                storage.save(storage.Key.Configuration, options);
            });
            // Now remove the folder:
            await browser.bookmarks.removeTree(id);
        }
        catch (error) { throw error; }
        finally       { id = null; }
    }

    /// Adds a bookmark to the folder asynchronously.
    /// Rejects if the folder does not exist.
    function add(url, title)
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot add an item to front, front doesn't exist."));
        }
        return browser.bookmarks.create({
            parentId: id,
            url:      url,
            title:    title
        });
    }

    /// Returns true iff the specified node is a descendant of the folder.
    /// Rejects if the folder does not exist.
    async function contains_node(node)
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot query front for node, front doesn't exist."));
        }
        while (node.parentId && node.parentId !== id)
        {
            node = (await browser.bookmarks.get(node.parentId))[0];
        }
        return node.parentId && node.parentId === id;
    }
    /// Returns true iff a descendant of the folder contains the specified URL.
    /// Rejects if the folder does not exist.
    async function contains_url(url)
    {
        if (!exists())
        {
            return Promise.reject(new Error("Cannot query front for URL, front doesn't exist."));
        }
        const nodes = await browser.bookmarks.search({ url: url });
        for (let i = 0; i < nodes.length; ++i)
        {
            if (await contains_node(nodes[i])) { return true; }
        }
        return false;
    }

    define(["scripts/utilities/storage"],
           storage_module =>
           {
                storage = storage_module;

                return {
                            get_id:     get_id,
                            get_node:   get_node,
                            get_tree:   get_tree,
                            get_parent: get_parent,

                            exists: exists,

                            create: create,
                            remove: remove,

                            add: add,

                            contains_node: contains_node,
                            contains_url:  contains_url
                        };
           });
})();
