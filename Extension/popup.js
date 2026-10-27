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
};

const list = document.getElementById('list');
let settingsPanel = null;
let instances = {};

function createSettingsPanel(platform) {
  const info = INSTANCE_INFO[platform];
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.dataset.platform = platform;

  const row = document.createElement('div');
  row.className = 'inst-row';
  const input = document.createElement('input');
  input.className = 'inst-input';
  input.type = 'text';
  input.placeholder = info.placeholder;
  const save = document.createElement('button');
  save.className = 'inst-save';
  save.textContent = 'Save';
  row.appendChild(input);
  row.appendChild(save);
  panel.appendChild(row);

  const hint = document.createElement('p');
  hint.className = 'inst-hint';
  hint.textContent = 'Instance list: ';
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

  save.addEventListener('click', () => {
    W.runtime.sendMessage({ type: 'set-instance', platform, domain: input.value })
      .catch(() => {});
    panel.classList.remove('open');
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
      gear.title = 'Change ' + s.label + ' instance';
      gear.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!settingsPanel || settingsPanel.dataset.platform !== s.platform) {
          if (settingsPanel) settingsPanel.remove();
          settingsPanel = createSettingsPanel(s.platform);
          list.insertBefore(settingsPanel, row.nextSibling);
        }
        if (settingsPanel.classList.contains('open')) {
          settingsPanel.classList.remove('open');
        } else {
          settingsPanel.querySelector('.inst-input').value =
            instances[s.platform] || '';
          settingsPanel.classList.add('open');
        }
      });
      row.appendChild(gear);
    }

    const toggle = document.createElement('div');
    toggle.className = enabled ? 'toggle on' : 'toggle';

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

  W.storage.local.set({ [s.key]: newVal }).catch(() => {});
  // Wake-up signal for the background worker; storage.onChanged is the
  // single driver of the toggle logic.
  W.runtime.sendMessage({ type: 'toggle', key: s.key, value: newVal }).catch(() => {});
});

W.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && SERVICES.some(s => changes[s.key])) render();
});

render();
