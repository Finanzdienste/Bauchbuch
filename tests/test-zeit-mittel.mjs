/*
 * Zeitknöpfe und eigene Mittel – für jemanden, der den Tag abends nachträgt
 * und jeden Tag dieselben Mittel in derselben Dosis nimmt.
 *
 * Geprüft wird, was ein Abgleich an diesen beiden Teilen gefunden hat, Punkt
 * für Punkt, und zwar so, wie es auf dem iPhone bedient wird (Kennung von
 * Safari unter iOS 26, 320 Pixel breit):
 *
 *    1. „abends, nach dem Essen" rastet nur an einer Mahlzeit des Abends ein,
 *       nicht am Frühstück; ohne eine solche rechnet es mit der Tageszeit.
 *    2. Wer erst die Tablette und dann das Frühstück einträgt, bekommt die
 *       Tablette an das Frühstück nachgezogen – beim Anlegen, Verschieben und
 *       Löschen der Mahlzeit. Eine genaue Uhrzeit bleibt, wie sie ist.
 *    3. Ein anderes Datum im Bogen rechnet die ungefähre Zeit neu.
 *    4. „abends" ist abends – im Bogen und in der Auswertung.
 *    5. Essen und Beschwerde mit demselben Knopf: keine erfundene Reihenfolge,
 *       kein „Nüchternschmerz 9 von 9".
 *    6. Dasselbe Mittel morgens und abends als zwei Knöpfe, mit Häkchen je Zeit.
 *    7. „Meine Mittel" unter „Mehr": anlegen, ändern, entfernen – ohne Einnahme.
 *    8. Die Wahl eines eigenen Mittels überschreibt eine gewählte Zeit nicht.
 *    9. „Dazu genommen?" beim Kopfschmerz nimmt die Dosis mit.
 *   10. Die Höchstzahl wird gesagt, nicht still angewandt.
 *   11. Eine Sicherung löscht die eigenen Mittel nicht.
 *   12. Der Arztbericht nennt die Dosis.
 *   13. „Noch mal wie immer" auch auf vergangenen Tagen.
 *
 * Dazu alte Stände: gespeichert und als Sicherung, aus der Fassung davor.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Browserteil gegen eine
 * (veränderte) Kopie der App – so lässt sich prüfen, dass er einen
 * eingebauten Fehler bemerkt.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import { KNOPF_TAGESZEIT, tageszeit } from '../js/datum.js';
import {
  ausloeserBilanz, bewerteteMahlzeiten, einstufung, essensbezug, folgende, klassenBilanz, nachTageszeit,
  reihenfolgeUnklar, stundenSeitEssen, stundenSeitLetzterMahlzeit, wertNach,
} from '../js/auswertung.js';
import { dosisBild } from '../js/dosis.js';
import { fensterWerte, zeitBild } from '../js/zeitprofil.js';
import { laufBild } from '../js/provokation.js';
import { bildLesen } from '../js/bild.js';
import { arztBericht } from '../js/bericht.js';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8411–8419; die Bereiche darunter haben andere Tests.
const PORT = Number(process.env.BAUCHBUCH_PORT_ZEITMITTEL || 8411);
if (PORT < 8411 || PORT > 8419) throw new Error(`Port ${PORT} liegt außerhalb von 8411–8419`);

/* ==================== Ohne Browser: die Rechnung ==================== */

/* ---------- 4. „abends" ist abends ---------- */

/** Eine Uhrzeit, um `min` Minuten verschoben. */
const plus = (um, min) => {
  const m = Number(um.slice(0, 2)) * 60 + Number(um.slice(3)) + min;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
// „vor dem Essen" und „nach dem Essen" ohne Mahlzeit liegen eine halbe
// Stunde davor und danach – auch die müssen im selben Fach landen.
for (const [id, t] of Object.entries(KNOPF_TAGESZEIT)) {
  check(
    [t.um, plus(t.um, -30), plus(t.um, 30)].every((um) => tageszeit(um) === t.fach),
    `„${id}" trägt ${t.um} ein, und das liegt – auch eine halbe Stunde davor oder danach – im Fach „${t.fach}" der Auswertung`,
  );
}

/*
 * Tageszeit und Bezug zum Essen stehen im Speicher noch einmal (er soll von
 * der Anzeige nichts wissen). Weichen die Listen ab, verwirft das Merken eine
 * Zeit still – also müssen sie gleich sein.
 */
{
  const speicherQuelle = readFileSync(path.join(ROOT, 'js/store.js'), 'utf8');
  const anzeigeQuelle = readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const bezugSpeicher = (/const BEZUG_IDS = \[([^\]]*)\];/.exec(speicherQuelle) || [])[1] || '';
  const bezugAnzeige = (/const ESSENSBEZUG = \[([\s\S]*?)\n\];/.exec(anzeigeQuelle) || [])[1] || '';
  const ids = (t, re) => [...t.matchAll(re)].map((m) => m[1]);
  check(
    JSON.stringify(ids(bezugSpeicher, /'([^']+)'/g)) === JSON.stringify(ids(bezugAnzeige, /id: '([^']+)'/g))
      && ids(bezugSpeicher, /'([^']+)'/g).length === 3,
    'der Bezug zum Essen im Speicher ist derselbe wie in den Knöpfen',
  );
  check(/const TAGESZEIT_IDS = Object\.keys\(KNOPF_TAGESZEIT\)/.test(speicherQuelle),
    'die Tageszeiten im Speicher kommen aus den Zeitknöpfen selbst');
}

/*
 * Ein Eintrag aus der Fassung davor: „abends" stand damals auf 18:30. Er muss
 * abends zählen, ohne dass jemand ihn umschreibt – die Zeit hat jemand
 * geschätzt, die Tageszeit gesagt.
 */
const T = '2026-10-20';
const alterAbend = { id: 'alt', art: 'beschwerde', am: T, um: '18:30', staerke: 4, ungefaehr: true, tageszeit: 'abends' };
const genauNachmittag = { id: 'gn', art: 'beschwerde', am: T, um: '18:30', staerke: 4 };
check(
  nachTageszeit([alterAbend]).map((x) => x.id).join() === 'abend',
  '„abends" von 18:30 aus der alten Fassung zählt abends',
);
check(
  nachTageszeit([genauNachmittag]).map((x) => x.id).join() === 'nachmittag',
  'eine genau eingetragene 18:30 bleibt nachmittags – die Fenster selbst sind unverändert',
);

/* ---------- 5. Gleiche Minute, keine erfundene Reihenfolge ---------- */

/*
 * Neun Abende, alles mit den Knöpfen nachgetragen: Frühstück „morgens",
 * Mittagessen „mittags", Abendessen „abends" und eine Beschwerde „abends".
 * Abendessen und Beschwerde stehen auf derselben Minute. Vorher war die
 * Beschwerde damit nie nach dem Essen (gleiche Minute zählt nicht) und hing
 * am Mittagessen sieben Stunden davor – „nüchtern", neunmal.
 */
