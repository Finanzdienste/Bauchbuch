/*
 * Der Reiter „Ideen": Verbesserungsvorschläge zur App selbst.
 *
 * Der Sinn liegt nicht im Aufschreiben, sondern im Weitergeben – wer die App
 * benutzt, sitzt nicht neben dem, der sie baut. Deshalb wird hier neben dem
 * Eintragen vor allem geprüft, dass die Liste wieder herauskommt: als Text,
 * den man in eine Nachricht einfügen kann.
 *
 * Und dass eine Idee nichts mit dem Tagebuch zu tun hat: Sie darf in keiner
 * Auswertung auftauchen und keinen Tag als „notiert" gelten lassen.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

/*
 * Der Kasten wird abgefangen und hingehalten – die Anfrage kommt an und wird
 * nie beantwortet.
 *
 * Ohne das hinge dieser Test an einem Rennen: Die App schickt jetzt sofort,
 * der Aufruf scheitert im Testnetz an der Namensauflösung, und je nachdem, ob
 * das vor oder nach der nächsten Prüfung passiert, steht auf dem Reiter
 * „geht raus" oder eine Fehlermeldung. Beides wäre richtig und der Test mal
 * grün, mal rot, ohne dass sich an der App etwas geändert hätte. Genau diese
 * Sorte Testfehler hat in diesem Projekt schon zweimal eine falsche Zahl in
 * eine Zusage geschrieben.
 *
 * Hingehalten heißt: Die Lage bleibt „unterwegs", und das ist die Lage, um
 * die es auf diesem Reiter geht. Der Fehlerfall kommt am Ende dran, dann mit
 * einer eigenen Antwort.
 */
let kastenAntwort = null;
await page.route('**/idee', async (route) => {
  if (kastenAntwort) return route.fulfill(kastenAntwort);
  return new Promise(() => {});
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'ideen' })), KEY);
await page.reload({ waitUntil: 'networkidle' });

check(await page.locator('.tab').count() === 6, 'sechs Reiter unten, „Ideen" ist dabei');
check(
  await page.locator('[data-act="tab"][data-tab="ideen"]').count() === 1,
  'der Reiter lässt sich ansteuern',
);
check(await page.locator('.leer').count() === 1, 'am Anfang steht dort, dass noch nichts da ist');

/* ---------- Eintragen ---------- */

