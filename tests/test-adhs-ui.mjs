/*
 * ADHS-Mittel auf „Tag", im Bogen und unter „Mehr" – als iPhone, 320 Pixel
 * breit, als App vom Home-Bildschirm, mit gestellter Uhr.
 *
 * Geprüft wird, was jemand mit einem ADHS-Mittel sieht und tippt:
 *
 *   1. Ohne Schalter nichts Neues außer dem, was für alle gilt.
 *   2. Das Angebot kommt einmal; „Nein danke" ist endgültig, „Einschalten"
 *      setzt den Schalter.
 *   3. „jetzt genommen": ein Tipp, genaue Uhrzeit, Häkchen mit Uhrzeit – auch
 *      bei einem Mittel mit üblicher Tageszeit, das zu einer anderen genommen
 *      wird, und bei demselben Mittel zweimal unter „Meine Mittel". Rückfrage
 *      nur unter zwei Stunden, „Uhrzeit ändern". Ohne Schalter und an anderen
 *      Tagen der Weg der Fassung 27.
 *   4. „Heute keins" nur bei Stimulanzien, mit Grund, ×, „Rückgängig" und
 *      Aufhebung durch eine Einnahme.
 *   5. „Zum Essen?" erscheint, verschwindet nach dem Tipp, wenn eine Mahlzeit
 *      es schon sagt, und eine Stunde nach der Einnahme.
 *   6. Der Bogen: Formwahl vorbelegt, „Zum Essen?" nur ohne Bezug, die
 *      Hinweise zum Paar, die Zeile im Kopfbogen.
 *   7. Die Karte zu zwei Mitteln (W1/W1u) mit „Gelesen" und der Satz in der
 *      Meldung.
 *   8. Nie ein Satz, dass ein Mittel „noch nicht" genommen ist; aria-pressed an
 *      jeder Wahl; nichts ragt über den Rand.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
const PORT = Number(process.env.BAUCHBUCH_PORT_ADHS || 8511);
if (PORT < 8511 || PORT > 8519) throw new Error(`Port ${PORT} liegt außerhalb von 8511–8519`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 760 };

// Ein fester Tag mit fester Uhr: Die App rechnet „heute" und „vor wie langer
// Zeit" aus der Uhr der Seite.
const HEUTE = '2026-03-10';
const GESTERN = '2026-03-09';
const um = (hhmm, iso = HEUTE) => new Date(`${iso}T${hhmm}:00+01:00`);

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];

const GRUND = {
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, unterleibGefragt: true,
  lastBackup: { on: HEUTE, anzahl: 1 }, v28Gesagt: true, v29Gesagt: true, tage: {},
};

/** Ein iPhone mit der App vom Home-Bildschirm, diesem Stand und dieser Uhr. */
async function iphone(stand, zeit = um('08:10')) {
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
const text = async (page, sel) => ((await page.locator(sel).count())
  ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const meldung = (page) => text(page, '#toast');
const zahl = (page, sel) => page.locator(sel).count();
const breitOk = async (page) => {
  const b = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  return b[0] <= b[1];
};
const tab = async (page, id) => tipp(page, `[data-act="tab"][data-tab="${id}"]`);

// Namen, die im Tagebuch vorkommen – keine Zeile auf „Tag" darf einen davon
// zusammen mit „noch nicht" nennen.
const NAMEN = ['Elvanse', 'Intuniv', 'Strattera', 'Medikinet', 'Methylphenidat', 'Concerta', 'Lisdexamfetamin'];
async function nieNochNicht(page, wo) {
  const zeilen = (await page.locator('#view').innerText()).split('\n');
  const treffer = zeilen.filter((z) => /noch nicht/i.test(z) && NAMEN.some((n) => z.includes(n)));
  check(!treffer.length, `${wo}: keine Zeile sagt, ein Mittel sei „noch nicht" genommen${treffer.length ? ` (${treffer[0]})` : ''}`);
}
const NEU = ['.jetzt-zeile', '.adhs-tag', '.angebot', '[data-act="adhs-pause"]', '.kopf-adhs', '.bogen-essen'];

/* ---------- 1. Ohne Schalter: nichts Neues außer dem, was für alle gilt ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [
      { id: 'f1', art: 'essen', am: HEUTE, um: '07:30', was: 'Brot', zutaten: [], portion: 'normal' },
      { id: 'o1', art: 'medikament', am: HEUTE, um: '07:00', mittel: 'Omeprazol', dosis: '20 mg' },
    ],
    standardMittel: [{ id: 's1', mittel: 'Omeprazol', dosis: '20 mg', tageszeit: 'morgens', bezug: 'vor' }],
  });
  for (const t of ['heute', 'muster', 'mehr']) {
    await tab(page, t);
    let neu = 0;
    for (const sel of NEU) neu += await zahl(page, sel);
    check(neu === 0, `ohne ADHS-Mittel und ohne Schalter: auf „${t}" nichts Neues`);
  }
  check(await zahl(page, '#mitdenken') === 1, 'unter „Mehr" steht die Karte mit den Schaltern – für alle');
  check(await page.locator('[data-act="adhs-schalter"]').getAttribute('aria-pressed') === 'false',
    'der Schalter „ADHS" ist aus (aria-pressed=false)');
  await tab(page, 'heute');
  check(await zahl(page, '[data-act="neu"][data-art="kopf"]') === 1, 'Tag sieht aus wie immer');
  await ctx.close();
}

/* ---------- 2. Das Angebot ---------- */

{
  // Elvanse unter „Meine Mittel", Schalter nie entschieden.
  const stand = {
    eintraege: [],
    standardMittel: [{ id: 's1', mittel: 'Elvanse', dosis: '30 mg', tageszeit: null, bezug: null }],
  };
  const { ctx, page } = await iphone(stand);
  const angebot = await text(page, '.angebot');
  check(angebot.startsWith('Lisdexamfetamin gehört zu den Mitteln bei ADHS'),
    `das Angebot nennt die Gruppe (${angebot.slice(0, 50)})`);
  check(!angebot.includes('Elvanse'), 'und nie den eingetippten Namen');
  check(angebot.includes('Nur Zahlen, kein Rat') && angebot.includes('nur auf diesem Gerät'),
    'es sagt, dass es nur zählt und auf dem Gerät bleibt');
  check(await zahl(page, '.angebot') === 1, 'höchstens eine Angebotskarte');
  check(await zahl(page, '.jetzt-zeile') === 0 && await zahl(page, '.adhs-tag') === 0,
    'vor der Entscheidung keine Jetzt-Zeile und keine ADHS-Zeilen');
  await tipp(page, '[data-act="adhs-angebot-nein"]');
  let s = await speicher(page);
  check(s.adhsAn === false, `„Nein danke" setzt den Schalter auf false (${s.adhsAn})`);
  check(await zahl(page, '.angebot') === 0, 'und das Angebot ist weg');
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, '.angebot') === 0, 'auch nach dem Neuladen kommt es nicht wieder');
  // Am nächsten Tag und mit einer neuen Einnahme auch nicht.
  await page.clock.setFixedTime(um('09:00', '2026-03-11'));
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, '.angebot') === 0, 'und am nächsten Tag auch nicht');
  await tab(page, 'mehr');
  check(await page.locator('[data-act="adhs-schalter"]').getAttribute('aria-pressed') === 'false',
    'unter „Mehr" steht der Schalter auf aus');
  await ctx.close();

  const zwei = await iphone(stand);
  await tipp(zwei.page, '[data-act="adhs-angebot-ja"]');
  s = await speicher(zwei.page);
  check(s.adhsAn === true, '„Einschalten" setzt den Schalter auf true');
  check(await zahl(zwei.page, '.angebot') === 0 && await zahl(zwei.page, '.jetzt-zeile') === 1,
    'danach kein Angebot mehr, dafür die Jetzt-Zeile');
  await zwei.ctx.close();
}

