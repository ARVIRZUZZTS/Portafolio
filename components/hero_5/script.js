/* =========================================================
   HERO SECTION - GLASSMORPHISM
   -------------------------------------------------------------
   Animaciones de entrada escalonadas, marquee infinito,
   barra de progreso animada e interacciones hover.
   ========================================================= */

const CLIENTS = [
    { name: "Acme Corp", icon: "hexagon" },
    { name: "Quantum", icon: "triangle" },
    { name: "Command+Z", icon: "command" },
    { name: "Phantom", icon: "ghost" },
    { name: "Ruby", icon: "gem" },
    { name: "Chipset", icon: "cpu" },
];

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    initStaggeredAnimations();
    initMarquee();
    initProgressBar();
    initHoverInteractions();
});

/* =========================================================
   ANIMACIONES DE ENTRADA ESCALONADAS
   ========================================================= */

function initStaggeredAnimations() {
    const animatedElements = document.querySelectorAll(".animate-fade-in");

    animatedElements.forEach((el) => {
        const delayClass = Array.from(el.classList).find((cls) =>
            cls.startsWith("delay-")
        );

        if (delayClass) {
            const delayValue = parseInt(delayClass.replace("delay-", ""), 10);
            el.style.animationDelay = `${delayValue}ms`;
        }
    });
}

/* =========================================================
   MARQUEE INFINITO
   ========================================================= */

function initMarquee() {
    const track = document.getElementById("marqueeTrack");
    if (!track) return;

    const tripledClients = [...CLIENTS, ...CLIENTS, ...CLIENTS];

    track.innerHTML = tripledClients
        .map(
            (client, i) => `
        <div class="marquee-item" data-index="${i}">
            <i data-lucide="${client.icon}" class="marquee-item-icon"></i>
            <span class="marquee-item-name">${client.name}</span>
        </div>
    `
        )
        .join("");

    lucide.createIcons();
}

/* =========================================================
   BARRA DE PROGRESO ANIMADA
   ========================================================= */

function initProgressBar() {
    const progressFill = document.getElementById("progressFill");
    if (!progressFill) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        progressFill.classList.add("animate");
                    }, 600);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.3 }
    );

    observer.observe(progressFill);
}

/* =========================================================
   INTERACCIONES HOVER
   ========================================================= */

function initHoverInteractions() {
    const ctaButtons = document.querySelectorAll(".cta-primary, .cta-secondary");
    ctaButtons.forEach((btn) => {
        btn.addEventListener("mouseenter", () => {
            btn.style.transform = "scale(1.02)";
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.transform = "scale(1)";
        });
    });

    const miniStats = document.querySelectorAll(".mini-stat");
    miniStats.forEach((stat) => {
        stat.addEventListener("mouseenter", () => {
            stat.style.transform = "translateY(-4px)";
        });
        stat.addEventListener("mouseleave", () => {
            stat.style.transform = "translateY(0)";
        });
    });

    const marqueeItems = document.querySelectorAll(".marquee-item");
    marqueeItems.forEach((item) => {
        item.addEventListener("mouseenter", () => {
            const track = document.getElementById("marqueeTrack");
            if (track) track.style.animationPlayState = "paused";
        });
        item.addEventListener("mouseleave", () => {
            const track = document.getElementById("marqueeTrack");
            if (track) track.style.animationPlayState = "running";
        });
    });
}
