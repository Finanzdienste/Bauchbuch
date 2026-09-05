/*
 * Die Sicherung mit Passwort.
 *
 * Der wundeste Punkt der App hatte nie mit Medizin zu tun: Die einzige Kopie
 * eines Tagebuchs über den Körper eines Menschen lag als offene JSON-Datei im
 * Download-Ordner. Alles andere hier ist gegen Übertragung geschützt.
 *
 * Was hier geprüft wird, ist nicht „AES funktioniert" – das prüft der Browser
 * für sich selbst. Geprüft wird, dass die App an keiner Stelle so tut, als sei
 * etwas geschützt, was es nicht ist:
 *
 *   * In der Datei steht nichts Lesbares. Nicht „schwer lesbar" – nichts.
 *   * Ein falsches Passwort öffnet sie nicht und überschreibt nichts.
 *   * Eine veränderte Datei geht gar nicht mehr auf, statt stillschweigend
 *     Unsinn einzulesen.
 *   * Wo der Browser nicht verschlüsseln kann, steht kein Knopf, der nichts
 *     täte, sondern ein Satz, der sagt warum.
 *
 * Die App läuft dabei über den Server (https-artiger Kontext); die
 * Ein-Datei-Fassung wird getrennt geprüft, weil dort genau das fehlt.
 */
import { chromium } from 'playwright';
import {
  URL, EINZEL, KEY, HANDY, SHOT, pruefer, vorTagen,
} from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();

const ZUSTAND = {
  begruesst: true,
  tab: 'mehr',
  eintraege: [
    {
      id: 'n1', am: vorTagen(2), um: '20:00', art: 'notiz',
      text: 'Streit mit der Chefin, danach war es schlimm',
    },
    {
      id: 'b1', am: vorTagen(2), um: '21:00', art: 'beschwerde', staerke: 7, arten: ['brennen'],
    },
  ],
  tage: { [vorTagen(2)]: { notiert: true } },
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, ZUSTAND]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);

/* ---------- Der Knopf steht da ---------- */

check(
  await page.locator('[data-act="schloss-auf"]').count() === 1,
  'über die Adresse gibt es „Mit Passwort sichern"',
);

await page.locator('[data-act="schloss-auf"]').click();
await page.waitForTimeout(200);
const warnung = await text(page.locator('.schloss'));
check(warnung.includes('Vergessen heißt weg'), 'die Warnung steht über dem Feld, nicht darunter');

/* ---------- Zu kurz zählt nicht ---------- */

await page.locator('#tresorWort').fill('kurz');
await page.locator('[data-act="tresor-export"]').click();
await page.waitForTimeout(300);
check(
  (await text(page.locator('#toast'))).includes('acht Zeichen'),
  'unter acht Zeichen passiert nichts',
);
check(await page.locator('#tresorWort').count() === 1, 'und das Feld bleibt offen');

/*
 * ---------- Verschlüsseln und wieder aufmachen ----------
 *
 * Der Download landet in einer echten Datei; gelesen wird sie über den
 * Speicherpfad, den Playwright liefert. Das ist der Weg, den die Sicherung in
 * Wirklichkeit nimmt – über die App-internen Funktionen zu prüfen hieße, den
 * Knopf nicht zu prüfen.
 */
await page.locator('#tresorWort').fill('einbisschenlaenger');
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('[data-act="tresor-export"]').click(),
]);
const pfad = await download.path();
const { readFileSync } = await import('node:fs');
const datei = readFileSync(pfad, 'utf8');

check(datei.includes('bauchbuch-tresor'), 'die Datei sagt von sich, dass sie verschlüsselt ist');
check(
  !datei.includes('Chefin') && !datei.includes('brennen') && !datei.includes('staerke'),
  'und enthält nichts Lesbares aus dem Tagebuch',
);
check(datei.includes('PBKDF2-SHA256/AES-GCM'), 'das Verfahren steht drin, damit es prüfbar bleibt');
check(
  (await text(page.locator('#toast'))).includes('Verschlüsselt gesichert'),
  'die App bestätigt es',
);
check(
  await page.locator('#tresorWort').count() === 0,
  'und schließt das Passwortfeld hinterher wieder',
);

/*
 * ---------- Zurücklesen ----------
 *
 * Die Dateiauswahl lässt sich nicht anklicken, aber der Weg dahinter schon:
 * derselbe Text, dasselbe Passwort, durch dieselben Funktionen.
 */
const zurueck = await page.evaluate(async ([roh, wort]) => {
  const m = await import('./js/tresor.js');
  const klar = await m.entschluesseln(roh, wort);
  return JSON.parse(klar);
}, [datei, 'einbisschenlaenger']);
check(
  zurueck.eintraege.length === 2 && zurueck.eintraege[0].text.includes('Chefin'),
  'mit dem richtigen Passwort kommt alles zurück',
);

/* ---------- Falsches Passwort ---------- */