const tag = (i) => `2026-10-${String(i + 10).padStart(2, '0')}`;
const knopfTage = [];
for (let i = 1; i <= 9; i++) {
  const am = tag(i);
  knopfTage.push(
    { id: `f${i}`, art: 'essen', am, um: '08:00', ungefaehr: true, tageszeit: 'morgens', zutaten: [{ id: 'kaffee', rolle: 'haupt' }] },
    { id: `m${i}`, art: 'essen', am, um: '12:30', ungefaehr: true, tageszeit: 'mittags', zutaten: [] },
    { id: `a${i}`, art: 'essen', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', zutaten: [{ id: 'fett', rolle: 'haupt' }] },
    { id: `b${i}`, art: 'beschwerde', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', staerke: 5, arten: ['brennen'] },
  );
}
const eb = essensbezug(knopfTage);
check(eb.nuechtern === 0, `keine dieser Beschwerden zählt als nüchtern (${eb.nuechtern})`);
check(eb.unbekannt === 9 && eb.bewertbar === 0, `sondern als unklar (${eb.unbekannt} von ${eb.gesamt})`);
check(
  reihenfolgeUnklar(knopfTage[2], knopfTage[3]) && stundenSeitEssen(knopfTage, knopfTage[3]) === null,
  'Abendessen „abends" und Beschwerde „abends": die Reihenfolge ist offen, der Abstand unbekannt',
);
const tageDazu = Object.fromEntries(knopfTage.map((e) => [e.am, { stress: 1 }]));
const bild = bildLesen({ eintraege: knopfTage, tage: tageDazu });
check(
  !bild.muster.some((m) => m.id === 'nuechtern'),
  `die Einordnung nennt keinen Nüchternschmerz (${bild.muster.map((m) => m.id).join(', ') || 'nichts'})`,
);

// Für die Bilanz zählt die offene Beschwerde zum Abendessen derselben
// Tageszeit – als danach, und so gekennzeichnet. Keine Mahlzeit fällt
// heraus: Herausfielen sonst genau die mit Beschwerde (siehe wertNach).
const bewertet = bewerteteMahlzeiten(knopfTage, 4);
const abendBewertet = bewertet.filter((b) => b.m.tageszeit === 'abends');
check(
  bewertet.length === 27 && abendBewertet.length === 9 && abendBewertet.every((b) => b.wert === 5 && b.offen),
  `alle 27 Mahlzeiten stehen in der Bilanz, die Abendessen mit der offenen Beschwerde (${bewertet.length}, ${abendBewertet.map((b) => b.wert).join('/')})`,
);
check(
  bewertet.filter((b) => b.m.tageszeit !== 'abends').every((b) => b.wert === 0 && !b.offen),
  'Frühstück und Mittag rechnen ohne sie – „abends" liegt nicht in ihrer Tageszeit',
);
check(wertNach(knopfTage, knopfTage[2], 4) === 5, 'wertNach gibt dafür die Stärke, nicht null');
const fettZeile = ausloeserBilanz(knopfTage, { fenster: 4, mindestFaelle: 5 }).find((z) => z.id === 'fett');
check(
  !!fettZeile && fettZeile.faelle === 9 && fettZeile.offen === 9 && einstufung(fettZeile) === 'auffaellig',
  `„fett" nur in den Abendessen: auffällig, mit der Zahl der offenen Fälle (${fettZeile && `${fettZeile.faelle}, offen ${fettZeile.offen}, ${einstufung(fettZeile)}`})`,
);
check(
  klassenBilanz(knopfTage, { fenster: 4 }).every((k) => k.faelle + k.gegenFaelle === 27),
  'die Klassenbilanz rechnet ebenso mit allen 27',
);

/*
 * Der Grundsatz dahinter: Ob eine Mahlzeit zählt, hängt nie davon ab, ob
 * danach etwas kam. Sechzig Tage, Abendessen mit dem Knopf „abends", jedes
 * zweite mit Zwiebel; nach 23 der 30 Zwiebel-Abende eine Beschwerde der
 * Stärke 6 – einmal genau um 21:00, einmal selbst „abends", einmal gegen ein
 * genau eingetragenes Abendessen um 19:30.
 */
const zwiebelTage = (art) => {
  const e = [];
  let mitBeschwerde = 0;
  for (let i = 1; i <= 60; i++) {
    const am = vorTagen(i + 2);
    const zwiebel = i % 2 === 0;
    const abend = art === 'genauesEssen'
      ? { id: `za${i}`, art: 'essen', am, um: '19:30', zutaten: [] }
      : { id: `za${i}`, art: 'essen', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', zutaten: [] };
    if (zwiebel) abend.zutaten = [{ id: 'zwiebel', rolle: 'haupt' }];
    e.push({ id: `zf${i}`, art: 'essen', am, um: '08:00', zutaten: [{ id: 'kaffee', rolle: 'haupt' }] }, abend);
    if (zwiebel && mitBeschwerde < 23) {
      mitBeschwerde += 1;
      e.push(art === 'genau'
        ? { id: `zb${i}`, art: 'beschwerde', am, um: '21:00', staerke: 6 }
        : { id: `zb${i}`, art: 'beschwerde', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', staerke: 6 });
    }
  }
  return e;
};
for (const [art, text] of [['genau', 'Knopf-Abendessen, genaue Beschwerde um 21:00'],
  ['knopf', 'beides „abends"'], ['genauesEssen', 'genaues Abendessen, Beschwerde „abends" ohne Bezug']]) {
  const e = zwiebelTage(art);
  const z = ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'zwiebel');
  check(
    !!z && z.faelle === 30 && z.schnittMit > z.schnittOhne && einstufung(z) === 'auffaellig',
    `${text}: Zwiebel fällt auf, mit allen 30 Fällen (${z && `${z.faelle}, ${z.schnittMit.toFixed(1)} gegen ${z.schnittOhne.toFixed(1)}, ${einstufung(z)}`})`,
  );
  const k = klassenBilanz(e, { fenster: 4 }).find((x) => x.id === 'fodmap');
  check(!k || k.faelle + k.gegenFaelle === 120, `${text}: auch die Klassenbilanz zählt alle 120 Mahlzeiten`);
  const d = dosisBild(e, 'zwiebel', 4);
  const haupt = d.stufen.find((x) => x.id === 'haupt');
  check(haupt && haupt.faelle === 30, `${text}: und die Mengenrechnung alle 30 (${haupt && haupt.faelle})`);
  check(essensbezug(e).nuechtern === 0, `${text}: und keine dieser Beschwerden zählt als nüchtern`);
}
{
  // Gegenprobe: Wie viele Abendessen zählen, hängt nicht an den Beschwerden.
  const mit = bewerteteMahlzeiten(zwiebelTage('knopf'), 4).length;
  const ohne = bewerteteMahlzeiten(zwiebelTage('knopf').filter((x) => x.art !== 'beschwerde'), 4).length;
  check(mit === ohne && mit === 120, `mit und ohne Beschwerden werden gleich viele Mahlzeiten bewertet (${mit}/${ohne})`);
  const ruhig = ausloeserBilanz(zwiebelTage('knopf').filter((x) => x.art !== 'beschwerde'), { fenster: 4, mindestFaelle: 5 })
    .find((x) => x.id === 'zwiebel');
  check(ruhig && einstufung(ruhig) === 'neutral', 'ohne jede Beschwerde bleibt Zwiebel ohne Befund');
}
{
  // Der Fall aus der Gegenprüfung: Mittag genau mit Kaffee, Abendbrot mit dem
  // Knopf und Zwiebel, danach genaue Beschwerden. Vorher sah Zwiebel harmlos
  // aus und Kaffee wie der Auslöser.
  const e = [];
  for (let i = 1; i <= 50; i++) {
    const am = vorTagen(i + 2);
    e.push({ id: `km${i}`, art: 'essen', am, um: '12:30', zutaten: [{ id: 'kaffee', rolle: 'haupt' }] });
    e.push({ id: `ka${i}`, art: 'essen', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', zutaten: [{ id: 'zwiebel', rolle: 'haupt' }] });
    if (i % 10 < 2) e.push({ id: `kb${i}`, art: 'beschwerde', am, um: '14:00', staerke: 3 });
    if (i % 10 < 7) e.push({ id: `kc${i}`, art: 'beschwerde', am, um: '21:00', staerke: 6 });
  }
  const b = ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5 });
  const zw = b.find((x) => x.id === 'zwiebel');
  const ka = b.find((x) => x.id === 'kaffee');
  check(zw && zw.faelle === 50, `Abendbrot mit dem Knopf: Zwiebel mit allen 50 Fällen (${zw && zw.faelle})`);
  check(ka && !['auffaellig', 'moeglich'].includes(einstufung(ka)), `und Kaffee wird nicht zum Auslöser (${ka && einstufung(ka)})`);
}

// Mit „nach dem Essen" ist die Reihenfolge gesagt: nach dem Essen.
const gebunden = knopfTage.map((e) => (e.art === 'beschwerde'
  ? { ...e, um: '20:00', bezug: 'nach', bezugMahlzeit: `a${e.id.slice(1)}` } : e));
const eb2 = essensbezug(gebunden);
check(eb2.nachDemEssen === 9 && eb2.nuechtern === 0, `„abends, nach dem Essen" zählt nach dem Essen (${eb2.nachDemEssen})`);
check(
  folgende(gebunden, gebunden[2], 4).length === 1 && wertNach(gebunden, gebunden[2], 4) === 5,
  'und folgt dem Abendessen in der Bilanz',
);

// Eine genaue Mahlzeit und eine Beschwerde „abends" ohne Bezug: ebenso offen.
const genauesAbendessen = { id: 'ga', art: 'essen', am: T, um: '18:45', zutaten: [] };
const abendsOhne = { id: 'ao', art: 'beschwerde', am: T, um: '19:30', ungefaehr: true, tageszeit: 'abends', staerke: 6 };
check(reihenfolgeUnklar(genauesAbendessen, abendsOhne), 'auch gegen ein genau eingetragenes Abendessen ist „abends" offen');
check(
  folgende([genauesAbendessen, abendsOhne], genauesAbendessen, 4).length === 0
    && wertNach([genauesAbendessen, abendsOhne], genauesAbendessen, 4) === 6,
  'sie folgt ihm nicht nach der Uhr – in der Bilanz zählt sie als offen dazu',
);
check(stundenSeitEssen([genauesAbendessen, abendsOhne], abendsOhne) === null, 'und der Abstand zum Essen bleibt unbekannt');
// Gegenprobe: genau gegen genau rechnet weiter wie immer.
const genaueBeschwerde = { id: 'gb', art: 'beschwerde', am: T, um: '19:30', staerke: 6 };
check(
  !reihenfolgeUnklar(genauesAbendessen, genaueBeschwerde)
    && folgende([genauesAbendessen, genaueBeschwerde], genauesAbendessen, 4).length === 1
    && Math.abs(stundenSeitEssen([genauesAbendessen, genaueBeschwerde], genaueBeschwerde) - 0.75) < 1e-9,
  'genaue Zeiten gegeneinander rechnen unverändert',
);
// Eine andere Tageszeit ist nicht offen: „morgens" liegt vor dem Abendessen.
const morgensOhne = { ...abendsOhne, id: 'mo', um: '08:00', tageszeit: 'morgens' };
check(!reihenfolgeUnklar(genauesAbendessen, morgensOhne), '„morgens" gegen ein Abendessen hat eine klare Reihenfolge');

/*
 * „Nach dem Essen" ohne die Mahlzeit dazu: Gegessen wurde, nur steht es
 * nicht da. Mit der letzten eingetragenen davor – dem Mittag – zählte es als
 * nüchtern, und neun solche Abende ergäben „Nüchternschmerz".
 */
const ohneAbendessen = knopfTage.filter((e) => !e.id.startsWith('a'))
  .map((e) => (e.art === 'beschwerde' ? { ...e, um: '20:00', bezug: 'nach', bezugMahlzeit: null } : e));
const eb3 = essensbezug(ohneAbendessen);
check(eb3.nuechtern === 0 && eb3.unbekannt === 9, `„abends, nach dem Essen" ohne Abendessen zählt nicht als nüchtern (${eb3.nuechtern}, unbekannt ${eb3.unbekannt})`);
check(
  !bildLesen({ eintraege: ohneAbendessen, tage: tageDazu }).muster.some((m) => m.id === 'nuechtern'),
  'und die Einordnung nennt keinen Nüchternschmerz',
);
const beimOhne = ohneAbendessen.map((e) => (e.art === 'beschwerde' ? { ...e, um: '19:40', bezug: 'beim' } : e));
check(essensbezug(beimOhne).nuechtern === 0, '„beim Essen" ohne Mahlzeit ebenso');
const mittagsOhne = knopfTage.filter((e) => e.id.startsWith('f')).concat(knopfTage.filter((e) => e.art === 'beschwerde')
  .map((e) => ({ ...e, um: '13:00', tageszeit: 'mittags', bezug: 'nach', bezugMahlzeit: null })));
check(essensbezug(mittagsOhne).nuechtern === 0, '„mittags, nach dem Essen" ohne Mittagessen, nur mit Frühstück: auch nicht nüchtern');
const fremdeMahlzeit = ohneAbendessen.map((e) => (e.art === 'beschwerde' ? { ...e, bezugMahlzeit: 'gibtsnicht' } : e));
check(stundenSeitEssen(fremdeMahlzeit, fremdeMahlzeit.find((e) => e.art === 'beschwerde')) === null,
  'eine Kennung, die auf keine Mahlzeit zeigt, macht es nicht besser');
const vorOhne = ohneAbendessen.map((e) => (e.art === 'beschwerde' ? { ...e, um: '19:00', bezug: 'vor' } : e));
check(essensbezug(vorOhne).nuechtern === 9, '„vor dem Essen" ohne Abendessen rechnet weiter vom Mittag aus');
check(essensbezug(gebunden).nachDemEssen === 9, 'gebunden an ein eingetragenes Abendessen bleibt es „nach dem Essen"');

/*
 * Der Rat „Für heute" fragt, wie lange das Essen jetzt her ist – ohne die
 * Reihenfolge-Frage einer Beschwerde. Ein Mittagessen nur mit „mittags"
 * liegt vor jetzt, wenn es schon eingetragen ist.
 */
const mittagKnopf = [{ id: 'mk', art: 'essen', am: T, um: '12:30', ungefaehr: true, tageszeit: 'mittags', zutaten: [] }];
check(stundenSeitLetzterMahlzeit(mittagKnopf, T, '13:30') === 1, 'Mittag per Knopf, jetzt 13:30: eine Stunde her');
check(stundenSeitLetzterMahlzeit([{ ...mittagKnopf[0], ungefaehr: false, tageszeit: null }], T, '13:30') === 1,
  'genau eingetragen ebenso');
check(stundenSeitLetzterMahlzeit(mittagKnopf, T, '11:40') === 0, 'die Knopfzeit liegt noch vor uns: gerade gegessen, nicht gestern');
check(stundenSeitLetzterMahlzeit(mittagKnopf, T, '15:10') > 2, 'um zehn nach drei ist es länger her');
check(stundenSeitLetzterMahlzeit([], T, '13:30') === null, 'ohne Mahlzeit: unbekannt');

// Das Zeitprofil fragt nach Stunden; Knopfzeiten haben keine.
const spaeter = { id: 'n', art: 'notiz', am: '2026-10-30', um: '08:00', text: 'x' };
const fw = fensterWerte([genauesAbendessen, abendsOhne, spaeter])[0].werte;
check(!fw.frueh.beobachtbar && !fw.mittel.beobachtbar, 'das Fenster eines Abendessens mit offener Beschwerde gilt als nicht erhoben');
const zb = zeitBild(gebunden);
check(
  zb.zugeordnet === 0 && zb.satz.includes('9 weitere sind mit ungefährer Zeit eingetragen'),
  `das Zeitbild zählt Knopfzeiten nicht als Stunden – und sagt das (${zb.zugeordnet})`,
);
{
  /*
   * Eine genaue Beschwerde vor einem Abendbrot, das nur mit „abends"
   * eingetragen ist: Welche Mahlzeit vorausging, ist offen – also auch die
   * Stunden seit dem Mittag. Sonst stünde da „4–8 Stunden, Dickdarm".
   */
  const e = [];
  for (let i = 1; i <= 12; i++) {
    const am = `2026-09-${String(i + 10).padStart(2, '0')}`;
    e.push({ id: `pm${i}`, art: 'essen', am, um: '12:30', zutaten: [] });
    e.push({ id: `pa${i}`, art: 'essen', am, um: '19:30', ungefaehr: true, tageszeit: 'abends', zutaten: [] });
    e.push({ id: `pb${i}`, art: 'beschwerde', am, um: '19:00', staerke: 5 });
  }
  const z = zeitBild(e);
  check(z.zugeordnet === 0 && !z.schwerpunkt && z.satz.includes('12 weitere'),
    `genaue Beschwerde vor einem Abendbrot mit dem Knopf: kein erfundener Abstand (${z.zugeordnet}, ${z.schwerpunkt || '–'})`);
  check(essensbezug(e).unbekannt === 12, 'und die Nüchternrechnung sagt dasselbe: unbekannt');
  const genau = e.map((x) => (x.id.startsWith('pa') ? { ...x, ungefaehr: false, tageszeit: null } : x));
  const zg = zeitBild(genau);
  check(zg.zugeordnet === 12, `Gegenprobe mit genauem Abendbrot: zugeordnet wie immer (${zg.zugeordnet})`);
}

// Der Provokationstest: ein Frühstück „morgens" am Testmorgen macht den
// Durchgang unsauber, statt auf derselben Minute unsichtbar zu bleiben.
const lauf = laufBild(
  [{ id: 'fr', art: 'essen', am: T, um: '08:00', ungefaehr: true, tageszeit: 'morgens', zutaten: [] }],
  { am: T, um: '08:00' },
  { nuechtern: 4, fenster: 4 },
);
check(!lauf.sauber && lauf.warum.join(' ').includes('ohne genaue Uhrzeit'), `ein ungefähres Frühstück am Testmorgen macht den Durchgang unsauber (${lauf.warum.join('; ')})`);

/* ---------- 12. Der Bericht nennt die Dosis ---------- */

const zettel = arztBericht({
  eintraege: [
    ...['10', '11', '12'].map((d) => ({ id: `p${d}`, art: 'medikament', am: `2026-10-${d}`, um: '07:30', mittel: 'Pantoprazol', dosis: '40 mg' })),
    { id: 'p20', art: 'medikament', am: '2026-10-13', um: '07:30', mittel: 'pantoprazol', dosis: '20 mg' },
    { id: 'ib', art: 'medikament', am: '2026-10-13', um: '19:00', mittel: 'Ibuprofen', dosis: '' },
    alterAbend,
  ],
  tage: {},
}, '2026-10-01', '2026-10-31');
check(zettel.includes('Pantoprazol 40 mg – 3 Mal'), 'der Bericht nennt „Pantoprazol 40 mg – 3 Mal"');
check(zettel.includes('pantoprazol 20 mg – 1 Mal'), 'eine andere Dosis steht für sich');
check(zettel.includes('Ibuprofen – 1 Mal'), 'ohne Dosis steht nur der Name');
const nachZeit = zettel.split('BESCHWERDEN NACH TAGESZEIT')[1] || '';
check(/^\s+abends\s/m.test(nachZeit) && !/nachmittags/.test(nachZeit.split('\n\n')[0]), 'und zählt „abends" von 18:30 unter abends');

/* ==================== Im Browser, als iPhone ==================== */

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 640 };

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: SCHMAL, userAgent: IPHONE, serviceWorkers: 'block', hasTouch: true, isMobile: true,
});
await ctx.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
});
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const heute = vorTagen(0);
const gestern = vorTagen(1);
const vorgestern = vorTagen(2);
const kurz = (ms = 150) => page.waitForTimeout(ms);
const speicher = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const sauber = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const meldung = async () => sauber(await page.locator('#toast').textContent());
const uhr = () => page.locator('#bogenUhr').inputValue();
const tippe = async (act, id) => {
  await page.locator(`[data-act="${act}"][data-id="${id}"]`).first().click();
  await kurz();
};
const neu = async (art) => { await page.locator(`[data-act="neu"][data-art="${art}"]`).click(); await kurz(); };
const speichern = async () => { await page.locator('[data-act="bogen-speichern"]').click(); await kurz(300); };
const zu = async () => { await page.locator('button.bogen-zu').click(); await kurz(); };
const zuTag = async (iso) => { await page.locator('.tag-datum').fill(iso); await kurz(200); };
const ohneQuerscrollen = async (wo) => {
  const m = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(m[0] <= m[1], `${wo}: nichts ragt über den Rand (${m[0]} ≤ ${m[1]})`);
};
const GRUND = {
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
};
async function setze(stand) {
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, { ...GRUND, ...stand }]);
  await page.reload({ waitUntil: 'networkidle' });
  await kurz(250);
}
const essen = (id, am, um, extra = {}) => ({ id, art: 'essen', am, um, was: id, zutaten: [], portion: 'normal', ...extra });

