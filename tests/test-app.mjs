/*
 * Die App als App: Startbildschirm, Verknüpfungen, Papier.
 *
 * Eine Seite im Browser und eine App auf dem Startbildschirm sind dieselbe
 * Datei und trotzdem zwei verschiedene Dinge – die eine macht man auf, wenn
 * man einen Link hat, die andere tippt man an, weil sie zwischen den anderen
 * Apps liegt. Für ein Tagebuch, das täglich benutzt werden soll, entscheidet
 * genau das.
 *
 * Geprüft wird deshalb der Weg dorthin: dass die App das Installieren
 * anbietet statt es im Browsermenü zu verstecken, dass sie es *nicht* mehr
 * anbietet, wenn sie schon installiert ist, dass die Verknüpfungen des
 * Symbols wirklich irgendwo landen – und dass ein Ausdruck lesbar ist und
 * nicht die halbe Patrone kostet.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const start = async (pfad = '') => {
  await page.goto(URL + pfad, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
};

await start();
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'mehr' })), KEY);
await start();

/* ---------- Das Manifest verspricht eine App ---------- */

const manifest = await page.evaluate(() => fetch('./manifest.webmanifest').then((r) => r.json()));
check(manifest.display === 'standalone', 'die App startet ohne Browserleiste');
check(manifest.icons.length >= 3, `Symbole in mehreren Größen (${manifest.icons.length})`);
check(
  manifest.icons.some((i) => i.purpose === 'maskable'),
  'darunter ein maskierbares – ohne das schneidet Android das Symbol schief zurecht',
);
check(manifest.shortcuts.length === 3, 'drei Verknüpfungen fürs lange Drücken auf das Symbol');
check(
  manifest.shortcuts.every((s) => s.url.startsWith('./?')),
  'jede zeigt auf einen Startparameter derselben Datei',
);

/* ---------- Die Verknüpfungen landen wirklich irgendwo ---------- */

await start('?neu=essen');
check(await page.locator('.bogen').count() === 1, '„Mahlzeit eintragen" öffnet den Bogen sofort');
check(
  (await page.locator('.bogen-kopf h2').textContent()).includes('Mahlzeit'),
  'und zwar den richtigen',
);
check(
  !(await page.evaluate(() => location.search)),
  'die Adresse wird danach sauber gemacht – ein Neuladen reißt den Bogen nicht wieder auf',
);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
check(await page.locator('.bogen').count() === 0, 'nach dem Neuladen ist er zu');

await start('?tab=ruhe');
check(
  (await page.locator('#view h2').first().textContent()).trim() === 'Ruhe',
  '„Atemübung" landet im richtigen Reiter',
);

await start('?tab=gibtsnicht');
check(
  await page.locator('.tab.an').count() === 1,
  'ein unbekannter Startparameter richtet keinen Schaden an',
);

/* ---------- Installieren wird angeboten, nicht versteckt ---------- */

await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'mehr' })), KEY);
await start();
check(
  (await page.locator('#view').textContent()).includes('Auf den Startbildschirm'),
  'unter Mehr steht, wie man die App auf den Startbildschirm bekommt',
);
check(
  await page.locator('[data-act="installieren"]').count() === 0,
  'ohne Angebot des Browsers kein Knopf, der nichts täte – sondern eine Anleitung',
);

// Android meldet die Installierbarkeit über ein Ereignis. Hier nachgestellt.
await page.evaluate(() => {
  window.__prompt = 0;
  const ev = new Event('beforeinstallprompt');
  ev.prompt = () => { window.__prompt += 1; return Promise.resolve(); };
  ev.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(ev);
});
await page.waitForTimeout(250);
check(
  await page.locator('[data-act="installieren"]').count() === 1,
  'sobald der Browser es anbietet, steht der Knopf da',
);
await page.locator('[data-act="installieren"]').click();
await page.waitForTimeout(250);
check(await page.evaluate(() => window.__prompt) === 1, 'und löst den Dialog aus');
check(
  await page.locator('[data-act="installieren"]').count() === 0,
  'danach ist er weg – das Ereignis lässt sich nur einmal auslösen',
);
await page.screenshot({ path: `${SHOT}/94-app.png` });

/* ---------- Läuft sie schon als App, fragt sie nicht mehr ---------- */

const alsApp = await ctx.newPage();
await alsApp.addInitScript(() => {
  const echt = window.matchMedia.bind(window);
  window.matchMedia = (q) => (q.includes('display-mode: standalone')
    ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
    : echt(q));
});
await alsApp.goto(URL, { waitUntil: 'networkidle' });
await alsApp.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'mehr' })), KEY);
await alsApp.reload({ waitUntil: 'networkidle' });
await alsApp.waitForTimeout(250);
const appText = await alsApp.locator('#view').textContent();
check(appText.includes('Läuft als App'), 'im Standalone-Modus sagt sie das');
check(
  !appText.includes('Im Browsermenü') && !appText.includes('Teilen'),
  'und wiederholt die Anleitung nicht, die dann niemand mehr braucht',
);
await alsApp.close();

/* ---------- Aufs Papier ---------- */

await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'muster' })), KEY);
await start();
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(200);

const grund = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check(grund === 'rgb(255, 255, 255)', `auf Papier weiß statt schwarz (${grund})`);
const schrift = await page.evaluate(() => getComputedStyle(document.body).color);
check(schrift === 'rgb(0, 0, 0)', `und schwarze Schrift (${schrift})`);
check(
  await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display) === 'none',
  'die Reiterleiste kommt nicht mit – antippen kann man Papier nicht',
);
check(
  await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).display) === 'none',
  'die Kopfleiste ebenfalls nicht',
);
check(
  (await page.evaluate(() => {
    const v = document.querySelector('.view');
    return getComputedStyle(v, '::after').content;
  })).includes('keine Diagnose'),
  'jeder Ausdruck trägt den Hinweis, dass er keine Diagnose ist',
);
await page.screenshot({ path: `${SHOT}/95-druck.png`, fullPage: true });
await page.emulateMedia({ media: null });

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
