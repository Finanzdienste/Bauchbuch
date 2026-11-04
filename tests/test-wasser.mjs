/*
 * Wasser: ein Tipp, ein Glas – und keine Auswertung merkt etwas davon.
 *
 * Gezählt wird je Tag in tage[iso].wasser, ohne Uhrzeit, ohne Eintrag. Geprüft
 * wird vor allem das, was dabei still schiefgehen kann:
 *
 *   1. Ein Tag, an dem nur Wasser steht, ist eine Lücke und kein notierter,
 *      also auch kein beschwerdefreier Tag. Statt Stelle für Stelle wird das
 *      als Gegenprobe geprüft: dasselbe Tagebuch mit und ohne Wasser, und
 *      jede Rechnung muss dasselbe ergeben. So fällt auch eine Stelle auf,
 *      die erst später dazukommt.
 *   2. Ein Glas wird nie eine Mahlzeit.
 *   3. Sicherung, Einlesen und Zusammenführen nehmen das Wasser mit; beim
 *      Zusammenführen gewinnt je Tag die größere Zahl.
 *   4. Ältere Stände und Sicherungen laden weiter, mit dem Zählen an.
 *   5. Auf dem iPhone, 320 Pixel breit, passt die Reihe ohne Querscrollen.
 */
import { chromium } from 'playwright';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import {
  ausloeserBilanz, bewerteteMahlzeiten, faktorBilanz, gesamtZahlen, serieOhne, tagesWert,
  trend, verlaufReihe,
} from '../js/auswertung.js';
import { kriterien } from '../js/kriterien.js';
import {
  bauchAnKopfTagen, kopfNachPhase, kopfTagesWert, kopfTageVon, kopfUmPeriode, kopfUmstaende,
  kopfZahlen,
} from '../js/kopf.js';
import { schmerzVergleich, stuhlZahlen, wasserSatz, wasserVergleich } from '../js/stuhl.js';
import { unterleibsBild } from '../js/unterleib.js';
import { haeltStand } from '../js/schichten.js';
import { phasenBilanz } from '../js/zyklus.js';
import { raete } from '../js/rat.js';
import { bildLesen } from '../js/bild.js';
import { zufallsSpielraum } from '../js/zufall.js';
import { arztBericht } from '../js/bericht.js';
import {
  WASSER_HOECHSTENS, literText, tagZaehlt, wasserVon, wasserZahlen,
} from '../js/wasser.js';

const { check, ende } = pruefer();

const PORT = Number(process.env.BAUCHBUCH_PORT_WASSER || 8431);
if (PORT < 8431 || PORT > 8439) throw new Error(`Port ${PORT} liegt außerhalb von 8431–8439`);

const heute = vorTagen(0);
const gestern = vorTagen(1);
const klon = (x) => JSON.parse(JSON.stringify(x));

/* ---------- 1. Die Bausteine ---------- */

check(!tagZaehlt({ wasser: 3 }), 'ein Tag nur mit Wasser zählt nicht als notiert');
check(tagZaehlt({ wasser: 3, stress: 2 }), 'mit einer beantworteten Tagesfrage schon');
check(tagZaehlt({ stress: 0 }), 'auch mit einer Null als Antwort – „ruhig" ist eine Angabe');
check(!tagZaehlt({ wasser: 2, stimmung: null, notiz: '  ' }), 'leere Felder neben dem Wasser zählen nicht');
check(!tagZaehlt(null) && !tagZaehlt(undefined) && !tagZaehlt(3), 'kein Tag ist kein notierter Tag');
check(
  wasserVon({ wasser: '3' }) === 3 && wasserVon({ wasser: 2.6 }) === 3 && wasserVon({ wasser: -1 }) === 0
    && wasserVon({ wasser: 'viel' }) === 0 && wasserVon({ wasser: 999 }) === WASSER_HOECHSTENS
    && wasserVon(undefined) === 0,
  'die Zahl der Gläser ist immer eine ganze Zahl von 0 bis zur Obergrenze',
);
check(literText(3, 250) === '≈ 0,75 l' && literText(0, 250) === '' && literText(4, 500) === '≈ 2 l',
  `Liter nur als Umrechnung (${literText(3, 250)}, ${literText(4, 500)})`);
check(literText(2, 123) === '≈ 0,5 l', 'eine unbekannte Glasgröße rechnet mit der Vorgabe');
const wz = wasserZahlen({ a: { wasser: 2 }, b: { wasser: 6 }, c: { stress: 1 } });
check(wz.tage === 2 && wz.schnitt === 4, `gemittelt nur über Tage mit Angabe (${wz.tage} Tage, ${wz.schnitt})`);

/* ---------- 2. Gegenprobe: dasselbe Tagebuch mit und ohne Wasser ---------- */

/*
 * Ein Tagebuch über 80 Tage mit allem, was die Rechnungen anfassen: Mahlzeiten
 * mit Auslösern, Beschwerden, Stuhlgänge, Kopfschmerzen mit Schmerzmittel,
 * Tagesfragen, ein Zyklus. Dazu Lücken – ganze Tage ohne irgendetwas.
 */
