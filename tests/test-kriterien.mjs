/*
 * Rom IV und GerdQ – nachgerechnet.
 *
 * Das ist der Teil der App, der am nächsten an eine Diagnose herankommt, und
 * damit der, bei dem ein Rechenfehler am teuersten ist: Eine falsch erfüllte
 * Kriterienliste schickt jemanden mit einem Namen in die Sprechstunde, den er
 * dort verteidigen muss.
 *
 * Geprüft wird deshalb in beide Richtungen. Ein Datensatz, der die Kriterien
 * klar erfüllt, und einer, der sie klar verfehlt – und in beiden Fällen, dass
 * die Vorbehalte dabeistehen. Ein „erfüllt" ohne den Satz, dass andere
 * Ursachen ärztlich abgeklärt sein müssen, wäre schlimmer als gar keine
 * Anzeige.
 *
 * Seit der Fassung 30 beschreibt die Karte die Regelwerke nur so, wie es die
 * Abstracts der Originalarbeiten hergeben (Quellen im Kommentar über
 * kriterienTeil in js/app.js): Die Magenbeschwerden werden gezählt, ohne
 * „Kriterien erfüllt" für die funktionelle Dyspepsie, und beim GerdQ steht
 * die Punktzahl ohne die Schwelle „ab 8 wahrscheinlich" – wie im Arztbericht.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const setze = async (zustand) => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, zustand]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
};

/*
 * Text ohne die Zeilenumbrüche der Vorlage.
 *
 * Die Sätze in der App sind im Quelltext umbrochen, damit sie lesbar bleiben;
 * im Browser stehen die Umbrüche noch im Textknoten. Ein Test, der darauf
 * hereinfällt, prüft die Formatierung der Vorlage statt ihres Inhalts – und
 * schlägt beim nächsten Umformulieren fehl, ohne dass sich etwas geändert hat.
 */
const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();

/*
 * Ein Verlauf, der die Reizdarm-Kriterien erfüllt:
 *
 *   * Bauchschmerz (`krampf`) an fast jedem Tag, Stärke 6 – also belastend und
 *     deutlich häufiger als einmal pro Woche.
 *   * Nach dem Stuhlgang meistens besser: das erste Rom-Merkmal.
 *   * An Schmerztagen mehr und weichere Stuhlgänge: die anderen beiden.
 */
const eintraege = [];
const tage = {};
for (let t = 1; t <= 60; t++) {
  const schmerzTag = t % 4 !== 0;   // drei von vier Tagen
  tage[vorTagen(t)] = { stress: 2, schlaf: 2, nachtwach: t <= 7 && t % 2 === 0 ? 1 : 0 };
  if (schmerzTag) {
    eintraege.push({
      id: `k${t}`, am: vorTagen(t), um: '11:00', art: 'beschwerde', staerke: 6,
      arten: ['krampf'], stuhlbezug: t % 3 === 0 ? 'gleich' : 'besser',
    });
    // Zwei weiche Stuhlgänge an Schmerztagen …
    eintraege.push({ id: `sa${t}`, am: vorTagen(t), um: '08:00', art: 'stuhl', form: 6 });
    eintraege.push({ id: `sb${t}`, am: vorTagen(t), um: '17:00', art: 'stuhl', form: 6 });
  } else {
    // … und einer, unauffällig geformt, an den übrigen.
    eintraege.push({ id: `sc${t}`, am: vorTagen(t), um: '09:00', art: 'stuhl', form: 4 });
  }
}

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege,
  tage,
  fenster: 4,
  mindestFaelle: 5,
  beschwerdenSeit: '2023-01',
  tagesfragen: ['stress', 'schlaf', 'nachtwach'],
});

const krit = page.locator('.krit-liste');
check(await krit.count() === 1, 'die Kriterienkarte steht da');
const kritText = await text(krit);

/* ---------- Reizdarm ---------- */

