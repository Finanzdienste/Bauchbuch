/*
 * Die Rückfrage zu Methylphenidat und die Karte „Neu" auf „Tag" – als
 * iPhone, als App vom Home-Bildschirm, mit gestellter Uhr.
 *
 * Die Hinweise zu zwei Mitteln (js/zusammen.js) gibt es nur, wenn beide
 * Mittel eingetragen sind und die Form bekannt ist. Wer ein Methylphenidat
 * einträgt, aber die Form nicht angibt oder den Säureblocker nirgends
 * notiert, erfuhr bisher nichts. Die Rückfrage fragt genau das, was fehlt –
 * und nicht mehr:
 *
 *   1. Was sie fragt, wo die Antwort landet und dass danach die passende
 *      bestehende Karte (W1, W1u, W3, W4) von selbst erscheint.
 *   2. Kein Drängeln: höchstens zwei Tage je Name, „Später" nur am ersten,
 *      „Nicht mehr fragen" endgültig (mit „Rückgängig", auch per Tastatur
 *      erreichbar), ein neuer Name ist ein neues Mittel. Ohne Ausnahme –
 *      auch nicht über Nacht in einem Zwischenschritt oder bei vollem
 *      „Meine Mittel".
 *   2a. Ein Doppeltipp beantwortet nicht gleich den nächsten Schritt.
 *   3. Nie mehr als die bestehenden Karten zulassen: W1/W1u und das Angebot
 *      werden nie verdrängt.
 *   4. Die Karte „Neu" einmal, nie bei einem neuen Tagebuch.
 *   5. Ansehen zählt nur, wenn man es sieht – und schreibt nie ins Tagebuch.
 *   6. Kein Satz mit Dosis, Rat oder „noch nicht", nichts ragt über den
 *      Rand, und nichts geht nach draußen.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import { plusTage } from '../js/datum.js';
import { ADHS_NAMEN, MITTEL_WISSEN, REIZSTOFFE } from '../js/mittel.js';
import * as zusammen from '../js/zusammen.js';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
const PORT = Number(process.env.BAUCHBUCH_PORT_RUECKFRAGE || 8591);
if (PORT < 8591 || PORT > 8599) throw new Error(`Port ${PORT} liegt außerhalb von 8591–8599`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 760 };
const KLEIN = { width: 320, height: 568 };
const IPHONE = { width: 390, height: 844 };

const HEUTE = '2026-03-10';
const tag = (n) => plusTage(HEUTE, n);
const um = (hhmm, iso = HEUTE) => new Date(`${iso}T${hhmm}:00+01:00`);
const GEZEIGT = `${KEY}.gezeigt`;
const SAEURE_WAHL = Array.isArray(zusammen.SAEURE_WAHL) ? zusammen.SAEURE_WAHL : [];

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const EIGEN = new globalThis.URL(kopie.adresse).origin;
const browser = await chromium.launch();
const fehler = [];
const fremd = [];

/*
 * Ohne Angebot (adhsAn, spannungAn entschieden) und mit gelesener Karte
 * „Neu" – sonst stünde je nach Stand eine weitere Karte da, und die
 * Rückfrage wartete (siehe tagAnsicht). Die Fälle, die genau das prüfen,
 * setzen es ausdrücklich anders.
 */
const GRUND = {
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, unterleibGefragt: true,
  lastBackup: { on: HEUTE, anzahl: 1 }, v28Gesagt: true, v29Gesagt: true, adhsAn: false, spannungAn: false, tage: {},
};
const NOTIZ = { id: 'n0', art: 'notiz', am: HEUTE, um: '07:00', text: 'Morgen' };
const meins = (id, mittel, extra = {}) => ({ id, mittel, dosis: '', tageszeit: null, bezug: null, ...extra });
const nimmt = (id, mittel, am, extra = {}) => ({ id, art: 'medikament', am, um: '07:30', mittel, dosis: '10 mg', ...extra });

