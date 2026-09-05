/*
 * Zwei Dinge, die verhindern sollen, dass das Tagebuch aufhört.
 *
 * DER SCHNELLEINTRAG. Tagebücher sterben nicht an falschen Auswertungen,
 * sondern daran, dass nach drei Wochen niemand mehr etwas einträgt. Das
 * gleiche Müsli zum vierten Mal über sechs Bildschirme einzutragen ist genau
 * die Stelle, an der aufgehört wird. Ein Tipp muss reichen – aber ohne dabei
 * etwas zu erfinden: Was gespeichert wird, muss dieselbe Mahlzeit sein, mit
 * denselben Zutaten, sonst rechnet die Auswertung hinterher mit Erfundenem.
 *
 * DIE VERSUCHS-HISTORIE. Ein Auslassversuch, der nichts ergab, ist kein
 * Misserfolg, sondern ein Ergebnis – und ohne Gedächtnis wird derselbe Verdacht
 * in einem halben Jahr noch einmal geprüft. Geprüft wird, dass auch das
 * „spricht dagegen" bleibt und nicht stillschweigend verschwindet.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();
const zustand = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const setze = async (s) => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify(z)), [KEY, s]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
};

/* ==================== Der Schnelleintrag ==================== */

/*
 * „Müsli mit Joghurt" gab es viermal, „Pizza" einmal. Nur das erste ist eine
 * Gewohnheit – eine Mahlzeit, die es einmal gab, gehört nicht als Vorschlag
 * auf den Tagesreiter.
 */
const eintraege = [];
const tage = {};
for (let i = 1; i <= 4; i++) {
  const am = vorTagen(i);
  tage[am] = { notiert: true };
  eintraege.push({
    id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Müsli mit Joghurt', portion: 'normal',
    zutaten: [{ id: 'milch', rolle: 'haupt' }, { id: 'obst', rolle: 'beilage' }],
  });
}
eintraege.push({
  id: 'p1', am: vorTagen(2), um: '19:00', art: 'essen', was: 'Pizza', portion: 'gross',
  zutaten: [{ id: 'fett', rolle: 'haupt' }],
});

await setze({ begruesst: true, tab: 'heute', eintraege, tage });

const marken = await page.locator('.marke-schnell').allTextContents();
check(marken.length === 1, `nur die wiederkehrende Mahlzeit wird vorgeschlagen (${marken.length})`);
check(marken[0].includes('Müsli'), 'und zwar das Müsli');
check(marken[0].includes('4×'), 'mit der Anzahl daneben – kein Vorschlag ohne Zahl');
check(
  !marken.join(' ').includes('Pizza'),
  'einmal Pizza ist keine Gewohnheit und wird nicht vorgeschlagen',
);

await page.locator('.marke-schnell').first().click();
await page.waitForTimeout(400);

const nachher = await zustand();
const neu = nachher.eintraege.filter((e) => e.am === vorTagen(0) || e.am === new Date().toISOString().slice(0, 10));
check(neu.length === 1, 'ein Tipp legt genau einen Eintrag an');
check(neu[0].was === 'Müsli mit Joghurt', 'mit demselben Namen');
check(
  neu[0].zutaten.length === 2 && neu[0].zutaten.map((z) => z.id).sort().join() === 'milch,obst',
  'und denselben Zutaten – sonst rechnete die Auswertung mit Erfundenem',
);
check(neu[0].portion === 'normal', 'auch die Portion kommt mit');
check(/^\d{2}:\d{2}$/.test(neu[0].um), `die Uhrzeit ist die jetzige (${neu[0].um})`);
check(
  (await text(page.locator('#toast'))).length > 0,
  'die App meldet, dass etwas passiert ist',
);
check(
  (await text(page.locator('.strang'))).includes('Müsli mit Joghurt'),
  'und der Eintrag steht sofort im Tag',
);

/* ---------- Nur für heute ---------- */

