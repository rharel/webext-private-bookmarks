(function()
{
    /// Imported from other modules.
    let domanip, events, messages, storage;

    //// Contains DOM elements. Populated by initialize().
    const DOM =
    {
        sync_data_usage: null,
        sync_data_usage_statistics: null,
        sync_message_container: null
    };

    /// Enumerates possible informational messages.
    const InfoMessage =
    {
        DataCapacityExceeded: browser.i18n.getMessage("info_sync_data_capacity_exceeded"),
    };

    /// Updates the data usage statistics display.
    async function update_data_usage_statistics()
    {
        function to_kb(bytes) { return Math.ceil(bytes / 1000); }

        const to_be_synced_bytes = await storage.local.get_bytes_in_use();
        const capacity_bytes     = storage.synchronized.ITEM_CAPACITY_BYTES;

        let taken_kb;
        if (to_be_synced_bytes > capacity_bytes)
        {
            taken_kb = to_kb(to_be_synced_bytes);
            messages.info(InfoMessage.DataCapacityExceeded);
        }
        else
        {
            taken_kb = to_kb(await storage.synchronized.get_bytes_in_use());
            messages.clear();
        }

        const capacity_kb = to_kb(capacity_bytes);
        const percentage_taken = Math.round(100 * taken_kb / capacity_kb);

        DOM.sync_data_usage.textContent = browser.i18n.getMessage(
            "info_sync_data_usage",
            [taken_kb.toString(),
             capacity_kb.toString(),
             percentage_taken.toString()]
        );
    }

    /// Initializes this module.
    async function initialize()
    {
        domanip.populate(DOM);
        messages = new messages.Controller(DOM.sync_message_container);

        update_data_usage_statistics();
        browser.storage.onChanged.addListener(update_data_usage_statistics);
    }

    require(["./messages",
             "scripts/utilities/dom_manipulation",
             "scripts/utilities/events",
             "scripts/utilities/storage"],
            (messages_module, dom_module, events_module, storage_module) =>
            {
                messages = messages_module;
                domanip = dom_module;
                events = events_module;
                storage = storage_module;

                domanip.when_ready(initialize);
            });
})();
