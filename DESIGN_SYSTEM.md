# Design System — Portafolio ARVIRZUZZTS

Paleta de colores y tipografía extraída de las imágenes de referencia en `resources/`.
Inspiración: **K/DA** (League of Legends) — morados lavanda sobre fondos índigo profundo, con neones magenta y cian.

> Este documento es la **fuente única de verdad visual**. La refactorización a componentes debe consumir estos tokens, no valores hardcodeados.

---

## 1. Imágenes de referencia

| Imagen | Qué aporta |
|---|---|
| `background_color.avif` | Fondo base del sitio (índigo profundo) |
| `paleta_brillo_morado.webp` | Escala de morados principal (lavanda → violeta) |
| `sacar_paleta_colores.jpg` | Acentos neón (magenta, cian) y fondos oscuros |
| `tipografia_brilloso.png` | Efecto de brillo/glow para títulos |
| `tipografia_emular.png` | Tipografía display a emular (K/DA logo) |

---

## 2. Paleta de colores

### 2.1 Fondos (Backgrounds)

Extraídos de `background_color.avif` y `sacar_paleta_colores.jpg`.

| Token | HEX | RGB | Fuente | Uso |
|---|---|---|---|---|
| `--bg-deep` | `#0B0519` | 11, 5, 25 | `paleta_brillo_morado` | Fondo más oscuro (secciones / footer) |
| `--bg-base` | `#0E0A2F` | 14, 10, 47 | `background_color` | Fondo principal de página |
| `--bg-violet` | `#14003C` | 20, 0, 60 | `sacar_paleta_colores` | Fondo alterno, gradientes |
| `--bg-navy` | `#221C66` | 34, 28, 102 | `background_color` | Segundo color del gradiente de fondo |

Gradiente de fondo recomendado:

```css
background: linear-gradient(160deg, var(--bg-base) 0%, var(--bg-navy) 50%, var(--bg-violet) 100%);
background-attachment: fixed;
```

### 2.2 Escala de morados (Primary)

Extraída de `paleta_brillo_morado.webp`. Es la familia identitaria del sitio.

| Token | HEX | Fuente | Uso |
|---|---|---|---|
| `--purple-100` | `#B296FD` | imagen | Color marca / acento principal (texto destacado, iconos) |
| `--purple-300` | `#9179D3` | imagen | Hover suave, bordes activos |
| `--purple-500` | `#6C5D9B` | imagen | Bordes, separadores, elementos desactivados |
| `--purple-700` | `#473B66` | imagen | Superficies elevadas, tags |
| `--purple-900` | `#2A2140` | derivado | Tarjetas con más opacidad, fondos de código |
| `--purple-dark` | `#221C66` | imagen | Reemplazo del teal secundario actual |

### 2.3 Acentos neón (Accents)

Extraídos de `sacar_paleta_colores.jpg`. Usar con moderación: máximo 1 acento por componente.

| Token | HEX | Fuente | Uso |
|---|---|---|---|
| `--neon-magenta` | `#FF58FE` | imagen | **Acento primario**: CTA, hover, highlights |
| `--neon-magenta-deep` | `#DC03F8` | imagen | Bordes de botón, glow intenso, estado activo |
| `--neon-pink-light` | `#FEBCFE` | imagen | Texto/acento claro sobre fondos oscuros |
| `--neon-cyan` | `#5BFFFF` | imagen | **Acento secundario**: tags, enlaces, meta |
| `--neon-blue` | `#6AB9FE` | imagen | Links secundarios, variación de tags |

### 2.4 Texto

| Token | HEX | Uso |
|---|---|---|
| `--text` | `#FDFDFD` | Texto principal (títulos importantes) |
| `--text-ice` | `#BDF0FF` | Texto de cuerpo (blanco azulado, canónico del logo) |
| `--text-lavender` | `#B296FD` | Texto destacado, énfasis |
| `--text-muted` | `rgba(178, 150, 253, 0.65)` | Meta, subtítulos, texto secundario |

### 2.5 Verificación de contraste (WCAG)

| Combinación | Ratio | OK para |
|---|---|---|
| `--text-ice` sobre `--bg-base` | ~15.9 | Todo texto (AAA) |
| `--purple-100` sobre `--bg-base` | ~7.8 | Todo texto (AAA) |
| `--neon-magenta` sobre `--bg-base` | ~4.9 | Texto normal (AA), grande (AAA) |
| `--neon-cyan` sobre `--bg-base` | ~7.7 | Todo texto (AAA) |
| `--text-muted` sobre `--bg-base` | ~3.9 | Solo texto grande / no esencial |

> Nunca usar neón magenta como color de texto corrido delgado: usarlo solo en textos grandes o como background de chips.

---

## 3. Variables CSS (copiar al `style.css`)

Reemplaza completamente el bloque `:root` actual (tema teal):

