const W = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;

const SERVICES = [
  { key: 'redirect_instagram', label: 'Instagram', platform: 'instagram' },
  { key: 'redirect_x',         label: 'X',         platform: 'x' },
  { key: 'redirect_tiktok',    label: 'TikTok',    platform: 'tiktok' },
  { key: 'redirect_threads',   label: 'Threads',   platform: 'threads' },
];

// Platforms whose front-end instance can be swapped from the popup gear.
// Each link is rendered as a chip; the URL itself stays in the tooltip.
const INSTANCE_INFO = {
  x: {
    placeholder: 'shitter.thepixora.com',
    links: [
      ['official repository', 'https://codeberg.org/shitter/shitter/wiki/Instances'],
      ['unofficial', 'https://status.d420.de/'],
    ],
  },
  instagram: {
    placeholder: 'kittygram.irelephant.net',
    links: [
      ['official repository', 'https://codeberg.org/irelephant/kittygram#instances'],
    ],
  },
  tiktok: {
    // Three different third-party front-ends with their own URL schemes, so a
    // fixed list of buttons instead of a text field.
    options: ['exporttok.com', 'viewtikstories.com', 'www.tikvib.com'],
  },
};

const INSTANCE_KEYS = {
  x: 'nitter_instance', instagram: 'kittygram_instance', tiktok: 'tiktok_instance',
};

const list = document.getElementById('list');
let settingsPanel = null;
let instances = {};

// Same rule the background applies: accept a pasted URL, keep the host.
function hostOnly(value, fallback) {
  const s = String(value || '').trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split(/[/?#]/)[0];
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s : (fallback || null);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// MV3 background is a non-persistent event page: a message sent while it is
// terminated/starting is rejected ("Receiving end does not exist") instead of
// waiting for it. Retry once, then fall back to storage, which the background
// re-reads on wake.
async function saveInstance(platform, domain) {
  const payload = { type: 'set-instance', platform, domain };
  for (let attempt = 0; attempt < 2; attempt++) {
    const ack = await withTimeout(W.runtime.sendMessage(payload), 1200).catch(() => null);
    if (ack) return true;
    await new Promise(r => setTimeout(r, 150));
  }
  await W.storage.local.set({ [INSTANCE_KEYS[platform]]: domain }).catch(() => {});
  return false;
}

function createSettingsPanel(platform) {
  const info = INSTANCE_INFO[platform];
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.dataset.platform = platform;

  if (info.options) {
    const opts = document.createElement('div');
    opts.className = 'inst-opts';
    const hint = document.createElement('p');
    hint.className = 'inst-hint';
    const oErr = document.createElement('span');
    oErr.className = 'inst-err';
    hint.appendChild(oErr);

    for (const domain of info.options) {
      const label = domain.replace(/^www\./, '');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'inst-opt';
      b.dataset.domain = domain;
      b.textContent = label;
      b.title = domain;
      b.addEventListener('click', async () => {
        oErr.textContent = '';
        opts.querySelectorAll('.inst-opt').forEach(x => { x.disabled = true; });
        await saveInstance(platform, domain);
        const stored = await W.storage.local.get(INSTANCE_KEYS[platform])
          .then(t => t[INSTANCE_KEYS[platform]], () => null);
        opts.querySelectorAll('.inst-opt').forEach(x => { x.disabled = false; });
        if (stored !== domain) {
          oErr.textContent = 'Save failed, try again. ';
          return;
        }
        instances[platform] = domain;
        opts.querySelectorAll('.inst-opt').forEach(x => {
          x.classList.toggle('active', x === b);
        });
        // Same tick as the Save button; pin the width first so swapping the
        // label to ✓ cannot resize the row.
        b.style.minWidth = b.offsetWidth + 'px';
        b.textContent = '✓';
        b.classList.add('saved');
        b.setAttribute('aria-label', 'Selected');
        setTimeout(() => {
          b.textContent = label;
          b.classList.remove('saved');
          b.style.minWidth = '';
          b.removeAttribute('aria-label');
          panel.classList.remove('open');
        }, 900);
      });
      opts.appendChild(b);
    }

    panel.appendChild(opts);
    panel.appendChild(hint);
    return panel;
  }

  const row = document.createElement('div');
  row.className = 'inst-row';
  const input = document.createElement('input');
  input.className = 'inst-input';
  input.type = 'text';
  input.placeholder = info.placeholder;
  input.enterKeyHint = 'go';
  // On touch screens the soft keyboard covers the lower half of the popup and
  // nothing can move the browser's own popup, so the editing panel is placed at
  // the top (see gear handler) and the field is scrolled into view on focus.
  input.addEventListener('focus', () => {
    setTimeout(() => input.scrollIntoView({ block: 'nearest' }), 250);
  });
  const save = document.createElement('button');
  save.className = 'inst-save';
  save.textContent = 'Save';
  row.appendChild(input);
  row.appendChild(save);
  panel.appendChild(row);

  const hint = document.createElement('p');
  hint.className = 'inst-hint';
  const err = document.createElement('span');
  err.className = 'inst-err';
  hint.appendChild(err);
  hint.appendChild(document.createTextNode('Instance list: '));
  info.links.forEach(([label, href], i) => {
    if (i) hint.appendChild(document.createTextNode(' '));
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.title = href;
    a.textContent = label;
    hint.appendChild(a);
  });
  panel.appendChild(hint);

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); save.click(); }
  });

  save.addEventListener('click', async () => {
    const domain = hostOnly(input.value);
    if (!domain) {
      err.textContent = 'Needs a host like frontend.example.org. ';
      return;
    }
    err.textContent = '';
    save.disabled = true;
    save.textContent = '…';
    save.setAttribute('aria-label', 'Saving');
    save.title = 'Saving…';

    await saveInstance(platform, domain);

    // Storage is the source of truth; only claim success if it landed.
    const stored = await W.storage.local.get(INSTANCE_KEYS[platform])
      .then(t => t[INSTANCE_KEYS[platform]], () => null);
    if (stored !== domain) {
      err.textContent = 'Save failed, try again. ';
      save.textContent = 'Save';
      save.setAttribute('aria-label', 'Save');
      save.title = '';
      save.disabled = false;
      return;
    }

    instances[platform] = domain;
    // Only a tick: "Saved ✓" is wider than "Save" and overflowed the panel.
    save.textContent = '✓';
    save.setAttribute('aria-label', 'Saved');
    save.title = 'Saved';
    save.classList.add('saved');
    setTimeout(() => {
      panel.classList.remove('open');
      save.classList.remove('saved');
      save.textContent = 'Save';
      save.setAttribute('aria-label', 'Save');
      save.title = '';
      save.disabled = false;
    }, 900);
  });

  return panel;
}

