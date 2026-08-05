const W = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;

W.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === 'smr-nav') {
    if (document.hidden) return;
    if (msg.nonce) W.storage.session.set({ navHit: { n: msg.nonce, t: Date.now() } }).catch(() => {});
    if (msg.url !== location.href) location.replace(msg.url);
    return;
  }
  if (msg.type === 'smr-reload') {
    if (document.hidden) return;
    if (msg.nonce) W.storage.session.set({ navHit: { n: msg.nonce, t: Date.now() } }).catch(() => {});
    location.reload();
  }
});

// SPA navigations (history.pushState) never hit DNR; watch for URL
// changes and let the background decide whether to redirect.
// Polling pauses while the tab is hidden (mobile battery).
let lastUrl = location.href;
function checkUrl() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    W.runtime.sendMessage({ type: 'smr-url', url: location.href }).catch(() => {});
  }
}
setInterval(() => { if (!document.hidden) checkUrl(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUrl(); });
