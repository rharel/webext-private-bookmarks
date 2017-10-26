(function()
{
    /// Set in define().
    let domanip;

    /// The name of the event to track for status updates.
    let status_update_event = null;
    /// The index of the previous status update event.
    let previous_status_update_index = -1;

    /// Contains DOM elements. Populated by initialize().
    const DOM = { on_hold_status_message: null };

    /// Invoked when this panel is activated.
    function on_activate(event) { status_update_event = event; }
    /// Invoked when this panel is deactivated.
    function on_deactivate()
    {
        status_update_event = null;
        previous_status_update_index = -1;
        DOM.on_hold_status_message.textContent = "";
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        browser.runtime.onMessage.addListener(message =>
        {
            if (!status_update_event ||
                 message.type !== status_update_event ||
                 message.index <= previous_status_update_index)
            {
                return;
            }
            const {current, total} = message;
            DOM.on_hold_status_message.textContent = `${current} / ${total}`;
            previous_status_update_index = message.index;
        });
    }

    define(["scripts/utilities/dom_manipulation"],
           dom_module =>
           {
               domanip = dom_module;

               initialize();

               return   {
                            ID: "on_hold",
                            TITLE: browser.i18n.getMessage("on_hold_title"),

                            on_activate:   on_activate,
                            on_deactivate: on_deactivate
                        };
           });
})();
