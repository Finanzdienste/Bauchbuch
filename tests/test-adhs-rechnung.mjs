/*
 * Die Rechnungen der Familie „ADHS" (js/adhs.js) und ihre Bausteine
 * (js/vergleich.js) – Fall für Fall und über viele erzeugte Tagebücher.
 *
 * Geprüft wird vor allem, was NICHT zählen darf, denn darin steckt jede
 * Täuschung, die so eine Rechnung erzeugen kann:
 *
 *   * „ohne Essen" aus einer fehlenden Mahlzeit (R2),
 *   * eine Angabe, die erst nach dem Ergebnis kam (R10),
 *   * ein Tag, der nur durch das notiert wäre, was im Fenster steht – die
 *     Beschwerde oder die Mahlzeit, die bei „mit Essen" die Seite bestimmt
 *     (R10) –, auch über ein Nulltagebuch, in dem nur Späteres notiert,
 *   * eine Beschwerde, die schon vor der Einnahme da war,
 *   * eine Reihenfolge, die niemand kennt (R3), und ungefähre Einnahmen,
 *   * die zweite Einnahme eines Tages, und in A3 Tage mit einer anderen
 *     Gabenzahl (R8),
 *   * ein Tag ohne Mittel „wegen Beschwerden",
 *   * eine nachgetragene Form, die wie ein Wechsel des Mittels aussähe,
 *   * Seiten, die verschieden in der Woche, in Blöcken oder verschieden dicht
 *     eingetragen sind (R6 auch an seiner Grenze, R6b, R6c),
 *   * eine Zielzahl auf der Seite „ohne" (R9), in jeder Reihenfolge.
 *
 * Und dass ein eingebauter Unterschied gefunden wird: im Bauch +2,5 Stufen
 * nach Einnahmen ohne Essen (12 gegen 30), beim Kopf 15 gegen 60 Prozent an
 * Tagen ohne und mit Mittel (30 gegen 30) – jeweils in mindestens 75 von 100
 * Tagebüchern.
 *
 * Die Module kommen aus BAUCHBUCH_ROOT, damit sich eine veränderte Kopie der
 * App prüfen lässt (Mutationsproben).
 */
import { pruefer } from './umgebung.mjs';
import { appModul } from './adhs-daten.mjs';
import { isoPlus, mulberry32 } from './rechnungen.mjs';

const { check, ende } = pruefer();
const adhs = await appModul('adhs.js');
const vgl = await appModul('vergleich.js');
const { zeitBild, FENSTER } = await appModul('zeitprofil.js');
const { bewerteteMahlzeiten } = await appModul('auswertung.js');
const {
  adhsAuswertung, adhsEinnahmen, essenZurEinnahme, ausloeserNahAmMittel, zeitprofilNahAmMittel, WEGLASS_SATZ,
  adhsAbschnitt,
} = adhs;

/* ---------- Bausteine für kleine Tagebücher ---------- */

const START = '2026-01-05'; // ein Montag
const tagN = (i) => isoPlus(START, i);
let nr = 0;
const nid = (p) => `${p}${(nr += 1)}`;
const MITTEL = 'Elvanse';
const mittel = (iso, um, extra = {}) => ({
  id: nid('m'), art: 'medikament', am: iso, um, mittel: MITTEL, dosis: '30 mg', ...extra,
});
const essen = (iso, um, extra = {}) => ({
  id: nid('e'), art: 'essen', am: iso, um, was: 'Essen', zutaten: [], portion: 'normal', ...extra,
});
const beschwerde = (iso, um, staerke, extra = {}) => ({
  id: nid('b'), art: 'beschwerde', am: iso, um, staerke, arten: ['druck'], ...extra,
});
const kopf = (iso, um, extra = {}) => ({ id: nid('k'), art: 'kopf', am: iso, um, staerke: 5, kopfArten: [], ...extra });
const stuhl = (iso, um = '06:30') => ({ id: nid('s'), art: 'stuhl', am: iso, um, form: 4 });
const msAm = (iso, um) => Date.parse(`${iso}T${um}:00Z`);
const angabe = (iso, um, art, nachMin = 5) => ({ essen: art, essenGesetzt: msAm(iso, um) + nachMin * 60000 });
const ENDE = '2026-12-31';
const jetztSpaet = Date.parse('2027-01-01T12:00:00Z');
const auswerten = (eintraege, tage = {}, extra = {}) => adhsAuswertung({
  eintraege, tage, heute: ENDE, jetzt: jetztSpaet, mindestFaelle: 5, ...extra,
});
/*
 * R9: eine Zielzahl in jeder Reihenfolge – „braucht 8“, „noch 5“, „nötig: 12“,
 * „es fehlen 2“, „mindestens 8“, „5 nötig“. Dazu in den Sätzen der Seite
 * „ohne“ jedes „x von y“ („3 von 5 nötigen“); anderswo ist „10 von 30
 * Mahlzeiten“ eine erlaubte Zählung.
 */
const ZIELZAHL = /(braucht|nötig|noch|fehl\w*|mindestens)\W{0,3}\d|\d+\W{0,3}(nötig|fehl)/i;
const X_VON_Y = /\d+ von \d+/;
const RAT =/\b(nimm|nehmen Sie|empfehlen|empfohlen|du solltest|hilft gegen)\b/i;
const alleSaetze = (x) => {
  const raus = [];
  const geh = (v) => {
    if (typeof v === 'string') raus.push(v);
    else if (Array.isArray(v)) v.forEach(geh);
    else if (v && typeof v === 'object') Object.values(v).forEach(geh);
  };
  geh(x);
  return raus.filter((t) => t.includes(' '));
};

/* ---------- 1. Essen zur Einnahme (R2, R10) ---------- */

{
  const d = tagN(0);
  const ein = (e, liste) => adhsEinnahmen([...liste, e]).find((x) => x.e.id === e.id);
  const m0 = mittel(d, '07:30');
  check(essenZurEinnahme([m0], ein(m0, [])).art === null,
    'ohne Mahlzeit und ohne Angabe ist eine Einnahme nicht „ohne Essen“ – ein fehlendes Frühstück ist kein leerer Magen');
  const m1 = mittel(d, '07:30', angabe(d, '07:30', 'ohne'));
  check(essenZurEinnahme([m1], ein(m1, [])).art === 'ohne', '„ohne Essen“ angetippt und keine Mahlzeit in der Nähe: ohne');
  const f1 = essen(d, '08:00');
  check(essenZurEinnahme([m1, f1], ein(m1, [f1])).art === 'widerspruch',
    '„ohne Essen“, aber eine Mahlzeit eine halbe Stunde danach: Widerspruch, nicht gewertet');
  const m2 = mittel(d, '07:30', angabe(d, '07:30', 'ohne', 90));
  check(essenZurEinnahme([m2], ein(m2, [])).art === 'spaet',
    'eine Angabe anderthalb Stunden nach der Einnahme zählt nicht (R10)');
  const m3 = mittel(d, '07:30', angabe(d, '07:30', 'ohne', 60));
  check(essenZurEinnahme([m3], ein(m3, [])).art === 'ohne', 'genau eine Stunde danach gilt sie noch');
  const f2 = essen(d, '07:00');
  check(essenZurEinnahme([m0, f2], ein(m0, [f2])).art === 'mit', 'Mahlzeit eine halbe Stunde davor: mit Essen');
  const f3 = essen(d, '08:10');
  check(essenZurEinnahme([m0, f3], ein(m0, [f3])).art === 'vor', 'Mahlzeit 40 Minuten danach: kurz vor dem Essen');
  const f4 = essen(d, '08:00', { ungefaehr: true, tageszeit: 'morgens' });
  check(essenZurEinnahme([m0, f4], ein(m0, [f4])).art === 'unklar',
    'nur eine Mahlzeit „morgens“ ohne Uhrzeit: unklar, nicht gewertet');
}

/* ---------- 2. A1: welche Fälle zählen ---------- */

