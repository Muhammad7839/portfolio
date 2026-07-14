/* Interactive project constellation — a star map of the work.
   Progressive enhancement: the accessible project cards remain the source of
   truth. Renders only when a [data-constellation] mount and project cards
   exist. Each star is a real link (keyboard focusable) that jumps to its card. */
(function () {
  var mount = document.querySelector("[data-constellation]");
  var grid = document.querySelector(".spotlight-grid");
  if (!mount || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".spotlight-card"));
  if (cards.length < 3) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  var XLINK = "http://www.w3.org/1999/xlink";
  var W = 1040;
  var H = 520;
  var MX = 95;
  var MY = 74;

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /* Seeded PRNG (mulberry32) so the layout is stable between loads. */
  var seed = 20260713;
  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var nodes = cards.map(function (card, i) {
    var h3 = card.querySelector("h3");
    var full = h3 ? h3.textContent.trim() : "Project " + (i + 1);
    var short = full.split("—")[0].trim();
    var label = short.split(/\s+/).slice(0, 2).join(" ");
    if (!card.id) card.id = "proj-" + slug(short);
    return { i: i, id: card.id, full: full, label: label, bright: i < 4, x: undefined, y: undefined };
  });

  /* Scatter with light rejection sampling so stars don't stack. */
  nodes.forEach(function (n) {
    var tries = 0;
    var x;
    var y;
    var ok;
    do {
      x = MX + rand() * (W - 2 * MX);
      y = MY + rand() * (H - 2 * MY);
      ok = true;
      for (var j = 0; j < nodes.length; j += 1) {
        var m = nodes[j];
        if (m.x === undefined) continue;
        var dx = m.x - x;
        var dy = m.y - y;
        if (dx * dx + dy * dy < 116 * 116) { ok = false; break; }
      }
      tries += 1;
    } while (!ok && tries < 90);
    n.x = x;
    n.y = y;
  });

  /* Link each star to its two nearest neighbours = an organic constellation. */
  var links = [];
  var seen = {};
  nodes.forEach(function (a) {
    var others = nodes
      .filter(function (b) { return b !== a; })
      .map(function (b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return { b: b, d: dx * dx + dy * dy };
      })
      .sort(function (p, q) { return p.d - q.d; });
    others.slice(0, 2).forEach(function (nb) {
      var key = Math.min(a.i, nb.b.i) + "-" + Math.max(a.i, nb.b.i);
      if (seen[key]) return;
      seen[key] = true;
      links.push({ a: a, b: nb.b });
    });
  });

  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("class", "constellation-svg");
  svg.setAttribute("role", "list");
  svg.setAttribute("aria-label", "Project star map");

  var gLines = document.createElementNS(NS, "g");
  gLines.setAttribute("class", "constellation-lines");
  links.forEach(function (l) {
    var line = document.createElementNS(NS, "line");
    line.setAttribute("x1", l.a.x);
    line.setAttribute("y1", l.a.y);
    line.setAttribute("x2", l.b.x);
    line.setAttribute("y2", l.b.y);
    line.setAttribute("data-a", l.a.i);
    line.setAttribute("data-b", l.b.i);
    gLines.appendChild(line);
  });
  svg.appendChild(gLines);

  var gStars = document.createElementNS(NS, "g");
  gStars.setAttribute("class", "constellation-stars");

  function lineList() {
    return Array.prototype.slice.call(gLines.children);
  }

  nodes.forEach(function (n) {
    var link = document.createElementNS(NS, "a");
    link.setAttribute("href", "#" + n.id);
    link.setAttributeNS(XLINK, "xlink:href", "#" + n.id);
    link.setAttribute("class", "constellation-node" + (n.bright ? " is-bright" : ""));
    link.setAttribute("role", "listitem");
    link.setAttribute("aria-label", "Jump to " + n.full);

    var glow = document.createElementNS(NS, "circle");
    glow.setAttribute("class", "node-glow");
    glow.setAttribute("cx", n.x);
    glow.setAttribute("cy", n.y);
    glow.setAttribute("r", n.bright ? 24 : 16);

    var core = document.createElementNS(NS, "circle");
    core.setAttribute("class", "node-core");
    core.setAttribute("cx", n.x);
    core.setAttribute("cy", n.y);
    core.setAttribute("r", n.bright ? 5.2 : 3.4);
    core.style.animationDelay = (rand() * 4).toFixed(2) + "s";

    var label = document.createElementNS(NS, "text");
    label.setAttribute("class", "node-label");
    label.setAttribute("x", n.x);
    label.setAttribute("y", n.y + (n.bright ? 42 : 34));
    label.setAttribute("text-anchor", "middle");
    label.textContent = n.label;

    link.appendChild(glow);
    link.appendChild(core);
    link.appendChild(label);
    gStars.appendChild(link);

    function activate() {
      svg.classList.add("has-active");
      link.classList.add("is-active");
      lineList().forEach(function (ln) {
        if (ln.getAttribute("data-a") == n.i || ln.getAttribute("data-b") == n.i) {
          ln.classList.add("is-lit");
        }
      });
    }
    function deactivate() {
      svg.classList.remove("has-active");
      link.classList.remove("is-active");
      lineList().forEach(function (ln) { ln.classList.remove("is-lit"); });
    }

    link.addEventListener("mouseenter", activate);
    link.addEventListener("mouseleave", deactivate);
    link.addEventListener("focus", activate);
    link.addEventListener("blur", deactivate);
    link.addEventListener("click", function (event) {
      event.preventDefault();
      var card = document.getElementById(n.id);
      if (!card) return;
      card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      card.classList.remove("card-flash");
      void card.offsetWidth;
      card.classList.add("card-flash");
      window.setTimeout(function () { card.classList.remove("card-flash"); }, 1700);
    });
  });

  svg.appendChild(gStars);
  mount.appendChild(svg);
  mount.parentNode.classList.add("is-ready");
})();
