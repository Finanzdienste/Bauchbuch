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

/* ---------- 3. Mit allem an: nichts ragt über den Rand ---------- */

/*
 * Beide Schalter an, ein Tag mit Jetzt-Zeile, Tag ohne Mittel samt Grund,
 * „Zum Essen?" und der Karte zu zwei Mitteln; dazu der Kopfbogen mit
 * fünfzehn Merkmalen, der Medikamenten-Bogen mit der Formwahl und „Mehr" mit
 * der Formwahl unter „Meine Mittel". Lange Namen mit Absicht.
 */
await page.clock.setFixedTime(new Date('2026-03-10T09:00:00+01:00'));
await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
const [tagJetzt, uhrVorhin] = await page.evaluate(() => {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const v = new Date(d.getTime() - 10 * 60000);
  return [`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, `${p(v.getHours())}:${p(v.getMinutes())}`];
});
await page.evaluate(([k, h, u]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
  adhsAn: true, spannungAn: true, v28Gesagt: false,
  tagesfragen: ['stimmung', 'stress', 'verspannt', 'gepresst', 'schlaf', 'schiene', 'kiefer'],
  tage: { [h]: { adhsPause: 'vergessen' } },
  standardMittel: [
    { id: 'sm1', mittel: 'Medikinet retard Kapseln mit veränderter Wirkstofffreisetzung', dosis: '20 mg', tageszeit: 'morgens', bezug: null },
    { id: 'sm2', mittel: 'Pantoprazol-ratiopharm magensaftresistent', dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
  ],
  eintraege: [
    { id: 'st1', art: 'medikament', am: h, um: u, mittel: 'Atomoxetin-Hartkapseln Generikum', dosis: '40 mg' },
    { id: 'kk1', art: 'kopf', am: h, um: '07:00', staerke: 4, kopfArten: ['beidseitig', 'kauen', 'nackenbewegung'] },
  ],
})), [KEY, tagJetzt, uhrVorhin]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
const passt = async (wo) => {
  const m = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(m[0] <= m[1], `${wo}: nichts ragt über den Rand (${m[0]} ≤ ${m[1]})`);
};
check(await page.locator('.jetzt-zeile').count() === 1 && await page.locator('.adhs-pause').count() === 1
  && await page.locator('.adhs-essen').count() === 1 && await page.locator('.wechsel-karte').count() === 1,
  'Tag zeigt Jetzt-Zeile, Tag ohne Mittel, „Zum Essen?" und die Karte zu zwei Mitteln');
await passt('Tag mit allem an');
await page.screenshot({ path: `${SHOT}/schmal-alles-an.png`, fullPage: true });
await page.locator('[data-act="neu"][data-art="kopf"]').click();
await page.waitForTimeout(200);
check(await page.locator('[data-act="kopfart"]').count() === 15, 'der Kopfbogen mit fünfzehn Merkmalen');
await passt('Kopfbogen');
await page.locator('button.bogen-zu').click();
await page.waitForTimeout(150);
await page.locator('[data-act="neu"][data-art="medikament"]').click();
await page.waitForTimeout(150);
await page.locator('[data-act="standard-waehlen"][data-id="sm1"]').click();
await page.waitForTimeout(200);
check(await page.locator('[data-act="bogen-form"]').count() === 7, 'der Medikamenten-Bogen mit der Formwahl');
await passt('Medikamenten-Bogen');
await page.locator('button.bogen-zu').click();
await page.waitForTimeout(150);
for (const t of ['mehr', 'muster', 'verlauf']) {
  await page.locator(`[data-act="tab"][data-tab="${t}"]`).click();
  await page.waitForTimeout(250);
  await passt(t === 'mehr' ? '„Mehr" mit Formwahl und Hinweisen' : `„${t}"`);
}

/* ---------- 4. „Muster" mit den Karten „ADHS-Mittel" und „Kiefer, Nacken, Schiene" ---------- */

/*
 * Neunzig Tage mit einem Stimulans, Tagen ohne, Kopfschmerz, Schiene,
 * Nacken und Wärme – genug, dass beide Karten Funde mit Balken, Zahlenlisten
 * und Fragen zeigen. Kein Säureblocker und keine Massagepistole: Dieses
 * Tagebuch soll keine bestimmte Zusammenstellung nachbilden.
 */
const musterStand = (() => {
  const p = (n) => String(n).padStart(2, '0');
  const iso = (n) => {
    const d = new Date(Date.UTC(2026, 2, 10 - n));
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  };
  const eintraege = [];
  const tage = {};
  let k = 0;
  const id = (x) => `${x}${(k += 1)}`;
  for (let n = 90; n >= 1; n--) {
    const d = iso(n);
    const ohneMittel = n % 5 === 0;
    const ohneEssen = n % 4 === 1;
    if (!ohneMittel) {
      eintraege.push({
        id: id('m'), art: 'medikament', am: d, um: '07:30', mittel: 'Concerta Retardtabletten mit Hülle', dosis: '36 mg',
        ...(ohneEssen ? { essen: 'ohne', essenGesetzt: new Date(`${d}T07:40:00+01:00`).getTime() } : {}),
      });
      if (n % 3 !== 0) eintraege.push({ id: id('m'), art: 'medikament', am: d, um: `${12 + (n % 4)}:15`, mittel: 'Concerta Retardtabletten mit Hülle', dosis: '18 mg' });
      if (ohneEssen) eintraege.push({ id: id('b'), art: 'beschwerde', am: d, um: '09:30', staerke: 5 + (n % 3), arten: ['druck'] });
      if (n % 3 === 0) eintraege.push({ id: id('k'), art: 'kopf', am: d, um: '15:00', staerke: 5, kopfArten: ['beidseitig'] });
    } else tage[d] = { adhsPause: n % 10 === 0 ? 'geplant' : 'vergessen' };
    eintraege.push({ id: id('e'), art: 'essen', am: d, um: ohneEssen && !ohneMittel ? '11:00' : '07:15', was: 'Frühstück', zutaten: [{ id: 'kaffee', rolle: 'getraenk' }], portion: 'normal' });
    eintraege.push({ id: id('e'), art: 'essen', am: d, um: '19:00', was: 'Abendessen mit einer langen Beschreibung', zutaten: [], portion: 'normal' });
    eintraege.push({ id: id('s'), art: 'stuhl', am: d, um: '06:40', form: 1 + (n % 7) });
    if (n % 2 === 0) eintraege.push({ id: id('a'), art: 'aktivitaet', am: d, um: '18:00', aktivitaeten: [n % 4 === 0 ? 'waerme' : 'yoga'] });
    const verspannt = n % 3 === 1 ? 4 : n % 3;
    if (verspannt >= 3 && n > 1) eintraege.push({ id: id('k'), art: 'kopf', am: iso(n - 1), um: '16:00', staerke: 4, kopfArten: ['kauen'] });
    tage[d] = {
      ...(tage[d] || {}), stress: n % 5, schlaf: n % 4, verspannt, kiefer: n % 5, gepresst: n % 3 === 0 ? 1 : 0,
      ...(n % 6 ? { schiene: n % 7 === 0 ? 0 : 1 } : {}),
    };
  }
  return {
    begruesst: true, tab: 'muster', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
    adhsAn: true, spannungAn: true, v28Gesagt: true,
    tagesfragen: ['stimmung', 'stress', 'verspannt', 'gepresst', 'schlaf', 'schiene', 'kiefer'],
    eintraege, tage, fenster: 4, mindestFaelle: 5,
  };
})();
await page.evaluate(([k, st]) => localStorage.setItem(k, JSON.stringify(st)), [KEY, musterStand]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const karten = await page.evaluate(() => ({
  adhs: document.querySelectorAll('.karte-adhs').length,
  spannung: document.querySelectorAll('.karte-spannung').length,
  funde: document.querySelectorAll('.karte-adhs .fund, .karte-spannung .fund').length,
  balken: document.querySelectorAll('.karte-adhs .vgl, .karte-spannung .vgl').length,
  listen: document.querySelectorAll('.karte-adhs ul.wartend, .karte-spannung ul.wartend').length,
  text: [...document.querySelectorAll('.karte-adhs, .karte-spannung')].map((k) => k.innerText).join('\n'),
}));
check(karten.adhs === 1 && karten.spannung === 1 && karten.funde >= 1 && karten.balken >= 1 && karten.listen >= 2,
  `„Muster“ mit beiden Karten, mit Funden, Balken und Zahlenlisten (${karten.funde} Funde, ${karten.listen} Listen)`);
await passt('„Muster“ mit beiden neuen Karten, 320 Pixel');
const breiter = await page.evaluate(() => [...document.querySelectorAll('.karte-adhs *, .karte-spannung *')]
  .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).length);
check(breiter === 0, `kein Teil der beiden Karten ragt über den Rand (${breiter})`);
check(!/(braucht|nötig|noch|fehl\w*|mindestens)\W{0,3}\d|\d+\W{0,3}(nötig|fehl)/i.test(karten.text),
  'R9: in den Karten nirgends eine Zielzahl („noch 5“, „es fehlen 2“, „mindestens 8“, „5 nötig“)');
await page.locator('.karte-adhs').screenshot({ path: `${SHOT}/schmal-muster-adhs.png` });
await page.locator('.karte-spannung').screenshot({ path: `${SHOT}/schmal-muster-spannung.png` });

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
