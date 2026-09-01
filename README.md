# Jody Ritonga — Personal Portfolio

Static GitHub Pages portfolio for Jody Ritonga, an independent browser, mobile, and web application security researcher. The site combines a personal introduction, selected work, research process, and public CVE records.

## Update the portfolio

Edit `content/data/discoveries.json`, then rebuild the static pages:

```sh
rtk ruby scripts/build.rb
```

The generated site is served from the repository root. To preview the project at the same `/security/` path used by GitHub Pages:

```sh
cd /Users/jody
rtk python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/security/`.

CVE metadata lives in `content/data/discoveries.json`, and the publication templates live under `templates/`.