await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await page.waitForTimeout(300);
check(
  await page.locator('.marke-schnell').count() === 0,
  'auf einem vergangenen Tag gibt es den Schnelleintrag nicht – dort wäre „jetzt" gelogen',
);

/* ==================== Die Versuchs-Historie ==================== */

/*
 * Ein abgeschlossener Versuch, der dagegen sprach: ohne Milch war es genauso
 * schlecht. Genau der Fall, der ohne Gedächtnis verlorengeht.
 */
const vEintraege = [];
const vTage = {};
for (let i = 1; i <= 60; i++) {
  const am = vorTagen(i);
  vTage[am] = { notiert: true };
  vEintraege.push({
    id: `vb${i}`, am, um: '14:00', art: 'beschwerde', staerke: 5, arten: ['brennen'],
  });
  // Milch nur außerhalb der Auslasszeit (Tag 40 bis 26).
  if (i > 40 || i < 26) {
    vEintraege.push({
      id: `vm${i}`, am, um: '08:00', art: 'essen', was: 'Kaffee', portion: 'normal',
      zutaten: [{ id: 'milch', rolle: 'haupt' }],
    });
  }
}

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: vEintraege,
  tage: vTage,
  versuch: {
    id: 'v1', art: 'ausloeser', ziel: 'milch', start: vorTagen(40), tage: 14,
    provokation: vorTagen(25), beendet: true,
  },
});

check(
  (await text(page.locator('.karte.versuch'))).includes('Auslassversuch: Milch'),
  'der fertige Versuch steht unter Muster',
);
check(
  await page.locator('[data-act="versuch-ablegen"]').count() === 1,
  'und lässt sich abhaken und behalten',
);

await page.locator('[data-act="versuch-ablegen"]').click();
await page.waitForTimeout(400);

const abgelegt = await zustand();
check(!abgelegt.versuch, 'danach läuft kein Versuch mehr');
check(abgelegt.versuche.length === 1, 'aber er ist nicht weg – er steht in der Liste');
check(abgelegt.versuche[0].ziel === 'milch', 'mit dem, was weggelassen wurde');

const historie = await text(page.locator('.karte-geprueft'));
check(historie.includes('Milch'), 'die Liste zeigt ihn an');
check(
  historie.includes('spricht dagegen'),
  `auch ein Versuch, der nichts ergab, bleibt stehen (${historie.slice(0, 120)})`,
);
check(historie.includes('14 Tage'), 'mit Dauer');
check(/ohne \d,\d statt \d,\d/.test(historie), 'und den Zahlen, auf denen das Urteil beruht');

/*
 * Die Liste hing einmal am laufenden Versuch und verschwand beim Abhaken –
 * also genau dann, wenn sie zum ersten Mal etwas enthielt.
 */
check(
  await page.locator('.karte.versuch').count() === 0
    && await page.locator('.karte-geprueft').count() === 1,
  'sie bleibt stehen, obwohl kein Versuch mehr läuft',
);

/* ---------- Im Bericht ---------- */

await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(250);
await page.locator('[data-act="bericht"][data-n="90"]').click();
await page.waitForTimeout(500);
const bericht = await page.locator('.bericht').inputValue();
check(bericht.includes('SCHON GEPRÜFT'), 'der Bericht führt geprüfte Versuche auf');
check(
  bericht.includes('spricht dagegen'),
  'auch die, die dagegen sprachen – sonst schickt die Sprechstunde denselben Verdacht neu los',
);

/* ---------- Und wieder wegräumen lässt sie sich ---------- */

await page.locator('[data-act="tab"][data-tab="muster"]').click();
await page.waitForTimeout(250);
await page.locator('[data-act="versuch-alt-weg"]').click();
await page.waitForTimeout(300);
check(
  await page.locator('.karte-geprueft').count() === 0,
  'ein Eintrag lässt sich aus der Liste nehmen',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/schnell.png`, fullPage: true });
await browser.close();
ende();
