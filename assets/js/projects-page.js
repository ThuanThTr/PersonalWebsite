// Projects page: card grid + category filter.
// Shared data and helpers (renderCard, projects, PROJECT_CATEGORIES, slugify, ARROW,
// resolveHref, formatDate, isExternal, NEW_TAB) live in site.js; content (projects, categories) in content.js.

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('project-grid');
  const filterBox = document.querySelector('.pfilter');
  const filterList = document.getElementById('project-filters');
  const status = document.getElementById('projects-status');
  if (!grid || !filterList) return;

  const params = new URLSearchParams(location.search);
  const items = sortNewestFirst(projects);
  if (!items.length) return; // keep the empty message

  // Only categories that have at least one project.
  const counts = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c, items.filter((p) => p.categories?.includes(c)).length]));
  const cats = PROJECT_CATEGORIES.filter((c) => counts[c] > 0);

  // Filters only help once there are enough projects to sort.
  if (items.length < 4) {
    grid.innerHTML = items.map(renderCard).join('');
    return;
  }

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
