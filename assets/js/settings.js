/* =====================================================================
   PANEL DE AJUSTES · preferencias persistentes
   (calidad del shader, nivel de movimiento, fondo on/off)
   ===================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const panel = document.getElementById("settingsPanel");
    if (!panel) return;

    const STORAGE = "wk-settings";
    const defaults = { quality: "alta", motion: "full", background: true };

    let state = { ...defaults };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      state = { ...defaults, ...saved };
    } catch (e) { /* ignorar */ }

    const t = window.WKi18n ? window.WKi18n.t : () => "";

    function applyQuality() {
      if (window.WKFluted) window.WKFluted.setQuality(state.quality);
    }

    function applyMotion() {
      const root = document.documentElement;
      root.classList.remove("motion-full", "motion-reduced", "motion-off");
      root.classList.add("motion-" + state.motion);

      // Tinta: "off" la apaga por completo (el bloque más caro)
      if (window.WKInk) window.WKInk.setEnabled(state.motion !== "off");

      // Auto-avance del carrusel y marquee respetan el nivel
      const reduced = state.motion !== "full";
      const off = state.motion === "off";
      document.dispatchEvent(new CustomEvent("wk:motion", { detail: { reduced, off } }));
    }

    function applyBackground() {
      if (!window.WKFluted) return;
      if (state.background) {
        document.querySelector(".bg-fluted").style.display = "";
        window.WKFluted.resume();
      } else {
        document.querySelector(".bg-fluted").style.display = "none";
        window.WKFluted.pause();
      }
    }

    function applyAll() {
      applyQuality();
      applyMotion();
      applyBackground();
    }

    // Sincroniza la UI del panel con el estado
    function syncUI() {
      panel.querySelectorAll('[data-setting="quality"] button').forEach((b) => {
        b.setAttribute("aria-checked", String(b.dataset.value === state.quality));
      });
      panel.querySelectorAll('[data-setting="motion"] button').forEach((b) => {
        b.setAttribute("aria-checked", String(b.dataset.value === state.motion));
      });
      const chk = document.getElementById("bgToggle");
      if (chk) chk.checked = state.background;
    }

    function save() {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    }

    // Clicks en los segmentados
    panel.querySelectorAll("[data-setting]").forEach((group) => {
      const setting = group.dataset.setting;
      group.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          state[setting] = btn.dataset.value;
          syncUI();
          save();
          if (setting === "quality") applyQuality();
          if (setting === "motion") applyMotion();
        });
      });
    });

    const bgToggle = document.getElementById("bgToggle");
    if (bgToggle) {
      bgToggle.addEventListener("change", () => {
        state.background = bgToggle.checked;
        save();
        applyBackground();
      });
    }

    // Sincronizar el estado del sistema operativo la primera vez
    if (!localStorage.getItem(STORAGE)) {
      // Default "full": el marquee y los reveals deben moverse por defecto.
      // El blanket prefers-reduced-motion sigue aplicando si el usuario elige
      // "Reducido"/"Off" (clases motion-reduced / motion-off).
      state.motion = "full";
    }

    applyAll();
    syncUI();

    // Cerrar al hacer clic fuera del panel (el popover nativo ya lo hace,
    // pero reforzamos el foco del botón)
    panel.addEventListener("toggle", (e) => {
      const btn = document.getElementById("settingsBtn");
      if (btn && e.newState === "closed") btn.focus();
    });
  });
})();