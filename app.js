'use strict';
/* ---------- utilità e stato ---------- */
const KEY = 'palestra.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = s => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  const p = n => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
};

function load() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && Array.isArray(j.plans)) {
      j.history = j.history || [];
      j.settings = Object.assign({ sound: true, vibrate: true }, j.settings);
      return j;
    }
  } catch (e) { /* dati assenti o corrotti */ }
  return { plans: SEED(), history: [], active: null, rest: null, settings: { sound: true, vibrate: true } };
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Salvataggio non riuscito (memoria piena?)'); }
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignora */ }

const ui = { view: 'home', plan: null, day: null, open: {}, hTab: 'sessions', hOpen: {}, newDraw: '', newPhoto: '', addDay: null };

const getPlan = id => S.plans.find(p => p.id === id);
const getDay = (p, id) => p && p.days.find(d => d.id === id);
function findItem(id) {
  for (const p of S.plans) for (const d of p.days) { const it = d.items.find(i => i.id === id); if (it) return it; }
  return null;
}
const allItems = () => S.plans.flatMap(p => p.days.flatMap(d => d.items));

function lastFor(name) {
  const n = name.trim().toLowerCase();
  for (const h of S.history) {
    const e = h.entries.find(x => x.name.trim().toLowerCase() === n);
    if (e) {
      const withW = [...e.sets].reverse().find(s => s.w !== '' && s.w != null);
      return { w: withW ? withW.w : '', r: withW ? withW.r : '' };
    }
  }
  return null;
}

function ensureSets(it) {
  const A = S.active;
  if (!A.sets[it.id]) {
    const l = lastFor(it.name);
    const n = Math.max(1, parseInt(it.sets, 10) || 3);
    A.sets[it.id] = Array.from({ length: n }, () => ({ w: l ? l.w : '', r: /^\d+$/.test(it.reps) ? it.reps : '', d: false }));
  }
  return A.sets[it.id];
}

/* ---------- feedback: toast, suono, vibrazione ---------- */
let toastT;
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
}
let AC;
function beep(freq = 880, dur = .18, times = 1) {
  if (!S.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    for (let i = 0; i < times; i++) {
      const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + i * (dur + .08);
      o.frequency.value = freq; o.connect(g); g.connect(AC.destination);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.4, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.start(t); o.stop(t + dur + .02);
    }
  } catch (e) { /* audio non disponibile */ }
}
const vib = p => { if (S.settings.vibrate) try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignora */ } };
addEventListener('pointerdown', () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) { /* ignora */ } }, { once: true });

let WL = null;
async function wake() { try { if ('wakeLock' in navigator && S.active && !WL) { WL = await navigator.wakeLock.request('screen'); WL.addEventListener('release', () => { WL = null; }); } } catch (e) { /* ignora */ } }
function unwake() { try { WL && WL.release(); } catch (e) { /* ignora */ } WL = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });

/* ---------- media (disegno / foto) ---------- */
function media(it, big) {
  if (it.photo) return `<img src="${it.photo}" alt="">`;
  const s = DRAW.svg(it.draw, big ? { anim: true } : {});
  return s || `<div class="noimg">${esc((it.name || '?').trim()[0] || '?').toUpperCase()}</div>`;
}

/* ---------- viste ---------- */
function vHome() {
  let h = '';
  if (S.active) {
    const p = getPlan(S.active.pid), d = getDay(p, S.active.did);
    if (d) h += `<section class="card pad" style="border-color:var(--acc)"><h2>Allenamento in corso</h2><div class="sub">${esc(p.name)} · ${esc(d.name)}</div><button class="btn pri" data-act="toWorkout">Riprendi</button></section>`;
  }
  h += S.plans.map(p => `<section class="card pad">
    <div class="row" style="align-items:flex-start"><div class="grow"><h2>${esc(p.name)}</h2><div class="sub">${esc(p.sub || '')}</div></div>
    <button class="ib" data-act="edit" data-p="${p.id}" aria-label="Modifica">✎</button></div>
    ${p.note ? `<div class="sub" style="margin-top:0">${esc(p.note)}</div>` : ''}
    <div class="days">${p.days.map(d => `<button class="btn" data-act="start" data-p="${p.id}" data-d="${d.id}">${esc(d.name)}<small>${d.items.length} esercizi</small></button>`).join('')}</div></section>`).join('');
  h += `<button class="btn ghost" data-act="newPlan">+ Nuova scheda</button>`;
  return h;
}

