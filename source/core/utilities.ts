import { Events } from "webextension-polyfill-ts";

export function deep_equals<T>(a: T, b: T): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function deep_copy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export function sleep(duration_ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration_ms));
}

export function has_property<X extends unknown, Y extends PropertyKey>(
    obj: X,
    property: Y
): obj is X & Record<Y, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, property);
}

// We use Function as our constraint deliberately to match the Events.Event<T> interface.
// eslint-disable-next-line @typescript-eslint/ban-types
export function add_listener_safely<T extends Function>(event: Events.Event<T>, callback: T): void {
    if (!event.hasListener(callback)) {
        event.addListener(callback);
    }
}

// We use Function as our constraint deliberately to match the Events.Event<T> interface.
// eslint-disable-next-line @typescript-eslint/ban-types
export function remove_listener_safely<T extends Function>(
    event: Events.Event<T>,
    callback: T
): void {
    if (event.hasListener(callback)) {
        event.removeListener(callback);
    }
}
