/*
 * Die Rechnungen der Familie „Kiefer und Nacken" (js/spannung.js) und was
 * dazu in js/kopf.js, js/aktivitaet.js und js/zyklus.js neu ist.
 *
 * Wie bei ADHS steckt die Täuschung im Kleingedruckten:
 *
 *   * Eine fehlende Antwort zur Schiene ist keine Nacht ohne Schiene (R2).
 *   * Nach Feier, Reise oder Alkohol zählt die Nacht auf keiner Seite.
 *   * Ein Kopfschmerz schon am verspannten Tag schließt den Fall aus – sonst
 *     wäre die Verspannung womöglich seine Folge.
 *   * Ein Kopfschmerz vom Vorabend, der herüberreicht, ist kein neuer.
 *   * Der Filter für Massage und Wärme liest den Vortag – was vorher feststand.
 *
 * Und ein eingebauter Unterschied wird gefunden: neuer Kopfschmerz nach
 * einem stark verspannten Tag 60 gegen 15 Prozent nach einem lockeren, 30
 * gegen 30 Fälle – in mindestens 75 von 100 Tagebüchern.
 */
import { pruefer } from './umgebung.mjs';
import { appModul } from './adhs-daten.mjs';
import { isoPlus, mulberry32 } from './rechnungen.mjs';

const { check, ende } = pruefer();
const { spannungAuswertung, v3Filter, V3_IDS } = await appModul('spannung.js');
const { aktivitaetBilanz } = await appModul('aktivitaet.js');
const { herueberreichend, kopfMerkmale } = await appModul('kopf.js');
const { phasenFrage } = await appModul('zyklus.js');

const START = '2026-01-05';
const tagN = (i) => isoPlus(START, i);
let nr = 0;
const nid = (p) => `${p}${(nr += 1)}`;
const kopf = (iso, um, extra = {}) => ({ id: nid('k'), art: 'kopf', am: iso, um, staerke: 5, kopfArten: [], ...extra });
const stuhl = (iso, um = '06:30') => ({ id: nid('s'), art: 'stuhl', am: iso, um, form: 4 });
const essen = (iso, um, extra = {}) => ({ id: nid('e'), art: 'essen', am: iso, um, was: 'Essen', zutaten: [], portion: 'normal', ...extra });
const aktiv = (iso, um, id) => ({ id: nid('a'), art: 'aktivitaet', am: iso, um, aktivitaeten: [id] });
const mittel = (iso, um) => ({ id: nid('m'), art: 'medikament', am: iso, um, mittel: 'Strattera', dosis: '40 mg' });
const mittelAm = (iso, um, name, extra = {}) => ({
  id: nid('m'), art: 'medikament', am: iso, um, mittel: name, dosis: '', ...extra,
});
const HEUTE = '2026-12-31';
const JETZT = Date.parse('2027-01-01T12:00:00Z');
const auswerten = (eintraege, tage) => spannungAuswertung({ eintraege, tage, heute: HEUTE, jetzt: JETZT });
/* R9: Zielzahlen in jeder Reihenfolge; „x von y“ nur in den Sätzen der Seite „ohne“ (siehe test-adhs-rechnung). */
const ZIELZAHL = /(braucht|nötig|noch|fehl\w*|mindestens)\W{0,3}\d|\d+\W{0,3}(nötig|fehl)/i;
const X_VON_Y = /\d+ von \d+/;
const RAT = /\b(nimm|nehmen Sie|empfehlen|empfohlen|du solltest|hilft gegen)\b/i;
const verteilt = (n, ab = 0, schritt = 3) => Array.from({ length: n }, (_, k) => ab + k * schritt);

/* ---------- 1. V1: Nächte mit und ohne Schiene ---------- */

