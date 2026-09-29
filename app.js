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
      return migrate(j);
    }
  } catch (e) { /* dati assenti o corrotti */ }
  return { plans: SEED(), history: [], active: null, rest: null, settings: { sound: true, vibrate: true }, seedV: SEED_V };
}
/* aggiunge le schede predefinite nuove a chi ha già dei dati */
function migrate(j) {
  const v = j.seedV || 1;
  if (v < SEED_V) {
    const have = new Set(j.plans.map(p => p.key).filter(Boolean));
    SEED().filter(p => p.since > v && !have.has(p.key)).forEach(p => j.plans.push(p));
    j.seedV = SEED_V;
    try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (e) { /* ignora */ }
  }
  return j;
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Salvataggio non riuscito (memoria piena?)'); }
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignora */ }

/* "45″", "30s", "2′", "5 min" → secondi; null se non è un tempo */
function parseDur(s) {
  const m = String(s || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(″|"|s|sec|′|'|min)$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Math.round(/^(′|'|min)$/i.test(m[2]) ? n * 60 : n);
}
const restOf = it => { const n = parseInt(it.rest, 10); return isNaN(n) ? 60 : Math.max(0, n); };
/* minuti: "25", "25.5" o "25:30" */
function parseMin(s) {
  s = String(s || '').trim().replace(',', '.');
  if (!s) return 0;
  const p = s.split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : p.length === 2 ? p[0] + p[1] / 60 : p[0];
}
const paceStr = (km, min) => (km > 0 && min > 0 ? fmt(min / km * 60) + '/km' : '');
const isCardio = x => x && x.kind === 'cardio';

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
    A.sets[it.id] = Array.from({ length: n }, () => ({ w: l ? l.w : '', r: !isCardio(it) && /^\d+$/.test(it.reps) ? it.reps : '', d: false }));
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
  ui.rec = records();
  const done = d.items.filter(i => { const s = ensureSets(i); return s.length && s.every(x => x.d); }).length;
  return `<div class="row" style="align-items:center;margin:0 0 8px"><div class="sub grow" style="margin:0">${esc(p.name)}</div><button class="btn sm" data-act="toWarmup">🔥 Riscaldamento guidato</button></div>
  <div class="bar"><i style="width:${d.items.length ? done / d.items.length * 100 : 0}%"></i></div>
  ${d.items.map(itemCard).join('')}
  <button class="btn ghost" data-act="addEx" data-d="${d.id}">+ Aggiungi esercizio</button>
  <button class="btn pri" data-act="finish">Termina e salva</button>
  <button class="btn ghost" data-act="cancelSession">Scarta allenamento</button>`;
}

function itemCard(it) {
  const st = ensureSets(it), dn = st.filter(s => s.d).length, open = ui.open[it.id], l = lastFor(it.name);
  const cardio = isCardio(it), secs = parseDur(it.reps), R0 = S.rest, best = !cardio && (ui.rec || records()).get(nk(it.name));
  const rows = st.map((s, i) => {
    const running = R0 && R0.kind === 'work' && R0.id === it.id && R0.i === i;
    const play = secs && !s.d ? `<button class="chk play ${running ? 'on' : ''}" data-act="${running ? 'stopWork' : 'work'}" data-id="${it.id}" data-i="${i}" aria-label="${running ? 'Ferma' : 'Avvia'} timer serie ${i + 1}">${running ? '■' : '▶'}</button>` : '';
    const f1 = cardio
      ? `<input type="number" inputmode="decimal" step="0.01" placeholder="km" value="${esc(s.w)}" data-f="w" data-id="${it.id}" data-i="${i}" aria-label="Chilometri serie ${i + 1}"><span>km</span>
    <input type="text" inputmode="decimal" placeholder="${esc(secs ? secs / 60 : 'min')}" value="${esc(s.r)}" data-f="r" data-id="${it.id}" data-i="${i}" aria-label="Minuti serie ${i + 1}"><span>min</span>`
      : `<input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${esc(s.w)}" data-f="w" data-id="${it.id}" data-i="${i}" aria-label="Peso serie ${i + 1}">
    <span>kg ×</span>
    <input type="text" inputmode="numeric" placeholder="${esc(it.reps)}" value="${esc(s.r)}" data-f="r" data-id="${it.id}" data-i="${i}" aria-label="Ripetizioni serie ${i + 1}">`;
    const isPr = s.d && best && (parseFloat(s.w) || 0) > best.w;
    return `<div class="set ${s.d ? 'd' : ''}"><span class="n" ${isPr ? 'title="Nuovo record"' : ''}>${isPr ? '🏆' : i + 1}</span>${f1}${play}
    <button class="chk" data-act="chk" data-id="${it.id}" data-i="${i}" aria-label="Serie fatta">✓</button></div>`;
  }).join('');
  let km = 0, min = 0;
  if (cardio) st.forEach(s => { km += parseFloat(s.w) || 0; min += parseMin(s.r); });
  const rest = restOf(it);
  const lastTxt = (l && l.w !== '' ? ` · ultimo ${esc(l.w)} ${cardio ? 'km' : 'kg'}` : '') + (best ? ` · record ${best.w} kg` : '');
  return `<section class="card ${st.length && dn === st.length ? 'ok' : ''}">
    <div class="ih" data-act="tog" data-id="${it.id}"><div class="th">${media(it, false)}</div>
      <div class="im"><b>${esc(it.name)}</b><small>${esc(it.sets)}×${esc(it.reps)} · ${rest ? `pausa ${rest}″` : 'senza pausa'}${lastTxt}</small></div>
      <div class="cnt">${dn}/${st.length}</div></div>
    ${open ? `<div class="body"><div class="big">${media(it, true)}</div>${rows}
      ${cardio && km > 0 && min > 0 ? `<div class="ss" style="margin:4px 0 8px"><span>totale <b>${+km.toFixed(2)}</b> km</span><span><b>${fmt(min * 60)}</b></span><span>passo <b>${paceStr(km, min)}</b></span><span><b>${(km / min * 60).toFixed(1)}</b> km/h</span></div>` : ''}
      <textarea placeholder="Note (sensazioni, regolazione macchina…)" data-note="${it.id}">${esc(S.active.notes[it.id] || '')}</textarea>
      <div class="acts"><button class="btn sm" data-act="addSet" data-id="${it.id}">+ serie</button><button class="btn sm" data-act="delSet" data-id="${it.id}">− serie</button>
      <button class="btn sm" data-act="pickDraw" data-id="${it.id}">Disegno / foto</button>${rest ? `<button class="btn sm" data-act="startRestNow" data-id="${it.id}">Timer pausa</button>` : ''}</div></div>` : ''}
  </section>`;
}

function vHistory() {
  const tabs = `<div class="tabs"><button class="${ui.hTab === 'sessions' ? 'on' : ''}" data-act="hTab" data-t="sessions">Sessioni</button><button class="${ui.hTab === 'progress' ? 'on' : ''}" data-act="hTab" data-t="progress">Progressi</button><button class="${ui.hTab === 'records' ? 'on' : ''}" data-act="hTab" data-t="records">Record</button></div>`;
  if (!S.history.length) return tabs + `<p class="mut">Nessun allenamento salvato. Completa delle serie e premi “Termina e salva”.</p>`;
  if (ui.hTab === 'progress') return tabs + progress();
  if (ui.hTab === 'records') return tabs + vRecords();
  return tabs + weekCard() + `<button class="btn" style="margin:0 0 12px" data-act="exportModal" data-per="week">⇪ Esporta riepilogo allenamenti</button>` + S.history.map(h => {
    const st = sessStats(h), prs = h.prs || [];
    const date = new Date(h.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const open = ui.hOpen[h.id];
    return `<section class="card pad"><div class="row" style="align-items:center;margin:0" data-act="hTog" data-id="${h.id}"><div class="grow"><h2>${esc(h.plan)} · ${esc(h.day)}</h2>
      <div class="ss"><span><b>${date}</b></span><span>durata <b>${fmt(h.dur)}</b></span>${st.vol ? `<span>volume <b>${Math.round(st.vol)}</b> kg</span>` : ''}${st.km ? `<span>corsa <b>${+st.km.toFixed(2)}</b> km</span>` : ''}<span>~<b>${Math.round(st.kcal)}</b> kcal</span>${prs.length ? `<span>🏆 <b>${prs.length}</b> record</span>` : ''}</div></div><span class="mut">${open ? '▾' : '▸'}</span></div>
      ${open ? st.rows.map(({ e, sec, kcal, vol }) => {
        const pr = prs.find(p => nk(p.name) === nk(e.name));
        return `<div class="ent"><b>${esc(e.name)}</b>${pr ? ` <span class="pr">🏆 ${esc(pr.w)} kg</span>` : ''}<br><small>${e.sets.map(s => isCardio(e) ? `${esc(s.w || '–')} km in ${esc(s.r || '–')}′${paceStr(parseFloat(s.w), parseMin(s.r)) ? ` (${paceStr(parseFloat(s.w), parseMin(s.r))})` : ''}` : `${esc(s.w || '–')}×${esc(s.r || '–')}`).join(' · ')}</small>
        <br><small class="mut">${fmt(sec)}${vol ? ` · ${Math.round(vol)} kg` : ''} · ~${Math.round(kcal)} kcal</small>${e.note ? `<br><small>“${esc(e.note)}”</small>` : ''}</div>`;
      }).join('') + `<button class="btn" data-act="exportModal" data-per="s:${h.id}">⇪ Condividi / esporta sessione</button><button class="btn danger" data-act="delHist" data-id="${h.id}">Elimina sessione</button>` : ''}</section>`;
  }).join('');
}

/* ---------- calorie, record personali, esportazione ---------- */
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const nk = n => String(n || '').trim().toLowerCase();
/* MET (equivalenti metabolici) indicativi per disegno; pesi = 5 */
const METS = { shadow: 7.8, bag: 7.8, jumprope: 11, jack: 8, run: 8, boxjump: 8, bike: 7, medball: 6, farmer: 6, plank: 3.8, pallof: 3.8, russian: 3.8,
  armcircle: 2.8, legswing: 2.8, catcow: 2.5, birddog: 2.8, deadbug: 3, quadstretch: 2.3, pendulum: 2, extrot: 2.5, balance: 2.3, neck: 2.5 };
const bw = () => parseFloat(S.settings.bw) || 75;
/* statistiche di una sessione: tempo stimato, volume e kcal per esercizio */
function sessStats(h) {
  const totSets = h.entries.reduce((a, e) => a + e.sets.length, 0) || 1;
  const timed = h.entries.some(e => e.sec != null);
  const rows = h.entries.map(e => {
    const sec = timed ? e.sec || 0 : h.dur * e.sets.length / totSets;
    let kcal = 0, vol = 0, km = 0;
    if (isCardio(e)) {
      e.sets.forEach(s => {
        const k = parseFloat(s.w) || 0, mn = parseMin(s.r) || sec / 60 / e.sets.length;
        km += k;
        /* corsa ≈ 1 kcal per kg di peso per km, camminata ≈ 0,55 */
        kcal += k > 0 ? k * bw() * (mn > 0 && k / mn * 60 < 7.5 ? 0.55 : 1) : 7 * bw() * mn / 60;
      });
    } else {
      vol = e.sets.reduce((b, s) => b + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0);
      kcal = (METS[e.draw] || 5) * bw() * sec / 3600;
    }
    return { e, sec, kcal, vol, km };
  });
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  return { rows, vol: sum('vol'), km: sum('km'), kcal: sum('kcal'), sets: totSets };
}

/* record: peso massimo e 1RM stimato (Epley) per esercizio */
const e1rm = (w, r) => (r > 1 ? w * (1 + Math.min(r, 12) / 30) : w);
function records(hist = S.history) {
  const m = new Map();
  [...hist].reverse().forEach(h => h.entries.forEach(e => {
    if (isCardio(e)) return;
    e.sets.forEach(s => {
      const w = parseFloat(s.w) || 0, r = parseInt(s.r, 10) || 1;
      if (w <= 0) return;
      let o = m.get(nk(e.name));
      if (!o) m.set(nk(e.name), o = { name: e.name, w: 0, r: 0, date: '', e1: 0, first: h.date, steps: [] });
      if (w > o.w || (w === o.w && r > o.r)) {
        if (w > o.w && o.w) o.steps.push({ w: o.w, date: o.date });
        o.w = w; o.r = r; o.date = h.date; o.name = e.name;
      }
      o.e1 = Math.max(o.e1, e1rm(w, r));
    });
  }));
  return m;
}
const dShort = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
function vRecords() {
  const rs = [...records().values()].sort((a, b) => b.date.localeCompare(a.date));
  if (!rs.length) return `<p class="mut">Registra dei pesi per vedere i tuoi record personali.</p>`;
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const recent = rs.filter(o => o.steps.length && new Date(o.date) >= month).length;
  return `<section class="card pad"><h2>Record personali</h2><div class="ss"><span><b>${rs.length}</b> esercizi</span><span>🏆 <b>${recent}</b> record ${recent === 1 ? 'battuto' : 'battuti'} questo mese</span></div>
    <div class="sub" style="margin-top:6px">1RM stimato con la formula di Epley, solo indicativo.</div></section>` +
    rs.map(o => `<section class="card pad"><div class="row" style="align-items:center;margin:0"><div class="grow"><b>${esc(o.name)}</b>
      <div class="ss"><span>🏆 <b>${o.w}</b> kg × ${o.r}</span><span>${dShort(o.date)}</span><span>1RM ~<b>${Math.round(o.e1)}</b> kg</span></div>
      ${o.steps.length ? `<div class="ss"><span>prima: ${o.steps.slice(-3).map(s => `${s.w} kg`).join(' → ')} → <b>${o.w} kg</b></span><span>+${+(o.w - o.steps[0].w).toFixed(1)} kg da ${dShort(o.steps[0].date)}</span></div>` : ''}</div></div></section>`).join('');
}

/* sessioni di un periodo: week | month | all | s:<id> */
function periodSessions(per) {
  if (per.startsWith('s:')) return S.history.filter(h => h.id === per.slice(2));
  if (per === 'all') return S.history.slice();
  const from = new Date(); from.setHours(0, 0, 0, 0);
  if (per === 'week') from.setDate(from.getDate() - (from.getDay() + 6) % 7);
  else if (per === '30') from.setDate(from.getDate() - 30);
  else from.setDate(1);
  return S.history.filter(h => new Date(h.date) >= from);
}
const PER_NAMES = { week: 'Questa settimana', month: 'Questo mese', 30: 'Ultimi 30 giorni', all: 'Tutto lo storico' };
const kg = n => Math.round(n).toLocaleString('it-IT');
function sessText(h) {
  const st = sessStats(h), d = new Date(h.date);
  const L = [`🏋️ ${h.plan} · ${h.day}`,
    `${d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
    [`⏱ ${fmt(h.dur)}`, st.vol ? `🏋 ${kg(st.vol)} kg sollevati` : '', st.km ? `🏃 ${+st.km.toFixed(2)} km` : '', `🔥 ~${Math.round(st.kcal)} kcal`, `${pl(h.entries.length, 'esercizio', 'esercizi')} · ${st.sets} serie`].filter(Boolean).join(' · ')];
  (h.prs || []).forEach(p => L.push(`🏆 Record: ${p.name} ${p.w} kg${p.prev ? ` (prima ${p.prev} kg)` : ''}`));
  L.push('');
  st.rows.forEach(({ e, sec, kcal, vol }) => {
    L.push(`• ${e.name} — ${e.sets.length} serie · ${fmt(sec)}${vol ? ` · ${kg(vol)} kg` : ''} · ~${Math.round(kcal)} kcal`);
    L.push('  ' + e.sets.map(s => isCardio(e) ? `${s.w || '–'} km in ${s.r || '–'}′${paceStr(parseFloat(s.w), parseMin(s.r)) ? ` (${paceStr(parseFloat(s.w), parseMin(s.r))})` : ''}` : `${s.w || '–'} kg × ${s.r || '–'}`).join(' · '));
    if (e.note) L.push(`  “${e.note}”`);
  });
  return L.join('\n');
}
function summaryText(per) {
  const hs = periodSessions(per);
  if (!hs.length) return 'Nessun allenamento nel periodo scelto.';
  if (hs.length === 1 && per.startsWith('s:')) return sessText(hs[0]);
  const st = hs.map(sessStats), sum = k => st.reduce((a, x) => a + x[k], 0);
  const dur = hs.reduce((a, h) => a + h.dur, 0), prs = hs.flatMap(h => h.prs || []);
  const L = [`📊 Riepilogo allenamenti · ${PER_NAMES[per]}`, `${dShort(hs[hs.length - 1].date)} – ${dShort(hs[0].date)}`,
    `${pl(hs.length, 'allenamento', 'allenamenti')} · ⏱ ${fmt(dur)} · 🏋 ${kg(sum('vol'))} kg${sum('km') ? ` · 🏃 ${+sum('km').toFixed(2)} km` : ''} · 🔥 ~${kg(sum('kcal'))} kcal`];
  if (prs.length) L.push(`🏆 ${prs.length} record: ` + prs.map(p => `${p.name} ${p.w} kg`).join(', '));
  hs.forEach(h => L.push('', '────────────', sessText(h)));
  return L.join('\n');
}
/* CSV (separatore ; e virgola decimale, per Excel in italiano): una riga per serie */
function summaryCsv(per) {
  const n = x => (x === '' || x == null || isNaN(x) ? '' : String(+(+x).toFixed(2)).replace('.', ','));
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [['data', 'ora', 'scheda', 'giorno', 'durata_sessione_min', 'kcal_sessione', 'esercizio', 'tipo', 'serie', 'kg', 'ripetizioni', 'km', 'minuti', 'volume_serie_kg', 'durata_esercizio_min', 'kcal_esercizio', 'record'].join(';')];
  periodSessions(per).forEach(h => {
    const st = sessStats(h), d = new Date(h.date);
    st.rows.forEach(({ e, sec, kcal }) => {
      const pr = (h.prs || []).find(p => nk(p.name) === nk(e.name));
      e.sets.forEach((s, i) => {
        const c = isCardio(e), w = parseFloat(s.w), r = parseFloat(s.r);
        rows.push([d.toISOString().slice(0, 10), d.toTimeString().slice(0, 5), q(h.plan), q(h.day), n(h.dur / 60), n(Math.round(st.kcal)), q(e.name), c ? 'cardio' : 'pesi', i + 1,
          c ? '' : n(w), c ? '' : /^\d+$/.test(s.r) ? s.r : q(s.r), c ? n(w) : '', c ? n(parseMin(s.r)) : '', c ? '' : n((w || 0) * (r || 0)), n(sec / 60), n(Math.round(kcal)), pr && w === pr.w ? 'sì' : ''].join(';'));
      });
    });
  });
  return '﻿' + rows.join('\r\n');
}
function download(name, text, type) {
  const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([text], { type })); l.download = name;
  document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 2000);
}
function exportModal(per) {
  ui.exPer = per;
  const single = per.startsWith('s:');
  modal(`<h3>Esporta riepilogo</h3>
    ${single ? '' : `<div class="tabs" style="flex-wrap:wrap">${Object.keys(PER_NAMES).map(k => `<button class="${per === k ? 'on' : ''}" data-act="exportModal" data-per="${k}">${PER_NAMES[k]}</button>`).join('')}</div>`}
    <textarea id="exTxt" readonly style="min-height:260px;font:13px/1.4 ui-monospace,Menlo,monospace">${esc(summaryText(per))}</textarea>
    <div class="sub">Le kcal sono una stima basata sul tuo peso (${bw()} kg, modificabile in Strumenti → Impostazioni) e sul tipo di esercizio.</div>
    <button class="btn pri" data-act="exShare">Condividi testo</button>
    <div class="row"><button class="btn" data-act="exCopy">Copia</button><button class="btn" data-act="exTxtDl">Scarica .txt</button><button class="btn" data-act="exCsv">Scarica CSV</button></div>
    <button class="btn ghost" data-act="close">Chiudi</button>`);
}
const exName = ext => `palestra-${ui.exPer.startsWith('s:') ? 'sessione' : ui.exPer}-${new Date().toISOString().slice(0, 10)}.${ext}`;

const sessKm = h => h.entries.reduce((a, e) => a + (isCardio(e) ? e.sets.reduce((b, s) => b + (parseFloat(s.w) || 0), 0) : 0), 0);
function weekCard() {
  const mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  const wk = S.history.filter(h => new Date(h.date) >= mon);
  const dur = wk.reduce((a, h) => a + h.dur, 0), km = wk.reduce((a, h) => a + sessKm(h), 0);
  /* settimane consecutive con almeno un allenamento */
  let streak = 0;
  for (let w = new Date(mon); ; w.setDate(w.getDate() - 7)) {
    const end = new Date(w); end.setDate(end.getDate() + 7);
    if (S.history.some(h => { const d = new Date(h.date); return d >= w && d < end; })) streak++;
    else if (w < mon || streak) break;
    else continue;
  }
  return `<section class="card pad"><h2>Questa settimana</h2><div class="ss"><span><b>${wk.length}</b> ${wk.length === 1 ? 'allenamento' : 'allenamenti'}</span><span><b>${fmt(dur)}</b></span>${km ? `<span><b>${+km.toFixed(2)}</b> km</span>` : ''}${streak > 1 ? `<span>🔥 <b>${streak}</b> settimane di fila</span>` : ''}</div></section>`;
}

function spark(v) {
  if (v.length < 2) return '';
  const mx = Math.max(...v), mn = Math.min(...v), W = 90, H = 26;
  const pts = v.map((y, i) => `${(i / (v.length - 1) * W).toFixed(1)},${(H - 3 - (mx === mn ? (H - 6) / 2 : (y - mn) / (mx - mn) * (H - 6))).toFixed(1)}`).join(' ');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function progress() {
  const m = new Map(), run = { v: [], tot: 0, best: 0, bestPace: 0 };
  [...S.history].reverse().forEach(h => {
    const km = sessKm(h);
    if (km > 0) { run.v.push(km); run.tot += km; run.best = Math.max(run.best, km); }
    h.entries.forEach(e => {
      if (isCardio(e)) {
        e.sets.forEach(s => { const k = parseFloat(s.w) || 0, mn = parseMin(s.r); if (k >= 1 && mn > 0 && (!run.bestPace || mn / k < run.bestPace)) run.bestPace = mn / k; });
        return;
      }
      const k = e.name.trim().toLowerCase();
      const mxw = Math.max(0, ...e.sets.map(s => parseFloat(s.w) || 0));
      if (!m.has(k)) m.set(k, { name: e.name, v: [], best: 0 });
      const o = m.get(k); o.name = e.name; if (mxw > 0) { o.v.push(mxw); o.best = Math.max(o.best, mxw); }
    });
  });
  const rows = [...m.values()].filter(o => o.v.length).sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length && !run.v.length) return `<p class="mut">Registra dei pesi o dei km per vedere i progressi.</p>`;
  const runCard = run.v.length ? `<section class="card pad"><div class="row" style="align-items:center;margin:0"><div class="grow"><b>Corsa</b><div class="ss"><span>ultima <b>${+run.v[run.v.length - 1].toFixed(2)}</b> km</span><span>totale <b>${+run.tot.toFixed(1)}</b> km</span><span>più lunga <b>${+run.best.toFixed(2)}</b> km</span>${run.bestPace ? `<span>passo migliore <b>${fmt(run.bestPace * 60)}</b>/km</span>` : ''}</div></div>${spark(run.v.slice(-12))}</div></section>` : '';
  return runCard + rows.map(o => `<section class="card pad"><div class="row" style="align-items:center;margin:0"><div class="grow"><b>${esc(o.name)}</b><div class="ss"><span>ultimo <b>${o.v[o.v.length - 1]}</b> kg</span><span>record <b>${o.best}</b> kg</span><span>${o.v.length} sess.</span></div></div>${spark(o.v.slice(-12))}</div></section>`).join('');
}

/* Strumenti: timer round + cronometro + impostazioni + backup */
const R = { cfg: { rounds: 3, work: 180, rest: 60, warm: 10 }, phase: 'idle', round: 0, end: 0, tot: 0, left: 0, paused: false, warned: false };
const SW = { run: false, start: 0, acc: 0 };
/* riscaldamento guidato: phase idle | prep | go | done */
const WU = { r: 0, i: 0, phase: 'idle', end: 0, tot: 0, left: 0, paused: false, shown: '' };
const PC = { km: '10', t: '55:00' };
function vTools() {
  const c = R.cfg;
  return `<section class="card pad" id="wu"><h2>Riscaldamento guidato</h2>
    <div class="tabs" style="flex-wrap:wrap">${WARMUPS.map((w, i) => `<button class="${WU.r === i ? 'on' : ''}" data-act="wuPick" data-i="${i}">${esc(w.name)}</button>`).join('')}</div>
    <div class="sub" id="wusum"></div>
    <div class="big" id="wudraw"></div>
    <div class="phase work" id="wuname"></div><div class="big-time" id="wut">--:--</div><div class="phase" id="wunext"></div>
    <div class="row"><button class="btn pri" data-act="wuGo" id="wugo">Avvia</button><button class="btn ghost" data-act="wuSkip">Salta ▸</button><button class="btn ghost" data-act="wuReset">Reset</button></div></section>
    <section class="card pad"><h2>Calcolo passo (corsa)</h2>
    <div class="row"><label>Distanza (km)<input type="number" inputmode="decimal" step="0.01" data-pc="km" value="${esc(PC.km)}"></label><label>Tempo (mm:ss o h:mm:ss)<input data-pc="t" value="${esc(PC.t)}"></label></div>
    <div class="ss" id="pcout" style="margin-top:8px"></div></section>
    <section class="card pad"><h2>Timer round (boxe / HIIT)</h2>
    <div class="row"><label>Round<input type="number" inputmode="numeric" data-r="rounds" value="${c.rounds}"></label><label>Lavoro (s)<input type="number" inputmode="numeric" data-r="work" value="${c.work}"></label><label>Recupero (s)<input type="number" inputmode="numeric" data-r="rest" value="${c.rest}"></label><label>Prep. (s)<input type="number" inputmode="numeric" data-r="warm" value="${c.warm}"></label></div>
    <div class="phase" id="rph"></div><div class="big-time" id="rt">--:--</div><div class="phase" id="rrd"></div>
    <div class="row"><button class="btn pri" data-act="rGo" id="rgo">Avvia</button><button class="btn ghost" data-act="rReset">Reset</button></div></section>
    <section class="card pad"><h2>Cronometro</h2><div class="big-time" id="swt" style="font-size:48px">00:00</div>
    <div class="row"><button class="btn pri" data-act="swGo" id="swgo">Avvia</button><button class="btn ghost" data-act="swReset">Reset</button></div></section>
    <section class="card pad"><h2>Impostazioni</h2>
    <div class="row"><label style="display:flex;gap:10px;align-items:center;color:var(--txt);font-size:15px"><input type="checkbox" style="width:22px;height:22px;margin:0" data-set="sound" ${S.settings.sound ? 'checked' : ''}>Suoni</label>
    <label style="display:flex;gap:10px;align-items:center;color:var(--txt);font-size:15px"><input type="checkbox" style="width:22px;height:22px;margin:0" data-set="vibrate" ${S.settings.vibrate ? 'checked' : ''}>Vibrazione</label></div>
    <div class="row"><label>Peso corporeo (kg) · per la stima delle kcal<input type="number" inputmode="decimal" step="0.1" data-num="bw" value="${esc(S.settings.bw || '')}" placeholder="75"></label></div></section>
    <section class="card pad"><h2>Schede predefinite</h2><div class="sub">Aggiungi di nuovo una scheda predefinita (ne viene creata una copia, le tue schede non cambiano).</div>
    ${SEED().map(p => `<div class="row" style="align-items:center"><div class="grow"><b>${esc(p.name)}</b><div class="sub" style="margin:0">${esc(p.sub)}</div></div><button class="btn sm" data-act="addSeed" data-k="${p.key}">+ Aggiungi</button></div>`).join('')}</section>
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
        <div class="row"><label>Serie<input inputmode="numeric" data-ei="${i.id}" data-k="sets" value="${esc(i.sets)}"></label><label>Rip.<input data-ei="${i.id}" data-k="reps" value="${esc(i.reps)}"></label><label>Pausa ″<input inputmode="numeric" data-ei="${i.id}" data-k="rest" value="${esc(i.rest)}"></label><button class="btn sm" style="height:44px" data-act="pickDraw" data-id="${i.id}">Disegno</button></div>
        <div class="row"><label>Tipo<select data-ei="${i.id}" data-k="kind">${kindOpts(i.kind)}</select></label></div></div>`).join('')}
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
  if (v === 'tools') { rDisp(); swDisp(); WU.shown = ''; wuDisp(); pcDisp(); }
  if (ui.scrollTo) { const el = document.getElementById(ui.scrollTo); ui.scrollTo = null; if (el) { el.scrollIntoView(); return; } }
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
  b.classList.toggle('work', r.kind === 'work');
  $('#rlab').textContent = r.kind === 'work' ? 'Esecuzione · ' + r.label : r.done ? 'Pausa finita' : 'Pausa · ' + r.label;
  $('#rskip').textContent = r.kind === 'work' ? 'Fatto' : 'Salta';
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

/* riscaldamento guidato */
function say(t) {
  if (!S.settings.sound) return;
  try { const u = new SpeechSynthesisUtterance(t); u.lang = 'it-IT'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* voce non disponibile */ }
}
const wuSteps = () => WARMUPS[WU.r].steps;
function wuSet(phase, i) {
  const st = wuSteps();
  WU.phase = phase; WU.i = i; WU.paused = false;
  WU.tot = phase === 'prep' ? 5 : st[i][1];
  WU.end = Date.now() + WU.tot * 1000;
  if (phase === 'prep') { say('Si parte con ' + st[i][0]); beep(600, .3); }
  else { say(st[i][0]); beep(1200, .4); vib([200, 80, 200]); }
}
function wuNext() {
  if (WU.i + 1 < wuSteps().length) wuSet('go', WU.i + 1);
  else { WU.phase = 'done'; say('Riscaldamento finito, buon allenamento!'); beep(900, .6, 3); vib([300, 100, 300]); }
}
function wuTick() {
  if (!['prep', 'go'].includes(WU.phase) || WU.paused) return;
  const left = (WU.end - Date.now()) / 1000;
  if (WU.phase === 'go' && left <= 3 && left > 0 && Math.ceil(left) !== WU.lastBeep) { WU.lastBeep = Math.ceil(left); beep(700, .08); }
  if (left <= 0) { if (WU.phase === 'prep') wuSet('go', WU.i); else wuNext(); }
}
function wuDisp() {
  const t = $('#wut'); if (!t) return;
  const st = wuSteps(), cur = st[Math.min(WU.i, st.length - 1)], nx = st[WU.i + 1];
  const tot = st.reduce((a, s) => a + s[1], 0);
  $('#wusum').textContent = `${st.length} esercizi · ${fmt(tot)} in totale`;
  const key = WU.r + ':' + WU.i + ':' + WU.phase;
  if (WU.shown !== key) { WU.shown = key; $('#wudraw').innerHTML = WU.phase === 'done' ? '<div class="noimg">✓</div>' : DRAW.svg(cur[2], { anim: true }); }
  const left = WU.phase === 'idle' ? cur[1] : WU.phase === 'done' ? 0 : WU.paused ? WU.left : (WU.end - Date.now()) / 1000;
  t.textContent = fmt(Math.ceil(left));
  $('#wuname').textContent = WU.phase === 'done' ? 'Finito! Buon allenamento' : (WU.phase === 'prep' ? 'Preparati · ' : `${WU.i + 1}/${st.length} · `) + cur[0] + (WU.paused ? ' (pausa)' : '');
  $('#wunext').textContent = WU.phase !== 'done' && nx ? 'Poi: ' + nx[0] : '';
  const running = ['prep', 'go'].includes(WU.phase) && !WU.paused;
  $('#wugo').textContent = running ? 'Pausa' : WU.paused ? 'Riprendi' : 'Avvia';
}
function pcDisp() {
  const o = $('#pcout'); if (!o) return;
  const km = parseFloat(String(PC.km).replace(',', '.')) || 0, min = parseMin(PC.t);
  if (!(km > 0 && min > 0)) { o.innerHTML = '<span>Inserisci distanza e tempo</span>'; return; }
  /* stima con la formula di Riegel (esponente 1.06) */
  const pace = min / km, pred = d => fmt(pace * 60 * d * Math.pow(d / km, 0.06));
  o.innerHTML = `<span>passo <b>${fmt(pace * 60)}</b>/km</span><span><b>${(km / min * 60).toFixed(1)}</b> km/h</span>
    <span>stima 5 km <b>${pred(5)}</b></span><span>10 km <b>${pred(10)}</b></span><span>mezza <b>${pred(21.0975)}</b></span>`;
}

/* serie a tempo: usa la barra della pausa in modalità "work" */
function startWork(it, i) {
  const secs = parseDur(it.reps); if (!secs) return;
  S.rest = { kind: 'work', id: it.id, i, end: Date.now() + secs * 1000, total: secs, label: it.name, done: false };
  beep(1200, .3); vib([150, 60, 150]); save(); render(true);
}
function workDone(r) {
  const st = S.active && S.active.sets[r.id], s = st && st[r.i], it = findItem(r.id);
  S.rest = null;
  if (s && !s.d) {
    s.d = true; s.t = Date.now();
    if (!s.r) s.r = it && isCardio(it) ? String(+(r.total / 60).toFixed(2)) : (it ? it.reps : '');
  }
  beep(900, .18, 3); vib([250, 100, 250]);
  if (it && restOf(it)) startRest(restOf(it), it.name);
  save(); if (ui.view === 'workout') render(true);
}

setInterval(() => {
  updateClock();
  const r = S.rest;
  if (r && r.kind === 'work') {
    const left = (r.end - Date.now()) / 1000;
    if (left <= 3 && left > 0 && Math.ceil(left) !== r.lastBeep) { r.lastBeep = Math.ceil(left); beep(700, .08); }
    if (left <= 0) workDone(r); else renderRestBar();
  } else if (r) {
    if (!r.done && r.end - Date.now() <= 0) { r.done = true; r.doneAt = Date.now(); save(); beep(880, .18, 3); vib([250, 100, 250, 100, 250]); }
    if (r.done && Date.now() - r.doneAt > 4000) { S.rest = null; save(); }
    renderRestBar();
  }
  rTick(); rDisp(); swDisp(); wuTick(); wuDisp();
}, 250);

/* ---------- modali ---------- */
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
const drawGrid = (cur, act) => `<div class="grid">${DRAW.keys().map(({ k, name }) => `<button class="pk ${cur === k ? 'on' : ''}" data-act="${act}" data-k="${k}">${DRAW.svg(k, { first: true })}<br>${esc(name)}</button>`).join('')}</div>`;

const kindOpts = k => `<option value="" ${k ? '' : 'selected'}>Pesi (kg × rip.)</option><option value="cardio" ${k === 'cardio' ? 'selected' : ''}>Corsa / cardio (km, min)</option>`;

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
    <div class="row"><label>Serie<input id="nx-sets" inputmode="numeric" value="3"></label><label>Rip. / tempo<input id="nx-reps" value="10"></label><label>Pausa ″<input id="nx-rest" inputmode="numeric" value="90"></label></div>
    <label>Tipo<select id="nx-kind">${kindOpts('')}</select></label>
    <div class="sub" style="margin-top:6px">Tempo: scrivi ad es. 45″ o 2′ per avere il conto alla rovescia su ogni serie.</div>
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
  /* tempo per esercizio: ogni serie vale il tempo trascorso dalla serie precedente (pausa inclusa) */
  const done = [], secBy = {};
  d.items.forEach(it => (A.sets[it.id] || []).forEach(s => { if (s.d && s.t) done.push({ id: it.id, t: s.t }); }));
  done.sort((a, b) => a.t - b.t).reduce((prev, x) => { secBy[x.id] = (secBy[x.id] || 0) + Math.max(0, x.t - prev) / 1000; return x.t; }, A.start);
  const rec = records(), prs = [];
  d.items.forEach(it => {
    const sets = (A.sets[it.id] || []).filter(s => s.d).map(s => ({ w: s.w, r: s.r }));
    if (!sets.length) return;
    const e = { name: it.name, draw: it.draw, kind: it.kind || '', sets, note: A.notes[it.id] || '' };
    if (done.length) e.sec = Math.round(secBy[it.id] || 0);
    entries.push(e);
    const best = rec.get(nk(it.name)), mx = Math.max(0, ...sets.map(s => parseFloat(s.w) || 0));
    if (!isCardio(it) && best && mx > best.w && !prs.some(x => nk(x.name) === nk(it.name))) prs.push({ name: it.name, w: mx, prev: best.w });
  });
  if (!entries.length && !confirm('Nessuna serie completata. Uscire senza salvare?')) return;
  if (entries.length) {
    const h = { id: uid(), date: new Date().toISOString(), plan: p.name, day: d.name, dur: Math.round((Date.now() - A.start) / 1000), entries, prs };
    S.history.unshift(h); ui.hOpen[h.id] = true;
    toast(prs.length ? `Allenamento salvato · 🏆 ${pl(prs.length, 'nuovo record', 'nuovi record')}!` : 'Allenamento salvato');
  }
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
      if (S.rest && S.rest.kind === 'work' && S.rest.id === d.id && S.rest.i === i) S.rest = null;
      if (s.d) {
        s.t = Date.now();
        for (let j = i + 1; j < st.length; j++) if (!st[j].d && st[j].w === '') st[j].w = s.w;
        const it = findItem(d.id); if (it && restOf(it)) startRest(restOf(it), it.name); vib(30);
        /* nuovo record rispetto allo storico (e non già battuto in questa sessione) */
        const best = it && !isCardio(it) && records().get(nk(it.name)), w = parseFloat(s.w) || 0;
        if (best && w > best.w && !st.some((x, j) => j !== i && x.d && (parseFloat(x.w) || 0) >= w)) { toast(`🏆 Nuovo record! ${it.name}: ${w} kg (prima ${best.w} kg)`); beep(1320, .15, 3); vib([80, 40, 80, 40, 200]); }
      } else delete s.t;
      save(); render(true); break;
    }
    case 'work': { const it = findItem(d.id); if (it) startWork(it, +d.i); break; }
    case 'stopWork': S.rest = null; save(); render(true); break;
    case 'toWarmup': ui.view = 'tools'; ui.scrollTo = 'wu'; render(); break;
    case 'wuPick': if (!['prep', 'go'].includes(WU.phase) || confirm('Interrompere il riscaldamento in corso?')) { WU.r = +d.i; WU.i = 0; WU.phase = 'idle'; WU.paused = false; render(true); } break;
    case 'wuGo':
      if (WU.phase === 'idle' || WU.phase === 'done') wuSet('prep', 0);
      else if (WU.paused) { WU.paused = false; WU.end = Date.now() + WU.left * 1000; }
      else { WU.left = (WU.end - Date.now()) / 1000; WU.paused = true; }
      wuDisp(); break;
    case 'wuSkip': if (WU.phase === 'prep') wuSet('go', WU.i); else if (WU.phase === 'go') wuNext(); wuDisp(); break;
    case 'wuReset': WU.phase = 'idle'; WU.i = 0; WU.paused = false; try { speechSynthesis.cancel(); } catch (err) { /* ignora */ } wuDisp(); break;
    case 'addSeed': { const p = SEED().find(x => x.key === d.k); if (p) { S.plans.push(p); save(); toast(`“${p.name}” aggiunta alle schede`); } break; }
    case 'addSet': { const st = S.active.sets[d.id]; const l = st[st.length - 1] || { w: '', r: '' }; st.push({ w: l.w, r: l.r, d: false }); save(); render(true); break; }
    case 'delSet': { const st = S.active.sets[d.id]; if (st.length > 1) st.pop(); save(); render(true); break; }
    case 'startRestNow': { const it = findItem(d.id); startRest(restOf(it) || 60, it.name); break; }
    case 'rm': if (S.rest) { S.rest.end -= 15000; S.rest.total = Math.max(5, S.rest.total - 15); S.rest.done = false; save(); } break;
    case 'rp': if (S.rest) { S.rest.end += 15000; S.rest.total += 15; S.rest.done = false; save(); } break;
    case 'rskip': if (S.rest && S.rest.kind === 'work') workDone(S.rest); else { S.rest = null; save(); renderRestBar(); } break;
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
      const it = { id: uid(), name, sets: $('#nx-sets').value || '3', reps: $('#nx-reps').value || '10', rest: $('#nx-rest').value || '90', draw: ui.newDraw, kind: $('#nx-kind').value };
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
    case 'exportModal': exportModal(d.per); break;
    case 'exShare': {
      const text = summaryText(ui.exPer);
      if (navigator.share) navigator.share({ title: 'Riepilogo allenamento', text }).catch(() => {});
      else navigator.clipboard.writeText(text).then(() => toast('Condivisione non disponibile: testo copiato'), () => toast('Condivisione non disponibile'));
      break;
    }
    case 'exCopy': { const t = $('#exTxt'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Riepilogo copiato'), () => { t.select(); document.execCommand('copy'); toast('Riepilogo copiato'); }); break; }
    case 'exTxtDl': download(exName('txt'), summaryText(ui.exPer), 'text/plain;charset=utf-8'); break;
    case 'exCsv': download(exName('csv'), summaryCsv(ui.exPer), 'text/csv;charset=utf-8'); break;
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
  else if (d.pc) { PC[d.pc] = t.value; pcDisp(); }
  else if (d.set) { S.settings[d.set] = t.checked; save(); }
  else if (d.num) { S.settings[d.num] = t.value; save(); }
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
        S = migrate(Object.assign({ history: [], active: null, rest: null, settings: { sound: true, vibrate: true } }, j)); save(); toast('Backup importato'); ui.view = 'home'; render();
      } catch (err) { toast('File di backup non valido'); }
    };
    fr.readAsText(t.files[0]);
  } else if (t.id === 'nx-name') {
    const n = t.value.trim().toLowerCase(), m = allItems().find(i => i.name.trim().toLowerCase() === n);
    if (m) {
      $('#nx-sets').value = m.sets; $('#nx-reps').value = m.reps; $('#nx-rest').value = m.rest; $('#nx-kind').value = m.kind || ''; ui.newDraw = m.draw || ''; if (m.photo) ui.newPhoto = m.photo;
      $$('#modal .pk').forEach(b => b.classList.toggle('on', b.dataset.k === ui.newDraw));
    }
  }
});

render();
if (S.active) wake();