/* ---------- 3. „jetzt genommen" ---------- */

{
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [],
    standardMittel: [
      { id: 's1', mittel: 'Elvanse', dosis: '30 mg', tageszeit: null, bezug: null },
      { id: 's2', mittel: 'Omeprazol', dosis: '20 mg', tageszeit: 'morgens', bezug: 'vor' },
    ],
  });
  const jetztZeile = await text(page, '.jetzt-zeile');
  check(jetztZeile === 'Stand 08:10 · Mahlzeit heute: keine eingetragen',
    `die Jetzt-Zeile nennt nur, was dasteht (${jetztZeile})`);
  const knopfE = page.locator('[data-act="standard-eintragen"][data-id="s1"]');
  check((await knopfE.innerText()).trim() === 'Elvanse 30 mg · jetzt', `der Knopf heißt „… · jetzt" (${(await knopfE.innerText()).trim()})`);
  check(await knopfE.getAttribute('aria-label') === 'Elvanse 30 mg – jetzt genommen, eintragen', 'mit einer Ansage, die sagt, was er tut');
  check(!(await page.locator('[data-act="standard-eintragen"][data-id="s2"]').innerText()).includes('jetzt'),
    'ein anderes Mittel behält seinen Knopf wie bisher');
  await nieNochNicht(page, 'vor der Einnahme');

  await knopfE.click();
  await kurz(page);
  let s = await speicher(page);
  const e1 = s.eintraege.find((e) => e.mittel === 'Elvanse');
  check(s.eintraege.length === 1 && e1 && e1.um === '08:10' && e1.am === HEUTE,
    `ein Tipp trägt heute um 08:10 ein (${e1 && e1.um})`);
  check(e1 && !('ungefaehr' in e1) && !('tageszeit' in e1) && !('bezug' in e1),
    'genau – ohne ungefähre Zeit, ohne Tageszeit, ohne Bezug');
  check(await meldung(page) === 'Elvanse 30 mg um 08:10 eingetragen. Uhrzeit ändern', `Meldung mit Uhrzeit (${await meldung(page)})`);
  check((await knopfE.innerText()).trim() === 'Elvanse 30 mg · 08:10 ✓', `danach Häkchen mit Uhrzeit (${(await knopfE.innerText()).trim()})`);
  check((await text(page, '.jetzt-zeile')).includes('Elvanse 08:10 (gerade eben)'), 'die Jetzt-Zeile nennt die Einnahme');
  await nieNochNicht(page, 'nach der Einnahme');

  // Unter zwei Stunden: erst fragen.
  await page.clock.setFixedTime(um('08:40'));
  await tab(page, 'heute');
  await knopfE.click();
  await kurz(page);
  s = await speicher(page);
  check(s.eintraege.length === 1, 'eine halbe Stunde später trägt der erste Tipp nichts ein');
  check((await knopfE.innerText()).trim() === 'Schon um 08:10 – noch eine Einnahme?',
    `sondern fragt im Knopf (${(await knopfE.innerText()).trim()})`);
  await knopfE.click();
  await kurz(page);
  s = await speicher(page);
  check(s.eintraege.filter((e) => e.mittel === 'Elvanse').length === 2, 'der zweite Tipp trägt ein');
  check((await meldung(page)).startsWith('Zweite Einnahme heute eingetragen (erste 08:10).'), `mit eigener Meldung (${await meldung(page)})`);
  // Über zwei Stunden: sofort.
  await page.clock.setFixedTime(um('11:00'));
  await tab(page, 'heute');
  await knopfE.click();
  await kurz(page);
  s = await speicher(page);
  check(s.eintraege.filter((e) => e.mittel === 'Elvanse').length === 3, 'mehr als zwei Stunden später trägt ein Tipp sofort ein');
  check((await knopfE.innerText()).includes('3×, zuletzt 11:00 ✓'), `der Knopf zählt mit (${(await knopfE.innerText()).trim()})`);

  // „Uhrzeit ändern" öffnet den Bogen dieses Eintrags.
  await tipp(page, '#toast [data-act="uhrzeit-aendern"]');
  const id3 = (await speicher(page)).eintraege.filter((e) => e.mittel === 'Elvanse').pop().id;
  check(await zahl(page, '.bogen') === 1 && await page.locator('#bogenUhr').inputValue() === '11:00',
    '„Uhrzeit ändern" öffnet den Bogen mit der eingetragenen Zeit');
  await page.locator('#bogenUhr').fill('10:45');
  await tipp(page, '[data-act="bogen-speichern"]');
  s = await speicher(page);
  check(s.eintraege.find((e) => e.id === id3).um === '10:45', 'und die Zeit lässt sich dort ändern');

  // An einem anderen Tag: wie bisher – Elvanse ohne übliche Zeit öffnet dort den Bogen.
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  const gesternKnopf = (await page.locator('[data-act="standard-eintragen"][data-id="s1"]').innerText()).trim();
  check(gesternKnopf === 'Elvanse 30 mg', `gestern kein „jetzt" (${gesternKnopf})`);
  check(await zahl(page, '.jetzt-zeile') === 0, 'und keine Jetzt-Zeile');
  await ctx.close();
}

