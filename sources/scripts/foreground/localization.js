(function()
{
    const LOCALIZED_TEXT = "data-localized";
    const LOCALIZED_ATTRIBUTE = "data-localized-attribute";
    const LOCALIZED_ATTRIBUTE_VALUE = "data-localized-attribute-value";

    document.querySelectorAll(`[${LOCALIZED_TEXT}]`).forEach(element =>
    {
        const message = browser.i18n.getMessage(
            element.getAttribute(LOCALIZED_TEXT)
        );
        if (message !== "") { element.textContent = message; }
    });
    document.querySelectorAll(`[${LOCALIZED_ATTRIBUTE}]`).forEach(element =>
    {
        const message = browser.i18n.getMessage(
            element.getAttribute(LOCALIZED_ATTRIBUTE_VALUE)
        );
        if (message !== "")
        {
            element.setAttribute(
                element.getAttribute(LOCALIZED_ATTRIBUTE),
                message
            );
        }
    });
})();
