import { send_message } from "./messages";
import { get_from_storage, set_in_storage } from "./storage";
import { deep_equals } from "./utilities";
import { extension_version, Version } from "./version";

export const OPTIONS_STORAGE_KEY = "options";

export type Theme = "light" | "dark";

export interface Options {
    backup_reminder_enabled: boolean;
    backup_reminder_interval_days: number;
    idle_lock_enabled: boolean;
    idle_lock_threshold_minutes: number;
    limit_to_private_context: boolean;
    show_release_notes: boolean;
    theme: Theme;
    version: Version;
}

export function default_options(): Options {
    return {
        backup_reminder_enabled: false,
        backup_reminder_interval_days: 7,
        idle_lock_enabled: false,
        idle_lock_threshold_minutes: 30,
        limit_to_private_context: false,
        show_release_notes: true,
        theme: "light",
        version: extension_version(),
    };
}

export async function options(): Promise<Options> {
    return (await get_from_storage(OPTIONS_STORAGE_KEY)) ?? default_options();
}

export async function save_options(new_options: Options): Promise<void> {
    const old_options = await options();
    if (!deep_equals(new_options, old_options)) {
        await set_in_storage(OPTIONS_STORAGE_KEY, new_options);

        console.log("Options change:");
        for (const key of Object.keys(new_options) as Array<keyof Options>) {
            if (!deep_equals(new_options[key], old_options[key])) {
                console.log(`  ${key}:`, old_options[key], "=>", new_options[key]);
            }
        }

        await send_message({ kind: "options-change" });
    }
}
