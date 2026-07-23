/* ═══════════════════════════════════════════════════════════════════════════
   Tarjetas coleccionables — puerto web de las tarjetas de la app (2.1.0).

   La app dibuja cada tarjeta a 320×460 con SwiftUI: un marco metálico, una
   ventana de arte con ilustración generativa, la ficha con día/familia/fecha,
   la fila de ritmo, el texto y el número de colección. Aquí se reconstruye lo
   mismo en DOM + canvas, portando:

     · CardPalette.make        (paleta HSB por familia y nivel)
     · SeededRNG / ValueNoise  (todo el arte es determinista por semilla)
     · los siete generadores    (flujo, Truchet, topografía, interferencia,
                                 empaquetado, abanico y aurora)
     · CardHoloOverlay          (foil: arcoíris angular + barrido especular)

   Fuentes: PacePal/Views/Cards/{RewardCardView,GenerativeCardArt}.swift y
   PacePal/Models/{CollectedCard,CardGoal}.swift.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

const BASE_W = 320, BASE_H = 460;
const ART_H = 230;                 // alto de la ventana de arte
const INK = '#1A1512', ORANGE = '#F9703E';
const TOTAL_CARDS = 50;            // 23 hitos + 4 + 4 + 9 + 10

/* ── RNG determinista (LCG de 32 bits) ─────────────────────────────────── */
function RNG(seed) {
  this.s = (seed >>> 0) || 1;
  this.next();
}
RNG.prototype.next = function () {
  this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
  return this.s;
};
RNG.prototype.unit = function () { return this.next() / 4294967296; };
RNG.prototype.range = function (lo, hi) { return lo + this.unit() * (hi - lo); };
RNG.prototype.int = function (lo, hi) { return hi > lo ? lo + Math.floor(this.unit() * (hi - lo + 1)) : lo; };
RNG.prototype.chance = function (p) { return this.unit() < p; };

/* ── Ruido de valor con tres octavas (base de flujo y topografía) ──────── */
function ValueNoise(seed) {
  const r = new RNG(seed ^ 0x9e3779b9);
  this.t = new Float64Array(512);
  for (let i = 0; i < 512; i++) this.t[i] = r.unit();
}
ValueNoise.prototype.hash = function (x, y) {
  const m = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return this.t[m % 512];
};
ValueNoise.prototype.value = function (x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = this.hash(xi, yi), b = this.hash(xi + 1, yi);
  const c = this.hash(xi, yi + 1), d = this.hash(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};
ValueNoise.prototype.fbm = function (x, y, oct) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < (oct || 3); i++) {
    sum += this.value(x * freq, y * freq) * amp;
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
};

/* ── Paleta (CardPalette.make) ─────────────────────────────────────────── */
function hsv(h, s, v, a) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  const c = n => Math.round(n * 255);
  return a === undefined
    ? 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')'
    : 'rgba(' + c(r) + ',' + c(g) + ',' + c(b) + ',' + a + ')';
}

const FAMILY_MAX = { distance: 4, streak: 4, totalKm: 9, challenge: 10, milestone: 23 };

