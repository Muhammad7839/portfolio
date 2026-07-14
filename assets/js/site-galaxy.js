/* Living grayscale galaxy: three depth layers, twinkle, parallax and warp drift. */
(function() {
  var canvas = document.createElement("canvas");

  if (!canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var DESKTOP_STAR_LIMIT = 260;
  var MOBILE_STAR_LIMIT = 110;
  var DESKTOP_DUST_COUNT = 58;
  var MOBILE_DUST_COUNT = 24;
  var DESKTOP_CLUSTER_COUNT = 44;
  var MOBILE_CLUSTER_COUNT = 18;
  var DESKTOP_HERO_COUNT = 8;
  var MOBILE_HERO_COUNT = 4;
  var MOBILE_BREAKPOINT = 768;
  var WARP_RATE_PER_MS = 0.00006;
  var BAND_ANGLE = -0.34;
  var PLANET_PARALLAX_SCROLL = 0.03;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(pointer: fine)");
  var width = 0;
  var height = 0;
  var dpr = 1;
  var stars = [];
  var planets = [];
  var meteor = null;
  var nextMeteorAt = 0;
  var pointerX = 0;
  var pointerY = 0;
  var parallaxX = 0;
  var parallaxY = 0;
  var frameId = 0;
  var fallbackTimer = 0;
  var frameToken = 0;
  var resizeTimer = 0;
  var previousTime = 0;
  var lastDiagnosticWrite = 0;
  var compactMode = false;
  var diagnostics = {
    frameCount: 0,
    lastFrameAt: 0,
    starCount: 0,
    depthLayers: 3,
    parallaxEnabled: false,
    reducedMotion: reduceMotion.matches,
    pointerX: 0,
    pointerY: 0,
    scrollY: 0,
    running: false
  };

  window.__portfolioGalaxy = diagnostics;
  canvas.className = "site-galaxy";
  canvas.dataset.galaxy = "living";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  function randomLayer() {
    var value = Math.random();
    if (value < 0.48) return 0;
    if (value < 0.8) return 1;
    return 2;
  }

  function layerDepth(layer) {
    return [0.32, 0.65, 1][layer];
  }

  function makeStar(layer, glow, dust) {
    var depth = layerDepth(layer);
    var x;
    var y;

    if (dust) {
      var diagonal = Math.sqrt(width * width + height * height);
      var along = (Math.random() - 0.5) * diagonal;
      var across = (Math.random() + Math.random() - 1) * height * 0.17;
      x = width / 2 + along * Math.cos(BAND_ANGLE) - across * Math.sin(BAND_ANGLE);
      y = height / 2 + along * Math.sin(BAND_ANGLE) + across * Math.cos(BAND_ANGLE);
    } else {
      x = Math.random() * width;
      y = Math.random() * height;
    }

    return {
      x: x,
      y: y,
      layer: layer,
      depth: depth,
      radius: glow ? 1.65 + Math.random() * 1.05 : 0.34 + depth * 1.3 + Math.random() * 0.55,
      opacity: glow ? 0.78 + Math.random() * 0.2 : 0.22 + depth * 0.5 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.9 + Math.random() * 1.6,
      twinkleDepth: glow ? 0.3 : 0.44 + Math.random() * 0.3,
      warp: 0.82 + Math.random() * 0.36,
      glow: glow,
      dust: dust,
      cluster: false
    };
  }

  function makeClusterStar(index) {
    var layer = index % 3;
    var star = makeStar(layer, false, false);
    var firstCluster = index % 2 === 0;
    var centerX = width * (firstCluster ? 0.28 : 0.72);
    var centerY = height * (firstCluster ? 0.38 : 0.66);
    var spreadX = width * (compactMode ? 0.11 : 0.09);
    var spreadY = height * (compactMode ? 0.13 : 0.1);
    star.x = centerX + (Math.random() + Math.random() - 1) * spreadX;
    star.y = centerY + (Math.random() + Math.random() - 1) * spreadY;
    star.opacity = Math.min(1, star.opacity + 0.12);
    star.cluster = true;
    return star;
  }

  function seedStars() {
    stars = [];
    compactMode = width < MOBILE_BREAKPOINT;
    var limit = compactMode ? MOBILE_STAR_LIMIT : DESKTOP_STAR_LIMIT;
    var dustCount = compactMode ? MOBILE_DUST_COUNT : DESKTOP_DUST_COUNT;
    var clusterCount = compactMode ? MOBILE_CLUSTER_COUNT : DESKTOP_CLUSTER_COUNT;
    var heroCount = compactMode ? MOBILE_HERO_COUNT : DESKTOP_HERO_COUNT;
    var regularCount = limit - dustCount - clusterCount - heroCount;

    for (var i = 0; i < regularCount; i += 1) {
      stars.push(makeStar(randomLayer(), false, false));
    }

    for (var j = 0; j < dustCount; j += 1) {
      stars.push(makeStar(j % 2, false, true));
    }

    for (var k = 0; k < clusterCount; k += 1) {
      stars.push(makeClusterStar(k));
    }

    for (var m = 0; m < heroCount; m += 1) {
      stars.push(makeStar(2, true, false));
    }

    diagnostics.starCount = stars.length;
    diagnostics.parallaxEnabled = !compactMode && finePointer.matches && !reduceMotion.matches;
    canvas.dataset.stars = String(stars.length);
    canvas.dataset.layers = "3";
    canvas.dataset.mode = compactMode ? "compact" : "desktop";
    canvas.dataset.motion = reduceMotion.matches ? "static" : "active";
  }

  function resize() {
    width = Math.max(window.innerWidth, 1);
    height = Math.max(window.innerHeight, 1);
    compactMode = width < MOBILE_BREAKPOINT;
    dpr = Math.min(window.devicePixelRatio || 1, compactMode ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
    draw(0, 0);
  }

  function scheduleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 160);
  }

  function drawMilkyWay() {
    var diagonal = Math.sqrt(width * width + height * height);
    var halfWidth = height * 0.23;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(BAND_ANGLE);
    var gradient = ctx.createLinearGradient(0, -halfWidth, 0, halfWidth);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.32, "rgba(226,231,239,0.018)");
    gradient.addColorStop(0.46, "rgba(240,243,248,0.065)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.095)");
    gradient.addColorStop(0.54, "rgba(240,243,248,0.065)");
    gradient.addColorStop(0.68, "rgba(226,231,239,0.018)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(-diagonal, -halfWidth, diagonal * 2, halfWidth * 2);
    ctx.restore();

    drawClusterGlow(width * 0.28, height * 0.38, Math.min(width, height) * 0.18);
    drawClusterGlow(width * 0.72, height * 0.66, Math.min(width, height) * 0.15);
  }

  function drawClusterGlow(x, y, radius) {
    var glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, "rgba(255,255,255,0.035)");
    glow.addColorStop(0.42, "rgba(232,237,244,0.016)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function makeBands(count) {
    var bands = [];
    for (var i = 0; i < count; i += 1) {
      bands.push({
        offset: Math.random(),
        speed: 0.6 + Math.random() * 0.8,
        h: 0.05 + Math.random() * 0.08,
        alpha: 0.1 + Math.random() * 0.12
      });
    }
    return bands;
  }

  function buildPlanets() {
    planets = [
      {
        x: 1.06, y: 0.82, radius: 0.6, opacity: 0.2,
        ring: true, ringTilt: -0.52, rotSpeed: 0.00004, parallax: 9,
        rotation: 0, bands: makeBands(4)
      },
      {
        x: 0.4, y: 0.12, radius: 0.045, opacity: 0.16,
        ring: false, ringTilt: 0, rotSpeed: 0.00009, parallax: 22,
        rotation: 0, bands: makeBands(3)
      }
    ];
  }

  function drawRing(p, cxp, cyp, radius, op, front) {
    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.rotate(p.ringTilt);
    ctx.scale(1, 0.34);
    var grad = ctx.createLinearGradient(-radius * 1.7, 0, radius * 1.7, 0);
    grad.addColorStop(0, "rgba(206,213,226,0)");
    grad.addColorStop(0.5, "rgba(206,213,226," + (op * 0.55).toFixed(3) + ")");
    grad.addColorStop(1, "rgba(206,213,226,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = radius * 0.26;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.42, front ? Math.PI : 0, front ? Math.PI * 2 : Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlanet(p, elapsed) {
    if (!reduceMotion.matches) p.rotation += p.rotSpeed * elapsed;
    var scrollShift = compactMode || reduceMotion.matches ? 0 : window.scrollY * PLANET_PARALLAX_SCROLL;
    var cxp = p.x * width + parallaxX * p.parallax;
    var cyp = p.y * height + parallaxY * p.parallax - scrollShift;
    var R = p.radius * Math.min(width, height);
    var op = p.opacity;

    var atm = ctx.createRadialGradient(cxp, cyp, R * 0.82, cxp, cyp, R * 1.22);
    atm.addColorStop(0, "rgba(198,208,224," + (op * 0.14).toFixed(3) + ")");
    atm.addColorStop(1, "rgba(198,208,224,0)");
    ctx.fillStyle = atm;
    ctx.beginPath();
    ctx.arc(cxp, cyp, R * 1.22, 0, Math.PI * 2);
    ctx.fill();

    if (p.ring) drawRing(p, cxp, cyp, R, op, false);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cxp, cyp, R, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "rgba(15,17,23," + op.toFixed(3) + ")";
    ctx.fillRect(cxp - R, cyp - R, R * 2, R * 2);

    var lx = cxp - R * 0.42;
    var ly = cyp - R * 0.42;
    var lit = ctx.createRadialGradient(lx, ly, R * 0.05, lx, ly, R * 1.55);
    lit.addColorStop(0, "rgba(214,220,231," + (op * 0.9).toFixed(3) + ")");
    lit.addColorStop(0.45, "rgba(150,158,172," + (op * 0.4).toFixed(3) + ")");
    lit.addColorStop(1, "rgba(15,17,23,0)");
    ctx.fillStyle = lit;
    ctx.fillRect(cxp - R, cyp - R, R * 2, R * 2);

    for (var i = 0; i < p.bands.length; i += 1) {
      var b = p.bands[i];
      var frac = (((b.offset + p.rotation * b.speed) % 1) + 1) % 1;
      var yy = cyp - R + frac * (R * 2);
      ctx.fillStyle = "rgba(206,213,226," + (op * b.alpha).toFixed(3) + ")";
      ctx.fillRect(cxp - R, yy - b.h * R, R * 2, b.h * R * 2);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(228,233,242," + (op * 0.65).toFixed(3) + ")";
    ctx.lineWidth = Math.max(1, R * 0.01);
    ctx.beginPath();
    ctx.arc(cxp, cyp, R * 0.99, Math.PI * 0.92, Math.PI * 1.72);
    ctx.stroke();

    if (p.ring) drawRing(p, cxp, cyp, R, op, true);
  }

  function drawPlanets(elapsed) {
    for (var i = 0; i < planets.length; i += 1) {
      drawPlanet(planets[i], elapsed);
    }
  }

  function resetWarpedStar(star) {
    var angle = Math.random() * Math.PI * 2;
    var distance = Math.min(width, height) * (0.06 + Math.random() * 0.18);
    star.x = width / 2 + Math.cos(angle) * distance;
    star.y = height / 2 + Math.sin(angle) * distance;
  }

  function moveStar(star, elapsed) {
    if (reduceMotion.matches || star.dust) return;
    var multiplier = 1 + elapsed * WARP_RATE_PER_MS * star.warp * star.depth;
    star.x = width / 2 + (star.x - width / 2) * multiplier;
    star.y = height / 2 + (star.y - height / 2) * multiplier;

    if (star.x < -40 || star.x > width + 40 || star.y < -40 || star.y > height + 40) {
      resetWarpedStar(star);
    }
  }

  function drawMeteor(elapsed) {
    if (!meteor) return;
    meteor.x += meteor.vx * elapsed;
    meteor.y += meteor.vy * elapsed;
    meteor.life -= elapsed / 820;

    if (meteor.life <= 0 || meteor.x > width + 140 || meteor.y > height + 100) {
      meteor = null;
      return;
    }

    var tailX = meteor.x - meteor.vx * 105;
    var tailY = meteor.y - meteor.vy * 105;
    var trail = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
    trail.addColorStop(0, "rgba(255,255,255,0)");
    trail.addColorStop(1, "rgba(255,255,255," + (0.78 * meteor.life).toFixed(3) + ")");
    ctx.strokeStyle = trail;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(meteor.x, meteor.y);
    ctx.stroke();
  }

  function spawnMeteor(now) {
    meteor = {
      x: width * (0.08 + Math.random() * 0.5),
      y: height * (0.03 + Math.random() * 0.2),
      vx: 0.42 + Math.random() * 0.18,
      vy: 0.18 + Math.random() * 0.09,
      life: 1
    };
    nextMeteorAt = now + 10000 + Math.random() * 10000;
  }

  function draw(now, elapsed) {
    ctx.clearRect(0, 0, width, height);
    drawMilkyWay();
    drawPlanets(elapsed);
    var scrollShift = compactMode || reduceMotion.matches ? 0 : window.scrollY * 0.085;

    stars.forEach(function(star) {
      moveStar(star, elapsed);
      var depthShift = diagnostics.parallaxEnabled ? (star.layer + 1) * 14 : 0;
      var x = star.x + parallaxX * depthShift;
      var y = star.y + parallaxY * depthShift - scrollShift * star.depth;
      var pulse = 0.5 + 0.5 * Math.sin(star.phase + now * 0.001 * star.twinkleSpeed);
      var alpha = reduceMotion.matches
        ? star.opacity
        : star.opacity * (1 - star.twinkleDepth + star.twinkleDepth * pulse);

      x = ((x % width) + width) % width;
      y = ((y % height) + height) % height;

      if (star.glow) {
        var halo = ctx.createRadialGradient(x, y, 0, x, y, star.radius * 7.5);
        halo.addColorStop(0, "rgba(255,255,255," + (alpha * 0.58).toFixed(3) + ")");
        halo.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, star.radius * 7.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(247,249,252," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    drawMeteor(elapsed);
  }

  function tick(now) {
    if (document.hidden || reduceMotion.matches) {
      diagnostics.running = false;
      frameId = 0;
      return;
    }

    var elapsed = previousTime ? Math.min(now - previousTime, 32) : 16;
    previousTime = now;
    parallaxX += (pointerX - parallaxX) * 0.075;
    parallaxY += (pointerY - parallaxY) * 0.075;

    if (!meteor && now >= nextMeteorAt) spawnMeteor(now);
    draw(now, elapsed);
    diagnostics.frameCount += 1;
    diagnostics.lastFrameAt = Math.round(now);
    diagnostics.pointerX = Number(parallaxX.toFixed(3));
    diagnostics.pointerY = Number(parallaxY.toFixed(3));
    diagnostics.scrollY = Math.round(window.scrollY);
    diagnostics.running = true;
    if (now - lastDiagnosticWrite >= 500) {
      canvas.dataset.frame = String(diagnostics.frameCount);
      canvas.dataset.parallaxX = diagnostics.pointerX.toFixed(3);
      canvas.dataset.parallaxY = diagnostics.pointerY.toFixed(3);
      canvas.dataset.scrollY = String(diagnostics.scrollY);
      lastDiagnosticWrite = now;
    }
    scheduleNextFrame();
  }

  function scheduleNextFrame() {
    var token = ++frameToken;
    frameId = window.requestAnimationFrame(function(now) {
      if (token !== frameToken) return;
      window.clearTimeout(fallbackTimer);
      fallbackTimer = 0;
      frameId = 0;
      tick(now);
    });
    fallbackTimer = window.setTimeout(function() {
      if (token !== frameToken) return;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      fallbackTimer = 0;
      tick(window.performance && performance.now ? performance.now() : Date.now());
    }, 50);
  }

  function start() {
    if (reduceMotion.matches || document.hidden || frameId || fallbackTimer) return;
    previousTime = 0;
    nextMeteorAt = performance.now() + 10000 + Math.random() * 10000;
    diagnostics.running = true;
    scheduleNextFrame();
  }

  function stop() {
    frameToken += 1;
    if (frameId) window.cancelAnimationFrame(frameId);
    window.clearTimeout(fallbackTimer);
    frameId = 0;
    fallbackTimer = 0;
    diagnostics.running = false;
  }

  function handlePointer(event) {
    if (!diagnostics.parallaxEnabled) return;
    pointerX = (event.clientX / width - 0.5) * -1;
    pointerY = (event.clientY / height - 0.5) * -1;
  }

  window.addEventListener("resize", scheduleResize, { passive: true });
  document.addEventListener("pointermove", handlePointer, { passive: true });
  document.addEventListener("visibilitychange", function() {
    if (document.hidden) stop();
    else start();
  });
  reduceMotion.addEventListener("change", function() {
    diagnostics.reducedMotion = reduceMotion.matches;
    diagnostics.parallaxEnabled = !compactMode && finePointer.matches && !reduceMotion.matches;
    stop();
    draw(0, 0);
    start();
  });

  buildPlanets();
  resize();
  start();
})();