let saat = 7;
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
  eintraege.push({ id: n('m2-'), art: 'essen', am, um: '13:00', was: 'Mittag', zutaten: z, portion: 'normal' });
  if (z.some((x) => x.id === 'kaffee') || zufall() < 0.25) {
    eintraege.push({
      id: n('b-'), art: 'beschwerde', am, um: '14:30', staerke: 2 + Math.floor(zufall() * 6),
      arten: [zufall() < 0.5 ? 'krampf' : 'druck'],
    });
  }
  if (zufall() < 0.8) {
    eintraege.push({ id: n('s-'), art: 'stuhl', am, um: '07:30', form: 1 + Math.floor(zufall() * 7) });
  }
  if (zufall() < 0.15) {
    eintraege.push({ id: n('k-'), art: 'kopf', am, um: '16:00', staerke: 6, kopfArten: [] });
    eintraege.push({ id: n('i-'), art: 'medikament', am, um: '16:10', mittel: 'Ibuprofen', dosis: '400 mg' });
  }
  if (zufall() < 0.6) {
    tage[am] = { stress: Math.floor(zufall() * 5), schlaf: Math.floor(zufall() * 5) };
  }
  // Ein Zyklus von 28 Tagen, vier Tage Blutung.
  if (i % 28 < 4) tage[am] = { ...(tage[am] || {}), blutung: 2, regelschmerz: 2 };
  if (i % 9 === 0) tage[am] = { ...(tage[am] || {}), sex: 1, sexschmerz: 0 };
}
// Ein Tag, an dem nur ein Kopfschmerz steht – für den Bauch schon jetzt eine Lücke.
const nurKopf = luecken.shift();
eintraege.push({ id: 'nurkopf', art: 'kopf', am: nurKopf, um: '09:00', staerke: 7, kopfArten: [] });
eintraege.sort((a, b) => (a.am === b.am ? a.um.localeCompare(b.um) : a.am.localeCompare(b.am)));

// Und dasselbe mit Wasser: an Lücken, an Tagen mit Einträgen, an Tagen mit
// Tagesfragen. Dazu ein Tag mit einer zurückgenommenen Tagesfrage neben dem
// Wasser – so bleibt er stehen, wenn erst eine Frage und dann Wasser kam.
const mitWasser = klon(tage);
let wasserTage = 0;
for (let i = 79; i >= 0; i--) {
  const am = vorTagen(i);
  if (i % 3 === 0) continue;
  mitWasser[am] = { ...(mitWasser[am] || {}), wasser: 1 + (i % 7) };
  wasserTage += 1;
}
mitWasser[nurKopf] = { ...(mitWasser[nurKopf] || {}), wasser: 4 };
const zurueckgenommen = luecken.find((iso) => !mitWasser[iso]);
mitWasser[zurueckgenommen] = { stimmung: null, wasser: 2 };
const nurWasser = luecken.filter((iso) => mitWasser[iso] && !tage[iso]);
check(nurWasser.length >= 5, `die Probe hat Tage, an denen nur Wasser steht (${nurWasser.length})`);
check(wasserTage > 40, `und Wasser an vielen anderen Tagen (${wasserTage})`);

const von = vorTagen(79);
const bewertet = bewerteteMahlzeiten(eintraege, 4);
const bilanz = ausloeserBilanz(eintraege, { fenster: 4, mindestFaelle: 5, eigene: [] });
const istNsar = (name) => /ibu/i.test(String(name));
const RECHNUNGEN = {
  tagesWert: (t) => nurWasser.map((iso) => tagesWert(eintraege, iso, t)),
  verlaufReihe: (t) => verlaufReihe(eintraege, von, heute, t),
  gesamtZahlen: (t) => gesamtZahlen(eintraege, t, von, heute),
  serieOhne: (t) => serieOhne(eintraege, t, heute),
  trend: (t) => trend(eintraege, t, heute, 14),
  faktorBilanz: (t) => ['stress', 'schlaf'].map((id) => faktorBilanz(eintraege, t, id, tagesWert)),
  kriterien: (t) => kriterien({
    eintraege, tage: t, heute, beschwerdenSeit: null, istSaeuremittel: () => false,
  }),
  kopfTagesWert: (t) => nurWasser.map((iso) => kopfTagesWert(eintraege, iso, t)),
  kopfZahlen: (t) => kopfZahlen(eintraege, t, heute),
  kopfNachPhase: (t) => kopfNachPhase(eintraege, t),
  kopfUmPeriode: (t) => kopfUmPeriode(eintraege, t, heute),
  bauchAnKopfTagen: (t) => bauchAnKopfTagen(eintraege, t, tagesWert),
  kopfUmstaende: (t) => kopfUmstaende(eintraege, t, faktorBilanz, zufallsSpielraum),
  stuhlZahlen: (t) => stuhlZahlen(eintraege, t),
  schmerzVergleich: (t) => schmerzVergleich(eintraege, t, ['krampf']),
  unterleibsBild: (t) => unterleibsBild(eintraege, t, tagesWert),
  haeltStand: (t) => AUSWAHL.map((id) => haeltStand(bewertet, id, t, { kopfTage: kopfTageVon(eintraege) })),
  phasenBilanz: (t) => phasenBilanz(eintraege, t, tagesWert),
  raete: (t) => raete({
    eintraege, tage: t, heute, eigene: [], bilanz,
    faktoren: Object.fromEntries(['stress', 'schlaf', 'stimmung']
      .map((id) => [id, faktorBilanz(eintraege, t, id, tagesWert)])),
    phasen: phasenBilanz(eintraege, t, tagesWert),
    letzteMahlzeitStunden: null, mittel: [],
  }),
  bildLesen: (t) => bildLesen({ eintraege, tage: t, bilanz, name: (id) => id, istNsar }),
};
const anders = Object.entries(RECHNUNGEN)
  .filter(([, f]) => JSON.stringify(f(tage)) !== JSON.stringify(f(mitWasser)))
  .map(([name]) => name);
