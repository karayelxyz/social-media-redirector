const W = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const STORAGE_KEYS = {
  instagram: 'redirect_instagram',
  x:         'redirect_x',
  tiktok:    'redirect_tiktok',
  threads:   'redirect_threads',
};

const DEFAULT_INSTANCES = {
  x:         'shitter.thepixora.com',
  instagram: 'kittygram.irelephant.net',
  tiktok:    'exporttok.com',
};

// Instance host per platform, mirrored from storage so DNR rules and URL
// building always agree with what the popup saved.
const INSTANCE_KEYS = {
  x: 'nitter_instance',
  instagram: 'kittygram_instance',
  tiktok: 'tiktok_instance',
};
const instances = { ...DEFAULT_INSTANCES };

const DOMAINS = {
  instagram: { originals: ['instagram.com'] },
  x:         { originals: ['x.com'] },
  tiktok:    { originals: ['tiktok.com'] },
  threads:   { originals: ['threads.com'] },
};

function hostOf(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

// The popup takes a pasted URL as often as a bare host; keep only the host.
function normHost(value, fallback) {
  const s = String(value || '').trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split(/[/?#]/)[0];
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s : fallback;
}

function loadInstances(stored) {
  for (const platform of Object.keys(INSTANCE_KEYS)) {
    instances[platform] = normHost(stored[INSTANCE_KEYS[platform]], DEFAULT_INSTANCES[platform]);
  }
}

async function setInstance(platform, domain) {
  const key = INSTANCE_KEYS[platform];
  if (!key) return;
  instances[platform] = normHost(domain, DEFAULT_INSTANCES[platform]);
  await W.storage.local.set({ [key]: instances[platform] });
  await applyRules();
}

function hostMatches(host, domain) {
  return host === domain || host.endsWith('.' + domain);
}

// Forward rules: original -> frontend. Instagram and X targets follow the
// instance saved in the popup, so they are built per call.
// TikTok front-ends disagree on their paths, so each known host brings its own
// mapping: exporttok uses /tiktok/account/..., tikvib /profile/... and
// viewtikstories /profile/<user>?tab=.... Unknown hosts fall back to
// exporttok's scheme. Stories and highlights have no tiktok.com URL to map.
function tiktokRules(host) {
  const h = host.replace(/^www\./, '');
  const base = `https://${host}`;
  const src = '^https://(?:[\\w-]+\\.)?tiktok\\.com';
  const post = `${src}/@([^/]+)/(?:video|photo)/([0-9]+)(?:[/?#].*)?$`;
  const tail = `${src}/@([^/]+)(?:[/?#].*)?$`;

  if (h === 'tikvib.com') {
    return [
      { priority: 12, from: post, to: `${base}/media/\\2` },
      { priority: 11, from: `${src}/@([^/]+)/followers(?:[/?#].*)?$`, to: `${base}/followers/\\1` },
      { priority: 11, from: `${src}/@([^/]+)/following(?:[/?#].*)?$`, to: `${base}/following/\\1` },
      { priority: 11, from: `${src}/@([^/]+)/reposts?(?:[/?#].*)?$`, to: `${base}/reposts/\\1` },
      { priority: 9,  from: tail, to: `${base}/profile/\\1` },
    ];
  }
  if (h === 'viewtikstories.com') {
    return [
      { priority: 12, from: post, to: `${base}/comments/\\2` },
      { priority: 11, from: `${src}/@([^/]+)/followers(?:[/?#].*)?$`, to: `${base}/profile/\\1?tab=followers` },
      { priority: 11, from: `${src}/@([^/]+)/following(?:[/?#].*)?$`, to: `${base}/profile/\\1?tab=following` },
      { priority: 11, from: `${src}/@([^/]+)/reposts?(?:[/?#].*)?$`, to: `${base}/profile/\\1?tab=reposts` },
      { priority: 11, from: `${src}/@([^/]+)/playlist(?:[/?#].*)?$`, to: `${base}/profile/\\1?tab=playlist` },
      { priority: 9,  from: tail, to: `${base}/profile/\\1` },
    ];
  }
  return [
    { priority: 10, from: post, to: `${base}/tiktok/account/viewer/@\\1/\\2` },
    { priority: 9,  from: tail, to: `${base}/tiktok/account/\\1` },
  ];
}

// Instagram pages that must stay on instagram.com: the login screen needs its
// `?next=` target handled by checkLoginRedirect(), and the rest are either
// account-bound or have no front-end equivalent. One list, two consumers.
const LOGIN_ALLOW_PATHS = ['/explore', '/direct', '/accounts', '/about', '/hacked', '/privacy', '/popular'];

function forwardRules() {
  return [
    { platforms: ['instagram'], priority: 10, allow: true,
      from: `^https://(?:[^/.]+\\.)?instagram\\.com(?:${LOGIN_ALLOW_PATHS.join('|')})(?:/|$)` },
    { platforms: ['instagram'], priority: 9,
      from: '^https://(?:[^/.]+\\.)?instagram\\.com(?:/(.*))?$',
      to:   `https://${instances.instagram}/\\1` },

    { platforms: ['x'], priority: 11,
      from: '^https://(?:www\\.)?x\\.com/hashtag/([^/?#]+)(?:/.*)?$',
      to:   `https://${instances.x}/search?f=tweets&q=%23\\1` },
    { platforms: ['x'], priority: 10, allow: true,
      from: '^https://(?:www\\.)?x\\.com/i/(?:jf/onboarding|flow)(?:/|$)' },
    { platforms: ['x'], priority: 9,
      from: '^https://(?:www\\.)?x\\.com(?:/(.*))?$',
      to:   `https://${instances.x}/\\1` },

    ...tiktokRules(instances.tiktok).map(r => ({ platforms: ['tiktok'], ...r })),

    { platforms: ['threads'], priority: 10,
      from: '^https://(?:www\\.)?threads\\.com/@[^/]+/post/([^/]+)(?:/.*)?$',
      to:   'https://shoelace.mint.lgbt/t/\\1' },
    { platforms: ['threads'], priority: 10, allow: true,
      from: '^https://(?:www\\.)?threads\\.com/(?:login|search|explore|activity|settings|api|share)(?:/|$)' },
    { platforms: ['threads'], priority: 9,
      from: '^https://(?:www\\.)?threads\\.com/@([^/?#]+)/?$',
      to:   'https://shoelace.mint.lgbt/@\\1' },
  ];
}

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

let rulesQueue = Promise.resolve();

// Serialize DNR rule updates so concurrent toggles never interleave.
function applyRules() {
  rulesQueue = rulesQueue.then(async () => {
    const keys = [...Object.values(STORAGE_KEYS), ...Object.values(INSTANCE_KEYS)];
    const t = await W.storage.local.get(keys);
    loadInstances(t);
    await syncDynamicRules(t);
  }).catch(err => {
    console.error('DNR sync failed:', err);
  });
  return rulesQueue;
}

async function syncDynamicRules(t) {
  const rules = [];
  for (const def of forwardRules()) {
    if (def.platforms.some(p => t[STORAGE_KEYS[p]] !== false)) {
      rules.push(dnrRule(def, rules.length + 1));
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
W.runtime.onStartup.addListener(applyRules);

// storage.onChanged is the single driver of onToggle: the popup writes to
// storage and also sends a 'toggle' message as a wake-up, but the message
// handler only mirrors the write (idempotent), so the toggle logic runs
// exactly once, after the value is committed.
async function onToggle(key, newValue) {
  await applyRules();
  // OFF means off: no reverse rules, no navigation of the current tab.
  if (newValue === false) return;
  await redirectCurrentTab(key.replace('redirect_', ''));
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
    else if (Object.values(INSTANCE_KEYS).includes(key)) onInstanceChange(key, newValue);
  }
});

// The popup writes the chosen instance straight to storage, so this keeps the
// worker's copy and its DNR rules in sync even if its message never arrived.
async function onInstanceChange(key, value) {
  const platform = Object.keys(INSTANCE_KEYS).find(p => INSTANCE_KEYS[p] === key);
  if (!platform) return;
  instances[platform] = normHost(value, DEFAULT_INSTANCES[platform]);
  await applyRules();
}

W.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !sender || sender.id !== W.runtime.id) return;
  if (msg.type === 'set-instance') {
    if (sender.tab) return;
    // Resolve only after the DNR rules match the new host, so the popup can
    // show "Saved" for a state that actually took effect.
    return setInstance(msg.platform, msg.domain)
      .then(() => ({ domain: instances[msg.platform] }));
  }
  if (msg.type === 'get-instances') {
    // Read through storage: the popup may wake a worker that has not run
    // applyRules() yet.
    return W.storage.local.get(Object.values(INSTANCE_KEYS)).then(t => {
      loadInstances(t);
      return { ...instances };
    });
  }
  if (msg.type === 'toggle') {
    // Only extension pages (the popup) may toggle; never content scripts.
    if (sender.tab) return;
    if (!Object.values(STORAGE_KEYS).includes(msg.key)) return;
    // Idempotent write; storage.onChanged drives onToggle.
    W.storage.local.set({ [msg.key]: msg.value !== false }).catch(() => {});
    return;
  }
  // SPA URL change reported by the content-script poll (fallback path).
  if (msg.type !== 'smr-url' || !msg.url) return;
  if (!sender.tab || typeof sender.tab.id !== 'number') return;
  forwardSpaNav(sender.tab.id, msg.url);
});

// A supported page that DNR did not get to redirect (a same-document
// pushState, or a navigation served from the site's own service worker) is
// still on screen. Send it on its way as soon as we hear about it.
async function forwardSpaNav(tabId, url, direct) {
  const host = hostOf(url);
  if (!host) return;
  const platform = Object.keys(DOMAINS).find(p => DOMAINS[p].originals.some(h => hostMatches(host, h)));
  if (!platform) return;
  const t = await W.storage.local.get(STORAGE_KEYS[platform]).catch(() => ({}));
  if (t[STORAGE_KEYS[platform]] === false) return;
  const dest = forwardUrl(url);
  if (!dest || dest === url) return;
  // A freshly committed document may not have the content script yet, so for
  // that case navigate the tab directly: no 600 ms round trip, and the page
  // that is still parsing is dropped.
  if (direct) {
    W.tabs.update(tabId, { url: dest }).catch(() => {});
    return;
  }
  sendMsg(tabId, { type: 'smr-nav', url: dest }, 600).then(
    () => {},
    () => W.tabs.update(tabId, { url: dest }).catch(() => {})
  );
}

function forwardUrl(url) {
  let u;
  try { u = new URL(url); } catch (e) { return null; }
  for (const def of forwardRules()) {
    if (!def.platforms.some(p => DOMAINS[p].originals.some(h => hostMatches(u.hostname, h)))) continue;
    const m = url.match(def.from);
    if (!m) continue;
    if (def.allow) return null;
    return def.to.replace(/\\(\d)/g, (_, d) => m[+d] || '');
  }
  return null;
}

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
        dest = `https://${instances.x}/search?q=%23${encodeURIComponent(hashMatch[1])}`;
      } else {
        const targetUrl = `https://x.com${decoded}`;
        dest = forwardUrl(targetUrl) || `https://${instances.x}${decoded}`;
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

// Toggle flipped on: redirect the affected tab right away so the user does
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

// Same-document navigation (history.pushState): fires immediately, unlike the
// one-second poll. Without this a TikTok page shows for a couple of seconds
// before the front-end takes over.
if (W.webNavigation.onHistoryStateUpdated) {
  W.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return;
    if (!details.url || !details.url.startsWith('http')) return;
    forwardSpaNav(details.tabId, details.url);
  });
}

W.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  const url = details.url;
  if (!url.startsWith('http')) return;
  const host = hostOf(url);
  if (!host) return;
  for (const platform of Object.keys(DOMAINS)) {
    const d = DOMAINS[platform];
    if (d.originals.some(h => hostMatches(host, h))) {
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
  // DNR normally redirects before anything renders; if a supported URL did
  // commit, the request slipped past it — go now, not on the next poll.
  forwardSpaNav(details.tabId, url, true);

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

// Only ever forward: a platform that is turned off leaves the page alone.
async function redirectCurrentTab(platform) {
  const d = DOMAINS[platform];
  if (!d) return;
  const fits = (url) => {
    if (!url || !url.startsWith('http')) return null;
    const host = hostOf(url);
    if (!host) return null;
    if (!d.originals.some(h => hostMatches(host, h))) return null;
    return forwardUrl(url);
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
  if (!best) {
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
