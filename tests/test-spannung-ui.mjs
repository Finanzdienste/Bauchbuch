/*
 * Kiefer, Nacken, Schiene – der zweite Schalter, als iPhone, 320 Pixel breit.
 *
 *   1. Ein- und Ausschalten unter „Mehr" fügt die vier Tagesfragen ein und
 *      nimmt sie heraus. Eingetragenes bleibt. „Schiene" lässt sich abwählen.
 *   2. Die Fragen stehen nur bei eingeschaltetem Schalter auf „Tag" – auch
 *      wenn ihre Kennungen aus einer Sicherung in den Tagesfragen stehen. Je
 *      ein Tipp, ein zweiter nimmt zurück.
 *   3. Der Kopfbogen: Licht und Lärm getrennt, die Gruppe „Kiefer und
 *      Nacken" nur mit Schalter.
 *   4. Der Herstellerhinweis zur Massagepistole steht auch ohne Schalter.
 *   5. Das Angebot kommt über eine Massagepistole oder eine Notiz zu Kiefer
 *      oder Schiene – nie über „Nackenschmerz dabei" beim Kopfschmerz.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
const PORT = Number(process.env.BAUCHBUCH_PORT_SPANNUNG || 8521);
if (PORT < 8521 || PORT > 8529) throw new Error(`Port ${PORT} liegt außerhalb von 8521–8529`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 760 };
const HEUTE = '2026-04-14';
const um = (hhmm, iso = HEUTE) => new Date(`${iso}T${hhmm}:00+02:00`);
const vor = (n) => new Date(Date.UTC(2026, 3, 14 - n)).toISOString().slice(0, 10);

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];
const GRUND = {
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, unterleibGefragt: true,
  lastBackup: { on: HEUTE, anzahl: 1 }, v28Gesagt: true, tage: {}, eintraege: [], standardMittel: [],
};
const VIER = ['verspannt', 'gepresst', 'schiene', 'kiefer'];

async function iphone(stand, zeit = um('09:00')) {
  const ctx = await browser.newContext({
    viewport: SCHMAL, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'Europe/Berlin', locale: 'de-DE',
  });
  await ctx.addInitScript(([k, s]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    try { if (s && !localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, { ...GRUND, ...stand }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.clock.setFixedTime(zeit);
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  return { ctx, page };
}
const speicher = (page) => page.evaluate(async (k) => {
  const st = await import('/js/store.js');
  st.sofortSchreiben();
  return JSON.parse(localStorage.getItem(k));
}, KEY);
const kurz = (page) => page.waitForTimeout(150);
const tipp = async (page, sel) => { await page.locator(sel).first().click(); await kurz(page); };
const tab = (page, id) => tipp(page, `[data-act="tab"][data-tab="${id}"]`);
const fragenAufTag = (page) => page.locator('[data-act="tagfrage"]')
  .evaluateAll((els) => [...new Set(els.map((x) => x.dataset.id))]);
const breitOk = async (page) => {
  const b = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  return b[0] <= b[1];
};
const text = async (page, sel) => ((await page.locator(sel).count())
  ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');

/* ---------- 1. und 2. Schalter und Tagesfragen ---------- */

