// Taffy-face renderer (WebGL2), adapted from the earlier face-hero kit.
// The portrait is a dense grid; each grab drags nearby vertices by a gaussian
// of their rest distance, so a long pull becomes a tapering tube, and a damped
// spring snaps it back with a wobble. While held, the face flushes (cheeks, then
// the face. Changes from the kit: no backdrop disc (the shirt fades out
// instead), and the pupils are drawn in the shader at positions supplied by
// the eye tracker, so they move with the eyes and stretch with the skin.

const GRID = 128;
const SLOTS = 4;
const SIGMA = 0.072; // grab falloff, in image UV
const SPRING = 260;
const DAMPING = 11;

const vert = `#version 300 es
in vec2 aUv;
uniform vec2 uView;
uniform vec3 uStage;
uniform vec4 uGrab[${SLOTS}];
out vec2 vUv;
out float vStretch;
void main() {
  vec2 p = uStage.xy + aUv * uStage.z;
  float s = 0.0;
  for (int i = 0; i < ${SLOTS}; i++) {
    vec2 d = aUv - uGrab[i].xy;
    float len = length(uGrab[i].zw) / uStage.z;
    float sig = ${SIGMA} * (1.0 + 0.35 * len);
    float w = exp(-dot(d, d) / (2.0 * sig * sig));
    p += uGrab[i].zw * w;
    s += w * len;
  }
  vUv = aUv;
  vStretch = s;
  vec2 c = p / uView * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const frag = `#version 300 es
precision highp float;
in vec2 vUv;
in float vStretch;
uniform sampler2D uTex;
uniform float uFlush;
uniform float uHold;    // 1 while held, fades out fast on release
uniform vec4 uCheeks;
uniform vec4 uFace;
uniform vec3 uNose;
uniform vec4 uPupils;   // two pupil centres, rest UV
uniform vec2 uPupilR;   // radius (UV), lid squash (1 open, ~0.1 shut)
uniform vec3 uInk;
uniform vec2 uFade;     // shirt fade: start, end (v)
out vec4 outColor;

float blob(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return exp(-dot(d, d) / (2.0 * r * r));
}

float pupil(vec2 c) {
  vec2 d = vUv - c;
  d.y /= max(uPupilR.y, 0.05);
  float l = length(d);
  float aa = fwidth(l) * 1.2;
  return 1.0 - smoothstep(uPupilR.x - aa, uPupilR.x + aa, l);
}

