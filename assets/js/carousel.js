/* =====================================================================
   CARRUSEL DE LIBROS · Card Stack 3D
   Portado de components/carousels/carousel_1 y adaptado al portafolio
   (auto-avance, arrastre, teclado, dots).
   ===================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const cfg = window.WKConfig;
    if (!cfg || !cfg.books) return;

    const items = cfg.books.map((b) => ({
      id: b.id,
      cover: b.cover,
      title: b.meta.es.title,
      author: b.meta.es.author,
    }));

    const stackCards = document.getElementById("bookStackCards");
    const stackDots = document.getElementById("bookStackDots");
    if (!stackCards) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let activeIndex = 0;
    let autoAdvanceTimer = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragOffsetX = 0;
    let dragVelocity = 0;
    let lastDragX = 0;
    let lastDragTime = 0;
    let motionOff = false;

    // Respetar el nivel de movimiento del panel de ajustes
    document.addEventListener("wk:motion", (e) => {
      motionOff = e.detail.reduced || e.detail.off;
      if (motionOff) {
        if (autoAdvanceTimer) { clearInterval(autoAdvanceTimer); autoAdvanceTimer = null; }
        renderCards();
      } else {
        resetAutoAdvance();
      }
    });

    const MAX_VISIBLE = 5;
    const CARD_WIDTH = 206;   // debe coincidir con .stack-card en components.css
    const CARD_HEIGHT = 282;
    const TEXT_BELOW = 46;    // alto reservado bajo la card para el texto
    const OVERLAP = 0.64;     // más cerrado: antes el abanico se salía 33px
    const SPREAD_DEG = 34;
    const DEPTH_PX = 130;
    const TILT_X_DEG = 10;
    const ACTIVE_LIFT_PX = 18;
    const ACTIVE_SCALE = 1.04;
    const INACTIVE_SCALE = 0.93;
    const INTERVAL_MS = 3200;

    const wrapIndex = (n, len) => ((n % len) + len) % len;

    function signedOffset(i, active, len) {
      const raw = i - active;
      const alt = raw > 0 ? raw - len : raw + len;
      return Math.abs(alt) < Math.abs(raw) ? alt : raw;
    }

    function renderCards() {
      const len = items.length;
      const maxOffset = Math.max(0, Math.floor(MAX_VISIBLE / 2));
      const stage = document.getElementById("bookStack");
      // Medir el ancho real evita que el abanico se salga en pantallas estrechas
      const stageW = stage ? stage.clientWidth - 48 : CARD_WIDTH * 3;
      const spacing = Math.min(
        Math.max(10, Math.round(CARD_WIDTH * (1 - OVERLAP))),
        Math.floor(stageW / Math.max(1, maxOffset * 2)) - 18
      );
      const stepDeg = maxOffset > 0 ? SPREAD_DEG / maxOffset : 0;
      const effectiveLen = spacing * maxOffset * 2 + CARD_WIDTH;
      // Limitar el cardSpacing cuando la ventana es angosta
      const cardSpacing = Math.max(10, spacing);

      stackCards.innerHTML = "";

      items.forEach((item, i) => {
        const off = signedOffset(i, activeIndex, len);
        const abs = Math.abs(off);
        if (abs > maxOffset) return;

        const isActive = off === 0;
        const scale = isActive ? ACTIVE_SCALE : INACTIVE_SCALE;
        const lift = isActive ? -ACTIVE_LIFT_PX : 0;
        const rotateX = isActive ? 0 : TILT_X_DEG;
        const y = abs * 8 + lift - (effectiveLen > stageW ? abs * 2 : 0);

        const card = document.createElement("div");
        card.className = `stack-card${isActive ? " is-active" : ""}`;
        card.style.transform =
          `translateX(${off * cardSpacing}px) translateY(${y}px) ` +
          `rotateZ(${off * stepDeg}deg) rotateX(${rotateX}deg) scale(${scale}) translateZ(${-abs * DEPTH_PX}px)`;
        card.style.zIndex = String(100 - abs);

        card.innerHTML = `
          <img src="${item.cover}" alt="${item.title} — ${item.author}" loading="lazy" decoding="async">
          <div class="stack-card-overlay"></div>
          <div class="stack-card-content">
            <div class="stack-card-title">${item.title}</div>
            <div class="stack-card-desc">${item.author}</div>
          </div>`;

        card.addEventListener("click", () => { if (!isActive) setActive(i); });
        if (isActive) {
          card.addEventListener("mousedown", onDragStart);
          card.addEventListener("touchstart", onDragStart, { passive: true });
        }
        stackCards.appendChild(card);
      });
    }

    function renderDots() {
      if (!stackDots) return;
      stackDots.innerHTML = "";
      items.forEach((item, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = `stack-dot${i === activeIndex ? " is-active" : ""}`;
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-selected", String(i === activeIndex));
        dot.setAttribute("aria-label", `${item.title} — ${item.author}`);
        dot.addEventListener("click", () => setActive(i));
        stackDots.appendChild(dot);
      });
    }

    function setActive(index) {
      activeIndex = wrapIndex(index, items.length);
      renderCards();
      renderDots();
      resetAutoAdvance();
    }

    function next() { setActive(activeIndex + 1); }
    function prev() { setActive(activeIndex - 1); }

    function resetAutoAdvance() {
      if (autoAdvanceTimer) { clearInterval(autoAdvanceTimer); autoAdvanceTimer = null; }
      if (reduced || motionOff) return;
      autoAdvanceTimer = setInterval(() => {
        if (!document.hidden) next();
      }, INTERVAL_MS);
    }

    function onDragStart(e) {
      if (e.type === "touchstart") {
        dragStartX = e.touches[0].clientX;
        lastDragX = e.touches[0].clientX;
      } else {
        dragStartX = e.clientX;
        lastDragX = e.clientX;
      }
      lastDragTime = Date.now();
      dragVelocity = 0;
      isDragging = true;
      dragOffsetX = 0;
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragEnd);
      document.addEventListener("touchmove", onDragMove, { passive: true });
      document.addEventListener("touchend", onDragEnd);
    }

    function onDragMove(e) {
      if (!isDragging) return;
      const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
      const now = Date.now();
      const dt = now - lastDragTime;
      if (dt > 0) dragVelocity = (clientX - lastDragX) / dt;
      lastDragX = clientX;
      dragOffsetX = clientX - dragStartX;

      const card = stackCards.querySelector(".is-active");
      if (card) {
        const base = card.style.transform.replace(/translateX\([^)]*\)\s*$/, "");
        card.style.transform = base + ` translateX(${dragOffsetX * 0.3}px)`;
      }
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      const threshold = Math.min(120, CARD_WIDTH * 0.3);
      const velocityThreshold = 0.5;
      if (reduced) {
        if (dragOffsetX > threshold) prev();
        else if (dragOffsetX < -threshold) next();
        else renderCards();
      } else {
        if (dragOffsetX > threshold || dragVelocity > velocityThreshold) prev();
        else if (dragOffsetX < -threshold || dragVelocity < -velocityThreshold) next();
        else renderCards();
      }
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
      document.removeEventListener("touchmove", onDragMove);
      document.removeEventListener("touchend", onDragEnd);
    }

    // Teclado: flechas dentro del área del carrusel
    const stack = document.getElementById("bookStack");
    if (stack) {
      stack.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      });
    }

    // Pausar auto-avance mientras el puntero esté sobre el carrusel
    if (stack) {
      stack.addEventListener("pointerenter", () => { if (autoAdvanceTimer) { clearInterval(autoAdvanceTimer); autoAdvanceTimer = null; } });
      stack.addEventListener("pointerleave", () => resetAutoAdvance());
    }

    renderCards();
    renderDots();
    resetAutoAdvance();

    // Recalcular el abanico al cambiar el tamaño de la ventana
    if ("ResizeObserver" in window && stack) {
      let raf = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(renderCards);
      }).observe(stack);
    }
  });
})();