{
  const { ctx, page } = await iphone({
    tagesfragen: ['stimmung', 'stress', 'schlaf'],
    // Eine Antwort von früher, als der Schalter schon einmal an war.
    tage: { [vor(3)]: { kiefer: 2, schiene: 1, stress: 1 } },
  });
  let ids = await fragenAufTag(page);
  check(!ids.some((id) => VIER.includes(id)), `ohne Schalter keine der vier Fragen auf „Tag" (${ids.join()})`);
  await tab(page, 'mehr');
  check(await page.locator('[data-act="frageAn"][data-id="schiene"]').count() === 0,
    'unter „Welche Fragen stellt der Tag?" stehen sie ohne Schalter nicht');
  const schalter = page.locator('[data-act="spannung-schalter"]');
  check(await schalter.getAttribute('aria-pressed') === 'false', 'der Schalter ist aus');
  await schalter.click();
  await kurz(page);
  let s = await speicher(page);
  check(s.spannungAn === true, 'ein Tipp schaltet ein');
  check(VIER.every((id) => s.tagesfragen.includes(id)) && s.tagesfragen.includes('stimmung'),
    `die vier Fragen kommen zu den Tagesfragen dazu (${s.tagesfragen.join()})`);
  check((await text(page, '#toast')).startsWith('Eingeschaltet. Ausschalten blendet alles wieder aus – Eingetragenes bleibt.'),
    'mit der Meldung, dass Ausschalten nur ausblendet');
  check(await schalter.getAttribute('aria-pressed') === 'true' && (await schalter.innerText()).startsWith('✓'),
    'der Schalter zeigt, dass er an ist');
  check(await page.locator('#mitdenken [data-act="frageAn"]').count() === 4, 'die vier Fragen stehen unter dem Schalter als Marken');
  check(await page.locator('[data-act="frageAn"][data-id="schiene"]').count() === 1, 'und nur dort, nicht doppelt');
  check(await breitOk(page), '„Mehr" mit Schalter passt in 320 Pixel');
  // Wer keine Schiene trägt, wählt sie ab.
  await tipp(page, '#mitdenken [data-act="frageAn"][data-id="schiene"]');
  s = await speicher(page);
  check(!s.tagesfragen.includes('schiene') && s.tagesfragen.includes('kiefer'), '„Schiene" lässt sich abwählen');
  await tab(page, 'heute');
  ids = await fragenAufTag(page);
  check(['verspannt', 'gepresst', 'kiefer'].every((id) => ids.includes(id)) && !ids.includes('schiene'),
    `auf „Tag" stehen drei der vier, ohne Schiene (${ids.join()})`);
  check(ids.indexOf('verspannt') === ids.indexOf('stress') + 1 && ids.indexOf('gepresst') === ids.indexOf('verspannt') + 1
    && ids.indexOf('kiefer') === ids.indexOf('schlaf') + 1,
    'in der Reihenfolge: Nacken nach Anspannung, Pressen danach, Kiefer nach Schlaf');
  check((await page.locator('#view').innerText()).includes('Ob nachts geknirscht wird, merkt man selbst oft nicht'),
    'unter „Kiefer" der Satz, warum nach dem Morgen gefragt wird');
  const vorher = (await speicher(page)).tage[HEUTE];
  await tipp(page, '[data-act="tagfrage"][data-id="verspannt"][data-n="3"]');
  s = await speicher(page);
  check(s.tage[HEUTE] && s.tage[HEUTE].verspannt === 3 && !vorher, 'ein Tipp beantwortet „Nacken/Schultern"');
  check(await page.locator('[data-act="tagfrage"][data-id="verspannt"][data-n="3"]').getAttribute('aria-pressed') === 'true',
    'und zeigt es');
  await tipp(page, '[data-act="tagfrage"][data-id="gepresst"][data-n="1"]');
  await tipp(page, '[data-act="tagfrage"][data-id="kiefer"][data-n="0"]');
  s = await speicher(page);
  check(s.tage[HEUTE].gepresst === 1 && s.tage[HEUTE].kiefer === 0, 'je ein Tipp – auch „nichts" ist eine Antwort');
  await tipp(page, '[data-act="tagfrage"][data-id="verspannt"][data-n="3"]');
  s = await speicher(page);
  check(s.tage[HEUTE].verspannt === null || s.tage[HEUTE].verspannt === undefined, 'ein zweiter Tipp nimmt die Antwort zurück');
  check(await breitOk(page), '„Tag" mit den neuen Fragen passt in 320 Pixel');
  await page.screenshot({ path: `${SHOT}/spannung-tag.png`, fullPage: true });
  // Ausschalten: Fragen weg, Daten bleiben.
  await tab(page, 'mehr');
  await tipp(page, '[data-act="spannung-schalter"]');
  s = await speicher(page);
  check(s.spannungAn === false && !s.tagesfragen.some((id) => VIER.includes(id)),
    `Ausschalten nimmt die Fragen heraus (${s.tagesfragen.join()})`);
  check(s.tage[HEUTE].gepresst === 1 && s.tage[vor(3)].kiefer === 2 && s.tage[vor(3)].schiene === 1,
    'Eingetragenes bleibt');
  await tab(page, 'heute');
  ids = await fragenAufTag(page);
  check(!ids.some((id) => VIER.includes(id)), 'auf „Tag" sind sie wieder weg');
  // Wieder ein: alle vier zurück, auch die abgewählte Schiene.
  await tab(page, 'mehr');
  await tipp(page, '[data-act="spannung-schalter"]');
  s = await speicher(page);
  check(VIER.every((id) => s.tagesfragen.includes(id)), 'wieder eingeschaltet sind alle vier zurück');
  await ctx.close();
}

