# Jody Ritonga — Personal Portfolio

Static GitHub Pages portfolio for Jody Ritonga, an independent browser, mobile, and web application security researcher. The published site contains a personal introduction, selected work, research process, and public CVE records. Unpublished writing stays local and is excluded from Git.

## Update the portfolio

Edit `content/data/discoveries.json` for public records, then rebuild the static pages:

```sh
rtk ruby scripts/build.rb
```

The generated site is served from the repository root. To preview the project at the same `/security/` path used by GitHub Pages:

```sh
cd /Users/jody
rtk python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/security/`.

CVE metadata lives in `content/data/discoveries.json`. Blog metadata lives in `content/data/writeups.json`, article bodies live in `content/articles/`, and the publication templates live under `templates/`.

## Visual design

The portfolio uses ivory surfaces, clay accents, Instrument Serif headings, DM Sans body text, and an original line illustration. Shared styles are in `assets/css/editorial.css`; shared navigation and footer are in `templates/layout.erb`. The homepage, archives, and article templates use the same typography and spacing system. No animation loop or WebGL runtime is loaded.

The previous stylesheet remains in `assets/css/abyss.css` as an inactive legacy asset. Rebuild after editing templates. Existing publication data and article bodies remain the content source of truth.
