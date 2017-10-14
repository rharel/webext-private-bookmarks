(function()
{
    /// Loads the value associated with the specified key asynchronously.
    /// Resolves to the associated value if it exists. If not, resolves to null.
    function load(key)
    {
        return browser.storage.local.get(key).then(results =>
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
        return browser.storage.local.set(item);
    }
    /// Removes the specified key and associated value asynchronously.
    function remove(key) { return browser.storage.local.remove(key); }

    define({
                load:   load,
                save:   save,
                remove: remove
           });
})();
