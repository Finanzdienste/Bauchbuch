/*
 * Wann kommt es? – und warum das mehr wert ist als „nach dem Essen"
 *
 * Der Bauch braucht Zeit, und je nach Ort verschieden lange. Was eine halbe
 * Stunde nach dem Essen brennt, kommt aus dem Magen; was nach sechs Stunden
 * bläht, aus dem Dickdarm – dorthin ist der Rest vorher gar nicht gelangt. In
 * der Sprechstunde ist das der Unterschied zwischen einem Säureblocker und
 * einer Ernährungsberatung, und beides steht im selben Tagebuch.
 *
 * Geprüft wird an Tagebüchern, deren richtige Antwort vorher feststeht:
 *
 *   1. FRÜH. Das Merkmal schlägt eine Stunde nach dem Essen zu. Die App muss
 *      das frühe Fenster nennen und den Magen, nicht den Darm.
 *   2. SPÄT. Dasselbe Merkmal, aber die Beschwerde kommt nach sechs Stunden.
 *      Der Vier-Stunden-Schnitt der alten Rechnung sieht davon fast nichts –
 *      das Zeitprofil muss es finden.
 *   3. VERTEILT. Kein Schwerpunkt. Dann darf auch keiner genannt werden.
 *
 * Und die Falle, um die es bei alldem geht: Wer dreimal am Tag isst, dessen
 * Beschwerde vier Stunden nach dem Frühstück ist gleichzeitig eine Stunde nach
 * dem Mittagessen. Sie darf genau einer Mahlzeit gehören, sonst steht am Ende
 * jede Beschwerde in jedem Fenster.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const uhr = (std) => `${String(Math.floor(std)).padStart(2, '0')}:00`;

/*
 * Ein Tagebuch mit einer Mahlzeit am Tag.
 *
 * Nur eine, und zwar früh: So liegt das späte Fenster (4–8 Stunden) frei und
 * ist überhaupt beobachtbar. Genau das ist im echten Leben der Engpass, und
 * der Test soll die Rechnung prüfen, nicht diesen Engpass.
 *
 * `wann` sagt, wie viele Stunden nach der Mahlzeit die Beschwerde kommt;
 * `verteilt` streut sie stattdessen über alle drei Fenster.
 */
function bauen({ wann = 1, staerke = 6, verteilt = false, tage: anzahl = 60 } = {}) {
  const eintraege = [];
  const tage = {};

  for (let i = 1; i <= anzahl; i++) {
    const am = vorTagen(i);
    tage[am] = { notiert: true };
    // Jeden zweiten Tag mit Kaffee – das ist das Merkmal, um das es geht.
    const mitKaffee = i % 2 === 0;

    eintraege.push({
      id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal',
      zutaten: mitKaffee ? [{ id: 'kaffee', rolle: 'haupt' }] : [{ id: 'obst', rolle: 'haupt' }],
    });

    // Ohne Kaffee: ein ruhiger Grundwert, damit nicht der Vergleich gegen
    // null läuft. Mit Kaffee: der Ausschlag, und zwar zur vorgesehenen Stunde.
    const stunden = verteilt ? [1, 3, 6][i % 3] : wann;
    eintraege.push({
      id: `b${i}`, am, um: uhr(8 + stunden), art: 'beschwerde',
      staerke: mitKaffee ? staerke : 2, arten: ['brennen'],
    });
  }
  return { eintraege, tage };
}

async function profil(daten) {
  return page.evaluate(async ([e]) => {
    const z = await import('./js/zeitprofil.js');
    const fenster = z.fensterWerte(e);
    const p = z.zeitProfil(fenster, 'kaffee');
    return {
      schwerpunkt: p.schwerpunkt,
      satz: p.satz,
      pruefbare: p.pruefbare,
      teile: p.teile.map((t) => ({
        id: t.id, pruefbar: t.pruefbar, d: Number(t.differenz.toFixed(2)),
        faelle: t.faelle,
      })),
    };
  }, [daten.eintraege]);
}

/* ---------- 1. Früh heißt Magen ---------- */