check(
  anders.length === 0,
  `${Object.keys(RECHNUNGEN).length} Rechnungen ergeben mit Wasser dasselbe wie ohne (anders: ${anders.join(', ') || 'keine'})`,
);
check(
  nurWasser.every((iso) => !tagesWert(eintraege, iso, mitWasser).notiert),
  'an keinem Tag nur mit Wasser ist der Bauch notiert – also auch nicht beschwerdefrei',
);
check(
  !kopfTagesWert(eintraege, nurWasser[0], mitWasser).notiert,
  'und der Kopf auch nicht: ein Glas sagt nicht, dass der Kopf frei war',
);

/*
 * Der Bericht: Bis auf die Wasserzeilen derselbe Text. Gezählt bleibt, was
 * vorher gezählt war – „Tage mit Eintragung" eingeschlossen.
 */
const zustandVon = (t) => ({
  eintraege, tage: t, fenster: 4, mindestFaelle: 5, eigeneAusloeser: [], termine: [], befunde: [],
  gewicht: [], versuche: [], provokationen: [], stufenplaene: [], wasserGlas: 250,
});
const berichtOhne = arztBericht(zustandVon(tage), vorTagen(29), heute);
const berichtMit = arztBericht(zustandVon(mitWasser), vorTagen(29), heute);
/*
 * Was der Bericht zum Wasser sagt: die zwei Zeilen in der Übersicht und, wenn
 * es genug Fälle gibt, der Vergleich beim Stuhlgang samt Vorbehalt.
 */
const ohneWasserzeilen = (text) => {
  const raus = [];
  let imVergleich = false;
  const zeilen = text.split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (z.startsWith('  Wasser ')) { i += 1; continue; }
    if (/^ {2}(An Tagen mit|Harter Stuhlgang)/.test(z) && /Wasser/.test(z)) imVergleich = true;
    if (imVergleich) {
      if (z.includes('(Gezählt am selben Tag')) imVergleich = false;
      continue;
    }
    raus.push(z);
  }
  return raus.join('\n');
};
check(!/Wasser/.test(berichtOhne), 'ohne gezähltes Wasser steht im Bericht kein Wort davon');
check(
  ohneWasserzeilen(berichtMit) === ohneWasserzeilen(berichtOhne),
  'mit Wasser ist der Bericht bis auf die Wasserzeilen derselbe',
);
const wz30 = wasserZahlen(mitWasser, vorTagen(29), heute);
const zeileMittel = berichtMit.split('\n').find((z) => z.startsWith('  Wasser ')) || '';
check(
  zeileMittel.includes(`im Mittel ${String(+wz30.schnitt.toFixed(1)).replace('.', ',')} Gläser`),
  `der Bericht nennt das Mittel (${zeileMittel.trim()})`,
);
check(
  berichtMit.includes(`an ${wz30.tage} Tagen mit Angabe, ein Glas = 0,25 l`),
  `und an wie vielen Tagen gezählt wurde (${wz30.tage})`,
);
check(
  !/trink|sollte|zu wenig|empfohlen|Ziel/i.test(berichtMit.split('\n').filter((z) => /Wasser|Gläser|Glas/.test(z)).join(' ')),
  'ohne Ziel und ohne Ermahnung',
);
const neueZeilen = berichtMit.split('\n').filter((z) => !berichtOhne.split('\n').includes(z));
check(
  neueZeilen.length >= 2 && neueZeilen.every((z) => z.length <= 80),
  `keine der neuen Zeilen ist länger als achtzig Zeichen (${neueZeilen.length} neue)`,
);

/*
 * Und der Nenner von „je notiertem Tag" im Bericht: nur Tage im Zeitraum. Fünf
 * Stuhlgänge an fünf Tagen sind einer je Tag – auch wenn vor dem Zeitraum
 * zwanzig Tage mit Tagesfragen stehen. Vorher rechnete der Bericht hier mit
 * dem ganzen Tagesspeicher und kam auf 0,2.
 */
const frueher = {};
for (let i = 40; i < 60; i++) frueher[vorTagen(i)] = { stress: 1 };
const fuenf = [0, 1, 2, 3, 4].map((i) => ({ id: `n${i}`, art: 'stuhl', am: vorTagen(i), um: '08:00', form: 4 }));
const nenner = arztBericht({ ...zustandVon(frueher), eintraege: fuenf }, vorTagen(29), heute);
check(
  /Eingetragen\s+5 Mal, 1 je notiertem Tag/.test(nenner),
  'im Bericht zählen für „je notiertem Tag" nur die Tage im Zeitraum',
);

/* ---------- 3. Harter Stuhlgang und Wasser: nur mit genug Fällen ---------- */

