/* Restrained desktop wheel smoothing; touch, keyboard and reduced motion stay native. */
(function() {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(pointer: fine)");
  var canHover = window.matchMedia("(hover: hover)");

  if (reduceMotion.matches || !finePointer.matches || !canHover.matches || typeof window.Lenis !== "function") {
    return;
  }

  var lenis = new window.Lenis({
    autoRaf: true,
    anchors: true,
    duration: 0.78,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.86,
    allowNestedScroll: true,
    stopInertiaOnNavigate: true
  });

  document.documentElement.dataset.smoothScroll = "active";
  /* Expose the instance so in-page jumps (e.g. the project constellation)
     scroll through Lenis instead of fighting it with native scrollIntoView. */
  window.__lenisInstance = lenis;

  reduceMotion.addEventListener("change", function(event) {
    if (!event.matches) return;
    lenis.destroy();
    window.__lenisInstance = null;
    delete document.documentElement.dataset.smoothScroll;
  });
})();
