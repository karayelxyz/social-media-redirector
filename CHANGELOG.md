# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-10-27

### Changed
- Dropped the `tabs` permission. `tabs.update`, `tabs.reload`, `tabs.query` and `tabs.sendMessage` never needed it; the only sensitive read was the active tab's URL, and the `host_permissions` the extension already declares expose it for the four supported sites, which is the only place it is used
- Permission set is now `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `storage`, `webNavigation`

## [1.2] - 2026-10-27

### Changed
- Instagram now redirects to **kittygram** instead of imginn. kittygram mirrors Instagram paths 1:1, so one host-swap rule replaces the six imginn-specific path rules (profiles, posts, reels, stories, tagged, root)
- X now redirects to **shitter** (nitter fork) — default `shitter.thepixora.com`
- Both Instagram and X front-end instances are now configurable from the popup ⚙ (Instagram gets its own gear)
- TikTok front-end is configurable too: **exporttok** (default), **tikvib** or **viewtikstories**, each mapped with its own URL scheme (`/tiktok/account/…`, `/profile/…`, `/profile/…?tab=…`)
- Instance list links in the popup are tappable chips ("official repository" / "unofficial"), not bare numbers
- Popup subtitle reads "Alternative frontends, no login needed."
- `host_permissions` / `content_scripts` swap `imginn.com` for the default kittygram and shitter hosts

### Added
- Per-platform instance config with host normalization — pasting a full URL works
- TikTok pages beyond profile/video now map instead of silently landing on the profile: followers, following, reposts and playlists where the chosen front-end has them
- `forwardRules()` is built per call, so a new instance updates the forward rules and the current-tab redirect together
- Landing page bookmarklet takes both instances and is generated from the same routing as the extension

### Removed
- Reverse redirects (front-end page → original site). A toggle that is off now does nothing: no reverse rules are installed and the current tab is left alone
- `imginn.com` support and its path-mapping rules

## [1.1] - 2026-08-04

### Fixed
- Root `instagram.com` (with trailing slash) now redirects to `imginn.com`
- Instagram profile catchall keeps a trailing slash on the `imginn.com` destination
- X `/hashtag/{tag}` paths redirect to shitter search (`?q=%23{tag}`) instead of a broken path
- Instagram/X login pages now capture the `?next=` / `?redirect_after_login=` destination and redirect to the proxy (instead of leaving the user on the login page)
- Toggle redirect now also handles login pages with redirect parameters (previously only a manual reload triggered the redirect)
- Bookmarklet: X section's premature `return` no longer blocks redirects on non-login X pages; root Instagram handled; re-synced with extension rules

### Changed
- Repo restructured: extension files in `Extension/` subfolder, project docs at root
- Toggle redirect rebuilt on evidence-based message channels (`smr-nav` / `smr-reload`) with `tabs.update` fallback and 400ms throttle
- Mobile popup layout uses fixed pixel sizes instead of container query units (broken on some Chrome forks)
- Content script now only runs on supported platform domains
- Toggle state surviving service-worker suspend: recent-tab fallback (`lastTabs`) now persists in `storage.session`
- Toggle race: `storage.onChanged` is now the single driver of toggle logic; the popup message only mirrors the storage write, and DNR rules are fully applied before the tab redirect starts

### Added
- SPA navigation detection via content-script URL polling — TikTok profile/video `pushState` navigations now redirect too
- Reverse-redirect support so disabling a platform returns to the original site
- Redirect evidence (`navHit`) is correlated per toggle via nonce — a background tab redirect can no longer satisfy another tab's fallback chain
- URL polling now pauses while the tab is hidden (mobile battery)
- Release workflow now packages `content.js`

### Removed
- All debug logging and the popup rules-status panel
- Unused `webRequest` / `webRequestBlocking` permissions (Firefox)

### Fixed
- Domain checks use hostname parsing instead of URL substring matching
- Message spoofing: toggle messages are only accepted from extension pages, SPA reports only from content scripts
