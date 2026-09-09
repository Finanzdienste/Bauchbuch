/*
 * Die Spätphase – der umgekehrte Fehler
 *
 * tests/test-anfang.mjs prüft die ersten Wochen: Da hatte der Muster-Reiter
 * zehn Karten, die nacheinander „noch nicht" sagten. Diese Datei prüft das
 * andere Ende. Nach zehn Wochen Tagebuch stand hier alles gleichzeitig:
 * knapp elf Bildschirmlängen, durch die man sich jeden Tag scrollt, um zu
 * sehen, ob sich an den Zahlen etwas getan hat.
 *
 * Gemessen, nicht geschätzt – und beim Messen fiel der erste Fehler auf:
 * Gezählt wurde mit textContent, und das zählt eine zugeklappte <details>
 * mit. Der dickste Block war danach angeblich „Was keine App beantwortet",
 * ein Abschnitt, der seit jeher zugeklappt ist und auf dem Schirm 53 Punkte
 * hoch steht. Was zählt, ist innerText und die Höhe in Bildpunkten.
 *
 * Die Regel, die aus der richtigen Messung folgt:
 *
 *   BEFUNDE BLEIBEN OFFEN, NACHSCHLAGEWERK KLAPPT ZU.
 *
 * Ein Befund ist, was sich mit jedem Eintrag ändern kann – Auslöser,
 * Kriterien, Warnzeichen, der Stand eines laufenden Versuchs. Ein Angebot
 * liest man einmal und entscheidet einmal; eine Rechenregel versteht man
 * einmal. Beides danach jeden Tag zwischen den Zahlen zu haben, macht die
 * Zahlen schlechter auffindbar.
 *
 * Diese Datei prüft beide Richtungen. Die zweite ist die gefährliche:
 *
 *   1. KÜRZER. Die drei zugeklappten Abschnitte kosten zusammen weniger als
 *      ein Fünftel dessen, was sie offen kosten.
 *   2. NICHTS VERSCHWUNDEN. In keiner Klappe steckt ein Befund. Der Vorbehalt
 *      („Häufigkeit, keine Ursache") steht sichtbar davor, nicht darin. Die
 *      Zöliakie-Warnung steckt im Stufenplan-Angebot – dort ist sie richtig,
 *      weil ohne Aufklappen niemand an den Startknopf kommt. Und beim Drucken
 *      geht alles wieder auf.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

/* ---------- Zehn Wochen Tagebuch, dicht genug für echte Funde ---------- */

const eintraege = [];
const tage = {};
const zutaten = [
  ['kaffee', 'haupt'], ['zwiebel', 'wuerze'], ['fett', 'haupt'],
  ['weizen', 'haupt'], ['milch', 'beilage'],
];
for (let i = 70; i >= 1; i--) {
  const am = vorTagen(i);
  tage[am] = { notiert: true, stress: i % 4, schlaf: 3, blutung: i % 28 < 4 };
  [['07:30', 'Frühstück'], ['12:30', 'Mittag'], ['19:00', 'Abendessen']].forEach(([um, was], k) => {
    const zu = zutaten[(i + k) % zutaten.length];
    eintraege.push({
      id: `m${i}-${k}`, am, um, art: 'essen', was, portion: 'normal',
      zutaten: [{ id: zu[0], rolle: zu[1] }],
    });
  });
  if (i % 3 !== 0) {
    eintraege.push({
      id: `b${i}`, am, um: '15:00', art: 'beschwerde', staerke: 3 + (i % 5),
      arten: ['blaehung', 'druck'], stuhlbezug: 'besser',
    });
  }
  if (i % 2 === 0) eintraege.push({ id: `s${i}`, am, um: '08:00', art: 'stuhl', form: 4, dringend: false });
  if (i % 5 === 0) {
    eintraege.push({
      id: `me${i}`, am, um: '20:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg',
    });
  }
}