{
  const eintraege = [];
  const tage = {};
  const mit = verteilt(20, 0, 4);
  const ohne = verteilt(20, 1, 4);
  const keine = verteilt(20, 2, 4);
  [...mit, ...ohne, ...keine].forEach((i) => { eintraege.push(stuhl(tagN(i))); });
  mit.forEach((i) => { tage[tagN(i)] = { schiene: 1, kiefer: 1 }; });
  ohne.forEach((i) => { tage[tagN(i)] = { schiene: 0, kiefer: 1 }; });
  keine.forEach((i) => { tage[tagN(i)] = { kiefer: 4 }; eintraege.push(kopf(tagN(i), '07:00')); });
  const v1 = auswerten(eintraege, tage).v1;
  check(v1.getragen === 20 && v1.nicht === 20 && v1.ohneAngabe === 20,
    `Schiene: 20 Nächte getragen, 20 nicht, 20 ohne Angabe (${v1.getragen}/${v1.nicht}/${v1.ohneAngabe})`);
  check(v1.v1a.ohne.n === 20 && v1.v1a.ohne.schnitt === 0 && v1.v1b.ohne.n === 20 && v1.v1b.ohne.schnitt === 1,
    'R2: Nächte ohne Antwort zählen nicht als „ohne Schiene“ – auch nicht die mit Kopfschmerz am Morgen');
  check(v1.saetze.includes('Die Schiene ist vor allem zum Schutz der Zähne gedacht. Kein Unterschied beim '
    + 'Kopfschmerz heißt nicht, dass sie nutzlos ist; eine Wirkung kann auch über mehrere Nächte nachhallen.'),
  'der Satz zur Schiene steht immer dabei');
}
{
  // Nach Feier, Reise oder Alkohol zählt die Nacht nicht – auf keiner Seite.
  const eintraege = [];
  const tage = {};
  verteilt(30, 1, 3).forEach((i, k) => {
    const d = tagN(i);
    tage[d] = { schiene: k % 2, kiefer: 2 };
    eintraege.push(stuhl(d));
    const vortag = tagN(i - 1);
    if (k % 5 === 0) eintraege.push(aktiv(vortag, '21:00', 'feier'));
    if (k % 5 === 1) eintraege.push(aktiv(vortag, '15:00', 'unterwegs'));
    if (k % 5 === 2) eintraege.push(essen(vortag, '19:30', { zutaten: [{ id: 'alkohol', rolle: 'getraenk' }] }));
  });
  const v1 = auswerten(eintraege, tage).v1;
  check(v1.gestoert === 18 && v1.v1b.mit.n + v1.v1b.ohne.n === 12,
    `Nächte nach Feier, Reise oder Alkohol fallen beidseitig heraus (${v1.gestoert} von 30), gezählt`);
  check(v1.saetze.includes('18 Nächte nach Feier, Reise oder Alkohol nicht gewertet.'), 'und die Zahl steht da');
}
{
  // V1a, wie es definiert ist. `einnahme` ist true (07:00) oder eine Funktion,
  // die die Einnahme des Tages baut.
  const fall = (eintraegeAmTag, einnahme = false) => {
    const eintraege = [];
    const tage = {};
    for (let k = 0; k < 14; k++) {
      const d = tagN(k * 3);
      tage[d] = { schiene: 0 };
      eintraege.push(stuhl(d));
      if (einnahme === true) eintraege.push(mittel(d, '07:00'));
      else if (einnahme) eintraege.push(einnahme(d));
      eintraege.push(...eintraegeAmTag(d));
    }
    for (let k = 0; k < 14; k++) {
      const d = tagN(k * 3 + 1);
      tage[d] = { schiene: 1 };
      eintraege.push(stuhl(d));
    }
    const v = auswerten(eintraege, tage).v1;
    return { schnitt: v.v1a.ohne.n ? v.v1a.ohne.schnitt : null, n: v.v1a.ohne.n, unklar: v.unklar, herueber: v.herueber };
  };
  check(fall((d) => [kopf(d, '15:00', { kopfArten: ['aufwachen'] })]).schnitt === 1,
    'V1a: „Schon beim Aufwachen da“ zählt als Kopf am Morgen, gleich wann eingetragen');
  check(fall((d) => [kopf(d, '08:30')]).schnitt === 1, 'V1a: ohne Einnahme zählt ein Kopfschmerz vor 9 Uhr');
  check(fall((d) => [kopf(d, '10:00')]).schnitt === 0, 'V1a: ein Kopfschmerz um 10 Uhr ist keiner am Morgen');
  check(fall((d) => [kopf(d, '08:30')], true).schnitt === 0,
    'V1a: mit einer Einnahme um 7 zählt nur, was davor begann');
  const unklar = fall((d) => [kopf(d, '08:00', { ungefaehr: true, tageszeit: 'morgens' })]);
  check(unklar.n === 0 && unklar.unklar === 14, 'V1a: „morgens“ ohne Uhrzeit und ohne Merkmal bleibt offen und zählt nicht');
  const her = fall((d) => [kopf(isoPlus(d, -1), '22:00')]);
  check(her.n === 0 && her.herueber === 14, 'V1a: ein Kopfschmerz vom Vorabend reicht herüber – der Morgen zählt nicht');

  // Nur eine Einnahme am Morgen verschiebt die Grenze. Guanfacin wird oft
  // abends genommen – ein Kopfschmerz am Nachmittag ist trotzdem keiner am Morgen.
  const abends = (d) => mittelAm(d, '20:00', 'Intuniv');
  check(fall((d) => [kopf(d, '15:30')], abends).schnitt === 0,
    'V1a: mit einer Einnahme um 20 Uhr ist ein Kopfschmerz um 15:30 keiner am Morgen');
  check(fall((d) => [kopf(d, '08:30')], abends).schnitt === 1,
    'V1a: mit einer Einnahme am Abend gilt dasselbe wie ohne Einnahme – vor 9 Uhr');
  check(fall((d) => [kopf(d, '10:00')], (d) => mittelAm(d, '10:30', 'Elvanse')).schnitt === 1
    && fall((d) => [kopf(d, '10:00')], (d) => mittelAm(d, '11:30', 'Elvanse')).schnitt === 0,
  'V1a: eine Einnahme bis 11 Uhr ist eine am Morgen, eine danach nicht');
  // Eine ungefähre Einnahme „morgens" lässt offen, ob ein Kopfschmerz um 8:30
  // davor oder danach begann (R3) – der Tag zählt dann nicht, statt 9 Uhr anzunehmen.
  const ungefaehr = (d) => mittelAm(d, '08:00', 'Medikinet adult', { ungefaehr: true, tageszeit: 'morgens' });
  const offen = fall((d) => [kopf(d, '08:30')], ungefaehr);
  check(offen.n === 0 && offen.unklar === 14,
    `V1a: ungefähre Einnahme „morgens“ und Kopfschmerz um 8:30 – offen, nicht gezählt (${offen.n}/${offen.unklar})`);
  check(fall((d) => [kopf(d, '04:30')], ungefaehr).schnitt === 1
    && fall((d) => [kopf(d, '11:30')], ungefaehr).schnitt === 0,
  'V1a: vor 5 Uhr liegt ein Kopfschmerz sicher vor einer Einnahme „morgens“, ab 11 Uhr sicher danach');
}
{
  // Der laufende Morgen zählt für „Kopf am Morgen“ noch nicht: Um 6:40 sind
  // Schiene und Schlaf beantwortet, ein Kopfschmerz „Schon beim Aufwachen da“
  // kann noch kommen. Bis dahin wäre die Nacht eine 0 – eine Lücke als „kein
  // Kopf“. Der Kiefer am Morgen ist eine Antwort und zählt sofort.
  const heute = tagN(200);
  const gestern = tagN(199);
  const tage = { [gestern]: { schiene: 1, schlaf: 1 }, [heute]: { schiene: 1, schlaf: 1, kiefer: 2 } };
  const s = spannungAuswertung({ eintraege: [], tage, heute, jetzt: Date.parse(`${heute}T06:40:00Z`) });
  check(!s.v1.v1a.mit.isos.includes(heute) && s.v1.v1a.mit.isos.includes(gestern),
    `V1a: die Nacht von heute zählt erst morgen, die von gestern schon (${s.v1.v1a.mit.isos.join(', ')})`);
  check(s.v1.v1b.mit.isos.includes(heute) && s.v1.getragen === 2,
    'V1b: der Kiefer von heute Morgen zählt sofort, und gezählt wird die Nacht bei „getragen“ auch');
}
{
  // R9: zu wenige Nächte ohne Schiene – die bisherigen Zahlen und der Satz,
  // dass das so in Ordnung ist. Zeichengleich, damit kein Zielteil anhängt.
  const eintraege = [];
  const tage = {};
  verteilt(23, 0, 3).forEach((i, k) => {
    tage[tagN(i)] = { schiene: k < 20 ? 1 : 0 };
    eintraege.push(stuhl(tagN(i)));
  });
  const v1 = auswerten(eintraege, tage).v1;
  const satz = 'Mit Schiene 20 Nächte, ohne 3. Wer die Schiene regelmäßig trägt, hat keinen Vergleich – und das '
    + 'ist so in Ordnung.';
  check(v1.saetze[0] === satz && !X_VON_Y.test(v1.saetze[0]) && !ZIELZAHL.test(v1.saetze[0]),
    `R9: zu wenige Nächte ohne Schiene – nur die bisherigen Zahlen (${v1.saetze[0]})`);
}

