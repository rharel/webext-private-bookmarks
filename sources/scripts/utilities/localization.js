(function()
{
    const LOCALIZATION_MESSAGE = "data-localized";
    const LOCALIZATION_ATTRIBUTE = "data-localized-attribute";

    document.querySelectorAll(`*[${LOCALIZATION_MESSAGE}]`).forEach(element =>
    {
        const message = browser.i18n.getMessage(element.getAttribute(LOCALIZATION_MESSAGE));

        if (element.hasAttribute(LOCALIZATION_ATTRIBUTE))
        {
            element.setAttribute(element.getAttribute(LOCALIZATION_ATTRIBUTE), message);
        }
        else { element.textContent = message; }
    });
})();
