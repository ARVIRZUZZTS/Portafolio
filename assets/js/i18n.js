/* =====================================================================
   i18n · Selector de idioma ES / EN / PT
   ===================================================================== */
(function () {
  const STORAGE_KEY = "wk-lang";
  const LANGS = ["es", "en", "pt"];
  const dict = window.WKConfig ? window.WKConfig.i18n : {};

  let current = localStorage.getItem(STORAGE_KEY) || "es";
  if (!LANGS.includes(current)) current = "es";

  function t(key) {
    const d = dict[current] || {};
    return d[key] ?? null;
  }

  function applyAttributes(root) {
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        const value = t(key);
        if (attr && value !== null) el.setAttribute(attr, value);
      });
    });
  }

  function apply(root) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = t(el.getAttribute("data-i18n"));
      if (value !== null) el.textContent = value;
    });
    applyAttributes(root);

    const titleKey = t("meta.title");
    if (titleKey) document.title = titleKey;
    document.documentElement.lang = current;

    // Toggle de tema: su aria-label depende del estado actual
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      const isLight = document.documentElement.classList.contains("theme-light");
      const label = t(isLight ? "nav.theme.toDark" : "nav.theme.toLight");
      if (label) toggle.setAttribute("aria-label", label);
    }

    const select = document.getElementById("langSelect");
    if (select) select.value = current;

    document.dispatchEvent(new CustomEvent("wk:langchange", { detail: { lang: current } }));
  }

  function setLang(lang) {
    if (!LANGS.includes(lang) || lang === current) return;
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    apply(document);
  }

  // Exponer API
  window.WKi18n = { t, setLang, apply, get lang() { return current; } };

  document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("langSelect");
    if (select) {
      select.value = current;
      select.addEventListener("change", (e) => setLang(e.target.value));
    }
    apply(document);
  });

  // Aplicación inmediata para evitar flash de idioma incorrecto
  apply(document);
})();
