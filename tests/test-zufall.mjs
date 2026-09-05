/*
 * Das Tagebuch, in dem nichts drinsteckt
 *
 * Alle anderen Tests fragen: Findet die App, was da ist? Dieser fragt das
 * Gegenteil, und es ist die schwerere Frage: **Schweigt sie, wenn nichts da
 * ist?**
 *
 * Der Grund ist Arithmetik. Die App vergleicht inzwischen zwei Dutzend
 * Auslöser, dazu Klassen, drei Zeitfenster, sechs Schichten und vier
 * Zyklusphasen. Jeder Vergleich für sich ist sauber. Aber bei fünfzig
 * Vergleichen ist ein „auffälliger" Unterschied kein Ausreißer mehr, sondern
 * zu erwarten – auch dann, wenn das Essen mit den Beschwerden nicht das
 * Geringste zu tun hat.
 *
 * Und ein Zufallstreffer ist hier nicht folgenlos: Er führt dazu, dass jemand
 * ein Lebensmittel streicht, das ihm nichts tut, einseitiger isst und der App
 * beim nächsten, echten Fund weniger glaubt.
 *
 * Geprüft wird deshalb an acht Tagebüchern aus reinem Zufall – 150 Tage, drei
 * Mahlzeiten am Tag, zwanzig Zutaten nach Münzwurf, Beschwerdestärken
 * gewürfelt und mit dem Essen durch nichts verbunden. Die Hälfte davon mit
 * Tagesangaben (Anspannung, Schlaf, Blutung), ebenfalls gewürfelt.
 *
 * Die richtige Antwort ist in allen acht dieselbe: nichts.
 *
 * (Die Zufallszahlen kommen aus einem eigenen, festen Generator. Ein Test, der
 * mal durchgeht und mal nicht, ist schlimmer als keiner.)
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

/** Ein einfacher, fester Zufallsgenerator – überall gleich, immer gleich. */
function wuerfel(saat) {
  let x = saat;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const ZUTATEN = ['kaffee', 'alkohol', 'fett', 'scharf', 'zwiebel', 'kohlensaeure',
  'milch', 'weizen', 'zucker', 'obst', 'tomate', 'schokolade', 'ei', 'reis',
  'kohl', 'zitrus', 'nuss', 'fleisch', 'kaese', 'bohnen'];

function rauschen(saat, tagesangaben) {
  const r = wuerfel(saat);
  const eintraege = [];
  const tage = {};
  for (let i = 1; i <= 150; i++) {
    const am = vorTagen(i);
    tage[am] = tagesangaben
      ? {
        notiert: true,
        stress: Math.floor(r() * 5),
        schlaf: Math.floor(r() * 5),
        blutung: r() < 0.15 ? 2 : 0,
      }
      : { notiert: true };
    // Drei Mahlzeiten, drei Beschwerden – jede zwei Stunden nach einer
    // Mahlzeit, damit jede Mahlzeit ein beobachtbares Fenster hat. Sonst
    // prüfte der Test vor allem, dass nach dem Abendessen nie etwas notiert
    // wurde.
    ['07:00', '12:00', '18:00'].forEach((um, m) => {
      eintraege.push({
        id: `m${i}-${m}`, am, um, art: 'essen', was: 'Essen', portion: 'normal',
        zutaten: ZUTATEN.filter(() => r() < 0.25).map((id) => ({ id, rolle: 'haupt' })),
      });
    });
    ['09:00', '14:00', '20:00'].forEach((um, b) => {
      eintraege.push({
        id: `b${i}-${b}`, am, um, art: 'beschwerde',
        // Die Stärke hat mit dem Essen davor nichts zu tun. Das ist der Punkt.
        staerke: Math.floor(r() * 11), arten: ['brennen'],
      });
    });
  }
  return { eintraege, tage };
}

/** Alles, was die App an diesem Tagebuch zu behaupten hätte. */
async function befunde(daten) {
  return page.evaluate(async ([e, t]) => {
    const a = await import('./js/auswertung.js');
    const sch = await import('./js/schichten.js');
    const z = await import('./js/zeitprofil.js');
    const w = await import('./js/wechselwirkung.js');
    const bilanz = a.ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5 });
    const klassen = a.klassenBilanz(e, { fenster: 4 });
    const bewertet = a.bewerteteMahlzeiten(e, 4);
    const fenster = z.fensterWerte(e);
    const genug = bilanz.filter((b) => b.genug);
    const auffaellig = genug.filter((b) => ['auffaellig', 'moeglich'].includes(a.einstufung(b)));
    return {
      vergleiche: genug.length,
      spielraum: genug.length ? Number(genug[0].spielraum.toFixed(2)) : null,
      auffaellig: auffaellig.length,
      // Wieviel davon auch noch die Störfaktorenprüfung überstünde – nur das
      // käme in die Zusammenfassung ganz oben.
      haelt: auffaellig
        .filter((b) => sch.haeltStand(bewertet, b.id, t).urteil === 'haelt').length,
      klassen: klassen.filter((k) => k.genug
        && ['auffaellig', 'moeglich'].includes(a.klassenEinstufung(k))).length,
      spaet: z.spaeteFunde(fenster, genug.map((b) => b.id), 4).length,
      wechsel: w.wechselnde(bewertet, genug.map((b) => b.id), t).length,
    };
  }, [daten.eintraege, daten.tage]);
}

