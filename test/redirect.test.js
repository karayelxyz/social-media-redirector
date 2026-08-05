const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'Extension', 'background.js'), 'utf8');
const DEFAULT_NITTER = 'nitter.net';
let currentNitter = DEFAULT_NITTER;
const dm = src.match(/const DOMAINS = \{[\s\S]*?\n\};/)[0];
const hh = src.match(/function hostOf[\s\S]*?\n\}/)[0] + '\n' + src.match(/function hostMatches[\s\S]*?\n\}/)[0];
const fw = src.match(/const FORWARD = \[[\s\S]*?\n\];/)[0];
const ff = src.match(/function forwardUrl\(url\) \{[\s\S]*?\n\}/)[0];
const rd = src.match(/function reverseDnrRules\(platform\) \{[\s\S]*?\n\}/)[0];
eval('const ALLOW = true;' + dm + '\n' + hh + '\n' + fw + '\n' + ff + '\n' + rd);

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

const tests = [
  ['https://www.instagram.com/u/reels', 'instagram', 'https://imginn.com/reels/u/', 'https://www.instagram.com/u/reels/'],
  ['https://www.instagram.com/reels/abc123', 'instagram', 'https://imginn.com/p/abc123/', 'https://www.instagram.com/p/abc123/'],
  ['https://www.instagram.com/u/tagged', 'instagram', 'https://imginn.com/tagged/u/', 'https://www.instagram.com/u/tagged/'],
  ['https://www.instagram.com/p/XYZ', 'instagram', 'https://imginn.com/p/XYZ/', 'https://www.instagram.com/p/XYZ/'],
  ['https://www.instagram.com/stories/u', 'instagram', 'https://imginn.com/stories/u/', 'https://www.instagram.com/stories/u/'],
  ['https://www.instagram.com', 'instagram', 'https://imginn.com/', 'https://www.instagram.com'],
  ['https://www.instagram.com/', 'instagram', 'https://imginn.com/', 'https://www.instagram.com'],
  ['https://www.instagram.com/explore/', 'instagram', null, null],
  ['https://x.com/hashtag/foo', 'x', 'https://nitter.net/search?f=tweets&q=%23foo', 'https://x.com/search?f=tweets&q=%23foo'],
  ['https://x.com/u', 'x', 'https://nitter.net/u', 'https://x.com/u'],
  ['https://x.com/search?q=%23foo', 'x', 'https://nitter.net/search?q=%23foo', 'https://x.com/search?q=%23foo'],
  ['https://www.tiktok.com/@u/video/123', 'tiktok', 'https://exporttok.com/tiktok/account/viewer/@u/123', 'https://www.tiktok.com/@u/video/123'],
  ['https://www.tiktok.com/@u', 'tiktok', 'https://exporttok.com/tiktok/account/u', 'https://www.tiktok.com/@u'],
  ['https://www.threads.com/@u/post/abc', 'threads', 'https://shoelace.mint.lgbt/t/abc', 'https://www.threads.com/@?/post/abc'],
  ['https://www.threads.com/@u', 'threads', 'https://shoelace.mint.lgbt/@u', 'https://www.threads.com/@u'],
];

let fail = 0;
for (const [orig, plat, expFwd, expRev] of tests) {
  const f = forwardUrl(orig);
  let r = null;
  if (f) r = rev(plat, f);
  const ok = f === expFwd && r === expRev;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL'), orig, '=>', f, (r ? '=> ' + r : ''));
  if (!ok) {
    if (f !== expFwd) console.log('     expected fwd:', expFwd);
    if (r !== expRev) console.log('     expected rev:', expRev);
  }
}
console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
