/* =====================================================================
   NAVBAR · scroll, barra de progreso, menú móvil, tema, idioma
   ===================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("navbar");
    const progress = document.getElementById("scrollProgress");
    const menu = document.getElementById("mobileMenu");
    const overlay = document.getElementById("menuOverlay");
    const toggle = document.getElementById("navToggle");
    const themeToggle = document.getElementById("themeToggle");

    /* ---------- Scroll: navbar glass + barra de progreso ----------
       Guía §2/§4: si el navegador soporta `animation-timeline: scroll()`,
       la barra la anima el compositor y este script deja de tocar su estilo.
       Si no, se calcula aquí con `transform: scaleX()` (nunca `width`, que
       provocaría layout en cada frame). */
    const SCROLL_DRIVEN =
      typeof CSS !== "undefined" && CSS.supports && CSS.supports("animation-timeline: scroll()");

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (navbar) navbar.classList.toggle("scrolled", y > 24);

        if (progress && !SCROLL_DRIVEN) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const pct = max > 0 ? Math.min(1, y / max) : 0;
          progress.style.transform = "scaleX(" + pct + ")";
        }
        ticking = false;
      });
    }

    if (SCROLL_DRIVEN && progress) {
      progress.removeAttribute("role");
      progress.removeAttribute("aria-label");
      progress.setAttribute("aria-hidden", "true");
    } else if (progress) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ---------- Menú móvil (entra desde la izquierda) ---------- */
    function setMenu(open) {
      if (!menu || !overlay || !toggle) return;
      menu.classList.toggle("open", open);
      overlay.classList.toggle("active", open);
      overlay.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      const label = window.WKi18n ? window.WKi18n.t(open ? "nav.close" : "nav.menu") : null;
      if (label) toggle.setAttribute("aria-label", label);
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        const first = menu.querySelector("a");
        if (first) first.focus();
      }
    }

    if (toggle) toggle.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    if (overlay) overlay.addEventListener("click", () => setMenu(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu && menu.classList.contains("open")) setMenu(false);
    });
    if (menu) {
      menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    }
    // Cerrar si se agranda a desktop
    window.matchMedia("(min-width: 1024px)").addEventListener?.("change", (ev) => {
      if (ev.matches) setMenu(false);
    });

    /* ---------- Tema oscuro / claro ---------- */
    function applyTheme(light) {
      document.documentElement.classList.toggle("theme-light", light);
      localStorage.setItem("wk-theme", light ? "light" : "dark");
      if (themeToggle && window.WKi18n) {
        const label = window.WKi18n.t(light ? "nav.theme.toDark" : "nav.theme.toLight");
        if (label) themeToggle.setAttribute("aria-label", label);
      }
    }

    const saved = localStorage.getItem("wk-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(saved ? saved === "light" : prefersLight);

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        applyTheme(!document.documentElement.classList.contains("theme-light"));
      });
    }

    /* ---------- Enlace activo según sección visible ---------- */
    const links = Array.from(document.querySelectorAll(".navbar__links a, .mobile-menu a[href^='#']"));
    const sections = Array.from(document.querySelectorAll("main section[id]"));
    if ("IntersectionObserver" in window && sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          links.forEach((l) => {
            if (l.getAttribute("href") === id) l.setAttribute("aria-current", "true");
            else l.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      sections.forEach((s) => io.observe(s));
    }
  });
})();
