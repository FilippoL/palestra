'use strict';
/* Disegni stilizzati degli esercizi: due pose (inizio / fine) in SVG. */
const DRAW = (() => {
  const L = (x1, y1, x2, y2) => `<line class="eq" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const bar = (x, y) => `<circle class="eq" cx="${x}" cy="${y}" r="5"/><circle class="eqf" cx="${x}" cy="${y}" r="1.6"/>`;
  const db = (x, y) => `<rect class="eqf" x="${x - 4.5}" y="${y - 3}" width="9" height="6" rx="1.5"/>`;
  const ball = (x, y, r = 7) => `<circle class="eqb" cx="${x}" cy="${y}" r="${r}"/>`;
  const glove = (x, y) => `<circle class="eqf" cx="${x}" cy="${y}" r="5.5"/>`;
  const box = `<rect class="eq" x="64" y="72" width="34" height="22" rx="2"/>`;
  const P = (h, l, e = '') => ({ h, l, e });
  const T = [[50, 24], [50, 52]];
  const G = [[50, 52], [52, 73], [50, 94]];
  const D = {};
  const add = (k, name, a, b) => (D[k] = { name, a, b });

  // Squat / Hack squat
  add('squat', 'Squat / Hack squat',
    P([52, 14], [T, G, [[50, 26], [57, 36], [47, 25]]], bar(47, 25)),
    P([54, 29], [[[50, 39], [34, 66]], [[34, 66], [62, 68], [52, 94]], [[50, 41], [57, 47], [47, 38]]], bar(47, 37)));

  // Leg press
  const lpPad = L(18, 70, 32, 88);
  add('legpress', 'Leg press',
    P([17, 59], [[[23, 66], [37, 83]], [[37, 83], [55, 66], [72, 76]], [[25, 68], [32, 76], [40, 78]]], lpPad + L(78, 66, 66, 86)),
    P([17, 59], [[[23, 66], [37, 83]], [[37, 83], [58, 70], [80, 56]], [[25, 68], [32, 76], [40, 78]]], lpPad + L(73, 46, 87, 66)));

  // Hip thrust
  const bench = L(6, 78, 30, 78);
  add('hipthrust', 'Hip thrust',
    P([14, 62], [[[22, 68], [46, 84]], [[46, 84], [66, 68], [68, 92]]], bench + bar(47, 82)),
    P([14, 62], [[[22, 68], [46, 68]], [[46, 68], [66, 68], [68, 92]]], bench + bar(46, 66)));

  // Leg extension / curl
  const seat = L(20, 64, 44, 64) + L(20, 26, 20, 64);
  const seatTorso = [[28, 26], [32, 62]];
  const seatArm = [[28, 30], [36, 46], [46, 62]];
  add('legext', 'Leg extension',
    P([28, 16], [seatTorso, [[32, 62], [56, 64], [58, 90]], seatArm], seat),
    P([28, 16], [seatTorso, [[32, 62], [56, 64], [82, 62]], seatArm], seat + `<circle class="eqf" cx="82" cy="62" r="3.5"/>`));
  add('legcurl', 'Leg curl',
    P([28, 16], [seatTorso, [[32, 62], [56, 64], [84, 66]], seatArm], seat + `<circle class="eqf" cx="84" cy="66" r="3.5"/>`),
    P([28, 16], [seatTorso, [[32, 62], [56, 64], [55, 90]], seatArm], seat));

  // Adductor / abductor (vista frontale)
  const seatedTorso = [[50, 24], [50, 54]];
  const ad = {
    a: P([50, 14], [seatedTorso, [[50, 54], [30, 66], [24, 92]], [[50, 54], [70, 66], [76, 92]], [[42, 30], [38, 42], [36, 54]], [[58, 30], [62, 42], [64, 54]]], L(34, 58, 66, 58)),
    b: P([50, 14], [seatedTorso, [[50, 54], [42, 68], [42, 92]], [[50, 54], [58, 68], [58, 92]], [[42, 30], [38, 42], [36, 54]], [[58, 30], [62, 42], [64, 54]]], L(34, 58, 66, 58))
  };
  add('adductor', 'Adductor machine (chiudi le gambe)', ad.a, ad.b);
  add('abductor', 'Abductor machine (apri le gambe)', ad.b, ad.a);

  // Lat machine
  const latSeat = L(40, 72, 60, 72);
  add('lat', 'Lat machine',
    P([50, 24], [[[50, 34], [50, 68]], [[50, 68], [68, 68], [68, 92]], [[50, 36], [46, 20], [44, 6]]], latSeat + L(44, -12, 44, 6) + bar(44, 6)),
    P([48, 24], [[[50, 34], [50, 68]], [[50, 68], [68, 68], [68, 92]], [[50, 38], [40, 50], [47, 38]]], latSeat + L(44, -12, 47, 38) + bar(47, 38)));

  // Rematore al cavo / rowing machine / pulley
  add('row', 'Rematore seduto (cavo / macchina)',
    P([40, 26], [[[40, 36], [42, 68]], [[42, 68], [62, 66], [64, 92]], [[40, 38], [58, 44], [74, 46]]], L(75, 46, 98, 46) + bar(75, 46)),
    P([40, 26], [[[40, 36], [42, 68]], [[42, 68], [62, 66], [64, 92]], [[40, 38], [30, 52], [47, 52]]], L(47, 52, 98, 46) + bar(47, 52)));

  // Rematore con bilanciere
  add('bbrow', 'Rematore con bilanciere',
    P([20, 42], [[[28, 46], [54, 60]], [[54, 60], [57, 77], [52, 94]], [[28, 48], [30, 66], [30, 78]]], bar(30, 80)),
    P([20, 42], [[[28, 46], [54, 60]], [[54, 60], [57, 77], [52, 94]], [[28, 48], [42, 58], [34, 64]]], bar(34, 64)));

  // Curl
  add('curl', 'Curl (bilanciere / cavo / manubri)',
    P([50, 14], [T, G, [[50, 26], [52, 42], [55, 58]]], bar(56, 60)),
    P([50, 14], [T, G, [[50, 26], [52, 42], [64, 32]]], bar(65, 31)));

  // Push down
  add('pushdown', 'Push down ai cavi',
    P([50, 14], [T, G, [[50, 26], [52, 42], [64, 40]]], L(60, -12, 64, 40) + bar(64, 40)),
    P([50, 14], [T, G, [[50, 26], [52, 42], [54, 60]]], L(60, -12, 54, 60) + bar(54, 60)));

  // Estensioni tricipiti sopra la testa
  add('tricepext', 'Estensioni tricipiti al cavo',
    P([44, 14], [T, G, [[50, 26], [56, 10], [46, 20]]], L(30, 94, 46, 20)),
    P([44, 14], [T, G, [[50, 26], [56, 10], [58, -6]]], L(30, 94, 58, -6)));

  // Panca piana / chest press
  const flatBench = L(10, 78, 70, 78);
  const lyingBody = [[[22, 70], [52, 70]], [[52, 70], [66, 72], [66, 92]]];
  add('benchpress', 'Panca piana / chest press',
    P([14, 66], [...lyingBody, [[26, 68], [34, 64], [27, 58]]], flatBench + bar(27, 57)),
    P([14, 66], [...lyingBody, [[26, 68], [26, 56], [26, 44]]], flatBench + bar(26, 43)));

  // Panca inclinata
  const incEq = L(20, 58, 44, 84) + L(44, 84, 62, 84);
  const incBody = [[[28, 56], [48, 78]], [[48, 78], [66, 76], [66, 92]]];
  add('incline', 'Spinte su panca inclinata',
    P([22, 48], [...incBody, [[30, 58], [40, 60], [34, 48]]], incEq + bar(34, 47)),
    P([22, 48], [...incBody, [[30, 58], [36, 44], [38, 30]]], incEq + bar(38, 29)));

  // Croci / peck machine (vista frontale)
  const fT = [[50, 24], [50, 56]];
  const fSh = [[40, 28], [60, 28]];
  const fLegs = [[[50, 56], [44, 74], [44, 92]], [[50, 56], [56, 74], [56, 92]]];
  const fly = {
    a: P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [20, 30], [22, 14]], [[60, 28], [80, 30], [78, 14]]], `<rect class="eqf" x="16" y="8" width="8" height="12" rx="3"/><rect class="eqf" x="76" y="8" width="8" height="12" rx="3"/>`),
    b: P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [38, 34], [46, 20]], [[60, 28], [62, 34], [54, 20]]], `<rect class="eqf" x="42" y="14" width="8" height="12" rx="3"/><rect class="eqf" x="50" y="14" width="8" height="12" rx="3"/>`)
  };
  add('fly', 'Peck machine / croci', fly.a, fly.b);
  add('rearfly', 'Croci inverse (deltoidi posteriori)', fly.b, fly.a);
  add('cablefly', 'Croci ai cavi alti',
    P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [22, 20], [10, 10]], [[60, 28], [78, 20], [90, 10]]], L(6, -12, 10, 10) + L(94, -12, 90, 10)),
    P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [42, 44], [48, 56]], [[60, 28], [58, 44], [52, 56]]], L(6, -12, 48, 56) + L(94, -12, 52, 56)));

  // Alzate laterali
  add('lateral', 'Alzate laterali',
    P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [34, 44], [33, 58]], [[60, 28], [66, 44], [67, 58]]], db(33, 60) + db(67, 60)),
    P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [24, 29], [8, 30]], [[60, 28], [76, 29], [92, 30]]], db(6, 30) + db(94, 30)));

  // Lento avanti manubri
  add('shoulderpress', 'Lento avanti con manubri',
    P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [28, 34], [30, 18]], [[60, 28], [72, 34], [70, 18]]], db(30, 16) + db(70, 16)),
    P([50, 14], [fT, fSh, ...fLegs, [[40, 28], [34, 14], [42, -2]], [[60, 28], [66, 14], [58, -2]]], db(42, -4) + db(58, -4)));

  // Piegamenti
  add('pushup', 'Piegamenti',
    P([88, 54], [[[80, 60], [14, 90]], [[78, 62], [78, 92]]]),
    P([88, 74], [[[80, 80], [14, 91]], [[78, 82], [68, 88], [78, 92]]]));

  // Dips
  add('dips', 'Dips',
    P([50, 8], [[[50, 20], [50, 48]], [[50, 20], [54, 50]], [[50, 48], [56, 64], [48, 74]]], bar(54, 50)),
    P([50, 22], [[[50, 34], [50, 62]], [[50, 34], [42, 44], [54, 50]], [[50, 62], [56, 78], [48, 88]]], bar(54, 50)));

  // Plank
  add('plank', 'Plank (tieni la posizione)',
    P([88, 58], [[[80, 62], [14, 90]], [[78, 64], [76, 90], [66, 90]]]));

  // Russian twist
  const rt = [[50, 34], [50, 66]];
  add('russian', 'Russian twist',
    P([50, 24], [rt, [[50, 66], [44, 84]], [[50, 66], [56, 84]], [[42, 38], [32, 48], [28, 56]], [[58, 38], [40, 48], [30, 58]]], ball(26, 58)),
    P([50, 24], [rt, [[50, 66], [44, 84]], [[50, 66], [56, 84]], [[42, 38], [60, 48], [70, 58]], [[58, 38], [68, 48], [72, 56]]], ball(74, 58)));

  // Pallof press
  add('pallof', 'Pallof press (anti-rotazione)',
    P([50, 14], [T, G, [[50, 26], [52, 38], [58, 36]]], L(98, 36, 58, 36) + bar(58, 36)),
    P([50, 14], [T, G, [[50, 26], [66, 32], [80, 36]]], L(98, 36, 80, 36) + bar(80, 36)));

  // Lancio palla medica
  add('medball', 'Lancio medicine ball',
    P([50, 14], [[[50, 24], [48, 52]], [[48, 52], [38, 73], [30, 94]], [[48, 52], [60, 72], [66, 94]], [[50, 28], [38, 42], [34, 54]]], ball(32, 56)),
    P([54, 14], [[[52, 24], [54, 52]], [[54, 52], [58, 73], [62, 94]], [[54, 52], [46, 74], [36, 90]], [[52, 28], [68, 30], [84, 32]]], ball(90, 32) + L(99, -12, 99, 94)));

  // Box jump
  add('boxjump', 'Box jump',
    P([34, 44], [[[36, 54], [26, 74]], [[26, 74], [44, 80], [38, 94]], [[36, 58], [26, 70], [18, 80]]], box),
    P([80, 2], [[[80, 12], [80, 40]], [[80, 40], [84, 57], [80, 72]], [[80, 16], [86, 28], [90, 38]]], box));

  // Corda
  add('jumprope', 'Corda per saltare',
    P([50, 14], [T, G, [[50, 26], [62, 40], [66, 48]], [[50, 26], [38, 40], [34, 48]]], `<path class="eq" d="M66 48 C 100 -30, 0 -30, 34 48"/>`),
    P([50, 8], [[[50, 18], [50, 46]], [[50, 46], [50, 64], [50, 82]], [[50, 20], [62, 34], [66, 42]], [[50, 20], [38, 34], [34, 42]]], `<path class="eq" d="M66 42 C 96 130, 4 130, 34 42"/>`));

  // Farmer's walk
  add('farmer', "Farmer's walk",
    P([50, 14], [T, G, [[50, 26], [50, 46], [50, 62]]], db(50, 64)),
    P([50, 14], [T, [[50, 52], [60, 74], [66, 94]], [[50, 52], [42, 72], [36, 90]], [[50, 26], [50, 46], [50, 62]]], db(50, 64)));

  // Face pull
  add('facepull', 'Face pull',
    P([50, 14], [T, G, [[50, 26], [66, 26], [82, 24]]], L(98, 8, 82, 24) + bar(82, 24)),
    P([46, 14], [T, G, [[50, 26], [38, 28], [56, 16]]], L(98, 8, 56, 16) + bar(56, 16)));

  // Stacco rumeno
  add('rdl', 'Stacco rumeno',
    P([50, 14], [T, G, [[50, 26], [52, 44], [54, 58]]], bar(55, 60)),
    P([19, 42], [[[26, 48], [56, 54]], [[56, 54], [59, 74], [54, 94]], [[26, 50], [28, 66], [28, 78]]], bar(28, 80)));

  // Trazioni
  add('pullup', 'Trazioni alla sbarra',
    P([50, 22], [[[50, 32], [50, 60]], [[50, 60], [52, 76], [46, 90]], [[46, 34], [46, 18], [47, 2]]], bar(47, 2)),
    P([50, -4], [[[50, 14], [50, 42]], [[50, 42], [52, 58], [46, 72]], [[46, 16], [42, 8], [47, 2]]], bar(47, 2)));

  // Affondi
  add('lunge', 'Affondi',
    P([50, 14], [T, G, [[50, 26], [50, 44], [50, 58]]], db(50, 60)),
    P([50, 24], [[[50, 34], [50, 62]], [[50, 62], [70, 70], [68, 94]], [[50, 62], [36, 80], [22, 92]], [[50, 36], [50, 52], [50, 66]]], db(50, 68)));

  // Shadow boxing / sacco
  const stance = [[50, 52], [40, 74], [34, 94]], stance2 = [[50, 52], [62, 72], [66, 94]];
  add('shadow', 'Shadow boxing',
    P([48, 14], [T, stance, stance2, [[50, 28], [58, 40], [62, 26]], [[50, 28], [54, 42], [58, 32]]], glove(62, 24) + glove(58, 31)),
    P([50, 14], [T, stance, stance2, [[50, 28], [68, 28], [86, 28]], [[50, 28], [54, 42], [58, 32]]], glove(88, 28) + glove(58, 31)));
  add('bag', 'Sacco pesante',
    P([48, 14], [T, stance, stance2, [[50, 28], [58, 40], [62, 26]], [[50, 28], [54, 42], [58, 32]]], glove(62, 24) + glove(58, 31) + `<rect class="eq" x="93" y="0" width="7" height="56" rx="3"/>`),
    P([50, 14], [T, stance, stance2, [[50, 28], [68, 28], [86, 28]], [[50, 28], [54, 42], [58, 32]]], glove(88, 28) + glove(58, 31) + `<rect class="eq" x="93" y="0" width="7" height="56" rx="3"/>`));

  // Collo con elastico
  add('neck', 'Collo con elastico',
    P([50, 14], [T, G], L(98, 14, 57, 14)),
    P([60, 18], [T, G], L(98, 14, 67, 18)));

  function frame(p, ox = 0) {
    return `<g transform="translate(${ox} 0)"><line class="gnd" x1="4" y1="94" x2="96" y2="94"/>${p.e}<g class="bd">${p.l.map(q => `<polyline points="${q.map(z => z.join(',')).join(' ')}"/>`).join('')}<circle class="hd" cx="${p.h[0]}" cy="${p.h[1]}" r="6.5"/></g></g>`;
  }

  /* o.anim: pose alternate; o.first: solo prima posa; default: due pose affiancate */
  function svg(key, o = {}) {
    const d = D[key];
    if (!d) return '';
    if (o.anim && d.b) return `<svg class="dr" viewBox="0 -12 100 112"><g class="fa">${frame(d.a)}</g><g class="fb">${frame(d.b)}</g></svg>`;
    if (o.anim || o.first || !d.b) return `<svg class="dr" viewBox="0 -12 100 112">${frame(d.a)}</svg>`;
    return `<svg class="dr" viewBox="0 -12 210 112">${frame(d.a, 0)}${frame(d.b, 110)}</svg>`;
  }
  const keys = () => Object.keys(D).map(k => ({ k, name: D[k].name }));
  return { svg, keys, has: k => !!D[k], name: k => (D[k] ? D[k].name : '') };
})();
