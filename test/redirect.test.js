const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'Extension', 'background.js'), 'utf8');
const defs = src.match(/const DEFAULT_INSTANCES = \{[\s\S]*?\n\};/)[0];
const dm = src.match(/const DOMAINS = \{[\s\S]*?\n\};/)[0];
const hh = src.match(/function hostOf[\s\S]*?\n\}/)[0] + '\n' + src.match(/function hostMatches[\s\S]*?\n\}/)[0];
const fr = src.match(/function forwardRules\(\) \{[\s\S]*?\n\}/)[0];
const ff = src.match(/function forwardUrl\(url\) \{[\s\S]*?\n\}/)[0];
const rd = src.match(/function reverseDnrRules\(platform\) \{[\s\S]*?\n\}/)[0];
eval('const ALLOW = true;\n' + defs + '\n' +
  'const instances = { ...DEFAULT_INSTANCES };\n' +
  dm + '\n' + hh + '\n' + fr + '\n' + ff + '\n' + rd + '\n' +
  'function setInst(platform, domain) { instances[platform] = domain; }');

function rev(platform, url) {
  for (const r of reverseDnrRules(platform)) {
    const m = url.match(r.condition.regexFilter);
    if (m) {
      const to = r.action.redirect.regexSubstitution.replace(/\\(\d)/g, (_, d) => m[+d] || '');
      return to;
    }
  }
  return null;
}

const K = 'https://kittygram.irelephant.net';
const N = 'https://shitter.thepixora.com';

const tests = [
  ['https://www.instagram.com/u/reels', 'instagram', K + '/u/reels', 'https://www.instagram.com/u/reels'],
  ['https://www.instagram.com/reels/abc123', 'instagram', K + '/reels/abc123', 'https://www.instagram.com/reels/abc123'],
  ['https://www.instagram.com/u/tagged', 'instagram', K + '/u/tagged', 'https://www.instagram.com/u/tagged'],
  ['https://www.instagram.com/p/XYZ', 'instagram', K + '/p/XYZ', 'https://www.instagram.com/p/XYZ'],
  ['https://www.instagram.com/stories/u', 'instagram', K + '/stories/u', 'https://www.instagram.com/stories/u'],
  ['https://www.instagram.com', 'instagram', K + '/', 'https://www.instagram.com/'],
  ['https://www.instagram.com/', 'instagram', K + '/', 'https://www.instagram.com/'],
  ['https://www.instagram.com/explore/', 'instagram', null, null],
  ['https://www.instagram.com/accounts/login?next=%2Fp%2FXYZ', 'instagram', null, null],
  ['https://x.com/hashtag/foo', 'x', N + '/search?f=tweets&q=%23foo', 'https://x.com/search?f=tweets&q=%23foo'],
  ['https://x.com/u', 'x', N + '/u', 'https://x.com/u'],
  ['https://x.com/', 'x', N + '/', 'https://x.com'],
  ['https://x.com/search?q=%23foo', 'x', N + '/search?q=%23foo', 'https://x.com/search?q=%23foo'],
  ['https://x.com/i/flow/login', 'x', null, null],
  ['https://www.tiktok.com/@u/video/123', 'tiktok', 'https://exporttok.com/tiktok/account/viewer/@u/123', 'https://www.tiktok.com/@u/video/123'],
  ['https://www.tiktok.com/@u', 'tiktok', 'https://exporttok.com/tiktok/account/u', 'https://www.tiktok.com/@u'],
  ['https://www.threads.com/@u/post/abc', 'threads', 'https://shoelace.mint.lgbt/t/abc', 'https://www.threads.com/@?/post/abc'],
  ['https://www.threads.com/@u', 'threads', 'https://shoelace.mint.lgbt/@u', 'https://www.threads.com/@u'],
];

let fail = 0;
function check(orig, plat, expFwd, expRev) {
  const f = forwardUrl(orig);
  const r = f ? rev(plat, f) : null;
  const ok = f === expFwd && r === expRev;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), orig, '=>', f, (r ? '=> ' + r : ''));
  if (!ok) {
    if (f !== expFwd) console.log('     expected fwd:', expFwd);
    if (r !== expRev) console.log('     expected rev:', expRev);
  }
}

for (const [orig, plat, expFwd, expRev] of tests) check(orig, plat, expFwd, expRev);

// Swapping the instance must move the forward target and the reverse rule.
setInst('instagram', 'kg.meowing.de');
check('https://www.instagram.com/u', 'instagram', 'https://kg.meowing.de/u', 'https://www.instagram.com/u');
setInst('x', 'nitter.tiekoetter.com');
check('https://x.com/u', 'x', 'https://nitter.tiekoetter.com/u', 'https://x.com/u');

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