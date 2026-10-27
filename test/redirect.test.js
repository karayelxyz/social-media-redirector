const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'Extension', 'background.js'), 'utf8');
const defs = src.match(/const DEFAULT_INSTANCES = \{[\s\S]*?\n\};/)[0];
const dm = src.match(/const DOMAINS = \{[\s\S]*?\n\};/)[0];
const allowPaths = src.match(/const LOGIN_ALLOW_PATHS = \[[^\]]*\];/)[0];
const hh = src.match(/function hostOf[\s\S]*?\n\}/)[0] + '\n' + src.match(/function hostMatches[\s\S]*?\n\}/)[0];
const fr = src.match(/function forwardRules\(\) \{[\s\S]*?\n\}/)[0];
const tk = src.match(/function tiktokRules\(host\) \{[\s\S]*?\n\}/)[0];
const ff = src.match(/function forwardUrl\(url\) \{[\s\S]*?\n\}/)[0];
eval(defs + '\n' + allowPaths + '\n' +
  'const instances = { ...DEFAULT_INSTANCES };\n' +
  dm + '\n' + hh + '\n' + tk + '\n' + fr + '\n' + ff + '\n' +
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
setInst('x', 'shitter.example.org');
check('https://x.com/u', 'https://shitter.example.org/u');

// TikTok front-ends disagree on paths: each scheme maps its own pages, and an
// unknown host must keep the exporttok scheme.
setInst('tiktok', 'www.tikvib.com');
check('https://www.tiktok.com/@u/video/123', 'https://www.tikvib.com/media/123');
check('https://www.tiktok.com/@u', 'https://www.tikvib.com/profile/u');
check('https://www.tiktok.com/@u/followers', 'https://www.tikvib.com/followers/u');
check('https://www.tiktok.com/@u/repost?lang=en', 'https://www.tikvib.com/reposts/u');

setInst('tiktok', 'viewtikstories.com');
check('https://www.tiktok.com/@u/video/123', 'https://viewtikstories.com/comments/123');
check('https://www.tiktok.com/@u', 'https://viewtikstories.com/profile/u');
check('https://www.tiktok.com/@u/repost', 'https://viewtikstories.com/profile/u?tab=reposts');
check('https://www.tiktok.com/@u/following', 'https://viewtikstories.com/profile/u?tab=following');
check('https://www.tiktok.com/@u/playlist/x', 'https://viewtikstories.com/profile/u?tab=playlist');

setInst('tiktok', 'some-other-mirror.example');
check('https://www.tiktok.com/@u/video/123', 'https://some-other-mirror.example/tiktok/account/viewer/@u/123');
setInst('tiktok', 'exporttok.com');

// Reverse was removed on request: nothing must bring it back.
for (const gone of ['reverseDnrRules', 'reverseUrl', 'onBeforeNavigate']) {
  const ok = !src.includes(gone);
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), 'no reverse:', gone);
}

// The popup validates the host before saving; it must agree with the
// background's normalization, or a "Saved" toast would hide a silent fallback.
const popupSrc = fs.readFileSync(path.join(__dirname, '..', 'Extension', 'popup.js'), 'utf8');
eval(popupSrc.match(/function hostOnly\(value, fallback\) \{[\s\S]*?\n\}/)[0]);
for (const [raw, exp] of [
  ['kittygram.irelephant.net', 'kittygram.irelephant.net'],
  ['https://kg.meowing.de/u?x=1', 'kg.meowing.de'],
  ['  SHITTER.Example.ORG  ', 'shitter.example.org'],
  ['', null],
  ['not a host', null],
  ['http://', null],
]) {
  const got = hostOnly(raw, null);
  const ok = got === exp;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), 'popup host', JSON.stringify(raw), '=>', got);
  if (!ok) console.log('     expected:', exp);
}

// The landing page bookmarklet routes on its own; keep it in sync.
const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
eval(page.match(/function bookmarkletCode\(xInst, kitty, tiktok\) \{[\s\S]*?\n\}/)[0]);
eval(page.match(/function hostOnly\(value, fallback\) \{[\s\S]*?\n\}/)[0]);

function bm(url, tiktok = 'exporttok.com') {
  const code = bookmarkletCode('shitter.thepixora.com', 'kittygram.irelephant.net', tiktok);
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
  ['https://www.tiktok.com/@u/video/123', 'https://viewtikstories.com/comments/123', 'viewtikstories.com'],
  ['https://www.tiktok.com/@u/video/123', 'https://www.tikvib.com/media/123', 'www.tikvib.com'],
  ['https://www.tiktok.com/@u', 'https://www.tikvib.com/profile/u', 'www.tikvib.com'],
  ['https://www.tiktok.com/@u/followers', 'https://www.tikvib.com/followers/u', 'www.tikvib.com'],
  ['https://www.tiktok.com/@u/repost', 'https://www.tikvib.com/reposts/u', 'www.tikvib.com'],
  ['https://www.tiktok.com/@u', 'https://viewtikstories.com/profile/u', 'viewtikstories.com'],
  ['https://www.tiktok.com/@u/playlist', 'https://viewtikstories.com/profile/u?tab=playlist', 'viewtikstories.com'],
  ['https://www.threads.com/@u/post/abc', 'https://shoelace.mint.lgbt/t/abc'],
];

for (const [url, exp, tiktok] of bmTests) {
  const got = bm(url, tiktok);
  const ok = got === exp;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), 'bookmarklet', url, '=>', got);
  if (!ok) console.log('     expected:', exp);
}

console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
