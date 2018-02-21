(function()
{
    /// Imported from other modules.
    let domanip;

    const SHIFTED_DIGIT_CHARACTERS = ")!@#$%^&*(";
    /// Restores the original digit from the character obtaining by shifting it (on QWERTY/AZERTY).
    function restore_shifted_digit(key)
    {
        const index = SHIFTED_DIGIT_CHARACTERS.indexOf(key);
        return index < 0 ? key : index.toString();
    }

    function is_digit(key)    { return /^[0-9]$/.test(key); }
    function is_letter(key)   { return /^[a-zA-Z]$/.test(key); }
    function is_function(key) { return /^[Ff][1-9][0-2]*$/.test(key); }

    function Shortcut() { this.reset(); }
    Shortcut.prototype =
    {
        is_valid: function()
        {
            return this.mandatory_modifier !== null &&
                   this.key !== null;
        },
        is_full: function()
        {
            return this.is_valid() &&
                   this.optional_modifier !== null;
        },
        set: function(key)
        {
            if      (key === "Alt")     { this.mandatory_modifier = "Alt"; }
            else if (key === "Control") { this.mandatory_modifier = "Ctrl"; }
            else if (key === "Shift")   { this.optional_modifier = "Shift"; }
            else if (is_digit(key) || is_letter(key) || is_function(key))
            {
                this.key = key.toUpperCase();
            }
        },
        reset: function()
        {
            this.mandatory_modifier = null;
            this.optional_modifier = null;
            this.key = null;
        },
        to_string: function()
        {
            return [this.mandatory_modifier, this.optional_modifier, this.key]
                .filter(component => component !== null)
                .join("+");
        }
    };
    function ShortcutInput(command_name, on_recording_end)
    {
        this._command_name = command_name;
        this._shortcut = new Shortcut();
        this._on_recording_end = on_recording_end;
    }
    ShortcutInput.prototype =
    {
        begin_recording: function()
        {
            this._shortcut.reset();
        },
        _end_recording: async function()
        {
            const new_shortcut = this._shortcut.to_string();
            await browser.commands.update({
                name: this._command_name,
                shortcut: new_shortcut
            });
            if (this._on_recording_end) { this._on_recording_end(new_shortcut); }
        },
        key_down: function(key)
        {
            this._shortcut.set(key);
            if (this._shortcut.is_full()) { this._end_recording(); }
        },
        key_up: function()
        {
            if (this._shortcut.is_valid()) { this._end_recording(); }
        },
        to_string: function()
        {
            const shortcut_string = this._shortcut.to_string();
            return shortcut_string !== "" ? shortcut_string : "...";
        }
    };

    /// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        shortcut_bookmark_page: null,
        shortcut_lock_bookmarks: null,
        shortcut_open_menu: null
    };

    /// Transforms user interaction to updates in the commands API.
    async function initialize_shortcut_inputs()
    {
        let is_recording = false;
        const controls =
        {
            "_execute_page_action": DOM.shortcut_bookmark_page,
            "lock": DOM.shortcut_lock_bookmarks,
            "open-menu": DOM.shortcut_open_menu
        };
        (await browser.commands.getAll()).forEach(command =>
        {
            const control = controls[command.name];
            control.textContent = command.shortcut;
            control.addEventListener("click", on_recording_request);

            const input = new ShortcutInput(command.name, on_recording_end);

            function on_recording_request()
            {
                if (is_recording) { return; }

                input.begin_recording();
                control.textContent = input.to_string();
                control.classList.add("recording");
                document.body.addEventListener("keydown", on_key_down);
                document.body.addEventListener("keyup", on_key_up);

                is_recording = true;
            }
            function on_recording_end(new_shortcut)
            {
                control.textContent = new_shortcut;
                control.classList.remove("recording");
                document.body.removeEventListener("keydown", on_key_down);
                document.body.removeEventListener("keyup", on_key_up);

                is_recording = false;
            }
            function on_key_down(event)
            {
                event.preventDefault();
                if (event.repeat) { return; }

                input.key_down(restore_shifted_digit(event.key));
                control.textContent = input.to_string();
            }
            function on_key_up(event)
            {
                event.preventDefault();
                input.key_up();
            }
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
