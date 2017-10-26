(function()
{
    /// Set in define().
    let bookmarks, domanip;

    /// Contains DOM elements. Populated by initialize().
    const DOM = { header: null };

    /// Contains panel modules. Populated in define().
    const panels =
    {
        authentication: null,
        blank:
        {
            ID: "blank",
            TITLE: ""
        },
        confirmation_dialog: null,
        error:
        {
            ID: "error",
            TITLE: browser.i18n.getMessage("error_title"),

            on_activate: reason => { console.error("Error panel activated due to: " + reason); }
        },
        get_started:    null,
        main_menu:      null,
        on_hold:        null,
        password_setup: null,
        success:        null
    };

    /// Identifies the active panel.
    let active_panel_id = panels.blank.ID;

    /// Deactivates the panel with the specified identifier.
    function deactivate(id)
    {
        const panel = panels[id];

        if (panel.on_deactivate) { panel.on_deactivate(); }

        panel.element.classList.add("deactivated");
    }
    /// Activates the panel with the specified identifier. The specified arguments object is
    /// forwarded to the target.
    function activate(id, forwarded_arguments)
    {
        if (id !== null)
        {
            const panel = panels[id];

            if (panel.on_activate) { panel.on_activate(forwarded_arguments); }

            DOM.header.textContent = panel.TITLE;
            panel.element.classList.remove("deactivated");
        }
        active_panel_id = id;
    }
    /// Transitions to the panel with the specified identifier.
    function transition(id, forwarded_arguments)
    {
        if (active_panel_id !== null)
        {
            deactivate(active_panel_id);
            activate(id, forwarded_arguments);
        }
        else { activate(id, forwarded_arguments); }
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);

        for (const panel of Object.values(panels))
        {
            const element_id = panel.ID.replace(/_/g, "-") + "-panel";
            panel.element    = document.getElementById(element_id);

            if (panel.on_transition) { panel.on_transition(transition); }
        }
        try
        {
            if (await bookmarks.needs_setup()) { transition("get_started"); }
            else                               { transition("main_menu");   }
        }
        catch (reason) { transition("error", reason); }
    }

    require(["popup/panels/authentication",
             "popup/panels/confirmation_dialog",
             "popup/panels/get_started",
             "popup/panels/main_menu",
             "popup/panels/on_hold",
             "popup/panels/password_setup",
             "popup/panels/success",
             "scripts/interaction/bookmarks_interface",
             "scripts/utilities/dom_manipulation"],
            (authentication_module, confirmation_dialog_module, get_started_module,
             main_menu_module, on_hold_module, password_setup_module, success_module,
             bookmarks_module, dom_module) =>
            {
                panels.authentication = authentication_module;
                panels.confirmation_dialog = confirmation_dialog_module;
                panels.get_started = get_started_module;
                panels.main_menu = main_menu_module;
                panels.on_hold = on_hold_module;
                panels.password_setup = password_setup_module;
                panels.success = success_module;

                bookmarks = bookmarks_module;
                domanip = dom_module;

                initialize();
            });
})();