{
  // R6 bei V1: ohne Schiene nur in den Nächten aufs Wochenende.
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 70; i++) {
    const d = tagN(i);
    const we = [5, 6].includes(i % 7);
    tage[d] = { schiene: we ? 0 : 1, kiefer: we ? 3 : 1 };
    eintraege.push(stuhl(d));
  }
  const v1b = auswerten(eintraege, tage).v1.v1b;
  check(v1b.genug && v1b.stoerung === 'wochentag' && v1b.art === 'gestoert'
    && v1b.saetze[0].startsWith('Die Tage ohne Schiene liegen meist anders in der Woche'),
  `V1, R6: Nächte ohne Schiene nur am Wochenende – kein Urteil, nur Zahlen (${v1b.art})`);
}

/* ---------- 2. V2: Verspannung und Kopfschmerz am nächsten Tag ---------- */

{
  const eintraege = [];
  const tage = {};
  verteilt(40, 0, 3).forEach((i, k) => {
    const d = tagN(i);
    const morgen = tagN(i + 1);
    tage[d] = { verspannt: [0, 1, 3, 4, 2][k % 5], stress: 1 };
    eintraege.push(stuhl(d), stuhl(morgen));
    if (k % 4 === 0) eintraege.push(kopf(d, '14:00'));
    if (k % 2 === 0) eintraege.push(kopf(morgen, '15:00'));
  });
  const v2 = auswerten(eintraege, tage).v2;
  check(v2.kopfAmTag === 8 && v2.mit.n + v2.ohne.n === 24,
    `V2: ein Tag, an dem schon Kopfschmerz war, zählt nicht (${v2.kopfAmTag} ausgeschlossen, ${v2.mit.n + v2.ohne.n} gezählt); „mittel“ auf keiner Seite`);
  check(v2.vorbote === 'Nackenschmerz kann auch ein Vorbote sein; ob Verspannung den Kopfschmerz macht oder '
    + 'ankündigt, kann ein Tagebuch nicht trennen.', 'V2 mit dem Pflichtsatz zum Vorboten');
}
{
  // Ein Kopfschmerz vom Vorabend, der in den verspannten Tag hineinreicht
  // (ab 18 Uhr oder „1 bis 3 Tage“), schließt ihn aus wie einer am Tag selbst –
  // die Verspannung kann dann vom Anfall kommen.
  const bau = (hinein) => {
    const eintraege = [];
    const tage = {};
    verteilt(20, 1, 4).forEach((i, k) => {
      const d = tagN(i);
      tage[d] = { verspannt: 4 };
      eintraege.push(stuhl(d), stuhl(tagN(i + 1)), kopf(tagN(i + 1), '09:00'));
      if (hinein) eintraege.push(kopf(tagN(i - 1), k % 2 ? '20:30' : '10:00', k % 2 ? {} : { dauer: 'lang' }));
    });
    return auswerten(eintraege, tage).v2;
  };
  const ohne = bau(false);
  const mit = bau(true);
  check(ohne.mit.n === 20 && ohne.kopfAmTag === 0, `V2: ohne Kopfschmerz am Vorabend zählen alle 20 verspannten Tage (${ohne.mit.n})`);
  check(mit.mit.n === 0 && mit.kopfAmTag === 20,
    `V2: ein hineinreichender Kopfschmerz vom Vorabend schließt den verspannten Tag aus (${mit.mit.n} gezählt, ${mit.kopfAmTag} ausgeschlossen)`);
}
{
  // R6b: 16 stark verspannte Tage am Stück, lockere über das ganze Tagebuch
  // verteilt. Geprüft wird die kleinere Seite – hier die verspannte –, und
  // der Satz nennt genau sie mit ihrer Zahl von Blöcken.
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 151; i++) {
    const d = tagN(i);
    eintraege.push(stuhl(d));
    if (i >= 60 && i < 76) tage[d] = { verspannt: 4 };
    else if (i % 3 === 0) tage[d] = { verspannt: 0 };
  }
  const v2 = auswerten(eintraege, tage).v2;
  check(v2.genug && v2.stoerung === 'bloecke' && v2.blockSeite === 'mit' && v2.mit.n === 16
    && v2.saetze.includes('Die stark verspannten Tage liegen fast alle in einem zusammenhängenden Zeitraum – was '
      + 'dort sonst anders war, misst der Vergleich mit.'),
  `V2, R6b: die verspannten Tage am Stück – der Satz nennt sie, nicht die lockeren (${v2.saetze.join(' ')})`);
}
function v2Tagebuch(saat, p = [0.15, 0.6]) {
  const r = mulberry32(saat * 31 + 9);
  const eintraege = [];
  const tage = {};
  for (let k = 0; k < 60; k++) {
    const i = k * 3;
    const d = tagN(i);
    const morgen = tagN(i + 1);
    const stark = r() < 0.5;
    tage[d] = { verspannt: stark ? 3 + Math.floor(r() * 2) : Math.floor(r() * 2), stress: Math.floor(r() * 5) };
    eintraege.push(stuhl(d), stuhl(morgen));
    if (r() < (stark ? p[1] : p[0])) eintraege.push(kopf(morgen, `${9 + Math.floor(r() * 9)}:10`));
  }
  return { eintraege, tage };
}
{
  let gefunden = 0;
  let falsch = 0;
  for (let saat = 1; saat <= 100; saat++) {
    const t = v2Tagebuch(saat);
    if (auswerten(t.eintraege, t.tage).v2.art === 'auffaellig') gefunden += 1;
    const n = v2Tagebuch(saat, [0.3, 0.3]);
    if (['auffaellig', 'unauffaellig'].includes(auswerten(n.eintraege, n.tage).v2.art)) falsch += 1;
  }
  check(gefunden >= 75, `V2: 15 gegen 60 Prozent bei etwa 30/30 Fällen in ${gefunden} von 100 Tagebüchern gefunden (mindestens 75)`);
  check(falsch <= 6, `V2 ohne Unterschied: in ${falsch} von 100 Tagebüchern ein Urteil (höchstens 6)`);
}

