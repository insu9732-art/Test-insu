/*
 * toonkit.js — "2D characters in a colourful 3D world" look for script-to-motion + three.js (Stage3D).
 * Our own port of the look values in .claude/skills/cartoon-3d-short (MIT, mromidev/claude-animated-shorts):
 *   - Post: world-only ink outlines (depth 2nd-difference + crease, near-black #030303, 5.1 px @ 6 m -> 3.3 px @ 90 m),
 *     lens blur on close-ups (focus on the eyes), Khronos neutral tone map + saturation grade, no film grain.
 *   - Cast: flat Canvas2D bean-head characters (h/w .94, 3.5 head-heights, stick limbs .055 head width, ink-dot hands,
 *     plum ink #241726 thicker away from the light, no blush, no catchlights, 4-frame blinks every 0.5-2.3 s),
 *     camera-facing cards lit by the scene light, cut-out shadows + a tight contact shadow.
 *   - FX: flat 2D effect cards (splash crowns, impact burst, puffs) composited into the 3D world.
 * Characters, clothes and props are our own (Joseon officials, crown prince, servants).
 */
(function () {
  'use strict';
  const NOINK = 3;
  const INK = '#241726', SKIN = '#ffe2c2';
  const rad = (d) => (d * Math.PI) / 180;
  const rnd = (seed, k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const mul = (c, m) => { const n = parseInt(c.slice(1), 16); const ch = (v, k) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0');
    return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`; };
  const SH_SKIN = [0.96, 0.86, 0.84], SH_CLOTH = [0.64, 0.66, 0.74];
  const LIGHT = rad(-120), THICK = Math.atan2(-Math.sin(LIGHT) + 0.8, -Math.cos(LIGHT));

  // ---------------- Pen: Canvas2D drawing in a 600 x 1000 design space ----------------
  function Pen(g) { this.g = g; }
  Pen.prototype.path = function (pts, close) { const g = this.g; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close) g.closePath(); };
  Pen.prototype.fill = function (pts, col) { this.path(pts, true); this.g.fillStyle = col; this.g.fill(); };
  Pen.prototype.grad = function (pts, base, shadow, flat = 0.25) { // lit edge toward LIGHT -> shadow far edge
    const g = this.g, dx = Math.cos(LIGHT), dy = Math.sin(LIGHT); let lo = 1e9, hi = -1e9, cx = 0, cy = 0;
    pts.forEach(([x, y]) => { const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); cx += x / pts.length; cy += y / pts.length; });
    const dc = cx * dx + cy * dy; const gr = g.createLinearGradient(cx + dx * (hi - dc), cy + dy * (hi - dc), cx + dx * (lo - dc), cy + dy * (lo - dc));
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow); this.path(pts, true); g.fillStyle = gr; g.fill(); };
  Pen.prototype.shaded = function (pts, base, shadow, R) { // soft crescent away from the light (heads)
    const g = this.g; let cx = 0, cy = 0; pts.forEach(([x, y]) => { cx += x / pts.length; cy += y / pts.length; });
    const gx = cx + Math.cos(LIGHT) * 0.45 * R, gy = cy + Math.sin(LIGHT) * 0.45 * R; const gr = g.createRadialGradient(gx, gy, 0, gx, gy, 1.25 * R);
    gr.addColorStop(0, base); gr.addColorStop(1.05 / 1.25, base); gr.addColorStop(1, shadow); this.path(pts, true); g.fillStyle = gr; g.fill(); };
  Pen.prototype.ring = function (pts, w0, k = 0.45) { // thick-thin ink, thickest away from the light
    const n = pts.length; let cx = 0, cy = 0; pts.forEach(([x, y]) => { cx += x / n; cy += y / n; });
    const out = [], inn = [];
    pts.forEach((q, i) => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - THICK)); out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]); });
    const g = this.g; g.beginPath(); out.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    inn.reverse().forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = INK; g.fill('evenodd'); };
  Pen.prototype.limb = function (pts, col, w) { const g = this.g; g.lineCap = 'round'; g.lineJoin = 'round';
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 11; g.stroke(); this.path(pts, false); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
  Pen.prototype.stroke = function (pts, w, col = INK) { const g = this.g; g.lineCap = 'round'; g.lineJoin = 'round'; this.path(pts, false); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
  Pen.prototype.dot = function (x, y, r, col = INK) { const g = this.g; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); };
  const ell = (cx, cy, rx, ry, a0 = 0, a1 = 360, n = 48) => { const p = []; for (let i = 0; i <= n; i++) { const a = rad(a0 + (a1 - a0) * i / n); p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; };
  // clockwise contour for ink rings: reverse ell order if needed (ell runs clockwise on screen already: +y down)
  const bean = (cx, cy, a, seed) => { const B = { b: a * (0.935 + 0.02 * (rnd(seed, 1) - 0.5)), nTop: 1.75, nBot: 2.3, egg: -0.12, asym: 0.06 * (rnd(seed, 6) < 0.5 ? -1 : 1) };
    const pts = []; for (let i = 0; i < 72; i++) { const t = i / 72 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
      let X = Math.sign(c) * Math.abs(c) ** e; const Y = Math.sign(s) * Math.abs(s) ** e; X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X)); pts.push([cx + a * X, cy + B.b * Y]); } return pts; };

  /**
   * draw one character.  o: { robe, skin, hat: samo|ikseon|knot|gat|hair|none, hatCol, belt, badge, pose: stand|kneel,
   *   arms: [[dx,dy],[dx,dy]] hand offsets from the shoulders (design px), blink, mouth: dash|smile|o, seed, kid }
   */
  function drawChar(g, o) {
    const p = new Pen(g); g.clearRect(0, 0, 600, 1000);
    const seed = o.seed || 1, kneel = o.pose === 'kneel', HH = o.kid ? 200 : 240;
    const drop = kneel ? 270 : 0;
    const top = 975 - 3.5 * HH + drop, hb = HH / 2, ha = hb / 0.935, hcx = 300, hcy = top + hb;
    const robe = o.robe || '#3b5f86', robeSh = mul(robe, SH_CLOTH), skin = o.skin || SKIN;
    const limbW = Math.max(12, 0.055 * 2 * ha), sy = hcy + hb + 12; // shoulder line
    const hemY = kneel ? 975 : 905, shoulderW = 92, hemW = kneel ? 175 : 132;
    // legs (stick) + shoes below the robe
    if (!kneel) { [-1, 1].forEach((k) => { p.limb([[300 + k * 38, hemY - 20], [300 + k * 40, 958]], o.pants || '#e9e2d2', limbW); p.fill(ell(300 + k * 48, 962, 30, 14), INK); }); }
    // arms behind the body first when they hang
    const arms = o.arms || [[-40, 190], [40, 190]];
    const hand = (k) => [300 + k * shoulderW * 0.85 + arms[k < 0 ? 0 : 1][0], sy + 30 + arms[k < 0 ? 0 : 1][1]];
    const elbow = (k) => { const h = hand(k), s = [300 + k * shoulderW * 0.85, sy + 30]; return [(s[0] + h[0]) / 2 + k * 18, (s[1] + h[1]) / 2]; };
    // robe (long 'po'): rounded trapezoid, flared hem
    const body = []; const n = 14;
    for (let i = 0; i <= n; i++) { const t = i / n; body.push([300 + shoulderW + (hemW - shoulderW) * t * t, sy + (hemY - sy) * t]); }
    for (let i = 0; i <= 10; i++) { const a = rad(0 + 180 * i / 10); body.push([300 + hemW * Math.cos(a), hemY + 10 * Math.sin(a)]); }
    for (let i = n; i >= 0; i--) { const t = i / n; body.push([300 - shoulderW - (hemW - shoulderW) * t * t, sy + (hemY - sy) * t]); }
    for (let i = 0; i <= 10; i++) { const a = rad(180 + 180 * i / 10); body.push([300 + shoulderW * Math.cos(a), sy + 22 * Math.sin(a)]); }
    p.grad(body, robe, robeSh, 0.3); p.ring(body, 9);
    // collar (V) and badge / belt
    p.stroke([[262, sy - 6], [300, sy + 70], [338, sy - 6]], 8, mul(robe, [0.5, 0.5, 0.55]));
    p.stroke([[262, sy - 4], [300, sy + 64], [338, sy - 4]], 6, '#f3efe4');
    if (o.badge) { const b = [[262, sy + 95], [338, sy + 95], [338, sy + 170], [262, sy + 170]]; p.fill(b, o.badge); p.ring(b, 5, 0.3); p.dot(300, sy + 132, 16, mul(o.badge, [0.7, 0.6, 0.5])); }
    if (o.belt) { p.stroke([[300 - shoulderW - 18, sy + 210], [300 + shoulderW + 18, sy + 210]], 18, INK); p.stroke([[300 - shoulderW - 14, sy + 210], [300 + shoulderW + 14, sy + 210]], 11, o.belt); }
    // arms: stick limbs in sleeves (wide sleeve cuff), ink-dot hands
    [-1, 1].forEach((k) => { const s = [300 + k * shoulderW * 0.8, sy + 28], e = elbow(k), h = hand(k);
      p.limb([s, e, h], robe, limbW + 14); p.dot(h[0], h[1], 13, INK); p.dot(h[0], h[1], 9, skin); });
    // neck + head
    p.limb([[300, hcy + hb - 10], [300, sy + 6]], skin, 34);
    const head = bean(hcx, hcy, ha, seed);
    p.shaded(head, skin, mul(skin, SH_SKIN), ha); p.ring(head, 10);
    // ears
    [-1, 1].forEach((k) => { const e = ell(hcx + k * (ha + 4), hcy + 8, 14, 22); p.fill(e, mul(skin, k < 0 ? [1, 1, 1] : SH_SKIN)); p.ring(e, 6); });
    // face: deadpan lidded eyes .26 W apart, no blush, no catchlights
    const ex = 0.26 * 2 * ha / 2, ey = hcy + 6;
    [-1, 1].forEach((k) => { const x = hcx + k * ex;
      if (o.blink) p.stroke([[x - 14, ey], [x + 14, ey]], 6);
      else { p.fill(ell(x, ey, 12, 14, 0, 180), INK); p.stroke([[x - 16, ey], [x + 16, ey]], 6); }
      p.stroke([[x - 15, ey - 32 - (k > 0 ? 2 : 0)], [x + 13, ey - 34]], 6); });
    if (o.mouth === 'o') p.fill(ell(hcx, hcy + 62, 13, 16), '#5a1e28');
    else if (o.mouth === 'smile') p.stroke(ell(hcx, hcy + 50, 26, 14, 20, 160, 12), 6);
    else p.stroke([[hcx - 18, hcy + 62], [hcx + 18, hcy + 60]], 6);
    // hats (our own Joseon designs)
    const hatTop = hcy - hb, hc = o.hatCol || '#262433';
    if (o.hat === 'samo' || o.hat === 'ikseon') {
      const cap = []; for (let i = 0; i <= 20; i++) { const a = rad(180 + 180 * i / 20); cap.push([hcx + 112 * Math.cos(a), hatTop + 52 + 70 * Math.sin(a)]); }
      cap.push([hcx + 118, hatTop + 64], [hcx - 118, hatTop + 64]);
      const back = ell(hcx, hatTop - 30, 70, 52, 180, 360); back.push([hcx + 70, hatTop + 10], [hcx - 70, hatTop + 10]);
      if (o.hat === 'samo') [-1, 1].forEach((k) => { const w = ell(hcx + k * 118, hatTop - 34, 62, 17); p.fill(w, hc); p.ring(w, 6); });
      p.grad(back, hc, mul(hc, SH_CLOTH)); p.ring(back, 7);
      p.grad(cap, hc, mul(hc, SH_CLOTH)); p.ring(cap, 8);
      p.stroke([[hcx - 104, hatTop + 30], [hcx + 104, hatTop + 30]], 5, mul(hc, [1.8, 1.8, 1.9]));
      if (o.hat === 'ikseon') [-1, 1].forEach((k) => { const w = ell(hcx + k * 46, hatTop - 92, 22, 48); p.fill(w, hc); p.ring(w, 6); });
      if (o.hat === 'ikseon') p.stroke([[hcx - 100, hatTop + 50], [hcx + 100, hatTop + 50]], 7, '#c9a54a');
    } else if (o.hat === 'knot') {
      const hair = ell(hcx, hatTop + 48, ha + 4, 66, 180, 360); hair.push([hcx + ha + 4, hatTop + 70], [hcx - ha - 4, hatTop + 70]);
      p.grad(hair, '#2b2230', '#16121c'); p.ring(hair, 7); const bun = ell(hcx + 4, hatTop - 24, 30, 26); p.fill(bun, '#2b2230'); p.ring(bun, 6);
      p.stroke([[hcx - ha + 6, hatTop + 64], [hcx + ha - 6, hatTop + 64]], 12, o.band || '#e8e2d4');
    } else if (o.hat === 'gat') {
      const crown = [[hcx - 62, hatTop - 70], [hcx + 62, hatTop - 70], [hcx + 70, hatTop + 30], [hcx - 70, hatTop + 30]]; p.fill(crown, 'rgba(36,23,38,.85)'); p.ring(crown, 6);
      const brim = ell(hcx, hatTop + 30, 210, 26); p.fill(brim, 'rgba(36,23,38,.8)'); p.ring(brim, 6);
    } else if (o.hat === 'hair') {
      const hair = ell(hcx, hatTop + 44, ha + 6, 72, 180, 360); hair.push([hcx + ha + 6, hatTop + 80], [hcx - ha - 6, hatTop + 80]); p.grad(hair, o.hairCol || '#3a2a24', '#1d1517'); p.ring(hair, 7);
    }
    if (o.draw) o.draw(p, { hcx, hcy, sy, hand });
  }

  /** a camera-facing character card: { mesh, setBlink, update(t, cam) } */
  function card(T, o) {
    const hM = o.height || 1.7, k = hM / (3.5 * (o.kid ? 200 : 240)), cw = 600 * k, ch = 1000 * k;
    const mk = (blink) => { const c = document.createElement('canvas'); c.width = 600; c.height = 1000; drawChar(c.getContext('2d'), { ...o, blink });
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };
    const texOpen = mk(false), texShut = mk(true);
    const geo = new T.PlaneGeometry(cw, ch); geo.translate(0, ch / 2 - 25 * k, 0);
    const mat = new T.MeshStandardMaterial({ map: texOpen, alphaTest: 0.5, roughness: 1, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.35 });
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = true; mesh.layers.set(NOINK);
    mesh.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: texOpen, alphaTest: 0.5 });
    const g = new T.Group(); g.add(mesh);
    const contact = new T.Mesh(new T.CircleGeometry(cw * 0.32, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x1c1830, transparent: true, opacity: 0.38, depthWrite: false }));
    contact.scale.z = 0.45; contact.position.y = 0.012; contact.layers.set(NOINK); contact.renderOrder = 1; g.add(contact);
    // deterministic blink schedule: every 0.5-2.3 s, 4 frames
    const seed = o.seed || 1, blinks = []; let tb = 0.3 + rnd(seed, 50) * 1.2; for (let i = 0; tb < 120; i++) { blinks.push(tb); tb += 0.5 + rnd(seed, 60 + i) * 1.8; }
    const wp = new T.Vector3();
    return { group: g, mesh, update(t, cam) {
      const shut = blinks.some((b) => t >= b && t < b + 4 / 30); const want = shut ? texShut : texOpen; if (mat.map !== want) { mat.map = want; mat.needsUpdate = true; }
      mesh.getWorldPosition(wp); let ry = Math.atan2(cam.position.x - wp.x, cam.position.z - wp.z); let pr = 0; let q = g.parent; while (q) { pr += q.rotation.y; q = q.parent; }
      mesh.rotation.y = ry - pr - g.rotation.y; } };
  }

  /** flat 2D effect card (Canvas2D painter (g, t) with t in 0..1 frames baked in `frames` steps) */
  function fxCard(T, size, paint, frames = 8) {
    const texs = []; for (let i = 0; i < frames; i++) { const c = document.createElement('canvas'); c.width = c.height = 256; paint(c.getContext('2d'), i / (frames - 1)); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; texs.push(t); }
    const mat = new T.MeshBasicMaterial({ map: texs[0], transparent: true, depthWrite: false, side: T.DoubleSide });
    const m = new T.Mesh(new T.PlaneGeometry(size, size), mat); m.layers.set(NOINK); m.renderOrder = 5;
    return { mesh: m, set(k) { const i = Math.max(0, Math.min(frames - 1, Math.floor(k * frames))); if (mat.map !== texs[i]) { mat.map = texs[i]; mat.needsUpdate = true; } m.visible = k > 0 && k < 1; } };
  }
  const paintSplash = (g, t) => { g.clearRect(0, 0, 256, 256); const s = 0.4 + 0.6 * t; g.globalAlpha = 1 - t * 0.8; g.lineWidth = 7; g.strokeStyle = INK; g.fillStyle = '#e6f2ff';
    for (let i = 0; i < 5; i++) { const a = rad(-160 + i * 35), r = 70 * s; const x = 128 + Math.cos(a) * r, y = 200 + Math.sin(a) * r * 1.3; g.beginPath(); g.ellipse(x, y, 10 * (1 - t * 0.5), 16 * (1 - t * 0.5), a + Math.PI / 2, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(128, 206, 90 * s, 20 * s, 0, 0, Math.PI * 2); g.lineWidth = 6; g.stroke(); g.globalAlpha = 1; };
  const paintBurst = (g, t) => { g.clearRect(0, 0, 256, 256); const r0 = 20 + 40 * t, r1 = 60 + 70 * t; g.globalAlpha = 1 - t * t; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.stroke();
      g.strokeStyle = '#fff3b0'; g.lineWidth = 8; g.stroke(); } g.globalAlpha = 1; };
  const paintPuff = (g, t) => { g.clearRect(0, 0, 256, 256); g.globalAlpha = 1 - t; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, r = 30 + 60 * t;
      g.beginPath(); g.arc(128 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.5, 26 * (1 - 0.4 * t), 0, Math.PI * 2); g.fillStyle = '#d9cbb0'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); } g.globalAlpha = 1; };

  // ---------------- Post: ink -> lens blur -> neutral tone map + grade ----------------
  const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const NORMAL_VERT = `#include <common>
varying vec3 vN; varying vec3 vV;
void main(){
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz; }`;
  const NORMAL_FRAG = `varying vec3 vN; varying vec3 vV;
void main(){ vec3 n; if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV))); else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); gl_FragColor = vec4(n, 1.0); }`;
  const MASK_FRAG = `#include <packing>
