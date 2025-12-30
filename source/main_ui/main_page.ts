import browser from "webextension-polyfill";

import { backup_reminder_is_due, reset_backup_reminder } from "../core/backup_reminder";
import {
    bookmarks_exist,
    bookmarks_locked,
    BOOKMARKS_NODE_ID_STORAGE_KEY,
    change_password,
    lock_bookmarks,
    password_correct,
    setup_bookmarks,
    unlock_bookmarks,
} from "../core/bookmarks";
import { maybe_show_release_notes } from "../core/installation";
import { legacy_bookmarks_migration_needed } from "../core/legacy";
import { localize_document } from "../core/localization";
import { add_message_listener } from "../core/messages";
import { options, save_options } from "../core/options";
import { get_from_storage } from "../core/storage";
import { element_by_id, when_document_ready } from "../core/ui";
import { deep_copy } from "../core/utilities";

const PANEL_IDS = [
    "blank-panel",
    "get-started-panel",
    "password-setup-panel",
    "password-setup-success-panel",
    "main-menu-panel",
    "authentication-panel",
    "unlock-progress-panel",
    "unlock-success-panel",
    "lock-success-panel",
    "error-panel",
] as const;
type PanelId = (typeof PANEL_IDS)[number];

async function main_panel_id(): Promise<PanelId> {
    return (await bookmarks_exist()) || (await legacy_bookmarks_migration_needed())
        ? "main-menu-panel"
        : "get-started-panel";
}

interface AuthenticationContext {
    context_kind: "authentication_context";
    previous_panel_id: PanelId;
    next_panel_id: PanelId;
}

interface PasswordContext {
    context_kind: "password_context";
    password: string;
}

type PanelContext = AuthenticationContext | PasswordContext;

interface Panel {
    activate?(context?: PanelContext): Promise<void>;
}

