const STORAGE_KEYS = {
  instagram: 'redirect_instagram',
  x:         'redirect_x',
  tiktok:    'redirect_tiktok',
  threads:   'redirect_threads',
};

const DOMAINS = {
  instagram: { originals: ['instagram.com'], proxies: ['imginn.com'] },
  x:         { originals: ['x.com'],          proxies: ['nitter.us.catsarch.com'] },
  tiktok:    { originals: ['tiktok.com'],     proxies: ['exporttok.com'] },
  threads:   { originals: ['threads.com'],    proxies: ['shoelace.mint.lgbt'] },
};

const ALLOW = true;

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
  { platforms: ['instagram'], priority: 10, allow: ALLOW,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/(?:explore|direct|accounts|about|hacked|privacy|popular)(?:/|$)' },
  { platforms: ['instagram'], priority: 8,
    from: '^https://(?:[^/.]+\\.)?instagram\\.com/([^/?#]+)(?:/.*)?$',
    to:   'https://imginn.com/\\1/' },

  { platforms: ['x'], priority: 10, allow: ALLOW,
    from: '^https://(?:www\\.)?x\\.com/i/(?:jf/onboarding|flow)(?:/|$)' },
  { platforms: ['x'], priority: 10,
    from: '^https://(?:www\\.)?x\\.com/(.*)',
    to:   'https://nitter.us.catsarch.com/\\1' },

  { platforms: ['tiktok'], priority: 10,
    from: '^https://(?:[\\w-]+\\.)?tiktok\\.com/@([^/]+)/(?:video|photo)/([0-9]+)(?:[/?#].*)?$',
    to:   'https://exporttok.com/tiktok/account/viewer/@\\1/\\2' },
  { platforms: ['tiktok'], priority: 9,
    from: '^https://(?:[\\w-]+\\.)?tiktok\\.com/@([^/]+)(?:/.*)?$',
    to:   'https://exporttok.com/tiktok/account/\\1' },

  { platforms: ['threads'], priority: 10,
    from: '^https://(?:www\\.)?threads\\.com/@[^/]+/post/([^/]+)(?:/.*)?$',
    to:   'https://shoelace.mint.lgbt/t/\\1' },
  { platforms: ['threads'], priority: 10, allow: ALLOW,
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

async function applyRules() {
  const toggles = await chrome.storage.local.get(Object.values(STORAGE_KEYS));

  const enabled = [];
  for (const def of FORWARD) {
    if (def.platforms.some(p => toggles[STORAGE_KEYS[p]] !== false)) {
      enabled.push(dnrRule(def, enabled.length + 1));
    }
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: enabled,
  });
}

// Sync DNR rules on every service worker start
// (developer mode reload, worker idle restart, etc.)
applyRules();

chrome.runtime.onInstalled.addListener(applyRules);
chrome.runtime.onStartup.addListener(applyRules);

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  const m = details.url.match(/^https:\/\/(?:[\w-]+\.)?tiktok\.com\/@([^/]+)\/(video|photo)\/(\d+)/);
  if (m) chrome.storage.session.set({ ['tt_' + m[2] + '_' + m[3]]: details.url });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  const m = details.url.match(/^https:\/\/(?:[\w-]+\.)?tiktok\.com\/@([^/]+)\/(?:video|photo)\/(\d+)/);
  if (!m) return;
  chrome.storage.local.get([STORAGE_KEYS.tiktok]).then(toggles => {
    if (toggles[STORAGE_KEYS.tiktok] !== false) {
      chrome.tabs.update(details.tabId, {
        url: `https://exporttok.com/tiktok/account/viewer/@${m[1]}/${m[2]}`,
      });
    }
  });
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  const igm = details.url.match(/^https:\/\/(?:[^/.]+\.)?instagram\.com\/accounts\/login\/?\?next=([^&]+)/);
  if (!igm) return;
  const next = decodeURIComponent(igm[1]);
  const pt = next.indexOf('http') === 0 ? new URL(next).pathname : next.split('?')[0];
  const allow = ['/explore','/direct','/accounts','/about','/hacked','/privacy','/popular'];
  if (allow.some(x => pt.indexOf(x) === 0)) return;
  chrome.storage.local.get([STORAGE_KEYS.instagram]).then(toggles => {
    if (toggles[STORAGE_KEYS.instagram] === false) return;
    let dest;
    let m;
    if (m = pt.match(/\/(?:p|reels?)\/([^/]+)/)) {
      dest = 'https://imginn.com/p/' + m[1] + '/';
    } else if (m = pt.match(/\/([^/]+)\/reels?/)) {
      dest = 'https://imginn.com/reels/' + m[1] + '/';
    } else if (m = pt.match(/\/([^/]+)\/tagged/)) {
      dest = 'https://imginn.com/tagged/' + m[1] + '/';
    } else if (m = pt.match(/\/stories\/([^/]+)/)) {
      dest = 'https://imginn.com/stories/' + m[1] + '/';
    } else if (m = pt.match(/\/([^/?#]+)/)) {
      dest = 'https://imginn.com/' + m[1] + '/';
    }
    if (dest) chrome.tabs.update(details.tabId, { url: dest });
  });
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  const xm = details.url.match(/^https:\/\/(?:www\.)?x\.com\/i\/(?:jf\/onboarding|flow)/);
  if (!xm) return;
  const params = new URL(details.url).searchParams;
  const r = params.get('redirect_after_login');
  if (!r) return;
  const redirect = decodeURIComponent(r);
  chrome.storage.local.get([STORAGE_KEYS.x]).then(toggles => {
    if (toggles[STORAGE_KEYS.x] === false) return;
    let dest;
    if (redirect.startsWith('/hashtag/')) {
      dest = 'https://nitter.us.catsarch.com/search?f=tweets&q=%23' + encodeURIComponent(redirect.slice(9).split('?')[0].split('#')[0]);
    } else {
      dest = 'https://nitter.us.catsarch.com' + redirect;
    }
    chrome.tabs.update(details.tabId, { url: dest });
  });
});

function reverseUrl(platform, proxyUrl) {
  const u = new URL(proxyUrl);
  if (!DOMAINS[platform].proxies.some(h => u.hostname.includes(h))) return null;
  if (platform === 'instagram') {
    let m;
    if (m = u.pathname.match(/^\/p\/([^/]+)/)) return `https://www.instagram.com/p/${m[1]}/`;
    if (m = u.pathname.match(/^\/stories\/([^/]+)/)) return `https://www.instagram.com/stories/${m[1]}/`;
    if (m = u.pathname.match(/^\/tagged\/([^/]+)/)) return `https://www.instagram.com/${m[1]}/tagged/`;
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
    if (viewer) {
      const key = 'tt_video_' + viewer[2];
      const altKey = 'tt_photo_' + viewer[2];
      return new Promise(resolve => {
        chrome.storage.session.get([key, altKey], result => {
          resolve(result[key] || result[altKey] || `https://www.tiktok.com/@${viewer[1]}`);
        });
      });
    }
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'toggle') {
    chrome.storage.local.set({ [msg.key]: msg.value }).then(() => {
      return applyRules();
    }).then(async () => {
      if (msg.tabId && msg.tabUrl && msg.platform) {
        const d = DOMAINS[msg.platform];
        const domains = msg.value ? d.originals : d.proxies;
        if (domains.some(domain => msg.tabUrl.includes(domain))) {
          if (msg.value) {
            chrome.tabs.reload(msg.tabId);
          } else {
            const url = await Promise.resolve(reverseUrl(msg.platform, msg.tabUrl));
            if (url) chrome.tabs.update(msg.tabId, { url });
          }
        }
      }
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'getToggles') {
    chrome.storage.local.get(Object.values(STORAGE_KEYS)).then(sendResponse);
    return true;
  }
});
