/* Structural regression checks for the static portfolio. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPages = [
  'index.html',
  'about.html',
  'experience.html',
  'projects.html',
  'skills.html',
  'education.html',
  'contact.html',
  'resume.html'
];
const sharedMarkers = [
  'assets/css/base.css',
  'assets/css/site-shell.css',
  'assets/js/site-nav.js',
  'assets/js/site-galaxy.js',
  'assets/vendor/lenis/lenis.min.js',
  'assets/js/site-scroll.js',
  'assets/js/site-motion.js',
  'assets/js/site-cursor.js',
  'assets/js/site-explore.js',
  'data-site-nav',
  'class="skip-link"',
  'class="noscript-nav"',
  'tabindex="-1"',
  'rel="canonical"',
  'property="og:image"',
  'name="twitter:card"',
  'name="darkreader-lock"',
  'name="theme-color"',
  'images/favicon.svg'
];
const removedTemplateFiles = [
  'assets/js/jquery.min.js',
  'assets/js/jquery.scrollex.min.js',
  'assets/js/jquery.scrolly.min.js',
  'assets/js/browser.min.js',
  'assets/js/breakpoints.min.js',
  'assets/js/main.js',
  'assets/js/util.js'
];

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error('FAIL:', message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function localReferences(html) {
  return Array.from(html.matchAll(/(?:href|src|srcset|data)="([^"]+)"/g))
    .map((match) => match[1].trim().split(/\s+/)[0])
    .filter((reference) =>
      reference &&
      !reference.startsWith('#') &&
      !reference.startsWith('/') &&
      !/^(?:https?:|mailto:|tel:|data:)/i.test(reference)
    )
    .map((reference) => reference.split('?')[0].split('#')[0]);
}

htmlPages.forEach((page) => {
  const filePath = path.join(root, page);
  assert(fs.existsSync(filePath), `${page} should exist`);
  if (!fs.existsSync(filePath)) return;

  const html = read(page);
  sharedMarkers.forEach((marker) => {
    assert(html.includes(marker), `${page} should include ${marker}`);
  });

  assert((html.match(/<h1\b/g) || []).length === 1, `${page} should contain exactly one h1`);
  assert(/<meta name="description" content="[^"]+">/.test(html), `${page} should have a description`);
  assert(/<title>[^<]+<\/title>/.test(html), `${page} should have a title`);
  assert(html.includes('name="twitter:card" content="summary_large_image"'), `${page} should request the large social card`);
  assert(html.includes('name="twitter:image" content="https://muhammad7839.github.io/portfolio/images/social-preview.png"'), `${page} should point Twitter cards to the designed banner`);
  assert(html.includes('images/social-preview.png'), `${page} should use the designed social preview`);
  assert(!html.includes('muhammadimran7839'), `${page} should not include the outdated LinkedIn slug`);
  assert(!html.includes('Three.js'), `${page} should not claim unverified Three.js experience`);
  assert(!html.includes('home-intro'), `${page} should not contain splash-screen markup or scripts`);

  localReferences(html).forEach((reference) => {
    assert(fs.existsSync(path.join(root, reference)), `${page} local reference should exist: ${reference}`);
  });
});

[
  'assets/css/base.css',
  'assets/css/noscript.css',
  'assets/css/site-shell.css',
  'assets/webfonts/instrument-sans-latin.woff2',
  'assets/webfonts/space-grotesk-latin.woff2',
  'assets/js/site-nav.js',
  'assets/js/site-galaxy.js',
  'assets/vendor/lenis/lenis.min.js',
  'assets/vendor/lenis/LICENSE.txt',
  'assets/js/site-scroll.js',
  'assets/js/site-motion.js',
  'assets/js/site-cursor.js',
  'assets/js/site-explore.js',
  'images/favicon.svg',
  'images/apple-touch-icon.png',
  'images/social-preview.png',
  'images/social-preview.svg',
  'images/recent-420.avif',
  'images/recent.avif',
  'images/resume-preview.webp',
  'robots.txt',
  'sitemap.xml',
  '404.html'
].forEach((relativePath) => {
  assert(fs.existsSync(path.join(root, relativePath)), `${relativePath} should exist`);
});

const indexHtml = read('index.html');
[
  'Software Engineer · AI · Web · Open Source',
  'Welcome to my universe.',
  'Where ideas become systems that run in the real world.',
  'hero-title-primary',
  'data-count="11"',
  'data-count="185"',
  'data-count="14"',
  'Where I’ve worked',
  'Anthropic Academy',
  'LaunchCode AI 101',
  'Agentic Engineer',
  'PSEGLI Challenge',
  '14+ modules',
  'Zowe Client Java SDK',
  'FitGPT',
  'SolarShare',
  'assets/resume.pdf',
  'contact.html',
  'fitgpt.tech',
  'github.com/Muhammad7839/SolarShare'
].forEach((marker) => {
  assert(indexHtml.includes(marker), `index.html should preserve fast-lane proof: ${marker}`);
});
assert(!indexHtml.includes('then prove they hold up'), 'homepage should not use prove-your-worth hero wording');
assert(!indexHtml.includes('I’m becoming'), 'homepage should use confident present-tense wording');
assert(!indexHtml.includes('Need an engineer'), 'homepage closing CTA should not use job-seeking framing');
assert(!indexHtml.includes('Live deployment temporarily unavailable'), 'homepage should not advertise an unavailable SolarShare deployment');

const structuredDataMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(Boolean(structuredDataMatch), 'index.html should include ProfilePage structured data');
if (structuredDataMatch) {
  try {
    const structuredData = JSON.parse(structuredDataMatch[1]);
    assert(structuredData['@type'] === 'ProfilePage', 'structured data should be a ProfilePage');
    assert(structuredData.mainEntity && structuredData.mainEntity['@type'] === 'Person', 'ProfilePage should describe a Person');
  } catch (error) {
    assert(false, `structured data should be valid JSON: ${error.message}`);
  }
}

assert(!fs.existsSync(path.join(root, 'assets/js/home-intro.js')), 'removed splash script should stay deleted');

const navJs = read('assets/js/site-nav.js');
assert(navJs.includes('destination.origin !== window.location.origin'), 'navigation should transition only same-origin HTTP links');
assert(navJs.includes('drawer.inert'), 'mobile drawer should use inert focus containment');
assert(navJs.includes('event.key !== "Tab"'), 'mobile drawer should trap Tab focus');
assert(navJs.includes('pageshow'), 'navigation should recover from back-forward cache');

const cursorJs = read('assets/js/site-cursor.js');
['(pointer: fine)', '(hover: hover)', 'prefers-reduced-motion: reduce', 'cursor-spacecraft'].forEach((marker) => {
  assert(cursorJs.includes(marker), `cursor should include ${marker}`);
});
assert(cursorJs.includes('data-custom-cursor'), 'spacecraft should replace the native cursor only after activation');
assert(cursorJs.includes('cursor-thruster-trail'), 'spacecraft should render a four-dot thruster trail');
assert(cursorJs.includes('* 0.14'), 'cursor ring should ease behind the spacecraft');
assert(cursorJs.includes('.resume-preview-link'), 'cursor should restore native behavior over the resume preview');

const galaxyJs = read('assets/js/site-galaxy.js');
[
  'DESKTOP_STAR_LIMIT = 260',
  'MOBILE_STAR_LIMIT = 110',
  'DESKTOP_DUST_COUNT',
  'DESKTOP_CLUSTER_COUNT',
  'depthLayers: 3',
  'WARP_RATE_PER_MS',
  '__portfolioGalaxy',
  'scheduleNextFrame',
  'fallbackTimer',
  'randomLayer',
  'spawnMeteor',
  'visibilitychange',
  'prefers-reduced-motion: reduce',
  'devicePixelRatio'
].forEach((marker) => {
  assert(galaxyJs.includes(marker), `galaxy should include ${marker}`);
});
const desktopStarLimit = Number((galaxyJs.match(/DESKTOP_STAR_LIMIT = (\d+)/) || [])[1]);
const mobileStarLimit = Number((galaxyJs.match(/MOBILE_STAR_LIMIT = (\d+)/) || [])[1]);
assert(desktopStarLimit > 200 && desktopStarLimit <= 300, 'desktop galaxy should be denser but remain capped at 300 stars');
assert(mobileStarLimit > 0 && mobileStarLimit <= 120, 'mobile galaxy should cap stars at 120');

const scrollJs = read('assets/js/site-scroll.js');
['window.Lenis', '(pointer: fine)', '(hover: hover)', 'prefers-reduced-motion: reduce', 'syncTouch: false'].forEach((marker) => {
  assert(scrollJs.includes(marker), `smooth scrolling should include ${marker}`);
});

const motionJs = read('assets/js/site-motion.js');
assert(!motionJs.includes('nameTarget.textContent'), 'name reveal should not mutate text and create layout shift');

const exploreJs = read('assets/js/site-explore.js');
assert(exploreJs.includes('sessionStorage'), 'exploration state should use session storage');
assert(exploreJs.includes('aria-live'), 'achievement region should announce politely');
assert(exploreJs.includes('404.html'), 'debug panel should link to diagnostics');

const siteCss = read('assets/css/site-shell.css');
[
  '@media (prefers-reduced-motion: reduce)',
  'site-galaxy',
  'site-cursor-halo',
  'site-cursor-ring',
  'credibility-strip',
  'sitePageEnter'
].forEach((marker) => {
  assert(siteCss.includes(marker), `site-shell.css should include ${marker}`);
});
assert(siteCss.includes('@keyframes heroNameType'), 'name should use the layout-stable CSS typing effect');
assert(siteCss.includes('@keyframes cursorThrusterPulse'), 'thruster dots should pulse without affecting layout');
assert(!siteCss.includes('@import url("https://fonts.googleapis.com'), 'fonts should not use CSS @import');
assert(siteCss.includes('instrument-sans-latin.woff2') && siteCss.includes('space-grotesk-latin.woff2'), 'portfolio fonts should be self-hosted');
assert(!siteCss.includes('background-size: 122px 122px'), 'the repeating CSS dot grid should stay removed');
assert(!siteCss.includes('.home-intro'), 'splash styles should stay removed');
assert(siteCss.includes('rgba(12, 13, 17, 0.44)'), 'hero panel should remain transparent enough to reveal the galaxy');
assert(siteCss.includes('.hero-copy::after'), 'hero copy should include a subtle grayscale nebula glow');
assert(siteCss.includes('body.portfolio-page .hero-nameplate'), 'hero name emphasis should override the shared paragraph color');

const socialPreviewSvg = read('images/social-preview.svg');
assert(socialPreviewSvg.includes('Welcome to my universe.'), 'social preview should use the current hero line');
assert(socialPreviewSvg.includes('Where ideas become systems that run in the real world.'), 'social preview should use the current supporting line');
assert(!socialPreviewSvg.includes('ambitious systems'), 'social preview should not use outdated hero wording');

const html404 = read('404.html');
assert(html404.includes('404 — route not found'), '404 page should explain the missing route');
assert(html404.indexOf('Recovery links') < html404.indexOf('<canvas'), '404 recovery links should precede the game');
assert(html404.includes('Start flight'), '404 game should require explicit start');
assert(!html404.includes('assets/') && !html404.includes('images/'), '404 page should be self-contained for nested paths');
assert(html404.includes('name="darkreader-lock"'), '404 page should prevent Dark Reader recoloring');

const skillsHtml = read('skills.html');
assert(skillsHtml.includes('The stack I build with.'), 'skills page should use confident stack framing');
assert(!skillsHtml.includes('What I bring to a team.'), 'skills page should remove job-seeking framing');
['Core Languages', 'Frameworks and Backend', 'AI and ML', 'Databases and Tools', 'Testing and Delivery'].forEach((section) => {
  assert(skillsHtml.includes(section), `skills.html should include ${section}`);
});
['Model Context Protocol', 'AI Workflow Automation', 'ML Pipelines'].forEach((skill) => {
  assert(skillsHtml.includes(skill), `skills.html should include evidence-backed AI skill: ${skill}`);
});

const experienceHtml = read('experience.html');
const experienceOrder = [
  'BRdata Software Solutions',
  'Linux Foundation LFX Mentorship',
  'Codveda Technologies',
  'SolarShare',
  'Java Developer Intern',
  'Flutter Developer Intern',
  'AI4ALL Ignite Fellow',
  'Tech Fellow at CodePath',
  'Backend Developer Intern at FinTrack',
  'Help Desk Technician at Farmingdale State College'
];
experienceOrder.forEach((entry) => {
  assert(experienceHtml.includes(entry), `experience.html should include ${entry}`);
});
for (let index = 1; index < experienceOrder.length; index += 1) {
  assert(
    experienceHtml.indexOf(experienceOrder[index - 1]) < experienceHtml.indexOf(experienceOrder[index]),
    `experience.html should order ${experienceOrder[index - 1]} before ${experienceOrder[index]}`
  );
}

const educationHtml = read('education.html');
[
  'Education &amp; credentials',
  'Anthropic Academy',
  'LaunchCode',
  'Project Management Institute',
  'LinkedIn Learning',
  'Competition and Program Recognition',
  'AI4ALL Ignite',
  'Model Context Protocol: Advanced Topics',
  'Agentic Engineer'
].forEach((marker) => {
  assert(educationHtml.includes(marker), `education.html should include ${marker}`);
});

const projectsHtml = read('projects.html');
assert(!projectsHtml.includes('Live deployment temporarily unavailable'), 'projects page should not advertise an unavailable SolarShare deployment');
assert(projectsHtml.includes('<details class="more-projects">'), 'secondary projects should use an accessible disclosure');
assert(projectsHtml.includes('More projects — 7 additional builds'), 'project disclosure should describe its contents');
const topProjectSection = projectsHtml.slice(0, projectsHtml.indexOf('<details class="more-projects">'));
['Role', 'Built', 'Verified'].forEach((label) => {
  assert((topProjectSection.match(new RegExp(`<dt>${label}<\\/dt>`, 'g')) || []).length === 4, `top four projects should each use ${label}`);
});

const resumeHtml = read('resume.html');
assert(resumeHtml.includes('images/resume-preview.webp'), 'resume page should use the reliable rendered preview');
assert(!resumeHtml.includes('<object'), 'resume page should not rely on a blank PDF object embed');

const contactHtml = read('contact.html');
assert(contactHtml.includes('linkedin.com/in/muhammadimran-swe'), 'contact page should use the verified LinkedIn vanity URL');

removedTemplateFiles.forEach((relativePath) => {
  assert(!fs.existsSync(path.join(root, relativePath)), `${relativePath} should stay removed`);
});

['assets/css/main.css', 'assets/css/fontawesome-all.min.css'].forEach((relativePath) => {
  assert(!fs.existsSync(path.join(root, relativePath)), `${relativePath} should remain replaced by the minimal base and async icon CSS`);
});

/* ── Security & privacy regression checks ──────────────────────────────── */
const scriptFiles = [
  'assets/js/site-nav.js',
  'assets/js/site-galaxy.js',
  'assets/js/site-scroll.js',
  'assets/js/site-motion.js',
  'assets/js/site-cursor.js',
  'assets/js/site-explore.js',
  'assets/js/site-command.js',
  'assets/js/site-github.js',
  'assets/js/site-constellation.js'
];
const scannedSources = htmlPages.concat(['404.html'], scriptFiles);

