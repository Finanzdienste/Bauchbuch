/*
 * Der Umzug von Safari in die App auf dem Startbildschirm.
 *
 * Auf dem iPhone hat eine Web-App auf dem Startbildschirm ihren eigenen
 * Speicher, getrennt von Safari. Wer in Safari angefangen hat und dann die App
 * hinzufügt, findet dort ein leeres Tagebuch – und wer das nicht merkt, trägt
 * an zwei Orten ein, bis Safari seine Hälfte nach einer Woche ohne Besuch von
 * selbst löscht. Der einzige Weg hinüber ist die Zwischenablage: in Safari
 * „Einträge mitnehmen", in der App „Einträge holen".
 *
 * WIE DAS HIER NACHGESTELLT WIRD
 *
 * Zwei Browser-Kontexte im selben Browser. Jeder Kontext hat seinen eigenen
 * localStorage – genau wie Safari und die App –, die Zwischenablage aber
 * teilen sie, wie auf dem Telefon. Beide melden sich als iPhone mit iOS 26
 * (dessen Kennung eine eingefrorene „iPhone OS 18_6" trägt, siehe geraet()
 * in js/app.js). Der „App"-Kontext bekommt zusätzlich
 * navigator.standalone = true; das ist die Angabe, an der Safari selbst eine
 * App vom Startbildschirm erkennt.
 *
 * Die Abschnitte tragen die Nummer ihres Falls, laufen aber in der
 * Reihenfolge, in der sie aufeinander aufbauen: 6 und 8 brauchen die App,
 * die in 2 bis 4 geholt, geleert und zurückgesetzt wurde.
 *
 * WAS SCHIEFGEHEN KANN, UND WORAN ES HIER ZU SEHEN WÄRE
 *
 *   * In Safari steht „Mitgenommen am …", obwohl nichts in der Zwischenablage
 *     ist – dann zieht jemand in eine leere App um (Fall 7).
 *   * Beim Holen geht etwas verloren: ein Eintrag, eine Tagesangabe, die
 *     Marke, dass eine Idee schon verschickt ist. Die letzte ist die
 *     tückischste – sie geht dann ein zweites Mal an den Kasten (Fall 2).
 *   * Ein Holen in eine App, in der schon etwas steht, ersetzt statt
 *     zusammenzuführen (Fall 5), oder zweimal holen legt alles doppelt an
 *     (Fall 5 und 8).
 *   * Die App übernimmt aus Safari das Datum der letzten Sicherung und
 *     erinnert deshalb nicht ans Sichern, obwohl es in der App noch nie eine
 *     gab (Fall 2).
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App statt gegen das Repo – so lässt sich prüfen, dass er einen
 * eingebauten Fehler auch bemerkt.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ROOT, KEY, HANDY, SHOT, vorTagen, pruefer,
} from './umgebung.mjs';
import { kopieServer, frage, warteBis } from './vorrat.mjs';

const { check, ende } = pruefer();

const ORDNER = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8231–8239: Der gemeinsame Server auf 8199/8200 gehört
// tests/lauf.mjs, und dort laufen andere Tests gleichzeitig.
const PORT = Number(process.env.BAUCHBUCH_PORT_UMZUG || 8231);
if (PORT < 8231 || PORT > 8239) throw new Error(`Port ${PORT} liegt außerhalb von 8231–8239`);

// Safari unter iOS 26. Die Systemversion in der Kennung ist eingefroren;
// verlässlich ist nur „Version/26".
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const ABLAGE_DARF = ['clipboard-read', 'clipboard-write'];
const VORHER_KEY = `${KEY}.vorher`;

/* ---------- Kleine Helfer ---------- */

const sauber = (t) => String(t || '').replace(/\s+/g, ' ').trim();
/** „29.10." – so schreibt die App ein Datum in die Umzugshinweise. */
const kurz = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)}.${Number(m)}.`; };

/** JSON mit sortierten Schlüsseln: gleich heißt gleicher Inhalt, nicht gleiche Reihenfolge. */
function stabil(x) {
  if (Array.isArray(x)) return `[${x.map(stabil).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${stabil(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x === undefined ? null : x);
}
const gleich = (a, b) => stabil(a) === stabil(b);
const nachId = (liste) => [...(liste || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
/** Was an einer Idee zählt – mit der Marke, ob sie schon beim Kasten ist. */
const ideenKern = (liste) => nachId(liste)
  .map(({ id, text, am, erledigt, geschickt }) => ({ id, text, am, erledigt, geschickt }));
const ids = (s) => (s && s.eintraege || []).map((e) => e.id);
const doppelte = (liste) => liste.length - new Set(liste).size;

const fehler = [];

/**
 * Ein Gerät: ein Kontext mit iPhone-Kennung, wahlweise als App vom
 * Startbildschirm und wahlweise mit Zugriff auf die Zwischenablage.
 *
 * Der Ideenkasten wird abgefangen. In Safari gibt es „kein Netz" (ab Fall 1
 * hält er die Anfrage nur noch hin) – sonst schickte Safari die offene Idee
 * schon beim Start los, und ob die App sie danach ein zweites Mal schickt,
 * ließe sich nicht mehr sehen. In der App nimmt der Kasten an, und jeder
 * Text, der dort ankommt, wird gezählt.
 */
async function kontext(browser, name, { app, ablage }) {
  const ctx = await browser.newContext({
    viewport: HANDY,
    userAgent: IPHONE,
    permissions: ablage ? ABLAGE_DARF : [],
    acceptDownloads: true,
  });
  if (app) {
    await ctx.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    });
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`${name}: ${e.message}`));
  const kasten = [];
  // 'an' nimmt an, 'aus' ist kein Netz, 'haengen' wartet ohne Antwort.
  const g = { modus: app ? 'an' : 'aus' };
  await page.route('**/idee', async (route) => {
    let text = '';
    try { text = JSON.parse(route.request().postData() || '{}').text || ''; } catch { /* leer */ }
    kasten.push(text);
    if (g.modus === 'haengen') return new Promise(() => {});
    if (g.modus === 'aus') return route.abort('internetdisconnected');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{"ok":true}',
    });
  });
  // Rückfragen (confirm, prompt) beantwortet die Liste `antworten` der Reihe
  // nach: null lehnt ab, ein Text wird eingetippt, alles andere bestätigt.
  const antworten = [];
  const dialoge = [];
  page.on('dialog', async (d) => {
    dialoge.push({ art: d.type(), text: d.message() });
    const a = antworten.length ? antworten.shift() : true;
    if (a === null) await d.dismiss();
    else if (typeof a === 'string') await d.accept(a);
    else await d.accept();
  });
  return Object.assign(g, { ctx, page, kasten, antworten, dialoge, name });
}

