// Crear iconos de Lucide
lucide.createIcons();

const cardScene = document.getElementById("cardScene");
const glassCard = document.getElementById("glassCard");

// Rotación 3D basada en la posición del mouse
const handleMouseMove = (e) => {
    const rect = glassCard.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / (rect.height / 2)) * -15;
    const rotateY = (mouseX / (rect.width / 2)) * 15;

    glassCard.style.transform = `rotate3d(1, 0, 0, ${rotateX}deg) rotate3d(0, 1, 0, ${rotateY}deg)`;
};

const handleMouseLeave = () => {
    glassCard.style.transform = "rotate3d(0, 0, 0, 0deg)";
};

cardScene.addEventListener("mousemove", handleMouseMove);
cardScene.addEventListener("mouseleave", handleMouseLeave);