const PANELS: Record<PanelId, Panel> = {
    "blank-panel": {},

    "get-started-panel": {
        async activate() {
            const setup_button = element_by_id("setup-password-button", HTMLButtonElement);
            setup_button.addEventListener(
                "click",
                async () => {
                    await activate_panel("password-setup-panel");
                },
                { once: true }
            );
        },
    },

    "password-setup-panel": new (class implements Panel {
        password_input = element_by_id("new-password-input", HTMLInputElement);
        password_repeat_input = element_by_id("repeated-new-password-input", HTMLInputElement);
        confirm_button = element_by_id("confirm-new-password-button", HTMLButtonElement);
        cancel_button = element_by_id("cancel-password-setup-button", HTMLButtonElement);
        validation_icon_bad = element_by_id("validation-icon-bad", HTMLImageElement);
        validation_icon_good = element_by_id("validation-icon-good", HTMLImageElement);
        context?: PasswordContext;

        constructor() {
            this.password_input.addEventListener("input", () => this.on_password_input());
            this.password_repeat_input.addEventListener("input", () => this.on_password_input());
            this.confirm_button.addEventListener("click", () => this.on_confirm_button_click());
            this.cancel_button.addEventListener("click", () => this.on_cancel_button_click());
        }

        password_valid(): boolean {
            return (
                this.password_input.value.length > 0 &&
                this.password_input.value === this.password_repeat_input.value
            );
        }

        on_password_input() {
            if (this.password_valid()) {
                this.confirm_button.disabled = false;
                this.validation_icon_bad.classList.remove("active");
                this.validation_icon_good.classList.add("active");
            } else {
                this.confirm_button.disabled = true;
                this.validation_icon_bad.classList.add("active");
                this.validation_icon_good.classList.remove("active");
            }
        }

        async on_confirm_button_click() {
            if (this.password_valid()) {
                const new_password = this.password_input.value;

                if (this.context?.password) {
                    await change_password(this.context.password, new_password);
                } else {
                    await setup_bookmarks(new_password);
                }

                await activate_panel("password-setup-success-panel");
            }
        }

        async on_cancel_button_click() {
            await activate_panel(await main_panel_id());
        }

        async activate(context?: PanelContext) {
            this.password_input.value = "";
            this.password_repeat_input.value = "";
            this.confirm_button.disabled = true;
            this.validation_icon_bad.classList.remove("active");
            this.validation_icon_good.classList.remove("active");

            if ((await bookmarks_exist()) && context?.context_kind === "password_context") {
                // Change an existing password.
                this.context = context;
                this.cancel_button.classList.add("active");
            } else {
                // Setup an initial password.
                this.cancel_button.classList.remove("active");
            }
        }
    })(),

    "password-setup-success-panel": {
        async activate() {
            element_by_id("password-setup-success-go-to-menu-button", HTMLElement).addEventListener(
                "click",
                async () => {
                    await activate_panel(await main_panel_id());
                },
                { once: true }
            );
        },
    },

    "main-menu-panel": new (class implements Panel {
        lock_button = element_by_id("lock-button", HTMLButtonElement);
        unlock_button = element_by_id("unlock-button", HTMLButtonElement);
        change_password_button = element_by_id("change-password-button", HTMLButtonElement);

        constructor() {
            this.lock_button.addEventListener("click", () => this.on_lock_button_click());
            this.unlock_button.addEventListener("click", () => this.on_unlock_button_click());
            this.change_password_button.addEventListener("click", () =>
                this.on_change_password_button_click()
            );
            add_message_listener(message => {
                if (message.kind === "lock-status-change") {
                    this.update_active_lock_control_button();
                }
            });
        }

        async on_lock_button_click() {
            await lock_bookmarks();
            await activate_panel("lock-success-panel");
        }

        async on_unlock_button_click() {
            await activate_panel("authentication-panel", {
                context_kind: "authentication_context",
                previous_panel_id: "main-menu-panel",
                next_panel_id: "unlock-progress-panel",
            });
        }

        async on_change_password_button_click() {
            await activate_panel("authentication-panel", {
                context_kind: "authentication_context",
                previous_panel_id: "main-menu-panel",
                next_panel_id: "password-setup-panel",
            });
        }

        async update_active_lock_control_button(): Promise<HTMLElement> {
            if (await bookmarks_locked()) {
                this.lock_button.classList.remove("active");
                this.unlock_button.classList.add("active");
                return this.unlock_button;
            } else {
                this.lock_button.classList.add("active");
                this.unlock_button.classList.remove("active");
                return this.lock_button;
            }
        }

        async activate() {
            const active_button = await this.update_active_lock_control_button();
            setTimeout(() => active_button.focus(), 100);
        }
    })(),

    "authentication-panel": new (class implements Panel {
        password_input = element_by_id("authentication-password-input", HTMLInputElement);
        confirm_button = element_by_id("confirm-authentication-button", HTMLButtonElement);
        cancel_button = element_by_id("cancel-authentication-button", HTMLButtonElement);
        context?: AuthenticationContext;

        constructor() {
            this.password_input.addEventListener("keydown", event =>
                this.on_password_input_key_down(event)
            );
            this.confirm_button.addEventListener("click", () => this.on_confirm_button_click());
            this.cancel_button.addEventListener("click", () => this.on_cancel_button_click());
        }

        on_password_input_key_down(event: KeyboardEvent) {
            if (event.key === "Enter") {
                this.confirm_button.click();
            }
        }

        async on_confirm_button_click() {
            const password = this.password_input.value;
            this.password_input.value = "";

            if ((await password_correct(password)) && this.context) {
                await activate_panel(this.context.next_panel_id, {
                    context_kind: "password_context",
                    password,
                });
            } else {
                this.password_input.classList.add("animated");
                setTimeout(() => this.password_input.classList.remove("animated"), 500);
            }
        }

        async on_cancel_button_click() {
            if (this.context) {
                await activate_panel(this.context.previous_panel_id);
            }
        }

        async activate(context?: PanelContext) {
            this.password_input.value = "";

            if (context?.context_kind === "authentication_context") {
                this.context = context;
            }

            setTimeout(() => this.password_input.focus(), 100);
        }
    })(),

    "unlock-progress-panel": new (class implements Panel {
        panel = element_by_id("unlock-progress-panel", HTMLElement);
        progress_indicator = element_by_id("progress-indicator", HTMLElement);
        progress_status_message = element_by_id("progress-status-message", HTMLElement);

        constructor() {
            add_message_listener(async message => {
                if (
                    message.kind === "lock-status-change" &&
                    !(await bookmarks_locked()) &&
                    this.panel.classList.contains("active")
                ) {
                    await activate_panel("unlock-success-panel");
                }
            });
        }

        on_progress(current: number, total: number) {
            const progress_percent = Math.ceil(100 * (current / total));
            this.progress_indicator.style.width = `${progress_percent}%`;
            this.progress_status_message.textContent = `${current} / ${total}`;
        }

        async activate(context?: PanelContext) {
            this.progress_indicator.style.width = "0";
            this.progress_status_message.textContent = "";

            if (context?.context_kind === "password_context") {
                unlock_bookmarks(context.password, this.on_progress.bind(this));
            }
        }
    })(),

    "unlock-success-panel": {
        async activate() {
            const backup_reminder = element_by_id("backup-reminder", HTMLElement);
            backup_reminder.classList.remove("active");

            if (await backup_reminder_is_due()) {
                await reset_backup_reminder();
                backup_reminder.classList.add("active");
                backup_reminder.addEventListener(
                    "click",
                    () => {
                        backup_reminder.classList.remove("active");
                    },
                    { once: true }
                );
            }

            element_by_id("unlock-success-go-to-menu-button", HTMLElement).addEventListener(
                "click",
                async () => {
                    await activate_panel(await main_panel_id());
                },
                { once: true }
            );

            const node_id = await get_from_storage<string>(BOOKMARKS_NODE_ID_STORAGE_KEY);
            if (!node_id) {
                return;
            }

            const bookmarks_node = (await browser.bookmarks.get(node_id)).pop();
            if (!bookmarks_node) {
                return;
            }

            if (!bookmarks_node.parentId) {
                return;
            }

            const parent_node = (await browser.bookmarks.get(bookmarks_node.parentId)).pop();
            if (!parent_node) {
                return;
            }

            element_by_id("unlock-success-message", HTMLElement).textContent =
                browser.i18n.getMessage("success_unlock", [
                    bookmarks_node.title,
                    parent_node.title,
                ]);
        },
    },

    "lock-success-panel": {
        async activate() {
            element_by_id("lock-success-go-to-menu-button", HTMLElement).addEventListener(
                "click",
                async () => {
                    await activate_panel(await main_panel_id());
                },
                { once: true }
            );
        },
    },

    "error-panel": {},
};

