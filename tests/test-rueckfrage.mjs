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
 *   2a. Ein Doppeltipp beantwortet nicht gleich den nächsten Schritt –
 *       auch nicht, wenn die Karte nach einem Tipp darüber („Gelesen",
 *       „Später") unter den Finger rückt, und er nimmt „Nicht mehr fragen"
 *       nicht über „Rückgängig" in der Meldung gleich wieder zurück.
 *   2b. „Ja, merken" legt nur die Form ab, die jetzt an der Einnahme steht
 *       und noch gilt – nicht die einer älteren Einnahme, wenn eine neuere
 *       eine andere Form trägt –, und nie auf den Platz, den der
 *       Säureblocker gleich danach braucht, auch nicht bei einem zweiten
 *       Namen, dessen Säurefrage heute noch kommt.
 *   2c. Jede sichtbare Beschriftung steht auch im zugänglichen Namen.
 *   2d. Zwei Namen nacheinander: Die Formfrage nennt das Mittel, jede
 *       Meldung auch, und springt die Karte, sagt die Meldung „Jetzt zu …".
 *       „Nein" gilt für jeden Namen, der schon dasteht, und ein Name, der
 *       nur kein Mittel gegen Magensäure ist, heißt nie „unbekannt".
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
import { ADHS_NAMEN, MITTEL_WISSEN, REIZSTOFFE, wissenZu } from '../js/mittel.js';
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
/*
 * Die Formfrage nennt das Mittel in der Überschrift, auf die der Fokus geht:
 * Bei zwei Namen sähe die Frage zum zweiten sonst aus wie die eben
 * beantwortete (Abschnitt 16f).
 */
const fForm = (name) => `${name}: Welche Form steht auf der Packung?`;
const F_SAEURE = 'Nimmst du außerdem ein Mittel gegen Magensäure?';
const F_WELCHES = 'Welches Mittel gegen Magensäure?';
// Nur, was stimmt: Viele Namen kennt Body Check – nur nicht als Mittel gegen Magensäure.
const F_PRUEFEN = 'Nicht als Mittel gegen Magensäure erkannt';
const NEIN_MELDUNG = 'Gemerkt. Nach einem Mittel gegen Magensäure fragt Body Check erst bei einem neuen '
  + 'Methylphenidat-Namen wieder. Kommt eins dazu, trag es beim Eintragen oder unter „Meine Mittel“ ein.';
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
  check(await kopf(page) === 'Rückfrage zu Medikinet' && await frage(page) === fForm('Medikinet'),
    `sie nennt das Mittel – auch in der Frage – und fragt nach seiner Form (${await kopf(page)} | ${await frage(page)})`);
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
  check((await meldung(page)) === 'Form von Medikinet: Kapsel mit zweierlei Kügelchen. Steht jetzt bei deinem Mittel unter „Meine Mittel“.',
    `die Meldung nennt das Mittel und sagt, wo die Antwort steht – ohne „Jetzt zu", es bleibt beim selben (${await meldung(page)})`);
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
  check(await meldung(page) === NEIN_MELDUNG,
    `mit Meldung – sie sagt, wonach erst bei einem neuen Namen wieder gefragt wird (${await meldung(page)})`);
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

/*
 * 1b. „Nein" gilt für jeden Methylphenidat-Namen, der bis dahin dasteht –
 * nicht nur für die, bei denen gerade nach dem Säureblocker gefragt würde.
 * Die Meldung verspricht: erst bei einem neuen Namen wieder. Ein Name, der
 * beim „Nein" schon eingetragen war (mit der Hülle, also ohne offene
 * Säurefrage) und später eine andere Form bekommt, ist kein neuer – ebenso
 * einer, dessen letzte Einnahme länger als 30 Tage zurückliegt.
 */
for (const [was, gleichDanach] of [['am selben Tag', true], ['drei Tage später', false]]) {
  const { ctx, page } = await iphone({
    eintraege: [NOTIZ, nimmt('m1', 'Medikinet', HEUTE)],
    standardMittel: [meins('s1', 'Methylphenidat', { form: 'oros' })],
  });
  check(await kopf(page) === 'Rückfrage zu Medikinet' && await frage(page) === fForm('Medikinet'),
    `${was}: Methylphenidat mit Hülle unter „Meine Mittel", Medikinet nur als Einnahme – die Formfrage zu Medikinet`);
  await tipp(page, form('sofort'));
  if (await frage(page) === F_MERKEN) await tipp(page, `${KARTE} [data-act="rueckfrage-nicht-merken"]`);
  check(await frage(page) === F_SAEURE, `${was}: dann die Säurefrage`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  const r = (await speicher(page)).mphRueckfrage || {};
  check((r.medikinet || {}).saeure === 'nein' && (r.methylphenidat || {}).saeure === 'nein',
    `${was}: „Nein" gilt auch für Methylphenidat, das schon dastand (${JSON.stringify(r)})`);
  await meldung(page);
  if (!gleichDanach) await tagWechsel(page, tag(3));
  // Neue Packung: unter „Meine Mittel" eine andere Form.
  await tab(page, 'mehr');
  await tipp(page, '[data-act="mph-form"][data-mittel="s1"][data-id="retardtab"]');
  await tab(page, 'heute');
  check((await speicher(page)).standardMittel[0].form === 'retardtab' && await zahl(page, KARTE) === 0,
    `${was}: Methylphenidat bekommt eine andere Form – keine Säurefrage mehr, wie die Meldung sagt (${await kopf(page)} | ${await frage(page)})`);
  await tagWechsel(page, tag(10));
  check(await zahl(page, KARTE) === 0, `${was}: auch eine Woche später nicht`);
  await ctx.close();
}
{
  // Die letzte Ritalin-Einnahme liegt 44 Tage zurück: kein neuer Name.
  const { ctx, page } = await iphone({
    eintraege: [nimmt('r1', 'Ritalin', tag(-44), { form: 'sofort' }), NOTIZ],
    standardMittel: [meins('s1', 'Medikinet adult')],
  });
  check(await frage(page) === F_SAEURE, 'Ritalin vor 44 Tagen, Medikinet adult: die Säurefrage');
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  await meldung(page);
  const s = await speicher(page);
  check(((s.mphRueckfrage || {}).ritalin || {}).saeure === 'nein',
    `„Nein" gilt auch für Ritalin aus dem älteren Tagebuch (${JSON.stringify(s.mphRueckfrage)})`);
  await stand(page, { ...s, eintraege: [...s.eintraege, nimmt('r2', 'Ritalin', tag(2), { form: 'sofort' })] });
  await tagWechsel(page, tag(2));
  check(await zahl(page, KARTE) === 0, `wieder Ritalin, zwei Tage später: keine Säurefrage (${await kopf(page)} | ${await frage(page)})`);
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
  check(await page.locator(`${KARTE} [data-act="rueckfrage-trotzdem"]`).getAttribute('aria-label')
    === 'Trotzdem so anlegen – „Magentropfen“ unter „Meine Mittel“',
  '„Trotzdem so anlegen" nennt den Namen – mit der Beschriftung vorn');
  await tipp(page, `${KARTE} [data-act="rueckfrage-trotzdem"]`);
  const s = await speicher(page);
  check(s.standardMittel.some((m) => m.mittel === 'Magentropfen' && m.dosis === '')
    && s.mphRueckfrage['medikinet adult'].saeure === 'ja',
  '„Trotzdem so anlegen": angelegt, und die Frage gilt als beantwortet');
  check(await meldung(page) === 'Magentropfen steht jetzt bei deinen Mitteln – ohne Dosis. Als Mittel gegen Magensäure '
    + 'kennt Body Check den Namen nicht; Fragen dazu beantwortet die Apotheke.' && await zahl(page, '.wechsel-karte') === 0
    && await zahl(page, KARTE) === 0,
  `die Meldung sagt, dass der Name als Mittel gegen Magensäure unbekannt ist; kein Hinweis, keine Rückfrage mehr (${await meldung(page)})`);
  await ctx.close();
}
/*
 * Ein Name, den Body Check kennt – nur nicht als Mittel gegen Magensäure:
 * Heilerde (unter „Mehr" „ähnlich einem Antazidum"), Sucralfat, ein
 * Schmerzmittel. Überschrift und Meldung sagen dann nicht „unbekannt" – das
 * widerspräche dem Bogen und „Mehr" derselben App und läse sich wie ein
 * Erkennungsfehler.
 */
{
  const bekannt = ['Luvos Heilerde magenfein', 'Ulcogant', 'Ibuprofen'];
  check(bekannt.every((n) => wissenZu(n) && !zusammen.istSaeureMittel(n)),
    'Vorbedingung: die Erkennung kennt diese Namen, zählt sie aber nicht als Mittel gegen Magensäure');
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] });
  for (const n of bekannt) {
    await stand(page, { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] });
    await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
    await page.locator('#rueckfrageName').fill(n);
    await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
    const f = await frage(page);
    check(f === F_PRUEFEN && !/kennt Body Check nicht/.test(f) && await fokusId(page) === 'rueckfrageFrage',
      `${n}: die Überschrift sagt nur, was stimmt (${f})`);
    check((await text(page, KARTE)).includes(`„${n}“ erkennt Body Check nicht als Mittel gegen Magensäure.`),
      `${n}: der Satz darunter bleibt`);
    if (n !== bekannt[0]) continue;
    await kartenText(page);
    await tipp(page, `${KARTE} [data-act="rueckfrage-trotzdem"]`);
    const m = await meldung(page);
    check(m === `${n} steht jetzt bei deinen Mitteln – ohne Dosis. Als Mittel gegen Magensäure kennt Body Check `
      + 'den Namen nicht; Fragen dazu beantwortet die Apotheke.' && !/Den Namen kennt Body Check nicht/.test(m),
    `${n}: „Trotzdem so anlegen" – die Meldung sagt nicht, der Name sei unbekannt (${m})`);
    // Steht er schon da, gilt dasselbe.
    await stand(page, { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult'), meins('h1', n)] });
    await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
    await page.locator('#rueckfrageName').fill(n);
    await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
    await tipp(page, `${KARTE} [data-act="rueckfrage-trotzdem"]`);
    const m2 = await meldung(page);
    check(m2 === `${n} steht schon bei deinen Mitteln. Als Mittel gegen Magensäure kennt Body Check den Namen nicht; `
      + 'Fragen dazu beantwortet die Apotheke.', `${n}, schon unter „Meine Mittel": ebenso (${m2})`);
  }
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
  check(m.startsWith('Form von Methylphenidat: Kapsel mit zweierlei Kügelchen. Bei deiner Einnahme von gestern vermerkt.')
    && m.includes(HINWEIS_OBEN),
    `die Meldung sagt, wo die Form steht, und dass ein Hinweis kam (${m})`);
  const w = await text(page, '.wechsel-karte');
  check(w.includes('Kapsel mit zweierlei Kügelchen und Pantoprazol') && !w.includes('(Methylphenidat)'),
    'W1 steht, W1u nicht mehr');
  check(await frage(page) === F_MERKEN && await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`) === 1
    && (await text(page, `${KARTE} [data-act="rueckfrage-nicht-merken"]`)) === 'Nicht merken',
  'die Karte bietet an, das Mittel unter „Meine Mittel" zu merken');
  // Die Ansage beginnt mit der Beschriftung: „Tippe auf Nicht merken" der
  // Sprachsteuerung sucht nach dem zugänglichen Namen (WCAG 2.5.3).
  check(await page.locator(`${KARTE} [data-act="rueckfrage-nicht-merken"]`).getAttribute('aria-label')
    === 'Nicht merken – die Form bleibt bei der Einnahme',
  '„Nicht merken" sagt, was bleibt – mit der Beschriftung vorn, ohne „nur diese Einnahme"');
  const merkenText = await kartenText(page);
  // formZu liest die jüngste bekannte Form der letzten 30 Tage – auch für
  // spätere Einnahmen ohne Formangabe. Der Text sagt das, statt „nur diese".
  // Welche Form gemerkt würde, steht in der Karte – nicht erst in der Meldung danach.
  check(merkenText.includes('Die Form „Kapsel mit zweierlei Kügelchen“ steht jetzt bei deiner Einnahme von gestern. '
    + 'Sie gilt ab dieser Einnahme 30 Tage lang, '
    + 'auch für weitere Einnahmen ohne Formangabe. Dauerhaft gilt sie, wenn Methylphenidat unter „Meine Mittel“ steht.')
    && !/gilt sie nur|nur für diese/.test(merkenText),
  `MERKEN sagt, wo die Form steht und wie lange sie für weitere Einnahmen gilt (${merkenText.slice(0, 160)}…)`);
  check(await breitOk(page), 'MERKEN passt in 320 Pixel');

  // a) Nicht merken – die Form gilt 30 Tage, auch für Einnahmen ohne Form, und verfällt dann.
  await tipp(page, `${KARTE} [data-act="rueckfrage-nicht-merken"]`);
  check(await zahl(page, KARTE) === 0 && await meldung(page) === 'Gut. Die Form von Methylphenidat gilt ab dieser Einnahme 30 Tage lang, '
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
  check(await zahl(page, KARTE) === 1 && await zahl(page, SPAETER) === 0 && await frage(page) === fForm('Methylphenidat'),
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
  check(await page.locator(`${KARTE} [data-act="rueckfrage-merken"]`).getAttribute('aria-label')
    === 'Ja, merken – Methylphenidat mit der Form „Kapsel mit zweierlei Kügelchen“ unter „Meine Mittel“ anlegen',
  '„Ja, merken" sagt, was es anlegt, mit welcher Form – und mit der Beschriftung vorn');
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
/*
 * c) Vertippt und im Bogen korrigiert, während MERKEN noch dasteht: „Ja,
 * merken" darf nie eine Form unter „Meine Mittel" legen, die nicht mehr an
 * der Einnahme steht – der Knopf trüge sie in jede neue Einnahme weiter, und
 * W1 verschwände ohne Meldung. MERKEN gilt nur, solange an der Einnahme genau
 * die beantwortete Form steht und der Name nicht schon unter „Meine Mittel"
 * steht.
 */
const STAND4C = {
  eintraege: [NOTIZ, nimmt('e1', 'Medikinet', HEUTE)],
  standardMittel: [meins('p1', 'Pantoprazol', { dosis: '40 mg' })],
};
for (const [was, schritte, formDanach] of [
  ['auf „Kapsel mit zweierlei Kügelchen“ korrigiert', ['pellet'], 'pellet'],
  ['auf „Weiß ich nicht“ gestellt', ['unbekannt'], 'unbekannt'],
  ['korrigiert und „Als mein Mittel merken“', ['pellet', 'merken'], 'pellet'],
  // Die Form bleibt, aber der Name steht jetzt unter „Meine Mittel": Dort gilt sie.
  ['nur „Als mein Mittel merken“', ['merken'], 'oros'],
]) {
  const { ctx, page } = await iphone(STAND4C);
  await tipp(page, form('oros'));
  check(await frage(page) === F_MERKEN && await zahl(page, '.wechsel-karte') === 0, `${was}: nach dem Fehltipp „Hülle" steht MERKEN`);
  await tipp(page, '[data-act="bearbeiten"][data-id="e1"]');
  for (const sch of schritte) {
    await tipp(page, sch === 'merken' ? '[data-act="standard-umschalten"]' : `[data-act="bogen-form"][data-id="${sch}"]`);
  }
  await tipp(page, '[data-act="bogen-speichern"]');
  const s = await speicher(page);
  const e1 = s.eintraege.find((e) => e.id === 'e1');
  const mm = s.standardMittel.filter((m) => m.mittel === 'Medikinet');
  check(e1.form === formDanach && await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`) === 0,
    `${was}: MERKEN ist weg (Form an der Einnahme: ${e1.form})`);
  check(schritte.includes('merken')
    ? mm.length === 1 && mm[0].form === formDanach
    : mm.length === 0,
  `${was}: unter „Meine Mittel" steht nur, was im Bogen gewählt war (${JSON.stringify(mm.map((m) => m.form))})`);
  if (schritte[0] === 'pellet') {
    check((await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol'), `${was}: W1 steht`);
  }
  await ctx.close();
}
{
  // Die Einnahme ändert sich, bevor das Neuzeichnen die Karte erreicht: Auch
  // ein Tipp auf den noch stehenden Knopf legt nichts mit der alten Form an.
  const { ctx, page } = await iphone(STAND4C);
  await tipp(page, form('oros'));
  await page.evaluate(async () => {
    const st = await import('/js/store.js');
    st.eintragAendern('e1', { form: 'pellet' });
    document.querySelector('.rueckfrage-karte [data-act="rueckfrage-merken"]').click();
  });
  await page.waitForTimeout(RUHE);
  const s = await speicher(page);
  check(!s.standardMittel.some((m) => m.mittel === 'Medikinet') && s.eintraege.find((e) => e.id === 'e1').form === 'pellet',
    `„Ja, merken" auf dem Knopf von vorher: nichts angelegt (${JSON.stringify(s.standardMittel.map((m) => [m.mittel, m.form]))})`);
  await ctx.close();
}
/*
 * d) Eine neuere Einnahme mit einer anderen Form, solange MERKEN dasteht –
 * zwei Einnahmen am Tag sind bei Methylphenidat üblich. Dann liest formZu
 * die neuere Form, und die beantwortete gilt nicht mehr. „Ja, merken" legte
 * sonst die überholte Form unter „Meine Mittel": Der Knopf trüge sie am
 * nächsten Tag in die neue Einnahme, und W1 verschwände ohne Meldung – oder
 * stünde zu einer Form, die man gar nicht hat. Ohne Formangabe bei der
 * neueren Einnahme gilt die beantwortete weiter, und MERKEN bleibt.
 */
const zweiteEinnahme = async (page, formId) => {
  await page.clock.setFixedTime(um('12:40'));
  await tipp(page, '[data-act="neu"][data-art="medikament"]');
  await page.locator('#bogenMittel').fill('Medikinet');
  await kurz(page);
  if (formId) await tipp(page, `[data-act="bogen-form"][data-id="${formId}"]`);
  await tipp(page, '[data-act="bogen-speichern"]');
};
const W1_MEDIKINET = 'Kapsel mit zweierlei Kügelchen und Pantoprazol';
for (const [was, fehltipp, neuere] of [
  ['Fehltipp „andere Retardtablette“, mittags die Kapsel', 'retardtab', 'pellet'],
  ['Fehltipp „Hülle“, mittags die Kapsel', 'oros', 'pellet'],
  ['Fehltipp Kapsel, mittags die Hülle', 'pellet', 'oros'],
]) {
  const { ctx, page } = await iphone(STAND4C, { viewport: IPHONE });
  await tipp(page, form(fehltipp));
  check(await frage(page) === F_MERKEN, `${was}: nach dem Fehltipp steht MERKEN`);
  await zweiteEinnahme(page, neuere);
  let s = await speicher(page);
  const mph = s.eintraege.filter((e) => e.art === 'medikament');
  check(mph.length === 2 && mph[0].form === fehltipp && mph[1].form === neuere && mph[1].um === '12:40',
    `${was}: zwei Einnahmen von heute, die neuere mit ihrer Form (${JSON.stringify(mph.map((e) => [e.um, e.form]))})`);
  const merkenDa = await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  check(merkenDa === 0 && await zahl(page, KARTE) === 0,
    `${was}: MERKEN ist vorbei – die beantwortete Form gilt nicht mehr (${await frage(page)})`);
  const w1 = neuere === 'pellet';
  check((await text(page, '.wechsel-karte')).includes(W1_MEDIKINET) === w1,
    `${was}: ${w1 ? 'W1 steht' : 'kein W1'} – nach der neueren Form`);
  // Stünde MERKEN noch, ginge es weiter wie im Fund: „Ja, merken", am
  // nächsten Tag ein Tipp auf den Knopf des Mittels.
  if (merkenDa) await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  s = await speicher(page);
  const mm = s.standardMittel.filter((m) => m.mittel === 'Medikinet');
  check(mm.length === 0, `${was}: unter „Meine Mittel" nichts angelegt (${JSON.stringify(mm.map((m) => m.form))})`);
  await tagWechsel(page, tag(1));
  if (mm.length) await tipp(page, `[data-act="standard-eintragen"][data-id="${mm[0].id}"]`);
  check((await text(page, '.wechsel-karte')).includes(W1_MEDIKINET) === w1,
    `${was}: am Tag danach ${w1 ? 'steht W1 weiter' : 'weiter kein W1'}`);
  await ctx.close();
}
{
  // Gegenprobe: Die neuere Einnahme ohne Formangabe – dann gilt die
  // beantwortete Form auch für sie (formZu), und MERKEN bleibt.
  const { ctx, page } = await iphone(STAND4C, { viewport: IPHONE });
  await tipp(page, form('pellet'));
  await zweiteEinnahme(page, null);
  let s = await speicher(page);
  const mph = s.eintraege.filter((e) => e.art === 'medikament');
  check(mph.length === 2 && mph[0].form === 'pellet' && !mph[1].form && await frage(page) === F_MERKEN,
    `neuere Einnahme ohne Form: MERKEN bleibt (${JSON.stringify(mph.map((e) => [e.um, e.form]))}, ${await frage(page)})`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  s = await speicher(page);
  const mm = s.standardMittel.filter((m) => m.mittel === 'Medikinet');
  check(mm.length === 1 && mm[0].form === 'pellet' && (await text(page, '.wechsel-karte')).includes(W1_MEDIKINET),
    `neuere Einnahme ohne Form: „Ja, merken" legt die geltende Form ab, W1 steht (${JSON.stringify(mm.map((m) => m.form))})`);
  await meldung(page);
  await ctx.close();
}
{
  // „Nicht merken" auf dem Knopf von vorher, nachdem eine neuere Einnahme
  // eine andere Form bekam: kein Satz „gilt ab dieser Einnahme 30 Tage".
  const { ctx, page } = await iphone(STAND4C);
  await tipp(page, form('oros'));
  await page.evaluate(async (am) => {
    const st = await import('/js/store.js');
    st.eintragen({ art: 'medikament', am, um: '12:40', mittel: 'Medikinet', dosis: '10 mg', form: 'pellet' });
    document.querySelector('.rueckfrage-karte [data-act="rueckfrage-nicht-merken"]').click();
  }, HEUTE);
  await page.waitForTimeout(RUHE);
  const m = await text(page, '#toast');
  check(!m.includes('gilt ab dieser Einnahme') && await zahl(page, KARTE) === 0,
    `„Nicht merken" auf dem Knopf von vorher: keine Aussage über eine Form, die nicht mehr gilt (${m})`);
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
  check(await meldung(page) === 'Gemerkt. Die Form von Medikinet steht auf der Packung – angeben kannst du sie jederzeit '
    + 'bei deinem Mittel unter „Meine Mittel“.',
  'die Meldung nennt das Mittel und „Meine Mittel", wo es steht');
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
  check(await zahl(page, KARTE) === 1 && await kopf(page) === 'Rückfrage zu Methylphenidat' && await frage(page) === fForm('Methylphenidat'),
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
    && (await text(page, '[data-act="v29-meine-mittel"]')) === 'Zu „Meine Mittel“'
    && await page.locator('[data-act="v29-meine-mittel"]').getAttribute('aria-label') === 'Zu „Meine Mittel“ unter „Mehr“ – dort ein Mittel anlegen',
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
  check(await frage(page) === fForm('Medikinet'), '23:58: die Formfrage steht');
  await page.clock.setFixedTime(um('00:01', tag(1)));
  await tipp(page, form('pellet'));
  check((await speicher(page)).standardMittel[0].form === 'pellet'
    && (await meldung(page)).startsWith('Form von Medikinet: Kapsel mit zweierlei Kügelchen.'),
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
/*
 * Elf eigene Mittel: „Ja, merken" belegte den letzten Platz, und der
 * Säureblocker – an dem W1 hängt – passte einen Schritt später nicht mehr
 * hinein. Steht nach der Form noch die Säurefrage aus, bietet die Karte
 * MERKEN deshalb nur an, wenn danach noch ein Platz frei bleibt.
 */
const ELF = { eintraege: [NOTIZ, nimmt('e1', 'Methylphenidat', HEUTE)], standardMittel: ANDERE.map((n, i) => meins(`a${i}`, n)) };
const MITTEL_320 = { width: 320, height: 640 };
{
  const { ctx, page } = await iphone(ELF, { viewport: MITTEL_320 });
  check(ELF.standardMittel.length === 11 && await frage(page) === fForm('Methylphenidat'), 'elf eigene Mittel, Methylphenidat nur als Einnahme: die Formfrage');
  await tipp(page, form('pellet'));
  check(await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`) === 0 && await frage(page) === F_SAEURE,
    `elf, danach steht die Säurefrage aus: kein MERKEN auf den letzten Platz, gleich die Säurefrage (${await frage(page)})`);
  check((await speicher(page)).standardMittel.length === 11, 'elf: nichts angelegt');
  await meldung(page);
  // Stünde MERKEN doch da, ginge es weiter wie im Fund: „Ja, merken", dann „Ja".
  if (await frage(page) === F_MERKEN) await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  check(await frage(page) === F_WELCHES && await zahl(page, `${KARTE} .rueckfrage-wahl`) > 0
    && !(await text(page, KARTE)).includes('mehr passen nicht'),
  'elf: „Ja" führt zur Wahl, nicht zum Satz über den vollen Stand');
  if (await zahl(page, `${KARTE} .rueckfrage-wahl`)) await tipp(page, `${KARTE} .rueckfrage-wahl[data-name="Pantoprazol"]`);
  const s = await speicher(page);
  check(s.standardMittel.length === 12 && (await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol'),
    'elf: Pantoprazol als zwölftes Mittel angelegt, W1 steht');
  await meldung(page);
  await ctx.close();
}
{
  // Gegenprobe: Folgt keine Säurefrage (Hülle), darf MERKEN den letzten Platz nehmen.
  const { ctx, page } = await iphone(ELF, { viewport: MITTEL_320 });
  await tipp(page, form('oros'));
  check(await frage(page) === F_MERKEN, 'elf, Hülle – danach keine Säurefrage: MERKEN steht');
  await meldung(page);
  await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  check((await speicher(page)).standardMittel.length === 12 && await zahl(page, KARTE) === 0,
    'elf, Hülle: „Ja, merken" nimmt den letzten Platz');
  await meldung(page);
  await ctx.close();
}
{
  // Zehn: MERKEN steht, und nach „Ja, merken" ist für den Säureblocker noch Platz.
  const { ctx, page } = await iphone({ ...ELF, standardMittel: ELF.standardMittel.slice(0, 10) }, { viewport: MITTEL_320 });
  await tipp(page, form('pellet'));
  check(await frage(page) === F_MERKEN, 'zehn: MERKEN steht');
  await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  check((await speicher(page)).standardMittel.length === 11 && await zahl(page, `${KARTE} .rueckfrage-wahl`) > 0,
    'zehn: nach „Ja, merken" (elf) führt „Ja" zur Wahl');
  await ctx.close();
}
/*
 * Elf eigene Mittel und zwei Methylphenidat-Namen, beide heute dran: Der
 * erste braucht nach seiner Form keine Säurefrage (Hülle), der zweite schon
 * – und genau sie fragt die Karte als Nächstes. „Ja, merken" zum ersten
 * nähme den Platz, den der Säureblocker gleich danach braucht. Die Reserve
 * gilt deshalb für jeden Namen, dessen Säurefrage heute noch kommt.
 */
const ELF_ZWEI = (zweiter) => ({
  eintraege: [NOTIZ, { ...nimmt('e1', 'Methylphenidat', HEUTE), um: '07:00' }, { ...nimmt('e2', zweiter, HEUTE), um: '07:30' }],
  standardMittel: ANDERE.map((n, i) => meins(`a${i}`, n)),
});
for (const [zweiter, hinweis] of [['Medikinet retard', 'W1'], ['Ritalin LA', 'W3']]) {
  const { ctx, page } = await iphone(ELF_ZWEI(zweiter), { viewport: MITTEL_320 });
  check(await kopf(page) === 'Rückfrage zu Methylphenidat' && await frage(page) === fForm('Methylphenidat'),
    `elf, dazu ${zweiter}: zuerst die Form von Methylphenidat`);
  await tipp(page, form('oros'));
  check(await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`) === 0
    && await kopf(page) === `Rückfrage zu ${zweiter}` && await frage(page) === F_SAEURE,
  `elf, dazu ${zweiter}: Hülle – kein MERKEN auf den letzten Platz, gleich die Säurefrage zu ${zweiter} (${await kopf(page)} | ${await frage(page)})`);
  check((await speicher(page)).standardMittel.length === 11, `elf, dazu ${zweiter}: nichts angelegt`);
  await meldung(page);
  // Stünde MERKEN doch da, ginge es weiter wie im Fund: „Ja, merken", dann „Ja".
  if (await frage(page) === F_MERKEN) await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  check(await frage(page) === F_WELCHES && await zahl(page, `${KARTE} .rueckfrage-wahl`) > 0
    && !(await text(page, KARTE)).includes('mehr passen nicht'),
  `elf, dazu ${zweiter}: „Ja" führt zur Wahl, nicht zum Satz über den vollen Stand`);
  if (await zahl(page, `${KARTE} .rueckfrage-wahl`)) await tipp(page, `${KARTE} .rueckfrage-wahl[data-name="Pantoprazol"]`);
  const s = await speicher(page);
  const m = await meldung(page);
  check(s.standardMittel.length === 12 && s.standardMittel.some((x) => x.mittel === 'Pantoprazol')
    && (hinweis === 'W1'
      ? (await text(page, '.wechsel-karte')).includes('Kapsel mit zweierlei Kügelchen und Pantoprazol')
      : m.includes('Ein Hinweis dazu steht unter „Mehr“ › „Meine Mittel“.')),
  `elf, dazu ${zweiter}: Pantoprazol als zwölftes Mittel, ${hinweis} (${m})`);
  await ctx.close();
}
{
  // Gegenprobe: Ist der zweite Name heute nicht mehr dran (seine zwei Tage
  // sind vorbei), fragt die Karte ihn nicht – dann darf MERKEN den letzten Platz nehmen.
  const { ctx, page } = await iphone(ELF_ZWEI('Medikinet retard'), { viewport: MITTEL_320 });
  await page.evaluate(([g, t]) => localStorage.setItem(g, JSON.stringify({ am: null, zu: null, tage: { 'medikinet retard': t } })),
    [GEZEIGT, [tag(-14), tag(-7)]]);
  await page.reload({ waitUntil: 'networkidle' });
  await tipp(page, form('oros'));
  check(await frage(page) === F_MERKEN, 'elf, der zweite Name heute nicht mehr dran: MERKEN steht');
  await meldung(page);
  if (await zahl(page, `${KARTE} [data-act="rueckfrage-merken"]`)) await tipp(page, `${KARTE} [data-act="rueckfrage-merken"]`);
  check((await speicher(page)).standardMittel.length === 12 && await zahl(page, KARTE) === 0,
    'elf, der zweite Name heute nicht mehr dran: „Ja, merken" nimmt den letzten Platz, keine Frage mehr');
  await ctx.close();
}
// Die Karte „Neu" bei vollem „Meine Mittel": derselbe Weg wie bei der
// Rückfrage – die Liste, kein Formular, das nicht speichern kann.
const VOLL_NEU = {
  v29Gesagt: undefined, eintraege: [NOTIZ], standardMittel: [meins('p1', 'Pantoprazol'), ...ANDERE.map((n, i) => meins(`a${i}`, n))],
};
{
  const { ctx, page } = await iphone(VOLL_NEU);
  check(await zahl(page, '.neu-karte') === 1 && await zahl(page, KARTE) === 0, 'zwölf eigene Mittel, kein Methylphenidat: die Karte „Neu"');
  check(await page.locator('[data-act="v29-meine-mittel"]').getAttribute('aria-label') === 'Zu „Meine Mittel“ unter „Mehr“',
    'bei vollem „Meine Mittel" kündigt der Knopf kein Anlegen an');
  await tipp(page, '[data-act="v29-meine-mittel"]');
  await kurz(page);
  const s = await speicher(page);
  check(s.tab === 'mehr' && s.v29Gesagt === true && await zahl(page, '#meineMittel') === 1,
    'Karte „Neu", voll: zu „Meine Mittel", als gelesen vermerkt');
  check(await zahl(page, '#meineMittel .mittel-formular') === 0 && await zahl(page, '#mmName') === 0
    && (await text(page, '#meineMittel')).includes('Mehr als 12 passen nicht.'),
  'Karte „Neu", voll: kein Formular für ein neues Mittel, sondern der Satz zum vollen Stand');
  check(await page.evaluate(() => document.activeElement === document.querySelector('#meineMittel h3')),
    'Karte „Neu", voll: der Fokus steht auf der Überschrift „Meine Mittel"');
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
      && await frage(page) === fForm('Methylphenidat'),
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
/*
 * Auch ein Tipp auf eine Karte darüber lässt die Rückfrage oder die Karte
 * „Neu" dorthin rücken, wo eben der Finger war: „Gelesen" bei W1/W1u,
 * „Später" bei der Sicherung. Der zweite Tipp darf dort nichts beantworten.
 */
const VIELE = Array.from({ length: 16 }, (_, i) => ({ id: `v${i}`, art: 'notiz', am: tag(-i), um: '07:00', text: 'x' }));
for (const [vp, wie] of [[{ width: 320, height: 640 }, '320'], [{ width: 414, height: 896 }, '414']]) {
  {
    // W1u, direkt darunter die Formfrage – beides zu „Meine Mittel".
    const { ctx, page } = await iphone({
      eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet'), meins('p1', 'Pantoprazol')],
    }, { viewport: vp });
    check(await zahl(page, '.wechsel-karte') === 1 && await frage(page) === fForm('Medikinet'), `${wie}: W1u, darunter die Formfrage`);
    await doppel(page, '.wechsel-karte [data-act="wechsel-gelesen"]');
    const s = await speicher(page);
    check(!s.standardMittel.find((m) => m.id === 's1').form && await frage(page) === fForm('Medikinet') && (s.wechselGelesen || []).length === 1,
      `${wie}: Doppeltipp auf „Gelesen" von W1u – gelesen, keine Form gespeichert, die Formfrage steht (${s.standardMittel.find((m) => m.id === 's1').form})`);
    await ctx.close();
  }
  {
    // W1u und das Angebot: Die Rückfrage wartet und erscheint erst nach „Gelesen".
    const { ctx, page } = await iphone({
      adhsAn: null, eintraege: [NOTIZ, nimmt('e1', 'Methylphenidat', HEUTE)],
      standardMittel: [meins('p1', 'Pantoprazol', { dosis: '40 mg' })],
    }, { viewport: vp });
    check(await zahl(page, '.wechsel-karte') === 1 && await zahl(page, '.angebot') === 1 && await zahl(page, KARTE) === 0,
      `${wie}: W1u und das Angebot, die Rückfrage wartet`);
    await doppel(page, '.wechsel-karte [data-act="wechsel-gelesen"]');
    const s = await speicher(page);
    const e1 = s.eintraege.find((e) => e.id === 'e1');
    check(!e1.form && await frage(page) === fForm('Methylphenidat'),
      `${wie}: Doppeltipp auf „Gelesen", die Rückfrage erscheint – keine Form an der Einnahme (${e1.form})`);
    await ctx.close();
  }
  {
    // Die Sicherung über der Formfrage.
    const { ctx, page } = await iphone({
      eintraege: [...VIELE, nimmt('e1', 'Methylphenidat', HEUTE)], standardMittel: [], lastBackup: null,
    }, { viewport: vp });
    check(await zahl(page, '[data-act="sicherung-spaeter"]') === 1 && await frage(page) === fForm('Methylphenidat'),
      `${wie}: die Sicherungskarte, darunter die Formfrage`);
    await doppel(page, '[data-act="sicherung-spaeter"]');
    const s = await speicher(page);
    const e1 = s.eintraege.find((e) => e.id === 'e1');
    check(!e1.form && await frage(page) === fForm('Methylphenidat'),
      `${wie}: Doppeltipp auf „Später" der Sicherung – keine Form an der Einnahme (${e1.form})`);
    await ctx.close();
  }
  {
    // W1 offen, die Karte „Neu" wartet und erscheint nach „Gelesen".
    const { ctx, page } = await iphone({
      v29Gesagt: undefined, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult'), meins('s2', 'Pantoprazol')],
    }, { viewport: vp });
    await doppel(page, '.wechsel-karte [data-act="wechsel-gelesen"]');
    const s = await speicher(page);
    check(s.v29Gesagt !== true && s.tab === 'heute' && await zahl(page, '.neu-karte') === 1,
      `${wie}: Doppeltipp auf „Gelesen" von W1 – die Karte „Neu" steht, nicht weggetippt`);
    await ctx.close();
  }
}
{
  // Ein Tipp, der die Karte nicht bewegt – einen Bogen öffnen und schließen –, bleibt ohne Pause.
  // So hoch, dass nichts gerollt werden muss: Rollt der Test zum Knopf, wandert die Karte ohnehin.
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] },
    { viewport: { width: 390, height: 1400 } });
  const oben = await page.locator(KARTE).evaluate((k) => Math.round(k.getBoundingClientRect().top));
  await page.locator('[data-act="neu"][data-art="notiz"]').first().click();
  await kurz(page);
  await page.locator('button.bogen-zu').click();
  await kurz(page);
  check(await zahl(page, KARTE) === 1 && await page.locator(KARTE).evaluate((k) => Math.round(k.getBoundingClientRect().top)) === oben,
    'Bogen auf und zu: die Karte steht wie vorher');
  await page.locator(form('pellet')).click();
  await kurz(page);
  check((await speicher(page)).standardMittel[0].form === 'pellet', 'ein bewusster Tipp 150 ms danach zählt');
  await ctx.close();
}
{
  // Rückt die Karte nach „Gelesen" unter den Finger, sind nur ihre Knöpfe kurz gesperrt –
  // was sonst auf „Tag" steht, war vorher schon da und bleibt sofort antippbar.
  const { ctx, page } = await iphone({
    eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet'), meins('p1', 'Pantoprazol')],
  }, { viewport: { width: 320, height: 640 } });
  await page.locator('.wechsel-karte [data-act="wechsel-gelesen"]').click();
  await kurz(page);
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await kurz(page);
  // Einen Tag zurück: „Tag vor" ist jetzt antippbar, und die Karte steht nur heute.
  check(await page.locator('[data-act="tag-blaettern"][data-d="1"]').isEnabled() && await zahl(page, KARTE) === 0,
    'nach „Gelesen" geht ein Tipp auf „Tag" außerhalb der Karte 150 ms später sofort');
  await ctx.close();
}
/*
 * „Nicht mehr fragen" schließt die Karte, und die Meldung bringt
 * „Rückgängig" – bei 320×640 ohne Rollen und bei 390×844, wenn das
 * Kartenende knapp über den Reitern steht, genau unter den Finger. Der
 * zweite Tipp eines Doppeltipps darf die endgültige Antwort dort nicht
 * gleich zurücknehmen. Ein bewusster Tipp nach der Pause geht weiter.
 */
for (const [vp, wie, mittel, rollen] of [
  [MITTEL_320, '320×640', [meins('s1', 'Medikinet')], false],
  [IPHONE, '390×844, W1u, bis ans Kartenende gerollt', [meins('s1', 'Methylphenidat'), meins('p1', 'Pantoprazol')], true],
]) {
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: mittel }, { viewport: vp });
  if (rollen) {
    await page.evaluate(() => {
      const k = document.querySelector('.rueckfrage-karte');
      const leiste = document.getElementById('tabbar').getBoundingClientRect().top;
      window.scrollTo(0, Math.max(0, k.getBoundingClientRect().bottom + window.scrollY - leiste + 6));
    });
    await kurz(page);
  }
  const k = mittel[0].mittel.toLowerCase();
  const b = await page.locator(NIE).boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(180);
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(RUHE);
  const unter = await page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py);
    return el && el.closest('[data-act]') ? el.closest('[data-act]').dataset.act : '';
  }, [x, y]);
  const s = await speicher(page);
  check(unter === 'rueckfrage-nie-zurueck', `${wie}: „Rückgängig" liegt genau unter dem Finger (${unter || 'nichts'})`);
  check(((s.mphRueckfrage || {})[k] || {}).nie === true && await zahl(page, KARTE) === 0
    && (await gezeigt(page)).zu === HEUTE && (await text(page, '#toast')).startsWith(`Gut. Zu ${mittel[0].mittel} fragt`),
  `${wie}: Doppeltipp auf „Nicht mehr fragen" – gilt, die Karte bleibt zu, „Rückgängig" nicht ausgelöst (${await text(page, '#toast')})`);
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(RUHE);
  check(!(((await speicher(page)).mphRueckfrage || {})[k] || {}).nie && await zahl(page, KARTE) === 1,
    `${wie}: ein bewusster Tipp auf „Rückgängig" nach der Pause holt die Frage zurück`);
  await ctx.close();
}