/* No real credentials should ever be committed. These patterns match actual
   secret formats (not résumé prose like "JWT" or "bcrypt password handling"). */
const secretPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, 'private key block'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/sk-[A-Za-z0-9]{20,}/, 'OpenAI-style secret key'],
  [/Bearer\s+[A-Za-z0-9._\-]{20,}/, 'hardcoded bearer token'],
  [/(?:api[_-]?key|secret|access[_-]?token|client[_-]?secret|passwd|password)\s*[:=]\s*["'][A-Za-z0-9_\-./+]{12,}["']/i, 'hardcoded credential assignment']
];
scannedSources.forEach((relativePath) => {
  const source = read(relativePath);
  secretPatterns.forEach(([pattern, label]) => {
    assert(!pattern.test(source), `${relativePath} should not contain a ${label}`);
  });
});

/* Every new-window link must defend against reverse tab-nabbing. */
scannedSources.forEach((relativePath) => {
  const source = read(relativePath);
  const blankTags = source.match(/<(?:a|link)\b[^>]*target=["']_blank["'][^>]*>/gi) || [];
  blankTags.forEach((tag) => {
    assert(/noopener/.test(tag), `${relativePath} _blank link must include rel="noopener": ${tag.slice(0, 80)}`);
  });
});

/* Live GitHub panel must escape all attacker-influenceable API data before
   it reaches innerHTML (repo names / commit messages are user-controlled). */
const githubJs = read('assets/js/site-github.js');
assert(/function esc\(/.test(githubJs), 'site-github.js should define an esc() HTML-escaper');
assert(githubJs.includes('esc(c.message)'), 'commit messages should be escaped before injection');
assert(githubJs.includes('esc(c.repo'), 'repo names should be escaped before injection');
/* Strip every esc(...) span (balanced parens), then confirm no external
   commit/repo value survives outside an escaper on its way to innerHTML. */
function stripEscCalls(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('esc(', i)) {
      i += 4;
      let depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === '(') depth += 1;
        else if (src[i] === ')') depth -= 1;
        i += 1;
      }
    } else {
      out += src[i];
      i += 1;
    }
  }
  return out;
}
assert(!/\bc\.(?:message|repo)\b/.test(stripEscCalls(githubJs)), 'GitHub commit/repo data must never reach innerHTML unescaped');
assert(githubJs.includes('https://api.github.com/users/'), 'GitHub panel should read only the public API');
assert(!/[?&](?:access_token|client_secret|token)=/.test(githubJs), 'GitHub requests must be unauthenticated (no leaked token in URL)');