/** Ein iPhone mit der App vom Home-Bildschirm, diesem Stand und dieser Uhr. */
async function iphone(stand, {
  zeit = um('08:10'), viewport = SCHMAL, colorScheme = 'dark', verborgen = false, suche = '',
} = {}) {
  const ctx = await browser.newContext({
    viewport, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'Europe/Berlin', locale: 'de-DE', colorScheme,
  });
  // Fehlt ein Knopf, soll der Test schnell rot werden statt eine halbe Minute zu warten.
  ctx.setDefaultTimeout(5000);
  // Alles, was nicht zur App gehört, wird mitgeschrieben und abgebrochen.
  await ctx.route('**/*', (route) => {
    const ziel = route.request().url();
    if (ziel.startsWith(EIGEN) || ziel.startsWith('data:') || ziel.startsWith('blob:')) return route.continue();
    fremd.push(ziel);
    return route.abort();
  });
  await ctx.addInitScript(([k, s, verb]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    if (verb) {
      Object.defineProperty(document, 'visibilityState', { get: () => window.__sicht || 'hidden', configurable: true });
    }
    try { if (s && !localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, stand ? { ...GRUND, ...stand } : null, verborgen]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.clock.setFixedTime(zeit);
  await page.goto(kopie.adresse + suche, { waitUntil: 'networkidle' });
  return { ctx, page };
}

/** Einen anderen Stand in dieselbe Seite legen – ohne die Stempel des vorigen. */
async function stand(page, z) {
  await page.evaluate(async ([k, g, s]) => {
    const st = await import('/js/store.js');
    st.sofortSchreiben();
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.removeItem(g);
  }, [KEY, GEZEIGT, { ...GRUND, ...z }]);
  await page.reload({ waitUntil: 'networkidle' });
}

const speicher = (page) => page.evaluate(async (k) => {
  const st = await import('/js/store.js');
  st.sofortSchreiben();
  return JSON.parse(localStorage.getItem(k));
}, KEY);
/** Der Gerätespeicher „was stand wann auf Tag". */
const gezeigt = (page) => page.evaluate((k) => {
  try {
    const g = JSON.parse(localStorage.getItem(k));
    if (g && typeof g === 'object') return { am: g.am ?? null, zu: g.zu ?? null, tage: g.tage || {} };
  } catch { /* leer */ }
  return { am: null, zu: null, tage: {} };
}, GEZEIGT);
const kurz = (page) => page.waitForTimeout(150);
/*
 * Nach einer Antwort auf die Rückfrage oder die Karte „Neu" zählt auf „Tag"
 * eine halbe Sekunde lang kein Tipp (Abschnitt 16b, Doppeltipp). Der Test
 * tippt danach erst, wenn ein Mensch die neue Frage gelesen haben könnte.
 */
const RUHE = 560;
const tipp = async (page, sel) => {
  await page.locator(sel).first().click();
  await page.waitForTimeout(/rueckfrage-|v29-/.test(sel) ? RUHE : 150);
};
const text = async (page, sel) => ((await page.locator(sel).count())
  ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const zahl = (page, sel) => page.locator(sel).count();
const tab = async (page, id) => tipp(page, `[data-act="tab"][data-tab="${id}"]`);
const breitOk = async (page) => {
  const b = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  return b[0] <= b[1];
};
const fokusId = (page) => page.evaluate(() => (document.activeElement && document.activeElement.id) || '');
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Neu laden zu einer anderen Uhrzeit oder an einem anderen Tag. */
const tagWechsel = async (page, iso, hhmm = '08:10') => {
  await page.clock.setFixedTime(um(hhmm, iso));
  await page.reload({ waitUntil: 'networkidle' });
};

const KARTE = '.rueckfrage-karte';
const frage = (page) => text(page, '#rueckfrageFrage');
const kopf = (page) => text(page, '.rueckfrage-kopf');
const form = (id) => `${KARTE} [data-act="rueckfrage-form"][data-id="${id}"]`;
const SPAETER = `${KARTE} [data-act="rueckfrage-spaeter"]`;
const NIE = `${KARTE} [data-act="rueckfrage-nie"]`;
const F_FORM = 'Welche Form steht auf der Packung?';
const F_SAEURE = 'Nimmst du außerdem ein Mittel gegen Magensäure?';
const F_WELCHES = 'Welches Mittel gegen Magensäure?';
const F_PRUEFEN = 'Diesen Namen kennt Body Check nicht';
const F_MERKEN = 'Auch unter „Meine Mittel“ merken?';
const HINWEIS_OBEN = 'Hinweis zu deinen Mitteln oben auf „Tag“.';

// Für den Ton (Abschnitt 17): alle Kartentexte und alle Meldungen.
const kartenTexte = [];
const meldungen = [];
const meldung = async (page) => {
  const m = await text(page, '#toast');
  if (m) meldungen.push(m);
  return m;
};
/** Der Text einer Karte ohne die Wahlknöpfe – die tragen Packungsnamen. */
const kartenText = async (page, sel = KARTE) => {
  const t = await page.evaluate((s) => {
    const k = document.querySelector(s);
    if (!k) return '';
    const c = k.cloneNode(true);
    c.querySelectorAll('.rueckfrage-wahl, [data-act="rueckfrage-form"]').forEach((b) => b.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }, sel);
  if (t) kartenTexte.push(t);
  return t;
};
/** Steht a im DOM vor b? */
const davor = (page, a, b) => page.evaluate(([x, y]) => {
  const ea = document.querySelector(x);
  const eb = document.querySelector(y);
  return !!ea && !!eb && !!(ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING);
}, [a, b]);

/* ---------- 1. Die Formfrage, Name unter „Meine Mittel" ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [NOTIZ],
    standardMittel: [meins('s1', 'Medikinet', { dosis: '10 mg', tageszeit: 'morgens' })],
  });
  check(await zahl(page, KARTE) === 1, 'Medikinet ohne Form, kein Säureblocker: genau eine Rückfrage auf „Tag"');
  check(await kopf(page) === 'Rückfrage zu Medikinet' && await frage(page) === F_FORM,
    `sie nennt das Mittel und fragt nach der Form (${await kopf(page)} | ${await frage(page)})`);
  check(await page.locator(KARTE).getAttribute('role') === 'region'
    && await page.locator(KARTE).getAttribute('aria-label') === 'Rückfrage zu Medikinet',
  'die Karte ist eine benannte Region');
  check((await text(page, KARTE)).includes('Davon hängt ab, ob es zu deinen Mitteln einen Hinweis gibt.'),
    'sie sagt, warum sie fragt');
  const formTexte = (await page.locator(`${KARTE} [data-act="rueckfrage-form"]`).allInnerTexts()).map((t) => t.trim());
  check(formTexte.length === 7 && formTexte[6] === 'Weiß ich nicht', `sieben Formen, „Weiß ich nicht" zuletzt (${formTexte.length})`);
  check(await page.locator(`${KARTE} [data-act="rueckfrage-form"][aria-pressed]`).count() === 0
    && await page.locator(`${KARTE} .marke.an`).count() === 0,
  'die Formknöpfe sind Aktionen, keine Umschalter – kein aria-pressed, nichts vorgewählt');
  check(await page.locator(`${KARTE} [role="group"]`).getAttribute('aria-label') === 'Form von Medikinet',
    'die Gruppe der Formen ist benannt');
  check(await page.locator(SPAETER).getAttribute('aria-label') === 'Später – frühestens in einer Woche fragt Body Check noch ein letztes Mal'
    && await page.locator(NIE).getAttribute('aria-label') === 'Zu Medikinet nicht mehr fragen',
  '„Später" und „Nicht mehr fragen" sagen, was sie tun');
  check(gleich((await gezeigt(page)).tage, { medikinet: [HEUTE] }), `gezeigt heißt gestempelt: ${JSON.stringify((await gezeigt(page)).tage)}`);
  await kartenText(page);
  await tab(page, 'mehr');
  const mehrTexte = (await page.locator('[data-act="mph-form"]').allInnerTexts()).map((t) => t.trim());
  check(gleich(formTexte, mehrTexte), 'dieselben Bezeichnungen wie unter „Mehr" › „Meine Mittel"');
  await tab(page, 'heute');

  await tipp(page, form('pellet'));
  let s = await speicher(page);
  check(s.standardMittel[0].form === 'pellet' && gleich(s.mphRueckfrage || {}, {}),
    `die Form landet beim eigenen Mittel, nicht bei der Rückfrage (${s.standardMittel[0].form})`);
  check((await meldung(page)).startsWith('Form: Kapsel mit zweierlei Kügelchen. Steht jetzt bei deinem Mittel unter „Meine Mittel“.'),
    `die Meldung sagt, wo die Antwort steht (${await meldung(page)})`);
  check(await zahl(page, KARTE) === 1 && await frage(page) === F_SAEURE, 'dieselbe Karte fragt jetzt nach dem Säureblocker');
  check(await fokusId(page) === 'rueckfrageFrage', 'der Fokus steht auf der neuen Frage');
  const saeureText = await kartenText(page);
  check(saeureText.includes('Pantoprazol') && saeureText.includes('Rennie') && saeureText.includes('Natron')
    && saeureText.includes('Davon hängt ab, ob es zu deinen Mitteln einen Hinweis gibt.'),
  'die Säurefrage nennt Beispiele aus der Erkennung und sagt, warum');
  // „Ja" legt selbst nichts an – es führt zur Wahl (siehe 2). Die Ansage sagt das.
  check(await page.locator(`${KARTE} [data-act="rueckfrage-saeure-ja"]`).getAttribute('aria-label') === 'Ja – das Mittel gegen Magensäure auswählen'
    && await page.locator(`${KARTE} [data-act="rueckfrage-saeure-nein"]`).getAttribute('aria-label') === 'Nein, kein Mittel gegen Magensäure',
  '„Ja" und „Nein" mit Ansage – „Ja" verspricht kein Anlegen');
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  s = await speicher(page);
  check(s.mphRueckfrage.medikinet && s.mphRueckfrage.medikinet.saeure === 'nein' && await zahl(page, KARTE) === 0,
    '„Nein" wird gemerkt, die Karte ist weg');
  check(await meldung(page) === 'Gemerkt. Dazu fragt Body Check erst bei einem neuen Methylphenidat-Namen wieder. '
    + 'Kommt ein Mittel gegen Magensäure dazu, trag es beim Eintragen oder unter „Meine Mittel“ ein.',
  `mit Meldung – sie sagt, dass ein neuer Name noch einmal gefragt wird (${await meldung(page)})`);
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, KARTE) === 0, 'auch nach dem Neuladen');
  await tagWechsel(page, tag(1));
  check(await zahl(page, KARTE) === 0, 'und am nächsten Tag');
  await tagWechsel(page, tag(30));
  check(await zahl(page, KARTE) === 0, 'und nach 30 Tagen');
  // Ein neuer Name ist ein neues Mittel – auch für die Frage nach dem Säureblocker.
  await page.evaluate(async () => {
    const st = await import('/js/store.js');
    st.standardMerken({ mittel: 'Ritalin LA', dosis: '', tageszeit: null, bezug: null });
    st.sofortSchreiben();
  });
  await page.reload({ waitUntil: 'networkidle' });
  check(await kopf(page) === 'Rückfrage zu Ritalin LA' && await frage(page) === F_SAEURE,
    `ein später dazukommender Name wird noch einmal gefragt, wie die Meldung sagt (${await kopf(page)} | ${await frage(page)})`);
  await ctx.close();
}

/* ---------- 2. „Ja" mit einem Namen aus dem Tagebuch ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [nimmt('p1', 'Pantoprazol 20 mg', tag(-40), { dosis: '' }), NOTIZ],
    standardMittel: [meins('s1', 'Medikinet adult', { dosis: '20 mg' })],
  });
  check(await zahl(page, KARTE) === 1 && await frage(page) === F_SAEURE,
    'Medikinet adult, der Säureblocker nur vor 40 Tagen: gleich die Säurefrage');
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  check(await frage(page) === F_WELCHES && await fokusId(page) === 'rueckfrageFrage', '„Ja" fragt, welches');
  const wahl = (await page.locator(`${KARTE} .rueckfrage-wahl`).allInnerTexts()).map((t) => t.trim());
  check(wahl[0] === 'Pantoprazol 20 mg' && gleich(wahl.slice(1), SAEURE_WAHL),
    `zuerst der Name aus dem Tagebuch, dann die bekannten (${wahl.slice(0, 4).join(', ')} …)`);
  check(await page.locator(`${KARTE} .rueckfrage-wahl`).first().getAttribute('aria-label') === 'Pantoprazol 20 mg unter „Meine Mittel“ anlegen',
    'jeder Wahlknopf sagt, was er tut');
  check(await page.locator(`${KARTE} [role="group"]`).getAttribute('aria-label') === 'Mittel gegen Magensäure wählen'
    && await page.locator(`${KARTE} label[for="rueckfrageName"]`).count() === 1,
  'die Wahl ist eine benannte Gruppe, das Feld hat ein Etikett');
  await kartenText(page);
  check(await breitOk(page), 'WELCHES passt in 320 Pixel');
  const vorher = await speicher(page);
  await tipp(page, `${KARTE} .rueckfrage-wahl`);
  const s = await speicher(page);
  const neu = s.standardMittel.find((m) => m.mittel === 'Pantoprazol 20 mg');
  check(s.standardMittel.length === 2 && neu && neu.dosis === '' && neu.tageszeit === null,
    `ein Tipp legt das Mittel unter „Meine Mittel" an, ohne Dosis (${JSON.stringify(neu)})`);
  check(s.eintraege.length === vorher.eintraege.length, 'eingetragen wird dabei nichts');
  check(await zahl(page, '.wechsel-karte') === 1
    && (await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol 20 mg'),
  'danach steht die Karte W1 von selbst da');
  const m = await meldung(page);
  check(m.startsWith('Pantoprazol 20 mg steht jetzt bei deinen Mitteln – ohne Dosis. Eine Einnahme ist damit nicht notiert.')
    && m.includes(HINWEIS_OBEN), `die Meldung sagt, wo der Hinweis steht (${m})`);
  check(await zahl(page, KARTE) === 0 && s.mphRueckfrage['medikinet adult'].saeure === 'ja', 'die Rückfrage ist beantwortet');
  await ctx.close();
}

/* ---------- 3. Ein Name, den die Erkennung nicht kennt ---------- */

{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] });
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  await page.locator('#rueckfrageName').fill('Pantoprazl');
  await page.locator('#rueckfrageName').press('Enter');
  await page.waitForTimeout(RUHE);
  let s = await speicher(page);
  check(await frage(page) === F_PRUEFEN && await fokusId(page) === 'rueckfrageFrage',
    `ein Tippfehler wird nachgefragt, nicht angelegt (${await frage(page)})`);
  check((await text(page, KARTE)).includes('„Pantoprazl“ erkennt Body Check nicht als Mittel gegen Magensäure.'),
    'mit dem getippten Namen');
  check(s.standardMittel.length === 1 && !((s.mphRueckfrage || {})['medikinet adult'] || {}).saeure,
    'gespeichert ist nichts – weder ein Mittel noch eine Antwort');
  await kartenText(page);
  check(await breitOk(page), 'PRUEFEN passt in 320 Pixel');
  await tipp(page, `${KARTE} [data-act="rueckfrage-aendern"]`);
  check(await frage(page) === F_WELCHES && await page.locator('#rueckfrageName').inputValue() === 'Pantoprazl'
    && await fokusId(page) === 'rueckfrageName',
  '„Namen ändern": zurück zur Wahl, der Text steht noch im Feld, der Fokus darin');
  await page.locator('#rueckfrageName').fill('Pantoprazol');
  await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
  s = await speicher(page);
  check(s.standardMittel.some((m) => m.mittel === 'Pantoprazol') && await zahl(page, KARTE) === 0
    && (await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol'),
  'korrigiert: ohne Nachfrage angelegt, W1 erscheint');
  await meldung(page);
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] });
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
  check(await meldung(page) === 'Wie heißt das Mittel?' && (await speicher(page)).standardMittel.length === 1,
    'ein leeres Feld legt nichts an');
  await page.locator('#rueckfrageName').fill('Medikinet');
  await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
  check(await meldung(page) === 'Das ist ein Methylphenidat-Mittel – gefragt ist eins gegen Magensäure.'
    && (await speicher(page)).standardMittel.length === 1,
  'ein Methylphenidat im Feld wird nicht als Säureblocker angelegt');
  await page.locator('#rueckfrageName').fill('Magentropfen');
  await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
  check(await frage(page) === F_PRUEFEN, 'ein unbekannter Name: erst die Nachfrage');
  check(await page.locator(`${KARTE} [data-act="rueckfrage-trotzdem"]`).getAttribute('aria-label') === '„Magentropfen“ trotzdem unter „Meine Mittel“ anlegen',
    '„Trotzdem so anlegen" nennt den Namen');
  await tipp(page, `${KARTE} [data-act="rueckfrage-trotzdem"]`);
  const s = await speicher(page);
  check(s.standardMittel.some((m) => m.mittel === 'Magentropfen' && m.dosis === '')
    && s.mphRueckfrage['medikinet adult'].saeure === 'ja',
  '„Trotzdem so anlegen": angelegt, und die Frage gilt als beantwortet');
  check((await meldung(page)).includes('Den Namen kennt Body Check nicht') && await zahl(page, '.wechsel-karte') === 0
    && await zahl(page, KARTE) === 0,
  'die Meldung sagt, dass der Name unbekannt ist; kein Hinweis, keine Rückfrage mehr');
  await ctx.close();
}

