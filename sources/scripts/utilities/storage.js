(function()
{
    /// Imported from other modules.
    let configuration;

    /// Keys for data in storage.
    const Key =
    {
        /// Data of the back folder (where encrypted bookmarks are stored).
        /// Points to an object { signature: string, bookmarks: string }.
        Back: "back_folder",
        /// The extension's configuration options and user preferences.
        /// See scripts/meta/configuration.js for the layout of its value.
        Configuration: "configuration",
        /// Indicates what type of deployment this release was part of (install/update). Its value
        /// (string) exists only up until the first user interaction with the extension proceeding
        /// the deployment.
        DeploymentType: "deployment_type",
        /// The identifier of the front folder in the browser's bookmark tree. Created during unlock
        /// and deleted during lock. If the extension is suspended while unlocked, then the next
        /// time it starts up, the leftover front folder is deleted immediately, identified by the
        /// value of this key.
        FrontID: "front_folder_id",
        /// The location in which the front should be spawned at.
        /// It is an object { parent_id: string, index: integer }.
        FrontSpawnLocation: "front_folder_spawn_location",
        /// Maps synchronized keys to their last modification date.
        SyncRecords: "sync_records"
    };

    /// Keys for values that should be synced (when sync is enabled).
    const KEYS_TO_SYNC = [
        Key.Back,
        Key.Configuration,
        Key.FrontID,
        Key.FrontSpawnLocation
    ];

    /// A private encoder for this module.
    const text_encoder = new TextEncoder();

    /// Computes the size of the specified object in bytes. If the object is undefined or null,
    /// returns 0. Otherwise, if the object is not a string, it is converted into JSON before
    /// computation.
    function size_in_bytes(object)
    {
        if (typeof object === "undefined" || object === null )
        {
            return 0;
        }
        if (typeof object !== "string" && !(object instanceof String))
        {
            object = JSON.stringify(object);
        }
        return text_encoder.encode(object).length;
    }

    /// Creates a storage interface for the specified area.
    function Handle(area) { this.area = area; }
    Handle.prototype =
    {
        /// Indicates whether there is any data in storage.
        is_empty: async function()
        {
            return Object.keys(await this.area.get(null)).length === 0;
        },

        /// Gets the number of bytes in use.
        get_bytes_in_use: async function()
        {
            // FIXME when getBytesInUse() is implemented in Firefox.
            // return storage.getBytesInUse(null);

            return size_in_bytes(await this.area.get(null));  // Null gets entire contents.
        },
        /// Gets the number of bytes in use taken up by essential data. Right now, that equals the
        /// back folder and configuration.
        get_to_be_synced_bytes_in_use: async function()
        {
            // FIXME when getBytesInUse() is implemented in Firefox.
            // return storage.getBytesInUse(KEYS_TO_SYNC);

            let sum = 0;
            KEYS_TO_SYNC.forEach(async key =>
                sum += size_in_bytes(await this.load(key))
            );
            return sum;
        },

        /// Loads the value associated with the specified key.
        /// Resolves to the associated value if it exists. If not, resolves to null.
        load: async function(key)
        {
            const results = await this.area.get(key);

            if (results.hasOwnProperty(key)) { return results[key]; }
            else                             { return null; }
        },
        /// Loads the values associated with the specified keys.
        load_all: function(keys) { return this.area.get(keys); },

        /// Associates the specified value to the specified key and saves it asynchronously.
        save: function(key, value)
        {
            const item = {}; item[key] = value;
            return this.area.set(item);
        },
        /// Associates the specified keys to the specified values and saves them asynchronously.
        save_all: function(key_value_mapping) { return this.area.set(key_value_mapping); },

        /// Removes the specified key and associated value asynchronously.
        remove:     function(key)  { return this.area.remove(key); },
        /// Removes the specified keys and associated values asynchronously.
        remove_all: function(keys) { return this.area.remove(keys); }
    };

    /// The two main handles to storage.
    const local        = new Handle(browser.storage.local),
          synchronized = new Handle(browser.storage.sync);

    /// Synchronized storage capacity in bytes.
    /// Technically, Firefox allows for 100KB. But, we leave a 20% margin in case internal extension
    /// mechanisms will require that space in the future.
    synchronized.CAPACITY_BYTES = 80000;

    /// Loads the value associated with the specified key asynchronously.
    /// Resolves to the associated value if it exists. If not, resolves to null.
    function load(key)        { return local.load(key); }
    /// Associates the specified value to the specified key and saves it asynchronously.
    function save(key, value) { return local.save(key, value); }
    /// Removes the specified key and associated value asynchronously.
    function remove(key)      { return local.remove(key); }

    /// Creates initial synchronization records.
    function create_sync_records()
    {
        const records = {};
        const now     = Date.now();

        KEYS_TO_SYNC.forEach(key => records[key] = now);

        return records;
    }

    /// Assigned true iff vital local keys are either initialized or about to be.
    let invoked_vital_local_key_initialization = false;
    /// Initializes vital local keys. These are keys that are expected to always exist in local
    /// storage.
    async function initialize_vital_local_keys()
    {
        if (invoked_vital_local_key_initialization) { return; }

        invoked_vital_local_key_initialization = true;

        // Maps with their initializer methods.
        const vital_local_keys = {};
        vital_local_keys[Key.Configuration] = configuration.create;
        vital_local_keys[Key.SyncRecords]   = create_sync_records;

        const initializing = [];
        for (const key in vital_local_keys)
        {
            if ((await local.load(key)) === null)
            {
                const initial_value = vital_local_keys[key]();
                initializing.push(local.save(key, initial_value));
            }
        }
        return Promise.all(initializing);
    }

    define(["scripts/meta/configuration"],
           configuration_module =>
           {
               configuration = configuration_module;

               return   {
                           Key:          Key,
                           KEYS_TO_SYNC: KEYS_TO_SYNC,

                           local:        local,
                           synchronized: synchronized,

                           initialize: initialize_vital_local_keys,

                           load:   load,
                           save:   save,
                           remove: remove
                        };
           });
})();
