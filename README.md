![Social Media Redirector Cover](assets/cover.png)

# Social Media Redirector

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-online-brightgreen)](https://karayelxyz.github.io/social-media-redirector)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A browser extension that redirects social media pages to privacy-respecting front-ends.

| Platform | Original | Redirect |
|----------|----------|----------|
| Instagram | instagram.com | kittygram.irelephant.net (customizable via ⚙ in popup) |
| X | x.com | shitter.thepixora.com (customizable via ⚙ in popup) |
| TikTok | tiktok.com | exporttok.com (customizable via ⚙ in popup) |
| Threads | threads.com | shoelace.mint.lgbt |

## Installation

[<img src="assets/chrome.png" alt="Chrome Web Store" height="60">](https://chromewebstore.google.com/detail/social-media-redirector/gckenkjdlidnignifbbobohimoilmgcg)
[<img src="assets/firefox.png" alt="Firefox Add-ons" height="60">](https://addons.mozilla.org/en-US/firefox/addon/social-media-redirector/)
[<img src="assets/edge.png" alt="Edge Add-ons" height="60">](https://microsoftedge.microsoft.com/addons/detail/social-media-redirector/ahioadaknnlfbkdhmebmkhnjllglcffj)

### Manual (developer mode)

**Chrome:**
1. Download the [latest release](https://github.com/karayelxyz/social-media-redirector/releases) (zip or crx)
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `social-media-redirector` folder

**Firefox:**
1. Download the [latest release](https://github.com/karayelxyz/social-media-redirector/releases) (signed .xpi)
2. Open `about:addons`
3. Click the gear icon → **Install Add-on From File**
4. Select the `.xpi` file

## Bookmarklet

Works on any browser (Chromium or Gecko based). Create a new bookmark, paste the URL below, or visit the [landing page](https://karayelxyz.github.io/social-media-redirector) to select different front-end instances.

```
javascript:(function()%7Bvar%20K%3D%22https%3A%2F%2Fkittygram.irelephant.net%22%2CN%3D%22https%3A%2F%2Fshitter.thepixora.com%22%2CT%3D%22https%3A%2F%2Fexporttok.com%22%2CTK%3D%22exporttok.com%22%2Cu%3Dnew%20URL(location.href)%2Ch%3Du.hostname%2Cp%3Du.pathname%2Cq%3Du.search%2Cs%3Du.searchParams%2CAL%3D%5B%22%2Fexplore%22%2C%22%2Fdirect%22%2C%22%2Faccounts%22%2C%22%2Fabout%22%2C%22%2Fhacked%22%2C%22%2Fprivacy%22%2C%22%2Fpopular%22%5D%3Bfunction%20al(x)%7Breturn%20AL.some(function(a)%7Breturn%20x%3D%3D%3Da%7C%7Cx.indexOf(a%2B%22%2F%22)%3D%3D%3D0%7D)%7Dfunction%20go(t)%7Blocation.href%3Dt%7Dfunction%20tk(u%2Cr)%7Bif(TK%3D%3D%3D%22tikvib.com%22)%7Bif(r%3D%3D%3D%22followers%22%7C%7Cr%3D%3D%3D%22following%22)return%20T%2B%22%2F%22%2Br%2B%22%2F%22%2Bu%3Bif(r%3D%3D%3D%22repost%22%7C%7Cr%3D%3D%3D%22reposts%22)return%20T%2B%22%2Freposts%2F%22%2Bu%3Breturn%20T%2B%22%2Fprofile%2F%22%2Bu%7Dif(TK%3D%3D%3D%22viewtikstories.com%22)%7Bif(r%3D%3D%3D%22followers%22%7C%7Cr%3D%3D%3D%22following%22%7C%7Cr%3D%3D%3D%22repost%22%7C%7Cr%3D%3D%3D%22reposts%22%7C%7Cr%3D%3D%3D%22playlist%22)return%20T%2B%22%2Fprofile%2F%22%2Bu%2B%22%3Ftab%3D%22%2B(r%3D%3D%3D%22repost%22%3F%22reposts%22%3Ar)%3Breturn%20T%2B%22%2Fprofile%2F%22%2Bu%7Dreturn%20T%2B%22%2Ftiktok%2Faccount%2F%22%2Bu%7Dif(%2F(%5E%7C%5C.)instagram%5C.com%24%2F.test(h))%7Bvar%20np%3Dp%3Bif(p.indexOf(%22%2Faccounts%2Flogin%22)%3D%3D%3D0)%7Bvar%20n%3Ds.get(%22next%22)%3Bif(!n)return%3Bnp%3Dn.indexOf(%22http%22)%3D%3D%3D0%3Fnew%20URL(n).pathname%2Bnew%20URL(n).search%3An%7Dif(al(np.split(%22%3F%22)%5B0%5D))return%3Bgo(K%2Bnp)%3Breturn%7Dif(%2F(%5E%7C%5C.)x%5C.com%24%2F.test(h))%7Bif(%2F%5E%5C%2Fi%5C%2F(jf%5C%2Fonboarding%7Cflow)%2F.test(p))return%3Bvar%20hm%3Dp.match(%2F%5E%5C%2Fhashtag%5C%2F(%5B%5E%2F%3F%23%5D%2B)%2F)%3Bif(hm)%7Bgo(N%2B%22%2Fsearch%3Ff%3Dtweets%26q%3D%2523%22%2Bhm%5B1%5D)%3Breturn%7Dgo(N%2Bp%2Bq)%3Breturn%7Dif(%2F(%5E%7C%5C.)tiktok%5C.com%24%2F.test(h))%7Bvar%20v%3Dp.match(%2F%5E%5C%2F%40(%5B%5E%2F%5D%2B)%5C%2F(%3F%3Avideo%7Cphoto)%5C%2F(%5B0-9%5D%2B)%2F)%3Bif(v)%7Bgo(T%2B(TK%3D%3D%3D%22tikvib.com%22%3F%22%2Fmedia%2F%22%2Bv%5B2%5D%3ATK%3D%3D%3D%22viewtikstories.com%22%3F%22%2Fcomments%2F%22%2Bv%5B2%5D%3A%22%2Ftiktok%2Faccount%2Fviewer%2F%40%22%2Bv%5B1%5D%2B%22%2F%22%2Bv%5B2%5D))%3Breturn%7Dvar%20ta%3Dp.match(%2F%5E%5C%2F%40(%5B%5E%2F%5D%2B)(%3F%3A%5C%2F(%5B%5E%2F%3F%23%5D%2B))%3F%2F)%3Bif(ta)%7Bgo(tk(ta%5B1%5D%2Cta%5B2%5D%7C%7C%22%22))%3Breturn%7Dreturn%7Dif(%2F(%5E%7C%5C.)threads%5C.com%24%2F.test(h))%7Bvar%20tp%3Dp.match(%2F%5E%5C%2F%40%5B%5E%2F%5D%2B%5C%2Fpost%5C%2F(%5B%5E%2F%5D%2B)%2F)%3Bif(tp)%7Bgo(%22https%3A%2F%2Fshoelace.mint.lgbt%2Ft%2F%22%2Btp%5B1%5D)%3Breturn%7Dif(%2F%5E%5C%2F(login%7Csearch%7Cexplore%7Cactivity%7Csettings%7Capi%7Cshare)%2F.test(p))return%3Bvar%20th%3Dp.match(%2F%5E%5C%2F%40(%5B%5E%2F%3F%23%5D%2B)%2F)%3Bif(th)%7Bgo(%22https%3A%2F%2Fshoelace.mint.lgbt%2F%40%22%2Bth%5B1%5D)%3Breturn%7D%7D%7D)()%3B
```

Click the bookmark on any supported page to instantly redirect. To point it at different front-end instances, use the [landing page](https://karayelxyz.github.io/social-media-redirector) to generate a custom bookmarklet.

## Build from Source

```bash
# Chrome
zip -r social-media-redirector-chrome.zip Extension/manifest.json Extension/background.js Extension/popup.html Extension/popup.js Extension/images/

# Firefox
cp Extension/manifest-firefox.json Extension/manifest.json && zip -r social-media-redirector-firefox.zip Extension/manifest.json Extension/background.js Extension/popup.html Extension/popup.js Extension/images/
```

Releases are automatically built by GitHub Actions — see [`.github/workflows/release.yml`](.github/workflows/release.yml).

## Privacy

- [Privacy Policy](PRIVACY_POLICY.html)

## License

MIT
