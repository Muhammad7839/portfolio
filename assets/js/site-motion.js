/* Count-up proof, restrained staggered reveals, and pointer-aware card lighting. */
(function() {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(pointer: fine)");
  var cardSelector = [
    ".spotlight-card",
    ".quick-card",
    ".timeline-card",
    ".skill-card",
    ".contact-card",
    ".info-card",
    ".credibility-item",
    ".proof-item"
  ].join(",");
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]," + cardSelector));
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));

  document.documentElement.classList.add("has-js");

  if (finePointer.matches && !reduceMotion.matches) {
    document.addEventListener("pointermove", function(event) {
      var card = event.target && event.target.closest ? event.target.closest(cardSelector) : null;
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--glow-x", event.clientX - rect.left + "px");
      card.style.setProperty("--glow-y", event.clientY - rect.top + "px");
    }, { passive: true });
  }

  function showFinalCount(element) {
    element.textContent = element.dataset.count + (element.dataset.countSuffix || "");
  }

  function animateCount(element) {
    var target = parseInt(element.dataset.count, 10);
    var suffix = element.dataset.countSuffix || "";
    var start = 0;
    var duration = 900;

    if (isNaN(target)) return;

    function step(now) {
      if (!start) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  }

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    counters.forEach(showFinalCount);
    revealTargets.forEach(function(target) {
      target.classList.add("reveal-visible");
    });
    return;
  }

  var countObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      animateCount(entry.target);
    });
  }, { threshold: 0.45 });
  counters.forEach(function(counter) {
    countObserver.observe(counter);
  });

  var revealObserver = new IntersectionObserver(function(entries) {
    var visible = entries.filter(function(entry) {
      return entry.isIntersecting;
    }).sort(function(a, b) {
      return a.boundingClientRect.top - b.boundingClientRect.top;
    });

    visible.forEach(function(entry, index) {
      revealObserver.unobserve(entry.target);
      entry.target.style.transitionDelay = Math.min(index, 5) * 60 + "ms";
      entry.target.classList.add("reveal-visible");
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  revealTargets.forEach(function(target) {
    if (target.getBoundingClientRect().top <= window.innerHeight * 0.94) {
      target.classList.add("reveal-visible");
      return;
    }
    target.classList.add("reveal-pending");
    revealObserver.observe(target);
  });
})();

/* Scroll progress indicator (independent of the reveal module's early returns). */
(function() {
  if (!document.body) return;
  var bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  var ticking = false;

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    bar.style.transform = "scaleX(" + progress.toFixed(4) + ")";
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
})();