/* ---------- 4. Nur eine Einnahme: die Form an der Einnahme, „Meine Mittel" angeboten ---------- */

const STAND4 = {
  eintraege: [
    nimmt('m0', 'Methylphenidat', tag(-3)),
    nimmt('m1', 'Methylphenidat', tag(-1)),
    NOTIZ,
  ],
  standardMittel: [meins('p1', 'Pantoprazol', { dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' })],
};
{
  const { ctx, page } = await iphone(STAND4);
  check((await text(page, '.wechsel-karte')).includes('Methylphenidat (Methylphenidat) und Pantoprazol'),
    'Methylphenidat nur als Einnahme, Pantoprazol unter „Meine Mittel": W1u steht');
  check(await zahl(page, KARTE) === 1 && await davor(page, '.wechsel-karte', KARTE), 'darunter die Rückfrage');
  const t = await kartenText(page);
  check(t.includes('Davon hängt ab, welcher Hinweis zu deinen Mitteln gilt.') && t.includes('„Weiß ich nicht“'),
    'mit Säureblocker: welcher Hinweis gilt – und nicht sicher? „Weiß ich nicht"');
  const vorher = await speicher(page);
  await tipp(page, form('pellet'));
  const s = await speicher(page);
  const e = (id) => s.eintraege.find((x) => x.id === id);
  check(e('m1').form === 'pellet' && !('form' in e('m0')), 'die Form steht an der jüngsten Einnahme – nur dort');
  check(gleich(s.standardMittel, vorher.standardMittel), '„Meine Mittel" bleibt unverändert');
  const m = await meldung(page);
  check(m.startsWith('Form: Kapsel mit zweierlei Kügelchen. Bei deiner Einnahme von gestern vermerkt.') && m.includes(HINWEIS_OBEN),
    `die Meldung sagt, wo die Form steht, und dass ein Hinweis kam (${m})`);
  const w = await text(page, '.wechsel-karte');
  check(w.includes('Kapsel mit zweierlei Kügelchen und Pantoprazol') && !w.includes('(Methylphenidat)'),
    'W1 steht, W1u nicht mehr');
  check(await frage(page) === F_MERKEN && await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`) === 1
    && (await text(page, `${KARTE} [data-act="rueckfrage-nicht-merken"]`)) === 'Nicht merken',
  'die Karte bietet an, das Mittel unter „Meine Mittel" zu merken');
  check(await page.locator(`${KARTE} [data-act="rueckfrage-nicht-merken"]`).getAttribute('aria-label')
    === 'Nicht unter „Meine Mittel“ anlegen – die Form bleibt bei der Einnahme',
  '„Nicht merken" sagt, was bleibt – und verspricht nicht „nur diese Einnahme"');
  const merkenText = await kartenText(page);
  // formZu liest die jüngste bekannte Form der letzten 30 Tage – auch für
  // spätere Einnahmen ohne Formangabe. Der Text sagt das, statt „nur diese".
  check(merkenText.includes('Die Form steht jetzt bei deiner Einnahme von gestern. Sie gilt ab dieser Einnahme 30 Tage lang, '
    + 'auch für weitere Einnahmen ohne Formangabe. Dauerhaft gilt sie, wenn Methylphenidat unter „Meine Mittel“ steht.')
    && !/gilt sie nur|nur für diese/.test(merkenText),
  `MERKEN sagt, wo die Form steht und wie lange sie für weitere Einnahmen gilt (${merkenText.slice(0, 160)}…)`);
  check(await breitOk(page), 'MERKEN passt in 320 Pixel');

  // a) Nicht merken – die Form gilt 30 Tage, auch für Einnahmen ohne Form, und verfällt dann.
  await tipp(page, `${KARTE} [data-act="rueckfrage-nicht-merken"]`);
  check(await zahl(page, KARTE) === 0 && await meldung(page) === 'Gut. Die Form gilt ab dieser Einnahme 30 Tage lang, '
    + 'auch für weitere ohne Formangabe. Eine andere kannst du beim Eintragen im Bogen angeben.',
  `„Nicht merken": Karte zu, die Meldung sagt, wie lange die Form gilt (${await meldung(page)})`);
  await page.evaluate(async ([k, neu]) => {
    const st = await import('/js/store.js');
    st.sofortSchreiben();
    const z = JSON.parse(localStorage.getItem(k));
    z.eintraege.push(...neu);
    localStorage.setItem(k, JSON.stringify(z));
  }, [KEY, Array.from({ length: 31 }, (_, i) => nimmt(`t${i + 1}`, 'Methylphenidat', tag(i + 1)))]);
  await tagWechsel(page, tag(28));
  check((await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol')
    && await zahl(page, KARTE) === 0,
  '28 Tage später, tägliche Einnahmen ohne Form: die Form gilt noch – W1, wie der Text sagt');
  await tagWechsel(page, tag(31));
  check((await text(page, '.wechsel-karte')).includes('Methylphenidat (Methylphenidat) und Pantoprazol'),
    '31 Tage später, tägliche Einnahmen ohne Form: wieder W1u');
  check(await zahl(page, KARTE) === 1 && await zahl(page, SPAETER) === 0 && await frage(page) === F_FORM,
    'und die Rückfrage ein zweites Mal – ohne „Später"');
  check(gleich((await gezeigt(page)).tage.methylphenidat, [HEUTE, tag(31)]), 'zwei Tage gestempelt');
  await tagWechsel(page, tag(39));
  check(await zahl(page, KARTE) === 0, 'danach nie wieder');
  await ctx.close();
}
{
  // b) Ja, merken – dann gilt die Form dauerhaft.
  const { ctx, page } = await iphone(STAND4);
  await tipp(page, form('pellet'));
  check(await page.locator(`${KARTE} [data-act="rueckfrage-merken"]`).getAttribute('aria-label') === 'Methylphenidat mit dieser Form unter „Meine Mittel“ anlegen',
    '„Ja, merken" sagt, was es anlegt');
  await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  const s = await speicher(page);
  const neu = s.standardMittel.find((x) => x.mittel === 'Methylphenidat');
  check(neu && neu.dosis === '10 mg' && neu.form === 'pellet' && neu.tageszeit === null && s.standardMittel.length === 2,
    `„Ja, merken": unter „Meine Mittel" mit Dosis der Einnahme und Form (${JSON.stringify(neu)})`);
  check(await meldung(page) === 'Methylphenidat steht jetzt bei deinen Mitteln, mit der Form „Kapsel mit zweierlei Kügelchen“.',
    'mit Meldung');
  check(await zahl(page, KARTE) === 0, 'danach ist nichts mehr offen');
  await tagWechsel(page, tag(31));
  check((await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol') && await zahl(page, KARTE) === 0,
    '31 Tage später steht W1 weiter, ohne Rückfrage');
  await ctx.close();
}

/* ---------- 5. „Weiß ich nicht" ---------- */

{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet', { dosis: '10 mg' })] });
  const vorher = await speicher(page);
  await tipp(page, form('unbekannt'));
  const s = await speicher(page);
  check(gleich(s.standardMittel, vorher.standardMittel) && gleich(s.eintraege, vorher.eintraege),
    '„Weiß ich nicht" ändert keine Mitteldaten');
  check(s.mphRueckfrage.medikinet && s.mphRueckfrage.medikinet.form === 'weissnicht', 'nur die Rückfrage merkt es sich');
  check(await frage(page) === F_SAEURE, 'weiter mit der Säurefrage');
  check(await meldung(page) === 'Gemerkt. Die Form steht auf der Packung – angeben kannst du sie jederzeit bei deinem Mittel unter „Meine Mittel“.',
    'die Meldung nennt „Meine Mittel", wo das Mittel steht');
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ], standardMittel: [] });
  const vorher = await speicher(page);
  await tipp(page, form('unbekannt'));
  const m = await meldung(page);
  check(m.includes('im Bogen') && !m.includes('Meine Mittel') && gleich((await speicher(page)).eintraege, vorher.eintraege),
    `nur als Einnahme: die Meldung verweist auf den Bogen (${m})`);
  await ctx.close();
}

/* ---------- 6. Höchstens zwei Tage, ein Name ---------- */

{
  const STAND6 = { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] };
  const { ctx, page } = await iphone(STAND6);
  check(await zahl(page, KARTE) === 1 && await zahl(page, SPAETER) === 1, 'Tag 1: die Karte, mit „Später"');
  check(gleich((await gezeigt(page)).tage, { medikinet: [HEUTE] }), 'Tag 1 gestempelt');
  await tipp(page, SPAETER);
  check(await zahl(page, KARTE) === 0 && (await gezeigt(page)).zu === HEUTE, '„Später": weg, für heute vermerkt');
  check(await meldung(page) === 'Gut. Frühestens in einer Woche fragt Body Check noch ein letztes Mal.', 'mit Meldung');
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, KARTE) === 0, 'auch nach dem Neuladen am selben Tag');
  let zwischendurch = 0;
  for (let d = 1; d <= 6; d++) {
    await tagWechsel(page, tag(d));
    zwischendurch += await zahl(page, KARTE);
  }
  check(zwischendurch === 0, 'Tag 2 bis 7: keine Rückfrage');
  await tagWechsel(page, tag(7));
  check(await zahl(page, KARTE) === 1 && await zahl(page, SPAETER) === 0, 'Tag 8: noch einmal, ohne „Später"');
  check(gleich((await gezeigt(page)).tage.medikinet, [HEUTE, tag(7)]), 'zwei Tage gestempelt');
  await tagWechsel(page, tag(8));
  check(await zahl(page, KARTE) === 0, 'Tag 9: keine');
  await tagWechsel(page, tag(39));
  check(await zahl(page, KARTE) === 0, 'Tag 40: keine');
  await ctx.close();

  // Ohne zu tippen: übergangen zählt wie „Später".
  const zwei = await iphone(STAND6);
  const ergebnis = [await zahl(zwei.page, KARTE)];
  for (const d of [1, 7, 8]) {
    await tagWechsel(zwei.page, tag(d));
    ergebnis.push(await zahl(zwei.page, KARTE));
  }
  check(gleich(ergebnis, [1, 0, 1, 0]), `übergangen: Tag 1 ja, Tag 2 nein, Tag 8 ja, Tag 9 nein (${ergebnis.join(', ')})`);
  await zwei.ctx.close();
}

