![Social Media Redirector Cover](assets/cover.png)

# Social Media Redirector

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-online-brightgreen)](https://karayelxyz.github.io/social-media-redirector)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A browser extension that redirects social media pages to privacy-respecting front-ends.

| Platform | Original | Redirect |
|----------|----------|----------|
| Instagram | instagram.com | imginn.com |
| X | x.com | nitter.net (customizable via ⚙ in popup) |
| TikTok | tiktok.com | exporttok.com |
| Threads | threads.com | shoelace.mint.lgbt |

## Installation

[<img src="assets/chrome.png" alt="Chrome Web Store" height="60">](https://chromewebstore.google.com/detail/social-media-redirector/gckenkjdlidnignifbbobohimoilmgcg)
[<img src="assets/firefox.png" alt="Firefox Add-ons" height="60">](https://addons.mozilla.org/en-US/firefox/addon/social-media-redirector/)

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

Works on any browser (Chromium or Gecko based). Create a new bookmark, paste the URL below, or visit the [landing page](https://karayelxyz.github.io/social-media-redirector) to select a different Nitter instance.

```
javascript:(function()%7Bvar%20u%3Dnew%20URL(window.location.href)%2Ch%3Du.hostname%2Cp%3Du.pathname%2Cs%3Du.searchParams%2Cm%3Bif(h.indexOf('instagram.com')%3E%3D0)%7Bif(p.indexOf('%2Faccounts%2Flogin')%3E%3D0)%7Bvar%20n%3Ds.get('next')%3Bif(n)%7Bvar%20pt%3Dn.indexOf('http')%3D%3D%3D0%3Fnew%20URL(n).pathname%3An.split('%3F')%5B0%5D%3Bvar%20al%3D%5B'%2Fexplore'%2C'%2Fdirect'%2C'%2Faccounts'%2C'%2Fabout'%2C'%2Fhacked'%2C'%2Fprivacy'%2C'%2Fpopular'%5D%3Bif(!al.some(function(x)%7Breturn%20pt.indexOf(x)%3D%3D%3D0%7D))%7Bif(m%3Dpt.match(%2F%2F(%3F%3Ap%7Creels%3F)%2F(%5B%5E%2F%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Fp%2F'%2Bm%5B1%5D%2B'%2F'%3Breturn%7Dif(m%3Dpt.match(%2F%2F(%5B%5E%2F%5D%2B)%2Freels%3F%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Freels%2F'%2Bm%5B1%5D%2B'%2F'%3Breturn%7Dif(m%3Dpt.match(%2F%2F(%5B%5E%2F%5D%2B)%2Ftagged%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Ftagged%2F'%2Bm%5B1%5D%2B'%2F'%3Breturn%7Dif(m%3Dpt.match(%2F%2Fstories%2F(%5B%5E%2F%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Fstories%2F'%2Bm%5B1%5D%2B'%2F'%3Breturn%7Dif(m%3Dpt.match(%2F%2F(%5B%5E%2F%3F%2523%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2F'%2Bm%5B1%5D%2B'%2F'%3Breturn%7D%7D%7Dreturn%7Dvar%20a%3D%5B'%2Fexplore'%2C'%2Fdirect'%2C'%2Faccounts'%2C'%2Fabout'%2C'%2Fhacked'%2C'%2Fprivacy'%2C'%2Fpopular'%5D%3Bif(a.some(function(x)%7Breturn%20p.indexOf(x)%3D%3D%3D0%7D))return%3Bif(p%3D%3D%3D'%2F'%7C%7Cp%3D%3D%3D'')%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2F'%3Breturn%3B%7Dif(m%3Dp.match(%2F%2F(%3F%3Ap%7Creels%3F)%2F(%5B%5E%2F%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Fp%2F'%2Bm%5B1%5D%2B'%2F'%7Delse%20if(m%3Dp.match(%2F%2F(%5B%5E%2F%5D%2B)%2Freels%3F%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Freels%2F'%2Bm%5B1%5D%2B'%2F'%7Delse%20if(m%3Dp.match(%2F%2F(%5B%5E%2F%5D%2B)%2Ftagged%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Ftagged%2F'%2Bm%5B1%5D%2B'%2F'%7Delse%20if(m%3Dp.match(%2F%2Fstories%2F(%5B%5E%2F%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2Fstories%2F'%2Bm%5B1%5D%2B'%2F'%7Delse%20if(m%3Dp.match(%2F%2F(%5B%5E%2F%3F%2523%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fimginn.com%2F'%2Bm%5B1%5D%2B'%2F'%3B%7D%7Delse%20if(h.indexOf('x.com')%3E%3D0)%7Bif(p.indexOf('%2Fi%2Fjf%2Fonboarding')%3E%3D0%7C%7Cp.indexOf('%2Fi%2Fflow')%3E%3D0)%7Bvar%20r%3Ds.get('redirect_after_login')%3Bif(r)%7Bvar%20d%3DdecodeURIComponent(r)%2Cht%3Dd.match(%2F%5E%2Fhashtag%2F(%5B%5E%2F%3F%23%5D%2B)%2F)%3Bif(ht)%7Bwindow.location.href%3D'https%3A%2F%2Fnitter.net%2Fsearch%3Fq%3D%2523'%2BencodeURIComponent(ht%5B1%5D)%3Breturn%7Dvar%20t%3D'https%3A%2F%2Fx.com'%2Bd%3Bm%3Dt.match(%2F%2Fhashtag%2F(%5B%5E%2F%3F%23%5D%2B)%2F)%3Bif(m)%7Bwindow.location.href%3D'https%3A%2F%2Fnitter.net%2Fsearch%3Ff%3Dtweets%26q%3D%2523'%2BencodeURIComponent(m%5B1%5D)%3Breturn%7Dm%3Dt.match(%2F(%2F.*)%2F)%3Bif(m)%7Bwindow.location.href%3D'https%3A%2F%2Fnitter.net'%2Bm%5B1%5D%3Breturn%7Dreturn%7Dreturn%7Dif(m%3Dp.match(%2F%2Fhashtag%2F(%5B%5E%2F%3F%23%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fnitter.net%2Fsearch%3Ff%3Dtweets%26q%3D%2523'%2BencodeURIComponent(m%5B1%5D)%7Delse%7Bwindow.location.href%3D'https%3A%2F%2Fnitter.net'%2Bp%2Bs%7D%7Delse%20if(h.indexOf('tiktok.com')%3E%3D0)%7Bif(m%3Dp.match(%2F%2F%40(%5B%5E%2F%5D%2B)%2F(%3F%3Avideo%7Cphoto)%2F(%5B0-9%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fexporttok.com%2Ftiktok%2Faccount%2Fviewer%2F%40'%2Bm%5B1%5D%2B'%2F'%2Bm%5B2%5D%7Delse%20if(m%3Dp.match(%2F%2F%40(%5B%5E%2F%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fexporttok.com%2Ftiktok%2Faccount%2F'%2Bm%5B1%5D%7D%7Delse%20if(h.indexOf('threads.com')%3E%3D0)%7Bif(m%3Dp.match(%2F%2F%40%5B%5E%2F%5D%2B%2Fpost%2F(%5B%5E%2F%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fshoelace.mint.lgbt%2Ft%2F'%2Bm%5B1%5D%7Delse%20if(m%3Dp.match(%2F%2F%40(%5B%5E%2F%3F%23%5D%2B)%2F))%7Bwindow.location.href%3D'https%3A%2F%2Fshoelace.mint.lgbt%2F%40'%2Bm%5B1%5D%7D%7D%7D)()
```

Click the bookmark on any supported page to instantly redirect. To use a different Nitter instance, visit the [landing page](https://karayelxyz.github.io/social-media-redirector) to generate a custom bookmarklet.

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