const frueh = await profil(bauen({ wann: 1 }));
check(frueh.schwerpunkt === 'frueh', `eine Stunde danach: frühes Fenster (${frueh.schwerpunkt})`);
check(
  /Magen|Speiseröhre/.test(frueh.satz),
  'und die App nennt den Ort, nicht nur die Uhrzeit',
);
// Der Dickdarm darf vorkommen – aber nur, um ihn auszuschließen. Nach einer
// Stunde ist dorthin nichts gelangt, und genau das ist die Auskunft.
check(
  /Für den Dickdarm ist es zu früh/.test(frueh.satz),
  'und schließt den Dickdarm ausdrücklich aus',
);

/* ---------- 2. Spät heißt Dickdarm ---------- */

const spaet = await profil(bauen({ wann: 6 }));
check(spaet.schwerpunkt === 'spaet', `sechs Stunden danach: spätes Fenster (${spaet.schwerpunkt})`);
check(/Dickdarm/.test(spaet.satz), 'mit der Vergärung als Erklärung');

/*
 * Und das ist der eigentliche Gewinn: Die alte Rechnung mit ihrem festen
 * Vier-Stunden-Fenster sieht von einer Beschwerde nach sechs Stunden gar
 * nichts. Ohne das Zeitprofil wäre dieser Auslöser unauffällig geblieben.
 */
const altesFenster = await page.evaluate(async ([e]) => {
  const a = await import('./js/auswertung.js');
  const b = a.ausloeserBilanz(e, { fenster: 4, mindestFaelle: 5 }).find((x) => x.id === 'kaffee');
  return b ? Number(b.differenz.toFixed(2)) : null;
}, [bauen({ wann: 6 }).eintraege]);
check(
  Math.abs(altesFenster) < 0.5,
  `im festen Vier-Stunden-Fenster war davon nichts zu sehen (${altesFenster})`,
);

/* ---------- 3. Ohne Schwerpunkt kein Schwerpunkt ---------- */

const verteilt = await profil(bauen({ verteilt: true }));
check(
  verteilt.schwerpunkt === null,
  `verteilt sich der Ausschlag, wird kein Zeitpunkt genannt (${verteilt.schwerpunkt})`,
);

/* ---------- 4. Zu wenig ist nicht „gleichmäßig" ---------- */

const duenn = await profil(bauen({ wann: 1, tage: 8 }));
check(duenn.schwerpunkt === null, 'bei acht Tagen kein Urteil');
check(
  /nicht sagen|fehlt|genug/i.test(duenn.satz),
  'und die App sagt, dass die Daten fehlen – nicht, dass nichts sei',
);

/* ---------- 5. Jede Beschwerde gehört genau einer Mahlzeit ---------- */

/*
 * Drei Mahlzeiten am Tag, eine einzige Beschwerde fünf Stunden nach dem
 * Frühstück – also eine Stunde nach dem Mittagessen. Sie darf beim Mittagessen
 * landen und nirgendwo sonst. Und das späte Fenster des Frühstücks ist an
 * diesem Tag nicht etwa beschwerdefrei, sondern gar nicht beobachtbar: Es lag
 * eine Mahlzeit dazwischen.
 */
const drei = await page.evaluate(async () => {
  const z = await import('./js/zeitprofil.js');
  const eintraege = [
    { id: 'f', am: '2026-01-10', um: '08:00', art: 'essen', was: 'Frühstück' },
    { id: 'mi', am: '2026-01-10', um: '12:00', art: 'essen', was: 'Mittag' },
    { id: 'ab', am: '2026-01-10', um: '18:00', art: 'essen', was: 'Abend' },
    { id: 'b', am: '2026-01-10', um: '13:00', art: 'beschwerde', staerke: 7, arten: ['brennen'] },
    { id: 'spaet', am: '2026-01-11', um: '09:00', art: 'notiz', text: 'noch da' },
  ];
  const w = z.fensterWerte(eintraege);
  const von = (id) => w.find((x) => x.m.id === id);
  return {
    fruehstueckFrueh: von('f').werte.frueh.wert,
    fruehstueckSpaetBeobachtbar: von('f').werte.spaet.beobachtbar,
    mittagFrueh: von('mi').werte.frueh.wert,
    mittagSpaetBeobachtbar: von('mi').werte.spaet.beobachtbar,
    abendFrueh: von('ab').werte.frueh.wert,
  };
});
check(drei.mittagFrueh === 7, 'die Beschwerde gehört der Mahlzeit davor');
check(drei.fruehstueckFrueh === 0, 'und keiner zweiten');
check(drei.abendFrueh === 0, 'auch nicht einer späteren');
check(
  drei.fruehstueckSpaetBeobachtbar === false,
  'ein Fenster mit einer Mahlzeit darin gilt als nicht beobachtbar',
);
check(
  drei.mittagSpaetBeobachtbar === false,
  'und auch das Abendessen verdeckt das späte Fenster des Mittags',
);