function makePalette(family, level, seed) {
  const r = new RNG(seed + 0x9e3779b9);
  const jitter = r.range(-0.045, 0.045);
  let baseHue, altShift;
  switch (family) {
    case 'distance':  baseHue = 0.94; altShift = 0.075; break;   // magenta → naranja
    case 'streak':    baseHue = 0.02; altShift = 0.085; break;   // rojo → dorado
    case 'totalKm':   baseHue = 0.62; altShift = -0.13; break;   // índigo → turquesa
    case 'challenge': baseHue = 0.44; altShift = 0.12;  break;   // verde → cian
    default:          baseHue = 0.58; altShift = 0.10;
  }
  const h = (baseHue + jitter) % 1;
  const hAlt = (h + altShift + 1) % 1;
  const steps = Math.max(1, (FAMILY_MAX[family] || 4) - 1);
  const depth = Math.min(1, Math.max(0, (level - 1) / steps));
  return {
    hue: h, hueAlt: hAlt,
    skyTop:    hsv(hAlt, 0.52 + 0.16 * depth, 0.30 - 0.12 * depth),
    skyBottom: hsv(h,    0.62 + 0.18 * depth, 0.68 - 0.22 * depth),
    accent:    hsv(hAlt, 0.72, 0.98),
    accentAlt: hsv(h,    0.55, 1.00),
    glow:      hsv(hAlt, 0.35, 1.00),
    ground:    hsv(hAlt, 0.58, 0.115 - 0.03 * depth),
    accentA:   a => hsv(hAlt, 0.72, 0.98, a),
    accentAltA:a => hsv(h,    0.55, 1.00, a),
    glowA:     a => hsv(hAlt, 0.35, 1.00, a),
    strokeA:   (r2, a) => {
      switch (r2.int(0, 3)) {
        case 0:  return 'rgba(255,255,255,' + a + ')';
        case 1:  return hsv(hAlt, 0.72, 0.98, a);
        case 2:  return hsv(h, 0.55, 1.00, a);
        default: return hsv(hAlt, 0.35, 1.00, a);
      }
    }
  };
}

/* ── Generadores ───────────────────────────────────────────────────────── */

function drawSky(ctx, w, h, p) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, p.skyTop);
  grad.addColorStop(1, p.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawGrain(ctx, w, h, r) {
  for (let i = 0; i < 340; i++) {
    const x = r.range(0, w), y = r.range(0, h), rad = r.range(0.3, 1.1);
    ctx.fillStyle = 'rgba(255,255,255,' + r.range(0.02, 0.09).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

/* 1 · Campo de flujo: partículas que siguen un campo de ángulos del ruido. */
function drawFlowField(ctx, w, h, p, r, seed) {
  const base = Math.min(w, h);
  const noise = new ValueNoise(seed + 11);
  const fieldScale = r.range(1.6, 3.1) / base;
  const turns = r.range(1.6, 3.4);
  const steps = 28, stepLen = base * 0.016;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 230; i++) {
    let x = r.range(-0.08, 1.08) * w, y = r.range(-0.08, 1.08) * h;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      const a = noise.fbm(x * fieldScale, y * fieldScale) * Math.PI * 2 * turns;
      x += Math.cos(a) * stepLen; y += Math.sin(a) * stepLen;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = p.strokeA(r, r.range(0.10, 0.42).toFixed(3));
    ctx.lineWidth = base * r.range(0.0018, 0.0065);
    ctx.stroke();
  }
  // Estelas gruesas: jerarquía para que no se lea como una maraña uniforme.
  for (let i = 0; i < 7; i++) {
    let x = r.range(0.05, 0.95) * w, y = r.range(0.05, 0.95) * h;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < steps + 12; s++) {
      const a = noise.fbm(x * fieldScale, y * fieldScale) * Math.PI * 2 * turns;
      x += Math.cos(a) * stepLen; y += Math.sin(a) * stepLen;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = base * 0.020; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.80)'; ctx.lineWidth = base * 0.0055; ctx.stroke();
  }
}

/* 2 · Teselas de Truchet: arcos que se encadenan en curvas largas. */
function drawTruchet(ctx, w, h, p, r) {
  const cols = r.int(5, 8), cell = w / cols;
  const rows = Math.ceil(h / cell) + 1;
  const lineW = cell * r.range(0.10, 0.17);
  const tiles = [];
  for (let i = 0; i < rows * cols; i++) {
    tiles.push({ flipped: r.chance(0.5), accent: r.chance(0.22), alpha: r.range(0.30, 0.85) });
  }
  function tilePath(ox, oy, flipped) {
    const rad = cell / 2;
    ctx.beginPath();
    if (flipped) {
      ctx.arc(ox, oy, rad, 0, Math.PI / 2);
      ctx.moveTo(ox + cell - rad, oy + cell);
      ctx.arc(ox + cell, oy + cell, rad, Math.PI, Math.PI * 1.5);
    } else {
      ctx.arc(ox + cell, oy, rad, Math.PI / 2, Math.PI);
      ctx.moveTo(ox, oy + cell - rad);
      ctx.arc(ox, oy + cell, rad, Math.PI * 1.5, Math.PI * 2);
    }
  }
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const t = tiles[row * cols + col];
        tilePath(col * cell, row * cell - cell * 0.5, t.flipped);
        if (pass === 0) {
          ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = lineW * 1.5;
        } else {
          ctx.strokeStyle = t.accent ? p.accentA(t.alpha.toFixed(3)) : 'rgba(255,255,255,' + t.alpha.toFixed(3) + ')';
          ctx.lineWidth = lineW;
        }
        ctx.stroke();
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = r.int(0, cols) * cell, y = r.int(0, rows) * cell - cell * 0.5;
    const rad = cell * r.range(0.06, 0.13);
    ctx.fillStyle = p.glowA(r.range(0.45, 0.9).toFixed(3));
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
}

/* 3 · Líneas topográficas: relieve donde cada cresta tapa a la anterior. */
function drawTopography(ctx, w, h, p, r, seed) {
  const noise = new ValueNoise(seed + 29);
  const lines = 22;
  const amp = h * r.range(0.15, 0.24);
  const freq = r.range(1.7, 3.4);
  const samples = 46;
  const top = h * 0.16, span = h * 0.72;

  const sunR = Math.min(w, h) * r.range(0.16, 0.24);
  const sx = w * r.range(0.28, 0.72), sy = h * 0.12;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunR);
  sg.addColorStop(0, p.glowA(0.45)); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sunR, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const baseY = top + span * t;
    const envelope = 0.38 + 0.62 * Math.sin(t * Math.PI);
    const pts = [];
    for (let s = 0; s <= samples; s++) {
      const u = s / samples;
      const n = noise.fbm(u * freq, t * 3.4 + 5.0) - 0.5;
      pts.push([w * u, baseY - n * amp * envelope * 2]);
    }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let s = 1; s <= samples; s++) ctx.lineTo(pts[s][0], pts[s][1]);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = p.ground; ctx.fill();

    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let s = 1; s <= samples; s++) ctx.lineTo(pts[s][0], pts[s][1]);
    const bright = 0.75 - 0.45 * Math.abs(t - 0.5) * 2;
    ctx.strokeStyle = i % 6 === 0 ? p.accentA(bright.toFixed(3)) : 'rgba(255,255,255,' + bright.toFixed(3) + ')';
    ctx.lineWidth = h * (i % 6 === 0 ? 0.0055 : 0.0028);
    ctx.lineCap = 'round'; ctx.stroke();
  }
}

