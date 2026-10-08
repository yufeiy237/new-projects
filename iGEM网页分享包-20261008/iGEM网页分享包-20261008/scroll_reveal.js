const initializeWikiPage = () => {
    const revealItems = document.querySelectorAll('.reveal-on-scroll');
    const sections = Array.from(document.querySelectorAll('#overview, .wiki-section[id]'));
    const tocLinks = Array.from(document.querySelectorAll('.wiki-toc-link'));
    const tocDetails = document.getElementById('wikiTocDetails');
    const tocCurrent = document.getElementById('wikiTocCurrent');
    const progressBar = document.getElementById('wikiProgressBar');
    const backToTop = document.getElementById('backToTop');
    let mobileToc = window.matchMedia('(max-width: 700px)').matches;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (tocDetails) tocDetails.open = !mobileToc;

    tocLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const target = document.getElementById(link.dataset.target);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
            if (tocDetails && window.matchMedia('(max-width: 700px)').matches) tocDetails.open = false;
        });
    });

    function updateScrollState() {
        const referenceLine = Math.max(100, window.innerHeight * 0.3);
        let activeSection = sections[0];
        sections.forEach((section) => {
            if (section.getBoundingClientRect().top <= referenceLine) activeSection = section;
        });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
            activeSection = sections[sections.length - 1];
        }

        if (activeSection) {
            tocLinks.forEach((link) => {
                const isActive = link.dataset.target === activeSection.id;
                link.classList.toggle('is-active', isActive);
                if (isActive && tocCurrent) {
                    const number = link.querySelector('span:first-child')?.textContent.trim() || '';
                    const label = link.querySelector('span:last-child')?.textContent.trim() || '';
                    tocCurrent.textContent = `${number} ${label}`;
                }
            });
        }

        if (progressBar) {
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
            progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
        }

        if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 400);
    }

    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', () => {
        const isMobile = window.matchMedia('(max-width: 700px)').matches;
        if (tocDetails && isMobile !== mobileToc) tocDetails.open = !isMobile;
        mobileToc = isMobile;
        updateScrollState();
    });
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
    updateScrollState();

    if (!('IntersectionObserver' in window)) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWikiPage, { once: true });
} else {
    initializeWikiPage();
}