/*
 * Vierzig gewöhnliche Tage – zwanzig mit, zwanzig ohne Essen, jeder vierte
 * Tag (dichter beieinander wären sie für R6b ein einziger Block) –, dazu je
 * ein Tag für jede Regel. Jeder gewöhnliche Tag ist durch ein Mittagessen
 * außerhalb des Fensters notiert; eine Beschwerde um 9 Uhr liegt im Fenster.
 */
function a1Grund() {
  const liste = [];
  for (let k = 0; k < 40; k++) {
    const i = 2 * k + 1;
    const d = tagN(i);
    const ohne = k % 2 === 0;
    liste.push(mittel(d, '07:30', ohne ? angabe(d, '07:30', 'ohne') : {}));
    if (!ohne) liste.push(essen(d, '07:10'));
    else liste.push(essen(d, '10:30'));
    liste.push(essen(d, '12:30'));
    if (k % 3 === 0) liste.push(beschwerde(d, '09:00', 3));
  }
  return liste;
}
const grund = auswerten(a1Grund());
const g1 = grund.a1.haupt.vergleich;
check(g1.mit.n === 20 && g1.ohne.n === 20, `vierzig gewöhnliche Tage: 20 mit, 20 ohne Essen (${g1.mit.n}/${g1.ohne.n})`);

function mitTag(extra) {
  const i = 50;
  const d = tagN(i); // ein Tag ohne gewöhnlichen Fall
  return { d, liste: [...a1Grund(), ...extra(d)] };
}
const zaehl = (liste) => auswerten(liste).a1.haupt;

{
  const { liste } = mitTag((d) => [mittel(d, '07:30'), essen(d, '12:30'), beschwerde(d, '09:00', 8)]);
  const h = zaehl(liste);
  check(h.vergleich.ohne.n === 20 && h.zaehl.ohneAngabe === 1,
    'R2: eine Einnahme ohne Mahlzeit und ohne Angabe landet nicht bei „ohne Essen“, sondern bei „ohne Angabe“');
}
{
  const { liste } = mitTag((d) => [beschwerde(d, '06:30', 6), mittel(d, '07:30', angabe(d, '07:30', 'ohne')),
    essen(d, '12:30')]);
  const h = zaehl(liste);
  check(h.vergleich.ohne.n === 20 && h.zaehl.davor === 1, 'eine Beschwerde in den zwei Stunden davor: der Fall zählt nicht');
}
{
  const { liste } = mitTag((d) => [mittel(d, '08:00', { ungefaehr: true, tageszeit: 'morgens', ...angabe(d, '08:00', 'ohne') }),
    essen(d, '12:30'), beschwerde(d, '09:30', 7)]);
  const h = zaehl(liste);
  check(h.vergleich.ohne.n === 20 && h.zaehl.nichtZuzuordnen === 1,
    'R3: eine Einnahme nur mit „morgens“ ist nicht zuzuordnen und wird gezählt, nicht gewertet');
}
{
  const { liste } = mitTag((d) => [mittel(d, '07:30', angabe(d, '07:30', 'ohne')), essen(d, '12:30'),
    beschwerde(d, '08:00', 7, { ungefaehr: true, tageszeit: 'morgens' })]);
  const h = zaehl(liste);
  check(h.vergleich.ohne.n === 20 && h.zaehl.offen === 1,
    'R3: eine Beschwerde „morgens“ ohne Bezug neben einer Einnahme am Morgen – Reihenfolge offen, der Fall fällt weg');
}
{
  // Ohne Mahlzeit um die zweite Einnahme: Als eigener Fall wäre sie ein
  // gültiges „ohne Essen“ mit einer Beschwerde danach – die Prüfung merkt es.
  const { liste } = mitTag((d) => [essen(d, '07:10'), mittel(d, '07:30'),
    mittel(d, '13:00', angabe(d, '13:00', 'ohne')), beschwerde(d, '14:00', 9)]);
  const h = zaehl(liste);
  check(h.vergleich.mit.n === 21 && h.vergleich.ohne.n === 20 && h.zaehl.widerspruch === 0,
    `die zweite Einnahme eines Tages ist kein eigener Fall (${h.vergleich.mit.n}/${h.vergleich.ohne.n}, Widerspruch ${h.zaehl.widerspruch})`);
}
{
  const { liste } = mitTag((d) => [mittel(d, '07:30', angabe(d, '07:30', 'ohne', 90)), essen(d, '12:30'),
    beschwerde(d, '08:30', 8)]);
  const h = zaehl(liste);
  check(h.vergleich.ohne.n === 20 && h.zaehl.spaet === 1,
    'R10: „ohne Essen“ erst anderthalb Stunden nach der Einnahme angegeben – gezählt als „später angegeben“, nicht gewertet');
}
{
  const { liste } = mitTag((d) => [mittel(d, '07:30', angabe(d, '07:30', 'ohne')), beschwerde(d, '09:00', 8)]);
  const h = zaehl(liste);
  check(h.vergleich.ohne.n === 20 && h.zaehl.nichtNotiert === 1,
    'R10: ein Tag, den nur die Beschwerde im Fenster notiert machte, zählt nicht – sonst stünde er nur da, wenn es wehtat');
  const { liste: l2 } = mitTag((d) => [mittel(d, '07:30', angabe(d, '07:30', 'ohne')), beschwerde(d, '09:00', 8),
    beschwerde(d, '20:00', 2)]);
  check(zaehl(l2).vergleich.ohne.n === 21, 'eine Beschwerde außerhalb des Fensters macht den Tag dagegen notiert');
}
{
  // R10 auf beiden Seiten gleich: Bei „mit Essen“ liegt die Mahlzeit, die die
  // Seite bestimmt, selbst im Fenster. Machte sie den Tag notiert, stünde
  // jeder ruhige Morgen mit Essen in der Rechnung, ein ruhiger ohne Essen nur,
  // wenn später noch etwas kommt.
  const { liste } = mitTag((d) => [essen(d, '07:10'), mittel(d, '07:30')]);
  const h = zaehl(liste);
  check(h.vergleich.mit.n === 20 && h.zaehl.nichtNotiert === 1,
    `R10: ein Tag mit Einnahme und Frühstück, sonst nichts, ist nicht notiert – wie ein Tag ohne Essen und sonst nichts (mit ${h.vergleich.mit.n}, nicht notiert ${h.zaehl.nichtNotiert})`);
  const { liste: l2 } = mitTag((d) => [mittel(d, '07:30', angabe(d, '07:30', 'ohne')), essen(d, '10:45')]);
  const h2 = zaehl(l2);
  check(h2.vergleich.ohne.n === 20 && h2.zaehl.nichtNotiert === 1,
    `R10: auch eine Mahlzeit später im Fenster macht einen Tag ohne Essen nicht notiert (ohne ${h2.vergleich.ohne.n})`);
  const { liste: l3 } = mitTag((d) => [essen(d, '07:10'), mittel(d, '07:30'), essen(d, '12:30')]);
  check(zaehl(l3).vergleich.mit.n === 21, 'ein Mittagessen nach dem Fenster macht den Tag mit Essen notiert');
  const { liste: l4, d: d4 } = mitTag((d) => [essen(d, '07:10'), mittel(d, '07:30')]);
  check(auswerten(l4, { [d4]: { stimmung: 1 } }).a1.haupt.vergleich.mit.n === 21,
    'eine beantwortete Tagesfrage ebenso');
}
{
  // Vier Tage, sonst nichts: ein ruhiger und ein schlechter Morgen mit Essen,
  // dasselbe ohne. Am schlechten Morgen kommt am Nachmittag noch eine
  // Beschwerde. Beide Seiten werden gleich behandelt – je der schlechte Tag.
  const l = [];
  [0, 3, 6, 9].forEach((i, k) => {
    const d = tagN(150 + i);
    const ohne = k >= 2;
    l.push(mittel(d, '07:30', ohne ? angabe(d, '07:30', 'ohne') : {}));
    if (!ohne) l.push(essen(d, '07:10'));
    if (k % 2 === 1) l.push(beschwerde(d, '09:00', 7), beschwerde(d, '16:00', 3));
  });
  const v = auswerten(l).a1.haupt;
  check(v.vergleich.mit.n === 1 && v.vergleich.ohne.n === 1 && v.vergleich.mit.schnitt === 7
    && v.vergleich.ohne.schnitt === 7 && v.zaehl.nichtNotiert === 2,
  `vier Tage, nur das Essen verschieden: beide Seiten gleich (mit ${v.vergleich.mit.n} × ${v.vergleich.mit.schnitt}, ohne ${v.vergleich.ohne.n} × ${v.vergleich.ohne.schnitt}, nicht notiert ${v.zaehl.nichtNotiert})`);
}
{
  const { liste } = mitTag((d) => {
    const f = essen(d, '07:00');
    return [f, essen(d, '12:30'),
      mittel(d, '07:10', { ungefaehr: true, tageszeit: 'morgens', bezug: 'beim', bezugMahlzeit: f.id }),
      beschwerde(d, '07:30', 6, { ungefaehr: true, tageszeit: 'morgens', bezug: 'nach', bezugMahlzeit: f.id })];
  });
  const h = zaehl(liste);
  check(h.vergleich.mit.n === 21 && h.zaehl.offen === 0,
    'beide an dieselbe Mahlzeit gebunden („beim“ und „nach dem Essen“): die Reihenfolge steht fest, der Fall zählt');
  const { liste: l2 } = mitTag((d) => {
    const f = essen(d, '07:00');
    return [f, essen(d, '12:30'),
      mittel(d, '07:10', { ungefaehr: true, tageszeit: 'morgens', bezug: 'beim', bezugMahlzeit: f.id }),
      beschwerde(d, '06:30', 6, { ungefaehr: true, tageszeit: 'morgens', bezug: 'vor', bezugMahlzeit: f.id })];
  });
  check(zaehl(l2).zaehl.davor === 1, '„vor dem Essen“ an derselben Mahlzeit liegt vor der Einnahme „beim Essen“');
}

