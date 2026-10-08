(function() {
    const scrollBtn = document.getElementById('scrollBtn');
    const transitionCanvas = document.getElementById('transitionCanvas');
    const tCtx = transitionCanvas.getContext('2d');
    const mainWrapper = document.getElementById('mainWrapper');

    let isTransitioning = false;
    let scrollLocked = true;          // 初始锁定（第一屏）
    let hasTransitionedOnce = false; // 是否已完成过过渡
    let transitionActive = false;
    let animFrameId = null;

    const MASK_SPEED = 30;
    const SCROLL_SYNC_RATIO = 0.7;

    // 初始状态：第一屏，锁定滚动，隐藏滚动条
    document.documentElement.classList.add('hide-scrollbar');

    function getButtonCenter() {
        const rect = scrollBtn.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function startTransition() {
        if (transitionActive) return;
        transitionActive = true;
        isTransitioning = true;
        scrollLocked = true;
        window.transitionPauseWater = true;

        const { x, y } = getButtonCenter();

        scrollBtn.style.display = 'none';

        window.waterEraser.active = true;
        window.waterEraser.centerX = x;
        window.waterEraser.centerY = y;
        window.waterEraser.radius = 0;
        window.waterEraser.maxRadius = Math.hypot(window.innerWidth, window.innerHeight);

        document.body.classList.add('transitioning');

        const fakeEvent = new MouseEvent('click', { clientX: x, clientY: y });
        document.dispatchEvent(fakeEvent);

        animFrameId = requestAnimationFrame(updateTransition);
    }

    function updateTransition(timestamp) {
        if (!transitionActive) return;

        window.waterEraser.radius += MASK_SPEED;
        if (window.waterEraser.radius >= window.waterEraser.maxRadius) {
            window.waterEraser.radius = window.waterEraser.maxRadius;
            finishTransition();
            return;
        }

        animFrameId = requestAnimationFrame(updateTransition);
    }

    function finishTransition() {
        window.waterEraser.active = false;
        document.body.classList.remove('transitioning');
        window.transitionPauseWater = false;
        transitionActive = false;
        isTransitioning = false;
        scrollLocked = false;
        hasTransitionedOnce = true;   // 标记已完成过渡

        // 按钮已在 startTransition 中隐藏

        window.scrollTo(0, window.innerHeight);

        tCtx.clearRect(0, 0, transitionCanvas.width, transitionCanvas.height);
        cancelAnimationFrame(animFrameId);
    }

    // ========== 滚动锁定与滚动条切换 ==========
    window.addEventListener('wheel', (e) => {
        if (isTransitioning) {
            e.preventDefault();
            return;
        }
        // 仅在未过渡过且处于顶部时锁定向下滚动
        if (!hasTransitionedOnce && scrollLocked && e.deltaY > 0) {
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if (isTransitioning) {
            const keys = ['ArrowDown', 'PageDown', ' ', 'Spacebar'];
            if (keys.includes(e.key) || e.key === ' ') {
                e.preventDefault();
            }
            return;
        }
        // 仅在未过渡过且处于顶部时锁定向下滚动
        if (!hasTransitionedOnce && scrollLocked) {
            const keys = ['ArrowDown', 'PageDown', ' ', 'Spacebar'];
            if (keys.includes(e.key) || e.key === ' ') {
                e.preventDefault();
            }
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (isTransitioning || (!hasTransitionedOnce && scrollLocked)) {
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('scroll', () => {
        if (!isTransitioning) {
            // 只有从未过渡过时才根据位置锁定；一旦过渡过，永远不锁定
            if (!hasTransitionedOnce) {
                const atTop = window.scrollY <= 0;
                scrollLocked = atTop;
                document.documentElement.classList.toggle('hide-scrollbar', scrollLocked);
                if (atTop && scrollBtn.style.display === 'none') {
                    scrollBtn.style.display = 'flex';
                }
            } else {
                // 过渡过后，始终不锁定，滚动条始终显示
                scrollLocked = false;
                document.documentElement.classList.remove('hide-scrollbar');
                if (window.scrollY <= 0 && scrollBtn.style.display === 'none') {
                    scrollBtn.style.display = 'flex';
                }
            }
        }
    });

    // 按钮事件
    scrollBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startTransition();
    });
    scrollBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        startTransition();
    }, { passive: true });
})();