{
  // Ohne Schalter: der Weg der Fassung 27 – mit üblicher Zeit ungefähr eingetragen.
  const { ctx, page } = await iphone({
    adhsAn: false,
    eintraege: [],
    standardMittel: [{ id: 's1', mittel: 'Medikinet adult', dosis: '20 mg', tageszeit: 'morgens', bezug: null, form: 'pellet' }],
  });
  const k = page.locator('[data-act="standard-eintragen"][data-id="s1"]');
  check((await k.innerText()).trim() === 'Medikinet adult 20 mg · morgens', 'ohne Schalter heißt der Knopf wie bisher');
  await k.click();
  await kurz(page);
  const e = (await speicher(page)).eintraege[0];
  check(e && e.ungefaehr === true && e.tageszeit === 'morgens' && e.um === '08:00' && e.form === 'pellet',
    `und trägt wie bisher „morgens" ein, mit der Form (${e && `${e.um} ${e.tageszeit} ${e.form}`})`);
  await ctx.close();
}

/*
 * Das Häkchen bei einem Mittel mit üblicher Tageszeit. Der Tipp speichert nur
 * die Uhrzeit, keine Tageszeit – das Häkchen gehört trotzdem an den Knopf,
 * auch wenn die Uhr schon in einer anderen Tageszeit steht. Sonst wirkte ein
 * genommenes Mittel noch offen, und nach zwei Stunden trüge ein zweiter Tipp
 * ohne Rückfrage noch eine Einnahme ein.
 */