function vWorkout() {
  const p = getPlan(ui.plan), d = getDay(p, ui.day), A = S.active;
  if (!d || !A) { ui.view = 'home'; return vHome(); }
  const done = d.items.filter(i => { const s = ensureSets(i); return s.length && s.every(x => x.d); }).length;
  return `<div class="sub">${esc(p.name)}</div>
  <div class="bar"><i style="width:${d.items.length ? done / d.items.length * 100 : 0}%"></i></div>
  ${d.items.map(itemCard).join('')}
  <button class="btn ghost" data-act="addEx" data-d="${d.id}">+ Aggiungi esercizio</button>
  <button class="btn pri" data-act="finish">Termina e salva</button>
  <button class="btn ghost" data-act="cancelSession">Scarta allenamento</button>`;
}

function itemCard(it) {
  const st = ensureSets(it), dn = st.filter(s => s.d).length, open = ui.open[it.id], l = lastFor(it.name);
  const rows = st.map((s, i) => `<div class="set ${s.d ? 'd' : ''}"><span class="n">${i + 1}</span>
    <input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${esc(s.w)}" data-f="w" data-id="${it.id}" data-i="${i}" aria-label="Peso serie ${i + 1}">
    <span>kg ×</span>
    <input type="text" inputmode="numeric" placeholder="${esc(it.reps)}" value="${esc(s.r)}" data-f="r" data-id="${it.id}" data-i="${i}" aria-label="Ripetizioni serie ${i + 1}">
    <button class="chk" data-act="chk" data-id="${it.id}" data-i="${i}" aria-label="Serie fatta">✓</button></div>`).join('');
  return `<section class="card ${st.length && dn === st.length ? 'ok' : ''}">
    <div class="ih" data-act="tog" data-id="${it.id}"><div class="th">${media(it, false)}</div>
      <div class="im"><b>${esc(it.name)}</b><small>${esc(it.sets)}×${esc(it.reps)} · pausa ${esc(it.rest)}″${l && l.w !== '' ? ` · ultimo ${esc(l.w)} kg` : ''}</small></div>
      <div class="cnt">${dn}/${st.length}</div></div>
    ${open ? `<div class="body"><div class="big">${media(it, true)}</div>${rows}
      <textarea placeholder="Note (sensazioni, regolazione macchina…)" data-note="${it.id}">${esc(S.active.notes[it.id] || '')}</textarea>
      <div class="acts"><button class="btn sm" data-act="addSet" data-id="${it.id}">+ serie</button><button class="btn sm" data-act="delSet" data-id="${it.id}">− serie</button>
      <button class="btn sm" data-act="pickDraw" data-id="${it.id}">Disegno / foto</button><button class="btn sm" data-act="startRestNow" data-id="${it.id}">Timer pausa</button></div></div>` : ''}
  </section>`;
}