const reizdarm = page.locator('.krit', { hasText: 'Reizdarmsyndrom' });
const rText = await text(reizdarm);
check(rText.includes('Kriterien erfüllt'), 'die Rom-IV-Kriterien für ein Reizdarmsyndrom sind erfüllt');
check(
  rText.includes('Bauchschmerz mindestens 1× je Woche'),
  'die Hauptbedingung steht im Wortlaut da, nicht nur ihr Ergebnis',
);
check(
  /an 4[0-9] Tagen eingetragen/i.test(rText),
  'mit der Fallzahl daneben',
);
check(
  rText.includes('Hängt mit dem Stuhlgang zusammen'),
  'und jedes der drei Merkmale einzeln',
);
check(
  rText.includes('erfüllt sind 3 von 3'),
  'gezählt wird, wie viele Merkmale erfüllt sind – verlangt sind zwei',
);
check(rText.includes('Durchfalltyp'), 'der Stuhltyp steht dabei: weich überwiegt deutlich');
check(
  await reizdarm.locator('.haken.ja').count() >= 4,
  'die erfüllten Punkte sind als Haken erkennbar, nicht nur als Text',
);

/* ---------- Magenbeschwerden: gezählt, nicht eingeordnet ---------- */

const dys = page.locator('.krit', { hasText: 'Magenbeschwerden ab Stärke 4' });
check(await dys.count() === 1, 'die Magenbeschwerden stehen als eigener Kasten da');
const dText = await text(dys);
check(
  dText.includes('gezählt, keine Einordnung') && !/Kriterien (nicht )?erfüllt/.test(dText)
    && !dText.includes('Distress-Syndrom') && !dText.includes('Schmerzsyndrom'),
  'ohne „Kriterien erfüllt“ und ohne Unterformen – die Schwellen dafür gibt das Abstract von Rom IV nicht her',
);
check(
  /Druck, Völlegefühl oder früh satt\. An \d+ Tag/.test(dText) && /Brennen oder Schmerz im Oberbauch\. An \d+ Tag/.test(dText),
  'beide Gruppen von Beschwerden stehen einzeln da, mit ihrer Zahl',
);
check(
  dText.includes('ab Stärke 4') && dText.includes('Diese Grenze hat Body Check festgelegt') && !dText.includes('belastend'),
  'die Grenze ab Stärke 4 steht als Festlegung der App da, nicht als Wortlaut der Kriterien',
);
check(
  dText.includes('wenn eine übliche ärztliche Untersuchung sie nicht erklärt'),
  'und was Rom IV laut Abstract zur funktionellen Dyspepsie sagt',
);
check(
  await dys.locator('.haken.ja').count() === 0,
  'und keine Haken, die eine Schwelle erfüllt nennen',
);

/* ---------- GerdQ ---------- */

const gerd = page.locator('.krit', { hasText: 'GerdQ' });
const gText = await text(gerd);
check(gText.includes('von 18'), 'der GerdQ nennt seine Punktzahl von achtzehn');
check(
  gText.includes('zählt umgekehrt'),
  'die zwei umgekehrt gewerteten Fragen sind als solche gekennzeichnet',
);
check(
  gText.includes('Nachts davon wach geworden'),
  'die Nachtfrage aus den Tagesangaben ist einer der sechs Posten',
);
check(
  !gText.includes('Ab 8') && !gText.includes('wahrscheinlich') && !gText.includes('Trick')
    && gText.includes('kein ausgefüllter Fragebogen') && gText.includes('Zwei Posten zählt Body Check umgekehrt'),
  'ohne die Schwelle „ab 8 wahrscheinlich“ – gezählt, nicht erfragt, und was „umgekehrt“ hier heißt',
);
check(
  !(await gerd.getAttribute('class')).includes('erfuellt'),
  'der GerdQ-Kasten wird nie als „erfüllt“ markiert',
);

/* ---------- Die Vorbehalte ---------- */

