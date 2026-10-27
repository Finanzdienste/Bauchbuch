/*
 * Kopfschmerzen – eine eigene Eintragsart, und warum gerade das.
 *
 * Die Beschwerden dieser App sind Bauchbeschwerden. Jede Rechnung – der
 * Tageswert, die Auslöserbilanz, die Kriterien, die Richtung – holt sich die
 * Einträge mit `art === 'beschwerde'` und liest deren Stärke. Ein Kopfschmerz,
 * der dort als „Beschwerde mit der Art Kopf" läge, zählte überall als Bauch:
 * Eine 7 am Kopf machte aus dem Kaffee davor einen Auslöser, aus dem Tag einen
 * Beschwerdetag und aus einer ruhigen Woche eine schlechte.
 *
 * Deshalb ist der Kopf eine *Art* wie Stuhlgang oder Medikament, keine
 * Beschwerdeart. Keine der vorhandenen Rechnungen sieht ihn, und das ist kein
 * Versehen, sondern der Zweck: Was hier steht, rechnet nur mit sich selbst.
 *
 * Was den Kopf und den Bauch trotzdem verbindet, ist das Schmerzmittel.
 * Ibuprofen, Diclofenac und ASS sind die häufigste vermeidbare Ursache einer
 * gereizten Magenschleimhaut – und wer Kopfschmerzen hat, greift genau dazu.
 * Bei einer Gastritis Typ C ist das keine Randnotiz, sondern der Kern. Deshalb
 * zählt dieses Modul, an wie vielen Kopfschmerztagen ein solches Mittel im
 * Tagebuch steht, und was der Bauch an den Tagen danach gemacht hat.
 *
 * Und die Periode: Ein Kopfschmerz, der mit dem Zyklus kommt, ist ein anderer
 * als einer, der mit dem Nacken kommt. Die Phasen kommen aus zyklus.js, die
 * Zählung bleibt so grob wie dort – geschätzt, mit Fallzahlen daneben.
 */
import { plusTage } from './datum.js';
import { PHASEN, phaseVon } from './zyklus.js';

/*
 * Wie er sich anfühlt. Keine Diagnose-Schublade, sondern die Fragen, die in
 * der Sprechstunde gestellt werden: pochend oder drückend, eine Seite oder
 * beide, Übelkeit, Licht, Bewegung, Nacken, Aura. Aus der Kombination schließt
 * eine Ärztin etwas; die App schließt nichts, sie zählt.
 */
export const KOPF_ARTEN = [
  { id: 'pochend', name: 'Pochend, pulsierend' },
  { id: 'drueckend', name: 'Drückend, wie ein Band' },
  { id: 'einseitig', name: 'Einseitig' },
  { id: 'kopfuebel', name: 'Mit Übelkeit' },
  { id: 'licht', name: 'Licht oder Lärm stören' },
  { id: 'bewegung', name: 'Schlimmer bei Bewegung' },
  { id: 'nacken', name: 'Vom Nacken her' },
  { id: 'aura', name: 'Vorher Flimmern oder Sehstörung' },
];

const KOPF_MAP = Object.fromEntries(KOPF_ARTEN.map((a) => [a.id, a]));

export function kopfArtName(id) {
  return KOPF_MAP[id] ? KOPF_MAP[id].name : id;
}

/** Nur die Kopfschmerz-Einträge, und nur die mit einer Stärke. */
export function kopfEintraege(eintraege) {
  return (eintraege || []).filter((e) => e.art === 'kopf' && Number(e.staerke) >= 1);
}

/** Alle Tage, an denen überhaupt etwas eingetragen wurde – gleich was. */
function alleNotiertenTage(eintraege, tage) {
  return new Set([
    ...(eintraege || []).map((e) => e.am),
    ...Object.keys(tage || {}),
  ]);
}

