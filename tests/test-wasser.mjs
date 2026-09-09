/*
 * Die Tagesfrage „Wasser" – aus dem Briefkasten: ein Knopf, der im
 * Tagesbogen fehlte.
 *
 * Sie ist eine Tagesfrage wie Bewegung oder Schlaf, keine eigene
 * Eintragsart: Ein sechster Knopf neben Mahlzeit, Beschwerden, Stuhlgang,
 * Medikament und Notiz hätte einen Zeitpunkt verlangt, den niemand für ein
 * Glas Wasser nachträgt. Genau wie bei Bewegung gilt `menge: true` – ein
 * „viel" ist hier keine Note, sondern nur eine Menge.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate((k) => localStorage.removeItem(k), KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="los"]').click();
await page.waitForTimeout(150);

/* ---------- Im Auslieferungszustand steht die Frage schon da ---------- */

check(
  await page.locator('[data-act="tagfrage"][data-id="wasser"]').count() === 5,
  'fünf Stufen für „Wasser", wie bei Bewegung',
);
check(
  await page.locator('.anlegen-btn').count() === 5,
  'die fünf Knöpfe zum Eintragen bleiben unverändert – Wasser ist keiner von ihnen',
);

/* ---------- Setzen und zurücknehmen ---------- */

await page.locator('[data-act="tagfrage"][data-id="wasser"][data-n="3"]').click();
await page.waitForTimeout(150);
check(
  await page.locator('[data-act="tagfrage"][data-id="wasser"][data-n="3"]').getAttribute('aria-pressed') === 'true',
  'ein Tipp setzt die Stufe',
);
let stand = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const heute = Object.keys(stand.tage)[0];
check(stand.tage[heute].wasser === 3, 'und steht mit der Zahl im Tag, wie jede andere Tagesfrage');

await page.locator('[data-act="tagfrage"][data-id="wasser"][data-n="3"]').click();
await page.waitForTimeout(150);
check(
  await page.locator('[data-act="tagfrage"][data-id="wasser"][data-n="3"]').getAttribute('aria-pressed') === 'false',
  'ein zweiter Tipp auf dieselbe Stufe nimmt sie zurück',
);
stand = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(
  stand.tage[heute] === undefined,
  'ein leerer Tag wird gar nicht erst angelegt, wie bei jeder anderen Tagesfrage',
);

/* ---------- Übersteht ein Neuladen ---------- */

await page.locator('[data-act="tagfrage"][data-id="wasser"][data-n="1"]').click();
await page.waitForTimeout(150);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
check(
  await page.locator('[data-act="tagfrage"][data-id="wasser"][data-n="1"]').getAttribute('aria-pressed') === 'true',
  'der Wert steht nach dem Neuladen noch da',
);

/* ---------- Abschalten lässt sie verschwinden, ohne das Eingetragene zu nehmen ---------- */

await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(250);
await page.locator('[data-act="frageAn"][data-id="wasser"]').click();
await page.waitForTimeout(200);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(200);
check(
  await page.locator('[data-act="tagfrage"][data-id="wasser"]').count() === 0,
  'abgeschaltet erscheint die Frage nicht mehr im Tagesbogen',
);
stand = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(
  stand.tage[heute].wasser === 1,
  'der schon eingetragene Wert bleibt erhalten – wie bei jeder anderen Tagesfrage',
);
check(
  !stand.tagesfragen.includes('wasser'),
  'nur die Sichtbarkeit ist weg, nicht der Wert',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await page.screenshot({ path: `${SHOT}/wasser.png` });
await browser.close();
ende();
