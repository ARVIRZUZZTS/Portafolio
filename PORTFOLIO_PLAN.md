# PORTFOLIO_PLAN.md — Portafolio de David E. Chávez Totora

Documento de arquitectura y decisiones del portafolio. Explica **qué hay, por qué está así y cómo modificarlo**.

---

## 1. Concepto

Portafolio personal **one-page** con estética **K/DA** (morados lavanda, neón magenta/cian, vidrio). Todo el fondo es WebGL en vivo y las secciones usan componentes portados de la librería `components/` (demonraciones vanilla de Winkode), re-tematizados con la paleta del `DESIGN_SYSTEM.md`.

**Principio de arquitectura:** HTML/CSS/JS **vanilla, sin build, sin frameworks**. Las animaciones clave (shaders WebGL, fluidos, 3D CSS) viven a nivel GPU/Canvas: un framework no mejora la fluidez aquí y solo añade peso. Cero dependencias en runtime salvo Google Fonts y el SDK de EmailJS (que se carga **solo al enviar** el formulario).

---

## 2. Mapa de archivos

```
Portafolio/
├── index.html                  # Página única: navbar, hero, sobre mí, proyectos, stack, libros, contacto, footer
├── style.css                   # Base + layout + navbar + responsive (tokens en assets/css/tokens.css)
├── DESIGN_SYSTEM.md            # Paleta, tipografía (Exo 2) y tokens — fuente de verdad visual
├── assets/
│   ├── css/
│   │   ├── tokens.css          # Variables CSS: tema oscuro (default) + .theme-light
│   │   └── components.css      # Estilos de componentes portados (hero, cards 3D, carrusel, dock, forms…)
│   ├── js/
│   │   ├── config.js           # ★ TODO tu contenido: redes, WhatsApp, proyectos, libros, stack, i18n ES/EN/PT
│   │   ├── icons.js            # Iconos inline (lucide + marcas) generados, sin CDN
│   │   ├── i18n.js             # Selector de idioma ES/EN/PT con persistencia
│   │   ├── navbar.js           # Scroll (glass + shrink), barra de progreso, menú móvil izq., tema, idioma
│   │   ├── sections.js         # Render de proyectos, stack, marquee, cards 3D tilt, progreso, logo-ink
│   │   ├── dock.js             # Dock social flotante + botón copiar enlace
│   │   ├── carousel.js         # Carrusel 3D de libros (auto-avance, drag, teclado, dots)
│   │   ├── contact.js          # Enlaces WhatsApp/mail + envío EmailJS con template HTML
│   │   ├── bg-fluted.js        # Fondo global WebGL (Fluted Glass) con paleta por tema + cursor reactivo
│   │   └── bg-ink.js           # Fluido de tinta (Navier-Stokes) reactivo al cursor en la banda "Sobre mí"
│   └── img/
│       ├── logo-bicolor.webp   # Logo ORIGINAL (A turquesa + R blanca, con alpha)
│       ├── favicon.svg
│       ├── stack/*.svg         # 14 iconos devicon del stack
│       └── books/*.jpg         # Portadas (Open Library) mientras lleguen tus fotos
├── components/                 # Componentes originales (referencia, no se cargan en el sitio)
├── contexto.md                 # Requisitos y notas
├── robots.txt, sitemap.xml     # SEO
└── README.md
```

---

## 3. Secciones y componentes

| Sección | Componente origen | Implementación |
|---|---|---|
| **Fondo global** | `background_5` (Fluted Glass) | `bg-fluted.js`: shader WebGL fijo con rampa **dominante celeste** (`#0E0A2F → #218ABD → #5BE0FF → #B296FD → #FF58FE`: el cian ocupa ~75% del rango y el magenta queda solo en las crestas). Cambia de rampa con el tema claro/oscuro. **Sin efecto de cursor** (se retiró por coste de GPU: medido, el delta de fps con puntero en movimiento es 0). Velo radial reforzado para contraste AA. |
| **Hero** | `hero_5` (glassmorphism) | Badge, nombre con degradado (celte → azul → magenta), rol, frase, CTAs (proyectos / contacto / CV), tarjeta de stats con barra de progreso animada (IntersectionObserver) y **marquee infinito del stack** (`sections.js`, pausa al hover). |
| **Sobre mí** | `card_2` ×3 (GlassCard 3D) + `background_1` (DyeWhorl) | Tres tarjetas glass con **rotación 3D al mover el mouse** (`rotate3d` + camadas `translateZ`) dentro de una banda con **fluido de tinta reactivo al cursor** (`bg-ink.js`, solver Navier-Stokes/MacCormack, acento celeste). Incluye tarjeta de valores ("trabajo duro", aprendizaje continuo…). Logo AR con máscara: el brillo neón sigue al puntero dentro de las letras. |
| **Proyectos** | Nuevo (estilo tokens) | Casos de estudio por proyecto: **El reto / Mi solución / Mi mayor aprendizaje**, tags y **dual links** (GitHub + demo). Son proyectos privados reales; los enlaces apuntan a demos equivalentes mock (`config.js → projects`). |
| **Stack** | Marquee de `hero_5` + grupos nuevos | Marquee infinito (ya en el hero) + sección agrupada: Frontend / Backend / Móvil / Bases de datos / Herramientas con iconos devicon. |
| **Libros** | `carousel_1` (Card Stack 3D) | Abanico 3D con auto-avance (3.2 s), arrastre con inercia, flechas del teclado y dots. Portadas desde Open Library (ISBN): Clean Code, Clean Architecture, Refactoring, Code Complete, Essential Scrum, The Clean Coder, Pressman 7ª ed. |
| **Contacto** | Nuevo | Form (nombre/email/mensaje) → **EmailJS** con template HTML propio; cards de WhatsApp y correo; toasts de estado. |
| **Dock social** | `social_links_1` (dock) | Botones flotantes **siempre visibles**: GitHub, LinkedIn, Facebook, WhatsApp (+591 67231718) y correo + **botón copiar enlace** del sitio (para compartir en Vercel) con toast de confirmación y fallback. |

