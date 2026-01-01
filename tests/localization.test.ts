import "mockzilla-webextension";

import {
    ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME,
    ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID,
    ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID,
    localize_document,
    localize_element_attribute,
    localize_element_content,
} from "../source/core/localization";

describe("localization module", () => {
    const target_attribute = "some-attribute";
    const default_value = "Hello World";
    const localized_value = "Ciao mondo";
    const localized_message_id = "localized_message_id";

    function dummy_element(): Element {
        const element = document.createElement("div");
        element.textContent = default_value;
        element.setAttribute(target_attribute, default_value);
        return element;
    }

    function dummy_localized_element(): Element {
        const element = dummy_element();
        element.setAttribute(ATTRIBUTE_LOCALIZED_CONTENT_MESSAGE_ID, localized_message_id);
        element.setAttribute(ATTRIBUTE_LOCALIZED_ATTRIBUTE_NAME, target_attribute);
        element.setAttribute(ATTRIBUTE_LOCALIZED_ATTRIBUTE_VALUE_MESSAGE_ID, localized_message_id);
        return element;
    }

    describe("element content localization", () => {
        it("should not alter non-localized elements", () => {
            const element = dummy_element();

            localize_element_content(element);

            expect(element.textContent).toEqual(default_value);
        });

        it("should not alter localized elements with invalid message id", () => {
            const element = dummy_localized_element();

            mockBrowser.i18n.getMessage.expect(localized_message_id).andReturn("");

            localize_element_content(element);

            expect(element.textContent).toEqual(default_value);
        });

        it("should alter localized elements", () => {
            const element = dummy_localized_element();

            mockBrowser.i18n.getMessage.expect(localized_message_id).andReturn(localized_value);

            localize_element_content(element);

            expect(element.textContent).toEqual(localized_value);
        });
    });

    describe("element attribute localization", () => {
        it("should not alter non-localized attributes", () => {
            const element = dummy_element();

            localize_element_attribute(element);

            expect(element.getAttribute(target_attribute)).toEqual(default_value);
        });

        it("should not alter localized attributes with invalid message id", () => {
            const element = dummy_localized_element();

            mockBrowser.i18n.getMessage.expect(localized_message_id).andReturn("");

            localize_element_attribute(element);

            expect(element.getAttribute(target_attribute)).toEqual(default_value);
        });

        it("should alter localized attributes", () => {
            const element = dummy_localized_element();

            mockBrowser.i18n.getMessage.expect(localized_message_id).andReturn(localized_value);

            localize_element_attribute(element);

            expect(element.getAttribute(target_attribute)).toEqual(localized_value);
        });
    });

    describe("document localization", () => {
        let non_localized_element: Element;
        let localized_element: Element;

        beforeEach(() => {
            non_localized_element = dummy_element();
            localized_element = dummy_localized_element();

            document.body.appendChild(non_localized_element);
            document.body.appendChild(localized_element);
        });

        afterEach(() => {
            document.body.innerHTML = "";
        });

        it("should not alter localized elements with invalid message id", () => {
            mockBrowser.i18n.getMessage.expect(localized_message_id).andReturn("").times(2);

            localize_document();

            expect(non_localized_element.textContent).toEqual(default_value);
            expect(non_localized_element.getAttribute(target_attribute)).toEqual(default_value);

            expect(localized_element.textContent).toEqual(default_value);
            expect(localized_element.getAttribute(target_attribute)).toEqual(default_value);
        });

        it("should alter localized elements only", () => {
            mockBrowser.i18n.getMessage
                .expect(localized_message_id)
                .andReturn(localized_value)
                .times(2);

            localize_document();

            expect(non_localized_element.textContent).toEqual(default_value);
            expect(non_localized_element.getAttribute(target_attribute)).toEqual(default_value);

            expect(localized_element.textContent).toEqual(localized_value);
            expect(localized_element.getAttribute(target_attribute)).toEqual(localized_value);
        });
    });
});
