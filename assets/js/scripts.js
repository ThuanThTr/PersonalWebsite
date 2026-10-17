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

document.addEventListener('DOMContentLoaded', () => {
  const roles = ['an urban innovator', 'a policy strategist', 'a city systems thinker', 'a data analyst'];
  const roleEl = document.getElementById('role-cycle');
  if (!roleEl) return;

  let roleIndex = 0;

  setInterval(() => {
    roleEl.classList.add('is-fading');
    setTimeout(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleEl.textContent = roles[roleIndex];
      roleEl.classList.remove('is-fading');
    }, 300);
  }, 2500);
});

// Single source of truth for dated work — add an entry here and it automatically
// becomes the "latest" one shown in the home page teaser card and at the top
// of the projects / writings lists. Undated placeholders (e.g. a "current
// focus" note) stay as static HTML instead of living in these arrays.
//   title    — project / post name
//   subtitle — one short line (type of work, tools, or topic)
//   summary  — one line for the home page teaser card
//   teaser   — 2–3 sentences shown in the lists
const projects = [
  {
    title: 'World Airports',
    subtitle: 'Interactive web map · MapLibre, Supercluster',
    summary: 'An interactive map of every airport in the OpenFlights database, built with MapLibre and Supercluster.',
    teaser: 'This map plots every airport in the OpenFlights database in one interactive view. Points are clustered with Supercluster, so thousands of locations stay readable at any zoom level. I built it as a lightweight experiment in serving large spatial datasets on the web.',
    date: '2026-10-16',
    href: 'projects/airports/'
  },
  {
    title: 'Urban Systems Portfolio',
    subtitle: 'Research · urban strategy, data & policy',
    summary: 'Research, strategy, and data-driven work focused on better city futures.',
    teaser: 'A growing body of research, strategy, and data-driven work focused on better city futures. It brings together policy analysis, spatial data, and community-centered thinking for the Greater Toronto Area and beyond.',
    date: '2025-01-01',
    href: 'projects/'
  }
];

const blogPosts = [
  // e.g. { title: 'Post title', subtitle: 'Topic · 5 min read', teaser: 'Two or three sentences.', summary: 'One line for the home teaser.', date: '2026-01-01', href: 'writings/post-slug/' }
];

// Hrefs above are relative to the site root; resolve them from this script's
// location so they work from any page depth (e.g. /projects/).
const siteRoot = new URL('../../', document.currentScript.src);
const resolveHref = (href) => new URL(href, siteRoot).href;

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
}

const getLatest = (items) => sortNewestFirst(items)[0] ?? null;

document.addEventListener('DOMContentLoaded', () => {
  const projectCard = document.getElementById('featured-project-card');
  const latestProject = getLatest(projects);
  if (projectCard && latestProject) {
    projectCard.href = resolveHref(latestProject.href);
    projectCard.querySelector('.teaser-title').textContent = latestProject.title;
    projectCard.querySelector('.teaser-text').textContent = latestProject.summary;
  }

  // Stays a "Writings & Spatial Notes" teaser until the first post is added.
  const blogCard = document.getElementById('featured-blog-card');
  const latestBlog = getLatest(blogPosts);
  if (blogCard && latestBlog) {
    blogCard.href = resolveHref(latestBlog.href);
    blogCard.removeAttribute('data-panel');
    blogCard.querySelector('.teaser-label').textContent = 'latest writing';
    blogCard.querySelector('.teaser-title').textContent = latestBlog.title;
    blogCard.querySelector('.teaser-text').textContent = latestBlog.summary || latestBlog.teaser;
  }
});

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });

const renderEntry = (item) => `
  <li class="entry-item">
    <article>
      <p class="entry-date"><time datetime="${item.date}">${formatDate(item.date)}</time></p>
      <h3 class="entry-heading"><a href="${resolveHref(item.href)}">${item.title}</a></h3>
      <p class="entry-subtitle">${item.subtitle || ''}</p>
      <p class="entry-teaser">${item.teaser || item.summary || ''}</p>
    </article>
  </li>
`;

document.addEventListener('DOMContentLoaded', () => {
  const projectList = document.getElementById('project-list');
  if (projectList) {
    projectList.innerHTML = sortNewestFirst(projects).map(renderEntry).join('');
  }

  const blogList = document.getElementById('blog-list');
  if (blogList && blogPosts.length) {
    blogList.innerHTML = sortNewestFirst(blogPosts).map(renderEntry).join('');
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
