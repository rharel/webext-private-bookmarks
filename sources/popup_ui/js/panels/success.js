(function()
{
    /// Imported from other modules.
    let domanip;

    /// Invoked when transitioning out of this panel.
    let transition_to;
    /// The identifier of the transition target panel.
    let transition_target_id;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        success_details: null,
        success_transition_button: null,
        success_transition_button_label: null
    };

    /// Invoked when this panel is activated.
    function on_activate(options)
    {
        const {details, transition} = options;

        DOM.success_details.textContent = details;
        DOM.success_transition_button_label.textContent = transition.label;
        transition_target_id = transition.id;
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        DOM.success_transition_button.addEventListener("click", () =>
        {
            if (transition_target_id) { transition_to(transition_target_id); }
        });
    }

    define(["scripts/utilities/dom_manipulation"],
           dom_module =>
           {
               domanip = dom_module;

               domanip.when_ready(initialize);

               return   {
                            ID: "success",
                            TITLE: browser.i18n.getMessage("success_title"),

                            on_activate:   on_activate,
                            on_transition: handler => { transition_to = handler; },
                        };
           });
})();
