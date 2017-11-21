(function()
{
    /// This module manages two bookmark "folders": one at the extension's local storage
    /// (the "back" folder) and another at the browser's actual bookmark tree (the "front" folder).
    ///
    /// The back folder is encrypted. Initially, the front folder does not exist, this is what we
    /// refer to as a "locked" state. Upon unlocking, the contents of the back are decrypted and
    /// reflected in the creation of the front. Changes to the front cause its contents of to be
    /// serialized, encrypted, and saved to the back, replacing previous data. Upon locking, the
    /// front is removed.
    ///
    /// The user supplies his/her password during unlocking, and its hash is from then on saved in
    /// memory until locking (so that we don't have to ask for it again to encrypt).

    /// Set in define().
    let back, crypto, events, front, tree;

    /// The key used to unlock the back. It is assigned null when locked.
    let back_key = null;
    /// Pops the value of the key variable.
    function pop_key() { const value = back_key; back_key = null; return value; }

    /// Returns true iff bookmarks are unlocked.
    function is_unlocked() { return back_key !== null; }
    /// Returns true iff bookmarks are locked.
    function is_locked()   { return !is_unlocked(); }

    /// Emites an event - only within background page.
    function emit_background_event(type, properties)
    {
        events.emitEvent(type, [properties]);
    }
    /// Emits an event.
    function emit_event(type, properties)
    {
        emit_background_event(type, properties);
        browser.runtime.sendMessage(Object.assign({type: type}, properties));
    }

    /// Clears both front and back folders asynchronously.
    async function clear()
    {
        let clearing = [];

        if (is_unlocked())       { clearing.push(lock()); }
        if (await back.exists()) { clearing.push(back.remove()); }

        return Promise.all(clearing);
    }

    /// Sets up an empty back folder, protected by the specified key.
    /// Clears any front or back folder that already exists.
    async function setup(new_key)
    {
        await clear();

        return back.create(new_key);
    }

    /// Changes the authenticated key to the specified value.
    /// Rejects if the back folder does not exist.
    async function change_authentication(old_key, new_key)
    {
        if (is_unlocked()) { back_key = new_key; }

        return back.change_authentication(old_key, new_key);
    }

    /// True iff a syncing operation is in progress.
    let is_syncing = false;
    /// True iff another syncing operation has been requested while another was already in progress.
    let is_pending_sync = false;
    /// Encrypts contents of the front folder, and saves it to the back.
    /// Rejects if locked.
    async function sync()
    {
        if (is_locked())
        {
            return Promise.reject(new Error("Cannot sync when locked."));
        }

        // This function ensures that at most one syncing operation is active at a time. If another
        // sync is initiated while another is in progress, it is deferred until the end of the
        // first.

        if (is_syncing) { is_pending_sync = true; return; }

        is_syncing = true;
        emit_background_event("busy", true);

        try { await back.write(tree.prune(await front.get_tree()), back_key); }
        finally
        {
            is_syncing = false;
            if (is_pending_sync)
            {
                is_pending_sync = false;
                sync();
            }
            else { emit_background_event("busy", false); }
        }
    }
    /// The sync request's timeout duration (in milliseconds).
    const SYNC_REQUEST_TIMEOUT_DURATION = 1000;
    /// The timeout for a syncing request. See request_sync() for details.
    let sync_request_timeout = null;
    /// To avoid repetitive syncing when many items are moved in/out of the front, we batch these
    /// changes as follows: When a change occurs, a sync is requested via this method. This sets
    /// a delayed timeout for an invocation of sync(). If another change occurs while waiting, the
    /// timeout is reset, so as to avoid calling sync() multiple times. Instead, sync() will be
    /// called once for the whole batch.
    function request_sync()
    {
        if (sync_request_timeout !== null) { clearTimeout(sync_request_timeout); }

        sync_request_timeout = setTimeout(
            () =>
            {
                sync_request_timeout = null;
                sync();
            },
            SYNC_REQUEST_TIMEOUT_DURATION
        );
    }
    /// Contains event listeners that invoke sync().
    const sync_listeners =
    {
        /// Syncs when a descendant of the front is changed.
        on_changed: async id =>
        {
            if (is_locked()) { return; }

            const node = (await browser.bookmarks.get(id))[0];
            if (await front.contains_node(node))
            {
                request_sync();
            }
        },
        /// Syncs when a new descendant of the front is created.
        on_created: async (id, node) =>
        {
            if (is_unlocked() &&
               (await front.contains_node(node)))
            {
                request_sync();
            }
        },
        /// Syncs when a descendant of the front is removed.
        on_removed: async (id, info) =>
        {
            // If the user deletes the front manually, this callback may be invoked wrongly, so make
            // sure that is not the case with the following try-clause:
            try           { await browser.bookmarks.get(front.get_id()); }
            catch (error) { return; }

            if (is_unlocked() &&
               (await front.contains_node(info.node)))
            {
                request_sync();
            }
        },
        /// Syncs when a node is moved into the front.
        on_moved: async (id, info) =>
        {
            if (is_locked()) { return; }

            if (info.parentId    === front.get_id() ||
                info.oldParentId === front.get_id())
            {
                request_sync();
                return;
            }

            const [new_parent, old_parent] = (
                await browser.bookmarks.get([info.parentId, info.oldParentId])
            );
            if ((await front.contains_node(new_parent)) ||
                (await front.contains_node(old_parent)))
            {
                request_sync();
            }
        }
    };
    /// Listens for changes to the front and syncs.
    function enable_dynamic_sync()
    {
        browser.bookmarks.onChanged.addListener(sync_listeners.on_changed);
        browser.bookmarks.onCreated.addListener(sync_listeners.on_created);
        browser.bookmarks.onRemoved.addListener(sync_listeners.on_removed);
        browser.bookmarks.onMoved.addListener(sync_listeners.on_moved);
    }
    /// Undoes the event hookup performed by enable_dynamic_sync().
    function disable_dynamic_sync()
    {
        browser.bookmarks.onChanged.removeListener(sync_listeners.on_changed);
        browser.bookmarks.onCreated.removeListener(sync_listeners.on_created);
        browser.bookmarks.onRemoved.removeListener(sync_listeners.on_removed);
        browser.bookmarks.onMoved.removeListener(sync_listeners.on_moved);
    }

    /// Clears the front.
    /// Rejects if already locked.
    async function lock()
    {
        if (is_locked())
        {
            return Promise.reject(new Error("Cannot lock when already locked."));
        }

        emit_background_event("busy", true);

        pop_key();
        disable_dynamic_sync();

        try { await front.remove(); }
        catch (error)
        {
            console.warn(
                "No front to remove during lock.\n" +
                "Debug info: " + error
            );
        }
        finally
        {
            emit_event("lock");
            emit_background_event("busy", false);
        }
    }
    /// Lock in response to user command.
    browser.commands.onCommand.addListener(command =>
    {
        if (command === "lock") { lock(); }
    });

    /// Decrypts the contents of the back folder and creates a new front to reflect them.
    /// Rejects if unlocked or if the key is not authentic.
    async function unlock(key)
    {
        if (is_unlocked())
        {
            return Promise.reject(new Error("Cannot unlock when already unlocked."));
        }
        if (!(await back.authenticate(key)))
        {
            return Promise.reject(new Error("Cannot unlock with inauthentic key."));
        }

        emit_background_event("busy", true);

        try
        {
            const source = await back.read(key);
            const target = await front.create();

            back_key = key;

            if (source === null)
            {
                // If this is the first unlock there is nothing more to do beyond creating the
                // front's root.
                enable_dynamic_sync();
                emit_event("unlock");
                return;
            }

            const total_node_count = tree.compute_size(source);
            let created_node_count = 1;

            function emit_progress_event()
            {
                emit_event(
                    "unlock-status-update",
                    {
                        index:   created_node_count,
                        current: created_node_count,
                        total:   total_node_count
                    }
                );
            }

            emit_progress_event();
            await tree.duplicate(source, target,
                /* node-creation callback: */ () =>
                {
                    created_node_count += 1;
                    emit_progress_event();
                }
            );
            enable_dynamic_sync();
            emit_event("unlock");
        }
        catch (error)
        {
            // Undo any partial progress:
            pop_key();
            disable_dynamic_sync();
            front.remove();
            throw error;
        }
        finally { emit_background_event("busy", false); }
    }

    define(["libraries/EventEmitter.min",
            "scripts/background/bookmarks_manager/back",
            "scripts/background/bookmarks_manager/backup",
            "scripts/background/bookmarks_manager/front",
            "scripts/background/bookmarks_manager/tree_utilities",
            "scripts/utilities/cryptography"],
           (EventEmitter, back_module, backup_module, front_module, tree_module, cryptography_module) =>
           {
               back = back_module;
               front = front_module;
               tree = tree_module;
               crypto = cryptography_module;

               const this_module =
               {
                    add:  (url, title) => { return front.add(url, title); },
                    contains_url:  url => { return front.contains_url(url); },
                    get_front_id:   () => { return front.get_id(); },

                    needs_setup: async () => { return !(await back.exists()); },
                    authenticate:     key => { return back.authenticate(key); },
                    load:              () => { return back.load(); },

                    events: events = new EventEmitter(),

                    clear: clear,
                    setup: setup,
                    change_authentication: change_authentication,

                    lock:   lock,
                    unlock: unlock,

                    is_locked:   is_locked,
                    is_unlocked: is_unlocked
               };
               return Object.assign(this_module, backup_module);
           });
})();
