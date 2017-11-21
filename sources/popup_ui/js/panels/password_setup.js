(function()
{
    /// Set in define().
    let bookmarks, domanip, security;

    /// Invoked when transitioning out of this panel.
    let transition_to;
    /// An (optional) old hashed password to replace. If this is null or undefined, a data clear
    /// will ensue upon confirmation of the new password.
    let old_hashed_password;
    /// Callbacks for when the setup is respectively successful/cancelled.
    let on_success, on_cancellation;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        password_requirements: null,

        new_password_input: null,
        new_password_validation_icon: null,

        repeated_new_password_input: null,
        repeated_new_password_validation_icon: null,

        confirm_new_password_button: null,
        cancel_password_setup_button: null,
    };

    /// Clears sensitive data from fields/variables.
    function clear_sensitive_data()
    {
        old_hashed_password = null;

        DOM.new_password_input.value          = "";
        DOM.repeated_new_password_input.value = "";
    }

    /// Validates the password field's value.
    /// Returns true iff it is valid.
    function validate_password()
    {
        const icon     = DOM.new_password_validation_icon;
        const password = DOM.new_password_input.value;

        icon.style.visibility = "visible";

        if (security.is_valid_password(password))
        {
            icon.src = "/icons/main/correct_white.svg";
            return true;
        }
        else
        {
            icon.src = "/icons/main/incorrect_white.svg";
            return false;
        }
    }
    /// Validates the repeated password field's value.
    /// Returns true iff it is valid.
    function validate_repeated_password()
    {
        const icon              = DOM.repeated_new_password_validation_icon;
        const password          = DOM.new_password_input.value;
        const repeated_password = DOM.repeated_new_password_input.value;

        icon.style.visibility = "visible";

        if (validate_password() &&
            repeated_password === password)
        {
            icon.src = "/icons/main/correct_white.svg";
            return true;
        }
        else
        {
            icon.src = "/icons/main/incorrect_white.svg";
            return false;
        }
    }

    /// Enables/disables the confirmation button based on the validity of the password fields.
    function update_confirmation_button_status()
    {
        const is_valid_password          = validate_password(),
              is_valid_repeated_password = validate_repeated_password();

        if (is_valid_password && is_valid_repeated_password)
        {
            domanip.enable(DOM.confirm_new_password_button);
            DOM.confirm_new_password_button.style.visibility = "visible";
        }
        else
        {
            domanip.disable(DOM.confirm_new_password_button);
            DOM.confirm_new_password_button.style.visibility = "hidden";
        }
    }

    /// Confirms the password fields' values and proceeds.
    async function confirm()
    {
        // Double check everything is as expected.
        if (!validate_password()       ||
            !validate_repeated_password())
        {
            return;
        }
        try
        {
            const new_password        = DOM.new_password_input.value;
            const new_hashed_password = await security.hash(new_password);

            let setting_up;
            if (old_hashed_password)
            {
                setting_up = bookmarks.change_authentication(
                    old_hashed_password,
                    new_hashed_password
                );
            }
            else { setting_up = bookmarks.setup(new_hashed_password); }

            transition_to("on_hold");
            await new Promise(resolve => { setTimeout(resolve, 1000); });
            await setting_up;

            on_success(old_hashed_password, new_hashed_password);
        }
        catch (error)
        {
            transition_to("error",
            {
                title: `Error during password ${old_hashed_password ? "change" : "setup"}`,
                message: error.message
            });
        }
        finally { clear_sensitive_data(); }
    }
    /// Cancels password setup.
    function cancel()
    {
        clear_sensitive_data();
        on_cancellation();
    }

    /// Invoked when this panel is activated.
    function on_activate(options)
    {
        old_hashed_password = options.old_hashed_password;
        on_success          = options.on_success;
        on_cancellation     = options.on_cancellation;

        if (on_cancellation) { domanip.enable(DOM.cancel_password_setup_button, true); }
        else { domanip.disable(DOM.cancel_password_setup_button, true); }

        update_confirmation_button_status();

        DOM.new_password_input.focus();
    }
    /// Invoked when this panel is deactivated.
    function on_deactivate()
    {
        clear_sensitive_data();

        domanip.disable(DOM.confirm_new_password_button);
        domanip.disable(DOM.cancel_password_setup_button, true);
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);

        DOM.password_requirements.textContent = await security.get_password_description();
        {
            const {minimum, maximum} = await security.get_password_length();

            [DOM.new_password_input,
             DOM.repeated_new_password_input]
            .forEach(element =>
            {
                element.setAttribute("minlength", minimum.toString());
                element.setAttribute("maxlength", maximum.toString());
            });
        }

        DOM.new_password_input
            .addEventListener("input", update_confirmation_button_status);
        DOM.repeated_new_password_input
            .addEventListener("input", update_confirmation_button_status);

        DOM.confirm_new_password_button.addEventListener("click", confirm);
        DOM.cancel_password_setup_button.addEventListener("click", cancel);

        update_confirmation_button_status();
    }

    define(["scripts/interaction/bookmarks_interface",
            "scripts/interaction/security",
            "scripts/utilities/dom_manipulation"],
           (bookmarks_module, security_module, dom_module) =>
           {
               bookmarks = bookmarks_module;
               security = security_module;
               domanip = dom_module;

               initialize();

               return   {
                            ID: "password_setup",
                            TITLE: browser.i18n.getMessage("password_setup_title"),

                            on_activate:   on_activate,
                            on_deactivate: on_deactivate,
                            on_transition: handler => { transition_to = handler; }
                        };
           });
})();
