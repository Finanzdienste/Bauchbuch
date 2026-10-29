/*
 * Welches Gerät bekommt welche Anleitung auf den Startbildschirm?
 *
 * Auf dem iPhone ist der Startbildschirm keine Bequemlichkeit: In Safari darf
 * iOS die Einträge einer Seite löschen, die eine Woche lang nicht geöffnet
 * wurde, die App auf dem Startbildschirm ist davon ausgenommen. Die Karte, die
 * dorthin führt, ist also nur so gut wie die Schritte darin – und die hängen
 * am Gerät, am System und am Browser. Eine falsche Anleitung sieht man dem
 * Code nicht an. Man sieht sie nur, wenn man mit genau der Kennung kommt, mit
 * der ein bestimmtes Telefon sich meldet.
 *
 * DIE FALLEN, UM DIE ES GEHT (siehe geraet() in js/app.js)
 *
 *   * Safari unter iOS 26 meldet eine eingefrorene Systemversion
 *     („iPhone OS 18_6"). Wer die Systemversion liest, zeigt einem iOS-26-
 *     Telefon die alte Anleitung ohne „•••" – und den Schalter „Als Web-App
 *     öffnen" findet dann niemand. Verlässlich ist nur „Version/26".
 *   * Ein iPad meldet sich in Safari als Mac, mit Buchstabe für Buchstabe
 *     derselben Kennung wie Safari auf dem Mac. Nur die Berührungspunkte
 *     unterscheiden die beiden. Fehlt diese Unterscheidung, bekommt das iPad
 *     den Text fürs Android-Browsermenü.
 *   * Chrome auf dem iPhone hat das Teilen-Symbol oben rechts, nicht unten.
 *   * Aus WhatsApp heraus landet man im eingebauten Browser der App; von dort
 *     gibt es keinen Weg auf den Startbildschirm, nur „In Safari öffnen".
 *   * Android und Desktop bekommen keinen Hinweis oben auf dem Tag-Reiter –
 *     dort ist der Speicher nicht in derselben Gefahr –, aber unter „Mehr"
 *     den Weg übers Browsermenü.
 *   * Läuft die App schon vom Startbildschirm, ist jede Anleitung falsch.
 *     Erkannt wird das auf zwei Wegen (display-mode und navigator.standalone);
 *     jeder Weg muss allein genügen, denn nicht jedes Gerät kennt beide.
 *
 * WIE DAS HIER NACHGESTELLT WIRD
 *
 * Für jede Kennung ein eigener Browser-Kontext – eigener Speicher, eigene
 * Kennung, eigene Stubs –, so wie jedes Telefon für sich. Chromium ist kein
 * Safari; nachgestellt wird nur, was geraet() und laeuftAlsApp() lesen:
 * die Kennung, maxTouchPoints, matchMedia und navigator.standalone.
 *
 * WAS ER NICHT PRÜFT
 *
 *   * Ob die Ortsangaben auf einem echten Gerät stimmen. Geprüft wird, dass
 *     jedes Gerät seine eigene Anleitung bekommt – das iPad unter iPadOS 26
 *     „oben rechts", weil Safari dort keine Leiste unten hat. Ob Apple die
 *     Knöpfe dort lässt, weiß nur ein echtes iPad.
 *   * Ob ein echtes Safari die Frage nach dauerhaftem Speicher
 *     (storage.persist) beantwortet. Die Apple-Fälle stellen den Browser nach,
 *     der schweigt. Die Sätze zur Wochenregel stehen bei Apple aber auch da,
 *     wenn Safari nein sagt.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Test gegen eine (veränderte)
 * Kopie der App statt gegen das Repo – so lässt sich prüfen, dass er einen
 * eingebauten Fehler auch bemerkt.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import {
  ROOT, KEY, HANDY, SHOT, vorTagen, pruefer,
} from './umgebung.mjs';
import { kopieServer, frage, warteBis } from './vorrat.mjs';

const { check, ende } = pruefer();

const ORDNER = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8241–8249: Der gemeinsame Server auf 8199/8200 gehört
// tests/lauf.mjs, und dort laufen andere Tests gleichzeitig.
const PORT = Number(process.env.BAUCHBUCH_PORT_GERAETE || 8241);
if (PORT < 8241 || PORT > 8249) throw new Error(`Port ${PORT} liegt außerhalb von 8241–8249`);

/* ---------- Die Kennungen ---------- */

