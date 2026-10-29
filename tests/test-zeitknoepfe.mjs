/*
 * „morgens, mittags, abends" und „vor, beim, nach dem Essen".
 *
 * Im Nachhinein weiß niemand mehr die Minute, wohl aber, dass etwas morgens
 * vor dem Frühstück war. Geprüft wird dreierlei:
 *
 *   1. Die Knöpfe setzen eine Uhrzeit, die zur richtigen Mahlzeit gehört –
 *      zu der dieses Tages, nicht zu einer erfundenen.
 *   2. Der Eintrag bleibt als ungefähr erkennbar, in der Liste und im
 *      Speicher, und eine von Hand gesetzte Uhrzeit macht ihn wieder genau.
 *   3. Die Auswertung lässt sich davon nicht täuschen: Das Zeitprofil, das
 *      auf die Stunde genau fragt, wie lange nach dem Essen etwas kam, zählt
 *      solche Mahlzeiten nicht als beobachtet. Sonst stünde jede „nach dem
 *      Essen"-Beschwerde künstlich im frühen Fenster.
 */
import { chromium } from 'playwright';
import { ROOT, KEY, HANDY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import { fensterWerte } from '../js/zeitprofil.js';
import { folgende, stundenSeitEssen } from '../js/auswertung.js';

const { check, ende } = pruefer();

/* ---------- Zuerst die Rechnung, ohne Browser ---------- */

const T = '2026-10-20';
const abendessen = { id: 'm2', art: 'essen', am: T, um: '19:10', zutaten: [] };
const genau = { id: 'b1', art: 'beschwerde', am: T, um: '19:50', staerke: 5 };
const ungefaehr = { ...genau, id: 'b2', ungefaehr: true, tageszeit: 'abends', bezug: 'nach' };

const mitGenau = fensterWerte([abendessen, genau])[0].werte;
const mitUngefaehr = fensterWerte([abendessen, ungefaehr])[0].werte;
// Ohne Eintrag danach ist kein Fenster beobachtbar; für die Gegenprobe
// braucht es also einen späteren Eintrag, der das Tagebuch offen hält.
const spaeter = { id: 'n', art: 'notiz', am: '2026-10-21', um: '08:00', text: 'x' };
const genauOffen = fensterWerte([abendessen, genau, spaeter])[0].werte;
const ungefaehrOffen = fensterWerte([abendessen, ungefaehr, spaeter])[0].werte;
check(
  genauOffen.frueh.beobachtbar && genauOffen.frueh.wert === 5,
  'eine genaue Beschwerde kurz nach dem Essen zählt im frühen Fenster',
);
check(
  !ungefaehrOffen.frueh.beobachtbar && !ungefaehrOffen.mittel.beobachtbar
    && !ungefaehrOffen.spaet.beobachtbar,
  'eine ungefähre zählt in keinem Fenster – „nach dem Essen" ist keine Stunde',
);
check(
  JSON.stringify(mitGenau) !== JSON.stringify(ungefaehrOffen) || !mitUngefaehr.frueh.beobachtbar,
  'und das unterscheidet sich vom genauen Fall',
);
const ungefaehrMahlzeit = fensterWerte([{ ...abendessen, ungefaehr: true }, genau, spaeter])[0].werte;
check(!ungefaehrMahlzeit.frueh.beobachtbar, 'auch eine ungefähr eingetragene Mahlzeit hat keine beobachteten Fenster');

/*
 * Für die Zuordnung zur Mahlzeit reicht die ungefähre Zeit dagegen – genau
 * dafür ist sie da. Auch „beim Essen": Es liegt mit Absicht zehn Minuten nach
 * dem Beginn der Mahlzeit, denn eine Beschwerde zur selben Minute rechnet die
 * Auswertung ihr nicht zu.
 */
const beim = { id: 'b3', art: 'beschwerde', am: T, um: '19:20', staerke: 4, ungefaehr: true, bezug: 'beim' };
check(folgende([abendessen, beim], abendessen, 4).length === 1, '„beim Essen" gehört zu dieser Mahlzeit');
check(stundenSeitEssen([abendessen, beim], beim) !== null, 'und gilt als nach dem Essen, nicht als nüchtern');

/* ---------- Im Browser: der Bogen ---------- */

const kopie = await kopieServer(ROOT, 8261, { maxAge: 0 });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY, serviceWorkers: 'block' });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const gestern = vorTagen(1);
await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
await page.evaluate(([k, tag]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true,
  tab: 'heute',
  eintraege: [
    { id: 'mittag', art: 'essen', am: tag, um: '12:40', was: 'Reis', zutaten: [], portion: 'normal' },
    { id: 'abend', art: 'essen', am: tag, um: '19:10', was: 'Suppe', zutaten: [], portion: 'normal' },
  ],
})), [KEY, gestern]);
await page.reload({ waitUntil: 'networkidle' });

