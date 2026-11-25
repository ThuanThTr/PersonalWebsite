# Personal Website

A lightweight static personal website built with HTML, CSS, and JavaScript, with no build step. Deployed by Vercel from `main` to [thuantruong.com](https://www.thuantruong.com/).

## Project structure

```
index.html                  Home: hero, about, selected work, background
projects/
  index.html                All projects (card grid; category filter appears at 4+ projects)
  winter-maintenance/       GTHA Winter Maintenance Dashboard case page
  airports/                 World Airports case page with the live map
    data/                   airports.json (OpenFlights, trimmed) and countries.geo.json
writings/index.html         Writing list; individual posts go in subfolders here
about/index.html            Redirects old /about links to the home page

assets/
  css/styles.css            Shared site styles (header, footer, headlines, cards, case pages)
  js/content.js             The projects and writing lists: edit this to add work
  js/site.js                Shared code: pronunciation toggle, card rendering, home and writings lists
  js/projects-page.js       Projects page grid and category filter
  hero/                     Home hero: hero.css, hero.js, avatar.js (<site-avatar>), engine.js (WebGL face)
  preloader/                First-visit intro animation (GSAP, loaded only when it plays)
  images/
    projects/               Project thumbnails and share images (1200×675)
    icons/                  LinkedIn and email icons (SVG)
    avatar.svg              Source art for the favicons and avatar

favicon.svg, favicon.ico, apple-touch-icon.png, icon.png   Favicons and the default share image
robots.txt, sitemap.xml                                    For search engines; add new pages to the sitemap
```

## Adding a project or post

1. Add an entry to `projects` or `blogPosts` in `assets/js/content.js` (`title`, `teaser`, `date`, `href`, plus `categories`, `thumb` and `thumbAlt` for projects). It appears on the home page and the projects or writings page, newest first.
2. For a project page, copy `projects/winter-maintenance/` as a starting point and put its thumbnail in `assets/images/projects/`.
3. Add the new page to `sitemap.xml`.

After editing a CSS or JS file, bump the `?v=` number where the pages link to it so browsers load the new version.

## Run locally

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. A local server is required: the hero uses JavaScript modules and the airports map loads its data with `fetch`, neither of which work from `file://`.
