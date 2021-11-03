import { Bookmarks, browser } from "webextension-polyfill-ts";

import { bookmarks_exist, BOOKMARKS_STORAGE_KEY, PrivateBookmarks, pruned_node } from "./bookmarks";
import { encrypted, random_salt } from "./crypto";
import { save_options } from "./options";
import { get_from_storage, remove_from_storage, set_in_storage } from "./storage";
import { extension_version } from "./version";

export const LEGACY_BOOKMARKS_STORAGE_KEY = "back_folder";
export const LEGACY_BOOKMARKS_MIGRATION_DONE_KEY = "bookmarks_migrated";
export const LEGACY_DEPLOYMENT_TYPE_STORAGE_KEY = "deployment_type";
export const LEGACY_LAST_BACKUP_REMINDER_DATE_STORAGE_KEY = "last_backup_reminder_date";
export const LEGACY_NODE_ID_STORAGE_KEY = "front_folder_id";
export const LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY = "front_folder_spawn_location";
export const LEGACY_OPTIONS_STORAGE_KEY = "configuration";

export interface LegacyVersion {
    major: number;
    minor: number;
    release: number;
    tag: string;
}

export interface LegacyOptions {
    backup_reminder: {
        is_enabled: boolean;
        interval_days: number;
    };
    do_disable_password_requirements: boolean;
    do_limit_to_private_context: boolean;
    do_show_release_notes: boolean;
    do_sync_data_across_devices: boolean;
    do_use_dark_theme: boolean;
    folder_title: string;
    idle_auto_lock: {
        is_enabled: boolean;
        threshold_minutes: number;
    };
    version: LegacyVersion;
}

export interface LegacyNodeSpawnDetails {
    parent_id: string;
    index: number;
}

export interface LegacyBookmarks {
    signature: {
        iv: string;
        ciphertext: string;
    };
    bookmarks: {
        iv: string;
        ciphertext: string;
    };
    is_compressed: boolean;
    is_fresh: boolean;
    version: LegacyVersion;
}

export async function decrypted_legacy(
    initialization_vector_base64: string,
    ciphertext_base64: string,
    password: string
): Promise<string | null> {
    async function digest(input: string): Promise<Uint8Array> {
        const input_utf8 = new TextEncoder().encode(input);
        return new Uint8Array(await crypto.subtle.digest("SHA-256", input_utf8));
    }

    function hex_from_bytes(bytes: Uint8Array): string {
        let hex = "";
        for (let i = 0; i < bytes.length; ++i) {
            // toString(16) yields a hexadecimal representation without padding,
            // so we add it ourselves when needed.
            hex += bytes[i].toString(16).padStart(2, "0");
        }
        return hex;
    }

    function bytes_from_base64(input: string): Uint8Array {
        const input_decoded = atob(input);
        const input_bytes = input_decoded.match(/[\s\S]/g);
        if (input_bytes === null) {
            throw new Error("could not find ciphertext bytes");
        }
        return new Uint8Array(input_bytes.map(ch => ch.charCodeAt(0)));
    }

    const password_hash_partial = hex_from_bytes(await digest(password));
    const password_hash = await digest(password_hash_partial);
    const initialization_vector = bytes_from_base64(initialization_vector_base64);
    const algorithm = { name: "AES-GCM", iv: initialization_vector };
    const key = await crypto.subtle.importKey("raw", password_hash, algorithm, false, ["decrypt"]);
    const ciphertext = bytes_from_base64(ciphertext_base64);

    let plaintext_utf8;
    try {
        plaintext_utf8 = await crypto.subtle.decrypt(algorithm, key, ciphertext);
    } catch {
        return null;
    }

    const plaintext = new TextDecoder().decode(plaintext_utf8);

    return plaintext;
}

export function decompressed_legacy(compressed: string): string {
    // Converts UTF-8 text to UTF-16.
    //
    // Modified version of: https://github.com/pieroxy/lz-string/issues/94#issuecomment-317224401
    function utf_8_to_16(text: string) {
        let result = "";
        for (let i = 0; i < text.length; i += 2) {
            const code = text.charCodeAt(i) * 256 + text.charCodeAt(i + 1);
            result += String.fromCharCode(code);
        }
        return result;
    }

    compressed = utf_8_to_16(compressed);

    // Based on decompress() of LZ_String.js by Pieroxy.
    //
    // See also: https://pieroxy.net/blog/pages/lz-string/testing.html

    const length = compressed.length;
    const resetValue = 32768;
    const getNextValue = (index: number) => {
        return compressed.charCodeAt(index);
    };

    const f = String.fromCharCode;
    const dictionary = [];
    let next;
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = "";
    const result = [];
    let i;
    let w = "";
    let bits;
    let resb;
    let maxpower;
    let power;
    let c;
    const data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) {
        dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
    }

    switch ((next = bits)) {
        case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = f(bits);
            break;
        case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = f(bits);
            break;
        case 2:
            return "";
    }
    dictionary[3] = c;
    w = c as string;
    result.push(c);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (data.index > length) {
            return "";
        }

        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }

        switch ((c = bits)) {
            case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }

                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 2:
                return result.join("");
        }

        if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }

        if (dictionary[c]) {
            entry = dictionary[c] as string;
        } else {
            if (c === dictSize) {
                entry = w + w.charAt(0);
            } else {
                return "";
            }
        }
        result.push(entry);

        // Add w+entry[0] to the dictionary.
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        w = entry;

        if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
    }
}

