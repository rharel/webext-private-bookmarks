(function()
{
    /// The message displayed upon success.
    const SUCCESS_MESSAGE = browser.i18n.getMessage("success_title");

    /// Creates a new message controller for the specified container.
    ///
    /// The container is assumed to have at least one element child to bear message text, and
    /// optionally at two buttons that follow.
    function Controller(container)
    {
        this.container = container;
        this.message   = container.firstElementChild;

        if (container.childElementCount > 1)
        {
            this.first_button =
            {
                element: container.children[1],
                click_listener: null
            };
        }
        if (container.childElementCount > 2)
        {
            this.second_button =
            {
                element: container.children[2],
                click_listener: null
            };
        }
    }
    Controller._enable_button = function(button, on_click)
    {
        button.element.addEventListener("click", on_click);
        button.click_listener = on_click;

        button.element.style.display = "flex";
    };
    Controller._disable_button = function(button)
    {
        button.element.removeEventListener("click", button.click_listener);
        button.click_listener = null;

        button.element.style.display = "none";
    };
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
            this._prepare_display("", "");
            this.hide();
        },
        /// Displays and retrieves user response to a yes/no question.
        confirm: function(text)
        {
            this._prepare_display("warning", text);

            const getting_user_response = new Promise(resolve =>
            {
                const yes_button = this.first_button;
                const no_button  = this.second_button;

                function on_click_yes() { this.clear(); resolve(true);  }
                function on_click_no()  { this.clear(); resolve(false); }

                Controller._enable_button(yes_button, on_click_yes.bind(this));
                Controller._enable_button(no_button, on_click_no.bind(this));
            });

            this.show();

            return getting_user_response;
        },
        /// Displays and logs an error message with the specified text and optional debug info onto
        /// the specified container.
        error: function(text, debug_info)
        {
            console.error(`${text}\n` + `Debug info: ${debug_info}`);

            this._prepare_display("error", text);

            if (debug_info) { this.container.title = debug_info; }

            this.show();
        },
        /// Displays a neutral information message with the specified text.
        info: function(text)
        {
            this._prepare_display("info", text);
            this.show();
        },
        /// Displays a success message.
        success: function()
        {
            this._prepare_display("success", SUCCESS_MESSAGE);
            this.show();
        },

        _disable_buttons: function()
        {
            if (this.first_button)  { Controller._disable_button(this.first_button);  }
            if (this.second_button) { Controller._disable_button(this.second_button); }
        },
        _prepare_display: function(style_class, text)
        {
            this.container.className = `${style_class} message-container`;
            this.container.removeAttribute("title");

            this.message.textContent = text;

            this._disable_buttons();
        }
    };
    define({ Controller: Controller });
})();