// Auf gestern blättern – der Abend, an dem nachgetragen wird.
await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await page.waitForTimeout(150);

const uhr = () => page.locator('#bogenUhr').inputValue();
const tippe = async (act, id) => {
  await page.locator(`[data-act="${act}"][data-id="${id}"]`).click();
  await page.waitForTimeout(120);
};

await page.locator('[data-act="neu"][data-art="beschwerde"]').click();
await page.waitForTimeout(150);
check(await page.locator('[data-act="zeit-tageszeit"]').count() === 3, 'die Beschwerde hat „morgens, mittags, abends"');
check(await page.locator('[data-act="zeit-bezug"]').count() === 3, 'und „vor, beim, nach dem Essen"');

await tippe('zeit-tageszeit', 'abends');
check(await uhr() === '18:30', `„abends" setzt eine Abendzeit (${await uhr()})`);
check(
  await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').getAttribute('aria-pressed') === 'true',
  'und der Knopf ist als gewählt markiert',
);
check((await page.locator('.zeit-hinweis').textContent()).includes('Ungefähr'), 'der Bogen sagt, dass die Zeit ungefähr ist');

await tippe('zeit-bezug', 'nach');
check(await uhr() === '19:40', `„nach dem Essen" richtet sich nach dem Abendessen um 19:10 (${await uhr()})`);

await page.screenshot({ path: `${SHOT}/zeitknoepfe-bogen.png` });
await tippe('zeit-bezug', 'vor');
check(await uhr() === '18:40', `„vor dem Essen" danach: von derselben Mahlzeit aus, nicht von der verschobenen Zeit (${await uhr()})`);

await tippe('zeit-tageszeit', 'mittags');
check(await uhr() === '12:10', `„mittags" mit „vor dem Essen" heißt vor dem Mittagessen um 12:40 (${await uhr()})`);

await page.locator('.stufe[data-n="4"]').click();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);

let gespeichert = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
let b = gespeichert.eintraege.find((e) => e.art === 'beschwerde');
check(
  b && b.um === '12:10' && b.ungefaehr === true && b.tageszeit === 'mittags' && b.bezug === 'vor',
  `der Eintrag trägt Zeit und Herkunft (${b && JSON.stringify({ um: b.um, u: b.ungefaehr, t: b.tageszeit, z: b.bezug })})`,
);
check(b && b.bezugMahlzeit === 'mittag', 'und die Mahlzeit, auf die er sich bezieht');
check(b && !('bezugBasis' in b), 'ein Hilfswert des Bogens bleibt nicht im Speicher');

const zeile = (await page.locator('.strang-zeile.z-beschwerde').textContent()).replace(/\s+/g, ' ');
check(zeile.includes('≈12:10'), `in der Liste steht die Zeit als ungefähr (${zeile.trim().slice(0, 60)})`);
check(zeile.includes('mittags, vor dem Essen'), 'mit den Worten, die gewählt wurden');
await page.screenshot({ path: `${SHOT}/zeitknoepfe-liste.png` });

/* ---------- Von Hand gesetzt ist wieder genau ---------- */

