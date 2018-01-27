(function()
{
    /// If the extension's idle auto lock setting is on, Private Bookmarks should auto-lock once the
    /// system has been idle for a user-specified amount of time. This module implements this
    /// behavior.

    /// Imported from other modules.
    let core, events, storage;

    /// The required user permissions for this feature.
    const IDLE_API_PERMISSION = { permissions: ["idle"] };
    /// Returns true iff we have the necessary user permissions (asynchronous).
    function has_permission() { return browser.permissions.contains(IDLE_API_PERMISSION); }

    /// Auto-locks when idle.
    function on_idle_state_change(new_state)
    {
        if (core.is_unlocked() &&
            new_state === "idle")
        {
            core.lock();
        }
    }
    /// Begins monitoring the system's idle state.
    function start_monitoring()
    {
        browser.idle.onStateChanged.addListener(on_idle_state_change);
    }
    /// Stops monitoring the system's idle state.
    function stop_monitoring()
    {
        browser.idle.onStateChanged.removeListener(on_idle_state_change);
    }

    /// True iff the feature is currently enabled.
    let is_enabled = false;
    /// Sets the idle time threshold before considering the system to be idle.
    function set_detection_interval_minutes(minutes)
    {
        const seconds = 60 * minutes;
        browser.idle.setDetectionInterval(seconds);
    }
    /// Attempts to enable the feature. Returns true iff successful.
    async function try_to_enable(threshold_minutes)
    {
        if (is_enabled) { set_detection_interval_minutes(threshold_minutes); return true; }

        if (!await has_permission()) { return false; }

        set_detection_interval_minutes(threshold_minutes);

        events.local.add_listener("unlock", start_monitoring);
        events.local.add_listener("lock", stop_monitoring);

        if (core.is_unlocked()) { start_monitoring(); }

        is_enabled = true;

        return true;
    }
    /// Disables the feature.
    function disable()
    {
        if (!is_enabled) { return; }

        events.local.remove_listener("unlock", start_monitoring);
        events.local.remove_listener("lock", stop_monitoring);

        if (core.is_unlocked()) { stop_monitoring(); }

        is_enabled = false;
    }
    /// Enables/disables this feature based on the specified options.
    async function update_activation_status(options)
    {
        const feature_option = options.idle_auto_lock;

        if (feature_option.is_enabled)
        {
            if (await try_to_enable(feature_option.threshold_minutes)) { return; }

            feature_option.is_enabled = false;
            storage.save(storage.Key.Configuration, options);
        }
        else { disable(); }
    }

    /// Initializes this module.
    function initialize()
    {
        events.local.add_listener("configuration-change", changes =>
        {
            update_activation_status(changes.new_value)
        });
        storage.load(storage.Key.Configuration).then(update_activation_status);
    }

    require(["scripts/background/bookmarks_manager/core",
             "scripts/utilities/events",
             "scripts/utilities/storage"],
            (core_module, events_module, storage_module) =>
            {
                core = core_module;
                events = events_module;
                storage = storage_module;

                initialize();
            });
})();
