(function()
{
    /// If given a non-array object, returns an array with it as single element.
    /// Otherwise, returns a copy of the given array.
    function element_or_array_as_array(element_or_array)
    {
        return (
            Array.isArray(element_or_array) ?
                element_or_array.slice() :
                [element_or_array]
        );
    }

    /// Global event handling across frames.
    const global =
    {
        /// Adds a listener for the specified event type(s). The actual method added is a wrapper
        /// around the specified listener that is only invoked for the specified event. Returns this
        /// wrapper so that it can be used with remove_listener().
        add_listener: function(type_or_types, listener)
        {
            const types = element_or_array_as_array(type_or_types);
            const wrapper = message => {
                if (types.includes(message.type))
                {
                    return listener(message);
                }
            };
            browser.runtime.onMessage.addListener(wrapper);
            return wrapper;
        },
        /// Removes the specified listener
        remove_listener: function(listener)
        {
            browser.runtime.onMessage.removeListener(listener);
        },

        /// Emits an event of the specified type and with the specified properties. Returns promise
        /// for an optional asynchronous response.
        emit: function(type, properties = {})
        {
            const event = Object.assign({ type: type }, properties);
            return browser.runtime.sendMessage(event);
        }
    };

    /// Maps event type name to its collection of listeners.
    const local_listeners = {};
    /// Local event handling for the current frame.
    const local =
    {
        /// Adds a listener for the specified event type(s).
        /// Returns true iff it was not already present.
        add_listener: function(type_or_types, listener)
        {
            const types = element_or_array_as_array(type_or_types);
            types.forEach(type =>
            {
                if (!local_listeners.hasOwnProperty(type)) { local_listeners[type] = []; }

                const listeners = local_listeners[type];
                if (!listeners.includes(listener))
                {
                    listeners.push(listener);
                    return true;
                }
                else { return false; }
            });
        },
        /// Removes the specified listener. Returns true iff one was removed.
        remove_listener: function(type_or_types, listener)
        {
            const types = element_or_array_as_array(type_or_types);
            types.forEach(type =>
            {
                if (!local_listeners.hasOwnProperty(type)) { return; }

                const listeners = local_listeners[type];
                const i = listeners.indexOf(listener);
                if (i !== -1)
                {
                    listeners.splice(i, 1);
                    return true;
                }
                else { return false; }
            });
        },

        /// Emits an event of the specified type and with the specified properties.
        /// Returns the number of listeners invoked.
        emit: function(type, properties = {})
        {
            if (!local_listeners.hasOwnProperty(type)) { return 0; }

            const event = Object.assign({ type: type }, properties);
            const listeners = local_listeners[type];
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
                local:  local,

                emit: emit
           });
})();