/* ---------- 1. Nur Mahlzeiten der gewählten Tageszeit ---------- */

await setze({
  eintraege: [
    essen('frueh', gestern, '07:45'),
    essen('abendbrot', vorgestern, '18:00'),
    essen('spaet', vorTagen(3), '19:10'),
  ],
});
await zuTag(gestern);
await neu('beschwerde');
await tippe('zeit-tageszeit', 'abends');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '20:00', `„abends, nach dem Essen" rastet nicht am Frühstück um 07:45 ein (${await uhr()})`);
check(
  sauber(await page.locator('.zeit-hinweis').textContent()).includes('abends noch keine Mahlzeit'),
  'der Bogen sagt, dass abends noch keine Mahlzeit steht und mit der Tageszeit gerechnet wird',
);
// Ohne gewählte Tageszeit gilt die Tageszeit der Uhrzeit: 09:00 findet das
// Frühstück, 20:30 nicht.
await tippe('zeit-bezug', 'nach');
await page.locator('#bogenUhr').fill('09:00');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '08:15', `ohne Tageszeit gilt die nächste Mahlzeit derselben Tageszeit, das Frühstück (${await uhr()})`);
await tippe('zeit-bezug', 'nach');
await page.locator('#bogenUhr').fill('20:30');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '21:00', `20:30 und „nach dem Essen" rastet nicht am Frühstück ein, 13 Stunden früher (${await uhr()})`);
check(
  sauber(await page.locator('.zeit-hinweis').textContent()).includes('um diese Zeit steht an diesem Tag noch keine Mahlzeit'),
  'und der Hinweis sagt „um diese Zeit", nicht „an diesem Tag keine Mahlzeit" – das Frühstück steht ja da',
);
// Ein leeres Uhrzeitfeld und „nach dem Essen": keine 00:30.
await tippe('zeit-bezug', 'nach');
await page.locator('#bogenUhr').fill('');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '' && (await meldung()).includes('Erst „morgens“'),
  `ohne Uhrzeit und Tageszeit rechnet „nach dem Essen" nichts aus – es fragt (${await uhr()})`);
