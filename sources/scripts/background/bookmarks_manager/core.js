(function()
{
    /// This module manages two bookmark "folders": one at the extension's local storage
    /// (the "back" folder) and another at the browser's actual bookmark tree (the "front" folder).
    ///
    /// The back folder is encrypted. Initially, the front folder does not exist, this is what we
    /// refer to as a "locked" state. Upon unlocking, the contents of the back are decrypted and
    /// reflected in the creation of the front. Changes to the front do not affect the back until a
    /// "lock" operation is initiated. Upon locking, the contents of the front are serialized,
    /// encrypted, and saved to the back, replacing previous data.
    ///
    /// The user supplies his/her password during unlocking, and its hash is from then on saved in
    /// memory until locking (so that we don't have to ask for it again to encrypt).

    /// Set in define().
    let crypto, events, storage;

    /// The display name for the front folder.
    const FRONT_TITLE = browser.i18n.getMessage("extension_name");

    /// The key for the back folder in local storage.
    const BACK_STORAGE_KEY = "back_folder";
    /// We encrypt this signature together with the rest of the data so that we can later quickly
    /// verify that a password is correct.
    const BACK_SIGNATURE = "private_bookmarks@rharel";

    /// Emits an event.
    function emit_event(type, properties)
    {
        events.emitEvent(type);
        browser.runtime.sendMessage(Object.assign({type: type}, properties));
    }

    /// Removes properties we are not interested in saving from the specified bookmarks tree
    /// recursively.
    function prune_tree(node)
    {
        delete node.index;
        delete node.dateAdded;
        delete node.dateGroupModified;
        delete node.unmodifiable;

        if (node.children) { node.children.forEach(child => prune_tree(child)); }

        return node;
    }
    /// Imports all descendants of the specified source node to their respective position in the
    /// specified target node. The nodes are bookmark tree nodes.
    async function duplicate_tree(source_root, target_root)
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

            target_by_id[source.id] = await browser.bookmarks.create(
            {
                parentId: target_parent.id,
                title:    source.title,
                url:      source.url
            });

            if (source.children)
            {
                // Since browser.bookmarks.create() prepends new nodes rather than appends, to
                // preserve original ordering we visit children in their reverse order.
                const children = source.children;
                for (let i = children.length - 1; i >= 0; --i) { stack.push(children[i]); }
            }
        }
    }

    /// Front folder details. If the folder does not currently exist, this is assigned null.
    let front = null;
    /// Clears front folder details variable in memory and returns its former value.
    function pop_front() { const value = front; front = null; return value; }

    /// Returns true iff we are in a locked state, i.e. the front folder does not exist.
    function is_locked()   { return front === null; }
    /// Returns true iff we are in an unlocked state, i.e. the front folder does exist.
    function is_unlocked() { return !is_locked(); }

    /// Loads the back folder asynchronously.
    /// Resolves to an object { signature: DOMString, bookmarks: DOMString } if the folder exists.
    /// If not, resolves to null.
    function load()      { return storage.load(BACK_STORAGE_KEY); }
    /// Saves the specified back folder asynchronously.
    /// Its value should be an object { signature: DOMString, bookmarks: DOMString }.
    function save(value) { return storage.save(BACK_STORAGE_KEY, value); }

    /// Clears both front and back folders asynchronously.
    function clear()
    {
        let clearing = [storage.remove(BACK_STORAGE_KEY)];

        if (is_unlocked())
        {
            clearing.push(
                browser.bookmarks.removeTree(pop_front().id)
                .then(() => emit_event("lock"))
            );
        }

        return Promise.all(clearing);
    }

    /// Resolves to true iff there is no back folder.
    async function needs_setup() { return (await load()) === null; }
    /// Sets up an empty back folder, protected by the specified key.
    async function setup(new_key)
    {
        const encrypted_signature = await crypto.encrypt(BACK_SIGNATURE,       new_key),
              encrypted_bookmarks = await crypto.encrypt(JSON.stringify(null), new_key);

        let settings_up = [
            save({
                    signature: encrypted_signature,
                    bookmarks: encrypted_bookmarks
                 })
        ];
        if (is_unlocked()) { settings_up.push(browser.bookmarks.removeTree(pop_front().id)); }

        return Promise.all(settings_up);
    }

    /// Returns true iff the specified key is authentic.
    async function authenticate(key)
    {
        const data = await load(); if (data === null) { return false; }

        const encrypted_signature = data.signature;
        try
        {
            const decrypted_signature = await crypto.decrypt(
                encrypted_signature.iv,
                encrypted_signature.ciphertext, key
            );
            return decrypted_signature === BACK_SIGNATURE;
        }
        catch (error)
        {
            if (error.name === "OperationError") { return false; }
            else                                 { throw error;  }
        }
    }
    /// Changes the authenticated key to the specified value.
    async function change_authentication(old_key, new_key)
    {
        if (is_unlocked()) { front.key = new_key; return; }

        // Load and decrypt using the old key:
        let bookmarks_json;
        {
            const encrypted_bookmarks = (await load()).bookmarks;
            bookmarks_json = await crypto.decrypt(
                encrypted_bookmarks.iv,
                encrypted_bookmarks.ciphertext, old_key
            );
        }
        // Encrypt using the new key and save:
        const encrypted_signature = await crypto.encrypt(BACK_SIGNATURE, new_key),
              encrypted_bookmarks = await crypto.encrypt(bookmarks_json, new_key);

        return save({
                        signature: encrypted_signature,
                        bookmarks: encrypted_bookmarks
                    });
    }

    /// Encrypts contents of the front folder, saves it to the back, and clears the front.
    /// Returns true iff successful.
    async function lock()
    {
        if (is_locked()) { return false; }

        const {id, key} = pop_front();

        const bookmarks      = (await browser.bookmarks.getSubTree(id))[0],
              bookmarks_json = JSON.stringify(prune_tree(bookmarks));

        const clearing = browser.bookmarks.removeTree(id);

        const encrypted_signature = await crypto.encrypt(BACK_SIGNATURE, key),
              encrypted_bookmarks = await crypto.encrypt(bookmarks_json, key);

        const saving = save({
                                signature: encrypted_signature,
                                bookmarks: encrypted_bookmarks
                            });

        return Promise.all([clearing, saving]).then(() =>
        {
            emit_event("lock");
            return true;
        });
    }
    /// Locks without syncing to the back.
    async function lock_immediately()
    {
        try     { await browser.bookmarks.removeTree(pop_front().id); }
        finally { emit_event("lock"); }
    }
    /// Lock in response to user command.
    browser.commands.onCommand.addListener(command =>
    {
        if (command === "lock") { lock(); }
    });

    /// Decrypts the contents of the back folder and creates a new front to reflect them.
    /// Returns true iff successful.
    async function unlock(key)
    {
        if (is_unlocked() || !(await authenticate(key))) { return false; }

        // Decrypt contents of back folder:
        const encrypted_bookmarks = (await load()).bookmarks;
        const bookmarks_json = await crypto.decrypt(
            encrypted_bookmarks.iv,
            encrypted_bookmarks.ciphertext, key
        );

        // Create and populate the front:
        const source = JSON.parse(bookmarks_json);
        const target = await browser.bookmarks.create({ title: FRONT_TITLE });

        front = { id: target.id, key: key };

        if (source === null)
        {
            // If this is the first unlock there is nothing more to do beyond creating the front's
            // root.
            emit_event("unlock");
            return true;
        }
        try
        {
            await duplicate_tree(source, target);
            emit_event("unlock");
            return true;
        }
        catch (error)
        {
            // Undo any partial progress:
            browser.bookmarks.removeTree(pop_front().id);
            throw error;
        }
    }

    /// Adds a bookmarks to the front.
    /// Rejects if private bookmarks are locked.
    function add(url, title)
    {
        if (is_locked()) { return Promise.reject(); }

        return browser.bookmarks.create({
            parentId: front.id,
            url:      url,
            title:    title
        });
    }

    /// Returns true iff the specified node is privately bookmarked.
    /// Rejects if private bookmarks are locked.
    async function has_node(node)
    {
        if (is_locked()) { return Promise.reject(); }

        while (node.parentId && node.parentId !== front.id)
        {
            node = await browser.bookmarks.get(node.parentId);
        }
        return node.parentId && node.parentId === front.id;
    }
    /// Returns true iff the specified URL is privately bookmarked.
    /// Rejects if private bookmarks are locked.
    async function has_url(url)
    {
        if (is_locked()) { return Promise.reject(); }

        const nodes = await browser.bookmarks.search({ url: url });
        for (let i = 0; i < nodes.length; ++i)
        {
            if (await has_node(nodes[i])) { return true; }
        }
        return false;
    }

    define(["libraries/EventEmitter.min",
            "scripts/utilities/cryptography",
            "scripts/utilities/local_storage"],
           (EventEmitter, cryptography_module, storage_module) =>
           {
                crypto = cryptography_module;
                storage = storage_module;

                return  {
                            get_front_id: () => { return front ? front.id : null; },

                            load: load,

                            clear: clear,

                            needs_setup: needs_setup,
                            setup:       setup,

                            authenticate:          authenticate,
                            change_authentication: change_authentication,

                            lock:             lock,
                            lock_immediately: lock_immediately,

                            unlock: unlock,

                            is_locked:   is_locked,
                            is_unlocked: is_unlocked,

                            add: add,

                            has_node: has_node,
                            has_url:  has_url,

                            events: events = new EventEmitter()
                        };
           });
})();
