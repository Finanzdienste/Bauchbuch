/*
 * Die Kriterien: dieselben Regeln, nach denen in der Sprechstunde eingeordnet
 * wird – auf die eigenen Eintragungen angewandt.
 *
 * Bis hierher hat diese App beschrieben („säuretypisches Bild"). Diese Datei
 * geht einen Schritt weiter und rechnet zwei anerkannte Regelwerke nach:
 *
 *   * **Rom IV** für das Reizdarmsyndrom und die funktionelle Dyspepsie. Das
 *     sind die Kriterien, mit denen diese beiden Diagnosen tatsächlich gestellt
 *     werden – sie bestehen aus nichts als Beschwerden und Zeiträumen, also
 *     genau aus dem, was in einem Tagebuch steht.
 *   * **GerdQ** für die Refluxkrankheit. Sechs Fragen, eine veröffentlichte
 *     Schwelle, und in Studien ungefähr so treffsicher wie die Einschätzung
 *     einer Hausärztin.
 *
 * DREI DINGE, DIE DAZUGEHÖREN, UND ZWAR JEDES MAL:
 *
 * 1. **Erfüllte Kriterien sind keine Diagnose.** Beide Regelwerke setzen
 *    ausdrücklich voraus, dass nichts Organisches dahintersteckt – und das
 *    weiß nur eine Untersuchung. „Erfüllt die Kriterien" heißt: Wenn Spiegelung
 *    und Blutbild unauffällig sind, passt der Name. Nicht mehr, und das ist
 *    schon viel.
 *
 * 2. **Ein Tagebuch untererfasst.** Der GerdQ wird sonst gefragt („an wie
 *    vielen Tagen hatten Sie …?"); hier wird gezählt. Wer einen Tag nicht
 *    einträgt, hat an diesem Tag laut Tagebuch nichts gehabt. Jede Punktzahl
 *    hier ist deshalb eher zu niedrig als zu hoch – sie ist eine Untergrenze.
 *
 * 3. **Ohne genug Zeitraum kein Ergebnis.** Rom IV verlangt drei Monate
 *    Beschwerden und einen Beginn vor mindestens einem halben Jahr. Was diese
 *    Datei nicht prüfen kann, behauptet sie nicht: Dann steht `pruefbar: false`
 *    und daneben, was noch fehlt.
 */
import { plusTage, tageDazwischen } from './datum.js';
import { bezugBilanz, schmerzVergleich, stuhlTyp } from './stuhl.js';

/*
 * Ab welcher Stärke eine Beschwerde als „belastend" gilt.
 *
 * Die Rom-Kriterien sagen „bothersome" – belastend genug, um davon zu
 * erzählen. Auf der Skala dieser App ist das die 4, das Wort dazu heißt
 * „merklich". Eine 2 („sehr leicht") mitzuzählen würde die Kriterien bei fast
 * jedem erfüllen und sie damit wertlos machen.
 */
const BELASTEND = 4;

/** Rom IV rechnet in den letzten drei Monaten. */
const FENSTER_TAGE = 90;

/** Und verlangt einen Beginn vor mindestens einem halben Jahr. */
const BEGINN_MONATE = 6;

/** GerdQ fragt nach den letzten sieben Tagen. */
const GERDQ_TAGE = 7;

const inFenster = (iso, von, bis) => iso >= von && iso <= bis;

/** Tage im Zeitraum, an denen überhaupt etwas notiert wurde. */
function notierteTage(eintraege, tage, von, bis) {
  const isos = new Set();
  (eintraege || []).forEach((e) => { if (inFenster(e.am, von, bis)) isos.add(e.am); });
  Object.keys(tage || {}).forEach((iso) => { if (inFenster(iso, von, bis)) isos.add(iso); });
  return [...isos].sort();
}

/** Tage, an denen eine dieser Beschwerdearten mindestens `ab` stark war. */
function tageMit(eintraege, arten, von, bis, ab = BELASTEND) {
  const isos = new Set();
  (eintraege || []).forEach((e) => {
    if (e.art !== 'beschwerde' || !inFenster(e.am, von, bis)) return;
    if ((Number(e.staerke) || 0) < ab) return;
    if ((e.arten || []).some((a) => arten.includes(a))) isos.add(e.am);
  });
  return [...isos].sort();
}

