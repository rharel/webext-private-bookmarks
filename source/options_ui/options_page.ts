import { browser } from "webextension-polyfill-ts";

import {
    bookmarks_exist,
    bookmarks_locked,
    BookmarksExport,
    clear_bookmarks,
    encrypted_bookmarks_export,
    import_encrypted_bookmarks,
    import_plain_bookmarks,
    plain_bookmarks_export,
} from "../core/bookmarks";
import {
    is_encrypted_legacy_export,
    is_legacy_export,
    is_plain_legacy_export,
    LegacyBookmarksExport,
    migrate_legacy_encrypted_export,
    migrate_legacy_plain_export,
} from "../core/legacy";
import { localize_document } from "../core/localization";
import { add_message_listener } from "../core/messages";
import { options, save_options } from "../core/options";
import { element_by_id, when_document_ready } from "../core/ui";
import { release_notes_url } from "../core/version";

interface Ui {
    backup_reminder_checkbox: HTMLInputElement;
    backup_reminder_interval_days_field: HTMLSelectElement;
    idle_lock_threshold_minutes_field: HTMLSelectElement;
    idle_lock_checkbox: HTMLInputElement;
    limit_to_private_context_checkbox: HTMLInputElement;
    release_notes_link: HTMLAnchorElement;
    show_release_notes_checkbox: HTMLInputElement;
}

async function show_current_options(ui: Ui) {
    const current_options = await options();

    ui.backup_reminder_checkbox.checked = current_options.backup_reminder_enabled;
    ui.backup_reminder_interval_days_field.disabled = !current_options.backup_reminder_enabled;
    ui.backup_reminder_interval_days_field.value =
        current_options.backup_reminder_interval_days.toString();

    ui.idle_lock_threshold_minutes_field.value =
        current_options.idle_lock_threshold_minutes.toString();
    ui.idle_lock_threshold_minutes_field.disabled = !current_options.idle_lock_enabled;
    ui.idle_lock_checkbox.checked = current_options.idle_lock_enabled;

    ui.limit_to_private_context_checkbox.checked = current_options.limit_to_private_context;
    ui.show_release_notes_checkbox.checked = current_options.show_release_notes;
}

async function save_new_options(ui: Ui) {
    const new_options = await options();

    new_options.backup_reminder_enabled = ui.backup_reminder_checkbox.checked;
    new_options.backup_reminder_interval_days = parseInt(
        ui.backup_reminder_interval_days_field.value
    );

    new_options.idle_lock_enabled = ui.idle_lock_checkbox.checked;
    new_options.idle_lock_threshold_minutes = parseInt(ui.idle_lock_threshold_minutes_field.value);

    new_options.limit_to_private_context = ui.limit_to_private_context_checkbox.checked;
    new_options.show_release_notes = ui.show_release_notes_checkbox.checked;

    await save_options(new_options);
    await show_current_options(ui);
}

async function on_idle_auto_lock_checkbox_changed(ui: Ui) {
    if (ui.idle_lock_checkbox.checked) {
        const idle_permission_granted = await browser.permissions.request({
            permissions: ["idle"],
        });
        if (idle_permission_granted) {
            await save_new_options(ui);
        } else {
            await show_current_options(ui);
        }
    } else {
        await save_new_options(ui);
    }
}

function download_export(bookmarks_export: BookmarksExport) {
    const uri = encodeURIComponent(JSON.stringify(bookmarks_export));

    const extension_name = browser.i18n.getMessage("extension_name");
    const date = new Date().toLocaleDateString(browser.i18n.getUILanguage());
    const file_name = `${extension_name} ${date} (${bookmarks_export.kind}).json`;

    const trigger_element = document.createElement("a");
    trigger_element.href = `data:application/json;charset=utf-8,${uri}`;
    trigger_element.download = file_name;
    trigger_element.style.display = "none";
    document.body.appendChild(trigger_element);
    trigger_element.click();
    document.body.removeChild(trigger_element);
}

