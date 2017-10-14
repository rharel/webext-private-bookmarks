(function()
{
    /// Clamps the specified value onto the specified interval [min, max].
    ///
    /// Precondition: min <= max
    function clamp(value, min, max)
    {
        if (value < min) { value = min; }
        if (value > max) { value = max; }

        return value;
    }

    define({ clamp: clamp });
})();
