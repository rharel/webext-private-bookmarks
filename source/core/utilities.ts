import { Events } from "webextension-polyfill";

export function deep_equals<T>(a: T, b: T): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function deep_copy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export function sleep(duration_ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration_ms));
}

export function has_property<X, Y extends PropertyKey>(
    obj: X,
    property: Y
): obj is X & Record<Y, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, property);
}

export function in_chrome(): boolean {
    return has_property(globalThis, "chrome");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function add_listener_safely<T extends (...args: any[]) => any>(
    event: Events.Event<T>,
    callback: T
): void {
    if (!event.hasListener(callback)) {
        event.addListener(callback);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function remove_listener_safely<T extends (...args: any[]) => any>(
    event: Events.Event<T>,
    callback: T
): void {
    if (event.hasListener(callback)) {
        event.removeListener(callback);
    }
}