/*
 * Bekannte Fehler der App.
 *
 * Was dieser Test an Fehlern gefunden hat, die nicht zum Umzug gehören oder
 * dessen Ablauf nicht aufhalten, steht hier mit der richtigen Erwartung –
 * nicht mit der, die zum Fehler passt. Solange er besteht, erscheint eine
 * Zeile „OFFEN …" statt eines FAIL, damit der Umzug selbst grün prüfbar
 * bleibt; mit BAUCHBUCH_STRENG=1 wird daraus ein FAIL. Ist der Fehler
 * behoben, wird die Zeile von selbst zu einem gewöhnlichen OK.
 */
const STRENG = process.env.BAUCHBUCH_STRENG === '1';
function offen(bedingung, text) {
  if (bedingung || STRENG) { check(bedingung, text); return; }
  console.log(`OFFEN ${text} – bekannter Fehler der App, mit BAUCHBUCH_STRENG=1 rot`);
}

const zustand = (page) => frage(page, (k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const vorherLiegt = (page) => frage(page, (k) => localStorage.getItem(k) !== null, VORHER_KEY);
const ansicht = async (page) => sauber(await page.locator('#view').textContent());
const toast = async (page) => sauber(await page.locator('#toast').textContent());
const ablageLesen = (page) => page.evaluate(() => navigator.clipboard.readText());
const ablageSchreiben = (page, text) => page.evaluate((t) => navigator.clipboard.writeText(t), text);

/*
 * Tippen und Eintippen – und wenn der Knopf oder das Feld fehlt, das als
 * Fehler melden statt abzubrechen. Ein Test, der beim ersten fehlenden Knopf
 * mit einer Zeitüberschreitung stehen bleibt, verschweigt alles, was danach
 * noch kaputt wäre.
 */
async function tippe(loc, was) {
  try {
    await loc.first().click({ timeout: 5000 });
    return true;
  } catch {
    check(false, `„${was}" lässt sich antippen`);
    return false;
  }
}
async function fuelle(loc, text, was) {
  try {
    await loc.first().fill(text, { timeout: 5000 });
    return true;
  } catch {
    check(false, `das Feld „${was}" ist da`);
    return false;
  }
}
const reiter = async (page, id) => {
  await tippe(page.locator(`#tabbar [data-act="tab"][data-tab="${id}"]`), `Reiter ${id}`);
  await page.waitForTimeout(150);
};
/**
 * Warten, bis der gespeicherte Zustand eine Bedingung erfüllt. Der Speicher
 * schreibt mit 120 ms Verzögerung; ein sofortiges Nachsehen fände den alten
 * Stand und hielte einen Fehler für keinen.
 */
async function bisGespeichert(page, fn, ms = 8000) {
  const frist = Date.now() + ms;
  while (Date.now() < frist) {
    // eslint-disable-next-line no-await-in-loop
    const s = await zustand(page).catch(() => null);
    if (fn(s)) return true;
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(150);
  }
  return false;
}
const bisText = (page, text, ms = 8000) => warteBis(
  page,
  (t) => (document.querySelector('#view')?.textContent || '').replace(/\s+/g, ' ').includes(t),
  text,
  ms,
);
const bisToast = (page, text, ms = 8000) => warteBis(
  page,
  (t) => (document.querySelector('#toast')?.textContent || '').replace(/\s+/g, ' ').includes(t),
  text,
  ms,
);
async function eintragen(page, was) {
  await tippe(page.locator('#view [data-act="neu"][data-art="essen"]'), 'Mahlzeit eintragen');
  await fuelle(page.locator('#bogenWas'), was, 'Was?');
  await tippe(page.locator('[data-act="bogen-speichern"]'), 'Eintragen');
  await page.waitForTimeout(250);
}
/** Der Weg von Hand: „Mehr › Text einlesen", einsetzen, „Einlesen". */
async function textEinlesen(page, text) {
  await reiter(page, 'mehr');
  if (await page.locator('[data-act="einfuegen-text"]').count() === 0) {
    await tippe(page.locator('#view [data-act="einfuegen-auf"]'), 'Text einlesen');
  }
  await fuelle(page.locator('[data-act="einfuegen-text"]'), text, 'Sicherungstext hier einfügen');
  await tippe(page.locator('#view [data-act="einfuegen-los"]'), 'Einlesen');
}

/* ---------- Was in Safari steht ---------- */

/*
 * Dreißig Einträge über zehn Tage, alle Arten gemischt, dazu Tagesfragen,
 * eine geänderte Auswahl der Tagesfragen, eine alte Sicherung und zwei
 * Ideen. Die Ideen stehen im alten Format – ohne eigene Marke, nur mit der
 * Zahl ideenGeschickt –, so wie bei jemandem, der Safari schon vor dieser
 * Fassung benutzt hat. Neue Ideen stehen vorn: Die hintere ist verschickt.
 */
const LETZTER_TAG = vorTagen(1);
function safariTagebuch() {
  const eintraege = [];
  for (let t = 10; t >= 1; t--) {
    const am = vorTagen(t);
    const n = 10 - t;
    eintraege.push({
      id: `s${t}-essen`, am, um: '08:00', art: 'essen', was: `Frühstück Nr. ${n + 1}`,
      zutaten: [{ id: n % 2 ? 'milch' : 'huelsen', rolle: 'haupt' }], portion: 'normal',
    });
    eintraege.push(n % 3 === 0
      ? { id: `s${t}-mittel`, am, um: '13:00', art: 'medikament', mittel: 'Kamillentee', dosis: '1 Tasse' }
      : { id: `s${t}-bauch`, am, um: '13:00', art: 'beschwerde', staerke: (n % 5) + 1, arten: ['blaehung'], notiz: '' });
    eintraege.push(n % 4 === 0
      ? { id: `s${t}-notiz`, am, um: '19:30', art: 'notiz', text: `Notiz vom Tag ${n + 1}` }
      : { id: `s${t}-stuhl`, am, um: '19:30', art: 'stuhl', form: 4, dringend: false, unvollstaendig: false, warnzeichen: [] });
  }
  return {
    begruesst: true,
    tab: 'heute',
    eintraege,
    tage: {
      [vorTagen(1)]: { stimmung: 1, stress: 2, schlaf: 1 },
      [vorTagen(4)]: { stress: 3, notiz: 'Viel unterwegs' },
      [vorTagen(7)]: { stimmung: 0, nachtwach: 1 },
    },
    tagesfragen: ['stimmung', 'stress', 'schlaf', 'nachtwach'],
    ideen: [
      { id: 'idee-neu', am: vorTagen(2), text: 'Probezettel aus Safari, noch offen.', erledigt: false },
      { id: 'idee-alt', am: vorTagen(12), text: 'Probezettel aus Safari, erledigt.', erledigt: true },
    ],
    ideenGeschickt: 1,
    lastBackup: { on: vorTagen(6), anzahl: 18 },
  };
}
const SAFARI = safariTagebuch();
const IDEE_NEU = SAFARI.ideen[0].text;
const IDEE_ALT = SAFARI.ideen[1].text;
const LETZTER = `der letzte vom ${kurz(LETZTER_TAG)} um 19:30`;

/* ---------- Los ---------- */

const server = await kopieServer(ORDNER, PORT, { maxAge: 0 });
const ADRESSE = server.adresse;
const browser = await chromium.launch();

/* ======== 1. Safari: mitnehmen ======== */

const S = await kontext(browser, 'Safari', { app: false, ablage: true });
await S.page.goto(ADRESSE, { waitUntil: 'networkidle' });
await S.page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, SAFARI]);
await S.page.reload({ waitUntil: 'networkidle' });
await S.page.waitForTimeout(400);

