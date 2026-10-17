if (window.lucide) {
    lucide.createIcons();
}

const cards = [
    { imgUrl: "https://cdn.21st.dev/assets/mirror/a6/a61a357faccddd302e85600234a02350a27f21b4cc8b3531578991614c050151.jpg", alt: "Mountain landscape" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/9d/9d12401d835b58b284c6380d9f9c745112d6e2ed6cc51942982d42ae1d8e08b0.jpg", alt: "City night" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/4c/4c0990c5eee66fc437f8e0ca2175c48ed6bebd9b3b6e45f1ac9b3542ada80eff.jpg", alt: "Foggy forest" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/05/05536dea31a97c7c4243f835d48e2c487cfeead267d4651a9b515987bef18e61.jpg", alt: "Sunlit woods" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/fe/fe3c057ea3c04ecd58640df79ace90545c86fc0e267b7cb87e4da93c8d0d0ffc.jpg", alt: "Tropical beach" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/ec/ec33bb1d53aef764ed557037ded0bf376df17ceb6de92411b60d8edcd68e75b2.jpg", alt: "Starry mountain" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/10/109a67c3a7eab23436b0fc0e45a2bdfc722c97cff452c14a2e5944e200c56d98.jpg", alt: "Golden sunset" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/9d/9d1fd650945e154a1a414af7188e43d1f0e334557c1ad2cf25315e4b39a98f96.jpg", alt: "Lake reflection" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/d2/d2b6671fa0140e374b5d7cc1c4a6b2210b48f304ff472a88a2ea1b4ca52f5b48.jpg", alt: "Green valley" },
    { imgUrl: "https://cdn.21st.dev/assets/mirror/1a/1adc3553fd7cb37113b52f179fc82de7ba497a8503afa2e1f27f717aba09a2bc.jpg", alt: "Sunbeam nature" },
];

const fanLayout = document.getElementById("fanLayout");
const fanDots = document.getElementById("fanDots");
const fanPrev = document.getElementById("fanPrev");
const fanNext = document.getElementById("fanNext");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

const MAX_VISIBLE = 7;
const HALF = 3;

let centerIndex = HALF;
let isAnimating = false;
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

function getResponsiveMultiplier() {
    const width = window.innerWidth;
    if (width < 480) return 0.28;
    if (width < 640) return 0.38;
    if (width < 768) return 0.5;
    if (width < 1024) return 0.75;
    return 1.0;
}

function getSlotConfig(totalCards, slot) {
    if (totalCards >= MAX_VISIBLE) {
        const positions = [
            { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
            { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
            { rot: -7, scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
            { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
            { rot: 7, scale: 0.9346, x: 11, y: 1.3, zIndex: 3 },
            { rot: 14, scale: 0.8498, x: 22, y: 4.0, zIndex: 2 },
            { rot: 21, scale: 0.7756, x: 30, y: 7.3, zIndex: 1 },
        ];
        return positions[slot];
    }
    const center = totalCards >> 1;
    const distance = totalCards > 1 ? (slot - center) / center : 0;
    const absDistance = Math.abs(distance);
    return {
        rot: distance * 21,
        scale: 1.0 - 0.2244 * absDistance * absDistance,
        x: distance * 30,
        y: absDistance * absDistance * 7.3,
        zIndex: 10 - Math.abs(slot - center),
    };
}

function getVisibleMap(center) {
    const map = new Map();
    for (let slot = 0; slot < MAX_VISIBLE; slot++) {
        const idx = ((center + slot - HALF) % cards.length + cards.length) % cards.length;
        map.set(idx, slot);
    }
    return map;
}

function renderCards() {
    if (!fanLayout) return;

    fanLayout.innerHTML = "";

    const visibleMap = getVisibleMap(centerIndex);
    const mult = getResponsiveMultiplier();

    cards.forEach((card, i) => {
        const slot = visibleMap.get(i);
        if (slot === undefined) return;

        const config = getSlotConfig(cards.length, slot);
        const x = config.x * mult;
        const y = config.y;

        const el = document.createElement("div");
        el.className = "fan-card";
        el.style.transform = `translateX(${x}rem) translateY(${y}rem) rotate(${config.rot}deg) scale(${config.scale})`;
        el.style.zIndex = config.zIndex;
        el.style.opacity = 1;

        el.innerHTML = `<img src="${card.imgUrl}" alt="${card.alt}" loading="lazy">`;

        fanLayout.appendChild(el);
    });
}

function renderDots() {
    if (!fanDots) return;

    fanDots.innerHTML = "";

    cards.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = `fan-dot${i === centerIndex ? " is-active" : ""}`;
        dot.setAttribute("aria-label", `Go to card ${i + 1}`);
        dot.addEventListener("click", () => {
            if (!isAnimating) {
                centerIndex = i;
                renderCards();
                renderDots();
            }
        });
        fanDots.appendChild(dot);
    });
}

function cycle(direction) {
    if (isAnimating) return;
    isAnimating = true;

    centerIndex = direction === "right"
        ? (centerIndex + 1) % cards.length
        : (centerIndex - 1 + cards.length) % cards.length;

    renderCards();
    renderDots();

    setTimeout(() => {
        isAnimating = false;
    }, 500);
}

if (fanPrev) {
    fanPrev.addEventListener("click", () => cycle("left"));
}

if (fanNext) {
    fanNext.addEventListener("click", () => cycle("right"));
}

window.addEventListener("resize", () => {
    if (!isAnimating) {
        renderCards();
    }
});

renderCards();
renderDots();
