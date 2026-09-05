/*
 * Liegt es wirklich am Kaffee?
 *
 * Die Auslöserbilanz vergleicht Mahlzeiten mit einem Merkmal gegen die ohne.
 * Nur isst niemand zufällig verteilt: Kaffee gibt es an Arbeitstagen, und
 * Arbeitstage sind die angespannten. Wenn Anspannung den Bauch verschlechtert,
 * sieht der Kaffee schuldig aus, ohne es zu sein – und jemand streicht ihn,
 * isst fortan einseitiger und hat nichts gewonnen.
 *
 * Geprüft werden deshalb drei ausgedachte Tagebücher, deren richtige Antwort
 * vorher feststeht:
 *
 *   1. DER SCHEINBEFUND. Der Kaffee fällt mit dem Stress zusammen, hat aber
 *      keine eigene Wirkung. Innerhalb gleicher Anspannung muss der
 *      Unterschied verschwinden.
 *   2. DER ECHTE BEFUND. Der Kaffee wirkt unabhängig vom Stress. Dann muss er
 *      in jeder Schicht bestehen bleiben.
 *   3. NUR UNTER UMSTÄNDEN. Der Kaffee wirkt nur an angespannten Tagen –
 *      weder „hält" noch „verschwindet", sondern genau das dritte Urteil.
 *
 * Dazu der Fall, der am häufigsten vorkommt und am wenigsten spektakulär ist:
 * zu wenige Daten. Dann sagt die App „nicht prüfbar" und nicht etwa
 * „unauffällig" – der Unterschied ist der ganze Punkt.
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
 * Ein Tagebuch bauen.
 *
 * 80 Tage, jeden zweiten Tag angespannt. `kaffeeWirkt` sagt, wie viele Stufen
 * der Kaffee für sich genommen ausmacht; `nurBeiStress` schaltet ihn nur an
 * angespannten Tagen scharf. Kaffee wird an angespannten Tagen dreimal so oft
 * getrunken – das ist die Verzerrung, um die es geht.
 */
function bauen({
  kaffeeWirkt = 0, nurBeiStress = false, stressWirkt = 3, tage: anzahl = 80,
  vollstaendig = false,
} = {}) {
  const eintraege = [];
  const tage = {};

  for (let i = 1; i <= anzahl; i++) {
    const am = vorTagen(i);
    const angespannt = i % 2 === 0;
    tage[am] = { notiert: true, stress: angespannt ? 4 : 0, schlaf: angespannt ? 4 : 0 };

    /*
     * An angespannten Tagen viel Kaffee, an ruhigen wenig – aber nicht
     * ausschließlich. `vollstaendig` dreht das auf die Spitze: dann gibt es an
     * Stresstagen IMMER Kaffee, und damit innerhalb dieser Schicht nichts mehr
     * zu vergleichen. Der Fall gehört dazu, weil er real vorkommt und weil die
     * richtige Antwort darauf „lässt sich nicht trennen" lautet.
     */
    const mitKaffee = angespannt
      ? (vollstaendig || i % 8 !== 0)
      : i % 6 === 1;

    eintraege.push({
      id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal',
      zutaten: mitKaffee ? [{ id: 'kaffee', rolle: 'haupt' }] : [{ id: 'obst', rolle: 'haupt' }],
    });

    let staerke = 1;
    if (angespannt) staerke += stressWirkt;
    if (mitKaffee && (!nurBeiStress || angespannt)) staerke += kaffeeWirkt;
    if (staerke > 0) {
      eintraege.push({
        id: `b${i}`, am, um: '10:00', art: 'beschwerde',
        staerke: Math.min(10, staerke), arten: ['brennen'],
      });
    }
  }
  return { eintraege, tage };
}

/** Das Urteil der Schichtung, direkt aus dem Modul. */
async function urteil(daten) {
  return page.evaluate(async ([e, t]) => {
    const a = await import('./js/auswertung.js');
    const sch = await import('./js/schichten.js');
    const bewertet = a.bewerteteMahlzeiten(e, 4);
    const r = sch.haeltStand(bewertet, 'kaffee', t);
    const roh = a.ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5 })
      .find((b) => b.id === 'kaffee');
    return {
      urteil: r.urteil,
      pruefbare: r.pruefbare,
      satz: r.satz,
      rohDifferenz: roh ? roh.differenz : null,
      schichten: r.schichten.filter((x) => x.pruefbar)
        .map((x) => ({ name: x.name, d: Number(x.differenz.toFixed(2)) })),
    };
  }, [daten.eintraege, daten.tage]);
}

/* ---------- 1. Der Scheinbefund ---------- */

const schein = await urteil(bauen({ kaffeeWirkt: 0 }));
check(
  schein.rohDifferenz > 1,
  `ohne Schichtung sieht der Kaffee deutlich auffällig aus (${schein.rohDifferenz?.toFixed(2)})`,
);
check(
  schein.urteil === 'verschwindet',
  `unter gleichen Umständen bleibt nichts übrig (${schein.urteil})`,
);
check(
  schein.satz.includes('zusammenfallen'),
  'und die App sagt, woher der Verdacht kam',
);

/* ---------- 2. Der echte Befund ---------- */

const echt = await urteil(bauen({ kaffeeWirkt: 3 }));
check(echt.urteil === 'haelt', `ein echter Effekt hält stand (${echt.urteil})`);
check(
  echt.schichten.length >= 2 && echt.schichten.every((x) => x.d > 0.5),
  `und zwar in jeder prüfbaren Schicht (${echt.schichten.map((x) => x.d).join(', ')})`,
);

/* ---------- 3. Nur unter Umständen ---------- */