await zu();

await zuTag(vorTagen(3));
await neu('medikament');
await tippe('zeit-tageszeit', 'mittags');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '13:00', `„mittags, nach dem Essen" an einem Tag nur mit Abendessen ergibt keine 19:40 (${await uhr()})`);
await zu();

// Das Abendbrot um sechs ist „abends" – sonst stünde dort „noch keine Mahlzeit".
await zuTag(vorgestern);
await neu('beschwerde');
await tippe('zeit-tageszeit', 'abends');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '18:30', `„abends, nach dem Essen" findet das Abendbrot um 18:00 (${await uhr()})`);
await zu();

/* ---------- 2. Nachtragen in beliebiger Reihenfolge ---------- */

await setze({
  eintraege: [
    essen('abend', gestern, '19:00'),
    { id: 'abendlich', art: 'beschwerde', am: gestern, um: '19:30', staerke: 3, ungefaehr: true, tageszeit: 'abends', bezug: 'nach', bezugMahlzeit: 'abend' },
    { id: 'genau', art: 'medikament', am: gestern, um: '06:50', mittel: 'Pantoprazol', dosis: '40 mg' },
  ],
});
await zuTag(gestern);
await neu('medikament');
await page.locator('#bogenMittel').fill('L-Thyroxin');
await tippe('zeit-tageszeit', 'morgens');
await tippe('zeit-bezug', 'vor');
check(await uhr() === '07:30', `ohne Frühstück: „morgens, vor dem Essen" von der Tageszeit aus (${await uhr()})`);
await speichern();
await neu('essen');
await page.locator('#bogenWas').fill('Brot');
await page.locator('#bogenUhr').fill('09:30');
await speichern();
let s = await speicher();
const thyrox = () => s.eintraege.find((e) => e.mittel === 'L-Thyroxin');
const fruehstueck = () => s.eintraege.find((e) => e.was === 'Brot');
check(
  thyrox().um === '09:00' && thyrox().bezugMahlzeit === fruehstueck().id,
  `das Frühstück danach eingetragen: die Tablette rückt an 09:30 heran (${thyrox().um})`,
);
check((await meldung()).includes('1 Eintrag an die Mahlzeit angepasst.'), `und die App sagt das (${await meldung()})`);
check(s.eintraege.find((e) => e.id === 'genau').um === '06:50', 'eine genau gesetzte Uhrzeit bleibt, wo sie war');
check(
  s.eintraege.find((e) => e.id === 'abendlich').um === '19:30',
  'ein Eintrag einer anderen Tageszeit bleibt ebenfalls',
);

// Verschoben: Die Tablette geht mit.
await page.locator(`[data-act="bearbeiten"][data-id="${fruehstueck().id}"]`).click();
await kurz();
await page.locator('#bogenUhr').fill('08:10');
await speichern();
s = await speicher();
check(thyrox().um === '07:40', `das Frühstück auf 08:10 verschoben: die Tablette auf 07:40 (${thyrox().um})`);

// Auf einen anderen Tag verschoben: zurück zur Tageszeit.
await page.locator(`[data-act="bearbeiten"][data-id="${fruehstueck().id}"]`).click();
await kurz();
await page.locator('#bogenTag').fill(vorgestern);
await kurz();
await speichern();
s = await speicher();
check(
  thyrox().um === '07:30' && !thyrox().bezugMahlzeit,
  `das Frühstück auf einen anderen Tag verschoben: wieder von der Tageszeit aus (${thyrox().um})`,
);

// Gelöscht: an eine andere passende Mahlzeit, sonst an die Tageszeit.
await setze({
  eintraege: [
    essen('mittag1', gestern, '12:00'),
    essen('mittag2', gestern, '14:00'),
    { id: 'mb', art: 'beschwerde', am: gestern, um: '12:30', staerke: 4, ungefaehr: true, tageszeit: 'mittags', bezug: 'nach', bezugMahlzeit: 'mittag1' },
  ],
});
await zuTag(gestern);
// Zwei Tipps: Der erste fragt „Löschen?", der zweite löscht.
await page.locator('[data-act="loeschen"][data-id="mittag1"]').click();
await page.locator('[data-act="loeschen"][data-id="mittag1"]').click();
await kurz(300);
s = await speicher();
let mb = s.eintraege.find((e) => e.id === 'mb');
check(mb.um === '14:30' && mb.bezugMahlzeit === 'mittag2', `die Mahlzeit gelöscht: an die andere Mahlzeit des Mittags (${mb.um})`);
check((await meldung()).includes('an die Mahlzeit angepasst'), `mit Meldung (${await meldung()})`);
// Zwei Tipps: Der erste fragt „Löschen?", der zweite löscht.
await page.locator('[data-act="loeschen"][data-id="mittag2"]').click();
await page.locator('[data-act="loeschen"][data-id="mittag2"]').click();
await kurz(300);
s = await speicher();
mb = s.eintraege.find((e) => e.id === 'mb');
check(mb.um === '13:00' && !mb.bezugMahlzeit, `die letzte Mahlzeit gelöscht: an die Tageszeit (${mb.um})`);
check((await meldung()).includes('1 Eintrag an die Tageszeit angepasst.'), `mit Meldung (${await meldung()})`);

/*
 * Ohne Tageszeit, in beliebiger Reihenfolge nachgetragen: Die Beschwerde
 * „20:30, nach dem Essen" rastet am Abendessen ein, nie am Frühstück – auch
 * wenn das Frühstück zuerst nachgetragen wird. Vorher wanderte sie dann auf
 * halb acht am Morgen, und das Abendessen holte sie nicht mehr zurück.
 */