/**
 * Wie viele Tage je Woche – gerechnet über die *notierten* Tage, nicht über den
 * Kalender.
 *
 * Der Unterschied ist der ganze Punkt: Wer in drei Monaten an dreißig Tagen
 * schreibt und an zehn davon Schmerz hat, hat nicht „0,8 Tage die Woche",
 * sondern ein Drittel seiner erfassten Tage. Auf den Kalender hochgerechnet
 * wäre die Zahl erfunden; über die notierten Tage ist sie ehrlich und steht
 * mit ihrer Grundlage daneben.
 */
function proWoche(trefferTage, notierte) {
  if (!notierte) return 0;
  return (trefferTage / notierte) * 7;
}

/**
 * Wie lange die Beschwerden schon bestehen.
 *
 * `seit` ist 'YYYY-MM' aus den Einstellungen – die eine Angabe, die aus dem
 * Tagebuch nicht hervorgeht, weil es an dem Tag beginnt, an dem jemand anfängt
 * zu schreiben. Ohne sie bleibt die Zeitbedingung offen statt erfüllt.
 */
export function dauerStand(seit, heute) {
  if (!seit || !/^\d{4}-\d{2}$/.test(seit)) {
    return { seit: null, monate: null, erfuellt: null };
  }
  const [jy, jm] = seit.split('-').map(Number);
  const [hy, hm] = heute.split('-').map(Number);
  const monate = (hy - jy) * 12 + (hm - jm);
  return { seit, monate, erfuellt: monate >= BEGINN_MONATE };
}

/* ---------------------------------------------------------------------------
 * Rom IV: Reizdarmsyndrom
 * ---------------------------------------------------------------------------
 *
 * Wiederkehrender Bauchschmerz, im Mittel an mindestens einem Tag pro Woche in
 * den letzten drei Monaten, verbunden mit mindestens zwei von drei Merkmalen:
 * Zusammenhang mit dem Stuhlgang, Änderung der Häufigkeit, Änderung der Form.
 *
 * Alle drei Merkmale werden hier aus dem Tagebuch gerechnet statt gefragt –
 * beim ersten aus der ausdrücklichen Angabe im Beschwerdebogen, bei den beiden
 * anderen aus dem Vergleich von Schmerztagen mit den übrigen. Das ist nicht
 * dasselbe wie die Frage, und es steht überall dabei.
 */
function reizdarm(d) {
  const schmerzTage = tageMit(d.eintraege, ['krampf'], d.von, d.bis);
  const proW = proWoche(schmerzTage.length, d.notierte.length);
  const v = schmerzVergleich(d.eintraege, d.tage, ['krampf']);
  const bez = bezugBilanz(d.eintraege);
  const typ = stuhlTyp(d.eintraege);

  const merkmale = [
    {
      id: 'stuhlgang',
      name: 'Hängt mit dem Stuhlgang zusammen',
      erfuellt: bez.genug && bez.anteil >= 0.5,
      pruefbar: bez.genug,
      text: bez.genug
        ? `Bei ${bez.geaendert} von ${bez.beantwortet} Beschwerden mit Angabe war es `
          + `nach dem Stuhlgang anders (${bez.besser}× besser, ${bez.schlechter}× schlechter).`
        : `Erst ${bez.beantwortet} von 4 Beschwerden mit Angabe dazu. Die Frage steht `
          + 'im Beschwerdebogen unten.',
    },
    {
      id: 'haeufigkeit',
      name: 'Die Häufigkeit ändert sich dabei',
      erfuellt: v.genugTage && v.haeufigkeitAnders,
      pruefbar: v.genugTage,
      text: v.genugTage
        ? `An Schmerztagen ${v.mit.proTag.toFixed(1).replace('.', ',')} Stuhlgänge am Tag `
          + `(${v.mit.tage} Tage), sonst ${v.ohne.proTag.toFixed(1).replace('.', ',')} `
          + `(${v.ohne.tage} Tage).`
        : `Dafür braucht es je 5 Tage mit und ohne Bauchschmerz – bisher `
          + `${v.mit.tage} und ${v.ohne.tage}.`,
    },
    {
      id: 'form',
      name: 'Die Form ändert sich dabei',
      erfuellt: v.genugStuhl && v.formAnders,
      pruefbar: v.genugStuhl,
      text: v.genugStuhl
        ? `An Schmerztagen waren ${Math.round(v.mit.anteilAuffaellig * 100)} % der `
          + `Stuhlgänge auffällig geformt (${v.mit.stuhlgaenge} Stück), sonst `
          + `${Math.round(v.ohne.anteilAuffaellig * 100)} % (${v.ohne.stuhlgaenge} Stück).`
        : `Dafür braucht es je 5 Stuhlgänge an Tagen mit und ohne Bauchschmerz – `
          + `bisher ${v.mit.stuhlgaenge} und ${v.ohne.stuhlgaenge}.`,
    },
  ];

  const erfuellteMerkmale = merkmale.filter((m) => m.erfuellt).length;
  const schmerzErfuellt = proW >= 1;
  // Prüfbar heißt: genug notierte Tage für eine Aussage über Wochen, und
  // mindestens zwei der drei Merkmale überhaupt beurteilbar. Sonst hinge das
  // Ergebnis daran, was *nicht* eingetragen wurde.
  const pruefbar = d.notierte.length >= 30
    && merkmale.filter((m) => m.pruefbar).length >= 2;

  return {
    pruefbar,
    erfuellt: pruefbar && schmerzErfuellt && erfuellteMerkmale >= 2,
    schmerzTage: schmerzTage.length,
    proWoche: proW,
    schmerzErfuellt,
    merkmale,
    erfuellteMerkmale,
    typ,
  };
}

