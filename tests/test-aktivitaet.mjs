/*
 * Aktivitäten: was man gemacht hat – und keine Auswertung hält es für einen
 * guten Tag.
 *
 * Eine Aktivität ist ein Eintrag mit Uhrzeit, aber kein Wort über den Körper.
 * Geprüft wird vor allem, was dabei still schiefgehen kann:
 *
 *   1. Ein Tag, an dem nur eine Aktivität steht, ist eine Lücke und kein
 *      notierter, also kein beschwerdefreier Tag – für Bauch und Kopf. Wie
 *      beim Wasser als Gegenprobe: dasselbe Tagebuch mit und ohne
 *      Aktivitäten, und jede Rechnung muss dasselbe ergeben.
 *   2. Die Auswertung findet, was in den Stunden danach kommt – gegen
 *      dieselben Stunden an Tagen ohne –, und schweigt mit zu wenigen Fällen,
 *      in Lücken, in laufenden Fenstern und bei ungeklärter Reihenfolge.
 *   3. „Auswärts gegessen" ist ein Umstand der Mahlzeit und geht als solcher
 *      in die Auslöserbilanz ein; die Bewegung steht in der Umstände-Bilanz.
 *   4. Auf dem iPhone, 320 Pixel breit: Bogen, Reihe „Zuletzt gemacht",
 *      Ändern, Löschen, eigene Aktivitäten, „Muster", Bericht, Anleitung.
 *   5. Sicherung, Einlesen und Zusammenführen nehmen alles mit; ältere Stände
 *      laden weiter.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import {
  FAKTOR_FRAGEN, ausloeserBilanz, bewerteteMahlzeiten, essensbezug, faktorBilanz,
  faktorenBilanz, gesamtZahlen, haeufigeMahlzeiten, klassenBilanz, merkmale, nachTageszeit,
  serieOhne, tagesWert, trend, verlaufReihe,
} from '../js/auswertung.js';
import { UMSTAND_IDS } from '../js/daten.js';
import { kriterien } from '../js/kriterien.js';
import {
  bauchAnKopfTagen, kopfMonate, kopfNachPhase, kopfTagesWert, kopfTageVon, kopfUmPeriode,
  kopfUmstaende, kopfZahlen,
} from '../js/kopf.js';
import { schmerzVergleich, stuhlZahlen } from '../js/stuhl.js';
import { haeltStand } from '../js/schichten.js';
import { phasenBilanz } from '../js/zyklus.js';
import { raete } from '../js/rat.js';
import { bildLesen } from '../js/bild.js';
import { zufallsSpielraum } from '../js/zufall.js';
import { fensterWerte, zeitBild } from '../js/zeitprofil.js';
import { provokationsBild } from '../js/provokation.js';
import { vorschlaege } from '../js/versuch.js';
import { arztBericht } from '../js/bericht.js';
import { eintragZaehlt } from '../js/wasser.js';
import {
  AKTIVITAETEN, INTENSITAETEN, aktivBauchSatz, aktivKopfSatz, aktivitaetBilanz, aktivitaetenVon, aktivitaetName,
  aktivitaetVon, aktivUhrzeit, bewegungSatz, eigeneAktivitaetId, freieAktivitaetId, istGegenmittel, zuletztAktivitaeten,
} from '../js/aktivitaet.js';
import { zeitpunkt } from '../js/datum.js';

const { check, ende } = pruefer();

const PORT = Number(process.env.BAUCHBUCH_PORT_AKTIVITAET || 8441);
if (PORT < 8441 || PORT > 8449) throw new Error(`Port ${PORT} liegt außerhalb von 8441–8449`);

const heute = vorTagen(0);
const gestern = vorTagen(1);
const klon = (x) => JSON.parse(JSON.stringify(x));
const sortiere = (liste) => liste.sort((a, b) => (a.am === b.am ? a.um.localeCompare(b.um) : a.am.localeCompare(b.am)));

/* ---------- 1. Die Bausteine ---------- */

check(!eintragZaehlt({ art: 'aktivitaet', am: heute, um: '18:00', aktivitaeten: ['gym'] }),
  'eine Aktivität macht einen Tag nicht zu einem notierten');
check(['essen', 'beschwerde', 'kopf', 'stuhl', 'medikament', 'notiz'].every((art) => eintragZaehlt({ art })),
  'jede andere Art schon – auch die Notiz');
check(!eintragZaehlt(null) && !eintragZaehlt(undefined), 'kein Eintrag ist kein Eintrag');
check(new Set(AKTIVITAETEN.map((a) => a.id)).size === AKTIVITAETEN.length, 'jede Kennung im Katalog einmal');
check(AKTIVITAETEN.every((a) => !a.name.includes(',')),
  'kein Name im Katalog trägt ein Komma – mehrere stehen hintereinander in einer Zeile');
check(!AKTIVITAETEN.some((a) => /ausw/i.test(a.name)), '„Auswärts gegessen" ist keine Aktivität, sondern ein Umstand der Mahlzeit');
const speicherQuelle = readFileSync(path.join(ROOT, 'js/store.js'), 'utf8');
const imSpeicher = /const INTENSITAET_IDS = \[([^\]]*)\];/.exec(speicherQuelle);
check(
  !!imSpeicher && JSON.stringify(imSpeicher[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1)))
    === JSON.stringify(INTENSITAETEN.map((i) => i.id)),
  'die Stufen „wie anstrengend" im Speicher sind dieselben wie in js/aktivitaet.js',
);
check(eigeneAktivitaetId('Kletterhalle') === 'a:kletterhalle' && eigeneAktivitaetId('Bäcker Süß') === 'a:baecker-suess',
  `eigene Kennungen mit a: und ohne Umlaute (${eigeneAktivitaetId('Bäcker Süß')})`);
check(aktivitaetName('a:kletterhalle', [{ id: 'a:kletterhalle', name: 'Kletterhalle' }]) === 'Kletterhalle',
  'eine eigene heißt, wie sie angelegt wurde');
check(eigeneAktivitaetId('Йога') === 'a:йога' && eigeneAktivitaetId('Бег') === 'a:бег' && eigeneAktivitaetId('Café') === 'a:cafe'
    && eigeneAktivitaetId('Caf') === 'a:caf',
  `Namen in anderen Schriften und mit Akzent bekommen eigene Kennungen (${eigeneAktivitaetId('Йога')}, ${eigeneAktivitaetId('Café')})`);
check(freieAktivitaetId('🏄', [{ id: 'a:eigen', name: '🧗' }]) === 'a:eigen-2' && freieAktivitaetId('🧗', [{ id: 'a:eigen', name: '🧗' }]) === 'a:eigen',
  'ein Name ganz ohne Buchstaben bekommt eine freie Kennung – derselbe Name dieselbe');
check(aktivitaetName('a:rueckenschule', [{ id: 'a:rueckenschule', name: 'Rückenschule', ausgeblendet: true }]) === 'Rückenschule'
    && aktivitaetVon('a:rueckenschule', [{ id: 'a:rueckenschule', name: 'Rückenschule', ausgeblendet: true }]).weg,
  'eine entfernte eigene behält ihren Namen samt Umlaut');
check(zuletztAktivitaeten([{ art: 'aktivitaet', am: heute, um: '08:00', aktivitaeten: ['a:x'] }], [{ id: 'a:x', name: 'X', ausgeblendet: true }]).length === 0,
  'und steht nicht mehr in „Zuletzt gemacht"');
check(aktivitaetName('a:kletter-halle', []) === 'Kletter halle' && aktivitaetVon('a:x', []).weg,
  'eine entfernte eigene behält einen lesbaren Namen');
check(
  JSON.stringify(aktivitaetenVon({ art: 'aktivitaet', aktivitaeten: ['gym', 3, 'gym', ' ', null, 'sauna'] })) === '["gym","sauna"]'
    && aktivitaetenVon({ art: 'essen', aktivitaeten: ['gym'] }).length === 0,
  'die Kennungen eines Eintrags: nur Zeichenketten, jede einmal, nur bei Aktivitäten',
);
check(aktivUhrzeit([{ um: '06:00' }, { um: '18:00' }, { um: '18:30' }, { um: '19:00' }, { um: '18:10' }]) === '18:10',
  'die Vergleichszeit ist der Median – ein frühes Training verschiebt sie nicht');
{
  const e = [
    { art: 'aktivitaet', am: vorTagen(3), um: '08:00', aktivitaeten: ['laufen'] },
    { art: 'aktivitaet', am: vorTagen(2), um: '08:00', aktivitaeten: ['a:weg', 'sauna'] },
    { art: 'essen', am: vorTagen(2), um: '12:00', was: 'x' },
    { art: 'aktivitaet', am: vorTagen(1), um: '08:00', aktivitaeten: ['gym', 'laufen'] },
  ];
  const z = zuletztAktivitaeten(e, [], 5);
  check(JSON.stringify(z) === '["gym","laufen","sauna"]',
    `„Zuletzt gemacht": jüngste zuerst, jede einmal, ohne entfernte eigene (${z.join(', ')})`);
}

/* ---------- 2. Auswärts gegessen, Bewegung ---------- */

check(UMSTAND_IDS.includes('auswaerts') && UMSTAND_IDS.includes('gross') && UMSTAND_IDS.includes('spaet'),
  'auswärts ist ein Umstand wie Portion und Uhrzeit');
check(merkmale({ art: 'essen', um: '12:00', zutaten: [], auswaerts: true }).includes('auswaerts'),
  'eine Mahlzeit mit auswaerts: true trägt das Merkmal');
