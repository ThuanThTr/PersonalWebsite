// <site-avatar>: the illustrated portrait. It has:
// - eyes that follow the pointer (blink + idle glances when nobody steers);
// - handwritten notes ("system thinker.", "urban innovator."…) that all
//   appear around it on hover, focus or tap;
// - a stretchable face (WebGL2, see engine.js): grab and pull it like taffy, it
//   snaps back with a wobble and flushes the longer it's mistreated.
// Without WebGL2 the inline SVG stays visible and the eyes still track.
// Light DOM, so the site's CSS applies. Emits `moodchange` ({mood, patience}).
import {FaceEngine} from './engine.js';

// The portrait lives in a square 260-unit frame; UV = (x - 70, y - 98) / 260.
const VB = {x: 70, y: 98, size: 260};
const INK = '#4A3728';

const pupils = `
  <circle class="avatar-pupil" cx="172" cy="197" r="4" fill="${INK}"/>
  <circle class="avatar-pupil" cx="228" cy="197" r="4" fill="${INK}"/>`;

const portrait = (withPupils, attrs = '') => `
<svg ${attrs} viewBox="${VB.x} ${VB.y} ${VB.size} ${VB.size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="182" y="240" width="36" height="56" fill="#E9CBAE"/>
  <path d="M96 400 L96 332 Q96 302 128 294 L170 284 Q200 310 230 284 L272 294 Q304 302 304 332 L304 400 Z" fill="#8B6A4F" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M170 284 Q200 310 230 284" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="130" cy="196" r="12" fill="#E9CBAE" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="270" cy="196" r="12" fill="#E9CBAE" stroke="${INK}" stroke-width="2.5"/>
  <ellipse cx="200" cy="185" rx="70" ry="72" fill="#E9CBAE" stroke="${INK}" stroke-width="2.5"/>
  <path d="M130 182 Q126 116 170 113 L232 111 Q274 116 270 182 L262 160 L252 170 L244 146 L200 132 L156 146 L148 170 L138 160 Z" fill="#3A2E26" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="152" cy="226" r="8" fill="#E8B4A0" opacity="0.6"/>
  <circle cx="248" cy="226" r="8" fill="#E8B4A0" opacity="0.6"/>${withPupils ? pupils : ''}
  <circle cx="172" cy="194" r="24" fill="none" stroke="${INK}" stroke-width="3.5"/>
  <circle cx="228" cy="194" r="24" fill="none" stroke="${INK}" stroke-width="3.5"/>
  <line x1="196" y1="194" x2="204" y2="194" stroke="${INK}" stroke-width="3"/>
  <line x1="148" y1="190" x2="138" y2="186" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <line x1="252" y1="190" x2="262" y2="186" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M186 230 Q200 242 214 230" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

/** Landmarks in portrait UV (0–1, v from the top). */
const RIG = {
  cheeks: [
    {x: 0.315, y: 0.492},
    {x: 0.685, y: 0.492},
  ],
  nose: {x: 0.5, y: 0.446, r: 0.046},
  face: {x: 0.5, y: 0.375, rx: 0.25, ry: 0.237},
  hairLine: 0.138,
  /** |u − 0.5| beyond which a grab above the jaw is the ears / side hair. */
  sides: 0.195,
  pupilR: 4 / VB.size,
  fade: [0.8, 0.985],
};

// The hover notes, all shown at once. `pos` places each one around the avatar
// (top-left, top-right, left, right); its arrow points in but stops short of the drawing.
const NOTES = [
  {text: 'urban innovator.', pos: 'tl'},
  {text: 'system thinker.', pos: 'tr'},
  {text: 'data analyst.', pos: 'l'},
  {text: 'nature lover.', pos: 'r'},
];
// Hand-drawn arrows in a 64×56 box, drawn pointing left; CSS mirrors them for the left-hand notes.
const CURVE = '<path pathLength="1" d="M58 5 C 46 3, 22 10, 12 46" /><path pathLength="1" d="M4 37 L12 47 L21 39" />';
const SIDE = '<path pathLength="1" d="M60 30 C 46 18, 24 18, 8 30" /><path pathLength="1" d="M17 21 L7 30 L18 37" />';
const ARROWS = {tl: CURVE, tr: CURVE, l: SIDE, r: SIDE};

const MOODS = {
  base: 'chill',
  look: 'watching you',
  cross: 'suspicious',
  shock: 'startled',
  tongue: 'goofy',
  laugh: 'cackling',
  skeptic: 'unconvinced',
  whistle: 'innocent',
  smug: 'smug',
  dizzy: 'seeing stars',
  grimace: 'being squeezed',
  ouch: 'OW',
  squish: 'pinched',
};
const RELEASE = ['tongue', 'laugh', 'skeptic', 'whistle', 'smug', 'cross'];

// Pupil travel, in SVG units. The lenses have r=24, so 6 keeps the dot well inside.
const MAX_LOOK = 6;
const FULL_LOOK_PX = 180; // pointer distance at which the pupils reach MAX_LOOK
const EASE = 0.15;
const IDLE_MS = 3000; // with no pointer input for this long, the eyes wander
const HOLD_MS = 5000; // after a release, back to neutral after this long

const rand = (a, b) => a + Math.random() * (b - a);

/** Which mood a grab pulls, by where it lands. */
function grabMood(u, v) {
  const side = Math.abs(u - 0.5);
  if (v < RIG.hairLine || (side > RIG.sides && v < 0.6)) return 'ouch';
  if (side > 0.07 && v > 0.44 && v < 0.66) return 'squish';
  return 'grimace';
}

/** Rasterise the pupil-less portrait for the WebGL texture. */
async function rasterise(px) {
  const svg = portrait(false, `width="${px}" height="${px}"`);
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = px;
    c.getContext('2d').drawImage(img, 0, 0, px, px);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

class SiteAvatar extends HTMLElement {
  connectedCallback() {
    if (this.figure) return;
    this.innerHTML = `
      <div class="avatar-figure" tabindex="0" role="img"
           aria-label="Illustrated portrait of Thuận: short dark hair, round glasses and a smile. You can grab and stretch his face."
           aria-describedby="avatar-notes">${portrait(true, 'class="avatar-svg" aria-hidden="true" focusable="false"')}</div>
      <span class="avatar-notes" id="avatar-notes">${NOTES.map(
        ({text, pos}) => `
        <span class="avatar-note avatar-note--${pos}">${text}<svg class="avatar-note-arrow" viewBox="0 0 64 56" fill="none" aria-hidden="true" focusable="false">${ARROWS[pos]}</svg></span>`,
      ).join('')}
      </span>
      <span class="avatar-hint" aria-hidden="true">pull my face
        <svg viewBox="0 0 60 40" fill="none"><path d="M4 4c18 2 34 12 44 30" /><path d="M40 31l8 4 1-9" /></svg>
      </span>`;
    this.figure = this.querySelector('.avatar-figure');
    this.svg = this.querySelector('.avatar-svg');
    this.hint = this.querySelector('.avatar-hint');
    this.eyes = [...this.querySelectorAll('.avatar-pupil')].map((el) => ({
      el,
      cx: +el.getAttribute('cx'),
      cy: +el.getAttribute('cy'),
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
    }));

    this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this.noHover = matchMedia('(hover: none)');

    this.pointer = null; // {x, y} client px while someone steers the eyes
    this.lastInput = 0;
    this.nextGlance = 0;
    this.blinkAt = performance.now() + rand(2000, 4500);
    this.lid = 1;

    // Mood state
    this.mood = 'base';
    this.mode = 'neutral'; // 'neutral' | 'held' | 'after'
    this.afterAt = 0;
    this.pulls = 0;
    this.lastRelease = null;
    this.softFlush = 0; // patience drain when there is no WebGL engine
    this.reported = '';

    this.downs = new Map();

    this.bindEyes();
    this.bindNote();
    this.bindGrab();

    this.visible = true;
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.syncLoop();
    }).observe(this);
    this.reduce.addEventListener('change', () => this.syncLoop());
    this.syncLoop();
    setInterval(() => this.tickMood(), 120);
    this.tickMood();

    this.initEngine();
  }

  // ---------------------------------------------------------------- engine
  async initEngine() {
    const hero = this.closest('.hero') ?? this.parentElement;
    let image;
    try {
      image = await rasterise(1024);
    } catch {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'avatar-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.append(canvas);
    const ring = document.createElement('div');
    ring.className = 'avatar-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(ring);
    try {
      const ink = [1, 3, 5].map((i) => parseInt(INK.slice(i, i + 2), 16) / 255);
      this.engine = new FaceEngine(canvas, image, RIG, ink);
    } catch {
      canvas.remove();
      ring.remove();
      return;
    }
    this.canvas = canvas;
    this.ring = ring;
    this.classList.add('is-gl');

    const layout = () => {
      const c = canvas.getBoundingClientRect();
      const r = this.getBoundingClientRect();
      this.stage = {x: r.left - c.left, y: r.top - c.top, size: r.width};
      this.engine.resize(c.width, c.height, Math.min(window.devicePixelRatio || 1, 2));
      this.engine.setStage(this.stage);
    };
    this.layout = layout;
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);
    ro.observe(this);
    document.fonts?.ready.then(layout);
    layout();
    this.syncLoop();
  }

  // ------------------------------------------------------------------ eyes
  bindEyes() {
    const steer = (x, y) => {
      this.pointer = {x, y};
      this.lastInput = performance.now();
    };
    window.addEventListener('pointermove', (e) => e.pointerType !== 'touch' && steer(e.clientX, e.clientY), {passive: true});
    // Touch: follow the finger only while it is down (touchmove keeps firing while the page scrolls).
    const touch = (e) => e.touches[0] && steer(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener('touchstart', touch, {passive: true});
    window.addEventListener('touchmove', touch, {passive: true});
    window.addEventListener('touchend', () => (this.pointer = null), {passive: true});
    document.documentElement.addEventListener('mouseleave', () => (this.pointer = null));
  }

  syncLoop() {
    const run = this.visible;
    if (run && !this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }
    if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  updateEyes(now) {
    const reduce = this.reduce.matches;
    const steering = !reduce && this.pointer && now - this.lastInput < IDLE_MS;
    if (reduce) {
      for (const eye of this.eyes) eye.tx = eye.ty = eye.x = eye.y = 0;
      this.lid = 1;
      return;
    }
    if (steering) {
      const ctm = this.svg.getScreenCTM();
      if (ctm) {
        for (const eye of this.eyes) {
          const dx = this.pointer.x - (ctm.a * eye.cx + ctm.e);
          const dy = this.pointer.y - (ctm.d * eye.cy + ctm.f);
          const dist = Math.hypot(dx, dy);
          const reach = MAX_LOOK * Math.min(1, dist / FULL_LOOK_PX);
          eye.tx = dist ? (dx / dist) * reach : 0;
          eye.ty = dist ? (dy / dist) * reach : 0;
        }
      }
    } else if (now > this.nextGlance) {
      // Idle: an occasional small glance, often back to centre.
      const look = Math.random() < 0.4 ? 0 : rand(0.35, 0.8) * MAX_LOOK;
      const angle = rand(0, Math.PI * 2);
      for (const eye of this.eyes) {
        eye.tx = Math.cos(angle) * look;
        eye.ty = Math.sin(angle) * look * 0.7;
      }
      this.nextGlance = now + rand(2500, 5000);
    }
    // Blink: squash the pupils for ~140ms every few seconds.
    this.lid = 1;
    if (now >= this.blinkAt) {
      const t = (now - this.blinkAt) / 140;
      if (t >= 1) this.blinkAt = now + rand(2800, 6500);
      else this.lid = 0.12 + 0.88 * Math.abs(1 - 2 * t);
    }
    for (const eye of this.eyes) {
      eye.x += (eye.tx - eye.x) * EASE;
      eye.y += (eye.ty - eye.y) * EASE;
    }
  }

  frame(now) {
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min((now - (this.last || now)) / 1000, 1 / 30);
    this.last = now;
    this.updateEyes(now);
    this.softFlush = Math.max(0, this.softFlush - dt * 0.07);

    if (this.engine) {
      this.engine.step(dt, now);
      const pts = this.eyes.map((e) => ({u: (e.cx + e.x - VB.x) / VB.size, v: (e.cy + e.y - VB.y) / VB.size}));
      this.engine.draw(pts, this.lid);
    } else {
      for (const eye of this.eyes) {
        const px = eye.cx + eye.x;
        const py = eye.cy + eye.y;
        eye.el.setAttribute('transform', `translate(${px} ${py}) scale(1 ${this.lid}) translate(${-eye.cx} ${-eye.cy})`);
      }
    }
  }

  // ------------------------------------------------------------------ note
  bindNote() {
    const f = this.figure;
    f.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.setNote(true);
      // A tiny bounce on hover.
      if (this.engine && !this.reduce.matches && !this.engine.held) this.engine.poke(0.5, 0.3, 0.12);
    });
    f.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && !f.matches(':focus-visible') && this.setNote(false));
    f.addEventListener('focus', () => f.matches(':focus-visible') && this.setNote(true));
    f.addEventListener('blur', () => this.setNote(false));

    // Touch screens have no hover: peek once after load, then a tap toggles it.
    if (this.noHover.matches) {
      this.setNote(true);
      this.peek = setTimeout(() => this.setNote(false), 2500);
    }
  }

  setNote(on) {
    clearTimeout(this.peek);
    this.classList.toggle('is-noted', on);
  }

  // ------------------------------------------------------------------ grab
  local(e) {
    const c = this.canvas.getBoundingClientRect();
    return {x: e.clientX - c.left, y: e.clientY - c.top};
  }

  setRing(e, over) {
    if (!this.ring || e.pointerType !== 'mouse') return;
    this.ring.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    const on = over || this.engine.held;
    this.ring.dataset.on = on ? '1' : '';
    this.ring.dataset.held = this.engine.held ? '1' : '';
    this.figure.style.cursor = on ? 'none' : '';
  }

  bindGrab() {
    const f = this.figure;

    f.addEventListener('pointerdown', (e) => {
      // Main button only: a right-click opens the context menu, which swallows the release.
      if (!this.engine || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.layout();
      const p = this.local(e);
      const at = this.engine.pick(p.x, p.y);
      if (!at) return;
      e.preventDefault();
      f.setPointerCapture(e.pointerId);
      this.engine.grab(e.pointerId, at.u, at.v, p.x, p.y);
      this.downs.set(e.pointerId, {t: performance.now(), x: p.x, y: p.y, moved: 0, u: at.u, v: at.v, touch: e.pointerType !== 'mouse'});
      if (this.downs.size === 1) this.show(grabMood(at.u, at.v));
      this.mode = 'held';
      this.setRing(e, true);
    });

    f.addEventListener('pointermove', (e) => {
      if (!this.engine) return;
      const p = this.local(e);
      const d = this.downs.get(e.pointerId);
      if (d) {
        d.moved = Math.max(d.moved, Math.hypot(p.x - d.x, p.y - d.y));
        this.engine.drag(e.pointerId, p.x, p.y);
      }
      this.setRing(e, !!this.engine.pick(p.x, p.y));
    });

    const up = (e) => {
      const d = this.downs.get(e.pointerId);
      if (!d) return;
      this.downs.delete(e.pointerId);
      this.engine.release(e.pointerId);
      const p = this.local(e);
      this.setRing(e, !!this.engine.pick(p.x, p.y));
      if (this.downs.size) return;
      const tap = performance.now() - d.t < 240 && d.moved < 8;
      if (tap) {
        this.engine.poke(d.u, d.v);
        this.show('shock');
        if (d.touch && this.noHover.matches) this.setNote(!this.classList.contains('is-noted'));
      } else {
        this.pulls += 1;
        this.hint.dataset.gone = '1';
        let next;
        if (this.engine.flush > 0.8) next = 'dizzy';
        else {
          const pool = RELEASE.filter((k) => k !== this.lastRelease);
          next = pool[Math.floor(Math.random() * pool.length)];
        }
        this.lastRelease = next;
        this.show(next);
      }
      this.mode = 'after';
      this.afterAt = performance.now();
    };
    f.addEventListener('pointerup', up);
    f.addEventListener('pointercancel', up);
    // Never leave a pull stuck: if the browser drops the pointer, the release lands
    // elsewhere, or the window loses focus mid-pull, treat it as letting go.
    f.addEventListener('lostpointercapture', up);
    window.addEventListener('pointerup', up);
    const releaseAll = () => {
      for (const pointerId of [...this.downs.keys()]) up({pointerId, pointerType: 'none', clientX: 0, clientY: 0});
    };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => document.hidden && releaseAll());
    f.addEventListener('pointerleave', () => this.ring && (this.ring.dataset.on = ''));

    // Touch: block the page scroll only when the finger lands on the face.
    f.addEventListener(
      'touchstart',
      (e) => {
        if (!this.engine) return;
        const c = this.canvas.getBoundingClientRect();
        const t = e.touches[0];
        if (t && this.engine.pick(t.clientX - c.left, t.clientY - c.top)) e.preventDefault();
      },
      {passive: false},
    );

    // Clicks: without WebGL a click is a poke. With it, a click that misses the
    // face goes to whatever is underneath (the stage overlaps the headline).
    f.addEventListener('click', (e) => {
      if (!this.engine) {
        this.softFlush = Math.min(1, this.softFlush + 0.12);
        this.show('shock');
        this.mode = 'after';
        this.afterAt = performance.now();
        if (this.noHover.matches) this.setNote(!this.classList.contains('is-noted'));
        return;
      }
      const p = this.local(e);
      if (this.engine.pick(p.x, p.y)) return;
      f.style.pointerEvents = 'none';
      const below = document.elementFromPoint(e.clientX, e.clientY);
      f.style.pointerEvents = '';
      below?.click();
    });

    f.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (this.engine) this.engine.poke(0.5, 0.45);
      else this.softFlush = Math.min(1, this.softFlush + 0.12);
      this.show('shock');
      this.mode = 'after';
      this.afterAt = performance.now();
    });
  }

  // ------------------------------------------------------------------ mood
  show(key) {
    this.mood = key;
    this.report();
  }

  /** Idle mood: watching the cursor when it's off to one side, suspicious when it's on the nose. */
  neutralMood() {
    if (!this.pointer || performance.now() - this.lastInput > IDLE_MS) return 'base';
    const r = this.getBoundingClientRect();
    const u = (this.pointer.x - r.left) / r.width;
    const v = (this.pointer.y - r.top) / r.height;
    if (Math.hypot(u - RIG.nose.x, v - RIG.nose.y) < RIG.nose.r * 1.4) return 'cross';
    return Math.abs(u - 0.5) > 0.42 ? 'look' : 'base';
  }

  tickMood() {
    if (this.mode === 'after' && !this.engine?.held && performance.now() - this.afterAt > HOLD_MS) this.mode = 'neutral';
    if (this.mode === 'neutral') this.mood = this.neutralMood();
    this.report();
  }

  report() {
    const flush = this.engine ? this.engine.flush : this.softFlush;
    const detail = {mood: MOODS[this.mood], patience: Math.round((1 - flush) * 100)};
    const key = `${detail.mood}|${detail.patience}`;
    if (key === this.reported) return;
    this.reported = key;
    this.dispatchEvent(new CustomEvent('moodchange', {bubbles: true, detail}));
  }
}

customElements.define('site-avatar', SiteAvatar);