function vHistory() {
  const tabs = `<div class="tabs"><button class="${ui.hTab === 'sessions' ? 'on' : ''}" data-act="hTab" data-t="sessions">Sessioni</button><button class="${ui.hTab === 'progress' ? 'on' : ''}" data-act="hTab" data-t="progress">Progressi</button></div>`;
  if (!S.history.length) return tabs + `<p class="mut">Nessun allenamento salvato. Completa delle serie e premi “Termina e salva”.</p>`;
  if (ui.hTab === 'progress') return tabs + progress();
  return tabs + S.history.map(h => {
    const vol = h.entries.reduce((a, e) => a + e.sets.reduce((b, s) => b + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0), 0);
    const date = new Date(h.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const open = ui.hOpen[h.id];
    return `<section class="card pad"><div class="row" style="align-items:center;margin:0" data-act="hTog" data-id="${h.id}"><div class="grow"><h2>${esc(h.plan)} · ${esc(h.day)}</h2>
      <div class="ss"><span><b>${date}</b></span><span>durata <b>${fmt(h.dur)}</b></span><span>volume <b>${Math.round(vol)}</b> kg</span></div></div><span class="mut">${open ? '▾' : '▸'}</span></div>
      ${open ? h.entries.map(e => `<div class="ent"><b>${esc(e.name)}</b><br><small>${e.sets.map(s => `${esc(s.w || '–')}×${esc(s.r || '–')}`).join(' · ')}</small>${e.note ? `<br><small>“${esc(e.note)}”</small>` : ''}</div>`).join('') + `<button class="btn danger" data-act="delHist" data-id="${h.id}">Elimina sessione</button>` : ''}</section>`;
  }).join('');
}

function spark(v) {
  if (v.length < 2) return '';
  const mx = Math.max(...v), mn = Math.min(...v), W = 90, H = 26;
  const pts = v.map((y, i) => `${(i / (v.length - 1) * W).toFixed(1)},${(H - 3 - (mx === mn ? (H - 6) / 2 : (y - mn) / (mx - mn) * (H - 6))).toFixed(1)}`).join(' ');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function progress() {
  const m = new Map();
  [...S.history].reverse().forEach(h => h.entries.forEach(e => {
    const k = e.name.trim().toLowerCase();
    const mxw = Math.max(0, ...e.sets.map(s => parseFloat(s.w) || 0));
    if (!m.has(k)) m.set(k, { name: e.name, v: [], best: 0 });
    const o = m.get(k); o.name = e.name; if (mxw > 0) { o.v.push(mxw); o.best = Math.max(o.best, mxw); }
  }));
  const rows = [...m.values()].filter(o => o.v.length).sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) return `<p class="mut">Registra dei pesi per vedere i progressi.</p>`;
  return rows.map(o => `<section class="card pad"><div class="row" style="align-items:center;margin:0"><div class="grow"><b>${esc(o.name)}</b><div class="ss"><span>ultimo <b>${o.v[o.v.length - 1]}</b> kg</span><span>record <b>${o.best}</b> kg</span><span>${o.v.length} sess.</span></div></div>${spark(o.v.slice(-12))}</div></section>`).join('');
}

/* Strumenti: timer round + cronometro + impostazioni + backup */
const R = { cfg: { rounds: 3, work: 180, rest: 60, warm: 10 }, phase: 'idle', round: 0, end: 0, tot: 0, left: 0, paused: false, warned: false };
const SW = { run: false, start: 0, acc: 0 };
function vTools() {
  const c = R.cfg;
  return `<section class="card pad"><h2>Timer round (boxe / HIIT)</h2>
    <div class="row"><label>Round<input type="number" inputmode="numeric" data-r="rounds" value="${c.rounds}"></label><label>Lavoro (s)<input type="number" inputmode="numeric" data-r="work" value="${c.work}"></label><label>Recupero (s)<input type="number" inputmode="numeric" data-r="rest" value="${c.rest}"></label><label>Prep. (s)<input type="number" inputmode="numeric" data-r="warm" value="${c.warm}"></label></div>
    <div class="phase" id="rph"></div><div class="big-time" id="rt">--:--</div><div class="phase" id="rrd"></div>
    <div class="row"><button class="btn pri" data-act="rGo" id="rgo">Avvia</button><button class="btn ghost" data-act="rReset">Reset</button></div></section>
    <section class="card pad"><h2>Cronometro</h2><div class="big-time" id="swt" style="font-size:48px">00:00</div>
    <div class="row"><button class="btn pri" data-act="swGo" id="swgo">Avvia</button><button class="btn ghost" data-act="swReset">Reset</button></div></section>
    <section class="card pad"><h2>Impostazioni</h2>
    <div class="row"><label style="display:flex;gap:10px;align-items:center;color:var(--txt);font-size:15px"><input type="checkbox" style="width:22px;height:22px;margin:0" data-set="sound" ${S.settings.sound ? 'checked' : ''}>Suoni</label>
    <label style="display:flex;gap:10px;align-items:center;color:var(--txt);font-size:15px"><input type="checkbox" style="width:22px;height:22px;margin:0" data-set="vibrate" ${S.settings.vibrate ? 'checked' : ''}>Vibrazione</label></div></section>
    <section class="card pad"><h2>Backup</h2><div class="sub">I dati restano su questo dispositivo. Esporta un file per salvarli o spostarli.</div>
    <button class="btn" data-act="export">Esporta backup (.json)</button>
    <label class="btn ghost" style="text-align:center;color:var(--txt);font-size:15px">Importa backup<input type="file" accept="application/json,.json" id="impIn" hidden></label>
    <button class="btn danger" data-act="resetAll">Ripristina schede iniziali e cancella tutto</button></section>`;
}

function vEdit() {
  const p = getPlan(ui.plan); if (!p) { ui.view = 'home'; return vHome(); }
  return `<section class="card pad"><label>Nome scheda<input data-ep="name" value="${esc(p.name)}"></label>
    <label style="margin-top:8px">Periodo / sottotitolo<input data-ep="sub" value="${esc(p.sub || '')}"></label>
    <label style="margin-top:8px">Note<textarea data-ep="note">${esc(p.note || '')}</textarea></label></section>
    ${p.days.map(d => `<section class="card pad"><div class="row"><label>Giorno<input data-ed="${d.id}" value="${esc(d.name)}"></label>
      <button class="ib" data-act="dayMv" data-d="${d.id}" data-dir="-1">↑</button><button class="ib" data-act="dayMv" data-d="${d.id}" data-dir="1">↓</button><button class="ib x" data-act="delDay" data-d="${d.id}">✕</button></div>
      ${d.items.map(i => `<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:8px"><div class="row"><div class="th" style="width:64px;height:40px">${media(i, false)}</div><input class="grow" data-ei="${i.id}" data-k="name" value="${esc(i.name)}">
        <button class="ib" data-act="itMv" data-d="${d.id}" data-id="${i.id}" data-dir="-1">↑</button><button class="ib" data-act="itMv" data-d="${d.id}" data-id="${i.id}" data-dir="1">↓</button><button class="ib x" data-act="delIt" data-d="${d.id}" data-id="${i.id}">✕</button></div>
        <div class="row"><label>Serie<input inputmode="numeric" data-ei="${i.id}" data-k="sets" value="${esc(i.sets)}"></label><label>Rip.<input data-ei="${i.id}" data-k="reps" value="${esc(i.reps)}"></label><label>Pausa ″<input inputmode="numeric" data-ei="${i.id}" data-k="rest" value="${esc(i.rest)}"></label><button class="btn sm" style="height:44px" data-act="pickDraw" data-id="${i.id}">Disegno</button></div></div>`).join('')}
      <button class="btn ghost" data-act="addEx" data-d="${d.id}">+ Esercizio</button></section>`).join('')}
    <button class="btn ghost" data-act="addDay">+ Giorno</button>
    <button class="btn" data-act="dupPlan">Duplica scheda</button>
    <button class="btn danger" data-act="delPlan">Elimina scheda</button>`;
}

const navOf = v => (v === 'workout' || v === 'edit' ? 'home' : v);
function render(keep) {
  const y = scrollY, v = ui.view;
  let html, title = 'Schede';
  if (v === 'workout') { const p = getPlan(ui.plan); const d = getDay(p, ui.day); title = d ? d.name : 'Allenamento'; html = vWorkout(); if (ui.view !== 'workout') { render(); return; } }
  else if (v === 'edit') { title = 'Modifica scheda'; html = vEdit(); }
  else if (v === 'history') { title = 'Storico'; html = vHistory(); }
  else if (v === 'tools') { title = 'Strumenti'; html = vTools(); }
  else html = vHome();
  $('#main').innerHTML = html;
  $('#title').textContent = title;
  $('#back').hidden = !(v === 'workout' || v === 'edit');
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === navOf(ui.view)));
  updateClock(); renderRestBar();
  if (v === 'tools') { rDisp(); swDisp(); }
  scrollTo(0, keep ? y : 0);
}