const knopfText = async (page, id) => (await page.locator(`[data-act="standard-eintragen"][data-id="${id}"]`).innerText()).trim();
const knopfSagt = (page, id) => page.locator(`[data-act="standard-eintragen"][data-id="${id}"]`).getAttribute('aria-label');
{
  // „morgens", genommen um 11:20 – die Uhr steht schon auf „mittags".
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [],
    standardMittel: [{ id: 's1', mittel: 'Ritalin Adult', dosis: '20 mg', tageszeit: 'morgens', bezug: null }],
  }, um('11:20'));
  check(await knopfText(page, 's1') === 'Ritalin Adult 20 mg · jetzt', `vorher „· jetzt" (${await knopfText(page, 's1')})`);
  await tipp(page, '[data-act="standard-eintragen"][data-id="s1"]');
  const e = (await speicher(page)).eintraege;
  check(e.length === 1 && e[0].um === '11:20' && !('tageszeit' in e[0]), 'eingetragen um 11:20, ohne Tageszeit');
  check(await knopfText(page, 's1') === 'Ritalin Adult 20 mg · 11:20 ✓',
    `„morgens" um 11:20 genommen: das Häkchen steht am Knopf (${await knopfText(page, 's1')})`);
  check(await knopfSagt(page, 's1') === 'Ritalin Adult 20 mg – heute um 11:20 eingetragen, noch eine Einnahme jetzt eintragen',
    `und die Ansage sagt es (${await knopfSagt(page, 's1')})`);
  await ctx.close();
}
{
  // „mittags", genommen um 15:10 – die Uhr steht schon auf „abends".
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [],
    standardMittel: [{ id: 's1', mittel: 'Medikinet', dosis: '5 mg', tageszeit: 'mittags', bezug: null }],
  }, um('15:10'));
  await tipp(page, '[data-act="standard-eintragen"][data-id="s1"]');
  check(await knopfText(page, 's1') === 'Medikinet 5 mg · 15:10 ✓',
    `„mittags" um 15:10 genommen: Häkchen (${await knopfText(page, 's1')})`);
  await ctx.close();
}
{
  // „abends", genommen nach Mitternacht – eine Uhrzeit ohne Tageszeit.
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [],
    standardMittel: [{ id: 's1', mittel: 'Strattera', dosis: '25 mg', tageszeit: 'abends', bezug: null }],
  }, um('00:40'));
  await tipp(page, '[data-act="standard-eintragen"][data-id="s1"]');
  check(await knopfText(page, 's1') === 'Strattera 25 mg · 00:40 ✓',
    `„abends" um 00:40 genommen: Häkchen (${await knopfText(page, 's1')})`);
  await ctx.close();
}
{
  // Dasselbe Mittel zweimal unter „Meine Mittel": morgens und mittags. Die
  // Einnahmen gehen der Reihe nach an die Knöpfe – auch eine Mittagsgabe, die
  // schon vor elf genommen wird.
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [],
    standardMittel: [
      { id: 's1', mittel: 'Methylphenidat', dosis: '10 mg', tageszeit: 'morgens', bezug: null },
      { id: 's2', mittel: 'Methylphenidat', dosis: '10 mg', tageszeit: 'mittags', bezug: null },
    ],
  }, um('06:50'));
  await tipp(page, '[data-act="standard-eintragen"][data-id="s1"]');
  check(await knopfText(page, 's1') === 'Methylphenidat 10 mg · 06:50 ✓' && await knopfText(page, 's2') === 'Methylphenidat 10 mg · jetzt',
    `nach der ersten Einnahme: Häkchen am ersten Knopf, der zweite offen (${await knopfText(page, 's1')} | ${await knopfText(page, 's2')})`);
  await page.clock.setFixedTime(um('10:55'));
  await tab(page, 'heute');
  await tipp(page, '[data-act="standard-eintragen"][data-id="s2"]');
  check((await speicher(page)).eintraege.length === 2, 'die zweite Einnahme ist eingetragen');
  check(await knopfText(page, 's1') === 'Methylphenidat 10 mg · 06:50 ✓',
    `der erste Knopf behält seine Zeit (${await knopfText(page, 's1')})`);
  check(await knopfText(page, 's2') === 'Methylphenidat 10 mg · 10:55 ✓',
    `der zweite bekommt das Häkchen – um 10:55, obwohl die Uhr noch „morgens" sagt (${await knopfText(page, 's2')})`);
  check(await knopfSagt(page, 's2') === 'Methylphenidat 10 mg – heute um 10:55 eingetragen, noch eine Einnahme jetzt eintragen',
    `mit passender Ansage (${await knopfSagt(page, 's2')})`);
  await ctx.close();
}
{
  // Eine ungefähr eingetragene Einnahme („mittags" gewählt, etwa noch ohne
  // Schalter über den Knopf) bleibt beim Knopf ihrer Tageszeit; eine genaue
  // danach geht an den freien Morgenknopf.
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [
      { id: 'u1', art: 'medikament', am: HEUTE, um: '12:30', ungefaehr: true, tageszeit: 'mittags', mittel: 'Medikinet adult', dosis: '10 mg' },
    ],
    standardMittel: [
      { id: 's1', mittel: 'Medikinet adult', dosis: '10 mg', tageszeit: 'morgens', bezug: null },
      { id: 's2', mittel: 'Medikinet adult', dosis: '10 mg', tageszeit: 'mittags', bezug: null },
    ],
  }, um('14:40'));
  check(await knopfText(page, 's1') === 'Medikinet adult 10 mg · jetzt' && await knopfText(page, 's2') === 'Medikinet adult 10 mg · 12:30 ✓',
    `ungefähr „mittags": Häkchen am Mittagsknopf (${await knopfText(page, 's1')} | ${await knopfText(page, 's2')})`);
  await tipp(page, '[data-act="standard-eintragen"][data-id="s1"]');
  check(await knopfText(page, 's1') === 'Medikinet adult 10 mg · 14:40 ✓' && await knopfText(page, 's2') === 'Medikinet adult 10 mg · 12:30 ✓',
    `die genaue danach am freien Knopf (${await knopfText(page, 's1')} | ${await knopfText(page, 's2')})`);
  await ctx.close();
}