### Tarjetas (cards)
Todas las superficies (`project-card`, `stats-card`, `stack-group`, `contact-card`, `glass-card`, campos de formulario…) comparten un único token `--card`: **el mismo índigo del navbar (`#0E0A2F`) al 48%** con `backdrop-filter`, de modo que el fondo ondulado se ve a través sin competir con el texto. En tema claro el token se adapta al lavanda claro.

Extras de `contexto.md` implementados: navbar transparente que se vuelve glass al hacer scroll, **barra de progreso de lectura**, CTA "¿Hablamos?", **selector de idioma ES/EN/PT** persistente, **toggle tema oscuro/claro** persistente, **menú hamburguesa que entra desde la izquierda**, lazy loading de imágenes, `prefers-reduced-motion`, skip-link, focus-visible, `aria-*`, JSON-LD `Person`, Open Graph, robots y sitemap.

---

## 4. Sistema visual

- **Paleta:** tokens en `assets/css/tokens.css`, extraídos de las imágenes de `resources/` (ver `DESIGN_SYSTEM.md`). Tema claro completo en `.theme-light` (incluye rampa alternativa del shader y de la tinta).
- **Tipografía:** Exo 2 (display) + Space Mono (meta) vía Google Fonts.
- **Logo:** se usa el **logo original bicolor** (`resources/logo_bicolor.webp` → `assets/img/logo-bicolor.webp`, 747×443 con canal alpha): la "A" turquesa sobre la "R" casi blanca. Se carga como `<img class="brand-logo">` en navbar y footer (con `width/height` para no provocar CLS).
  - Como la "R" es casi blanca, **en tema claro el logo va sobre una placa blanca redondeada** (`.theme-light .brand-logo`) para conservar los colores exactos de la marca.
  - El efecto de brillo que sigue al cursor usa el mismo archivo como **máscara CSS** (`mask-image`), leveraging su canal alpha real.
- **Cian dominante:** el celeste dejó de ser un acento secondary y ocupa la mayor parte de la rampa del shader y de la tinta; el magenta (#FF58FE) se reserva para las crestas del fondo y los acentos de interacción (CTA, hovers), donde el blanco sobre celeste claro perdería contraste.

---

## 5. Cómo modificar (lo habitual)

| Quiero cambiar… | Dónde |
|---|---|
| Redes, WhatsApp, CV | `assets/js/config.js → site` / `social` |
| Proyectos (casos de estudio, links) | `assets/js/config.js → projects` (título, reto, solución, aprendizaje, tags, repo, demo — en ES/EN/PT) |
| Libros del carrusel | `assets/js/config.js → books` (+ reemplaza los `.jpg` en `assets/img/books/`) |
| Stack (marquee y grupos) | `assets/js/config.js → stack` |
| Textos de la interfaz | `assets/js/config.js → i18n` (3 idiomas) |
| Colores / tema | `assets/css/tokens.css` (y `bg-fluted.js → PALETTES` para el shader) |
| Logo (imagen, tamaño, placa) | `style.css → .brand-logo` / `.theme-light .brand-logo`; el archivo es `assets/img/logo-bicolor.webp` |
| Envío de correos | `assets/js/config.js → emailjs` (ver abajo) |

---

## 6. Configurar el formulario (EmailJS)

1. Crea una cuenta gratis en **emailjs.com** (sin tarjeta, 200 correos/mes).
2. **Add Email Service** → conecta tu Gmail.
3. **Email Templates** → crea una plantilla con contenido HTML (fondo morado, tu nombre) y estas variables:
   - `{{name}}` — nombre de quien escribe
   - `{{email}}` — su correo (respuesta directa con Reply-To: `{{email}}`)
   - `{{message}}` — el mensaje
   - `{{time}}` — fecha/hora de envío
4. Copia los IDs en `assets/js/config.js → emailjs`: `publicKey`, `serviceId`, `templateId`.
5. Sin configurar, el formulario muestra un mensaje de error amable en lugar de romperse.

> La Public Key es pública por diseño de EmailJS; no pongas ahí credenciales privadas.

---

## 7. Rendimiento y accesibilidad (resumen)

- Un único hilo de animación por fondo (rAF + IntersectionObserver + `visibilitychange` para pausar fuera de pantalla); 2 contextos WebGL en total; en móvil el shader baja a DPR 1 y el carrusel pausa el auto-avance al interactuar.
- **Fondo global sin coste de puntero:** se eliminó toda la reactsión al cursor del shader (`pointermove` / `u_cursor.x = 0`); medido, mover el ratón no altera el frame rate. El único efecto que sigue al cursor es el de las tarjetas 3D y la banda de tinta, ambos de bajo coste.
- Contraste de texto reforzado con un velo radial sobre el shader (más denso en tema claro, donde la paleta saturada competía con la lectura del hero).
- Imágenes con `loading="lazy"` + `decoding="async"`; iconos SVG inline o locales (sin CDN de iconos).
- `prefers-reduced-motion`: se apagan marquee, tinta (auto-splats), auto-avance y transiciones.
- Teclado: skip-link, foco visible, menú con `aria-expanded`, cierre con Escape, carrusel con flechas.

---

## 8. Despliegue en Vercel

Es un sitio **estático puro**: en Vercel → *New Project* → importa el repo → Framework *Other* → sin build command. El dominio sugerido ya está en las metas (`https://arvirzuzzts.vercel.app`).