export async function legacy_password_correct(password: string): Promise<boolean> {
    const legacy_bookmarks = await get_from_storage<LegacyBookmarks>(LEGACY_BOOKMARKS_STORAGE_KEY);

    if (!legacy_bookmarks) {
        return false;
    }

    return (
        (await decrypted_legacy(
            legacy_bookmarks.bookmarks.iv,
            legacy_bookmarks.bookmarks.ciphertext,
            password
        )) !== null
    );
}

export async function migrate_legacy_options(): Promise<boolean> {
    const legacy_options = await get_from_storage<LegacyOptions>(LEGACY_OPTIONS_STORAGE_KEY);

    if (legacy_options === null) {
        return false;
    }

    await save_options({
        backup_reminder_enabled: legacy_options.backup_reminder.is_enabled,
        backup_reminder_interval_days: legacy_options.backup_reminder.interval_days,
        idle_lock_enabled: legacy_options.idle_auto_lock.is_enabled,
        idle_lock_threshold_minutes: legacy_options.idle_auto_lock.threshold_minutes,
        limit_to_private_context: legacy_options.do_limit_to_private_context,
        show_release_notes: legacy_options.do_show_release_notes,
        theme: legacy_options.do_use_dark_theme ? "dark" : "light",
        version: extension_version(),
    });
    await remove_from_storage(LEGACY_OPTIONS_STORAGE_KEY);

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);

    if (bookmarks !== null) {
        await set_in_storage(BOOKMARKS_STORAGE_KEY, {
            ...bookmarks,
            title: legacy_options.folder_title,
        });
    }

    return true;
}

export async function migrate_legacy_node_spawn_details(): Promise<boolean> {
    const legacy_spawn_details = await get_from_storage<LegacyNodeSpawnDetails>(
        LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY
    );

    if (legacy_spawn_details === null) {
        return false;
    }

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);

    if (bookmarks === null) {
        return false;
    }

    await set_in_storage(BOOKMARKS_STORAGE_KEY, {
        ...bookmarks,
        parent_node_id: legacy_spawn_details.parent_id,
        index_in_parent_node: legacy_spawn_details.index,
    });
    await remove_from_storage(LEGACY_NODE_SPAWN_DETAILS_STORAGE_KEY);

    return true;
}

export async function legacy_bookmarks_migration_needed(): Promise<boolean> {
    return (
        (await get_from_storage<boolean>(LEGACY_BOOKMARKS_MIGRATION_DONE_KEY)) === false &&
        (await get_from_storage<LegacyBookmarks>(LEGACY_BOOKMARKS_STORAGE_KEY)) !== null
    );
}

export async function migrate_legacy_bookmarks(password: string): Promise<boolean> {
    const legacy_bookmarks = await get_from_storage<LegacyBookmarks>(LEGACY_BOOKMARKS_STORAGE_KEY);

    if (legacy_bookmarks === null) {
        return false;
    }

    const bookmarks = await get_from_storage<PrivateBookmarks>(BOOKMARKS_STORAGE_KEY);

    if (bookmarks === null) {
        return false;
    }

    const plaintext = await decrypted_legacy(
        legacy_bookmarks.bookmarks.iv,
        legacy_bookmarks.bookmarks.ciphertext,
        password
    );

    if (plaintext === null) {
        return false;
    }

    const plaintext_uncompressed = legacy_bookmarks.is_compressed
        ? decompressed_legacy(plaintext)
        : plaintext;

    const node: Bookmarks.BookmarkTreeNode = JSON.parse(plaintext_uncompressed);
    const pruned_children = node.children?.map(child => pruned_node(child)) ?? [];
    const plaintext_migrated = JSON.stringify(pruned_children);

    await set_in_storage(BOOKMARKS_STORAGE_KEY, {
        ...bookmarks,
        encrypted_child_nodes: await encrypted(plaintext_migrated, password + bookmarks.salt),
    });
    await set_in_storage(LEGACY_BOOKMARKS_MIGRATION_DONE_KEY, true);

    return true;
}

export async function manage_legacy_migration(): Promise<void> {
    if (!(await bookmarks_exist())) {
        const salt = random_salt();
        const password = random_salt();
        const initial_bookmarks: PrivateBookmarks = {
            title: browser.i18n.getMessage("extension_name"),
            parent_node_id: "",
            index_in_parent_node: 0,
            salt,
            encrypted_child_nodes: await encrypted(JSON.stringify([]), password + salt),
        };
        await set_in_storage(BOOKMARKS_STORAGE_KEY, initial_bookmarks);
    }
    await migrate_legacy_node_spawn_details();
    await migrate_legacy_options();
    await remove_from_storage(LEGACY_DEPLOYMENT_TYPE_STORAGE_KEY);
    await remove_from_storage(LEGACY_LAST_BACKUP_REMINDER_DATE_STORAGE_KEY);
    await remove_from_storage(LEGACY_NODE_ID_STORAGE_KEY);
    await set_in_storage(LEGACY_BOOKMARKS_MIGRATION_DONE_KEY, false);
}