/* ---------- 3. A1 findet einen eingebauten Unterschied ---------- */

/*
 * 42 Falltage über 120 Tage verstreut, 12 ohne und 30 mit Essen. Nach
 * Einnahmen ohne Essen liegt der stärkste Wert im Fenster im Mittel 2,5
 * Stufen höher.
 */
function a1Tagebuch(saat, effekt = 2.5) {
  const r = mulberry32(saat * 7 + 3);
  const tage = Array.from({ length: 120 }, (_, i) => i).sort(() => r() - 0.5).slice(0, 42).sort((a, b) => a - b);
  const ohne = new Set(tage.slice().sort(() => r() - 0.5).slice(0, 12));
  const liste = [];
  tage.forEach((i) => {
    const d = tagN(i);
    const ist = ohne.has(i);
    liste.push(mittel(d, '07:30', ist ? angabe(d, '07:30', 'ohne') : {}));
    liste.push(ist ? essen(d, '11:00') : essen(d, '07:15'));
    liste.push(essen(d, '12:45'));
    let basis = r() < 0.45 ? 1 + Math.floor(r() * 5) : 0;
    if (ist && effekt) basis = Math.min(10, basis + (r() < 0.5 ? Math.floor(effekt) : Math.ceil(effekt)));
    if (basis) liste.push(beschwerde(d, `${String(8 + Math.floor(r() * 3)).padStart(2, '0')}:15`, basis));
  });
  return liste;
}
{
  let gefunden = 0;
  let falsch = 0;
  for (let saat = 1; saat <= 100; saat++) {
    const v = auswerten(a1Tagebuch(saat)).a1.haupt.vergleich;
    if (['auffaellig', 'moeglich'].includes(v.art)) gefunden += 1;
    const n = auswerten(a1Tagebuch(saat, 0)).a1.haupt.vergleich;
    if (['auffaellig', 'moeglich', 'unauffaellig'].includes(n.art)) falsch += 1;
  }
  check(gefunden >= 75, `A1: +2,5 Stufen bei 12 gegen 30 Fällen in ${gefunden} von 100 Tagebüchern gefunden (mindestens 75)`);
  check(falsch <= 6, `A1 ohne Unterschied: in ${falsch} von 100 Tagebüchern ein Urteil (höchstens 6)`);
}

/*
 * Ein Nulltagebuch, in dem nur das Spätere den Tag notiert: Der Bauch hängt
 * nicht am Essen zur Einnahme, aber eine Beschwerde am Nachmittag hängt am
 * Morgen (nach einem schlechten Morgen zu 70 Prozent, sonst zu 10). Keine
 * Tagesfragen; Mittag- und Abendessen stehen je an jedem fünften Tag. Zählte
 * bei „mit Essen“ das Frühstück im Fenster als notiert, stünde jeder Morgen
 * mit Essen in der Rechnung, einer ohne Essen aber eher, wenn er schlecht war
 * – und „ohne Essen“ sähe schlechter aus, ohne dass das Essen etwas getan hat.
 */
function a1NullTagebuch(saat) {
  const r = mulberry32(saat * 7919 + 11);
  const zahl = (von, bis) => von + Math.floor(r() * (bis - von + 1));
  const uhr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const liste = [];
  for (let i = 0; i < 120; i++) {
    const d = tagN(i);
    const t1 = zahl(390, 510);
    const ohne = r() < 0.3;
    liste.push(mittel(d, uhr(t1), ohne ? angabe(d, uhr(t1), 'ohne') : {}));
    if (!ohne) liste.push(essen(d, uhr(t1 + zahl(-20, 10))));
    if (r() < 0.2) liste.push(essen(d, uhr(zahl(765, 810))));
    if (r() < 0.2) liste.push(essen(d, uhr(zahl(1080, 1200))));
    const schlecht = r() < 0.35;
    if (schlecht) liste.push(beschwerde(d, uhr(t1 + zahl(30, 200)), zahl(2, 7)));
    if (r() < (schlecht ? 0.7 : 0.1)) liste.push(beschwerde(d, uhr(zahl(900, 1020)), zahl(1, 4)));
  }
  return liste;
}
{
  let n = 0;
  let urteile = 0;
  let abstand = 0;
  for (let saat = 1; saat <= 200; saat++) {
    const v = auswerten(a1NullTagebuch(saat)).a1.haupt.vergleich;
    if (!v.genug) continue;
    n += 1;
    abstand += v.ohne.schnitt - v.mit.schnitt;
    if (['auffaellig', 'moeglich', 'unauffaellig'].includes(v.art)) urteile += 1;
  }
  check(n >= 150 && abstand / n < 0.25,
    `A1, R10: ohne Effekt liegen „ohne“ und „mit Essen“ im Mittel gleich, auch wenn nur das Spätere die Tage notiert (Unterschied ${(abstand / n).toFixed(2)} Stufen, unter 0,25; ${n} Tagebücher)`);
  check(urteile <= 0.06 * n, `A1, R10: ohne Effekt in ${urteile} von ${n} Tagebüchern ein Urteil (höchstens 6 Prozent)`);
}

/* ---------- 4. Der aktuelle Abschnitt ---------- */

