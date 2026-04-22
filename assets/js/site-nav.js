/* Shared navigation renderer for the portfolio pages. */
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
      "  <nav>",
      '    <ul class="site-nav-list">' + renderLinks(activePage) + "</ul>",
      "  </nav>",
      "</div>",
      '<div class="site-nav-footer">',
      '  <a class="site-nav-github" href="https://github.com/Muhammad7839" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile" data-url="github.com/Muhammad7839"><i class="fa-brands fa-github" aria-hidden="true"></i></a>',
      '  <span class="site-nav-badge">Available</span>',
      '  <p class="site-nav-note">Actively seeking software engineering internships and entry-level roles. Ready to contribute from day one.</p>',
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
      '<div class="mobile-nav-drawer" id="mobile-nav-drawer" aria-hidden="true">',
      '  <div class="mobile-nav-header">',
      renderBrand(),
      '    <button class="mobile-nav-close" type="button" aria-label="Close navigation"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>',
      "  </div>",
      renderNavPanel(activePage),
      "</div>"
    ].join("");
  }

  function setMenuState(open, body, toggle, drawer, focusTarget) {
    body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));

    if (focusTarget) {
      focusTarget.focus();
    }
  }

  var activePage = currentPage();

  document.querySelectorAll("[data-site-nav]").forEach(function(container) {
    container.innerHTML = renderNav(activePage);
  });

  var body = document.body;
  var toggle = document.querySelector(".mobile-nav-toggle");
  var drawer = document.getElementById("mobile-nav-drawer");
  var overlay = document.querySelector("[data-mobile-nav-overlay]");
  var closeButton = document.querySelector(".mobile-nav-close");
  var drawerLinks = drawer ? drawer.querySelectorAll(".site-nav-link") : [];

  if (!toggle || !drawer || !overlay || !closeButton) {
    return;
  }

  toggle.addEventListener("click", function() {
    var open = !body.classList.contains("menu-open");
    setMenuState(open, body, toggle, drawer, open ? closeButton : toggle);
  });

  closeButton.addEventListener("click", function() {
    setMenuState(false, body, toggle, drawer, toggle);
  });

  overlay.addEventListener("click", function() {
    setMenuState(false, body, toggle, drawer, toggle);
  });

  drawerLinks.forEach(function(link) {
    link.addEventListener("click", function() {
      setMenuState(false, body, toggle, drawer, toggle);
    });
  });

  window.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && body.classList.contains("menu-open")) {
      setMenuState(false, body, toggle, drawer, toggle);
    }
  });

  window.addEventListener("resize", function() {
    if (window.innerWidth > 768 && body.classList.contains("menu-open")) {
      setMenuState(false, body, toggle, drawer, toggle);
    }
  });
})();
