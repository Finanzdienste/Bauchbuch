/*
 * Der Auslassversuch – der einzige Teil, der aus Beobachtung einen Beleg macht.
 *
 * Und deshalb der Teil mit der größten Verantwortung. Ein Versuch, dessen
 * Ergebnis zu großzügig gelesen wird, führt dazu, dass jemand ein Lebensmittel
 * für immer streicht, ohne dass es ihm besser geht – einseitiger essen als
 * Preis für nichts. Geprüft wird deshalb vor allem, wann die App *nicht*
 * „spricht dafür" sagt:
 *
 *   * solange die Wiedereinführung fehlt,
 *   * wenn es ohne zwar besser war, aber mit der Wiedereinführung nicht
 *     zurückkam,
 *   * wenn die Auslasszeit gar keine war, weil es doch im Tagebuch steht,
 *   * wenn auf einer Seite zu wenige Tage notiert sind.
 *
 * Und einmal der Fall, für den es das alles gibt: besser ohne, zurück mit.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();
const setze = async (zustand) => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, zustand]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
};

const mahlzeit = (t, zutat) => ({
  id: `e${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag',
  portion: 'normal', zutaten: zutat ? [{ id: zutat, rolle: 'haupt' }] : [],
});
const beschwerde = (t, staerke) => ({
  id: `b${t}`, am: vorTagen(t), um: '14:00', art: 'beschwerde', staerke, arten: ['blaehung'],
});

/* ---------- Er wird überhaupt vorgeschlagen ---------- */

const auffaellig = [];
for (let t = 1; t <= 30; t++) {
  const mitMilch = t % 2 === 0;
  auffaellig.push(mahlzeit(t, mitMilch ? 'milch' : null));
  auffaellig.push(beschwerde(t, mitMilch ? 8 : 0));
}
await setze({ begruesst: true, tab: 'muster', eintraege: auffaellig, tage: {}, fenster: 4, mindestFaelle: 5 });

const angebot = page.locator('.versuch-wahl');
check(await angebot.count() === 1, 'bei einem auffälligen Befund wird ein Versuch angeboten');
const aText = await text(angebot);
check(
  aText.includes('Laktose') || aText.includes('Milchprodukte'),
  'mit dem Namen des Verdächtigen auf dem Knopf, nicht als allgemeiner Rat',
);
check(
  await page.locator('[data-act="versuch-start"]').count() >= 3,
  'und mit einer Dauer zur Wahl – 7, 14 oder 21 Tage',
);
check(
  (await text(page.locator('.karte.karte-merk', { hasText: 'Einen Auslassversuch machen' })))
    .includes('bewusst wieder essen'),
  'die Wiedereinführung wird angekündigt, bevor es losgeht: Ohne sie ist der Versuch wertlos',
);

/* ---------- Starten ---------- */

await page.locator('[data-act="versuch-start"]').first().click();
await page.waitForTimeout(300);
const gestartet = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).versuch, KEY);
check(!!gestartet && !!gestartet.start, 'der Versuch steht im Speicher');
check(gestartet.provokation === null, 'die Wiedereinführung steht noch aus');
check(
  (await text(page.locator('#view'))).includes('Tag 1 von'),
  'und auf dem Tagesreiter steht, der wievielte Tag heute ist',
);

/*
 * Ein fertiger Versuch, von Hand gestellt: Der Zeitablauf lässt sich im Test
 * nicht abwarten, also wird der Zustand gesetzt, den vierzehn Tage erzeugt
 * hätten. Gerechnet wird trotzdem alles aus den Eintragungen.
 */
const versuchStand = (provokationVorTagen) => ({
  id: 'v1', art: 'ausloeser', ziel: 'milch', start: vorTagen(20), tage: 14,
  provokation: provokationVorTagen === null ? null : vorTagen(provokationVorTagen),
  beendet: null,
});

/*
 * Der Fall, für den es den Versuch gibt.
 *
 *   Tag 34 bis 21 (davor):    Milch täglich, Stärke 7
 *   Tag 20 bis  7 (ohne):     keine Milch, Stärke 1
 *   Tag  5 bis  3 (danach):   Milch wieder, Stärke 7
 */
const gutErkannt = [];
for (let t = 34; t >= 21; t--) { gutErkannt.push(mahlzeit(t, 'milch'), beschwerde(t, 7)); }
for (let t = 20; t >= 7; t--) { gutErkannt.push(mahlzeit(t, null), beschwerde(t, 1)); }
for (let t = 5; t >= 3; t--) { gutErkannt.push(mahlzeit(t, 'milch'), beschwerde(t, 7)); }

