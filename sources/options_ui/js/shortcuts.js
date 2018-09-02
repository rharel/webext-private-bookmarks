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

    /// Gets the major version of the browser as an integer.
    async function get_browser_version()
    {
        const version_string = (await browser.runtime.getBrowserInfo()).version;
        const iDot = version_string.indexOf(".");
        const iMajorEnd = (
            iDot === -1 ?
                version_string.length : iDot
        );
        const major = version_string.slice(0, iMajorEnd);
        return parseInt(major);
    }

    /// Gets the key combination displayed by the specified container.
    function get_shortcut(control)
    {
        const modifiers = control.querySelector(".modifiers").value;
        const key = control.querySelector(".key").value;

        return `${modifiers}+${key}`;
    }
    /// Sets the specified container to display the specified key combination.
    function set_shortcut(control, key_combination)
    {
        const components = key_combination.split("+");

        control.querySelector(".modifiers").value =
            components.slice(0, components.length - 1).join("+");
        control.querySelector(".key").value =
            components[components.length - 1];
    }
    /// Transforms user interaction to updates in the commands API.
    async function initialize_shortcut_inputs()
    {
        const modifiers = [
            "Alt",
            "Alt+Shift",
            "Ctrl",
            "Ctrl+Shift"
        ];
        if (await get_browser_version() >= 63)
        {
            // This additional modifier combination is allowed
            // starting with Firefox 63:
            modifiers.splice(1, 0, "Alt+Ctrl");
        }
        document.querySelectorAll(".shortcut > select.modifiers").forEach(node =>
        {
            for (let i = 0; i < modifiers.length; ++i)
            {
                const option = document.createElement("option");
                option.textContent = modifiers[i];
                node.appendChild(option);
            }
        });

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