check(!merkmale({ art: 'essen', um: '12:00', zutaten: [] }).includes('auswaerts')
    && !merkmale({ art: 'essen', um: '12:00', zutaten: [], auswaerts: 'ja' }).includes('auswaerts'),
  'eine ältere Mahlzeit ohne das Feld (und eine mit Unsinn darin) gilt als zu Hause gegessen');
{
  // Jede zweite Mahlzeit auswärts, danach Beschwerden; zu Hause nicht.
  const e = [];
  for (let i = 30; i >= 1; i--) {
    const am = vorTagen(i);
    const aus = i % 2 === 0;
    e.push({ id: `a${i}`, art: 'essen', am, um: '12:30', was: aus ? 'Döner' : 'Brot', zutaten: [], portion: 'normal', ...(aus ? { auswaerts: true } : {}) });
    if (aus) e.push({ id: `b${i}`, art: 'beschwerde', am, um: '14:00', staerke: 6, arten: ['druck'] });
  }
  const b = ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5, eigene: [] });
  const z = b.find((x) => x.id === 'auswaerts');
  check(!!z && z.genug && z.faelle === 15 && z.differenz >= 5, `auswärts erscheint in der Auslöserbilanz (${z && z.faelle} Fälle, ${z && z.differenz})`);
  check(vorschlaege([], b).every((v) => !UMSTAND_IDS.includes(v.ziel)), 'als Auslassversuch wird kein Umstand vorgeschlagen');
  const r = raete({
    eintraege: e, tage: {}, heute, eigene: [], bilanz: b, faktoren: faktorenBilanz(e, {}),
    phasen: [], letzteMahlzeitStunden: null, mittel: [],
  });
  check(!r.some((x) => x.id === 'essen-eigen' && /Auswärts/.test(x.titel)), 'und „Auffällig in deinem Verlauf: Auswärts gegessen" gibt es nicht');
  const v = haeufigeMahlzeiten(e, 6).find((x) => x.text === 'Döner');
  check(!!v && v.auswaerts === true && haeufigeMahlzeiten(e, 6).find((x) => x.text === 'Brot').auswaerts === false,
    '„Noch mal wie immer" nimmt auswärts vom jüngsten Vorkommen mit');
}
check(JSON.stringify(FAKTOR_FRAGEN) === '["stress","schlaf","stimmung","bewegung"]', 'die Umstände-Bilanz kennt die Bewegung');
{
  const e = [];
  const t = {};
  for (let i = 20; i >= 1; i--) {
    const am = vorTagen(i);
    const viel = i % 2 === 0;
    t[am] = { bewegung: viel ? 4 : 0 };
    e.push({ id: `m${i}`, art: 'essen', am, um: '12:00', was: 'x' });
    if (viel) e.push({ id: `b${i}`, art: 'beschwerde', am, um: '15:00', staerke: 5, arten: ['krampf'] });
  }
  const f = faktorenBilanz(e, t).bewegung;
  check(f.genug && f.hoch.tage === 10 && f.niedrig.tage === 10 && f.differenz === 5,
    `Bewegung: intensive gegen ruhige Tage (${f.hoch.tage}/${f.niedrig.tage}, ${f.differenz})`);
  const satz = bewegungSatz(f);
  check(satz.includes('intensiver Bewegung') && satz.includes('5') && satz.includes('10 gegen 10 Tage'), `als Satz mit Fallzahl (${satz})`);
  check(!/solltest|lieber|besser nicht/i.test(satz), 'und ohne Rat');
  const bild = bildLesen({ eintraege: e, tage: t, bilanz: [], name: (id) => id, istNsar: () => false });
  check(!bild.muster.some((m) => m.id === 'stress'), 'intensive Bewegung ist keine Anspannung – das Bild weiß das');
  // Ohne deutlichen Unterschied sagt der Satz ebenso, was gemittelt ist.
  const gleich = bewegungSatz({ genug: true, differenz: 0.1, hoch: { schnitt: 2.2, tage: 33 }, niedrig: { schnitt: 2.1, tage: 39 } });
  check(gleich.includes('kein deutlicher Unterschied') && gleich.includes('Beschwerdestärke') && gleich.includes('intensiver Bewegung'),
    `auch ohne Unterschied steht da, was gemittelt wird (${gleich})`);
  const wenig = { ...t };
  Object.keys(wenig).slice(0, 14).forEach((iso) => { delete wenig[iso]; });
  check(bewegungSatz(faktorBilanz(e, wenig, 'bewegung', tagesWert)) === '', 'mit zu wenigen Tagen kein Satz');
}

/* ---------- 3. Gegenprobe: dasselbe Tagebuch mit und ohne Aktivitäten ---------- */

let saat = 11;
const zufall = () => {
  saat = (saat * 1103515245 + 12345) % 2147483648;
  return saat / 2147483648;
};
const eintraege = [];
const tage = {};
const luecken = [];
const AUSWAHL = ['kaffee', 'fett', 'zwiebel', 'scharf', 'milch'];
for (let i = 79; i >= 0; i--) {
  const am = vorTagen(i);
  if (zufall() < 0.2) { luecken.push(am); continue; }
  const n = (x) => `${x}${i}`;
  const z = AUSWAHL.filter(() => zufall() < 0.35).map((id) => ({ id, rolle: 'haupt' }));
  eintraege.push({ id: n('m1-'), art: 'essen', am, um: '08:00', was: 'Frühstück', zutaten: [], portion: 'normal' });
  eintraege.push({ id: n('m2-'), art: 'essen', am, um: '13:00', was: 'Mittag', zutaten: z, portion: 'normal', ...(i % 5 === 0 ? { auswaerts: true } : {}) });
  if (z.some((x) => x.id === 'kaffee') || zufall() < 0.25) {
    eintraege.push({
      id: n('b-'), art: 'beschwerde', am, um: '14:30', staerke: 2 + Math.floor(zufall() * 6), arten: [zufall() < 0.5 ? 'krampf' : 'druck'],
    });
  }
  if (zufall() < 0.8) eintraege.push({ id: n('s-'), art: 'stuhl', am, um: '07:30', form: 1 + Math.floor(zufall() * 7) });
  if (zufall() < 0.15) {
    eintraege.push({ id: n('k-'), art: 'kopf', am, um: '16:00', staerke: 6, kopfArten: [] });
    eintraege.push({ id: n('i-'), art: 'medikament', am, um: '16:10', mittel: 'Ibuprofen', dosis: '400 mg' });
  }
  if (zufall() < 0.6) tage[am] = { stress: Math.floor(zufall() * 5), schlaf: Math.floor(zufall() * 5), bewegung: Math.floor(zufall() * 5) };
  if (i % 28 < 4) tage[am] = { ...(tage[am] || {}), blutung: 2, regelschmerz: 2 };
}
const nurKopf = luecken.shift();
eintraege.push({ id: 'nurkopf', art: 'kopf', am: nurKopf, um: '09:00', staerke: 7, kopfArten: [] });
sortiere(eintraege);

/*
 * Dieselben Einträge mit Aktivitäten dazu: an Lücken (dort steht dann nur
 * sie), kurz nach dem Mittagessen, spät am Abend hinter der letzten
 * Mahlzeit, vor dem Kopfschmerz, am Tag, an dem nur ein Kopfschmerz steht.
 * Heute nicht – „Für heute steht zum Bauch noch nichts" ist ein gewollter
 * Unterschied und wird unten eigens geprüft.
 */
const mitAktiv = klon(eintraege);
let aktivZahl = 0;
for (let i = 79; i >= 1; i--) {
  const am = vorTagen(i);
  if (i % 2 === 0) { mitAktiv.push({ id: `ga${i}`, art: 'aktivitaet', am, um: '13:30', aktivitaeten: ['gym'] }); aktivZahl += 1; }
  if (i % 3 === 0) { mitAktiv.push({ id: `sa${i}`, art: 'aktivitaet', am, um: '23:30', aktivitaeten: ['sauna', 'feier'], intensitaet: 'hart' }); aktivZahl += 1; }
  if (i % 7 === 0) { mitAktiv.push({ id: `ar${i}`, art: 'aktivitaet', am, um: '15:00', aktivitaeten: ['arbeit'], ungefaehr: true, tageszeit: 'abends' }); aktivZahl += 1; }
}
luecken.forEach((am, i) => { mitAktiv.push({ id: `lu${i}`, art: 'aktivitaet', am, um: '10:00', aktivitaeten: ['laufen'] }); });
mitAktiv.push({ id: 'nk', art: 'aktivitaet', am: nurKopf, um: '07:00', aktivitaeten: ['rad'] });
sortiere(mitAktiv);
const nurAktiv = luecken.filter((iso) => iso !== heute && !tage[iso]);
check(nurAktiv.length >= 5, `die Probe hat Tage, an denen nur eine Aktivität steht (${nurAktiv.length})`);
check(aktivZahl > 40, `und Aktivitäten an vielen anderen Tagen (${aktivZahl})`);

const von = vorTagen(79);
const istNsar = (name) => /ibu/i.test(String(name));
const prov = {
  id: 'p', art: 'klasse', ziel: 'laktose', was: 'Milch', nuechtern: 4, fenster: 4,
  laeufe: [{ am: vorTagen(9), um: '07:00', leer: false }, { am: vorTagen(6), um: '07:00', leer: true },
    { am: vorTagen(3), um: '07:00', leer: false }], beendet: null,
};
const RECHNUNGEN = {
  tagesWert: (e) => nurAktiv.map((iso) => tagesWert(e, iso, tage)),
  verlaufReihe: (e) => verlaufReihe(e, von, heute, tage),
  gesamtZahlen: (e) => gesamtZahlen(e, tage, von, heute),
  serieOhne: (e) => serieOhne(e, tage, heute),
  trend: (e) => trend(e, tage, heute, 14),
  faktorenBilanz: (e) => faktorenBilanz(e, tage),
  bewerteteMahlzeiten: (e) => bewerteteMahlzeiten(e, 4),
  ausloeserBilanz: (e) => ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5, eigene: [] }),
  klassenBilanz: (e) => klassenBilanz(e, { fenster: 4 }),
  essensbezug: (e) => essensbezug(e),
  nachTageszeit: (e) => nachTageszeit(e),
  kriterien: (e) => kriterien({ eintraege: e, tage, heute, beschwerdenSeit: null, istSaeuremittel: () => false }),
  kopfTagesWert: (e) => nurAktiv.map((iso) => kopfTagesWert(e, iso, tage)),
  kopfZahlen: (e) => kopfZahlen(e, tage, heute),
  kopfNachPhase: (e) => kopfNachPhase(e, tage),
  kopfUmPeriode: (e) => kopfUmPeriode(e, tage, heute),
  kopfMonate: (e) => kopfMonate(e, tage, () => 'nsar', heute),
  bauchAnKopfTagen: (e) => bauchAnKopfTagen(e, tage, tagesWert),
  kopfUmstaende: (e) => kopfUmstaende(e, tage, faktorBilanz, zufallsSpielraum),
  stuhlZahlen: (e) => stuhlZahlen(e, tage),
  schmerzVergleich: (e) => schmerzVergleich(e, tage, ['krampf']),
  haeltStand: (e) => AUSWAHL.map((id) => haeltStand(bewerteteMahlzeiten(e, 4), id, tage, { kopfTage: kopfTageVon(e) })),
  phasenBilanz: (e) => phasenBilanz(e, tage, tagesWert),
  fensterWerte: (e) => fensterWerte(e),
  zeitBild: (e) => zeitBild(e),
  provokationsBild: (e) => provokationsBild(prov, e, heute),
  raete: (e) => raete({
    eintraege: e, tage, heute, eigene: [], bilanz: ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5, eigene: [] }),
    faktoren: faktorenBilanz(e, tage), phasen: phasenBilanz(e, tage, tagesWert), letzteMahlzeitStunden: null, mittel: [],
  }),
  bildLesen: (e) => bildLesen({
    eintraege: e, tage, bilanz: ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5, eigene: [] }), name: (id) => id, istNsar,
  }),
};
const anders = Object.entries(RECHNUNGEN)
  .filter(([, f]) => JSON.stringify(f(eintraege)) !== JSON.stringify(f(mitAktiv)))
  .map(([name]) => name);
check(anders.length === 0,
  `${Object.keys(RECHNUNGEN).length} Rechnungen ergeben mit Aktivitäten dasselbe wie ohne (anders: ${anders.join(', ') || 'keine'})`);
check(nurAktiv.every((iso) => !tagesWert(mitAktiv, iso, tage).notiert),
  'an keinem Tag nur mit einer Aktivität ist der Bauch notiert – also auch nicht beschwerdefrei');
check(!kopfTagesWert(mitAktiv, nurAktiv[0], tage).notiert, 'und der Kopf auch nicht');

const zustandVon = (e, extra = {}) => ({
  eintraege: e, tage, fenster: 4, mindestFaelle: 5, eigeneAusloeser: [], eigeneAktivitaeten: [], termine: [],
  befunde: [], gewicht: [], versuche: [], provokationen: [], stufenplaene: [], wasserGlas: 250, ...extra,
});
/* Der Bericht: bis auf die Aktivitätszeilen und ihren Abschnitt derselbe Text. */
const ohneAktivZeilen = (text) => {
  const raus = [];
  let imAbschnitt = false;
  const zeilen = text.split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (z.startsWith('  Aktivitäten eingetragen')) {
      while (zeilen[i + 1] && zeilen[i + 1].startsWith(' '.repeat(29))) i += 1;
      continue;
    }
    if (z === 'NACH AKTIVITÄTEN') { imAbschnitt = true; continue; }
    if (imAbschnitt) { if (z === '') imAbschnitt = false; continue; }
    raus.push(z);
  }
  return raus.join('\n');
};
const berichtOhne = arztBericht(zustandVon(eintraege), vorTagen(29), heute);
const berichtMit = arztBericht(zustandVon(mitAktiv), vorTagen(29), heute);
check(!/Aktivitäten eingetragen/.test(berichtOhne), 'ohne Aktivitäten keine Zeile dazu im Bericht');
check(ohneAktivZeilen(berichtMit) === ohneAktivZeilen(berichtOhne), 'mit Aktivitäten ist der Bericht bis auf deren Zeilen derselbe');
check(/Aktivitäten eingetragen\s+\d+\n {29}\S/.test(berichtMit), 'die Übersicht nennt die Zahl und die häufigsten');
check(berichtMit.split('\n').filter((z) => !berichtOhne.split('\n').includes(z)).every((z) => z.length <= 80),
  'keine der neuen Zeilen ist länger als achtzig Zeichen');