/* Command palette must treat the query as data, never as markup. */
const commandJs = read('assets/js/site-command.js');
assert(commandJs.includes('norm(input.value'), 'command palette should use the query only for filtering');
assert(!/innerHTML[^;]*input\.value/.test(commandJs), 'command palette must not inject the raw query into innerHTML');

/* Externally loaded Font Awesome must be pinned with Subresource Integrity. */
const faHref = 'font-awesome/6.5.0/css/all.min.css';
htmlPages.forEach((page) => {
  const html = read(page);
  if (html.includes(faHref)) {
    assert(html.includes('integrity="sha512-'), `${page} should pin Font Awesome with an SRI hash`);
    assert(html.includes('crossorigin="anonymous"'), `${page} should send crossorigin for the SRI-checked CDN asset`);
  }
});

/* ── Interactive-feature regression checks ─────────────────────────────── */
htmlPages.forEach((page) => {
  const html = read(page);
  assert(!html.includes('data-debug-toggle'), `${page} should not expose a visible build-log/debug trigger`);
  assert(!/Open (?:the )?build log/i.test(html), `${page} should not surface the build log in the UI`);
});

['assets/js/site-command.js', 'assets/js/site-github.js', 'assets/js/site-constellation.js'].forEach((relativePath) => {
  assert(fs.existsSync(path.join(root, relativePath)), `${relativePath} should exist`);
});