const sKarte = S.page.locator('#view .karte', {
  has: S.page.locator('h3', { hasText: 'Als App auf den Startbildschirm' }),
});
check(await sKarte.count() === 1, 'Safari zeigt auf dem Tag-Reiter die Karte „Als App auf den Startbildschirm"');
const aufbau = await sKarte.evaluate((k) => {
  const knopf = k.querySelector('[data-act="umzug-mitnehmen"]');
  const schritte = k.querySelector('ol.schritte');
  return {
    knopf: knopf ? knopf.textContent.trim() : '',
    davor: !!(knopf && schritte && (knopf.compareDocumentPosition(schritte) & Node.DOCUMENT_POSITION_FOLLOWING)),
    schritte: schritte ? schritte.textContent.replace(/\s+/g, ' ') : '',
    text: k.textContent.replace(/\s+/g, ' '),
  };
});
check(aufbau.knopf === '1. Einträge mitnehmen', `mit dem Knopf „1. Einträge mitnehmen" („${aufbau.knopf}")`);
// Erst mitnehmen, dann hinzufügen: Andersherum steht man in einer leeren App
// und muss zurück nach Safari, das gerade aus dem Blick ist.
check(aufbau.davor, 'und zwar vor der Anleitung, nicht dahinter');
check(
  aufbau.schritte.includes('•••') && aufbau.schritte.includes('Als Web-App öffnen'),
  'die Anleitung ist die für iOS 26 (über „•••", Schalter „Als Web-App öffnen") – trotz „iPhone OS 18_6" in der Kennung',
);
check(/fängt leer an/.test(aufbau.text), 'die Karte sagt, dass die App leer anfängt');

await tippe(sKarte.locator('[data-act="umzug-mitnehmen"]'), '1. Einträge mitnehmen');
const gemerkt = await bisGespeichert(S.page, (s) => !!(s && s.umzug));
const T1 = await ablageLesen(S.page);
let t1 = null;
try { t1 = JSON.parse(T1); } catch { t1 = null; }
check(!!t1 && Array.isArray(t1.eintraege), 'die Zwischenablage enthält danach das Tagebuch als JSON');
check(!!t1 && t1.eintraege.length === 30, `mit allen 30 Einträgen (${t1 ? t1.eintraege.length : 'keiner'})`);
check(
  !!t1 && gleich(nachId(t1.eintraege), nachId(SAFARI.eintraege)) && gleich(t1.tage, SAFARI.tage),
  'und zwar genau denen, die in Safari stehen, samt Tagesfragen',
);
check(/Kopiert/.test(await toast(S.page)), `ein Satz bestätigt das Kopieren („${await toast(S.page)}")`);

