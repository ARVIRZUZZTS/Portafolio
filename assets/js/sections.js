/* =====================================================================
   SECCIONES · iconos, proyectos, stack, marquee, tarjetas 3D,
   barra de progreso y logo con efecto cursor.
   ===================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const cfg = window.WKConfig;
    if (!cfg) return;
    const icon = window.WKIcons.svgIcon;
    const brand = window.WKIcons.brandIcon;

    /* ---------------- 1. Iconos inline ([data-icon]) ---------------- */
    function renderIcons(root) {
      (root || document).querySelectorAll("[data-icon]").forEach((el) => {
        const name = el.getAttribute("data-icon");
        const cls = el.getAttribute("class") || "";
        const html = icon(name) || brand(name);
        if (html) el.innerHTML = html;
      });
    }
    renderIcons(document);

    /* ---------------- 2. Marquee infinito del stack ---------------- */
    const GROUP_ICONS = { frontend: "code", backend: "database", mobile: "smartphone", data: "database", tools: "wrench" };
    const GROUP_LABEL_KEYS = {
      frontend: "stack.frontend", backend: "stack.backend", mobile: "stack.mobile", data: "stack.data", tools: "stack.tools",
    };

    function allStack() {
      return Object.values(cfg.stack).flat();
    }

    function renderMarquee() {
      const track = document.getElementById("marqueeTrack");
      if (!track) return;
      const items = allStack();
      const html = [...items, ...items, ...items]
        .map(
          (t) => `<div class="marquee-item">
            <img src="assets/img/stack/${t.icon}.svg" alt="" width="26" height="26" loading="lazy" decoding="async">
            <span class="marquee-item-name">${t.name}</span>
          </div>`
        )
        .join("");
      track.innerHTML = html;
    }

    /* ---------------- 3. Grupos de stack ---------------- */
    function renderStackGroups() {
      const grid = document.getElementById("stackGrid");
      if (!grid) return;
      grid.innerHTML = Object.entries(cfg.stack)
        .map(([key, items]) => {
          const label = window.WKi18n ? window.WKi18n.t(GROUP_LABEL_KEYS[key]) : key;
          const groupIcon = icon(GROUP_ICONS[key]) || "";
          const chips = items
            .map(
              (t) => `<span class="stack-chip">
                <img src="assets/img/stack/${t.icon}.svg" alt="" width="20" height="20" loading="lazy" decoding="async">
                ${t.name}
              </span>`
            )
            .join("");
          return `<div class="stack-group reveal">
            <h3 class="stack-group__title">${groupIcon}<span>${label || key}</span></h3>
            <div class="stack-group__items">${chips}</div>
          </div>`;
        })
        .join("");
    }

    /* ---------------- 4. Proyectos · casos de estudio ---------------- */
    const PROJECT_ICONS = {
      encomiendas: "briefcase", pasajeros: "map-pin", flotas: "briefcase", retro: "code", nfc: "smartphone", whatsapp: "message-circle",
    };

    function renderProjects() {
      const grid = document.getElementById("projectsGrid");
      if (!grid) return;
      const lang = window.WKi18n ? window.WKi18n.lang : "es";
      const t = window.WKi18n ? window.WKi18n.t : () => "";

      grid.innerHTML = cfg.projects
        .map((p) => {
          const m = p.meta[lang] || p.meta.es;
          const pIcon = icon(PROJECT_ICONS[p.id]) || icon("briefcase");
          const tags = p.tags.map((tag) => `<span class="project-tag">${tag}</span>`).join("");
          return `<article class="project-card reveal" id="proj-${p.id}">
            <header class="project-card__head">
              <span class="project-card__icon" aria-hidden="true">${pIcon}</span>
              <div>
                <h3 class="project-card__title">${m.title}</h3>
                <div class="project-card__tags">${tags}</div>
              </div>
            </header>
            <div class="project-case">
              <div class="project-case__row">
                <span class="project-case__label">${t("projects.challenge")}</span>
                <p class="project-case__text">${m.challenge}</p>
              </div>
              <div class="project-case__row">
                <span class="project-case__label">${t("projects.solution")}</span>
                <p class="project-case__text">${m.solution}</p>
              </div>
              <div class="project-case__row">
                <span class="project-case__label">${t("projects.learning")}</span>
                <p class="project-case__text">${m.learning}</p>
              </div>
            </div>
            <footer class="project-card__links">
              <a class="link-btn link-btn--primary" href="${p.repo}" target="_blank" rel="noopener">${icon("github")}<span>${t("projects.code")}</span></a>
              <a class="link-btn" href="${p.demo}" target="_blank" rel="noopener">${icon("external-link")}<span>${t("projects.demo")}</span></a>
            </footer>
          </article>`;
        })
        .join("");
    }

    /* ---------------- 5. Tarjetas 3D con tilt ----------------
       Guía §6 (layout thrashing): leer `getBoundingClientRect()` dentro del
       manejador de `mousemove` obliga al motor a recalcular la geometría en
       cada movimiento. Se mide UNA vez y se reutiliza; solo se vuelve a medir
       al cambiar el tamaño de la ventana o el layout. */
    function initTiltCards() {
      const cards = Array.from(document.querySelectorAll("[data-tilt-card]")).map((scene) => {
        const card = scene.querySelector(".glass-card");
        if (!card) return null;
        const entry = { scene, card, rect: null };
        const measure = () => {
          entry.rect = card.getBoundingClientRect();
        };
        measure();

        if ("ResizeObserver" in window) new ResizeObserver(measure).observe(card);

        const onMove = (e) => {
          if (document.documentElement.classList.contains("motion-reduced") ||
              document.documentElement.classList.contains("motion-off")) return;
          const rect = entry.rect;
          if (!rect) return;
          const rotateX = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * -13;
          const rotateY = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 13;
          card.style.transform =
            "rotate3d(1,0,0," + rotateX.toFixed(2) + "deg) rotate3d(0,1,0," + rotateY.toFixed(2) + "deg)";
        };
        const onLeave = () => {
          card.style.transform = "rotate3d(0,0,0,0deg)";
        };

        scene.addEventListener("mousemove", onMove, { passive: true });
        scene.addEventListener("mouseleave", onLeave);
        return entry;
      }).filter(Boolean);

      // El rect queda desfasado al hacer scroll: se invalida, no se recalcula
      // en cada movimiento (eso sería volver al problema original).
      if (cards.length && "IntersectionObserver" in window) {
        let scheduled = false;
        const remeasure = () => {
          if (scheduled) return;
          scheduled = true;
          requestAnimationFrame(() => {
            scheduled = false;
            cards.forEach((c) => {
              c.rect = c.card.getBoundingClientRect();
            });
          });
        };
        window.addEventListener("scroll", remeasure, { passive: true });
        window.addEventListener("resize", remeasure, { passive: true });
      }
    }

    /* ---------------- 6. Barra de progreso (hero) ---------------- */
    function initProgress() {
      const fill = document.getElementById("progressFill");
      if (!fill || !("IntersectionObserver" in window)) {
        if (fill) fill.classList.add("animate");
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => fill.classList.add("animate"), 500);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      io.observe(fill);
    }

    /* ---------------- 7. Logo con efecto cursor ----------------
       Guía §6: nada de leer medidas en el bucle de puntero.
       Se usa `offsetX/offsetY` (vienen ya resueltos en el evento) y el
       resultado se aplica como `transform`, que compone en GPU. */
    function initLogoInk() {
      const el = document.getElementById("logoInk");
      if (!el) return;
      const glow = el.querySelector(".logo-ink__glow");
      if (!glow) return;

      let halfW = 0;
      let halfH = 0;
      const measure = () => {
        halfW = el.offsetWidth / 2;
        halfH = el.offsetHeight / 2;
      };
      measure();

      if ("ResizeObserver" in window) {
        new ResizeObserver(measure).observe(el);
      } else {
        window.addEventListener("resize", measure, { passive: true });
      }

      el.addEventListener(
        "pointermove",
        (e) => {
          glow.style.transform =
            "translate3d(" + (e.offsetX - halfW) + "px," + (e.offsetY - halfH) + "px,0)";
        },
        { passive: true }
      );

      el.addEventListener("pointerleave", () => {
        glow.style.transform = "translate3d(0,0,0)";
      });
    }

    /* ---------------- Init ---------------- */
    renderMarquee();
    renderStackGroups();
    renderProjects();
    initTiltCards();
    initProgress();
    initLogoInk();

    // Re-render dinámico al cambiar idioma
    document.addEventListener("wk:langchange", () => {
      renderStackGroups();
      renderProjects();
    });
  });
})();
