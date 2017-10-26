(function()
{
    /// The folder's display name.
    const TITLE = browser.i18n.getMessage("extension_name");

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
        return (await browser.bookmarks.getSubTree(id))[0];
    }

    /// Creates the folder (it is empty) and returns its node.
    /// Rejects if the folder already exists.
    async function create()
    {
        if (exists())
        {
            return Promise.reject(new Error("Cannot create front when it already exists."));
        }

        const node = await browser.bookmarks.create({ title: TITLE });
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
        try           { await browser.bookmarks.removeTree(id); }
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
            parentId: front.id,
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
            node = await browser.bookmarks.get(node.parentId);
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

    define({
                get_id:   get_id,
                get_node: get_node,

                exists: exists,

                create: create,
                remove: remove,

                add: add,

                contains_node: contains_node,
                contains_url:  contains_url
           });
})();