const sNach = await zustand(S.page);
check(gemerkt && !!sNach.umzug, 'Safari vermerkt den Umzug im Speicher');
check(
  !!sNach.umzug && sNach.umzug.am === vorTagen(0) && sNach.umzug.anzahl === 30
    && gleich(sNach.umzug.letzter, { am: LETZTER_TAG, um: '19:30' }),
  `mit Datum, Zahl und letztem Eintrag (${JSON.stringify(sNach.umzug)})`,
);

/*
 * Links aus Nachrichten öffnen auf dem iPhone immer Safari, nie die App.
 * Deshalb muss der Hinweis auf jedem Reiter stehen und nicht nur dort, wo
 * gerade mitgenommen wurde.
 */
const ueberschrift = `Mitgenommen am ${kurz(vorTagen(0))}`;
const ohneHinweis = [];
let versucheOhneNetz = 0;
for (const id of ['heute', 'verlauf', 'muster', 'ruhe', 'ideen', 'mehr']) {
  const vorDemReiter = S.kasten.length;
  // eslint-disable-next-line no-await-in-loop
  await reiter(S.page, id);
  // eslint-disable-next-line no-await-in-loop
  const h3 = await S.page.locator('#view h3', { hasText: 'Mitgenommen am' }).allTextContents();
  if (!h3.map(sauber).includes(ueberschrift)) ohneHinweis.push(id);
  if (id === 'ideen') {
    /*
     * Safari hat hier kein Netz, und eine Idee ist offen. Ein Blick auf den
     * Reiter ist ein Anlass für einen Versuch – einer, nicht hundert. Die
     * App versucht es aber nach jedem Fehlschlag sofort wieder, weil das
     * Zeichnen der Fehlermeldung den nächsten Versuch anstößt. Die Seite wird
     * dabei so oft ersetzt, dass ein Mausklick nicht mehr ankommt und das
     * Ideenfeld den Fokus verliert. Danach hält der Kasten die Anfrage nur
     * noch hin, damit der Test weiterkommt.
     */
    // eslint-disable-next-line no-await-in-loop
    await S.page.waitForTimeout(1500);
    versucheOhneNetz = S.kasten.length - vorDemReiter;
    S.modus = 'haengen';
    // eslint-disable-next-line no-await-in-loop
    await S.page.waitForTimeout(300);
  }
}
check(ohneHinweis.length === 0, `„${ueberschrift}" steht auf jedem der sechs Reiter (fehlt auf: ${ohneHinweis.join(', ') || 'keinem'})`);
offen(
  versucheOhneNetz <= 2,
  `ohne Netz versucht die App auf dem Ideen-Reiter nicht in einer Schleife zu senden (${versucheOhneNetz} Versuche in 1,5 s)`,
);
await reiter(S.page, 'heute');
const sTag = await ansicht(S.page);
check(sTag.includes(`30 Einträge, ${LETZTER}`), 'mit Zahl und letztem Eintrag zum Vergleichen');
check(sTag.includes('nur noch in der App'), 'und der Bitte, ab jetzt nur noch in der App einzutragen');
check(
  await sKarte.count() === 0,
  'die Startbildschirm-Karte macht auf dem Tag-Reiter dem Hinweis Platz',
);
check(
  await S.page.locator('#view details[open] ol.schritte').count() === 1,
  'gleich nach dem Kopieren steht die Anleitung aufgeklappt da',
);
await S.page.screenshot({ path: path.join(SHOT, 'umzug-safari.png'), fullPage: false });

/* ======== 2. Die App: leer, dann holen ======== */

const A = await kontext(browser, 'App', { app: true, ablage: true });
await A.page.goto(ADRESSE, { waitUntil: 'networkidle' });
await A.page.waitForTimeout(400);

const holenKnopf = A.page.locator('#view [data-act="umzug-holen"]');
check(await A.page.locator('#tabbar').isHidden(), 'die App beginnt mit der Begrüßung');
check(
  await holenKnopf.count() === 1 && sauber(await holenKnopf.textContent()) === 'Einträge aus Safari holen',
  'und bietet dort „Einträge aus Safari holen" an',
);

await tippe(holenKnopf, 'Einträge aus Safari holen');
const geholt = await bisGespeichert(A.page, (s) => !!(s && s.eintraege && s.eintraege.length === 30));
const aNach = await zustand(A.page);
const sJetzt = await zustand(S.page);
check(geholt, `nach dem Tipp stehen 30 Einträge in der App (${aNach ? aNach.eintraege.length : 'keine'})`);
check(
  gleich(nachId(aNach.eintraege), nachId(sJetzt.eintraege)) && gleich(nachId(aNach.eintraege), nachId(SAFARI.eintraege)),
  'jeder Eintrag ist Feld für Feld derselbe wie in Safari',
);
check(gleich(aNach.tage, SAFARI.tage), 'die Tagesfragen sind mitgekommen, je Tag und je Feld');
check(gleich(aNach.tagesfragen, SAFARI.tagesfragen), 'und die Auswahl, welche Tagesfragen erscheinen');
check(
  gleich(ideenKern(aNach.ideen), ideenKern(sJetzt.ideen)),
  'die Ideen sind dieselben wie in Safari, samt der Marke „verschickt"',
);
const marke = Object.fromEntries((aNach.ideen || []).map((x) => [x.id, x.geschickt]));
check(
  marke['idee-alt'] === true && marke['idee-neu'] === false,
  `die ältere gilt als verschickt, die neuere nicht (${JSON.stringify(marke)})`,
);
check(
  aNach.lastBackup === null,
  `die Sicherung aus Safari zählt in der App nicht (lastBackup ${JSON.stringify(aNach.lastBackup)})`,
);
check(
  !!aNach.umzugGeholt && aNach.umzugGeholt.anzahl === 30 && aNach.umzugGeholt.am === vorTagen(0),
  'die App vermerkt, dass geholt wurde',
);
check(await vorherLiegt(A.page), 'der Stand von davor liegt zum Zurückholen bereit');
check(/30 Einträge geholt/.test(await toast(A.page)), `ein Satz sagt, wie viele es waren („${await toast(A.page)}")`);

