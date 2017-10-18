(function()
{
    /// Set in define().
    let domanip;

    /// Invoked when transitioning out of this panel.
    let transition_to;
    /// Callbacks for when the dialog message is respectively accepted/denied.
    let on_acceptance, on_denial;

    /// The acceptance input delay (in seconds).
    ///
    /// Acceptance input is delayed by a short amount upon activation to mitigate accidental
    /// activation.
    const ACCEPTANCE_INPUT_DELAY = 3;
    /// The identifier of the timeout used to delay acceptance input.
    let acceptance_input_timeout;
    /// The localized label of the acceptance button.
    let acceptance_label;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        confirmation_message:        null,
        confirm_accept_button:       null,
        confirm_accept_button_label: null,
        confirm_deny_button:         null
    };

    /// Enables the acceptance button after the specified delay (in seconds), and displays the
    /// count-down on the control's label.
    function delay_acceptance_input(delay)
    {
        if (delay <= 0)
        {
            DOM.confirm_accept_button_label.textContent = acceptance_label;
            domanip.enable(DOM.confirm_accept_button);
        }
        else
        {
            DOM.confirm_accept_button_label.textContent = `${acceptance_label} (${delay})`;
            acceptance_input_timeout = setTimeout(() =>
                delay_acceptance_input(delay - 1), 1000
            );
        }
    }

    /// Invoked when this panel is activated.
    function on_activate(options)
    {
        DOM.confirmation_message.textContent = options.message;

        on_acceptance = options.on_acceptance;
        on_denial     = options.on_denial;

        domanip.enable(DOM.confirm_deny_button);

        delay_acceptance_input(ACCEPTANCE_INPUT_DELAY);
    }
    /// Invoked when this panel is deactivated.
    function on_deactivate()
    {
        clearTimeout(acceptance_input_timeout);

        DOM.confirm_accept_button_label.textContent = acceptance_label;

        domanip.disable(DOM.confirm_accept_button);
        domanip.disable(DOM.confirm_deny_button);
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        acceptance_label = DOM.confirm_accept_button_label.textContent;

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
