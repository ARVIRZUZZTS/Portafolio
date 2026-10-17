# OPTIMIZACION-ANIMACIONES.md

Aplicación de la guía [`obsidian-resources/guia-animaciones-web.md`](obsidian-resources/guia-animaciones-web.md) al portafolio: qué se corrigió, qué se dejó como está y por qué.

**Resumen:** 8 correcciones. 0 librerías añadidas (ni GSAP, ni Motion, ni PixiJS). El sitio se mantiene en HTML/CSS/JS vanilla y sube de nivel únicamente donde la guía lo justifica.

---

## 1. Diagnóstico: el principio que decide el 90% (guía §1)

> *No el lenguaje, sino el hilo donde se ejecuta el código.*

El sitio tiene tres bloques de animación con perfiles muy distintos:

| Bloque | Dónde se ejecuta el cálculo real | ¿Cumple? |
|---|---|---|
| Fondo global (shader "fluted glass") | **GPU** — WebGL; el hilo principal solo emite `drawArrays` | Sí, ya |
| Banda de tinta (solver de fluidos) | **GPU** — WebGL con FBOs y passes de Jacobi | Sí, ya |
| Interfaz (cards, navbar, reveals, dock) | Hilo principal / compositor | **Corregido** |

### Por qué **no** migramos los shaders a Web Worker

Era la migración que la guía sugiere (§3 nivel 6, §1 "hilo independiente") y la evaluamos descartarla a propósito:

- El cálculo **ya está fuera del hilo principal**: WebGL ejecuta los shaders en la GPU. El hilo principal únicamente encola el fotograma.
- `OffscreenCanvas` + Web Worker obligaría a sustituir el `requestAnimationFrame` por un temporizador propio, porque **los workers no tienen sincronización con el vsync**. Eso introduce *tearing* visible en un fondo de movimiento continuo.
- Safari Soporta `OffscreenCanvas` solo desde 16.4, así que exigiría un segundo camino de render completo.

**Coste/beneficio desfavorable.** Documentado aquí para que la decisión no se reabra sin argumentos nuevos.

Donde sí waste de cómputo era real (la tinta renderizando fuera de pantalla) se corrigió por *pause*, que es nivel 1 de la guía.

---

## 2. Correcciones aplicadas

### 2.1 Animar `transform` en vez de `width` (§1, §6)

`width` recalcula la geometría del documento en cada fotograma. Se sustituyó en los tres sitios que lo hacían:

| Elemento | Antes | Ahora | Archivo |
|---|---|---|---|
| Barra de progreso de lectura | `style.width = pct + "%"` | `transform: scaleX()` | `assets/js/navbar.js` |
| Barra de progreso del hero | `width: 0 → var(--progress)` | `transform: scaleX()` | `assets/css/components.css` |
| Subrayado de los enlaces del nav | `width: 0 → 100%` | `transform: scaleX()` | `style.css` |

Verificado en navegador: el `width` queda constante y solo cambia `transform`.

### 2.2 Barra de progreso sin JavaScript (§2, §4)

La barra.linked al scroll era el candidato obvio a scroll-driven. Ahora:

```css
@supports (animation-timeline: scroll()) {
  .scroll-progress {
    animation: scroll-progress linear both;
    animation-timeline: scroll(root block);
  }
}
```

- **Con soporte**: la barra la anima el compositor, cero JS, cero listeners de scroll.
- **Sin soporte**: `navbar.js` mantiene el fallback con `scaleX` (nunca `width`).
- `navbar.js` lo detecta con `CSS.supports(...)` y deja de escuchar el scroll para ese elemento (§7: *detecta y degrada*).

Resultado medido: `animationTimeline: "scroll(root)"`, `width: "1425px"` constante.

### 2.3 Navbar sin transición de geometría (§1)

El requisito era "al bajar se vuelve opaco, con desenfoque y **reduciendo ligeramente su tamaño**". La versión anterior animaba `padding`, que provoca layout.

- El `padding` quedó **fijo** en 14px; solo se transicionan `background`, `backdrop-filter` y `border-color`.
- El encogimiento se logra con `transform: scale(0.94)` en `.navbar__inner`, que compone en GPU.

### 2.4 Eliminar layout thrashing en las tarjetas 3D (§6)

`sections.js` llamaba `getBoundingClientRect()` **dentro** de cada `mousemove`, lo que fuerza al motor a recalcular la geometría en cada movimiento del ratón.

- La tarjeta se mide **una vez** y el rect se reutiliza.
- Se vuelve a medir vía `ResizeObserver` (cambio de tamaño) y en un `requestAnimationFrame` agrupado al hacer scroll, nunca por movimiento.
- `mousemove` quedó en `{ passive: true }`.