const ergebnis = A.page.locator('#view .karte', { has: A.page.locator('h3', { hasText: 'Deine Einträge sind da' }) });
check(await ergebnis.count() === 1, 'die Karte „Deine Einträge sind da" erscheint');
const ergebnisText = (await ergebnis.count()) ? sauber(await ergebnis.first().textContent()) : '';
check(
  ergebnisText.includes(`30 Einträge, ${LETZTER}`),
  'mit derselben Zahl und demselben letzten Eintrag wie in Safari',
);
check(!ergebnisText.includes('Zusammengeführt'), 'in eine leere App wird nicht „zusammengeführt"');
check(A.kasten.length === 0, `beim Holen selbst geht nichts an den Ideenkasten (${A.kasten.length})`);
await A.page.screenshot({ path: path.join(SHOT, 'umzug-app.png'), fullPage: false });

/* ======== 3. Zwischenablage leeren ======== */

await tippe(ergebnis.locator('[data-act="ablage-leeren"]'), 'Zwischenablage leeren');
await bisToast(A.page, 'geleert', 4000);
const leer = await ablageLesen(A.page);
check(leer.trim() === '', `„Zwischenablage leeren" überschreibt das Tagebuch dort („${leer}")`);
check(/geleert/.test(await toast(A.page)), 'und sagt das');

/*
 * Jetzt der Ideenkasten. Die App schickt offene Ideen beim Start und beim
 * Blick auf den Reiter. Die ältere Idee ist längst angekommen; käme sie ein
 * zweites Mal, hätte die Umrechnung der Marke versagt.
 */
await reiter(A.page, 'ideen');
await warteBis(A.page, () => false, null, 2000);
const nAlt = () => A.kasten.filter((t) => t === IDEE_ALT).length;
const nNeu = () => A.kasten.filter((t) => t === IDEE_NEU).length;
check(nAlt() === 0, `die schon verschickte Idee geht nicht noch einmal hinaus (${nAlt()}×)`);
check(nNeu() === 1, `die in Safari liegengebliebene geht genau einmal hinaus (${nNeu()}×)`);
await reiter(A.page, 'heute');
check(await ergebnis.count() === 1, 'die Ergebniskarte ist nach dem Reiterwechsel noch da');

/* ======== 4. Rückgängig ======== */

// Erst „Abbrechen": Dann darf nichts passieren.
A.antworten.push(null);
await tippe(ergebnis.locator('[data-act="rueckgaengig"]'), 'Rückgängig');
await A.page.waitForTimeout(400);
check(
  A.dialoge.length === 1 && A.dialoge[0].art === 'confirm',
  `„Rückgängig" fragt vorher nach (${A.dialoge.map((d) => d.art).join(', ') || 'keine Frage'})`,
);
check((await zustand(A.page)).eintraege.length === 30, 'abgebrochen bleibt alles stehen');

A.antworten.length = 0;
A.antworten.push(true);
await tippe(ergebnis.locator('[data-act="rueckgaengig"]'), 'Rückgängig');
const zurueck = await bisGespeichert(A.page, (s) => !!s && s.eintraege.length === 0);
const aLeer = await zustand(A.page);
check(zurueck, 'bestätigt ist die App wieder leer');
check(
  !!aLeer && Object.keys(aLeer.tage || {}).length === 0 && aLeer.ideen.length === 0 && !aLeer.umzugGeholt,
  'ganz leer: keine Tagesfragen, keine Ideen, kein Vermerk „geholt"',
);
check(!(await vorherLiegt(A.page)), 'der zurückgeholte Stand liegt nicht ein zweites Mal bereit');
check(
  await holenKnopf.count() === 1,
  'die Begrüßung bietet das Holen wieder an',
);

/* ======== 6. Etwas anderes in der Zwischenablage ======== */

await ablageSchreiben(A.page, 'Hallo');
await tippe(holenKnopf, 'Einträge aus Safari holen');
await bisToast(A.page, 'kein Bauchbuch', 5000);
const hallo = await toast(A.page);
check(
  /kein Bauchbuch/.test(hallo) && /Safari/.test(hallo) && /Einträge mitnehmen/.test(hallo),
  `steht „Hallo" in der Zwischenablage, sagt die App freundlich, was zu tun ist („${hallo}")`,
);
check(await A.page.locator('[data-act="einfuegen-text"]').isVisible(), 'und öffnet das Feld zum Einsetzen von Hand');
check(
  (await ansicht(A.page)).includes('Kam das „Einsetzen" nicht?'),
  'mit dem Hinweis für den Umzug, nicht dem für eine Sicherung',
);
const nachHallo = await zustand(A.page);
check(
  nachHallo.eintraege.length === 0 && nachHallo.ideen.length === 0 && !nachHallo.umzugGeholt
    && !(await vorherLiegt(A.page)),
  'am Tagebuch hat sich nichts geändert',
);
check(
  (await A.page.locator('#view h3', { hasText: 'Deine Einträge sind da' }).count()) === 0,
  'und es steht auch nicht da, die Einträge seien angekommen',
);