await setze({
  begruesst: true, tab: 'muster', eintraege: gutErkannt, tage: {},
  fenster: 4, mindestFaelle: 5, versuch: versuchStand(5),
});

const karte = page.locator('.versuch');
const vText = await text(karte);
check(vText.includes('spricht dafür'), 'besser ohne und zurück mit: das spricht dafür');
check(
  vText.includes('Davor') && vText.includes('Ohne') && vText.includes('Danach'),
  'alle drei Zahlen stehen nebeneinander – nicht nur das Urteil',
);
check(
  vText.includes('schwer anders zu erklären'),
  'die Begründung nennt beide Hälften, nicht nur die Besserung',
);
check(
  vText.includes('ohne Verblindung') || vText.includes('Verblindung'),
  'und der Vorbehalt steht dabei: ein Mensch, keine Kontrolle',
);
await page.screenshot({ path: `${SHOT}/99-versuch.png`, fullPage: true });

/* ---------- Besser ohne, aber nicht zurück: das reicht nicht ---------- */

const nichtZurueck = [];
for (let t = 34; t >= 21; t--) { nichtZurueck.push(mahlzeit(t, 'milch'), beschwerde(t, 7)); }
for (let t = 20; t >= 7; t--) { nichtZurueck.push(mahlzeit(t, null), beschwerde(t, 1)); }
for (let t = 5; t >= 3; t--) { nichtZurueck.push(mahlzeit(t, 'milch'), beschwerde(t, 1)); }

await setze({
  begruesst: true, tab: 'muster', eintraege: nichtZurueck, tage: {},
  fenster: 4, mindestFaelle: 5, versuch: versuchStand(5),
});
const unklar = await text(page.locator('.versuch'));
check(
  unklar.includes('unklar'),
  'sechs Stufen besser ohne – und trotzdem nicht „spricht dafür", weil es nicht zurückkam',
);
check(
  unklar.includes('Zufall') || unklar.includes('Gewöhnung'),
  'stattdessen die möglichen Erklärungen, statt eine davon zu wählen',
);

/* ---------- Die Auslasszeit war keine ---------- */

const geschummelt = [];
for (let t = 34; t >= 21; t--) { geschummelt.push(mahlzeit(t, 'milch'), beschwerde(t, 7)); }
// In der „Auslasszeit" steht die Milch an fünf Tagen doch im Tagebuch.
for (let t = 20; t >= 7; t--) { geschummelt.push(mahlzeit(t, t % 3 === 0 ? 'milch' : null), beschwerde(t, 1)); }
for (let t = 5; t >= 3; t--) { geschummelt.push(mahlzeit(t, 'milch'), beschwerde(t, 7)); }

await setze({
  begruesst: true, tab: 'muster', eintraege: geschummelt, tage: {},
  fenster: 4, mindestFaelle: 5, versuch: versuchStand(5),
});
const unsauber = await text(page.locator('.versuch'));
check(
  unsauber.includes('nicht auswertbar'),
  'steht es in der Auslasszeit doch im Tagebuch, gibt es kein Ergebnis – auch kein günstiges',
);
check(
  unsauber.includes('kein Vorwurf'),
  'gesagt wird das ohne Tadel: Ein unsauberer Versuch ist keine Verfehlung, nur keine Antwort',
);

/* ---------- Zu wenige Tage ---------- */

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: [mahlzeit(20, null), beschwerde(20, 2), mahlzeit(19, null), beschwerde(19, 2)],
  tage: {},
  fenster: 4,
  mindestFaelle: 5,
  versuch: versuchStand(5),
});
const duenn = await text(page.locator('.versuch'));
check(duenn.includes('zu wenige Tage'), 'zwei notierte Tage tragen kein Ergebnis');
check(
  duenn.includes('Lücke im Tagebuch ist kein beschwerdefreier Tag'),
  'mit dem Grund, der in dieser App überall gilt',
);

/* ---------- Die Wiedereinführung wird eingefordert ---------- */

await setze({
  begruesst: true, tab: 'heute', eintraege: gutErkannt, tage: {},
  fenster: 4, mindestFaelle: 5, versuch: versuchStand(null),
});
const tagText = await text(page.locator('#view'));
check(tagText.includes('Der Versuch ist reif'), 'ist die Auslasszeit um, sagt der Tagesreiter das');
check(
  await page.locator('[data-act="versuch-provokation"]').count() === 1,
  'mit dem Knopf dafür – hier versandet ein Versuch sonst',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
