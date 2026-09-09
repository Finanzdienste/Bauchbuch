/*
 * Kommt eine neue Fassung überhaupt an?
 *
 * Diese App wird nicht aus einem Laden installiert. Sie liegt an einer Adresse,
 * und wer sie auf dem Startbildschirm hat, bekommt eine Änderung genau dann,
 * wenn der Service Worker sie durchlässt. Das ist der einzige Weg, auf dem eine
 * Verbesserung je bei jemandem ankommt – und der einzige, den man nicht merkt,
 * wenn er kaputt ist: Die App läuft ja weiter, nur eben in der alten Fassung.
 * Wochenlang, ohne Fehlermeldung, während man selbst denkt, man habe längst
 * ausgeliefert.
 *
 * In tests/umgebung.mjs stand seit Langem ein zweiter Server „für den
 * Aktualisierungstest". Den Test gab es nicht. Eine Zeile, die eine Prüfung
 * beschreibt, die es nicht gibt, ist schlimmer als gar keine – man verlässt
 * sich ja darauf.
 *
 * DER FALLSTRICK, UM DEN ES GEHT
 *
 * GitHub Pages schickt die Dateien mit einer Haltbarkeit von zehn Minuten. Ein
 * gewöhnliches `fetch()` im Service Worker bekommt dann die *alte* Fassung aus
 * dem Zwischenspeicher des Browsers – und legt sie als vermeintlich frische in
 * seinen eigenen. So kann eine neue Fassung beliebig lange nicht ankommen,
 * obwohl sie längst online steht. Deshalb lädt sw.js mit `cache: 'reload'`.
 *
 * Dieser Test stellt genau das nach: ein eigener Server mit
 * `max-age=600`, wie ihn Pages schickt, über einer Kopie der App, die der Test
 * verändern darf.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, cpSync, mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT, KEY, HANDY, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();

/* ---------- Eine Kopie der App, die verändert werden darf ---------- */

const ordner = mkdtempSync(path.join(tmpdir(), 'bauchbuch-nachschub-'));
for (const teil of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'css', 'js']) {
  try {
    cpSync(path.join(ROOT, teil), path.join(ordner, teil), { recursive: true });
  } catch { /* Symbole sind für diesen Test entbehrlich */ }
}

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/*
 * Der Server schickt `max-age=600` – genau wie GitHub Pages. Ohne diese Zeile
 * prüfte der Test die einfache Welt und nicht die, in der die App steht.
 */
const server = createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split(/[?#]/)[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const datei = path.join(ordner, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  let groesse;
  try {
    groesse = statSync(datei).size;
  } catch {
    res.writeHead(404).end('nicht da');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPEN[path.extname(datei)] || 'application/octet-stream',
    'content-length': groesse,
    'cache-control': 'max-age=600',
    'service-worker-allowed': '/',
  });
  createReadStream(datei).pipe(res);
});
await new Promise((ok) => server.listen(8201, '127.0.0.1', ok));
const adresse = 'http://127.0.0.1:8201/index.html';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

/* ---------- 1. Die alte Fassung liegt und läuft ---------- */

await page.goto(adresse, { waitUntil: 'networkidle' });
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'heute' })), KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
  .catch(() => {});

check(
  await page.evaluate(() => !!navigator.serviceWorker.controller),
  'der Service Worker bedient die Seite',
);
const vorher = await page.locator('#tabbar').textContent();
check(vorher.includes('Tag'), `die alte Fassung zeigt den Reiter „Tag" (${vorher.slice(0, 40)})`);

/* ---------- 2. Eine neue Fassung wird veröffentlicht ---------- */

/*
 * Wie in Wirklichkeit: eine Änderung am Programm *und* eine hochgezählte
 * VERSION in sw.js. An der Version hängt das Aufräumen der alten Vorräte –
 * ohne sie bliebe der alte Zwischenspeicher stehen.
 */
const appDatei = path.join(ordner, 'js', 'app.js');
writeFileSync(appDatei, readFileSync(appDatei, 'utf8')
  .replace("{ id: 'heute', name: 'Tag'", "{ id: 'heute', name: 'NEUFASSUNG'"));

const swDatei = path.join(ordner, 'sw.js');
const alteVersion = /const VERSION = '(v\d+)'/.exec(readFileSync(swDatei, 'utf8'))[1];
writeFileSync(swDatei, readFileSync(swDatei, 'utf8')
  .replace(`const VERSION = '${alteVersion}'`, "const VERSION = 'vTEST'"));

