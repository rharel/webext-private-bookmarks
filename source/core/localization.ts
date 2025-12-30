import browser from "webextension-polyfill";

export const ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID = "data-localized";
export const ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME = "data-localized-attribute";
export const ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID = "data-localized-attribute-value";

export function localize_element_content(element: Element): void {
    const message_id = element.getAttribute(ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID);
    if (message_id !== null) {
        const localized_content = browser.i18n.getMessage(message_id);
        if (localized_content.length > 0) {
            element.textContent = localized_content;
        }
    }
}

export function localize_element_attribute(element: Element): void {
    const attribute_name = element.getAttribute(ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME);
    const message_id = element.getAttribute(ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID);
    if (attribute_name !== null && message_id !== null) {
        const localized_attribute_value = browser.i18n.getMessage(message_id);
        if (localized_attribute_value.length > 0) {
            element.setAttribute(attribute_name, localized_attribute_value);
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