/* 4 · Interferencia: círculos concéntricos que producen moiré al cruzarse. */
function drawInterference(ctx, w, h, p, r) {
  const base = Math.min(w, h);
  const sources = r.int(2, 3);
  const spacing = base * r.range(0.032, 0.052);
  const rings = Math.floor((base * 1.35) / spacing);

  for (let s = 0; s < sources; s++) {
    const cx = w * r.range(0.15, 0.85), cy = h * r.range(0.20, 0.80);
    const alpha = s === 0 ? 0.42 : 0.30;
    const tint = s === 0 ? 'rgba(255,255,255,' + alpha + ')'
                         : (r.chance(0.5) ? p.accentA(alpha) : p.accentAltA(alpha));
    ctx.beginPath();
    for (let i = 1; i <= rings; i++) {
      const rad = i * spacing;
      ctx.moveTo(cx + rad, cy);
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    }
    ctx.strokeStyle = tint; ctx.lineWidth = base * 0.0035; ctx.stroke();

    const coreR = base * r.range(0.018, 0.032);
    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 5);
    gg.addColorStop(0, p.glowA(0.55)); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, coreR * 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, r.range(0, h));
    ctx.lineTo(w * 1.1, r.range(0, h));
    ctx.strokeStyle = 'rgba(255,255,255,' + r.range(0.10, 0.26).toFixed(3) + ')';
    ctx.lineWidth = base * 0.0028; ctx.stroke();
  }
}