htmlPages.forEach((page) => {
  assert(read(page).includes('assets/js/site-command.js'), `${page} should wire up the command palette`);
});

const projectsFeatures = read('projects.html');
['assets/js/site-constellation.js', 'assets/js/site-github.js', 'data-github', 'class="constellation"'].forEach((marker) => {
  assert(projectsFeatures.includes(marker), `projects.html should include ${marker}`);
});
assert(projectsFeatures.includes('class="inline-links"'), 'projects.html should group card CTAs as inline links');
assert((projectsFeatures.match(/class="text-link"/g) || []).length >= 8, 'projects.html should render the pill-button explore CTAs');

const pillCss = read('assets/css/site-shell.css');
assert(pillCss.includes('.spotlight-card .text-link'), 'site-shell.css should style the project pill buttons');
assert(pillCss.includes('content: "↗"'), 'project pill buttons should carry the external-link glyph');

/* Mobile atmosphere: static depth for every phone visitor (setting-independent),
   gentle drift only for those who allow motion, scoped away from desktop. */
const atmosphereCss = read('assets/css/site-shell.css');
assert(atmosphereCss.includes('@keyframes mobileNebulaDrift'), 'mobile atmosphere should define the nebula drift keyframes');
assert(/@media \(max-width: 768px\), \(pointer: coarse\)/.test(atmosphereCss), 'mobile atmosphere should target touch / small screens only');
assert(/body::before[\s\S]{0,400}radial-gradient/.test(atmosphereCss), 'mobile atmosphere should paint a static gradient nebula that shows regardless of motion settings');
assert(atmosphereCss.includes('translateY(30px) scale(0.974)'), 'scroll-reveal should be strengthened on small screens');
/* The reduced-motion contract must remain: all reveal motion forced off, and
   ::before animations (incl. the nebula drift) neutralised for calm. */
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.reveal-visible[\s\S]*transform: none !important/.test(atmosphereCss), 'reduced-motion should still force reveals static');
assert(/\*::before[\s\S]{0,120}animation-duration: 0\.001ms !important/.test(atmosphereCss), 'reduced-motion should freeze ::before animations including the nebula drift');

