const socialToggle = document.getElementById("socialToggle");
const socialDockIcons = document.getElementById("socialDockIcons");
const socialOverlay = document.getElementById("socialOverlay");

let dockOpen = false;

function toggleDock() {
    dockOpen = !dockOpen;

    socialToggle.classList.toggle("open", dockOpen);
    socialDockIcons.classList.toggle("open", dockOpen);
    socialOverlay.classList.toggle("active", dockOpen);

    const iconWrappers = socialDockIcons.querySelectorAll(".dock-icon-wrapper");
    iconWrappers.forEach((wrapper, index) => {
        wrapper.style.transitionDelay = dockOpen ? `${index * 50}ms` : "0ms";
    });
}

socialToggle.addEventListener("click", toggleDock);

socialOverlay.addEventListener("click", () => {
    if (dockOpen) toggleDock();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dockOpen) {
        toggleDock();
    }
});

const socialLinks = document.querySelectorAll(".social-link");
socialLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => {
        const platform = link.dataset.platform;
        const gradient = link.querySelector(".social-gradient");

        const hoverGradients = {
            facebook: "linear-gradient(to right, #1e3a8a, #2563eb)",
            twitter: "linear-gradient(to right, #111827, #374151)",
            instagram: "linear-gradient(to right, #ec4899, #a855f7, #fb923c)",
            linkedin: "linear-gradient(to right, #1e40af, #60a5fa)",
            youtube: "linear-gradient(to right, #b91c1c, #dc2626)",
            github: "linear-gradient(to right, #18181b, #27272a)",
            tiktok: "linear-gradient(to right, #09090b, #27272a)",
            discord: "linear-gradient(to right, #4338ca, #4f46e5)",
        };

        if (hoverGradients[platform]) {
            gradient.style.background = hoverGradients[platform];
        }
    });

    link.addEventListener("mouseleave", () => {
        const gradient = link.querySelector(".social-gradient");
        gradient.style.background = "";
    });
});