/* ---------- 3. V3: der Filter liest den Vortag ---------- */

{
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 90; i++) {
    const d = tagN(i);
    // Verspannt an ungeraden Tagen. Gewärmt wird an jedem sechsten Tag – einem
    // geraden: Der Tag selbst ist dann locker, der Vortag verspannt.
    tage[d] = { verspannt: i % 2 === 1 ? 3 : 0 };
    eintraege.push(stuhl(d));
    if (i % 6 === 0) eintraege.push(aktiv(d, '18:00', 'waerme'));
  }
  const z = aktivitaetBilanz(eintraege, tage, {
    jetzt: JETZT, tagFilter: v3Filter(tage), nurIds: V3_IDS,
  }).find((x) => x.id === 'waerme');
  const vortagVerspannt = (iso) => (tage[isoPlus(iso, -1)] || {}).verspannt >= 2;
  check(z.kopf.tage.mit.length > 0 && z.kopf.tage.mit.every(vortagVerspannt),
    `V3: gezählt wird Wärme nur nach einem mindestens mittel verspannten Vortag (${z.kopf.tage.mit.length} Tage)`);
  check(z.kopf.tage.ohne.length > 0 && z.kopf.tage.ohne.every(vortagVerspannt),
    'V3: ebenso die Vergleichstage – der Filter gilt auf beiden Seiten');
  const alle = aktivitaetBilanz(eintraege, tage, { jetzt: JETZT });
  check(alle.every((x) => !('tage' in x.kopf)) && alle.some((x) => x.id === 'waerme'),
    'ohne Optionen bleibt aktivitaetBilanz, wie sie war (keine Tagesliste im Ergebnis)');
  const nur = aktivitaetBilanz([...eintraege, aktiv(tagN(5), '10:00', 'gym')], tage, { jetzt: JETZT, nurIds: ['waerme'] });
  check(nur.length === 1 && nur[0].id === 'waerme', 'nurIds: nur die genannten Aktivitäten bekommen eine Zeile');
}

