/*
 * Ein Umstand als stärkster Fund: „Muster" muss trotzdem gezeichnet werden.
 *
 * Große Portion, spät gegessen und auswärts gegessen sind Umstände einer
 * Mahlzeit, keine Zutaten (siehe UMSTAENDE in js/daten.js). Für sie gibt es
 * keine Mengenfrage – „wie viel davon?" hat bei einer großen Portion keine
 * Antwort –, und die Karte „Was Sache ist" muss damit zurechtkommen. Geprüft
 * wird, so wie es auf dem iPhone bedient wird (Kennung von Safari unter
 * iOS 26, als App auf dem Home-Bildschirm, 320 Pixel breit):
 *
 *   1. Für jeden der drei Umstände ein Tagebuch, in dem er auffällt: Der
 *      Reiter „Muster" zeichnet ohne Fehler, „Was Sache ist" nennt ihn, ohne
 *      einen Satz zur Menge, und er steht bei den Funden.
 *   2. Gegenprobe mit einer Zutat: Dort wird die Menge weiter gerechnet.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App – so lässt sich prüfen, dass er einen eingebauten Fehler
 * bemerkt.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8501–8509; die Bereiche darunter haben andere Tests.
const PORT = Number(process.env.BAUCHBUCH_PORT_UMSTAND || 8501);
if (PORT < 8501 || PORT > 8509) throw new Error(`Port ${PORT} liegt außerhalb von 8501–8509`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 640 };

/*
 * Vierzig Tage, drei Mahlzeiten am Tag. Jede dritte trägt das Merkmal, und
 * danach kommt eine Beschwerde der Stärke 7; nach den übrigen nichts. Die
 * Mahlzeiten mit dem Merkmal liegen auf wechselnden Tageszeiten, damit eine
 * späte Uhrzeit allein nicht schon „spät gegessen" erzeugt.
 */
function tagebuch(merkmal) {
  const eintraege = [];
  let n = 0;
  for (let i = 40; i >= 1; i--) {
    const am = vorTagen(i);
    [['08:00', 'Frühstück'], ['12:30', 'Mittag'], ['18:00', 'Abendbrot']].forEach(([um, was], j) => {
      n += 1;
      const mit = n % 3 === 0;
      const m = {
        id: `m${i}-${j}`, art: 'essen', am, um, was, zutaten: [{ id: 'reis', rolle: 'haupt' }], portion: 'normal',
      };
      if (mit && merkmal === 'gross') m.portion = 'gross';
      if (mit && merkmal === 'spaet') m.um = '20:30';
      if (mit && merkmal === 'auswaerts') m.auswaerts = true;
      if (mit && merkmal === 'zwiebel') m.zutaten = [...m.zutaten, { id: 'zwiebel', rolle: 'haupt' }];
      eintraege.push(m);
      if (mit) {
        const [h, min] = m.um.split(':').map(Number);
        const spaeter = `${String(h + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        eintraege.push({ id: `b${i}-${j}`, art: 'beschwerde', am, um: spaeter, staerke: 7, arten: ['druck'] });
      }
    });
  }
  return eintraege.sort((a, b) => (a.am === b.am ? a.um.localeCompare(b.um) : a.am.localeCompare(b.am)));
}

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();

async function muster(merkmal) {
  const ctx = await browser.newContext({
    viewport: SCHMAL, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  await page.evaluate(([k, e]) => localStorage.setItem(k, JSON.stringify({
    begruesst: true, tab: 'muster', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
    eintraege: e,
  })), [KEY, tagebuch(merkmal)]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const lage = page.locator('.karte-lage');
  const lageText = (await lage.count()) ? (await lage.textContent()).replace(/\s+/g, ' ') : '';
  const funde = (await page.locator('.fund').allTextContents()).map((t) => t.replace(/\s+/g, ' '));
  const breite = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  await page.screenshot({ path: `${SHOT}/umstand-muster-${merkmal}.png`, fullPage: true });
  await ctx.close();
  return { fehler, lageText, funde, breite };
}

for (const [merkmal, name] of [['gross', 'Große Portion'], ['spaet', 'Spät gegessen'], ['auswaerts', 'Auswärts gegessen']]) {
  const r = await muster(merkmal);
  check(r.fehler.length === 0, `${name}: „Muster" zeichnet ohne Fehler${r.fehler.length ? ` (${r.fehler.join(' | ')})` : ''}`);
  check(!!r.lageText, `${name}: „Was Sache ist" steht da`);
  const satz = (r.lageText.match(/Am deutlichsten fällt [^.]*\.[^]*?(?= Zusammengefasst)/) || [''])[0];
  check(satz.includes(`Am deutlichsten fällt ${name}`), `${name}: der Satz nennt den Umstand (${satz.slice(0, 70)})`);
  check(!satz.includes('Es kommt dabei auf die Menge an') && !satz.includes('kleinere Mengen'),
    `${name}: ohne einen Satz zur Menge – ein Umstand hat keine`);
  const fund = r.funde.find((f) => f.includes(name));
  check(!!fund && /auffällig|möglich/i.test(fund), `${name}: steht bei den Funden, auffällig oder möglich`);
  check(!!fund && !fund.includes('Wie viel davon?'), `${name}: dort ohne die Mengenfrage`);
  check(r.breite[0] <= r.breite[1], `${name}: bei 320 Pixeln nichts über den Rand (${r.breite[0]} ≤ ${r.breite[1]})`);
}

// Gegenprobe: Bei einer Zutat wird die Menge weiter gerechnet.
const zwiebel = await muster('zwiebel');
check(zwiebel.fehler.length === 0, 'Zwiebel: „Muster" zeichnet ohne Fehler');
// Die Klasse FODMAP nennt die Zwiebel auch – gemeint ist der Fund der Zutat.
const zfund = zwiebel.funde.find((f) => f.trim().startsWith('Zwiebel, Knoblauch'));
check(!!zfund && zfund.includes('Wie viel davon?'), 'Zwiebel: bei einer Zutat steht die Mengenfrage weiter dabei');

await browser.close();
await kopie.zu();
ende();