const probe = (anzahl) => {
  const e = [];
  const t = {};
  for (let i = 0; i < anzahl; i++) {
    const am = vorTagen(i);
    const wenig = i % 2 === 0;
    t[am] = { wasser: wenig ? 2 : 8 };
    e.push({ id: `w${i}`, art: 'stuhl', am, um: '08:00', form: wenig && i % 4 === 0 ? 1 : 4 });
  }
  return { e, t };
};
const wenigFaelle = probe(8);
check(wasserSatz(wasserVergleich(wenigFaelle.e, wenigFaelle.t)) === '', 'mit vier Tagen je Seite: kein Satz');
const genugFaelle = probe(12);
const vg = wasserVergleich(genugFaelle.e, genugFaelle.t);
const satz = wasserSatz(vg);
check(vg.genug && vg.wenig.tage === 6 && vg.viel.tage === 6, `mit sechs Tagen je Seite reicht es (${vg.wenig.tage}/${vg.viel.tage})`);
check(
  satz.includes('bis 2 Gläser') && satz.includes('ab 8 Gläsern') && satz.includes('3 von 6') && satz.includes('0 von 6'),
  `der Satz nennt beide Seiten mit Fallzahl (${satz})`,
);
check(!/trink|solltest|mehr Wasser hilft/i.test(satz), 'und rät zu nichts');
const gleich = probe(12);
gleich.e.forEach((x) => { x.form = 4; });
check(
  wasserSatz(wasserVergleich(gleich.e, gleich.t)).includes('kein deutlicher Unterschied'),
  'ohne Unterschied sagt er das',
);
const ohneStuhl = probe(12);
ohneStuhl.e = [];
check(!wasserVergleich(ohneStuhl.e, ohneStuhl.t).genug, 'Tage ohne Stuhlgang zählen nicht mit');

/* ---------- 4. Im Browser, als App auf dem iPhone ---------- */

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 640 };

const kopie = await kopieServer(ROOT, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];

/** Ein iPhone mit der App vom Home-Bildschirm und diesem Stand im Speicher. */
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
const breite = (page) => page.evaluate(() => ({
  breit: document.documentElement.scrollWidth, fenster: window.innerWidth,
}));

// Ein Stand aus einer Fassung vor dem Wasser: ohne wasserZeigen, ohne
// wasserGlas, ohne ein einziges `wasser`.
const ALT = {
  begruesst: true,
  tab: 'heute',
  alterName: null,
  eintraege: [
    { id: 'f1', art: 'essen', am: gestern, um: '08:00', was: 'Haferbrei', zutaten: [], portion: 'normal' },
  ],
  tage: { [gestern]: { stress: 1 } },
};

