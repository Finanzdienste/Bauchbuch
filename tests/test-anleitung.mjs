/*
 * Die Anleitung „Home-Bildschirm und Sichern" – nur auf iPhone und iPad.
 *
 * Auf dem iPhone hängt an zwei Handgriffen, ob ein Tagebuch über Monate hält:
 * Bauchbuch als App auf den Home-Bildschirm legen, und ab und zu als Datei
 * sichern. Wer das nicht weiß, verliert seine Einträge nicht mit einem Knall,
 * sondern still: Safari räumt auf, ein Symbol wird gelöscht, ein neues iPhone
 * fängt leer an. Gesagt wird es an zwei Stellen – in der Begrüßung und in der
 * Anleitung unter „Mehr". Gelesen wird es von jemandem, der nicht nachfragen
 * kann. Jeder Satz muss also auf genau diesem Gerät stimmen, und jeder Knopf
 * muss dorthin führen, wo der Satz es verspricht.
 *
 * WAS SCHIEFGEHEN KANN, UND WORAN ES HIER ZU SEHEN WÄRE
 *
 *   * Die Begrüßung in Safari sagt nicht gleich, wie Bauchbuch auf den
 *     Home-Bildschirm kommt. Dann fängt jemand in Safari an und muss später
 *     umziehen (Fall 1). Im eingebauten Browser von WhatsApp gibt es diesen
 *     Weg gar nicht; dort muss „Zuerst in Safari öffnen" stehen (Fall 2).
 *   * „Datei einlesen" tut auf dem iPhone still nichts, weil das Dateifeld
 *     nirgends im Dokument hängt (WebKit-Fehlerbericht 201289). Die Sicherung
 *     sähe dann kaputt aus (Fall 3).
 *   * Wer einmal in der Anleitung war, kommt über „Mehr" nicht mehr zu „Mehr"
 *     (Fall 5).
 *   * In der App steht die Sieben-Tage-Regel, die dort nicht gilt – oder in
 *     Safari fehlt sie, wo sie gilt (Fall 5 und 6).
 *   * „Als Text" vermerkt „gesichert" und zeigt nichts an (Fall 10).
 *   * Ein aufgeklappter Abschnitt klappt beim Sichern zu, und die Stelle, an
 *     der man gerade gelesen hat, ist weg (Fall 11).
 *   * Die Meldung nach dem Sichern rät zu „Auf meinem iPhone" – dem Ort, der
 *     mit dem iPhone verloren geht (Fall 9).
 *   * Android, Rechner und Mac bekommen eine Anleitung für ein Gerät, das sie
 *     nicht haben (Fall 4).
 *   * Ein Wort, das niemand versteht („PWA", „Cache"), ein Versprechen, das
 *     niemand halten kann („garantiert"), oder ein Menüname, der für iOS 26
 *     nicht belegt ist (Fall 13).
 *
 * Die Fälle tragen die Nummern aus Abschnitt 7 der Vorgabe. Was darüber
 * hinaus geprüft wird, steht als „dazu" beim Fall, zu dem es gehört.
 *
 * WIE DAS HIER NACHGESTELLT WIRD
 *
 * Wie in test-geraete.mjs: je Lage ein eigener Browser-Kontext mit eigener
 * Kennung, eigenem Speicher und eigenen Stubs, so wie jedes Telefon für sich.
 * Nachgestellt wird, was die App liest: die Kennung, maxTouchPoints,
 * navigator.standalone – und das Teilen-Blatt. Chromium hat keins. Ein Stub
 * meldet canShare() und löst share() auf oder lehnt mit AbortError ab, so wie
 * Safari es tut, wenn man das Blatt wegwischt.
 *
 * Der Service Worker bleibt aus. Er hat mit der Anleitung nichts zu tun
 * (test-offline und test-nachschub prüfen ihn), aber eine neue Fassung, die
 * mitten im Test die Seite neu lädt, nähme den flüchtigen Schalter
 * ui.anleitung mit – und eine rote Zeile hätte dann nichts mit der Anleitung
 * zu tun.
 *
 * WAS ER NICHT PRÜFT
 *
 *   * Ob die Schritte auf einem echten iPhone stimmen: „•••", „Teilen",
 *     „In Dateien sichern", „Durchsuchen". Das kann nur ein iPhone mit
 *     iOS 26; die Vorgabe verlangt deshalb, vor dem Push einmal von Hand
 *     durchzutippen.
 *   * Ob Safari einen Abbruch in der Ortsauswahl als Erfolg meldet. Deshalb
 *     ist die Meldung vorsichtig formuliert, und geprüft wird ihr Wortlaut.
 *   * Ob ein echtes Dateifeld in der App auf dem Home-Bildschirm sein
 *     change-Ereignis schickt. Geprüft wird, dass es dabei im Dokument hängt –
 *     die Bedingung, unter der es das laut Fehlerbericht tut.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App statt gegen das Repo – so lässt sich prüfen, dass er einen
 * eingebauten Fehler auch bemerkt.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  ROOT, KEY, HANDY, SHOT, ABLAGE, vorTagen, pruefer,
} from './umgebung.mjs';
import { kopieServer, frage, warteBis } from './vorrat.mjs';

const { check, ende } = pruefer();

const ORDNER = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8281–8289: Der gemeinsame Server auf 8199/8200 gehört
// tests/lauf.mjs, und die Bereiche darunter haben andere Tests (8261
// test-zeitknoepfe, 8271 test-standardmittel).
const PORT = Number(process.env.BAUCHBUCH_PORT_ANLEITUNG || 8281);
if (PORT < 8281 || PORT > 8289) throw new Error(`Port ${PORT} liegt außerhalb von 8281–8289`);

/* ---------- Die Kennungen (wie in test-geraete.mjs) ---------- */

