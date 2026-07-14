/* Command palette (Cmd/Ctrl+K) — navigate, act, and search the universe.
   A launch console: fuzzy-filter commands, arrow-key through them, Enter to
   run. Also opens from a floating chip so touch users get it too. */
(function () {
  if (!document.body) return;

  var EMAIL = "imranabdullah926@gmail.com";
  var commands = [
    { label: "Home", hint: "Page", kw: "start index universe", url: "index.html" },
    { label: "About", hint: "Page", kw: "bio who story how i work", url: "about.html" },
    { label: "Experience", hint: "Page", kw: "work jobs roles brdata zowe linux foundation", url: "experience.html" },
    { label: "Projects", hint: "Page", kw: "builds fitgpt solarshare zowe stockvision star map", url: "projects.html" },
    { label: "Skills", hint: "Page", kw: "stack tech ai languages tools react flutter", url: "skills.html" },
    { label: "Education & certifications", hint: "Page", kw: "degree credentials anthropic launchcode verify", url: "education.html" },
    { label: "Contact", hint: "Page", kw: "email reach hire message", url: "contact.html" },
    { label: "Résumé", hint: "Page", kw: "cv", url: "resume.html" },
    { label: "Download résumé (PDF)", hint: "Action", kw: "cv pdf save download", url: "assets/resume.pdf", download: true },
    { label: "Email Muhammad", hint: "Action", kw: "contact hire reach mail", url: "mailto:" + EMAIL },
    { label: "Copy email address", hint: "Action", kw: "clipboard contact", action: "copyEmail" },
    { label: "GitHub — @Muhammad7839", hint: "Link", kw: "code repos open source", url: "https://github.com/Muhammad7839", blank: true },
    { label: "LinkedIn", hint: "Link", kw: "profile connect", url: "https://www.linkedin.com/in/muhammadimran-swe/", blank: true },
    { label: "View this site's source", hint: "Link", kw: "code github how built", url: "https://github.com/Muhammad7839/portfolio", blank: true }
  ];

  var overlay = document.createElement("div");
  overlay.className = "command-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Command palette");
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="command-panel">' +
      '<div class="command-inputwrap">' +
        '<span class="command-prompt">&gt;</span>' +
        '<input class="command-input" type="text" autocomplete="off" spellcheck="false" ' +
        'placeholder="Jump to a page, run an action, or search…" aria-label="Type a command or search" />' +
        '<kbd class="command-esc">esc</kbd>' +
      "</div>" +
      '<ul class="command-results" role="listbox" aria-label="Commands"></ul>' +
      '<div class="command-foot"><span>↑↓ to navigate</span><span>↵ to run</span><span>from Muhammad’s universe</span></div>' +
    "</div>";
  document.body.appendChild(overlay);

  var trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "command-trigger";
  trigger.setAttribute("aria-label", "Open command palette");
  trigger.innerHTML = '<kbd>⌘</kbd><kbd>K</kbd><span>Search</span>';
  document.body.appendChild(trigger);

  var input = overlay.querySelector(".command-input");
  var results = overlay.querySelector(".command-results");
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (!isMac) trigger.querySelector("kbd").textContent = "Ctrl";

  var filtered = commands.slice();
  var active = 0;
  var lastFocus = null;

  function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function score(cmd, q) {
    var hay = norm(cmd.label + " " + (cmd.kw || ""));
    var i = hay.indexOf(q);
    if (i === 0) return 3;
    if (i > 0) return 2;
    // subsequence
    var qi = 0;
    for (var c = 0; c < hay.length && qi < q.length; c += 1) {
      if (hay[c] === q[qi]) qi += 1;
    }
    return qi === q.length ? 1 : 0;
  }

  function renderList() {
    results.innerHTML = "";
    filtered.forEach(function (cmd, idx) {
      var li = document.createElement("li");
      li.className = "command-item" + (idx === active ? " is-active" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", idx === active ? "true" : "false");
      li.innerHTML = '<span class="command-label">' + cmd.label + "</span>" +
        '<span class="command-hint">' + cmd.hint + "</span>";
      li.addEventListener("mousemove", function () {
        if (active !== idx) { active = idx; paintActive(); }
      });
      li.addEventListener("click", function () { run(cmd); });
      results.appendChild(li);
    });
    if (!filtered.length) {
      var empty = document.createElement("li");
      empty.className = "command-empty";
      empty.textContent = "No matches. Try “projects”, “AI”, or “resume”.";
      results.appendChild(empty);
    }
  }

  function paintActive() {
    Array.prototype.forEach.call(results.children, function (li, idx) {
      var on = idx === active;
      li.classList.toggle("is-active", on);
      li.setAttribute("aria-selected", on ? "true" : "false");
      if (on && li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
    });
  }

  function filter() {
    var q = norm(input.value.trim());
    if (!q) {
      filtered = commands.slice();
    } else {
      filtered = commands
        .map(function (c) { return { c: c, s: score(c, q) }; })
        .filter(function (o) { return o.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .map(function (o) { return o.c; });
    }
    active = 0;
    renderList();
  }

  function open() {
    if (!overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("command-open");
    input.value = "";
    filter();
    requestAnimationFrame(function () {
      overlay.classList.add("is-open");
      input.focus();
    });
  }

  function close() {
    if (overlay.hidden) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("command-open");
    window.setTimeout(function () { overlay.hidden = true; }, 180);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function copyEmail() {
    var done = function () { flash("Email copied ✓"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, function () { flash(EMAIL); });
    } else {
      flash(EMAIL);
    }
  }

  function flash(msg) {
    var el = overlay.querySelector(".command-flash");
    if (!el) {
      el = document.createElement("div");
      el.className = "command-flash";
      overlay.querySelector(".command-panel").appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-shown");
    window.setTimeout(function () { el.classList.remove("is-shown"); }, 1400);
  }

  function run(cmd) {
    if (cmd.action === "copyEmail") { copyEmail(); return; }
    close();
    if (cmd.blank) {
      window.open(cmd.url, "_blank", "noopener");
    } else if (cmd.download) {
      var a = document.createElement("a");
      a.href = cmd.url; a.download = "";
      document.body.appendChild(a); a.click(); a.remove();
    } else {
      window.location.href = cmd.url;
    }
  }

  input.addEventListener("input", filter);

  overlay.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (filtered.length) { active = (active + 1) % filtered.length; paintActive(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (filtered.length) { active = (active - 1 + filtered.length) % filtered.length; paintActive(); } }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) run(filtered[active]); }
  });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });

  trigger.addEventListener("click", open);

  window.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      overlay.hidden ? open() : close();
    }
  });
})();