async function render() {
  const toggles = await W.storage.local.get(SERVICES.map(s => s.key));
  try {
    instances = (await W.runtime.sendMessage({ type: 'get-instances' })) || {};
  } catch (e) {
    instances = {};
  }

  list.textContent = '';
  settingsPanel = null;
  for (const s of SERVICES) {
    const enabled = toggles[s.key] !== false;
    const info = INSTANCE_INFO[s.platform];
    const row = document.createElement('div');
    row.className = 'service';
    row.dataset.platform = s.platform;

    const left = document.createElement('div');
    left.className = 'service-left';

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.appendChild(document.getElementById('icon-' + s.platform).content.cloneNode(true));

    const name = document.createElement('span');
    name.className = 'service-name';
    name.textContent = s.label;

    left.appendChild(icon);
    left.appendChild(name);
    row.appendChild(left);

    if (info) {
      const gear = document.createElement('span');
      gear.className = 'gear';
      gear.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64z"/></svg>';
      gear.title = 'Change ' + s.label + ' ' + (info.options ? 'frontend' : 'instance');
      gear.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!settingsPanel || settingsPanel.dataset.platform !== s.platform) {
          if (settingsPanel) settingsPanel.remove();
          settingsPanel = createSettingsPanel(s.platform);
          // Touch: top of the list, so the on-screen keyboard cannot cover it.
          if (matchMedia('(pointer: coarse)').matches) list.prepend(settingsPanel);
          else list.insertBefore(settingsPanel, row.nextSibling);
        }
        if (settingsPanel.classList.contains('open')) {
          settingsPanel.classList.remove('open');
        } else {
          const inp = settingsPanel.querySelector('.inst-input');
          if (inp) inp.value = instances[s.platform] || '';
          const cur = instances[s.platform];
          settingsPanel.querySelectorAll('.inst-opt').forEach(x => {
            x.classList.toggle('active', x.dataset.domain === cur);
          });
          settingsPanel.classList.add('open');
        }
      });
      row.appendChild(gear);
    }

    const toggle = document.createElement('div');
    toggle.className = enabled ? 'toggle on' : 'toggle';
    // Keyboard/screen-reader parity: the row is a switch, not decoration.
    toggle.setAttribute('role', 'switch');
    toggle.tabIndex = 0;
    toggle.setAttribute('aria-checked', String(enabled));
    toggle.setAttribute('aria-label', s.label);

    row.appendChild(toggle);
    list.appendChild(row);
  }
}

list.addEventListener('click', (ev) => {
  const toggleEl = ev.target.closest('.toggle');
  if (!toggleEl) return;
  const row = toggleEl.closest('[data-platform]');
  if (!row) return;
  const s = SERVICES.find(x => x.platform === row.dataset.platform);
  if (!s) return;
  const newVal = !toggleEl.classList.contains('on');
  toggleEl.classList.toggle('on', newVal);
  toggleEl.setAttribute('aria-checked', String(newVal));

  W.storage.local.set({ [s.key]: newVal }).catch(() => {});
  // Wake-up signal for the background worker; storage.onChanged is the
  // single driver of the toggle logic.
  W.runtime.sendMessage({ type: 'toggle', key: s.key, value: newVal }).catch(() => {});
});

// Same control from the keyboard: Enter or Space flips the focused switch.
list.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const toggleEl = ev.target.closest && ev.target.closest('.toggle');
  if (!toggleEl) return;
  ev.preventDefault();
  toggleEl.click();
});

W.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && SERVICES.some(s => changes[s.key])) render();
});

render();