await page.locator('#ideeText').fill('Die Uhrzeit sollte man schneller ändern können.');
await page.locator('[data-act="idee-neu"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 1, 'die Idee steht in der Liste');
check(
  (await page.locator('.idee').first().textContent()).includes('Uhrzeit'),
  'mit ihrem Wortlaut',
);
check(await page.locator('#ideeText').inputValue() === '', 'das Feld ist danach wieder leer');

await page.locator('[data-act="idee-neu"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 1, 'ein leeres Feld legt nichts an');
check(
  (await page.locator('#toast').textContent()).includes('Da steht noch nichts'),
  'und sagt das auch',
);

await page.locator('#ideeText').fill('Mehr Platz für eigene Auslöser.');
await page.locator('[data-act="idee-neu"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 2, 'zwei Ideen');
check(
  (await page.locator('.idee').first().textContent()).includes('Mehr Platz'),
  'die neueste steht oben',
);

/* ---------- Erledigt ist nicht gelöscht ---------- */

await page.locator('.idee').first().locator('[data-act="idee-haken"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 2, 'abhaken löscht nichts');
check(
  await page.locator('.idee.ab').count() === 1,
  'die erledigte Idee ist als erledigt gezeichnet',
);
check(
  (await page.locator('.idee').last().textContent()).includes('Mehr Platz'),
  'und rutscht ans Ende der Liste',
);
check(
  (await page.locator('.karte').last().textContent()).includes('1 offene Idee, 1 erledigt'),
  'die Zählung stimmt',
);

await page.locator('.idee.ab').locator('[data-act="idee-haken"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee.ab').count() === 0, 'ein zweites Tippen macht sie wieder offen');

/* ---------- Der Weg nach draußen ---------- */

// Den Knopf gibt es zweimal: oben in der Erinnerung „noch nicht verschickt"
// und unten im Fuß. Gemeint ist hier der untere.
await page.locator('[data-act="ideen-kopieren"]').last().click();
await page.waitForTimeout(300);
const ablage = await page.evaluate(() => navigator.clipboard.readText());
check(ablage.includes('Bauchbuch'), 'der kopierte Text ist überschrieben');
check(ablage.includes('Uhrzeit') && ablage.includes('Mehr Platz'), 'und enthält beide Ideen');

/* ---------- Ideen sind kein Tagebuch ---------- */

await page.locator('[data-act="tab"][data-tab="verlauf"]').click();
await page.waitForTimeout(250);
const kacheln = await page.locator('.kachel').allTextContents();
check(
  kacheln[0].startsWith('0'),
  `zwei Ideen machen aus keinem Tag einen notierten (${kacheln[0]})`,
);
await page.locator('[data-act="tab"][data-tab="muster"]').click();
await page.waitForTimeout(250);
/*
 * Der Reiter zählt weiterhin null Mahlzeiten, obwohl zwei Ideen im Speicher
 * stehen. Der Wortlaut hat sich geändert – früher „Noch keine Mahlzeit
 * eingetragen", jetzt die Fallzahl im Fortschrittsblock –, die Aussage nicht,
 * und die Zahl ist nachprüfbarer als der Satz.
 */
check(
  /0 Mahlzeiten eingetragen/.test(
    (await page.locator('#view').textContent()).replace(/\s+/g, ' '),
  ),
  'und tauchen in der Auswertung nicht auf',
);

/* ---------- Bleiben ---------- */

await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="tab"][data-tab="ideen"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 2, 'die Ideen überleben das Neuladen');
const gespeichert = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(gespeichert.ideen.length === 2, 'sie stehen im selben Speicher wie alles andere');
check(
  gespeichert.eintraege.length === 0,
  'aber nicht in den Eintragungen – getrennte Liste, wie gedacht',
);

/* ---------- Was raus ist, ist raus ---------- */

/*
 * Vorschläge gehen von selbst hinaus, kurz nachdem sie eingetragen wurden.
 * Was hier geprüft wird, ist die Buchführung darüber: Solange etwas noch
 * unterwegs ist, steht es in der Anzeige; was schon draußen war, kommt nicht
 * wieder als offen zurück.
 *
 * (Dass tatsächlich genau eine Anfrage hinausgeht und was in ihr steht, prüft
 * tests/test-still.mjs – hier geht es nur um das, was die Frau davon sieht.)
 */
// Kopiert wurde weiter oben schon einmal – seitdem ist nichts Neues
// dazugekommen, also steht auch nichts mehr aus.
check(
  await page.locator('.karte.karte-merk').count() === 0,
  'nach dem Weitergeben steht nichts mehr aus',
);

await page.locator('#ideeText').fill('Noch eine Sache.');
await page.locator('[data-act="idee-neu"]').click();
await page.waitForTimeout(250);
check(
  (await page.locator('#toast').textContent()).includes('Geht raus'),
  'beim Eintragen sagt die App, dass es rausgeht',
);
check(
  (await page.locator('.karte.karte-merk').first().textContent()).replace(/\s+/g, ' ')
    .includes('1 Idee geht raus'),
  'und die Karte sagt es noch einmal – nur für die eine neue',
);

/*
 * UND SIE SAGT, WAS DANACH NICHT MEHR GEHT.
 *
 * Hier stand einmal die Zusage, man könne den Satz noch eine Minute lang
 * zurücknehmen. Die Bedenkzeit ist weg, weil sie den Versand verhinderte,
 * den sie absichern sollte – aber die Stelle bleibt geprüft, nur mit dem
 * umgekehrten Vorzeichen: Der Reiter muss sagen, dass Löschen die Idee aus
 * der eigenen Liste nimmt und nicht mehr aus dem Kasten.
 *
 * Das ist der unangenehmere Satz, und genau deshalb steht er da. Eine Zusage
 * stillschweigend fallen zu lassen und die alte Beschriftung stehen zu
 * lassen, wäre die schlechtere Hälfte von beidem.
 */
check(
  (await page.locator('.karte.karte-merk').first().textContent()).replace(/\s+/g, ' ')
    .includes('nicht mehr aus seinem Kasten'),
  'und sagt ehrlich, dass Löschen sie dort nicht mehr herausholt',
);

/* ---------- Löschen ---------- */

await page.locator('.idee').first().locator('[data-act="idee-weg"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 2, 'löschen geht auch');

/* ---------- Wenn der Kasten nein sagt ---------- */

/*
 * DER TEIL, DEN ES VORHER NICHT GAB, UND SEIN PREIS WAR EIN ABEND.
 *
 * Der Sendeversuch fing seinen Fehler ab und tat nichts damit – ein leeres
 * `catch`, begründet damit, in der Anzeige stehe ohnehin, dass etwas offen
 * sei. Das stimmte und half niemandem. Ein Zettel wurde eingetragen, kam
 * nicht an, und die App sagte weiter freundlich „geht gleich raus". Gesucht
 * wurde die Ursache dann an drei falschen Stellen, weil die einzige Stelle,
 * die sie kannte, schwieg.
 *
 * Wer den Grund sieht, kann etwas tun: ein anderes Netz nehmen, den Text
 * kürzen, ihn anders schicken. Wer ihn nicht sieht, hält die App für heil.
 */
kastenAntwort = {
  status: 413,
  contentType: 'application/json',
  body: JSON.stringify({ fehler: 'Das ist zu lang – höchstens 2000 Zeichen.' }),
};

await page.locator('#ideeText').fill('Ein Vorschlag, den der Kasten ablehnt.');
await page.locator('[data-act="idee-neu"]').click();

const karte = page.locator('.karte.karte-merk').first();
await karte.getByText('Das ist zu lang', { exact: false }).waitFor({ timeout: 5000 })
  .catch(() => {});
const stand = (await karte.textContent()).replace(/\s+/g, ' ');

check(
  stand.includes('Das ist zu lang – höchstens 2000 Zeichen.'),
  `der Grund der Absage steht auf dem Reiter (${stand.slice(0, 60)})`,
);
check(
  stand.includes('nicht rausgegangen'),
  'und die Überschrift behauptet nicht mehr, es ginge gleich raus',
);
check(
  stand.includes('nicht verloren'),
  'dazu, dass der Text dasteht und es wieder versucht wird',
);
check(
  await karte.locator('[data-act="ideen-senden"]').count() === 1,
  'und ein Knopf, es sofort noch einmal zu versuchen',
);

/*
 * Gegenprobe: Ohne sie prüfte das Obige nur, dass irgendein Text dasteht.
 * Eine Änderung an den Ideen räumt die alte Meldung weg – sie gehört zu einem
 * Versuch, der vorbei ist.
 */
kastenAntwort = null;
await page.locator('.idee').first().locator('[data-act="idee-weg"]').click();
await page.waitForTimeout(300);
check(
  !(await page.locator('#view').textContent()).includes('Das ist zu lang'),
  'nach einer Änderung ist die alte Meldung weg',
);

await page.screenshot({ path: `${SHOT}/60-ideen.png` });
check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
