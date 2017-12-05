(function()
{
    /// A private encoder for this module.
    const text_encoder = new TextEncoder();

    /// Computes the size of the specified object in bytes. If the object is not a string, it is
    /// converted into JSON before computation.
    function size_in_bytes(object)
    {
        if (typeof object !== "string" &&
            !(object instanceof String))
        {
            object = JSON.stringify(object);
        }
        return text_encoder.encode(object).length;
    }

    define({ size_in_bytes: size_in_bytes });
})();
