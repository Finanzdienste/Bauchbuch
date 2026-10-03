/*
 * „Geht gut" und „Geht nicht" – die Liste, die nichts auswertet
 *
 * Diese App konnte lange nur eine Richtung: was Beschwerden macht, ab acht
 * Fällen, mit Zufallsschranke. Das ist richtig für einen Befund und nutzlos
 * für die Frage, die abends um sieben ansteht: Was kann ich jetzt essen?
 *
 * Wer eine Gastritis hat und auf die meisten Sachen keinen Appetit, weiß nach
 * drei Tagen, was geht – nur stand es nirgends. Also: zwei Listen, selbst
 * gefüllt, ohne Fallzahl und ohne Urteil.
 *
 * Geprüft wird in vier Richtungen, und die zweite ist die, bei der es
 * gefährlich würde:
 *
 *   1. SIE TUT, WAS SIE SOLL. Eintragen, umschalten, löschen, Neuladen.
 *   2. SIE RECHNET NICHT MIT. Ein Eintrag hier darf in keiner Auswertung
 *      auftauchen, keinen Tag als notiert gelten lassen und keine Fallzahl
 *      verändern. Sonst hätte jemand mit einem Tipp seine eigenen Zahlen
 *      verfälscht, ohne es zu merken.
 *   3. SIE GEHT NICHT HINAUS. Dieselbe Zusage wie für alles andere im
 *      Tagebuch.
 *   4. SIE WIDERSPRICHT, WO ES ANGEBRACHT IST – und nur dann.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY });
const page = await ctx.newPage();
const fehler = [];
const fremd = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
page.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith(URL.replace(/\/index\.html$/, '')) && !u.startsWith('data:')) {
    fremd.push(`${r.method()} ${u}`);
  }
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'heute',
})), KEY);
await page.reload({ waitUntil: 'networkidle' });

/* ---------- 1. Eintragen, umschalten, löschen ---------- */

const karte = page.locator('details.angebotbogen', { hasText: 'Was geht und was nicht' });
check(await karte.count() === 1, 'die Liste steht auf dem Tagesreiter');
check(
  await karte.evaluate((d) => d.open),
  'und ist offen, solange noch nichts drinsteht – sonst fände sie niemand',
);

const eintragen = async (art, text) => {
  await page.locator(`#kueche-${art}`).fill(text);
  await page.locator(`[data-act="kueche-neu"][data-art="${art}"]`).click();
  await page.waitForTimeout(150);
};

await eintragen('geht', 'Haferbrei');
await eintragen('geht', 'Kartoffeln');
await eintragen('nicht', 'Kaffee');

check(await page.locator('.kueche-zeile').count() === 3, 'drei Einträge stehen da');
check(await page.locator('.kueche-zeile.k-geht').count() === 2, 'zwei davon auf „Geht gut"');
check(await page.locator('.kueche-zeile.k-nicht').count() === 1, 'einer auf „Geht nicht"');
check(
  await page.locator('#kueche-geht').inputValue() === '',
  'das Feld ist danach wieder leer',
);

await eintragen('geht', '   ');
check(await page.locator('.kueche-zeile').count() === 3, 'ein leeres Feld legt nichts an');

/*
 * Derselbe Name noch einmal, aber auf der anderen Liste. Das ist der häufige
 * Fall und kein Sonderfall: Was im Januar nicht ging, geht im März wieder.
 * Zweimal „Kaffee" dastehen zu haben, macht die ganze Liste wertlos.
 */
await eintragen('geht', 'Kaffee');
check(
  await page.locator('.kueche-zeile').count() === 3,
  'derselbe Name wandert hinüber, statt doppelt dazustehen',
);
check(
  await page.locator('.kueche-zeile.k-geht').count() === 3,
  'und steht jetzt unter „Geht gut"',
);

