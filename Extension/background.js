const W = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const STORAGE_KEYS = {
  instagram: 'redirect_instagram',
  x:         'redirect_x',
  tiktok:    'redirect_tiktok',
  threads:   'redirect_threads',
};

const DEFAULT_NITTER = 'nitter.net';
let currentNitter = DEFAULT_NITTER;

const DOMAINS = {
  instagram: { originals: ['instagram.com'], proxies: ['imginn.com'] },
  x:         { originals: ['x.com'],          get proxies() { return [currentNitter]; } },
  tiktok:    { originals: ['tiktok.com'],     proxies: ['exporttok.com'] },
  threads:   { originals: ['threads.com'],    proxies: ['shoelace.mint.lgbt'] },
};

function hostOf(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

async function getNitterInstance() {
  const s = await W.storage.local.get('nitter_instance');
  return s.nitter_instance || DEFAULT_NITTER;
}

async function setNitterInstance(domain) {
  currentNitter = domain;
  await W.storage.local.set({ nitter_instance: domain });
  await applyRules();
}

function hostMatches(host, domain) {
  return host === domain || host.endsWith('.' + domain);
}

const FORWARD = [
  { platforms: ['instagram'], priority: 10,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/(?:[^/]+/)?(?:p|reels?)/([^/]+)(?:/.*)?$',
    to:   'https://imginn.com/p/\\1/' },
  { platforms: ['instagram'], priority: 9,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/([^/]+)/reels?(?:/.*)?$',
    to:   'https://imginn.com/reels/\\1/' },
  { platforms: ['instagram'], priority: 9,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/stories/([^/]+)(?:/.*)?$',
    to:   'https://imginn.com/stories/\\1/' },
  { platforms: ['instagram'], priority: 9,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/([^/]+)/tagged(?:/.*)?$',
    to:   'https://imginn.com/tagged/\\1/' },
  { platforms: ['instagram'], priority: 10, allow: true,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/(?:explore|direct|accounts|about|hacked|privacy|popular)(?:/|$)' },
  { platforms: ['instagram'], priority: 9,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/?$',
    to:   'https://imginn.com/' },
  { platforms: ['instagram'], priority: 8,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com(?:/([^/?#]+)(?:/.*)?)?/?$',
    to:   'https://imginn.com/\\1/' },

  { platforms: ['x'], priority: 10, allow: true,
    from: '^https://(?:www\\.)?x\\.com/i/(?:jf/onboarding|flow)(?:/|$)' },

  { platforms: ['tiktok'], priority: 10,
    from: '^https://(?:[\\w-]+\\.)?tiktok\\.com/@([^/]+)/(?:video|photo)/([0-9]+)(?:[/?#].*)?$',
    to:   'https://exporttok.com/tiktok/account/viewer/@\\1/\\2' },
  { platforms: ['tiktok'], priority: 9,
    from: '^https://(?:[\\w-]+\\.)?tiktok\\.com/@([^/]+)(?:/.*)?$',
    to:   'https://exporttok.com/tiktok/account/\\1' },

  { platforms: ['threads'], priority: 10,
    from: '^https://(?:www\\.)?threads\\.com/@[^/]+/post/([^/]+)(?:/.*)?$',
    to:   'https://shoelace.mint.lgbt/t/\\1' },
  { platforms: ['threads'], priority: 10, allow: true,
    from: '^https://(?:www\\.)?threads\\.com/(?:login|search|explore|activity|settings|api|share)(?:/|$)' },
  { platforms: ['threads'], priority: 9,
    from: '^https://(?:www\\.)?threads\\.com/@([^/?#]+)/?$',
    to:   'https://shoelace.mint.lgbt/@\\1' },
];

function dnrRule(def, id) {
  return {
    id,
    priority: def.priority,
    action: def.allow
      ? { type: 'allow' }
      : { type: 'redirect', redirect: { regexSubstitution: def.to } },
    condition: { regexFilter: def.from, resourceTypes: ['main_frame', 'sub_frame'] },
  };
}

// Reverse rules: proxy -> original, used when a platform is OFF.
function reverseDnrRules(platform) {
  const esc = s => s.replace(/\./g, '\\.');
  const redir = (from, to) => ({
    priority: 100,
    action: { type: 'redirect', redirect: { regexSubstitution: to } },
    condition: { regexFilter: from, resourceTypes: ['main_frame', 'sub_frame'] },
  });
  const rules = [];
  for (const proxy of DOMAINS[platform].proxies) {
    const p = esc(proxy);
    if (platform === 'instagram') {
      rules.push(redir(`^https://${p}/p/([^/?#]+)(?:/.*)?$`, 'https://www.instagram.com/p/\\1/'));
      rules.push(redir(`^https://${p}/stories/([^/?#]+)(?:/.*)?$`, 'https://www.instagram.com/stories/\\1/'));
      rules.push(redir(`^https://${p}/reels/([^/?#]+)(?:/.*)?$`, 'https://www.instagram.com/\\1/reels/'));
      rules.push(redir(`^https://${p}/tagged/([^/?#]+)(?:/.*)?$`, 'https://www.instagram.com/\\1/tagged/'));
      rules.push(redir(`^https://${p}/([^/?#]+)(?:/.*)?$`, 'https://www.instagram.com/\\1/'));
      rules.push(redir(`^https://${p}/?$`, 'https://www.instagram.com'));
    } else if (platform === 'x') {
      rules.push(redir(`^https://${p}(/[^/?#]+)([?#].*)?$`, 'https://x.com\\1\\2'));
      rules.push(redir(`^https://${p}/?$`, 'https://x.com'));
    } else if (platform === 'tiktok') {
      rules.push(redir(`^https://${p}/tiktok/account/viewer/@([^/]+)/([0-9]+)(?:[/?#].*)?$`, 'https://www.tiktok.com/@\\1/video/\\2'));
      rules.push(redir(`^https://${p}/tiktok/account/@{0,1}([^/?#]+)`, 'https://www.tiktok.com/@\\1'));
      rules.push(redir(`^https://${p}/?$`, 'https://www.tiktok.com'));
    } else if (platform === 'threads') {
      rules.push(redir(`^https://${p}/t/([^/?#]+)(?:/.*)?$`, 'https://www.threads.com/@?/post/\\1'));
      rules.push(redir(`^https://${p}/@([^/?#]+)(?:/.*)?$`, 'https://www.threads.com/@\\1'));
      rules.push(redir(`^https://${p}/?$`, 'https://www.threads.com'));
    }
  }
  return rules;
}

let rulesQueue = Promise.resolve();

// Serialize DNR rule updates so concurrent toggles never interleave.
function applyRules() {
  rulesQueue = rulesQueue.then(async () => {
    const keys = [...Object.values(STORAGE_KEYS), 'nitter_instance'];
    const t = await W.storage.local.get(keys);
    currentNitter = t.nitter_instance || DEFAULT_NITTER;
    await syncDynamicRules(t);
  }).catch(err => {
    console.error('DNR sync failed:', err);
  });
  return rulesQueue;
}

async function syncDynamicRules(t) {
  const rules = [];
  for (const def of FORWARD) {
    if (def.platforms.some(p => t[STORAGE_KEYS[p]] !== false)) {
      rules.push(dnrRule(def, rules.length + 1));
    }
  }
  if (t[STORAGE_KEYS.x] !== false) {
    rules.push({ id: rules.length + 1, priority: 11,
      action: { type: 'redirect', redirect: { regexSubstitution: `https://${currentNitter}/search?f=tweets&q=%23\\1` } },
      condition: { regexFilter: '^https://(?:www\\.)?x\\.com/hashtag/([^/?#]+)(?:/.*)?$', resourceTypes: ['main_frame', 'sub_frame'] } });
    rules.push({ id: rules.length + 1, priority: 10,
      action: { type: 'allow' },
      condition: { regexFilter: '^https://(?:www\\.)?x\\.com/i/(?:jf/onboarding|flow)(?:/|$)', resourceTypes: ['main_frame', 'sub_frame'] } });
    rules.push({ id: rules.length + 1, priority: 10,
      action: { type: 'redirect', redirect: { regexSubstitution: `https://${currentNitter}/\\1` } },
      condition: { regexFilter: '^https://(?:www\\.)?x\\.com/(.*)', resourceTypes: ['main_frame', 'sub_frame'] } });
  }
  for (const platform of Object.keys(DOMAINS)) {
    if (t[STORAGE_KEYS[platform]] !== false) continue;
    for (const r of reverseDnrRules(platform)) {
      rules.push({ id: rules.length + 1, priority: r.priority, action: r.action, condition: r.condition });
    }
  }

  const expected = rules.map(r => r.id).sort();
  const existing = await W.declarativeNetRequest.getDynamicRules();

  await W.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: rules,
  });

  const after = await W.declarativeNetRequest.getDynamicRules();
  const actual = after.map(r => r.id).sort();
  return JSON.stringify(actual) === JSON.stringify(expected);
}

// Sync DNR rules on every service worker start.
applyRules();
W.runtime.onInstalled.addListener(applyRules);
W.runtime.onStartup.addListener(async () => {
  currentNitter = await getNitterInstance();
  await applyRules();
});

// storage.onChanged is the single driver of onToggle: the popup writes to
// storage and also sends a 'toggle' message as a wake-up, but the message
// handler only mirrors the write (idempotent), so the toggle logic runs
// exactly once, after the value is committed.
async function onToggle(key, newValue) {
  await applyRules();
  await redirectCurrentTab(key.replace('redirect_', ''), newValue !== false);
}

const hitWaiters = new Map(); // nonce -> resolve

W.storage.onChanged.addListener((changes, area) => {
  if (area === 'session') {
    const v = changes.navHit && changes.navHit.newValue;
    if (v && hitWaiters.has(v.n)) {
      hitWaiters.get(v.n)();
      hitWaiters.delete(v.n);
    }
    return;
  }
  if (area !== 'local') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (Object.values(STORAGE_KEYS).includes(key)) onToggle(key, newValue !== false);
  }
});

W.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !sender || sender.id !== W.runtime.id) return;
  if (msg.type === 'set-nitter-instance') {
    if (sender.tab) return;
    setNitterInstance(msg.domain);
    return;
  }
  if (msg.type === 'get-nitter-instance') {
    return Promise.resolve({ domain: currentNitter });
  }
  if (msg.type === 'toggle') {
    // Only extension pages (the popup) may toggle; never content scripts.
    if (sender.tab) return;
    if (!Object.values(STORAGE_KEYS).includes(msg.key)) return;
    // Idempotent write; storage.onChanged drives onToggle.
    W.storage.local.set({ [msg.key]: msg.value !== false }).catch(() => {});
    return;
  }
  // SPA URL change reported by the content script.
  if (msg.type !== 'smr-url' || !msg.url) return;
  if (!sender.tab || typeof sender.tab.id !== 'number') return;
  const host = hostOf(msg.url);
  if (!host) return;
  const platform = Object.keys(DOMAINS).find(p => DOMAINS[p].originals.some(h => hostMatches(host, h)));
  if (!platform) return;
  W.storage.local.get(STORAGE_KEYS[platform]).then(t => {
    if (t[STORAGE_KEYS[platform]] === false) return;
    const dest = forwardUrl(msg.url);
    if (!dest || dest === msg.url) return;
    sendMsg(sender.tab.id, { type: 'smr-nav', url: dest }, 600).then(
      () => {},
      () => W.tabs.update(sender.tab.id, { url: dest }).catch(() => {})
    );
  });
});