/* ---------- 7. Höchstens zwei Tage, zwei Namen ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ],
    standardMittel: [meins('s1', 'Medikinet')],
  });
  let spaeter = await zahl(page, SPAETER);
  check(await zahl(page, KARTE) === 1 && await kopf(page) === 'Rückfrage zu Medikinet', 'zwei Namen, eine Karte: zuerst „Meine Mittel"');
  check(gleich((await gezeigt(page)).tage, { medikinet: [HEUTE], methylphenidat: [HEUTE] }),
    `gestempelt werden beide offenen Namen (${JSON.stringify((await gezeigt(page)).tage)})`);
  const reihe = [await zahl(page, KARTE)];
  for (const d of [1, 7, 8]) {
    await tagWechsel(page, tag(d));
    reihe.push(await zahl(page, KARTE));
    spaeter += await zahl(page, SPAETER);
  }
  check(gleich(reihe, [1, 0, 1, 0]), `Tag 1, 2, 8, 9: ${reihe.join(', ')}`);
  check(spaeter === 1, `„Später" gab es über alle Tage genau einmal (${spaeter})`);
  await ctx.close();
}

/* ---------- 8. Nicht mehr fragen ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ],
    standardMittel: [meins('s1', 'Medikinet', { dosis: '10 mg' })],
  });
  await tipp(page, NIE);
  let s = await speicher(page);
  check(s.mphRueckfrage.medikinet && s.mphRueckfrage.medikinet.nie === true && !('methylphenidat' in s.mphRueckfrage),
    '„Nicht mehr fragen" gilt nur für diesen Namen');
  check(await meldung(page) === 'Gut. Zu Medikinet fragt Body Check nicht mehr. Rückgängig' && await zahl(page, KARTE) === 0,
    `die Meldung bietet „Rückgängig" an (${await meldung(page)})`);
  await tipp(page, '#toast [data-act="rueckfrage-nie-zurueck"]');
  s = await speicher(page);
  check(!(s.mphRueckfrage.medikinet || {}).nie && await kopf(page) === 'Rückfrage zu Medikinet',
    '„Rückgängig": die Karte steht wieder');
  check(await meldung(page) === 'Gut. Die Frage steht wieder auf „Tag“.', 'mit Meldung');
  await tipp(page, NIE);
  check(await zahl(page, KARTE) === 0, 'noch einmal: weg – auch zum zweiten Namen nicht am selben Tag');
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, KARTE) === 0, 'auch nach dem Neuladen');
  await tagWechsel(page, tag(1));
  check(await zahl(page, KARTE) === 0, 'und am nächsten Tag');
  await tagWechsel(page, tag(60));
  check(await zahl(page, KARTE) === 0, 'und nach 60 Tagen');
  await tab(page, 'mehr');
  await tipp(page, '[data-act="meinmittel-aendern"][data-id="s1"]');
  await page.locator('#mmName').fill('Medikinet 10');
  await tipp(page, '[data-act="mm-speichern"]');
  await tab(page, 'heute');
  check(await zahl(page, KARTE) === 1 && await kopf(page) === 'Rückfrage zu Medikinet 10',
    `ein neuer Name ist ein neues Mittel (${await kopf(page)})`);
  await ctx.close();
}
{
  // Mit der Tastatur (oder Schaltersteuerung): „Rückgängig" ist der einzige
  // Weg zurück und steht nur acht Sekunden. Der Fokus geht dorthin, nicht an
  // den Anfang der Seite – und nach „Rückgängig" auf die Frage.
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { viewport: IPHONE });
  await page.locator(NIE).focus();
  await page.keyboard.press('Enter');
  await kurz(page);
  const wo = await page.evaluate(() => {
    const a = document.activeElement;
    return a ? (a.dataset.act || a.tagName) : '';
  });
  check(await zahl(page, KARTE) === 0 && wo === 'rueckfrage-nie-zurueck',
    `„Nicht mehr fragen" per Tastatur: der Fokus steht auf „Rückgängig" in der Meldung (${wo})`);
  await page.keyboard.press('Enter');
  await kurz(page);
  check(await zahl(page, KARTE) === 1 && await fokusId(page) === 'rueckfrageFrage'
    && !((await speicher(page)).mphRueckfrage.medikinet || {}).nie,
  '„Rückgängig" per Tastatur: die Karte steht wieder, der Fokus auf ihrer Frage');
  await ctx.close();
}

/* ---------- 9. Zwei Methylphenidat-Namen, beantwortet ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ],
    standardMittel: [meins('s1', 'Medikinet')],
  });
  check(await zahl(page, KARTE) === 1, 'genau eine Rückfrage-Karte zugleich');
  await tipp(page, form('pellet'));
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  const s = await speicher(page);
  check(s.mphRueckfrage.medikinet.saeure === 'nein' && s.mphRueckfrage.methylphenidat.saeure === 'nein',
    '„Nein" gilt für beide Namen – gefragt ist nach dem Menschen, nicht nach dem Mittel');
  await meldung(page);
  check(await zahl(page, KARTE) === 1 && await kopf(page) === 'Rückfrage zu Methylphenidat' && await frage(page) === F_FORM,
    'danach im selben Zug die Formfrage zum zweiten Namen');
  await ctx.close();
}

/* ---------- 10. Eine Form ohne Hinweis, eine mit Hinweis der Stufe B ---------- */