async function activate_panel(id: PanelId, context?: PanelContext) {
    const new_active_panel_element = element_by_id(id, HTMLElement);
    const new_active_panel = PANELS[id];
    if (new_active_panel.activate) {
        await new_active_panel.activate(context);
    }

    const old_active_panel_element = document.querySelector(".active.panel");
    if (old_active_panel_element) {
        old_active_panel_element.classList.remove("active");
    }
    new_active_panel_element.classList.add("active");
}

async function apply_theme() {
    if ((await options()).theme === "light") {
        document.body.classList.remove("theme-dark");
    } else {
        document.body.classList.add("theme-dark");
    }
}

async function toggle_theme() {
    const current_options = await options();
    const new_options = deep_copy(current_options);
    new_options.theme = current_options.theme === "light" ? "dark" : "light";
    await save_options(new_options);
}

when_document_ready(async () => {
    localize_document();

    element_by_id("extension-version", HTMLElement).textContent =
        browser.runtime.getManifest().version;

    element_by_id("theme-button", HTMLElement).addEventListener("click", () => toggle_theme());
    element_by_id("options-button", HTMLElement).addEventListener("click", () =>
        browser.runtime.openOptionsPage()
    );

    apply_theme();
    add_message_listener(message => {
        if (message.kind === "options-change") {
            apply_theme();
        }
    });

    activate_panel(await main_panel_id());

    await maybe_show_release_notes();
});