uniform sampler2D tNormal; uniform sampler2D tDepth; uniform sampler2D tMainDepth; uniform vec2 texel;
uniform float cNear; uniform float cFar; uniform float p00; uniform float p11; uniform float wNear; uniform float wFar; uniform float dNear; uniform float dFar;
uniform float creaseScale; uniform float depthLo; uniform float depthHi; uniform float cosLo; uniform float cosHi; uniform float concaveGain;
uniform float farOpacity; uniform float fadeNear; uniform float fadeFar; uniform float pxScale; uniform vec2 fogRange; uniform float fogStart;
varying vec2 vUv;
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;
  return k; }
void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float zc = dist(tDepth, vUv);
  float zm = dist(tMainDepth, vUv);
  zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0))); zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
  zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y))); zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
  if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale; float hc = 0.5 * w * creaseScale;
  float Wc = 1.0 / zc; vec3 n0 = nc.xyz; vec3 P0 = viewPos(vUv, zc); float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) { for (int r = 1; r <= RMAX; r++) {
    vec2 o = STEP[a] * texel * float(r); float d = (float(r) - 0.5) * SLEN[a];
    float cw = clamp(w + 0.5 - d, 0.0, 1.0); float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
    if (cw <= 0.0 && ch <= 0.0) break;
    float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
    float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
    eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
    if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch); } }
  float ink = max(eD, eN) * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0); }`;
  const COMP_FRAG = `uniform sampler2D inputBuffer; uniform sampler2D tMask; uniform vec2 texel; uniform vec3 inkColor; uniform vec3 fogColor; uniform float fogInk;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0) + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0)) + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;
  vec4 c = texture2D(inputBuffer, vUv);
  float fk = texture2D(tMask, vUv).g;
  vec3 inkC = mix(inkColor, fogColor, fk * fogInk);
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(pow(mix(g, pow(inkC, vec3(1.0 / 2.2)), a), vec3(2.2)), 1.0); }`;
  const DOF_FRAG = `#include <packing>
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel; uniform float cNear; uniform float cFar; uniform float focus; uniform float cInf;
varying vec2 vUv;
float vz(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cNear, cFar); }
float coc(float z) { return cInf * clamp(abs(1.0 - focus / z), 0.0, 1.0); }
void main() {
  vec4 c0 = texture2D(tColor, vUv);
  if (cInf < 0.3) { gl_FragColor = c0; return; }
  float z0 = vz(vUv); float r0 = coc(z0);
  if (r0 < 0.5) { gl_FragColor = c0; return; }
  vec3 acc = c0.rgb; float wsum = 1.0;
  for (int i = 0; i < 40; i++) {
    float fi = float(i); float r = r0 * sqrt((fi + 0.5) / 40.0); float a = fi * 2.39996;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
    float zs = vz(uv); float cs = coc(zs);
    float w = zs < z0 ? clamp(cs - r + 1.0, 0.0, 1.0) : 1.0;
    acc += texture2D(tColor, uv).rgb * w; wsum += w; }
  gl_FragColor = vec4(acc / wsum, 1.0); }`;
  const FINAL_FRAG = `uniform sampler2D tIn; uniform float exposure; uniform float sat; uniform float lift; uniform vec3 shadeTint;