{
  // Aus einer Sicherung: Kennungen in den Tagesfragen, Schalter aus.
  const { ctx, page } = await iphone({ spannungAn: false, tagesfragen: ['stimmung', ...VIER] });
  const ids = await fragenAufTag(page);
  check(ids.includes('stimmung') && !ids.some((id) => VIER.includes(id)),
    `ausgeschaltet keine Spannungsfragen, auch wenn ihre Kennungen dastehen (${ids.join()})`);
  await ctx.close();
}
{
  // Schalter an, aber eine Liste mit Fremdem und ohne die vier.
  const { ctx, page } = await iphone({ spannungAn: true, tagesfragen: ['stimmung', 'gibtsnicht', 'kiefer'] });
  const ids = await fragenAufTag(page);
  check(ids.join() === 'stimmung,kiefer', `eingeschaltet erscheint nur, was gewählt ist und es gibt (${ids.join()})`);
  await tab(page, 'mehr');
  check(await page.locator('#mitdenken [data-act="frageAn"][aria-pressed="true"]').count() === 1,
    'unter „Mehr" ist genau die eine gewählt');
  await ctx.close();
}

/* ---------- 3. Der Kopfbogen ---------- */

{
  const { ctx, page } = await iphone({
    spannungAn: null,
    eintraege: [{ id: 'k0', art: 'kopf', am: vor(1), um: '10:00', staerke: 5, kopfArten: ['licht', 'kauen'] }],
  });
  await tipp(page, '[data-act="neu"][data-art="kopf"]');
  const ohne = await page.locator('[data-act="kopfart"]').evaluateAll((els) => els.map((x) => x.dataset.id));
  check(ohne.length === 12, `ohne Schalter zwölf Merkmale (${ohne.length})`);
  check(ohne.includes('lichtscheu') && ohne.includes('laermscheu') && !ohne.includes('licht'),
    'Licht und Lärm getrennt, das alte „Licht oder Lärm" nicht bei einem neuen Eintrag');
  check(!ohne.includes('kauen'), 'die Gruppe „Kiefer und Nacken" fehlt ohne Schalter');
  await tipp(page, 'button.bogen-zu');
  // Ein alter Eintrag mit „licht" und „kauen": beides bleibt sichtbar und abwählbar.
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  await tipp(page, '[data-act="bearbeiten"][data-id="k0"]');
  const alt = await page.locator('[data-act="kopfart"]').evaluateAll((els) => els.map((x) => x.dataset.id));
  check(alt.includes('licht') && alt.includes('kauen'), 'beim alten Eintrag steht, was er trägt – „Licht oder Lärm" und „Kauen"');
  check(await page.locator('[data-act="kopfart"][data-id="licht"]').getAttribute('aria-pressed') === 'true', 'als gewählt');
  check((await page.locator('.strang-zeile').count()) === 1, 'der Eintrag steht im Strang');
  await tipp(page, 'button.bogen-zu');
  check((await text(page, '.strang-zeile')).includes('Licht oder Lärm stören'), 'und liest sich wie früher');
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ spannungAn: true });
  await tipp(page, '[data-act="neu"][data-art="kopf"]');
  const mit = await page.locator('[data-act="kopfart"]').evaluateAll((els) => els.map((x) => x.dataset.id));
  check(mit.length === 15 && ['kauen', 'nackenbewegung', 'schlaefe'].every((id) => mit.includes(id)),
    `mit Schalter fünfzehn Merkmale, die drei als eigene Gruppe (${mit.length})`);
  check((await page.locator('.bogen').innerText()).includes('Kiefer und Nacken'), 'unter der Überschrift „Kiefer und Nacken"');
  check(await breitOk(page), 'der Kopfbogen mit fünfzehn Merkmalen passt in 320 Pixel');
  await page.screenshot({ path: `${SHOT}/spannung-kopfbogen.png`, fullPage: true });
  await ctx.close();
}

