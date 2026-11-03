/*
 * Die Karte „ADHS-Mittel" unter „Muster" nach einem Wechsel des Mittels –
 * als iPhone, 320 Pixel breit.
 *
 *   1. A1 rechnet je Mittel über das ganze Tagebuch. Hat das frühere Mittel
 *      die meisten Fälle, trägt der Befund dessen Namen und den letzten
 *      Einnahmetag – sonst stünde er ohne Namen unter dem heutigen Mittel, und
 *      die Frage für die Sprechstunde landete beim falschen.
 *   2. Die Zahl der Tage ohne Mittel ist die Summe der Gründe in der Klammer,
 *      „wegen Beschwerden" eingeschlossen.
 *   3. Tage, an denen nur „ohne Mittel" steht, sind angegeben, aber nicht
 *      notiert: kein Vergleich. Dann steht die bisherige Zahl mit „zu wenige"
 *      und der Satz, dass es keinen Grund gibt, etwas wegzulassen (R9) – ohne
 *      Zielzahl.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
const PORT = Number(process.env.BAUCHBUCH_PORT_KARTE || 8581);
if (PORT < 8581 || PORT > 8589) throw new Error(`Port ${PORT} liegt außerhalb von 8581–8589`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 760 };
const HEUTE = '2026-04-14';
const vor = (n) => new Date(Date.UTC(2026, 3, 14 - n)).toISOString().slice(0, 10);
const fmt = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getUTCDay()]}, ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
};
const WEGLASS = 'Ein Vergleich entsteht nur, wenn es das ohnehin gibt. Kein Grund, dafür etwas wegzulassen oder '
  + 'anders einzunehmen: Änderungen am Mittel gehören in die Praxis.';
// R9: Zielzahlen in jeder Reihenfolge – „noch 5“, „es fehlen 2“, „mindestens 8“, „5 nötig“.
const ZIELZAHL = /(braucht|nötig|noch|fehl\w*|mindestens)\W{0,3}\d|\d+\W{0,3}(nötig|fehl)/i;

/*
 * 75 Tage ein Mittel, an jedem dritten ohne Essen und danach mit Bauch; dann
 * der Wechsel auf ein anderes. In der Zeit danach zwölf Tage, an denen nur
 * „ohne Mittel" steht – fünf geplant, vier vergessen, drei wegen Beschwerden.
 */
function tagebuch() {
  const eintraege = [];
  const tage = {};
  let nr = 0;
  const id = (p) => `${p}${(nr += 1)}`;
  const ms = (iso, um) => new Date(`${iso}T${um}:00+02:00`).getTime();
  for (let n = 120; n >= 46; n--) {
    const d = vor(n);
    const ohne = n % 3 === 0;
    eintraege.push({
      id: id('m'), art: 'medikament', am: d, um: '07:30', mittel: 'Ritalin Adult', dosis: '',
      ...(ohne ? { essen: 'ohne', essenGesetzt: ms(d, '07:35') } : {}),
    });
    if (!ohne) eintraege.push({ id: id('e'), art: 'essen', am: d, um: '07:10', was: 'Frühstück', zutaten: [], portion: 'normal' });
    eintraege.push({ id: id('e'), art: 'essen', am: d, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' });
    if (ohne) eintraege.push({ id: id('b'), art: 'beschwerde', am: d, um: '09:00', staerke: 6, arten: ['druck'] });
  }
  const gruende = ['geplant', 'vergessen', 'beschwerden'];
  let pause = 0;
  for (let n = 45; n >= 1; n--) {
    const d = vor(n);
    if (n % 3 === 1 && pause < 12) {
      tage[d] = { adhsPause: pause < 5 ? gruende[0] : (pause < 9 ? gruende[1] : gruende[2]) };
      pause += 1;
      continue;
    }
    eintraege.push(
      { id: id('m'), art: 'medikament', am: d, um: '07:30', mittel: 'Elvanse', dosis: '' },
      { id: id('e'), art: 'essen', am: d, um: '07:10', was: 'Frühstück', zutaten: [], portion: 'normal' },
      { id: id('e'), art: 'essen', am: d, um: '12:30', was: 'Mittag', zutaten: [], portion: 'normal' },
    );
  }
  return { eintraege, tage };
}

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];

{
  const { eintraege, tage } = tagebuch();
  const ctx = await browser.newContext({
    viewport: SCHMAL, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'Europe/Berlin', locale: 'de-DE',
  });
  await ctx.addInitScript(([k, s]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    try { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, {
    begruesst: true, tab: 'muster', alterName: null, startbildschirmWeg: true, unterleibGefragt: true,
    lastBackup: { on: HEUTE, anzahl: 1 }, sicherungSpaeter: '2999-01-01', v28Gesagt: true, v29Gesagt: true,
    adhsAn: true, spannungAn: null, eintraege, tage, standardMittel: [],
  }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.clock.setFixedTime(new Date(`${HEUTE}T18:00:00+02:00`));
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const karte = page.locator('.karte-adhs');
  check(await karte.count() === 1, 'die Karte „ADHS-Mittel“ steht unter „Muster“');
  const text = ((await karte.innerText()) || '').replace(/\s+/g, ' ');

  /* 1. Der A1-Befund trägt den Namen des früheren Mittels. */
  check(text.includes(`Elvanse seit ${fmt(vor(45))}`), `die Kopfzeile nennt das heutige Mittel (${text.slice(0, 60)})`);
  const titel = `Bauch in den 4 Stunden nach der ersten Einnahme – Ritalin Adult, Einnahmen bis ${fmt(vor(46))}`;
  check(text.includes(titel), `der Befund nennt sein Mittel und bis wann es eingetragen war („${titel}“)`);
  check(/Auch: Elvanse: \d+ Fälle\./.test(text), 'das heutige Mittel steht darunter unter „Auch“');
  check(text.includes('Nach Einnahmen von Ritalin Adult ohne Essen ging es meinem Bauch in den Stunden danach '
    + 'schlechter.'), 'die Frage für die Sprechstunde nennt das Mittel');

  /* 2. Die Zahl vorn ist die Summe der Gründe. */
  const zeile = 'Tage ohne ADHS-Mittel 12 (geplant 5, vergessen 4, wegen Beschwerden 3 – nicht gewertet)';
  check(text.includes(zeile), `Tage ohne Mittel: die Zahl vorn ist die Summe der Klammer (${(text.match(/Tage ohne ADHS-Mittel \d+[^)]*\)/) || ['–'])[0]})`);

  /* 3. R9 hängt am Vergleich, nicht an der Zahl der angegebenen Tage. */
  check(text.includes('Tage ohne ADHS-Mittel bisher: 9, davon gewertet 0 – zu wenige für einen Vergleich.')
    && text.includes(WEGLASS),
  'neun angegebene, aber nicht notierte Tage ohne Mittel: „zu wenige“ und der Satz zum Weglassen');
  check(!ZIELZAHL.test(text), 'nirgends eine Zielzahl');

  const breit = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(breit[0] <= breit[1], `die Karte passt in 320 Pixel (${breit[0]}/${breit[1]})`);
  await karte.screenshot({ path: `${SHOT}/adhs-karte-wechsel.png` });
  await ctx.close();
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