async function abendsOhneTageszeit(reihenfolge) {
  await setze({ eintraege: [] });
  await zuTag(gestern);
  await neu('beschwerde');
  await page.locator('#bogenUhr').fill('20:30');
  await tippe('zeit-bezug', 'nach');
  await page.locator('.stufe[data-n="5"]').click();
  await speichern();
  const meldungen = [];
  for (const [was, um] of reihenfolge) {
    await neu('essen');
    await page.locator('#bogenWas').fill(was);
    await page.locator('#bogenUhr').fill(um);
    await speichern();
    meldungen.push(await meldung());
    const st = await speicher();
    const b = st.eintraege.find((e) => e.art === 'beschwerde');
    const m = (id) => (st.eintraege.find((e) => e.id === id) || {}).was || null;
    meldungen.push({ um: b.um, an: m(b.bezugMahlzeit) });
  }
  return meldungen;
}
{
  const r = await abendsOhneTageszeit([['Frühstück', '07:00'], ['Abendessen', '19:45']]);
  check(r[1].um === '21:00' && r[1].an === null && !r[0].includes('angepasst'),
    `erst das Frühstück: die Abendbeschwerde bleibt um 21:00, ohne Meldung (${r[1].um}, ${r[0]})`);
  check(r[3].um === '20:15' && r[3].an === 'Abendessen' && r[2].includes('1 Eintrag an die Mahlzeit angepasst.'),
    `dann das Abendessen: sie rückt an 19:45 heran (${r[3].um}, ${r[3].an})`);
  const u = await abendsOhneTageszeit([['Abendessen', '19:45'], ['Frühstück', '07:00']]);
  check(u[3].um === '20:15' && u[3].an === 'Abendessen' && !u[2].includes('angepasst'),
    `in umgekehrter Reihenfolge derselbe Stand (${u[3].um}, ${u[3].an})`);
}
{
  /*
   * Eine Tablette „vor dem Essen", Uhrzeit 07:50, ohne Tageszeit. Ein
   * Abendessen danach verschiebt sie nicht; das Frühstück schon. Und wird das
   * Frühstück gelöscht, springt sie nicht an das Mittagessen, sondern kommt
   * mit dem neuen Frühstück zurück.
   */
  await setze({ eintraege: [] });
  await zuTag(gestern);
  await neu('medikament');
  await page.locator('#bogenMittel').fill('L-Thyroxin');
  await page.locator('#bogenUhr').fill('07:50');
  await tippe('zeit-bezug', 'vor');
  check(await uhr() === '07:20', `ohne Mahlzeit von der Uhrzeit aus (${await uhr()})`);
  await speichern();
  const tablette = async () => (await speicher()).eintraege.find((e) => e.mittel === 'L-Thyroxin');
  let t = await tablette();
  check(t.tageszeit === null && t.bezugMahlzeit === null && t.um === '07:20', 'gespeichert ohne Tageszeit und ohne Mahlzeit');
  await neu('essen');
  await page.locator('#bogenWas').fill('Abendbrot');
  await page.locator('#bogenUhr').fill('19:00');
  await speichern();
  t = await tablette();
  check(t.um === '07:20' && !t.bezugMahlzeit && !(await meldung()).includes('angepasst'),
    `ein Abendessen schiebt die Morgentablette nicht auf 18:30 (${t.um})`);
  await neu('essen');
  await page.locator('#bogenWas').fill('Mittag');
  await page.locator('#bogenUhr').fill('12:30');
  await speichern();
  check((await tablette()).um === '07:20', 'ein Mittagessen ebenso wenig');
  await neu('essen');
  await page.locator('#bogenWas').fill('Brot');
  await page.locator('#bogenUhr').fill('08:00');
  await speichern();
  t = await tablette();
  let st = await speicher();
  const brot = () => st.eintraege.find((e) => e.was === 'Brot');
  check(t.um === '07:30' && t.bezugMahlzeit === brot().id, `das Frühstück dazu: 07:30 vor dem Frühstück (${t.um})`);
  await page.locator(`[data-act="loeschen"][data-id="${brot().id}"]`).click();
  await page.locator(`[data-act="loeschen"][data-id="${brot().id}"]`).click();
  await kurz(300);
  t = await tablette();
  check(t.um === '07:30' && !t.bezugMahlzeit, `das Frühstück gelöscht: sie bleibt am Morgen, nicht 12:00 vor dem Mittag (${t.um})`);
  await neu('essen');
  await page.locator('#bogenWas').fill('Brot');
  await page.locator('#bogenUhr').fill('08:00');
  await speichern();
  t = await tablette();
  st = await speicher();
  check(t.um === '07:30' && t.bezugMahlzeit === brot().id, `das Frühstück neu eingetragen: wieder daran (${t.um})`);
}
{
  /*
   * Zwei Zusagen, die eine Mutationsprobe ohne Prüfung fand: „abends" beginnt
   * um 15 Uhr, und ein Eintrag ohne Tageszeit, der noch an keiner Mahlzeit
   * hängt, rückt beim Anlegen einer passenden nach.
   */
  await setze({ eintraege: [essen('kaffee', vorTagen(4), '16:00'), essen('frueh4', vorTagen(4), '07:45'), essen('spaetmittag', vorTagen(4), '14:45')] });
  await zuTag(vorTagen(4));
  await neu('beschwerde');
  await tippe('zeit-tageszeit', 'abends');
  await tippe('zeit-bezug', 'nach');
  check(await uhr() === '16:30', `„abends" beginnt um 15 Uhr: die Mahlzeit um 16:00 zählt dazu (${await uhr()})`);
  await tippe('zeit-tageszeit', 'mittags');
  check(await uhr() === '15:15', `und 14:45 ist noch mittags (${await uhr()})`);
  await zu();
  await setze({ eintraege: [] });
  await zuTag(gestern);
  await neu('medikament');
  await page.locator('#bogenMittel').fill('Iberogast');
  await page.locator('#bogenUhr').fill('09:00');
  await tippe('zeit-bezug', 'nach');
  check(await uhr() === '09:30', `nur „nach dem Essen", ohne Mahlzeit: von 09:00 aus (${await uhr()})`);
  await speichern();
  let st = await speicher();
  const ib = () => st.eintraege.find((e) => e.mittel === 'Iberogast');
  check(ib().tageszeit === null && ib().bezugMahlzeit === null, 'ohne Tageszeit und ohne Mahlzeit gespeichert');
  await neu('essen');
  await page.locator('#bogenWas').fill('Müsli');
  await page.locator('#bogenUhr').fill('10:00');
  await speichern();
  st = await speicher();
  check(ib().um === '10:30' && ib().bezugMahlzeit === st.eintraege.find((e) => e.was === 'Müsli').id
    && (await meldung()).includes('1 Eintrag an die Mahlzeit angepasst.'),
  `die Mahlzeit dazu: es rückt nach, mit Meldung (${ib().um})`);
}

/* ---------- 3. Ein anderes Datum rechnet die Zeit neu ---------- */

await setze({
  eintraege: [essen('fg', gestern, '07:45'), essen('fv', vorgestern, '09:10')],
});
await zuTag(gestern);
await neu('beschwerde');
await tippe('zeit-tageszeit', 'morgens');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '08:15', `gestern: nach dem Frühstück um 07:45 (${await uhr()})`);
await page.locator('#bogenTag').fill(vorgestern);
await kurz();
check(await uhr() === '09:40', `das Datum auf vorgestern geändert: nach dem Frühstück um 09:10 (${await uhr()})`);
await page.locator('#bogenTag').fill(vorTagen(3));
await kurz();
check(await uhr() === '08:30', `ein Tag ohne Frühstück: von der Tageszeit aus (${await uhr()})`);
check(
  sauber(await page.locator('.zeit-hinweis').textContent()).includes('noch keine Mahlzeit'),
  'und der Hinweis dazu steht da',
);
await page.locator('.stufe[data-n="3"]').click();
await speichern();
s = await speicher();
const umgezogen = s.eintraege.find((e) => e.art === 'beschwerde');
check(
  umgezogen && umgezogen.am === vorTagen(3) && umgezogen.um === '08:30' && umgezogen.bezugMahlzeit === null,
  `gespeichert wird der neue Tag mit seiner Zeit (${umgezogen && `${umgezogen.am} ${umgezogen.um}`})`,
);

/* ---------- 6. Dasselbe Mittel morgens und abends ---------- */

