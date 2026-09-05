/*
 * Wird es besser oder schlechter?
 *
 * Die Frage, die in jeder Sprechstunde kommt, und die verlockendste Stelle
 * dieser App, um zu schummeln. Zwei Fehler wären leicht gemacht und beide
 * hätten Folgen:
 *
 *   * Aus jeder Schwankung eine Richtung machen. Beschwerden gehen von selbst
 *     hoch und runter; „es wird schlechter" an einem Dienstag, weil zufällig
 *     drei schlechte Tage hintereinander lagen, macht Angst ohne Anlass.
 *   * Lücken im Tagebuch als gute Tage zählen. Wer sich elend fühlt, trägt
 *     seltener ein – und dann meldet die App ausgerechnet in der schlimmsten
 *     Woche eine Verbesserung.
 *
 * Geprüft wird deshalb vor allem, wann die App *nichts* sagt.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();
const setze = async (zustand) => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, zustand]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
};
const zumVerlauf = async () => {
  await page.locator('[data-act="tab"][data-tab="verlauf"]').click();
  await page.waitForTimeout(250);
};

/*
 * Ein Tagebuch bauen: `staerken` ist eine Liste von Stärken, Index 0 ist
 * gestern. null heißt „an dem Tag nichts eingetragen" – und das ist etwas
 * anderes als eine 0.
 */
function tagebuch(staerken) {
  const eintraege = [];
  const tage = {};
  staerken.forEach((s, i) => {
    const am = vorTagen(i + 1);
    if (s === null) return;
    tage[am] = { notiert: true };
    if (s > 0) {
      eintraege.push({
        id: `b${i}`, am, um: '14:00', art: 'beschwerde', staerke: s, arten: ['brennen'],
      });
    }
  });
  return { begruesst: true, tab: 'verlauf', eintraege, tage };
}

/* ---------- Zu wenig ist zu wenig ---------- */

await setze(tagebuch(Array.from({ length: 20 }, () => 4)));
await zumVerlauf();
const knapp = await text(page.locator('.karte', { hasText: 'Wird es besser oder schlechter?' }));
check(!knapp.includes('es wird'), 'bei 20 notierten Tagen sagt die App noch keine Richtung');
check(/noch \d+ Tage? fehlen/.test(knapp), 'sie sagt stattdessen, wie viele Tage fehlen');
check(await page.locator('.trend').count() === 0, 'und färbt nichts ein');

/* ---------- Es wird besser ---------- */

// 14 Tage mit 1, davor 14 Tage mit 6: mehr als eine ganze Stufe Unterschied.
await setze(tagebuch([...Array(14).fill(1), ...Array(14).fill(6)]));
await zumVerlauf();
const besser = await text(page.locator('.trend'));
check(besser.includes('es wird besser'), 'fünf Stufen weniger heißen „es wird besser"');
check(await page.locator('.trend.t-besser').count() === 1, 'und werden grün markiert');
check(besser.includes('14 notierten Tage gegen die 14 davor'), 'die Fallzahlen stehen dabei');

/* ---------- Es wird schlechter ---------- */

await setze(tagebuch([...Array(14).fill(6), ...Array(14).fill(1)]));
await zumVerlauf();
check(
  (await text(page.locator('.trend'))).includes('es wird schlechter'),
  'andersherum heißt es „es wird schlechter"',
);

/* ---------- Eine halbe Stufe ist keine Richtung ---------- */

// 3,5 gegen 4,0 – ein sichtbarer Unterschied im Mittel, aber unter der
// Schwelle. Genau hier trennt sich eine Beobachtung von einem Orakel.
await setze(tagebuch([
  ...Array(7).fill(3), ...Array(7).fill(4),
  ...Array(14).fill(4),
]));
await zumVerlauf();
const gleich = await text(page.locator('.trend'));
check(gleich.includes('kein deutlicher Unterschied'), 'eine halbe Stufe ist keine Richtung');
check(
  gleich.includes('keine Richtung ablesen'),
  'und die App sagt, dass das nicht „nichts tut sich" heißt',
);

/* ---------- Lücken sind keine guten Tage ---------- */

/*
 * Der wichtigste Fall. Zuletzt 14 notierte Tage mit 6, davor eine Zeit, in der
 * nur an 14 Tagen überhaupt etwas eingetragen wurde – dazwischen 20 leere
 * Kalendertage. Zählte die App Kalendertage, käme davor ein niedriger Schnitt
 * heraus und die App meldete eine Verschlechterung, die nur aus Lücken besteht.
 */
const mitLuecken = [
  ...Array(14).fill(6),
  ...Array(20).fill(null),
  ...Array(14).fill(6),
];
await setze(tagebuch(mitLuecken));
await zumVerlauf();
const luecken = await text(page.locator('.trend'));
check(
  luecken.includes('kein deutlicher Unterschied'),
  'zwanzig leere Kalendertage erzeugen keine Richtung',
);
check(
  luecken.includes('14 notierten Tage gegen die 14 davor'),
  'verglichen werden beide Male 14 notierte Tage, nicht 14 Kalendertage',
);

/* ---------- Beschwerdefreie Tage stehen daneben ---------- */

await setze(tagebuch([...Array(7).fill(0), ...Array(7).fill(2), ...Array(14).fill(6)]));
await zumVerlauf();
const frei = await text(page.locator('.trend'));
check(frei.includes('7 beschwerdefreie Tage gegen 0'), 'die freien Tage werden mitgezählt');

/* ---------- Und im Bericht ---------- */

await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(200);
await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(400);
const bericht = await page.locator('.bericht').inputValue();
check(bericht.includes('RICHTUNG'), 'der Bericht hat einen Abschnitt zur Richtung');
check(bericht.includes('notierte Tage, nicht Kalendertage'), 'mit dem Hinweis, was verglichen wird');

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/trend.png`, fullPage: true });
await browser.close();
ende();
