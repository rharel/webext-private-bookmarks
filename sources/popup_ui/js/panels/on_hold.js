(function()
{
    /// Imported from other modules.
    let domanip;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        on_hold_progress_indicator: null,
        on_hold_status_message: null
    };

    /// The name of the event to track for status updates.
    let status_update_event_type = null;
    /// The index of the previous status update event.
    let previous_status_update_index = -1;

    /// Updates the progress bar and status message.
    function update_status(current, total)
    {
        DOM.on_hold_progress_indicator.style.width = `${Math.round(100 * current / total)}%`;
        DOM.on_hold_status_message.textContent = `${current} / ${total}`;
    }

    /// Invoked when this panel is activated.
    function on_activate(event_type) { status_update_event_type = event_type; }
    /// Invoked when this panel is deactivated.
    function on_deactivate()
    {
        status_update_event_type = null;
        previous_status_update_index = -1;

        DOM.on_hold_progress_indicator.style.width = "0%";
        DOM.on_hold_status_message.textContent = "";
    }

    /// Initializes this module.
    function initialize()
    {
        domanip.populate(DOM);

        browser.runtime.onMessage.addListener(message =>
        {
            if (status_update_event_type &&
                message.type === status_update_event_type &&
                message.index > previous_status_update_index)
            {
                update_status(message.current, message.total);
                previous_status_update_index = message.index;
            }
        });
    }

    define(["scripts/utilities/dom_manipulation"],
           dom_module =>
           {
               domanip = dom_module;

               domanip.when_ready(initialize);

               return   {
                            ID: "on_hold",
                            TITLE: browser.i18n.getMessage("menu_panel_title_busy"),

                            on_activate:   on_activate,
                            on_deactivate: on_deactivate
                        };
           });
})();