const LANG = 'Metoclopramid-ratiopharm Tropfen';
await setze({
  standardMittel: [
    { id: 'pm', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
    { id: 'pa', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'abends', bezug: null },
    { id: 'mc', mittel: LANG, dosis: '10 mg', tageszeit: null, bezug: null },
  ],
  eintraege: [
    essen('fh', gestern, '07:45'),
    { id: 'falsch', art: 'medikament', am: gestern, um: '19:00', mittel: 'Pantoprazol', dosis: '20 mg' },
  ],
});
await zuTag(gestern);
const reihe = page.locator('[data-act="standard-eintragen"]');
const texte = async () => (await reihe.allTextContents()).map(sauber);
let knoepfe = await texte();
check(
  knoepfe[0] === 'Pantoprazol 40 mg · morgens' && knoepfe[1] === 'Pantoprazol 40 mg · abends',
  `dasselbe Mittel morgens und abends: zwei Knöpfe mit üblicher Zeit (${knoepfe.slice(0, 2).join(' | ')})`,
);
check(
  knoepfe[2].endsWith('10 mg') && knoepfe[2].includes('…') && !knoepfe[2].includes(LANG),
  `ein langer Name wird gekürzt, die Dosis nicht (${knoepfe[2]})`,
);
check(!knoepfe.some((k) => k.includes('✓')), 'die Einnahme mit anderer Dosis setzt kein Häkchen');
await page.screenshot({ path: `${SHOT}/zeit-mittel-tag.png`, fullPage: true });
await ohneQuerscrollen('Tag-Reiter mit langen Mitteln, 320 Pixel');

await reihe.first().click();
await kurz(300);
knoepfe = await texte();
check(knoepfe[0].includes('✓') && !knoepfe[1].includes('✓'), 'die Morgentablette eingetragen: Häkchen nur am Morgenknopf');
const aria = await reihe.first().getAttribute('aria-label');
check(aria.includes('gestern schon eingetragen') && !aria.includes('heute'), `die Ansage nennt den richtigen Tag (${aria})`);
check(aria.endsWith('noch einmal eintragen'), 'und dass ein Tipp ein zweites Mal einträgt – wie bei den Aktivitäten');
check(
  (await reihe.nth(1).getAttribute('aria-label')).includes('gestern eintragen'),
  'und beim anderen, dass er für gestern einträgt',
);
check(
  (await reihe.nth(2).getAttribute('aria-label')).endsWith('gestern, die Zeit wählst du im Bogen'),
  `ohne übliche Zeit sagt die Ansage, dass sich der Bogen öffnet (${await reihe.nth(2).getAttribute('aria-label')})`,
);
check(
  sauber(await page.locator('.schnell .feld-name', { hasText: 'Meine Mittel' }).textContent()).includes('ohne übliche Zeit wählst du sie im Bogen'),
  'und die Überschrift der Reihe ebenso',
);
await neu('medikament');
check(
  await page.getByRole('button', { name: 'Pantoprazol 40 mg morgens, vor dem Essen', exact: true }).count() === 1
    && await page.getByRole('button', { name: 'Pantoprazol 40 mg abends', exact: true }).count() === 1,
  'im Bogen liest VoiceOver Name und Zeit getrennt, nicht „40 mgmorgens"',
);
await zu();
await zuTag(vorTagen(5));
check(
  (await reihe.first().getAttribute('aria-label')).includes(`am ${sauber(await page.locator('.tagkopf h2').textContent())}`),
  'an einem älteren Tag mit dem Datum',
);

/* ---------- 7. „Meine Mittel" unter „Mehr" ---------- */

await setze({ eintraege: [essen('x', gestern, '08:00')] });
check(
  sauber(await page.locator('.mittel-tipp').textContent()).includes('Deine täglichen Mittel kannst du einmal'),
  'ohne eigene Mittel sagt der Tag-Reiter, wo man sie anlegt',
);
await page.locator('[data-act="meine-mittel-zeigen"]').click();
await kurz(300);
check(await page.locator('#mmName').count() === 1, 'ein Tipp darauf führt zur Karte, das Formular offen');
check(await page.evaluate(() => document.activeElement && document.activeElement.id === 'mmName'), 'der Fokus steht im Namensfeld');
{
  const lage = await page.evaluate(() => {
    const h = document.querySelector('#meineMittel h3').getBoundingClientRect();
    const leiste = document.querySelector('.topbar').getBoundingClientRect();
    const mitte = document.elementFromPoint(h.left + 10, h.top + h.height / 2);
    return { oben: h.top, leiste: leiste.bottom, trifft: !!mitte && mitte.closest('h3') !== null };
  });
  check(lage.oben >= lage.leiste && lage.trifft,
    `die Überschrift „Meine Mittel" steht unter der Kopfleiste, nicht dahinter (${Math.round(lage.oben)} ≥ ${Math.round(lage.leiste)})`);
}
await page.locator('#mmName').fill('Pantoprazol');
await page.locator('#mmDosis').fill('40 mg');
await tippe('mm-tageszeit', 'morgens');
await tippe('mm-bezug', 'vor');
await ohneQuerscrollen('Formular „Meine Mittel", 320 Pixel');
await page.locator('[data-act="mm-speichern"]').click();
await kurz(300);
s = await speicher();
check(
  s.standardMittel.length === 1 && s.standardMittel[0].tageszeit === 'morgens' && s.standardMittel[0].bezug === 'vor',
  'angelegt mit Dosis und üblicher Zeit',
);
check(s.eintraege.length === 1, 'ohne dass eine Einnahme entsteht');
check((await meldung()).includes('Eingetragen ist damit noch nichts'), 'und die Meldung sagt das');
const karte = async () => sauber(await page.locator('#meineMittel').textContent());
check((await karte()).includes('Pantoprazol 40 mg') && (await karte()).includes('morgens, vor dem Essen'), 'die Liste zeigt Name, Dosis und Zeit');

// Dasselbe Mittel für abends – ein zweiter Eintrag, kein Überschreiben.
await page.locator('[data-act="meinmittel-neu"]').focus();
await page.keyboard.press('Enter');
await kurz();
check(await page.evaluate(() => document.activeElement && document.activeElement.id === 'mmName'),
  '„Mittel hinzufügen" mit der Tastatur: der Fokus geht ins Namensfeld');
await page.locator('#mmName').fill('Pantoprazol');
await page.locator('#mmDosis').fill('40 mg');
await tippe('mm-tageszeit', 'abends');
await page.locator('[data-act="mm-speichern"]').click();
await kurz(300);
s = await speicher();
check(s.standardMittel.length === 2, 'dasselbe Mittel abends kommt als zweites dazu');

// Ändern: Dosis und Zeit. (Das letzte in der Liste – fehlt das zweite, hat
// die Prüfung davor das schon gemeldet.)
const abendlich = () => s.standardMittel[s.standardMittel.length - 1];
await page.locator(`[data-act="meinmittel-aendern"][data-id="${abendlich().id}"]`).focus();
await page.keyboard.press('Enter');
await kurz();
check(await page.evaluate(() => document.activeElement && document.activeElement.id === 'mmName'),
  '„Ändern": der Fokus geht ins Namensfeld');
await page.locator('#mmDosis').fill('20 mg');
await tippe('mm-bezug', 'nach');
await page.locator('[data-act="mm-speichern"]').click();
await kurz(300);
s = await speicher();
check(
  abendlich().dosis === '20 mg' && abendlich().bezug === 'nach' && abendlich().tageszeit === 'abends',
  `ändern nimmt Dosis und Bezug (${JSON.stringify(abendlich())})`,
);
await page.screenshot({ path: `${SHOT}/zeit-mittel-mehr.png`, fullPage: true });

// Entfernen: zwei Tipps, wie beim Löschen im Strang – und „Rückgängig".
const vorWeg = s.standardMittel.length;
const wegId = abendlich().id;
await page.locator(`[data-act="meinmittel-weg"][data-id="${wegId}"]`).click();
await kurz(300);
check((await speicher()).standardMittel.length === vorWeg, 'ein Tipp aufs × entfernt noch nichts, er fragt');
check(sauber(await page.locator(`[data-act="meinmittel-weg"][data-id="${wegId}"]`).textContent()) === 'Entfernen?', 'der Knopf fragt „Entfernen?"');
await ohneQuerscrollen('„Entfernen?" unter „Meine Mittel", 320 Pixel');
await page.locator(`[data-act="meinmittel-weg"][data-id="${wegId}"]`).click();
await kurz(300);
s = await speicher();
check(s.standardMittel.length === vorWeg - 1 && s.eintraege.length === 1, 'der zweite entfernt es aus der Liste, sonst nichts');
check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('toast-knopf')),
  'der Fokus steht danach auf „Rückgängig", nicht am Anfang der Seite');
await page.locator('[data-act="entfernt-zurueck"]').click();
await kurz(300);
s = await speicher();
check(s.standardMittel.length === vorWeg && abendlich().id === wegId && abendlich().dosis === '20 mg',
  '„Rückgängig" holt es mit Kennung und Dosis an seine Stelle zurück');
await page.locator(`[data-act="meinmittel-weg"][data-id="${wegId}"]`).click();
await page.locator(`[data-act="meinmittel-weg"][data-id="${wegId}"]`).click();
await kurz(300);
s = await speicher();
check(s.standardMittel.length === vorWeg - 1, 'und ein zweites Mal entfernt');

// Im Bogen: merken und eintragen – mit eigener Meldung.
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await kurz();
await zuTag(gestern);
await neu('medikament');
await page.locator('#bogenMittel').fill('Iberogast');
await page.locator('#bogenDosis').fill('20 Tropfen');
await page.locator('[data-act="standard-umschalten"]').click();
await kurz();
await speichern();
check((await meldung()) === 'Eingetragen und bei deinen Mitteln gemerkt.', `„Als mein Mittel merken" + Eintragen sagt es (${await meldung()})`);

