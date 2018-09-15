"use strict";

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
        /// Date of last backup reminder.
        LastBackupReminderDate: "last_backup_reminder_date"
    };

    /// A private encoder for this module.
    const text_encoder = new TextEncoder();

    /// Computes the size of the specified object in bytes.
    ///
    /// \returns
    ///     Zero if undefined or null, and otherwise the length in bytes
    ///     of an encoded version of the object.
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
    function Handle(area_name)
    {
        this.area = browser.storage[area_name];
    }
    Handle.prototype =
    {
        /// Indicates whether there is any data in storage.
        is_empty: async function()
        {
            const all_data = await this.area.get(null);
            return Object.keys(all_data).length === 0;
        },

        /// Gets the number of bytes in use.
        get_bytes_in_use: async function()
        {
            // FIXME when getBytesInUse() is implemented in Firefox.
            // return storage.getBytesInUse(null);

            const all_data = await this.area.get(null);
            return size_in_bytes(all_data);
        },

        /// Loads the value associated with the specified key.
        ///
        /// \returns
        ///     The associated value if it exists, and null otherwise.
        load: async function(key)
        {
            const results = await this.area.get(key);

            if (results.hasOwnProperty(key)) { return results[key]; }
            else                             { return null; }
        },
        /// Loads the values associated with the specified keys.
        load_all: async function(keys)
        {
            const results = await this.area.get(keys);
            keys.forEach(key =>
            {
                if (!results.hasOwnProperty(key)) { results[key] = null; }
            });
            return results;
        },

        /// Associates the specified value with the specified key and saves it.
        save: async function(key, value)
        {
            const item = {}; item[key] = value;
            await this.area.set(item);
        },
        /// Associates the specified keys to the specified values and saves them.
        save_all: async function(key_value_mapping) { await this.area.set(key_value_mapping); },

        /// Removes the specified key and associated value.
        remove:     async function(key)  { await this.area.remove(key); },
        /// Removes the specified keys and associated values.
        remove_all: async function(keys) { await this.area.remove(keys); }
    };

    /// The two main handles to storage.
    const local        = new Handle("local"),
          synchronized = new Handle("sync");

    /// Synchronized storage capacity in bytes.
    ///
    /// Technically, Firefox allows for 100KB. But, we leave a 20% margin
    /// in case an internal extension mechanisms will require that space
    /// in the future.
    synchronized.CAPACITY_BYTES = 80000;

    /// Loads the value associated with the specified key.
    /// Resolves to the associated value if it exists. If not, resolves to null.
    async function load(key) { return await local.load(key); }
    /// Associates the specified value to the specified key and saves it.
    async function save(key, value) { await local.save(key, value); }
    /// Removes the specified key and associated value.
    async function remove(key) { await local.remove(key); }

    /// Initializes this module.
    async function initialize()
    {
        if (await local.load(Key.Configuration) === null)
        {
            await local.save(
                Key.Configuration,
                configuration.create()
            );
        }
    }

    define(["scripts/meta/configuration"], configuration_module =>
    {
        configuration = configuration_module;
        return {
            Key: Key,

            local:        local,
            synchronized: synchronized,

            initialize: initialize,

            load:   load,
            save:   save,
            remove: remove
        };
    });
})();
