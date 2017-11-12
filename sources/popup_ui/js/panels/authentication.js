(function()
{
    /// Set in define().
    let bookmarks, domanip, security;

    /// Invoked when transitioning out of this panel.
    let transition_to;
    /// Callbacks for when the authentication is respectively accepted/cancelled.
    let on_acceptance, on_cancellation;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        authentication_message:        null,
        authentication_password_input: null,
        confirm_authentication_button: null,
        cancel_authentication_button:  null
    };

    /// Clears sensitive data from fields/variables.
    function clear_sensitive_data() { DOM.authentication_password_input.value = ""; }

    /// Indicates to the user that an authentication attempt has been denied.
    function deny()
    {
        DOM.authentication_password_input.classList.remove("animated");
        setTimeout(() => { DOM.authentication_password_input.classList.add("animated") }, 50);
    }

    /// Authenticates the entered password.
    async function authenticate()
    {
        const password = DOM.authentication_password_input.value;

        if (!security.is_valid_password(password)) { deny(); return; }
        try
        {
            const hashed_password = await security.hash(password);
            if (await bookmarks.authenticate(hashed_password))
            {
                on_acceptance(hashed_password);
            }
            else { deny(); }
        }
        catch (error)
        {
            transition_to("error",
            {
                title: "Error during authentication",
                message: error.message
            });
        }
        finally { clear_sensitive_data(); }
    }

    /// Invoked when this panel is activated.
    function on_activate(options)
    {
        DOM.authentication_message.textContent = options.message;

        on_acceptance   = options.on_acceptance;
        on_cancellation = options.on_cancellation;

        domanip.enable(DOM.confirm_authentication_button);
        domanip.enable(DOM.cancel_authentication_button);

        DOM.authentication_password_input.focus();
    }
    /// Invoked when this panel is deactivated.
    function on_deactivate()
    {
        clear_sensitive_data();

        DOM.authentication_password_input.classList.remove("animated");

        domanip.disable(DOM.confirm_authentication_button);
        domanip.disable(DOM.cancel_authentication_button);
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        DOM.authentication_password_input
            .setAttribute("minlength", security.PASSWORD_LENGTH.minimum.toString());
        DOM.authentication_password_input
            .setAttribute("maxlength", security.PASSWORD_LENGTH.maximum.toString());

        DOM.authentication_password_input.addEventListener("keydown", event =>
        {
            // Authenticate on enter.
           if (event.keyCode === 13) { authenticate(); }
        });
        DOM.confirm_authentication_button.addEventListener("click", authenticate);
        DOM.cancel_authentication_button.addEventListener("click", () => { on_cancellation(); });
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
                            ID: "authentication",
                            TITLE: browser.i18n.getMessage("authentication_title"),

                            on_activate:   on_activate,
                            on_deactivate: on_deactivate,
                            on_transition: handler => { transition_to = handler; },
                        };
           });
})();