/* ---------- timer di sessione e pausa ---------- */
function updateClock() {
  const c = $('#clock');
  c.hidden = !S.active;
  if (S.active) c.textContent = fmt((Date.now() - S.active.start) / 1000);
}
function startRest(sec, label) {
  S.rest = { end: Date.now() + sec * 1000, total: sec, label, done: false };
  save(); renderRestBar();
}
function renderRestBar() {
  const b = $('#restbar'), r = S.rest;
  b.hidden = !r;
  if (!r) return;
  const left = (r.end - Date.now()) / 1000;
  b.classList.toggle('done', r.done);
  $('#rlab').textContent = r.done ? 'Pausa finita' : 'Pausa · ' + r.label;
  $('#rtime').textContent = r.done ? 'VIA!' : fmt(Math.ceil(left));
  $('#rfill').style.width = r.done ? '100%' : Math.max(0, Math.min(100, (1 - left / r.total) * 100)) + '%';
}

/* timer round */
function rSet(ph) {
  R.phase = ph; R.paused = false; R.warned = false;
  R.tot = ph === 'warm' ? R.cfg.warm : ph === 'work' ? R.cfg.work : R.cfg.rest;
  R.end = Date.now() + R.tot * 1000;
  beep(ph === 'work' ? 1200 : 600, .5); vib(ph === 'work' ? [200, 80, 200] : 200);
}
function rTick() {
  if (!['warm', 'work', 'rest'].includes(R.phase) || R.paused) return;
  const left = (R.end - Date.now()) / 1000;
  if (R.phase === 'work' && !R.warned && left <= 10 && R.tot > 20) { R.warned = true; beep(1000, .12, 2); }
  if (left <= 0) {
    if (R.phase === 'warm') rSet('work');
    else if (R.phase === 'work') {
      if (R.round >= R.cfg.rounds) { R.phase = 'done'; beep(900, .6, 3); vib([300, 100, 300, 100, 300]); }
      else if (R.cfg.rest > 0) rSet('rest');
      else { R.round++; rSet('work'); }
    } else { R.round++; rSet('work'); }
  }
}
function rDisp() {
  const t = $('#rt'); if (!t) return;
  const names = { idle: '', warm: 'Preparati', work: 'Lavoro', rest: 'Recupero', done: 'Finito!' };
  const left = R.phase === 'idle' ? R.cfg.work : R.phase === 'done' ? 0 : R.paused ? R.left : (R.end - Date.now()) / 1000;
  t.textContent = fmt(Math.ceil(left));
  $('#rph').textContent = names[R.phase] + (R.paused ? ' (pausa)' : '');
  $('#rph').className = 'phase ' + (R.phase === 'rest' ? 'rest' : R.phase === 'work' ? 'work' : '');
  $('#rrd').textContent = R.phase === 'idle' ? '' : `Round ${Math.min(R.round, R.cfg.rounds)} / ${R.cfg.rounds}`;
  const running = ['warm', 'work', 'rest'].includes(R.phase) && !R.paused;
  $('#rgo').textContent = running ? 'Pausa' : R.paused ? 'Riprendi' : 'Avvia';
}
function swDisp() {
  const t = $('#swt'); if (!t) return;
  t.textContent = fmt((SW.acc + (SW.run ? Date.now() - SW.start : 0)) / 1000);
  $('#swgo').textContent = SW.run ? 'Stop' : 'Avvia';
}