{
  // Heute nur eine Aktivität: Der Rat sagt, wozu nichts dasteht.
  const e = [...eintraege.filter((x) => x.am !== heute),
    { id: 'heuteA', art: 'aktivitaet', am: heute, um: '07:00', aktivitaeten: ['laufen'] }];
  const r = raete({
    eintraege: e, tage: {}, heute, eigene: [], bilanz: [], faktoren: faktorenBilanz(e, {}),
    phasen: [], letzteMahlzeitStunden: null, mittel: [],
  });
  const sport = r.find((x) => x.id === 'sport');
  check(!!sport && sport.text.includes('Für heute steht zum Bauch noch nichts im Tagebuch')
      && !sport.titel.includes('Heute geht auch intensiv'),
    'steht heute nur eine Aktivität da, heißt es „zum Bauch noch nichts" – kein „beschwerdefrei"');
}

/* ---------- 4. Die Auswertung an Verläufen mit bekanntem Ergebnis ---------- */

/*
 * Sechzig Tage mit Frühstück und Mittagessen, jeden Morgen um neun eine
 * Beschwerde (die nichts mit dem Training zu tun hat). An jedem dritten Tag
 * Gym um 18 Uhr, danach um 20 Uhr Beschwerden. Die Sauna an jedem vierten Tag
 * um 19 Uhr, am Morgen danach Kopfschmerz. Feiern nur dreimal.
 */
function verlauf({ gymAb = 60, mitMorgen = true } = {}) {
  const e = [];
  for (let i = 60; i >= 1; i--) {
    const am = vorTagen(i);
    e.push({ id: `f${i}`, art: 'essen', am, um: '08:00', was: 'Frühstück', zutaten: [], portion: 'normal' });
    e.push({ id: `m${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    if (mitMorgen) e.push({ id: `x${i}`, art: 'beschwerde', am, um: '09:00', staerke: 3, arten: ['druck'] });
    if (i % 3 === 0 && i <= gymAb) {
      e.push({ id: `g${i}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: ['gym'] });
      e.push({ id: `b${i}`, art: 'beschwerde', am, um: '20:00', staerke: 6, arten: ['krampf'] });
    }
    if (i % 4 === 0) {
      e.push({ id: `s${i}`, art: 'aktivitaet', am, um: '19:00', aktivitaeten: ['sauna'] });
      e.push({ id: `k${i}`, art: 'kopf', am: vorTagen(i - 1), um: '08:00', staerke: 5, kopfArten: [] });
    }
    if (i === 10 || i === 20 || i === 30) e.push({ id: `p${i}`, art: 'aktivitaet', am, um: '21:00', aktivitaeten: ['feier'] });
  }
  return sortiere(e);
}
const V = verlauf();
const bilanz = aktivitaetBilanz(V, {}, { fenster: 4, mindestFaelle: 5 });
const gym = bilanz.find((z) => z.id === 'gym');
check(!!gym && gym.bauch.genug && gym.bauch.art === 'auffaellig',
  `Gym an jedem dritten Tag, danach Beschwerden: erscheint als auffällig (${gym && gym.bauch.art})`);
check(gym.bauch.faelle === 20 && gym.bauch.mitTreffer === 20 && gym.bauch.quoteMit === 1,
  `nach jedem der 20 Male Beschwerden (${gym.bauch.mitTreffer} von ${gym.bauch.faelle})`);
check(gym.uhr === '18:00' && gym.bauch.quoteOhne === 0 && gym.bauch.gegenFaelle >= 30,
  `verglichen mit denselben Stunden an Tagen ohne – die Morgenbeschwerden zählen dort nicht (${gym.bauch.ohneTreffer} von ${gym.bauch.gegenFaelle})`);
check(gym.kopf.art !== 'auffaellig', `beim Kopf fällt Gym nicht auf (${gym.kopf.art})`);
const sauna = bilanz.find((z) => z.id === 'sauna');
check(!!sauna && sauna.kopf.genug && sauna.kopf.art === 'auffaellig' && sauna.kopf.quoteMit === 1,
  `Sauna am Abend, Kopfschmerz am Morgen danach: im 24-Stunden-Fenster auffällig (${sauna && sauna.kopf.mitTreffer} von ${sauna && sauna.kopf.faelle})`);
check(sauna.bauch.art !== 'auffaellig' && sauna.bauch.art !== 'moeglich', `beim Bauch nicht (${sauna.bauch.art})`);
const feier = bilanz.find((z) => z.id === 'feier');
check(!!feier && !feier.bauch.genug && !feier.kopf.genug && feier.bauch.art === 'zuwenig',
  'drei Feiern sind zu wenige Fälle – kein Urteil');