/* Smoothness: the hero name reveal must be a continuous wipe (no choppy
   steps()), and cross-page navigation should use native view transitions. */
const smoothCss = read('assets/css/site-shell.css');
assert(smoothCss.includes('.hero-name-text') && /animation: heroNameType 2\.5s /.test(smoothCss), 'hero name should reveal with a slow, smooth wipe (~2.5s)');
assert(!/heroNameType[^;]*steps\(/.test(smoothCss), 'hero name reveal should not use choppy steps()');
const countJs = read('assets/js/site-motion.js');
assert(/var duration = 2500/.test(countJs), 'count-up should animate over ~2.5s to match the name reveal');
assert(/@view-transition\s*\{[\s\S]{0,60}navigation:\s*auto/.test(smoothCss), 'pages should opt into native cross-document view transitions');
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*::view-transition-old\(root\)[\s\S]*animation: none !important/.test(smoothCss), 'view transitions should be disabled under reduced motion');
const navSmoothJs = read('assets/js/site-nav.js');
assert(navSmoothJs.includes('startViewTransition') && /supportsViewTransitions[\s\S]{0,120}return;/.test(navSmoothJs), 'nav should defer to native view transitions instead of the JS fade when supported');

if (failures > 0) {
  process.exit(1);
}

console.log(`Portfolio verification passed (${htmlPages.length} pages + 404).`);