void main() {
  vec4 c = texture(uTex, vUv);
  vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);

  // Pupils: ink dots composited over the (pupil-less) portrait.
  float p = max(pupil(uPupils.xy), pupil(uPupils.zw));
  rgb = mix(rgb, uInk, p);
  float a = max(c.a, p);

  // Flush: cheeks and nose first, then the whole face. Only skin-like pixels
  // (red well above blue) take it; hair, outlines and pupils stay clean.
  float skin = smoothstep(0.14, 0.2, rgb.r - rgb.b);
  float blush = blob(vUv, uCheeks.xy, 0.055) + blob(vUv, uCheeks.zw, 0.055) + 0.8 * blob(vUv, uNose.xy, uNose.z);
  vec2 e = (vUv - uFace.xy) / uFace.zw;
  float face = 1.0 - smoothstep(0.55, 1.05, length(e));
  float m = blush * smoothstep(0.0, 0.5, uFlush) + face * smoothstep(0.4, 1.0, uFlush) * 0.9;
  m += clamp(vStretch * 0.7, 0.0, 0.45) * uHold;
  m = clamp(m, 0.0, 1.0) * skin;
  rgb *= mix(vec3(1.0), vec3(1.08, 0.56, 0.54), m);

  // Fade the shirt out at the bottom (rest UV, so a stretched shirt keeps it).
  a *= 1.0 - smoothstep(uFade.x, uFade.y, vUv.y);
  outColor = vec4(rgb * a, a);
}`;

function compile(gl) {
  const prog = gl.createProgram();
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  return prog;
}

export class FaceEngine {
  flush = 0; // strain: builds while held, recovers slowly (drives patience and mood)
  shade = 0; // what the face shows: follows `flush` while held, clears right after release
  hold = 0;
  stage = {x: 0, y: 0, size: 1};
  view = {w: 1, h: 1, dpr: 1};
  lastHeld = 0;
  slots = Array.from({length: SLOTS}, () => ({pointer: null, ax: 0, ay: 0, ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0, live: false}));

  /**
   * canvas: full-hero canvas. image: the portrait without pupils (square).
   * rig: landmarks in UV. ink: pupil colour as [r, g, b] 0–1.
   */
  constructor(canvas, image, rig, ink) {
    const gl = canvas.getContext('webgl2', {premultipliedAlpha: true, antialias: true, alpha: true});
    if (!gl) throw new Error('webgl2');
    this.canvas = canvas;
    this.gl = gl;
    this.rig = rig;
    this.ink = ink;
    this.prog = compile(gl);
    this.u = Object.fromEntries(
      ['uView', 'uStage', 'uGrab', 'uTex', 'uFlush', 'uHold', 'uCheeks', 'uFace', 'uNose', 'uPupils', 'uPupilR', 'uInk', 'uFade'].map((n) => [
        n,
        gl.getUniformLocation(this.prog, n),
      ]),
    );

    // Grid mesh in UV space; the vertex shader places and warps it.
    const n = GRID + 1;
    const uv = new Float32Array(n * n * 2);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        uv[(y * n + x) * 2] = x / GRID;
        uv[(y * n + x) * 2 + 1] = y / GRID;
      }
    const idx = new Uint16Array(GRID * GRID * 6);
    let k = 0;
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const a = y * n + x;
        idx.set([a, a + 1, a + n, a + 1, a + n + 1, a + n], k);
        k += 6;
      }
    this.indexCount = idx.length;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aUv');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    // Alpha copy of the portrait for hit testing.
    const size = (this.alphaSize = 256);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(image, 0, 0, size, size);
    this.alpha = ctx.getImageData(0, 0, size, size).data; // throws if the image tainted the canvas

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(w, h, dpr) {
    this.view = {w, h, dpr};
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  setStage(stage) {
    this.stage = stage;
  }

  /** Displacement of a rest UV point from all slots, in px. */
  displace(u, v) {
    let dx = 0;
    let dy = 0;
    for (const s of this.slots) {
      if (!s.live) continue;
      const len = Math.hypot(s.ox, s.oy) / this.stage.size;
      const sig = SIGMA * (1 + 0.35 * len);
      const w = Math.exp(-((u - s.ax) ** 2 + (v - s.ay) ** 2) / (2 * sig * sig));
      dx += s.ox * w;
      dy += s.oy * w;
    }
    return [dx, dy];
  }

  /** Rest UV under a canvas point (undoing any wobble in flight), or null if it misses the portrait. */
  pick(px, py) {
    const {x, y, size} = this.stage;
    let u = (px - x) / size;
    let v = (py - y) / size;
    for (let i = 0; i < 5; i++) {
      const [dx, dy] = this.displace(u, v);
      u = (px - dx - x) / size;
      v = (py - dy - y) / size;
    }
    if (u < 0 || v < 0 || u >= 1 || v >= 1 || v > this.rig.fade[0]) return null;
    const a = this.alpha[(Math.floor(v * this.alphaSize) * this.alphaSize + Math.floor(u * this.alphaSize)) * 4 + 3];
    return a > 120 ? {u, v} : null;
  }

  grab(pointer, u, v, px, py) {
    const free =
      this.slots.find((s) => !s.live) ??
      this.slots.filter((s) => s.pointer === null).sort((a, b) => Math.hypot(a.ox, a.oy) - Math.hypot(b.ox, b.oy))[0];
    if (!free) return;
    Object.assign(free, {pointer, ax: u, ay: v, ox: 0, oy: 0, vx: 0, vy: 0, live: true});
    this.drag(pointer, px, py);
  }

  drag(pointer, px, py) {
    const s = this.slots.find((s) => s.pointer === pointer);
    if (!s) return;
    const {x, y, size} = this.stage;
    // Clamp to the canvas, then rubber-band so the pull gets heavier the further it goes.
    const cx = Math.min(Math.max(px, 4), this.view.w - 4);
    const cy = Math.min(Math.max(py, 4), this.view.h - 4);
    const tx = cx - (x + s.ax * size);
    const ty = cy - (y + s.ay * size);
    const len = Math.hypot(tx, ty);
    const max = size * 1.1;
    const k = len > 0 ? (max * Math.tanh(len / max)) / len : 0;
    s.tx = tx * k;
    s.ty = ty * k;
  }

  release(pointer) {
    const s = this.slots.find((s) => s.pointer === pointer);
    if (s) s.pointer = null;
  }

  /** A jolt with no stretch, so the face jiggles. `strength` 1 is a tap; smaller is a hover bounce. */
  poke(u, v, strength = 1) {
    const s = this.slots.find((s) => !s.live);
    if (!s) return;
    const size = this.stage.size;
    Object.assign(s, {
      pointer: null,
      ax: u,
      ay: v,
      ox: 0,
      oy: 0,
      vx: (0.5 - u) * size * 2.2 * strength,
      vy: size * 0.9 * strength,
      live: true,
    });
  }

  get held() {
    return this.slots.some((s) => s.pointer !== null);
  }

  /** True while any part of the face is still away from rest. */
  get moving() {
    return this.slots.some((s) => s.live) || this.flush > 0;
  }

  /** Longest current pull as a fraction of the stage. */
  get stretch() {
    return Math.max(0, ...this.slots.map((s) => (s.live ? Math.hypot(s.ox, s.oy) / this.stage.size : 0)));
  }

  step(dt, now) {
    for (const s of this.slots) {
      if (!s.live) continue;
      if (s.pointer !== null) {
        // Follow the finger almost rigidly; keep the velocity for the release.
        const nx = s.ox + (s.tx - s.ox) * Math.min(1, dt * 38);
        const ny = s.oy + (s.ty - s.oy) * Math.min(1, dt * 38);
        s.vx = dt > 0 ? (nx - s.ox) / dt : 0;
        s.vy = dt > 0 ? (ny - s.oy) / dt : 0;
        s.ox = nx;
        s.oy = ny;
        continue;
      }
      const h = dt / 3;
      for (let i = 0; i < 3; i++) {
        s.vx += (-SPRING * s.ox - DAMPING * s.vx) * h;
        s.vy += (-SPRING * s.oy - DAMPING * s.vy) * h;
        s.ox += s.vx * h;
        s.oy += s.vy * h;
      }
      if (Math.hypot(s.ox, s.oy) < 0.25 && Math.hypot(s.vx, s.vy) < 6) s.live = false;
    }

    if (this.held) {
      this.lastHeld = now;
      this.flush = Math.min(1, this.flush + dt * 0.3 * Math.min(1, this.stretch / 0.4 + 0.15));
    } else if (now - this.lastHeld > 1600) {
      this.flush = Math.max(0, this.flush - dt * 0.07);
    }

    // The colour clears within ~0.12s of letting go, whatever the strain.
    if (this.held) {
      this.shade = this.flush;
      this.hold = 1;
    } else {
      this.shade = Math.max(0, this.shade - dt * 8);
      this.hold = Math.max(0, this.hold - dt * 8);
    }
  }

  /** pupils: [{u, v}, {u, v}] in rest UV; lid: 1 open → ~0.1 shut. */
  draw(pupils, lid) {
    const gl = this.gl;
    const {w, h} = this.view;
    const {x, y, size} = this.stage;
    const {cheeks, face, nose, pupilR, fade} = this.rig;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.uView, w, h);
    gl.uniform3f(this.u.uStage, x, y, size);
    const g = new Float32Array(SLOTS * 4);
    this.slots.forEach((s, i) => s.live && g.set([s.ax, s.ay, s.ox, s.oy], i * 4));
    gl.uniform4fv(this.u.uGrab, g);
    gl.uniform1f(this.u.uFlush, this.shade);
    gl.uniform1f(this.u.uHold, this.hold);
    gl.uniform4f(this.u.uCheeks, cheeks[0].x, cheeks[0].y, cheeks[1].x, cheeks[1].y);
    gl.uniform4f(this.u.uFace, face.x, face.y, face.rx, face.ry);
    gl.uniform3f(this.u.uNose, nose.x, nose.y, nose.r);
    gl.uniform4f(this.u.uPupils, pupils[0].u, pupils[0].v, pupils[1].u, pupils[1].v);
    gl.uniform2f(this.u.uPupilR, pupilR, lid);
    gl.uniform3f(this.u.uInk, ...this.ink);
    gl.uniform2f(this.u.uFade, fade[0], fade[1]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.u.uTex, 0);
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  destroy() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