/* ---------------------------------------------------------------------------
 * Rom IV: Funktionelle Dyspepsie
 * ---------------------------------------------------------------------------
 *
 * Mindestens eines von vier belastenden Beschwerdebildern in den letzten drei
 * Monaten. Unterteilt in zwei Formen, die verschieden behandelt werden:
 *
 *   PDS  Völlegefühl nach dem Essen oder frühes Sattsein, an mindestens
 *        drei Tagen pro Woche.
 *   EPS  Schmerz oder Brennen im Oberbauch, an mindestens einem Tag pro Woche.
 *
 * Beides zugleich kommt vor und ist kein Widerspruch.
 */
function dyspepsie(d) {
  const pdsTage = tageMit(d.eintraege, ['druck', 'saettigung'], d.von, d.bis);
  const epsTage = tageMit(d.eintraege, ['oberbauch', 'brennen'], d.von, d.bis);
  const pdsW = proWoche(pdsTage.length, d.notierte.length);
  const epsW = proWoche(epsTage.length, d.notierte.length);
  const pruefbar = d.notierte.length >= 30;

  return {
    pruefbar,
    pds: {
      tage: pdsTage.length,
      proWoche: pdsW,
      erfuellt: pruefbar && pdsW >= 3,
      name: 'Postprandiales Distress-Syndrom (PDS)',
      satz: 'Völlegefühl nach dem Essen und frühes Sattsein stehen im Vordergrund.',
    },
    eps: {
      tage: epsTage.length,
      proWoche: epsW,
      erfuellt: pruefbar && epsW >= 1,
      name: 'Epigastrisches Schmerzsyndrom (EPS)',
      satz: 'Schmerz oder Brennen im Oberbauch stehen im Vordergrund, unabhängig '
        + 'vom Essen.',
    },
    erfuellt: pruefbar && (pdsW >= 3 || epsW >= 1),
  };
}

/* ---------------------------------------------------------------------------
 * GerdQ
 * ---------------------------------------------------------------------------
 *
 * Sechs Fragen nach den letzten sieben Tagen, jede 0 bis 3 Punkte, zusammen 0
 * bis 18. Ab 8 Punkten gilt eine Refluxkrankheit als wahrscheinlich.
 *
 * Zwei der sechs zählen *umgekehrt*: Oberbauchschmerz und Übelkeit sprechen
 * eher gegen Reflux und für etwas anderes im Magen. Das ist keine Marotte des
 * Fragebogens, sondern sein eigentlicher Trick – er misst nicht, wie schlecht
 * es jemandem geht, sondern wie typisch das Muster ist.
 */
const GERDQ_POSTEN = [
  { id: 'sodbrennen', frage: 'Brennen hinter dem Brustbein', arten: ['sodbrennen', 'brennen'], richtung: 1 },
  { id: 'aufstossen', frage: 'Aufstoßen, Rückfluss in den Mund', arten: ['aufstossen'], richtung: 1 },
  { id: 'oberbauch', frage: 'Schmerz in der Magengrube', arten: ['oberbauch'], richtung: -1 },
  { id: 'uebelkeit', frage: 'Übelkeit', arten: ['uebelkeit'], richtung: -1 },
];

