document.addEventListener('DOMContentLoaded', () => {
  const greeting = document.getElementById('greeting-toggle');
  if (!greeting) return;

  let revertTimeout;

  const toggle = () => {
    clearTimeout(revertTimeout);
    const isFlipped = greeting.classList.toggle('is-flipped');
    greeting.setAttribute('aria-pressed', String(isFlipped));

    if (isFlipped) {
      revertTimeout = setTimeout(() => {
        greeting.classList.remove('is-flipped');
        greeting.setAttribute('aria-pressed', 'false');
      }, 10000);
    }
  };

  greeting.addEventListener('click', toggle);
  greeting.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });
});

// Single source of truth for dated work — add an entry here and it shows up
// at the top of the projects / writings lists. Undated placeholders (e.g. a "current
// focus" note) stay as static HTML instead of living in these arrays.
//   title    — project / post name
//   subtitle — one short line (type of work, tools, or topic)
//   summary  — one line (used when there is no teaser)
//   teaser   — 2–3 sentences shown in the lists
const projects = [
  {
    title: 'GTHA Winter Maintenance Dashboard',
    subtitle: 'Interactive dashboard · with <a href="https://www.thinhlang.com/" target="_blank" rel="noopener noreferrer" class="location-link">Thinh Lang<span class="sr-note"> (opens in a new tab)</span></a>',
    teaser: 'An interactive map comparing what municipalities across the Greater Toronto and Hamilton Area spend on winter maintenance. Explore spending per resident, per kilometre of road, and as a share of operating budgets from 2015 to 2025, alongside snowfall.',
    date: '2026-11-01',
    href: 'https://winter-maintenance-dashboard.vercel.app/',
    // Projects page card
    credit: 'with <a href="https://www.thinhlang.com/" target="_blank" rel="noopener noreferrer" class="location-link">Thinh Lang<span class="sr-note"> (opens in a new tab)</span></a>',
    categories: ['Interactive Dashboards', 'Municipal Finance'],
    thumb: 'assets/projects/winter-maintenance.jpg',
    thumbAlt: 'Dashboard screenshot: a map of GTHA municipalities shaded by winter spending per resident, beside a table comparing Toronto and Mississauga.'
  },
  {
    title: 'World Airports',
    subtitle: 'Interactive web map · MapLibre, Supercluster',
    teaser: 'Every airport in the OpenFlights database on one interactive map. Points are clustered with Supercluster, so thousands of locations stay readable at any zoom level.',
    date: '2026-10-16',
    href: 'projects/airports/',
    categories: ['GIS & Spatial Analysis'],
    thumb: 'assets/projects/world-airports.jpg',
    thumbAlt: 'World map with airports shown as clustered dots, larger clusters labelled with how many airports they hold.'
  },
  // e.g. { title: 'Project name', subtitle: 'Type · tools', teaser: 'Two or three sentences.', date: '2026-01-01', href: 'projects/project-slug/',
  //         credit: 'with …' (optional), categories: ['GIS & Spatial Analysis'], thumb: 'assets/projects/name.jpg' (1200×675), thumbAlt: '…' }
];

const blogPosts = [
  // e.g. { title: 'Post title', subtitle: 'Topic · 5 min read', teaser: 'Two or three sentences.', date: '2026-01-01', href: 'writings/post-slug/' }
];

// Hrefs above are relative to the site root; resolve them from this script's
// location so they work from any page depth (e.g. /projects/).
const siteRoot = new URL('../../', document.currentScript.src);
const resolveHref = (href) => new URL(href, siteRoot).href;

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
}


const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });

const isExternal = (href) => /^https?:/.test(href);
const NEW_TAB = '<span class="sr-note"> (opens in a new tab)</span>';

const PROJECT_CATEGORIES = [
  'GIS & Spatial Analysis',
  'Interactive Dashboards',
  'Municipal Finance',
  'D3 / Python',
];

const SAMPLE_PROJECTS = [
  {
    title: 'Sample: Grocery access by transit',
    teaser: 'Sample entry for testing the layout. Travel time by transit from each neighbourhood to the nearest grocery store, mapped across Toronto.',
    date: '2026-09-01',
    href: 'projects/',
    categories: ['GIS & Spatial Analysis', 'D3 / Python'],
  },
  {
    title: 'Sample: Office vacancy and rents',
    teaser: 'Sample entry for testing the layout. How downtown office vacancy and asking rents moved together after 2020, district by district.',
    date: '2026-06-01',
    href: 'projects/',
    categories: ['Municipal Finance', 'D3 / Python'],
  },
  {
    title: 'Sample: Tree canopy and summer heat',
    teaser: 'Sample entry for testing the layout. Street tree cover compared with surface temperature from satellite imagery, block by block.',
    date: '2026-03-01',
    href: 'projects/',
    categories: ['GIS & Spatial Analysis'],
  },
].map((p) => ({ ...p, sample: true }));

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ARROW = '<svg class="pcard-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';


