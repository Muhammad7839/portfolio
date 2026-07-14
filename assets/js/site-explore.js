/* Optional debug mode, engineering colophon, and restrained achievements. */
(function() {
  var body = document.body;
  var sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var sequenceIndex = 0;
  var toastRegion = document.createElement("div");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  toastRegion.className = "achievement-region";
  toastRegion.setAttribute("role", "status");
  toastRegion.setAttribute("aria-live", "polite");
  toastRegion.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastRegion);

  function readSession(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeSession(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      // Session storage is an enhancement, not a requirement.
    }
  }

  function showToast(key, message) {
    if (readSession("portfolio-achievement-" + key) === "true") {
      return;
    }

    writeSession("portfolio-achievement-" + key, "true");
    var toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.textContent = message;
    toastRegion.appendChild(toast);

    window.setTimeout(function() {
      toast.classList.add("is-leaving");
      window.setTimeout(function() {
        toast.remove();
      }, reduceMotion.matches ? 0 : 220);
    }, 4000);
  }

  function ensureDebugPanel() {
    var panel = document.querySelector("[data-debug-panel]");

    if (panel) {
      return panel;
    }

    panel = document.createElement("aside");
    panel.className = "debug-panel";
    panel.dataset.debugPanel = "true";
    panel.setAttribute("aria-label", "Build log");
    panel.innerHTML = [
      '<div class="debug-panel-heading"><strong>BUILD LOG</strong><button type="button" data-debug-exit aria-label="Exit debug mode">×</button></div>',
      '<p>Hand-written HTML, CSS, and vanilla JavaScript. No frontend framework.</p>',
      '<p>AI-assisted where useful, human-reviewed throughout, and protected by repository checks.</p>',
      '<div class="debug-panel-actions"><a href="404.html">Run diagnostics</a><button type="button" data-debug-exit>Exit debug mode</button></div>'
    ].join("");
    document.body.appendChild(panel);
    panel.querySelectorAll("[data-debug-exit]").forEach(function(button) {
      button.addEventListener("click", function() {
        setDebugMode(false);
      });
    });
    return panel;
  }

  function setDebugMode(enabled) {
    if (enabled) {
      body.dataset.mode = "debug";
      writeSession("portfolio-debug-mode", "true");
      ensureDebugPanel();
      showToast("debug", "Debug mode enabled — inspect the build log.");
    } else {
      delete body.dataset.mode;
      writeSession("portfolio-debug-mode", "false");
      var panel = document.querySelector("[data-debug-panel]");
      if (panel) {
        panel.remove();
      }
    }
  }

  document.addEventListener("keydown", function(event) {
    var expected = sequence[sequenceIndex];
    var actual = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (actual === expected) {
      sequenceIndex += 1;
      if (sequenceIndex === sequence.length) {
        setDebugMode(body.dataset.mode !== "debug");
        sequenceIndex = 0;
      }
    } else {
      sequenceIndex = actual === sequence[0] ? 1 : 0;
    }
  });

  document.querySelectorAll("[data-debug-toggle]").forEach(function(button) {
    button.addEventListener("click", function() {
      setDebugMode(body.dataset.mode !== "debug");
    });
  });

  if (readSession("portfolio-debug-mode") === "true") {
    setDebugMode(true);
  }

  var spotlight = document.querySelector(".spotlight-grid");
  if (spotlight && "IntersectionObserver" in window) {
    var spotlightObserver = new IntersectionObserver(
      function(entries) {
        if (entries.some(function(entry) { return entry.isIntersecting; })) {
          showToast("selected-work", "Found: selected engineering work.");
          spotlightObserver.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    spotlightObserver.observe(spotlight);
  }

  var firstProjectHover = function(event) {
    var card = event.target.closest && event.target.closest(".spotlight-card");
    if (!card) {
      return;
    }

    var title = card.querySelector("h3");
    showToast("project-inspection", "Inspecting: " + (title ? title.textContent.trim() : "project"));
    document.removeEventListener("pointerover", firstProjectHover);
  };
  document.addEventListener("pointerover", firstProjectHover);
})();
