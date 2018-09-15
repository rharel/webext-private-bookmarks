"use strict";

(function()
{
    /// Global event handling across frames.
    const global =
    {
        /// Adds a listener for the specified event types.
        ///
        /// \returns
        ///     A wrapper around the specified listener that is only invoked for the
        ///     specified event and can be used with remove_listener().
        add_listener: function(event_types, listener)
        {
            const wrapper = event =>
            {
                if (event_types.includes(event.type))
                {
                    return listener(event);
                }
            };
            browser.runtime.onMessage.addListener(wrapper);
            return wrapper;
        },
        /// Removes the specified listener.
        ///
        /// \param listener
        ///     As was returned by add_listener().
        remove_listener: function(listener)
        {
            browser.runtime.onMessage.removeListener(listener);
        },
        /// Emits an event of the specified type and with the specified properties.
        ///
        /// \returns
        ///     Promise of 'runtime.sendMessage', which can be used to send an
        ///     asynchronous response.
        emit: async function(event_type, properties = {})
        {
            const event = Object.assign({ type: event_type }, properties);
            return await browser.runtime.sendMessage(event);
        }
    };

    /// Maps event type name to its collection of listeners.
    const local_listeners = {};
    /// Local event handling for the current frame.
    const local =
    {
        /// Adds a listener for the specified event types.
        add_listener: function(event_types, listener)
        {
            event_types.forEach(type =>
            {
                if (!local_listeners.hasOwnProperty(type))
                {
                    local_listeners[type] = [];
                }

                const listeners = local_listeners[type];

                if (!listeners.includes(listener))
                {
                    listeners.push(listener);
                }
            });
        },
        /// Removes the specified listener.
        ///
        /// \returns
        ///     True iff listener was hooked and now isn't.
        remove_listener: function(event_types, listener)
        {
            event_types.forEach(type =>
            {
                if (!local_listeners.hasOwnProperty(type)) { return; }

                const listeners = local_listeners[type];
                const iListener = listeners.indexOf(listener);
                if (iListener !== -1)
                {
                    listeners.splice(iListener, 1);
                }
            });
        },
        /// Emits an event of the specified type and with the specified properties.
        ///
        /// \returns
        ///     Number of listeners invoked.
        emit: function(event_type, properties = {})
        {
            if (!local_listeners.hasOwnProperty(event_type)) { return 0; }

            const event = Object.assign({ type: event_type }, properties);
            const listeners = local_listeners[event_type];
            listeners.forEach(listener => listener(event));

            return listeners.length;
        }
    };

    /// Emits an event of the specified type and with the specified properties to both local and
    /// global contexts.
    function emit(type, properties = {})
    {
        global.emit(type, properties);
        local.emit(type, properties);
    }

    define({
        global: global,
        local: local,
        emit: emit
    });
})();
