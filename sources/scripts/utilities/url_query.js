(function()
{
    const COMPONENT_DELIMITER = ";";
    const KEY_VALUE_DELIMITER = "=";

    /// Parses the query portions of a URL into an object with a key-value mapping.
    function parse(query = null)
    {
        if (query === null)     { query = window.location.search.slice(1).trim(); }
        if (query.length === 0) { return {}; }

        const values = {};
        query.split(COMPONENT_DELIMITER).forEach(component =>
        {
            const [key, json_value] = component.split(KEY_VALUE_DELIMITER);

            // Expect values in json format. Treat value-less components as flags.
            if (json_value) { values[key] = JSON.parse(json_value); }
            else            { values[key] = true; }
        });
        return values;
    }
    define({ parse: parse });
})();