/* ---------- 4. V4, V5 und was nur gezählt wird ---------- */

{
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 120; i++) {
    const d = tagN(i);
    eintraege.push(stuhl(d));
    if (i % 4 === 0) eintraege.push(kopf(d, '14:00'));
    if (i >= 60 && i % 3 === 0) eintraege.push(aktiv(d, '19:00', 'massage'));
    tage[d] = {
      nachtwach: i % 2, kiefer: i % 2 ? 3 : 1, verspannt: i % 4 === 0 ? 3 : 1, gepresst: i % 5 === 0 ? 1 : 0,
    };
  }
  eintraege.push(kopf(tagN(12), '09:00', { kopfArten: ['kauen', 'schlaefe'] }));
  const s = spannungAuswertung({ eintraege, tage, heute: tagN(119), jetzt: JETZT });
  const v4 = s.v4.find((x) => x.id === 'massage');
  check(v4 && v4.vorher.notiert === 60 && v4.seitdem.notiert === 60 && !('art' in v4) && !('urteil' in v4),
    'V4: Kopfschmerztage vor und seit dem ersten Eintrag – gleich lange Zeit, nur beschrieben, ohne Urteil');
  check(v4.satz.includes('Ob vorher schon massiert wurde, weiß Body Check nicht'), 'V4 mit dem Satz, dass vorher unbekannt ist');
  check(s.v5.genug && s.v5.mit.schnitt === 3 && s.v5.ohne.schnitt === 1 && !('art' in s.v5),
    'V5: Kiefer nach Nächten mit und ohne „Nachts davon wach“ – nur beschrieben');
  const wenig = {};
  Object.entries(tage).slice(0, 15).forEach(([d, t]) => { wenig[d] = t; });
  const s2 = spannungAuswertung({ eintraege, tage: wenig, heute: tagN(119), jetzt: JETZT });
  check(!s2.v5.genug && s2.v5.mit.schnitt === null, 'V5 erst ab acht Nächten je Seite – darunter ohne Mittelwert');
  const g = s.gleichzeitig;
  check(g.nacken.an.schnitt === 3 && g.nacken.sonst.schnitt === 1 && g.gepresst.ja === 24 && g.gepresst.n === 120
    && g.merkmale.kauen === 1 && g.merkmale.schlaefe === 1,
  'R7: was am selben Tag zusammen vorkommt, steht nur als Zahl');
}
{
  // R7, „sonst“: nur Tage, die für den Kopf notiert sind. Ein Tag, an dem nur
  // „Nacken/Schultern“ beantwortet ist, ist für den Kopf eine Lücke (R1) –
  // kein Tag ohne Kopfschmerz.
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 30; i++) {
    const d = tagN(i);
    if (i < 10) {
      tage[d] = { verspannt: 3 };
      eintraege.push(kopf(d, '14:00'));
    } else if (i < 20) {
      tage[d] = { verspannt: 1 };
    } else {
      tage[d] = { verspannt: 2, ...(i % 2 ? { stimmung: 1 } : {}) };
      if (i % 2 === 0) eintraege.push(stuhl(d));
    }
  }
  const g = auswerten(eintraege, tage).gleichzeitig.nacken;
  check(g.an.n === 10 && g.sonst.n === 10 && g.sonst.schnitt === 2,
    `R7: Tage nur mit „Nacken/Schultern“ zählen nicht zu „sonst“, mit Stuhlgang oder einer anderen Tagesfrage schon (sonst ${g.sonst.n} Tage, im Mittel ${g.sonst.schnitt})`);
}

