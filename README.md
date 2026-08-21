# Jody Ritonga Security Research

Static GitHub Pages publication site for browser, mobile, and web application security research.

## Update the archive

The Medium feed is imported into local article HTML and local image assets:

```sh
rtk ruby scripts/import_medium.rb
rtk ruby scripts/build.rb
```

The generated site is served from the repository root. To preview the project at the same `/security/` path used by GitHub Pages:

```sh
cd /Users/jody
rtk python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/security/`.

Articles live under `content/articles/`, metadata under `content/data/`, and the publication templates under `templates/`. The original Medium URL remains in every article's record page.
