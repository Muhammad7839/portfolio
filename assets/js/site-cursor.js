/* Spacecraft pointer for precise desktop input; native input remains the fallback. */
(function() {
  var finePointer = window.matchMedia("(pointer: fine)");
  var canHover = window.matchMedia("(hover: hover)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!finePointer.matches || !canHover.matches || reduceMotion.matches) {
    return;
  }

  var body = document.body;
  var ship = document.createElement("div");
  var ring = document.createElement("div");
  var targetX = -100;
  var targetY = -100;
  var ringX = targetX;
  var ringY = targetY;
  var shipX = targetX;
  var shipY = targetY;
  var lastX = targetX;
  var lastY = targetY;
  var frameId = 0;

  ship.className = "site-cursor-halo";
  ship.setAttribute("aria-hidden", "true");
  ship.innerHTML = [
    '<svg class="cursor-spacecraft" viewBox="0 0 32 32" aria-hidden="true">',
    '  <path d="M16 1.5C19.6 6.8 21 12.6 20.8 19.6L11.2 19.6C11 12.6 12.4 6.8 16 1.5Z" fill="currentColor"/>',
    '  <path d="M11.4 15.4 6.6 22.4 11.4 19.8Z" fill="currentColor"/>',
    '  <path d="M20.6 15.4 25.4 22.4 20.6 19.8Z" fill="currentColor"/>',
    '  <circle cx="16" cy="10.6" r="2.4" fill="#8cf1d5"/>',
    '  <circle cx="16" cy="10.6" r="4.4" fill="none" stroke="#8cf1d5" stroke-width="0.8" opacity="0.5"/>',
    '</svg>',
    '<span class="cursor-thruster-trail">',
    '  <i></i><i></i><i></i><i></i>',
    '</span>'
  ].join("");
  ring.className = "site-cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  body.appendChild(ring);
  body.appendChild(ship);

  function interactiveState(target) {
    if (!target || !target.closest) return "";
    if (target.closest("iframe, embed, object, canvas, .resume-preview-link, .resume-preview")) return "native";
    if (target.closest(".spotlight-card, .quick-card, .timeline-card, .info-card, .skill-card, .contact-card, .proof-item")) return "inspect";
    if (target.closest("a, button, summary, [role='button']")) return "action";
    return "";
  }

  function renderRing() {
    ringX += (targetX - ringX) * 0.14;
    ringY += (targetY - ringY) * 0.14;
    shipX += (targetX - shipX) * 0.6;
    shipY += (targetY - shipY) * 0.6;
    ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0) translate(-50%,-50%)";
    ship.style.transform = "translate3d(" + shipX + "px," + shipY + "px,0) translate(-50%,-50%)";
    frameId = window.requestAnimationFrame(renderRing);
  }

  function move(event) {
    var state = interactiveState(event.target);
    var deltaX = event.clientX - lastX;
    var deltaY = event.clientY - lastY;

    targetX = event.clientX;
    targetY = event.clientY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 1) {
      var angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
      ship.style.setProperty("--ship-rotation", angle + "deg");
    }

    lastX = event.clientX;
    lastY = event.clientY;
    ship.dataset.state = state;
    ring.dataset.state = state;

    if (state === "native") {
      body.removeAttribute("data-custom-cursor");
      ship.classList.remove("is-visible");
      ring.classList.remove("is-visible");
      return;
    }

    body.setAttribute("data-custom-cursor", "true");
    ship.classList.add("is-visible");
    ring.classList.add("is-visible");
  }

  function hide() {
    body.removeAttribute("data-custom-cursor");
    ship.classList.remove("is-visible");
    ring.classList.remove("is-visible");
  }

  function destroy() {
    window.cancelAnimationFrame(frameId);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("mouseleave", hide);
    window.removeEventListener("blur", hide);
    body.removeAttribute("data-custom-cursor");
    ship.remove();
    ring.remove();
  }

  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("mouseleave", hide);
  window.addEventListener("blur", hide);
  reduceMotion.addEventListener("change", function(event) {
    if (event.matches) destroy();
  });
  frameId = window.requestAnimationFrame(renderRing);
})();
