'use strict';
/* Schede iniziali, trascritte dai PDF + scheda propedeutica al pugilato. */
function SEED() {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const I = (name, sets, reps, rest, draw) => ({ id: uid(), name, sets: String(sets), reps: String(reps), rest: String(rest), draw: draw || '' });
  const Day = (name, items) => ({ id: uid(), name, items });
  const Plan = (name, sub, note, days) => ({ id: uid(), name, sub, note, days });

  const fullBody = Plan('Full Body', '03/07/26 – 03/10/26', 'Comunicare il rinnovo della scheda entro 15 giorni dalla scadenza.', [
    Day('A', [
      I('Leg press', 4, 6, 90, 'legpress'),
      I('Adductor machine', 3, 10, 90, 'adductor'),
      I('Hip thrust', 3, 8, 90, 'hipthrust'),
      I('Lat machine', 4, 8, 90, 'lat'),
      I('Pulley', 3, 12, 90, 'row'),
      I('Curl bilanciere EZ', 4, 8, 90, 'curl'),
      I('Curl al cavo basso', 3, 15, 90, 'curl')
    ]),
    Day('B', [
      I('Chest press piana', 4, 6, 90, 'benchpress'),
      I('Spinte al multipower panca 60', 3, 8, 90, 'incline'),
      I('Croci ai cavi alti', 3, 10, 90, 'cablefly'),
      I('Alzate laterali', 4, 12, 90, 'lateral'),
      I('Push down', 4, 10, 90, 'pushdown'),
      I('Leg extension', 3, 12, 90, 'legext'),
      I('Leg curl', 3, 12, 90, 'legcurl')
    ]),
    Day('C', [
      I('Abductor machine', 3, 8, 90, 'abductor'),
      I('Leg extension', 4, 12, 90, 'legext'),
      I('Leg press', 3, 8, 90, 'legpress'),
      I('Rematore bilanciere', 4, 8, 90, 'bbrow'),
      I('Rowing machine', 3, 10, 90, 'row'),
      I('Croci inverse alla peck machine', 3, 12, 90, 'rearfly'),
      I('Hammer curl', 3, 10, 90, 'curl')
    ])
  ]);

  const split = Plan('Split', '20/10/25 – 20/01/26', 'Comunicare il rinnovo della scheda entro 15 giorni dalla scadenza.', [
    Day('A · Gambe/Spalle', [
      I('Leg press / Hack squat', 4, 8, 90, 'legpress'),
      I('Hip thrust', 4, 8, 90, 'hipthrust'),
      I('Leg extension', 3, 12, 60, 'legext'),
      I('Leg curl', 3, 12, 60, 'legcurl'),
      I('Lento avanti manubri', 4, 8, 90, 'shoulderpress'),
      I('Alzate laterali', 4, 10, 60, 'lateral'),
      I('Posteriori alla peck machine', 3, 12, 60, 'rearfly')
    ]),
    Day('B · Petto/Tricipiti', [
      I('Chest press piana / Panca piana', 4, 8, 90, 'benchpress'),
      I('Spinte manubri su panca 30', 3, 10, 90, 'incline'),
      I('Peck machine', 4, 12, 60, 'fly'),
      I('Push up', 2, 'MAX', 90, 'pushup'),
      I('Push down sbarra', 4, 8, 90, 'pushdown'),
      I('Estensioni al cavo basso', 3, 12, 60, 'tricepext'),
      I('Dips / Dips panca', 3, 15, 60, 'dips')
    ]),
    Day('C · Dorso/Bicipiti', [
      I('Lat machine', 4, 8, 90, 'lat'),
      I('Rowing machine', 4, 10, 90, 'row'),
      I('Vertical row', 3, 12, 60, 'row'),
      I('Pulley', 3, 15, 60, 'row'),
      I('Curl manubri seduto', 4, 10, 90, 'curl'),
      I('Curl al cavo basso', 3, 12, 60, 'curl'),
      I('Curl machine', 2, 15, 60, 'curl')
    ])
  ]);

  const boxe = Plan('Propedeutica pugilato', 'Da affiancare agli allenamenti di boxe (2-3 sedute/sett.)',
    'Forza esplosiva, core e spalle resistenti. Priorità alla qualità del movimento; nei salti e lanci esplosivi carichi leggeri e velocità massima.', [
    Day('1 · Gambe e spinta', [
      I('Squat', 4, 5, 120, 'squat'),
      I('Affondi', 3, 8, 90, 'lunge'),
      I('Stacco rumeno', 3, 8, 120, 'rdl'),
      I('Box jump', 4, 4, 90, 'boxjump'),
      I('Lento avanti manubri', 4, 6, 90, 'shoulderpress'),
      I('Piegamenti', 3, 'MAX', 60, 'pushup'),
      I('Plank', 3, '45″', 45, 'plank')
    ]),
    Day('2 · Trazione e core', [
      I('Trazioni / Lat machine', 4, 6, 90, 'pullup'),
      I('Rematore bilanciere', 4, 8, 90, 'bbrow'),
      I('Face pull', 3, 15, 60, 'facepull'),
      I('Alzate laterali', 3, 15, 60, 'lateral'),
      I('Pallof press', 3, 10, 60, 'pallof'),
      I('Russian twist', 3, 20, 60, 'russian'),
      I("Farmer's walk", 3, '30 m', 60, 'farmer'),
      I('Collo con elastico', 2, 15, 45, 'neck')
    ]),
    Day('3 · Potenza e condizionamento', [
      I('Lancio medicine ball', 4, 6, 60, 'medball'),
      I('Jump squat', 4, 5, 90, 'squat'),
      I('Chest press esplosivo', 4, 5, 120, 'benchpress'),
      I('Corda per saltare', 6, '2′', 60, 'jumprope'),
      I('Shadow boxing', 3, '3′', 60, 'shadow'),
      I('Sacco pesante', 3, '3′', 60, 'bag')
    ])
  ]);

  return [fullBody, split, boxe];
}
