let count = 0;
const originalRAF = window.requestAnimationFrame;
window.requestAnimationFrame = function(callback) {
    count++;
    console.log('rAF llamado:', count, 'performance.now():', performance.now());
    return originalRAF(callback);
};

(function () {
    const canvas = document.getElementById("inkCanvas");
    if (!canvas) return;
    const opts = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
    };
    const gl2 = canvas.getContext("webgl2", opts);
    const hasWebGL2 = gl2 && gl2.getExtension("EXT_color_buffer_float");
    const gl = hasWebGL2 ? gl2 : (canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts));
    if (!gl) return;

    const isWebGL2 = !!hasWebGL2;

    const VEL_SCALE = 64;
    const VEL_MAX = 60;
    const PRS_SCALE = 64;
    const FORCE_SCALE = 0.5;

    const POINTER_TAU = 0.012;
    const VEL_TAU = 0.06;
    const LEAD_MAX = 26;
    const SAMPLE_SPACING = 11;
    const SAMPLE_MAX_GAP = 0.016;
    const MAX_SUBSAMPLES = 6;

    const SPLATS = 12;
    const AMBIENT = 5;
    const DROP_SLOT = 5;
    const PTR_BASE = 6;

    const DROP_MIN = 1.5;
    const DROP_JITTER = 1.7;

    const ANCHORS = [0.12, 0.66, 0.34, 0.22, 0.53, 0.82, 0.74, 0.34, 0.92, 0.7];

    const WARMUP_STEPS = 260;
    const STATIC_STEPS = 380;
    const FIXED_DT = 1 / 60;

    const TIERS = [
        { sim: 128, dye: 512, jacobi: 16, correct: 1, scale: 1 },
        { sim: 128, dye: 448, jacobi: 12, correct: 1, scale: 1 },
        { sim: 112, dye: 384, jacobi: 10, correct: 0, scale: 0.8 },
        { sim: 96, dye: 320, jacobi: 8, correct: 0, scale: 0.65 },
    ];
    const BUDGET_OVER = 26;

    let tier = 0;
    let frameEma = 16.7;
    let overMs = 0;
    let underMs = 0;
    let upWindow = 8000;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const VERT_SRC = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;

    const SPLAT_UNIFORMS = `
    uniform vec4 u_sp[${SPLATS}];
    uniform vec4 u_sf[${SPLATS}];
    uniform float u_aspect;

    float splatFall(vec2 uv, vec2 c, float r) {
        vec2 d = (uv - c) * vec2(u_aspect, 1.0);
        return exp(-dot(d, d) / max(1e-5, r * r));
    }`;

    const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif`;

    const ENCODE = `
    const float VEL_SCALE = ${VEL_SCALE.toFixed(1)};
    const float PRS_SCALE = ${PRS_SCALE.toFixed(1)};
    ${isWebGL2 ? `
    vec2 encVel(vec2 v) { return v; }
    vec2 decVel(vec2 c) { return c; }
    float encPrs(float p) { return p; }
    float decPrs(float c) { return c; }
    ` : `
    vec2 encVel(vec2 v) {
        return clamp(v / VEL_SCALE * 0.5 + 0.5, 0.0, 1.0);
    }
    vec2 decVel(vec2 c) {
        return (c * 2.0 - 1.0) * VEL_SCALE;
    }
    float encPrs(float p) {
        return clamp(p / PRS_SCALE * 0.5 + 0.5, 0.0, 1.0);
    }
    float decPrs(float c) {
        return (c * 2.0 - 1.0) * PRS_SCALE;
    }
    `}`;

    const ADVECT_VEL_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_vel;
    uniform vec2 u_texel;
    uniform float u_dt;
    uniform float u_diss;
    ${ENCODE}
    void main() {
        vec2 v = decVel(texture2D(u_vel, v_uv).xy);
        vec2 src = v_uv - u_dt * v * u_texel;
        vec2 r = decVel(texture2D(u_vel, src).xy) * u_diss;
        gl_FragColor = vec4(encVel(r), 0.0, 1.0);
    }`;

    const FORCE_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_vel;
    uniform sampler2D u_dye;
    uniform vec2 u_texel;
    uniform float u_dt;
    uniform float u_time;
    uniform float u_curlAmt;
    uniform float u_buoy;
    uniform float u_ambient;
    ${SPLAT_UNIFORMS}
    ${ENCODE}

    float curlAt(vec2 uv) {
        float r = decVel(texture2D(u_vel, uv + vec2(u_texel.x, 0.0)).xy).y;
        float l = decVel(texture2D(u_vel, uv - vec2(u_texel.x, 0.0)).xy).y;
        float t = decVel(texture2D(u_vel, uv + vec2(0.0, u_texel.y)).xy).x;
        float b = decVel(texture2D(u_vel, uv - vec2(0.0, u_texel.y)).xy).x;
        return 0.5 * ((r - l) - (t - b));
    }

    float hash21(vec2 p) {
        p = fract(p * vec2(287.13, 419.71));
        p += dot(p, p + 27.31);
        return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
        return vnoise(p) * 0.62 + vnoise(p * 2.13 + 7.3) * 0.28;
    }

    void main() {
        vec2 v = decVel(texture2D(u_vel, v_uv).xy);

        float c = curlAt(v_uv);
        float cr = abs(curlAt(v_uv + vec2(u_texel.x, 0.0)));
        float cl = abs(curlAt(v_uv - vec2(u_texel.x, 0.0)));
        float ct = abs(curlAt(v_uv + vec2(0.0, u_texel.y)));
        float cb = abs(curlAt(v_uv - vec2(0.0, u_texel.y)));
        vec2 g = vec2(cr - cl, ct - cb) * 0.5;
        float gl = length(g);
        if (gl > 1e-5) {
            vec2 n = g / gl;
            v += vec2(n.y, -n.x) * c * u_curlAmt * u_dt;
        }

        float wide = 6.0;
        float d0 = texture2D(u_dye, v_uv).x;
        float dAvg = 0.25 * (
            texture2D(u_dye, v_uv + vec2(u_texel.x * wide, 0.0)).x +
            texture2D(u_dye, v_uv - vec2(u_texel.x * wide, 0.0)).x +
            texture2D(u_dye, v_uv + vec2(0.0, u_texel.y * wide)).x +
            texture2D(u_dye, v_uv - vec2(0.0, u_texel.y * wide)).x
        );
        float excess = d0 - dAvg;
        v.y -= excess * u_buoy * u_dt;
        v.x += excess * u_buoy * 0.22 * u_dt * (vnoise(v_uv * 9.0 + u_time * 0.15) - 0.5);

        vec2 q = v_uv * vec2(u_aspect, 1.0) * 1.7 + vec2(u_time * 0.031, -u_time * 0.024);
        float e = 0.035;
        float px = fbm(q + vec2(e, 0.0)) - fbm(q - vec2(e, 0.0));
        float py = fbm(q + vec2(0.0, e)) - fbm(q - vec2(0.0, e));
        v += vec2(py, -px) / (2.0 * e) * u_ambient * u_dt;

        for (int i = 0; i < ${SPLATS}; i++) {
            if (u_sp[i].z <= 0.0) continue;
            v += u_sf[i].xy * splatFall(v_uv, u_sp[i].xy, u_sp[i].z) * u_dt;
        }

        vec2 e2 = min(v_uv, 1.0 - v_uv);
        float wall = smoothstep(0.0, 0.045, min(e2.x, e2.y));
        v *= mix(0.86, 1.0, wall);
        v = clamp(v, vec2(-${VEL_MAX.toFixed(1)}), vec2(${VEL_MAX.toFixed(1)}));

        gl_FragColor = vec4(encVel(v), 0.0, 1.0);
    }`;

    const DIVERGENCE_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_vel;
    uniform vec2 u_texel;
    ${ENCODE}
    void main() {
        float r = decVel(texture2D(u_vel, v_uv + vec2(u_texel.x, 0.0)).xy).x;
        float l = decVel(texture2D(u_vel, v_uv - vec2(u_texel.x, 0.0)).xy).x;
        float t = decVel(texture2D(u_vel, v_uv + vec2(0.0, u_texel.y)).xy).y;
        float b = decVel(texture2D(u_vel, v_uv - vec2(0.0, u_texel.y)).xy).y;
        gl_FragColor = vec4(encPrs(0.5 * ((r - l) + (t - b))), 0.0, 0.0, 1.0);
    }`;

    const JACOBI_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_pressure;
    uniform sampler2D u_div;
    uniform vec2 u_texel;
    ${ENCODE}
    void main() {
        float r = decPrs(texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x);
        float l = decPrs(texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x);
        float t = decPrs(texture2D(u_pressure, v_uv + vec2(0.0, u_texel.y)).x);
        float b = decPrs(texture2D(u_pressure, v_uv - vec2(0.0, u_texel.y)).x);
        float d = decPrs(texture2D(u_div, v_uv).x);
        gl_FragColor = vec4(encPrs((l + r + b + t - d) * 0.25), 0.0, 0.0, 1.0);
    }`;

    const GRADSUB_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_pressure;
    uniform sampler2D u_vel;
    uniform vec2 u_texel;
    ${ENCODE}
    void main() {
        float r = decPrs(texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x);
        float l = decPrs(texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x);
        float t = decPrs(texture2D(u_pressure, v_uv + vec2(0.0, u_texel.y)).x);
        float b = decPrs(texture2D(u_pressure, v_uv - vec2(0.0, u_texel.y)).x);
        vec2 v = decVel(texture2D(u_vel, v_uv).xy) - 0.5 * vec2(r - l, t - b);
        v = clamp(v, vec2(-${VEL_MAX.toFixed(1)}), vec2(${VEL_MAX.toFixed(1)}));
        gl_FragColor = vec4(encVel(v), 0.0, 1.0);
    }`;

    const DYE_ADVECT_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_src;
    uniform sampler2D u_vel;
    uniform vec2 u_simTexel;
    uniform float u_dt;
    uniform float u_dir;
    ${ENCODE}
    void main() {
        vec2 v = decVel(texture2D(u_vel, v_uv).xy);
        vec2 src = v_uv - u_dir * u_dt * v * u_simTexel;
        vec2 d = texture2D(u_src, src).xy;
        gl_FragColor = vec4(clamp(d, 0.0, 1.0), 0.0, 1.0);
    }`;

    const DYE_RESOLVE_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_src;
    uniform sampler2D u_fwd;
    uniform sampler2D u_back;
    uniform sampler2D u_vel;
    uniform vec2 u_texel;
    uniform vec2 u_simTexel;
    uniform float u_dt;
    uniform float u_diss;
    uniform float u_accentDiss;
    uniform float u_correct;
    ${SPLAT_UNIFORMS}
    ${ENCODE}
    void main() {
        vec2 fwd = texture2D(u_fwd, v_uv).xy;
        vec2 phi = texture2D(u_src, v_uv).xy;
        vec2 back = texture2D(u_back, v_uv).xy;
        vec2 outv = fwd + 0.5 * (phi - back) * u_correct;

        vec2 v = decVel(texture2D(u_vel, v_uv).xy);
        vec2 src = v_uv - u_dt * v * u_simTexel;
        vec2 a = texture2D(u_src, src + vec2(u_texel.x, u_texel.y)).xy;
        vec2 b = texture2D(u_src, src + vec2(-u_texel.x, u_texel.y)).xy;
        vec2 c = texture2D(u_src, src + vec2(u_texel.x, -u_texel.y)).xy;
        vec2 d = texture2D(u_src, src + vec2(-u_texel.x, -u_texel.y)).xy;
        vec2 lo = min(min(a, b), min(c, d));
        vec2 hi = max(max(a, b), max(c, d));
        outv = clamp(outv, lo, hi);

        outv.x *= u_diss;
        outv.y *= u_accentDiss;

        for (int i = 0; i < ${SPLATS}; i++) {
            if (u_sp[i].z <= 0.0) continue;
            float f = splatFall(v_uv, u_sp[i].xy, u_sp[i].z);
            outv.x += u_sp[i].w * f;
            outv.y += u_sf[i].z * f;
        }

        gl_FragColor = vec4(clamp(outv, vec2(0.0), vec2(1.05, 1.0)), 0.0, 1.0);
    }`;

    const RENDER_SRC = `${PRECISION}
    varying vec2 v_uv;
    uniform sampler2D u_dye;
    uniform vec2 u_dyeTexel;
    uniform vec3 u_c0;
    uniform vec3 u_c1;
    uniform vec3 u_c2;
    uniform vec3 u_c3;
    uniform vec3 u_c4;
    uniform vec3 u_accent;
    uniform float u_gamma;
    uniform float u_rim;
    uniform float u_ink;

    vec3 ramp(float x) {
        vec3 c = mix(u_c0, u_c1, smoothstep(0.0, 0.22, x));
        c = mix(c, u_c2, smoothstep(0.18, 0.48, x));
        c = mix(c, u_c3, smoothstep(0.45, 0.78, x));
        c = mix(c, u_c4, smoothstep(0.76, 1.0, x));
        return c;
    }

    void main() {
        vec2 s = texture2D(u_dye, v_uv).xy;
        float d = s.x;

        float dr = texture2D(u_dye, v_uv + vec2(u_dyeTexel.x, 0.0)).x;
        float dl = texture2D(u_dye, v_uv - vec2(u_dyeTexel.x, 0.0)).x;
        float dt = texture2D(u_dye, v_uv + vec2(0.0, u_dyeTexel.y)).x;
        float db = texture2D(u_dye, v_uv - vec2(0.0, u_dyeTexel.y)).x;
        float grad = length(vec2(dr - dl, dt - db)) * 0.5;

        float cov = 1.0 - exp(-d * u_ink);
        cov = pow(clamp(cov, 0.0, 1.0), u_gamma);
        cov = clamp(cov + grad * u_rim, 0.0, 1.0);

        vec3 col = ramp(cov);

        float fresh = clamp(s.y * 1.05, 0.0, 1.0) * smoothstep(0.05, 0.28, cov);
        col = mix(col, mix(col, u_accent, 0.42), fresh);

        vec2 vp = v_uv - 0.5;
        float vig = smoothstep(0.42, 0.95, length(vp * vec2(1.0, 1.25)) * 1.6);
        col = mix(col, u_c0, vig * 0.30);

        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) * 0.0055;

        gl_FragColor = vec4(col, 1.0);
    }`;

    function adaptShader(src, isFrag) {
        if (!isWebGL2) return src;
        let s = "#version 300 es\n";
        if (isFrag) {
            s += "precision highp float;\n";
            s += "out vec4 fragColor;\n";
        }
        s += src;
        if (isFrag) {
            s = s.replace(/\bvarying\b/g, "in");
        } else {
            s = s.replace(/\battribute\b/g, "in");
            s = s.replace(/\bvarying\b/g, "out");
        }
        s = s.replace(/\btexture2D\b/g, "texture");
        s = s.replace(/\bgl_FragColor\b/g, "fragColor");
        return s;
    }

    function compile(type, src) {
        const isFrag = type === gl.FRAGMENT_SHADER;
        const s = gl.createShader(type);
        gl.shaderSource(s, adaptShader(src, isFrag));
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    function program(frag) {
        const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
        const fs = compile(gl.FRAGMENT_SHADER, frag);
        if (!vs || !fs) return null;
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.bindAttribLocation(p, 0, "a_pos");
        gl.linkProgram(p);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            gl.deleteProgram(p);
            return null;
        }
        return p;
    }

    const pAdvectVel = program(ADVECT_VEL_SRC);
    const pForce = program(FORCE_SRC);
    const pDiv = program(DIVERGENCE_SRC);
    const pJacobi = program(JACOBI_SRC);
    const pGrad = program(GRADSUB_SRC);
    const pDyeAdvect = program(DYE_ADVECT_SRC);
    const pDyeResolve = program(DYE_RESOLVE_SRC);
    const pRender = program(RENDER_SRC);
    if (!pAdvectVel || !pForce || !pDiv || !pJacobi || !pGrad || !pDyeAdvect || !pDyeResolve || !pRender) return;

    const locs = new Map();
    function loc(p, name) {
        if (!locs.has(p)) locs.set(p, new Map());
        const m = locs.get(p);
        if (!m.has(name)) m.set(name, gl.getUniformLocation(p, name));
        return m.get(name);
    }

    function makeFBO(w, h, clear) {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (isWebGL2) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, h, 0, gl.RG, gl.HALF_FLOAT, null);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteTexture(tex);
            gl.deleteFramebuffer(fbo);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return null;
        }
        gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { tex, fbo, w, h, texel: [1 / w, 1 / h] };
    }

    function makeDouble(w, h, clear) {
        const a = makeFBO(w, h, clear);
        const b = makeFBO(w, h, clear);
        if (!a || !b) return null;
        return { read: a, write: b, swap() { const t = this.read; this.read = this.write; this.write = t; } };
    }

    function freeFBO(f) {
        if (!f) return;
        gl.deleteTexture(f.tex);
        gl.deleteFramebuffer(f.fbo);
    }

    function freeDouble(d) {
        if (!d) return;
        freeFBO(d.read);
        freeFBO(d.write);
    }

    function blit(target) {
        if (target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            gl.viewport(0, 0, target.w, target.h);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let velocity = null;
    let dye = null;
    let pressure = null;
    let divergence = null;
    let dyeTmpA = null;
    let dyeTmpB = null;

    const sp = new Float32Array(SPLATS * 4);
    const sf = new Float32Array(SPLATS * 4);

    let simTime = 0;
    let lastMs = performance.now();
    let raf = 0;
    let running = false;
    let disposed = false;
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let simW = 0;
    let simH = 0;
    let allocated = false;

    let havePointer = false;
    let tgtX = 0, tgtY = 0;
    let ptrX = 0, ptrY = 0;
    let velX = 0, velY = 0;
    let lastTgtX = 0, lastTgtY = 0;
    let sampleX = 0, sampleY = 0;
    let lastSampleT = 0;
    let rectLeft = 0, rectTop = 0;
    let rectDirty = true;

    let nextDrop = 0.7;
    let dropSeed = 3;

    let c0 = [0.04, 0.04, 0.04];
    let c1 = [0.14, 0.14, 0.14];
    let c2 = [0.4, 0.4, 0.4];
    let c3 = [0.78, 0.78, 0.78];
    let c4 = [1, 1, 1];
    let accent = [0, 0.42, 1];
    let gamma = 1;
    let rim = 1;
    let inkK = 1;

    function parseHex(raw) {
        const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw.trim());
        if (!m) return null;
        let h = m[1];
        if (h.length === 3) h = h.split("").map((c) => c + c).join("");
        const n = parseInt(h, 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }

    function mixRGB(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }

    function luminance([r, g, b]) {
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function readColors() {
        const cs = getComputedStyle(document.documentElement);
        const bg = parseHex(cs.getPropertyValue("--background")) ?? [1, 1, 1];
        const fg = parseHex(cs.getPropertyValue("--foreground")) ?? [0.09, 0.09, 0.09];
        const muted = parseHex(cs.getPropertyValue("--ns-muted")) ?? [0.55, 0.55, 0.55];
        const border = parseHex(cs.getPropertyValue("--border")) ?? [0.18, 0.18, 0.18];
        accent = parseHex(cs.getPropertyValue("--ns-accent")) ?? [0, 0.42, 1];
        const black = [0, 0, 0];
        const white = [1, 1, 1];
        if (luminance(bg) < 0.5) {
            c0 = mixRGB(bg, black, 0.35);
            c1 = mixRGB(bg, border, 0.9);
            c2 = mixRGB(border, muted, 0.75);
            c3 = mixRGB(muted, fg, 0.72);
            c4 = mixRGB(fg, white, 0.55);
            accent = mixRGB(accent, white, 0.2);
            gamma = 1.08;
            rim = 2.6;
            inkK = 2.5;
        } else {
            c0 = bg;
            c1 = mixRGB(bg, muted, 0.3);
            c2 = mixRGB(muted, bg, 0.22);
            c3 = mixRGB(fg, muted, 0.24);
            c4 = mixRGB(fg, black, 0.55);
            accent = mixRGB(accent, bg, 0.5);
            gamma = 1.18;
            rim = 2.2;
            inkK = 2.9;
        }
    }
    readColors();

    function clearSplats() {
        sp.fill(0);
        sf.fill(0);
    }

    function setSplat(i, x, y, r, amount, fx, fy, acc) {
        sp[i * 4] = x;
        sp[i * 4 + 1] = y;
        sp[i * 4 + 2] = r;
        sp[i * 4 + 3] = amount;
        sf[i * 4] = fx * FORCE_SCALE;
        sf[i * 4 + 1] = fy * FORCE_SCALE;
        sf[i * 4 + 2] = acc;
    }

    function updateSources(dt) {
        const amt = 1;
        for (let i = 0; i < AMBIENT; i++) {
            const ph = i * 2.399963;
            const sp1 = 0.048 + i * 0.014;
            const x = ANCHORS[i * 2] + 0.12 * Math.sin(simTime * sp1 + ph);
            const y = ANCHORS[i * 2 + 1] + 0.15 * Math.sin(simTime * sp1 * 0.78 + ph * 1.7);
            const head = simTime * (0.19 + i * 0.05) + ph;
            const push = 58 + 24 * Math.sin(simTime * 0.31 + ph);
            setSplat(i, x, y, 0.05 + 0.016 * Math.sin(simTime * 0.23 + ph), 0.46 * amt * dt, Math.cos(head) * push * dt * 60, Math.sin(head) * push * dt * 60, 0);
        }
        nextDrop -= dt;
        if (nextDrop <= 0) {
            dropSeed = (dropSeed * 1103515245 + 12345) & 0x7fffffff;
            const r1 = ((dropSeed >> 7) & 1023) / 1023;
            dropSeed = (dropSeed * 1103515245 + 12345) & 0x7fffffff;
            const r2 = ((dropSeed >> 7) & 1023) / 1023;
            dropSeed = (dropSeed * 1103515245 + 12345) & 0x7fffffff;
            const r3 = ((dropSeed >> 7) & 1023) / 1023;
            const ang = r3 * Math.PI * 2;
            setSplat(DROP_SLOT, 0.12 + r1 * 0.76, 0.18 + r2 * 0.68, 0.07 + r3 * 0.045, 1.35 * amt, Math.cos(ang) * 300, Math.sin(ang) * 300 - 120, 0);
            nextDrop = DROP_MIN + r1 * DROP_JITTER;
        }
    }

    function stepPointer(dt) {
        if (!havePointer || dt <= 0 || cssW < 2) return;
        const vk = 1 - Math.exp(-dt / VEL_TAU);
        velX += ((tgtX - lastTgtX) / dt - velX) * vk;
        velY += ((tgtY - lastTgtY) / dt - velY) * vk;
        lastTgtX = tgtX;
        lastTgtY = tgtY;

        let leadX = velX * POINTER_TAU;
        let leadY = velY * POINTER_TAU;
        const lead = Math.hypot(leadX, leadY);
        if (lead > LEAD_MAX) {
            leadX = (leadX / lead) * LEAD_MAX;
            leadY = (leadY / lead) * LEAD_MAX;
        }
        const k = 1 - Math.exp(-dt / POINTER_TAU);
        ptrX += (tgtX + leadX - ptrX) * k;
        ptrY += (tgtY + leadY - ptrY) * k;

        const dx = ptrX - sampleX;
        const dy = ptrY - sampleY;
        const dist = Math.hypot(dx, dy);
        const gap = simTime - lastSampleT;
        if (dist < SAMPLE_SPACING && !(gap >= SAMPLE_MAX_GAP && dist > 0.5)) return;

        const n = Math.min(MAX_SUBSAMPLES, Math.max(1, Math.round(dist / SAMPLE_SPACING)));
        const sc = 1;
        const cellsPerPx = simW / Math.max(1, cssW);
        const fx = (dx / Math.max(1e-4, gap)) * cellsPerPx * 0.55 * sc;
        const fy = -(dy / Math.max(1e-4, gap)) * cellsPerPx * 0.55 * sc;
        const mag = Math.min(1, Math.hypot(fx, fy) / 120);
        for (let s = 1; s <= n; s++) {
            const f = s / n;
            const px = (sampleX + dx * f) / cssW;
            const py = 1 - (sampleY + dy * f) / cssH;
            setSplat(PTR_BASE + (s - 1), px, py, 0.035, ((0.36 + 0.72 * mag) * sc * Math.max(0.25, 1)) / n, fx / n, fy / n, (0.1 + 0.2 * mag) / n);
        }
        sampleX = ptrX;
        sampleY = ptrY;
        lastSampleT = simTime;
    }

    function step(dt) {
        if (!velocity || !dye || !pressure || !divergence || !dyeTmpA || !dyeTmpB) return;
        const t = TIERS[tier];
        const simTexel = velocity.read.texel;
        const aspect = cssW / Math.max(1, cssH);

        gl.useProgram(pAdvectVel);
        gl.uniform1i(loc(pAdvectVel, "u_vel"), 0);
        gl.uniform2f(loc(pAdvectVel, "u_texel"), simTexel[0], simTexel[1]);
        gl.uniform1f(loc(pAdvectVel, "u_dt"), dt);
        gl.uniform1f(loc(pAdvectVel, "u_diss"), Math.exp(-dt * 0.16));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
        blit(velocity.write);
        velocity.swap();

        gl.useProgram(pForce);
        gl.uniform1i(loc(pForce, "u_vel"), 0);
        gl.uniform1i(loc(pForce, "u_dye"), 1);
        gl.uniform2f(loc(pForce, "u_texel"), simTexel[0], simTexel[1]);
        gl.uniform1f(loc(pForce, "u_dt"), dt);
        gl.uniform1f(loc(pForce, "u_time"), simTime);
        gl.uniform1f(loc(pForce, "u_curlAmt"), 24);
        gl.uniform1f(loc(pForce, "u_buoy"), 46);
        gl.uniform1f(loc(pForce, "u_ambient"), 8.5);
        gl.uniform1f(loc(pForce, "u_aspect"), aspect);
        gl.uniform4fv(loc(pForce, "u_sp"), sp);
        gl.uniform4fv(loc(pForce, "u_sf"), sf);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        blit(velocity.write);
        velocity.swap();

        gl.useProgram(pDiv);
        gl.uniform1i(loc(pDiv, "u_vel"), 0);
        gl.uniform2f(loc(pDiv, "u_texel"), simTexel[0], simTexel[1]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
        blit(divergence);

        gl.useProgram(pJacobi);
        gl.uniform2f(loc(pJacobi, "u_texel"), simTexel[0], simTexel[1]);
        gl.uniform1i(loc(pJacobi, "u_div"), 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, divergence.tex);
        for (let i = 0; i < t.jacobi; i++) {
            gl.uniform1i(loc(pJacobi, "u_pressure"), 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pressure.read.tex);
            blit(pressure.write);
            pressure.swap();
        }

        gl.useProgram(pGrad);
        gl.uniform1i(loc(pGrad, "u_pressure"), 0);
        gl.uniform1i(loc(pGrad, "u_vel"), 1);
        gl.uniform2f(loc(pGrad, "u_texel"), simTexel[0], simTexel[1]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pressure.read.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
        blit(velocity.write);
        velocity.swap();

        const dyeTexel = dye.read.texel;
        gl.useProgram(pDyeAdvect);
        gl.uniform1i(loc(pDyeAdvect, "u_vel"), 1);
        gl.uniform2f(loc(pDyeAdvect, "u_simTexel"), simTexel[0], simTexel[1]);
        gl.uniform1f(loc(pDyeAdvect, "u_dt"), dt);
        gl.uniform1f(loc(pDyeAdvect, "u_dir"), 1);
        gl.uniform1i(loc(pDyeAdvect, "u_src"), 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
        blit(dyeTmpA);
        if (t.correct > 0) {
            gl.uniform1f(loc(pDyeAdvect, "u_dir"), -1);
            gl.uniform1i(loc(pDyeAdvect, "u_src"), 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, dyeTmpA.tex);
            blit(dyeTmpB);
        }

        gl.useProgram(pDyeResolve);
        gl.uniform1i(loc(pDyeResolve, "u_src"), 0);
        gl.uniform1i(loc(pDyeResolve, "u_fwd"), 1);
        gl.uniform1i(loc(pDyeResolve, "u_back"), 2);
        gl.uniform1i(loc(pDyeResolve, "u_vel"), 3);
        gl.uniform2f(loc(pDyeResolve, "u_texel"), dyeTexel[0], dyeTexel[1]);
        gl.uniform2f(loc(pDyeResolve, "u_simTexel"), simTexel[0], simTexel[1]);
        gl.uniform1f(loc(pDyeResolve, "u_dt"), dt);
        gl.uniform1f(loc(pDyeResolve, "u_diss"), Math.exp(-dt * 0.1));
        gl.uniform1f(loc(pDyeResolve, "u_accentDiss"), Math.exp(-dt * 2.0));
        gl.uniform1f(loc(pDyeResolve, "u_correct"), t.correct);
        gl.uniform1f(loc(pDyeResolve, "u_aspect"), aspect);
        gl.uniform4fv(loc(pDyeResolve, "u_sp"), sp);
        gl.uniform4fv(loc(pDyeResolve, "u_sf"), sf);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, dyeTmpA.tex);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, t.correct > 0 ? dyeTmpB.tex : dyeTmpA.tex);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
        blit(dye.write);
        dye.swap();
    }

    function render() {
        if (!dye) return;
        const dyeTexel = dye.read.texel;
        gl.useProgram(pRender);
        gl.uniform1i(loc(pRender, "u_dye"), 0);
        gl.uniform2f(loc(pRender, "u_dyeTexel"), dyeTexel[0], dyeTexel[1]);
        gl.uniform3f(loc(pRender, "u_c0"), c0[0], c0[1], c0[2]);
        gl.uniform3f(loc(pRender, "u_c1"), c1[0], c1[1], c1[2]);
        gl.uniform3f(loc(pRender, "u_c2"), c2[0], c2[1], c2[2]);
        gl.uniform3f(loc(pRender, "u_c3"), c3[0], c3[1], c3[2]);
        gl.uniform3f(loc(pRender, "u_c4"), c4[0], c4[1], c4[2]);
        gl.uniform3f(loc(pRender, "u_accent"), accent[0], accent[1], accent[2]);
        gl.uniform1f(loc(pRender, "u_gamma"), gamma);
        gl.uniform1f(loc(pRender, "u_rim"), rim);
        gl.uniform1f(loc(pRender, "u_ink"), inkK);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        blit(null);
    }

    function advance(dt) {
        clearSplats();
        simTime += dt;
        updateSources(dt);
        stepPointer(dt);
        step(dt);
    }

    function spin(steps) {
        for (let i = 0; i < steps; i++) advance(FIXED_DT);
    }

    function applyBacking() {
        if (cssW < 2 || cssH < 2) return;
        dpr = Math.min(window.devicePixelRatio || 1, 2) * TIERS[tier].scale;
        const pw = Math.round(cssW * dpr);
        const ph = Math.round(cssH * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
            canvas.width = pw;
            canvas.height = ph;
        }
        canvas.style.width = cssW + "px";
        canvas.style.height = cssH + "px";
    }

    function allocate() {
        if (cssW < 2 || cssH < 2) return;
        const t = TIERS[tier];
        const aspect = cssW / cssH;
        if (aspect >= 1) {
            simW = t.sim;
            simH = Math.max(48, Math.round(t.sim / aspect));
        } else {
            simH = t.sim;
            simW = Math.max(48, Math.round(t.sim * aspect));
        }
        const dyeW = aspect >= 1 ? t.dye : Math.max(96, Math.round(t.dye * aspect));
        const dyeH = aspect >= 1 ? Math.max(96, Math.round(t.dye / aspect)) : t.dye;

        const oldVel = velocity;
        const oldDye = dye;
        const zero = isWebGL2 ? [0, 0, 0, 1] : [0.5, 0.5, 0, 1];
        const nVel = makeDouble(simW, simH, zero);
        const nDye = makeDouble(dyeW, dyeH, [0, 0, 0, 1]);
        const nPressure = makeDouble(simW, simH, zero);
        const nDiv = makeFBO(simW, simH, zero);
        const nTmpA = makeFBO(dyeW, dyeH, [0, 0, 0, 1]);
        const nTmpB = makeFBO(dyeW, dyeH, [0, 0, 0, 1]);
        if (!nVel || !nDye || !nPressure || !nDiv || !nTmpA || !nTmpB) {
            freeDouble(nVel);
            freeDouble(nDye);
            freeDouble(nPressure);
            freeFBO(nDiv);
            freeFBO(nTmpA);
            freeFBO(nTmpB);
            return;
        }

        const carry = allocated && oldVel && oldDye;
        if (carry) {
            gl.useProgram(pDyeAdvect);
            gl.uniform2f(loc(pDyeAdvect, "u_simTexel"), 1, 1);
            gl.uniform1f(loc(pDyeAdvect, "u_dt"), 0);
            gl.uniform1f(loc(pDyeAdvect, "u_dir"), 1);
            gl.uniform1i(loc(pDyeAdvect, "u_vel"), 1);
            gl.uniform1i(loc(pDyeAdvect, "u_src"), 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, oldVel.read.tex);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, oldVel.read.tex);
            blit(nVel.read);
            gl.uniform1i(loc(pDyeAdvect, "u_src"), 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, oldDye.read.tex);
            blit(nDye.read);
        }

        freeDouble(oldVel);
        freeDouble(oldDye);
        freeDouble(pressure);
        freeFBO(divergence);
        freeFBO(dyeTmpA);
        freeFBO(dyeTmpB);

        velocity = nVel;
        dye = nDye;
        pressure = nPressure;
        divergence = nDiv;
        dyeTmpA = nTmpA;
        dyeTmpB = nTmpB;

        const steps = carry ? 8 : WARMUP_STEPS;
        allocated = true;
        spin(steps);
        clearSplats();
        render();
    }

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;
        const changed = Math.abs(rect.width - cssW) > 0.5 || Math.abs(rect.height - cssH) > 0.5;
        cssW = rect.width;
        cssH = rect.height;
        rectLeft = rect.left;
        rectTop = rect.top;
        rectDirty = false;
        applyBacking();
        if (changed) {
            tier = 0;
            overMs = 0;
            underMs = 0;
            upWindow = 8000;
            frameEma = 16.7;
            applyBacking();
            allocate();
        }
        render();
    }

    function applyTier() {
        applyBacking();
        allocate();
    }

    function loop(nowMs) {
        if (disposed) return;
        const rawMs = nowMs - lastMs;
        lastMs = nowMs;
        const dt = Math.min(0.033, Math.max(0.001, rawMs / 1000));
        advance(dt);
        render();

        const clamped = Math.min(50, rawMs);
        frameEma += (clamped - frameEma) * (1 - Math.exp(-clamped / 120));
        if (frameEma > BUDGET_OVER) {
            overMs += clamped;
            underMs = 0;
        } else {
            underMs += clamped;
            overMs = 0;
        }
        const down = overMs > 1800 && tier < TIERS.length - 1;
        const up = underMs > upWindow && tier > 0;
        if (down || up) {
            tier += down ? 1 : -1;
            if (down) upWindow = Math.min(64000, upWindow * 2);
            overMs = 0;
            underMs = 0;
            frameEma = 16.7;
            applyTier();
        }
        raf = requestAnimationFrame(loop);
    }

    function wake() {
        if (running || disposed) return;
        running = true;
        lastMs = performance.now();
        raf = requestAnimationFrame(loop);
    }

    function sleep() {
        cancelAnimationFrame(raf);
        running = false;
    }

    function syncRect() {
        if (!rectDirty) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        rectLeft = rect.left;
        rectTop = rect.top;
        rectDirty = false;
    }

    function setTarget(e) {
        syncRect();
        const co = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
        const last = co && co.length > 0 ? co[co.length - 1] : e;
        tgtX = last.clientX - rectLeft;
        tgtY = last.clientY - rectTop;
    }

    function snapPointer() {
        ptrX = tgtX;
        ptrY = tgtY;
        velX = 0;
        velY = 0;
        lastTgtX = tgtX;
        lastTgtY = tgtY;
        sampleX = tgtX;
        sampleY = tgtY;
        lastSampleT = simTime;
        havePointer = true;
    }

    canvas.parentElement.addEventListener("pointermove", (e) => {
        setTarget(e);
        if (!havePointer) snapPointer();
    });

    canvas.parentElement.addEventListener("pointerleave", () => {
        havePointer = false;
    });

    window.addEventListener("resize", resize);

    const mo = new MutationObserver(() => {
        readColors();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    resize();
    wake();
})();
