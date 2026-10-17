/* =====================================================================
   DOCK SOCIAL FLOTANTE · redes + copiar enlace del sitio
   ===================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const cfg = window.WKConfig;
    const list = document.getElementById("socialDockList");
    if (!cfg || !list) return;

    const brandIcon = window.WKIcons.brandIcon;
    const svgIcon = window.WKIcons.svgIcon;

    const LABELS = {
      es: { github: "GitHub", linkedin: "LinkedIn", facebook: "Facebook", whatsapp: "WhatsApp", email: "Correo" },
      en: { github: "GitHub", linkedin: "LinkedIn", facebook: "Facebook", whatsapp: "WhatsApp", email: "Email" },
      pt: { github: "GitHub", linkedin: "LinkedIn", facebook: "Facebook", whatsapp: "WhatsApp", email: "E-mail" },
    };
    const lang = window.WKi18n ? window.WKi18n.lang : "es";

    function render() {
      const lang = window.WKi18n ? window.WKi18n.lang : "es";
      list.innerHTML = "";
      cfg.social.forEach((s, i) => {
        const a = document.createElement("a");
        a.className = "dock-icon-wrapper";
        a.href = s.url;
        a.target = s.id === "email" ? "_self" : "_blank";
        a.rel = "noopener";
        a.setAttribute("aria-label", (LABELS[lang] || LABELS.es)[s.id] || s.id);
        a.style.animationDelay = i * 70 + "ms";
        a.innerHTML =
          `<span class="dock-icon dock-${s.id}" aria-hidden="true">${brandIcon(s.brand)}</span>` +
          `<span class="dock-tooltip" aria-hidden="true">${(LABELS[lang] || LABELS.es)[s.id] || s.id}</span>`;
        list.appendChild(a);
      });
    }
    render();
    document.addEventListener("wk:langchange", render);

    /* ---------------- Copiar enlace del sitio ---------------- */
    const copyBtn = document.getElementById("copyUrlBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const t = window.WKi18n ? window.WKi18n.t : () => "";
        const url = window.location.href;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
          } else {
            const ta = document.createElement("textarea");
            ta.value = url;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            if (!ok) throw new Error("execCommand falló");
          }
          if (window.WKToast) window.WKToast(t("dock.copied"));
        } catch (err) {
          if (window.WKToast) window.WKToast(`${t("dock.copyError")} ${url}`, true);
        }
      });
    }
  });
})();
