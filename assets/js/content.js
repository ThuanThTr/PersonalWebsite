// Site content: the projects and writing shown across the site.
// Add a project or post here and it appears on the home page ("Selected work"),
// the projects page and the writings page, newest first.
// Paths are relative to the site root. Thumbnails go in assets/images/projects/ (1200×675).

// Fields: title, teaser (1–2 sentences), date (YYYY-MM-DD), href.
// Projects also take categories, thumb, thumbAlt and an optional credit ("with …").
// Posts also take subtitle (topic · read time).
const projects = [
  {
    title: 'GTHA Winter Maintenance Dashboard',
    teaser: 'What the 26 municipalities of the Greater Toronto and Hamilton Area spend on winter maintenance, per resident and per kilometre of road, from 2015 to 2025.',
    date: '2026-11-01',
    href: 'projects/winter-maintenance/',
    credit: 'with <a href="https://www.thinhlang.com/" target="_blank" rel="noopener noreferrer" class="location-link">Thinh Lang<span class="sr-note"> (opens in a new tab)</span></a>',
    categories: ['Interactive Dashboards', 'Municipal Finance'],
    thumb: 'assets/images/projects/winter-maintenance.jpg',
    thumbAlt: 'Dashboard screenshot: a map of GTHA municipalities shaded by winter spending per resident, beside a table comparing Toronto and Mississauga.'
  },
  {
    title: 'World Airports',
    teaser: 'Every airport in the OpenFlights database on one interactive map, clustered so thousands of points stay readable at any zoom.',
    date: '2026-10-16',
    href: 'projects/airports/',
    categories: ['GIS & Spatial Analysis'],
    thumb: 'assets/images/projects/world-airports.jpg',
    thumbAlt: 'World map with airports shown as clustered dots, larger clusters labelled with how many airports they hold.'
  },
  // e.g. { title: 'Project name', teaser: 'Two or three sentences.', date: '2026-01-01', href: 'projects/project-slug/',
  //         credit: 'with …' (optional), categories: ['GIS & Spatial Analysis'], thumb: 'assets/images/projects/name.jpg' (1200×675), thumbAlt: '…' }
];

const blogPosts = [
  // e.g. { title: 'Post title', subtitle: 'Topic · 5 min read', teaser: 'Two or three sentences.', date: '2026-01-01', href: 'writings/post-slug/' }
];

const PROJECT_CATEGORIES = [
  'GIS & Spatial Analysis',
  'Interactive Dashboards',
  'Municipal Finance',
  'D3 / Python',
];