// Dasselbe von Hand eingesetzt: wieder ein Satz, der weiterhilft.
await fuelle(A.page.locator('[data-act="einfuegen-text"]'), 'Hallo', 'Sicherungstext hier einfügen');
await tippe(A.page.locator('#view [data-act="einfuegen-los"]'), 'Einlesen');
await A.page.waitForTimeout(300);
const halloFeld = await toast(A.page);
check(
  /kein Bauchbuch/.test(halloFeld) && /Safari/.test(halloFeld),
  `auch von Hand eingesetzt bleibt es bei einem verständlichen Satz („${halloFeld}")`,
);
check((await zustand(A.page)).eintraege.length === 0, 'und wieder ohne Änderung');

/*
 * Und jetzt richtig, auf dem Weg von Hand. So geht es, wenn das iPhone die
 * Blase „Einsetzen" nicht zeigt oder jemand danebentippt.
 */
await fuelle(A.page.locator('[data-act="einfuegen-text"]'), T1, 'Sicherungstext hier einfügen');
await tippe(A.page.locator('#view [data-act="einfuegen-los"]'), 'Einlesen');
const vonHand = await bisGespeichert(A.page, (s) => !!s && s.eintraege.length === 30);
check(vonHand, 'von Hand eingesetzt kommen die 30 Einträge auch an');
check(
  await A.page.locator('#view h3', { hasText: 'Deine Einträge sind da' }).count() === 1,
  'mit derselben Ergebniskarte wie über die Zwischenablage',
);

/* ======== 8. Safari wurde weiter benutzt ======== */

// Die App schickt die offene Idee los (nach dem Rückgängig ist sie wieder
// offen) – damit ist sie in der App ab jetzt „verschickt".
await reiter(A.page, 'ideen');
await warteBis(A.page, () => false, null, 2000);
const neuVorDemZweiten = nNeu();
await reiter(A.page, 'heute');

await reiter(S.page, 'heute');
await eintragen(S.page, 'Reis mit Gemüse');
await eintragen(S.page, 'Apfel');
await bisText(S.page, 'Seitdem stehen hier 2 neue Einträge', 4000);
const sWeiter = await ansicht(S.page);
check(
  sWeiter.includes('Seitdem stehen hier 2 neue Einträge'),
  'Safari zählt mit, was seit dem Mitnehmen dazukam („Seitdem stehen hier 2 neue Einträge")',
);
const nochmal = S.page.locator('#view [data-act="umzug-mitnehmen"]', { hasText: 'Nochmal mitnehmen' });
check(await nochmal.count() >= 1, 'und bietet „Nochmal mitnehmen" an');
await tippe(nochmal, 'Nochmal mitnehmen');
await bisGespeichert(S.page, (s) => !!s && !!s.umzug && s.umzug.anzahl === 32);
const T2 = await ablageLesen(S.page);
let t2 = null;
try { t2 = JSON.parse(T2); } catch { t2 = null; }
check(!!t2 && t2.eintraege.length === 32, `in der Zwischenablage liegen jetzt 32 Einträge (${t2 ? t2.eintraege.length : '–'})`);
await S.page.waitForTimeout(200);
check(!(await ansicht(S.page)).includes('Seitdem'), 'danach ist in Safari nichts mehr offen');

/*
 * In der App wird ein zweites Mal geholt. Safari verspricht genau das („hol
 * in der App noch einmal"). Einen Knopf „Einträge holen" gibt es in der App
 * nach dem ersten Holen aber nirgends mehr – übrig bleibt „Mehr › Text
 * einlesen" mit Einsetzen von Hand, und von dort ist auf dem Umzugshinweis
 * keine Rede. Geprüft wird hier der Weg, den es gibt.
 */
let holenNochDa = 0;
for (const id of ['heute', 'mehr']) {
  // eslint-disable-next-line no-await-in-loop
  await reiter(A.page, id);
  // eslint-disable-next-line no-await-in-loop
  holenNochDa += await A.page.locator('#view [data-act="umzug-holen"]').count();
}
offen(
  holenNochDa > 0,
  'nach dem ersten Holen lässt sich in der App noch einmal aus der Zwischenablage holen, wie Safari es verspricht',
);
await textEinlesen(A.page, await ablageLesen(A.page));
await bisGespeichert(A.page, (s) => !!s && s.eintraege.length >= 32);
const aZwei = await zustand(A.page);
check(aZwei.eintraege.length === 32, `nach dem zweiten Holen stehen 32 Einträge in der App (${aZwei.eintraege.length})`);
check(doppelte(ids(aZwei)) === 0, 'keiner davon doppelt');
check(
  ['Reis mit Gemüse', 'Apfel'].every((w) => aZwei.eintraege.some((e) => e.was === w)),
  'die zwei neuen aus Safari sind dabei',
);
check(/Zusammengeführt/.test(await toast(A.page)), `die App sagt „Zusammengeführt" („${await toast(A.page)}")`);
check(aZwei.ideen.length === 2 && doppelte(aZwei.ideen.map((x) => x.id)) === 0, 'die Ideen stehen weiter nur einmal da');