/* 5 · Empaquetado de círculos: cada radio lo decide el espacio libre. */
function drawPacking(ctx, w, h, p, r) {
  const base = Math.min(w, h);
  const maxR = base * r.range(0.16, 0.24), minR = base * 0.018, gap = base * 0.006;
  const placed = [];
  let attempts = 0;
  while (placed.length < 58 && attempts < 1400) {
    attempts++;
    const x = r.range(-0.05, 1.05) * w, y = r.range(-0.05, 1.05) * h;
    let rad = maxR;
    for (let i = 0; i < placed.length; i++) {
      const c = placed[i];
      const d = Math.hypot(x - c[0], y - c[1]) - c[2] - gap;
      if (d < rad) rad = d;
      if (rad < minR) break;
    }
    if (rad < minR) continue;
    placed.push([x, y, rad]);

    const tint = p.strokeA(r, r.range(0.10, 0.30).toFixed(3));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, tint); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.strokeA(r, r.range(0.35, 0.85).toFixed(3));
    ctx.lineWidth = Math.max(0.6, rad * 0.055);
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();

    if (rad > base * 0.09) {
      const inner = r.int(1, 3);
      for (let k = 1; k <= inner; k++) {
        const ir = rad * (1 - k * 0.22);
        if (ir <= minR) break;
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.lineWidth = Math.max(0.5, rad * 0.02);
        ctx.beginPath(); ctx.arc(x, y, ir, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
}

/* 6 · Abanico radial: rayos de ancho irregular saliendo de un sol bajo. */
function drawSunburst(ctx, w, h, p, r) {
  const cx = w * r.range(0.34, 0.66), cy = h * r.range(0.66, 0.80);
  const reach = Math.max(w, h) * 1.6;
  const rays = r.int(18, 26);
  let angle = r.range(0, Math.PI * 2);

  for (let i = 0; i < rays; i++) {
    const width = r.range(0.030, 0.11);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    ctx.lineTo(cx + Math.cos(angle + width) * reach, cy + Math.sin(angle + width) * reach);
    ctx.closePath();
    const g = ctx.createLinearGradient(cx, cy, cx, cy - reach * 0.45);
    g.addColorStop(0, 'rgba(255,255,255,' + r.range(0.30, 0.55).toFixed(3) + ')');
    g.addColorStop(1, p.accentA(0.06));
    ctx.fillStyle = g; ctx.fill();
    angle += width + r.range(0.10, 0.34);
  }
  for (let i = 1; i <= 6; i++) {
    const rad = Math.min(w, h) * (0.16 + i * 0.085);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, Math.PI * 190 / 180, Math.PI * 350 / 180);
    ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 0.30 - i * 0.03).toFixed(3) + ')';
    ctx.lineWidth = Math.min(w, h) * 0.0035; ctx.lineCap = 'round'; ctx.stroke();
  }
  const sunR = Math.min(w, h) * r.range(0.075, 0.115);
  const halo = ctx.createRadialGradient(cx, cy, sunR * 0.6, cx, cy, sunR * 4);
  halo.addColorStop(0, p.glowA(0.50)); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, sunR * 4, 0, Math.PI * 2); ctx.fill();
  const disc = ctx.createRadialGradient(cx, cy - sunR * 0.3, 0, cx, cy - sunR * 0.3, sunR);
  disc.addColorStop(0, '#ffffff'); disc.addColorStop(1, p.accentAltA(0.85));
  ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, sunR, 0, Math.PI * 2); ctx.fill();

  const bands = r.int(3, 6);
  for (let i = 0; i < bands; i++) {
    const y = cy + r.range(-0.28, 0.34) * h;
    const bandH = h * r.range(0.008, 0.028);
    ctx.fillStyle = 'rgba(255,255,255,' + r.range(0.06, 0.18).toFixed(3) + ')';
    ctx.fillRect(-w * 0.1, y, w * 1.2, bandH);
  }
}

