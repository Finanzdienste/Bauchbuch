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
import path from 'node:path';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import { KNOPF_TAGESZEIT, tageszeit } from '../js/datum.js';
import {
  bewerteteMahlzeiten, essensbezug, folgende, klassenBilanz, nachTageszeit,
  reihenfolgeUnklar, stundenSeitEssen, wertNach,
} from '../js/auswertung.js';
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

// Die Abendessen sind nicht bewertbar – weder gut noch schlecht –, die
// übrigen Mahlzeiten schon.
const bewertet = bewerteteMahlzeiten(knopfTage, 4);
check(
  bewertet.length === 18 && !bewertet.some((b) => b.m.tageszeit === 'abends'),
  `die Abendessen fehlen in der Bilanz, statt als beschwerdefrei zu zählen (${bewertet.length} von 27)`,
);
check(wertNach(knopfTage, knopfTage[2], 4) === null, 'wertNach sagt dafür null, nicht 0');
check(
  !klassenBilanz(knopfTage, { fenster: 4 }).some((k) => k.faelle + k.gegenFaelle > 18),
  'die Klassenbilanz rechnet ebenfalls ohne sie',
);

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
check(folgende([genauesAbendessen, abendsOhne], genauesAbendessen, 4).length === 0, 'und wird ihm nicht zugerechnet');
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

// Das Zeitprofil fragt nach Stunden; Knopfzeiten haben keine.
const spaeter = { id: 'n', art: 'notiz', am: '2026-10-30', um: '08:00', text: 'x' };
const fw = fensterWerte([genauesAbendessen, abendsOhne, spaeter])[0].werte;
check(!fw.frueh.beobachtbar && !fw.mittel.beobachtbar, 'das Fenster eines Abendessens mit offener Beschwerde gilt als nicht erhoben');
const zb = zeitBild(gebunden);
check(
  zb.zugeordnet === 0 && zb.satz.includes('9 weitere sind mit ungefährer Zeit eingetragen'),
  `das Zeitbild zählt Knopfzeiten nicht als Stunden – und sagt das (${zb.zugeordnet})`,
);

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
// Ohne gewählte Tageszeit bleibt es bei der nächsten Mahlzeit des Tages.
await tippe('zeit-bezug', 'nach');
await page.locator('#bogenUhr').fill('09:00');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '08:15', `ohne Tageszeit gilt die nächste Mahlzeit, das Frühstück (${await uhr()})`);
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
await page.locator('[data-act="loeschen"][data-id="mittag1"]').click();
await kurz(300);
s = await speicher();
let mb = s.eintraege.find((e) => e.id === 'mb');
check(mb.um === '14:30' && mb.bezugMahlzeit === 'mittag2', `die Mahlzeit gelöscht: an die andere Mahlzeit des Mittags (${mb.um})`);
check((await meldung()).includes('an die Mahlzeit angepasst'), `mit Meldung (${await meldung()})`);
await page.locator('[data-act="loeschen"][data-id="mittag2"]').click();
await kurz(300);
s = await speicher();
mb = s.eintraege.find((e) => e.id === 'mb');
check(mb.um === '13:00' && !mb.bezugMahlzeit, `die letzte Mahlzeit gelöscht: an die Tageszeit (${mb.um})`);
check((await meldung()).includes('1 Eintrag an die Tageszeit angepasst.'), `mit Meldung (${await meldung()})`);

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
check(
  (await reihe.nth(1).getAttribute('aria-label')).includes('gestern eintragen'),
  'und beim anderen, dass er für gestern einträgt',
);
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
await page.locator('[data-act="meinmittel-neu"]').click();
await kurz();
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
await page.locator(`[data-act="meinmittel-aendern"][data-id="${abendlich().id}"]`).click();
await kurz();
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

// Entfernen.
const vorWeg = s.standardMittel.length;
await page.locator(`[data-act="meinmittel-weg"][data-id="${abendlich().id}"]`).click();
await kurz(300);
s = await speicher();
check(s.standardMittel.length === vorWeg - 1 && s.eintraege.length === 1, 'entfernen nimmt es aus der Liste, sonst nichts');

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
await zu();
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

/* ---------- 13. „Noch mal wie immer" auf einem vergangenen Tag ---------- */

await setze({
  eintraege: [1, 2, 3].map((i) => essen(`h${i}`, vorTagen(i + 2), '08:00', { was: 'Haferbrei', zutaten: [{ id: 'milch', rolle: 'haupt' }] })),
});
await zuTag(gestern);
const vorher = (await speicher()).eintraege.length;
await page.locator('[data-act="schnell"]').first().click();
await kurz(300);
check((await speicher()).eintraege.length === vorher && await page.locator('#bogenWas').inputValue() === 'Haferbrei', 'gestern: der Tipp öffnet den Bogen, vorgefüllt');
await tippe('zeit-tageszeit', 'morgens');
await speichern();
const hafer = (await speicher()).eintraege.find((e) => e.am === gestern);
check(hafer && hafer.um === '08:00' && hafer.ungefaehr && hafer.zutaten[0].id === 'milch', 'und trägt gestern morgens ein, mit Zutaten');

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