const KENNUNG = {
  // Safari unter iOS 26: Systemversion eingefroren auf 18_6, nur Version/26 stimmt.
  ios26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  // Safari auf dem iPad – und genauso Safari auf dem Mac. Nur die
  // Berührungspunkte unterscheiden die beiden.
  mac26: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  // Chrome auf dem iPhone: kein „Version/", dafür „CriOS".
  crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1',
  // Der eingebaute Browser von WhatsApp: ein WebView, kein Safari.
  whatsapp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Mobile/15E148 WhatsApp/2.25.31.72',
  android: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

const IPAD = { width: 820, height: 1180 };
const GROSS = { width: 1280, height: 900 };
// Das kleinste iPhone-Format, das noch verkauft wird (SE, mini im Zoom-Modus).
const SCHMAL = { width: 320, height: 640 };

/* ---------- Was im Speicher steht ---------- */

// Gewöhnliche Mahlzeiten, relativ zu heute, damit sie nie veralten.
const GERICHTE = ['Haferbrei', 'Reis mit Gemüse', 'Brot mit Käse', 'Kartoffeln', 'Apfel'];
function eintraege(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${i}`,
    am: vorTagen(Math.floor(i / 3)),
    um: ['07:30', '12:30', '18:30'][i % 3],
    art: 'essen',
    was: GERICHTE[i % GERICHTE.length],
    tags: [],
    portion: 'normal',
  }));
}

// Nichts im Speicher: so sieht es aus, wer den Link zum ersten Mal öffnet –
// oder wer ein Symbol frisch auf den Home-Bildschirm gelegt hat.
const NEU = null;
// Begrüßt, aber noch nichts eingetragen.
const LEER = { begruesst: true, tab: 'heute' };
const DREI = { begruesst: true, tab: 'heute', eintraege: eintraege(3) };
// Ab 15 Einträgen ohne Sicherung erinnert der Tag-Reiter ans Sichern.
const ZWANZIG = { begruesst: true, tab: 'heute', eintraege: eintraege(20) };

/* ---------- Kleine Helfer ---------- */

const sauber = (t) => String(t || '').replace(/\s+/g, ' ').trim();

/**
 * Alles, was vor dem ersten Skript der Seite stehen muss.
 *
 * Läuft bei jedem Laden. Der Speicher wird nur gefüllt, wenn er leer ist –
 * und gar nicht, wenn die Lage einen frischen Start (NEU) nachstellt.
 */
function vorbereiten({
  key, stand, beruehrung, standalone, teilen, teilenModus,
}) {
  try {
    if (stand && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(stand));
  } catch { /* about:blank hat keinen Speicher */ }

  // Das iPad verrät sich nur hier. Chromium ohne Touch meldet 0 – wie ein Mac.
  if (beruehrung !== undefined) {
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => beruehrung, configurable: true });
  }

  // Das Feld, an dem Safari selbst eine App vom Home-Bildschirm erkennt.
  if (standalone) {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  }

  /*
   * Das Teilen-Blatt. window.__teilen sagt, wie es ausgeht: 'ja' wie nach
   * „In Dateien sichern" › „Sichern", 'nein' wie nach dem Wegwischen – dann
   * lehnt Safari mit AbortError ab. Jede geteilte Datei wird mit Namen und
   * Inhalt mitgeschrieben, damit sich prüfen lässt, dass wirklich das ganze
   * Tagebuch hinausging und nicht nur eine Meldung.
   */
  if (teilen) {
    window.__teilen = teilenModus || 'ja';
    window.__geteilt = [];
    Object.defineProperty(Navigator.prototype, 'canShare', {
      value: () => true, configurable: true, writable: true,
    });
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      writable: true,
      value: (daten) => {
        const f = daten && daten.files && daten.files[0];
        const eintrag = { name: f ? f.name : null, typ: f ? f.type : null, text: null };
        window.__geteilt.push(eintrag);
        const lesen = f ? f.text().then((t) => { eintrag.text = t; }) : Promise.resolve();
        return lesen.then(() => (window.__teilen === 'ja'
          ? undefined
          : Promise.reject(new DOMException('Share canceled', 'AbortError'))));
      },
    });
  }

  // Ein echtes 'beforeinstallprompt' ersetzte auf Android jede Anleitung
  // durch einen Knopf. Ob ein kopfloses Chromium die Seite für installierbar
  // hält, ist hier nicht die Frage.
  window.addEventListener('beforeinstallprompt', (e) => {
    if (e.isTrusted) e.stopImmediatePropagation();
  }, true);
}

let browser;
let server;
const alleFehler = [];

/** Ein Gerät aufmachen: eigener Kontext, eigene Kennung, eigener Speicher. */
async function oeffnen(lage) {
  const ctx = await browser.newContext({
    viewport: lage.viewport || HANDY,
    userAgent: lage.ua,
    serviceWorkers: 'block',
  });
  await ctx.addInitScript(vorbereiten, {
    key: KEY,
    stand: lage.stand === undefined ? DREI : lage.stand,
    beruehrung: lage.beruehrung,
    standalone: !!lage.standalone,
    teilen: lage.teilen !== false,
    teilenModus: lage.teilenModus || 'ja',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => alleFehler.push(`${lage.kurz}: ${e.message}`));
  await page.goto(server.adresse, { waitUntil: 'load' });
  await bereitStehen(page);
  return { ctx, page };
}

/** Warten, bis die Begrüßung oder der Tag-Reiter gezeichnet ist. */
async function bereitStehen(page) {
  const da = await warteBis(page, () => {
    if (document.querySelector('#view .willkommen')) return true;
    const t = document.getElementById('tabbar');
    return !!t && !t.hidden && !!document.getElementById('tab-heute');
  }, null, 15000);
  if (!da) throw new Error('die App hat nichts gezeichnet');
  // Zeichnen geht über eine Mikroaufgabe, die Speicherfrage über ein Promise.
  await page.waitForTimeout(300);
}

/*
 * Ein Fall: Kontexte auf, prüfen, Kontexte zu. Bricht etwas mitten im Fall
 * ab (ein Knopf fehlt, eine Seite hängt), wird das eine rote Zeile mit dem
 * Grund – und die übrigen Fälle laufen trotzdem. Ein Test, der beim ersten
 * Fehler stehen bleibt, verschweigt alles danach.
 */
async function fall(titel, fn) {
  console.log(`\n— ${titel}`);
  const kontexte = [];
  const auf = async (lage) => {
    const k = await oeffnen(lage);
    kontexte.push(k.ctx);
    return k;
  };
  try {
    await fn(auf);
  } catch (e) {
    check(false, `${titel}: lief nicht bis zum Ende (${String((e && e.message) || e).split('\n')[0]})`);
  } finally {
    for (const c of kontexte) {
      // eslint-disable-next-line no-await-in-loop
      await c.close().catch(() => {});
    }
  }
}

/** Antippen – und wenn der Knopf fehlt, das als Fehler melden statt abzubrechen. */
async function tippe(page, sel, was) {
  try {
    await page.locator(sel).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    return true;
  } catch {
    check(false, `„${was}" lässt sich antippen`);
    return false;
  }
}

/** Auf einen Reiter wechseln und warten, bis er steht. */
async function reiter(page, id) {
  if (!(await tippe(page, `#tabbar [data-act="tab"][data-tab="${id}"]`, `Reiter ${id}`))) return false;
  return warteBis(page, (i) => !!document.querySelector(`#tab-${i}.an`), id, 5000);
}

