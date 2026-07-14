# Muhammad Imran — Software Engineering Portfolio

A recruiter-first static portfolio presenting Muhammad Imran's work across enterprise software support, open source, backend, mobile, full-stack products, and applied AI.

**Live site:** <https://muhammad7839.github.io/portfolio/>

## Design direction

The portfolio uses a permanent dark universe theme with a living three-depth grayscale canvas star field. Core professional content remains immediate and accessible, while optional spacecraft-pointer, debug-mode, achievement, and 404-game interactions reward deeper exploration.

The homepage prioritizes:

1. role and value proposition;
2. resume, work, and contact actions;
3. four measurable proof points;
4. Zowe, FitGPT, and SolarShare;
5. experience and engineering approach;
6. applied-AI ownership.

## Architecture

- Static HTML across eight primary pages plus `404.html`
- Minimal reset in `assets/css/base.css` and shared styling in `assets/css/site-shell.css`
- Shared navigation and mobile focus management in `assets/js/site-nav.js`
- Shared three-layer canvas galaxy with clustered dust, twinkle, parallax, warp drift, and an animation-frame fallback in `assets/js/site-galaxy.js`
- Progressive reveal, proof counters, and card lighting in `assets/js/site-motion.js`
- Accessibility-gated desktop smoothing in `assets/js/site-scroll.js`
- Fine-pointer spacecraft effect in `assets/js/site-cursor.js`
- Optional debug mode and achievements in `assets/js/site-explore.js`
- No runtime framework or production build step

## Local development

```bash
npm ci
npm test
npm run preview
```

Open <http://localhost:4173/>.

## Verification

`npm test` validates:

- all pages, shared assets, and local references;
- recruiter fast-lane proof and actions;
- metadata and structured data;
- reduced-motion and cursor gates;
- mobile navigation focus behavior;
- self-contained 404 recovery and game behavior;
- removal of unused template JavaScript.

The galaxy caps itself at 260 stars on desktop and 110 below 768px, disables parallax on compact screens, pauses while the page is hidden, and exposes read-only `data-*` diagnostics on its canvas for motion regression checks.

Before release, also perform desktop/mobile browser checks, keyboard navigation, reduced-motion emulation, and Lighthouse review.

## Deployment

The site is hosted with GitHub Pages. Deployment is intentional and should happen only after tests and working-tree review:

```bash
npm run deploy
```

## Credits and license

The original site began from the HTML5 UP Massively template and retains its license in `LICENSE.txt`. Portfolio content and custom enhancements belong to Muhammad Imran.