/* ---------- 6. Ein Fenster ohne Tagebuch dahinter zählt nicht ---------- */

/*
 * Die letzte Mahlzeit vor dem Ende des Tagebuchs hat kein spätes Fenster –
 * niemand weiß, was in diesen Stunden war. Es als „nichts gewesen" zu zählen
 * wäre derselbe Fehler wie eine Lücke im Kalender als guten Tag zu zählen.
 */
const rand = await page.evaluate(async () => {
  const z = await import('./js/zeitprofil.js');
  const w = z.fensterWerte([
    { id: 'm', am: '2026-01-10', um: '20:00', art: 'essen', was: 'Abend' },
  ]);
  return w[0].werte;
});
check(
  rand.frueh.beobachtbar === false && rand.spaet.beobachtbar === false,
  'nach der letzten Eintragung ist kein Fenster mehr beobachtbar',
);

/* ---------- Und auf dem Zettel für die Sprechstunde ---------- */

const zettel = await page.evaluate(async ([e, t]) => {
  const b = await import('./js/bericht.js');
  const alle = Object.keys(t).sort();
  return b.arztBericht({ eintraege: e, tage: t }, alle[0], alle[alle.length - 1]);
}, [bauen({ wann: 6 }).eintraege, bauen({ wann: 6 }).tage]);

check(zettel.includes('WIE LANGE NACH DEM ESSEN'), 'der Bericht führt den Abschnitt');
check(zettel.includes('Dickdarm'), 'benennt den Ort, den die Stunden nahelegen');

/*
 * Und der eigentliche Gewinn: Der Kaffee ist im Vier-Stunden-Fenster
 * unauffällig – dort steht er zu Recht nicht. Er darf deshalb aber nicht
 * durchfallen, sondern gehört unter die Funde, nach denen das feste Fenster
 * gar nicht sucht.
 */
check(
  zettel.includes('ERST NACH DEM FENSTER AUFFÄLLIG'),
  'und führt eigens, was das feste Fenster nicht sehen kann',
);
check(
  /Kaffee\s+\d/.test(zettel.split('ERST NACH DEM FENSTER AUFFÄLLIG')[1] || ''),
  'mit dem Auslöser, der sonst durchgefallen wäre',
);
check(
  /Zugeordnet: \d+ von \d+ Beschwerden/.test(zettel),
  'mit der Angabe, wie viele Beschwerden überhaupt zuzuordnen waren',
);

/* ---------- Und in der Anzeige ---------- */

const daten = bauen({ wann: 6 });
await page.evaluate(([k, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t,
})), [KEY, daten.eintraege, daten.tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(sicht.includes('Wie lange nach dem Essen'), 'die Karte steht auf dem Reiter Muster');
check(
  /4–8 Stunden danach/.test(sicht),
  'mit den Stunden seit der Mahlzeit, nicht der Uhrzeit',
);
check(
  sicht.includes('zuordnen'),
  'und der Angabe, wie viele Beschwerden sich überhaupt zuordnen ließen',
);
check(
  sicht.includes('Erst später auffällig') && sicht.includes('Kaffee'),
  'und der späte Auslöser steht auch in der App, statt am Fenster zu scheitern',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/zeitprofil.png`, fullPage: true });
await browser.close();
ende();
