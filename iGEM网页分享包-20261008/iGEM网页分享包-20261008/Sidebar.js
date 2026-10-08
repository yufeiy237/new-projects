// sidebar.js
(function() {
    'use strict';

    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarNav = document.getElementById('sidebarNav');
    const fruitRow = document.querySelector('.nav-fruit-row');
    const mainWrapper = document.querySelector('.main-wrapper');

    const fruitLinks = Array.from(document.querySelectorAll('.nav-fruit'));
    const fruitSections = fruitLinks.map(link => {
        const id = link.dataset.anchor;
        const section = document.getElementById(id);
        return { link, section };
    }).filter(item => item.section);

    const pageLinks = Array.from(document.querySelectorAll('.page-link'));

    let isSidebarOpen = false;
    let lastFocusedElement = null;

    // ========== 颗粒感动态光斑效果 ==========
    function initGrainEffects() {
        pageLinks.forEach(link => {
            link.style.setProperty('--mx', '50%');
            link.style.setProperty('--my', '35%');

            link.addEventListener('mousemove', (e) => {
                const rect = link.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                link.style.setProperty('--mx', x + '%');
                link.style.setProperty('--my', y + '%');
            });

            link.addEventListener('mouseleave', () => {
                link.style.setProperty('--mx', '50%');
                link.style.setProperty('--my', '35%');
            });

            link.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const rect = link.getBoundingClientRect();
                const x = ((touch.clientX - rect.left) / rect.width) * 100;
                const y = ((touch.clientY - rect.top) / rect.height) * 100;
                link.style.setProperty('--mx', x + '%');
                link.style.setProperty('--my', y + '%');
            }, { passive: true });

            link.addEventListener('touchend', () => {
                setTimeout(() => {
                    link.style.setProperty('--mx', '50%');
                    link.style.setProperty('--my', '35%');
                }, 300);
            });
        });
    }

    // ========== 点击波纹与颗粒瞬时强化 ==========
    function initRippleEffect() {
        pageLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // 创建波纹元素
                const oldRipple = link.querySelector('.ripple');
                if (oldRipple) oldRipple.remove();

                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                const rect = link.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height) * 1.8;
                ripple.style.width = size + 'px';
                ripple.style.height = size + 'px';
                ripple.style.left = (e.clientX - rect.left) + 'px';
                ripple.style.top = (e.clientY - rect.top) + 'px';
                link.appendChild(ripple);

                ripple.addEventListener('animationend', () => {
                    ripple.remove();
                });

                // 颗粒感瞬时最大化
                link.style.setProperty('--grain-opacity-base', '1');
                link.style.setProperty('--grain-contrast', '2.8');
                link.style.setProperty('--grain-brightness', '1.15');

                setTimeout(() => {
                    link.style.removeProperty('--grain-opacity-base');
                    link.style.removeProperty('--grain-contrast');
                    link.style.removeProperty('--grain-brightness');
                }, 180);

                // 激活状态切换
                if (!link.classList.contains('disabled')) {
                    pageLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }

                // 注意：不阻止默认跳转行为，交给浏览器处理
                // 如果需要手动跳转，使用以下代码：
                // const href = link.getAttribute('href');
                // if (href && href !== '#') {
                //     window.location.href = href;
                //     e.preventDefault();
                // }
            });
        });
    }

    // ========== 侧边栏开关 ==========
    function openSidebar() {
        if (isSidebarOpen) return;
        isSidebarOpen = true;
        lastFocusedElement = document.activeElement;
        body.classList.add('sidebar-open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        hamburgerBtn.setAttribute('aria-label', '关闭导航菜单');
        sidebarCloseBtn.focus();
    }

    function closeSidebar() {
        if (!isSidebarOpen) return;
        isSidebarOpen = false;
        body.classList.remove('sidebar-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.setAttribute('aria-label', '打开导航菜单');
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        } else {
            hamburgerBtn.focus();
        }
    }

    function toggleSidebar() {
        isSidebarOpen ? closeSidebar() : openSidebar();
    }

    // ========== 事件绑定 ==========
    hamburgerBtn.addEventListener('click', toggleSidebar);
    sidebarCloseBtn.addEventListener('click', closeSidebar);

    sidebarNav.addEventListener('click', (e) => {
        const fruitLink = e.target.closest('.nav-fruit');
        if (fruitLink) {
            e.preventDefault();
            const anchorId = fruitLink.dataset.anchor;
            const targetSection = document.getElementById(anchorId);
            if (targetSection) {
                closeSidebar();
                setTimeout(() => {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 400);
            }
            return;
        }

        const pageLink = e.target.closest('.page-link');
        if (pageLink) {
            closeSidebar();
            const href = pageLink.getAttribute('href');
            if (href && href !== '#') {
                // 手动跳转，确保可靠
                window.location.href = href;
                e.preventDefault(); // 阻止默认，避免重复跳转
            }
        }
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSidebarOpen) {
            closeSidebar();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && isSidebarOpen) {
            const focusable = sidebar.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // 触摸滑动关闭侧边栏
    let touchStartX = 0,
        touchEndX = 0;
    sidebar.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    sidebar.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX > 50 && isSidebarOpen) {
            closeSidebar();
        }
    }, { passive: true });

    // ========== 水果图标灰度随滚动更新 ==========
    function updateFruitStates() {
        if (!mainWrapper || !fruitRow) return;

        const wrapperRect = mainWrapper.getBoundingClientRect();
        const viewportH = window.innerHeight;
        if (wrapperRect.top < viewportH && wrapperRect.bottom > 0) {
            body.classList.add('home-active');
        } else {
            body.classList.remove('home-active');
        }

        fruitSections.forEach(({ link, section }) => {
            const rect = section.getBoundingClientRect();
            const threshold = viewportH * 0.2;

            if (rect.top > viewportH) {
                link.style.filter = 'grayscale(1)';
                return;
            }
            if (rect.top < 0) {
                link.style.filter = 'grayscale(0)';
                return;
            }
            const progress = Math.min(1, Math.max(0, rect.top / threshold));
            const gray = 1 - progress;
            link.style.filter = `grayscale(${gray})`;
        });
    }

    if (mainWrapper && fruitRow && fruitSections.length > 0) {
        updateFruitStates();
        window.addEventListener('scroll', updateFruitStates, { passive: true });
        window.addEventListener('resize', updateFruitStates, { passive: true });
    }

    // ========== 初始化 ==========
    initGrainEffects();
    initRippleEffect();
})();