// Der Daumen schiebt zurück.
await page.locator('.kueche-zeile', { hasText: 'Kaffee' }).locator('[data-act="kueche-dreh"]').click();
await page.waitForTimeout(150);
check(
  await page.locator('.kueche-zeile.k-nicht').count() === 1,
  'ein Tipp auf den Daumen schiebt wieder auf die andere Liste',
);

await page.locator('.kueche-zeile', { hasText: 'Kartoffeln' }).locator('[data-act="kueche-weg"]').click();
await page.waitForTimeout(150);
check(await page.locator('.kueche-zeile').count() === 2, 'löschen geht auch');

await page.reload({ waitUntil: 'networkidle' });
await page.locator('details.angebotbogen', { hasText: 'Was geht und was nicht' })
  .locator('summary').click();
await page.waitForTimeout(150);
check(await page.locator('.kueche-zeile').count() === 2, 'die Liste überlebt das Neuladen');

/* ---------- 2. Und sie rechnet nirgends mit ---------- */

/*
 * DIE PRÜFUNG, BEI DER ES GEFÄHRLICH WÜRDE.
 *
 * Diese Liste steht neben dem Tagebuch, nicht darin. Täte sie das nicht,
 * hätte jemand mit einem Tipp auf „Haferbrei" seine eigenen Zahlen verändert:
 * einen Tag als notiert gelten lassen, eine Fallzahl verschoben, eine
 * Einstufung gekippt. Und zwar unsichtbar, weil niemand erwartet, dass eine
 * Merkliste in die Statistik greift.
 */
const zustand = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY));
check(
  Array.isArray(zustand.kueche) && zustand.kueche.length === 2,
  'sie liegt in einem eigenen Feld, nicht zwischen den Eintragungen',
);
check(
  zustand.eintraege.length === 0,
  `und hat keinen einzigen Tagebucheintrag erzeugt (${zustand.eintraege.length})`,
);
check(
  Object.keys(zustand.tage || {}).length === 0,
  'auch keinen Tag als „notiert" markiert',
);

await page.locator('[data-act="tab"][data-tab="muster"]').click();
await page.waitForTimeout(400);
const muster = (await page.locator('#view').innerText()).replace(/\s+/g, ' ');
check(
  !muster.includes('Haferbrei'),
  'auf dem Muster-Reiter taucht sie nicht als Auslöser auf',
);

/* ---------- 3. Und sie geht nicht hinaus ---------- */

check(fremd.length === 0, `keine einzige Anfrage nach draußen (${fremd.join(' | ') || 'keine'})`);

/* ---------- 4. Der Widerspruch – und seine Grenze ---------- */

/*
 * Das Wertvollste an der Verbindung von eigener Liste und Auswertung: die
 * Stelle, an der jemand sich täuscht, und zwar in der Richtung, die er selbst
 * nicht sehen kann.
 *
 * Gebaut wird ein Tagebuch, in dem Kaffee deutlich schlechter dasteht – und
 * zugleich steht Kaffee auf „Geht gut". Genau dann muss die App etwas sagen.
 */
const eintraege = [];
const tage = {};
for (let i = 40; i >= 1; i--) {
  const am = vorTagen(i);
  tage[am] = { notiert: true };
  const mitKaffee = i % 2 === 0;
  /*
   * Pfefferminze läuft quer zum Kaffee: Sie kommt bei i % 4 < 2 vor, Kaffee
   * bei geradem i. Damit landet jede der vier Kombinationen gleich oft, und
   * Minze steht in zwanzig guten wie zwanzig schlechten Mahlzeiten – ihr
   * Unterschied ist exakt null.
   *
   * Der erste Anlauf hatte hier eine zweite Zutat, die genau dann vorkam,
   * wenn kein Kaffee dabei war. Die war damit nicht neutral, sondern das
   * Spiegelbild – stark negativ. Der Test war rot und hatte recht.
   */
  const zutaten = [];
  if (mitKaffee) zutaten.push({ id: 'kaffee', rolle: 'getraenk' });
  if (i % 4 < 2) zutaten.push({ id: 'minze', rolle: 'wuerze' });
  eintraege.push({
    id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal', zutaten,
  });
  // Nach Kaffee deutlich stärker – weit über der Zufallsschranke.
  eintraege.push({
    id: `b${i}`, am, um: '10:00', art: 'beschwerde',
    staerke: mitKaffee ? 7 : 1, arten: ['brennen'],
  });
}

