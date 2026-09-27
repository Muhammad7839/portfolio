/**
 * Cosmos: the real three-dimensional layer behind the site.
 *
 * site-galaxy.js paints a flat canvas of dots with faked depth. This replaces
 * it, when the browser can manage it, with an actual perspective-projected
 * volume the page sits inside: stars at true depths that stream past the
 * camera, a drifting nebula behind them, and a camera that leans with the
 * pointer and accelerates when you scroll. Moving between pages flies you
 * through it rather than fading it out.
 *
 * It supersedes rather than replaces: if there is no WebGL, or the visitor
 * asked for reduced motion, this never starts and the flat galaxy keeps doing
 * its job. Nothing on the page depends on it.
 *
 * Three things it is built not to do:
 *   - It never touches legibility. Every luminance the shaders can emit is
 *     capped (STAR_CEILING, NEBULA_CEILING), so text contrast over it holds at
 *     the worst frame, not just the average one.
 *   - It never costs the visitor their battery for nothing: it stops entirely
 *     when the tab is hidden, caps pixel ratio, and carries a far smaller
 *     volume on phones.
 *   - It never blocks reading: the canvas is inert and aria-hidden, and every
 *     bit of content works with it switched off.
 *
 * No framework and no build step, matching the rest of the site: this is
 * hand-written WebGL, two draw calls a frame.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(pointer: fine)");
  var MOBILE_BREAKPOINT = 768;

  /* Depth of the volume, in camera units. Stars wrap from the far plane back
     to the near one, so the field is endless without ever growing. */
  var Z_NEAR = 0.22;
  var Z_FAR = 7.0;
  var FOCAL = 0.62;

  var DESKTOP_STARS = 4200;
  var MOBILE_STARS = 1150;
  var DESKTOP_HERO = 120;
  var MOBILE_HERO = 44;

  /* Luminance ceilings, derived rather than guessed. The palette's dimmest
     text is --site-subtle (#a3b0c6, relative luminance 0.429) on --site-bg
     (#070707, 0.002), which is 9.19:1. Solving the WCAG contrast
     equation for AA (4.5:1) gives a maximum background luminance of 0.056:
     any brighter and that text stops being readable. NEBULA_CEILING sits just
     under it, and the shader multiplies by it last, so 0.048 is the brightest
     pixel the cloud can emit on any frame - not on average, at the peak.
     Stars are exempt from that budget because they are single pixels: they sit
     beside glyphs, never behind a whole line of them, and they cover a
     fraction of a percent of the field. */
  var STAR_CEILING = 0.88;
  var NEBULA_CEILING = 0.048;

  var DRIFT_SPEED = 0.16; /* units per second at rest */
  var SCROLL_BOOST = 0.055; /* extra speed per pixel of scroll velocity */
  var MAX_SPEED = 9.0;
  var JUMP_SPEED = 26.0; /* the page-to-page hyperspace jump */
  var MAX_DPR = 1.75;

  if (reduceMotion.matches) return;

  var canvas = document.createElement("canvas");
  var gl = null;
  try {
    /* Premultiplied, because every shader here outputs `vec4(colour * a, a)`
       and the blend below adds it straight on. */
    var attrs = { alpha: true, antialias: false, depth: false, premultipliedAlpha: true, powerPreference: "low-power" };
    gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs);
  } catch (error) {
    gl = null;
  }
  if (!gl) return;

  /* Decided on the first frame that reports a real viewport, not at parse
     time. A canvas can be created before layout settles - a hidden tab, a
     restored session, a pane that has not been sized yet - and a width of 0
     read at that moment would quietly build the phone-sized field and keep it
     for the whole visit. */
  var compact = true;
  var starCount = 0;
  var heroCount = 0;
  var fieldBuilt = false;

  canvas.className = "site-cosmos";
  canvas.dataset.cosmos = "webgl";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  /* The flat galaxy is the fallback, so it steps aside once this is running
     rather than drawing a second, contradictory sky on top. */
  document.documentElement.setAttribute("data-cosmos", "on");

  /* ---- shaders ---------------------------------------------------------- */

  /* Each star is a two-vertex line: aEnd picks the head or the tail. At rest
     the tail is sub-pixel and it reads as a dot; under speed it stretches into
     the streak that makes travel legible. One buffer, one draw call, both. */
  var STAR_VS = [
    "precision mediump float;",
    "attribute vec3 aPos;",
    "attribute vec2 aSeed;",
    "attribute float aEnd;",
    "uniform float uTravel, uAspect, uStreak, uDpr, uTime;",
    "uniform vec2 uLean;",
    "varying float vGlow;",
    "float depthAt(float offset) {",
    "  float span = " + (Z_FAR - Z_NEAR).toFixed(4) + ";",
    "  return " + Z_NEAR.toFixed(4) + " + mod(aPos.z + uTravel + offset, span);",
    "}",
    "void main() {",
    "  float z = depthAt(aEnd * uStreak);",
    /* Nearer stars swing further when the camera leans: that parallax is what
       the eye reads as depth, more than size or brightness do. */
    "  vec2 lean = uLean * (1.0 - z / " + Z_FAR.toFixed(4) + ");",
    "  vec2 p = aPos.xy + lean;",
    "  vec2 proj = p * (" + FOCAL.toFixed(4) + " / z);",
    "  gl_Position = vec4(proj.x / uAspect, proj.y, 0.0, 1.0);",
    "  float near = clamp(1.0 - (z - " + Z_NEAR.toFixed(4) + ") / " + (Z_FAR - Z_NEAR).toFixed(4) + ", 0.0, 1.0);",
    /* Fade in at the far plane so wrapping never pops, and out at the near one
       so a star does not vanish mid-frame in front of your face. */
    "  float fade = smoothstep(0.0, 0.08, 1.0 - near) * smoothstep(0.0, 0.10, near);",
    "  float twinkle = 0.82 + 0.18 * sin(uTime * (0.7 + aSeed.x * 1.9) + aSeed.y * 40.0);",
    "  vGlow = fade * near * near * twinkle * " + STAR_CEILING.toFixed(3) + ";",
    "  gl_PointSize = 1.0 * uDpr;",
    "}"
  ].join("\n");

  var STAR_FS = [
    "precision mediump float;",
    "varying float vGlow;",
    "void main() {",
    /* Very slightly cool, never coloured enough to fight the grayscale identity. */
    "  vec3 tint = vec3(0.93, 0.95, 1.0);",
    "  gl_FragColor = vec4(tint * vGlow, vGlow);",
    "}"
  ].join("\n");

  var HERO_VS = [
    "precision mediump float;",
    "attribute vec3 aPos;",
    "attribute vec2 aSeed;",
    "uniform float uTravel, uAspect, uDpr, uTime;",
    "uniform vec2 uLean;",
    "varying float vGlow;",
    "void main() {",
    "  float span = " + (Z_FAR - Z_NEAR).toFixed(4) + ";",
    "  float z = " + Z_NEAR.toFixed(4) + " + mod(aPos.z + uTravel, span);",
    "  vec2 lean = uLean * (1.0 - z / " + Z_FAR.toFixed(4) + ");",
    "  vec2 proj = (aPos.xy + lean) * (" + FOCAL.toFixed(4) + " / z);",
    "  gl_Position = vec4(proj.x / uAspect, proj.y, 0.0, 1.0);",
    "  float near = clamp(1.0 - (z - " + Z_NEAR.toFixed(4) + ") / span, 0.0, 1.0);",
    "  float fade = smoothstep(0.0, 0.10, 1.0 - near) * smoothstep(0.0, 0.14, near);",
    "  float breathe = 0.78 + 0.22 * sin(uTime * (0.45 + aSeed.x) + aSeed.y * 25.0);",
    "  vGlow = fade * breathe * " + (STAR_CEILING * 0.75).toFixed(3) + ";",
    "  gl_PointSize = clamp(2.0 + near * 9.0, 2.0, 12.0) * uDpr;",
    "}"
  ].join("\n");

  var HERO_FS = [
    "precision mediump float;",
    "varying float vGlow;",
    "void main() {",
    "  vec2 d = gl_PointCoord - vec2(0.5);",
    "  float r = length(d) * 2.0;",
    /* A soft core with a wide, faint halo: a hard disc reads as a UI dot, this
       reads as a light source. */
    "  float core = smoothstep(1.0, 0.0, r);",
    "  float halo = smoothstep(1.0, 0.25, r) * 0.35;",
    "  float a = (core * core * 0.8 + halo) * vGlow;",
    "  gl_FragColor = vec4(vec3(0.95, 0.96, 1.0) * a, a);",
    "}"
  ].join("\n");

  var NEBULA_VS = [
    "precision mediump float;",
    "attribute vec2 aQuad;",
    "varying vec2 vUv;",
    "void main() { vUv = aQuad * 0.5 + 0.5; gl_Position = vec4(aQuad, 0.0, 1.0); }"
  ].join("\n");

  /* Value-noise FBM. Cheap, and at this luminance nobody can tell it from the
     expensive kind. */
  var NEBULA_FS = [
    "precision mediump float;",
    "varying vec2 vUv;",
    "uniform vec2 uSize;",
    "uniform float uTime, uDepthShift;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p); vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",
    "float fbm(vec2 p) {",
    "  float v = 0.0; float a = 0.5;",
    "  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }",
    "  return v;",
    "}",
    "void main() {",
    "  vec2 uv = vUv;",
    "  uv.x *= uSize.x / uSize.y;",
    /* Drifting slowly, and pushed by travel, so the cloud has depth too. */
    "  vec2 q = uv * 2.4 + vec2(uTime * 0.012, uTime * 0.007 - uDepthShift * 0.05);",
    "  float f = fbm(q + fbm(q * 1.7) * 0.5);",
    /* A diagonal band, echoing the galaxy plane the flat version drew. */
    "  float band = exp(-pow((uv.y - 0.52 + (uv.x - 0.5) * 0.30) * 2.2, 2.0));",
    "  float body = smoothstep(0.26, 0.76, f) * band;",
    /* Dimmer at the edges so the nebula never crowds the page gutters. */
    "  float vignette = smoothstep(1.25, 0.15, length(vUv - 0.5) * 1.5);",
    "  float a = body * vignette * " + NEBULA_CEILING.toFixed(4) + ";",
    "  vec3 tint = mix(vec3(0.62, 0.66, 0.78), vec3(0.80, 0.78, 0.86), f);",
    "  gl_FragColor = vec4(tint * a, a);",
    "}"
  ].join("\n");

  /* ---- plumbing --------------------------------------------------------- */

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function program(vsSource, fsSource) {
    var vs = compile(gl.VERTEX_SHADER, vsSource);
    var fs = compile(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function uniforms(prog, names) {
    var map = {};
    for (var i = 0; i < names.length; i++) map[names[i]] = gl.getUniformLocation(prog, names[i]);
    return map;
  }

  var starProg = program(STAR_VS, STAR_FS);
  var heroProg = program(HERO_VS, HERO_FS);
  var nebulaProg = program(NEBULA_VS, NEBULA_FS);
  /* A shader that will not compile is not worth a broken sky: stand down and
     let the flat galaxy carry on. */
  if (!starProg || !heroProg || !nebulaProg) {
    document.documentElement.removeAttribute("data-cosmos");
    canvas.remove();
    return;
  }

  var starU = uniforms(starProg, ["uTravel", "uAspect", "uStreak", "uDpr", "uTime", "uLean"]);
  var heroU = uniforms(heroProg, ["uTravel", "uAspect", "uDpr", "uTime", "uLean"]);
  var nebulaU = uniforms(nebulaProg, ["uSize", "uTime", "uDepthShift"]);

  var aStarPos = gl.getAttribLocation(starProg, "aPos");
  var aStarSeed = gl.getAttribLocation(starProg, "aSeed");
  var aStarEnd = gl.getAttribLocation(starProg, "aEnd");
  var aHeroPos = gl.getAttribLocation(heroProg, "aPos");
  var aHeroSeed = gl.getAttribLocation(heroProg, "aSeed");
  var aQuad = gl.getAttribLocation(nebulaProg, "aQuad");

  /* Stars are spread wider than the frame so leaning the camera never reveals
     an empty edge. */
  var SPREAD = 2.6;

  function starBuffer(count) {
    /* Two vertices per star: [x, y, z, seedA, seedB, end]. */
    var data = new Float32Array(count * 2 * 6);
    var at = 0;
    for (var i = 0; i < count; i++) {
      var x = (Math.random() - 0.5) * 2 * SPREAD;
      var y = (Math.random() - 0.5) * 2 * SPREAD;
      var z = Math.random() * (Z_FAR - Z_NEAR);
      var sa = Math.random();
      var sb = Math.random();
      for (var end = 0; end < 2; end++) {
        data[at++] = x;
        data[at++] = y;
        data[at++] = z;
        data[at++] = sa;
        data[at++] = sb;
        data[at++] = end;
      }
    }
    return data;
  }

  function heroBuffer(count) {
    var data = new Float32Array(count * 5);
    var at = 0;
    for (var i = 0; i < count; i++) {
      data[at++] = (Math.random() - 0.5) * 2 * SPREAD;
      data[at++] = (Math.random() - 0.5) * 2 * SPREAD;
      data[at++] = Math.random() * (Z_FAR - Z_NEAR);
      data[at++] = Math.random();
      data[at++] = Math.random();
    }
    return data;
  }

  var starVbo = gl.createBuffer();
  var heroVbo = gl.createBuffer();

  /**
   * Fill the volume for the viewport we actually have. Called on the first
   * real size, and again only if the visitor crosses the breakpoint (rotating
   * a tablet, dragging a window wide), which is rare enough that regenerating
   * a few thousand points costs nothing anyone can feel.
   */
  function buildField(wantCompact) {
    compact = wantCompact;
    starCount = compact ? MOBILE_STARS : DESKTOP_STARS;
    heroCount = compact ? MOBILE_HERO : DESKTOP_HERO;
    gl.bindBuffer(gl.ARRAY_BUFFER, starVbo);
    gl.bufferData(gl.ARRAY_BUFFER, starBuffer(starCount), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, heroVbo);
    gl.bufferData(gl.ARRAY_BUFFER, heroBuffer(heroCount), gl.STATIC_DRAW);
    fieldBuilt = true;
    diagnostics.stars = starCount;
    diagnostics.heroStars = heroCount;
    diagnostics.compact = compact;
  }

  var quadVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  /* Straight addition of already-premultiplied colour. SRC_ALPHA here would
     multiply by alpha a second time - the shaders premultiply themselves - and
     at these alphas that squares a small number into nothing: the nebula's
     0.02 would land at 0.0004 and be invisible while every ceiling and
     contrast calculation still said it was there. */
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  /* ---- state ------------------------------------------------------------ */

  var width = 0;
  var height = 0;
  var dpr = 1;
  var travel = 0;
  var speed = DRIFT_SPEED;
  var targetSpeed = DRIFT_SPEED;
  var streak = 0;
  var leanX = 0;
  var leanY = 0;
  var targetLeanX = 0;
  var targetLeanY = 0;
  var lastScrollY = window.scrollY || 0;
  var scrollEnergy = 0;
  var previous = 0;
  var frame = 0;
  var running = false;
  var jumping = false;

  /* Read-only diagnostics, matching the flat galaxy's contract so motion
     regressions can be checked the same way. */
  var diagnostics = {
    renderer: "webgl",
    stars: 0,
    heroStars: 0,
    compact: true,
    sized: false,
    speed: 0,
    travel: 0,
    frameCount: 0,
    running: false,
    reducedMotion: false
  };
  window.__portfolioCosmos = diagnostics;

  /**
   * Returns false while the viewport is not yet measurable, so the caller can
   * wait rather than commit to a size that is about to be wrong.
   */
  function resize() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    if (w < 2 || h < 2) return false;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = w;
    height = h;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    diagnostics.sized = true;

    var wantCompact = width < MOBILE_BREAKPOINT || !finePointer.matches;
    if (!fieldBuilt || wantCompact !== compact) buildField(wantCompact);
    return true;
  }

  function onPointer(event) {
    if (!finePointer.matches) return;
    /* Small on purpose. A background that lurches with the mouse is a toy; one
       that leans is a room. */
    targetLeanX = ((event.clientX / width) - 0.5) * 0.30;
    targetLeanY = -((event.clientY / height) - 0.5) * 0.30;
  }

  function onOrientation(event) {
    if (finePointer.matches) return;
    if (typeof event.gamma !== "number" || typeof event.beta !== "number") return;
    targetLeanX = Math.max(-1, Math.min(1, event.gamma / 45)) * 0.16;
    targetLeanY = Math.max(-1, Math.min(1, (event.beta - 45) / 45)) * -0.16;
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    scrollEnergy += Math.abs(y - lastScrollY);
    lastScrollY = y;
  }

  function render(now) {
    frame = 0;
    if (!running) return;
    /* Nothing to draw into yet: keep asking rather than settling for a size
       that would be wrong for the whole visit. */
    if (!diagnostics.sized && !resize()) {
      frame = window.requestAnimationFrame(render);
      return;
    }
    drawFrame(now);
    frame = window.requestAnimationFrame(render);
  }

  /** One frame. Separated from the loop so a paused sky can still be measured. */
  function drawFrame(now) {
    var delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0.016;
    previous = now;

    /* Scrolling pushes you forward; the energy bleeds away so the field
       settles back to its drift instead of staying revved. */
    scrollEnergy *= Math.pow(0.0025, delta);
    if (!jumping) targetSpeed = Math.min(MAX_SPEED, DRIFT_SPEED + scrollEnergy * SCROLL_BOOST);
    speed += (targetSpeed - speed) * Math.min(1, delta * (jumping ? 9 : 3.2));
    travel += speed * delta;

    /* Streaks only appear once there is real speed, so a still page has clean
       points and a moving one has motion you can read. */
    var wanted = Math.max(0, (speed - 0.9) * 0.021);
    streak += (wanted - streak) * Math.min(1, delta * 6);

    leanX += (targetLeanX - leanX) * Math.min(1, delta * 2.6);
    leanY += (targetLeanY - leanY) * Math.min(1, delta * 2.6);

    var seconds = now / 1000;
    var aspect = Math.max(0.0001, width / Math.max(1, height));

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(nebulaProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.enableVertexAttribArray(aQuad);
    gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(nebulaU.uSize, Math.max(1, width), Math.max(1, height));
    gl.uniform1f(nebulaU.uTime, seconds);
    gl.uniform1f(nebulaU.uDepthShift, travel);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(aQuad);

    gl.useProgram(starProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, starVbo);
    gl.enableVertexAttribArray(aStarPos);
    gl.vertexAttribPointer(aStarPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(aStarSeed);
    gl.vertexAttribPointer(aStarSeed, 2, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(aStarEnd);
    gl.vertexAttribPointer(aStarEnd, 1, gl.FLOAT, false, 24, 20);
    gl.uniform1f(starU.uTravel, travel);
    gl.uniform1f(starU.uAspect, aspect);
    gl.uniform1f(starU.uStreak, streak);
    gl.uniform1f(starU.uDpr, dpr);
    gl.uniform1f(starU.uTime, seconds);
    gl.uniform2f(starU.uLean, leanX, leanY);
    gl.drawArrays(gl.LINES, 0, starCount * 2);
    gl.disableVertexAttribArray(aStarPos);
    gl.disableVertexAttribArray(aStarSeed);
    gl.disableVertexAttribArray(aStarEnd);

    gl.useProgram(heroProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, heroVbo);
    gl.enableVertexAttribArray(aHeroPos);
    gl.vertexAttribPointer(aHeroPos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aHeroSeed);
    gl.vertexAttribPointer(aHeroSeed, 2, gl.FLOAT, false, 20, 12);
    gl.uniform1f(heroU.uTravel, travel);
    gl.uniform1f(heroU.uAspect, aspect);
    gl.uniform1f(heroU.uDpr, dpr);
    gl.uniform1f(heroU.uTime, seconds);
    gl.uniform2f(heroU.uLean, leanX, leanY);
    gl.drawArrays(gl.POINTS, 0, heroCount);
    gl.disableVertexAttribArray(aHeroPos);
    gl.disableVertexAttribArray(aHeroSeed);

    diagnostics.speed = speed;
    diagnostics.travel = travel;
    diagnostics.frameCount += 1;
    /* Sampling has to happen here, inside the frame: the drawing buffer is
       cleared once the browser composites it, so a reading taken from outside
       an animation frame always comes back black. */
    if (probeWanted) {
      probeWanted = false;
      diagnostics.probe = samplePixels();
    }
  }

  /**
   * A read-only measurement of what was actually drawn, matching the flat
   * galaxy's diagnostics contract. Two jobs: it proves the sky is really
   * rendering (a shader that silently draws nothing looks identical to a
   * working one from outside), and it measures the brightest pixel emitted,
   * which is the number that decides whether text over this stays readable.
   *
   * Opt-in and one frame at a time, because reading pixels back from the GPU
   * stalls the pipeline; it must never run in the normal loop.
   *   window.__portfolioCosmos.measure();   // then read `.probe` next frame
   */
  var probeWanted = false;
  var probeBuffer = null;

  function samplePixels() {
    var stepX = Math.max(1, Math.floor(canvas.width / 160));
    var stepY = Math.max(1, Math.floor(canvas.height / 120));
    var rows = 0;
    var lit = 0;
    var total = 0;
    var peak = 0;
    var sum = 0;
    if (!probeBuffer || probeBuffer.length < canvas.width * 4) probeBuffer = new Uint8Array(canvas.width * 4);
    for (var y = 0; y < canvas.height; y += stepY) {
      gl.readPixels(0, y, canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, probeBuffer);
      rows += 1;
      for (var x = 0; x < canvas.width; x += stepX) {
        var i = x * 4;
        /* Relative luminance, the same weighting contrast ratios use. */
        var l = (probeBuffer[i] * 0.2126 + probeBuffer[i + 1] * 0.7152 + probeBuffer[i + 2] * 0.0722) / 255;
        total += 1;
        sum += l;
        if (l > peak) peak = l;
        if (l > 0.01) lit += 1;
      }
    }
    return {
      rows: rows,
      samples: total,
      lit: lit,
      litFraction: total ? lit / total : 0,
      peakLuminance: peak,
      meanLuminance: total ? sum / total : 0
    };
  }

  /**
   * Take a reading. If the sky is paused - a hidden tab, a checker driving the
   * page headlessly - draw exactly one frame first, so a measurement never
   * comes back black just because nothing happened to be animating.
   */
  diagnostics.measure = function () {
    probeWanted = true;
    if (!diagnostics.sized) resize();
    /* Always draw here, running or not. Setting a flag and hoping the loop
       picks it up would hand the caller back the PREVIOUS reading, which is
       worse than no reading: it looks like an answer. */
    if (diagnostics.sized) drawFrame(performance.now());
    return diagnostics.probe;
  };

  function start() {
    if (running) return;
    /* A tab restored in the background, or opened with cmd-click, should cost
       nothing until someone actually looks at it. visibilitychange starts it. */
    if (document.hidden) return;
    running = true;
    diagnostics.running = true;
    previous = 0;
    frame = window.requestAnimationFrame(render);
  }

  function stop() {
    running = false;
    diagnostics.running = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  /**
   * The jump between pages. Navigation is handed off to the browser's own view
   * transition (site-nav.js); this is the part the sky contributes: the field
   * winds up to hyperspace so the two pages are separated by travel rather
   * than by a cut.
   */
  function jump() {
    if (jumping) return;
    jumping = true;
    targetSpeed = JUMP_SPEED;
    document.documentElement.setAttribute("data-cosmos-jump", "on");
  }

  function land() {
    jumping = false;
    document.documentElement.removeAttribute("data-cosmos-jump");
    /* Arrive fast and decelerate, so a new page feels flown-to, not cut-to. */
    speed = Math.max(speed, JUMP_SPEED * 0.45);
    scrollEnergy = 0;
  }

  /* A same-origin click is a jump. Anything that opens elsewhere, downloads,
     or was modifier-clicked is left completely alone. */
  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      var url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (error) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!/^https?:$/.test(url.protocol)) return;
      /* An in-page anchor is not a journey. */
      if (url.pathname === window.location.pathname && url.hash) return;
      jump();
    },
    true
  );

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("deviceorientation", onOrientation, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") start();
    else stop();
  });
  /* Restored from the back-forward cache: land rather than stay in warp. */
  window.addEventListener("pageshow", land);
  window.addEventListener("pagehide", stop);

  /* Someone can turn reduced motion on while the page is open. Honour it at
     once and hand the sky back to the flat fallback. */
  var onMotionPreference = function () {
    if (!reduceMotion.matches) return;
    stop();
    document.documentElement.removeAttribute("data-cosmos");
    document.documentElement.removeAttribute("data-cosmos-jump");
    canvas.remove();
  };
  if (typeof reduceMotion.addEventListener === "function") reduceMotion.addEventListener("change", onMotionPreference);
  else if (typeof reduceMotion.addListener === "function") reduceMotion.addListener(onMotionPreference);

  resize();
  land();
  start();
  /* Some browsers report a zero viewport until the first paint; ask once more
     after layout so the field is built at the right density either way. */
  window.requestAnimationFrame(resize);
})();
