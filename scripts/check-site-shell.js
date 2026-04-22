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

const requiredHtmlMarkers = [
  'assets/css/site-shell.css',
  'assets/js/site-nav.js',
  'data-site-nav'
];

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error('FAIL:', message);
  }
}

htmlPages.forEach((page) => {
  const filePath = path.join(root, page);
  assert(fs.existsSync(filePath), `${page} should exist`);

  const html = fs.readFileSync(filePath, 'utf8');
  requiredHtmlMarkers.forEach((marker) => {
    assert(html.includes(marker), `${page} should include ${marker}`);
  });
});

[
  path.join(root, 'assets/css/site-shell.css'),
  path.join(root, 'assets/js/site-nav.js'),
  path.join(root, '..', 'AGENTS.md'),
  path.join(root, 'scripts/check-site-shell.js')
].forEach((filePath) => {
  assert(fs.existsSync(filePath), `${path.relative(root, filePath)} should exist`);
});

const aboutHtml = fs.readFileSync(path.join(root, 'about.html'), 'utf8');
assert(!aboutHtml.includes('Engineering Workflow'), 'about.html should not expose the Engineering Workflow section');

const skillsHtml = fs.readFileSync(path.join(root, 'skills.html'), 'utf8');
[
  'Core Languages',
  'Frameworks and Backend',
  'Databases and Tools',
  'Testing and Delivery'
].forEach((section) => {
  assert(skillsHtml.includes(section), `skills.html should include ${section}`);
});

if (failures > 0) {
  process.exit(1);
}

console.log('Site shell verification passed.');
