// Pronunciation guide: "Xin chào," toggles it open and closed (stays open until closed).
document.addEventListener('DOMContentLoaded', () => {
  const greeting = document.getElementById('greeting-toggle');
  if (!greeting) return;

  const toggle = () => {
    const isFlipped = greeting.classList.toggle('is-flipped');
    greeting.setAttribute('aria-pressed', String(isFlipped));
  };

  greeting.addEventListener('click', toggle);
  greeting.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });
});

// Shared site code. Content (projects, posts) lives in content.js, loaded first.

// Hrefs in content.js are relative to the site root; resolve them from this script's
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

// Project card: one component for the home page ("Selected work") and the projects page.
const renderCard = (p) => {
  const ext = isExternal(p.href);
  const thumb = p.thumb
    ? `<img src="${resolveHref(p.thumb)}" alt="${p.thumbAlt || ''}" width="1200" height="675" loading="lazy" decoding="async">`
    : `<span class="pcard-placeholder">Preview coming soon</span>`;
  const meta = [`<time datetime="${p.date}">${formatDate(p.date)}</time>`, p.credit].filter(Boolean)
    .join('<span class="entry-sep" aria-hidden="true">·</span>');

  return `
  <li class="pcard">
    <article>
      <h3 class="pcard-title">
        <a class="pcard-link" href="${resolveHref(p.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${p.title}${ext ? NEW_TAB : ''}</a>
      </h3>
      <div class="pcard-thumb">${thumb}</div>
      <p class="pcard-meta">${meta}</p>
      <p class="pcard-desc">${p.teaser || p.summary || ''}</p>
      <span class="pcard-cta" aria-hidden="true">View project ${ARROW}</span>
    </article>
  </li>`;
};

document.addEventListener('DOMContentLoaded', () => {
  // Home: latest projects as cards.
  const work = document.getElementById('home-work');
  if (work && projects.length) {
    work.innerHTML = sortNewestFirst(projects).slice(0, 4).map(renderCard).join('');
  }

  // Writings page: plain list.
  const blogList = document.getElementById('blog-list');
  if (blogList && blogPosts.length) {
    blogList.innerHTML = sortNewestFirst(blogPosts).map(renderEntry).join('');
  }

  // Old home-tab links (/#projects, /#writings) now go to the real pages.
  const legacy = { '#projects': 'projects/', '#writings': 'writings/' }[location.hash];
  if (legacy && document.body.classList.contains('home')) location.replace(legacy);
});
