/*
 * Dieselbe Menge, andere Wirkung.
 *
 * Die Auslöserbilanz mittelt über alle vier Wochen. Wer drei Wochen lang
 * Zwiebeln verträgt und in der vierten nicht, bekommt von ihr „ein bisschen
 * auffällig" zu hören – eine Aussage, die für keinen einzigen Tag stimmt, und
 * die dazu führt, dass jemand Zwiebeln streicht, obwohl er sie an 21 von 28
 * Tagen problemlos isst.
 *
 * Geprüft wird an drei Tagebüchern mit bekannter Antwort:
 *
 *   1. WECHSELT. Der Auslöser wirkt nur in der zweiten Zyklushälfte. Die App
 *      muss das als Wechsel benennen und die Phase dazu.
 *   2. GLEICH. Derselbe Auslöser, gleichmäßig über den Zyklus. Dann darf kein
 *      Wechsel behauptet werden – sonst findet die App in jedem Tagebuch einen.
 *   3. OHNE ZYKLEN. Ohne zwei abgeschlossene Zyklen sind die Phasen geraten
 *      und nicht geschätzt. Dann gibt es kein Urteil, auch kein vorsichtiges.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

/*
 * 120 Tage, Zyklus von 28 Tagen, fünf Blutungstage am Anfang jedes Zyklus.
 *
 * `nurLuteal` schaltet die Wirkung des Auslösers auf die zweite Zyklushälfte
 * (ab Tag 18) scharf; sonst wirkt sie immer. Der Auslöser kommt jeden zweiten
 * Tag vor, damit in jeder Phase beide Seiten besetzt sind.
 */
function bauen({ wirkung = 4, nurLuteal = false, tage: anzahl = 120, zyklen = true } = {}) {
  const eintraege = [];
  const tage = {};

  for (let i = anzahl; i >= 1; i--) {
    const am = vorTagen(i);
    // Tag im Zyklus, rückwärts gezählt und dann in 28er-Schritte gelegt.
    const zyklusTag = ((anzahl - i) % 28) + 1;
    const blutung = zyklen && zyklusTag <= 5 ? 2 : 0;
    tage[am] = { notiert: true, blutung };

    const mitZwiebel = i % 2 === 0;
    eintraege.push({
      id: `m${i}`, am, um: '12:00', art: 'essen', was: 'Mittag', portion: 'normal',
      zutaten: mitZwiebel
        ? [{ id: 'zwiebel', rolle: 'haupt' }] : [{ id: 'reis', rolle: 'haupt' }],
    });

    const luteal = zyklusTag >= 18;
    let staerke = 2;
    if (mitZwiebel && (!nurLuteal || luteal)) staerke += wirkung;
    eintraege.push({
      id: `b${i}`, am, um: '14:00', art: 'beschwerde',
      staerke: Math.min(10, staerke), arten: ['blaehung'],
    });
  }
  return { eintraege, tage };
}

async function wirkung(daten) {
  return page.evaluate(async ([e, t]) => {
    const a = await import('./js/auswertung.js');
    const w = await import('./js/wechselwirkung.js');
    const bewertet = a.bewerteteMahlzeiten(e, 4);
    const r = w.phasenWirkung(bewertet, 'zwiebel', t);
    const roh = a.ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5 })
      .find((b) => b.id === 'zwiebel');
    return {
      urteil: r.urteil,
      satz: r.satz,
      pruefbare: r.pruefbare,
      staerkste: r.staerkste ? r.staerkste.name : null,
      spanne: r.spanne ? Number(r.spanne.toFixed(2)) : null,
      rohDifferenz: roh ? Number(roh.differenz.toFixed(2)) : null,
      rohEinstufung: roh ? a.einstufung(roh) : null,
    };
  }, [daten.eintraege, daten.tage]);
}

/* ---------- 1. Wirkt nur in einer Phase ---------- */

const nurDann = await wirkung(bauen({ nurLuteal: true }));
check(nurDann.urteil === 'wechselt', `die Wirkung wechselt mit dem Zyklus (${nurDann.urteil})`);
check(
  nurDann.staerkste === 'zweite Zyklushälfte',
  `und zwar in der zweiten Zyklushälfte (${nurDann.staerkste})`,
);
check(
  nurDann.satz.includes('wechselnde Empfindlichkeit'),
  'die App nennt das eine wechselnde Empfindlichkeit, keine Unverträglichkeit',
);

