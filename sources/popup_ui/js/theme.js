(function()
{
    const is_dark = localStorage.getItem("theme") === "dark";

    const style_link = document.createElement("link");
    style_link.id = "theme-stylesheet";
    style_link.rel = "stylesheet";
    style_link.href = `css/${is_dark ? "dark" : "light"}.css`;

    const head = document.getElementsByTagName("head")[0];
    head.appendChild(style_link);
})();