const KENNUNG = {
  // Safari unter iOS 26: Systemversion eingefroren auf 18_6, nur Version/26 stimmt.
  ios26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  ios17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  // Safari auf dem iPad – und genauso Safari auf dem Mac. Das ist der Witz.
  mac26: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  mac17: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/17.5 Safari/605.1.15',
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

/* ---------- Was im Speicher steht ---------- */

// Ein paar gewöhnliche Mahlzeiten – genug, dass die App „schon eingetragen"
// sieht und den Umzug anbietet. Relativ zu heute, damit sie nie veralten.
const MIT_EINTRAEGEN = {
  begruesst: true,
  tab: 'heute',
  eintraege: [
    { id: 'g1', am: vorTagen(2), um: '08:00', art: 'essen', was: 'Haferbrei', tags: [], portion: 'normal' },
    { id: 'g2', am: vorTagen(1), um: '12:30', art: 'essen', was: 'Reis mit Gemüse', tags: [], portion: 'normal' },
    { id: 'g3', am: vorTagen(0), um: '07:45', art: 'essen', was: 'Brot mit Käse', tags: [], portion: 'normal' },
  ],
};
// Begrüßt, aber noch nichts eingetragen – frisch angefangen.
const LEER = { begruesst: true, tab: 'heute' };

/* ---------- Kleine Helfer ---------- */

const sauber = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// Die vier Gesichter der Startbildschirm-Karte (startbildschirmKarte()).
const IOS_TITEL = 'Als App auf den Startbildschirm';
const ANDERE_TITEL = 'Auf den Startbildschirm';
const APP_TITEL = 'Läuft als App';
const MAC_TITEL = 'Ins Dock';
const TITEL = [IOS_TITEL, ANDERE_TITEL, APP_TITEL, MAC_TITEL];

/**
 * Alles, was vor dem ersten Skript der Seite stehen muss.
 *
 * Läuft bei jedem Laden, auch nach page.reload(). Deshalb wird der Speicher
 * nur gefüllt, wenn er leer ist – sonst setzte jedes Neuladen ein
 * „Nicht mehr zeigen" wieder zurück, und der Test prüfte nichts.
 */
function vorbereiten({
  key, stand, beruehrung, displayMode, standalone, ohnePersist, persistNein,
}) {
  try {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(stand));
  } catch { /* about:blank hat keinen Speicher */ }

  // Das iPad verrät sich nur hier. Chromium ohne Touch meldet 0 – wie ein Mac.
  if (beruehrung !== undefined) {
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => beruehrung, configurable: true });
  }

  // Nur display-mode, nicht navigator.standalone: So meldet sich eine
  // installierte App, deren Browser das alte Safari-Feld nicht kennt.
  if (displayMode) {
    const echt = window.matchMedia.bind(window);
    window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q)
      ? {
        matches: true,
        media: q,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; },
      }
      : echt(q));
  }

  // Nur navigator.standalone: das Feld, an dem Safari selbst eine App vom
  // Startbildschirm erkennt.
  if (standalone) {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  }

  // Die Sätze zur Wochenregel zeigt die App nur, wenn der Browser zur
  // Speicherfrage schweigt (ui.speicher === null: speicherFestnageln() kehrt
  // ohne persist() gleich um). Chromium antwortet; also wird die Frage in den
  // Apple-Fällen weggenommen. Ob ein echtes Safari schweigt, prüft dieser
  // Test nicht – siehe oben.
  if (ohnePersist && !persistNein && window.StorageManager) {
    delete window.StorageManager.prototype.persist;
  }
  // So antwortet Safari ab iOS 17 meist: Es kennt die Frage und sagt nein.
  if (persistNein && window.StorageManager) {
    window.StorageManager.prototype.persist = async () => false;
    window.StorageManager.prototype.persisted = async () => false;
  }

  // Ob ein kopfloses Chromium diese Seite für installierbar hält, ist hier
  // nicht die Frage. Ein echtes 'beforeinstallprompt' würde jede Anleitung
  // durch den Knopf „Installieren" ersetzen; also kommt es nicht an. Ein vom
  // Test selbst ausgelöstes (isTrusted false) geht durch – siehe Abschnitt 5.
  window.addEventListener('beforeinstallprompt', (e) => {
    if (e.isTrusted) e.stopImmediatePropagation();
  }, true);
}

