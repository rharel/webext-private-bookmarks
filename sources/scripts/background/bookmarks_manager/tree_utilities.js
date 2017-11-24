(function()
{
    /// Determines whether the specified node is a separator.
    function is_separator(node)
    {
        return node.hasOwnProperty("type") &&
               node.type === "separator";   // .type was introduced in FF 57
    }
    /// Determines whether the specified node is a folder.
    function is_folder(node) { return node.hasOwnProperty("children"); }

    /// Computes the number of nodes in the specified tree.
    function compute_size(node)
    {
        if (!is_folder(node)) { return 1; }
        else
        {
            return node.children.reduce((sum, child) => sum + compute_size(child), 1)
        }
    }
    /// Removes properties we are not interested in saving from the specified tree recursively.
    function prune(node)
    {
        delete node.index;
        delete node.dateAdded;
        delete node.dateGroupModified;
        delete node.unmodifiable;

        if (is_folder(node)) { node.children.forEach(child => prune(child)); }

        return node;
    }
    /// Imports all descendants of the specified source node to their respective position in the
    /// specified target node. The nodes are bookmark tree nodes.
    ///
    /// Invokes the specified callback for each new node created.
    async function duplicate(source_root, target_root, on_created)
    {
        if (!source_root.children) { return; }

        // This object maps source node identifiers to their target nodes.
        const target_by_id = {}; target_by_id[source_root.id] = target_root;

        // Traverse source using iterative DFS and import nodes.
        // Since the target root already exists, we skip a visit to the source root and begin our
        // traversal with its children.
        //
        // Also, since browser.bookmarks.create() prepends new nodes rather than appends, to
        // preserve original ordering we visit children in their reverse order.
        const stack = source_root.children.slice().reverse();
        while (stack.length !== 0)
        {
            const source = stack.pop(),
                  target_parent = target_by_id[source.parentId];

            const target_properties = { parentId: target_parent.id };
            if (is_separator(source))
            {
               target_properties.type = "separator";
            }
            else
            {
                target_properties.title = source.title;
                target_properties.url   = source.url;
            }
            target_by_id[source.id] = await browser.bookmarks.create(target_properties);

            on_created();

            if (is_folder(source))
            {
                // Since browser.bookmarks.create() prepends new nodes rather than appends, to
                // preserve original ordering we visit children in their reverse order.
                const children = source.children;
                for (let i = children.length - 1; i >= 0; --i) { stack.push(children[i]); }
            }
        }
    }

    define({
                compute_size: compute_size,
                duplicate: duplicate,
                prune: prune
           })
})();
