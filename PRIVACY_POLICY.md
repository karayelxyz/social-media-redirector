# Privacy Policy for Social Media Redirector

**Last updated:** July 26, 2026

## Data Collection

Social Media Redirector **does not collect, store, transmit, or share any personal data**. The extension operates entirely locally within your browser.

## Permissions Used

| Permission | Purpose |
|---|---|
| `declarativeNetRequest` / `declarativeNetRequestWithHostAccess` | Rewrite URLs locally via browser-built-in DNR rules — no network requests are intercepted or inspected by the extension. |
| `storage` | Save your toggle preference (on/off) locally. No data is synced or sent externally. |
| `webNavigation` | Detect Instagram login redirects (`?next=`) and TikTok page navigation to preserve the original URL when toggling off. |

## What the Extension Does

- When enabled, it **redirects your browser** from supported social media domains to their privacy-respecting front-end alternatives.
- All redirect logic runs **inside your browser** via `chrome.declarativeNetRequest` rules and a service worker.
- The extension **never sends your browsing data**, URLs, or any other information to any remote server.

## Third-Party Services

The extension redirects you to third-party front-ends:

- **imginn.com** (Instagram alternative)
- **nitter.us.catsarch.com** (X/Twitter alternative)
- **exporttok.com** (TikTok alternative)
- **shoelace.mint.lgbt** (Threads alternative)

These services are operated independently. Please refer to their respective privacy policies for information on how they handle your data.

## Changes to This Policy

If this policy changes, the "Last updated" date at the top will be revised.

## Contact

Open an issue on [GitHub](https://github.com/karayelxyz/social-media-redirector/issues) with any questions.
