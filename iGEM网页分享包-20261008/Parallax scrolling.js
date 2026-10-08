// JavaScript Document
(function() {
    const sections = document.querySelectorAll('.parallax-section');
    // 微妙视差：图片移动极慢，文字几乎不动
    const imageSpeed = 0.3;
    const textSpeed = 0.02;
    let ticking = false;

    function updateParallax() {
        const viewportHeight = window.innerHeight;
        const viewportCenter = viewportHeight / 2;

        sections.forEach(section => {
            const image = section.querySelector('.parallax-image');
            const text = section.querySelector('.parallax-text');
            if (!image || !text) return;

            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.top + rect.height / 2;
            const offsetFromCenter = sectionCenter - viewportCenter;

            // 文字：极慢线性移动
            const textOffset = offsetFromCenter * textSpeed;
            text.style.transform = `translate3d(0, ${textOffset}px, 0)`;

            // 图片：极慢线性移动
            const imageOffset = offsetFromCenter * imageSpeed;
            image.style.transform = `translate3d(0, ${imageOffset}px, 0)`;
        });

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);

    // 初始执行
    updateParallax();

    // 移动端响应式：取消视差并重置 transform
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    function handleMediaChange(e) {
        if (e.matches) {
            sections.forEach(section => {
                const image = section.querySelector('.parallax-image');
                const text = section.querySelector('.parallax-text');
                if (image) image.style.transform = '';
                if (text) text.style.transform = '';
            });
        } else {
            updateParallax();
        }
    }
    mediaQuery.addListener(handleMediaChange);
    handleMediaChange(mediaQuery);
})();