const STAND10 = {
  eintraege: [NOTIZ],
  standardMittel: [meins('s1', 'Methylphenidat', { dosis: '10 mg' }), meins('s2', 'Maaloxan')],
};
{
  const { ctx, page } = await iphone(STAND10);
  check(await davor(page, '.wechsel-karte', KARTE), 'W1u steht vor der Rückfrage');
  await tipp(page, form('oros'));
  const m = await meldung(page);
  check(await zahl(page, '.wechsel-karte') === 0 && await zahl(page, KARTE) === 0, 'Hülle gewählt: W1u und Rückfrage sind weg');
  check(m.includes('kennt Body Check keinen Hinweis') && m.includes('Das heißt nicht, dass beides zusammenpasst')
    && !/passt (gut|zusammen)\b|unbedenklich/.test(m),
  `die Meldung sagt das – ohne zu beruhigen (${m})`);
  await ctx.close();
}
{
  const { ctx, page } = await iphone(STAND10);
  await tipp(page, form('sodas'));
  const m = await meldung(page);
  check(m.includes('Ein Hinweis dazu steht unter „Mehr“ › „Meine Mittel“.') && await zahl(page, '.wechsel-karte') === 0,
    `Ritalin LA / Adult: Stufe B, die Meldung sagt, wo der Hinweis steht (${m})`);
  await ctx.close();
}
{
  const { ctx, page } = await iphone(STAND10);
  await tipp(page, form('pellet'));
  check((await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Maaloxan') && await zahl(page, KARTE) === 0,
    'Kapsel mit zweierlei Kügelchen: W1 erscheint');
  await meldung(page);
  await ctx.close();
}

/* ---------- 11. Wo nichts kommt ---------- */

for (const [wer, sm] of [
  ['Concerta', [meins('s1', 'Concerta')]],
  ['Elvanse', [meins('s1', 'Elvanse')]],
  ['ein Säureblocker allein', [meins('s1', 'Pantoprazol')]],
]) {
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: sm });
  check(await zahl(page, KARTE) === 0 && gleich((await gezeigt(page)).tage, {}), `${wer}: keine Rückfrage`);
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ tab: 'muster', eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] });
  check(await zahl(page, KARTE) === 0 && gleich((await gezeigt(page)).tage, {}), 'auf „Muster": keine Karte, kein Stempel');
  await tab(page, 'mehr');
  check(await zahl(page, KARTE) === 0 && gleich((await gezeigt(page)).tage, {}), 'auf „Mehr" ebenso');
  await tab(page, 'heute');
  check(await zahl(page, KARTE) === 1, 'auf „Tag" heute: die Karte');
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  check(await zahl(page, KARTE) === 0 && gleich((await gezeigt(page)).tage, { medikinet: [HEUTE] }),
    'gestern: keine Karte, und kein Stempel für den vergangenen Tag');
  await ctx.close();
}

