import "mockzilla-webextension";

import { element_by_id, when_document_ready } from "../source/core/ui";

describe("UI module", () => {
    describe("document ready call hook", () => {
        it("should invoke callback immediately if document is already loaded", () => {
            const callback = jest.fn();

            when_document_ready(callback);

            expect(callback);
        });

        it("should invoke callback when document is interactive if still loading", () => {
            jest.spyOn(document, "readyState", "get").mockReturnValue(
                "loading"
            );

            const callback = jest.fn();

            when_document_ready(callback);
            expect(callback).not.toHaveBeenCalled();

            document.dispatchEvent(new Event("DOMContentLoaded"));
            expect(callback).toHaveBeenCalledTimes(1);

            // Ensure callback triggers at most once, even for multiple load events.
            document.dispatchEvent(new Event("DOMContentLoaded"));
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe("element getter", () => {
        let anchor: HTMLAnchorElement;

        beforeEach(() => {
            anchor = document.createElement("a");
            anchor.id = "foo";

            document.body.appendChild(anchor);
        });

        afterEach(() => {
            document.body.innerHTML = "";
        });

        it("should fail when id is invalid", () => {
            expect(() =>
                element_by_id(`${anchor.id}-other`, HTMLAnchorElement)
            ).toThrowError("bad element id");
        });

        it("should fail on type mismatch", () => {
            expect(() =>
                element_by_id(anchor.id, HTMLInputElement)
            ).toThrowError("unexpected element type");
        });

        it("should succeed when element with the right id and type exists", () => {
            expect(element_by_id(anchor.id, HTMLAnchorElement)).toBe(anchor);
        });
    });
});
