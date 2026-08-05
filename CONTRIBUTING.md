# Contributing

## Setup

No build step or dependencies — the extension is plain JavaScript.

**Chrome/Edge:** open `chrome://extensions/` → enable Developer mode → **Load unpacked** → select the `Extension/` folder (uses `manifest.json`).

**Firefox desktop:** open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `Extension/manifest-firefox.json` (rename/copy to `Extension/manifest.json` in a temp folder, or use `web-ext`).

**Firefox Android:** `npx web-ext run -s <source-dir> -t firefox-android --adb-device <id> --firefox-apk org.mozilla.fenix`

## Coding Conventions

- Plain JS, no dependencies, no transpilers — code must run as-is in both Chrome MV3 (service worker) and Firefox MV3 (background scripts).
- Use the `W` alias pattern (`typeof browser !== 'undefined' ? browser : chrome`) for cross-browser APIs; all API calls are promise-based with `.catch(() => {})` where failure is tolerable.
- Platform support changes must update both manifests and all rule tables — see `AGENTS.md` for the full checklist.
- Bump `version` in `Extension/manifest.json` **and** `Extension/manifest-firefox.json` together.

## Tests

```bash
node --check Extension/background.js
node --check Extension/content.js
node --check Extension/popup.js
node test/redirect.test.js
```

The test suite validates forward + reverse URL mapping round-trips for every platform. Add a case whenever you add or change a URL pattern.

## Pull Requests

1. Fork, create a branch from `main`.
2. Make your change; run the tests above.
3. Open the PR with a short description of the behavior change and which platforms/browsers you tested on.
4. Releases are automated: merging a version bump to `main` triggers `.github/workflows/release.yml`.
