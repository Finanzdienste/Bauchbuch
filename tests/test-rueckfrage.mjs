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
 *       Meldung zu einem Namen auch, und springt die Karte, sagt die Meldung
 *       „Jetzt zu …".
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
import { readFileSync } from 'node:fs';
import { ROOT, KEY, SHOT, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import { fmtDatum, plusTage } from '../js/datum.js';
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

/**
 * Ein iPhone mit der App vom Home-Bildschirm, diesem Stand und dieser Uhr.
 * Mit { app: false } ist es Safari auf demselben Telefon, mit { ablage: true }
 * darf die Seite die Zwischenablage lesen und schreiben (Abschnitt 16j). Zwei
 * Kontexte haben getrennte Speicher, teilen aber die Zwischenablage – wie
 * Safari und die App.
 */
async function iphone(stand, {
  zeit = um('08:10'), viewport = SCHMAL, colorScheme = 'dark', verborgen = false, suche = '', app = true, ablage = false,
} = {}) {
  const ctx = await browser.newContext({
    viewport, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'Europe/Berlin', locale: 'de-DE', colorScheme,
    permissions: ablage ? ['clipboard-read', 'clipboard-write'] : [],
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
  await ctx.addInitScript(([k, s, verb, alsApp]) => {
    if (alsApp) Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    if (verb) {
      Object.defineProperty(document, 'visibilityState', { get: () => window.__sicht || 'hidden', configurable: true });
    }
    try { if (s && !localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, stand ? { ...GRUND, ...stand } : null, verborgen, app]);
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
/** Fängt die Meldung Tipps ab (nach einer Antwort, auf „Tag“ ohne Bogen)? */
const meldungFaengt = (page) => page.evaluate(() => {
  const t = document.getElementById('toast');
  return { an: t.classList.contains('an'), deckt: t.classList.contains('deckt'), pe: getComputedStyle(t).pointerEvents };
});
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
  check(await page.locator(SPAETER).getAttribute('aria-label') === 'Später – zu Medikinet frühestens in einer Woche noch ein letztes Mal'
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
  /*
   * Seit der Fassung 30 gibt die Karte W1 die Fachinformation genauer wieder
   * (Quellen in js/zusammen.js): die Gruppen beim Namen, die raschere
   * Freisetzung der gesamten Wirkstoffmenge – nicht „in einem weniger sauren
   * Magen … früher frei“ und nicht „ein Mittel gegen oder gegen zu viel
   * Magensäure“. Bei einem Alginat sagt sie dazu, dass die Fachinformation es
   * nicht eigens nennt; beim Protonenpumpenhemmer nicht.
   */
  const w1Karte = (await text(page, '.wechsel-karte')).replace(/\s+/g, ' ');
  check(w1Karte.includes('steht die Behandlung mit H2-Blockern, Protonenpumpenhemmern oder Antazida unter den Gegenanzeigen')
    && w1Karte.includes('gesamte Wirkstoffmenge rascher frei')
    && !/weniger sauren Magen|gegen oder gegen zu viel|Alginate nennt/.test(w1Karte),
  'die Karte W1 nennt die Gruppen und den Grund so, wie die Fachinformation sie nennt');
  const w1Alginat = await page.evaluate(async () => {
    const z = await import('./js/zusammen.js');
    const mph = [{ id: 'a', mittel: 'Medikinet adult' }];
    const mit = (name) => z.wechselHinweise([...mph, { id: 'b', mittel: name }], [], '2026-11-10');
    return { gaviscon: mit('Gaviscon Advance'), pantoprazol: mit('Pantoprazol') };
  });
  check(w1Alginat.gaviscon.length === 1 && w1Alginat.gaviscon[0].id === 'W1' && w1Alginat.gaviscon[0].stufe === 'A'
    && w1Alginat.gaviscon[0].text.includes('Alginate nennt die Fachinformation nicht eigens')
    && w1Alginat.gaviscon[0].text.includes('Ob das für Gaviscon Advance gilt, kann die Apotheke sagen')
    && !w1Alginat.pantoprazol[0].text.includes('Alginate'),
  'beim Alginat bleibt W1 (Stufe A), sagt aber dazu, dass die Fachinformation Alginate nicht nennt');
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
 * zwei Einnahmen an einem Tag kommen vor. Dann liest formZu
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
{
  // e) Eine Einnahme, älter als gestern: Das Datum („vom So, 08.03.") endet
  //    schon auf einem Punkt. Dahinter kommt kein zweiter – weder in MERKEN
  //    noch in der Meldung (wie „zuletzt …" auf der Karte „Für heute").
  const { ctx, page } = await iphone(null);
  for (const n of [-2, -3, -29]) {
    await stand(page, { eintraege: [nimmt('m0', 'Methylphenidat', tag(n)), NOTIZ], standardMittel: [] });
    check(await frage(page) === fForm('Methylphenidat'), `Einnahme vor ${-n} Tagen: die Formfrage steht`);
    await tipp(page, form('oros'));
    const datum = fmtDatum(tag(n));
    const t = await kartenText(page);
    const m = await meldung(page);
    check(await frage(page) === F_MERKEN
      && t.includes(`Die Form „Retardtablette mit Hülle“ steht jetzt bei deiner Einnahme vom ${datum} Sie gilt ab dieser Einnahme`)
      && !t.includes('..'),
    `Einnahme vor ${-n} Tagen: in MERKEN ein Punkt nach „${datum}" (${t.slice(0, 110)}…)`);
    check(m.startsWith(`Form von Methylphenidat: Retardtablette mit Hülle. Bei deiner Einnahme vom ${datum} vermerkt.`)
      && !m.includes('..'), `Einnahme vor ${-n} Tagen: die Meldung ebenso (${m})`);
  }
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
  check(await meldung(page) === 'Gut. Zu Medikinet fragt Body Check frühestens in einer Woche noch ein letztes Mal.',
    'mit Meldung, die das Mittel nennt');
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
  // Zwei Mittel gegen Magensäure: Beide Hinweise fallen weg, und die Meldung nennt beide.
  const { ctx, page } = await iphone({
    eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet'), meins('s2', 'Pantoprazol'), meins('s3', 'Rennie')],
  }, { viewport: IPHONE });
  check(await zahl(page, '.wechsel-karte') === 2 && await zahl(page, KARTE) === 0, 'zwei Hinweise W1u, die Rückfrage wartet');
  await tipp(page, '.wechsel-karte [data-act="wechsel-gelesen"]');
  await page.waitForTimeout(RUHE);
  await meldung(page);
  await tipp(page, form('oros'));
  const m = await meldung(page);
  check(await zahl(page, '.wechsel-karte') === 0 && m.includes('deinen Mitteln gegen Magensäure (Pantoprazol und Rennie)')
    && m.includes('kennt Body Check keinen Hinweis') && !m.includes('deinem Mittel gegen Magensäure') && !m.includes('beides')
    && !/passt (gut|zusammen)\b|unbedenklich/.test(m),
  `Hülle bei zwei Mitteln gegen Magensäure: die Meldung in der Mehrzahl, mit beiden Namen (${m})`);
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
  // Seit der Fassung 30 mit dem Satz, dass es vom Präparat abhängt: Belegt
  // ist das Paar nur für bestimmte Formen (Kommentar über v29Karte).
  'Zu einigen wenigen Paaren von Mitteln zeigt Body Check jetzt einen Hinweis, vor allem zu Methylphenidat zusammen mit einem Mittel gegen Magensäure. Was in der Fachinformation dazu steht, ist bei Methylphenidat von Präparat zu Präparat verschieden. Alle stehen unter „Mehr“ › „Meine Mittel“, einige auch hier oben.',
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
  // Danach zeigt „Tag" den neuen Tag – nicht mehr „gestern", wo die Karte stand.
  check(await page.locator('.tag-datum').inputValue() === tag(1),
    `danach zeigt „Tag" den neuen Tag (${await page.locator('.tag-datum').inputValue()})`);
  await ctx.close();
}
{
  // 23:59 „Ja", 0:01 Pantoprazol: Die Meldung sagt „oben auf „Tag““ – und dort steht W1 dann auch.
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet adult')] }, { zeit: um('23:59') });
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  await page.clock.setFixedTime(um('00:01', tag(1)));
  await tipp(page, `${KARTE} [data-act="rueckfrage-name"][data-name="Pantoprazol"]`);
  const m = await meldung(page);
  check(m.endsWith(HINWEIS_OBEN) && await page.locator('.tag-datum').inputValue() === tag(1) && await zahl(page, '.wechsel-karte') === 1,
    `über Mitternacht angelegt: „Tag" zeigt den neuen Tag, und der Hinweis, auf den die Meldung zeigt, steht da `
    + `(${await page.locator('.tag-datum').inputValue()}, ${await zahl(page, '.wechsel-karte')} Hinweis; ${m})`);
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
  check(!(await meldungFaengt(page)).deckt, 'unter „Mehr“ fängt die Meldung nach dieser Antwort keinen Tipp ab');
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

/* ---------- 16g. Ein Tipp auf die Meldung geht nicht durch sie hindurch ---------- */

/*
 * Die Meldung steht unten über den Reitern und verdeckt, was darunter liegt.
 * Nach „Nein" springt die Karte bei zwei Namen zur Formfrage des zweiten,
 * mit denselben Knöpfen – und bei 320 Pixeln liegt die lange Meldung genau
 * über ihnen. Wer sie wegtippen will, beantwortete sonst die verdeckte Frage,
 * ohne sie gesehen zu haben. Ein Tipp auf die Meldung schließt sie nur.
 */
/** Die Mitte der größten Fläche, auf der die Meldung einen Knopf in #view verdeckt – oder null. */
const unterDerMeldung = (page) => page.evaluate(() => {
  const t = document.getElementById('toast');
  if (!t.classList.contains('an')) return null;
  const m = t.getBoundingClientRect();
  let best = null;
  document.querySelectorAll('#view button').forEach((b) => {
    const r = b.getBoundingClientRect();
    const l = Math.max(r.left, m.left);
    const re = Math.min(r.right, m.right);
    const o = Math.max(r.top, m.top);
    const u = Math.min(r.bottom, m.bottom);
    if (re - l < 8 || u - o < 8) return;
    const f = (re - l) * (u - o);
    if (!best || f > best.f) {
      best = { f, x: (l + re) / 2, y: (o + u) / 2, act: b.dataset.act || '', was: b.textContent.trim() };
    }
  });
  return best;
});
const meldungAn = (page) => page.evaluate(() => document.getElementById('toast').classList.contains('an'));
{
  // Zwei Namen, 320×568: Kapsel, „Nein" – die Meldung liegt über der Formfrage zu Methylphenidat.
  const { ctx, page } = await iphone(ZWEI, { viewport: KLEIN });
  await tipp(page, form('pellet'));
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  await page.waitForTimeout(700);
  const p = await unterDerMeldung(page);
  check(!!p && p.act === 'rueckfrage-form' && await frage(page) === fForm('Methylphenidat'),
    `320×568, zwei Namen, „Nein": die Meldung verdeckt einen Formknopf zu Methylphenidat (${p ? p.was : 'keinen'})`);
  const vorher = await speicher(page);
  if (p) await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(300);
  const s = await speicher(page);
  check(!s.standardMittel.find((m) => m.id === 's2').form && gleich(s.mphRueckfrage, vorher.mphRueckfrage)
    && await frage(page) === fForm('Methylphenidat'),
  `ein Tipp auf die Meldung beantwortet die Frage darunter nicht (Form: ${s.standardMittel.find((m) => m.id === 's2').form || 'keine'})`);
  check(!(await meldungAn(page)), 'er schließt die Meldung');
  // Nur, wenn die Frage noch steht – sonst wartete der Test vergeblich auf den Knopf.
  if (await zahl(page, form('sodas'))) await tipp(page, form('sodas'));
  check((await speicher(page)).standardMittel.find((m) => m.id === 's2').form === 'sodas',
    'danach gilt ein Tipp auf den Knopf, der jetzt zu sehen ist');
  await meldung(page);
  await ctx.close();
}
{
  // Ein Name nur als Einnahme, 320×568: „Andere Retardtablette", „Nicht merken" –
  // die Meldung liegt über „Später" und „Nicht mehr fragen".
  const { ctx, page } = await iphone({ eintraege: [nimmt('m1', 'Methylphenidat', HEUTE), NOTIZ], standardMittel: [] },
    { viewport: KLEIN });
  await tipp(page, form('retardtab'));
  await tipp(page, `${KARTE} [data-act="rueckfrage-nicht-merken"]`);
  await page.waitForTimeout(700);
  const p = await unterDerMeldung(page);
  check(!!p && await frage(page) === F_SAEURE, `320×568, „Nicht merken": die Meldung verdeckt „${p ? p.was : '–'}"`);
  const vorher = await speicher(page);
  if (p) await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(300);
  const s = await speicher(page);
  check(gleich(s.mphRueckfrage, vorher.mphRueckfrage) && gleich(s.standardMittel, vorher.standardMittel)
    && (await gezeigt(page)).zu !== HEUTE && await frage(page) === F_SAEURE && !(await meldungAn(page)),
  `ein Tipp auf die Meldung: nichts gespeichert, die Säurefrage steht, die Meldung ist zu (${JSON.stringify(s.mphRueckfrage)})`);
  await ctx.close();
}
{
  // „Gelesen" bei W1u, 320×568: Die Rückfrage rückt unter den Finger und unter
  // die Meldung „Gelesen. …" – auch diese Meldung fängt den Tipp ab.
  const { ctx, page } = await iphone(STAND10, { viewport: KLEIN });
  const gelesen = page.locator('.wechsel-karte [data-act="wechsel-gelesen"]');
  await gelesen.scrollIntoViewIfNeeded();
  const g = await gelesen.boundingBox();
  await page.touchscreen.tap(g.x + g.width / 2, g.y + g.height / 2);
  await page.waitForTimeout(700);
  const p = await unterDerMeldung(page);
  check(!!p && /^rueckfrage-/.test(p.act) && await frage(page) === fForm('Methylphenidat'),
    `320×568, „Gelesen" bei W1u: die Meldung verdeckt einen Knopf der Rückfrage (${p ? p.was : 'keinen'})`);
  const vorher = await speicher(page);
  if (p) await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(300);
  const s = await speicher(page);
  check(gleich(s.standardMittel, vorher.standardMittel) && gleich(s.mphRueckfrage, vorher.mphRueckfrage)
    && (await gezeigt(page)).zu !== HEUTE && await frage(page) === fForm('Methylphenidat') && !(await meldungAn(page)),
  `ein Tipp auf diese Meldung beantwortet die Frage darunter nicht und schließt sie (${JSON.stringify(s.mphRueckfrage)})`);
  await ctx.close();
}
{
  // Mit „Rückgängig" bleibt die Meldung bei einem Tipp neben den Knopf stehen:
  // Sie ist der einzige Weg zurück.
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] }, { viewport: IPHONE });
  await tipp(page, NIE);
  const r = await page.locator('#toast').boundingBox();
  await page.touchscreen.tap(r.x + 24, r.y + r.height / 2);
  await page.waitForTimeout(300);
  check(await meldungAn(page) && await zahl(page, '#toast [data-act="rueckfrage-nie-zurueck"]') === 1
    && (await speicher(page)).mphRueckfrage.medikinet.nie === true,
  'ein Tipp auf den Text neben „Rückgängig" lässt die Meldung mit dem Knopf stehen');
  await ctx.close();
}
/*
 * Ein Doppeltipp auf die Meldung: Der erste Tipp schließt sie – der zweite
 * darf nicht durch die eben verschwundene Meldung auf den Knopf darunter
 * gehen, den noch niemand gesehen hat. Lange nach der Antwort (die
 * Nachtipp-Sperre ist dann vorbei), mit 100 bis 400 ms zwischen den Tipps.
 */
const doppelAufMeldung = async (page, abstand) => {
  const p = await unterDerMeldung(page);
  if (!p) return null;
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(abstand);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(RUHE);
  return p;
};
for (const [warten, abstand] of [[1200, 100], [1200, 250], [1200, 400], [3000, 250]]) {
  // Zwei Namen, 320×568: Kapsel, „Nein" – die Meldung liegt über der Formfrage zu Methylphenidat.
  const { ctx, page } = await iphone(ZWEI, { viewport: KLEIN });
  await tipp(page, form('pellet'));
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  await page.waitForTimeout(warten - RUHE);
  const p = await doppelAufMeldung(page, abstand);
  const s = await speicher(page);
  const f2 = s.standardMittel.find((m) => m.id === 's2').form;
  check(!!p && p.act === 'rueckfrage-form' && !f2 && await frage(page) === fForm('Methylphenidat') && !(await meldungAn(page)),
    `320×568, zwei Namen: Doppeltipp auf die Meldung ${warten} ms nach „Nein", ${abstand} ms Abstand – keine Form für `
    + `Methylphenidat, die Frage steht, die Meldung ist zu (${p ? p.was : 'nichts verdeckt'}; Form: ${f2 || 'keine'})`);
  await ctx.close();
}
for (const [wie, schritte] of [
  ['„Weiß ich nicht"', [form('unbekannt')]],
  ['Kapsel und „Ja, merken"', [form('pellet'), `${KARTE} [data-act="rueckfrage-merken"]`]],
]) {
  // Ein Name nur als Einnahme, 320×568: die Meldung liegt über „Später" oder „Nicht mehr fragen".
  const { ctx, page } = await iphone({ eintraege: [nimmt('m1', 'Methylphenidat', HEUTE), NOTIZ], standardMittel: [] },
    { viewport: KLEIN });
  for (const sel of schritte) await tipp(page, sel);
  await page.waitForTimeout(700);
  const vorher = await speicher(page);
  const p = await doppelAufMeldung(page, 250);
  const s = await speicher(page);
  check(!!p && gleich(s.mphRueckfrage, vorher.mphRueckfrage) && (await gezeigt(page)).zu !== HEUTE
    && await frage(page) === F_SAEURE && !(await meldungAn(page)),
  `320×568, ${wie}: ein Doppeltipp auf die Meldung über „${p ? p.was : '–'}" speichert nichts, die Säurefrage steht `
    + `(${JSON.stringify(s.mphRueckfrage)}, zu ${(await gezeigt(page)).zu})`);
  await ctx.close();
}

/* ---------- 16h. Nach einer Antwort steht die nächste Frage im Bild ---------- */

/*
 * Verschwindet mit der Formantwort ein Hinweis über der Karte (W1u wird zu
 * einem Paar der Stufe B), rückt die Karte um dessen Höhe nach oben. Wer
 * bis zum Knopf gerollt hatte, sähe den nächsten Schritt („Auch unter
 * „Meine Mittel“ merken?") dann nicht mehr – und der Fokus säße auf einer
 * Überschrift über dem Bildrand. Die Frage muss danach zwischen Kopfleiste
 * und Reitern stehen, ebenso „Ja, merken".
 */
const lage = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const oben = document.querySelector('.topbar').getBoundingClientRect().bottom;
  const unten = document.getElementById('tabbar').getBoundingClientRect().top;
  return {
    von: Math.round(r.top), bis: Math.round(r.bottom), frei: `${Math.round(oben)}–${Math.round(unten)}`,
    ganz: r.top >= oben - 0.5 && r.bottom <= unten + 0.5, y: Math.round(window.scrollY),
  };
}, sel);
const STAND16H = {
  eintraege: [NOTIZ, nimmt('e1', 'Medikinet', HEUTE), nimmt('e2', 'Pantoprazol', HEUTE, { um: '07:20', dosis: '20 mg' })],
  standardMittel: [],
};
{
  const { ctx, page } = await iphone(null);
  const daneben = [];
  let faelle = 0;
  for (const vp of [KLEIN, { width: 375, height: 667 }, IPHONE]) {
    await page.setViewportSize(vp);
    for (const f of ['retardtab', 'oros']) {
      for (const weise of ['knapp', 'mitte']) {
        await stand(page, STAND16H);
        const wie = `${vp.width}×${vp.height} ${f} ${weise}`;
        if (await zahl(page, '.wechsel-karte') !== 1 || await frage(page) !== fForm('Medikinet')) {
          daneben.push(`${wie}: W1u und Formfrage fehlen`);
          continue;
        }
        // „knapp": der Knopf gerade über den Reitern; „mitte": in der Bildmitte.
        await page.evaluate(([s, w]) => {
          const r = document.querySelector(s).getBoundingClientRect();
          const oben = document.querySelector('.topbar').getBoundingClientRect().bottom;
          const unten = document.getElementById('tabbar').getBoundingClientRect().top;
          if (w === 'knapp') { if (r.bottom > unten - 12) window.scrollBy(0, r.bottom - unten + 12); } else {
            window.scrollBy(0, r.top - (oben + (unten - oben) / 2));
          }
        }, [form(f), weise]);
        await page.waitForTimeout(80);
        const b = await page.locator(form(f)).boundingBox();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(RUHE);
        faelle += 1;
        const q = await lage(page, '#rueckfrageFrage');
        const ja = await lage(page, `${KARTE} [data-act="rueckfrage-merken"]`);
        const fokus = await fokusId(page);
        if (await frage(page) !== F_MERKEN || !q || !q.ganz || !ja || !ja.ganz || fokus !== 'rueckfrageFrage'
          || await zahl(page, '.wechsel-karte') !== 0) {
          daneben.push(`${wie}: Frage ${q ? `${q.von}–${q.bis}` : 'fehlt'}, „Ja, merken" ${ja ? `${ja.von}–${ja.bis}` : 'fehlt'}, `
            + `frei ${q ? q.frei : '?'}, Fokus ${fokus}`);
        }
        await meldung(page);
      }
    }
  }
  check(faelle === 12 && daneben.length === 0,
    `W1u fällt mit der Form weg: MERKEN steht danach im Bild, der Fokus auf seiner Frage (${faelle} Fälle${daneben.length ? `; daneben: ${daneben.join(' | ')}` : ''})`);
  // Steht die nächste Frage ohnehin im Bild, rollt nichts.
  await page.setViewportSize(IPHONE);
  await stand(page, { eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')] });
  await page.evaluate(() => window.scrollTo(0, 40));
  await page.waitForTimeout(80);
  const y0 = await page.evaluate(() => Math.round(window.scrollY));
  await tipp(page, form('pellet'));
  const q = await lage(page, '#rueckfrageFrage');
  check(await frage(page) === F_SAEURE && q && q.ganz && q.y === y0,
    `die Säurefrage steht schon im Bild: nichts gerollt (${y0} → ${q ? q.y : '?'})`);
  await meldung(page);
  await ctx.close();
}

/* ---------- 16i. Zu „Meine Mittel": das Namensfeld über den Reitern ---------- */

/*
 * „Zu „Meine Mittel““ auf der Karte „Neu" rollt zur Überschrift der Karte und
 * setzt den Fokus ins Namensfeld des Formulars – das unter der Liste der
 * eigenen Mittel steht. Bei mehreren Mitteln lag es hinter der Reiterleiste
 * oder unter dem Bildrand, und man tippte blind. Ebenso nach „Mittel
 * hinzufügen" unter „Mehr". Das Feld muss danach ganz zu sehen sein.
 */
const MITTEL = (n) => Array.from({ length: n }, (_, i) => meins(`x${i}`, `Mittel ${String.fromCharCode(65 + i)}`));
{
  const { ctx, page } = await iphone(null);
  const daneben = [];
  let faelle = 0;
  for (const vp of [KLEIN, IPHONE]) {
    await page.setViewportSize(vp);
    for (const n of [0, 5, 8, 11]) {
      await stand(page, { v29Gesagt: false, eintraege: [{ ...NOTIZ, am: tag(-1) }], standardMittel: MITTEL(n) });
      const wie = `${vp.width}×${vp.height}, ${n} Mittel`;
      if (await zahl(page, '.neu-karte') !== 1) { daneben.push(`${wie}: keine Karte „Neu"`); continue; }
      await tipp(page, '.neu-karte [data-act="v29-meine-mittel"]');
      await page.waitForTimeout(200);
      faelle += 1;
      let l = await lage(page, '#mmName');
      let fokus = await fokusId(page);
      if (!l || !l.ganz || fokus !== 'mmName') daneben.push(`${wie}, Karte „Neu": Feld ${l ? `${l.von}–${l.bis}` : 'fehlt'}, frei ${l ? l.frei : '?'}, Fokus ${fokus}`);
      // Der Weg unter „Mehr": „Abbrechen", dann „Mittel hinzufügen".
      await tipp(page, '[data-act="mm-abbrechen"]');
      await tipp(page, '[data-act="meinmittel-neu"]');
      await page.waitForTimeout(200);
      faelle += 1;
      l = await lage(page, '#mmName');
      fokus = await fokusId(page);
      if (!l || !l.ganz || fokus !== 'mmName') daneben.push(`${wie}, „Mittel hinzufügen": Feld ${l ? `${l.von}–${l.bis}` : 'fehlt'}, frei ${l ? l.frei : '?'}, Fokus ${fokus}`);
    }
  }
  check(faelle === 16 && daneben.length === 0,
    `das Namensfeld unter „Meine Mittel" steht mit dem Fokus ganz im Bild (${faelle} Fälle${daneben.length ? `; daneben: ${daneben.join(' | ')}` : ''})`);
  await ctx.close();
}

/* ---------- 16j. Umzug von Safari in die App: die gezeigten Tage reisen mit ---------- */

/*
 * Auf dem iPhone haben Safari und die App vom Home-Bildschirm getrennte
 * Speicher, sind aber dasselbe Gerät. An welchen Tagen die Rückfrage und die
 * Karte „Neu" standen, steht im Gerätespeicher und nie in einer Sicherung.
 * Kam er beim Umzug nicht mit, stand die Rückfrage zu einem Namen in der App
 * noch einmal an bis zu zwei Tagen, wieder mit „Später" – obwohl die Meldung
 * nach „Später" „noch ein letztes Mal" versprochen hatte –, und die Karte
 * „Neu" ein zweites Mal. Der Umzug trägt die Tage, die Sicherung weiter nicht.
 */
const SAFARI16J = {
  startbildschirmWeg: false, v29Gesagt: false, eintraege: [NOTIZ], standardMittel: [meins('s1', 'Medikinet')],
};
/** In der App (leer, Begrüßung) „Einträge aus Safari holen" – und warten, bis sie da sind. */
const holen = async (page) => {
  await tipp(page, '#view [data-act="umzug-holen"]');
  for (let i = 0; i < 20 && !((await speicher(page)) || { eintraege: [] }).eintraege.length; i += 1) {
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(200);
};
{
  // a) „Später" am ersten Tag, eine Woche später das letzte Mal – danach der Umzug.
  const S = await iphone(SAFARI16J, { viewport: IPHONE, app: false, ablage: true });
  check(await frage(S.page) === fForm('Medikinet') && await zahl(S.page, SPAETER) === 1, 'Safari: die Rückfrage mit „Später"');
  await tipp(S.page, SPAETER);
  check(await meldung(S.page) === 'Gut. Zu Medikinet fragt Body Check frühestens in einer Woche noch ein letztes Mal.'
    && await zahl(S.page, '.neu-karte') === 1, 'Safari: „Später" verspricht das letzte Mal, danach steht die Karte „Neu"');
  await tagWechsel(S.page, tag(7));
  check(await zahl(S.page, KARTE) === 1 && await zahl(S.page, SPAETER) === 0, 'Safari, eine Woche später: das letzte Mal, ohne „Später"');
  await tagWechsel(S.page, tag(15));
  check(await zahl(S.page, KARTE) === 0 && await zahl(S.page, '.neu-karte') === 0, 'Safari, Tag 15: nichts mehr');
  await tipp(S.page, '#view [data-act="umzug-mitnehmen"]');
  await S.page.waitForTimeout(400);
  const sicherung = JSON.parse(await S.page.evaluate(async () => (await import('/js/store.js')).alsJSON()));
  check(!JSON.stringify(sicherung).includes(tag(7)) && !Object.keys(sicherung).some((k) => /gezeigt/i.test(k)),
    'die Sicherung trägt weiter nicht, wann eine Karte stand');
  const A = await iphone(null, { viewport: IPHONE, ablage: true, zeit: um('08:30', tag(15)) });
  await holen(A.page);
  check(((await speicher(A.page)) || { eintraege: [] }).eintraege.length === 1, 'App: die Einträge sind geholt');
  check(await zahl(A.page, KARTE) === 0 && await zahl(A.page, '.neu-karte') === 0,
    `App, gleich danach: keine Rückfrage, keine Karte „Neu" (${await kopf(A.page) || 'keine Rückfrage'})`);
  const tageA = [];
  for (const n of [16, 22, 23, 40]) {
    await tagWechsel(A.page, tag(n));
    if (await zahl(A.page, KARTE) || await zahl(A.page, '.neu-karte')) tageA.push(n);
  }
  check(tageA.length === 0, `App, Tag 16, 22, 23, 40: nie mehr eine Rückfrage oder die Karte „Neu" (stand an: ${tageA.join(', ') || 'keinem'})`);
  check(gleich((await gezeigt(A.page)).tage.medikinet, [HEUTE, tag(7)]) && (await gezeigt(A.page)).am === HEUTE,
    `der Gerätespeicher der App trägt die Tage aus Safari (${JSON.stringify(await gezeigt(A.page))})`);
  await S.ctx.close();
  await A.ctx.close();
}
{
  // b) „Später" und der Umzug am selben Tag – und ein Name, der nicht mehr im Tagebuch steht.
  const S = await iphone(SAFARI16J, { viewport: IPHONE, app: false, ablage: true });
  await S.page.evaluate((g) => {
    localStorage.setItem(g, JSON.stringify({ am: null, zu: null, tage: { altmittel: ['2026-02-01'] } }));
  }, GEZEIGT);
  await S.page.reload({ waitUntil: 'networkidle' });
  await tipp(S.page, SPAETER);
  await tipp(S.page, '#view [data-act="umzug-mitnehmen"]');
  await S.page.waitForTimeout(400);
  const ablage = await S.page.evaluate(() => navigator.clipboard.readText());
  check(ablage.includes('"eintraege"') && !ablage.includes('altmittel'),
    'die Zwischenablage trägt das Tagebuch, aber keinen Namen, der dort nicht mehr steht');
  const A = await iphone(null, { viewport: IPHONE, ablage: true, zeit: um('08:30') });
  await holen(A.page);
  check(await zahl(A.page, KARTE) === 0, `App, derselbe Tag: „Später" gilt auch hier – keine Rückfrage (${await kopf(A.page) || 'keine'})`);
  await tagWechsel(A.page, tag(7));
  check(await zahl(A.page, KARTE) === 1 && await zahl(A.page, SPAETER) === 0,
    'App, eine Woche später: das letzte Mal, ohne „Später"');
  await tagWechsel(A.page, tag(14));
  check(await zahl(A.page, KARTE) === 0, 'App, zwei Wochen später: nichts mehr');
  check(!('altmittel' in (await gezeigt(A.page)).tage), 'der Name, der nicht mehr im Tagebuch steht, kommt nicht mit');
  await S.ctx.close();
  await A.ctx.close();
}
{
  // c) Umzug drei Tage nach „Später" – vor dem zweiten Tag. Die Tage kommen
  //    an, bevor „Tag" mit dem neuen Tagebuch zeichnet: Sonst stempelte die
  //    App den Umzugstag als zweiten Tag, und die Frage stünde gleich da.
  const S = await iphone(SAFARI16J, { viewport: IPHONE, app: false, ablage: true });
  await tipp(S.page, SPAETER);
  await tagWechsel(S.page, tag(3));
  check(await zahl(S.page, KARTE) === 0, 'Safari, Tag 3: keine Rückfrage');
  await tipp(S.page, '#view [data-act="umzug-mitnehmen"]');
  await S.page.waitForTimeout(400);
  const A = await iphone(null, { viewport: IPHONE, ablage: true, zeit: um('08:30', tag(3)) });
  await holen(A.page);
  check(await zahl(A.page, KARTE) === 0 && gleich((await gezeigt(A.page)).tage.medikinet, [HEUTE]),
    `App, Tag 3: keine Rückfrage, nur der erste Tag gezählt (${JSON.stringify((await gezeigt(A.page)).tage)})`);
  await tagWechsel(A.page, tag(7));
  check(await zahl(A.page, KARTE) === 1 && await zahl(A.page, SPAETER) === 0, 'App, Tag 7: das letzte Mal, ohne „Später"');
  await tagWechsel(A.page, tag(8));
  check(await zahl(A.page, KARTE) === 0, 'App, Tag 8: nichts mehr');
  await S.ctx.close();
  await A.ctx.close();
}

/* ---------- 16k. Speicher gesperrt oder voll: „Später" gilt trotzdem ---------- */

/*
 * Was auf „Tag" wann stand und ob heute „Später" getippt wurde, steht in
 * einem eigenen Gerätespeicher. Lässt der Browser nichts speichern (privates
 * Fenster, eingebettete Ansicht, blockierte Website-Daten) oder ist der
 * Speicher voll, ging das bisher still verloren: Die Karte blieb nach
 * „Später" stehen, obwohl die Meldung „frühestens in einer Woche" sagte, und
 * nach „Nicht mehr fragen" stand sofort die Frage zum zweiten Namen da. Wie
 * jede Antwort im Tagebuch gilt es jetzt wenigstens für diese Sitzung.
 */
async function ohneSpeicher(viewport = IPHONE) {
  const ctx = await browser.newContext({
    viewport, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'Europe/Berlin', locale: 'de-DE', colorScheme: 'dark',
  });
  ctx.setDefaultTimeout(5000);
  await ctx.route('**/*', (route) => {
    const ziel = route.request().url();
    if (ziel.startsWith(EIGEN) || ziel.startsWith('data:') || ziel.startsWith('blob:')) return route.continue();
    fremd.push(ziel);
    return route.abort();
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    // So verhält sich ein Browser, der Website-Daten sperrt: Schon der Zugriff wirft.
    Object.defineProperty(window, 'localStorage', {
      get: () => { throw new DOMException('Website-Daten gesperrt', 'SecurityError'); }, configurable: true,
    });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.clock.setFixedTime(um('08:10'));
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  return { ctx, page };
}
/** Den Stand über den Speicher der Seite füllen – anders geht es ohne localStorage nicht. */
const fuellen = (page, eintraege) => page.evaluate(async ([g, liste]) => {
  const st = await import('/js/store.js');
  Object.entries(g).forEach(([k, v]) => { if (k !== 'tage') st.einstellen(k, v); });
  liste.forEach((e) => st.eintragen(e));
}, [GRUND, eintraege]);
const imSpeicherDerSeite = (page) => page.evaluate(async () => (await import('/js/store.js')).gezeigtLesen());
{
  const { ctx, page } = await ohneSpeicher();
  await fuellen(page, [NOTIZ, nimmt('e1', 'Medikinet retard', HEUTE)]);
  await page.waitForTimeout(400);
  check(await text(page, '#view').then((t) => t.includes('Es kann nicht gespeichert werden'))
    && await frage(page) === F_SAEURE && await zahl(page, SPAETER) === 1,
  'gesperrter Speicher: die Warnung steht, darunter die Säurefrage mit „Später"');
  check(gleich((await imSpeicherDerSeite(page)).tage, { 'medikinet retard': [HEUTE] }),
    `der Tag, an dem sie stand, zählt im Speicher der Seite (${JSON.stringify((await imSpeicherDerSeite(page)).tage)})`);
  await tipp(page, SPAETER);
  check(await zahl(page, KARTE) === 0 && (await imSpeicherDerSeite(page)).zu === HEUTE,
    `gesperrt, „Später": die Karte ist weg, wie die Meldung sagt (${await meldung(page)})`);
  await tab(page, 'mehr');
  await tab(page, 'heute');
  check(await zahl(page, KARTE) === 0, 'gesperrt, „Später": auch nach einem Reiterwechsel');
  await ctx.close();
}
{
  // Zwei Namen: „Nicht mehr fragen" beim ersten – für den Rest des Tages keine Rückfrage, auch nicht zum zweiten.
  const { ctx, page } = await ohneSpeicher();
  await fuellen(page, [NOTIZ, nimmt('e1', 'Medikinet retard', HEUTE),
    { ...nimmt('e2', 'Ritalin', HEUTE), um: '12:30' }]);
  await page.waitForTimeout(400);
  check(await kopf(page) === 'Rückfrage zu Medikinet retard', 'gesperrt, zwei Namen: zuerst Medikinet retard');
  await tipp(page, NIE);
  check(await zahl(page, KARTE) === 0,
    `gesperrt, „Nicht mehr fragen": heute keine Frage mehr, auch nicht zu Ritalin (${await zahl(page, KARTE) ? await kopf(page) : 'keine'})`);
  await meldung(page);
  await ctx.close();
}
{
  // Voller Speicher: Jedes Schreiben scheitert – auch die paar Zeichen für den Gerätespeicher.
  const { ctx, page } = await iphone({ eintraege: [NOTIZ, nimmt('e1', 'Medikinet retard', HEUTE)], standardMittel: [] });
  await page.evaluate(async () => {
    Storage.prototype.setItem = function setItem() { throw new DOMException('voll', 'QuotaExceededError'); };
    const st = await import('/js/store.js');
    st.einstellen('ton', 'du');
    st.sofortSchreiben();
  });
  await page.waitForTimeout(300);
  check((await text(page, '#view')).includes('Der Speicher ist voll') && await frage(page) === F_SAEURE,
    'voller Speicher: die Warnung steht, darunter die Säurefrage');
  await tipp(page, SPAETER);
  check(await zahl(page, KARTE) === 0 && (await imSpeicherDerSeite(page)).zu === HEUTE,
    `voll, „Später": die Karte ist weg (${await meldung(page)})`);
  await tab(page, 'mehr');
  await tab(page, 'heute');
  check(await zahl(page, KARTE) === 0, 'voll, „Später": auch nach einem Reiterwechsel');
  // „Alles löschen" fängt auch hier neu an – auch im Speicher der Seite.
  page.once('dialog', (d) => d.accept());
  await tab(page, 'mehr');
  await tipp(page, '[data-act="alles-weg"]');
  check(gleich(await imSpeicherDerSeite(page), { am: null, zu: null, tage: {} }),
    `voll, „Alles löschen": auch der Gerätespeicher der Sitzung ist leer (${JSON.stringify(await imSpeicherDerSeite(page))})`);
  await ctx.close();
}
/*
 * Nach einer Antwort fängt die Meldung Tipps ab – auf „Tag“, wo unter ihr der
 * nächste, noch ungesehene Schritt liegen kann. Nach einem Reiterwechsel oder
 * mit offenem Bogen liegt unter ihr nichts dergleichen: Dort lässt sie Tipps
 * durch wie jede andere Meldung. Sonst schloss der erste Tipp unter „Mehr“
 * nur die Meldung, etwa über „Tagebuch löschen“.
 */
{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ, nimmt('e1', 'Medikinet retard', HEUTE)], standardMittel: [] });
  await tipp(page, SPAETER);
  const aufTag = await meldungFaengt(page);
  check(aufTag.an && aufTag.deckt && aufTag.pe === 'auto',
    `nach „Später“ auf „Tag“: die Meldung fängt Tipps ab (${JSON.stringify(aufTag)})`);
  await tab(page, 'mehr');
  const aufMehr = await meldungFaengt(page);
  check(!aufMehr.deckt && aufMehr.pe === 'none',
    `nach dem Wechsel zu „Mehr“: die Meldung lässt Tipps durch (${JSON.stringify(aufMehr)})`);
  const t0 = Date.now();
  page.once('dialog', (d) => d.dismiss());
  await page.locator('[data-act="alles-weg"]').first().click({ timeout: 1500 }).catch(() => {});
  check(Date.now() - t0 < 1500, `unter „Mehr“: „Tagebuch löschen“ ist sofort antippbar (${Date.now() - t0} ms)`);
  await tab(page, 'heute');
  // Zurück auf „Tag“, solange sie noch steht: Dort liegt der ungesehene Schritt noch unter ihr.
  check((await meldungFaengt(page)).deckt, 'zurück auf „Tag“: dieselbe Meldung fängt wieder ab');
  await ctx.close();
}
{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ, nimmt('e1', 'Medikinet retard', HEUTE)], standardMittel: [] });
  await tipp(page, SPAETER);
  check((await meldungFaengt(page)).deckt, 'vor dem Bogen: die Meldung fängt Tipps ab');
  // Per Tastatur: Ein Finger träfe auf „Tag“ womöglich die Meldung selbst.
  await page.locator('[data-act="neu"][data-art="notiz"]').first().focus();
  await page.keyboard.press('Enter');
  await kurz(page);
  const imBogen = await meldungFaengt(page);
  check(await zahl(page, '.bogen-zu') > 0 && !imBogen.deckt && imBogen.pe === 'none',
    `mit offenem Bogen: die Meldung lässt Tipps durch (${JSON.stringify(imBogen)})`);
  await tipp(page, '.bogen-zu');
  check((await meldungFaengt(page)).deckt, 'Bogen zu: dieselbe Meldung fängt wieder ab');
  // Eine neue Meldung ohne Antwort davor fängt nicht ab – auch nicht nach
  // einem Reiterwechsel hin und zurück (per Tastatur: ohne Finger auf der Meldung).
  await page.locator('#wasserMehr').focus();
  await page.keyboard.press('Enter');
  await kurz(page);
  const nachWasser = await meldungFaengt(page);
  await tab(page, 'mehr');
  await tab(page, 'heute');
  const danach = await meldungFaengt(page);
  check(nachWasser.an && !nachWasser.deckt && !danach.deckt,
    `eine neue Meldung (Wasser) fängt nicht ab, auch nicht nach einem Reiterwechsel (${JSON.stringify([nachWasser, danach])})`);
  await ctx.close();
}
{
  // „Rückgängig“ unter „Mehr“ getippt: Die Karte steht wieder auf „Tag“ – dort
  // fängt die Meldung ab, unter „Mehr“ nicht.
  const { ctx, page } = await iphone({
    eintraege: [nimmt('m1', 'Methylphenidat', tag(-1)), NOTIZ],
    standardMittel: [meins('s1', 'Medikinet', { dosis: '10 mg' })],
  });
  await tipp(page, NIE);
  await tab(page, 'mehr');
  check(!(await meldungFaengt(page)).deckt, '„Nicht mehr fragen“, dann „Mehr“: die Meldung fängt dort nicht ab');
  await tipp(page, '#toast [data-act="rueckfrage-nie-zurueck"]');
  const mehr = await meldungFaengt(page);
  check(!mehr.deckt && mehr.pe === 'none', `„Rückgängig“ unter „Mehr“: die neue Meldung fängt dort nicht ab (${JSON.stringify(mehr)})`);
  await tab(page, 'heute');
  check(await kopf(page) === 'Rückfrage zu Medikinet' && (await meldungFaengt(page)).deckt,
    'zurück auf „Tag“: die Karte steht wieder, und die Meldung fängt ab, solange sie steht');
  await ctx.close();
}

/* ---------- 16l. Mehr als zwölf eigene Mittel nach dem Zusammenführen ---------- */

/*
 * Beim Zusammenführen zweier Stände kürzt Body Check die eigenen Mittel nicht
 * (store.zusammenfuehren) – dann stehen auch 14 da. Der Satz zum vollen Stand
 * sagte trotzdem „schon 12" und „eins entfernen", und wer eins entfernte,
 * fand zurück auf „Tag" wieder denselben Satz statt der Wahl. Er nennt jetzt
 * die wirkliche Zahl und wie viele weg müssen, damit eins dazupasst.
 */
{
  const ACHT = ANDERE.slice(0, 8).map((n, i) => meins(`a${i}`, n));
  const SECHS = [...ANDERE.slice(8), 'Calcium', 'Vitamin C', 'Selen'].map((n, i) => meins(`b${i}`, n));
  const { ctx, page } = await iphone({ eintraege: [NOTIZ, nimmt('e1', 'Medikinet retard', HEUTE)], standardMittel: ACHT });
  const ergebnis = await page.evaluate(async ([sechs, gestern]) => {
    const st = await import('/js/store.js');
    const dort = {
      ...JSON.parse(st.alsJSON()), standardMittel: sechs,
      eintraege: [{ id: 'x1', art: 'notiz', am: gestern, um: '09:00', text: 'von dort' }],
    };
    return st.einlesen(JSON.stringify(dort));
  }, [SECHS, tag(-1)]);
  await kurz(page);
  check(ergebnis.zusammengefuehrt && (await speicher(page)).standardMittel.length === 14 && await frage(page) === F_SAEURE,
    'zusammengeführt: 14 eigene Mittel, die Säurefrage steht');
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-ja"]`);
  const satz14 = await text(page, KARTE);
  check(satz14.includes('Bei deinen Mitteln stehen schon 14 – mehr als 12 passen nicht.') && satz14.includes('drei')
    && !satz14.includes('schon 12') && !satz14.includes('eins entfernen'),
  `14: der Satz nennt die Zahl und dass drei weg müssen (${satz14})`);
  await kartenText(page);
  await tipp(page, `${KARTE} [data-act="rueckfrage-meine-mittel"]`);
  await kurz(page);
  const mm14 = await text(page, '#meineMittel');
  check(mm14.includes('14') && mm14.includes('drei') && !mm14.includes('Entferne erst eins'),
    `14, unter „Meine Mittel": derselbe Rat (${mm14.slice(mm14.indexOf('Mehr als') - 30)})`);
  await tipp(page, '[data-act="meinmittel-weg"][data-id="b5"]');
  await tipp(page, '[data-act="meinmittel-weg"][data-id="b5"]');
  await tab(page, 'heute');
  const satz13 = await text(page, KARTE);
  check(await frage(page) === F_WELCHES && satz13.includes('schon 13') && satz13.includes('zwei')
    && await zahl(page, `${KARTE} .rueckfrage-wahl`) === 0,
  `eins entfernt (13), zurück auf „Tag": der Satz sagt, dass noch zwei weg müssen (${satz13})`);
  await tipp(page, `${KARTE} [data-act="rueckfrage-meine-mittel"]`);
  await kurz(page);
  for (const id of ['b4', 'b3']) {
    await tipp(page, `[data-act="meinmittel-weg"][data-id="${id}"]`);
    await tipp(page, `[data-act="meinmittel-weg"][data-id="${id}"]`);
  }
  await tab(page, 'heute');
  check(await frage(page) === F_WELCHES && await zahl(page, `${KARTE} .rueckfrage-wahl`) > 0,
    'elf, zurück auf „Tag": jetzt steht die Wahl');
  // Der Bogen sagt dasselbe, solange es zu viele sind: noch einmal zusammengeführt, jetzt 15.
  await page.evaluate(async (dazu) => {
    const st = await import('/js/store.js');
    st.einlesen(JSON.stringify({ ...JSON.parse(st.alsJSON()), standardMittel: dazu }));
  }, [...SECHS.slice(3), meins('c1', 'Kalium')]);
  await kurz(page);
  const n = (await speicher(page)).standardMittel.length;
  await tipp(page, '[data-act="neu"][data-art="medikament"]');
  const bogen = await text(page, '#bogenMerken');
  check(n === 15 && bogen.includes('schon 15') && bogen.includes('vier') && !bogen.includes('eins entfernen'),
    `15, im Bogen: der Satz nennt die Zahl und dass vier weg müssen (${n}: ${bogen})`);
  await ctx.close();
}

/* ---------- 16m. „Später" nennt das Mittel ---------- */

/*
 * „Später" gilt dem einen Namen: Ein Methylphenidat, das an einem späteren
 * Tag unter einem anderen Namen dazukommt, hat eigene Tage und wird eigens
 * gefragt. Sagte die Meldung nur „Frühestens in einer Woche … ein letztes
 * Mal", las sie sich wie eine Zusage für die ganze Rückfrage – und drei Tage
 * später stand die Karte zu Ritalin da.
 */
{
  const { ctx, page } = await iphone({ eintraege: [NOTIZ], standardMittel: [meins('s1', 'Methylphenidat')] });
  check(await page.locator(SPAETER).getAttribute('aria-label') === 'Später – zu Methylphenidat frühestens in einer Woche noch ein letztes Mal',
    `„Später" sagt in der Ansage, zu welchem Mittel (${await page.locator(SPAETER).getAttribute('aria-label')})`);
  await tipp(page, SPAETER);
  check(await meldung(page) === 'Gut. Zu Methylphenidat fragt Body Check frühestens in einer Woche noch ein letztes Mal.',
    'die Meldung nach „Später" nennt das Mittel');
  await tagWechsel(page, tag(3));
  await page.evaluate(async (e) => (await import('/js/store.js')).eintragen(e), nimmt('e3', 'Ritalin', tag(3)));
  await kurz(page);
  check(await kopf(page) === 'Rückfrage zu Ritalin' && await zahl(page, SPAETER) === 1,
    'drei Tage später kommt Ritalin dazu: eine eigene Rückfrage, mit „Später"');
  await tipp(page, SPAETER);
  check(await meldung(page) === 'Gut. Zu Ritalin fragt Body Check frühestens in einer Woche noch ein letztes Mal.',
    'auch dort nennt die Meldung das Mittel, um das es geht');
  await ctx.close();
}

/* ---------- 16n. „Tagebuch löschen" nimmt auch den Stand vor dem Einlesen mit ---------- */

/*
 * Vor jedem Einlesen legt Body Check den bisherigen Stand unter einem eigenen
 * Schlüssel ab, damit er sich zurückholen lässt. „Tagebuch löschen" ließ ihn
 * liegen – mit allen Einträgen und den Antworten auf die Rückfrage –, und
 * unter „Mehr" stand gleich danach „Diesen Stand zurückholen". Die Karte
 * sagt „Entfernt jede Eintragung aus diesem Browser. Nicht rückgängig zu
 * machen." Danach steht nur noch der neue, leere Stand im Speicher.
 */
{
  const { ctx, page } = await iphone({
    eintraege: [{ ...NOTIZ, text: 'Bauchweh nach dem Frühstück' }], standardMittel: [meins('s1', 'Medikinet adult')],
  });
  page.on('dialog', (d) => d.accept());
  await tipp(page, `${KARTE} [data-act="rueckfrage-saeure-nein"]`);
  await meldung(page);
  // Die lange Meldung wegtippen – sie läge sonst über „Tagebuch löschen".
  await page.locator('#toast').click();
  await page.waitForTimeout(RUHE);
  await page.evaluate(async (gestern) => {
    const st = await import('/js/store.js');
    st.einlesen(JSON.stringify({ ...JSON.parse(st.alsJSON()), eintraege: [{ id: 'x1', art: 'notiz', am: gestern, um: '09:00', text: 'von dort' }] }));
  }, tag(-1));
  await kurz(page);
  const VORHER = `${KEY}.vorher`;
  const vorherText = await page.evaluate((k) => localStorage.getItem(k) || '', VORHER);
  check(vorherText.includes('Bauchweh') && vorherText.includes('"saeure":"nein"'),
    'nach dem Einlesen liegt der Stand davor unter eigenem Schlüssel – mit Einträgen und Antworten');
  await tab(page, 'mehr');
  check((await text(page, '#view')).includes('Diesen Stand zurückholen'), 'unter „Mehr" lässt er sich zurückholen');
  await tipp(page, '[data-act="alles-weg"]');
  const schluessel = await page.evaluate(async () => {
    const st = await import('/js/store.js');
    st.sofortSchreiben();
    return Object.keys(localStorage).filter((k) => k.startsWith('bauchbuch')).sort();
  });
  const alles = await page.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('\n'));
  check(gleich(schluessel, [KEY]) && !alles.includes('Bauchweh') && !alles.includes('Medikinet'),
    `„Tagebuch löschen": danach steht nur der neue Stand im Speicher, nichts von vorher (${schluessel.join(', ')})`);
  await tab(page, 'mehr');
  check(!(await text(page, '#view')).includes('Diesen Stand zurückholen'), 'unter „Mehr" danach kein „Diesen Stand zurückholen"');
  await page.reload({ waitUntil: 'networkidle' });
  await tab(page, 'mehr');
  check(!(await text(page, '#view')).includes('Diesen Stand zurückholen'), 'auch nach dem Neuladen nicht');
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
  // Ein Datum endet auf einem Punkt; ein Satz dahinter bekommt keinen zweiten (siehe 4e).
  const doppelt = alle.filter((t) => t.includes('..'));
  check(doppelt.length === 0, `nirgends zwei Punkte hintereinander${doppelt.length ? `: ${doppelt[0]}` : ''}`);
  // Die README verspricht keinen Namen in jeder Meldung: „Nein" gilt für alle
  // Namen und nennt deshalb keinen (Abschnitt 2d).
  let readme = '';
  try { readme = readFileSync(path.join(PRUEFLING, 'README.md'), 'utf8').replace(/\s+/g, ' '); } catch { /* Kopie ohne README */ }
  check(meldungen.includes(NEIN_MELDUNG) && !readme.includes('Jede Meldung nach einer Antwort nennt das Mittel'),
    'die README sagt nicht, jede Meldung nach einer Antwort nenne das Mittel – die nach „Nein" nennt keins');
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
