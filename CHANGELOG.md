# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1] - 2026-08-04

### Fixed
- Root `instagram.com` (with trailing slash) now redirects to `imginn.com`
- Instagram profile catchall keeps a trailing slash on the `imginn.com` destination
- X `/hashtag/{tag}` paths redirect to Nitter search (`?q=%23{tag}`) instead of a broken path
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
- Instagram/X login-redirect capture blocks

### Fixed
- Domain checks use hostname parsing instead of URL substring matching
- Message spoofing: toggle messages are only accepted from extension pages, SPA reports only from content scripts
