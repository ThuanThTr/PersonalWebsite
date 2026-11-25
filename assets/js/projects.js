// Projects page: card grid + category filter.
// Shared data and helpers (projects, PROJECT_CATEGORIES, SAMPLE_PROJECTS, slugify, ARROW,
// resolveHref, formatDate, isExternal, NEW_TAB) live in scripts.js.
// Add `?samples` to the URL to mix in placeholder projects for testing the layout.

const renderCard = (p) => {
  const ext = isExternal(p.href);
  const thumb = p.thumb
    ? `<img src="${resolveHref(p.thumb)}" alt="${p.thumbAlt || ''}" width="1200" height="675" loading="lazy" decoding="async">`
    : `<span class="pcard-placeholder">${p.sample ? 'Sample thumbnail' : 'Preview coming soon'}</span>`;
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
  const grid = document.getElementById('project-grid');
  const filterBox = document.querySelector('.pfilter');
  const filterList = document.getElementById('project-filters');
  const status = document.getElementById('projects-status');
  if (!grid || !filterList) return;

  const params = new URLSearchParams(location.search);
  const items = sortNewestFirst([...projects, ...(params.has('samples') ? SAMPLE_PROJECTS : [])]);
  if (!items.length) return; // keep the empty message

  // Only categories that have at least one project.
  const counts = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c, items.filter((p) => p.categories?.includes(c)).length]));
  const cats = PROJECT_CATEGORIES.filter((c) => counts[c] > 0);

  const button = (slug, label, count) =>
    `<li><button type="button" class="pfilter-btn" data-cat="${slug}" aria-pressed="false">
      <span>${label}</span><span class="pfilter-count">${count}</span></button></li>`;
  filterList.innerHTML = button('all', 'All', items.length) + cats.map((c) => button(slugify(c), c, counts[c])).join('');
  filterBox.hidden = false;

  const show = (slug, announce) => {
    const cat = cats.find((c) => slugify(c) === slug);
    const list = cat ? items.filter((p) => p.categories?.includes(cat)) : items;
    grid.innerHTML = list.map(renderCard).join('');
    filterList.querySelectorAll('.pfilter-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.cat === (cat ? slug : 'all'))));
    if (announce) status.textContent = `Showing ${list.length} ${list.length === 1 ? 'project' : 'projects'}${cat ? ` in ${cat}` : ''}.`;

    // Keep the choice in the address so it can be shared or survive a reload.
    const next = new URLSearchParams(location.search);
    if (cat) next.set('category', slug); else next.delete('category');
    const q = next.toString();
    history.replaceState(null, '', q ? `?${q}` : location.pathname);
  };

  filterList.addEventListener('click', (e) => {
    const btn = e.target.closest('.pfilter-btn');
    if (btn) show(btn.dataset.cat, true);
  });

  show(params.get('category') || 'all', false);
});
