/* Live GitHub activity — proof the work keeps shipping. Fetches the public
   profile + recent push events, caches them per session to respect the
   unauthenticated rate limit, and degrades gracefully to a plain link. */
(function () {
  var mount = document.querySelector("[data-github]");
  if (!mount) return;

  var USER = "Muhammad7839";
  var CACHE_KEY = "gh-live-v2-" + USER;
  var TTL = 30 * 60 * 1000;

  function relTime(iso) {
    var s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + "s ago";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    var d = Math.floor(h / 24);
    if (d < 30) return d + "d ago";
    var mo = Math.floor(d / 30);
    if (mo < 12) return mo + "mo ago";
    return Math.floor(mo / 12) + "y ago";
  }

  function esc(s) {
    var el = document.createElement("div");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.t > TTL) return null;
      return obj.d;
    } catch (e) {
      return null;
    }
  }

  function writeCache(d) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: d }));
    } catch (e) {
      /* storage unavailable — fine */
    }
  }

  function render(data) {
    var profile = data.profile || {};
    var commits = data.commits || [];

    var stars = commits.slice(0, 16).map(function (c, i) {
      return '<span class="gh-star" style="--i:' + i + '" tabindex="0" role="listitem"' +
        ' data-tip="' + esc((c.repo.split("/")[1] || c.repo) + " — " + c.message) + '"' +
        ' aria-label="' + esc(c.repo + ": " + c.message) + '"></span>';
    }).join("");

    var log = commits.slice(0, 6).map(function (c) {
      return '<li><a href="https://github.com/' + esc(c.repo) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="gh-repo">' + esc(c.repo.split("/")[1] || c.repo) + "</span>" +
        '<span class="gh-msg">' + esc(c.message) + "</span>" +
        '<span class="gh-time">' + esc(relTime(c.at)) + "</span></a></li>";
    }).join("");

    mount.innerHTML =
      '<div class="gh-head">' +
        '<span class="gh-live-dot" aria-hidden="true"></span>' +
        "<h3>Live from GitHub</h3>" +
        '<a class="gh-handle" href="https://github.com/' + USER + '" target="_blank" rel="noopener noreferrer">@' + USER + "</a>" +
      "</div>" +
      '<div class="gh-stats">' +
        "<span><strong>" + (profile.public_repos != null ? profile.public_repos : "—") + "</strong> public repos</span>" +
        "<span><strong>" + (profile.followers != null ? profile.followers : "—") + "</strong> followers</span>" +
      "</div>" +
      (stars ? '<div class="gh-starfield" role="list" aria-label="Recent commits">' + stars + "</div>" : "") +
      (log
        ? '<ul class="gh-log">' + log + "</ul>"
        : '<p class="gh-empty">See the latest work on <a href="https://github.com/' + USER + '" target="_blank" rel="noopener noreferrer">github.com/' + USER + "</a>.</p>");

    mount.classList.add("is-ready");
  }

  function fallback() {
    mount.innerHTML =
      '<div class="gh-head"><span class="gh-live-dot is-idle" aria-hidden="true"></span>' +
      "<h3>GitHub</h3>" +
      '<a class="gh-handle" href="https://github.com/' + USER + '" target="_blank" rel="noopener noreferrer">@' + USER + "</a></div>" +
      '<p class="gh-empty">See the latest work on <a href="https://github.com/' + USER + '" target="_blank" rel="noopener noreferrer">github.com/' + USER + "</a>.</p>";
    mount.classList.add("is-ready");
  }

  var cached = readCache();
  if (cached) {
    render(cached);
    return;
  }

  function json(url) {
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  Promise.all([
    json("https://api.github.com/users/" + USER),
    json("https://api.github.com/users/" + USER + "/events/public?per_page=100"),
    json("https://api.github.com/users/" + USER + "/repos?sort=pushed&per_page=12&type=owner")
  ]).then(function (res) {
    var profile = res[0];
    var events = res[1];
    var repos = res[2];
    if (!profile && !events && !repos) {
      fallback();
      return;
    }

    var login = (profile && profile.login) || USER;
    var commits = [];
    (events || []).forEach(function (ev) {
      if (ev.type === "PushEvent" && ev.payload && ev.payload.commits && ev.payload.commits.length) {
        var last = ev.payload.commits[ev.payload.commits.length - 1];
        if (last && last.message) {
          commits.push({ repo: ev.repo.name, message: last.message.split("\n")[0], at: ev.created_at });
        }
      }
    });

    /* If no public push events (recent work may be in private repos), fall
       back to the most recently updated public repositories. */
    if (!commits.length && repos && repos.length) {
      commits = repos.filter(function (r) { return !r.fork; }).slice(0, 12).map(function (r) {
        return {
          repo: login + "/" + r.name,
          message: r.description || (r.language ? r.language + " repository" : "Updated repository"),
          at: r.pushed_at
        };
      });
    }

    var data = { profile: profile || {}, commits: commits };
    writeCache(data);
    render(data);
  }).catch(function () {
    fallback();
  });
})();