/* ---------- 12. Die Grenze: nie mehr als die bestehenden Karten verdrängen ---------- */

{
  // a) Drei offene Hinweise der Stufe A.
  const { ctx, page } = await iphone({
    eintraege: [NOTIZ],
    standardMittel: [meins('s1', 'Medikinet adult'), meins('s2', 'Medikinet retard'), meins('s3', 'Methylphenidat'), meins('s4', 'Nexium')],
  });
  check(await zahl(page, '.wechsel-karte') === 3 && await zahl(page, KARTE) === 0 && gleich((await gezeigt(page)).tage, {}),
    'drei W1/W1u offen: keine Rückfrage, kein Stempel');
  await ctx.close();
}
{
  // b) W1u und das Angebot, wie im ADHS-Block von test-schweigen.
  const { ctx, page } = await iphone({
    adhsAn: null,
    eintraege: [nimmt('r1', 'Rennie', tag(-5), { dosis: '' }), nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ],
    standardMittel: [meins('q1', 'Methylphenidat', { dosis: '10 mg' })],
  });
  check(await zahl(page, '.wechsel-karte') === 1 && await zahl(page, '.angebot') === 1 && await zahl(page, KARTE) === 0
    && gleich((await gezeigt(page)).tage, {}),
  'W1u und das Angebot wie in der Fassung 28: die Rückfrage wartet, ungestempelt');
  await tipp(page, '[data-act="adhs-angebot-ja"]');
  check(await zahl(page, KARTE) === 1 && await zahl(page, '.angebot') === 0, 'nach der Entscheidung erscheint sie im selben Zug');
  await ctx.close();
}
{
  // c) Rückfrage und Angebot, die Karte „Neu" wartet.
  const { ctx, page } = await iphone({
    adhsAn: null, v29Gesagt: undefined, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')],
  });
  check(await zahl(page, KARTE) === 1 && await zahl(page, '.angebot') === 1 && await zahl(page, '.neu-karte') === 0
    && (await gezeigt(page)).am === null,
  'Rückfrage und Angebot: keine Karte „Neu", und sie gilt nicht als gezeigt');
  check(await davor(page, KARTE, '.angebot'), 'die Rückfrage steht über dem Angebot');
  await ctx.close();
}
{
  // d) Neu wartet, solange W1 offen ist.
  const { ctx, page } = await iphone({
    v29Gesagt: undefined, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult'), meins('s2', 'Pantoprazol')],
  });
  check(await zahl(page, '.wechsel-karte') === 1 && await zahl(page, '.neu-karte') === 0 && (await gezeigt(page)).am === null,
    'W1 offen: keine Karte „Neu" daneben');
  await tipp(page, '[data-act="wechsel-gelesen"]');
  check(await zahl(page, '.neu-karte') === 1 && (await gezeigt(page)).am === HEUTE,
    'nach „Gelesen" erscheint sie im selben Zug und gilt als gezeigt');
  await ctx.close();
}
{
  // e) Zwei W1 und ein Angebot – wie in der Fassung 28.
  const { ctx, page } = await iphone({
    adhsAn: null, eintraege: [NOTIZ],
    standardMittel: [meins('s1', 'Medikinet adult'), meins('s2', 'Medikinet retard'), meins('s3', 'Pantoprazol')],
  });
  check(await zahl(page, '.wechsel-karte') === 2 && await zahl(page, '.angebot') === 1 && await zahl(page, KARTE) === 0,
    'zwei W1 und das Angebot: alles wie bisher');
  await ctx.close();
}

/* ---------- 13. Die Karte „Neu" ---------- */

const NEU_TEXTE = [
  // Ohne Wertung: Die Stufen der Paare sagen, was die Fachinformation dazu
  // schreibt – nicht, welche „wichtig" sind.
  'Zu einigen wenigen Paaren von Mitteln zeigt Body Check jetzt einen Hinweis, vor allem zu Methylphenidat zusammen mit einem Mittel gegen Magensäure. Alle stehen unter „Mehr“ › „Meine Mittel“, einige auch hier oben.',
  'Steht kein Hinweis da, heißt das nicht, dass deine Mittel zusammenpassen. Body Check prüft nicht alle Mittel – das kann die Apotheke.',
  'Es klappt nur mit Mitteln, die hier stehen: unter „Meine Mittel“ oder in den letzten 30 Tagen notiert. Was du regelmäßig nimmst, kannst du unter „Meine Mittel“ anlegen. Eine Einnahme wird dabei nicht notiert. Alles bleibt auf diesem Gerät.',
];
const STAND13 = {
  v29Gesagt: undefined,
  eintraege: [NOTIZ, { id: 'e1', art: 'essen', am: tag(-1), um: '12:00', was: 'Reis', zutaten: [], portion: 'normal' }],
  standardMittel: [meins('s1', 'Pantoprazol', { dosis: '20 mg' })],
};
{
  const { ctx, page } = await iphone(STAND13);
  const k = page.locator('.neu-karte');
  check(await k.count() === 1, 'ein Tagebuch mit Einträgen aus der Zeit davor: die Karte „Neu"');
  check(await text(page, '.neu-karte h3') === 'Neu: Hinweise zu zwei Mitteln zusammen', 'mit Überschrift');
  const absaetze = (await page.locator('.neu-karte p').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  check(gleich(absaetze, NEU_TEXTE), `im Wortlaut (${absaetze.join(' | ').slice(0, 120)}…)`);
  const klasse = await k.getAttribute('class');
  check(/\bhinweis\b/.test(klasse) && !/karte-merk/.test(klasse), `als Hinweis, nicht wie eine Sicherheitskarte (${klasse})`);
  check(await k.getAttribute('role') === 'region' && await k.getAttribute('aria-labelledby') === 'neuTitel', 'eine benannte Region');
  const ganz = await kartenText(page, '.neu-karte');
  check(ganz.includes('Body Check prüft nicht alle Mittel') && ganz.includes('Apotheke')
    && !/nicht zusammen vor|alle Gegenanzeigen|unter den Gegenanzeigen/.test(ganz),
  'sie nennt die Grenze und verspricht keine Vollständigkeit');
  check(!/wichtig/i.test(ganz), 'sie teilt die Hinweise nicht in wichtige und andere');
  const namen = [...ADHS_NAMEN, ...MITTEL_WISSEN, ...REIZSTOFFE].flatMap((g) => g.beispiele)
    .filter((n) => new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(ganz));
  check(gleich([...new Set(namen)], ['Methylphenidat']), `als Mittelname nur der allgemeine „Methylphenidat" (${namen.join(', ')})`);
  check(await page.locator('[data-act="v29-gelesen"]').getAttribute('aria-label') === 'Neuigkeit gelesen'
    && (await text(page, '[data-act="v29-meine-mittel"]')) === 'Zu „Meine Mittel“',
  'Knöpfe: „Zu „Meine Mittel““ und „Gelesen" mit Ansage');
  check((await gezeigt(page)).am === HEUTE, 'gestempelt');
  check(await breitOk(page), 'die Karte „Neu" passt in 320 Pixel');
  await tipp(page, '[data-act="v29-gelesen"]');
  check((await speicher(page)).v29Gesagt === true && await zahl(page, '.neu-karte') === 0, '„Gelesen": weg');
  await page.reload({ waitUntil: 'networkidle' });
  check(await zahl(page, '.neu-karte') === 0, 'auch nach dem Neuladen');
  await ctx.close();
}
{
  const { ctx, page } = await iphone(STAND13);
  await tagWechsel(page, tag(1));
  // Der Stand trägt den Schlüssel nicht (Fassung 28) – „nicht vermerkt" heißt: nicht true.
  check(await zahl(page, '.neu-karte') === 0 && (await speicher(page)).v29Gesagt !== true,
    'übergangen: am nächsten Tag nicht mehr – ohne dass „Gelesen" vermerkt wird');
  await ctx.close();
}
{
  const { ctx, page } = await iphone(STAND13);
  await tipp(page, '[data-act="v29-meine-mittel"]');
  await page.waitForTimeout(150);
  const s = await speicher(page);
  check(s.tab === 'mehr' && await page.locator('#meineMittel').isVisible() && await zahl(page, '#mmName') === 1
    && await fokusId(page) === 'mmName' && s.v29Gesagt === true,
  '„Zu „Meine Mittel““: Reiter „Mehr", das Formular offen, der Fokus im Namensfeld, als gelesen vermerkt');
  await ctx.close();
}
{
  // Ein frisch installiertes Tagebuch: nie.
  const { ctx, page } = await iphone(null);
  await tipp(page, '[data-act="los"]');
  await tipp(page, '[data-act="neu"][data-art="notiz"]');
  await page.locator('#bogenText').fill('erster Eintrag');
  await tipp(page, '[data-act="bogen-speichern"]');
  const s = await speicher(page);
  check(s.eintraege.length === 1 && s.v29Gesagt === true && await zahl(page, '.neu-karte') === 0,
    'frisch installiert, erster Eintrag: keine Karte „Neu"');
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ ...STAND13, eintraege: [], v29Gesagt: false });
  check(await zahl(page, '.neu-karte') === 0, 'ein älterer Stand ohne Einträge: keine');
  await ctx.close();
}
{
  const { ctx, page } = await iphone(STAND13);
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  check(await zahl(page, '.neu-karte') === 0, 'auf einem vergangenen Tag: keine');
  await ctx.close();
}