{
  const l = [];
  for (let i = 0; i < 30; i++) l.push(mittel(tagN(i), '07:30', { mittel: 'Concerta' }));
  for (let i = 30; i < 60; i++) l.push(mittel(tagN(i), '07:30'));
  check(adhsAbschnitt(adhsEinnahmen(l), ENDE).von === tagN(30),
    'ein Wechsel des Präparats setzt den Abschnitt: gerechnet wird ab dem ersten Tag des neuen');
  const l2 = [...l];
  for (let i = 40; i < 60; i++) l2.push(mittel(tagN(i), '19:00', { mittel: 'Intuniv' }));
  check(adhsAbschnitt(adhsEinnahmen(l2), ENDE).von === tagN(30), 'ein zusätzliches Mittel setzt nicht zurück');
}
{
  // „Weiß ich nicht“ ist keine Form, sondern eine fehlende: Wird die Form
  // später angegeben – wozu der Hinweis W1u auffordert –, ist das kein
  // Wechsel. Der Abschnitt bleibt, A1 bleibt ein Mittel.
  const l = [];
  for (let i = 0; i < 60; i++) {
    const d = tagN(i);
    l.push(mittel(d, '07:30', { mittel: 'Medikinet', form: i < 45 ? 'unbekannt' : 'pellet' }),
      essen(d, '07:10'), essen(d, '12:30'));
  }
  const a = auswerten(l);
  check(a.abschnitt.von === tagN(0) && a.abschnitt.tage === 60 && a.abschnitt.schluessel.join() === 'mph:pellet'
    && a.a1.alle.length === 1 && a.a1.haupt.schluessel === 'mph:pellet' && a.a1.haupt.faelle === 60,
  `aus „Weiß ich nicht“ wird eine angegebene Form: kein Neubeginn, ein Schlüssel (ab ${a.abschnitt.von}, ${a.a1.alle.map((x) => `${x.schluessel}: ${x.faelle}`).join(', ')})`);
  const ohneForm = l.map((e) => (e.art === 'medikament' && e.form === 'unbekannt' ? { ...e, form: undefined } : e));
  check(auswerten(ohneForm).a1.alle.map((x) => x.schluessel).join() === 'mph:pellet',
    'dasselbe wie bei Einträgen ganz ohne Form');
  const wechsel = l.map((e) => (e.art === 'medikament' && e.am >= tagN(50) ? { ...e, form: 'oros' } : e));
  check(adhsAbschnitt(adhsEinnahmen(wechsel), ENDE).von === tagN(50),
    'ein Wechsel zwischen zwei angegebenen Formen (Kügelchen auf Hülle) setzt den Abschnitt weiterhin neu');
  check(auswerten([mittel(tagN(0), '07:30', { mittel: 'Medikinet', form: 'unbekannt' })]).abschnitt.schluessel.join()
    === 'mph:unbekannt', 'ist nirgends eine Form angegeben, bleibt sie „nicht angegeben“');
}
{
  // A1 rechnet je Mittel über das ganze Tagebuch: Nach einem Wechsel hat das
  // frühere Mittel die meisten Fälle – dann trägt der Befund dessen Namen.
  const l = [];
  for (let i = 0; i < 75; i++) {
    const d = tagN(i);
    const ohne = i % 3 === 0;
    l.push(mittel(d, '07:30', { mittel: 'Ritalin Adult', ...(ohne ? angabe(d, '07:30', 'ohne') : {}) }), essen(d, '12:30'));
    if (ohne) l.push(beschwerde(d, '09:00', 6)); else l.push(essen(d, '07:10'));
  }
  for (let i = 75; i < 100; i++) l.push(mittel(tagN(i), '07:30'), essen(tagN(i), '07:10'), essen(tagN(i), '12:30'));
  const a = auswerten(l);
  const h = a.a1.haupt;
  check(a.abschnitt.namen.join() === MITTEL && h.anzeige === 'Ritalin Adult' && !h.imAbschnitt && h.letzte === tagN(74)
    && a.a1.auch[0].anzeige === MITTEL && a.a1.auch[0].imAbschnitt,
  `A1 nach einem Wechsel: der Befund nennt sein Mittel und den letzten Einnahmetag (${h.anzeige}, bis ${h.letzte})`);
  const frage = a.fragen.find((f) => f.id === 'a1');
  check(['auffaellig', 'moeglich'].includes(h.vergleich.art) && frage && frage.text.startsWith('Nach Einnahmen von Ritalin Adult ohne Essen'),
    `und die Frage für die Sprechstunde auch (${frage ? frage.text.slice(0, 45) : 'keine Frage'})`);
  const m = auswerten([mittel(tagN(0), '07:30', { mittel: 'Medikinet' }), essen(tagN(0), '07:10')]).a1.haupt;
  check(m.anzeige === 'Medikinet (Form nicht angegeben)',
    `bei Methylphenidat mit der Form, wenn der Name sie nicht festlegt (${m.anzeige})`);
}

/* ---------- 5. A2: Tage mit gegen ohne Mittel ---------- */

/*
 * Ein Tagebuch aus Tagen mit und ohne Mittel. Jeder Tag ist durch Mahlzeiten,
 * Stuhlgang und Tagesfragen notiert – an Tagen „dünn" nur durch den Stuhlgang.
 * `bauch` ist die Beschwerdestärke am Nachmittag, je Seite.
 */
function a2Tagebuch({
  mit, ohne, grund = 'vergessen', bauch = [0, 0], duenn = false, kopfTage = {}, extra = [],
}) {
  const liste = [...extra];
  const tage = {};
  mit.forEach((i) => {
    const d = tagN(i);
    liste.push(mittel(d, '07:30'), essen(d, '07:10'), essen(d, '12:30'), essen(d, '19:00'), stuhl(d));
    tage[d] = { stress: 1, stimmung: 1 };
    if (bauch[1]) liste.push(beschwerde(d, '15:00', bauch[1]));
  });
  ohne.forEach((i) => {
    const d = tagN(i);
    tage[d] = { adhsPause: grund, ...(duenn ? {} : { stress: 1, stimmung: 1 }) };
    if (!duenn) liste.push(essen(d, '07:10'), essen(d, '12:30'), essen(d, '19:00'));
    liste.push(stuhl(d));
    if (bauch[0]) liste.push(beschwerde(d, '15:00', bauch[0]));
  });
  Object.entries(kopfTage).forEach(([i, um]) => liste.push(kopf(tagN(Number(i)), um)));
  return { liste, tage };
}
const werktage = (n, ab = 0) => {
  const raus = [];
  for (let i = ab; raus.length < n; i++) if (![5, 6].includes(i % 7)) raus.push(i);
  return raus;
};
const wochenenden = (n, ab = 0) => {
  const raus = [];
  for (let i = ab; raus.length < n; i++) if ([5, 6].includes(i % 7)) raus.push(i);
  return raus;
};
{
  const { liste, tage } = a2Tagebuch({ mit: werktage(30), ohne: werktage(10, 60), bauch: [0, 0] });
  for (let i = 80; i < 90; i++) tage[tagN(i)] = { adhsPause: 'beschwerden', stress: 1 };
  const a = auswerten(liste, tage);
  check(a.a2.ohneTage === 10 && a.a2.gruende.beschwerden === 10,
    `Tage „wegen Beschwerden“ zählen in keinem Vergleich (${a.a2.ohneTage} Tage ohne gewertet, ${a.a2.gruende.beschwerden} gezählt)`);
  check(a.a2.saetze.some((t) => t.includes('keine Zufallsauswahl') && t.includes('(10 solche Tage)')),
    'und der Pflichtvorbehalt nennt ihre Zahl');
  const tageMit = {};
  werktage(10, 60).forEach((i) => { tageMit[tagN(i)] = { adhsPause: 'vergessen' }; });
  const l2 = [...liste, mittel(tagN(werktage(10, 60)[0]), '09:00')];
  check(auswerten(l2, { ...tage, ...tageMit }).a2.ohneTage === 9,
    'ein Tag ohne Mittel, an dem doch ein Stimulans eingetragen ist, zählt nicht als Tag ohne');
}
{
  // R6: Die Tage ohne liegen alle am Wochenende.
  const { liste, tage } = a2Tagebuch({ mit: werktage(30), ohne: wochenenden(12), bauch: [0, 5] });
  const v = auswerten(liste, tage).a2.zeilen.bauch;
  check(v.genug && v.stoerung === 'wochentag' && v.art === 'gestoert'
    && v.satz.includes('liegen meist anders in der Woche als die mit'),
    `R6: Tage ohne nur am Wochenende – kein Urteil, nur Zahlen und der Satz dazu (${v.art}, ${v.stoerung})`);
}
{
  // R6b: Die Tage ohne liegen in einem einzigen Block (Urlaub).
  const ohne = Array.from({ length: 14 }, (_, k) => 40 + k);
  const mit = [...werktage(15), ...werktage(15, 70)];
  const { liste, tage } = a2Tagebuch({ mit, ohne, grund: 'geplant', bauch: [0, 5] });
  const v = auswerten(liste, tage).a2.zeilen.bauch;
  check(v.genug && v.stoerung === 'bloecke' && v.satz.includes('zusammenhängenden Zeitraum'),
    `R6b: Tage ohne in einem Block – kein Urteil (${v.art}, ${v.stoerung})`);
}
{
  // R6c: An den Tagen ohne ist nur der Stuhlgang eingetragen.
  const alle = Array.from({ length: 60 }, (_, k) => k);
  const ohne = alle.filter((i) => i % 3 === 1);
  const mit = alle.filter((i) => i % 3 !== 1);
  const { liste, tage } = a2Tagebuch({ mit, ohne, bauch: [0, 5], duenn: true });
  const v = auswerten(liste, tage).a2.zeilen.bauch;
  check(v.genug && v.stoerung === 'dichte' && v.satz.includes('deutlich weniger eingetragen'),
    `R6c: an Tagen ohne deutlich weniger eingetragen – kein Urteil (${v.art}, ${v.stoerung})`);
  const reich = a2Tagebuch({ mit, ohne, bauch: [0, 5] });
  const w = auswerten(reich.liste, reich.tage).a2.zeilen.bauch;
  check(w.art === 'auffaellig' && !w.stoerung, `Gegenprobe: gleich dicht eingetragen, verteilt – das Urteil fällt (${w.art})`);
}
{
  // Kopf: davor, herüberreichend, offen.
  const mit = werktage(20);
  const ohne = werktage(14, 40);
  const kopfTage = { [mit[1]]: '06:00', [mit[3] - 1]: '20:30', [ohne[2]]: '12:00' };
  const { liste, tage } = a2Tagebuch({ mit, ohne, kopfTage });
  liste.push(kopf(tagN(mit[5]), '08:00', { ungefaehr: true, tageszeit: 'morgens' }));
  const z = auswerten(liste, tage).a2.kopfZaehl;
  check(z.davor === 1, 'Kopf: ein Kopfschmerz vor der Einnahme zählt nicht (der Tag fällt weg)');
  check(z.herueber >= 1, 'Kopf: ein Kopfschmerz vom Vorabend reicht herüber und ist kein neuer');
  check(z.offen === 1, 'Kopf: „morgens“ ohne Uhrzeit neben einer Einnahme am Morgen – Reihenfolge offen');
}