const karte = page.locator('.karte', { hasText: 'Erfüllte Kriterien sind keine Diagnose' });
check(await karte.count() === 1, 'über allem steht: erfüllte Kriterien sind keine Diagnose');
const kText = await text(karte);
check(
  kText.includes('wenn andere Ursachen für die Beschwerden abgeklärt und ausgeschlossen sind')
    && !kText.includes('Beide Regelwerke') && !kText.includes('Spiegelung und Blutbild'),
  'mit der Begründung für Reizdarm und Reizmagen – nicht „beide Regelwerke“ samt GerdQ',
);
check(
  !kText.includes('untererfasst') && !kText.includes('eher zu niedrig als zu hoch')
    && kText.includes('beziehen sich auf die notierten Tage'),
  'und worauf sich die Zahlen beziehen, statt „ein Tagebuch untererfasst“',
);
check(
  kText.includes('Rom V') && !kText.includes('mit denen in der Sprechstunde eingeordnet'),
  'mit dem Hinweis, dass es inzwischen eine Nachfolgefassung gibt',
);
check(
  kText.includes('Die Bedingung, mit der Body Check beim Reizdarm rechnet') && !kText.includes('Rom IV verlangt'),
  'den Beginn vor sechs Monaten nennt die Karte als Bedingung der App',
);
check(
  kText.includes('seit 2023-01') && /seit \d+ Monaten/.test(kText),
  'die Dauer der Beschwerden wird in Monate umgerechnet',
);
await page.screenshot({ path: `${SHOT}/97-kriterien.png`, fullPage: true });

/* ---------- Ohne die Angabe „seit wann" fehlt eine Bedingung ---------- */

await setze({
  begruesst: true, tab: 'muster', eintraege, tage, fenster: 4, mindestFaelle: 5,
  tagesfragen: ['stress', 'schlaf', 'nachtwach'],
});
check(
  (await text(page.locator('.karte', { hasText: 'Erfüllte Kriterien' })))
    .includes('nicht eingetragen'),
  'fehlt die Angabe „seit wann", steht das als offene Bedingung da statt still zu fehlen',
);
check(
  (await text(page.locator('.karte', { hasText: 'Erfüllte Kriterien' })))
    .includes('fehlt dem Reizdarm-Kasten darunter eine Bedingung'),
  'und zwar dem Kasten darunter – früher hieß es „beiden Kästen oben“',
);

/* ---------- Zu kurzes Tagebuch: gar keine Behauptung ---------- */

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: [
    { id: 'a', am: vorTagen(2), um: '11:00', art: 'beschwerde', staerke: 6, arten: ['krampf'] },
    { id: 'b', am: vorTagen(1), um: '11:00', art: 'beschwerde', staerke: 6, arten: ['krampf'] },
  ],
  tage: {},
  fenster: 4,
  mindestFaelle: 5,
});
/*
 * Bei zwei Tagen gibt es die Kriterienkarte gar nicht mehr – der Reiter zeigt
 * in der Frühphase eine kurze Fassung, in der steht, wie weit es noch ist.
 * Geprüft wird deshalb der ganze Reiter statt einer Karte, und das ist die
 * schärfere Prüfung: Aus zwei Tagen darf nirgends etwas „Erfülltes" stehen,
 * nicht nur nicht in einer bestimmten Karte.
 */
const kurz = await text(page.locator('#view'));
check(
  kurz.includes('2 von 14 notierten Tagen'),
  'unter zwei Wochen Tagebuch steht da, wie weit es bis zu den Kriterien noch ist',
);
check(
  !kurz.includes('Kriterien erfüllt') && !kurz.includes('erfüllt'),
  'und nirgends auf dem Reiter etwas „Erfülltes": Aus zwei Tagen wird keine Diagnose',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
check(kritText.length > 0, 'die Karte hat Inhalt');
await browser.close();
ende();
