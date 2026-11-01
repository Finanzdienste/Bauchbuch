/*
 * Löschen mit zwei Tipps – auf einem schmalen iPhone, mit dem Finger.
 *
 * Der erste Tipp aufs × fragt „Löschen?", der zweite an derselben Stelle
 * löscht. Das geht nur, wenn der Knopf nach dem ersten Tipp dort bleibt, wo
 * der Finger ist: Würde er breiter, bräche der Text daneben enger um, die
 * Zeile würde höher, und der mittig sitzende Knopf rutschte weg – der zweite
 * Tipp landete auf dem Hintergrund der Zeile und täte nichts. Geprüft wird
 * als iPhone (Kennung von Safari unter iOS 26, als App auf dem
 * Home-Bildschirm, 320 Pixel breit, mit Touch):
 *
 *   1. Bei einem Kopfschmerz, einer langen Mahlzeit und einer langen Notiz:
 *      Nach dem ersten Tipp bleibt die Zeile gleich hoch, der Text gleich
 *      breit, und an der Tippstelle liegt der Knopf. Der zweite Tipp an
 *      dieselbe Stelle – auch im oberen Drittel des × – löscht.
 *   2. Danach steht der Fokus auf „Rückgängig", nicht am Anfang der Seite;
 *      „Rückgängig" holt den Eintrag zurück und gibt ihm den Fokus.
 *   3. Nichts ragt über den Rand.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8501–8509; die Bereiche darunter haben andere Tests.
const PORT = Number(process.env.BAUCHBUCH_PORT_LOESCHEN || 8502);
if (PORT < 8501 || PORT > 8509) throw new Error(`Port ${PORT} liegt außerhalb von 8501–8509`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 700 };

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: SCHMAL, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
});
await ctx.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
});
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(e.message));

const heute = vorTagen(0);
const EINTRAEGE = [
  { id: 'k0', art: 'kopf', am: heute, um: '07:10', staerke: 6, kopfArten: ['pochend', 'einseitig'], dauer: 'lang' },
  {
    id: 'e0', art: 'essen', am: heute, um: '08:00', was: 'Haferbrei mit Banane, Zimt und einem Löffel Mandelmus',
    zutaten: [{ id: 'milch', rolle: 'haupt' }, { id: 'fett', rolle: 'beilage' }], portion: 'normal',
  },
  { id: 'n0', art: 'notiz', am: heute, um: '09:00', text: 'Lange geschlafen, danach müde und etwas schwindelig beim Aufstehen' },
  { id: 'ak0', art: 'aktivitaet', am: heute, um: '10:00', aktivitaeten: ['spazieren'] },
];

async function setze() {
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  await page.evaluate(([k, e]) => localStorage.setItem(k, JSON.stringify({
    begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
    eintraege: e,
  })), [KEY, EINTRAEGE]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
}
const speicher = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const masse = (id) => page.evaluate((i) => {
  const k = document.querySelector(`[data-act="loeschen"][data-id="${i}"]`);
  if (!k) return null;
  const zeile = k.closest('.strang-zeile').getBoundingClientRect();
  const inhalt = k.closest('.strang-zeile').querySelector('.strang-inhalt').getBoundingClientRect();
  const b = k.getBoundingClientRect();
  return {
    hoehe: zeile.height, inhalt: inhalt.width, knopf: { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right },
  };
}, id);
const anStelle = (x, y) => page.evaluate(([px, py]) => {
  const el = document.elementFromPoint(px, py);
  return el ? `${el.tagName}.${el.className}|${el.dataset ? el.dataset.act || '' : ''}` : '';
}, [x, y]);

/* ---------- 1. Der zweite Tipp trifft ---------- */

for (const [id, was] of [['k0', 'Kopfschmerz'], ['e0', 'lange Mahlzeit'], ['n0', 'lange Notiz'], ['ak0', 'Aktivität']]) {
  for (const wo of ['mitte', 'oben']) {
    await setze();
    await page.locator(`[data-act="loeschen"][data-id="${id}"]`).scrollIntoViewIfNeeded();
    const vorher = await masse(id);
    const x = vorher.knopf.x + vorher.knopf.w / 2;
    const y = vorher.knopf.y + (wo === 'oben' ? vorher.knopf.h / 3 : vorher.knopf.h / 2);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(150);
    const nachher = await masse(id);
    check(Math.abs(nachher.hoehe - vorher.hoehe) < 0.5 && Math.abs(nachher.inhalt - vorher.inhalt) < 0.5,
      `${was}, Tipp ${wo}: Zeile und Text bleiben, wie sie sind (${Math.round(vorher.hoehe)} → ${Math.round(nachher.hoehe)} px)`);
    check(Math.abs(nachher.knopf.r - vorher.knopf.r) < 0.5 && Math.abs(nachher.knopf.y - vorher.knopf.y) < 0.5,
      `${was}, Tipp ${wo}: der Knopf bleibt unter dem Finger`);
    const dort = await anStelle(x, y);
    check(dort.includes('|loeschen') && dort.includes('frage'), `${was}, Tipp ${wo}: an der Tippstelle liegt „Löschen?" (${dort})`);
    if (id === 'k0' && wo === 'mitte') {
      await page.screenshot({ path: `${SHOT}/loeschen-schmal-frage.png` });
      const m = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(m[0] <= m[1], `mit „Löschen?" ragt nichts über den Rand (${m[0]} ≤ ${m[1]})`);
      // Das Wort „Kopfschmerz" als Bereich: Bräche es um, hätte es zwei Rechtecke.
      const bruch = await page.evaluate(() => {
        const b = document.querySelector('.strang-zeile.z-kopf .strang-inhalt b');
        const text = b.firstChild;
        const r = document.createRange();
        r.setStart(text, text.textContent.indexOf('Kopfschmerz'));
        r.setEnd(text, text.textContent.indexOf('Kopfschmerz') + 'Kopfschmerz'.length);
        return r.getClientRects().length;
      });
      check(bruch === 1, `„Kopfschmerz" bricht nicht mitten im Wort um (${bruch} Zeile)`);
    }
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(300);
    const s = await speicher();
    check(!s.eintraege.some((e) => e.id === id), `${was}, Tipp ${wo}: der zweite Tipp an derselben Stelle löscht`);
  }
}

/* ---------- 2. Der Fokus nach dem Löschen ---------- */

await setze();
const weg = page.locator('[data-act="loeschen"][data-id="n0"]');
await weg.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check(!(await speicher()).eintraege.some((e) => e.id === 'n0'), 'mit der Tastatur: zweimal Enter löscht');
check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('toast-knopf')),
  'danach steht der Fokus auf „Rückgängig", nicht am Anfang der Seite');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check((await speicher()).eintraege.some((e) => e.id === 'n0'), 'Enter holt den Eintrag zurück');
check(await page.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'bearbeiten'
  && document.activeElement.dataset.id === 'n0'), 'und der Fokus steht auf der zurückgeholten Zeile');

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