const renderEntry = (item) => `
  <li class="entry-item">
    <article>
      <h3 class="entry-heading"><a href="${resolveHref(item.href)}"${isExternal(item.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${item.title}${isExternal(item.href) ? NEW_TAB : ''}</a></h3>
      <p class="entry-meta"><time datetime="${item.date}">${formatDate(item.date)}</time>${item.subtitle ? `<span class="entry-sep" aria-hidden="true">·</span>${item.subtitle}` : ''}</p>
      <p class="entry-teaser">${item.teaser || item.summary || ''}</p>
    </article>
  </li>
`;

// Home page tabs: projects and writing as stacked rows (thumbnail left, text right),
// with category filters above the projects. Other pages keep the plain list.
const renderRow = (item, cta) => {
  const ext = isExternal(item.href);
  const href = resolveHref(item.href);
  const target = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
  const thumb = item.thumb
    ? `<img src="${resolveHref(item.thumb)}" alt="" width="1200" height="675" loading="lazy" decoding="async">`
    : (item.sample ? '<span class="pcard-placeholder">Sample thumbnail</span>' : '');
  const meta = [`<time datetime="${item.date}">${formatDate(item.date)}</time>`, item.subtitle].filter(Boolean)
    .join('<span class="entry-sep" aria-hidden="true">·</span>');

  return `
  <li class="row${thumb ? '' : ' row--text'}">
    <article>
      ${thumb ? `<a class="row-thumb" href="${href}"${target} tabindex="-1" aria-hidden="true">${thumb}</a>` : ''}
      <div class="row-body">
        <h3 class="row-title">${item.title}</h3>
        <p class="row-meta">${meta}</p>
        <p class="row-desc">${item.teaser || item.summary || ''}</p>
        <a class="row-btn" href="${href}"${target}>${cta}<span class="sr-note">: ${item.title}</span>${ext ? NEW_TAB : ''} ${ARROW}</a>
      </div>
    </article>
  </li>`;
};

function setupHomeProjects(list) {
  const items = sortNewestFirst([...projects, ...(new URLSearchParams(location.search).has('samples') ? SAMPLE_PROJECTS : [])]);
  if (!items.length) return;
  list.className = 'rows';

  const filters = document.getElementById('home-project-filters');
  const status = document.getElementById('home-projects-status');
  const cats = PROJECT_CATEGORIES.filter((c) => items.some((p) => p.categories?.includes(c)));

  const show = (slug, announce) => {
    const cat = cats.find((c) => slugify(c) === slug);
    const shown = cat ? items.filter((p) => p.categories?.includes(cat)) : items;
    list.innerHTML = shown.map((p) => renderRow(p, 'View project')).join('');
    filters?.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === (cat ? slug : 'all'))));
    if (announce && status) status.textContent = `Showing ${shown.length} ${shown.length === 1 ? 'project' : 'projects'}${cat ? ` in ${cat}` : ''}.`;
  };

  if (filters && cats.length > 1) {
    const chip = (slug, label) => `<li><button type="button" class="chip" data-cat="${slug}" aria-pressed="false">${label}</button></li>`;
    filters.innerHTML = chip('all', 'All') + cats.map((c) => chip(slugify(c), c)).join('');
    filters.hidden = false;
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (btn) show(btn.dataset.cat, true);
    });
  }
  show('all', false);
}

document.addEventListener('DOMContentLoaded', () => {
  const isHome = document.body.classList.contains('home');

  const projectList = document.getElementById('project-list');
  if (projectList && isHome) setupHomeProjects(projectList);

  const blogList = document.getElementById('blog-list');
  if (blogList && blogPosts.length) {
    if (isHome) blogList.className = 'rows';
    blogList.innerHTML = sortNewestFirst(blogPosts)
      .map((p) => (isHome ? renderRow(p, 'Read post') : renderEntry(p))).join('');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.home .site-nav a[data-panel]');
  if (!tabs.length) return;

  // The "home" link only appears once a visitor has moved to another tab.
  const homeItem = document.querySelector('.home .site-nav a[data-panel="home"]')?.closest('li');

  const show = (name) => {
    const panel = document.getElementById(`panel-${name}`);
    if (!panel) return false;

    document.querySelectorAll('.home-panel').forEach((p) => {
      const active = p === panel;
      p.hidden = !active;
      p.classList.toggle('is-active', active);
    });
    tabs.forEach((t) => {
      if (t.dataset.panel === name) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    if (homeItem) homeItem.hidden = name === 'home';
    return true;
  };

  // Nav tabs plus in-page links like the writing teaser.
  document.querySelectorAll('.home a[data-panel]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (!link.dataset.panel) return;
      event.preventDefault();
      const name = link.dataset.panel;
      show(name);
      history.replaceState(null, '', name === 'home' ? location.pathname : `#${name}`);
    });
  });

  show(location.hash.slice(1)) || show('home');
});
