/* Reveal the Results directory only while the reader scrolls downward. */
(function () {
  'use strict';

  var page = document.body;
  if (!page.classList.contains('results-page')) return;

  var lastY = window.scrollY || 0;
  var ticking = false;

  function updateDirectory() {
    var currentY = window.scrollY || 0;
    var movedDown = currentY > lastY + 4;
    var movedUp = currentY < lastY - 4;

    if (currentY < 24 || movedUp) {
      page.classList.remove('results-directory-visible');
    } else if (movedDown) {
      page.classList.add('results-directory-visible');
    }

    lastY = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(updateDirectory);
      ticking = true;
    }
  }, { passive: true });
}());
