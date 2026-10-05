const app = document.getElementById('app');
const $ = s => app.querySelector(s);
const params = new URLSearchParams(location.search);
const klasId = params.get('klas');
let pw = null;
try { pw = sessionStorage.getItem('woii_docent'); } catch (e) {}
let klas = null;
let sound = false;
let actx = null;
let skip = null;
const VAK = { woii: 'Tweede Wereldoorlog', politiek: 'Kamer en Kabinet' };

/* ---------- Geluid (standaard uit) ---------- */
function beep(freq, dur, type, gain) {
  if (!sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = gain || 0.12;
    o.connect(g); g.connect(actx.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) {}
}

/* ---------- Hulpfuncties ---------- */
function wait(ms) {
  return new Promise(res => {
    const t = setTimeout(() => { skip = null; res(); }, ms);
    skip = () => { clearTimeout(t); skip = null; res(); };
  });
}
function go() { if (skip) skip(); }
document.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { go(); } });
app.addEventListener('click', e => { if (!e.target.closest('button, select, input, a')) go(); });

function head(sub) {
  return `<div class="rv-head"><h1>Tussenstand</h1><div class="rv-sub">${esc(klas ? klas.naam : '')}${klas ? ' · ' + esc(VAK[klas.vak] || '') : ''}${sub ? ' · ' + esc(sub) : ''}</div></div>`;
}
function message(text) {
  app.innerHTML = head() + `<div class="rv-center"><p>${esc(text)}</p><div class="rv-controls"><button class="btn ghost" id="close">Sluiten</button></div></div>`;
  $('#close').onclick = () => window.close();
}

