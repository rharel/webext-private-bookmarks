(function()
{
    /// Just a shorthand.
    const storage = browser.storage.local;

    /// Gets the number of bytes in use taken up by essential data in storage. Right now, essential
    /// data equals the back folder and configuration.
    async function get_essential_bytes_in_use()
    {
        // FIXME when getBytesInUse() is implemented in Firefox.
        // return storage.getBytesInUse(["back_folder", "configuration"]);

        const back_folder   = await load("back_folder");
        const configuration = await load("configuration");

        const text_encoder = new TextEncoder();
        function size_in_bytes(object) { return text_encoder.encode(object).length; }

        return size_in_bytes(back_folder) +
               size_in_bytes(configuration);
    }

    /// Loads the value associated with the specified key asynchronously.
    /// Resolves to the associated value if it exists. If not, resolves to null.
    function load(key)
    {
        return storage.get(key).then(results =>
        {
            if (results.hasOwnProperty(key))
            {
                return results[key];
            }
            else { return null; }
        });
    }
    /// Associates the specified value to the specified key and saves it asynchronously.
    function save(key, value)
    {
        const item = {}; item[key] = value;
        return storage.set(item);
    }
    /// Removes the specified key and associated value asynchronously.
    function remove(key) { return storage.remove(key); }

    define({
                get_essential_bytes_in_use: get_essential_bytes_in_use,

                load:   load,
                save:   save,
                remove: remove
           });
})();