when_document_ready(async () => {
    localize_document();

    // Options

    const ui: Ui = {
        backup_reminder_checkbox: element_by_id("backup-reminder-checkbox", HTMLInputElement),
        backup_reminder_interval_days_field: element_by_id(
            "backup-reminder-interval-days-field",
            HTMLSelectElement
        ),
        idle_lock_threshold_minutes_field: element_by_id(
            "idle-auto-lock-threshold-minutes-field",
            HTMLSelectElement
        ),
        idle_lock_checkbox: element_by_id("idle-auto-lock-checkbox", HTMLInputElement),
        limit_to_private_context_checkbox: element_by_id(
            "limit-to-private-context-checkbox",
            HTMLInputElement
        ),
        release_notes_link: element_by_id("release-notes-link", HTMLAnchorElement),
        show_release_notes_checkbox: element_by_id("show-release-notes-checkbox", HTMLInputElement),
    };

    ui.backup_reminder_checkbox.addEventListener("change", () => save_new_options(ui));
    ui.backup_reminder_interval_days_field.addEventListener("change", () => save_new_options(ui));
    ui.idle_lock_threshold_minutes_field.addEventListener("change", () => save_new_options(ui));
    ui.idle_lock_checkbox.addEventListener("change", () => on_idle_auto_lock_checkbox_changed(ui));
    ui.limit_to_private_context_checkbox.addEventListener("change", () => save_new_options(ui));
    ui.release_notes_link.addEventListener("change", () => save_new_options(ui));
    ui.show_release_notes_checkbox.addEventListener("change", () => save_new_options(ui));

    ui.release_notes_link.href = release_notes_url();

    show_current_options(ui);

    add_message_listener(message => {
        if (message.kind === "options-change") {
            show_current_options(ui);
        }
    });

    // Clearing data

    const data_clearance_dialog = element_by_id("clear-data-confirmation-dialog", HTMLElement);

    element_by_id("clear-data-button", HTMLElement).addEventListener("click", () => {
        data_clearance_dialog.classList.add("active");
    });
    element_by_id("clear-data-confirm", HTMLElement).addEventListener("click", async () => {
        await clear_bookmarks();
        data_clearance_dialog.classList.remove("active");
    });
    element_by_id("clear-data-cancel", HTMLElement).addEventListener("click", () => {
        data_clearance_dialog.classList.remove("active");
    });

    // Export

    const export_encrypted_data_button = element_by_id(
        "export-encrypted-data-button",
        HTMLButtonElement
    );
    const export_plain_data_button = element_by_id("export-plain-data-button", HTMLButtonElement);

    export_encrypted_data_button.addEventListener("click", async () => {
        download_export(await encrypted_bookmarks_export());
    });
    export_plain_data_button.addEventListener("click", async () => {
        download_export(await plain_bookmarks_export());
    });

    export_encrypted_data_button.disabled = !(await bookmarks_exist());
    export_plain_data_button.disabled = await bookmarks_locked();

    add_message_listener(async message => {
        if (message.kind === "bookmarks-created") {
            export_encrypted_data_button.disabled = false;
        } else if (message.kind === "bookmarks-cleared") {
            export_encrypted_data_button.disabled = true;
        } else if (message.kind === "lock-status-change") {
            export_plain_data_button.disabled = await bookmarks_locked();
        }
    });

    // Import

    const import_file_input = element_by_id("import-file-input", HTMLInputElement);
    const import_password_input = element_by_id("import-password-input", HTMLInputElement);
    const import_error_message = element_by_id("import-error-message", HTMLElement);
    const encrypted_import_error_message = element_by_id(
        "encrypted-import-error-message",
        HTMLElement
    );

    const import_password_panel = element_by_id("import-password-panel", HTMLElement);
    const import_button_panel = element_by_id("import-button-panel", HTMLElement);
    const import_button = element_by_id("import-button", HTMLButtonElement);
    const import_status_message = element_by_id("import-status-message", HTMLElement);

    let bookmarks_export: BookmarksExport | null;
    let legacy_bookmarks_export: LegacyBookmarksExport | null;

    import_file_input.addEventListener("change", () => {
        import_error_message.classList.remove("active");
        encrypted_import_error_message.classList.remove("active");
        import_button_panel.classList.remove("active");
        import_password_panel.classList.remove("active");
        import_password_input.value = "";
        import_status_message.textContent = "";
        bookmarks_export = null;
        legacy_bookmarks_export = null;

        if (!import_file_input.files) {
            return;
        }

        const file = import_file_input.files.item(0);
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("error", () => {
            import_error_message.classList.add("active");
        });
        reader.addEventListener("load", () => {
            if (typeof reader.result !== "string") {
                import_error_message.classList.add("active");
                return;
            }
            try {
                const file_data = JSON.parse(reader.result) as
                    | BookmarksExport
                    | LegacyBookmarksExport
                    | null;

                if (file_data === null) {
                    return;
                } else if (is_legacy_export(file_data)) {
                    legacy_bookmarks_export = file_data;
                    if (is_encrypted_legacy_export(legacy_bookmarks_export)) {
                        import_password_panel.classList.add("active");
                    }
                } else {
                    bookmarks_export = file_data;
                    if (bookmarks_export.kind === "encrypted") {
                        import_password_panel.classList.add("active");
                    }
                }
                import_button_panel.classList.add("active");
            } catch {
                import_error_message.classList.add("active");
            }
        });
        reader.readAsText(file);
    });

    import_button.addEventListener("click", async () => {
        import_error_message.classList.remove("active");
        encrypted_import_error_message.classList.remove("active");
        import_status_message.textContent = "";

        const password = import_password_input.value;

        if (legacy_bookmarks_export) {
            if (is_encrypted_legacy_export(legacy_bookmarks_export)) {
                bookmarks_export = await migrate_legacy_encrypted_export(
                    legacy_bookmarks_export,
                    password
                );
                if (bookmarks_export === null) {
                    encrypted_import_error_message.classList.add("active");
                }
            } else if (is_plain_legacy_export(legacy_bookmarks_export)) {
                bookmarks_export = migrate_legacy_plain_export(legacy_bookmarks_export);
            }
        }

        if (!bookmarks_export) {
            return;
        }

        const display_progress = (current: number, total: number) => {
            import_status_message.textContent = `${current} / ${total}`;
        };

        if (bookmarks_export.kind === "plain") {
            if (!(await import_plain_bookmarks(bookmarks_export, display_progress))) {
                import_error_message.classList.add("active");
            }
        } else {
            import_password_input.value = "";
            if (!(await import_encrypted_bookmarks(bookmarks_export, password, display_progress))) {
                encrypted_import_error_message.classList.add("active");
            }
        }
    });

    import_file_input.disabled = await bookmarks_locked();
    import_button.disabled = await bookmarks_locked();

    add_message_listener(async message => {
        if (message.kind === "lock-status-change") {
            import_file_input.disabled = await bookmarks_locked();
            import_button.disabled = await bookmarks_locked();
        }
    });
});
