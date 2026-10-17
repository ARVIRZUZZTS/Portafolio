// Crear iconos de Lucide
lucide.createIcons();

// Lógica para interacciones de tarjetas skew
document.addEventListener('DOMContentLoaded', () => {
    const skewCards = document.querySelectorAll('.skew-card');

    skewCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('is-hovered');
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('is-hovered');
        });
    });
});