/* ---------- 16f. Zwei Namen nacheinander: nie dieselbe Karte ---------- */

/*
 * Springt die Karte nach einer Antwort zu einem zweiten Methylphenidat-Namen,
 * stehen dieselben Knöpfe an derselben Stelle. Trüge die Überschrift – auf
 * die der Fokus geht – nicht den Namen, läse sich die Frage zum zweiten wie
 * die eben beantwortete, und ein zweiter Tipp gäbe ihm die Form des ersten.
 * Deshalb: der Name in der Überschrift, in der Meldung das Mittel, und
 * springt die Karte, sagt die Meldung „Jetzt zu …".
 */
const ZWEI = { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet'), meins('s2', 'Methylphenidat')] };
for (const [vp, wie, schritte, ersteMeldung] of [
  [KLEIN, '320×568, Kapsel und „Nein"', [form('pellet'), `${KARTE} [data-act="rueckfrage-saeure-nein"]`],
    'Form von Medikinet: Kapsel mit zweierlei Kügelchen. Steht jetzt bei deinem Mittel unter „Meine Mittel“.'],
  [IPHONE, '390×844, Hülle', [form('oros')],
    'Form von Medikinet: Retardtablette mit Hülle. Steht jetzt bei deinem Mittel unter „Meine Mittel“. Jetzt zu Methylphenidat.'],
  [IPHONE, '390×844, „Weiß ich nicht" und „Nein"', [form('unbekannt'), `${KARTE} [data-act="rueckfrage-saeure-nein"]`],
    'Gemerkt. Die Form von Medikinet steht auf der Packung – angeben kannst du sie jederzeit bei deinem Mittel unter „Meine Mittel“.'],
]) {
  const { ctx, page } = await iphone(ZWEI, { viewport: vp });
  const vorher = [await kopf(page), await frage(page)];
  check(vorher[0] === 'Rückfrage zu Medikinet' && vorher[1] === fForm('Medikinet'), `${wie}: zuerst die Form von Medikinet`);
  const folge = [vorher];
  const meldungen16f = [];
  for (const sel of schritte) {
    await tipp(page, sel);
    folge.push([await kopf(page), await frage(page)]);
    meldungen16f.push(await meldung(page));
  }
  check(meldungen16f[0] === ersteMeldung, `${wie}: die erste Meldung nennt das Mittel (${meldungen16f[0]})`);
  const letzte = meldungen16f[meldungen16f.length - 1];
  check(letzte.endsWith(' Jetzt zu Methylphenidat.') && meldungen16f.slice(0, -1).every((m) => !m.includes('Jetzt zu')),
    `${wie}: erst die Meldung, nach der die Karte springt, sagt „Jetzt zu Methylphenidat." (${letzte})`);
  const [nk, nf] = folge[folge.length - 1];
  check(nk === 'Rückfrage zu Methylphenidat' && nf === fForm('Methylphenidat'),
    `${wie}: danach die Form von Methylphenidat (${nk} | ${nf})`);
  // Je zwei aufeinanderfolgende Karten zu verschiedenen Namen: nie dieselbe Überschrift.
  const gleicheUeberschrift = folge.slice(1).filter(([k, f], i) => k !== folge[i][0] && f === folge[i][1]);
  check(gleicheUeberschrift.length === 0,
    `${wie}: zwei Namen nacheinander tragen nie dieselbe Überschrift (${folge.map(([k, f]) => `${k} › ${f}`).join(' ‖ ')})`);
  const fokus = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.id}|${el.textContent.trim()}` : '';
  });
  check(fokus === `rueckfrageFrage|${fForm('Methylphenidat')}`, `${wie}: der Fokus steht auf der Frage – mit dem Namen darin (${fokus})`);
  // Ein zweiter Tipp auf dieselbe Form, bewusst nach der Pause: Er gilt dem
  // Mittel, das die Überschrift nennt, und die Meldung sagt das.
  await tipp(page, form('oros'));
  const m = await meldung(page);
  check(m.startsWith('Form von Methylphenidat: Retardtablette mit Hülle.'), `${wie}: die Meldung danach nennt das Mittel (${m})`);
  await ctx.close();
}
{
  // „Jetzt zu" nur, wenn die Karte zum nächsten Namen auch dasteht: Nach dem
  // Säureblocker stehen W1 und W1u oben, und die Rückfrage wartet.
  const { ctx, page } = await iphone(ZWEI, { viewport: IPHONE });
  await tipp(page, form('pellet'));
  await meldung(page);
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  await tipp(page, `${KARTE} .rueckfrage-wahl[data-name="Pantoprazol"]`);
  const m = await meldung(page);
  check(await zahl(page, '.wechsel-karte') === 2 && await zahl(page, KARTE) === 0 && !m.includes('Jetzt zu'),
    `W1 und W1u oben, die Rückfrage zu Methylphenidat wartet – die Meldung sagt kein „Jetzt zu" (${m})`);
  await tipp(page, '.wechsel-karte [data-act="wechsel-gelesen"]');
  check(await kopf(page) === 'Rückfrage zu Methylphenidat' && await frage(page) === fForm('Methylphenidat'),
    'nach „Gelesen" steht sie da, mit dem Namen in der Frage');
  await ctx.close();
}