/* 7 · Aurora: cortinas de luz sobre un horizonte. Cima de cada familia. */
function drawAurora(ctx, w, h, p, r) {
  const base = Math.min(w, h);
  const stars = r.int(90, 140);
  for (let i = 0; i < stars; i++) {
    const x = r.range(0, w), y = r.range(0, h * 0.88), rad = r.range(0.4, 1.9);
    ctx.fillStyle = 'rgba(255,255,255,' + r.range(0.18, 0.95).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  const curtains = r.int(5, 8);
  for (let c = 0; c < curtains; c++) {
    const cx = r.range(-0.05, 1.05) * w;
    const bandW = base * r.range(0.06, 0.20);
    const top = h * r.range(-0.05, 0.12);
    const bottom = h * r.range(0.55, 0.86);
    const sway = base * r.range(0.04, 0.14);
    const steps = 16;
    const edge = (i, side) => {
      const t = i / steps;
      return [cx + Math.sin(t * Math.PI * 1.6 + side) * sway + side * bandW * 0.5,
              top + (bottom - top) * t];
    };
    ctx.beginPath();
    let pt = edge(0, -1); ctx.moveTo(pt[0], pt[1]);
    for (let i = 1; i <= steps; i++) { pt = edge(i, -1); ctx.lineTo(pt[0], pt[1]); }
    for (let i = steps; i >= 0; i--) { pt = edge(i, 1); ctx.lineTo(pt[0], pt[1]); }
    ctx.closePath();
    const tint = r.chance(0.5) ? p.accentA(0.28) : p.accentAltA(0.28);
    const g = ctx.createLinearGradient(cx, top, cx, bottom);
    g.addColorStop(0, 'rgba(255,255,255,' + r.range(0.30, 0.55).toFixed(3) + ')');
    g.addColorStop(0.5, tint);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fill();
  }
  const steps = 24, phase = r.range(0, Math.PI * 2);
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(w * t, h * 0.86 - Math.sin(t * Math.PI * 2.1 + phase) * h * 0.035);
  }
  ctx.lineTo(w, h); ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fill();
}

const GENERATORS = [drawFlowField, drawTruchet, drawTopography, drawInterference,
                    drawPacking, drawSunburst, drawAurora];

/* Algoritmo por familia y nivel (GenerativeCardArt.generator). */
function generatorFor(family, level, legendary) {
  if (legendary) return 7;
  const offset = { distance: 0, challenge: 1, streak: 2, totalKm: 4 }[family] || 0;
  return ((Math.max(1, level) - 1 + offset) % 6) + 1;
}

function paintArt(canvas, card) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const p = makePalette(card.family, card.level, card.seed);
  const r = new RNG(card.seed);
  drawSky(ctx, w, h, p);
  const gen = generatorFor(card.family, card.level, card.legendary);
  ctx.save();
  GENERATORS[gen - 1](ctx, w, h, p, r, card.seed);
  ctx.restore();
  drawGrain(ctx, w, h, r);
  drawVignette(ctx, w, h);
}

/* ── Ruta GPS (RunRoute.swift) ─────────────────────────────────────────── */
/* La app guarda el trazo del GPS normalizado a 0…1 y lo pinta detrás de la
   tarjeta del día. Aquí se sintetiza un trazo con la misma normalización. */
