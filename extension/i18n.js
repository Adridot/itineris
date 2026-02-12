(function () {
    function interpolate(template, variables) {
        if (!variables || typeof variables !== "object") {
            return template;
        }

        let output = template;
        for (const [name, value] of Object.entries(variables)) {
            output = output.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
        }
        return output;
    }

    function t(key, variables) {
        const raw = chrome.i18n.getMessage(key) || key;
        return interpolate(raw, variables);
    }

    function applyI18n(root) {
        const scope = root || document;

        if (document && document.documentElement) {
            const uiLanguage = chrome.i18n.getUILanguage() || "en";
            document.documentElement.lang = uiLanguage.split("-")[0] || "en";
        }

        if (document) {
            const titleNode = document.querySelector("title[data-i18n-document-title]");
            if (titleNode) {
                document.title = t(titleNode.dataset.i18nDocumentTitle);
            } else {
                document.title = t("app_name");
            }
        }

        const textNodes = scope.querySelectorAll("[data-i18n]");
        for (const node of textNodes) {
            const key = node.dataset.i18n;
            node.textContent = t(key);
        }

        const placeholderNodes = scope.querySelectorAll("[data-i18n-placeholder]");
        for (const node of placeholderNodes) {
            const key = node.dataset.i18nPlaceholder;
            node.setAttribute("placeholder", t(key));
        }

        const titleNodes = scope.querySelectorAll("[data-i18n-title]");
        for (const node of titleNodes) {
            const key = node.dataset.i18nTitle;
            node.setAttribute("title", t(key));
        }

        const ariaNodes = scope.querySelectorAll("[data-i18n-aria-label]");
        for (const node of ariaNodes) {
            const key = node.dataset.i18nAriaLabel;
            node.setAttribute("aria-label", t(key));
        }
    }

    window.i18n = {
        t,
        apply: applyI18n
    };
})();