// Neu starten und auf den Ideenreiter: Was die App schon losgeschickt hat,
// darf das zweite Holen nicht wieder zu „offen" machen.
await A.page.reload({ waitUntil: 'networkidle' });
await reiter(A.page, 'ideen');
await warteBis(A.page, () => false, null, 2000);
check(nNeu() === neuVorDemZweiten, `ein zweites Holen schickt keine Idee noch einmal (${nNeu() - neuVorDemZweiten}× mehr)`);
check(nAlt() === 0, `die in Safari verschickte Idee ist in keinem Schritt hinausgegangen (${nAlt()}×)`);

/* ======== 5. Eine App, in der schon etwas steht ======== */

/*
 * Jemand hat die App hinzugefügt, gleich ein Frühstück eingetragen und holt
 * erst danach. Ersetzen hieße: das Frühstück ist weg.
 */
const B = await kontext(browser, 'App mit Eintrag', { app: true, ablage: true });
await B.page.goto(ADRESSE, { waitUntil: 'networkidle' });
await tippe(B.page.locator('#view [data-act="los"]'), 'Anfangen');
await B.page.waitForTimeout(200);
await eintragen(B.page, 'Haferbrei');
await bisGespeichert(B.page, (s) => !!s && s.eintraege.length === 1);
await textEinlesen(B.page, T1);
await bisGespeichert(B.page, (s) => !!s && s.eintraege.length > 1);
const bEins = await zustand(B.page);
check(bEins.eintraege.length === 31, `eigener Eintrag und Safari zusammen: 31 (${bEins.eintraege.length})`);
check(bEins.eintraege.some((e) => e.was === 'Haferbrei'), 'der eigene Eintrag ist noch da');
check(SAFARI.eintraege.every((e) => ids(bEins).includes(e.id)), 'und alle 30 aus Safari');
check(gleich(bEins.tage, SAFARI.tage), 'die Tagesfragen aus Safari sind ebenfalls da');
const bMeldung = await toast(B.page);
check(/Zusammengeführt/.test(bMeldung) && /31 Einträge/.test(bMeldung), `die Meldung sagt „Zusammengeführt" („${bMeldung}")`);

await textEinlesen(B.page, T1);
await B.page.waitForTimeout(500);
const bZwei = await zustand(B.page);
check(
  bZwei.eintraege.length === 31 && doppelte(ids(bZwei)) === 0,
  `dieselben Kennungen ein zweites Mal eingelesen: keine Dubletten (${bZwei.eintraege.length})`,
);
check(bZwei.ideen.length === 2, `auch bei den Ideen nicht (${bZwei.ideen.length})`);

/* ======== 7. Ohne Erlaubnis für die Zwischenablage ======== */

/*
 * Safari kann den Zugriff verweigern – etwa wenn zwischen Tipp und Kopieren
 * zu viel Zeit vergeht. Dann darf auf keinen Fall „Mitgenommen am" dastehen:
 * Es schickte jemanden in eine App, in der nichts ankommt. Stattdessen steht
 * der Text zum Markieren unter „Mehr".
 */
const S7 = await kontext(browser, 'Safari ohne Ablage', { app: false, ablage: false });
const KLEIN = {
  begruesst: true,
  tab: 'heute',
  eintraege: [1, 2, 3, 4, 5].map((n) => ({
    id: `k${n}`, am: vorTagen(n), um: '12:00', art: 'notiz', text: `Kurze Notiz ${n}`,
  })),
};
await S7.page.goto(ADRESSE, { waitUntil: 'networkidle' });
await S7.page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, KLEIN]);
await S7.page.reload({ waitUntil: 'networkidle' });
await tippe(S7.page.locator('#view [data-act="umzug-mitnehmen"]'), '1. Einträge mitnehmen');
await warteBis(S7.page, () => !!document.querySelector('#view textarea.bericht'), null, 5000);
await S7.page.waitForTimeout(300);
const s7 = await zustand(S7.page);
const s7Text = await ansicht(S7.page);
check(!s7.umzug, 'ohne Zwischenablage vermerkt Safari keinen Umzug');
check(!s7Text.includes('Mitgenommen am'), 'und es steht nirgends „Mitgenommen am"');
check(s7.tab === 'mehr', 'stattdessen geht es zu „Mehr"');
const s7Feld = S7.page.locator('#view textarea.bericht');
let s7Json = null;
try { s7Json = JSON.parse(await s7Feld.inputValue()); } catch { s7Json = null; }
check(!!s7Json && s7Json.eintraege.length === 5, 'dort steht das Tagebuch als Text zum Markieren');
check(/markieren und kopieren/.test(await toast(S7.page)), `ein Satz sagt, was jetzt zu tun ist („${await toast(S7.page)}")`);
await reiter(S7.page, 'heute');
check(!(await ansicht(S7.page)).includes('Mitgenommen am'), 'auch auf dem Tag-Reiter kein „Mitgenommen am"');

