# Portafolio — David E. Chávez Totora

Portafolio personal **one-page** (vanilla HTML + CSS + JS, sin build) con estética K/DA: fondo WebGL de "vidrio acanalado" en morados, fluido de tinta reactivo al cursor, tarjetas 3D, carrusel de libros, dock social flotante y formulario de contacto con EmailJS.

**Demo:** https://arvirzuzzts.vercel.app

## Stack del sitio
- HTML + CSS + JavaScript vanilla (sin frameworks, sin dependencias en runtime)
- WebGL (shader de fondo + fluidos), CSS 3D transforms, IntersectionObserver
- Fuentes: Exo 2 + Space Mono (Google Fonts)
- Iconos: devicon (stack) + lucide/simple-icons inline

## Estructura
```
index.html            Página única
style.css             Base + layout + responsive
assets/css/           tokens.css (temas) · components.css
assets/js/            config.js (contenido e i18n) · i18n · navbar · sections · dock · carousel · contact · bg-fluted · bg-ink · icons
assets/img/           logo-bicolor.webp (logo original) · favicon.svg · stack/ · books/
components/           Componentes originales de referencia (no se cargan)
DESIGN_SYSTEM.md      Paleta y tipografía
PORTFOLIO_PLAN.md     Arquitectura, secciones y cómo modificar todo
contexto.md           Requisitos y notas
```

## Ejecutar en local
Cualquier servidor estático sirve:
```bash
npx serve .          # o: python -m http.server 4173
```
Luego abre la URL que indique.

## Antes de publicar (checklist)
1. **EmailJS**: crea cuenta gratis en emailjs.com → servicio + plantilla HTML → copia los 3 IDs en `assets/js/config.js → emailjs`.
2. **WhatsApp**: tu número ya está configurado (`+591 67231718`); ajusta el mensaje inicial en `config.js → site.whatsappMsg` si quieres.
3. **Proyectos**: los enlaces de GitHub/demo son demos equivalentes (proyectos privados). Reemplaza por los reales en `config.js → projects` cuando existan.
4. **Libros**: las portadas vienen de Open Library; cambia los `.jpg` en `assets/img/books/` por tus fotos y actualiza `config.js → books`.
5. **Dominio**: ajusta `site.url`, `robots.txt`, `sitemap.xml` y las metas Open Graph al dominio final de Vercel.

## Características
- Fondo WebGL con rampa **dominante celeste**, sin coste por movimiento del cursor, y con tema claro/oscuro
- Hero glassmorphism con stats animadas y marquee infinito del stack
- Tarjetas 3D (índigo translúcido al 48%, como el navbar) con fluido de tinta en "Sobre mí" + logo original con efecto cursor
- Casos de estudio (reto / solución / aprendizaje) con links a código y demo
- Stack agrupado por área · Carrusel 3D de libros
- Formulario funcional (EmailJS) + dock social flotante (GitHub, LinkedIn, Facebook, WhatsApp, correo, copiar enlace)
- Logo original bicolor (A turquesa / R blanca) con placa blanca en tema claro
- ES / EN / PT · tema claro/oscuro persistente · barra de progreso · menú móvil desde la izquierda · lazy loading · a11y (skip-link, focus, aria, reduced-motion) · SEO (OG, JSON-LD, sitemap)

Más detalles de arquitectura en [PORTFOLIO_PLAN.md](PORTFOLIO_PLAN.md).