// Ein gemerktes gewählt, dann die Dosis geändert: der Bogen sagt es und
// bietet an, das eigene Mittel so zu ändern.
await neu('medikament');
await tippe('standard-waehlen', (await speicher()).standardMittel.find((x) => x.mittel === 'Pantoprazol').id);
check(sauber(await page.locator('#bogenMerken').textContent()).includes('Steht bei deinen Mitteln'), 'gewählt und unverändert: „Steht bei deinen Mitteln"');
await page.locator('#bogenDosis').fill('20 mg');
await kurz();
const merkenText = sauber(await page.locator('#bogenMerken').textContent());
check(
  merkenText.includes('Anders als bei deinen Mitteln') && merkenText.includes('Pantoprazol 40 mg · morgens, vor dem Essen'),
  `die Dosis abweichend getippt: der Bogen sagt es, ohne neu zu zeichnen (${merkenText.slice(0, 80)})`,
);
check(await page.locator('#bogenDosis').evaluate((el) => el === document.activeElement), 'und das Dosisfeld behält den Fokus');
await page.locator('[data-act="standard-anpassen"]').click();
await kurz();
await speichern();
s = await speicher();
const pp = s.standardMittel.filter((x) => x.mittel === 'Pantoprazol');
check(pp.length === 1 && pp[0].dosis === '20 mg' && pp[0].tageszeit === 'morgens', '„Dort so ändern" ändert das eigene Mittel, statt ein zweites anzulegen');
check((await meldung()).includes('dein Mittel angepasst'), `mit Meldung (${await meldung()})`);

/* ---------- 8. Eine gewählte Zeit bleibt ---------- */

await neu('medikament');
await tippe('zeit-tageszeit', 'abends');
await tippe('standard-waehlen', pp[0].id);
check(
  await uhr() === '19:30'
    && await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').getAttribute('aria-pressed') === 'true'
    && await page.locator('[data-act="zeit-bezug"][aria-pressed="true"]').count() === 0,
  `erst „abends", dann das Morgenmittel: die Zeit bleibt abends (${await uhr()})`,
);
check(await page.locator('#bogenDosis').inputValue() === '20 mg', 'Name und Dosis kommen trotzdem');
check(sauber(await page.locator('#bogenMerken').textContent()).includes('Anders als bei deinen Mitteln'), 'und der Bogen sagt, dass es von der Vorlage abweicht');
await zu();
await neu('medikament');
await page.locator('#bogenUhr').fill('06:10');
await tippe('standard-waehlen', pp[0].id);
check(await uhr() === '06:10', `eine von Hand gesetzte Uhrzeit bleibt ebenso (${await uhr()})`);
// Eine genaue Uhrzeit sagt, wann es heute war – nicht, dass das Mittel keine
// übliche Zeit mehr hat.
check(sauber(await page.locator('#bogenMerken').textContent()).includes('Steht bei deinen Mitteln'),
  `mit genauer Uhrzeit „Steht bei deinen Mitteln", nicht „Anders als" (${sauber(await page.locator('#bogenMerken').textContent()).slice(0, 50)})`);
await page.locator('#bogenDosis').fill('30 mg');
await kurz();
await page.locator('[data-act="standard-anpassen"]').click();
await kurz();
await speichern();
s = await speicher();
const pp30 = s.standardMittel.find((x) => x.id === pp[0].id);
check(pp30 && pp30.dosis === '30 mg' && pp30.tageszeit === 'morgens' && pp30.bezug === pp[0].bezug,
  `„Dort so ändern" mit genauer Uhrzeit ändert die Dosis und behält die übliche Zeit (${JSON.stringify(pp30)})`);
await page.locator('[data-act="standard-eintragen"]').first().waitFor();
check(sauber(await page.locator('[data-act="standard-eintragen"]').first().textContent()).includes('· morgens'),
  'der Knopf auf dem Tag-Reiter trägt weiter „· morgens"');
await neu('medikament');
await tippe('standard-waehlen', pp[0].id);
check(
  await page.locator('[data-act="zeit-tageszeit"][data-id="morgens"]').getAttribute('aria-pressed') === 'true',
  'ohne gewählte Zeit setzt die Vorlage ihre übliche Zeit',
);
await zu();

/* ---------- 9. „Dazu genommen?" mit Dosis ---------- */

await setze({
  zuletztMittel: ['Ibuprofen', 'Sumatriptan'],
  standardMittel: [
    { id: 'i4', mittel: 'Ibuprofen', dosis: '400 mg', tageszeit: null, bezug: null },
    { id: 'i6', mittel: 'Ibuprofen', dosis: '600 mg', tageszeit: null, bezug: null },
    { id: 'su', mittel: 'Sumatriptan', dosis: '50 mg', tageszeit: null, bezug: null },
  ],
  eintraege: [
    { id: 'alt4', art: 'medikament', am: vorTagen(6), um: '10:00', mittel: 'Ibuprofen', dosis: '400 mg' },
    { id: 'alt6', art: 'medikament', am: vorTagen(3), um: '10:00', mittel: 'ibuprofen', dosis: '600 mg' },
  ],
});
await neu('kopf');
const dazuText = (await page.locator('[data-act="kopf-dazu"]').allTextContents()).map(sauber);
check(dazuText.includes('Ibuprofen 600 mg') && dazuText.includes('Sumatriptan 50 mg'), `die Knöpfe zeigen die Dosis (${dazuText.join(' | ')})`);
await page.locator('.stufe[data-n="6"]').click();
await tippe('kopf-dazu', 'Ibuprofen');
await tippe('kopf-dazu', 'Sumatriptan');
await speichern();
s = await speicher();
const ibu = s.eintraege.find((e) => e.am === heute && e.mittel === 'Ibuprofen');
const suma = s.eintraege.find((e) => e.am === heute && e.mittel === 'Sumatriptan');
check(ibu && ibu.dosis === '600 mg', `bei zwei Dosen die zuletzt genutzte (${ibu && ibu.dosis})`);
check(suma && suma.dosis === '50 mg', `bei einer die eine (${suma && suma.dosis})`);

/* ---------- 10. Die Höchstzahl wird gesagt ---------- */

const elf = Array.from({ length: 11 }, (_, i) => ({ id: `s${i}`, mittel: `Mittel ${i + 1}`, dosis: '1', tageszeit: null, bezug: null }));
await setze({ standardMittel: elf });
await neu('medikament');
await page.locator('[data-act="standard-umschalten"]').click();
await kurz();
await page.locator('#bogenMittel').fill('Neu A');
// Inzwischen ist die Liste voll – etwa über „Mehr" in einem zweiten Fenster.
await page.evaluate(async () => {
  const st = await import('./js/store.js');
  st.standardMerken({ mittel: 'Zwölftes' });
});
await speichern();
s = await speicher();
check(s.standardMittel.length === 12 && s.eintraege.length === 1, 'das zwölfte passt, ein dreizehntes nicht – die Einnahme steht trotzdem');
check((await meldung()).includes('kein Platz mehr') && (await meldung()).includes('12'), `und die Meldung sagt es (${await meldung()})`);
await neu('medikament');
check(
  await page.locator('[data-act="standard-umschalten"]').count() === 0
    && sauber(await page.locator('#bogenMerken').textContent()).includes('mehr passen nicht'),
  'bei voller Liste bietet der Bogen das Merken gar nicht erst an, sondern sagt warum',
);
await zu();
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz();
check(
  await page.locator('[data-act="meinmittel-neu"]').count() === 0 && (await karte()).includes('Mehr als 12 passen nicht'),
  'unter „Mehr" ebenso',
);

/* ---------- 11. Eine Sicherung löscht die eigenen Mittel nicht ---------- */