/* ---------- 14. Gezeigt heißt gesehen ---------- */

{
  const { ctx, page } = await iphone({
    v29Gesagt: undefined, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')],
  }, { verborgen: true });
  const roh = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  check(await zahl(page, KARTE) === 1 && gleich((await gezeigt(page)).tage, {}),
    'unsichtbar geladen (etwa nach einem Update): gezeichnet, aber nicht gestempelt');
  check(!('v29Am' in roh) && gleich(roh.mphRueckfrage || {}, {}) && gleich(roh.tage, {}) && roh.v29Gesagt !== true,
    'und der Tagebuchstand trägt nichts davon');
  await page.evaluate(() => { window.__sicht = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  await kurz(page);
  check(gleich((await gezeigt(page)).tage, { medikinet: [HEUTE] }), 'beim Sichtbarwerden wird nachgestempelt');
  await ctx.close();
}
{
  const { ctx, page } = await iphone(STAND13, { verborgen: true });
  check(await zahl(page, '.neu-karte') === 1 && (await gezeigt(page)).am === null, 'die Karte „Neu" unsichtbar: nicht gezeigt');
  await page.evaluate(() => { window.__sicht = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  await kurz(page);
  check((await gezeigt(page)).am === HEUTE, 'sichtbar: gezeigt');
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { suche: '?neu=essen' });
  check(await zahl(page, '.bogen') === 1 && gleich((await gezeigt(page)).tage, {}), 'mit offenem Bogen: kein Stempel');
  await tipp(page, 'button.bogen-zu');
  check(gleich((await gezeigt(page)).tage, { medikinet: [HEUTE] }), 'nach dem Schließen: gestempelt');
  await ctx.close();
}

/* ---------- 15. Über Mitternacht ---------- */

{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { zeit: um('23:58') });
  check(await frage(page) === F_FORM, '23:58: die Formfrage steht');
  await page.clock.setFixedTime(um('00:01', tag(1)));
  await tipp(page, form('pellet'));
  check((await speicher(page)).standardMittel[0].form === 'pellet'
    && (await meldung(page)).startsWith('Form: Kapsel mit zweierlei Kügelchen.'),
  '00:01 getippt: die Antwort gilt trotzdem');
  await ctx.close();
}

/*
 * Über Nacht offen, wie eine App vom Home-Bildschirm: Ein Zwischenschritt
 * (MERKEN, WELCHES) gilt nur an dem Tag, an dem er begann. Sonst stünde er
 * an jedem neuen Tag wieder oben, bis man reagiert – eine Erinnerung.
 */
const sicht = async (page, wert) => {
  await page.evaluate((x) => { window.__sicht = x; document.dispatchEvent(new Event('visibilitychange')); }, wert);
  await kurz(page);
};
const ueberNacht = async (page, iso) => {
  await sicht(page, 'hidden');
  await page.clock.setFixedTime(um('08:10', iso));
  await sicht(page, 'visible');
};
for (const [was, z, schritt, fragt] of [
  ['MERKEN', { eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ], standardMittel: [] }, form('pellet'), F_MERKEN],
  ['WELCHES', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] },
    `${KARTE} [data-act="rueckfrage-saeure-ja"]`, F_WELCHES],
]) {
  const { ctx, page } = await iphone(z, { verborgen: true });
  await sicht(page, 'visible');
  await tipp(page, schritt);
  check(await frage(page) === fragt, `${was}: der Schritt steht (${await frage(page)})`);
  const tage0 = (await gezeigt(page)).tage;
  const reihe = [];
  for (const d of [1, 2, 3, 5]) {
    await ueberNacht(page, tag(d));
    reihe.push(await zahl(page, KARTE));
  }
  check(gleich(reihe, [0, 0, 0, 0]) && gleich((await gezeigt(page)).tage, tage0),
    `${was}, die App bleibt über Nacht offen: am Tag +1, +2, +3, +5 keine Karte (${reihe.join(', ')})`);
  await ueberNacht(page, tag(7));
  check(await zahl(page, KARTE) === 1 && await zahl(page, SPAETER) === 0,
    `${was}: nach einer Woche ihr zweiter und letzter Tag, ohne „Später"`);
  await ctx.close();
}

/* ---------- 16. „Meine Mittel" voll ---------- */

const ANDERE = ['Vitamin D', 'Magnesium', 'Eisen', 'Zink', 'Folsäure', 'Vitamin B12', 'L-Thyroxin', 'Ramipril',
  'Cetirizin', 'Melatonin', 'Omega 3'];