{
  const { ctx, page } = await iphone(ALT);
  const reihe = page.locator('.wasser');
  const zahl = () => page.locator('.wasser-zahl').textContent();

  check(await reihe.count() === 1, 'ein alter Stand ohne Schalter zeigt die Wasserreihe – die Vorgabe greift');
  check((await zahl()).replace(/\s+/g, ' ').trim() === '0 Gläser', `heute steht noch nichts da (${await zahl()})`);
  check(await page.locator('#wasserWeniger').isDisabled(), 'bei null ist das Minus aus');
  check(
    (await page.locator('#wasserMehr').boundingBox()).width >= 44
      && (await page.locator('#wasserMehr').boundingBox()).height >= 44,
    'das Plus ist mindestens 44 Punkte groß',
  );
  const satzVorher = (await page.locator('.rat').textContent()) || '';
  check(satzVorher.includes('Für heute steht noch nichts im Tagebuch'), 'der Rat weiß: heute steht noch nichts da');

  /* Zählen */
  for (let i = 0; i < 3; i++) {
    // eslint-disable-next-line no-await-in-loop
    await page.locator('#wasserMehr').click();
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(80);
  }
  await kurz(page);
  check((await zahl()).includes('3') && (await zahl()).includes('Gläser'), `drei Tipps, drei Gläser (${await zahl()})`);
  check((await zahl()).includes('≈ 0,75 l'), 'mit der Umrechnung für ein Glas zu 0,25 l');
  check(
    (await page.locator('#toast').textContent()).includes('Ein Glas dazu. Heute: 3 Gläser.'),
    `eine kurze Meldung (${await page.locator('#toast').textContent()})`,
  );
  let s = await speicher(page);
  check(s.tage[heute] && s.tage[heute].wasser === 3, 'im Speicher steht tage[heute].wasser = 3');
  check(s.eintraege.length === 1, 'kein Eintrag dazugekommen – und erst recht keine Mahlzeit');
  check(!s.eintraege.some((e) => e.am === heute), 'heute steht nichts im Strang');
  check(await page.locator('.strang-zeile').count() === 0, 'und in der Liste auch nichts');

  /* Ein Tag nur mit Wasser bleibt eine Lücke */
  check(await page.locator('.tagbilanz').count() === 0, 'kein „beschwerdefrei" für einen Tag nur mit Wasser');
  const rat = (await page.locator('.rat').textContent()) || '';
  check(
    rat.includes('Für heute steht noch nichts im Tagebuch') && !rat.includes('Beschwerdefrei und ausgeruht'),
    'der Rat für heute bleibt beim „steht noch nichts da"',
  );

  /* Zurücknehmen */
  await page.locator('#wasserWeniger').click();
  await kurz(page);
  check((await zahl()).includes('2'), 'das Minus nimmt eins zurück');
  check(
    (await page.locator('#toast').textContent()).includes('Ein Glas zurückgenommen. Heute: 2 Gläser.'),
    'und sagt das',
  );
  await page.locator('#wasserWeniger').click();
  await kurz(page);
  await page.locator('#wasserWeniger').click();
  await kurz(page);
  check((await page.locator('#toast').textContent()).includes('Heute: keins mehr.'), 'bei null sagt die Meldung das');
  s = await speicher(page);
  check(!(heute in s.tage), 'bei null verschwindet der Tag ganz aus dem Speicher – kein leerer Tag');
  check(await page.locator('#wasserWeniger').isDisabled(), 'und das Minus ist wieder aus');

  /* Gestern, neben einer Tagesfrage */
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await kurz(page);
  await page.locator('#wasserMehr').click();
  await page.locator('#wasserMehr').click();
  await kurz(page);
  s = await speicher(page);
  check(
    s.tage[gestern] && s.tage[gestern].wasser === 2 && s.tage[gestern].stress === 1,
    `gestern lässt sich nachzählen, und die Tagesfrage bleibt (${JSON.stringify(s.tage[gestern])})`,
  );
  check((await page.locator('#toast').textContent()).includes('Gestern: 2 Gläser.'), 'die Meldung nennt den Tag');
  await page.screenshot({ path: `${SHOT}/wasser-gestern.png`, fullPage: true });

  /* Ein älterer Tag ohne alles */
  const vor3 = vorTagen(3);
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await kurz(page);
  await page.locator('#wasserMehr').click();
  await kurz(page);
  s = await speicher(page);
  check(s.tage[vor3] && s.tage[vor3].wasser === 1, 'auch weiter zurück');
  check(
    /^Ein Glas dazu\. \S+, \d\d\.\d\d\.: 1 Glas\.$/.test(await page.locator('#toast').textContent()),
    `dort mit Datum in der Meldung (${await page.locator('#toast').textContent()})`,
  );
  check(await page.locator('.tagbilanz').count() === 0, 'auch dort ohne „beschwerdefrei"');
  check(
    (await page.locator('p.leer').first().textContent()).includes('noch nichts eingetragen'),
    'der Tag sagt weiter, dass nichts eingetragen ist',
  );

  /* Künftige Tage */
  const morgen = await page.evaluate(async () => {
    const st = await import('/js/store.js');
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p = (x) => String(x).padStart(2, '0');
    const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return { n: st.wasserZaehlen(iso, 1), da: iso in st.zustandLesen().tage };
  });
  check(morgen.n === null && !morgen.da, 'für morgen wird nichts gezählt');
  check(
    await page.evaluate(async () => (await import('/js/store.js')).wasserZaehlen('', 1)) === null,
    'und für keinen Tag ohne Datum',
  );

  /* Verlauf: die notierten Tage */
  await page.locator('[data-act="tab"][data-tab="verlauf"]').click();
  await kurz(page);
  const kachel = await page.locator('.kachel').first().textContent();
  check(kachel.trim().startsWith('1'), `im Verlauf zählt nur gestern als notiert, nicht die Wassertage (${kachel.trim()})`);

  /* 320 Pixel */
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await kurz(page);
  let m = await breite(page);
  check(m.breit <= m.fenster, `Tag mit Wasserreihe: nichts ragt über den Rand (${m.breit}/${m.fenster})`);
  const box = await page.locator('.wasser').boundingBox();
  check(box.height < 70, `die Reihe bleibt eine Zeile (${Math.round(box.height)} px hoch)`);
  await page.screenshot({ path: `${SHOT}/wasser-tag-320.png`, fullPage: true });

  /* Schalter und Glasgröße unter „Mehr" */
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await kurz(page);
  check(await page.locator('#wasserKarte').count() === 1, 'unter „Mehr" gibt es eine Karte Wasser');
  m = await breite(page);
  check(m.breit <= m.fenster, `„Mehr": nichts ragt über den Rand (${m.breit}/${m.fenster})`);
  await page.locator('[data-act="wasser-glas"][data-n="500"]').click();
  await kurz(page);
  await page.locator('[data-act="wasser-zeigen"]').click();
  await kurz(page);
  await page.locator('#wasserKarte').screenshot({ path: `${SHOT}/wasser-mehr.png` });
  s = await speicher(page);
  check(s.wasserZeigen === false && s.wasserGlas === 500, 'Schalter und Glasgröße stehen im Speicher');
  check(
    (await page.locator('[data-act="wasser-zeigen"]').textContent()).includes('ist aus'),
    'der Schalter sagt, dass das Zählen aus ist',
  );
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await kurz(page);
  check(await page.locator('.wasser').count() === 0, 'ausgeschaltet steht die Reihe nicht auf „Tag"');
  s = await speicher(page);
  check(s.tage[vor3] && s.tage[vor3].wasser === 1, 'schon Gezähltes bleibt dabei erhalten');
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await kurz(page);
  await page.locator('[data-act="wasser-zeigen"]').click();
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await kurz(page);
  // Der Reiter merkt sich den Tag: Wir stehen noch drei Tage zurück.
  await page.locator('[data-act="tag-blaettern"][data-d="1"]').click();
  await page.locator('[data-act="tag-blaettern"][data-d="1"]').click();
  await kurz(page);
  check(await page.locator('.wasser').count() === 1, 'wieder eingeschaltet ist sie zurück');
  check(
    (await zahl()).includes('≈ 1 l'),
    `zwei Gläser zu 0,5 l sind etwa ein Liter (${(await zahl()).replace(/\s+/g, ' ').trim()})`,
  );
  await ctx.close();
}

