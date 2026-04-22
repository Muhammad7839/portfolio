/* Homepage intro and typewriter sequence. */
(function() {
  var body = document.body;

  if (!body || !body.classList.contains("home-page")) {
    return;
  }

  var intro = document.getElementById("home-intro");
  var nameTarget = document.querySelector("[data-typewriter-target]");
  var introPrimary = document.querySelector(".home-intro-title-primary");
  var introAccent = document.querySelector(".home-intro-title-accent");
  var introSubtitle = document.querySelector(".home-intro-subtitle");
  var heroCopyBody = document.querySelector("[data-hero-copy-body]");

  if (!intro || !nameTarget || !introPrimary || !introAccent || !introSubtitle || !heroCopyBody) {
    return;
  }

  var introPrimaryText = introPrimary.textContent.trim();
  var introAccentText = introAccent.textContent.trim();
  var introSubtitleText = introSubtitle.textContent.trim();
  var fullName = nameTarget.textContent.trim();
  var prefersReducedMotion = false;
  var introDelay = 2600;
  var introFadeDuration = prefersReducedMotion ? 0 : 400;
  var typeDelay = prefersReducedMotion ? 0 : 110;
  var introTypeDelay = prefersReducedMotion ? 0 : 52;
  var introSegmentGap = prefersReducedMotion ? 0 : 220;
  var introSubtitleGap = prefersReducedMotion ? 0 : 300;
  var heroStartDelay = prefersReducedMotion ? 0 : 120;

  body.classList.add("home-intro-active");
  body.classList.add("home-main-hidden");
  body.classList.remove("hero-copy-visible", "typewriter-complete", "typewriter-active", "hero-sequence-active");

  introPrimary.textContent = "";
  introAccent.textContent = "";
  introSubtitle.textContent = "";
  nameTarget.textContent = "";

  function revealHeroCopy() {
    body.classList.add("hero-copy-visible");
  }

  function typeText(target, text, delay, done) {
    if (delay === 0) {
      target.textContent = text;
      if (done) {
        done();
      }
      return;
    }

    var index = 0;
    target.textContent = "";

    function typeNextCharacter() {
      index += 1;
      target.textContent = text.slice(0, index);

      if (index >= text.length) {
        if (done) {
          done();
        }
        return;
      }

      window.setTimeout(typeNextCharacter, delay);
    }

    window.setTimeout(typeNextCharacter, delay);
  }

  function startIntroSequence() {
    typeText(introPrimary, introPrimaryText, introTypeDelay, function() {
      window.setTimeout(function() {
        typeText(introAccent, introAccentText, introTypeDelay, function() {
          window.setTimeout(function() {
            introSubtitle.textContent = introSubtitleText;
            introSubtitle.classList.add("is-visible");
          }, introSubtitleGap);
        });
      }, introSegmentGap);
    });
  }

  function finishTyping() {
    nameTarget.textContent = fullName;
    body.classList.remove("typewriter-active");
    body.classList.remove("name-only-active");
    body.classList.add("typewriter-complete");
    revealHeroCopy();
  }

  function startTypewriter() {
    if (typeDelay === 0) {
      finishTyping();
      return;
    }
    typeText(nameTarget, fullName, typeDelay, finishTyping);
  }

  function startHeroSequence() {
    body.classList.add("hero-sequence-active");
    body.classList.add("name-only-active");
    body.classList.add("typewriter-active");
    nameTarget.textContent = "";
    window.requestAnimationFrame(function() {
      body.classList.remove("home-main-hidden");
      window.requestAnimationFrame(startTypewriter);
    });
  }

  function closeIntro() {
    intro.classList.add("is-hidden");

    window.setTimeout(function() {
      body.classList.remove("home-intro-active");
      window.setTimeout(startHeroSequence, heroStartDelay);
    }, introFadeDuration);
  }

  startIntroSequence();
  window.setTimeout(closeIntro, introDelay);
})();
