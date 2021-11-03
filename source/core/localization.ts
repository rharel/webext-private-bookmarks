import { browser } from "webextension-polyfill-ts";

export const ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID = "data-localized";
export const ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME = "data-localized-attribute";
export const ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID =
    "data-localized-attribute-value";

export function localize_element_content(element: Element): void {
    const localized_content_message_id = element.getAttribute(
        ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID
    );
    if (localized_content_message_id !== null) {
        const localized_content = browser.i18n.getMessage(
            localized_content_message_id
        );
        if (localized_content.length > 0) {
            element.textContent = localized_content;
        }
    }
}

export function localize_element_attribute(element: Element): void {
    const localized_attribute_name = element.getAttribute(
        ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME
    );
    const localized_attribute_value_message_id = element.getAttribute(
        ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID
    );
    if (
        localized_attribute_name !== null &&
        localized_attribute_value_message_id !== null
    ) {
        const localized_attribute_value = browser.i18n.getMessage(
            localized_attribute_value_message_id
        );
        if (localized_attribute_value.length > 0) {
            element.setAttribute(
                localized_attribute_name,
                localized_attribute_value
            );
        }
    }
}

export function localize_document(): void {
    document
        .querySelectorAll(`[${ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID}]`)
        .forEach(element => localize_element_content(element));
    document
        .querySelectorAll(
            `[${ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME}]` +
                `[${ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID}]`
        )
        .forEach(element => localize_element_attribute(element));
}