/* ---------- 4. „Heute keins" ---------- */

{
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [{ id: 'e0', art: 'medikament', am: '2026-03-08', um: '07:30', mittel: 'Concerta', dosis: '36 mg' }],
    standardMittel: [{ id: 's1', mittel: 'Intuniv', dosis: '1 mg', tageszeit: 'abends', bezug: null }],
  });
  // Concerta (Stimulans) steht in den letzten Wochen im Tagebuch.
  const pause = page.locator('[data-act="adhs-pause"]');
  check(await pause.count() === 1 && (await pause.innerText()).trim() === 'Heute keins', 'heute steht „Heute keins"');
  await pause.click();
  await kurz(page);
  let s = await speicher(page);
  check(s.tage[HEUTE] && s.tage[HEUTE].adhsPause === 'pause', 'ein Tipp notiert den Tag ohne Mittel');
  check((await meldung(page)) === 'Als Tag ohne ADHS-Mittel notiert. Rückgängig', `Meldung mit „Rückgängig" (${await meldung(page)})`);
  check((await text(page, '.adhs-pause')).startsWith('Ohne ADHS-Mittel · Warum?'), 'danach die Zeile mit dem Grund');
  check((await text(page, '.jetzt-zeile')).includes('heute als Tag ohne ADHS-Mittel notiert'), 'und die Jetzt-Zeile sagt es');
  check((await text(page, '.adhs-pause')).includes('„Wegen Beschwerden“ zählt in keinem Vergleich'), 'mit dem Satz zu „wegen Beschwerden"');
  const grund = (id) => page.locator(`[data-act="adhs-pause-grund"][data-id="${id}"]`);
  await grund('geplant').click();
  await kurz(page);
  check((await speicher(page)).tage[HEUTE].adhsPause === 'geplant', 'ein Tipp setzt den Grund');
  check(await grund('geplant').getAttribute('aria-pressed') === 'true', 'und zeigt ihn (aria-pressed)');
  await grund('geplant').click();
  await kurz(page);
  check((await speicher(page)).tage[HEUTE].adhsPause === 'pause', 'ein zweiter Tipp nimmt nur den Grund zurück');
  await grund('beschwerden').click();
  await kurz(page);
  check((await speicher(page)).tage[HEUTE].adhsPause === 'beschwerden', '„wegen Beschwerden" wird gespeichert');
  await tipp(page, '[data-act="adhs-pause-weg"]');
  s = await speicher(page);
  check(!s.tage[HEUTE] || !s.tage[HEUTE].adhsPause, 'das × nimmt den Tag ohne Mittel zurück');
  // Rückgängig aus der Meldung.
  await tipp(page, '[data-act="adhs-pause"]');
  await tipp(page, '#toast [data-act="adhs-pause-zurueck"]');
  s = await speicher(page);
  check(!s.tage[HEUTE] || !s.tage[HEUTE].adhsPause, '„Rückgängig" nimmt ihn ebenso zurück');
  // Eine Stimulans-Einnahme hebt ihn auf.
  await tipp(page, '[data-act="adhs-pause"]');
  await tipp(page, '[data-act="neu"][data-art="medikament"]');
  await page.locator('#bogenMittel').fill('Concerta');
  await kurz(page);
  await tipp(page, '[data-act="bogen-speichern"]');
  s = await speicher(page);
  check(!s.tage[HEUTE] || !s.tage[HEUTE].adhsPause, 'eine Stimulans-Einnahme hebt den Tag ohne Mittel auf');
  check((await meldung(page)).includes('Der Tag ohne Mittel ist damit aufgehoben.'), `und die Meldung sagt es (${await meldung(page)})`);
  check(await zahl(page, '[data-act="adhs-pause"]') === 0, 'mit Einnahme kein „Heute keins"');
  // Gestern: „Keins genommen".
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  check((await text(page, '[data-act="adhs-pause"]')) === 'Keins genommen', 'an einem vergangenen Tag heißt er „Keins genommen"');
  await ctx.close();
}

{
  // Nur Guanfacin und Atomoxetin: keine Stimulanzien, kein „Heute keins".
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [{ id: 'e0', art: 'medikament', am: GESTERN, um: '19:00', mittel: 'Strattera', dosis: '40 mg' }],
    standardMittel: [
      { id: 's1', mittel: 'Intuniv', dosis: '2 mg', tageszeit: 'abends', bezug: null },
      { id: 's2', mittel: 'Strattera', dosis: '40 mg', tageszeit: null, bezug: null },
    ],
  });
  check(await zahl(page, '[data-act="adhs-pause"]') === 0, 'bei Guanfacin und Atomoxetin kein „Heute keins"');
  check((await page.locator('[data-act="standard-eintragen"][data-id="s1"]').innerText()).includes('· jetzt'),
    '„jetzt genommen" gibt es für sie trotzdem');
  await ctx.close();
}

