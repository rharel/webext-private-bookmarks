(function()
{
    const COMPONENT_DELIMITER = ";";
    const KEY_VALUE_DELIMITER = "=";

    /// Parses the specified query string as a key-value map.
    ///
    /// Whitespace surrounding the query is ignored.
    /// Key-value pairs are separated by semicolons ';'.
    /// Keys and values are separated by equal signs '='.
    /// Values are interpreted as JSON.
    /// Keys without an accompanying value are interpreted as set boolean flags.
    function parse_query(query)
    {
        query = query.trim();

        const result = {};
        query.split(COMPONENT_DELIMITER).forEach(component =>
        {
            const [key, value] = component.split(KEY_VALUE_DELIMITER);

            if (value) { result[key] = JSON.parse(value); }
            else { result[key] = true; }
        });
        return result;
    }

    /// Parses the window location query string as a key-value map.
    /// See parse_query() for details.
    function parse_location_query()
    {
        const query = window.location.search.slice(1);  // Slice '?' prefix away.
        return parse_query(query);
    }

    define({ parse_location_query: parse_location_query });
})();