/* ---------- Inloggen indien nodig ---------- */
function viewLogin(msg) {
  app.innerHTML = head() + `<div class="rv-center"><h2>Docent wachtwoord</h2>
    <form id="f" class="rv-controls"><input id="pw" type="password" autocomplete="current-password" style="width:28vw;font-size:2.4vh">
    <button class="btn" type="submit">Verder</button></form><p id="m">${esc(msg || '')}</p></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault();
    pw = $('#pw').value;
    const ok = await loadKlas();
    if (ok) { try { sessionStorage.setItem('woii_docent', pw); } catch (e2) {} viewStart(); }
  };
  $('#pw').focus();
}

async function fetchOverview() {
  const r = await rpc('teacher_overview', { p_password: pw, p_class_id: klasId });
  return r;
}
async function loadKlas() {
  const r = await fetchOverview();
  if (r.error) {
    if (r.error === 'verkeerd_wachtwoord') { viewLogin(errText(r.error)); return false; }
    message(errText(r.error)); return false;
  }
  klas = r.klas;
  document.body.dataset.vak = klas.vak === 'politiek' ? 'politiek' : 'woii';
  return true;
}

/* ---------- Startscherm ---------- */
function viewStart() {
  app.innerHTML = head() + `<div class="rv-center"><h2>Klaar voor de onthulling?</h2>
    <p>De stand wordt pas getoond als de klok is afgelopen. Van de laatste plek tot de winnaar.</p>
    <div class="rv-controls">
      <label for="secs" style="font-size:2.2vh;margin:0;font-weight:400">Aftellen vanaf</label>
      <select id="secs"><option value="5">5 seconden</option><option value="10" selected>10 seconden</option><option value="20">20 seconden</option><option value="30">30 seconden</option></select>
      <button class="btn ghost" id="snd" type="button">Geluid: uit</button>
      <button class="btn" id="start" type="button">Start de klok</button>
    </div>
    <p style="font-size:2vh">Tip: spatie of klik slaat een wachtmoment over.</p></div>`;
  $('#snd').onclick = () => { sound = !sound; $('#snd').textContent = 'Geluid: ' + (sound ? 'aan' : 'uit'); beep(660, 0.15); };
  $('#start').onclick = () => run(parseInt($('#secs').value, 10));
}

/* ---------- Aftellen en onthullen ---------- */
async function run(secs) {
  app.innerHTML = head('de stand wordt zo getoond') + '<div class="rv-center"><div class="rv-count" id="count"></div></div>';
  for (let n = secs; n >= 1; n--) {
    const c = $('#count');
    c.textContent = n; c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
    beep(n <= 3 ? 880 : 520, 0.18, 'square', 0.06);
    await wait(1000);
  }
  const r = await fetchOverview();
  if (r.error) { if (r.error === 'verkeerd_wachtwoord') { viewLogin(errText(r.error)); } else { message(errText(r.error)); } return; }
  klas = r.klas;
  const rows = r.spelers.filter(p => p.status === 'actief')
    .sort((a, b) => b.score - a.score || a.dier.localeCompare(b.dier, 'nl'));
  if (!rows.length) { message('Er staan nog geen spelers in de lijst.'); return; }
  let plek = 0, prev = null;
  rows.forEach((p, i) => { if (p.score !== prev) { plek = i + 1; prev = p.score; } p.plek = plek; });
  await reveal(rows);
}

async function reveal(rows) {
  const n = rows.length;
  app.innerHTML = head('') + `<ol class="rv-list" id="list">${rows.map(p => `<li class="rv-row${p.plek === 1 ? ' p1' : (p.plek === 2 ? ' p2' : (p.plek === 3 ? ' p3' : ''))}">
    <span class="pl">${p.plek}</span><span class="em">${emoji(p.dier)}</span><span class="nm">${esc(p.dier)}</span><span class="sc">${p.score}<small>punten</small></span></li>`).join('')}</ol>
    <div class="rv-hint">Spatie of klik: sneller</div>`;
  const list = $('#list');
  const fit = () => {
    const h = list.clientHeight;
    const rh = Math.min(window.innerHeight * 0.11, (h - (n - 1) * window.innerHeight * 0.007) / n);
    list.style.setProperty('--rh', rh + 'px');
  };
  fit(); window.addEventListener('resize', fit);
  const els = Array.from(list.children);
  for (let i = n - 1; i >= 0; i--) {
    const el = els[i], pl = el.querySelector('.pl'), real = pl.textContent;
    const pos = i + 1;
    const pause = pos > 10 ? 450 : (pos > 3 ? 1700 : (pos > 1 ? 3500 : 6000));
    el.classList.add('q'); pl.textContent = '?';
    if (pos <= 3) {
      const beats = Math.floor(pause / 450);
      for (let b = 0; b < beats; b++) { beep(pos === 1 ? 200 + b * 25 : 260, 0.1, 'triangle', 0.1); await wait(pause / beats); }
    } else {
      beep(300 + (n - pos) * 8, 0.08, 'sine', 0.06);
      await wait(pause);
    }
    el.classList.remove('q'); el.classList.add('in'); pl.textContent = real;
    if (pos === 1) { beep(523, 0.25, 'triangle', 0.12); setTimeout(() => beep(659, 0.25, 'triangle', 0.12), 150); setTimeout(() => beep(784, 0.5, 'triangle', 0.12), 300); confetti(); }
    else beep(400 + (n - pos) * 10, 0.15, 'sine', 0.1);
    if (pos > 1) await wait(pos > 3 ? 150 : 1200);
  }
  const hint = $('.rv-hint');
  if (hint) hint.innerHTML = '<button class="btn ghost" id="again">Opnieuw</button> <button class="btn ghost" id="close">Sluiten</button>';
  $('#again').onclick = viewStart;
  $('#close').onclick = () => window.close();
}

/* ---------- Confetti ---------- */
function confetti() {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#ff00e6', '#ffffff', '#ffd23f', '#5a8be0', '#7ee0b0'];
  const ps = Array.from({ length: 160 }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, w: 6 + Math.random() * 8, h: 10 + Math.random() * 10,
    vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4, r: Math.random() * 6, vr: -0.2 + Math.random() * 0.4, c: colors[Math.floor(Math.random() * colors.length)]
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
    if (t - t0 < 5000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
  })(t0);
}

/* ---------- Start ---------- */
(async function init() {
  if (!klasId) { message('Open deze pagina via de docentenpagina, met de knop bij een klas.'); return; }
  if (!pw) { viewLogin(); return; }
  if (await loadKlas()) viewStart();
})();