await page.evaluate(([k, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t, beschwerdenSeit: '2024-01-01',
})), [KEY, eintraege, tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#view .karte');

/* ---------- 1. Kürzer ---------- */

const bogen = page.locator('#view details.angebotbogen');
const anzahl = await bogen.count();
check(anzahl === 3, `drei zuklappbare Abschnitte auf dem Reiter (${anzahl})`);

check(
  await page.evaluate(() => [...document.querySelectorAll('#view details.angebotbogen')]
    .every((d) => !d.open)),
  'und alle drei sind beim Öffnen des Reiters zu',
);

/*
 * Der Vergleich, auf den es ankommt: dieselben drei Abschnitte zu und offen.
 * Eine feste Zahl Bildpunkte stünde hier nur so lange, bis jemand eine
 * Schriftgröße ändert – das Verhältnis dagegen misst die Sache selbst.
 */
const hoehe = () => page.evaluate(() => [...document.querySelectorAll('#view details.angebotbogen')]
  .reduce((s, d) => s + d.getBoundingClientRect().height, 0));

const zu = await hoehe();
await page.evaluate(() => document.querySelectorAll('#view details.angebotbogen')
  .forEach((d) => { d.open = true; }));
const offen = await hoehe();
await page.evaluate(() => document.querySelectorAll('#view details.angebotbogen')
  .forEach((d) => { d.open = false; }));

check(
  zu < offen * 0.2,
  `zugeklappt kosten sie ${Math.round(zu)} statt ${Math.round(offen)} Bildpunkten`
  + ` (${Math.round((zu / offen) * 100)} %)`,
);

/*
 * Und was das für den ganzen Reiter heißt. Die Zahl ist eine Messung: vorher
 * 10,8 Bildschirmlängen, nachher 7,7. Geprüft wird eine großzügige Schranke –
 * dass jemand eine Karte dazubaut, ist kein Fehler; dass der Reiter wieder auf
 * elf Längen wächst, ohne dass es jemandem auffällt, wäre einer.
 */
const laengen = await page.evaluate((h) => document.querySelector('#view').scrollHeight / h, HANDY.height);
check(laengen < 9, `der ganze Reiter misst ${laengen.toFixed(1)} Bildschirmlängen (vorher 10,8)`);

/* ---------- 2. Nichts verschwunden ---------- */

/*
 * Der eigentliche Prüfstein. Ein Befund ist an seiner Auszeichnung erkennbar:
 * `.fund` für Auslöser und Klassen, `.krit` für die Kriterienkästen, `.vgl`
 * für jeden Vergleichsbalken, `.warnung` für ein Warnzeichen. Steckt eines
 * davon in einer Klappe, ist die Kürzung über ihr Ziel hinausgeschossen.
 */
const versteckteBefunde = await page.evaluate(() => [...document.querySelectorAll('#view details.angebotbogen')]
  .flatMap((d) => [...d.querySelectorAll('.fund, .krit, .vgl, .warnung, .verdacht')]
    .map((x) => x.className)));
check(
  versteckteBefunde.length === 0,
  `kein Befund steckt in einer Klappe (${versteckteBefunde.join(', ') || 'keiner'})`,
);

/* Was auf dem Schirm steht, ohne dass jemand etwas antippt. */
const sichtbar = (await page.evaluate(() => document.querySelector('#view').innerText))
  .replace(/\s+/g, ' ');

for (const wort of ['Was Sache ist', 'Nach Wirkweise', 'Kriterien', 'Was noch fehlt']) {
  check(sichtbar.includes(wort), `„${wort}" steht offen da`);
}

/*
 * Der Vorbehalt gehört neben die Funde, nicht hinter einen Tipp. Ihn
 * wegzuklappen und die Zahlen stehen zu lassen, wäre genau die Vereinfachung,
 * gegen die diese App gebaut ist.
 */
check(
  sichtbar.includes('Häufigkeit, keine Ursache'),
  'der Vorbehalt „Häufigkeit, keine Ursache" bleibt sichtbar',
);
check(
  !sichtbar.includes('Eine Zeile erscheint erst ab'),
  'die Rechenregel dahinter ist zugeklappt',
);

/* Aufklappen bringt sie zurück – sonst wäre sie nicht verstaut, sondern weg. */
await page.locator('#view details.angebotbogen', { hasText: 'Wie das gelesen wird' })
  .locator('summary').click();
check(
  (await page.evaluate(() => document.querySelector('#view').innerText))
    .replace(/\s+/g, ' ').includes('Eine Zeile erscheint erst ab'),
  'nach einem Tipp steht sie wieder da',
);

/*
 * Die Zöliakie-Warnung. Sie steckt im Stufenplan-Angebot, und das ist der
 * richtige Ort: Der Startknopf steckt im selben Abschnitt, also kann niemand
 * den Plan anfangen, ohne die Warnung gelesen zu haben. Wäre sie in einer
 * *anderen* Klappe gelandet als der Knopf, wäre genau das nicht mehr wahr.
 */
const planBogen = page.locator('#view details.angebotbogen', { hasText: 'Der Stufenplan' });
check(
  await planBogen.locator('[data-act="plan-start"]').count() > 0,
  'der Startknopf für den Stufenplan steckt in derselben Klappe',
);
check(
  (await planBogen.textContent()).includes('Zöliakie'),
  'und die Zöliakie-Warnung steht davor, nicht woanders',
);

/*
 * Beim Drucken geht alles auf. Der Zettel für die Sprechstunde ist der einzige
 * Ort, an dem der ganze Text hingehört – und ein Browser druckt nicht, was
 * zugeklappt ist.
 */
await page.evaluate(() => {
  document.querySelectorAll('#view details').forEach((d) => { d.open = false; });
  window.dispatchEvent(new Event('beforeprint'));
});
check(
  await page.evaluate(() => [...document.querySelectorAll('#view details')].every((d) => d.open)),
  'vor dem Drucken geht jede Klappe wieder auf',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
ende();
