/*
 * Kommt eine neue Fassung überhaupt an?
 *
 * Diese App wird nicht aus einem Laden installiert. Sie liegt an einer Adresse,
 * und wer sie auf dem Startbildschirm hat, bekommt eine Änderung genau dann,
 * wenn der Service Worker sie durchlässt. Das ist der einzige Weg, auf dem eine
 * Verbesserung je bei jemandem ankommt – und der einzige, den man nicht merkt,
 * wenn er kaputt ist: Die App läuft ja weiter, nur eben in der alten Fassung.
 *
 * DIE DREI FALLSTRICKE, UM DIE ES GEHT
 *
 *   1. GitHub Pages schickt die Dateien mit einer Haltbarkeit von zehn
 *      Minuten. Ein gewöhnliches fetch() im Service Worker bekäme die alte
 *      Fassung aus dem Zwischenspeicher des Browsers. Deshalb lädt sw.js mit
 *      cache: 'reload' – und dieser Server schickt max-age=600.
 *   2. Der Browser erkennt eine neue Fassung nur an einer geänderten sw.js.
 *      Früher hing das an einer von Hand hochgezählten VERSION. Jetzt trägt
 *      der Bau einen Fingerabdruck aller Dateien ein (STAND) – hier wird nur
 *      eine Zeile in js/app.js geändert, die VERSION bleibt, und es muss
 *      trotzdem ankommen.
 *   3. Eine App auf dem iPhone-Startbildschirm wird selten neu gestartet. Sie
 *      liegt im Hintergrund und wird fortgesetzt. Bis zum 28.10.2026 kam eine
 *      neue Fassung erst beim nächsten echten Start; hier wird gemessen, dass
 *      sie bei der Rückkehr kommt – ohne einen einzigen Neustart.
 *
 * Was beim Neuladen in Arbeit sein darf und was nicht, prüft
 * tests/test-auffrischen.mjs.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, KEY, HANDY, pruefer } from './umgebung.mjs';
import {
  appKopie, standNeu, aendern, kopieServer, zurueckkommen, frage, warteBis, shellListe,
} from './vorrat.mjs';

const { check, ende } = pruefer();

/* ---------- Eine Kopie der App, die verändert werden darf ---------- */

const ordner = appKopie('nachschub');
const swText = () => readFileSync(path.join(ordner, 'sw.js'), 'utf8');
const standVon = (t) => (/const STAND = '([0-9a-f]*)'/.exec(t) || [])[1];
const versionVon = (t) => (/const VERSION = '([^']*)'/.exec(t) || [])[1];

check(shellListe().length >= 40, `die Kopie entsteht aus der Liste in sw.js (${shellListe().length} Dateien)`);
const alterStand = standVon(swText());
const alteVersion = versionVon(swText());
check(/^[0-9a-f]{12}$/.test(alterStand || ''), `sw.js trägt einen Stand (${alterStand})`);
check(
  alterStand === standVon(readFileSync(path.join(ROOT, 'sw.js'), 'utf8')),
  'und zwar den eingecheckten',
);

const kopie = await kopieServer(ordner, 8201);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
let ladungen = 0;
page.on('load', () => { ladungen += 1; });
// Die Uhr gehört dem Test: Die App sucht höchstens alle fünfzehn Minuten
// nach einer neuen Fassung, und so lange wartet hier niemand.
await page.clock.install();

/* ---------- 1. Die alte Fassung liegt und läuft ---------- */

await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
await page.evaluate(() => { window.__alt = true; });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
  .catch(() => {});
await page.waitForTimeout(2500);

/*
 * Beim allerersten Besuch übernimmt der Service Worker die Seite per
 * clients.claim(). Das löst dasselbe Ereignis aus wie eine neue Fassung –
 * und darf trotzdem kein Neuladen auslösen, sonst lädt jede Seite beim
 * ersten Besuch einmal neu.
 */
check(
  await frage(page, () => window.__alt === true) && ladungen === 1,
  `das erste Einrichten lädt die Seite nicht neu (${ladungen} Ladung)`,
);

