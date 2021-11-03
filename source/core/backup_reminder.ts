import { options } from "./options";
import { get_from_storage, set_in_storage } from "./storage";

export const LAST_BACKUP_REMINDER_DATE_STORAGE_KEY = "last_backup_reminder_date";

export async function reset_backup_reminder(): Promise<void> {
    const today = new Date();
    await set_in_storage(LAST_BACKUP_REMINDER_DATE_STORAGE_KEY, today.toJSON());
}

export async function backup_reminder_is_due(): Promise<boolean> {
    const { backup_reminder_enabled, backup_reminder_interval_days } = await options();
    if (!backup_reminder_enabled) {
        return false;
    }

    const last_reminder_date_string = await get_from_storage<string>(
        LAST_BACKUP_REMINDER_DATE_STORAGE_KEY
    );

    if (!last_reminder_date_string) {
        return true;
    }

    const last_reminder_date = new Date(last_reminder_date_string);
    const today = new Date();

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days_since_last_reminder = Math.floor(
        (today.getTime() - last_reminder_date.getTime()) / MS_PER_DAY
    );
    return days_since_last_reminder > backup_reminder_interval_days;
}