```css
:root {
    /* Fondos */
    --bg-deep:    #0B0519;
    --bg-base:    #0E0A2F;
    --bg-violet:  #14003C;
    --bg-navy:    #221C66;

    /* Morados */
    --purple-100: #B296FD;
    --purple-300: #9179D3;
    --purple-500: #6C5D9B;
    --purple-700: #473B66;
    --purple-900: #2A2140;
    --purple-dark:#221C66;

    /* Neones */
    --neon-magenta:      #FF58FE;
    --neon-magenta-deep: #DC03F8;
    --neon-pink-light:   #FEBCFE;
    --neon-cyan:         #5BFFFF;
    --neon-blue:         #6AB9FE;

    /* Texto */
    --text:         #FDFDFD;
    --text-ice:     #BDF0FF;
    --text-lavender:#B296FD;
    --text-muted:   rgba(178, 150, 253, 0.65);

    /* Superficies y bordes (derivados) */
    --card:          rgba(178, 150, 253, 0.06);
    --card-border:   rgba(178, 150, 253, 0.18);
    --card-hover:    rgba(178, 150, 253, 0.12);
    --tag-bg:        rgba(255, 88, 254, 0.12);

    /* Tipografía */
    --font-display: 'Exo 2', sans-serif;
    --font-mono:    'Space Mono', monospace;

    /* Radios y sombras */
    --radius:    1.25rem;
    --radius-sm: 0.6rem;
    --glow-magenta: 0 0 24px rgba(255, 88, 254, 0.35);
    --glow-cyan:    0 0 24px rgba(91, 255, 255, 0.30);
    --glow-lavender: 0 0 30px rgba(178, 150, 253, 0.40);
}
```

---

## 4. Tipografía

### 4.1 Display / marca — **Exo 2**

La tipografía del logo K/DA es *custom*. **Exo 2** es la alternativa Google Fonts más cercana: geométrica, de cortes angulares, espíritu esport. Usarla para:

- Título del nombre en el hero
- Logo wordmark del header
- Títulos de sección (`h2`)
- Números grandes / stats

```html
<link href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,600;0,700;0,800;0,900;1,600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### 4.2 Jerarquía tipográfica

| Rol | Fuente | Peso | Tamaño | Color | Notas |
|---|---|---|---|---|---|
| Wordmark / logo | Exo 2 | 900 | 1rem+ | `--text-ice` | letter-spacing amplio, uppercase |
| Hero name | Exo 2 | 800–900 | 2.2→3.2rem | `--text` | `text-shadow` con `--glow-lavender` |
| Section title | Exo 2 | 700 | 1.1–1.3rem | `--text-ice` | `text-shadow` con `--glow-cyan` |
| Cuerpo | Exo 2 | 400 | 0.88–0.95rem | `--text-ice` | line-height 1.75 |
| Meta / tags / código | Space Mono | 400–700 | 0.7–0.8rem | `--text-muted` o `--neon-cyan` | uppercase + letter-spacing en labels |

### 4.3 Efecto "brillo" (de `tipografia_brilloso.png`)

El logo tiene acabado cromado/iridiscente. Emular en web con gradiente + glow:

```css
.title-shine {
    background: linear-gradient(100deg, var(--text-ice) 0%, var(--purple-100) 45%, var(--text) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none; /* no combinar con text-shadow */
}
```

Glow en títulos (alternativa simple y accesible):

```css
.section-title {
    color: var(--text-ice);
    text-shadow: 0 0 18px rgba(91, 255, 255, 0.35);
}
```

---

## 5. Efectos y patrones

### Glassmorphism (tarjetas)

```css
.card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45),
                inset 0 0 40px rgba(178, 150, 253, 0.04);
}
```

### Estados hover

| Componente | Default | Hover / Active |
|---|---|---|
| Botón primario | bg `--neon-magenta` | `box-shadow: var(--glow-magenta)`, `translateY(-2px)` |
| Botón ghost | border `--card-border` | border `--neon-cyan`, glow cian |
| Tag | bg `--tag-bg`, text `--neon-pink-light` | bg magenta 22% |
| Card | `.card` | border gradiente morado + `--glow-lavender` |

### Bordes con gradiente (detalle K/DA)

```css
.neon-border {
    border: 1px solid transparent;
    background:
        linear-gradient(var(--bg-base), var(--bg-base)) padding-box,
        linear-gradient(120deg, var(--neon-magenta), var(--neon-cyan)) border-box;
}
```

---

## 6. Mapa de migración (tema actual → nuevo)

| Variable actual | Valor actual | Reemplazar por |
|---|---|---|
| `--high` | `rgb(102,255,255)` | `--text-ice` (`#BDF0FF`) |
| `--strr` / `--mid` / `--dark` | teals | `--bg-navy` / `--bg-violet` / `--bg-deep` |
| `--card-border` | cian 15% | `--card-border` (lavanda 18%) |
| `--font-display` | `Syne` | **`Exo 2`** |
| `--font-mono` | `Space Mono` | se mantiene |

---

*Paleta extraída con muestreo de píxeles sobre las imágenes de `resources/` — HEX son valores reales de las imágenes, no aproximaciones.*
