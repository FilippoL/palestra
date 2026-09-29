'use strict';
/* Schede iniziali, trascritte dai PDF + schede aggiuntive (pugilato, corsa, riscaldamento, unilaterali). */
/* Versione delle schede predefinite: le schede con `since` maggiore della versione
   salvata vengono aggiunte automaticamente a chi ha già dei dati. */
const SEED_V = 2;

/* Riscaldamenti guidati: [nome, secondi, disegno]. Usati dal timer in Strumenti
   e per costruire la scheda "Riscaldamento". */
const WARMUPS = [
  { key: 'gen', name: 'Generale', steps: [
    ['Corsa sul posto / cyclette', 120, 'bike'], ['Jumping jack', 30, 'jack'],
    ['Circonduzioni braccia avanti', 20, 'armcircle'], ['Circonduzioni braccia indietro', 20, 'armcircle'],
    ['Slanci gamba destra', 20, 'legswing'], ['Slanci gamba sinistra', 20, 'legswing'],
    ['Squat a corpo libero', 30, 'squat'], ['Cat-cow', 30, 'catcow'], ['Bird dog', 30, 'birddog'],
    ['Ponte glutei', 30, 'bridge'], ['Jumping jack veloci', 30, 'jack']] },
  { key: 'run', name: 'Pre-corsa', steps: [
    ['Camminata veloce', 120, 'run'], ['Slanci gamba destra', 20, 'legswing'], ['Slanci gamba sinistra', 20, 'legswing'],
    ['Affondi alternati', 30, 'lunge'], ['Calf raise', 30, 'calf'], ['Skip (ginocchia alte)', 20, 'run'],
    ['Calciata dietro', 20, 'run'], ['Jumping jack', 30, 'jack'], ['Corsa leggera', 120, 'run']] },
  { key: 'up', name: 'Parte superiore', steps: [
    ['Circonduzioni braccia avanti', 30, 'armcircle'], ['Circonduzioni braccia indietro', 30, 'armcircle'],
    ['Rotazioni esterne con elastico', 40, 'extrot'], ['Face pull con elastico', 40, 'facepull'],
    ['Alzate laterali senza peso', 30, 'lateral'], ['Piegamenti facilitati', 30, 'pushup'], ['Cat-cow', 30, 'catcow']] },
  { key: 'low', name: 'Parte inferiore', steps: [
    ['Cyclette', 180, 'bike'], ['Slanci gamba destra', 20, 'legswing'], ['Slanci gamba sinistra', 20, 'legswing'],
    ['Squat a corpo libero', 40, 'squat'], ['Ponte glutei', 40, 'bridge'], ['Affondi alternati', 40, 'lunge'],
    ['Calf raise', 30, 'calf']] }
];