/* ---------- 4b. Knapp über den Reitern zählt jeder Tipp ---------- */

/*
 * Die Wasserreihe steht weit unten auf „Tag"; wer zu ihr rollt, hat sie oft
 * knapp über den Reitern – dort, wo auch die Meldung „Ein Glas dazu. …"
 * erscheint. Eine Meldung fängt Tipps ab, damit niemand blind einen Knopf
 * unter ihr trifft. Lag sie aber über dem Knopf, den man eben gedrückt hat
 * und gleich noch einmal drückt, schloss jeder zweite Tipp nur sie, und ein
 * Glas fehlte. Deshalb weicht sie diesem Knopf aus: Jeder Tipp zählt, und
 * die Meldung liegt nie über ihm. Mit dem Finger, wie auf dem Telefon.
 */
async function mitFinger(stand, viewport) {
  const ctx = await browser.newContext({ viewport, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  await ctx.addInitScript(([k, s]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    try { if (s && !localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, stand]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  return { ctx, page };
}
{
  const mitWasser = (n) => ({
    ...ALT, v28Gesagt: true, v29Gesagt: true, startbildschirmWeg: true,
    tage: { ...ALT.tage, ...(n ? { [heute]: { wasser: n } } : {}) },
  });
  const ueberdeckt = (page, sel) => page.evaluate((s) => {
    const t = document.getElementById('toast');
    if (!t.classList.contains('an')) return false;
    const a = t.getBoundingClientRect();
    const b = document.querySelector(s).getBoundingClientRect();
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }, sel);
  const daneben = [];
  let faelle = 0;
  for (const vp of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
    for (const [sel, start, soll] of [['#wasserWeniger', 4, [3, 2, 1]], ['#wasserMehr', 0, [1, 2, 3]]]) {
      const { ctx, page } = await mitFinger(mitWasser(start), vp);
      await page.waitForTimeout(200);
      // Die Reihe 12 Pixel über die Reiter rollen – so weit, wie man rollt, bis sie auftaucht.
      const luecke = await page.evaluate(() => {
        const r = document.querySelector('.wasser').getBoundingClientRect();
        const unten = document.getElementById('tabbar').getBoundingClientRect().top;
        window.scrollBy(0, r.bottom - (unten - 12));
        return Math.round(unten - document.querySelector('.wasser').getBoundingClientRect().bottom);
      });
      await page.waitForTimeout(150);
      const b = await page.locator(sel).boundingBox();
      const reihe = [];
      const bedeckt = [];
      for (let i = 0; i < 3; i++) {
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(800);
        reihe.push(wasserVon((await speicher(page)).tage[heute]));
        bedeckt.push(await ueberdeckt(page, sel));
      }
      const m = (await page.locator('#toast').textContent()) || '';
      faelle += 1;
      if (luecke !== 12 || reihe.join() !== soll.join() || bedeckt.some(Boolean)
        || !m.includes(`Heute: ${soll[2] === 1 ? '1 Glas' : `${soll[2]} Gläser`}.`)) {
        daneben.push(`${vp.width}×${vp.height} ${sel}: ${reihe.join(', ')} statt ${soll.join(', ')}, `
          + `Meldung über dem Knopf ${bedeckt.join('/')}, Abstand ${luecke}, „${m}"`);
      }
      await ctx.close();
    }
  }
  check(faelle === 6 && daneben.length === 0,
    `knapp über den Reitern zählt jeder Tipp auf „−" und „+", und die Meldung liegt nie über dem Knopf (${faelle} Fälle`
    + `${daneben.length ? `; daneben: ${daneben.join(' | ')}` : ''})`);

  /*
   * Vertippt: „+", gleich danach „−". Auf breiten iPhones liegt die Meldung
   * von „+" über „−" und der Zahl, ohne „+" zu berühren. Der Tipp auf „−"
   * zählt trotzdem – die Meldung eines Zählknopfs lässt Tipps durch.
   */
  const falsch = [];
  let faelle2 = 0;
  let ueberMinus = 0;
  for (const [vp, start] of [
    [{ width: 414, height: 896 }, 1], [{ width: 414, height: 896 }, 3], [{ width: 430, height: 932 }, 3],
    [{ width: 390, height: 844 }, 0],
  ]) {
    for (const abstand of [120, 350]) {
      const { ctx, page } = await mitFinger(mitWasser(start), vp);
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        const r = document.querySelector('.wasser').getBoundingClientRect();
        const unten = document.getElementById('tabbar').getBoundingClientRect().top;
        window.scrollBy(0, r.bottom - (unten - 12));
      });
      await page.waitForTimeout(150);
      const plus = await page.locator('#wasserMehr').boundingBox();
      const minus = await page.locator('#wasserWeniger').boundingBox();
      await page.touchscreen.tap(plus.x + plus.width / 2, plus.y + plus.height / 2);
      await page.waitForTimeout(abstand);
      if (await ueberdeckt(page, '#wasserWeniger')) ueberMinus += 1;
      await page.touchscreen.tap(minus.x + minus.width / 2, minus.y + minus.height / 2);
      await page.waitForTimeout(400);
      const n = wasserVon((await speicher(page)).tage[heute]);
      const m = (await page.locator('#toast').textContent()) || '';
      faelle2 += 1;
      if (n !== start || !m.includes('zurückgenommen')) falsch.push(`${vp.width}×${vp.height} ab ${start}, ${abstand} ms: ${n} – „${m}"`);
      await ctx.close();
    }
  }
  check(faelle2 === 8 && falsch.length === 0 && ueberMinus > 0,
    `„+", gleich danach „−": die Zahl ist wieder die alte, auch wenn die Meldung von „+" über „−" liegt (${faelle2} Fälle, `
    + `${ueberMinus}× über „−"${falsch.length ? `; daneben: ${falsch.join(' | ')}` : ''})`);
}

/* ---------- 5. Sicherung, Einlesen, Zusammenführen ---------- */

{
  const { ctx, page } = await iphone({
    ...ALT,
    tage: {
      [gestern]: { stress: 1, wasser: 2 },
      [vorTagen(2)]: { wasser: 6 },
      [vorTagen(4)]: { schlaf: 2 },
    },
  });
  const e = await page.evaluate(async () => {
    const st = await import('/js/store.js');
    const text = st.alsJSON();
    const raus = { text };
    // In ein leeres Tagebuch: ersetzt, Wasser bleibt.
    st.allesLoeschen();
    raus.leer = st.einlesen(text);
    raus.nachLeer = JSON.parse(JSON.stringify(st.zustandLesen().tage));
    return raus;
  });
  check(JSON.parse(e.text).tage[gestern].wasser === 2, 'die Sicherung trägt das Wasser');
  check(
    !e.leer.zusammengefuehrt && e.nachLeer[gestern].wasser === 2 && e.nachLeer[gestern].stress === 1
      && e.nachLeer[vorTagen(2)].wasser === 6,
    'eingelesen in ein leeres Tagebuch ist es wieder da',
  );

  /*
   * Zusammenführen: je Tag die größere Zahl. Hier stehen 2 und 6, die
   * Sicherung bringt 5 und 3 – also 5 und 6. Dort steht außerdem ein Tag, den
   * es hier nicht gibt, und eine Tagesfrage, die hier anders beantwortet ist.
   */
  const dazu = JSON.stringify({
    eintraege: [],
    tage: {
      [gestern]: { stress: 3, wasser: 5 },
      [vorTagen(2)]: { wasser: 3 },
      [vorTagen(5)]: { wasser: 4 },
    },
  });
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await kurz(page);
  await page.locator('[data-act="einfuegen-auf"]').click();
  await kurz(page);
  await page.locator('[data-act="einfuegen-text"]').fill(dazu);
  await page.locator('[data-act="einfuegen-los"]').click();
  await page.waitForTimeout(300);
  let s = await speicher(page);
  check(s.tage[gestern].wasser === 5, `beim Zusammenführen gewinnt die größere Zahl, auch von dort (${s.tage[gestern].wasser})`);
  check(s.tage[gestern].stress === 1, 'die Tagesfrage bleibt, wie sie hier stand');
  check(s.tage[vorTagen(2)].wasser === 6, `und die größere von hier bleibt (${s.tage[vorTagen(2)].wasser})`);
  check(s.tage[vorTagen(5)] && s.tage[vorTagen(5)].wasser === 4, 'ein Tag, den es nur dort gibt, kommt dazu');
  check(s.tage[vorTagen(4)].schlaf === 2 && !('wasser' in s.tage[vorTagen(4)]), 'ein Tag ohne Wasser bekommt keins');

  /* Was in einer Datei alles stehen kann */
  const sauber = await page.evaluate(async ([g, v2, v3, v4, v6]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.einlesen(JSON.stringify({
      eintraege: [{ id: 'x', art: 'notiz', am: g, um: '09:00', text: 'x' }],
      tage: {
        [g]: { wasser: '3' },
        [v2]: { wasser: -1 },
        [v3]: { wasser: 'viel', stress: 2 },
        [v4]: { wasser: 2.6 },
        [v6]: { wasser: 500 },
      },
      wasserGlas: 123,
      wasserZeigen: 'ja',
    }));
    return st.zustandLesen();
  }, [gestern, vorTagen(2), vorTagen(3), vorTagen(4), vorTagen(6)]);
  check(sauber.tage[gestern].wasser === 3, '„3" als Text wird die Zahl 3');
  check(!(vorTagen(2) in sauber.tage), 'eine negative Zahl fällt weg, und mit ihr der leere Tag');
  check(sauber.tage[vorTagen(3)].stress === 2 && !('wasser' in sauber.tage[vorTagen(3)]), 'Unsinn fällt weg, die Tagesfrage bleibt');
  check(sauber.tage[vorTagen(4)].wasser === 3, 'eine Kommazahl wird gerundet');
  check(sauber.tage[vorTagen(6)].wasser === WASSER_HOECHSTENS, 'und eine riesige auf die Obergrenze gesetzt');
  check(sauber.wasserGlas === 250 && sauber.wasserZeigen === true, 'eine unbekannte Glasgröße und ein falscher Schalter werden die Vorgabe');

  /* Eine Sicherung von vor dem Wasser */
  const alt = await page.evaluate(async ([g]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.einlesen(JSON.stringify({
      eintraege: [{ id: 'y', art: 'essen', am: g, um: '12:00', was: 'Reis', tags: ['fett'] }],
      tage: { [g]: { stimmung: 1 } },
      tagesfragen: ['stimmung'],
      fenster: 4,
    }));
    const z = st.zustandLesen();
    return { zeigen: z.wasserZeigen, glas: z.wasserGlas, tag: z.tage[g], anzahl: z.eintraege.length };
  }, [gestern]);
  check(
    alt.zeigen === true && alt.glas === 250 && alt.anzahl === 1 && alt.tag.stimmung === 1 && !('wasser' in alt.tag),
    'eine alte Sicherung lädt wie bisher, mit dem Zählen an',
  );

  /* Ein Tagebuch, in dem nur Wasser steht, gilt nicht als leer */
  const nurW = await page.evaluate(async ([h, g]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.wasserZaehlen(h, 1);
    const leer = st.istLeer();
    const r = st.einlesen(JSON.stringify({ eintraege: [{ id: 'z', art: 'notiz', am: g, um: '10:00', text: 'z' }] }));
    return { leer, zusammen: r.zusammengefuehrt, wasser: (st.zustandLesen().tage[h] || {}).wasser };
  }, [heute, gestern]);
  check(!nurW.leer && nurW.zusammen && nurW.wasser === 1, 'ein Tagebuch mit nur Wasser wird beim Einlesen zusammengeführt, nicht ersetzt');

  /* Die Einstellungen wandern mit, wie die anderen auch */
  const einst = await page.evaluate(async ([h]) => {
    const st = await import('/js/store.js');
    st.allesLoeschen();
    st.wasserZaehlen(h, 1);
    const r = st.einlesen(JSON.stringify({ eintraege: [], wasserZeigen: false, wasserGlas: 330 }));
    const z = st.zustandLesen();
    return { zusammen: r.zusammengefuehrt, zeigen: z.wasserZeigen, glas: z.wasserGlas, wasser: z.tage[h] };
  }, [heute]);
  check(
    einst.zusammen && einst.zeigen === false && einst.glas === 330 && einst.wasser && einst.wasser.wasser === 1,
    'wer hier nichts umgestellt hat, bekommt Schalter und Glas von dort – und behält sein Wasser',
  );
  await ctx.close();
}

/* ---------- 6. Muster und Bericht in der App ---------- */

{
  const e = genugFaelle.e.map((x) => ({ ...x }));
  const { ctx, page } = await iphone({
    begruesst: true, tab: 'muster', alterName: null, eintraege: e, tage: genugFaelle.t,
  });
  await kurz(page);
  const karte = page.locator('.karte-stuhl');
  check(await karte.count() === 1, 'unter „Muster" steht die Stuhlgang-Karte');
  const hinweis = (await page.locator('.wasser-hinweis').textContent()) || '';
  check(hinweis.includes('3 von 6') && hinweis.includes('0 von 6'), `mit genug Fällen steht dort der Hinweis mit Fallzahlen (${hinweis.replace(/\s+/g, ' ').trim()})`);
  check(hinweis.includes('nicht woran es liegt'), 'und dem Vorbehalt');
  await karte.screenshot({ path: `${SHOT}/wasser-muster.png` });
  let m = await breite(page);
  check(m.breit <= m.fenster, `„Muster" mit Hinweis: nichts ragt über den Rand (${m.breit}/${m.fenster})`);

  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await kurz(page);
  await page.locator('[data-act="bericht"][data-n="30"]').click();
  await page.waitForTimeout(300);
  const text = await page.locator('.bericht').inputValue();
  check(/Wasser\s+im Mittel 5 Gläser \(≈ 1,3 l\)/.test(text), 'der Bericht hat die Wasserzeile');
  check(text.includes('an 12 Tagen mit Angabe'), 'mit der Zahl der Tage');
  check(
  text.replace(/\s+/g, ' ').includes('war der Stuhlgang öfter hart: 3 von 6 Mal')
    && text.includes('(Gezählt am selben Tag, keine Ursache.)'),
  'und beim Stuhlgang den Vergleich, mit Vorbehalt',
);
  m = await breite(page);
  check(m.breit <= m.fenster, `„Mehr" mit Bericht: nichts ragt über den Rand (${m.breit}/${m.fenster})`);
  await ctx.close();

  // Mit zu wenigen Fällen: kein Hinweis, auch kein „noch nicht".
  const w = await iphone({
    begruesst: true, tab: 'muster', alterName: null, eintraege: wenigFaelle.e, tage: wenigFaelle.t,
  });
  await kurz(w.page);
  check(await w.page.locator('.karte-stuhl').count() === 1, 'mit wenigen Fällen steht die Stuhlgang-Karte auch');
  check(await w.page.locator('.wasser-hinweis').count() === 0, 'aber ohne Wasserhinweis');
  await w.ctx.close();
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