/**
 * Die Grundzahlen: wie oft, an wie vielen Tagen, wie stark, wie oft was.
 *
 * `anteil` ist Kopfschmerztage durch notierte Tage – nicht durch Kalendertage.
 * Eine Lücke im Tagebuch ist kein kopfschmerzfreier Tag, sie ist eine Lücke.
 */
export function kopfZahlen(eintraege, tage) {
  const kopf = kopfEintraege(eintraege);
  const kopfTage = new Set(kopf.map((e) => e.am));
  const notiert = alleNotiertenTage(eintraege, tage);
  const zaehler = new Map();
  kopf.forEach((e) => {
    (e.kopfArten || []).forEach((id) => {
      if (KOPF_MAP[id]) zaehler.set(id, (zaehler.get(id) || 0) + 1);
    });
  });
  const summe = kopf.reduce((s, e) => s + Number(e.staerke), 0);
  return {
    anzahl: kopf.length,
    tage: kopfTage.size,
    notierteTage: notiert.size,
    anteil: notiert.size ? kopfTage.size / notiert.size : 0,
    schnitt: kopf.length ? summe / kopf.length : 0,
    hoechster: kopf.reduce((m, e) => Math.max(m, Number(e.staerke)), 0),
    arten: [...zaehler.entries()]
      .map(([id, anzahl]) => ({ id, name: kopfArtName(id), anzahl }))
      .sort((a, b) => b.anzahl - a.anzahl),
  };
}

/**
 * Kopfschmerz und Schmerzmittel am selben Tag.
 *
 * Gezählt werden Tage, nicht Einnahmen: Zwei Ibuprofen an einem Tag sind ein
 * Tag mit Ibuprofen. `istNsar` kommt von außen (mittel.js kennt die Gruppen),
 * damit dieses Modul nicht wissen muss, was Diclofenac ist.
 */
export function kopfMittel(eintraege, istNsar, heute) {
  const kopfTage = new Set(kopfEintraege(eintraege).map((e) => e.am));
  const mitMittel = new Set();
  const mitNsar = new Set();
  const nsarAlle = new Set();
  (eintraege || []).filter((e) => e.art === 'medikament').forEach((e) => {
    const nsar = !!istNsar && istNsar(e.mittel);
    if (nsar) nsarAlle.add(e.am);
    if (!kopfTage.has(e.am)) return;
    mitMittel.add(e.am);
    if (nsar) mitNsar.add(e.am);
  });
  /*
   * Wie oft in den letzten 30 Tagen – mit oder ohne Kopfschmerz daneben.
   *
   * Das ist die eine Zahl, die für den Kopf selbst zählt: Ein Schmerzmittel,
   * das an fünfzehn oder mehr Tagen im Monat genommen wird, kann selbst zum
   * Kopfschmerz beitragen. Dafür ist gleichgültig, wogegen es genommen wurde.
   */
  const ab = heute ? plusTage(heute, -29) : null;
  const letzte30 = ab ? [...nsarAlle].filter((iso) => iso >= ab && iso <= heute).length : 0;
  return {
    kopfTage: kopfTage.size,
    mitMittel: mitMittel.size,
    mitNsar: mitNsar.size,
    nsarTage: [...mitNsar].sort(),
    nsarLetzte30: letzte30,
  };
}

/**
 * Was der Bauch nach bestimmten Tagen macht.
 *
 * Verglichen wird der Bauch-Tageswert an den `abstand` Tagen *nach* jedem
 * genannten Tag mit dem an allen übrigen notierten Tagen. Der Tag selbst
 * bleibt draußen: Was am Tag der Einnahme im Magen war, lässt sich nicht von
 * dem trennen, was davor war. `tagesWert` kommt von außen, wie bei zyklus.js
 * – der Bauch wird in auswertung.js gerechnet, nicht hier.
 *
 * Ab fünf Tagen auf beiden Seiten ist das eine Zahl, darunter ein Zufall. Und
 * auch dann ist es ein Hinweis, kein Beweis: Ein Kopfschmerztag ist oft ein
 * anstrengender Tag, und der Magen weiß das auch ohne Tablette.
 */