const VOLL = { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult'), ...ANDERE.map((n, i) => meins(`a${i}`, n))] };
{
  const { ctx, page } = await iphone(VOLL);
  check(await frage(page) === F_SAEURE, 'zwölf eigene Mittel, Medikinet adult darunter: die Säurefrage');
  check(await page.locator(`${KARTE} [data-act="rueckfrage-saeure-ja"]`).getAttribute('aria-label') === 'Ja, ich nehme ein Mittel gegen Magensäure',
    '„Ja" verspricht bei vollem „Meine Mittel" weder Wahl noch Anlegen');
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  check((await text(page, KARTE)).includes('Bei deinen Mitteln stehen schon 12 – mehr passen nicht.')
    && await zahl(page, `${KARTE} [data-act="rueckfrage-meine-mittel"]`) === 1
    && await zahl(page, `${KARTE} .rueckfrage-wahl`) === 0 && await zahl(page, '#rueckfrageName') === 0,
  '„Ja" bei vollem „Meine Mittel": der Satz und der Weg dorthin statt der Wahl');
  await kartenText(page);
  check(gleich((await gezeigt(page)).tage['medikinet adult'], [HEUTE]), 'der Tag zählt wie jeder andere');
  await tipp(page, `${KARTE} [data-act="rueckfrage-meine-mittel"]`);
  await kurz(page);
  check((await speicher(page)).tab === 'mehr' && await zahl(page, '#meineMittel') === 1, 'der Knopf führt zu „Meine Mittel"');
  check(await zahl(page, '#meineMittel .mittel-formular') === 0 && await zahl(page, '#mmName') === 0,
    'dort steht kein Formular für ein neues Mittel, das sich nicht speichern ließe');
  check((await text(page, '#meineMittel')).includes('Mehr als 12 passen nicht.'), 'sondern der Satz zum vollen Stand');
  check(await page.evaluate(() => document.activeElement === document.querySelector('#meineMittel h3')),
    'der Fokus steht auf der Überschrift „Meine Mittel", nicht in einem Feld außerhalb des Bildes');
  // Eins entfernen (zwei Tipps), zurück auf „Tag": jetzt die Wahl, am selben Tag.
  await tipp(page, '[data-act="meinmittel-weg"][data-id="a10"]');
  await tipp(page, '[data-act="meinmittel-weg"][data-id="a10"]');
  await tab(page, 'heute');
  check(await frage(page) === F_WELCHES && await zahl(page, `${KARTE} .rueckfrage-wahl`) > 0,
    'eins entfernt, zurück auf „Tag": die Wahl steht da');
  await tipp(page, `${KARTE} .rueckfrage-wahl[data-name="Pantoprazol"]`);
  check((await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol') && await zahl(page, KARTE) === 0,
    'Pantoprazol gewählt: angelegt, W1 erscheint');
  await meldung(page);
  await ctx.close();
}
{
  // Jeden Tag „Ja" bei vollem „Meine Mittel": trotzdem höchstens zwei Tage, „Später" einmal.
  const { ctx, page } = await iphone(VOLL);
  const reihe = [];
  let spaeter = 0;
  for (const d of [0, 1, 2, 7, 8, 30]) {
    if (d) await tagWechsel(page, tag(d));
    const n = await zahl(page, KARTE);
    reihe.push(n);
    spaeter += await zahl(page, SPAETER);
    if (n) await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  }
  check(gleich(reihe, [1, 0, 0, 1, 0, 0]), `Tag 0, 1, 2, 7, 8, 30: ${reihe.join(', ')}`);
  check(spaeter === 1, `„Später" gab es genau einmal (${spaeter})`);
  await ctx.close();
}

/* ---------- 16b. Doppeltipp: der zweite Tipp beantwortet nicht den nächsten Schritt ---------- */

const doppel = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(180);
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(RUHE);
};
for (const [vp, wie] of [[IPHONE, '390'], [{ width: 320, height: 640 }, '320']]) {
  {
    const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, { viewport: vp });
    await doppel(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
    const s = await speicher(page);
    check(await frage(page) === F_WELCHES && s.standardMittel.length === 1 && !((s.mphRueckfrage || {})['medikinet adult'] || {}).saeure
      && await zahl(page, '.wechsel-karte') === 0,
    `${wie}: Doppeltipp auf „Ja" – die Wahl steht, kein Mittel angelegt, kein Hinweis (${s.standardMittel.map((m) => m.mittel).join(', ')})`);
    await ctx.close();
  }
  {
    const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { viewport: vp });
    await doppel(page, form('sodas'));
    const s = await speicher(page);
    check(s.standardMittel[0].form === 'sodas' && !((s.mphRueckfrage || {}).medikinet || {}).saeure && await frage(page) === F_SAEURE,
      `${wie}: Doppeltipp auf eine Form – die Säurefrage steht, kein „Nein" gespeichert`);
    await ctx.close();
  }
  {
    const { ctx, page } = await iphone({
      eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')],
    }, { viewport: vp });
    await doppel(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
    const s = await speicher(page);
    check(!('form' in s.eintraege.find((e) => e.id === 'm1')) && await kopf(page) === 'Rückfrage zu Methylphenidat'
      && await frage(page) === F_FORM,
    `${wie}: Doppeltipp auf „Nein" – die Formfrage zum zweiten Namen steht, keine Form an der Einnahme`);
    await ctx.close();
  }
  {
    const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, { viewport: vp });
    await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
    await doppel(page, `${KARTE} .rueckfrage-wahl[data-name="Pantoprazol"]`);
    const s = await speicher(page);
    check(s.standardMittel.length === 2 && await zahl(page, '.wechsel-karte') === 1 && gleich(s.wechselGelesen || [], []),
      `${wie}: Doppeltipp auf einen Namen – angelegt, W1 steht und ist nicht weggetippt`);
    await meldung(page);
    await ctx.close();
  }
}

/* ---------- 17. Der Ton ---------- */

{
  const DOSIS = /\d+\s?(mg|ml|µg|Gramm|Tabletten)\b/;
  const RAT = /\b(nimm|nehmen Sie|empfehlen|empfohlen|du solltest|hilft gegen)\b/i;
  const NAMEN = /Pantoprazol 20 mg|Medikinet 10/g;
  const alle = [...kartenTexte, ...meldungen.map((m) => m.replace(NAMEN, ''))];
  check(kartenTexte.length >= 8 && meldungen.length >= 14, `geprüft: ${kartenTexte.length} Kartentexte, ${meldungen.length} Meldungen`);
  const schlecht = alle.filter((t) => DOSIS.test(t) || RAT.test(t) || /noch nicht/i.test(t) || /absetzen|weglassen/i.test(t));
  check(schlecht.length === 0, `keine Dosis, kein Rat, kein „noch nicht", nichts zum Absetzen${schlecht.length ? `: ${schlecht[0]}` : ''}`);
}

/* ---------- 18. Breite, Höhe, Bilder ---------- */

{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { viewport: KLEIN });
  const hoch = await page.locator(KARTE).evaluate((k) => k.getBoundingClientRect().height);
  check(hoch <= 460, `die Formfrage ist bei 320 Pixeln höchstens 460 hoch (${Math.round(hoch)})`);
  check(await breitOk(page), 'FORM passt in 320 Pixel');
  await stand(page, { eintraege: [NOTIZ], standardMittel: [meins('s1', `Medikinet ${'x'.repeat(70)}`)] });
  check(await zahl(page, KARTE) === 1 && await breitOk(page), 'ein Name mit 80 Zeichen ragt nicht über den Rand');
  await page.setViewportSize(IPHONE);
  await stand(page, { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] });
  const [unten, leiste] = await page.evaluate(() => [
    document.querySelector('.rueckfrage-karte [data-act="rueckfrage-nie"]').getBoundingClientRect().bottom,
    document.getElementById('tabbar').getBoundingClientRect().top,
  ]);
  check(unten <= leiste, `390×844: „Nicht mehr fragen" ohne Scrollen sichtbar (${Math.round(unten)} ≤ ${Math.round(leiste)})`);
  for (const [was, z, schritte] of [
    ['FORM', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, []],
    ['WELCHES', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, ['ja']],
    ['PRUEFEN', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, ['ja', 'pruefen']],
    ['MERKEN', STAND4, ['pellet']],
    ['Neu', STAND13, []],
    ['80 Zeichen', { eintraege: [NOTIZ], standardMittel: [meins('s1', `Medikinet ${'x'.repeat(70)}`)] }, []],
  ]) {
    await stand(page, z);
    for (const sch of schritte) {
      if (sch === 'ja') await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
      if (sch === 'pellet') await tipp(page, form('pellet'));
      if (sch === 'pruefen') {
        await page.locator('#rueckfrageName').fill('Pantoprazl');
        await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
      }
    }
    check(await breitOk(page), `${was} passt in 390 Pixel`);
  }
  await ctx.close();
}
{
  const bilder = [];
  for (const theme of ['rosa', 'salbei']) {
    for (const colorScheme of ['light', 'dark']) {
      const { ctx, page } = await iphone({ theme, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { colorScheme });
      const name = (was) => `${SHOT}/rueckfrage-${was}-${theme}-${colorScheme === 'dark' ? 'dunkel' : 'hell'}.png`;
      await page.screenshot({ path: name('form-320') });
      await stand(page, { theme, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] });
      await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
      await page.locator(KARTE).scrollIntoViewIfNeeded();
      await page.screenshot({ path: name('welches-320') });
      await page.locator('#rueckfrageName').fill('Pantoprazl');
      await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
      await page.screenshot({ path: name('pruefen-320') });
      await page.setViewportSize(IPHONE);
      await stand(page, { ...STAND13, theme });
      await page.screenshot({ path: name('neu-390') });
      bilder.push(theme + colorScheme);
      await ctx.close();
    }
  }
  check(bilder.length === 4, 'Bildschirmfotos je Akzent (rosa, salbei) und Farbschema (hell, dunkel) in .testlauf');
}

/* ---------- 19. Still ---------- */

check(fremd.length === 0, `keine einzige Anfrage nach draußen${fremd.length ? `: ${fremd.slice(0, 3).join(', ')}` : ''}`);
check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
