(function()
{
    /// Reveals the specified message container.
    function show(container)
    {
        container.style.display = "flex";
        container.classList.add("fading-in");
    }
    /// Hides the specified message container.
    function hide(container)
    {
        container.style.display = "none";
        container.classList.remove("fading-in");
    }

    /// Clears the specified message container and hides it.
    function clear(container)
    {
        container.firstElementChild.textContent = "";
        container.removeAttribute("title");

        hide(container);
    }
    /// Displays and logs an error message with the specified text and optional debug info onto
    /// the specified container.
    function error(container, text, debug_info)
    {
        console.error(`${text}\n` +
                      `Debug info: ${debug_info}`);

        container.className = "error message-container";
        container.firstElementChild.textContent = text;

        if (debug_info) { container.title = debug_info; }

        show(container);
    }

    /// Creates a message controller for the specified container.
    function create_for(container)
    {
        return  {
                    clear: () => clear(container),
                    error: (text, debug_info) => error(container, text, debug_info)
                };
    }
    define({ create_for: create_for });
})();