let browser;
let server;

/** Ein Gerät aufmachen: eigener Kontext, eigene Kennung, eigener Speicher. */
async function oeffnen(fall) {
  const ctx = await browser.newContext({
    viewport: fall.viewport || HANDY,
    userAgent: fall.ua,
  });
  await ctx.addInitScript(vorbereiten, {
    key: KEY,
    stand: fall.stand || MIT_EINTRAEGEN,
    beruehrung: fall.beruehrung,
    displayMode: !!fall.displayMode,
    standalone: !!fall.standalone,
    ohnePersist: !!fall.apfel,
    persistNein: !!fall.persistNein,
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(`${fall.name}: ${e.message}`));
  await page.goto(server.adresse, { waitUntil: 'load' });
  await bereitStehen(page);
  return { ctx, page, fehler };
}

/** Warten, bis der Tag-Reiter gezeichnet ist. */
async function bereitStehen(page) {
  const da = await warteBis(page, () => {
    const t = document.getElementById('tabbar');
    return !!t && !t.hidden && !!document.getElementById('tab-heute');
  }, null, 15000);
  if (!da) throw new Error('die App hat ihre Reiter nicht gezeichnet');
  // Zeichnen geht über eine Mikroaufgabe, die Speicherfrage über ein Promise.
  await page.waitForTimeout(300);
}

/** Auf einen Reiter wechseln und warten, bis er steht. */
async function reiter(page, id) {
  await page.locator(`#tab-${id}`).click();
  await warteBis(page, (i) => !!document.querySelector(`#tab-${i}.an`), id, 5000);
  await page.waitForTimeout(300);
}

/** Alle Karten im sichtbaren Reiter: Überschrift, Text, Knöpfe. */
const karten = (page) => frage(page, () => [...document.querySelectorAll('#view .karte')].map((k) => ({
  titel: (k.querySelector('h3')?.textContent || '').replace(/\s+/g, ' ').trim(),
  text: k.textContent.replace(/\s+/g, ' ').trim(),
  acts: [...k.querySelectorAll('[data-act]')].map((b) => b.dataset.act),
})));

const startKarte = (liste) => liste.find((k) => TITEL.includes(k.titel)) || null;

/** Eine Karte gegen ihre Erwartung halten: Titel, was drinsteht, was nicht. */
function vergleiche(karte, erwartet, wo) {
  if (!erwartet) {
    check(!karte, `${wo}: keine Startbildschirm-Karte${karte ? ` (steht aber da: „${karte.titel}")` : ''}`);
    return;
  }
  check(!!karte && karte.titel === erwartet.titel,
    `${wo}: die Karte „${erwartet.titel}" steht da (${karte ? `„${karte.titel}"` : 'keine'})`);
  const text = karte ? karte.text : '';
  for (const t of erwartet.hat || []) check(text.includes(t), `${wo}: mit „${t}"`);
  for (const t of erwartet.nicht || []) {
    check(!!karte && !text.includes(t), `${wo}: ohne „${t}"`);
  }
}

/* ---------- Die Tabelle ---------- */

/*
 * Je Gerät: was oben auf dem Tag-Reiter stehen soll (null: nichts), was unter
 * „Mehr", und welcher Satz zum dauerhaften Speicher dazugehört.
 *
 * „hat" sind Wörter aus genau der Anleitung, die zu diesem Gerät gehört;
 * „nicht" die aus der Anleitung, die man am ehesten fälschlich bekäme.
 */
const FAELLE = [
  {
    name: 'iPhone, Safari unter iOS 26',
    kurz: 'iOS 26',
    ua: KENNUNG.ios26,
    apfel: true,
    bild: 'geraete-ios26-tag.png',
    tag: {
      titel: IOS_TITEL,
      hat: ['•••', 'Als Web-App öffnen', 'Zum Home-Bildschirm', '1. Einträge mitnehmen', 'fängt leer an'],
      nicht: ['Browsermenü', 'In Safari öffnen'],
    },
    tagKnoepfe: ['umzug-mitnehmen', 'startbildschirm-spaeter', 'startbildschirm-weg'],
    mehr: {
      titel: IOS_TITEL,
      hat: ['•••', 'Als Web-App öffnen', 'Zum Home-Bildschirm'],
      nicht: ['Browsermenü', 'Nicht mehr zeigen'],
    },
    speicher: 'safari',
  },
  {
    name: 'iPhone, Safari unter iOS 17',
    kurz: 'iOS 17',
    ua: KENNUNG.ios17,
    apfel: true,
    tag: {
      titel: IOS_TITEL,
      hat: ['Teilen-Symbol', 'Unten auf das Teilen-Symbol', 'Zum Home-Bildschirm'],
      nicht: ['•••', 'Als Web-App öffnen', 'Browsermenü'],
    },
    mehr: { titel: IOS_TITEL, hat: ['Teilen-Symbol'], nicht: ['•••', 'Browsermenü'] },
    speicher: 'safari',
  },
  {
    name: 'iPad, Safari unter iPadOS 26 (meldet sich als Mac, fünf Berührungspunkte)',
    kurz: 'iPad 26',
    ua: KENNUNG.mac26,
    beruehrung: 5,
    viewport: IPAD,
    apfel: true,
    tag: {
      titel: IOS_TITEL,
      // Safari auf dem iPad hat keine Leiste unten.
      hat: ['Oben rechts auf das Teilen-Symbol', 'Zum Home-Bildschirm', 'Als Web-App öffnen'],
      nicht: ['Unten rechts', 'Browsermenü', 'App installieren'],
    },
    mehr: { titel: IOS_TITEL, hat: ['Oben rechts auf das Teilen-Symbol'], nicht: ['Unten rechts', 'Browsermenü'] },
    speicher: 'safari',
  },
  {
    // Derselbe Zweig von der anderen Seite: Vor iOS 26 sitzt das
    // Teilen-Symbol auf dem iPad oben – das weiß nur, wer das iPad erkennt.
    name: 'iPad, Safari unter iPadOS 17',
    kurz: 'iPad 17',
    ua: KENNUNG.mac17,
    beruehrung: 5,
    viewport: IPAD,
    apfel: true,
    tag: {
      titel: IOS_TITEL,
      hat: ['Oben auf das Teilen-Symbol', 'Zum Home-Bildschirm'],
      nicht: ['Unten auf das Teilen-Symbol', 'Browsermenü'],
    },
    mehr: { titel: IOS_TITEL, hat: ['Oben auf das Teilen-Symbol'], nicht: ['Browsermenü'] },
    speicher: 'safari',
  },
  {
    // Die Gegenprobe zum iPad: dieselbe Kennung, keine Berührung. Wer jeden
    // „Macintosh" für ein iPad hält, erzählt dem Mac vom Home-Bildschirm.
    name: 'Mac, Safari 26 (dieselbe Kennung wie das iPad, ohne Berührung)',
    kurz: 'Mac',
    ua: KENNUNG.mac26,
    viewport: GROSS,
    tag: null,
    // Safari auf dem Mac hat kein Browsermenü mit drei Punkten, sondern „Ablage".
    mehr: { titel: MAC_TITEL, hat: ['Ablage › Zum Dock hinzufügen'], nicht: ['Browsermenü', 'Zum Home-Bildschirm', '•••'] },
    speicher: 'kein-ios',
  },
  {
    name: 'Chrome auf dem iPhone',
    kurz: 'CriOS',
    ua: KENNUNG.crios,
    apfel: true,
    tag: {
      titel: IOS_TITEL,
      hat: ['Oben rechts auf das Teilen-Symbol', 'Zum Home-Bildschirm'],
      nicht: ['•••', 'Unten auf das Teilen-Symbol', 'Browsermenü'],
    },
    mehr: { titel: IOS_TITEL, hat: ['Oben rechts auf das Teilen-Symbol'], nicht: ['Browsermenü'] },
    speicher: 'safari',
  },
  {
    name: 'WhatsApp, eingebauter Browser auf dem iPhone',
    kurz: 'WhatsApp',
    ua: KENNUNG.whatsapp,
    apfel: true,
    tag: {
      titel: IOS_TITEL,
      hat: ['In Safari öffnen'],
      // Von hier aus gibt es keinen Home-Bildschirm – also auch keine
      // nummerierten Schritte dorthin.
      nicht: ['Zum Home-Bildschirm', '2. Dann so', 'Browsermenü'],
    },
    mehr: { titel: IOS_TITEL, hat: ['In Safari öffnen'], nicht: ['Zum Home-Bildschirm'] },
    speicher: 'safari',
  },
  {
    name: 'Android, Chrome',
    kurz: 'Android',
    ua: KENNUNG.android,
    bild: 'geraete-android-mehr.png',
    tag: null,
    mehr: {
      titel: ANDERE_TITEL,
      hat: ['Browsermenü', 'App installieren'],
      nicht: ['Zum Home-Bildschirm', '•••', 'Einträge mitnehmen'],
    },
    speicher: 'kein-ios',
  },
  {
    name: 'Desktop, Chrome unter Windows',
    kurz: 'Desktop',
    ua: KENNUNG.desktop,
    viewport: GROSS,
    tag: null,
    mehr: {
      titel: ANDERE_TITEL,
      hat: ['Browsermenü', 'App installieren'],
      nicht: ['Zum Home-Bildschirm', '•••', 'Einträge mitnehmen'],
    },
    speicher: 'kein-ios',
  },
  {
    // NUR display-mode; navigator.standalone bleibt, wie Chromium es hat:
    // undefined. Fällt diese Bedingung weg, liest die App eine Anleitung
    // auf den Startbildschirm vor, auf dem sie schon liegt.
    name: 'App vom Startbildschirm, erkannt nur an display-mode',
    kurz: 'App, nur display-mode',
    ua: KENNUNG.ios26,
    apfel: true,
    displayMode: true,
    vorab: { displayMode: true, standalone: false },
    tag: null,
    mehr: {
      titel: APP_TITEL,
      hat: ['Bauchbuch liegt auf deinem Startbildschirm', 'nicht in Safari'],
      nicht: ['Zum Home-Bildschirm', 'Einträge mitnehmen', '•••'],
    },
    speicher: 'app',
  },
  {
    // NUR navigator.standalone; matchMedia meldet für display-mode nichts.
    name: 'App vom Startbildschirm, erkannt nur an navigator.standalone',
    kurz: 'App, nur standalone',
    ua: KENNUNG.ios26,
    apfel: true,
    standalone: true,
    vorab: { displayMode: false, standalone: true },
    tag: null,
    mehr: {
      titel: APP_TITEL,
      hat: ['Bauchbuch liegt auf deinem Startbildschirm', 'nicht in Safari'],
      nicht: ['Zum Home-Bildschirm', 'Einträge mitnehmen', '•••'],
    },
    speicher: 'app',
  },
];

/*
 * Der Satz zum dauerhaften Speicher unter „Mehr", Karte „Sicherung".
 *
 * In Safari muss die Wochenregel dastehen – sie ist der Grund, warum es die
 * Karte überhaupt gibt. In der App muss dastehen, dass sie *nicht* gilt;
 * sonst glaubt jemand, der längst umgezogen ist, er sei noch in Gefahr. Und
 * wer kein Apple-Gerät hat, soll von Safari gar nichts lesen.
 */
const SPEICHER = {
  safari: {
    hat: ['in diesem Browser', 'In Safari löscht iOS', 'eine Woche lang nicht geöffnet'],
    nicht: ['gilt die Wochenregel von Safari aber nicht'],
  },
  app: {
    hat: ['auf diesem Gerät, in dieser App', 'gilt die Wochenregel von Safari aber nicht'],
    nicht: ['In Safari löscht iOS', 'in diesem Browser'],
  },
  'kein-ios': {
    hat: ['Dauerhafter Speicher'],
    nicht: ['Wochenregel', 'löscht iOS'],
  },
};

/* ---------- Los ---------- */

server = await kopieServer(ORDNER, PORT, { maxAge: 0 });
browser = await chromium.launch();
const alleFehler = [];

try {
  /* ---------- 1. Je Gerät: Tag-Reiter und „Mehr" ---------- */

  for (const fall of FAELLE) {
    console.log(`\n— ${fall.name}`);
    // Jede Zeile nennt ihr Gerät: Eine rote Zeile ohne Gerät sagt nicht, wo.
    const g = `[${fall.kurz}]`;
    const { ctx, page, fehler } = await oeffnen(fall);

    // Vorbedingungen: Steht das Gerät so da, wie der Fall es meint? Sonst
    // prüfte eine grüne Zeile etwas anderes als ihr Satz.
    const ist = await frage(page, () => ({
      ua: navigator.userAgent,
      beruehrung: navigator.maxTouchPoints,
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      standalone: navigator.standalone === true,
    }));
    check(ist.ua === fall.ua, `${g} die Seite sieht genau diese Kennung`);
    if (fall.beruehrung !== undefined) {
      check(ist.beruehrung === fall.beruehrung, `${g} und ${fall.beruehrung} Berührungspunkte (${ist.beruehrung})`);
    }
    if (fall.ua === KENNUNG.mac26 && fall.beruehrung === undefined) {
      check(ist.beruehrung === 0, `${g} ein Mac ohne Touch meldet 0 Berührungspunkte (${ist.beruehrung})`);
    }
    if (fall.vorab) {
      check(
        ist.displayMode === fall.vorab.displayMode && ist.standalone === fall.vorab.standalone,
        `${g} nur ein Weg meldet „App": display-mode ${ist.displayMode}, navigator.standalone ${ist.standalone}`,
      );
    }

    const tag = await karten(page);
    const tagKarte = startKarte(tag);
    vergleiche(tagKarte, fall.tag, `${g} Tag-Reiter`);
    for (const act of fall.tagKnoepfe || []) {
      check(!!tagKarte && tagKarte.acts.includes(act), `${g} Tag-Reiter: mit dem Knopf ${act}`);
    }
    if (fall.tag === null) {
      // Nichts von einer Anleitung, auch nicht in einer anderen Karte.
      const alles = sauber(await frage(page, () => document.getElementById('view').textContent));
      check(!alles.includes('Zum Home-Bildschirm') && !alles.includes('Browsermenü'),
        `${g} Tag-Reiter: auch sonst nirgends eine Anleitung`);
    }
    if (fall.bild && fall.tag) await page.screenshot({ path: path.join(SHOT, fall.bild) });

    await reiter(page, 'mehr');
    const mehr = await karten(page);
    const mehrKarte = startKarte(mehr);
    vergleiche(mehrKarte, fall.mehr, `${g} „Mehr"`);
    check(
      !!mehrKarte && !mehrKarte.acts.includes('startbildschirm-spaeter') && !mehrKarte.acts.includes('startbildschirm-weg'),
      `${g} „Mehr": die Karte bleibt – kein „Später", kein „Nicht mehr zeigen"`,
    );
    if (fall.bild && !fall.tag) await page.screenshot({ path: path.join(SHOT, fall.bild), fullPage: true });

    const sicherung = mehr.find((k) => k.titel === 'Sicherung');
    const erw = SPEICHER[fall.speicher];
    for (const t of erw.hat) check(!!sicherung && sicherung.text.includes(t), `${g} Sicherung: „${t}"`);
    for (const t of erw.nicht) check(!!sicherung && !sicherung.text.includes(t), `${g} Sicherung: nicht „${t}"`);

    alleFehler.push(...fehler);
    await ctx.close();
  }

  /* ---------- 2. „Später" heißt nicht „nie" ---------- */

  console.log('\n— „Später" auf dem iPhone');
  {
    const fall = { name: 'Später', ua: KENNUNG.ios26, apfel: true };
    const { ctx, page, fehler } = await oeffnen(fall);
    check(!!startKarte(await karten(page)), '[iOS 26, Später] vorher steht die Karte auf dem Tag-Reiter');
    await page.locator('[data-act="startbildschirm-spaeter"]').click();
    await page.waitForTimeout(300);
    check(!startKarte(await karten(page)), '[iOS 26, Später] „Später" nimmt sie vom Tag-Reiter');
    const s = await frage(page, (k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
    check(s.startbildschirmWeg !== true, '[iOS 26, Später] und schreibt dafür nichts in den Speicher');
    await reiter(page, 'mehr');
    check(startKarte(await karten(page))?.titel === IOS_TITEL, '[iOS 26, Später] unter „Mehr" steht sie weiter');
    await reiter(page, 'heute');
    check(!startKarte(await karten(page)), '[iOS 26, Später] zurück auf dem Tag-Reiter bleibt sie für diese Sitzung weg');

    // Wer „später" sagt, hat sich nicht entschieden. Beim nächsten Öffnen
    // muss die Karte wieder da sein – sonst wäre es ein verstecktes „nie".
    await page.reload({ waitUntil: 'load' });
    await bereitStehen(page);
    const wieder = startKarte(await karten(page));
    check(!!wieder && wieder.titel === IOS_TITEL, '[iOS 26, Später] nach dem Neuladen ist sie wieder da');
    check(!!wieder && wieder.text.includes('•••'), '[iOS 26, Später] mit derselben Anleitung');
    alleFehler.push(...fehler);
    await ctx.close();
  }

  /* ---------- 3. „Nicht mehr zeigen" gilt auch nach dem Neuladen ---------- */

  console.log('\n— „Nicht mehr zeigen" auf dem iPhone');
  {
    const fall = { name: 'Nicht mehr zeigen', ua: KENNUNG.ios26, apfel: true };
    const { ctx, page, fehler } = await oeffnen(fall);
    check(!!startKarte(await karten(page)), '[iOS 26, Nicht mehr zeigen] vorher steht die Karte auf dem Tag-Reiter');
    await page.locator('[data-act="startbildschirm-weg"]').click();
    await page.waitForTimeout(300);
    check(!startKarte(await karten(page)), '[iOS 26, Nicht mehr zeigen] „Nicht mehr zeigen" nimmt sie vom Tag-Reiter');
    await page.waitForTimeout(700); // der Speicher schreibt gesammelt
    const s = await frage(page, (k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
    check(s.startbildschirmWeg === true, '[iOS 26, Nicht mehr zeigen] und merkt sich das im Speicher');
    await page.reload({ waitUntil: 'load' });
    await bereitStehen(page);
    check(!startKarte(await karten(page)), '[iOS 26, Nicht mehr zeigen] nach dem Neuladen bleibt sie weg');
    // Weggetippt heißt nicht unauffindbar: Unter „Mehr" steht der Weg weiter.
    await reiter(page, 'mehr');
    const mehrKarte = startKarte(await karten(page));
    check(!!mehrKarte && mehrKarte.titel === IOS_TITEL && mehrKarte.text.includes('Als Web-App öffnen'),
      '[iOS 26, Nicht mehr zeigen] unter „Mehr" steht die Anleitung weiter');
    alleFehler.push(...fehler);
    await ctx.close();
  }

  /* ---------- 4. Ohne Einträge: nur die Anleitung ---------- */

  /*
   * Wer noch nichts eingetragen hat, hat nichts mitzunehmen. Ein Knopf
   * „Einträge mitnehmen" schriebe dann ein leeres Tagebuch in die
   * Zwischenablage, und die App auf dem Startbildschirm böte an, dieses
   * Nichts zu holen.
   */
  console.log('\n— iPhone ohne Einträge');
  {
    const fall = { name: 'ohne Einträge', ua: KENNUNG.ios26, apfel: true, stand: LEER };
    const { ctx, page, fehler } = await oeffnen(fall);
    const k = startKarte(await karten(page));
    vergleiche(k, {
      titel: IOS_TITEL,
      hat: ['•••', 'Als Web-App öffnen', 'Zum Home-Bildschirm'],
      nicht: ['Einträge mitnehmen', 'fängt leer an', '2. Dann so', 'Einträge holen'],
    }, '[iOS 26, leer] Tag-Reiter');
    check(!!k && !k.acts.includes('umzug-mitnehmen'), '[iOS 26, leer] Tag-Reiter: kein Knopf zum Mitnehmen');
    check(!!k && k.acts.includes('startbildschirm-spaeter'), '[iOS 26, leer] Tag-Reiter: „Später" gibt es trotzdem');
    await reiter(page, 'mehr');
    const m = startKarte(await karten(page));
    check(!!m && !m.acts.includes('umzug-mitnehmen') && m.text.includes('•••'),
      '[iOS 26, leer] „Mehr": Anleitung ohne Mitnehmen');
    alleFehler.push(...fehler);
    await ctx.close();
  }

  /* ---------- 5. Android mit Installationsangebot ---------- */

  /*
   * Die eine Ausnahme von „Android bekommt oben nichts": Meldet Chrome, dass
   * die Seite installierbar ist, gibt es einen echten Knopf – der ist besser
   * als jede Anleitung. Das Ereignis löst hier der Test selbst aus.
   */
  console.log('\n— Android mit beforeinstallprompt');
  {
    const fall = { name: 'Android installierbar', ua: KENNUNG.android };
    const { ctx, page, fehler } = await oeffnen(fall);
    check(!startKarte(await karten(page)), '[Android, installierbar] vor dem Ereignis: keine Karte');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
    await page.waitForTimeout(300);
    const k = startKarte(await karten(page));
    check(!!k && k.titel === ANDERE_TITEL && k.acts.includes('installieren'),
      '[Android, installierbar] danach steht oben ein Knopf „Installieren"');
    check(!!k && !k.text.includes('Browsermenü'), '[Android, installierbar] statt der Anleitung übers Menü');
    alleFehler.push(...fehler);
    await ctx.close();
  }

  /* ---------- 6. Safari sagt zur Speicherfrage nein ---------- */

  /*
   * Seit iOS 17 kennt Safari storage.persist() und antwortet meist mit nein.
   * Die Wochenregel gilt trotzdem – und sie ist der Satz, auf den es auf dem
   * iPhone ankommt. Er darf nicht davon abhängen, ob Safari schweigt.
   */
  for (const [wie, extra, erw] of [
    ['Safari', {}, 'safari'],
    ['App', { standalone: true }, 'app'],
  ]) {
    console.log(`\n— iOS 26, ${wie}: persist() sagt nein`);
    const fall = { name: `${wie}, persist nein`, ua: KENNUNG.ios26, apfel: true, persistNein: true, ...extra };
    const { ctx, page, fehler } = await oeffnen(fall);
    await reiter(page, 'mehr');
    const sicherung = (await karten(page)).find((k) => k.titel === 'Sicherung');
    check(!!sicherung && sicherung.text.includes('Dauerhafter Speicher: nicht zugesagt'),
      `[iOS 26, ${wie}, persist nein] Sicherung: „nicht zugesagt"`);
    for (const t of SPEICHER[erw].hat) {
      check(!!sicherung && sicherung.text.includes(t), `[iOS 26, ${wie}, persist nein] Sicherung: „${t}"`);
    }
    for (const t of SPEICHER[erw].nicht) {
      check(!!sicherung && !sicherung.text.includes(t), `[iOS 26, ${wie}, persist nein] Sicherung: nicht „${t}"`);
    }
    alleFehler.push(...fehler);
    await ctx.close();
  }

  console.log('');
  check(alleFehler.length === 0, `kein pageerror auf irgendeinem Gerät (${alleFehler.join(' | ') || 'keiner'})`);
} finally {
  await browser.close();
  await server.zu();
}

ende();