const nurDann = await urteil(bauen({ kaffeeWirkt: 4, nurBeiStress: true }));
check(
  nurDann.urteil === 'nur-dann',
  `wirkt er nur bei Stress, heißt das auch so (${nurDann.urteil})`,
);
check(
  nurDann.satz.includes('zusammenkommen'),
  'mit dem Hinweis, dass vielleicht beides zusammen muss',
);

/* ---------- 3b. Wenn sich beides gar nicht trennen lässt ---------- */

/*
 * Gibt es an angespannten Tagen ausnahmslos Kaffee, dann fehlt innerhalb
 * dieser Schicht die Vergleichsgruppe. Die ehrliche Antwort ist dann nicht
 * „hält" und nicht „verschwindet", sondern: geht nicht. Wer hier ein Urteil
 * ausgibt, rät.
 */
const verschraenkt = await urteil(bauen({ kaffeeWirkt: 3, vollstaendig: true }));
check(
  verschraenkt.urteil === 'unklar',
  `bei vollständiger Überlappung lässt sich nichts trennen (${verschraenkt.urteil})`,
);

/* ---------- 4. Zu wenig ist nicht unauffällig ---------- */

const duenn = await urteil(bauen({ kaffeeWirkt: 3, tage: 10 }));
check(duenn.urteil === 'unklar', `bei zehn Tagen: nicht prüfbar (${duenn.urteil})`);
check(
  !/unauffällig|kein Zusammenhang|liegt nicht/i.test(duenn.satz),
  'und ausdrücklich keine Entwarnung',
);

/* ---------- 5. Ohne Tagesangaben geht es gar nicht ---------- */

const ohneAngaben = await urteil({
  ...bauen({ kaffeeWirkt: 3 }),
  tage: Object.fromEntries(Object.keys(bauen({}).tage).map((k) => [k, { notiert: true }])),
});
check(
  ohneAngaben.urteil === 'unklar' && ohneAngaben.pruefbare === 0,
  'ohne Angaben zu Anspannung, Schlaf und Zyklus ist nichts zu schichten',
);
check(
  ohneAngaben.satz.includes('fehlen die Angaben'),
  'und die App sagt, was fehlt',
);

/* ---------- Und dasselbe im Arztbericht ---------- */

/*
 * Der Zettel für die Sprechstunde ist die Stelle, an der ein Scheinbefund am
 * teuersten wird: Was dort unter „auffällig" steht, wird besprochen und
 * womöglich gestrichen. Ein Fund, der die Schichtung nicht übersteht, darf
 * deshalb nicht in derselben Liste stehen wie einer, der sie übersteht – aber
 * er darf auch nicht verschwiegen werden, sonst kommt derselbe Verdacht beim
 * nächsten Mal ungeprüft wieder.
 */
async function bericht(daten) {
  return page.evaluate(async ([e, t]) => {
    const b = await import('./js/bericht.js');
    const alle = Object.keys(t).sort();
    return b.arztBericht({ eintraege: e, tage: t }, alle[0], alle[alle.length - 1]);
  }, [daten.eintraege, daten.tage]);
}

/** Einen Abschnitt des Berichts herausschneiden – bis zur nächsten Leerzeile. */
function abschnitt(text, ueberschrift) {
  const zeilen = text.split('\n');
  const start = zeilen.findIndex((z) => z.startsWith(ueberschrift));
  if (start < 0) return '';
  const rest = zeilen.slice(start + 1);
  const ende = rest.findIndex((z) => z.trim() === '');
  return rest.slice(0, ende < 0 ? rest.length : ende).join(' ');
}

const scheinBericht = await bericht(bauen({ kaffeeWirkt: 0 }));
check(
  !abschnitt(scheinBericht, 'AUFFÄLLIG IM ZEITRAUM').includes('Kaffee'),
  'ein Scheinbefund steht im Bericht nicht unter „auffällig"',
);
check(
  abschnitt(scheinBericht, 'IM ROHEN VERGLEICH AUFFÄLLIG').includes('Kaffee'),
  'sondern eigens als das, was der Prüfung nicht standhielt',
);

const echtBericht = await bericht(bauen({ kaffeeWirkt: 3 }));
const echtAbschnitt = abschnitt(echtBericht, 'AUFFÄLLIG IM ZEITRAUM');
check(echtAbschnitt.includes('Kaffee'), 'ein echter Befund bleibt im Bericht stehen');
check(
  echtAbschnitt.includes('unter gleichen Umständen: hält stand'),
  'und zwar mit dem Vermerk, dass er geprüft wurde',
);

/* ---------- Und das alles auch in der Anzeige ---------- */

const daten = bauen({ kaffeeWirkt: 0 });
await page.evaluate(([k, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t,
})), [KEY, daten.eintraege, daten.tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const anzeige = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(anzeige.includes('Liegt es wirklich daran?'), 'unter dem Fund steht die Nachfrage');
check(anzeige.includes('verschwindet'), 'mit dem Urteil für diesen Scheinbefund');

// Die Grundlage muss aufklappbar dabeistehen – ein Urteil ohne seine Zahlen
// ist ein Orakel.
await page.locator('.stand summary').first().click();
await page.waitForTimeout(200);
const offen = (await page.locator('.stand').first().textContent()).replace(/\s+/g, ' ');
check(/an ruhigen Tagen|an angespannten Tagen/.test(offen), 'aufgeklappt stehen die Schichten da');
check(/\d+\/\d+ Mahlzeiten/.test(offen), 'mit den Fallzahlen je Schicht');

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/stoerfaktor.png`, fullPage: true });
await browser.close();
ende();