let auffaellig = 0;
let klassen = 0;
let spaet = 0;
let wechsel = 0;
let vergleiche = 0;
let spielraum = 0;

for (let saat = 1; saat <= 8; saat++) {
  const daten = rauschen(saat * 7919, saat % 2 === 0);
  // eslint-disable-next-line no-await-in-loop
  const b = await befunde(daten);
  auffaellig += b.auffaellig;
  klassen += b.klassen;
  spaet += b.spaet;
  wechsel += b.wechsel;
  vergleiche = b.vergleiche;
  spielraum = b.spielraum;
}

/*
 * Ein einziger Fehltreffer unter acht Tagebüchern ist hinnehmbar – bei zwanzig
 * Vergleichen je Tagebuch, also 160 insgesamt, wäre alles andere eine
 * Schwelle, die auch echte Funde verschluckt. Zwei wären es nicht mehr.
 */
check(
  auffaellig <= 1,
  `in acht Tagebüchern aus reinem Zufall höchstens ein auffälliger Auslöser (${auffaellig})`,
);
/*
 * Bei den Klassen ist ein Fehltreffer wahrscheinlicher, und das hat einen
 * Grund: Ihre Schwelle liegt bei einer halben Stufe statt bei einer, weil eine
 * Klasse in vielen Mahlzeiten steckt und der Unterschied dadurch verdünnt
 * wird. Was statistisch sauber ist, muss deshalb noch lange nicht viel
 * bedeuten – und genau deshalb steht neben jeder Klasse, welche Zutaten sie in
 * diesem Tagebuch trägt.
 */
check(klassen <= 1, `und höchstens eine auffällige Wirkstoffklasse (${klassen})`);
check(spaet === 0, `und kein „erst später auffällig" (${spaet})`);
check(wechsel === 0, `und kein Auslöser, der mit dem Zyklus wechselt (${wechsel})`);

/*
 * Und die Schranke selbst muss sichtbar sein, sonst ist sie nur eine weitere
 * unerklärte Schwelle.
 */
check(vergleiche >= 15, `es wurden wirklich viele Vergleiche angestellt (${vergleiche})`);
check(spielraum > 0.4, `und der Zufallsspielraum ist entsprechend groß (${spielraum})`);

/* ---------- Ein echter Fund geht trotzdem durch ---------- */

/*
 * Die Gegenprobe, ohne die der Test wertlos wäre: Eine Schwelle, die alles
 * verschluckt, besteht jeden Rauschtest. Dasselbe Tagebuch, nur macht Kaffee
 * jetzt wirklich Beschwerden – das muss die App finden.
 */
const echt = rauschen(31337, false);
const stunde = (um) => Number(um.split(':')[0]);
echt.eintraege.filter((e) => e.art === 'essen'
  && (e.zutaten || []).some((z) => z.id === 'kaffee')).forEach((m) => {
  echt.eintraege.filter((b) => b.art === 'beschwerde' && b.am === m.am
    && stunde(b.um) > stunde(m.um) && stunde(b.um) - stunde(m.um) <= 4)
    .forEach((b) => { b.staerke = Math.min(10, b.staerke + 4); });
});
const gefunden = await befunde(echt);
check(
  gefunden.auffaellig >= 1,
  `ein wirklich vorhandener Zusammenhang kommt trotzdem durch (${gefunden.auffaellig})`,
);

/* ---------- Und die Zusammenfassung schweigt ---------- */

const still = rauschen(4711, true);
await page.evaluate(([k, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t,
})), [KEY, still.eintraege, still.tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const lage = (await page.locator('.karte-lage').textContent()).replace(/\s+/g, ' ');
check(
  !/Am deutlichsten fällt/.test(lage),
  `„Was Sache ist" nennt keinen Auslöser (${lage.slice(0, 80)}…)`,
);
check(
  !/wirkt nicht immer gleich|fällt im üblichen Zeitfenster/.test(lage),
  'und auch keinen Zyklus- oder Zeitfensterfund',
);
check(
  !/unauffällig|alles in Ordnung|nichts gefunden/i.test(lage),
  'und behauptet trotzdem nirgends, es sei nichts',
);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  sicht.includes('kommt ein Unterschied von'),
  'die Schwelle steht als Zahl in der App, nicht nur im Programm',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/zufall.png`, fullPage: true });
await browser.close();
ende();
