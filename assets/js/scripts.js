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
// becomes the "latest" one shown in the home page preview card and at the top
// of the full list on projects.html / blogs.html. Undated placeholders (e.g. a
// "planned" project) stay as static HTML instead of living in these arrays.
const projects = [
  {
    title: 'Urban Systems Portfolio',
    summary: 'Research, strategy, and data-driven work focused on better city futures.',
    tag: 'urban strategy, data & policy',
    date: '2025-01-01',
    href: 'projects/'
  }
];

const blogPosts = [
  // e.g. { title: 'Post title', summary: 'One-line summary.', readingTime: '5 min read', date: '2026-01-01', href: 'blogs/' }
];

function getLatest(items) {
  if (!items.length) return null;
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
}

document.addEventListener('DOMContentLoaded', () => {
  const projectCard = document.getElementById('featured-project-card');
  const latestProject = getLatest(projects);
  if (projectCard && latestProject) {
    projectCard.href = latestProject.href;
    projectCard.querySelector('.preview-card-title').textContent = latestProject.title;
    projectCard.querySelector('.preview-card-summary').textContent = latestProject.summary;
    projectCard.querySelector('.preview-card-tag').textContent = latestProject.tag;
  }

  const blogCard = document.getElementById('featured-blog-card');
  const latestBlog = getLatest(blogPosts);
  if (blogCard && latestBlog) {
    blogCard.href = latestBlog.href;
    blogCard.querySelector('.preview-card-title').textContent = latestBlog.title;
    blogCard.querySelector('.preview-card-summary').textContent = latestBlog.summary;
    blogCard.querySelector('.preview-card-tag').textContent = latestBlog.readingTime;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const projectList = document.getElementById('project-list');
  if (projectList) {
    projectList.innerHTML = sortNewestFirst(projects).map((p) => `
      <div class="about-item">
        <a href="${p.href}" class="about-link-big">
          <h3>${p.title}</h3>
          <p class="languages-tag">${p.tag} <span class="project-date">${p.date}</span></p>
          <p>${p.summary}</p>
        </a>
      </div>
    `).join('');
  }

  const blogList = document.getElementById('blog-list');
  const blogEmptyPlaceholder = document.getElementById('blog-empty-placeholder');
  if (blogList && blogPosts.length) {
    blogList.innerHTML = sortNewestFirst(blogPosts).map((b) => `
      <div class="about-item">
        <a href="${b.href}" class="about-link-big">
          <h3>${b.title}</h3>
          <p class="languages-tag">${b.readingTime} <span class="project-date">${b.date}</span></p>
          <p>${b.summary}</p>
        </a>
      </div>
    `).join('');
    if (blogEmptyPlaceholder) blogEmptyPlaceholder.remove();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.home .site-nav a[data-panel]');
  if (!tabs.length) return;

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
    return true;
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      const name = tab.dataset.panel;
      show(name);
      history.replaceState(null, '', name === 'home' ? location.pathname : `#${name}`);
    });
  });

  show(location.hash.slice(1)) || show('home');
});