/* ---------- 5. „Zum Essen?" ---------- */

{
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [
      { id: 'a1', art: 'medikament', am: HEUTE, um: '07:50', mittel: 'Elvanse', dosis: '30 mg' },
      { id: 'a2', art: 'medikament', am: HEUTE, um: '07:55', mittel: 'Strattera', dosis: '40 mg' },
      // Ungefähr eingetragen: für Stunden zu ungenau – keine Frage.
      { id: 'a3', art: 'medikament', am: HEUTE, um: '08:00', mittel: 'Intuniv', dosis: '1 mg', ungefaehr: true, tageszeit: 'morgens' },
    ],
    standardMittel: [],
  });
  const zeilen = page.locator('.adhs-essen');
  check(await zeilen.count() === 2, `„Zum Essen?" steht je genau eingetragener Einnahme (${await zeilen.count()})`);
  check((await text(page, '.adhs-essen')).startsWith('Elvanse 07:50 – zum Essen?'), 'mit Name und Uhrzeit');
  check(await page.locator('[data-act="adhs-essen"][data-id="a1"]').count() === 3, 'drei Antworten');
  check((await page.locator('[data-act="adhs-essen"]').evaluateAll((els) => els.every((x) => x.getAttribute('aria-pressed') === 'false'))),
    'jede mit aria-pressed');
  await tipp(page, '[data-act="adhs-essen"][data-id="a1"][data-wert="ohne"]');
  let s = await speicher(page);
  const a1 = s.eintraege.find((e) => e.id === 'a1');
  check(a1.essen === 'ohne' && a1.essenGesetzt === um('08:10').getTime(),
    `ein Tipp speichert die Angabe mit ihrem Zeitpunkt (${a1.essen}, ${a1.essenGesetzt})`);
  check(await zeilen.count() === 1 && (await text(page, '.adhs-essen')).startsWith('Strattera'), 'und die Zeile ist weg');
  // Eine Mahlzeit, die es schon sagt: keine Frage mehr.
  await tipp(page, '[data-act="neu"][data-art="essen"]');
  await page.locator('#bogenWas').fill('Toast');
  await page.locator('#bogenUhr').fill('08:00');
  await tipp(page, '[data-act="bogen-speichern"]');
  check(await zeilen.count() === 0, 'eine Mahlzeit fünf Minuten danach beantwortet die Frage – sie verschwindet');
  s = await speicher(page);
  check(!s.eintraege.find((e) => e.id === 'a2').essen, 'ohne dass etwas eingetragen wird');
  await ctx.close();
}

{
  // Eine Stunde nach der Einnahme wird nicht mehr gefragt.
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [{ id: 'a1', art: 'medikament', am: HEUTE, um: '07:50', mittel: 'Medikinet adult', dosis: '10 mg', form: 'pellet' }],
    standardMittel: [],
  }, um('08:45'));
  check(await zahl(page, '.adhs-essen') === 1, 'nach 55 Minuten steht die Frage noch');
  await page.clock.setFixedTime(um('08:51'));
  await tab(page, 'heute');
  check(await zahl(page, '.adhs-essen') === 0, 'nach 61 Minuten nicht mehr');
  await ctx.close();
}

/* ---------- 6. Der Bogen ---------- */