/* ---------- 3. Wie oft muss sie die App öffnen, bis sie es hat? ---------- */

/*
 * Die eigentliche Frage, und sie hat eine Zahl als Antwort. „Kommt an"
 * genügt nicht: Wenn es drei Starts dauert, muss man das wissen und
 * dazusagen, statt sich zu wundern, warum die Rückmeldung ausbleibt.
 */
let oeffnungen = 0;
let angekommen = false;
for (let i = 1; i <= 4 && !angekommen; i++) {
  await page.reload({ waitUntil: 'networkidle' });
  /*
   * Gewartet wird auf die Bedingung, nicht auf die Uhr: bis der neue Vorrat
   * angelegt ist. Mit einer festen Zeit stand hier erst „drei Starts" – der
   * dritte war nichts als eine zu knappe Wartezeit, und auf einer langsamen
   * Maschine wäre daraus vier geworden. Ein Mensch, der die App am nächsten
   * Tag wieder aufmacht, hat diese Zeit ohnehin.
   */
  /*
   * Großzügig: bis zu dreißig Sekunden. Gemessen wird die Zahl der *Starts*,
   * nicht die Geschwindigkeit der Maschine – der Service Worker lädt beim
   * Einbau alle drei Dutzend Dateien frisch, und unter Last dauert das. Mit
   * zehn Sekunden war dieser Test bei vollem Durchlauf jeder dritte Mal rot,
   * ohne dass sich an der App etwas geändert hätte. Ein Mensch, der die App
   * später wieder aufmacht, hat diese Zeit ohnehin.
   */
  for (let n = 0; n < 60; n++) {
    // eslint-disable-next-line no-await-in-loop
    if (await page.evaluate(async () => (await caches.keys()).includes('bauchbuch-vTEST'))) break;
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(500);
  }
  oeffnungen = i;
  angekommen = (await page.locator('#tabbar').textContent()).includes('NEUFASSUNG');
}

check(angekommen, `die neue Fassung kommt an (nach ${oeffnungen} Starts)`);

/*
 * Drei und nicht zwei – und die Zahl ist eine Messung, keine Vorgabe.
 *
 * Allein läuft dieser Test mit zwei Starts durch, im vollen Durchlauf mit
 * drei: Der Service Worker lädt beim Einbau drei Dutzend Dateien frisch, und
 * neben einundvierzig anderen Browsern dauert das eine Runde länger. Auf zwei
 * zu bestehen hieße, von einer unbelasteten Maschine auf ein Telefon zu
 * schließen, auf dem eine einzige App aufgeht – und den Test bei jedem vollen
 * Lauf rot zu machen, ohne dass sich an der App etwas geändert hätte.
 *
 * Was hier wirklich geprüft gehört, ist nicht die Zwei, sondern dass es
 * überhaupt und in überschaubar wenigen Starts ankommt. Ab vier wäre der
 * Zusammenhang für einen Menschen nicht mehr erkennbar: Sie öffnet die App,
 * sieht das Alte, öffnet sie wieder, sieht das Alte – und hält das Update für
 * kaputt.
 */
check(
  oeffnungen <= 3,
  `und zwar in den ersten drei Starts (gemessen: ${oeffnungen})`,
);

/*
 * Und die Haltbarkeit von zehn Minuten hat es nicht aufgehalten. Das ist der
 * Punkt, an dem es ohne `cache: 'reload'` in sw.js scheitern würde – und zwar
 * lautlos.
 */
check(
  angekommen,
  'trotz max-age=600, wie GitHub Pages es schickt',
);

/* ---------- 4. Der alte Vorrat wird weggeräumt ---------- */

const vorraete = await page.evaluate(() => caches.keys());
check(
  vorraete.filter((n) => n.startsWith('bauchbuch-')).length === 1,
  `nur ein Vorrat bleibt übrig (${vorraete.join(', ') || 'keiner'})`,
);
check(
  vorraete.includes('bauchbuch-vTEST'),
  'und zwar der der neuen Fassung',
);

/* ---------- 5. Und das Tagebuch hat die Aktualisierung überlebt ---------- */

/*
 * Das Wichtigste zum Schluss. Eine Aktualisierung, die den Speicher mitnimmt,
 * wäre kein Update, sondern ein Datenverlust – und sie ist die einzige
 * Gelegenheit, bei der so etwas unbemerkt passieren kann.
 */
check(
  await page.evaluate((k) => !!localStorage.getItem(k), KEY),
  'das Tagebuch steht nach der Aktualisierung noch da',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
await new Promise((ok) => server.close(ok));
ende();