setInterval(() => {
  updateClock();
  const r = S.rest;
  if (r) {
    if (!r.done && r.end - Date.now() <= 0) { r.done = true; r.doneAt = Date.now(); save(); beep(880, .18, 3); vib([250, 100, 250, 100, 250]); }
    if (r.done && Date.now() - r.doneAt > 4000) { S.rest = null; save(); }
    renderRestBar();
  }
  rTick(); rDisp(); swDisp();
}, 250);

/* ---------- modali ---------- */
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
const drawGrid = (cur, act) => `<div class="grid">${DRAW.keys().map(({ k, name }) => `<button class="pk ${cur === k ? 'on' : ''}" data-act="${act}" data-k="${k}">${DRAW.svg(k, { first: true })}<br>${esc(name)}</button>`).join('')}</div>`;

function pickDraw(id) {
  const it = findItem(id); if (!it) return;
  ui.pickId = id;
  modal(`<h3>Disegno · ${esc(it.name)}</h3>
    <label class="btn pri" style="text-align:center;font-size:15px;margin:0 0 6px">Scatta / carica foto<input type="file" accept="image/*" id="photoIn" data-for="${id}" hidden></label>
    ${it.photo ? `<button class="btn ghost" data-act="rmPhoto" data-id="${id}">Rimuovi foto</button>` : ''}
    <div class="lab">Oppure scegli un disegno</div>${drawGrid(it.draw, 'setDraw')}
    <button class="btn ghost" data-act="close">Chiudi</button>`);
}
function addExModal(dayId) {
  ui.newDraw = ''; ui.newPhoto = ''; ui.addDay = dayId;
  const names = [...new Set(allItems().map(i => i.name))].sort();
  modal(`<h3>Nuovo esercizio</h3>
    <label>Nome<input id="nx-name" list="names" autocomplete="off" placeholder="es. Cable crossover"></label><datalist id="names">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="row"><label>Serie<input id="nx-sets" inputmode="numeric" value="3"></label><label>Rip.<input id="nx-reps" value="10"></label><label>Pausa ″<input id="nx-rest" inputmode="numeric" value="90"></label></div>
    <label class="btn" style="text-align:center;font-size:15px">Aggiungi foto (facoltativo)<input type="file" accept="image/*" id="photoIn" data-for="new" hidden></label>
    <div class="lab">Disegno</div>${drawGrid('', 'nxDraw')}
    <button class="btn pri" data-act="nxSave">Aggiungi</button><button class="btn ghost" data-act="close">Annulla</button>`);
}