export function nachwirkung(eintraege, tage, nachTagen, tagesWert, abstand = 2) {
  const danachTage = new Set();
  (nachTagen || []).forEach((iso) => {
    for (let i = 1; i <= abstand; i++) danachTage.add(plusTage(iso, i));
  });
  const ausgenommen = new Set(nachTagen || []);
  const danach = { tage: 0, summe: 0 };
  const sonst = { tage: 0, summe: 0 };
  alleNotiertenTage(eintraege, tage).forEach((iso) => {
    if (ausgenommen.has(iso)) return;
    const t = tagesWert(eintraege, iso, tage);
    if (!t.notiert) return;
    const eimer = danachTage.has(iso) ? danach : sonst;
    eimer.tage += 1;
    eimer.summe += t.wert;
  });
  const mittel = (x) => (x.tage ? x.summe / x.tage : 0);
  const genug = danach.tage >= 5 && sonst.tage >= 5;
  return {
    abstand,
    danach: { tage: danach.tage, schnitt: mittel(danach) },
    sonst: { tage: sonst.tage, schnitt: mittel(sonst) },
    differenz: mittel(danach) - mittel(sonst),
    genug,
    // Eine ganze Stufe, wie bei der Richtung: Darunter ist es Schwankung.
    deutlich: genug && mittel(danach) - mittel(sonst) >= 1,
  };
}

/**
 * Kopfschmerztage je Zyklusphase – nur, wenn die Periode eingetragen wird.
 *
 * Für jede Phase: wie viele notierte Tage, wie viele davon mit Kopfschmerz.
 * Ohne Urteil; die Fallzahlen stehen daneben. Eine Phase ohne notierte Tage
 * fehlt in der Liste, statt mit 0 von 0 zu prahlen.
 */
export function kopfNachPhase(eintraege, tage) {
  const kopfTage = new Set(kopfEintraege(eintraege).map((e) => e.am));
  const eimer = Object.fromEntries(PHASEN.map((p) => [p.id, { tage: 0, mit: 0 }]));
  alleNotiertenTage(eintraege, tage).forEach((iso) => {
    const p = phaseVon(tage, iso);
    if (!p) return;
    eimer[p].tage += 1;
    if (kopfTage.has(iso)) eimer[p].mit += 1;
  });
  return PHASEN
    .filter((p) => eimer[p.id].tage > 0)
    .map((p) => ({
      phase: p.id,
      name: p.name,
      tage: eimer[p.id].tage,
      mit: eimer[p.id].mit,
      anteil: eimer[p.id].mit / eimer[p.id].tage,
    }));
}

/** Der Satz zur Nachwirkung – oder keiner, wenn er nicht zulässig ist. */
export function nachwirkungSatz(n, fmt) {
  if (!n || !n.genug) return '';
  const z = fmt || ((x) => String(Math.round(x * 10) / 10).replace('.', ','));
  const tagWort = n.abstand === 1 ? 'Am Tag' : `An den ${n.abstand} Tagen`;
  if (n.deutlich) {
    return `${tagWort} nach einem Kopfschmerztag mit entzündungshemmendem `
      + `Schmerzmittel lag der Bauch im Mittel bei ${z(n.danach.schnitt)}, an den `
      + `übrigen Tagen bei ${z(n.sonst.schnitt)} (${n.danach.tage} gegen `
      + `${n.sonst.tage} Tage). Das ist ein Hinweis, kein Beweis – aber einer, `
      + 'der in die Sprechstunde gehört.';
  }
  return `${tagWort} nach einem Kopfschmerztag mit entzündungshemmendem `
    + `Schmerzmittel lag der Bauch im Mittel bei ${z(n.danach.schnitt)}, sonst `
    + `bei ${z(n.sonst.schnitt)} (${n.danach.tage} gegen ${n.sonst.tage} Tage) `
    + '– kein deutlicher Unterschied.';
}