{
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [
      { id: 'f1', art: 'essen', am: HEUTE, um: '07:30', was: 'Müsli', zutaten: [], portion: 'normal' },
      { id: 'e1', art: 'medikament', am: HEUTE, um: '07:40', mittel: 'Elvanse', dosis: '50 mg' },
    ],
    standardMittel: [{ id: 's1', mittel: 'Medikinet', dosis: '10 mg', tageszeit: null, bezug: null, form: 'sofort' }],
  });
  await tipp(page, '[data-act="neu"][data-art="medikament"]');
  const wissen = '#bogenWissen';
  await page.locator('#bogenMittel').fill('Concerta 36 mg');
  await kurz(page);
  check(await page.locator('[data-act="bogen-form"][data-id="oros"]').getAttribute('aria-pressed') === 'true',
    'bei „Concerta" ist die Form nach dem Namen vorgewählt');
  check((await text(page, wissen)).includes('vorgewählt nach dem Namen'), 'und das steht dabei');
  check((await text(page, wissen)).includes('Tablettenhülle'), 'mit dem Text der Form');
  /*
   * Unter „Welche Form?" steht nur der Text der Form, ohne den Hinweis des
   * Wirkstoffs – auch er muss sagen, wen man fragt.
   */
  check(/Ärztin oder Apotheke|Praxis oder Apotheke/.test(await text(page, `${wissen} .form-text`)),
    'der Formtext im Bogen verweist auf Ärztin oder Apotheke (Retardtablette mit Hülle)');
  await page.locator('#bogenMittel').fill('Equasym Retard');
  await kurz(page);
  check(await page.locator('[data-act="bogen-form"][data-id="equasym"]').getAttribute('aria-pressed') === 'true'
    && /Ärztin oder Apotheke|Praxis oder Apotheke/.test(await text(page, `${wissen} .form-text`)),
  `ebenso bei Equasym Retard (${await text(page, `${wissen} .form-text`)})`);
  await page.locator('#bogenMittel').fill('Medikinet');
  await kurz(page);
  check(await page.locator('[data-act="bogen-form"][data-id="sofort"]').getAttribute('aria-pressed') === 'true',
    '„Medikinet" nimmt die Form aus „Meine Mittel"');
  check((await text(page, wissen)).includes('vorgewählt wie bei deinen Mitteln'), 'und sagt es');
  await page.locator('#bogenMittel').fill('Methylphenidat');
  await kurz(page);
  check(await page.locator('[data-act="bogen-form"][aria-pressed="true"]').count() === 0,
    'bei „Methylphenidat" ist keine Form vorgewählt – geraten wird nicht');
  check(await page.locator('[data-act="bogen-form"]').count() === 7, 'sieben Formen zur Wahl');
  await tipp(page, '[data-act="bogen-form"][data-id="pellet"]');
  check(await page.locator('[data-act="bogen-form"][data-id="pellet"]').getAttribute('aria-pressed') === 'true', 'ein Tipp wählt eine Form');
  /*
   * Kein Säureblocker eingetragen, also keine Karte W1 mit ihrem Verweis: Der
   * Formtext allein nennt die Gegenanzeige – und sagt, wen man fragt.
   */
  const pelletText = await text(page, `${wissen} .form-text`);
  check(pelletText.includes('unter den Gegenanzeigen') && pelletText.includes('Praxis oder Apotheke')
    && pelletText.includes('nichts eigenmächtig weglassen'),
  'Kapsel mit zweierlei Kügelchen: im Bogen die Gegenanzeige, mit Verweis auf Praxis oder Apotheke');
  // „Zum Essen?" ohne Bezug, mit Bezug nicht.
  check(await page.locator('[data-act="bogen-essen"]').count() === 3, 'ohne Bezug fragt der Bogen „Zum Essen?"');
  await tipp(page, '[data-act="bogen-essen"][data-id="vor"]');
  check(await page.locator('[data-act="bogen-essen"][data-id="vor"]').getAttribute('aria-pressed') === 'true', 'die Wahl ist markiert');
  await tipp(page, '[data-act="zeit-tageszeit"][data-id="morgens"]');
  await tipp(page, '[data-act="zeit-bezug"][data-id="nach"]');
  check(await page.locator('[data-act="bogen-essen"]').count() === 0, 'mit „nach dem Essen" fehlt „Zum Essen?" – der Bezug sagt es schon');
  await tipp(page, '[data-act="zeit-bezug"][data-id="nach"]');
  check(await page.locator('[data-act="bogen-essen"]').count() === 3, 'ohne Bezug ist es wieder da');
  check(await breitOk(page), 'der Medikamenten-Bogen passt in 320 Pixel');
  await tipp(page, '[data-act="bogen-speichern"]');
  let s = await speicher(page);
  const neu = s.eintraege.find((e) => e.mittel === 'Methylphenidat');
  check(neu && neu.form === 'pellet' && neu.essen === 'vor' && neu.essenGesetzt === um('08:10').getTime(),
    `gespeichert mit Form, Essen und dem Zeitpunkt der Angabe (${neu && `${neu.form} ${neu.essen}`})`);
  // Ein Bezug im Bogen: keine Essensangabe gespeichert.
  await tipp(page, '[data-act="bearbeiten"][data-id="e1"]');
  await tipp(page, '[data-act="bogen-essen"][data-id="ohne"]');
  await tipp(page, '[data-act="zeit-tageszeit"][data-id="morgens"]');
  await tipp(page, '[data-act="zeit-bezug"][data-id="beim"]');
  await tipp(page, '[data-act="bogen-speichern"]');
  s = await speicher(page);
  const e1 = s.eintraege.find((e) => e.id === 'e1');
  check(e1.bezug === "beim" && !e1.essen, `mit gewähltem Bezug bleibt keine eigene Essensangabe stehen (${JSON.stringify(e1)})`);
  // Die Zeile im Kopfbogen.
  await tipp(page, '[data-act="neu"][data-art="kopf"]');
  const kopfZeile = await text(page, '.kopf-adhs');
  check(kopfZeile.startsWith('ADHS-Mittel an diesem Tag:') && kopfZeile.includes('(Elvanse)') && kopfZeile.includes('(Methylphenidat)'),
    `der Kopfbogen nennt die ADHS-Mittel des Tages (${kopfZeile})`);
  await tipp(page, 'button.bogen-zu');
  await ctx.close();
}

/* ---------- 7. Zwei Mittel, die zusammen unter den Gegenanzeigen stehen ---------- */