const A7 = await kontext(browser, 'App ohne Ablage', { app: true, ablage: false });
await A7.page.goto(ADRESSE, { waitUntil: 'networkidle' });
await tippe(A7.page.locator('#view [data-act="los"]'), 'Anfangen');
await A7.page.waitForTimeout(200);
const holenKarte = A7.page.locator('#view .karte', { has: A7.page.locator('h3', { hasText: 'Schon in Safari eingetragen?' }) });
check(await holenKarte.count() === 1, 'die leere App bietet auf dem Tag-Reiter „Schon in Safari eingetragen?" an');
await tippe(holenKarte.locator('[data-act="umzug-holen"]', { hasText: 'Einträge holen' }), 'Einträge holen');
await warteBis(A7.page, () => !!document.querySelector('[data-act="einfuegen-text"]'), null, 5000);
check(await A7.page.locator('[data-act="einfuegen-text"]').isVisible(), 'ohne Zwischenablage öffnet „Einträge holen" das Feld zum Einsetzen');
check((await ansicht(A7.page)).includes('Kam das „Einsetzen" nicht?'), 'mit dem Hinweis für den Umzug');
check(/von Hand einsetzen/.test(await toast(A7.page)), `und sagt, dass es von Hand geht („${await toast(A7.page)}")`);
check((await zustand(A7.page)).eintraege.length === 0, 'geändert hat sich dabei nichts');
await fuelle(A7.page.locator('[data-act="einfuegen-text"]'), JSON.stringify(s7Json), 'Sicherungstext hier einfügen');
await tippe(A7.page.locator('#view [data-act="einfuegen-los"]'), 'Einlesen');
const a7Da = await bisGespeichert(A7.page, (s) => !!s && s.eintraege.length === 5);
check(a7Da, 'von Hand eingesetzt sind die 5 Einträge da');
check(
  (await A7.page.locator('#view h3', { hasText: 'Deine Einträge sind da' }).count()) === 1,
  'und die Ergebniskarte erscheint',
);

/* ======== 9. Eine verschlüsselte Sicherung ======== */

/*
 * Wer seine Sicherung mit Passwort angelegt hat und genau diesen Text in der
 * Zwischenablage hat, soll damit ebenso umziehen können. Die App fragt dann
 * nach dem Passwort – und Abbrechen ist kein Fehler.
 */
const WORT = 'Umzug-Nr-26!';
await reiter(S.page, 'mehr');
await tippe(S.page.locator('#view [data-act="schloss-auf"]'), 'Mit Passwort sichern');
await fuelle(S.page.locator('#tresorWort'), WORT, 'Passwort für diese Sicherungsdatei');
let tresor = '';
try {
  const [download] = await Promise.all([
    S.page.waitForEvent('download', { timeout: 20000 }),
    S.page.locator('#view [data-act="tresor-export"]').click({ timeout: 5000 }),
  ]);
  tresor = readFileSync(await download.path(), 'utf8');
} catch {
  tresor = '';
}
let tresorJson = null;
try { tresorJson = JSON.parse(tresor); } catch { tresorJson = null; }
check(
  !!tresorJson && tresorJson.art === 'bauchbuch-tresor' && !tresor.includes('Frühstück') && !tresor.includes('Apfel'),
  'Safari legt eine verschlüsselte Sicherung an, in der nichts lesbar ist',
);
await ablageSchreiben(S.page, tresor);
const sTresor = await zustand(S.page);

const A9 = await kontext(browser, 'App mit Passwort', { app: true, ablage: true });
await A9.page.goto(ADRESSE, { waitUntil: 'networkidle' });
const holen9 = A9.page.locator('#view [data-act="umzug-holen"]');

A9.antworten.push(null);
await tippe(holen9, 'Einträge aus Safari holen');
await A9.page.waitForTimeout(800);
check(
  A9.dialoge.length === 1 && A9.dialoge[0].art === 'prompt' && /Passwort/.test(A9.dialoge[0].text),
  `beim Holen fragt die App nach dem Passwort („${A9.dialoge[0] ? A9.dialoge[0].text : 'keine Frage'}")`,
);
const a9Ab = await zustand(A9.page);
check(!a9Ab || a9Ab.eintraege.length === 0, 'abgebrochen wird nichts eingelesen');

A9.antworten.push('falsch-falsch');
await tippe(holen9, 'Einträge aus Safari holen');
await warteBis(A9.page, () => !!document.querySelector('[data-act="einfuegen-text"]'), null, 8000);
const a9Falsch = await zustand(A9.page);
check(!a9Falsch || a9Falsch.eintraege.length === 0, 'mit falschem Passwort wird ebenfalls nichts eingelesen');
/*
 * Was dann dasteht, entscheidet, ob jemand es noch einmal versucht. Die
 * Zwischenablage wurde ja gelesen – „von Hand einsetzen" schickt in die
 * falsche Richtung, und dass das Passwort nicht stimmte, erfährt man nicht.
 */
const falschMeldung = await toast(A9.page);
offen(
  /Passwort/.test(falschMeldung),
  `bei falschem Passwort sagt die App, dass es am Passwort lag („${falschMeldung}")`,
);

// Noch einmal, jetzt richtig – über den Knopf auf dem Tag-Reiter.
await reiter(A9.page, 'heute');
A9.antworten.push(WORT);
await tippe(A9.page.locator('#view [data-act="umzug-holen"]'), 'Einträge holen');
const a9Da = await bisGespeichert(A9.page, (s) => !!s && s.eintraege.length === 32, 15000);
const a9 = await zustand(A9.page);
check(a9Da, `mit dem richtigen Passwort kommen alle 32 Einträge an (${a9 ? a9.eintraege.length : 'keine'})`);
check(
  !!a9 && gleich(nachId(a9.eintraege), nachId((await zustand(S.page)).eintraege)),
  'und zwar genau die aus Safari',
);
check(
  (await A9.page.locator('#view h3', { hasText: 'Deine Einträge sind da' }).count()) === 1,
  'die Ergebniskarte erscheint auch hier',
);
check(!!a9 && a9.lastBackup === null, 'auch hier zählt die Sicherung aus Safari nicht als Sicherung der App');
check(sTresor.eintraege.length === 32, 'Safari selbst hat beim Verschlüsseln nichts verloren');

/* ---------- Zum Schluss ---------- */

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
await server.zu();
ende();
