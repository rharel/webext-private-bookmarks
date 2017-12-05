(function()
{
    /// Imported from other modules.
    let domanip;

    /// Invoked when transitioning out of this panel.
    let transition_to;

    /// Contains DOM elements. Populated by initialize().
    const DOM = { setup_password_button: null };

    /// Sets up a new password for the user.
    function setup_password()
    {
        transition_to("password_setup",
        {
            on_success: () =>
            {
                transition_to("success",
                {
                    details: browser.i18n.getMessage("password_setup_complete"),
                    transition:
                    {
                        id: "main_menu",
                        label: browser.i18n.getMessage("go_to_main_menu_command")
                    }
                });
            }
        });
    }

    /// Invoked when this panel is activated.
    function on_activate()
    {
        domanip.enable(DOM.setup_password_button);

        DOM.setup_password_button.focus();
    }
    /// Invoked when this panel is deactivated.
    function on_deactivate() { domanip.disable(DOM.setup_password_button); }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        DOM.setup_password_button.addEventListener("click", setup_password);
    }

    define(["scripts/utilities/dom_manipulation"],
           dom_module =>
           {
               domanip = dom_module;

               domanip.when_ready(initialize);

               return   {
                            ID: "get_started",
                            TITLE: browser.i18n.getMessage("get_started_title"),

                            on_activate:   on_activate,
                            on_deactivate: on_deactivate,
                            on_transition: handler => { transition_to = handler; }
                        };
           });
})();