/* A2 Kopf findet 15 gegen 60 Prozent bei 30 gegen 30 Tagen */
function kopfTagebuch(saat, p = [0.15, 0.6]) {
  const r = mulberry32(saat * 13 + 5);
  const tage120 = Array.from({ length: 120 }, (_, i) => i).sort(() => r() - 0.5).slice(0, 60);
  const mit = tage120.slice(0, 30).sort((a, b) => a - b);
  const ohne = tage120.slice(30).sort((a, b) => a - b);
  const kopfTage = {};
  mit.forEach((i) => { if (r() < p[1]) kopfTage[i] = `${11 + Math.floor(r() * 7)}:20`; });
  ohne.forEach((i) => { if (r() < p[0]) kopfTage[i] = `${11 + Math.floor(r() * 7)}:20`; });
  return a2Tagebuch({ mit, ohne, kopfTage });
}
{
  let gefunden = 0;
  let falsch = 0;
  for (let saat = 1; saat <= 100; saat++) {
    const k = kopfTagebuch(saat);
    if (auswerten(k.liste, k.tage).a2.zeilen.kopf.art === 'auffaellig') gefunden += 1;
    const n = kopfTagebuch(saat, [0.3, 0.3]);
    if (['auffaellig', 'unauffaellig'].includes(auswerten(n.liste, n.tage).a2.zeilen.kopf.art)) falsch += 1;
  }
  check(gefunden >= 75, `A2 Kopf: 15 gegen 60 Prozent bei 30/30 Tagen in ${gefunden} von 100 Tagebüchern gefunden (mindestens 75)`);
  check(falsch <= 6, `A2 Kopf ohne Unterschied: in ${falsch} von 100 Tagebüchern ein Urteil (höchstens 6)`);
}

/* ---------- 6. R9: keine Zielzahl auf der Seite „ohne" ---------- */

{
  const { liste, tage } = a2Tagebuch({ mit: werktage(20), ohne: werktage(3, 40) });
  const a = auswerten(liste, tage);
  check(a.a2.saetze[0] === 'Tage ohne ADHS-Mittel bisher: 3 – zu wenige für einen Vergleich.'
    && a.a2.saetze.includes(WEGLASS_SATZ), 'zu wenige Tage ohne: die bisherige Zahl und der Satz, dass es keinen Grund gibt, etwas wegzulassen');
  const wenig = auswerten(a1Grund().filter((e) => !(e.essen === 'ohne' && e.am > tagN(9))));
  const s = wenig.a1.haupt.saetze;
  // Zeichengleich: Ein angehängter Zielteil („… (3 von 5 nötigen).“) fiele
  // bei einem Vergleich nur des Satzanfangs nicht auf.
  check(s[0] === 'Bisher 20-mal mit, 3-mal ohne Essen angegeben – zu wenige Einnahmen ohne Essen für einen Vergleich.'
    && s.includes(WEGLASS_SATZ),
  `A1 mit zu wenigen Einnahmen ohne Essen: bisherige Zahlen und derselbe Satz (${s[0]})`);
  const weglass = [a.a2.saetze[0], s[0]];
  const xy = weglass.filter((t) => X_VON_Y.test(t) || ZIELZAHL.test(t));
  check(xy.length === 0, `auf der Seite „ohne“ kein „x von y“ und keine Zielzahl${xy.length ? `: ${xy[0]}` : ''}`);
  const texte = [...alleSaetze(a), ...alleSaetze(wenig)];
  const ziel = texte.filter((t) => ZIELZAHL.test(t));
  check(ziel.length === 0, `nirgends eine Zielzahl („braucht 8“, „noch 5“, „nötig: 12“, „es fehlen 2“, „mindestens 8“)${ziel.length ? `: ${ziel[0]}` : ''}`);
  check(['braucht 8', 'noch 5', 'nötig: 12', 'es fehlen 2', 'mindestens 8', '(3 von 5 nötigen)', '5 nötig']
    .every((t) => ZIELZAHL.test(t)) && !ZIELZAHL.test('10 von 30 Mahlzeiten') && X_VON_Y.test('3 von 5'),
  'die Prüfung auf Zielzahlen erkennt sie in jeder Reihenfolge');
}
{
  // Zehn Tage, an denen nur „ohne Mittel“ steht: angegeben, aber nicht
  // notiert – kein Vergleich. Der R9-Satz hängt am Vergleich, nicht an der Zahl.
  const { liste, tage } = a2Tagebuch({ mit: werktage(30), ohne: [] });
  werktage(10, 60).forEach((i) => { tage[tagN(i)] = { adhsPause: 'vergessen' }; });
  const a = auswerten(liste, tage);
  check(!a.a2.zeilen.bauch.genug && !a.a2.zeilen.kopf.genug
    && a.a2.saetze[0] === 'Tage ohne ADHS-Mittel bisher: 10, davon gewertet 0 – zu wenige für einen Vergleich.'
    && a.a2.saetze.includes(WEGLASS_SATZ),
  `R9: zehn angegebene, aber nicht notierte Tage ohne Mittel – „zu wenige“ und der Satz zum Weglassen (${a.a2.saetze[0]})`);
  check(!alleSaetze(a).some((t) => ZIELZAHL.test(t)) && !X_VON_Y.test(a.a2.saetze[0]), 'auch dort keine Zielzahl');
  // Genug Tage ohne, aber zu wenige mit: Der Satz meinte die falsche Seite.
  const w = a2Tagebuch({ mit: werktage(5), ohne: werktage(14, 40) });
  const b = auswerten(w.liste, w.tage);
  check(!b.a2.zeilen.bauch.genug && !b.a2.saetze.some((t) => t.includes('zu wenige')),
    'fehlen nur Tage mit Mittel, steht kein „zu wenige Tage ohne“');
}
{
  // Die Zahl vorn ist die Summe der Gründe in der Klammer.
  const { liste, tage } = a2Tagebuch({ mit: werktage(30), ohne: werktage(8, 40), grund: 'geplant' });
  werktage(6, 60).forEach((i) => { tage[tagN(i)] = { adhsPause: 'vergessen', stress: 1 }; });
  werktage(3, 80).forEach((i) => { tage[tagN(i)] = { adhsPause: 'beschwerden', stress: 1 }; });
  const a2 = auswerten(liste, tage).a2;
  const g = a2.gruende;
  check(a2.alleTage === 17 && g.geplant + g.vergessen + g.pause + g.beschwerden === a2.alleTage && a2.ohneTage === 14,
    `Tage ohne Mittel: ${a2.alleTage} angegeben (geplant ${g.geplant}, vergessen ${g.vergessen}, wegen Beschwerden ${g.beschwerden}), ${a2.ohneTage} gewertet`);
}

