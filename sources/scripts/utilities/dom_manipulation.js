(function()
{
    /// Disables the specified element and styles it accordingly.
    function disable(element, do_deactivate = false)
    {
        element.setAttribute("disabled", "true");
        element.classList.add("disabled");

        if (do_deactivate) { element.style.display = "none"; }
    }
    /// Enables the specified element and styles it accordingly.
    function enable(element, do_activate = false)
    {
        element.removeAttribute("disabled");
        element.classList.remove("disabled");

        if (do_activate) { element.style.display = "flex"; }
    }

    /// Populates the specified object with elements from the page.
    /// Every key is treated as an identifier of an element (with hyphens replaced by underscores).
    /// Keys are associated with their respective elements.
    ///
    /// Example:
    ///     elements["element_id"] = document.getElementById("element-id");
    function populate(elements)
    {
        for (const key of Object.keys(elements))
        {
            const id = key.replace(/_/g, "-");
            elements[key] = document.getElementById(id);
        }
    }

    define({
                disable: disable,
                enable:  enable,

                populate: populate
           });
})();