{
  // Ohne die Morgenbeschwerden: Die Tage ohne Gym bleiben notiert (Mahlzeiten)
  // und zählen als Abende ohne Beschwerden.
  const z = aktivitaetBilanz(verlauf({ mitMorgen: false }), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(z.bauch.gegenFaelle >= 30 && z.bauch.ohneTreffer === 0, 'Tage mit Mahlzeiten und ohne Gym sind Vergleichstage');
  // Gym erst seit Tag 21: Davor ist unbekannt, ob trainiert wurde.
  const spaet = aktivitaetBilanz(verlauf({ gymAb: 21 }), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(spaet.bauch.faelle === 7 && spaet.bauch.gegenFaelle <= 14,
    `vor dem ersten Gym gibt es keine Vergleichstage (${spaet.bauch.faelle} mit, ${spaet.bauch.gegenFaelle} ohne)`);
}
{
  // Lücken: Gym an Tagen, an denen sonst nichts steht, zählt auf keiner Seite.
  const e = V.filter((x) => !(x.art !== 'aktivitaet' && Number(x.id.slice(1)) % 3 === 0 && x.am >= vorTagen(30)));
  const z = aktivitaetBilanz(e, {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(z.bauch.faelle === 10 && z.anzahl === 20,
    `ein Gym-Tag ohne jede andere Angabe ist eine Lücke, kein Abend ohne Beschwerden (${z.bauch.faelle} von ${z.anzahl} auswertbar)`);
}
{
  // Ein Fenster, das noch läuft, zählt nicht.
  const jetzt = new Date();
  const p = (x) => String(x).padStart(2, '0');
  const vorEinerStunde = new Date(jetzt.getTime() - 3600000);
  const um = `${p(vorEinerStunde.getHours())}:${p(vorEinerStunde.getMinutes())}`;
  const e = [...V, { id: 'heuteM', art: 'essen', am: heute, um: '00:00', was: 'x' },
    { id: 'heuteG', art: 'aktivitaet', am: heute, um, aktivitaeten: ['gym'] }];
  const z = aktivitaetBilanz(sortiere(e), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(z.anzahl === 21 && z.bauch.faelle === 20, `das Training von vor einer Stunde ist noch keins ohne Folgen (${z.bauch.faelle} von ${z.anzahl})`);
}
{
  /*
   * Ungeklärte Reihenfolge: beides „abends" mit dem Knopf. Die offene
   * Beschwerde zählt als danach – auf beiden Seiten gleich, und gesagt. Es
   * fällt kein Abend heraus: Heraus fielen sonst genau die mit Beschwerde,
   * und jede Knopf-Aktivität sähe schützend aus.
   */
  const knopf = (liste) => liste.map((x) => (x.art === 'aktivitaet' && x.aktivitaeten[0] === 'gym'
    ? { ...x, um: '19:30', ungefaehr: true, tageszeit: 'abends' } : x))
    .map((x) => (x.id.startsWith('b') ? { ...x, um: '19:30', ungefaehr: true, tageszeit: 'abends' } : x));
  const z = aktivitaetBilanz(sortiere(knopf(V)), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(z.bauch.faelle === 20 && z.bauch.offen === 20 && z.bauch.art === gym.bauch.art,
    `Gym und Beschwerde beide nur „abends": kein Abend fällt heraus, die offenen sind gezählt – dasselbe Urteil wie mit Uhrzeit (${z.bauch.faelle}, offen ${z.bauch.offen}, ${z.bauch.art})`);
  check(aktivBauchSatz(z, 4).includes('Bei 20 davon steht nur die Tageszeit fest'), 'und der Satz sagt, wo nur die Tageszeit feststeht');
  // An jedem Abend eine Beschwerde „abends", mit und ohne Gym: kein Unterschied.
  const jedenAbend = knopf(V).filter((x) => !x.id.startsWith('b'));
  for (let i = 60; i >= 1; i--) {
    jedenAbend.push({ id: `je${i}`, art: 'beschwerde', am: vorTagen(i), um: '19:30', ungefaehr: true, tageszeit: 'abends', staerke: 5 });
  }
  const j = aktivitaetBilanz(sortiere(jedenAbend), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(j.bauch.genug && j.bauch.art === 'neutral' && j.bauch.quoteMit === 1 && j.bauch.quoteOhne === 1,
    `jeden Abend „abends" Beschwerden: Gym ist weder auffällig noch schützend (${j.bauch.art}, ${j.bauch.quoteMit}/${j.bauch.quoteOhne})`);
}
{
  /*
   * Unabhängig voneinander: Gym an jedem zweiten Tag, Beschwerden an der
   * Hälfte der Tage, ohne Zusammenhang. Ob Gym mit dem Knopf und die
   * Beschwerde genau, oder umgekehrt, oder beides genau – herauskommen darf
   * nie „eher unauffällig". Früher stand hier „0 von 12 gegen 48 %".
   */
  const unabhaengig = ({ gymKnopf, beschwerdeKnopf }) => {
    const e = [];
    for (let i = 60; i >= 1; i--) {
      const am = vorTagen(i);
      e.push({ id: `u${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
      if (i % 2 === 0) {
        e.push(gymKnopf
          ? { id: `ug${i}`, art: 'aktivitaet', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', aktivitaeten: ['gym'] }
          : { id: `ug${i}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: ['gym'] });
      }
      if ([0, 1].includes(i % 4)) {
        e.push(beschwerdeKnopf
          ? { id: `ub${i}`, art: 'beschwerde', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', staerke: 5 }
          : { id: `ub${i}`, art: 'beschwerde', am, um: '20:45', staerke: 5 });
      }
    }
    return aktivitaetBilanz(sortiere(e), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  };
  for (const [art, text] of [[{ gymKnopf: false, beschwerdeKnopf: true }, 'Gym genau um 18:00, Beschwerde „abends"'],
    [{ gymKnopf: true, beschwerdeKnopf: false }, 'Gym „abends", Beschwerde genau um 20:45'],
    [{ gymKnopf: true, beschwerdeKnopf: true }, 'beides „abends"'],
    [{ gymKnopf: false, beschwerdeKnopf: false }, 'beides genau']]) {
    const z = unabhaengig(art);
    check(z.bauch.genug && z.bauch.art === 'neutral' && Math.abs(z.bauch.quoteMit - z.bauch.quoteOhne) < 0.15,
      `${text}, unabhängig: kein Unterschied (${z.bauch.mitTreffer}/${z.bauch.faelle} gegen ${z.bauch.ohneTreffer}/${z.bauch.gegenFaelle}, ${z.bauch.art})`);
  }
}
{
  // Der Kopf ebenso: Sauna mit dem Knopf „abends", jedes Mal Kopfschmerz
  // genau um 22:00 – das ist danach, nicht „schon da".
  const e = [];
  for (let i = 90; i >= 1; i--) {
    const am = vorTagen(i);
    e.push({ id: `km${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    if (i % 3 === 0) {
      e.push({ id: `ks${i}`, art: 'aktivitaet', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', aktivitaeten: ['sauna'] });
      e.push({ id: `kk${i}`, art: 'kopf', am, um: '22:00', staerke: 6, kopfArten: [] });
    }
  }
  const z = aktivitaetBilanz(sortiere(e), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'sauna');
  check(z.kopf.genug && z.kopf.art === 'auffaellig' && z.kopf.quoteMit === 1,
    `Sauna mit dem Knopf, Kopfschmerz genau danach: auswertbar und auffällig (${z.kopf.mitTreffer}/${z.kopf.faelle}, ${z.kopf.art})`);
  // Und Kopfschmerz „abends" unabhängig von der Aktivität: kein Unterschied.
  const f = [];
  for (let i = 90; i >= 1; i--) {
    const am = vorTagen(i);
    f.push({ id: `fm${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    if (i % 3 === 0) f.push({ id: `fg${i}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: ['gym'] });
    if (i % 2 === 0) f.push({ id: `fk${i}`, art: 'kopf', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', staerke: 5, kopfArten: [] });
  }
  const g = aktivitaetBilanz(sortiere(f), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'gym');
  check(g.kopf.art !== 'unauffaellig' && g.kopf.art !== 'auffaellig',
    `Kopfschmerz „abends", unabhängig vom Gym: weder öfter noch seltener (${g.kopf.mitTreffer}/${g.kopf.faelle} gegen ${g.kopf.ohneTreffer}/${g.kopf.gegenFaelle}, ${g.kopf.art})`);
}
{
  /*
   * Zweimal am selben Tag ist ein Tag, nicht zwei: Derselbe Kopfschmerz am
   * Abend stünde sonst in beiden 24-Stunden-Fenstern, und die Fallzahl wäre
   * doppelt so hoch wie die Zahl der Tage.
   */
  const tagebuch = (mal) => {
    const e = [];
    for (let i = 30; i >= 1; i--) {
      const am = vorTagen(i);
      e.push({ id: `dm${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
      mal.forEach((um, j) => e.push({ id: `ds${i}-${j}`, art: 'aktivitaet', am, um, aktivitaeten: ['spazieren'] }));
      if (i % 2 === 0) e.push({ id: `dk${i}`, art: 'kopf', am, um: '20:00', staerke: 4, kopfArten: [] });
    }
    return aktivitaetBilanz(sortiere(e), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'spazieren');
  };
  const einmal = tagebuch(['08:00']);
  const zweimal = tagebuch(['08:00', '18:00']);
  const doppelt = tagebuch(['08:00', '08:00']);
  // 29 und nicht 30: Das Fenster des letzten Tages reicht in heute, und dazu
  // steht noch nichts da.
  check(zweimal.kopf.faelle === 29 && zweimal.kopf.mitTreffer === 15 && zweimal.anzahl === 60,
    `zweimal am Tag: 29 Tage, 15 mit Kopfschmerz – nicht 58 (${zweimal.kopf.mitTreffer} von ${zweimal.kopf.faelle}, ${zweimal.anzahl} Mal)`);
  check(['faelle', 'mitTreffer', 'genug'].every((k) => einmal.kopf[k] === zweimal.kopf[k] && einmal.kopf[k] === doppelt.kopf[k]),
    'einmal, zweimal oder doppelt getippt: beim Kopf dieselben Zahlen');
  check(doppelt.bauch.faelle === einmal.bauch.faelle, `ein doppelter Tipp zur selben Minute ist beim Bauch ein Fall (${doppelt.bauch.faelle}/${einmal.bauch.faelle})`);
  check(aktivKopfSatz(zweimal).includes('an 15 von 29 Tagen Kopfschmerz'), `der Satz zählt Tage (${aktivKopfSatz(zweimal)})`);
  // Zwei Spaziergänge eine Stunde auseinander, eine Beschwerde danach: ein Fall.
  const nah = [];
  for (let i = 3; i >= 1; i--) {
    const am = vorTagen(i);
    nah.push({ id: `nm${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' },
      { id: `na${i}`, art: 'aktivitaet', am, um: '17:00', aktivitaeten: ['spazieren'] },
      { id: `nb${i}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: ['spazieren'] },
      { id: `nc${i}`, art: 'beschwerde', am, um: '19:00', staerke: 5 });
  }
  const n = aktivitaetBilanz(sortiere(nah), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'spazieren');
  check(n.bauch.faelle === 3 && !n.bauch.genug, `17 und 18 Uhr mit einer Beschwerde um 19 Uhr: ein Fall je Tag (${n.bauch.faelle})`);
  // Acht Tage mit je zwei: zu wenige Tage, auch wenn es sechzehn Male sind.
  const acht = [];
  for (let i = 40; i >= 1; i--) {
    const am = vorTagen(i);
    acht.push({ id: `am${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    if (i <= 8) acht.push({ id: `aa${i}`, art: 'aktivitaet', am, um: '08:00', aktivitaeten: ['spazieren'] }, { id: `ab${i}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: ['spazieren'] });
    if (i % 2 === 0) acht.push({ id: `ak${i}`, art: 'kopf', am, um: '20:00', staerke: 4, kopfArten: [] });
  }
  const a8 = aktivitaetBilanz(sortiere(acht), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'spazieren');
  check(!a8.kopf.genug && a8.kopf.art === 'zuwenig', `acht Tage mit je zwei Spaziergängen sind zu wenige für den Kopf (${a8.kopf.faelle})`);
  // Kopfschmerz zwischen den beiden: ein Treffer, der Tag fällt nicht weg.
  const zwischen = sortiere([
    ...Array.from({ length: 3 }, (_, k) => vorTagen(k + 2)).flatMap((am, k) => [
      { id: `zm${k}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' },
      { id: `za${k}`, art: 'aktivitaet', am, um: '08:00', aktivitaeten: ['spazieren'] },
      { id: `zb${k}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: ['spazieren'] },
      ...(k === 0 ? [{ id: 'zk', art: 'kopf', am, um: '12:00', staerke: 4, kopfArten: [] }] : []),
    ]),
    { id: 'zn', art: 'essen', am: vorTagen(1), um: '12:30', was: 'x', zutaten: [], portion: 'normal' },
  ]);
  const zw = aktivitaetBilanz(zwischen, {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'spazieren');
  check(zw.kopf.faelle === 3 && zw.kopf.mitTreffer === 1, `Kopfschmerz zwischen zwei Spaziergängen: ein Treffer, kein Wegfall (${zw.kopf.mitTreffer} von ${zw.kopf.faelle})`);
}
{
  // Ein Kopfschmerz, der schon vor der Sauna da war, kam nicht danach.
  const e = sortiere([...V, ...V.filter((x) => x.id.startsWith('s'))
    .map((x) => ({ id: `vor${x.id}`, art: 'kopf', am: x.am, um: '11:00', staerke: 4, kopfArten: [] }))]);
  const z = aktivitaetBilanz(e, {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'sauna');
  check(z.kopf.faelle === 0, `war der Kopfschmerz schon vorher da, zählt das Fenster nicht (${z.kopf.faelle})`);
}
{
  // Zufall: Aktivitäten ohne jeden Zusammenhang dürfen nichts finden.
  let s = 5;
  const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const e = [];
  for (let i = 120; i >= 1; i--) {
    const am = vorTagen(i);
    e.push({ id: `z${i}`, art: 'essen', am, um: '12:00', was: 'x' });
    if (r() < 0.35) e.push({ id: `zb${i}`, art: 'beschwerde', am, um: `${String(13 + Math.floor(r() * 9)).padStart(2, '0')}:00`, staerke: 1 + Math.floor(r() * 8), arten: ['druck'] });
    if (r() < 0.2) e.push({ id: `zk${i}`, art: 'kopf', am, um: `${String(8 + Math.floor(r() * 12)).padStart(2, '0')}:00`, staerke: 5, kopfArten: [] });
    AKTIVITAETEN.slice(0, 6).forEach((a, j) => {
      if (r() < 0.3) e.push({ id: `za${i}-${j}`, art: 'aktivitaet', am, um: `${String(14 + j).padStart(2, '0')}:00`, aktivitaeten: [a.id] });
    });
  }
  const z = aktivitaetBilanz(sortiere(e), {}, { fenster: 4, mindestFaelle: 5 });
  const funde = z.filter((x) => ['auffaellig', 'moeglich'].includes(x.bauch.art) || x.kopf.art === 'auffaellig');
  check(z.filter((x) => x.bauch.genug).length >= 5 && funde.length === 0,
    `sechs Aktivitäten ohne Zusammenhang, genug Fälle – und nichts fällt auf (${funde.map((x) => x.id).join(', ') || 'nichts'})`);
}

/* ---------- 4b. Massage, Massagepistole, Wärme: nur die Kopfseite ---------- */

/*
 * Massiert und gewärmt wird, wenn schon etwas wehtut – Wärme oft gerade
 * wegen Bauchschmerzen. Eine Bauch-Zeile sähe dann aus, als machte die
 * Wärmflasche Beschwerden. Deshalb haben diese drei keine Bauchseite – und
 * dürfen die Bauch-Bilanz keiner anderen Aktivität verändern: nicht über den
 * Zufallsspielraum (die Zahl der Vergleiche) und nicht über das Ende des
 * Vergleichszeitraums.
 */
check(JSON.stringify(AKTIVITAETEN.slice(-3).map((a) => a.id)) === '["massagepistole","massage","waerme"]'
  && AKTIVITAETEN.slice(-3).every((a) => a.gegenmittel === true)
  && AKTIVITAETEN.slice(0, -3).every((a) => !a.gegenmittel),
'Massagepistole, Massage/Physio und Wärme stehen am Ende, als einzige mit `gegenmittel`');
check(istGegenmittel('waerme') && !istGegenmittel('yoga') && !istGegenmittel('a:waerme'),
  'Dehnen bleibt Yoga; eine eigene „Wärme" ist kein eingebautes Gegenmittel');

{
  // Wärme an jedem zweiten Abend, danach jedes Mal Bauchschmerzen – stark
  // genug, dass es mit Bauchseite ein Fund wäre.
  const e = [];
  for (let i = 40; i >= 1; i--) {
    const am = vorTagen(i);
    e.push({ id: `f${i}`, art: 'essen', am, um: '08:00', was: 'Frühstück', zutaten: [], portion: 'normal' });
    e.push({ id: `x${i}`, art: 'beschwerde', am, um: '09:00', staerke: 2, arten: ['druck'] });
    if (i % 2 === 0) {
      e.push({ id: `w${i}`, art: 'aktivitaet', am, um: '19:00', aktivitaeten: ['waerme'] });
      e.push({ id: `b${i}`, art: 'beschwerde', am, um: '20:00', staerke: 7, arten: ['krampf'] });
    }
  }
  const z = aktivitaetBilanz(sortiere(e), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'waerme');
  check(!!z && z.gegenmittel === true && z.bauch.genug === false && z.bauch.art === 'zuwenig' && z.bauch.faelle >= 5,
    `Wärme mit genug Fällen bekommt trotzdem keine Bauchseite (${z && z.bauch.faelle} Fälle, ${z && z.bauch.art})`);
  check(z.kopf.faelle > 0, 'die Kopfseite wird gerechnet wie bei jeder Aktivität');
  const satz = aktivKopfSatz(z);
  check(satz.includes('wenn sich schon etwas anbahnt') && satz.includes('von selbst wieder ab'),
    'der Kopfsatz trägt den Vorbehalt: wird gewärmt, wenn sich etwas anbahnt, kann der Kopfschmerz schon unterwegs sein');
  // Belegt ist der Vorbote (ICHD-3) und das Abklingen; wie oft man gerade
  // dann wärmt, sagt keine Quelle – deshalb kein „oft" über das Verhalten.
  check(!satz.includes('gewärmt wird oft') && satz.includes('Vorbote'),
    'der Vorbehalt behauptet keine Häufigkeit über das Verhalten');
  check(!aktivKopfSatz({ id: 'yoga', kopf: z.kopf }).includes('anbahnt'), 'Yoga bleibt ohne diesen Satz');

  // Im Verlauf oben endet das Training drei Tage vor heute. Eine Massage von
  // gestern darf die Vergleichstage des Trainings nicht bis gestern
  // verlängern – dort stehen Tage mit Beschwerden, die dann „ohne Gym"
  // zählten.
  const mitMassage = sortiere([...V.map((x) => ({ ...x })),
    { id: 'mm1', art: 'aktivitaet', am: vorTagen(1), um: '07:00', aktivitaeten: ['massage'] },
    { id: 'mm2', art: 'aktivitaet', am: vorTagen(2), um: '07:00', aktivitaeten: ['massagepistole'] }]);
  const vorher = aktivitaetBilanz(sortiere([...V]), {}, { fenster: 4, mindestFaelle: 5 });
  const nachher = aktivitaetBilanz(mitMassage, {}, { fenster: 4, mindestFaelle: 5 });
  const bauchVon = (l, id) => JSON.stringify(l.find((x) => x.id === id).bauch);
  check(['gym', 'sauna', 'feier'].every((id) => bauchVon(vorher, id) === bauchVon(nachher, id)),
    'eine Massage nach dem letzten Training verlängert dessen Vergleichstage für den Bauch nicht');
}

{
  /*
   * Die Gegenprobe: ein ganzes Tagebuch (das des Golds) mit und ohne
   * Massage-Einträge. Ein Teil der Massagen liegt nach der letzten anderen
   * Aktivität – dort würde sonst der Vergleichszeitraum länger.
   *
   * Das Gold ist in UTC gerechnet, und tests/rechnungen.mjs stellt die
   * Zeitzone beim Laden darauf um. Hier nur für diesen Block: Die Tests im
   * Browser weiter unten rechnen mit vorTagen() in der Zeitzone des Rechners.
   */
  const zoneVorher = process.env.TZ;
  const {
    GOLD_SAATEN, GRUNDDATUM, isoPlus, tagebuch,
  } = await import('./rechnungen.mjs');
  const jetzt = zeitpunkt(isoPlus(GRUNDDATUM, 1), '12:00');
  const opt = { fenster: 4, mindestFaelle: 5, jetzt };
  const gold = JSON.parse(readFileSync(path.join(ROOT, 'tests/gold/v27-rechnungen.json'), 'utf8'));
  GOLD_SAATEN.forEach((saat) => {
    const d = tagebuch(saat);
    const ohne = aktivitaetBilanz(d.eintraege, d.tage, opt);
    check(JSON.stringify(ohne) === JSON.stringify(gold.rechnungen[saat].aktivitaetBilanz),
      `Tagebuch ${saat}: aktivitaetBilanz ohne Massage zeichengleich mit dem Gold`);
    const extra = [];
    const art = ['massagepistole', 'massage', 'waerme'];
    for (let i = 0; i < 120; i += 3) {
      const am = isoPlus(GRUNDDATUM, -i);
      extra.push({ id: `mx${i}`, art: 'aktivitaet', am, um: i % 2 ? '07:30' : '21:45', aktivitaeten: [art[(i / 3) % 3]] });
    }
    // Ein Tag nach dem Tagebuch: nach jeder anderen Aktivität.
    extra.push({ id: 'mx-spaet', art: 'aktivitaet', am: GRUNDDATUM, um: '23:50', aktivitaeten: ['massage'] });
    const mit = aktivitaetBilanz(sortiere([...d.eintraege.map((x) => ({ ...x })), ...extra]), d.tage, opt);
    const bauch = (liste) => Object.fromEntries(liste.filter((x) => !x.gegenmittel).map((x) => [x.id, x.bauch]));
    const a = bauch(ohne);
    const b = bauch(mit);
    const anders = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    check(Object.keys(a).length >= 4 && anders.length === 0 && Object.keys(b).length === Object.keys(a).length,
      `Tagebuch ${saat}: Massage-Einträge ändern die Bauch-Bilanz keiner anderen Aktivität${anders.length ? ` – anders: ${anders.join(', ')}` : ''}`);
    check(mit.filter((x) => x.gegenmittel).length === 3 && mit.filter((x) => x.gegenmittel).every((x) => !x.bauch.genug),
      `Tagebuch ${saat}: alle drei ohne Bauchseite`);
  });
  if (zoneVorher === undefined) delete process.env.TZ;
  else process.env.TZ = zoneVorher;
}

/* ---------- 5. Im Browser, als App auf dem iPhone ---------- */

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 640 };

const kopie = await kopieServer(ROOT, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];

async function iphone(stand) {
  const ctx = await browser.newContext({ viewport: SCHMAL, userAgent: KENNUNG, serviceWorkers: 'block' });
  await ctx.addInitScript(([k, s]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    try { if (s && !localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, stand]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  return { ctx, page };
}
const speicher = (page) => page.evaluate(async (k) => {
  const st = await import('/js/store.js');
  st.sofortSchreiben();
  return JSON.parse(localStorage.getItem(k));
}, KEY);
const kurz = (page) => page.waitForTimeout(150);
const breit = async (page, wo) => {
  const m = await page.evaluate(() => ({ breit: document.documentElement.scrollWidth, fenster: window.innerWidth }));
  check(m.breit <= m.fenster, `${wo}: nichts ragt über den Rand (${m.breit}/${m.fenster})`);
};
const toast = (page) => page.locator('#toast').textContent();
const reiter = async (page, tab) => { await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click(); await kurz(page); };

// Ein Stand aus einer Fassung vor den Aktivitäten: ohne eigeneAktivitaeten.
const ALT = {
  begruesst: true,
  tab: 'heute',
  alterName: null,
  eintraege: [
    { id: 'f1', art: 'essen', am: gestern, um: '12:00', was: 'Pizza', zutaten: [], portion: 'normal' },
  ],
  tage: {},
};

{
  const { ctx, page } = await iphone(ALT);

  /* Der Knopf im Raster */
  check(await page.locator('.anlegen-btn').count() === 7, 'ein alter Stand lädt: sieben Knöpfe, einer davon „Aktivität"');
  const raster = await page.locator('.anlegen').boundingBox();
  const notiz = await page.locator('.anlegen-btn.a-notiz').boundingBox();
  const aktivKnopf = await page.locator('.anlegen-btn.a-aktivitaet').boundingBox();
  check(Math.abs(notiz.width - raster.width) < 2 && notiz.height >= 44,
    `die Notiz liegt als flache Zeile über die ganze Breite (${Math.round(notiz.width)}/${Math.round(raster.width)}, ${Math.round(notiz.height)} px hoch)`);
  check(aktivKnopf.width >= 80 && aktivKnopf.height >= 44, 'der Knopf „Aktivität" ist groß genug');
  check(await page.locator('[data-act="aktiv-schnell"]').count() === 0, 'ohne Aktivität im Tagebuch keine Reihe „Zuletzt gemacht"');
  await breit(page, 'Tag mit sieben Knöpfen');

  /* Leer eintragen geht nicht */
  await page.locator('[data-act="neu"][data-art="aktivitaet"]').click();
  await kurz(page);
  check((await page.locator('#bogenTitel').textContent()).includes('Aktivität'), 'der Bogen heißt „Aktivität"');
  check(await page.locator('[data-act="aktiv-wahl"]').count() === AKTIVITAETEN.length, 'mit allen Marken des Katalogs');
  check(await page.locator('[data-act="zeit-tageszeit"]').count() === 3 && await page.locator('[data-act="zeit-bezug"]').count() === 0,
    'mit morgens, mittags, abends – ohne Bezug zum Essen');
  await breit(page, 'Bogen Aktivität');
  await page.locator('[data-act="bogen-speichern"]').click();
  await kurz(page);
  check((await toast(page)).includes('Was hast du gemacht?'), 'ohne Auswahl sagt der Bogen, was fehlt');
  check((await speicher(page)).eintraege.length === 1, 'und speichert nichts');

  /* Massagepistole: der Herstellerhinweis, sobald sie gewählt ist */
  check(await page.locator('.massage-hinweis').count() === 0, 'ohne Massagepistole kein Herstellerhinweis');
  await page.locator('[data-act="aktiv-wahl"][data-id="massagepistole"]').click();
  await kurz(page);
  const mh = ((await page.locator('.massage-hinweis').textContent()) || '').replace(/\s+/g, ' ');
  // Herstellerangaben und Fallberichte waren im Volltext nicht zu prüfen:
  // Der Satz verweist auf die Sicherheitshinweise des Geräts und auf Praxis
  // oder Physiotherapie, ohne einzelne Körperstellen aus zweiter Hand.
  check(mh.includes('steht in seinen Sicherheitshinweisen') && mh.includes('Praxis oder Physiotherapie')
    && mh.includes('Mehr dazu') && !mh.includes('Hersteller'),
    'mit Massagepistole: der Verweis auf die Sicherheitshinweise und „Mehr dazu"');
  check(await page.locator('.massage-hinweis details[open]').count() === 0
    && mh.includes('Zeichen eines Schlaganfalls') && mh.includes('112, nicht auf einen Termin warten'),
    'die Einzelheiten zugeklappt, darin die Schlaganfallzeichen mit 112 wie auf der Warnkarte');
  await breit(page, 'Bogen mit Massagehinweis');
  await page.locator('[data-act="aktiv-wahl"][data-id="massagepistole"]').click();
  await kurz(page);
  check(await page.locator('.massage-hinweis').count() === 0, 'abgewählt verschwindet der Hinweis');

  /* Eintragen: Gym, abends, anstrengend, Notiz, und eine eigene, nur getippt */
  await page.locator('[data-act="aktiv-wahl"][data-id="gym"]').click();
  await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').click();
  await page.locator('[data-act="aktiv-intensitaet"][data-id="hart"]').click();
  await page.locator('#bogenAktivNeu').fill('Kletterhalle');
  await page.locator('#bogenNotiz').fill('mit Freunden');
  await kurz(page);
  await page.locator('.bogen').screenshot({ path: `${SHOT}/aktivitaet-bogen.png` });
  await page.locator('[data-act="bogen-speichern"]').click();
  await kurz(page);
  let s = await speicher(page);
  const neu = s.eintraege.find((e) => e.art === 'aktivitaet');
  check(!!neu && JSON.stringify(neu.aktivitaeten) === '["gym","a:kletterhalle"]',
    `eingetragen mit Gym und der getippten eigenen (${neu && JSON.stringify(neu.aktivitaeten)})`);
  check(neu.am === heute && neu.um === '19:30' && neu.ungefaehr === true && neu.tageszeit === 'abends',
    'heute, „abends" – ungefähr');
  check(neu.intensitaet === 'hart' && neu.notiz === 'mit Freunden', 'mit „anstrengend" und Notiz');
  check(JSON.stringify(s.eigeneAktivitaeten) === '[{"id":"a:kletterhalle","name":"Kletterhalle"}]',
    'der nur getippte Name steht jetzt bei den eigenen Aktivitäten');
  const zeile = page.locator('.strang-zeile.z-aktivitaet');
  check(await zeile.count() === 1, 'die Aktivität steht im Strang');
  const zeilenText = (await zeile.textContent()).replace(/\s+/g, ' ');
  check(zeilenText.includes('Gym/Krafttraining · Kletterhalle') && zeilenText.includes('anstrengend')
    && zeilenText.includes('mit Freunden') && zeilenText.includes('abends'), `mit allem, was eingetragen ist (${zeilenText.trim()})`);
  const sagt = await zeile.locator('[data-act="bearbeiten"]').getAttribute('aria-label');
  check(sagt === 'Aktivität, Gym/Krafttraining · Kletterhalle, um etwa 19:30 ändern', `VoiceOver liest die Zeile vor (${sagt})`);
  check(await page.locator('.tagbilanz').count() === 0, 'ein Tag nur mit einer Aktivität bekommt kein „beschwerdefrei"');
  const rat = (await page.locator('.rat').textContent()) || '';
  check(rat.includes('Für heute steht zum Bauch noch nichts im Tagebuch'), 'der Rat sagt: zum Bauch steht noch nichts da');
  await breit(page, 'Tag mit Aktivität');

  /* Die Reihe „Zuletzt gemacht" */
  const reihe = page.locator('[data-act="aktiv-schnell"]');
  check(await reihe.count() === 2, 'jetzt steht „Zuletzt gemacht" da, mit Gym und Kletterhalle');
  check((await reihe.first().textContent()).includes('✓'), 'mit Häkchen, weil es heute schon steht');
  await page.screenshot({ path: `${SHOT}/aktivitaet-tag-320.png`, fullPage: true });
  await page.locator('[data-act="aktiv-schnell"][data-id="a:kletterhalle"]').click();
  await kurz(page);
  s = await speicher(page);
  const schnell = s.eintraege.filter((e) => e.art === 'aktivitaet' && e.am === heute);
  check(schnell.length === 2 && JSON.stringify(schnell.find((e) => !e.notiz).aktivitaeten) === '["a:kletterhalle"]',
    'ein Tipp trägt heute ein, mit genau dieser Aktivität');
  check(/^Kletterhalle eingetragen \(\d\d:\d\d\)\.$/.test(await toast(page)), `die Meldung nennt sie samt Uhrzeit (${await toast(page)})`);

  /* Ändern – die Zeile mit Gym; die aus dem Tipp steht je nach Uhrzeit davor oder danach */
  await page.locator('.strang-zeile.z-aktivitaet', { hasText: 'Gym' }).locator('[data-act="bearbeiten"]').click();
  await kurz(page);
  check((await page.locator('#bogenTitel').textContent()).includes('Aktivität ändern'), 'ein Tipp öffnet „Aktivität ändern"');
  check(await page.locator('[data-act="aktiv-wahl"][data-id="gym"][aria-pressed="true"]').count() === 1
    && await page.locator('[data-act="aktiv-intensitaet"][data-id="hart"][aria-pressed="true"]').count() === 1,
  'mit dem, was gewählt war');
  check(await page.locator('[data-act="aktiv-auswaerts"]').count() === 0, 'beim Ändern ohne den Weg zur Mahlzeit');
  await page.locator('[data-act="aktiv-intensitaet"][data-id="hart"]').click();
  await page.locator('[data-act="aktiv-wahl"][data-id="sauna"]').click();
  await page.locator('[data-act="bogen-speichern"]').click();
  await kurz(page);
  s = await speicher(page);
  const geaendert = s.eintraege.find((e) => e.id === neu.id);
  check(geaendert.intensitaet === null && JSON.stringify(geaendert.aktivitaeten) === '["gym","a:kletterhalle","sauna"]',
    'zurückgenommen ist ohne Angabe, dazugewählt steht dabei');

  /* Gestern: der Bogen, vorgefüllt, und von dort zur Mahlzeit „auswärts" */
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await kurz(page);
  check((await page.locator('.schnell .feld-name').filter({ hasText: 'Zuletzt gemacht' }).textContent()).includes('die Zeit wählst du im Bogen'),
    'an einem vergangenen Tag sagt die Reihe, dass die Zeit im Bogen kommt');
  await page.locator('[data-act="aktiv-schnell"][data-id="gym"]').click();
  await kurz(page);
  check((await page.locator('#bogenTitel').textContent()).trim().endsWith('Aktivität')
    && await page.locator('[data-act="aktiv-wahl"][data-id="gym"][aria-pressed="true"]').count() === 1,
  'gestern öffnet der Tipp den Bogen, Gym schon gewählt');
  check((await toast(page)).includes('Wann war das?'), 'und fragt nach der Zeit');
  check((await speicher(page)).eintraege.filter((e) => e.am === gestern).length === 1, 'eingetragen ist noch nichts');
  // Ohne vorbelegte 12:00: ein eiliges „Eintragen" speichert nichts.
  check(await page.locator('#bogenUhr').inputValue() === '', 'die Uhrzeit ist leer');
  await page.locator('[data-act="bogen-speichern"]').click();
  await kurz(page);
  check((await speicher(page)).eintraege.filter((e) => e.am === gestern).length === 1
      && (await toast(page)).startsWith('Um wie viel Uhr?'),
  'ohne Zeitwahl wird nichts gespeichert');
  await page.locator('[data-act="zeit-tageszeit"][data-id="mittags"]').click();
  await page.locator('[data-act="aktiv-auswaerts"]').click();
  await kurz(page);
  check((await page.locator('#bogenTitel').textContent()).includes('Mahlzeit')
    && await page.locator('[data-act="auswaerts"][aria-pressed="true"]').count() === 1,
  '„Als Mahlzeit eintragen" öffnet die Mahlzeit, „Auswärts gegessen" schon an');
  check((await toast(page)).startsWith('Gym/Krafttraining eingetragen – jetzt die Mahlzeit'),
    `das schon gewählte Gym ist vorher eingetragen, und die Meldung sagt es (${await toast(page)})`);
  check(await page.locator('#bogenTag').inputValue() === gestern && await page.locator('#bogenUhr').inputValue() === '12:30',
    'Tag und Zeit kommen mit');
  await page.locator('#bogenWas').fill('Ramen');
  await page.locator('[data-act="bogen-speichern"]').click();
  await kurz(page);
  s = await speicher(page);
  const ramen = s.eintraege.find((e) => e.was === 'Ramen');
  check(!!ramen && ramen.art === 'essen' && ramen.auswaerts === true && ramen.am === gestern, 'gespeichert als Mahlzeit mit auswaerts: true');
  const gestrigeAktiv = s.eintraege.filter((e) => e.art === 'aktivitaet' && e.am === gestern);
  check(gestrigeAktiv.length === 1 && JSON.stringify(gestrigeAktiv[0].aktivitaeten) === '["gym"]'
      && gestrigeAktiv[0].um === '12:30' && gestrigeAktiv[0].tageszeit === 'mittags',
  `die gewählte Aktivität geht nicht verloren: Gym gestern mittags, genau einmal (${gestrigeAktiv.length})`);
  check(!s.eintraege.some((e) => (e.aktivitaeten || []).some((id) => /ausw/.test(id))), 'und „auswärts" ist keine Aktivität geworden');
  // Ohne Auswahl öffnet der Weg nur die Mahlzeit – es entsteht keine Aktivität.
  await page.locator('[data-act="neu"][data-art="aktivitaet"]').click();
  await kurz(page);
  await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').click();
  await page.locator('[data-act="aktiv-auswaerts"]').click();
  await kurz(page);
  check((await toast(page)).startsWith('Als Mahlzeit'), 'ohne Auswahl die bisherige Meldung');
  await page.locator('button.bogen-zu').click();
  await kurz(page);
  check((await speicher(page)).eintraege.filter((e) => e.art === 'aktivitaet' && e.am === gestern).length === 1,
    'und keine Aktivität dazu');
  // Ein getippter Name ohne „Dazu" kommt mit.
  await page.locator('[data-act="neu"][data-art="aktivitaet"]').click();
  await kurz(page);
  await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').click();
  await page.locator('#bogenAktivNeu').fill('Weinfest');
  await page.locator('[data-act="aktiv-auswaerts"]').click();
  await kurz(page);
  await page.locator('button.bogen-zu').click();
  await kurz(page);
  s = await speicher(page);
  check(s.eigeneAktivitaeten.some((a) => a.name === 'Weinfest')
      && s.eintraege.some((e) => e.art === 'aktivitaet' && e.am === gestern && e.aktivitaeten.includes('a:weinfest')),
  'ein nur getippter Name wird angelegt und eingetragen, auch wenn die Mahlzeit danach nicht gespeichert wird');
  check((await page.locator('.strang-zeile.z-essen').filter({ hasText: 'Ramen' }).textContent()).includes('auswärts'),
    'in der Zeile steht „auswärts"');
  // Wieder abwählen beim Ändern
  await page.locator('.strang-zeile.z-essen', { hasText: 'Ramen' }).locator('[data-act="bearbeiten"]').click();
  await kurz(page);
  await page.locator('[data-act="auswaerts"]').click();
  await page.locator('[data-act="bogen-speichern"]').click();
  await kurz(page);
  s = await speicher(page);
  check(s.eintraege.find((e) => e.was === 'Ramen').auswaerts === false, 'abgewählt steht es beim Ändern ausdrücklich zurück');
  const pizza = s.eintraege.find((e) => e.was === 'Pizza');
  check(!('auswaerts' in pizza), 'die alte Mahlzeit bleibt ohne das Feld');

  /* Löschen mit zwei Tipps */
  await page.locator('[data-act="tag-blaettern"][data-d="1"]').click();
  await kurz(page);
  const vorher = (await speicher(page)).eintraege.length;
  const weg = page.locator('.strang-zeile.z-aktivitaet').last().locator('[data-act="loeschen"]');
  await weg.click();
  check((await weg.textContent()).includes('Löschen?'), 'das × fragt erst');
  await weg.click();
  await kurz(page);
  check((await speicher(page)).eintraege.length === vorher - 1, 'der zweite Tipp löscht');

  /* Verlauf: Heute zählt nicht als notiert */
  await reiter(page, 'verlauf');
  const kachel = await page.locator('.kachel').first().textContent();
  check(kachel.trim().startsWith('1'), `im Verlauf ist nur gestern notiert, nicht heute mit nur Aktivitäten (${kachel.trim()})`);

  /* „Mehr": eigene Aktivitäten */
  await reiter(page, 'mehr');
  const karte = page.locator('#eigeneAktivitaeten');
  check(await karte.count() === 1 && (await karte.textContent()).includes('Kletterhalle'), 'unter „Mehr" stehen die eigenen Aktivitäten');
  await page.locator('#neueAktivitaet').fill('laufen');
  await page.locator('[data-act="aktiv-neu"]').click();
  await kurz(page);
  check((await toast(page)).includes('steht schon in der Auswahl'), 'was es im Katalog gibt, wird nicht noch einmal angelegt');
  await page.locator('#neueAktivitaet').fill('Chorprobe');
  await page.locator('[data-act="aktiv-neu"]').click();
  await kurz(page);
  s = await speicher(page);
  check(s.eigeneAktivitaeten.some((a) => a.id === 'a:chorprobe' && a.name === 'Chorprobe'), 'eine neue kommt dazu');
  check(s.eintraege.length === vorher - 1, 'ohne dass etwas eingetragen wird');
  await breit(page, '„Mehr" mit eigenen Aktivitäten');
  await karte.screenshot({ path: `${SHOT}/aktivitaet-mehr.png` });
  // Entfernen mit zwei Tipps, wie das Löschen im Strang – und „Rückgängig".
  const wegKnopf = page.locator('[data-act="aktiv-weg"][data-id="a:kletterhalle"]');
  await wegKnopf.click();
  await kurz(page);
  check((await wegKnopf.textContent()).includes('Entfernen?') && !(await speicher(page)).eigeneAktivitaeten
    .some((a) => a.ausgeblendet), 'der erste Tipp fragt nur');
  await breit(page, '„Entfernen?" bei den eigenen Aktivitäten');
  await wegKnopf.click();
  await kurz(page);
  s = await speicher(page);
  check(s.eigeneAktivitaeten.some((a) => a.id === 'a:kletterhalle' && a.ausgeblendet)
      && !(await karte.textContent()).includes('Kletterhalle'), 'entfernt ist sie aus der Auswahl');
  await page.locator('[data-act="entfernt-zurueck"]').click();
  await kurz(page);
  check((await karte.textContent()).includes('Kletterhalle') && !(await speicher(page)).eigeneAktivitaeten.some((a) => a.ausgeblendet),
    '„Rückgängig" holt sie zurück');
  await wegKnopf.click();
  await wegKnopf.click();
  await kurz(page);
  s = await speicher(page);
  check(s.eintraege.some((e) => (e.aktivitaeten || []).includes('a:kletterhalle')), 'die Einträge damit bleiben');
  await reiter(page, 'heute');
  check(await page.locator('[data-act="aktiv-schnell"][data-id="a:kletterhalle"]').count() === 0,
    'und in „Zuletzt gemacht" steht sie nicht mehr');
  check((await page.locator('.strang-zeile.z-aktivitaet').first().textContent()).includes('Kletterhalle'),
    'in der Zeile behält sie ihren Namen');
  await page.locator('.strang-zeile.z-aktivitaet').first().locator('[data-act="bearbeiten"]').click();
  await kurz(page);
  check(await page.locator('[data-act="aktiv-wahl"][data-id="a:kletterhalle"][aria-pressed="true"]').count() === 1,
    'im Bogen bleibt sie sichtbar und abwählbar');
  check(await page.locator('[data-act="aktiv-wahl"][data-id="a:chorprobe"]').count() === 1, 'die neue steht zur Auswahl');
  await page.locator('#bogenAktivNeu').fill('Sauna');
  await page.locator('[data-act="aktiv-eigen"]').click();
  await kurz(page);
  check((await toast(page)).includes('gibt es schon'), 'ein Name aus dem Katalog im Bogen wählt den aus, statt ihn doppelt anzulegen');
  await breit(page, 'Bogen beim Ändern');
  await page.locator('button.bogen-zu').click();

  /* Anleitung */
  await reiter(page, 'mehr');
  await page.locator('[data-act="anleitung"]').first().click();
  await kurz(page);
  const anl = page.locator('#anleitung-aktivitaet');
  check(await anl.count() === 1 && (await anl.textContent()).includes('Eine Aktivität allein macht keinen Tag ohne'),
    'die Anleitung erklärt die Aktivität, samt der einen Regel');
  await breit(page, 'Anleitung');
  await ctx.close();
}

/* ---------- 6. „Muster" und Bericht in der App ---------- */

{
  const t = {};
  for (let i = 40; i >= 1; i--) t[vorTagen(i)] = { bewegung: i % 2 ? 4 : 0 };
  const { ctx, page } = await iphone({ begruesst: true, tab: 'muster', alterName: null, eintraege: V, tage: t });
  await kurz(page);
  const karte = page.locator('#wasDuGemachtHast');
  check(await karte.count() === 1, 'unter „Muster" steht „Was du gemacht hast"');
  const funde = await karte.locator('.fund').allTextContents();
  const gymFund = (funde.find((f) => f.includes('Gym')) || '').replace(/\s+/g, ' ');
  check(gymFund.includes('Bauch, auffällig') && gymFund.includes('20 von 20 Mal Beschwerden') && gymFund.includes('ab 18:00'),
    `Gym mit Fallzahl und Vergleichszeit (${gymFund.trim().slice(0, 140)})`);
  const saunaFund = (funde.find((f) => f.includes('Sauna')) || '').replace(/\s+/g, ' ');
  check(saunaFund.includes('Kopf, öfter Kopfschmerz') && saunaFund.includes('24 Stunden danach'), 'Sauna mit dem Kopf');
  check(!funde.some((f) => f.includes('Feier')), 'die Feier mit drei Fällen steht nicht bei den Funden');
  const text = (await karte.textContent()).replace(/\s+/g, ' ');
  check(/Zählt noch Feier\/Ausgehen \d von 5/.test(text), 'sondern unter „Zählt noch"');
  const bew = bewegungSatz(faktorBilanz(V, t, 'bewegung', tagesWert));
  check(text.includes('keine Ursache') && !!bew && text.includes(bew) && text.includes('am selben Tag'),
    `mit Vorbehalt, und die Bewegung als Satz mit ihrem eigenen (${bew})`);
  check(!/solltest|lieber nicht|verzichte/i.test(text), 'kein Rat, nur Zahlen');
  await karte.screenshot({ path: `${SHOT}/aktivitaet-muster.png` });
  await breit(page, '„Muster" mit Aktivitäten');

  await reiter(page, 'mehr');
  await page.locator('[data-act="bericht"][data-n="90"]').click();
  await page.waitForTimeout(300);
  const bericht = await page.locator('.bericht').inputValue();
  check(bericht.includes('NACH AKTIVITÄTEN') && /Gym\/Krafttraining\n {4}Bauch 20 von 20 \(100 %\), sonst 0 von \d+ \(0 %\) – auffällig/.test(bericht),
    'der Bericht hat je Aktivität eine Zeile mit Fallzahl');
  const zahl = V.filter((x) => x.art === 'aktivitaet').length;
  check(new RegExp(`Aktivitäten eingetragen\\s+${zahl}\\n {29}Gym/Krafttraining 20× · Sauna 15×`).test(bericht),
    `und in der Übersicht die Zahl der Aktivitäten (${zahl}), die häufigsten zuerst`);
  check(!/Feier/.test(bericht.split('NACH AKTIVITÄTEN')[1].split('\n\n')[0]), 'zu wenige Fälle stehen dort nicht');
  await breit(page, '„Mehr" mit Bericht');
  await ctx.close();

  // Wärme: unter „Muster" ohne Bauch-Zeile, auch unter „Zählt noch" mit
  // der Kopfseite.
  const warm = [...V];
  for (let i = 40; i >= 1; i -= 2) warm.push({ id: `wm${i}`, art: 'aktivitaet', am: vorTagen(i), um: '21:00', aktivitaeten: ['waerme'] });
  const wp = await iphone({ begruesst: true, tab: 'muster', alterName: null, eintraege: sortiere(warm), tage: t });
  await kurz(wp.page);
  const wKarte = ((await wp.page.locator('#wasDuGemachtHast').textContent()) || '').replace(/\s+/g, ' ');
  const wFund = ((await wp.page.locator('#wasDuGemachtHast .fund', { hasText: 'Wärme' }).allTextContents())[0] || '').replace(/\s+/g, ' ');
  check(wKarte.includes('Wärme') && (wFund ? !wFund.includes('Bauch') && wFund.includes('anbahnt') : /Wärme \d+ von 12 Tagen/.test(wKarte)),
    `Wärme ohne Bauch-Zeile (${(wFund || wKarte).slice(0, 160)})`);
  await breit(wp.page, '„Muster" mit Wärme');
  await wp.ctx.close();

  // Zu wenige Fälle überhaupt: keine Funde, nur „Zählt noch".
  const wenig = V.filter((x) => x.art !== 'aktivitaet' || x.aktivitaeten[0] === 'feier');
  const w = await iphone({ begruesst: true, tab: 'muster', alterName: null, eintraege: wenig, tage: {} });
  await kurz(w.page);
  check(await w.page.locator('#wasDuGemachtHast .fund').count() === 0, 'mit zu wenigen Fällen kein Fund');
  check(((await w.page.locator('#wasDuGemachtHast').textContent()) || '').includes('Zählt noch'), 'aber „Zählt noch"');
  await w.ctx.close();
}

/* ---------- 7. Sicherung, Einlesen, Zusammenführen ---------- */

{
  const { ctx, page } = await iphone({
    ...ALT,
    eintraege: [...ALT.eintraege,
      { id: 'a1', art: 'aktivitaet', am: gestern, um: '18:00', aktivitaeten: ['gym', 'a:kletterhalle'], intensitaet: 'mittel', notiz: '' },
      { id: 'e2', art: 'essen', am: gestern, um: '20:00', was: 'Döner', zutaten: [], portion: 'normal', auswaerts: true }],
    eigeneAktivitaeten: [{ id: 'a:kletterhalle', name: 'Kletterhalle' }],
  });
  const e = await page.evaluate(async () => {
    const st = await import('/js/store.js');
    const text = st.alsJSON();
    st.allesLoeschen();
    const r = st.einlesen(text);
    return { text, r, z: JSON.parse(JSON.stringify(st.zustandLesen())) };
  });
  const gelesen = JSON.parse(e.text);
  check(gelesen.eigeneAktivitaeten.length === 1 && gelesen.eintraege.some((x) => x.art === 'aktivitaet'),
    'die Sicherung trägt Aktivitäten und eigene Aktivitäten');
  check(!e.r.zusammengefuehrt && e.z.eintraege.find((x) => x.id === 'a1').intensitaet === 'mittel'
      && e.z.eigeneAktivitaeten[0].name === 'Kletterhalle' && e.z.eintraege.find((x) => x.id === 'e2').auswaerts === true,
  'eingelesen in ein leeres Tagebuch ist alles wieder da, auch „auswärts"');

  const zusammen = await page.evaluate(async ([g]) => {
    const st = await import('/js/store.js');
    const r = st.einlesen(JSON.stringify({
      eintraege: [
        { id: 'a1', art: 'aktivitaet', am: g, um: '18:00', aktivitaeten: ['gym', 'a:kletterhalle'] },
        { id: 'a2', art: 'aktivitaet', am: g, um: '07:00', aktivitaeten: ['laufen', 7, 'laufen', ' ', 'a:chor'], intensitaet: 'extrem' },
        { id: 'a3', art: 'aktivitaet', am: g, um: '09:00', aktivitaeten: 'gym' },
      ],
      eigeneAktivitaeten: [
        { id: 'a:kletterhalle', name: 'Kletterhalle' },
        { id: 'a:chor', name: '  Chor  ' },
        { id: 'chor', name: 'ohne Vorsilbe' },
        { id: 'a:leer', name: '   ' },
        { id: 'a:chor', name: 'doppelt' },
        'Unsinn',
      ],
    }));
    return { r, z: JSON.parse(JSON.stringify(st.zustandLesen())) };
  }, [gestern]);
  const z = zusammen.z;
  check(zusammen.r.zusammengefuehrt, 'in ein Tagebuch mit Einträgen wird zusammengeführt');
  check(z.eintraege.filter((x) => x.id === 'a1').length === 1, 'dieselbe Aktivität steht danach einmal da');
  check(JSON.stringify(z.eintraege.find((x) => x.id === 'a2').aktivitaeten) === '["laufen","a:chor"]'
      && z.eintraege.find((x) => x.id === 'a2').intensitaet === null,
  'Kennungen werden zu einer sauberen Liste, eine unbekannte Stufe zu „ohne Angabe"');
  check(JSON.stringify(z.eintraege.find((x) => x.id === 'a3').aktivitaeten) === '[]',
    'eine Aktivität ohne Liste bleibt stehen, zählt aber nirgends');
  check(JSON.stringify(z.eigeneAktivitaeten) === '[{"id":"a:kletterhalle","name":"Kletterhalle"},{"id":"a:chor","name":"Chor"}]',
    `eigene Aktivitäten: zusammengeführt über die Kennung, ohne Unbrauchbares (${JSON.stringify(z.eigeneAktivitaeten)})`);

  /* Eine Sicherung von vor den Aktivitäten */
  const alt = await page.evaluate(async ([g]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.einlesen(JSON.stringify({
      eintraege: [{ id: 'y', art: 'essen', am: g, um: '12:00', was: 'Reis', tags: ['fett'] }],
      tage: { [g]: { bewegung: 3 } },
      tagesfragen: ['bewegung'],
      eigeneAusloeser: [],
    }));
    const zz = st.zustandLesen();
    return { eigene: zz.eigeneAktivitaeten, anzahl: zz.eintraege.length, tag: zz.tage[g] };
  }, [gestern]);
  check(Array.isArray(alt.eigene) && alt.eigene.length === 0 && alt.anzahl === 1 && alt.tag.bewegung === 3,
    'eine alte Sicherung lädt wie bisher, ohne eigene Aktivitäten');

  /* Ein Tagebuch mit nur eigenen Aktivitäten ist nicht leer */
  const nurEigene = await page.evaluate(async ([g]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.aktivitaetAnlegen('a:boulder', 'Bouldern');
    const leer = st.istLeer();
    const r = st.einlesen(JSON.stringify({ eintraege: [{ id: 'z', art: 'notiz', am: g, um: '10:00', text: 'z' }] }));
    return { leer, zusammen: r.zusammengefuehrt, eigene: st.zustandLesen().eigeneAktivitaeten };
  }, [gestern]);
  check(!nurEigene.leer && nurEigene.zusammen && nurEigene.eigene.length === 1,
    'ein Tagebuch mit nur einer eigenen Aktivität wird beim Einlesen zusammengeführt, nicht ersetzt');

  /* Die Grenze */
  const grenze = await page.evaluate(async () => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    const raus = [];
    for (let i = 0; i < st.AKTIV_HOECHSTENS + 1; i += 1) raus.push(st.aktivitaetAnlegen(`a:x${i}`, `X ${i}`));
    return {
      letzte: raus[raus.length - 1], anzahl: st.zustandLesen().eigeneAktivitaeten.length, max: st.AKTIV_HOECHSTENS,
      leer: st.aktivitaetAnlegen('a:y', '  '), ohneVorsilbe: st.aktivitaetAnlegen('y', 'Y'),
    };
  });
  check(grenze.letzte.fehler === 'voll' && grenze.anzahl === grenze.max, `höchstens ${grenze.max} eigene, dann sagt der Speicher „voll"`);
  check(grenze.leer.fehler === 'leer' && grenze.ohneVorsilbe.fehler === 'leer', 'ohne Namen oder ohne a: wird nichts angelegt');

  /* Entfernte und Namen in anderen Schriften kommen durch die Sicherung */
  const weg = await page.evaluate(async ([g]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.aktivitaetAnlegen('a:rueckenschule', 'Rückenschule');
    st.aktivitaetAnlegen('a:йога', 'Йога');
    st.eintragen({ art: 'aktivitaet', am: g, um: '10:00', aktivitaeten: ['a:rueckenschule', 'a:йога'] });
    st.aktivitaetEntfernen('a:rueckenschule');
    const text = st.alsJSON();
    st.allesLoeschen();
    st.einlesen(text);
    const nachEinlesen = JSON.parse(JSON.stringify(st.zustandLesen().eigeneAktivitaeten));
    // Zusammenführen: hier wieder sichtbar, dort entfernt – hier gewinnt.
    st.aktivitaetZurueck('a:rueckenschule');
    st.einlesen(text);
    const nachZusammen = JSON.parse(JSON.stringify(st.zustandLesen().eigeneAktivitaeten));
    // Und wer eine entfernte neu anlegt, bekommt sie zurück, mit ihrer Kennung.
    st.aktivitaetEntfernen('a:rueckenschule');
    const wieder = st.aktivitaetAnlegen('a:rueckenschule', 'Rückenschule');
    return { nachEinlesen, nachZusammen, wieder, danach: JSON.parse(JSON.stringify(st.zustandLesen().eigeneAktivitaeten)) };
  }, [gestern]);
  check(JSON.stringify(weg.nachEinlesen) === '[{"id":"a:rueckenschule","name":"Rückenschule","ausgeblendet":true},{"id":"a:йога","name":"Йога"}]',
    `eine entfernte eigene Aktivität bleibt durch die Sicherung entfernt, mit Namen; „Йога" kommt mit (${JSON.stringify(weg.nachEinlesen)})`);
  check(!weg.nachZusammen.some((a) => a.ausgeblendet) && weg.nachZusammen.length === 2,
    'beim Zusammenführen gilt, was hier steht');
  check(!weg.wieder.fehler && !weg.danach.some((a) => a.ausgeblendet), 'neu angelegt ist eine entfernte wieder in der Auswahl');
  await ctx.close();
}

/* ---------- 8. Namen, die nicht zusammenfallen dürfen; lange Namen ---------- */

{
  const { ctx, page } = await iphone({ ...ALT });
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await kurz(page);
  const anlegen = async (name) => {
    await page.locator('[data-act="neu"][data-art="aktivitaet"]').click();
    await kurz(page);
    await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').click();
    await page.locator('#bogenAktivNeu').fill(name);
    await page.locator('[data-act="aktiv-eigen"]').click();
    await kurz(page);
    const t = await toast(page);
    const fokus = await page.evaluate(() => document.activeElement && document.activeElement.id);
    await page.locator('[data-act="bogen-speichern"]').click();
    await kurz(page);
    return { t, fokus };
  };
  const yoga = await anlegen('Йога');
  const lauf = await anlegen('Бег');
  check(yoga.t.includes('„Йога“ steht jetzt') && lauf.t.includes('„Бег“ steht jetzt'), `beide Meldungen nennen den getippten Namen (${lauf.t})`);
  check(yoga.fokus === 'bogenAktivDazu', `nach „Dazu" bleibt der Fokus auf dem Knopf, nicht am Anfang der Seite (${yoga.fokus})`);
  await anlegen('Café');
  await anlegen('Caf');
  await anlegen('🧗');
  await anlegen('🏄');
  let s = await speicher(page);
  const ids = s.eigeneAktivitaeten.map((a) => a.id);
  check(ids.length === 6 && new Set(ids).size === 6, `sechs Namen, sechs Kennungen (${ids.join(', ')})`);
  const zeilen = (await page.locator('.strang-zeile.z-aktivitaet').allTextContents()).map((t) => t.replace(/\s+/g, ' '));
  check(['Йога', 'Бег', 'Café', 'Caf', '🧗', '🏄'].every((n) => zeilen.some((z) => z.includes(n))),
    'und jeder Eintrag heißt, wie er angelegt wurde');
  await reiter(page, 'mehr');
  await page.locator('#neueAktivitaet').fill('Бег');
  await page.locator('[data-act="aktiv-neu"]').click();
  await kurz(page);
  check((await toast(page)).includes('„Бег“ steht schon in der Auswahl'), 'unter „Mehr" nennt die Meldung den vorhandenen Namen');

  // Ein erlaubter Name von 40 Zeichen ohne Leerzeichen: kein Querscrollen.
  const lang = 'Kampfsportvereinstrainingseinheitsgruppe';
  await page.locator('#neueAktivitaet').fill(lang);
  await page.locator('[data-act="aktiv-neu"]').click();
  await kurz(page);
  await breit(page, '„Mehr" mit einem langen Namen');
  const feld = await page.evaluate(() => {
    const f = document.getElementById('neueAktivitaet').getBoundingClientRect();
    const reihe = document.getElementById('neueAktivitaet').closest('.reihe').getBoundingClientRect();
    return { f: f.right, reihe: reihe.right };
  });
  check(feld.f <= feld.reihe + 0.5, `das Eingabefeld bleibt in seiner Reihe (${Math.round(feld.f)} ≤ ${Math.round(feld.reihe)})`);
  await reiter(page, 'heute');
  await page.locator('[data-act="neu"][data-art="aktivitaet"]').click();
  await kurz(page);
  const bogen = await page.evaluate(() => {
    const b = document.querySelector('.bogen-inhalt') || document.querySelector('.bogen');
    return { breit: b.scrollWidth, sicht: b.clientWidth };
  });
  check(bogen.breit <= bogen.sicht, `im Bogen bleibt die lange Marke innerhalb (${bogen.breit}/${bogen.sicht})`);
  await breit(page, 'Bogen mit langem Namen');
  await ctx.close();
}

/* ---------- 9. „Zählt noch" nennt die Seite, die fehlt ---------- */

{
  // Arbeit an jedem Tag: Die Fälle mit ihr reichen längst, es fehlen die
  // Tage ohne. „40 von 5" läse sich wie ein Rechenfehler.
  const e = [];
  for (let i = 40; i >= 1; i--) {
    const am = vorTagen(i);
    e.push({ id: `wm${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    e.push({ id: `wa${i}`, art: 'aktivitaet', am, um: '09:00', aktivitaeten: ['arbeit'] });
    if (i % 3 === 0) e.push({ id: `wk${i}`, art: 'kopf', am, um: '20:00', staerke: 4, kopfArten: [] });
    if (i % 4 === 0) e.push({ id: `wb${i}`, art: 'beschwerde', am, um: '10:00', staerke: 3 });
  }
  const { ctx, page } = await iphone({ begruesst: true, tab: 'muster', alterName: null, eintraege: e, tage: {} });
  await kurz(page);
  const text = ((await page.locator('#wasDuGemachtHast').textContent()) || '').replace(/\s+/g, ' ');
  check(text.includes('Zählt noch') && /Arbeit 0 von 5 Tagen ohne/.test(text), `„Zählt noch" nennt die fehlenden Tage ohne (${text.slice(text.indexOf('Zählt noch'), text.indexOf('Zählt noch') + 40)})`);
  check(!/\b40 von 5\b/.test(text), 'und nicht „40 von 5"');
  await breit(page, '„Zählt noch" mit Tagen ohne');
  await ctx.close();
  // An zwei von drei Tagen: Der Bauch reicht, beim Kopf fehlen Tage ohne.
  const f = [];
  for (let i = 60; i >= 1; i--) {
    const am = vorTagen(i);
    f.push({ id: `xm${i}`, art: 'essen', am, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    if (i % 3) f.push({ id: `xa${i}`, art: 'aktivitaet', am, um: '09:00', aktivitaeten: ['arbeit'] });
    if (i % 2) f.push({ id: `xb${i}`, art: 'beschwerde', am, um: '10:00', staerke: 3 });
  }
  const z = aktivitaetBilanz(sortiere(f), {}, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'arbeit');
  check(z.bauch.genug && !z.kopf.genug && z.kopf.fehltGegen > 0 && z.kopf.faelle >= z.kopf.mindest,
    `die Probe: Bauch genug, beim Kopf fehlen nur die Tage ohne (${z.kopf.faelle}/${z.kopf.gegenFaelle})`);
  const w = await iphone({ begruesst: true, tab: 'muster', alterName: null, eintraege: f, tage: {} });
  await kurz(w.page);
  const fund = ((await w.page.locator('#wasDuGemachtHast .fund').filter({ hasText: 'Arbeit' }).textContent()) || '').replace(/\s+/g, ' ');
  check(/Kopf: zählt noch – \d+ von 12 Tagen ohne auswertbar/.test(fund), `in der Karte: „Kopf: zählt noch – … von 12 Tagen ohne" (${fund.slice(fund.indexOf('Kopf:'), fund.indexOf('Kopf:') + 50)})`);
  await breit(w.page, 'Fund mit „Tagen ohne"');
  await w.ctx.close();
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