function resizeImage(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 420 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .72));
    };
    img.onerror = () => toast('Immagine non valida');
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* ---------- azioni ---------- */
function startDay(pid, did) {
  const A = S.active;
  if (A && !(A.pid === pid && A.did === did) && !confirm('Hai un allenamento in corso. Scartarlo e iniziarne un altro?')) return;
  if (!A || A.pid !== pid || A.did !== did) { S.active = { pid, did, start: Date.now(), sets: {}, notes: {} }; S.rest = null; }
  save(); ui.view = 'workout'; ui.plan = pid; ui.day = did; render(); wake();
}
function finish() {
  const A = S.active, p = getPlan(A.pid), d = getDay(p, A.did), entries = [];
  d.items.forEach(it => {
    const sets = (A.sets[it.id] || []).filter(s => s.d).map(s => ({ w: s.w, r: s.r }));
    if (sets.length) entries.push({ name: it.name, draw: it.draw, sets, note: A.notes[it.id] || '' });
  });
  if (!entries.length && !confirm('Nessuna serie completata. Uscire senza salvare?')) return;
  if (entries.length) { S.history.unshift({ id: uid(), date: new Date().toISOString(), plan: p.name, day: d.name, dur: Math.round((Date.now() - A.start) / 1000), entries }); toast('Allenamento salvato'); }
  S.active = null; S.rest = null; save(); unwake();
  ui.view = entries.length ? 'history' : 'home'; ui.hTab = 'sessions'; render();
}
const swap = (arr, i, j) => { if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; };