/* ---------- 7. A1: Wochentag und Nachweisgrenze ---------- */

{
  const liste = [];
  werktage(20).forEach((i) => { const d = tagN(i); liste.push(mittel(d, '07:30'), essen(d, '07:10'), essen(d, '12:30')); });
  wochenenden(10).forEach((i) => {
    const d = tagN(i);
    liste.push(mittel(d, '07:30', angabe(d, '07:30', 'ohne')), essen(d, '12:30'), beschwerde(d, '09:00', 7));
  });
  const v = auswerten(liste).a1.haupt.vergleich;
  check(v.stoerung === 'wochentag' && v.art === 'gestoert', `A1, R6: Einnahmen ohne Essen nur am Wochenende – kein Urteil (${v.art})`);
  const n = grund.a1.haupt;
  check(n.vergleich.art === 'neutral' && n.saetze[0].includes('Kein Unterschied über dem Zufall – unter')
    && n.saetze[0].includes('Stufen wäre hier keiner zu sehen'),
    'R5: ohne Urteil steht die Nachweisgrenze da – „kein Unterschied“ ist sonst ein Freispruch');
}
{
  // R6 an der Grenze: mehr als 30 Prozentpunkte Unterschied im Anteil der
  // Tage an Samstag oder Sonntag. Die Tage liegen je drei auseinander – jeder
  // ein eigener Block, damit R6b nicht mitspielt.
  const seite = (n, amWochenende, ab = 0) => {
    const raus = [];
    let we = 0;
    for (let i = ab; raus.length < n; i += 3) {
      const istWe = [5, 6].includes(i % 7);
      if (istWe && we < amWochenende) { we += 1; raus.push(tagN(i)); }
      if (!istWe && raus.length - we < n - amWochenende) raus.push(tagN(i));
    }
    return raus;
  };
  const { wochenendeUngleich, wochenendAnteil, vergleichRoh, vergleichUrteilen } = vgl;
  const anteile = [seite(10, 0), seite(10, 3, 1), seite(10, 4, 1), seite(7, 2), seite(20, 7, 1), seite(20, 5, 1)]
    .map((l) => Math.round(wochenendAnteil(l) * l.length));
  check(anteile.join() === '0,3,4,2,7,5', `die Seiten haben die gewollten Wochenendtage (${anteile.join(', ')})`);
  check(!wochenendeUngleich(seite(10, 0), seite(10, 3, 1)), 'R6: 0 von 10 gegen 3 von 10 am Wochenende (genau 30 Prozentpunkte) – noch keine Störung');
  check(wochenendeUngleich(seite(10, 0), seite(10, 4, 1)), 'R6: 0 von 10 gegen 4 von 10 (40 Prozentpunkte) – Störung');
  check(!wochenendeUngleich(seite(7, 2), seite(7, 0, 1)), 'R6: 2 von 7 gegen 0 von 7 (29 Prozentpunkte) – keine Störung');
  // Ein ganzer Vergleich knapp über und knapp unter der Grenze: Kopfschmerz
  // an 14 von 20 Tagen mit, an 2 von 20 Tagen ohne.
  const vergleich = (weOhne) => {
    const mit = seite(20, 0).map((iso, k) => ({ iso, wert: k < 14 ? 1 : 0 }));
    const ohne = seite(20, weOhne, 1).map((iso, k) => ({ iso, wert: k < 2 ? 1 : 0 }));
    return vergleichUrteilen(vergleichRoh({ mit, ohne, mindest: 8, name: 'ADHS-Mittel' }),
      { skala: 'anteil', schwelle: 0.2, vergleiche: 9, richtung: 'mit' });
  };
  const ueber = vergleich(7);
  const unter = vergleich(5);
  check(ueber.stoerung === 'wochentag' && ueber.art === 'gestoert',
    `R6: 0 gegen 35 Prozent Wochenende – kein Urteil (${ueber.art})`);
  check(unter.stoerung === null && unter.art === 'auffaellig',
    `R6: 0 gegen 25 Prozent Wochenende – das Urteil fällt (${unter.art})`);
}

/* ---------- 8. A3: Schlaf nach späterer Einnahme ---------- */