function routePoints(seed, count) {
  const r = new RNG(seed + 977);
  const n = count || 150;
  let x = 0, y = 0, a = r.range(-0.5, 0.5);
  const raw = [];
  // Trazo de calle: giros suaves y encadenados —no un garabato— y ligeramente
  // más ancho que alto, que es como se ve una vuelta por la ciudad.
  let turn = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    turn = turn * 0.82 + r.range(-0.10, 0.10);
    a += turn + Math.sin(t * Math.PI * 3.1) * 0.055;
    // La vuelta se cierra: el último tercio apunta de regreso al origen.
    if (t > 0.66) {
      let d = Math.atan2(-y, -x) - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a += d * 0.05;
    }
    x += Math.cos(a) * 1.55; y += Math.sin(a) * 0.9;
    raw.push([x, y]);
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  raw.forEach(p => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
                     minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const offX = (span - (maxX - minX)) / 2, offY = (span - (maxY - minY)) / 2;
  return raw.map(p => [(p[0] - minX + offX) / span, (p[1] - minY + offY) / span]);
}

function drawRoute(canvas, seed, color) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const pad = Math.min(w, h) * 0.06;
  const size = Math.min(w, h) - pad * 2;
  const pts = routePoints(seed).map(p => [pad + p[0] * size + (w - size) / 2 - pad,
                                          pad + p[1] * size + (h - size) / 2 - pad]);
  ctx.clearRect(0, 0, w, h);
  // Retícula tenue de fondo: da escala al trazo sin competir con él.
  const step = Math.min(w, h) / 9;
  ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
  for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(5, size * 0.045); ctx.stroke();
  ctx.strokeStyle = color || ORANGE; ctx.lineWidth = Math.max(2.5, size * 0.022); ctx.stroke();
  // Salida y meta
  ctx.fillStyle = '#7BD66B';
  ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], Math.max(3, size * 0.028), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC53D';
  const last = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(last[0], last[1], Math.max(3, size * 0.028), 0, Math.PI * 2); ctx.fill();
}

/* ── Construcción de la tarjeta ────────────────────────────────────────── */