/* ---------- 16c. Was man sieht, steht auch in der Ansage ---------- */

/*
 * Die Sprachsteuerung findet einen Knopf über seinen zugänglichen Namen:
 * „Tippe auf Nicht merken" geht ins Leere, wenn das aria-label „merken"
 * nicht enthält (WCAG 2.5.3, Label in Name). Jeder Knopf der Rückfrage und
 * der Karte „Neu" trägt seine Beschriftung im Namen – in jedem Schritt.
 */
{
  const { ctx, page } = await iphone(null, { viewport: IPHONE });
  const ohne = [];
  let knoepfe = 0;
  for (const [was, z, schritte] of [
    ['FORM', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, []],
    ['SAEURE', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, []],
    ['WELCHES', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, ['ja']],
    ['WELCHES voll', VOLL, ['ja']],
    ['PRUEFEN', { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, ['ja', 'pruefen']],
    ['MERKEN', STAND4, ['pellet']],
    ['Neu', STAND13, []],
    ['Neu voll', VOLL_NEU, []],
  ]) {
    await stand(page, z);
    for (const sch of schritte) {
      if (sch === 'ja') await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
      if (sch === 'pellet') await tipp(page, form('pellet'));
      if (sch === 'pruefen') {
        await page.locator('#rueckfrageName').fill('Säurex');
        await tipp(page, `${KARTE} [data-act="rueckfrage-eigen"]`);
      }
    }
    const paare = await page.evaluate(() => [...document.querySelectorAll('.rueckfrage-karte button, .neu-karte button')]
      .map((b) => [b.innerText.replace(/\s+/g, ' ').trim(), (b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()]));
    knoepfe += paare.length;
    paare.filter(([t, a]) => a && !a.toLowerCase().includes(t.toLowerCase())).forEach(([t, a]) => ohne.push(`${was}: ${t} ⇒ ${a}`));
  }
  check(knoepfe >= 35, `geprüft: ${knoepfe} Knöpfe in acht Zuständen`);
  check(ohne.length === 0, `jede Beschriftung steht im zugänglichen Namen${ohne.length ? `: ${ohne.join(' | ')}` : ''}`);
  await ctx.close();
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
  // Ob Body Check einen Namen kennt, sagt die Rückfrage nie pauschal – nur,
  // ob er als Mittel gegen Magensäure zählt (siehe 3).
  const unbekannt = alle.filter((t) => /(Diesen|Den) Namen kennt Body Check nicht/.test(t));
  check(unbekannt.length === 0, `kein pauschales „kennt Body Check nicht"${unbekannt.length ? `: ${unbekannt[0]}` : ''}`);
}

/* ---------- 18. Breite, Höhe, Bilder ---------- */

{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { viewport: KLEIN });
  const hoch = await page.locator(KARTE).evaluate((k) => k.getBoundingClientRect().height);
  check(hoch <= 460, `die Formfrage ist bei 320 Pixeln höchstens 460 hoch (${Math.round(hoch)})`);
  check(await breitOk(page), 'FORM passt in 320 Pixel');
  // Der Name steht jetzt in der Frage – auch mit dem längeren Wirkstoffnamen bleibt es dabei.
  await stand(page, { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Methylphenidat')] });
  const hoch2 = await page.locator(KARTE).evaluate((k) => k.getBoundingClientRect().height);
  check(hoch2 <= 460 && await frage(page) === fForm('Methylphenidat'),
    `die Formfrage zu Methylphenidat ist bei 320 Pixeln höchstens 460 hoch (${Math.round(hoch2)})`);
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