document.addEventListener('click', e => {
  if (e.target.id === 'modal') return closeModal();
  const a = e.target.closest('[data-act]'); if (!a) return;
  const d = a.dataset, act = d.act;
  switch (act) {
    case 'nav': ui.view = d.v; render(); break;
    case 'back': ui.view = ui.view === 'edit' && S.active ? 'workout' : 'home'; render(); break;
    case 'toWorkout': if (S.active) { ui.view = 'workout'; ui.plan = S.active.pid; ui.day = S.active.did; render(); } break;
    case 'start': startDay(d.p, d.d); break;
    case 'tog': ui.open[d.id] = !ui.open[d.id]; render(true); break;
    case 'chk': {
      const st = S.active.sets[d.id], i = +d.i, s = st[i];
      s.d = !s.d;
      if (s.d) { for (let j = i + 1; j < st.length; j++) if (!st[j].d && st[j].w === '') st[j].w = s.w; const it = findItem(d.id); if (it) startRest(parseInt(it.rest, 10) || 60, it.name); vib(30); }
      save(); render(true); break;
    }
    case 'addSet': { const st = S.active.sets[d.id]; const l = st[st.length - 1] || { w: '', r: '' }; st.push({ w: l.w, r: l.r, d: false }); save(); render(true); break; }
    case 'delSet': { const st = S.active.sets[d.id]; if (st.length > 1) st.pop(); save(); render(true); break; }
    case 'startRestNow': { const it = findItem(d.id); startRest(parseInt(it.rest, 10) || 60, it.name); break; }
    case 'rm': if (S.rest) { S.rest.end -= 15000; S.rest.total = Math.max(5, S.rest.total - 15); S.rest.done = false; save(); } break;
    case 'rp': if (S.rest) { S.rest.end += 15000; S.rest.total += 15; S.rest.done = false; save(); } break;
    case 'rskip': S.rest = null; save(); renderRestBar(); break;
    case 'finish': finish(); break;
    case 'cancelSession': if (confirm('Scartare questo allenamento senza salvarlo?')) { S.active = null; S.rest = null; save(); unwake(); ui.view = 'home'; render(); } break;
    case 'pickDraw': pickDraw(d.id); break;
    case 'setDraw': { const it = findItem(ui.pickId); if (it) { it.draw = d.k; delete it.photo; save(); } closeModal(); render(true); break; }
    case 'rmPhoto': { const it = findItem(d.id); if (it) { delete it.photo; save(); } closeModal(); render(true); break; }
    case 'nxDraw': ui.newDraw = d.k; $$('#modal .pk').forEach(b => b.classList.toggle('on', b.dataset.k === d.k)); break;
    case 'addEx': addExModal(d.d); break;
    case 'nxSave': {
      const name = $('#nx-name').value.trim(); if (!name) { toast('Inserisci un nome'); break; }
      const p = getPlan(ui.plan), day = getDay(p, ui.addDay); if (!day) break;
      const it = { id: uid(), name, sets: $('#nx-sets').value || '3', reps: $('#nx-reps').value || '10', rest: $('#nx-rest').value || '90', draw: ui.newDraw };
      if (ui.newPhoto) it.photo = ui.newPhoto;
      day.items.push(it); save(); closeModal(); toast('Esercizio aggiunto'); render(true); break;
    }
    case 'close': closeModal(); break;
    case 'edit': ui.plan = d.p; ui.view = 'edit'; render(); break;
    case 'newPlan': { const p = { id: uid(), name: 'Nuova scheda', sub: '', note: '', days: [{ id: uid(), name: 'Giorno 1', items: [] }] }; S.plans.push(p); save(); ui.plan = p.id; ui.view = 'edit'; render(); break; }
    case 'dupPlan': { const p = JSON.parse(JSON.stringify(getPlan(ui.plan))); p.id = uid(); p.name += ' (copia)'; p.days.forEach(x => { x.id = uid(); x.items.forEach(i => { i.id = uid(); }); }); S.plans.push(p); save(); ui.plan = p.id; toast('Scheda duplicata'); render(); break; }
    case 'delPlan': if (confirm('Eliminare questa scheda? Lo storico resta.')) { if (S.active && S.active.pid === ui.plan) { S.active = null; S.rest = null; unwake(); } S.plans = S.plans.filter(p => p.id !== ui.plan); save(); ui.view = 'home'; render(); } break;
    case 'addDay': { const p = getPlan(ui.plan); p.days.push({ id: uid(), name: 'Giorno ' + (p.days.length + 1), items: [] }); save(); render(true); break; }
    case 'delDay': if (confirm('Eliminare il giorno e i suoi esercizi?')) { const p = getPlan(ui.plan); p.days = p.days.filter(x => x.id !== d.d); if (S.active && S.active.did === d.d) { S.active = null; S.rest = null; unwake(); } save(); render(true); } break;
    case 'dayMv': { const p = getPlan(ui.plan), i = p.days.findIndex(x => x.id === d.d); swap(p.days, i, i + +d.dir); save(); render(true); break; }
    case 'itMv': { const day = getDay(getPlan(ui.plan), d.d), i = day.items.findIndex(x => x.id === d.id); swap(day.items, i, i + +d.dir); save(); render(true); break; }
    case 'delIt': { const day = getDay(getPlan(ui.plan), d.d); day.items = day.items.filter(x => x.id !== d.id); save(); render(true); break; }
    case 'hTab': ui.hTab = d.t; render(); break;
    case 'hTog': ui.hOpen[d.id] = !ui.hOpen[d.id]; render(true); break;
    case 'delHist': if (confirm('Eliminare questa sessione?')) { S.history = S.history.filter(h => h.id !== d.id); save(); render(true); } break;
    case 'rGo': {
      if (R.phase === 'idle' || R.phase === 'done') { R.round = 1; rSet(R.cfg.warm > 0 ? 'warm' : 'work'); }
      else if (R.paused) { R.paused = false; R.end = Date.now() + R.left * 1000; }
      else { R.left = (R.end - Date.now()) / 1000; R.paused = true; }
      rDisp(); break;
    }
    case 'rReset': R.phase = 'idle'; R.paused = false; R.round = 0; rDisp(); break;
    case 'swGo': if (SW.run) { SW.acc += Date.now() - SW.start; SW.run = false; } else { SW.start = Date.now(); SW.run = true; } swDisp(); break;
    case 'swReset': SW.run = false; SW.acc = 0; swDisp(); break;
    case 'export': {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `palestra-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 2000); break;
    }
    case 'resetAll': if (confirm('Cancellare TUTTO (schede modificate, storico) e ripristinare le schede iniziali?')) { S = { plans: SEED(), history: [], active: null, rest: null, settings: S.settings }; save(); unwake(); toast('Ripristinato'); render(); } break;
  }
});

/* input: salvataggio immediato senza ridisegnare (non perde il focus) */
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.f) { const s = S.active && S.active.sets[d.id] && S.active.sets[d.id][+d.i]; if (s) { s[d.f] = t.value; save(); } }
  else if (d.note) { S.active.notes[d.note] = t.value; save(); }
  else if (d.ep) { getPlan(ui.plan)[d.ep] = t.value; save(); }
  else if (d.ed) { getDay(getPlan(ui.plan), d.ed).name = t.value; save(); }
  else if (d.ei) { const it = findItem(d.ei); if (it) { it[d.k] = t.value; save(); } }
  else if (d.r) { R.cfg[d.r] = Math.max(0, parseInt(t.value, 10) || 0); }
  else if (d.set) { S.settings[d.set] = t.checked; save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'photoIn' && t.files[0]) {
    const f = t.dataset.for;
    resizeImage(t.files[0], url => {
      if (f === 'new') { ui.newPhoto = url; toast('Foto pronta'); }
      else { const it = findItem(f); if (it) { it.photo = url; save(); } closeModal(); render(true); }
    });
  } else if (t.id === 'impIn' && t.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const j = JSON.parse(fr.result);
        if (!Array.isArray(j.plans)) throw new Error('formato');
        if (!confirm('Sostituire i dati attuali con il backup?')) return;
        S = Object.assign({ history: [], active: null, rest: null, settings: { sound: true, vibrate: true } }, j); save(); toast('Backup importato'); ui.view = 'home'; render();
      } catch (err) { toast('File di backup non valido'); }
    };
    fr.readAsText(t.files[0]);
  } else if (t.id === 'nx-name') {
    const n = t.value.trim().toLowerCase(), m = allItems().find(i => i.name.trim().toLowerCase() === n);
    if (m) {
      $('#nx-sets').value = m.sets; $('#nx-reps').value = m.reps; $('#nx-rest').value = m.rest; ui.newDraw = m.draw || ''; if (m.photo) ui.newPhoto = m.photo;
      $$('#modal .pk').forEach(b => b.classList.toggle('on', b.dataset.k === ui.newDraw));
    }
  }
});

render();
if (S.active) wake();
