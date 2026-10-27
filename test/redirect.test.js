const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'Extension', 'background.js'), 'utf8');
const defs = src.match(/const DEFAULT_INSTANCES = \{[\s\S]*?\n\};/)[0];
const dm = src.match(/const DOMAINS = \{[\s\S]*?\n\};/)[0];
const hh = src.match(/function hostOf[\s\S]*?\n\}/)[0] + '\n' + src.match(/function hostMatches[\s\S]*?\n\}/)[0];
const fr = src.match(/function forwardRules\(\) \{[\s\S]*?\n\}/)[0];
const ff = src.match(/function forwardUrl\(url\) \{[\s\S]*?\n\}/)[0];
eval('const ALLOW = true;\n' + defs + '\n' +
  'const instances = { ...DEFAULT_INSTANCES };\n' +
  dm + '\n' + hh + '\n' + fr + '\n' + ff + '\n' +
  'function setInst(platform, domain) { instances[platform] = domain; }');

const K = 'https://kittygram.irelephant.net';
const N = 'https://shitter.thepixora.com';

// Forward only. Turning a platform off must not map anything back.
const tests = [
  ['https://www.instagram.com/u/reels', K + '/u/reels'],
  ['https://www.instagram.com/reels/abc123', K + '/reels/abc123'],
  ['https://www.instagram.com/u/tagged', K + '/u/tagged'],
  ['https://www.instagram.com/p/XYZ', K + '/p/XYZ'],
  ['https://www.instagram.com/stories/u', K + '/stories/u'],
  ['https://www.instagram.com', K + '/'],
  ['https://www.instagram.com/', K + '/'],
  ['https://www.instagram.com/explore/', null],
  ['https://www.instagram.com/accounts/login?next=%2Fp%2FXYZ', null],
  ['https://x.com/hashtag/foo', N + '/search?f=tweets&q=%23foo'],
  ['https://x.com/u', N + '/u'],
  ['https://x.com/', N + '/'],
  ['https://x.com/search?q=%23foo', N + '/search?q=%23foo'],
  ['https://x.com/i/flow/login', null],
  ['https://www.tiktok.com/@u/video/123', 'https://exporttok.com/tiktok/account/viewer/@u/123'],
  ['https://www.tiktok.com/@u', 'https://exporttok.com/tiktok/account/u'],
  ['https://www.threads.com/@u/post/abc', 'https://shoelace.mint.lgbt/t/abc'],
  ['https://www.threads.com/@u', 'https://shoelace.mint.lgbt/@u'],
];

let fail = 0;
function check(orig, expFwd) {
  const f = forwardUrl(orig);
  const ok = f === expFwd;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), orig, '=>', f);
  if (!ok) console.log('     expected:', expFwd);
}

for (const [orig, expFwd] of tests) check(orig, expFwd);

// Swapping the instance must move the forward target.
setInst('instagram', 'kg.meowing.de');
check('https://www.instagram.com/u', 'https://kg.meowing.de/u');
setInst('x', 'nitter.tiekoetter.com');
check('https://x.com/u', 'https://nitter.tiekoetter.com/u');

// Reverse was removed on request: nothing must bring it back.
for (const gone of ['reverseDnrRules', 'reverseUrl', 'onBeforeNavigate']) {
  const ok = !src.includes(gone);
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), 'no reverse:', gone);
}

// The landing page bookmarklet routes on its own; keep it in sync.
const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
eval(page.match(/function bookmarkletCode\(nitter, kitty\) \{[\s\S]*?\n\}/)[0]);
eval(page.match(/function hostOnly\(value, fallback\) \{[\s\S]*?\n\}/)[0]);

function bm(url) {
  const code = bookmarkletCode('shitter.thepixora.com', 'kittygram.irelephant.net');
  let dest = null;
  const loc = {};
  Object.defineProperty(loc, 'href', { get: () => url, set: v => { dest = v; } });
  new Function('location', code)(loc);
  return dest;
}

const bmTests = [
  ['https://www.instagram.com/u', 'https://kittygram.irelephant.net/u'],
  ['https://www.instagram.com/p/XYZ', 'https://kittygram.irelephant.net/p/XYZ'],
  ['https://www.instagram.com/accounts/login?next=%2Fp%2FXYZ', 'https://kittygram.irelephant.net/p/XYZ'],
  ['https://www.instagram.com/explore/', null],
  ['https://x.com/hashtag/foo', 'https://shitter.thepixora.com/search?f=tweets&q=%23foo'],
  ['https://x.com/u?a=1', 'https://shitter.thepixora.com/u?a=1'],
  ['https://www.tiktok.com/@u/video/123', 'https://exporttok.com/tiktok/account/viewer/@u/123'],
  ['https://www.threads.com/@u/post/abc', 'https://shoelace.mint.lgbt/t/abc'],
];

for (const [url, exp] of bmTests) {
  const got = bm(url);
  const ok = got === exp;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), 'bookmarklet', url, '=>', got);
  if (!ok) console.log('     expected:', exp);
}

console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
