import browser from "webextension-polyfill";

export async function get_from_storage<T>(key: string): Promise<T | null> {
    try {
        return (await browser.storage.local.get(key))[key] ?? null;
    } catch {
        return null;
    }
}

export async function set_in_storage<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
}

export async function remove_from_storage(key: string): Promise<void> {
    await browser.storage.local.remove(key);
}