Resultado: el tilt sigue funcionando idéntico, sin reflow por fotograma.

### 2.5 El brillo del logo sin repintar la superficie (§1)

El efecto del cursor sobre el logo reescribía variables CSS (`--mx`, `--my`) que cambiaban un `radial-gradient`: eso **repinta la superficie** en cada movimiento.

- Se añadió una capa hija `.logo-ink__glow` que se mueve con `transform: translate3d()`.
- Se usa `offsetX/offsetY` del evento (ya resueltos, sin medir) en lugar de `getBoundingClientRect()`.
- `will-change: transform` solo en esa capa, no en todo el documento.

### 2.6 La tinta duerme cuando no se ve (§3)

El solver de fluidos es el bloque más caro del sitio y seguía calculando aunque la banda "Sobre mí" estuviera fuera de pantalla.

- `IntersectionObserver` → `sleep()` al salir del viewport.
- `visibilitychange` → pausa con la pestaña oculta.

### 2.7 Reveals al scroll sin JavaScript (§4)

Las cards de proyecto y los grupos de stack aparecían de golpe al cargar. Ahora se revelan al entrar en pantalla con **`animation-timeline: view()`**, cero JS:

```css
@supports (animation-timeline: view()) {
  .reveal {
    animation: reveal-arriba linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 26%;
  }
  .projects-grid > *:nth-child(2) { animation-range: entry 2% cover 30%; }
  /* …escalonado sin GSAP ni animation-delay */
}
```

11 elementos con reveal. El escalonado se hace variando `animation-range` por índice: es el stagger de la guía achieved sin librería.

### 2.8 `prefers-reduced-motion` global (§8)

Antes solo se apagaban las animaciones conocidas una por una. Ahora el blanket de la guía, que también cubre las que no controlamos:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 3. Decisiones de no-migración

| Tecnología | Por qué **no** |
|---|---|
| **GSAP** | La guía §9: *"no aporta nada incorporar GSAP"* cuando no hay coreografía compleja. Aquí el stagger se resolvió con `animation-range` y el resto es CSS. |
| **Lenis** (scroll suave) | `scroll-behavior: smooth` ya es nativo (§2). |
| **Three.js / PixiJS** | El fondo es un shader de pantalla completa, no una escena con cientos de objetos. WebGL crudo es más liviano que cualquier motor. |
| **Rive / Lottie** | La animación es código, no un asset diseñado por un animador. |
| **Motion / React** | El sitio no usa React, y la guía es explícita: en CSS, *"las animaciones en CSS ganan siempre que puedas"*. |
| **View Transitions API** | Es un one-page: no hay transición entre rutas que anime. |

---

## 4. Nivel de la guía alcanzado por sección

| Sección | Nivel | Tecnología |
|---|---|---|
| Hover / focus / botones | 1 | `transition` de CSS |
| Navbar (glass + encogido) | 1 | `transition` + `scale` |
| Barra de progreso | 2 | `animation-timeline: scroll()` |
| Reveals al hacer scroll | 2 | `animation-timeline: view()` |
| Tarjetas 3D con tilt | 1 | `transform` en `mousemove` pasivo |
| Brillo del logo | 1 | `transform` en capa dedicada |
| Fondo global | 5 | WebGL directo (ya en GPU) |
| Banda de tinta | 5 | WebGL directo (ya en GPU), con pausa |
| Menú lateral móvil | 1 | `transform: translateX()` |
| Carrusel de libros | 1 | `transform` calculado en JS al cambiar de índice |

---

## 5. Verificación

Ejecutado en Edge headless sobre el sitio servido localmente, **0 errores de consola**:

```
soporta animation-timeline: true
progress 50%: { transform: "matrix(0.578781, ...)", width: "1425px" }   ← escala, no ancho
navbar: { navPadding: "14px", innerTransform: "matrix(0.94,...)",        ← geometría fija
          navTransition: "background, backdrop-filter, border-color" }      ← sin padding
progress-fill hero: { transform: "matrix(0.72, ...)" }                   ← scaleX
reveals: 11 { timeline: "view()", name: "reveal-arriba" }
tilt: { transform: "rotate3d(1, 0, 0, 12.3deg) rotate3d(0, 1, 0, 10.38deg)" }
```

---

## 6. Resumen en una frase

Empezamos por CSS, subimos solo lo necesario (scroll-driven por Animaciones nativas), y dejamos el cálculo pesado donde la guía dice que debe estar: **en la GPU**.