/* ---------- 5. Kein Satz rät, keiner nennt ein Ziel ---------- */

{
  const texte = [];
  const geh = (v) => {
    if (typeof v === 'string') texte.push(v);
    else if (Array.isArray(v)) v.forEach(geh);
    else if (v && typeof v === 'object') Object.values(v).forEach(geh);
  };
  for (let saat = 1; saat <= 5; saat++) {
    const t = v2Tagebuch(saat);
    Object.keys(t.tage).forEach((d, k) => { t.tage[d].schiene = k % 7 ? 1 : 0; });
    geh(auswerten(t.eintraege, t.tage));
  }
  check(texte.some((t) => t.includes('Wer die Schiene regelmäßig trägt, hat keinen Vergleich – und das ist so in Ordnung.')),
    'R9: zu wenige Nächte ohne Schiene – der Satz, dass das so in Ordnung ist');
  const rat = texte.filter((t) => RAT.test(t));
  const ziel = texte.filter((t) => ZIELZAHL.test(t));
  check(rat.length === 0 && ziel.length === 0, `kein Satz empfiehlt etwas oder nennt eine Zielzahl${[...rat, ...ziel][0] ? `: ${[...rat, ...ziel][0]}` : ''}`);
}

/* ---------- 6. Herüberreichend, Kopfmerkmale, Zyklusphasen ---------- */

