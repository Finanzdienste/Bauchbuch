/*
 * Was schon feststeht – und warum die App das wissen muss
 *
 * Diese App rechnete bisher so, als sei nichts bekannt. An mehreren Stellen
 * steht derselbe Vorbehalt, und er ist richtig:
 *
 *     „Die Regelwerke setzen ausdrücklich voraus, dass nichts Organisches
 *      dahintersteckt – und das weiß nur eine Untersuchung."
 *
 * Nur gilt er nicht für jeden. Wer eine Spiegelung hinter sich hat und einen
 * Befund bekommen hat, bei dem steckt etwas Organisches dahinter. Die App
 * redete trotzdem weiter, als sei die Frage offen: „Kriterien erfüllt", wo die
 * Kriterien nicht mehr anwendbar sind, und unter „Was keine App beantwortet"
 * Untersuchungen, die längst gelaufen sind.
 *
 * Ungenau an der heikelsten Stelle, und in die unangenehme Richtung: Bekanntes
 * als unbekannt. Wer das liest, hält seinen eigenen Befund für eine von
 * mehreren Möglichkeiten.
 *
 * Geprüft wird in vier Richtungen:
 *
 *   1. EINTRAGEN UND WEGNEHMEN, und dass es das Neuladen übersteht.
 *   2. DIE KRITERIEN REDEN ANDERS – aber rechnen gleich. Die Punktzahl darf
 *      sich nicht ändern, nur ihre Lesart.
 *   3. GEKLÄRTES VERSCHWINDET aus „Was noch fehlt" – und zwar nur, was
 *      wirklich geklärt ist. Diese Prüfung ist die gefährliche: Ein Verdacht,
 *      der zu Unrecht verschwindet, kostet eine Untersuchung.
 *   4. DIE WARNZEICHEN BLEIBEN. Keine Diagnose der Welt macht Blut im Stuhl
 *      zu etwas, das nicht angesehen gehört.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

/* ---------- Ein Tagebuch, das die Kriterien erfüllt ---------- */

/*
 * Lang und dicht genug, dass Rom IV und GerdQ überhaupt etwas sagen: 100 Tage
 * mit Schmerz, Sodbrennen und Stuhlgang. Ohne das prüfte der Test die
 * Absagen und nicht die Sache.
 */
const eintraege = [];
const tage = {};
for (let i = 100; i >= 1; i--) {
  const am = vorTagen(i);
  tage[am] = { notiert: true };
  eintraege.push({
    id: `m${i}`, am, um: '12:30', art: 'essen', was: 'Mittag', portion: 'normal',
    zutaten: [{ id: 'fett', rolle: 'haupt' }],
  });
  eintraege.push({
    id: `b${i}`, am, um: '15:00', art: 'beschwerde', staerke: 6,
    arten: ['oberbauch', 'sodbrennen', 'krampf'], stuhlbezug: 'besser',
  });
  if (i % 2 === 0) {
    eintraege.push({ id: `s${i}`, am, um: '08:00', art: 'stuhl', form: 6, dringend: true });
  }
}

