// The illustrated builder next to the name on the home page (styles in builder.css).
// 1. His eyes and head follow the pointer.
// 2. On the first visit of a session (the inline script in index.html adds
//    .intro-play) he drops in, walks along the word and draws "Thuận." with a pencil.
(() => {
  const root = document.documentElement;
  const builder = document.querySelector('.intro-build .builder');
  if (!builder) return;

  // Points in the SVG's own units (see the viewBox and fullbody.svg).
  const VIEW = { x: 100, y: 50, width: 200, height: 525 };
  const HEAD = { x: 200, y: 130 };
  const NECK = { x: 200, y: 192 };
  const SHOULDER = { x: 139, y: 233 };
  const PENCIL_TIP = { x: 127, y: 414 }; // with the arm hanging down

  const head = builder.querySelector('.builder-head');
  const face = builder.querySelector('.builder-face');
  const eyes = builder.querySelector('.builder-eyes');
  const arm = builder.querySelector('.builder-arm');
  const pencil = builder.querySelector('.builder-pencil');

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);


  // LOOK: turn towards a point on screen, or face forward when there is none.

  const look = (() => {
    let target = null;
    let frame = 0;
    const cur = { x: 0, y: 0 };

    // Unit-ish direction from his head to the target, softened when it is close.
    const aim = () => {
      if (!target) return { x: 0, y: 0 };
      const box = builder.getBoundingClientRect();
      const dx = target.x - (box.left + ((HEAD.x - VIEW.x) / VIEW.width) * box.width);
      const dy = target.y - (box.top + ((HEAD.y - VIEW.y) / VIEW.height) * box.height);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = clamp(dist / box.height);
      return { x: (dx / dist) * reach, y: (dy / dist) * reach };
    };

    const render = () => {
      const goal = aim();
      cur.x += (goal.x - cur.x) * 0.18;
      cur.y += (goal.y - cur.y) * 0.18;

      head.setAttribute('transform', `rotate(${cur.x * 6} ${NECK.x} ${NECK.y}) translate(${cur.x * 3} ${cur.y * 2})`);
      face.setAttribute('transform', `translate(${cur.x * 5} ${cur.y * 3})`);
      eyes.setAttribute('transform', `translate(${cur.x * 5} ${cur.y * 4})`);

      const settled = Math.abs(goal.x - cur.x) + Math.abs(goal.y - cur.y) < 0.002;
      frame = settled ? 0 : requestAnimationFrame(render);
    };

    return (x, y) => {
      target = x == null ? null : { x, y };
      if (!frame) frame = requestAnimationFrame(render);
    };
  })();

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let pointer = null;
    const follow = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!root.classList.contains('intro-play')) look(pointer.x, pointer.y);
    };
    addEventListener('pointermove', follow, { passive: true });
    addEventListener('pointerdown', follow, { passive: true });
    // Pointer left the window: face forward again.
    addEventListener('pointerout', (event) => {
      if (event.relatedTarget) return;
      pointer = null;
      look(null);
    });
    // His head moves under a still pointer when the page scrolls.
    addEventListener('scroll', () => pointer && look(pointer.x, pointer.y), { passive: true });
  }


  // INTRO: draw the name.

  const word = document.querySelector('.intro-build .intro-name');
  const letters = word ? [...word.children] : [];
  if (!root.classList.contains('intro-play') || !letters.length) return;
  root.classList.add('intro-drawing');

  // Milliseconds after the drop (builder.css) begins.
  const RAISE = 850; // lift the pencil
  const DRAW = 1050; // start drawing
  const PER_LETTER = 340;
  const DRAW_END = DRAW + PER_LETTER * letters.length;
  const SETTLE = 350; // lower the arm and step back into place
  const INTRO_END = 4300; // page content has finished appearing (builder.css)

  // The arm swings around the shoulder; the tip scribbles between these angles.
  const ANGLE = 46;
  const SWING = 16;
  const STROKE = 230; // ms per scribble

  const angleAt = (ms) => ANGLE + SWING * Math.sin(((ms - DRAW) / STROKE) * 2 * Math.PI);

  // Pencil tip for an arm angle, in SVG units.
  const tipAt = (deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = PENCIL_TIP.x - SHOULDER.x;
    const dy = PENCIL_TIP.y - SHOULDER.y;
    return {
      x: SHOULDER.x + dx * Math.cos(a) - dy * Math.sin(a),
      y: SHOULDER.y + dx * Math.sin(a) + dy * Math.cos(a)
    };
  };

  // Layout in px, relative to the word's top-left corner. Letter widths depend
  // on the web font, so this is measured again once it has loaded.
  let layout;
  const measure = () => {
    const box = word.getBoundingClientRect();
    const height = parseFloat(getComputedStyle(builder).height);
    layout = {
      scale: height / VIEW.height,
      width: box.width,
      rest: box.width + parseFloat(getComputedStyle(word.parentElement).columnGap), // his left edge
      top: box.height - height, // his top edge (his feet share the word's bottom edge)
      letters: letters.map((letter) => {
        const r = letter.getBoundingClientRect();
        return { left: r.left - box.left, right: r.right - box.left };
      })
    };
  };
  measure();
  document.fonts?.ready.then(measure);

  // Where to stand so the tip at the resting angle sits at x on the word.
  const standAt = (x) => x - layout.rest - (tipAt(ANGLE).x - VIEW.x) * layout.scale;

  const drop = builder.getAnimations()[0];
  const fallbackStart = document.timeline.currentTime;
  let drawn = -Infinity; // furthest x the pencil has reached
  let frame = 0;

  const reveal = (edge) => {
    layout.letters.forEach(({ left, right }, i) => {
      const shown = (edge - left) / (right - left);
      if (shown <= 0) return;
      const style = letters[i].style;
      style.opacity = '1';
      style.clipPath = shown >= 1 ? 'none' : `inset(-0.4em ${(1 - shown) * 100}% -0.4em -0.2em)`;
    });
  };

  const render = (now) => {
    const ms = now - (drop?.startTime ?? fallbackStart);
    if (ms >= INTRO_END) return finish();
    frame = requestAnimationFrame(render);

    let x; // body offset from his resting place
    let angle;
    let ink; // pencil opacity
    let lean = 0;
    let bob = 0;

    if (ms < DRAW) {
      const t = ease(clamp((ms - RAISE) / (DRAW - RAISE)));
      x = standAt(0);
      angle = ANGLE * t;
      ink = t;
      lean = t;
    } else if (ms < DRAW_END) {
      const t = (ms - DRAW) / (DRAW_END - DRAW);
      x = standAt(lerp(0, layout.width, t));
      angle = angleAt(ms);
      ink = 1;
      lean = 1;
      bob = Math.abs(Math.sin(((ms - DRAW) / 170) * Math.PI));
    } else {
      const t = ease(clamp((ms - DRAW_END) / SETTLE));
      x = lerp(standAt(layout.width), 0, t);
      angle = lerp(angleAt(DRAW_END), 0, t);
      ink = 1 - t;
      lean = 1 - t;
    }

    builder.style.translate = `${x}px ${-bob * 8 * layout.scale}px`;
    builder.style.rotate = `${-3 * lean}deg`;
    arm.setAttribute('transform', `rotate(${angle} ${SHOULDER.x} ${SHOULDER.y})`);
    pencil.setAttribute('opacity', ink);

    const tip = tipAt(angle);
    const tipX = layout.rest + x + (tip.x - VIEW.x) * layout.scale;
    if (ms >= DRAW) drawn = ms < DRAW_END ? Math.max(drawn, tipX) : Infinity;
    reveal(drawn);

    // Watch the pencil while drawing.
    if (ms >= RAISE && ms < DRAW_END) {
      const box = word.getBoundingClientRect();
      look(box.left + tipX, box.top + layout.top + (tip.y - VIEW.y) * layout.scale);
    } else {
      look(null);
    }
  };

  // Ends the intro early on any tap or key, or normally at INTRO_END.
  function finish() {
    cancelAnimationFrame(frame);
    frame = 0;
    removeEventListener('pointerdown', finish);
    removeEventListener('keydown', finish);
    letters.forEach((letter) => {
      letter.style.removeProperty('opacity');
      letter.style.removeProperty('clip-path');
    });
    builder.style.removeProperty('translate');
    builder.style.removeProperty('rotate');
    arm.removeAttribute('transform');
    pencil.setAttribute('opacity', 0);
    root.classList.remove('intro-play', 'intro-drawing');
    look(null);
  }

  addEventListener('pointerdown', finish);
  addEventListener('keydown', finish);
  frame = requestAnimationFrame(render);
})();
