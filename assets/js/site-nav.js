/* Shared navigation, mobile focus management, and safe page transitions. */
(function() {
  var navLinks = [
    { href: "index.html", label: "Home" },
    { href: "about.html", label: "About" },
    { href: "experience.html", label: "Experience" },
    { href: "projects.html", label: "Projects" },
    { href: "skills.html", label: "Skills" },
    { href: "education.html", label: "Education" },
    { href: "contact.html", label: "Contact" },
    { href: "resume.html", label: "Resume" }
  ];

  function currentPage() {
    var path = window.location.pathname.split("/").pop();
    return path || "index.html";
  }

  function renderLinks(activePage) {
    return navLinks
      .map(function(link) {
        var activeClass = activePage === link.href ? " is-active" : "";
        var current = activePage === link.href ? ' aria-current="page"' : "";

        return (
          '<li><a class="site-nav-link' +
          activeClass +
          '" href="' +
          link.href +
          '"' +
          current +
          ">" +
          link.label +
          "</a></li>"
        );
      })
      .join("");
  }

  function renderBrand() {
    return [
      '<a class="site-brand" href="index.html">',
      '  <span class="site-brand-name">Muhammad <span>Imran</span></span>',
      '  <span class="site-brand-role">Software Engineer</span>',
      "</a>"
    ].join("");
  }

  function renderNavPanel(activePage) {
    return [
      '<div class="site-nav-panel">',
      renderBrand(),
      "  <nav aria-label=" + '"Portfolio"' + ">",
      '    <ul class="site-nav-list">' + renderLinks(activePage) + "</ul>",
      "  </nav>",
      "</div>",
      '<div class="site-nav-footer">',
      '  <a class="site-nav-github" href="https://github.com/Muhammad7839" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile" data-url="github.com/Muhammad7839"><i class="fa-brands fa-github" aria-hidden="true"></i></a>',
      '  <span class="site-nav-badge">BRdata Software Solutions</span>',
      '  <p class="site-nav-note">Supporting enterprise retail and wholesale software across client-facing modules, QA, documentation, and implementation workflows.</p>',
      "</div>"
    ].join("");
  }

  function renderNav(activePage) {
    return [
      '<aside id="sidebar" aria-label="Primary navigation">',
      renderNavPanel(activePage),
      "</aside>",
      '<button class="mobile-nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav-drawer">',
      '  <span class="toggle-open"><i class="fa-solid fa-bars" aria-hidden="true"></i> Menu</span>',
      '  <span class="toggle-close"><i class="fa-solid fa-xmark" aria-hidden="true"></i> Close</span>',
      "</button>",
      '<div class="mobile-nav-overlay" data-mobile-nav-overlay></div>',
      '<div class="mobile-nav-drawer" id="mobile-nav-drawer" aria-hidden="true" inert>',
      '  <div class="mobile-nav-header">',
      renderBrand(),
      '    <button class="mobile-nav-close" type="button" aria-label="Close navigation"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>',
      "  </div>",
      renderNavPanel(activePage),
      "</div>"
    ].join("");
  }

  var activePage = currentPage();

  document.querySelectorAll("[data-site-nav]").forEach(function(container) {
    container.innerHTML = renderNav(activePage);
  });

  var body = document.body;
  var main = document.getElementById("main");
  var toggle = document.querySelector(".mobile-nav-toggle");
  var drawer = document.getElementById("mobile-nav-drawer");
  var overlay = document.querySelector("[data-mobile-nav-overlay]");
  var closeButton = document.querySelector(".mobile-nav-close");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("a[href]").forEach(function(link) {
    var href = link.getAttribute("href");

    if (!href || href.charAt(0) === "#" || link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }

    var destination;

    try {
      destination = new URL(href, window.location.href);
    } catch (error) {
      return;
    }

    if (destination.origin !== window.location.origin || !/^https?:$/.test(destination.protocol)) {
      return;
    }

    link.addEventListener("click", function(event) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();
      body.classList.add("page-transitioning");
      window.setTimeout(function() {
        window.location.assign(destination.href);
      }, reduceMotion.matches ? 0 : 180);
    });
  });

  window.addEventListener("pageshow", function() {
    body.classList.remove("page-transitioning");
  });

  if (!toggle || !drawer || !overlay || !closeButton) {
    return;
  }

  function setMenuState(open, focusTarget) {
    body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    drawer.inert = !open;

    if (main) {
      main.inert = open;
    }

    if (focusTarget) {
      focusTarget.focus();
    }
  }

  function trapDrawerFocus(event) {
    if (event.key !== "Tab" || !body.classList.contains("menu-open")) {
      return;
    }

    var focusable = Array.prototype.slice.call(
      drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );

    if (!focusable.length) {
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener("click", function() {
    var open = !body.classList.contains("menu-open");
    setMenuState(open, open ? closeButton : toggle);
  });

  closeButton.addEventListener("click", function() {
    setMenuState(false, toggle);
  });

  overlay.addEventListener("click", function() {
    setMenuState(false, toggle);
  });

  drawer.querySelectorAll(".site-nav-link").forEach(function(link) {
    link.addEventListener("click", function() {
      setMenuState(false);
    });
  });

  window.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && body.classList.contains("menu-open")) {
      setMenuState(false, toggle);
      return;
    }

    trapDrawerFocus(event);
  });

  window.addEventListener("resize", function() {
    if (window.innerWidth > 768 && body.classList.contains("menu-open")) {
      setMenuState(false, toggle);
    }
  });
})();
