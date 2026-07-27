const SERVICES = [
  { key: 'redirect_instagram', label: 'Instagram', platform: 'instagram' },
  { key: 'redirect_x',         label: 'X',         platform: 'x' },
  { key: 'redirect_tiktok',    label: 'TikTok',    platform: 'tiktok' },
  { key: 'redirect_threads',   label: 'Threads',   platform: 'threads' },
];

const list = document.getElementById('list');

async function render() {
  const toggles = await chrome.storage.local.get(SERVICES.map(s => s.key));
  list.textContent = '';
  for (const s of SERVICES) {
    const enabled = toggles[s.key] !== false;
    const row = document.createElement('div');
    row.className = 'service';
    row.setAttribute('data-platform', s.platform);

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

    const toggle = document.createElement('div');
    toggle.className = enabled ? 'toggle on' : 'toggle';

    row.appendChild(toggle);

    row.onclick = async () => {
      const newVal = !enabled;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.runtime.sendMessage({
        type: 'toggle',
        key: s.key,
        value: newVal,
        platform: s.platform,
        tabId: tab?.id,
        tabUrl: tab?.url || '',
      });
      render();
    };
    list.appendChild(row);
  }
}

render();
