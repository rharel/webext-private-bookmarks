(function()
{
    /// Set in define().
    let domanip;

    /// Invoked when transitioning out of this panel.
    let transition_to;
    /// Callbacks for when the dialog message is respectively accepted/denied.
    let on_acceptance, on_denial;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        confirmation_message:  null,
        confirm_accept_button: null,
        confirm_deny_button:   null
    };

    /// Invoked when this panel is activated.
    function on_activate(options)
    {
        DOM.confirmation_message.textContent = options.message;

        on_acceptance = options.on_acceptance;
        on_denial     = options.on_denial;

        domanip.enable(DOM.confirm_accept_button);
        domanip.enable(DOM.confirm_deny_button);
    }
    /// Invoked when this panel is deactivated.
    function on_deactivate()
    {
        domanip.disable(DOM.confirm_accept_button);
        domanip.disable(DOM.confirm_deny_button);
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        DOM.confirm_accept_button
            .addEventListener("click", () => { on_acceptance(); });
        DOM.confirm_deny_button
            .addEventListener("click", () => { on_denial();     });
    }

    define(["scripts/utilities/dom_manipulation"],
           dom_module =>
           {
               domanip = dom_module;

               initialize();

               return   {
                            ID: "confirmation_dialog",
                            TITLE: browser.i18n.getMessage("confirmation_title"),

                            on_activate:   on_activate,
                            on_deactivate: on_deactivate,
                            on_transition: handler => { transition_to = handler; },
                        };
           });
})();