{
  const d = tagN(10);
  check(herueberreichend([kopf(tagN(9), '18:00')], d) && !herueberreichend([kopf(tagN(9), '17:59')], d),
    'herüberreichend: ab 18 Uhr am Vortag');
  check(herueberreichend([kopf(tagN(9), '08:00', { dauer: 'lang' })], d)
    && herueberreichend([kopf(tagN(9), '08:00', { dauer: 'status' })], d)
    && !herueberreichend([kopf(tagN(9), '08:00', { dauer: 'mittel' })], d),
  'herüberreichend: oder als „1 bis 3 Tage“ bzw. „länger als 3 Tage“ eingetragen');
}
{
  const alt = [kopf(tagN(1), '10:00', { kopfArten: ['licht', 'pochend'] }), kopf(tagN(2), '10:00', { kopfArten: ['einseitig'] })];
  const m0 = kopfMerkmale(alt, tagN(0), tagN(30));
  check(!m0.neu && m0.zeilen.length === 0 && m0.satz === '',
    'Kopfmerkmale: ein Zeitraum nur mit Merkmalen der Fassung 27 bekommt keine neuen Zeilen');
  const neu = [...alt, kopf(tagN(3), '10:00', { kopfArten: ['lichtscheu', 'laermscheu', 'beidseitig'] }),
    kopf(tagN(4), '10:00', { kopfArten: ['lichtscheu', 'kopfuebel', 'aufwachen'] })];
  const m1 = kopfMerkmale(neu, tagN(0), tagN(30));
  const z = Object.fromEntries(m1.zeilen.map((x) => [x.id, x.anzahl]));
  check(m1.neu && z.lichtlaerm === 1 && z.lichtoderlaerm === 1 && z.licht === 1 && z.beidseitig === 1
    && z.einseitig === 1 && z.uebel === 1 && z.aufwachen === 1,
  'Kopfmerkmale: Licht und Lärm zusammen, nur eins, das alte „Licht oder Lärm“ getrennt');
  check(m1.satz.includes('Einordnung nimmt die Ärztin vor') && !/migräne|spannungskopfschmerz/i.test(JSON.stringify(m1)),
    'Kopfmerkmale: gezählt, nicht eingeordnet');
}
{
  const tage = {};
  // Vier Zyklen à 28 Tage, Periode an den ersten fünf Tagen.
  for (let z = 0; z < 4; z++) for (let k = 0; k < 5; k++) tage[tagN(z * 28 + k)] = { blutung: 2 };
  for (let i = 0; i < 112; i++) tage[tagN(i)] = { ...(tage[tagN(i)] || {}), stimmung: i % 28 < 5 ? 3 : 1 };
  const f = phasenFrage(tage, 'stimmung');
  check(f.genug && f.phasen.length === 4 && f.phasen.every((p) => p.tage >= 8) && f.abstand === 2 && Number.isFinite(f.se),
    `Zyklus: Stimmung je Phase ab acht Tagen je Phase, mit dem Abstand der höchsten zur niedrigsten (${f.abstand})`);
  const kurz = {};
  Object.keys(tage).slice(0, 40).forEach((d) => { kurz[d] = tage[d]; });
  check(!phasenFrage(kurz, 'stimmung').genug, 'Zyklus: mit zu wenigen Tagen je Phase kein Vergleich');
}

ende();