{
  const { ctx, page } = await iphone({
    adhsAn: null,
    eintraege: [],
    standardMittel: [{ id: 's1', mittel: 'Medikinet retard', dosis: '20 mg', tageszeit: 'morgens', bezug: null }],
  });
  check(await zahl(page, '.wechsel-karte') === 0, 'mit einem Mittel allein keine Karte');
  // Der Säureblocker kommt über den Bogen dazu.
  await tipp(page, '[data-act="neu"][data-art="medikament"]');
  await page.locator('#bogenMittel').fill('Nexium');
  await kurz(page);
  check((await text(page, '#bogenWissen')).includes('Kapsel mit zweierlei Kügelchen'), 'schon im Bogen steht der Hinweis zum Paar');
  await tipp(page, '[data-act="bogen-speichern"]');
  check((await meldung(page)).includes('Hinweis zu deinen Mitteln oben auf „Tag“.'), `die Meldung sagt, wo der Hinweis steht (${await meldung(page)})`);
  const karte = await text(page, '.wechsel-karte');
  check(karte.includes('Kapsel mit zweierlei Kügelchen und Nexium') && karte.includes('nichts davon eigenmächtig weglassen'),
    'auf „Tag" steht die Karte W1 – auch ohne Schalter');
  check(await breitOk(page), 'Tag mit der Karte passt in 320 Pixel');
  await tipp(page, '[data-act="wechsel-gelesen"]');
  let s = await speicher(page);
  check(s.wechselGelesen.includes('W1|medikinet retard|nexium'), `„Gelesen" merkt sich das Paar (${s.wechselGelesen.join()})`);
  check(await zahl(page, '.wechsel-karte') === 0, 'und die Karte ist weg');
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, '.wechsel-karte') === 0, 'auch nach dem Neuladen');
  await tab(page, 'mehr');
  check((await text(page, '#meineMittel')).includes('Medikinet retard und Nexium'), 'unter „Mehr" › „Meine Mittel" steht der Hinweis weiter');
  await ctx.close();
}

{
  // Ohne Form: W1u – bis eine andere Form gewählt ist.
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [{ id: 'm1', art: 'medikament', am: GESTERN, um: '12:00', mittel: 'Maaloxan', dosis: '' }],
    standardMittel: [{ id: 's1', mittel: 'Methylphenidat', dosis: '10 mg', tageszeit: 'morgens', bezug: null }],
  });
  check((await text(page, '.wechsel-karte')).includes('Methylphenidat (Methylphenidat) und Maaloxan'),
    'ohne Form steht die Karte W1u');
  // Darunter fragt die Rückfrage (Fassung 29) nach der Form – sie ist keine
  // weitere Hinweiskarte und zählt nicht als eine.
  check(await zahl(page, '.wechsel-karte') === 1 && await zahl(page, '.rueckfrage-karte') === 1
    && await zahl(page, '.rueckfrage-karte.wechsel-karte') === 0,
  'die Rückfrage zur Form zählt nicht als Hinweiskarte (.wechsel-karte)');
  await tab(page, 'mehr');
  check(await page.locator('[data-act="mph-form"]').count() === 7, 'unter „Meine Mittel" die Formwahl');
  await tipp(page, '[data-act="mph-form"][data-id="sodas"]');
  let s = await speicher(page);
  check(s.standardMittel[0].form === 'sodas', 'ein Tipp speichert die Form beim eigenen Mittel');
  check(await page.locator('[data-act="mph-form"][data-id="sodas"]').getAttribute('aria-pressed') === 'true', 'und zeigt sie');
  check((await text(page, '#meineMittel')).includes('Ob ein Säureblocker zu deinem Präparat passt'), 'darunter jetzt der Hinweis der Stufe B');
  check(await breitOk(page), '„Mehr" passt in 320 Pixel');
  await tab(page, 'heute');
  check(await zahl(page, '.wechsel-karte') === 0, 'auf „Tag" keine Karte mehr – die Form ist geklärt');
  await tab(page, 'mehr');
  await tipp(page, '[data-act="mph-form"][data-id="sodas"]');
  s = await speicher(page);
  check(s.standardMittel[0].form === null, 'ein zweiter Tipp nimmt die Form zurück');
  await ctx.close();
}

await page_ende();

async function page_ende() {
  await page_bild();
  check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
  await browser.close();
  await kopie.zu();
  ende();
}

/** Ein Bildschirmfoto mit allem an, zum Ansehen. */
async function page_bild() {
  const { ctx, page } = await iphone({
    adhsAn: true,
    eintraege: [
      { id: 'a1', art: 'medikament', am: HEUTE, um: '07:50', mittel: 'Lisdexamfetamin', dosis: '30 mg' },
    ],
    standardMittel: [{ id: 's1', mittel: 'Lisdexamfetamin', dosis: '30 mg', tageszeit: null, bezug: null }],
  });
  check(await breitOk(page), 'Tag mit Jetzt-Zeile und „Zum Essen?" passt in 320 Pixel');
  await nieNochNicht(page, 'mit „Zum Essen?"');
  await page.screenshot({ path: `${SHOT}/adhs-tag.png`, fullPage: true });
  await ctx.close();
}
