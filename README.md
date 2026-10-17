# Personal Website

A lightweight static personal website built with HTML, CSS, and JavaScript, hosted on GitHub Pages.

## Project structure

- `index.html` — home page: introduction, education, skills, and the projects / writings tabs
- `projects/` — individual project pages (e.g. `projects/airports/`)
- `writings/` — writing list page; individual posts go in subfolders here
- `about/` — redirects to the home page (about now lives there)
- `assets/css/styles.css` — all site styles
- `assets/js/scripts.js` — interactions, plus the `projects` and `blogPosts` lists that feed the home page tabs
- `assets/icons/` — local images and icons
- `Avatar Animation/` — the illustrated builder beside the name: `builder.js` / `builder.css` (cursor-following eyes and the once-per-session intro where he draws the name), plus the source SVGs

## Adding a project or post

Add an entry to `projects` or `blogPosts` in `assets/js/scripts.js` with `title`, `subtitle`, `teaser`, `summary`, `date`, and `href`. It appears in the matching home page tab, newest first. Bump the `?v=` number on the `scripts.js` / `styles.css` links after editing so browsers load the new version.

## Run locally

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