const laden = async (befunde) => {
  await page.evaluate(([k, e, t, b]) => localStorage.setItem(k, JSON.stringify({
    begruesst: true, tab: 'muster', eintraege: e, tage: t, befunde: b,
    beschwerdenSeit: '2024-01-01',
  })), [KEY, eintraege, tage, befunde]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#view .karte');
  // Zugeklappte Abschnitte aufmachen – „Was keine App beantwortet" steht in
  // einer Klappe, und sein Inhalt soll hier mitgelesen werden.
  await page.evaluate(() => document.querySelectorAll('#view details')
    .forEach((d) => { d.open = true; }));
  return (await page.locator('#view').innerText()).replace(/\s+/g, ' ');
};

/* ---------- 1. Ohne Befund redet die App wie bisher ---------- */

const ohne = await laden([]);
check(
  ohne.includes('Erfüllte Kriterien sind keine Diagnose'),
  'ohne Befund steht der alte Vorbehalt da',
);
check(
  ohne.includes('dass nichts Organisches'),
  'samt der Voraussetzung, die dann wirklich offen ist',
);
check(
  ohne.includes('Helicobacter pylori'),
  'und Helicobacter steht als offene Möglichkeit in der Liste',
);

// Die Punktzahl merken – sie darf sich gleich nicht ändern.
const punkte = (t) => {
  const m = /GerdQ[^0-9]*(\d+)/.exec(t);
  return m ? m[1] : null;
};
const punkteOhne = punkte(ohne);
check(punkteOhne !== null, `der GerdQ hat eine Punktzahl (${punkteOhne})`);

/* ---------- 2. Mit Befund: andere Lesart, gleiche Rechnung ---------- */

const mit = await laden([{ id: 'gastritis-c', am: vorTagen(30) }]);

check(
  mit.includes('Das hier ordnet nichts mehr ein'),
  'mit einem organischen Befund sagt die App, dass sie nichts mehr einordnet',
);
check(
  mit.includes('Gastritis Typ C'),
  'und nennt, was feststeht',
);
check(
  mit.includes('Verlaufsbeobachtung'),
  'sie beobachtet den Verlauf, statt zu suchen',
);
check(
  !mit.includes('Erfüllte Kriterien sind keine Diagnose'),
  'der alte Vorbehalt steht nicht mehr daneben – zwei Lesarten auf einmal wären keine',
);

/*
 * DIE PRÜFUNG, AUF DIE ES HIER ANKOMMT.
 *
 * Ein Befund ändert, was die App *sagt*. Er darf nicht ändern, was sie
 * *rechnet*: Dieselben Tage, dieselben Beschwerden, dieselbe Punktzahl. Täte
 * er es, wäre aus einer Einordnung eine sich selbst bestätigende geworden –
 * wer eine Diagnose einträgt, bekäme die passenden Zahlen dazu.
 */
check(
  punkte(mit) === punkteOhne,
  `die Punktzahl bleibt dieselbe (${punkteOhne} → ${punkte(mit)})`,
);

/* ---------- 3. Geklärtes verschwindet – und nur das ---------- */

/*
 * Gastritis Typ C ist definitionsgemäß chemisch verursacht, also nicht
 * bakteriell. Helicobacter ist damit keine offene Frage mehr.
 */
check(
  !mit.includes('Helicobacter pylori'),
  'Helicobacter steht nicht mehr als offene Möglichkeit da',
);
check(
  /steh(t|en) nicht mehr hier, weil sie bei dir schon geklärt/.test(mit),
  'und die App sagt, dass sie etwas weggelassen hat, statt es stillschweigend zu tun',
);

/*
 * Die Gegenprobe, ohne die das Obige nichts hieße: Was der Befund *nicht*
 * klärt, muss stehen bleiben. Bei einer Gastritis Typ C ist die Frage nach
 * Schmerzmitteln vom NSAR-Typ nicht erledigt – sie ist die Hauptfrage.
 */
check(
  mit.includes('Schmerzmittel') || mit.includes('NSAR'),
  'die Frage nach Schmerzmitteln bleibt – bei Typ C ist sie der Kern',
);
check(
  mit.includes('Zöliakie'),
  'und Zöliakie ebenfalls, denn davon sagt dieser Befund nichts',
);

/* ---------- 4. Die Warnzeichen bleiben, egal was feststeht ---------- */

/*
 * Keine Diagnose der Welt macht Blut im Stuhl zu etwas, das nicht angesehen
 * gehört. Wäre diese Zeile falsch, hätte ein Eintrag unter „Mehr" die einzige
 * dringende Auskunft dieser App abgeschaltet.
 */
await page.evaluate(([k]) => {
  const roh = JSON.parse(localStorage.getItem(k));
  roh.eintraege.push({
    id: 'warn1', am: roh.eintraege[0].am, um: '09:00', art: 'stuhl',
    form: 5, warnzeichen: ['blutstuhl'],
  });
  localStorage.setItem(k, JSON.stringify(roh));
}, [KEY]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#view .karte');
await page.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
const mitWarnung = (await page.locator('#view').innerText()).replace(/\s+/g, ' ');
check(
  /Blut im Stuhl/i.test(mitWarnung),
  'ein Warnzeichen steht da, auch wenn eine Diagnose feststeht',
);

/* ---------- 5. Eintragen und wegnehmen ---------- */

await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'mehr',
})), KEY);
await page.reload({ waitUntil: 'networkidle' });

const karte = page.locator('.karte', { hasText: 'Was schon feststeht' });
check(await karte.count() === 1, 'die Karte steht unter „Mehr"');
check(
  (await karte.textContent()).includes('von einer Ärztin bekommen hast'),
  'und verlangt ausdrücklich eine gestellte Diagnose, keine Vermutung',
);

await karte.locator('[data-act="befund-neu"][data-id="hiatushernie"]').click();
await page.waitForTimeout(200);
check(
  await page.locator('.befund').count() === 1,
  'ein Befund lässt sich eintragen',
);
check(
  (await page.locator('.befund').textContent()).includes('Zwerchfell'),
  'und steht mit seiner Erklärung da, nicht nur als Name',
);
check(
  await karte.locator('[data-act="befund-neu"][data-id="hiatushernie"]').count() === 0,
  'zweimal dasselbe geht nicht',
);

await page.reload({ waitUntil: 'networkidle' });
check(await page.locator('.befund').count() === 1, 'er überlebt das Neuladen');

await page.locator('.befund [data-act="befund-weg"]').click();
await page.waitForTimeout(200);
check(await page.locator('.befund').count() === 0, 'und lässt sich wieder wegnehmen');

await page.screenshot({ path: `${SHOT}/71-befunde.png` });
check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
ende();