const falsch = await page.evaluate(async ([roh]) => {
  const m = await import('./js/tresor.js');
  try {
    await m.entschluesseln(roh, 'einbisschenlaengeR');
    return 'AUFGEGANGEN';
  } catch (e) { return e.message; }
}, [datei]);
check(falsch !== 'AUFGEGANGEN', 'ein Zeichen anders reicht: die Datei geht nicht auf');
check(
  falsch.includes('Falsches Passwort') && falsch.includes('beschädigt'),
  'und die Meldung lässt beide Möglichkeiten offen, statt „vergessen" zu behaupten',
);

/* ---------- Veränderte Datei ---------- */

const manipuliert = await page.evaluate(async ([roh]) => {
  const m = await import('./js/tresor.js');
  const o = JSON.parse(roh);
  // Ein einziges Zeichen im Geheimtext umdrehen.
  const a = o.daten.split('');
  a[10] = a[10] === 'A' ? 'B' : 'A';
  o.daten = a.join('');
  try {
    await m.entschluesseln(JSON.stringify(o), 'einbisschenlaenger');
    return 'AUFGEGANGEN';
  } catch (e) { return e.message; }
}, [datei]);
check(
  manipuliert !== 'AUFGEGANGEN',
  'eine veränderte Datei geht gar nicht auf, statt halben Unsinn zu liefern',
);

/* ---------- Zwei Sicherungen, dasselbe Passwort ---------- */

const zweiteRunde = await page.evaluate(async () => {
  const m = await import('./js/tresor.js');
  const a = await m.verschluesseln('{"x":1}', 'einbisschenlaenger');
  const b = await m.verschluesseln('{"x":1}', 'einbisschenlaenger');
  return JSON.parse(a).daten === JSON.parse(b).daten;
});
check(!zweiteRunde, 'zweimal dasselbe verschlüsselt sieht verschieden aus (Salz und Startwert)');

/* ---------- Offene Sicherungen gehen weiter ---------- */

const offen = await page.evaluate(async () => {
  const m = await import('./js/tresor.js');
  return m.istTresor('{"eintraege":[],"tage":{}}');
});
check(!offen, 'eine offene Sicherung wird nicht für einen Tresor gehalten');

/*
 * ---------- Ohne sicheren Kontext ----------
 *
 * Die Ein-Datei-Fassung startet aus dem Download-Ordner (file://). Dort gibt
 * der Browser crypto.subtle nicht frei. Ein Knopf, der dann nichts tut, wäre
 * schlimmer als keiner – wer ihn drückt, hält seine Sicherung für geschützt.
 */
/*
 * Nachgestellt statt abgewartet: Ob dieser Chromium file:// für sicher hält,
 * wechselt mit der Fassung und mit den Startschaltern – ein Test, der davon
 * abhängt, prüft an manchen Tagen nichts. crypto.subtle wegzunehmen ist genau
 * der Zustand, um den es geht, und zwar zuverlässig.
 */
const einzel = await browser.newPage({ viewport: HANDY });
await einzel.addInitScript(() => {
  Object.defineProperty(globalThis.crypto, 'subtle', { get: () => undefined });
});
await einzel.goto(URL, { waitUntil: 'networkidle' });
await einzel.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, ZUSTAND]);
await einzel.reload({ waitUntil: 'networkidle' });
await einzel.waitForTimeout(300);
check(
  await einzel.locator('[data-act="schloss-auf"]').count() === 0,
  'ohne Verschlüsselung im Browser steht kein Knopf da, der nichts täte',
);
const satz = (await einzel.locator('.karte', { hasText: 'Sicherung' }).first().textContent())
  .replace(/\s+/g, ' ');
check(satz.includes('gesicherte Adresse'), 'stattdessen steht da, warum es hier nicht geht');
check(
  await einzel.locator('[data-act="export"]').count() === 1,
  'die offene Sicherung bleibt erreichbar – gar keine wäre schlimmer als eine offene',
);
await einzel.close();

/*
 * Und die Ein-Datei-Fassung startet trotzdem. Sie ist der Weg, auf dem das
 * Tagebuch jemanden erreicht, der die Adresse nicht öffnen kann; ein Fehler
 * beim Laden von js/tresor.js hätte sie stumm kaputtgemacht.
 */
const ausDatei = await browser.newPage({ viewport: HANDY });
const dateiFehler = [];
ausDatei.on('pageerror', (e) => dateiFehler.push(e.message));
await ausDatei.goto(EINZEL, { waitUntil: 'load' });
await ausDatei.waitForTimeout(500);
check(
  await ausDatei.locator('#tabbar').count() === 1 && dateiFehler.length === 0,
  `die Ein-Datei-Fassung läuft weiter (${dateiFehler.join(' | ') || 'keine Fehler'})`,
);
await ausDatei.close();

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/tresor.png`, fullPage: true });
await browser.close();
ende();