const FAMILY_LABEL = {
  milestone: 'Hito', distance: 'Distancia', streak: 'Racha',
  totalKm: 'Acumulado', challenge: 'Reto'
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* Encuadre del mono dentro de la ventana de arte (RewardCardView.monoFraming):
   cuatro composiciones fijas en vez de desplazamientos sueltos. */
function monoFraming(card) {
  if (card.family === 'milestone') return { pixel: 6.6, x: 0, y: -2, flip: false };
  const r = new RNG(card.seed * 31 + 7);
  const halfW = 134;
  const roll = r.int(0, 9);
  const flip = r.chance(0.35);
  if (roll <= 3) return { pixel: r.range(6.0, 7.2), x: halfW * r.range(-0.32, 0.32), y: -2, flip: flip };
  if (roll <= 5) return { pixel: r.range(8.6, 10.0), x: halfW * r.range(-0.16, 0.16), y: r.range(18, 42), flip: flip };
  if (roll <= 7) {
    const away = r.range(0.58, 0.82) * (r.chance(0.5) ? -1 : 1);
    return { pixel: r.range(4.8, 6.0), x: halfW * away, y: r.range(-6, 12), flip: flip };
  }
  return { pixel: r.range(6.4, 8.0), x: halfW * r.range(-0.40, 0.40), y: r.range(-78, -34), flip: flip };
}

function frameStyle(card) {
  if (!card.holo) {
    return 'linear-gradient(135deg,#FFD98C,' + ORANGE + ',#B44A22,#FFD98C)';
  }
  if (card.family === 'challenge') {
    return 'linear-gradient(160deg,#F4F7F9,#A9B2BA,#525A63,#E3E9ED,#8B949C)';
  }
  if (card.rarity >= 4) {
    return 'conic-gradient(from 0deg,#ff4d4d,#ff9c3d,#ffe24d,#6ddc6d,#4de0e0,#4d8cff,#a24dff,#ff4dcd,#ff4d4d)';
  }
  const p = makePalette(card.family, card.level, card.seed);
  return 'linear-gradient(135deg,rgba(255,255,255,.92),' + p.accent + ',' + p.accentAlt + ',rgba(255,255,255,.75))';
}

function bodyStyle(card) {
  const p = makePalette(card.family, card.level, card.seed);
  return card.family === 'milestone'
    ? 'linear-gradient(135deg,rgba(249,112,62,.16),' + INK + ' 45%,rgba(249,244,150,.10))'
    : 'linear-gradient(135deg,' + p.skyTop + ',' + INK + ' 48%,' + p.accentA(0.28) + ')';
}

function typeColor(card) {
  return card.family === 'milestone' ? '#FFC46B' : makePalette(card.family, card.level, card.seed).accentAlt;
}

/* Construye el nodo DOM de una tarjeta y devuelve el contenedor. */
function buildCard(card) {
  const stage = el('div', 'pcard-stage');
  stage.dataset.rarity = card.rarity;
  stage.dataset.family = card.family;
  if (card.holo) stage.dataset.holo = '1';

  const tilt = el('div', 'pcard-tilt');
  const root = el('div', 'pcard');
  root.style.background = frameStyle(card);

  const inner = el('div', 'pcard-inner');
  inner.style.background = bodyStyle(card);

  /* Cabecera: tipo · nombre · distancia (el lugar de los HP) */
  const header = el('div', 'pc-header');
  const pill = el('span', 'pc-type', (card.typeLabel || FAMILY_LABEL[card.family]).toUpperCase());
  pill.style.background = typeColor(card);
  header.appendChild(pill);
  header.appendChild(el('span', 'pc-name', card.petName));
  const hp = el('span', 'pc-hp');
  hp.appendChild(el('b', null, card.km));
  hp.appendChild(el('i', null, card.unit || 'KM'));
  header.appendChild(hp);
  inner.appendChild(header);

  /* Ventana de arte */
  const win = el('div', 'pc-window');
  const art = el('div', 'pc-art');
  if (card.wallpaper) {
    const img = el('img', 'pc-wall');
    img.src = card.wallpaper; img.alt = ''; img.loading = 'lazy';
    art.appendChild(img);
  } else {
    const cv = el('canvas', 'pc-canvas');
    cv.width = 548; cv.height = 460;
    art.appendChild(cv);
    card._artCanvas = cv;
  }
  art.appendChild(el('div', 'pc-floor'));

  const fr = monoFraming(card);
  const mono = el('div', 'pc-mono');
  mono.style.setProperty('--mx', fr.x.toFixed(1) + 'px');
  mono.style.setProperty('--my', fr.y.toFixed(1) + 'px');
  const sprite = el('canvas', 'pc-sprite');
  sprite.style.width = (fr.pixel * 24).toFixed(1) + 'px';
  if (fr.flip) sprite.style.transform = 'scaleX(-1)';
  mono.appendChild(sprite);
  art.appendChild(mono);
  card._sprite = sprite;
  card._spritePx = fr.pixel;

  win.appendChild(art);
  const cap = el('div', 'pc-caption');
  cap.innerHTML = '<span>DÍA ' + card.day + '</span><em>·</em><span>' + card.captionTag.toUpperCase() +
                  '</span><em>·</em><span>' + card.date + '</span>';
  win.appendChild(cap);
  inner.appendChild(win);

  /* Fila de ritmo — misma anatomía que la fila de ataque de una carta */
  const pace = el('div', 'pc-pace');
  pace.innerHTML =
    '<span class="pc-pace-ico"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#000" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6 2h12M6 22h12M8 2c0 5 8 5 8 0M8 22c0-5 8-5 8 0"/></svg></span>' +
    '<span class="pc-pace-lb">RITMO</span>' +
    '<span class="pc-pace-v"><b>' + card.pace + '</b><i>/' + (card.unit || 'KM') + '</i></span>';
  inner.appendChild(pace);

  /* Descripción */
  const detail = el('div', 'pc-detail');
  const detailText = el('span', 'pc-detail-t');
  detailText.innerHTML = card.detail;
  // Los textos largos bajan de cuerpo, como el minimumScaleFactor de la app.
  if (detailText.textContent.length > 108) detail.dataset.long = '1';
  detail.appendChild(detailText);
  inner.appendChild(detail);

  /* Pie: firma y número de colección */
  const foot = el('div', 'pc-foot');
  const logo = el('img', 'pc-logo');
  logo.src = 'assets/logo_sm.png'; logo.alt = 'Pacepal'; logo.loading = 'lazy';
  foot.appendChild(logo);
  foot.appendChild(el('span', 'pc-num', 'Nº ' + String(card.number).padStart(2, '0') + '/' + TOTAL_CARDS));
  inner.appendChild(foot);

  root.appendChild(inner);
  if (card.holo) {
    const holo = el('div', 'pc-holo');
    if (card.family === 'challenge') holo.dataset.showcase = '1';
    root.appendChild(holo);
  }
  root.appendChild(el('div', 'pc-gloss'));

  tilt.appendChild(root);
  stage.appendChild(tilt);
  stage._card = card;
  return stage;
}

/* ── Escalado y animación ──────────────────────────────────────────────── */

function fitCard(stage) {
  const w = stage.clientWidth || stage.parentElement.clientWidth;
  if (!w) return;
  const s = w / BASE_W;
  stage.style.height = (BASE_H * s) + 'px';
  const card = stage.querySelector('.pcard');
  card.style.transform = 'scale(' + s + ')';
}

function attachTilt(stage) {
  const tilt = stage.querySelector('.pcard-tilt');
  let raf = 0;
  function set(px, py) {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      tilt.style.transform = 'rotateY(' + (px * 13).toFixed(2) + 'deg) rotateX(' + (-py * 13).toFixed(2) + 'deg)';
      stage.style.setProperty('--hx', (50 + px * 42).toFixed(1) + '%');
      stage.style.setProperty('--hy', (50 + py * 42).toFixed(1) + '%');
    });
  }
  stage.addEventListener('pointermove', function (e) {
    const r = stage.getBoundingClientRect();
    set((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
  });
  stage.addEventListener('pointerleave', function () {
    tilt.style.transform = '';
    stage.style.removeProperty('--hx');
    stage.style.removeProperty('--hy');
  });
}

/* El sprite se anima solo cuando la tarjeta está en pantalla. */
const animated = [];
let animTimer = 0, animFrame = 0;

function tickSprites() {
  animFrame = (animFrame + 1) % 4;
  animated.forEach(function (c) {
    if (!c.visible) return;
    renderPet(c.sprite, c.pose, animFrame, Math.round(c.px * 2), null, c.dna);
  });
}

function renderSprite(entry) {
  renderPet(entry.sprite, entry.pose, animFrame, Math.round(entry.px * 2), null, entry.dna);
}

/* ── API pública ───────────────────────────────────────────────────────── */

function mount(container, card) {
  const stage = buildCard(card);
  container.appendChild(stage);

  const dna = (typeof PET_PRESETS !== 'undefined' && PET_PRESETS[card.pet]) || null;
  const entry = { sprite: card._sprite, pose: card.pose || 'cheer', px: card._spritePx, dna: dna, visible: true };
  animated.push(entry);
  renderSprite(entry);

  // El arte generativo es caro (miles de trazos por tarjeta): se pinta cuando
  // la tarjeta se acerca a la pantalla, no todas de golpe al cargar.
  if (card._artCanvas) {
    const paint = function () { if (!card._painted) { card._painted = true; paintArt(card._artCanvas, card); } };
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { paint(); io.disconnect(); } });
      }, { rootMargin: '600px' });
      io.observe(stage);
    } else { paint(); }
  }

  fitCard(stage);
  if (window.ResizeObserver) new ResizeObserver(function () { fitCard(stage); }).observe(stage);
  attachTilt(stage);

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { entry.visible = e.isIntersecting; });
    }, { threshold: 0 }).observe(stage);
  }
  return stage;
}

if (!animTimer) animTimer = setInterval(tickSprites, 220);

global.PacepalCards = {
  mount: mount,
  paintArt: paintArt,
  makePalette: makePalette,
  drawRoute: drawRoute,
  routePoints: routePoints,
  fitAll: function () { document.querySelectorAll('.pcard-stage').forEach(fitCard); },
  TOTAL: TOTAL_CARDS
};

})(window);
