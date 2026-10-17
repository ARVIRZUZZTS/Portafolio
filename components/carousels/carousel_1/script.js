if (window.lucide) {
    lucide.createIcons();
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const items = [
    {
        id: 1,
        title: "Luxury Performance",
        description: "Experience the thrill of precision engineering",
        imageSrc: "https://cdn.21st.dev/assets/mirror/1c/1c40e9d2fc325643f20991f6c4361c803b8d0ad690ad1e7529c7377151a282eb.jpg",
        href: "https://www.ruixen.com/",
    },
    {
        id: 2,
        title: "Elegant Design",
        description: "Where beauty meets functionality",
        imageSrc: "https://cdn.21st.dev/assets/mirror/ba/baa07e4ac6f0a4420a74083de7959083153be3dbfa7732dc26378fb69c1bf2eb.jpg",
        href: "https://www.ruixen.com/",
    },
    {
        id: 3,
        title: "Power & Speed",
        description: "Unleash the true potential of the road",
        imageSrc: "https://cdn.21st.dev/assets/mirror/80/80e27ca27a44306f03e4708cb8a7d622e480996fdb40955ecbe735109c62ca69.jpg",
        href: "https://www.ruixen.com/",
    },
    {
        id: 4,
        title: "Timeless Craftsmanship",
        description: "Built with passion, driven by excellence",
        imageSrc: "https://cdn.21st.dev/assets/mirror/5c/5c9f812d112ce28b3524a9bc44bc65ad85da3958f45492845ba060af904cb189.jpg",
        href: "https://www.ruixen.com/",
    },
    {
        id: 5,
        title: "Future of Mobility",
        description: "Innovation that moves you forward",
        imageSrc: "https://cdn.21st.dev/assets/mirror/37/37ea3835df0f51289154b990eb4d61b95b3ad63d4bf71cd79554cc56f2f134a8.jpg",
        href: "https://www.ruixen.com/",
    },
];

const stackCards = document.getElementById("stackCards");
const stackDots = document.getElementById("stackDots");
const externalLink = document.getElementById("externalLink");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

let activeIndex = 0;
let autoAdvanceTimer = null;
let isDragging = false;
let dragStartX = 0;
let dragOffsetX = 0;
let dragVelocity = 0;
let lastDragX = 0;
let lastDragTime = 0;
let onChangeCallback = null;

const MAX_VISIBLE = 7;
const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const OVERLAP = 0.48;
const SPREAD_DEG = 48;
const DEPTH_PX = 140;
const TILT_X_DEG = 12;
const ACTIVE_LIFT_PX = 22;
const ACTIVE_SCALE = 1.03;
const INACTIVE_SCALE = 0.94;
const INTERVAL_MS = 2000;

let toastTimer = null;

function showToast(msg) {
    if (!toast) return;
    toastText.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 2800);
}

function wrapIndex(n, len) {
    return ((n % len) + len) % len;
}

function signedOffset(i, active, len, loop) {
    const raw = i - active;
    if (!loop || len <= 1) return raw;
    const alt = raw > 0 ? raw - len : raw + len;
    return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

function renderCards() {
    if (!stackCards) return;

    const len = items.length;
    const maxOffset = Math.max(0, Math.floor(MAX_VISIBLE / 2));
    const cardSpacing = Math.max(10, Math.round(CARD_WIDTH * (1 - OVERLAP)));
    const stepDeg = maxOffset > 0 ? SPREAD_DEG / maxOffset : 0;

    stackCards.innerHTML = "";

    items.forEach((item, i) => {
        const off = signedOffset(i, activeIndex, len, true);
        const abs = Math.abs(off);

        if (abs > maxOffset) return;

        const rotateZ = off * stepDeg;
        const x = off * cardSpacing;
        const y = abs * 10;
        const z = -abs * DEPTH_PX;
        const isActive = off === 0;
        const scale = isActive ? ACTIVE_SCALE : INACTIVE_SCALE;
        const lift = isActive ? -ACTIVE_LIFT_PX : 0;
        const rotateX = isActive ? 0 : TILT_X_DEG;
        const zIndex = 100 - abs;

        const card = document.createElement("div");
        card.className = `stack-card${isActive ? " is-active" : ""}`;
        card.style.transform = `translateX(${x}px) translateY(${y + lift}px) rotateZ(${rotateZ}deg) rotateX(${rotateX}deg) scale(${scale}) translateZ(${z}px)`;
        card.style.zIndex = zIndex;

        card.innerHTML = `
            <img src="${item.imageSrc}" alt="${item.title}" draggable="false">
            <div class="stack-card-overlay"></div>
            <div class="stack-card-content">
                <div class="stack-card-title">${item.title}</div>
                <div class="stack-card-desc">${item.description}</div>
            </div>
        `;

        card.addEventListener("click", () => {
            if (!isActive) {
                setActive(i);
            }
        });

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
        dot.className = `stack-dot${i === activeIndex ? " is-active" : ""}`;
        dot.setAttribute("aria-label", `Go to ${item.title}`);
        dot.addEventListener("click", () => setActive(i));
        stackDots.appendChild(dot);
    });
}

function setActive(index) {
    const prevIndex = activeIndex;
    activeIndex = wrapIndex(index, items.length);
    renderCards();
    renderDots();
    updateExternalLink();
    resetAutoAdvance();
    if (prevIndex !== activeIndex && onChangeCallback) {
        onChangeCallback(activeIndex, items[activeIndex]);
    }
}

function updateExternalLink() {
    if (!externalLink) return;
    const item = items[activeIndex];
    if (item && item.href) {
        externalLink.href = item.href;
        externalLink.style.display = "flex";
    } else {
        externalLink.style.display = "none";
    }
}

function onChange(callback) {
    onChangeCallback = callback;
}

function next() {
    setActive(activeIndex + 1);
}

function prev() {
    setActive(activeIndex - 1);
}

function resetAutoAdvance() {
    if (autoAdvanceTimer) {
        clearInterval(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
    if (prefersReducedMotion) return;
    autoAdvanceTimer = setInterval(() => {
        next();
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

    if (dt > 0) {
        const dx = clientX - lastDragX;
        dragVelocity = dx / dt;
    }

    lastDragX = clientX;
    lastDragTime = now;
    dragOffsetX = clientX - dragStartX;

    const card = stackCards.querySelector(".is-active");
    if (card) {
        const baseTransform = card.style.transform.replace(/translateX\([^)]*\)\s*$/, "");
        card.style.transform = baseTransform + ` translateX(${dragOffsetX * 0.3}px)`;
    }
}

function onDragEnd() {
    if (!isDragging) return;

    isDragging = false;
    const threshold = Math.min(160, CARD_WIDTH * 0.22);
    const velocityThreshold = 0.5;

    if (prefersReducedMotion) {
        if (dragOffsetX > threshold) {
            prev();
        } else if (dragOffsetX < -threshold) {
            next();
        }
    } else {
        if (dragOffsetX > threshold || dragVelocity > velocityThreshold) {
            prev();
        } else if (dragOffsetX < -threshold || dragVelocity < -velocityThreshold) {
            next();
        } else {
            renderCards();
        }
    }

    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    document.removeEventListener("touchmove", onDragMove);
    document.removeEventListener("touchend", onDragEnd);
}

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
});

renderCards();
renderDots();
updateExternalLink();
resetAutoAdvance();