const zeigen = async (kueche) => {
  await page.evaluate(([k, e, t, ku]) => localStorage.setItem(k, JSON.stringify({
    begruesst: true, tab: 'muster', eintraege: e, tage: t, kueche: ku,
  })), [KEY, eintraege, tage, kueche]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#view .karte');
  return (await page.locator('#view').innerText()).replace(/\s+/g, ' ');
};

const mitWiderspruch = await zeigen([
  { id: 'k1', name: 'Kaffee', art: 'geht', am: vorTagen(5) },
]);
check(
  mitWiderspruch.includes('Das passt nicht zu deiner Liste'),
  'steht etwas auf „Geht gut", was die Zahlen anders sehen, sagt die App es',
);
check(
  mitWiderspruch.includes('Kaffee'),
  'und nennt, worum es geht',
);
check(
  /Stufen schlechter als sonst/.test(mitWiderspruch),
  'mit der Zahl, nicht nur mit einem Urteil',
);
check(
  /muss nicht heißen, dass du dich irrst/.test(mitWiderspruch),
  'und ohne die Liste zu überstimmen – beides kann stimmen',
);

/*
 * Die Gegenprobe, ohne die das Obige nichts hieße: Dasselbe Tagebuch, aber
 * der Eintrag steht auf der *richtigen* Liste. Dann hat die App zu schweigen.
 * Eine App, die immer etwas sagt, sagt nichts.
 */
const ohneWiderspruch = await zeigen([
  { id: 'k1', name: 'Kaffee', art: 'nicht', am: vorTagen(5) },
]);
check(
  !ohneWiderspruch.includes('Das passt nicht zu deiner Liste'),
  'steht es auf der richtigen Liste, schweigt sie',
);

/*
 * Und die andere Richtung, die oft vergessen wird: Wer sich etwas verbietet,
 * das gar nichts macht, isst ohne Grund enger. Pfefferminze steht hier auf
 * „Geht nicht", und die Zahlen sehen keinen Unterschied.
 */
const umsonst = await zeigen([
  { id: 'k2', name: 'Pfefferminze', art: 'nicht', am: vorTagen(5) },
]);
check(
  umsonst.includes('Das passt nicht zu deiner Liste') && umsonst.includes('Pfefferminze'),
  'auch umgekehrt: etwas unnötig Weggelassenes fällt auf',
);
check(
  /ohne Grund enger/.test(umsonst),
  'und wird als Einladung formuliert, nicht als Fehler',
);

/*
 * Die letzte Schranke: ohne genug Fälle kein Widerspruch. Jemandem seine
 * eigene Erfahrung mit vier Mahlzeiten Datenlage auszureden wäre schlimmer
 * als zu schweigen.
 */
const zuDuenn = await page.evaluate(([k, ku]) => {
  const roh = JSON.parse(localStorage.getItem(k));
  roh.eintraege = roh.eintraege.slice(0, 6);
  roh.kueche = ku;
  localStorage.setItem(k, JSON.stringify(roh));
  return true;
}, [KEY, [{ id: 'k1', name: 'Kaffee', art: 'geht', am: vorTagen(5) }]]);
check(zuDuenn, 'Vorbereitung: ein sehr kurzes Tagebuch');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check(
  !(await page.locator('#view').innerText()).includes('Das passt nicht zu deiner Liste'),
  'bei zu wenigen Fällen bleibt sie still',
);

await page.screenshot({ path: `${SHOT}/70-kueche.png` });
check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
ende();