function forwardUrl(url) {
  let u;
  try { u = new URL(url); } catch (e) { return null; }
  if (DOMAINS.x.originals.some(h => hostMatches(u.hostname, h))) {
    const isLogin = /^\/i\/(?:jf\/onboarding|flow)(?:\/|$)/.test(u.pathname);
    if (isLogin) return null;
    const m = url.match(/^https:\/\/(?:www\.)?x\.com\/hashtag\/([^/?#]+)/);
    if (m) return `https://${currentNitter}/search?f=tweets&q=%23${m[1]}`;
    return url.replace(/^https:\/\/(?:www\.)?x\.com/, `https://${currentNitter}`);
  }
  for (const def of FORWARD) {
    if (!def.platforms.some(p => DOMAINS[p].originals.some(h => hostMatches(u.hostname, h)))) continue;
    const m = url.match(def.from);
    if (!m) continue;
    if (def.allow) return null;
    return def.to.replace(/\\(\d)/g, (_, d) => m[+d] || '');
  }
  return null;
}

const LOGIN_ALLOW_PATHS = ['/explore', '/direct', '/accounts', '/about', '/hacked', '/privacy', '/popular'];

async function checkLoginRedirect(url, host) {
  let u;
  try { u = new URL(url); } catch (e) { return null; }

  if (hostMatches(host, 'x.com')) {
    const isLogin = /^\/i\/(?:jf\/onboarding|flow)(?:\/|$)/.test(u.pathname);
    if (!isLogin) return null;

    const t = await W.storage.local.get(STORAGE_KEYS.x);
    if (t[STORAGE_KEYS.x] === false) return null;

    const redirect = u.searchParams.get('redirect_after_login');
    if (redirect) {
      const decoded = decodeURIComponent(redirect);
      const hashMatch = decoded.match(/^\/hashtag\/([^/?#]+)/);
      let dest;
      if (hashMatch) {
        dest = `https://${currentNitter}/search?q=%23${encodeURIComponent(hashMatch[1])}`;
      } else {
        const targetUrl = `https://x.com${decoded}`;
        dest = forwardUrl(targetUrl) || `https://${currentNitter}${decoded}`;
      }
      return { platform: 'x', dest };
    }

    return null;
  }

  if (hostMatches(host, 'instagram.com')) {
    const isLogin = /^\/accounts\/login\/?$/.test(u.pathname);
    if (!isLogin) return null;

    const t = await W.storage.local.get(STORAGE_KEYS.instagram);
    if (t[STORAGE_KEYS.instagram] === false) return null;

    const next = u.searchParams.get('next');
    if (!next) return null;

    const decoded = decodeURIComponent(next);
    if (LOGIN_ALLOW_PATHS.some(p => decoded === p || decoded.startsWith(p + '/'))) {
      return null;
    }

    const targetUrl = `https://instagram.com${decoded}`;
    const dest = forwardUrl(targetUrl);
    if (!dest) return null;

    return { platform: 'instagram', dest };
  }

  return null;
}

function reverseUrl(platform, proxyUrl) {
  const u = new URL(proxyUrl);
  if (platform === 'instagram') {
    let m;
    if (m = u.pathname.match(/^\/p\/([^/]+)/)) return `https://www.instagram.com/p/${m[1]}/`;
    if (m = u.pathname.match(/^\/stories\/([^/]+)/)) return `https://www.instagram.com/stories/${m[1]}/`;
    if (m = u.pathname.match(/^\/tagged\/([^/]+)/)) return `https://www.instagram.com/${m[1]}/tagged/`;
    if (m = u.pathname.match(/^\/reels\/([^/]+)/)) return `https://www.instagram.com/${m[1]}/reels/`;
    if (m = u.pathname.match(/^\/([^/?#]+)/)) return `https://www.instagram.com/${m[1]}/`;
    return 'https://www.instagram.com';
  }
  if (platform === 'x') {
    if (u.pathname === '/search') {
      const q = u.searchParams.get('q');
      if (q && q.startsWith('#')) return 'https://x.com/hashtag/' + encodeURIComponent(q.slice(1));
    }
    return 'https://x.com' + u.pathname + u.search;
  }
  if (platform === 'tiktok') {
    const viewer = u.pathname.match(/\/viewer\/@([^/]+)\/(\d+)/);
    if (viewer) return `https://www.tiktok.com/@${viewer[1]}/video/${viewer[2]}`;
    const account = u.pathname.match(/\/account\/(@?[^/]+)/);
    if (account) return `https://www.tiktok.com/@${account[1].replace(/^@/, '')}`;
    return 'https://www.tiktok.com';
  }
  if (platform === 'threads') {
    let m;
    if (m = u.pathname.match(/^\/t\/([^/]+)/)) return `https://www.threads.com/@?/post/${m[1]}`;
    if (m = u.pathname.match(/^\/@([^/?#]+)/)) return `https://www.threads.com/@${m[1]}`;
    return 'https://www.threads.com';
  }
  return null;
}

// Toggle flipped: redirect the affected tab right away so the user does
// not have to reload. lastTabs lives in storage.session so it survives
// service-worker suspend (Chrome MV3).
let lastTabs = null; // lazy-loaded cache; null = not read from session yet

async function getLastTabs() {
  if (lastTabs === null) {
    const s = await W.storage.session.get('lastTabs').catch(() => ({}));
    lastTabs = (s && s.lastTabs) || {};
  }
  return lastTabs;
}

W.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  const url = details.url;
  if (!url.startsWith('http')) return;
  const host = hostOf(url);
  if (!host) return;
  for (const platform of Object.keys(DOMAINS)) {
    const d = DOMAINS[platform];
    if (d.originals.some(h => hostMatches(host, h)) || d.proxies.some(h => hostMatches(host, h))) {
      getLastTabs().then(lt => {
        lt[details.tabId] = { url, t: Date.now() };
        const ids = Object.keys(lt);
        if (ids.length > 50) {
          ids.sort((a, b) => lt[a].t - lt[b].t)
            .slice(0, 20)
            .forEach(id => delete lt[id]);
        }
        W.storage.session.set({ lastTabs: lt }).catch(() => {});
      });
      break;
    }
  }
  checkLoginRedirect(url, host).then(result => {
    if (!result) return;
    sendMsg(details.tabId, { type: 'smr-nav', url: result.dest }, 600).then(
      () => {},
      () => W.tabs.update(details.tabId, { url: result.dest }).catch(() => {})
    );
  });
});

W.tabs.onRemoved.addListener((tabId) => {
  if (!lastTabs || !lastTabs[tabId]) return;
  delete lastTabs[tabId];
  W.storage.session.set({ lastTabs }).catch(() => {});
});

W.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const host = hostOf(details.url);
  if (!host) return;
  if (host !== currentNitter && host !== 'www.' + currentNitter) return;
  const t = await W.storage.local.get(STORAGE_KEYS.x);
  if (t[STORAGE_KEYS.x] !== false) return;
  const dest = reverseUrl('x', details.url);
  if (!dest || dest === details.url) return;
  W.tabs.update(details.tabId, { url: dest }).catch(() => {});
});

// Wait for the content script to echo this toggle's nonce via session
// navHit; false = channel is dead.
function hitWait(nonce, ms) {
  return new Promise((res) => {
    const to = setTimeout(() => { hitWaiters.delete(nonce); res(false); }, ms);
    hitWaiters.set(nonce, () => { clearTimeout(to); res(true); });
  });
}

// Some Edge builds never settle tabs.sendMessage; race it with a timeout.
function sendMsg(tabId, msg, ms) {
  return Promise.race([
    W.tabs.sendMessage(tabId, msg),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function redirectCurrentTab(platform, on) {
  const d = DOMAINS[platform];
  if (!d) return;
  const fits = (url) => {
    if (!url || !url.startsWith('http')) return null;
    const host = hostOf(url);
    if (!host) return null;
    const isOrig = d.originals.some(h => hostMatches(host, h));
    const isProxy = d.proxies.some(h => hostMatches(host, h));
    if ((on && isOrig) || (!on && isProxy)) return on ? forwardUrl(url) : reverseUrl(platform, url);
    return null;
  };
  // Active tab first; lastTabs is only a fallback (popup on Android often
  // hides the active tab from tabs.query).
  let best = null;
  let tabs = [];
  try { tabs = await W.tabs.query({ active: true, currentWindow: true }); } catch (e) { tabs = []; }
  const active = tabs && tabs[0];
  if (active && typeof active.id === 'number' && active.url) {
    const dest = fits(active.url);
    if (dest) best = { tabId: active.id, url: active.url, dest };
  }
  if (!best) {
    const lt = await getLastTabs();
    for (const [tabId, info] of Object.entries(lt)) {
      if (info.t <= Date.now() - 600000) continue;
      const dest = fits(info.url);
      if (dest) { best = { tabId: +tabId, url: info.url, dest }; break; }
    }
  }
  if (!best && on) {
    if (active && typeof active.id === 'number' && active.url) {
      const host = hostOf(active.url);
      if (host) {
        const lr = await checkLoginRedirect(active.url, host);
        if (lr && lr.platform === platform) {
          best = { tabId: active.id, url: active.url, dest: lr.dest };
        }
      }
    }
    if (!best) {
      const lt = await getLastTabs();
      for (const [tabId, info] of Object.entries(lt)) {
        if (info.t <= Date.now() - 600000) continue;
        const host = hostOf(info.url);
        if (!host) continue;
        const lr = await checkLoginRedirect(info.url, host);
        if (lr && lr.platform === platform) {
          best = { tabId: +tabId, url: info.url, dest: lr.dest };
          break;
        }
      }
    }
  }
  if (!best) return;
  const dest = best.dest;
  if (!dest || dest === best.url) return;
  const nonce = Math.random().toString(36).slice(2) + Date.now();
  // Channel 1: content script navigates via location.replace.
  let done = false;
  try {
    await sendMsg(best.tabId, { type: 'smr-nav', url: dest, nonce }, 600);
    done = await hitWait(nonce, 600);
  } catch (e) {}
  // Channel 2: content script reloads; DNR rules (already applied) redirect.
  if (!done) {
    try {
      await sendMsg(best.tabId, { type: 'smr-reload', nonce }, 600);
      done = await hitWait(nonce, 600);
    } catch (e) {}
  }
  // Channel 3: background navigates the tab directly.
  if (!done) {
    W.tabs.update(best.tabId, { url: dest }).then(
      () => {},
      () => { W.tabs.reload(best.tabId).catch(() => {}); }
    );
  }
}