function a3Tagebuch({ spaetAm, schlafSpaet = 2, schlafFrueh = 1, vorNacht = [1, 1], dicht = false }) {
  const liste = [];
  const tage = {};
  for (let i = 0; i < 60; i++) {
    const d = tagN(i);
    const spaet = spaetAm(i);
    liste.push(mittel(d, '07:00'), mittel(d, dicht ? '12:00' : (spaet ? '16:00' : '12:00')), stuhl(d));
    tage[d] = { ...(tage[d] || {}), stress: 1, schlaf: spaet ? vorNacht[0] : vorNacht[1] };
    tage[tagN(i + 1)] = { ...(tage[tagN(i + 1)] || {}), _schlafNach: spaet ? schlafSpaet : schlafFrueh };
  }
  // Der Schlaf der Nacht danach steht am nächsten Tag – außer, der hat selbst
  // schon einen Wert für die Nacht davor (dann gilt der, wie im Tagebuch).
  Object.keys(tage).forEach((d) => {
    if (tage[d]._schlafNach !== undefined && tage[d].schlaf === undefined) tage[d].schlaf = tage[d]._schlafNach;
    delete tage[d]._schlafNach;
  });
  return { liste, tage };
}
{
  const r = mulberry32(99);
  const zufaellig = Array.from({ length: 60 }, () => r() < 0.5);
  const d1 = a3Tagebuch({ spaetAm: (i) => zufaellig[i], dicht: true });
  const a1x = auswerten(d1.liste, d1.tage).a3;
  check(a1x.dicht && a1x.saetze[0] === 'Deine Einnahmezeiten liegen zu dicht beieinander für diesen Vergleich.',
    'A3: Einnahmezeiten fast immer gleich – kein Vergleich, mit dem Satz dazu');
  const d2 = a3Tagebuch({ spaetAm: (i) => [5, 6].includes(i % 7) });
  const a2x = auswerten(d2.liste, d2.tage).a3;
  check(a2x.stoerung === 'wochentag' && a2x.art === 'gestoert',
    `A3, R6: späte Einnahme nur am Wochenende – kein Urteil (${a2x.art}, ${a2x.stoerung})`);
  // R6b: Die späten Tage – die kleinere Seite – liegen am Stück. Der Satz
  // nennt diese Seite und ihre Zahl von Blöcken, nicht die andere.
  const d3 = a3Tagebuch({ spaetAm: (i) => i >= 20 && i < 40 });
  const a3x = auswerten(d3.liste, d3.tage).a3;
  check(a3x.stoerung === 'bloecke' && a3x.blockSeite === 'mit' && a3x.mit.n < a3x.ohne.n
    && a3x.saetze.includes('Die Tage mit späterer letzter Einnahme liegen fast alle in einem zusammenhängenden '
      + 'Zeitraum – was dort sonst anders war, misst der Vergleich mit.'),
  `A3, R6b: die späten Tage am Stück – der Satz nennt sie (${a3x.saetze.slice(1).join(' ')})`);
}
{
  // Vor-Nacht: Die späten Tage hatten schon die schlechtere Nacht davor.
  const liste = [];
  const tage = {};
  const r = mulberry32(7);
  for (let i = 0; i < 80; i++) {
    const d = tagN(i);
    const spaet = r() < 0.5;
    liste.push(mittel(d, '07:00'), mittel(d, spaet ? `${15 + Math.floor(r() * 2)}:30` : `${11 + Math.floor(r() * 2)}:30`), stuhl(d));
    tage[d] = { ...(tage[d] || {}), stress: 1, _spaet: spaet };
  }
  for (let i = 0; i < 80; i++) {
    const d = tagN(i);
    const morgen = tagN(i + 1);
    tage[morgen] = { ...(tage[morgen] || {}), schlaf: tage[d]._spaet ? 3 : 1 };
  }
  // Die Nacht vor einem späten Tag war schon schlecht: Der Schlaf dieses
  // Tages (für die Nacht davor) liegt höher.
  for (let i = 0; i < 80; i++) {
    const d = tagN(i);
    if (tage[d]._spaet) tage[d].schlaf = 4; else if (tage[d].schlaf === undefined) tage[d].schlaf = 0;
  }
  Object.values(tage).forEach((t) => { delete t._spaet; });
  const a = auswerten(liste, tage).a3;
  check(a.genug && a.stoerung === 'vornacht' && a.saetze.some((t) => t.startsWith('Schon die Nacht davor war auf beiden Seiten verschieden')),
    `A3: Schon die Nacht davor war verschieden – kein Urteil, mit dem Satz dazu (${a.stoerung})`);
}
{
  // Vor-Nacht: Auf der späten Seite fehlt jede Angabe zur Nacht davor. Eine
  // Lücke ist nie 0 = „gut geschlafen“ (R1) – keine erfundene Zahl im Satz.
  const liste = [];
  const tage = {};
  for (let k = 0; k < 40; k++) {
    const d = tagN(2 * k);
    const spaet = k % 2 === 0;
    liste.push(mittel(d, spaet ? '16:00' : '11:00'), stuhl(d));
    tage[d] = { stress: 1, ...(spaet ? {} : { schlaf: 1 }) };
    tage[tagN(2 * k + 1)] = { schlaf: 1 };
  }
  const a = auswerten(liste, tage).a3;
  check(a.genug && a.vorNacht.spaeter === null && a.vorNacht.sonst === 1,
    `A3: eine Seite ohne Angaben zur Nacht davor hat keinen Mittelwert (${a.vorNacht.spaeter} gegen ${a.vorNacht.sonst})`);
  check(a.art === 'gestoert' && !a.saetze.some((t) => /\(0 gegen|gegen 0\)/.test(t))
    && a.saetze.includes('Zur Nacht davor fehlen auf einer Seite die Angaben – ob sie schon verschieden war, '
      + 'kann der Vergleich nicht prüfen.'),
  `A3: dann vorsichtshalber kein Urteil, mit einem Satz ohne Zahl (${a.art}: ${a.saetze.slice(1).join(' ')})`);
}

{
  // Nur Tage mit der häufigsten Gabenzahl: 40 Tage mit einer Gabe um 7 oder
  // 9 Uhr, 20 mit einer zweiten um 15 Uhr. Mit den Tagen zu zwei Gaben hieße
  // „später genommen“ heimlich „öfter genommen“.
  const liste = [];
  const tage = {};
  for (let i = 0; i < 60; i++) {
    const d = tagN(i);
    const zwei = i % 3 === 0;
    tage[d] = { stress: 1, schlaf: 1 };
    liste.push(mittel(d, zwei || i % 2 ? '07:00' : '09:00'), stuhl(d));
    if (zwei) liste.push(mittel(d, '15:00'));
  }
  tage[tagN(60)] = { schlaf: 1 };
  const a = auswerten(liste, tage).a3;
  check(a.gaben === 1 && a.faelle === 40 && a.uhr === '07:00',
    `A3: gerechnet nur über die 40 Tage mit einer Gabe, geteilt bei deren Median (${a.gaben} Gabe, ${a.faelle} Tage, nach ${a.uhr})`);
}
{
  // R8: Eine Einnahme bis vier Stunden nach der vorigen ist dieselbe Gabe.
  // 25 von 40 Tagen haben eine zweite Einnahme – drei bzw. fünf Stunden nach
  // der ersten. Nur die Regel entscheidet, ob das ein Tag mit einer oder mit
  // zwei Gaben ist, und damit, welche Tage A3 rechnet.
  const bau = (abstand) => {
    const liste = [];
    const tage = {};
    for (let i = 0; i < 40; i++) {
      const d = tagN(i);
      const erste = i % 2 ? 7 * 60 : 8 * 60 + 30;
      const uhr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      tage[d] = { stress: 1, schlaf: 1 };
      liste.push(mittel(d, uhr(erste)), stuhl(d));
      if (i % 8 < 5) liste.push(mittel(d, uhr(erste + abstand * 60)));
    }
    tage[tagN(40)] = { schlaf: 1 };
    return auswerten(liste, tage).a3;
  };
  const drei = bau(3);
  const fuenf = bau(5);
  check(drei.gaben === 1 && drei.faelle === 40,
    `R8: eine zweite Einnahme drei Stunden nach der ersten ist dieselbe Gabe (${drei.gaben} Gabe, ${drei.faelle} Tage)`);
  check(fuenf.gaben === 2 && fuenf.faelle === 25,
    `R8: fünf Stunden danach ist sie eine zweite Gabe (${fuenf.gaben} Gaben an ${fuenf.faelle} Tagen)`);
}

/* ---------- 9. A4: Kopfschmerzbeginn ab der ersten Einnahme ---------- */

{
  const liste = [];
  const zeiten = ['09:00', '13:00', '17:00', '06:30', '21:00', '10:00', '14:00', '18:00', '09:30', '15:00', '18:45'];
  zeiten.forEach((um, k) => {
    const d = tagN(k * 2);
    liste.push(mittel(d, `0${7 + (k % 3)}:00`), kopf(d, um), stuhl(d));
  });
  // Ein Kopfschmerz vom Vorabend, der herüberreicht: zählt nicht.
  liste.push(kopf(tagN(29), '21:00'), mittel(tagN(30), '07:00'), kopf(tagN(30), '10:00'));
  const a4 = auswerten(liste).a4;
  check(a4.faecher.join(',') === '3,4,2' && a4.vorher === 1 && a4.spaeter === 1 && a4.weg === 1,
    `A4: Fächer 0–4, 4–8, 8–12 Stunden gleich breit gezählt, vorher und später nur gezählt (${a4.faecher.join(',')}, vorher ${a4.vorher}, später ${a4.spaeter}, weg ${a4.weg})`);
  check(a4.sichtbar && !a4.dicht && a4.saetze.some((t) => t.startsWith('Eine Beschreibung, kein Vergleich')),
    'A4 ist ab zehn Anfängen sichtbar, immer mit dem Satz, dass es kein Vergleich ist');
  check(!JSON.stringify(a4).toLowerCase().includes('rebound') && !('schwerpunkt' in a4),
    'A4 nennt keinen Schwerpunkt und kein „Rebound“');
  const gleich = liste.map((e) => (e.art === 'medikament' ? { ...e, um: '07:00' } : e));
  check(auswerten(gleich).a4.saetze[0].startsWith('Die Einnahme liegt fast jeden Tag zur selben Zeit'),
    'A4: Einnahme fast täglich zur selben Zeit – der Satz, dass Stunden hier fast Uhrzeit heißen');
}

/* ---------- 10. A5: Essensrhythmus mit benannten Nennern ---------- */

