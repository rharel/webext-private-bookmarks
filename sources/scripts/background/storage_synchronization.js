(function()
{
    /// Imported from other modules.
    let Key, local, storage, synchronized;

    /// Assigned the most up to date configuration options.
    let options;

    /// Determines whether two specified values stringify into the same JSON representation.
    function json_equals(first, second)
    {
        return JSON.stringify(first) ===
               JSON.stringify(second);
    }

    /// Copies data from the specified source to the specified target storage area asynchronously.
    /// Only those entries with different values at the target are copied over.
    async function copy(keys, source, target)
    {
        if (await local.get_bytes_in_use() >
            synchronized.CAPACITY_BYTES)
        {
            return;
        }
        
        const insertions = {};
        const deletions  = [];

        const source_values = await source.load_all(keys),
              target_values = await target.load_all(keys);

        keys.forEach(key =>
        {
            const source_value = source_values[key],
                  target_value = target_values[key];

            if (json_equals(source_value, target_value)) { return; }

            if (source_value === null) { deletions.push(key); }
            else                       { insertions[key] = source_value; }
        });

        for (const key in insertions) { console.log(`${target.area_name} += ${key}`); }
        for (const key of deletions)  { console.log(`${target.area_name} -= ${key}`); }

        const copying = [];
        if (Object.keys(insertions).length > 0) { copying.push(target.save_all(insertions));  }
        if (deletions.length > 0)               { copying.push(target.remove_all(deletions)); }

        return Promise.all(copying);
    }

    /// Pulls data from synchronized to local storage asynchronously.
    function pull(keys) { return copy(keys, synchronized, local); }
    /// Pushes data from local to synchronized storage asynchronously.
    function push(keys) { return copy(keys, local, synchronized); }

    /// Pulls all data from synchronized to local storage asynchronously.
    function pull_all() { return pull(Object.values(Key)); }
    /// Pushes all data from local to synchronized storage asynchronously.
    function push_all() { return push(Object.values(Key)); }

    /// Invoked when sync was enabled on this device. Pushes local data to synchronized storage.
    function on_internal_enable()
    {
        console.log("Sync was enabled on this device.");
        return push_all();
    }
    /// Invoked when sync was enabled on this device. Pulls synchronized data to local storage.
    function on_external_enable()
    {
        console.log("Sync was enabled on another device.");
        return pull_all();
    }

    /// Invoked when sync was disabled on this device. Clears synchronized data.
    function on_internal_disable()
    {
        console.log("Sync was disabled on this device.");
        return synchronized.remove_all(Object.values(Key));
    }
    /// Invoked when sync was disabled from another device. Turns on sync in local configuration.
    function on_external_disable()
    {
        console.log("Sync was disabled on another device.");
        options.do_sync_data_across_devices = false;
        return local.save(Key.Configuration, options);
    }

    async function handle_changes(changes, area)
    {
        if (area === "local" &&
            changes.hasOwnProperty(Key.Configuration))
        {
            options = changes[Key.Configuration].newValue;
        }

        const synchronized_is_empty = await synchronized.is_empty();

        if (area === "local")
        {
            if (changes.hasOwnProperty(Key.Configuration))
            {
                const old_value = changes[Key.Configuration].oldValue,
                      new_value = changes[Key.Configuration].newValue;

                if (old_value.do_sync_data_across_devices &&
                   !new_value.do_sync_data_across_devices &&
                   !synchronized_is_empty)
                {
                    on_internal_disable();
                    return;
                }
                else if (!old_value.do_sync_data_across_devices &&
                          new_value.do_sync_data_across_devices &&
                          synchronized_is_empty)
                {
                    on_internal_enable();
                    return;
                }
            }
            if (options.do_sync_data_across_devices)
            {
                console.log("Pushing...");
                push(Object.keys(changes));
            }
        }
        else if (area === "sync")
        {
            if (options.do_sync_data_across_devices &&
                synchronized_is_empty)
            {
                on_external_disable();
                return;
            }
            else if (!options.do_sync_data_across_devices &&
                     !synchronized_is_empty)
            {
                on_external_enable();
                return;
            }
            else if (options.do_sync_data_across_devices)
            {
                console.log("Pulling...");
                pull(Object.keys(changes));
            }
        }
    }

    /// Initializes this module.
    async function initialize()
    {
        Key          = storage.Key;
        local        = storage.local;
        synchronized = storage.synchronized;

        options = await local.load(Key.Configuration);
        if (options.do_sync_data_across_devices)
        {
            if (await synchronized.is_empty()) { on_external_disable(); }
            else                               { pull_all(); }
        }
        else if (!(await synchronized.is_empty())) { on_external_enable(); }

        browser.storage.onChanged.addListener(handle_changes);
    }

    require(["scripts/utilities/storage"],
            storage_module =>
            {
                storage = storage_module;

                initialize();
            });
})();