await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'heute' })), KEY);
await page.reload({ waitUntil: 'networkidle' });
check(await frage(page, () => !!navigator.serviceWorker.controller), 'der Service Worker bedient die Seite');
check(
  (await page.locator('#tabbar').textContent()).includes('Tag'),
  'die alte Fassung zeigt den Reiter „Tag"',
);

// Ein Eintrag, der die Aktualisierung überleben muss.
await page.locator('[data-act="neu"][data-art="essen"]').click();
await page.locator('#bogenWas').fill('Haferbrei');
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(300);
await page.evaluate(() => { window.__alt = true; });
const nachStart = ladungen;

/* ---------- 2. Eine neue Fassung wird veröffentlicht ---------- */

/*
 * Wie in Wirklichkeit, mit einem Unterschied zu früher: Die VERSION bleibt,
 * wie sie ist. Geändert wird nur js/app.js, und der Bau trägt den neuen Stand
 * ein. Kommt das an, kann eine vergessene VERSION nichts mehr aufhalten.
 */
aendern(ordner, 'js/app.js', "{ id: 'heute', name: 'Tag'", "{ id: 'heute', name: 'NEUFASSUNG'");
const neuerStand = standNeu(ordner);
check(neuerStand !== alterStand, `der Bau trägt einen neuen Stand ein (${alterStand} → ${neuerStand})`);
check(versionVon(swText()) === alteVersion, `die VERSION ist unverändert geblieben (${alteVersion})`);

/* ---------- 3. Sie verlässt die App und kommt zurück ---------- */

// Eine Viertelstunde später – erst dann sieht die App wieder nach.
await page.clock.fastForward(16 * 60 * 1000);
await zurueckkommen(page);

const angekommen = await warteBis(
  page,
  () => !!document.querySelector('#tabbar')?.textContent.includes('NEUFASSUNG') && !window.__alt,
  null,
  40000,
);
check(angekommen, 'die neue Fassung ist da, ohne dass die App neu gestartet wurde');
check(
  ladungen - nachStart === 1,
  `und zwar mit genau einem Neuladen, das die App selbst auslöst (${ladungen - nachStart})`,
);
check(angekommen, 'trotz max-age=600, wie GitHub Pages es schickt');
const hinweis = await frage(page, () => document.querySelector('#toast')?.textContent || '');
check(/erneuert/.test(hinweis), `und ein Satz sagt, was passiert ist („${hinweis}")`);

/* ---------- 4. Der alte Vorrat wird weggeräumt ---------- */

const vorraete = await frage(page, () => caches.keys());
const unsere = vorraete.filter((n) => n.startsWith('bauchbuch-'));
check(unsere.length === 1, `nur ein Vorrat bleibt übrig (${vorraete.join(', ') || 'keiner'})`);
check(
  (unsere[0] || '').endsWith(`-${neuerStand}`),
  `und zwar der der neuen Fassung (${unsere[0]})`,
);

/* ---------- 5. Und das Tagebuch hat die Aktualisierung überlebt ---------- */

/*
 * Das Wichtigste zum Schluss. Eine Aktualisierung, die den Speicher mitnimmt,
 * wäre kein Update, sondern ein Datenverlust – und sie ist die einzige
 * Gelegenheit, bei der so etwas unbemerkt passieren kann.
 */
const tagebuch = await frage(page, (k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
check(!!tagebuch, 'das Tagebuch steht nach der Aktualisierung noch da');
check(
  !!tagebuch && tagebuch.eintraege.some((e) => e.was === 'Haferbrei'),
  'mit dem Eintrag von kurz vor der Aktualisierung',
);

/* ---------- 6. Eine Fassung, die gleich bleibt, lädt nichts neu ---------- */

const vorher = ladungen;
await page.evaluate(() => { window.__alt = true; });
await page.clock.fastForward(16 * 60 * 1000);
await zurueckkommen(page);
await page.waitForTimeout(3000);
check(
  ladungen === vorher && await frage(page, () => window.__alt === true),
  `ohne neue Fassung kein Neuladen (${ladungen - vorher})`,
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
await kopie.zu();
ende();
