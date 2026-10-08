(function () {
    const setupExplorer = (explorer) => {
        const buttons = Array.from(explorer.querySelectorAll('.letter-circle'));
        const items = Array.from(explorer.querySelectorAll('.letter-panel-item'));
        if (!buttons.length || !items.length) return;

        const applyState = (activeId) => {
            buttons.forEach((button) => {
                const isActive = button.dataset.letterTarget === activeId;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-expanded', String(isActive));
            });
            items.forEach((item) => item.classList.toggle('is-active', item.id === activeId));
            explorer.classList.toggle('has-active', Boolean(activeId));
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const target = button.dataset.letterTarget;
                applyState(button.classList.contains('is-active') ? null : target);
            });
        });

        explorer.classList.add('is-enhanced');
        applyState(buttons[0].dataset.letterTarget);
    };

    const init = () => {
        document.querySelectorAll('[data-letter-explorer]').forEach(setupExplorer);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();