/* ---------- 4. Massagepistole: Herstellerhinweis ohne Schalter ---------- */

{
  const { ctx, page } = await iphone({ spannungAn: false });
  await tipp(page, '[data-act="neu"][data-art="aktivitaet"]');
  check(await page.locator('.massage-hinweis').count() === 0, 'ohne Massagepistole kein Hinweis');
  await tipp(page, '[data-act="aktiv-wahl"][data-id="massagepistole"]');
  const hinweis = await text(page, '.massage-hinweis');
  check(hinweis.startsWith('Hersteller von Massagepistolen schreiben'), 'mit Massagepistole steht der Herstellerhinweis – auch ausgeschaltet');
  check(await breitOk(page), 'der Aktivitäts-Bogen passt in 320 Pixel');
  await ctx.close();
}

/* ---------- 5. Das Angebot ---------- */

{
  // Kopfschmerz mit „Nackenschmerz dabei" allein: kein Angebot.
  const { ctx, page } = await iphone({
    eintraege: [
      { id: 'k1', art: 'kopf', am: vor(2), um: '15:00', staerke: 6, kopfArten: ['nacken', 'drueckend'] },
      { id: 'k2', art: 'kopf', am: vor(1), um: '16:00', staerke: 4, kopfArten: ['nacken'] },
    ],
  });
  check(await page.locator('.angebot').count() === 0, 'Nackenschmerz beim Kopfschmerz löst kein Angebot aus');
  await ctx.close();
}
{
  // Eine Massagepistole in den letzten Wochen: das Angebot.
  const { ctx, page } = await iphone({
    eintraege: [{ id: 'a1', art: 'aktivitaet', am: vor(5), um: '20:00', aktivitaeten: ['massagepistole'] }],
  });
  const angebot = await text(page, '.angebot');
  check(angebot.startsWith('Du hast „Massagepistole“ eingetragen. Wenn du magst, fragt der Tag zusätzlich'),
    `eine Massagepistole bringt das Angebot (${angebot.slice(0, 60)})`);
  check(angebot.includes('ohne Urteil'), 'mit „ohne Urteil"');
  await tipp(page, '[data-act="spannung-angebot-ja"]');
  const s = await speicher(page);
  check(s.spannungAn === true && VIER.every((id) => s.tagesfragen.includes(id)),
    '„Einschalten" setzt den Schalter und die vier Fragen');
  check(await page.locator('.angebot').count() === 0, 'danach kein Angebot mehr');
  check((await fragenAufTag(page)).includes('kiefer'), 'und „Tag" fragt nach dem Kiefer');
  await ctx.close();
}
{
  // Eine Notiz zur Schiene; „Nein danke" ist endgültig.
  const { ctx, page } = await iphone({
    eintraege: [{ id: 'n1', art: 'notiz', am: vor(10), um: '21:00', text: 'Neue Aufbissschiene abgeholt' }],
  });
  check((await text(page, '.angebot')).startsWith('In deinen Notizen steht etwas zu Kiefer oder Schiene.'),
    'eine Notiz mit „Schiene" bringt das Angebot');
  await tipp(page, '[data-act="spannung-angebot-nein"]');
  let s = await speicher(page);
  check(s.spannungAn === false, '„Nein danke" setzt den Schalter auf false');
  await page.reload({ waitUntil: 'networkidle' });
  check(await page.locator('.angebot').count() === 0, 'und das Angebot kommt nicht wieder');
  s = await speicher(page);
  check(!s.tagesfragen || !s.tagesfragen.includes('schiene'), 'die Tagesfragen bleiben, wie sie waren');
  await ctx.close();
}
{
  // Älter als 30 Tage zählt nicht.
  const { ctx, page } = await iphone({
    eintraege: [{ id: 'a1', art: 'aktivitaet', am: vor(40), um: '20:00', aktivitaeten: ['waerme'] }],
  });
  check(await page.locator('.angebot').count() === 0, 'eine Wärme vor sechs Wochen bringt kein Angebot');
  await ctx.close();
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