{
  const { essensRhythmus } = adhs;
  const liste = [];
  for (let i = 0; i < 10; i++) {
    const d = tagN(i);
    liste.push(mittel(d, '07:00'), essen(d, i < 6 ? '09:00' : '12:00'));
    if (i < 4) liste.push(essen(d, '20:30'));
    else if (i < 8) liste.push(essen(d, '18:00'));
    if (i < 3) liste.push(beschwerde(d, '15:00', 2, { arten: ['appetit'] }));
  }
  const r = essensRhythmus({ eintraege: liste, tage: {}, von: tagN(0), bis: tagN(9) });
  check(r.mitEinnahme && r.zeilen.ersteMahlzeit.tage === 10 && r.zeilen.ersteMahlzeit.median === 2,
    `A5: erste Mahlzeit nach der Einnahme im Mittel nach ${r.zeilen.ersteMahlzeit.median} Stunden (10 Tage)`);
  check(r.zeilen.ohneMittag.k === 6 && r.zeilen.ohneMittag.n === 8,
    `A5: an ${r.zeilen.ohneMittag.k} von ${r.zeilen.ohneMittag.n} Tagen mit zwei Mahlzeiten keine zwischen 11 und 15 Uhr`);
  check(r.zeilen.spaet.k === 4 && r.zeilen.spaet.n === 8, `A5: Mahlzeit ab 20 Uhr an ${r.zeilen.spaet.k} von ${r.zeilen.spaet.n} Tagen mit Abend-Einträgen`);
  check(r.zeilen.appetit.k === 3 && r.zeilen.appetit.n === 10, `A5: „Kein Appetit“ an ${r.zeilen.appetit.k} von ${r.zeilen.appetit.n} Einnahmetagen mit Bauch-Angaben`);
  check(r.satz === 'Ob eine Mahlzeit ausgefallen ist oder nur nicht eingetragen wurde, weiß Body Check nicht.',
    'A5 sagt, dass eine fehlende Mahlzeit auch eine nicht eingetragene sein kann');
}
{
  // Der laufende Tag zählt nicht: Um 10 Uhr ist er noch kein Tag „ohne Mittagessen“.
  const { essensRhythmus } = adhs;
  const liste = [];
  for (let i = 0; i < 9; i++) liste.push(mittel(tagN(i), '07:00'), essen(tagN(i), '07:30'), essen(tagN(i), '12:30'));
  const heute = tagN(9);
  liste.push(mittel(heute, '07:00'), essen(heute, '07:30'), essen(heute, '09:45'));
  const r = essensRhythmus({ eintraege: liste, tage: {}, von: tagN(0), bis: heute, heute });
  const a5 = adhsAuswertung({ eintraege: liste, tage: {}, heute, jetzt: msAm(heute, '10:00') }).a5;
  check(r.zeilen.ohneMittag.k === 0 && r.zeilen.ohneMittag.n === 9 && a5.zeilen.ohneMittag.k === 0
    && a5.zeilen.ohneMittag.n === 9 && a5.tage === 9,
  `A5: der angefangene Tag zählt nicht mit (ohne Mittag ${r.zeilen.ohneMittag.k} von ${r.zeilen.ohneMittag.n}, in der Auswertung ${a5.zeilen.ohneMittag.k} von ${a5.zeilen.ohneMittag.n})`);
}

/* ---------- 11. R4 und der Spielraum ---------- */

{
  check(vgl.familienVergleiche(0) === 9 && vgl.familienVergleiche(3) === 9 && vgl.familienVergleiche(12) === 12,
    'R4: eine Familie rechnet mit mindestens neun Vergleichen (strenge 2,5)');
  check(grund.a1.haupt.vergleich.vergleiche === 9, 'auch mit nur einem Vergleich in der Familie');
  // Ein Unterschied über 2, aber unter 2,5 Standardfehlern: kein Urteil.
  const a = [0, 0, 0, 0, 2, 2, 2, 2, 4, 4, 4, 4];
  const b = Array.from({ length: 30 }, (_, k) => [0, 0, 1, 2, 2][k % 5]);
  const se = vgl.urteilBauch(a, b, 9).spielraum / 2.5;
  const diff = 2 - 1;
  check(diff > 2 * se && diff < 2.5 * se && vgl.urteilBauch(a, b, 9).art === 'neutral',
    `ein Unterschied zwischen 2 und 2,5 Standardfehlern bleibt ohne Urteil (Unterschied ${diff}, Standardfehler ${se.toFixed(2)})`);
  // Viel Streuung: 1,5 Stufen Unterschied sind hier Zufall.
  const c = [0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 0, 0];
  const e = Array.from({ length: 12 }, (_, k) => (k < 3 ? 9 : 0));
  const u = vgl.urteilBauch(c, e, 9);
  check(u.spielraum > 2 && u.art === 'neutral', `bei großer Streuung ist der Spielraum groß (±${u.spielraum.toFixed(1)}) und es gibt kein Urteil`);
}

/* ---------- 12. Vorbehalte an den alten Rechnungen (Ebene 0) ---------- */

{
  // Jedes Frühstück liegt am Mittel – mit und ohne Kaffee.
  const liste = [];
  for (let i = 0; i < 20; i++) {
    const d = tagN(i);
    liste.push(mittel(d, '07:30'), essen(d, '07:15', { zutaten: i % 2 ? [{ id: 'kaffee', rolle: 'getraenk' }] : [] }));
  }
  const r = ausloeserNahAmMittel(bewerteteMahlzeiten(liste, 4), liste, 'kaffee');
  check(r.n === 10 && r.m === 10 && r.k === 10 && r.l === 10 && !r.zeigen,
    'Vorbehalt am Auslöser: Liegen auch alle übrigen Mahlzeiten am Mittel, ist der Unterschied null – kein Vorbehalt');
  const mitAbend = [...liste];
  for (let i = 0; i < 20; i++) mitAbend.push(essen(tagN(i), '19:00'));
  const r2 = ausloeserNahAmMittel(bewerteteMahlzeiten(mitAbend, 4), mitAbend, 'kaffee');
  check(r2.zeigen && Math.abs(r2.differenz - (1 - 10 / 30)) < 1e-9,
    `liegen nur die Mahlzeiten mit Kaffee am Mittel, steht der Vorbehalt da (Unterschied ${r2.differenz.toFixed(2)})`);
  check(adhs.ausloeserNahSatz(r2, 'Kaffee').startsWith('10 von 10 Mahlzeiten mit Kaffee lagen in den 4 Stunden nach einem ADHS-Mittel, von den übrigen 10 von 30'),
    'mit beiden Anteilen im Satz');
}
{
  const liste = [];
  for (let i = 0; i < 15; i++) {
    const d = tagN(i);
    liste.push(essen(d, '07:00'), mittel(d, '07:15'), beschwerde(d, '08:00', 4), essen(d, '13:00'));
  }
  const zeit = zeitBild(liste);
  const r = zeitprofilNahAmMittel(liste, zeit, FENSTER);
  const teil = zeit.teile.find((t) => t.id === zeit.schwerpunkt);
  check(zeit.schwerpunkt === 'frueh' && r.m === teil.anzahl && r.n === 15 && r.zeigen,
    `Vorbehalt am Zeitprofil: dieselben ${teil.anzahl} Beschwerden wie im Profil, ${r.n} davon nach einem ADHS-Mittel`);
}

/* ---------- 13. Kein Satz rät, keiner nennt ein Ziel ---------- */

{
  const texte = [];
  for (let saat = 1; saat <= 3; saat++) {
    texte.push(...alleSaetze(auswerten(a1Tagebuch(saat))));
    const k = kopfTagebuch(saat);
    texte.push(...alleSaetze(auswerten(k.liste, k.tage)));
  }
  const rat = texte.filter((t) => RAT.test(t));
  check(rat.length === 0, `kein Satz empfiehlt etwas${rat.length ? `: ${rat[0]}` : ''}`);
  const dosis = texte.filter((t) => /\d\s*(mg|ml|µg|Gramm|Tabletten)\b/.test(t) && !t.includes(MITTEL));
  check(dosis.length === 0, `kein Satz nennt eine Dosis${dosis.length ? `: ${dosis[0]}` : ''}`);
}

ende();