function SEED() {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const I = (name, sets, reps, rest, draw, kind) => ({ id: uid(), name, sets: String(sets), reps: String(reps), rest: String(rest), draw: draw || '', kind: kind || '' });
  const C = (name, sets, reps, rest, draw) => I(name, sets, reps, rest, draw, 'cardio');
  const Day = (name, items) => ({ id: uid(), name, items });
  const Plan = (key, since, name, sub, note, days) => ({ id: uid(), key, since, name, sub, note, days });
  const dur = s => (s % 60 ? s + '″' : s / 60 + '′');

  const fullBody = Plan('fullbody', 1, 'Full Body', '03/07/26 – 03/10/26', 'Comunicare il rinnovo della scheda entro 15 giorni dalla scadenza.', [
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

  const split = Plan('split', 1, 'Split', '20/10/25 – 20/01/26', 'Comunicare il rinnovo della scheda entro 15 giorni dalla scadenza.', [
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

  const boxe = Plan('boxe', 1, 'Propedeutica pugilato', 'Da affiancare agli allenamenti di boxe (2-3 sedute/sett.)',
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

  const warmup = Plan('warmup', 2, 'Riscaldamento', '5-10 minuti prima di ogni allenamento',
    'Esercizi a tempo: premi ▶ su una serie per il conto alla rovescia, oppure usa il riscaldamento guidato in Strumenti.',
    WARMUPS.map(w => Day(w.name, w.steps.map(([n, s, d]) => I(n, 1, dur(s), 0, d)))));

  const corsa = Plan('run', 2, 'Corsa', '3-4 uscite a settimana, alternando i giorni',
    'Aumenta i km settimanali al massimo del 10%. Registra km e minuti: il passo viene calcolato da solo. Nelle ripetute la pausa è corsa lentissima o camminata.', [
    Day('1 · Lenta (base aerobica)', [
      C('Camminata veloce', 1, '5′', 0, 'run'),
      C('Corsa lenta (riesci a parlare)', 1, '30′', 0, 'run'),
      C('Defaticamento camminando', 1, '5′', 0, 'run'),
      I('Allungamento quadricipiti', 2, '30″', 15, 'quadstretch'),
      I('Calf raise', 2, 15, 45, 'calf')
    ]),
    Day('2 · Ripetute', [
      C('Corsa lenta di riscaldamento', 1, '10′', 60, 'run'),
      I('Andature (skip, calciata)', 3, '20 m', 30, 'run'),
      C('Ripetute 400 m (ritmo 5 km)', 6, '400 m', 90, 'run'),
      C('Defaticamento', 1, '10′', 0, 'run')
    ]),
    Day('3 · Fartlek', [
      C('Corsa lenta', 1, '10′', 0, 'run'),
      C('Fartlek: 1′ veloce / 1′ lento', 8, '1′', 60, 'run'),
      C('Defaticamento', 1, '5′', 0, 'run')
    ]),
    Day('4 · Lungo', [
      C('Corsa lunga lenta', 1, '50–70′', 0, 'run'),
      I('Allungamento quadricipiti', 2, '30″', 15, 'quadstretch')
    ]),
    Day('5 · Forza per runner', [
      I('Split squat bulgaro', 3, '8/gamba', 90, 'splitsquat'),
      I('Step-up', 3, '10/gamba', 60, 'stepup'),
      I('Stacco rumeno', 3, 8, 90, 'rdl'),
      I('Ponte glutei a una gamba', 3, '10/gamba', 60, 'bridge'),
      I('Calf raise', 3, 15, 60, 'calf'),
      I('Plank', 3, '40″', 45, 'plank'),
      I('Dead bug', 3, '10/lato', 45, 'deadbug')
    ])
  ]);

  const unaGamba = Plan('oneleg', 2, 'Una gamba sola', 'Gamba a riposo o lavoro unilaterale',
    'Per chi ha una gamba infortunata o vuole correggere squilibri. Allenare l’arto sano aiuta a mantenere forza anche nell’altro (cross-education). Il giorno C solo con entrambe le gambe sane. In caso di infortunio segui le indicazioni del medico / fisioterapista.', [
    Day('A · Parte superiore da seduto', [
      I('Chest press', 4, 8, 90, 'benchpress'),
      I('Lat machine', 4, 8, 90, 'lat'),
      I('Rowing machine', 3, 10, 90, 'row'),
      I('Lento avanti manubri seduto', 3, 10, 90, 'shoulderpress'),
      I('Alzate laterali seduto', 3, 12, 60, 'lateral'),
      I('Curl manubri seduto', 3, 10, 60, 'curl'),
      I('Push down', 3, 12, 60, 'pushdown')
    ]),
    Day('B · Gamba sana alle macchine', [
      I('Leg press a una gamba', 4, 10, 90, 'legpress'),
      I('Leg extension a una gamba', 3, 12, 60, 'legext'),
      I('Leg curl a una gamba', 3, 12, 60, 'legcurl'),
      I('Ponte glutei a una gamba', 3, 10, 60, 'bridge'),
      I('Calf raise a una gamba', 3, 15, 45, 'calf'),
      I('Dead bug', 3, '10/lato', 45, 'deadbug'),
      I('Pallof press', 3, '10/lato', 45, 'pallof')
    ]),
    Day('C · Unilaterale in piedi', [
      I('Split squat bulgaro', 4, '8/gamba', 90, 'splitsquat'),
      I('Step-up', 3, '10/gamba', 60, 'stepup'),
      I('Stacco rumeno a una gamba', 3, '8/gamba', 90, 'rdl'),
      I('Affondi', 3, '10/gamba', 60, 'lunge'),
      I('Equilibrio su una gamba', 3, '30″', 30, 'balance'),
      I('Calf raise a una gamba', 3, 15, 45, 'calf')
    ]),
    Day('D · Condizionamento senza impatto', [
      I('Cyclette a una gamba', 6, '1′', 60, 'bike'),
      I('Ergometro braccia', 5, '2′', 60, 'bike'),
      I('Shadow boxing da seduto', 3, '2′', 60, 'shadow'),
      I('Russian twist', 3, 20, 45, 'russian'),
      I('Plank sugli avambracci', 3, '40″', 45, 'plank')
    ])
  ]);

  const unaSpalla = Plan('oneshoulder', 2, 'Una spalla sola', 'Spalla a riposo o lavoro unilaterale',
    'Braccio sano, gambe e core senza caricare la spalla a riposo: niente bilancieri, trazioni, dip, piegamenti o plank sulle mani. Il giorno C solo con l’ok del fisioterapista: carichi leggerissimi e mai dolore.', [
    Day('A · Braccio sano', [
      I('Rematore manubrio a un braccio', 4, 10, 90, 'sarow'),
      I('Lento avanti a un braccio', 3, 10, 90, 'sapress'),
      I('Chest press a un braccio', 3, 10, 90, 'benchpress'),
      I('Lat machine a un braccio', 3, 12, 60, 'lat'),
      I('Alzate laterali a un braccio', 3, 12, 60, 'lateral'),
      I('Curl manubrio', 3, 10, 60, 'curl'),
      I('Push down a un braccio', 3, 12, 60, 'pushdown')
    ]),
    Day('B · Gambe e core', [
      I('Leg press', 4, 8, 90, 'legpress'),
      I('Split squat bulgaro a corpo libero', 3, '10/gamba', 60, 'splitsquat'),
      I('Leg extension', 3, 12, 60, 'legext'),
      I('Leg curl', 3, 12, 60, 'legcurl'),
      I('Ponte glutei', 3, 12, 60, 'bridge'),
      I('Calf raise', 3, 15, 45, 'calf'),
      I('Dead bug (solo gambe)', 3, '10/lato', 45, 'deadbug'),
      C('Cyclette', 1, '10′', 0, 'bike')
    ]),
    Day('C · Rieducazione spalla', [
      I('Pendolo di Codman', 2, '30″', 30, 'pendulum'),
      I('Retrazioni scapolari', 3, 15, 45, 'facepull'),
      I('Rotazioni esterne con elastico', 3, 15, 45, 'extrot'),
      I('Rotazioni interne con elastico', 3, 15, 45, 'extrot'),
      I('Scivolamenti al muro', 2, 10, 45, 'shoulderpress'),
      I('Face pull leggero', 2, 15, 45, 'facepull')
    ])
  ]);

  const casa = Plan('home', 2, 'Corpo libero · casa', 'Senza attrezzi, 30-40 minuti',
    'Circuito: esegui gli esercizi di fila e riposa alla fine del giro. Per progredire aumenta ripetute o tempo.', [
    Day('A · Forza', [
      I('Squat a corpo libero', 4, 15, 60, 'squat'),
      I('Piegamenti', 4, 'MAX', 60, 'pushup'),
      I('Affondi', 3, '10/gamba', 60, 'lunge'),
      I('Dips su sedia', 3, 12, 60, 'dips'),
      I('Ponte glutei a una gamba', 3, '10/gamba', 45, 'bridge'),
      I('Plank', 3, '45″', 45, 'plank')
    ]),
    Day('B · HIIT', [
      I('Jumping jack', 4, '40″', 20, 'jack'),
      I('Jump squat', 4, '30″', 30, 'squat'),
      I('Skip sul posto', 4, '30″', 30, 'run'),
      I('Shadow boxing', 4, '40″', 20, 'shadow'),
      I('Dead bug', 3, '10/lato', 30, 'deadbug'),
      I('Bird dog', 3, '10/lato', 30, 'birddog')
    ])
  ]);

  return [warmup, fullBody, split, boxe, corsa, unaGamba, unaSpalla, casa];
}