varying vec2 vUv;
vec3 neutral(vec3 color) {
  const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= offset;
  float peak = max(color.r, max(color.g, color.b)); if (peak < startCompression) return color;
  const float d = 1.0 - startCompression; float newPeak = 1.0 - d * d / (peak + d - startCompression); color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0); return mix(color, vec3(newPeak), g); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec3 c = neutral(max(texture2D(tIn, vUv).rgb * exposure, 0.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, sat);
  c += shadeTint * (1.0 - smoothstep(0.02, 0.25, l)) * 0.6;   // cool tint only in the shade
  c = lift + c * (1.0 - lift);
  gl_FragColor = vec4(toSRGB(clamp(c, 0.0, 1.0)), 1.0); }`;

  function Post(s3d, opt = {}) {
    const T = s3d.THREE, rd = s3d.renderer, sc = s3d.scene, cam = s3d.camera;
    rd.toneMapping = T.NoToneMapping; cam.layers.enable(NOINK);
    const nearest = { minFilter: T.NearestFilter, magFilter: T.NearestFilter, generateMipmaps: false };
    const mainRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 4, depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType) });
    const worldRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, ...nearest, depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType) });
    const maskRT = new T.WebGLRenderTarget(1, 1, { type: T.UnsignedByteType, ...nearest, depthBuffer: false });
    const inkRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
    const dofRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
    const texel = new T.Vector2();
    const fs = (frag, u) => new T.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms: u, depthTest: false, depthWrite: false });
    const normalMat = new T.ShaderMaterial({ vertexShader: NORMAL_VERT, fragmentShader: NORMAL_FRAG, side: T.DoubleSide });
    const depthOnly = new T.MeshBasicMaterial({ colorWrite: false });
    const o = { widthNear: 5.1, widthFar: 3.3, distNear: 6, distFar: 90, creaseScale: 0.8, depthLo: 0.01, depthHi: 0.03, angleLo: 35, angleHi: 50, concaveGain: 0.7, farOpacity: 0.95, fadeNear: 150, fadeFar: 450, ...opt };
    const maskMat = fs(MASK_FRAG, { tNormal: { value: worldRT.texture }, tDepth: { value: worldRT.depthTexture }, tMainDepth: { value: mainRT.depthTexture }, texel: { value: texel },
      cNear: { value: 0.1 }, cFar: { value: 1000 }, p00: { value: 1 }, p11: { value: 1 }, wNear: { value: o.widthNear }, wFar: { value: o.widthFar }, dNear: { value: o.distNear }, dFar: { value: o.distFar },
      creaseScale: { value: o.creaseScale }, depthLo: { value: o.depthLo }, depthHi: { value: o.depthHi }, cosLo: { value: Math.cos(rad(o.angleLo)) }, cosHi: { value: Math.cos(rad(o.angleHi)) },
      concaveGain: { value: o.concaveGain }, farOpacity: { value: o.farOpacity }, fadeNear: { value: o.fadeNear }, fadeFar: { value: o.fadeFar }, pxScale: { value: 1 }, fogRange: { value: new T.Vector2() }, fogStart: { value: 60 } });
    const compMat = fs(COMP_FRAG, { inputBuffer: { value: mainRT.texture }, tMask: { value: maskRT.texture }, texel: { value: texel }, inkColor: { value: new T.Color('#030303') }, fogColor: { value: new T.Color() }, fogInk: { value: 0.3 } });
    const dofMat = fs(DOF_FRAG, { tColor: { value: inkRT.texture }, tDepth: { value: mainRT.depthTexture }, texel: { value: texel }, cNear: { value: 0.1 }, cFar: { value: 1000 }, focus: { value: 5 }, cInf: { value: 0 } });
    const finalMat = fs(FINAL_FRAG, { tIn: { value: dofRT.texture }, exposure: { value: 1 }, sat: { value: 1.12 }, lift: { value: 0.012 }, shadeTint: { value: new T.Vector3(0.0, 0.006, 0.03) } });
    const fsScene = new T.Scene(), fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new T.Mesh(new T.PlaneGeometry(2, 2), maskMat); quad.frustumCulled = false; fsScene.add(quad);
    const size = new T.Vector2(); let w = 0, h = 0;
    const pass = (mat, target) => { quad.material = mat; rd.setRenderTarget(target); rd.render(fsScene, fsCam); };
    return {
      render(look = {}) {
        s3d.fit(); rd.getDrawingBufferSize(size);
        if (size.x !== w || size.y !== h) { w = size.x; h = size.y; [mainRT, worldRT, maskRT, inkRT, dofRT].forEach((r) => r.setSize(w, h)); texel.set(1 / w, 1 / h); maskMat.uniforms.pxScale.value = h / 1920; }
        const bg = sc.background, ov = sc.overrideMaterial, mask = cam.layers.mask, sAuto = rd.shadowMap.autoUpdate;
        // 1) main colour (everything)
        rd.setRenderTarget(mainRT); rd.clear(); rd.render(sc, cam);
        rd.shadowMap.autoUpdate = false;
        // 3) world-only normals + depth (no NOINK cards / sprites / sky)
        cam.layers.disable(NOINK); sc.overrideMaterial = normalMat; sc.background = null; const cc = rd.getClearColor(new T.Color()), ca = rd.getClearAlpha(); rd.setClearColor(0x000000, 0);
        rd.setRenderTarget(worldRT); rd.clear(); rd.render(sc, cam);
        rd.setClearColor(cc, ca); cam.layers.mask = mask; sc.overrideMaterial = ov; sc.background = bg; rd.shadowMap.autoUpdate = sAuto;
        // 4) ink mask + composite
        const u = maskMat.uniforms, e = cam.projectionMatrix.elements; u.cNear.value = cam.near; u.cFar.value = cam.far; u.p00.value = e[0]; u.p11.value = e[5];
        if (sc.fog) { u.fogRange.value.set(sc.fog.near, sc.fog.far); compMat.uniforms.fogColor.value.copy(sc.fog.color); } else u.fogRange.value.set(0, 0);
        if (look.inkScale !== undefined) { u.wNear.value = o.widthNear * look.inkScale; u.wFar.value = o.widthFar * look.inkScale; }
        pass(maskMat, maskRT); pass(compMat, inkRT);
        // 5) lens blur (cInf in px at 1080 wide), 6) tone map + grade to the screen
        dofMat.uniforms.cNear.value = cam.near; dofMat.uniforms.cFar.value = cam.far; dofMat.uniforms.focus.value = look.focus || 5; dofMat.uniforms.cInf.value = (look.dof || 0) * h / 1920;
        pass(dofMat, dofRT);
        finalMat.uniforms.exposure.value = look.exposure ?? 1; finalMat.uniforms.sat.value = look.sat ?? 1.12; finalMat.uniforms.lift.value = look.lift ?? 0.012;
        pass(finalMat, null);
      } };
  }

  window.ToonKit = { NOINK, INK, SKIN, drawChar, card, fxCard, paintSplash, paintBurst, paintPuff, Post, mul };
})();