await setze({ standardMittel: [{ id: 'nur', mittel: 'L-Thyroxin', dosis: '50 µg', tageszeit: 'morgens', bezug: 'vor' }] });
check(await page.evaluate(async () => (await import('./js/store.js')).istLeer()) === false, 'ein Tagebuch mit nur eigenen Mitteln ist nicht leer');
const sicherung = JSON.stringify({
  eintraege: [{ id: 'z1', art: 'notiz', am: gestern, um: '09:00', text: 'vom alten Telefon' }],
  standardMittel: [
    { id: 'a1', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
    { id: 'a2', mittel: 'L-Thyroxin', dosis: '50 µg', tageszeit: 'morgens', bezug: 'vor' },
  ],
});
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz();
await page.locator('[data-act="einfuegen-auf"]').click();
await kurz();
await page.locator('[data-act="einfuegen-text"]').fill(sicherung);
await page.locator('[data-act="einfuegen-los"]').click();
await kurz(400);
s = await speicher();
check(
  s.standardMittel.length === 2 && s.standardMittel.some((x) => x.id === 'nur') && s.standardMittel.some((x) => x.mittel === 'Pantoprazol'),
  `nach dem Einlesen stehen die eigenen Mittel noch da, zusammengeführt (${s.standardMittel.map((x) => x.mittel).join(', ')})`,
);
check(s.eintraege.length === 1, 'und die Einträge aus der Sicherung kommen dazu');

/* ---------- Alte Stände und Sicherungen ---------- */

/*
 * Aus der Fassung davor: eigene Mittel ohne die Felder für die Zeit,
 * „abends" auf 18:30. Das muss laden, sich bedienen lassen und in einer neuen
 * Sicherung vollständig wiederkommen.
 */
await setze({
  standardMittel: [{ id: 'alt1', mittel: 'Iberogast', dosis: '20 Tropfen' }],
  eintraege: [
    { id: 'altb', art: 'beschwerde', am: gestern, um: '18:30', staerke: 5, ungefaehr: true, tageszeit: 'abends', bezug: null, bezugMahlzeit: null },
  ],
});
await zuTag(gestern);
check(sauber(await reihe.first().textContent()) === 'Iberogast 20 Tropfen', 'ein eigenes Mittel aus der alten Fassung erscheint als Knopf');
// Muster zeigt bei so wenig Daten noch die Frühphase; der Bericht zählt
// die Tageszeiten ab der ersten Beschwerde.
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz();
await page.locator('[data-act="bericht"][data-n="30"]').click();
await kurz(300);
const blatt = await page.locator('textarea.bericht').first().inputValue();
const wann = (blatt.split('BESCHWERDEN NACH TAGESZEIT')[1] || '').split('\n\n')[0];
check(/abends/.test(wann) && !/nachmittags/.test(wann), `der Bericht zählt die alte Abendbeschwerde abends (${sauber(wann)})`);
// Heute trägt ein Tipp ohne übliche Zeit sofort ein, mit der jetzigen Uhrzeit.
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await kurz();
await zuTag(heute);
await reihe.first().click();
await kurz(300);
const roh = await page.evaluate(async () => (await import('./js/store.js')).alsJSON());
await page.evaluate(async () => (await import('./js/store.js')).allesLoeschen());
await kurz(200);
const zurueck = await page.evaluate(async (t) => (await import('./js/store.js')).einlesen(t), roh);
// Der Speicher schreibt gesammelt, 120 ms nach der letzten Änderung.
await kurz(300);
s = await speicher();
check(
  zurueck.anzahl === 2 && s.standardMittel.length === 1 && s.standardMittel[0].tageszeit === null && s.standardMittel[0].bezug === null,
  `eine neue Sicherung bringt alles zurück, die Felder für die Zeit leer statt fehlend (${zurueck.anzahl}, ${JSON.stringify(s.standardMittel)})`,
);
// Zusammenführen: gleiches Mittel zu anderer Zeit ist ein eigenes, gleiches
// zur gleichen Zeit nicht doppelt.
await page.evaluate(async () => {
  const st = await import('./js/store.js');
  st.einlesen(JSON.stringify({
    eintraege: [],
    standardMittel: [
      { id: 'n1', mittel: 'iberogast', dosis: '20 tropfen', tageszeit: null, bezug: null },
      { id: 'n2', mittel: 'Iberogast', dosis: '20 Tropfen', tageszeit: 'abends', bezug: 'nach' },
      { id: 'n3', mittel: 'Iberogast', dosis: '20 Tropfen', tageszeit: 'nachts', bezug: 'irgendwann' },
    ],
  }));
});
await kurz(300);
s = await speicher();
check(
  s.standardMittel.length === 2 && s.standardMittel.some((x) => x.tageszeit === 'abends' && x.bezug === 'nach'),
  `beim Zusammenführen kommt die Abendzeit dazu, das Gleiche nicht doppelt (${s.standardMittel.map((x) => `${x.tageszeit}/${x.bezug}`).join(', ')})`,
);

/*
 * Dieselbe Kennung ist dasselbe Mittel. Hier wurde die Zeit geändert (Ändern
 * behält die Kennung), die Sicherung trägt noch die alte: Beim Einlesen darf
 * daraus kein zweites Mittel mit derselben Kennung werden – sonst trug der
 * Knopf „· morgens" die Abendzeit ein, und „×" entfernte beide.
 */
await setze({ standardMittel: [{ id: 'sm1', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'abends', bezug: 'vor' }] });
await page.evaluate(async () => {
  const st = await import('./js/store.js');
  st.einlesen(JSON.stringify({
    eintraege: [],
    standardMittel: [
      { id: 'sm1', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
      { id: 'sm9', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
    ],
  }));
});
await kurz(300);
s = await speicher();
const mitSm1 = s.standardMittel.filter((x) => x.id === 'sm1');
check(mitSm1.length === 1 && mitSm1[0].tageszeit === 'abends',
  `genau ein Mittel mit dieser Kennung, und zwar das von hier (${s.standardMittel.map((x) => `${x.id}/${x.tageszeit}`).join(', ')})`);
check(s.standardMittel.length === 2 && s.standardMittel.some((x) => x.id === 'sm9' && x.tageszeit === 'morgens'),
  'ein anderes Mittel aus der Sicherung – andere Kennung, andere Zeit – kommt dazu');

// Ein schon so gespeicherter Stand heilt beim Laden.
await setze({
  eintraege: [essen('fr', gestern, '07:45')],
  standardMittel: [
    { id: 'dd', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'abends', bezug: 'vor' },
    { id: 'dd', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
    { id: 'dd', mittel: 'Pantoprazol', dosis: '40 mg', tageszeit: 'abends', bezug: 'vor' },
  ],
});
await kurz(300);
s = await speicher();
check(s.standardMittel.length === 2 && new Set(s.standardMittel.map((x) => x.id)).size === 2,
  `ein gespeicherter Stand mit doppelter Kennung heilt beim Laden (${s.standardMittel.map((x) => `${x.id}/${x.tageszeit}`).join(', ')})`);
await zuTag(gestern);
const morgenKnopf = page.locator('[data-act="standard-eintragen"]').filter({ hasText: '· morgens' });
await morgenKnopf.click();
await kurz(300);
s = await speicher();
const genommen = s.eintraege.find((e) => e.art === 'medikament');
check(genommen && genommen.tageszeit === 'morgens' && genommen.um === '07:15',
  `der Knopf „· morgens" trägt danach die Morgenzeit ein (${genommen && `${genommen.um}/${genommen.tageszeit}`})`);
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz();
const ersteWeg = page.locator('[data-act="meinmittel-weg"]').first();
await ersteWeg.click();
await ersteWeg.click();
await kurz(300);
check((await speicher()).standardMittel.length === 1, 'und „×" entfernt nur eins');
{
  // Auch eine Sicherung, die in sich doppelt ist.
  const r = await page.evaluate(async () => {
    const st = await import('./js/store.js');
    st.allesLoeschen();
    st.einlesen(JSON.stringify({
      eintraege: [{ id: 'n1', art: 'notiz', am: '2026-10-01', um: '09:00', text: 'x' }],
      standardMittel: [
        { id: 'zz', mittel: 'Iberogast', dosis: '', tageszeit: 'morgens' },
        { id: 'zz', mittel: 'Iberogast', dosis: '', tageszeit: 'abends' },
      ],
    }));
    return st.zustandLesen().standardMittel.map((x) => x.id);
  });
  check(r.length === 2 && new Set(r).size === 2, `eine in sich doppelte Sicherung bekommt eindeutige Kennungen (${r.join(', ')})`);
}

/* ---------- 13. „Noch mal wie immer" auf einem vergangenen Tag ---------- */

await setze({
  eintraege: [1, 2, 3].map((i) => essen(`h${i}`, vorTagen(i + 2), '08:00', { was: 'Haferbrei', zutaten: [{ id: 'milch', rolle: 'haupt' }] })),
});
await zuTag(gestern);
const vorher = (await speicher()).eintraege.length;
await page.locator('[data-act="schnell"]').first().click();
await kurz(300);
check((await speicher()).eintraege.length === vorher && await page.locator('#bogenWas').inputValue() === 'Haferbrei', 'gestern: der Tipp öffnet den Bogen, vorgefüllt');
// Ohne vorbelegte Uhrzeit: Ein eiliges „Eintragen" speichert kein Frühstück um 12:00.
check(await uhr() === '', `die Uhrzeit ist leer, nicht 12:00 (${await uhr()})`);
await speichern();
check((await speicher()).eintraege.length === vorher && (await meldung()).startsWith('Um wie viel Uhr?')
    && await page.locator('#bogenUhr').getAttribute('aria-invalid') === 'true',
  'ohne Zeitwahl wird nichts gespeichert – der Bogen fragt nach der Uhrzeit');
await tippe('zeit-tageszeit', 'morgens');
await speichern();
const hafer = (await speicher()).eintraege.find((e) => e.am === gestern);
check(hafer && hafer.um === '08:00' && hafer.ungefaehr && hafer.zutaten[0].id === 'milch', 'und trägt gestern morgens ein, mit Zutaten');

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
