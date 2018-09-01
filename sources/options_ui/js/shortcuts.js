(function()
{
    /// Imported from other modules.
    let domanip;

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        shortcut_bookmark_page:  null,
        shortcut_bookmark_all:   null,
        shortcut_lock_bookmarks: null,
        shortcut_open_menu:      null
    };

    /// Gets the key combination displayed by the specified container.
    function get_shortcut(control)
    {
        const mandatory_modifier = control.querySelector(".mandatory-modifier input:checked");
        const optional_modifier = control.querySelector(".optional-modifier input");
        const key = control.querySelector(".key");

        return `${mandatory_modifier.value}` +
               `${optional_modifier.checked ? `+${optional_modifier.value}` : ""}+` +
               `${key.value}`;
    }
    /// Sets the specified container to display the specified key combination.
    function set_shortcut(control, key_combination)
    {
        const components = key_combination.split("+");
        control.querySelectorAll(".mandatory-modifier input").forEach(input =>
        {
            input.checked = input.value === components[0];
        });
        control.querySelector(".optional-modifier input").checked = components[1] === "Shift";
        control.querySelector(".key").value = components[components.length - 1];
    }
    /// Transforms user interaction to updates in the commands API.
    async function initialize_shortcut_inputs()
    {
        const digits = "0123456789".split("");
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        const functions = "F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12".split(" ");
        const specials = (
            "Comma Period Home End PageUp PageDown " +
            "Space Insert Delete Up Down Left Right"
        ).split(" ");
        const keys = digits.concat(letters).concat(functions).concat(specials);

        document.querySelectorAll(".shortcut > select.key").forEach(node =>
        {
            for (let i = 0; i < keys.length; ++i)
            {
                const option = document.createElement("option");
                option.textContent = keys[i];
                node.appendChild(option);
            }
        });

        const controls =
        {
            "_execute_page_action": DOM.shortcut_bookmark_page,
            "bookmark-all":         DOM.shortcut_bookmark_all,
            "lock":                 DOM.shortcut_lock_bookmarks,
            "open-menu":            DOM.shortcut_open_menu
        };
        (await browser.commands.getAll()).forEach(command =>
        {
            const control = controls[command.name];
            set_shortcut(control, command.shortcut);

            function save()
            {
                return browser.commands.update({
                    name: command.name,
                    shortcut: get_shortcut(control)
                });
            }
            control.querySelectorAll("input, select").forEach(element =>
            {
                element.addEventListener("change", save);
            });
        });
    }

    /// Initializes this module.
    function initialize()
    {
        if (!browser.commands.update) { return; }

        document.querySelectorAll(".shortcut-customization").forEach(element =>
        {
            element.classList.remove("hidden");
        });
        domanip.populate(DOM);

        return initialize_shortcut_inputs();
    }

    require(["scripts/utilities/dom_manipulation"],
            (dom_module) =>
            {
                domanip = dom_module;
                domanip.when_ready(initialize);
            });
})();
