# Muhammad Imran — Software Engineering Portfolio

A recruiter-first static portfolio presenting Muhammad Imran's work across enterprise software support, open source, backend, mobile, full-stack products, and applied AI.

**Live site:** <https://muhammad7839.github.io/portfolio/>

## Design direction

The portfolio uses a permanent dark universe theme. Since 2026-09-27 the backdrop is a real three-dimensional volume rendered in WebGL (`assets/js/site-cosmos.js`): stars at true depths that stream past the camera, a drifting nebula behind them, a camera that leans with the pointer, and forward motion that accelerates as you scroll. Moving between pages flies through it - the field winds up to hyperspace while the page you are leaving recedes past the camera and the one you asked for arrives out of the depth.

The flat canvas star field (`assets/js/site-galaxy.js`) has not been replaced; it is now the fallback, and it is what renders when there is no WebGL or the visitor asked for reduced motion. Core professional content remains immediate and accessible, while optional spacecraft-pointer, debug-mode, achievement, and 404-game interactions reward deeper exploration.

**Legibility is a budget, not a judgement call.** The dimmest text in the palette (`--site-subtle`, `#a3b0c6`) on `--site-bg` (`#070707`) is 9.19:1. Solving the WCAG AA equation backwards from there gives a maximum background luminance of 0.0565, so `NEBULA_CEILING` in `site-cosmos.js` is capped below it and the shader applies it last - it bounds the brightest pixel on any frame, not the average. `npm test` fails if that constant is raised. The canvas exposes `window.__portfolioCosmos.measure()`, which draws one frame and reads the framebuffer back, so the actual emitted luminance can be checked rather than assumed.

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
- Three-dimensional WebGL sky - perspective starfield, FBM nebula, pointer and device-orientation camera lean, scroll-driven travel, and the page-to-page hyperspace jump - in `assets/js/site-cosmos.js`, hand-written with no framework and two draw calls per frame
- Shared three-layer canvas galaxy with clustered dust, twinkle, parallax, warp drift, and an animation-frame fallback in `assets/js/site-galaxy.js`, used whenever the WebGL sky stands down
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

The WebGL sky carries 4,200 stars on desktop and 1,150 below 768px, decided on the first frame that reports a real viewport rather than at parse time, caps pixel ratio at 1.75, never starts in a hidden tab, stops entirely when the tab is hidden, and removes itself if reduced motion is switched on mid-visit. Verified 2026-09-27 in the browser across all three paths: WebGL present (sky renders, measured mean luminance 0.008 against a 0.0565 ceiling), reduced motion (nothing initializes, no canvas, flat fallback takes over), and no WebGL at all (same fallback, 260 stars).

Before release, also perform desktop/mobile browser checks, keyboard navigation, reduced-motion emulation, and Lighthouse review.

## Deployment

The site is hosted with GitHub Pages. Deployment is intentional and should happen only after tests and working-tree review:

```bash
npm run deploy
```

## Credits and license

The original site began from the HTML5 UP Massively template and retains its license in `LICENSE.txt`. Portfolio content and custom enhancements belong to Muhammad Imran.
