# Personal Website

A lightweight static personal website built with HTML, CSS, and JavaScript, with no build step. Deployed by Vercel from `main` to [thuantruong.com](https://www.thuantruong.com/).

## Project structure

- `index.html` — home page: hero, introduction, education, skills, and the projects / writings tabs
- `projects/` — project list page and individual project pages (e.g. `projects/airports/`)
- `writings/` — writing list page; individual posts go in subfolders here
- `about/` — redirects to the home page (about now lives there)
- `assets/css/styles.css` — shared site styles
- `assets/js/scripts.js` — shared interactions (pronunciation toggle, home page tabs), plus the `projects` and `blogPosts` lists that feed them
- `assets/hero/` — the home page hero:
  - `hero.css` — hero layout and styles
  - `hero.js` — entry point; loads the avatar and drives the mood meter
  - `avatar.js` — `<site-avatar>`: the portrait, cursor-following eyes, and hover notes
  - `engine.js` — WebGL2 renderer for the stretchable face (falls back to the plain SVG without WebGL2)
- `assets/icons/` — LinkedIn and email icons
- `assets/art/avatar.svg` — source art for the favicons
- `favicon.svg`, `favicon.ico`, `icon.png`, `apple-touch-icon.png` — favicons and the share image
- `robots.txt`, `sitemap.xml` — for search engines; add new pages to the sitemap

## Adding a project or post

Add an entry to `projects` or `blogPosts` in `assets/js/scripts.js` with `title`, `subtitle`, `teaser`, `summary`, `date`, and `href`. It appears in the matching home page tab, newest first. After editing a CSS or JS file, bump the `?v=` number where the page links to it so browsers load the new version.

## Run locally

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. A local server is required: the hero uses JavaScript modules, which don't load from `file://`.