/** 0 Tage → 0, 1 Tag → 1, 2–3 Tage → 2, 4–7 Tage → 3. */
function gerdqPunkt(tage) {
  if (tage <= 0) return 0;
  if (tage === 1) return 1;
  if (tage <= 3) return 2;
  return 3;
}

function gerdq(d) {
  const von = plusTage(d.bis, -(GERDQ_TAGE - 1));
  const erfasst = notierteTage(d.eintraege, d.tage, von, d.bis).length;

  const posten = GERDQ_POSTEN.map((p) => {
    // Ohne Stärkeschwelle: Der GerdQ fragt, ob es da war, nicht wie schlimm.
    const tage = tageMit(d.eintraege, p.arten, von, d.bis, 1).length;
    const roh = gerdqPunkt(tage);
    return {
      ...p,
      tage,
      punkte: p.richtung === 1 ? roh : 3 - roh,
      umgekehrt: p.richtung === -1,
    };
  });

  // Nächte, in denen die Beschwerden geweckt haben – aus der Tagesfrage.
  const naechte = Object.keys(d.tage || {})
    .filter((iso) => inFenster(iso, von, d.bis) && Number(d.tage[iso].nachtwach) >= 1).length;
  posten.push({
    id: 'nachtwach',
    frage: 'Nachts davon wach geworden',
    tage: naechte,
    punkte: gerdqPunkt(naechte),
    umgekehrt: false,
  });

  // Tage mit einem säurewirksamen Mittel. Der Fragebogen zielt auf die frei
  // gekaufte Tablette gegen die Beschwerden – eine dauerhaft verordnete zählt
  // dort genauso, und unterscheiden kann das Tagebuch beides nicht.
  const mittelTage = [...new Set((d.eintraege || [])
    .filter((e) => e.art === 'medikament' && inFenster(e.am, von, d.bis)
      && d.istSaeuremittel(e.mittel))
    .map((e) => e.am))].length;
  posten.push({
    id: 'mittel',
    frage: 'Ein Mittel gegen die Beschwerden genommen',
    tage: mittelTage,
    punkte: gerdqPunkt(mittelTage),
    umgekehrt: false,
  });

  const punkte = posten.reduce((s, p) => s + p.punkte, 0);
  return {
    punkte,
    max: 18,
    schwelle: 8,
    wahrscheinlich: punkte >= 8,
    posten,
    erfasst,
    von,
    bis: d.bis,
    // Unter vier erfassten Tagen der letzten sieben ist die Zahl nicht mehr
    // eine Untergrenze, sondern Zufall.
    belastbar: erfasst >= 4,
  };
}

/* ------------------------------------------------------------------------- */

/**
 * Alle Kriterien auf einmal.
 *
 * @param {object} d
 *   eintraege, tage, heute (ISO), beschwerdenSeit ('YYYY-MM' oder null),
 *   istSaeuremittel(name) – Prüfung, ob ein Mittel auf die Säure wirkt; kommt
 *   von außen herein, damit diese Datei nichts über die Mittelliste weiß.
 */
export function kriterien(d) {
  const bis = d.heute;
  const von = plusTage(bis, -(FENSTER_TAGE - 1));
  const notierte = notierteTage(d.eintraege, d.tage, von, bis);
  const basis = {
    eintraege: d.eintraege || [],
    tage: d.tage || {},
    istSaeuremittel: d.istSaeuremittel || (() => false),
    von,
    bis,
    notierte,
  };

  const erste = (d.eintraege || []).length ? d.eintraege[0].am : null;
  return {
    zeitraum: {
      von,
      bis,
      tage: FENSTER_TAGE,
      notierteTage: notierte.length,
      // Wie lange überhaupt geschrieben wird. Nicht dasselbe wie die Dauer der
      // Beschwerden, und der Unterschied ist genau das, was `dauer` festhält.
      tagebuchTage: erste ? tageDazwischen(erste, bis) + 1 : 0,
    },
    dauer: dauerStand(d.beschwerdenSeit, bis),
    reizdarm: reizdarm(basis),
    dyspepsie: dyspepsie(basis),
    gerdq: gerdq(basis),
  };
}

/**
 * Lohnt es sich überhaupt, die Kriterien anzuzeigen?
 *
 * Unter zwei Wochen Tagebuch steht dort nur, was alles noch nicht geht. Das ist
 * richtig, aber es entmutigt genau die, die gerade angefangen haben.
 */
export function genugFuerKriterien(k) {
  return k.zeitraum.notierteTage >= 14;
}