const ansicht = async (page) => sauber(await frage(page, () => document.getElementById('view').textContent));
const toast = async (page) => sauber(await frage(page, () => document.getElementById('toast').textContent));
// Vor jeder Aktion leeren: Sonst läse eine Prüfung die Meldung von vorhin.
const toastLeeren = (page) => frage(page, () => { document.getElementById('toast').textContent = ''; });
const toastAbwarten = (page) => warteBis(page, () => document.getElementById('toast').textContent.trim() !== '', null, 5000);
const zustand = (page) => frage(page, (k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

/** Alle Karten im sichtbaren Reiter: Überschrift, Text, Knöpfe. */
const karten = (page) => frage(page, () => [...document.querySelectorAll('#view .karte')].map((k) => {
  const h = k.querySelector('h3');
  return {
    titel: (h ? h.textContent : '').replace(/\s+/g, ' ').trim(),
    text: k.textContent.replace(/\s+/g, ' ').trim(),
    acts: [...k.querySelectorAll('[data-act]')].map((b) => b.dataset.act),
  };
}));
const karte = (liste, titel) => liste.find((k) => k.titel === titel) || null;

/** Die Knöpfe einer Aktion im sichtbaren Bereich: Beschriftung und Klassen. */
const knoepfe = (page, act) => frage(page, (a) => [...document.querySelectorAll(`#view [data-act="${a}"]`)]
  .map((b) => ({ text: b.textContent.replace(/\s+/g, ' ').trim(), klassen: [...b.classList] })), act);

const istAnleitung = (page) => frage(page, () => [...document.querySelectorAll('#view h2')]
  .some((h) => h.textContent.trim() === 'Anleitung'));

/**
 * Steht „Mehr" da, nicht die Anleitung? Woran man es sieht: Der Reiter ist
 * aktiv, die Überschrift „Anleitung" fehlt, und die Karte „Für den
 * Arzttermin" ist da – die gibt es nur unter „Mehr" selbst.
 */
const istMehr = (page) => frage(page, () => !!document.querySelector('#tab-mehr.an')
  && ![...document.querySelectorAll('#view h2')].some((h) => h.textContent.trim() === 'Anleitung')
  && [...document.querySelectorAll('#view .karte h3')].some((h) => h.textContent.trim() === 'Für den Arzttermin'));

/** Die Anleitung über ihre Karte unter „Mehr" öffnen. */
async function anleitungOeffnen(page) {
  if (!(await tippe(page, '#view [data-act="anleitung"]', 'Anleitung öffnen'))) return false;
  return warteBis(page, () => [...document.querySelectorAll('#view h2')]
    .some((h) => h.textContent.trim() === 'Anleitung'), null, 5000);
}

/**
 * Liegt ein Element im Bild – über der Reiterleiste, nicht darunter? Eine
 * Textfläche, die man erst suchen muss, ist auf dem Telefon so gut wie keine.
 */
const imBild = (page, id) => frage(page, (i) => {
  const f = document.getElementById(i);
  if (!f) return { da: false };
  const r = f.getBoundingClientRect();
  const st = getComputedStyle(f);
  const leiste = document.getElementById('tabbar');
  const unterkante = leiste && !leiste.hidden ? leiste.getBoundingClientRect().top : window.innerHeight;
  return {
    da: true,
    sichtbar: st.display !== 'none' && st.visibility !== 'hidden' && r.height > 0,
    oben: Math.round(r.top),
    unten: Math.round(r.bottom),
    unterkante: Math.round(unterkante),
    imBild: r.top >= 0 && r.bottom <= unterkante,
  };
}, id);

/** Alle Aufklapper im sichtbaren Bereich öffnen. */
const alleAuf = (page) => frage(page, () => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));

/*
 * Die Texte für die Wortprüfung (Fall 13), eingesammelt in den Fällen, in
 * denen die jeweilige Lage ohnehin offen ist – mit allen Aufklappern offen.
 */
const texte = [];
async function merkeText(wo, page) {
  await alleAuf(page);
  texte.push({ wo, text: await ansicht(page) });
}

/* ---------- Los ---------- */

server = await kopieServer(ORDNER, PORT, { maxAge: 0 });
browser = await chromium.launch();

try {
  /* ---------- 1. Begrüßung in Safari ---------- */

  /*
   * Wer den Link bekommt, öffnet ihn in Safari und sieht als Erstes die
   * Begrüßung. Fängt sie hier an einzutragen, muss sie später umziehen. Also
   * stehen die Schritte zum Home-Bildschirm gleich hier – vor dem ersten
   * Eintrag –, und der Knopf, der in Safari weitermacht, ist bewusst nicht
   * der hervorgehobene.
   */
  await fall('1. Begrüßung in Safari, iOS 26, leerer Speicher', async (auf) => {
    const w = '[1 Begrüßung Safari]';
    const { page } = await auf({ kurz: 'Begrüßung Safari', ua: KENNUNG.ios26, stand: NEU });
    check(await frage(page, () => !!document.querySelector('#view .willkommen')), `${w} die Begrüßung steht da`);
    const text = await ansicht(page);
    for (const t of ['Zuerst auf den Home-Bildschirm', '•••', 'Als Web-App öffnen', 'muss an sein',
      'Zum Home-Bildschirm', 'Aktionen bearbeiten', 'leg es nicht noch einmal an']) {
      check(text.includes(t), `${w} mit „${t}"`);
    }
    // Wer Schritt für Schritt abarbeitet, soll die Frage „Liegt es schon da?"
    // lesen, bevor er ein zweites Symbol anlegt – nicht danach.
    const frageStelle = text.indexOf('Liegt Bauchbuch schon auf deinem Home-Bildschirm?');
    check(frageStelle >= 0 && frageStelle < text.indexOf('•••'),
      `${w} die Frage „Liegt Bauchbuch schon …?" steht vor den Schritten`);
    // „Gleich oben": vor den drei Punkten, nicht irgendwo darunter.
    const oben = await frage(page, () => {
      const k = [...document.querySelectorAll('#view .willkommen .karte')]
        .find((x) => (x.querySelector('h3') || {}).textContent === 'Zuerst auf den Home-Bildschirm');
      const punkte = document.querySelector('#view .willkommen ul.punkte');
      return !!k && !!punkte && !!k.querySelector('ol.schritte')
        && !!(k.compareDocumentPosition(punkte) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    check(oben, `${w} die Schritte stehen in einer eigenen Karte über den Punkten`);
    const los = await knoepfe(page, 'los');
    check(los.length === 1 && los[0].text === 'Erst mal hier anschauen',
      `${w} der Knopf heißt „Erst mal hier anschauen" (${los.map((k) => k.text).join(', ') || 'keiner'})`);
    check(los.length === 1 && !los[0].klassen.includes('btn-primary'), `${w} und ist nicht hervorgehoben`);
    check((await knoepfe(page, 'umzug-holen')).length === 0, `${w} kein „Einträge aus Safari holen" – das gibt es nur in der App`);
    check((await knoepfe(page, 'import')).length === 0, `${w} kein „Datei einlesen" – eingelesen wird in der App, nicht in Safari`);
    await merkeText('Begrüßung, Safari', page);
    await page.screenshot({ path: path.join(SHOT, 'anleitung-willkommen.png'), fullPage: true });

    // Dazu: Der zurückhaltende Knopf führt trotzdem ins Tagebuch.
    await tippe(page, '#view [data-act="los"]', 'Erst mal hier anschauen');
    check(await warteBis(page, () => !document.getElementById('tabbar').hidden, null, 3000),
      `${w} „Erst mal hier anschauen" führt ins Tagebuch`);
  });

  /* ---------- 2. Begrüßung im eingebauten Browser von WhatsApp ---------- */

  /*
   * Aus WhatsApp heraus gibt es kein „Zum Home-Bildschirm". Schritte dorthin
   * suchte man vergeblich; der einzige Weg führt über Safari.
   */
  await fall('2. Begrüßung im eingebauten Browser (WhatsApp)', async (auf) => {
    const w = '[2 Begrüßung WhatsApp]';
    const { page } = await auf({ kurz: 'Begrüßung WhatsApp', ua: KENNUNG.whatsapp, stand: NEU });
    const text = await ansicht(page);
    check(text.includes('Zuerst in Safari öffnen'), `${w} mit „Zuerst in Safari öffnen"`);
    check(text.includes('In Safari öffnen') && text.includes('•••'), `${w} und dem Weg dorthin („•••" › „In Safari öffnen")`);
    check(!text.includes('Zum Home-Bildschirm'), `${w} ohne „Zum Home-Bildschirm" – das gibt es hier nicht`);
    await merkeText('Begrüßung, WhatsApp', page);
  });

  /* ---------- 3. Begrüßung in der App, Einlesen einer Sicherung ---------- */

  /*
   * Ein frisch angelegtes Symbol fängt leer an – auch auf einem neuen iPhone
   * oder nach dem Löschen. Dann ist die Begrüßung die Stelle, an der die
   * Sicherung wieder hereinkommt. Das Einlesen muss dort bis ins Tagebuch
   * führen, und das Dateifeld muss dabei im Dokument hängen.
   */
  await fall('3. Begrüßung in der App, leer – und eine Sicherung einlesen', async (auf) => {
    const w = '[3 Begrüßung App]';
    const { page } = await auf({
      kurz: 'Begrüßung App', ua: KENNUNG.ios26, standalone: true, stand: NEU,
    });
    const text = await ansicht(page);
    check(text.includes('Das Symbol behalten'), `${w} mit „Das Symbol behalten"`);
    // Sagen, dass es geklappt hat – und dass der Link aus der Nachricht nicht
    // diese App öffnet. Das ist der Weg, auf dem sonst wieder in Safari landet,
    // was in die App gehört.
    check(text.includes('Geschafft') && text.includes('öffnet nicht diese App'),
      `${w} mit „Geschafft" und „Der Link … öffnet nicht diese App"`);
    check(text.includes('wahrscheinlich weg'), `${w} mit „wahrscheinlich weg" – vorsichtig, weil nicht belegt ist, ob iOS wirklich löscht`);
    check(!text.includes('Zuerst auf den Home-Bildschirm'), `${w} ohne die Schritte – das Symbol liegt schon da`);
    check((await knoepfe(page, 'umzug-holen')).length === 1, `${w} genau ein „Einträge aus Safari holen"`);
    check((await knoepfe(page, 'import')).length === 1, `${w} genau ein „Datei einlesen"`);
    const los = await knoepfe(page, 'los');
    check(los.length === 1 && los[0].text === 'Anfangen' && los[0].klassen.includes('btn-primary'),
      `${w} „Anfangen" ist der hervorgehobene Knopf (${los.map((k) => `${k.text} [${k.klassen.join(' ')}]`).join(', ') || 'keiner'})`);
    await merkeText('Begrüßung, App', page);

    /*
     * Die Sicherung trägt hier kein „begruesst" – so wie eine ältere Datei.
     * Ins Tagebuch kommt man danach also nur, weil das Einlesen es selbst
     * vermerkt, nicht weil es zufällig in der Datei stand.
     */
    const datei = path.join(ABLAGE, 'anleitung-sicherung.json');
    writeFileSync(datei, JSON.stringify({ eintraege: eintraege(3) }));
    await toastLeeren(page);
    const [waehler] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.locator('#view [data-act="import"]').click(),
    ]);
    // Genau in diesem Moment – die Dateiauswahl ist offen – muss das Feld im
    // Dokument hängen. Unsichtbar ja, aber nicht mit display:none: Ein
    // solches Feld behandelt Safari wie eines, das nirgends hängt.
    const feld = await frage(page, () => {
      const f = document.getElementById('sicherung-datei');
      if (!f) return null;
      return {
        haengt: f.isConnected && document.body.contains(f),
        typ: f.type,
        display: getComputedStyle(f).display,
      };
    });
    check(!!feld && feld.haengt && feld.typ === 'file',
      `${w} während der Auswahl hängt input#sicherung-datei im Dokument (${feld ? JSON.stringify(feld) : 'nicht da'})`);
    check(!!feld && feld.display !== 'none', `${w} und ist nicht mit display:none versteckt`);
    check(await waehler.element().evaluate((el) => el.id === 'sicherung-datei'),
      `${w} die Auswahl gehört zu genau diesem Feld`);
    await waehler.setFiles(datei);
    await toastAbwarten(page);
    check(await toast(page) === '3 Einträge eingelesen.', `${w} Meldung „3 Einträge eingelesen." (${await toast(page)})`);
    check(await frage(page, () => !document.getElementById('sicherung-datei')), `${w} danach ist das Feld wieder weg`);
    check(await warteBis(page, () => !document.getElementById('tabbar').hidden, null, 3000),
      `${w} die Reiterleiste ist da – es geht gleich ins Tagebuch`);
    check(await warteBis(page, (k) => {
      const s = JSON.parse(localStorage.getItem(k) || 'null');
      return !!s && s.begruesst === true && s.eintraege.length === 3;
    }, KEY, 3000), `${w} gespeichert: begruesst ist true, drei Einträge`);
  });

  /* ---------- 4.–6. „Mehr" und die Anleitung in Safari ---------- */

  await fall('4.–6. „Mehr" und die Anleitung in Safari, iOS 26, drei Einträge', async (auf) => {
    const w = '[Safari]';
    const { page } = await auf({ kurz: 'Anleitung Safari', ua: KENNUNG.ios26, stand: DREI });

    // 4. Ganz oben unter „Mehr", damit sie niemand suchen muss.
    await reiter(page, 'mehr');
    const erste = (await karten(page))[0] || null;
    check(!!erste && erste.titel === 'Anleitung' && erste.acts.includes('anleitung'),
      `${w} 4. die erste Karte unter „Mehr" ist „Anleitung" mit dem Knopf (${erste ? `„${erste.titel}"` : 'keine'})`);

    // 5. Die Anleitung selbst.
    check(await anleitungOeffnen(page), `${w} 5. „Anleitung öffnen" zeigt die Überschrift „Anleitung"`);
    check(await frage(page, () => !!document.querySelector('#tab-mehr.an')), `${w} 5. die Reiterleiste zeigt dabei „Mehr" als aktiv`);
    // Nichts öffnet sich von selbst – wer etwas aufklappt, will es lesen.
    check(await frage(page, () => document.querySelectorAll('#view details[open]').length === 0),
      `${w} 5. alle Aufklapper sind zu`);
    const liste = await karten(page);
    const start = karte(liste, 'Als App auf den Home-Bildschirm');
    check(!!start && start.acts.includes('umzug-mitnehmen'),
      `${w} 5. die Karte „Als App auf den Home-Bildschirm" mit „Einträge mitnehmen"`);
    const sichern = karte(liste, 'Sichern');
    for (const t of ['In Dateien sichern', 'iCloud Drive', 'Auf meinem iPhone', 'oben rechts auf Sichern']) {
      check(!!sichern && sichern.text.includes(t), `${w} 5. „Sichern" mit „${t}"`);
    }
    const erhalten = karte(liste, 'So bleibt dein Tagebuch erhalten');
    check(!!start && start.text.includes('sieben Tagen, an denen du Safari benutzt hast'),
      `${w} 5. „Als App auf den Home-Bildschirm" mit der Sieben-Tage-Regel`);
    for (const t of ['ein paar Wochen nicht reinschaust', 'Verlauf und Websitedaten löschen']) {
      check(!!erhalten && erhalten.text.includes(t), `${w} 5. „So bleibt dein Tagebuch erhalten" mit „${t}"`);
    }
    // Derselbe lange Satz zweimal auf einer Seite liest niemand zweimal.
    const sieben = (liste.map((k) => k.text).join(' ').match(/sieben Tagen/g) || []).length;
    check(sieben === 1, `${w} 5. die Sieben-Tage-Regel steht genau einmal auf der Seite (${sieben})`);
    // Zwei Aufklapper direkt untereinander: Jede Zeile muss groß genug sein,
    // dass ein Tipp die richtige trifft.
    const hoehen = await frage(page, () => [...document.querySelectorAll('#view details.anleitung-auf > summary')]
      .map((x) => Math.round(x.getBoundingClientRect().height)));
    check(hoehen.length === 2 && hoehen.every((h) => h >= 44),
      `${w} 5. die Aufklapper sind mindestens 44 px hoch (${hoehen.join(', ') || 'keine'})`);
    check(!karte(liste, 'Für den Arzttermin'), `${w} 5. keine Karte „Für den Arzttermin" – die Anleitung ersetzt „Mehr"`);
    const reihe = ['Als App auf den Home-Bildschirm', 'Sichern', 'So bleibt dein Tagebuch erhalten']
      .map((t) => liste.findIndex((k) => k.titel === t));
    check(reihe.every((i) => i >= 0) && reihe[0] < reihe[1] && reihe[1] < reihe[2],
      `${w} 5. Reihenfolge: Home-Bildschirm, Sichern, Erhalten (${reihe.join(', ')})`);

    await merkeText('Anleitung, Safari', page);
    await page.screenshot({ path: path.join(SHOT, 'anleitung-safari.png'), fullPage: true });

    // 6. (Safari-Hälfte) Eingelesen wird in der App. Ein Knopf hier läse die
    // Sicherung nach Safari ein – genau dorthin, wo sie verschwinden kann.
    const neu = await frage(page, () => {
      const d = document.getElementById('anleitung-neu');
      return d ? {
        text: d.textContent.replace(/\s+/g, ' ').trim(),
        acts: [...d.querySelectorAll('[data-act]')].map((b) => b.dataset.act),
      } : null;
    });
    check(!!neu && !neu.acts.includes('import'), `${w} 6. „Neues iPhone oder Symbol gelöscht?" ohne „Datei einlesen"`);
    check(!!neu && neu.text.includes('Lies die Sicherung in der App ein'), `${w} 6. dafür „Lies die Sicherung in der App ein"`);

    // 5. „‹ Zurück" führt zu „Mehr".
    await tippe(page, '#view [data-act="anleitung-zu"]', '‹ Zurück');
    check(await istMehr(page), `${w} 5. „‹ Zurück" führt zu „Mehr"`);

    // Dazu: der Knopf ganz unten auch – und zwar an den Anfang von „Mehr",
    // nicht irgendwohin in die Mitte.
    if (await anleitungOeffnen(page)) {
      await frage(page, () => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.locator('#view [data-act="anleitung-zu"]').last().click();
      await page.waitForTimeout(300);
      check(await istMehr(page), `${w} 5. „‹ Zurück zu „Mehr"" ganz unten führt zu „Mehr"`);
      const y = await frage(page, () => window.scrollY);
      check(y === 0, `${w} 5. und zeigt „Mehr" von oben (scrollY ${y})`);
    }

    // 5. Ein Tipp auf „Mehr" führt immer zu „Mehr" – auch wenn man aus der
    // Anleitung heraus woandershin gewechselt hat.
    if (await anleitungOeffnen(page)) {
      await reiter(page, 'heute');
      await reiter(page, 'mehr');
      check(await istMehr(page), `${w} 5. nach „Tag" und wieder „Mehr" steht „Mehr" da, nicht die Anleitung`);
    }

    /*
     * Dazu: „Einträge mitnehmen" aus der Anleitung, und die Zwischenablage
     * verweigert sich. Die Meldung schickt sie unter „Mehr" zum Text – dann
     * muss dort „Mehr" stehen und der Text, nicht wieder die Anleitung.
     */
    if (await anleitungOeffnen(page)) {
      await frage(page, () => {
        Clipboard.prototype.writeText = () => Promise.reject(new DOMException('verweigert', 'NotAllowedError'));
      });
      await toastLeeren(page);
      await tippe(page, '#view [data-act="umzug-mitnehmen"]', 'Einträge mitnehmen');
      await toastAbwarten(page);
      check((await toast(page)).includes('markieren und kopieren'), `${w} Mitnehmen ohne Zwischenablage: die Meldung schickt zum Text`);
      check(await istMehr(page) && await frage(page, () => !!document.getElementById('sicherungsText')),
        `${w} Mitnehmen ohne Zwischenablage: „Mehr" mit der Textfläche, nicht die Anleitung`);
    }
  });

  /* ---------- 4., 6., 9., 10., 11. In der App ---------- */

  await fall('4., 6., 9.–11. „Mehr" und die Anleitung in der App, drei Einträge', async (auf) => {
    const w = '[App]';
    const { page } = await auf({
      kurz: 'Anleitung App', ua: KENNUNG.ios26, standalone: true, stand: DREI,
    });

    // 4.
    await reiter(page, 'mehr');
    const erste = (await karten(page))[0] || null;
    check(!!erste && erste.titel === 'Anleitung' && erste.acts.includes('anleitung'),
      `${w} 4. die erste Karte unter „Mehr" ist „Anleitung" mit dem Knopf (${erste ? `„${erste.titel}"` : 'keine'})`);

    // 6. In der App zählt: das Symbol behalten. Die Sieben-Tage-Regel gilt
    // hier nicht – wer sie hier liest, glaubt, er sei noch in Gefahr.
    check(await anleitungOeffnen(page), `${w} 6. die Anleitung geht auf`);
    const text = await ansicht(page);
    const liste = await karten(page);
    check(!!karte(liste, 'Läuft als App'), `${w} 6. mit der Karte „Läuft als App"`);
    for (const t of ['Lösch das Bauchbuch-Symbol nicht', 'Ein paar Wochen nicht reinschauen',
      'Leg es kein zweites Mal an', 'deine Einträge bleiben im ersten']) {
      check(text.includes(t), `${w} 6. mit „${t}"`);
    }
    // Löschen kostet wahrscheinlich die Einträge, ein zweites Symbol nicht –
    // es fängt nur leer an. Stünde beides in einem Satz mit „sonst weg",
    // glaubte sie nach einem zweiten Symbol, alles sei verloren.
    const loeschPunkt = await frage(page, () => [...document.querySelectorAll('#view ul.punkte li')]
      .map((li) => li.textContent.replace(/\s+/g, ' ').trim())
      .find((t) => t.startsWith('Lösch das Bauchbuch-Symbol nicht')) || '');
    check(!!loeschPunkt && !loeschPunkt.includes('zweit'),
      `${w} 6. „Lösch das Symbol nicht" ist ein eigener Punkt, ohne das zweite Symbol („${loeschPunkt}")`);
    for (const t of ['Verlauf und Websitedaten', 'sieben Tage']) {
      check(!text.includes(t), `${w} 6. ohne „${t}" – das gilt in Safari, nicht hier`);
    }
    const neu = await frage(page, () => {
      const d = document.getElementById('anleitung-neu');
      const keine = d ? [...d.querySelectorAll('p')]
        .map((p) => p.textContent.replace(/\s+/g, ' ').trim())
        .find((t) => t.startsWith('Keine Sicherung?')) : null;
      return d ? {
        summary: (d.querySelector('summary') || {}).textContent || '',
        text: d.textContent.replace(/\s+/g, ' ').trim(),
        acts: [...d.querySelectorAll('[data-act]')].map((b) => b.dataset.act),
        keine: keine || '',
      } : null;
    });
    check(!!neu && neu.summary.trim() === 'Neues iPhone oder Symbol gelöscht?',
      `${w} 6. der Aufklapper „Neues iPhone oder Symbol gelöscht?" (${neu ? neu.summary.trim() : 'fehlt'})`);
    check(!!neu && neu.acts.includes('import'), `${w} 6. darin „Datei einlesen"`);
    check(!!neu && neu.acts.includes('umzug-holen'), `${w} 6. darin „Aus Safari holen"`);
    check(!!neu && neu.text.includes('Text einlesen'),
      `${w} 6. darin der Weg für eine Sicherung als Text („Text einlesen")`);
    // Die Adresse kommt aus dem, was gerade läuft – nicht fest aus dem Code.
    check(!!neu && neu.text.includes(`127.0.0.1:${PORT}/`), `${w} 6. darin die Adresse, unter der Bauchbuch gerade läuft (127.0.0.1:${PORT}/)`);
    check(!!neu && !neu.text.includes('index.html'), `${w} 6. ohne „index.html" – die tippt niemand ab`);

    await merkeText('Anleitung, App', page);
    await page.screenshot({ path: path.join(SHOT, 'anleitung-app.png'), fullPage: true });
    await frage(page, () => {
      document.querySelectorAll('#view details').forEach((d) => { d.open = false; });
      window.scrollTo(0, 0);
    });

    /*
     * 11. und 9. (abgelehnt): Wer „Neues iPhone?" aufgeklappt hat und dabei
     * sichert, soll danach an derselben Stelle weiterlesen. Nach dem Sichern
     * wird neu gezeichnet; die Marke am alten Element zeigt, dass das
     * wirklich geschehen ist – sonst wäre „noch offen" geschenkt.
     */
    await tippe(page, '#anleitung-neu > summary', 'Neues iPhone oder Symbol gelöscht?');
    check(await frage(page, () => !!document.getElementById('anleitung-neu') && document.getElementById('anleitung-neu').open),
      `${w} 11. der Aufklapper geht auf`);
    await frage(page, () => {
      document.getElementById('anleitung-neu').__alt = true;
      window.__teilen = 'nein';
    });
    await toastLeeren(page);
    await tippe(page, '#anleitung-sichern [data-act="export"]', 'Als Datei sichern');
    await toastAbwarten(page);
    check(await toast(page) === 'Nicht gesichert – abgebrochen.',
      `${w} 9. Teilen-Blatt weggewischt: „Nicht gesichert – abgebrochen." (${await toast(page)})`);
    const neuGezeichnet = await warteBis(page, () => {
      const d = document.getElementById('anleitung-neu');
      return !!d && !d.__alt;
    }, null, 3000);
    check(neuGezeichnet, `${w} 11. danach wurde neu gezeichnet`);
    check(await frage(page, () => !!document.getElementById('anleitung-neu') && document.getElementById('anleitung-neu').open),
      `${w} 11. #anleitung-neu ist danach noch offen`);
    check(await frage(page, () => !!document.getElementById('anleitung-update') && !document.getElementById('anleitung-update').open),
      `${w} 11. #anleitung-update bleibt zu – offen bleibt nur, was offen war`);
    await page.waitForTimeout(400); // der Speicher schreibt gesammelt
    check(!(await zustand(page)).lastBackup, `${w} 9. abgebrochen heißt: nicht als gesichert vermerkt`);

    // 9. Das Teilen-Blatt geht durch.
    await frage(page, () => { window.__teilen = 'ja'; });
    await toastLeeren(page);
    await tippe(page, '#anleitung-sichern [data-act="export"]', 'Als Datei sichern');
    await toastAbwarten(page);
    const meldung = await toast(page);
    check(meldung.includes('wenn du zum Schluss auf „Sichern“ getippt hast'),
      `${w} 9. Meldung „…wenn du zum Schluss auf „Sichern“ getippt hast" (${meldung})`);
    check(!meldung.includes('Auf meinem iPhone'), `${w} 9. und kein Rat zu „Auf meinem iPhone" – das ist mit dem iPhone weg`);
    check(await warteBis(page, (k) => {
      const s = JSON.parse(localStorage.getItem(k) || 'null');
      return !!s && !!s.lastBackup && s.lastBackup.anzahl === 3;
    }, KEY, 3000), `${w} 9. lastBackup ist gesetzt, mit drei Einträgen`);
    check(await istAnleitung(page), `${w} 9. die Anleitung bleibt offen`);
    const sichern = karte(await karten(page), 'Sichern');
    check(!!sichern && sichern.text.includes('Zuletzt gesichert am'), `${w} 9. „Sichern" zeigt „Zuletzt gesichert am"`);
    const geteilt = await frage(page, () => window.__geteilt || []);
    const letzte = geteilt[geteilt.length - 1] || {};
    let inhalt = null;
    try { inhalt = JSON.parse(letzte.text); } catch { inhalt = null; }
    check(/^bauchbuch-\d{4}-\d{2}-\d{2}\.json$/.test(letzte.name || '') && !!inhalt && inhalt.eintraege.length === 3,
      `${w} 9. geteilt wurde eine Datei mit dem ganzen Tagebuch (${letzte.name || 'keine'})`);

    // 10. „Als Text" aus der Anleitung führt zur Textfläche unter „Mehr".
    await tippe(page, '#anleitung-sichern [data-act="sicherung-text"]', 'Als Text');
    check(await istMehr(page), `${w} 10. „Als Text" führt zu „Mehr"`);
    const lage = await imBild(page, 'sicherungsText');
    check(lage.da && lage.sichtbar, `${w} 10. #sicherungsText ist da und sichtbar`);
    check(!!lage.imBild, `${w} 10. und liegt im Bild, über der Reiterleiste (${lage.oben}–${lage.unten} von ${lage.unterkante})`);

    /*
     * Dazu: Der Knopf, den „Keine Sicherung? …" in der App nennen lässt, muss
     * es hier auch geben. Wer die Anleitung in der App liest, ist an der
     * Begrüßung schon vorbei; unter „Mehr" heißt der Knopf „Aus Safari
     * holen". Sucht sie „Einträge aus Safari holen", findet sie ihn nicht.
     * Geprüft wird der letzte Name in Anführungszeichen – dort steht, worauf
     * man in der App tippen soll.
     */
    const namen = [...((neu && neu.keine) || '').matchAll(/„([^“]+)“/g)].map((m) => m[1]);
    const genannt = namen[namen.length - 1] || '';
    const mehrKnoepfe = await frage(page, () => [...document.querySelectorAll('#view button[data-act]')]
      .map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
    check(
      !!genannt && mehrKnoepfe.includes(genannt),
      `${w} der Knopf, den „Keine Sicherung?" in der App nennt („${genannt}"), steht unter „Mehr"`,
    );

    /*
     * Dazu: Ein Neuladen – etwa wenn eine neue Fassung kommt, während sie kurz
     * in Safari nachsieht, wozu die Anleitung selbst auffordert – lässt sie
     * an derselben Stelle: Anleitung offen, Aufklapper offen.
     */
    await reiter(page, 'mehr');
    if (await anleitungOeffnen(page)) {
      await tippe(page, '#anleitung-neu > summary', 'Neues iPhone oder Symbol gelöscht?');
      await frage(page, () => {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = '__neuLaden';
        b.dataset.act = 'neu-laden';
        document.getElementById('view').appendChild(b);
      });
      await Promise.all([
        page.waitForEvent('load', { timeout: 10000 }),
        page.locator('#__neuLaden').click(),
      ]);
      await bereitStehen(page);
      check(await istAnleitung(page), `${w} nach einem Neuladen steht wieder die Anleitung da`);
      check(await frage(page, () => !!document.getElementById('anleitung-neu') && document.getElementById('anleitung-neu').open),
        `${w} und „Neues iPhone oder Symbol gelöscht?" ist noch offen`);
    }
  });

  /* ---------- 7. und 8. (leer) Leere App ---------- */

  /*
   * Wer in der App „Anfangen" getippt hat, ohne vorher zu holen, findet den
   * Weg aus Safari in der Anleitung wieder.
   */
  await fall('7. Leere App, schon begrüßt', async (auf) => {
    const w = '[7 App leer]';
    const { page } = await auf({
      kurz: 'Anleitung App leer', ua: KENNUNG.ios26, standalone: true, stand: LEER,
    });
    await reiter(page, 'mehr');
    check(await anleitungOeffnen(page), `${w} die Anleitung geht auf`);
    const liste = await karten(page);
    const holen = karte(liste, 'Schon in Safari eingetragen?');
    check(!!holen && holen.acts.includes('umzug-holen'), `${w} 7. mit „Schon in Safari eingetragen?" und „Einträge holen"`);
    const sichern = karte(liste, 'Sichern');
    check(!!sichern && sichern.text.includes('Noch nichts zu sichern.'), `${w} 8. „Sichern": „Noch nichts zu sichern."`);
    await merkeText('Anleitung, App ohne Einträge', page);

    /*
     * Dazu: „Einträge holen" aus der Anleitung, und die Zwischenablage lässt
     * sich nicht lesen. Dann verspricht die Meldung ein Feld zum Einsetzen
     * unter „Mehr" – also muss „Mehr" dastehen, mit diesem Feld.
     */
    await frage(page, () => {
      Clipboard.prototype.readText = () => Promise.reject(new DOMException('verweigert', 'NotAllowedError'));
    });
    await toastLeeren(page);
    await tippe(page, '#view [data-act="umzug-holen"]', 'Einträge holen');
    await toastAbwarten(page);
    check(await frage(page, () => !!document.querySelector('#tab-mehr.an')
      && !!document.querySelector('#view textarea[data-act="einfuegen-text"]')),
    `${w} Holen ohne Zwischenablage: „Mehr" mit dem Feld zum Einsetzen`);
    check(!(await istAnleitung(page)), `${w} Holen ohne Zwischenablage: „Mehr", nicht die Anleitung`);
  });

  /* ---------- 8. Der Stand in der Karte „Sichern" ---------- */

  /*
   * Ein Satz, der sagt, wo man steht. „Seitdem 5 neue Einträge" ist der
   * Grund, jetzt zu sichern – und er muss stimmen, sonst glaubt man ihm nicht.
   */
  for (const [name, stand, erwartet, nicht] of [
    ['20 Einträge, nie gesichert', ZWANZIG, ['Noch nie gesichert.'], ['Zuletzt gesichert']],
    ['20 Einträge, zuletzt mit 15 gesichert', { ...ZWANZIG, lastBackup: { on: vorTagen(2), anzahl: 15 } },
      ['Zuletzt gesichert am', 'Seitdem 5 neue Einträge.'], ['Noch nie']],
    ['20 Einträge, zuletzt mit 20 gesichert', { ...ZWANZIG, lastBackup: { on: vorTagen(2), anzahl: 20 } },
      ['Zuletzt gesichert am'], ['Seitdem', 'Noch nie']],
  ]) {
    // eslint-disable-next-line no-await-in-loop
    await fall(`8. Stand: ${name}`, async (auf) => {
      const w = `[8 ${name}]`;
      const { page } = await auf({ kurz: `Stand ${name}`, ua: KENNUNG.ios26, stand });
      await reiter(page, 'mehr');
      await anleitungOeffnen(page);
      const sichern = karte(await karten(page), 'Sichern');
      for (const t of erwartet) check(!!sichern && sichern.text.includes(t), `${w} mit „${t}"`);
      for (const t of nicht) check(!!sichern && !sichern.text.includes(t), `${w} ohne „${t}"`);
    });
  }

  /* ---------- 10. „Als Text" vom Tag-Reiter ---------- */

  /*
   * Auf „Tag" erinnert eine Karte ans Sichern. Ihr „Als Text" vermerkte früher
   * „gesichert" und zeigte nichts – die Textfläche gibt es nur unter „Mehr".
   */
  await fall('10. „Als Text" vom Tag-Reiter, iPhone, 20 Einträge', async (auf) => {
    const w = '[10 Tag iPhone]';
    const { ctx, page } = await auf({ kurz: 'Tag iPhone', ua: KENNUNG.ios26, stand: ZWANZIG });
    const erinnerung = karte(await karten(page), 'Zeit für eine Sicherung');
    check(!!erinnerung, `${w} die Erinnerung ans Sichern steht auf „Tag"`);
    for (const t of ['So geht’s', 'In Dateien sichern', 'iCloud Drive', 'Auf meinem iPhone']) {
      check(!!erinnerung && erinnerung.text.includes(t), `${w} mit „${t}"`);
    }
    // „Als Datei" öffnet das Teilen-Blatt sofort. Wer von oben liest, muss
    // vorher wissen, was darin zu wählen ist.
    const vorKnoepfen = await frage(page, () => {
      const k = [...document.querySelectorAll('#view .karte')]
        .find((x) => (x.querySelector('h3') || {}).textContent === 'Zeit für eine Sicherung');
      const hilfe = k ? [...k.querySelectorAll('p')].find((x) => x.textContent.replace(/\s+/g, ' ').includes('So geht')) : null;
      const reihe = k ? k.querySelector('.reihe') : null;
      return !!hilfe && !!reihe && !!(hilfe.compareDocumentPosition(reihe) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    check(vorKnoepfen, `${w} die Hilfe steht vor den Knöpfen`);
    check(!!erinnerung && erinnerung.text.includes('hier in Safari – wird dieser Speicher gelöscht'),
      `${w} „hier in Safari – wird dieser Speicher gelöscht"`);
    await page.locator('#view .karte', { has: page.locator('h3', { hasText: 'Zeit für eine Sicherung' }) })
      .locator('[data-act="sicherung-text"]').click();
    await page.waitForTimeout(300);
    check(await istMehr(page), `${w} „Als Text" führt zu „Mehr"`);
    const lage = await imBild(page, 'sicherungsText');
    check(lage.da && lage.sichtbar, `${w} #sicherungsText ist da und sichtbar`);
    check(!!lage.imBild, `${w} und liegt im Bild, über der Reiterleiste (${lage.oben}–${lage.unten} von ${lage.unterkante})`);
    // Den Text aufmachen ist noch keine Sicherung. Erst „Kopieren" zählt –
    // sonst verschwände die Erinnerung, ohne dass irgendwo eine Kopie liegt.
    await page.waitForTimeout(400);
    check(!(await zustand(page)).lastBackup, `${w} „Als Text" allein gilt nicht als gesichert`);
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await tippe(page, '#view [data-act="sicherung-kopieren"]', 'Kopieren');
    check(await warteBis(page, (k) => {
      const st = JSON.parse(localStorage.getItem(k) || 'null');
      return !!st && !!st.lastBackup && st.lastBackup.anzahl === 20;
    }, KEY, 3000), `${w} erst „Kopieren" vermerkt die Sicherung`);
  });

  await fall('10. Tag-Reiter auf dem Rechner: keine Zeile zum Teilen-Blatt', async (auf) => {
    const w = '[10 Tag Rechner]';
    // Mit Teilen-Stub: Die Zeile hängt am Apple-Gerät, nicht nur daran, dass
    // ein Browser teilen kann.
    const { page } = await auf({
      kurz: 'Tag Rechner', ua: KENNUNG.desktop, viewport: GROSS, stand: ZWANZIG,
    });
    const erinnerung = karte(await karten(page), 'Zeit für eine Sicherung');
    check(!!erinnerung, `${w} die Erinnerung ans Sichern steht auf „Tag"`);
    check(!!erinnerung && !erinnerung.text.includes('In Dateien sichern'), `${w} ohne „In der Liste In Dateien sichern"`);
  });

  /*
   * Dazu: ein iPhone, dessen Browser nicht teilen kann. Dann gibt es kein
   * Teilen-Blatt, also auch keine Schritte darin – nur den Rat, wohin die
   * Datei gehört.
   */
  await fall('10. (dazu) iPhone ohne Teilen-Blatt', async (auf) => {
    const w = '[ohne Teilen]';
    const { page } = await auf({
      kurz: 'ohne Teilen', ua: KENNUNG.ios26, stand: ZWANZIG, teilen: false,
    });
    const erinnerung = karte(await karten(page), 'Zeit für eine Sicherung');
    check(!!erinnerung && !erinnerung.text.includes('In Dateien sichern'), `${w} „Tag": keine Schritte für ein Teilen-Blatt, das es nicht gibt`);
    await reiter(page, 'mehr');
    await anleitungOeffnen(page);
    const sichern = karte(await karten(page), 'Sichern');
    check(!!sichern && sichern.text.includes('Leg die Datei an einen Ort, an den du auch ohne dieses iPhone kommst'),
      `${w} Anleitung: „Leg die Datei an einen Ort, an den du auch ohne dieses iPhone kommst"`);
    check(!!sichern && !sichern.text.includes('In Dateien sichern') && sichern.acts.includes('export'),
      `${w} Anleitung: der Knopf zum Sichern, ohne die Schritte im Teilen-Blatt`);
  });

  /* ---------- 12. iPad unter iPadOS 26 ---------- */

  /*
   * Das iPad meldet sich als Mac. Erkennt die App es, heißt es „iPad", das
   * Update „iPadOS-Update", und das Teilen-Symbol sitzt oben rechts – Safari
   * hat dort keine Leiste unten.
   */
  await fall('12. iPad, iPadOS 26 (meldet sich als Mac, fünf Berührungspunkte)', async (auf) => {
    const w = '[12 iPad]';
    const { page } = await auf({
      kurz: 'iPad', ua: KENNUNG.mac26, beruehrung: 5, viewport: IPAD, stand: DREI,
    });
    await reiter(page, 'mehr');
    check(await anleitungOeffnen(page), `${w} die Anleitung geht auf`);
    await alleAuf(page);
    const text = await ansicht(page);
    for (const t of ['Auf meinem iPad', 'iPadOS-Update', 'Oben rechts auf das Teilen-Symbol', 'Neues iPad oder Symbol gelöscht?']) {
      check(text.includes(t), `${w} mit „${t}"`);
    }
    check(!/unten rechts/i.test(text), `${w} ohne „unten rechts" – das ist das iPhone`);
    check(!text.includes('iPhone'), `${w} und nirgends „iPhone"`);
    await merkeText('Anleitung, iPad', page);
  });

  /*
   * Dazu: Ein iPad ist kein Telefon. Der Satz zum Speicher nennt das Gerät –
   * und begründete früher im selben Atemzug mit „ein Telefon kann verloren
   * gehen".
   */
  await fall('12. (dazu) iPad als App, Speicher zugesagt', async (auf) => {
    const w = '[12 iPad App]';
    const { ctx, page } = await auf({
      kurz: 'iPad App', ua: KENNUNG.mac26, beruehrung: 5, viewport: IPAD, standalone: true, stand: DREI,
    });
    await ctx.addInitScript(() => {
      StorageManager.prototype.persisted = async () => true;
      StorageManager.prototype.persist = async () => true;
    });
    await page.reload({ waitUntil: 'load' });
    await bereitStehen(page);
    await reiter(page, 'mehr');
    await page.waitForTimeout(300);
    const sicherung = karte(await karten(page), 'Sicherung');
    check(!!sicherung && sicherung.text.includes('Dauerhafter Speicher: zugesagt') && sicherung.text.includes('dein iPad kann verloren gehen'),
      `${w} „zugesagt … dein iPad kann verloren gehen"`);
    check(!!sicherung && !sicherung.text.includes('Telefon'), `${w} und nirgends „Telefon"`);
  });

  /*
   * Dazu: Chrome auf dem iPhone. Die Sieben-Tage-Regel ist für Safari belegt,
   * nicht für Chrome – also steht sie dort nicht, und die Einträge liegen
   * „hier im Browser", nicht „in Safari".
   */
  await fall('12. (dazu) Chrome auf dem iPhone', async (auf) => {
    const w = '[Chrome iPhone]';
    const { page } = await auf({ kurz: 'Chrome iPhone', ua: KENNUNG.crios, stand: DREI });
    await reiter(page, 'mehr');
    check(await anleitungOeffnen(page), `${w} die Anleitung geht auf`);
    const text = await ansicht(page);
    check(text.includes('nur hier im Browser auf diesem iPhone'), `${w} „Deine Einträge sind nur hier im Browser auf diesem iPhone"`);
    check(text.includes('trägst immer an derselben Stelle ein'), `${w} mit dem Grund für den Home-Bildschirm, der hier gilt`);
    for (const t of ['sieben Tagen', 'Verlauf und Websitedaten']) check(!text.includes(t), `${w} ohne „${t}" – das ist Safari`);
    await merkeText('Anleitung, Chrome auf dem iPhone', page);
  });

  /* ---------- 4. Keine Anleitung auf anderen Geräten ---------- */

  /*
   * Die Anleitung erklärt iCloud Drive, das Teilen-Blatt und ein Symbol auf
   * dem Home-Bildschirm. Wer kein iPhone hat, liest dort von einem Gerät, das
   * er nicht hat – und sucht Knöpfe, die es bei ihm nicht gibt.
   */
  for (const [name, lage] of [
    ['Android', { ua: KENNUNG.android }],
    ['Rechner', { ua: KENNUNG.desktop, viewport: GROSS }],
    ['Mac (dieselbe Kennung wie das iPad, ohne Berührung)', { ua: KENNUNG.mac26, viewport: GROSS }],
  ]) {
    // eslint-disable-next-line no-await-in-loop
    await fall(`4. „Mehr" auf ${name}`, async (auf) => {
      const w = `[4 ${name.split(' ')[0]}]`;
      const { page } = await auf({ kurz: name, ...lage, stand: DREI });
      await reiter(page, 'mehr');
      const liste = await karten(page);
      check(liste.length > 3, `${w} „Mehr" ist gezeichnet (${liste.length} Karten)`);
      check(!karte(liste, 'Anleitung'), `${w} keine Karte „Anleitung"`);
      check((await knoepfe(page, 'anleitung')).length === 0, `${w} und nirgends ein Knopf „Anleitung öffnen"`);
    });
  }

  /* ---------- 14. Bei 320 Pixel Breite ---------- */

  /*
   * Die Schritte enthalten lange Wörter („Home-Bildschirm", „Aktionen
   * bearbeiten") und eine Adresse. Läuft eine Zeile über den Rand, wischt man
   * auf dem Telefon seitwärts und verliert die Zeile, die man gerade liest.
   */
  for (const [name, lage, anleitung] of [
    ['Begrüßung, Safari', { ua: KENNUNG.ios26, stand: NEU }, false],
    ['Anleitung, Safari', { ua: KENNUNG.ios26, stand: DREI }, true],
    ['Anleitung, App', { ua: KENNUNG.ios26, standalone: true, stand: DREI }, true],
  ]) {
    // eslint-disable-next-line no-await-in-loop
    await fall(`14. ${name}, 320 Pixel breit`, async (auf) => {
      const w = `[14 ${name}]`;
      const { page } = await auf({ kurz: `320 ${name}`, ...lage, viewport: SCHMAL });
      if (anleitung) {
        await reiter(page, 'mehr');
        check(await anleitungOeffnen(page), `${w} die Anleitung geht auf`);
      }
      await alleAuf(page);
      await page.waitForTimeout(200);
      const masse = await frage(page, () => ({
        breit: document.documentElement.scrollWidth,
        fenster: window.innerWidth,
      }));
      check(masse.breit <= masse.fenster, `${w} nichts ragt über den Rand (scrollWidth ${masse.breit}, innerWidth ${masse.fenster})`);
    });
  }

  /* ---------- 13. Die Wörter ---------- */

  /*
   * Gelesen wird das von jemandem ohne Technikkenntnis, auf einem iPhone mit
   * deutschen Menüs. Also:
   *   * keine Technikwörter;
   *   * „Home-Bildschirm", wie Apple es im Menü schreibt – wer „Startbildschirm"
   *     liest und „Zum Home-Bildschirm" sucht, stockt;
   *   * „Web-App" nur im Namen des Schalters, den es wirklich gibt;
   *   * keine Versprechen, die niemand halten kann;
   *   * keine Menünamen zum Löschen – für iOS 26 auf Deutsch nicht belegt,
   *     und wer sie liest, probiert sie aus;
   *   * kein Rat, die Sicherung per Mail zu schicken – ein Tagebuch über den
   *     eigenen Körper gehört nicht in ein Postfach.
   */
  console.log('\n— 13. Wortprüfung');
  const VERBOTEN = [
    [/localStorage|PWA|Service ?Worker|JSON|Cache/i, 'kein Technikwort'],
    [/Startbildschirm/, 'kein „Startbildschirm"'],
    [/garantiert|für immer|immer erhalten|30 Tage|nie verloren/, 'kein Versprechen'],
    [/Lesezeichen löschen|App entfernen|Vom Home-Bildschirm entfernen/, 'kein Menüname zum Löschen'],
    [/Mail/, 'kein „Mail"'],
  ];
  const sollTexte = ['Begrüßung, Safari', 'Begrüßung, App', 'Begrüßung, WhatsApp',
    'Anleitung, Safari', 'Anleitung, App', 'Anleitung, iPad'];
  for (const wo of sollTexte) {
    check(texte.some((t) => t.wo === wo && t.text.length > 300), `[13] der Text „${wo}" ist eingesammelt`);
  }
  for (const { wo, text } of texte) {
    for (const [muster, was] of VERBOTEN) {
      const treffer = muster.exec(text);
      check(!treffer, `[13 ${wo}] ${was}${treffer ? ` (steht da: „${treffer[0]}")` : ''}`);
    }
    const webApp = (text.match(/Web-App/g) || []).length;
    const schalter = (text.match(/Als Web-App öffnen/g) || []).length;
    check(webApp === schalter, `[13 ${wo}] „Web-App" nur in „Als Web-App öffnen" (${webApp} gegen ${schalter})`);
  }

  /* ---------- 15. Kein Fehler in der Seite ---------- */

  console.log('');
  check(alleFehler.length === 0, `15. kein pageerror in irgendeiner Lage (${alleFehler.join(' | ') || 'keiner'})`);
} finally {
  await browser.close();
  await server.zu();
}

ende();