/*
 * Und das ist der Grund für die ganze Rechnung: Über alle vier Wochen
 * gemittelt sieht derselbe Auslöser nach einem mittleren Dauerproblem aus.
 * Wer danach handelt, streicht ein Lebensmittel für 28 Tage, das an 21 davon
 * nichts tut.
 */
check(
  nurDann.rohDifferenz > 0.5 && nurDann.rohDifferenz < 4,
  `im Schnitt über den ganzen Zyklus sieht es nach Mittelmaß aus (${nurDann.rohDifferenz})`,
);

/* ---------- 2. Wirkt immer gleich ---------- */

const immer = await wirkung(bauen({ nurLuteal: false }));
check(immer.urteil === 'gleich', `gleichmäßige Wirkung heißt kein Wechsel (${immer.urteil})`);
check(
  immer.satz.includes('spricht') && immer.satz.includes('Essen'),
  'und die App sagt, dass das eher fürs Essen spricht',
);

/* ---------- 3. Ohne Zyklen kein Urteil ---------- */

const ohne = await wirkung(bauen({ nurLuteal: true, zyklen: false }));
check(ohne.urteil === 'unklar', `ohne eingetragene Blutungstage: nicht prüfbar (${ohne.urteil})`);
check(
  /zwei vollständig|geraten/.test(ohne.satz),
  'mit dem Grund – geraten ist nicht geschätzt',
);

const einZyklus = await wirkung(bauen({ nurLuteal: true, tage: 30 }));
check(
  einZyklus.urteil === 'unklar',
  `ein einziger Zyklus reicht auch nicht (${einZyklus.urteil})`,
);

/* ---------- 4. Und die Phase für sich ---------- */

const phasen = await page.evaluate(async ([e, t]) => {
  const a = await import('./js/auswertung.js');
  const z = await import('./js/zyklus.js');
  const w = await import('./js/wechselwirkung.js');
  const bilanz = z.phasenBilanz(e, t, a.tagesWert);
  return { urteil: w.phasenUrteil(bilanz, t), leer: w.phasenUrteil([], t) };
}, [bauen({ nurLuteal: true }).eintraege, bauen({ nurLuteal: true }).tage]);
check(phasen.urteil.pruefbar, 'mit zwei Zyklen lässt sich über die Phasen etwas sagen');
check(
  phasen.urteil.satz.includes('geschätzt'),
  'und es steht dabei, dass die Phasen geschätzt sind',
);
check(!phasen.leer.pruefbar, 'ohne Tage in den Phasen wird nichts behauptet');

/* ---------- Und in der Anzeige ---------- */

const daten = bauen({ nurLuteal: true });
await page.evaluate(([k, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t,
})), [KEY, daten.eintraege, daten.tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  sicht.includes('Kommt auf den Zeitpunkt im Zyklus an'),
  'die Karte steht auf dem Reiter Muster',
);
check(sicht.includes('Zwiebel'), 'mit dem Auslöser, um den es geht');
check(/\d+\/\d+ Mahlzeiten/.test(sicht), 'und den Fallzahlen je Phase');
check(
  sicht.includes('sagt nichts voraus'),
  'und dem Hinweis, dass daraus keine Vorhersage wird',
);

/* ---------- Und im Bericht ---------- */

const zettel = await page.evaluate(async ([e, t]) => {
  const b = await import('./js/bericht.js');
  const alle = Object.keys(t).sort();
  return b.arztBericht({ eintraege: e, tage: t }, alle[0], alle[alle.length - 1]);
}, [daten.eintraege, daten.tage]);
check(
  zettel.includes('WIRKUNG WECHSELT MIT DER ZYKLUSPHASE'),
  'der Bericht führt den Abschnitt eigens',
);
check(
  zettel.includes('wechselnde Empfindlichkeit'),
  'und benennt den Unterschied zur Unverträglichkeit',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/wechsel.png`, fullPage: true });
await browser.close();
ende();