await page.locator('.strang-zeile.z-beschwerde [data-act="bearbeiten"]').click();
await page.waitForTimeout(150);
check(
  await page.locator('[data-act="zeit-bezug"][data-id="vor"]').getAttribute('aria-pressed') === 'true',
  'beim Bearbeiten sind die gewählten Knöpfe wieder markiert',
);
await page.locator('#bogenUhr').fill('13:05');
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
gespeichert = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
b = gespeichert.eintraege.find((e) => e.art === 'beschwerde');
check(
  b && b.um === '13:05' && !b.ungefaehr && !b.tageszeit && !b.bezug,
  `eine Uhrzeit von Hand macht den Eintrag wieder genau (${b && JSON.stringify({ um: b.um, u: b.ungefaehr })})`,
);
check(
  !(await page.locator('.strang-zeile.z-beschwerde').textContent()).includes('≈'),
  'und in der Liste steht kein ≈ mehr',
);

/* ---------- Welche Knöpfe wo ---------- */

for (const [art, mitBezug] of [['essen', false], ['medikament', true], ['stuhl', false], ['kopf', false], ['notiz', false]]) {
  await page.locator(`[data-act="neu"][data-art="${art}"]`).click();
  await page.waitForTimeout(150);
  const tz = await page.locator('[data-act="zeit-tageszeit"]').count();
  const bz = await page.locator('[data-act="zeit-bezug"]').count();
  check(
    tz === 3 && (bz === 3) === mitBezug,
    `${art}: Tageszeit ${tz === 3 ? 'ja' : 'nein'}, Bezug zum Essen ${bz ? 'ja' : 'nein'}`,
  );
  await page.locator('button.bogen-zu').click();
  await page.waitForTimeout(100);
}

/* ---------- Ohne Mahlzeit an diesem Tag ---------- */

await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await page.waitForTimeout(150);
await page.locator('[data-act="neu"][data-art="medikament"]').click();
await page.waitForTimeout(150);
await tippe('zeit-tageszeit', 'abends');
await tippe('zeit-bezug', 'nach');
check(await uhr() === '19:00', `ohne Mahlzeit rechnet „nach dem Essen" von der Tageszeit aus (${await uhr()})`);
check(
  (await page.locator('.zeit-hinweis').textContent()).includes('noch keine Mahlzeit'),
  'und sagt das dazu',
);

// Ohne Mahlzeit, an der die Zeit einrasten könnte, zeigt sich, ob sie
// wandert: „vor" nach „nach" muss von 18:30 aus rechnen, nicht von 19:00.
await tippe('zeit-bezug', 'vor');
check(await uhr() === '18:00', `„vor" nach „nach" wandert nicht weiter (${await uhr()})`);
await tippe('zeit-bezug', 'nach');

// Noch einmal getippt: der Bezug fällt weg, die Zeit bleibt.
await tippe('zeit-bezug', 'nach');
check(
  await page.locator('[data-act="zeit-bezug"][aria-pressed="true"]').count() === 0 && await uhr() === '19:00',
  'ein zweiter Tipp nimmt den Bezug zurück und lässt die Zeit stehen',
);
await page.locator('button.bogen-zu').click();

/* ---------- Kopfschmerz mit „dazu genommen" ---------- */

/*
 * „Dazu genommen" legt das Mittel zur selben Zeit an. War die Zeit des
 * Kopfschmerzes nur ungefähr, ist es die des Mittels auch – sonst sähe eine
 * geschätzte Abendzeit beim Mittel aus wie eine gemessene.
 */
await page.evaluate((k) => {
  const z = JSON.parse(localStorage.getItem(k));
  z.zuletztMittel = ['Ibuprofen'];
  localStorage.setItem(k, JSON.stringify(z));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="neu"][data-art="kopf"]').click();
await page.waitForTimeout(150);
await page.locator('.stufe[data-n="5"]').click();
await tippe('zeit-tageszeit', 'abends');
const dazu = page.locator('[data-act="kopf-dazu"]').first();
if (await dazu.count()) await dazu.click();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
gespeichert = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const mittel = gespeichert.eintraege.find((e) => e.art === 'medikament');
check(
  mittel && mittel.ungefaehr === true && mittel.tageszeit === 'abends' && mittel.um === '18:30',
  `das dazu genommene Mittel ist ebenso ungefähr (${mittel && JSON.stringify({ um: mittel.um, u: mittel.ungefaehr })})`,
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
