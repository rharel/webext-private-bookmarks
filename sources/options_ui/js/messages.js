(function()
{
    /// Creates a new message controller for the specified container.
    ///
    /// The container is assumed to have at least one element child to bear message text, and
    /// optionally at two buttons that follow.
    function Controller(container)
    {
        this.container = container;
        this.message   = container.firstElementChild;

        if (container.childElementCount > 1) { this.first_button  = container.children[1]; }
        if (container.childElementCount > 2) { this.second_button = container.children[2]; }
    }
    Controller.prototype =
    {
        /// Reveals the specified message container.
        show: function()
        {
            this.container.style.display = "flex";
            this.container.classList.add("fading-in");
        },
        /// Hides the specified message container.
        hide: function()
        {
            this.container.style.display = "none";
            this.container.classList.remove("fading-in");
        },

        /// Clears the specified message container and hides it.
        clear: function()
        {
            this.container.removeAttribute("title");
            this.message.textContent = "";

            this.hide();
        },
        /// Displays and logs an error message with the specified text and optional debug info onto
        /// the specified container.
        error: function(text, debug_info)
        {
            console.error(`${text}\n` +
                          `Debug info: ${debug_info}`);

            this.container.className = "error message-container";
            this.message.textContent = text;

            if (debug_info) { this.container.title = debug_info; }

            this.show();
        }
    };
    define({ Controller: Controller });
})();
