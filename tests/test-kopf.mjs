/*
 * Kopfschmerzen: eine eigene Eintragsart – und der Nachweis, dass sie in
 * keine Bauchrechnung hineinzählt.
 *
 * Der zweite Teil ist der wichtigere. Ein Kopfschmerz, der als Beschwerde
 * gespeichert würde, machte aus jedem Kaffee davor einen Auslöser und aus
 * jedem Tag einen Beschwerdetag – und niemand sähe es, weil alle Zahlen
 * plausibel blieben. Deshalb wird hier mit Kopfschmerzen *allein* gerechnet
 * und geprüft, dass der Bauch bei null bleibt. Ein Test, der nur zeigt, dass
 * die Kopfkarte da ist, bewiese nichts.
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
  await page.waitForTimeout(200);
};
const lies = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const ids = (wahl) => page.locator(wahl).evaluateAll((els) => els.map((el) => el.dataset.id));

/* ---------- 1. Der Bogen ---------- */

await setze({ begruesst: true, tab: 'heute', eintraege: [], tage: {} });
check(await page.locator('.anlegen-btn').count() === 6, 'sechs Knöpfe – Kopfschmerz ist dazugekommen');
check(
  await page.locator('[data-act="neu"][data-art="kopf"]').count() === 1,
  'einer davon für den Kopf',
);
await page.locator('[data-act="neu"][data-art="kopf"]').click();
await page.waitForTimeout(150);
check(await page.locator('.bogen .skala .stufe').count() === 11, 'die Skala von 0 bis 10');
check(await page.locator('[data-act="kopfart"]').count() === 8, 'acht Merkmale, wie er sich anfühlt');

const kopfWarn = await ids('[data-act="warnzeichen"]');
check(
  kopfWarn.includes('donnerschlag') && kopfWarn.includes('kopfnacken') && !kopfWarn.includes('teerstuhl'),
  'die Warnzeichen im Kopfbogen sind die des Kopfes, nicht die des Darms',
);

// Stärke 0: kein Kopfschmerz, kein Eintrag.
await page.locator('[data-act="staerke"][data-n="0"]').click();
await page.waitForTimeout(100);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(200);
check(await page.locator('.bogen').count() === 1, 'Stärke 0 wird nicht gespeichert – das wäre kein Kopfschmerz');
check((await lies()).eintraege.length === 0, 'und im Speicher steht nichts');

await page.locator('[data-act="staerke"][data-n="7"]').click();
await page.locator('[data-act="kopfart"][data-id="pochend"]').click();
await page.locator('[data-act="kopfart"][data-id="kopfuebel"]').click();
await page.waitForTimeout(100);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);

const gespeichert = (await lies()).eintraege;
check(
  gespeichert.length === 1 && gespeichert[0].art === 'kopf',
  'der Eintrag hat die Art „kopf" – nicht „beschwerde"',
);
check(
  gespeichert[0].staerke === 7 && (gespeichert[0].kopfArten || []).join() === 'pochend,kopfuebel',
  'mit Stärke und Merkmalen',
);
check(gespeichert[0].arten === undefined, 'und ohne das Feld „arten" der Bauchbeschwerden');
check(
  (await page.locator('.strang-zeile').textContent()).includes('Kopfschmerz 7'),
  'im Tagesstrang steht „Kopfschmerz 7"',
);
const tagKarte = await page.locator('.tagbilanz').textContent();
check(
  tagKarte.includes('Bauch beschwerdefrei') && tagKarte.includes('Kopfschmerz bis 7'),
  'die Tageskarte trennt Bauch und Kopf',
);

/* ---------- 2. Der Bauchbogen bietet die Kopf-Warnzeichen nicht an ---------- */

await page.locator('[data-act="neu"][data-art="beschwerde"]').click();
await page.waitForTimeout(150);
const bauchWarn = await ids('[data-act="warnzeichen"]');
check(
  bauchWarn.includes('teerstuhl') && !bauchWarn.includes('donnerschlag'),
  'im Bauchbogen fehlen die Kopf-Warnzeichen – sonst wäre die Liste Lärm',
);
check(bauchWarn.length === 10, `die zehn Warnzeichen des Bauches sind noch alle da (${bauchWarn.length})`);
await page.locator('.bogen-zu').click();
await page.waitForTimeout(100);

/* ---------- 3. Der Gegenbeweis: Kopf zählt nirgends als Bauch ---------- */

// Zwanzig Tage: jeden Tag Kaffee, jeden Tag Kopfschmerz 8 – und keine
// einzige Bauchbeschwerde. Wäre der Kopf eine Beschwerde, stünde hier ein
// Auslöser „Kaffee, 8 gegen 0" und zwanzig Beschwerdetage.
const nurKopf = [];
for (let t = 1; t <= 20; t++) {
  const am = vorTagen(t);
  nurKopf.push({ id: `e${t}`, am, um: '08:00', art: 'essen', was: 'Kaffee', tags: ['kaffee'], portion: 'normal' });
  nurKopf.push({ id: `k${t}`, am, um: '10:00', art: 'kopf', staerke: 8, kopfArten: ['pochend'] });
}
await setze({ begruesst: true, tab: 'mehr', eintraege: nurKopf, tage: {}, fenster: 4, mindestFaelle: 5 });
await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(300);
const text = await page.locator('.bericht').inputValue();
check(text.includes('Tage mit Eintragung        20 von 30'), 'zwanzig notierte Tage');
check(
  text.includes('Tage mit Beschwerden       0 ('),
  'null Beschwerdetage – zwanzig Kopfschmerztage sind keine Bauchtage',
);
check(/Stärke im Mittel\s+0 von 10/.test(text), 'die mittlere Bauchstärke bleibt 0');
check(text.includes('Kopfschmerztage            20'), 'und die zwanzig Kopfschmerztage stehen als eigene Zeile da');
check(!text.includes('BESCHWERDEN NACH ART'), 'keine Beschwerdeart – „pochend" ist keine');
check(!/Kaffee\s+8 gegen/.test(text), 'Kaffee wird nicht zum Auslöser mit Stärke 8');
check(text.includes('KOPFSCHMERZEN'), 'dafür ein eigener Abschnitt für den Kopf');
check(/Eingetragen\s+20 Mal an 20 Tagen \(100 %/.test(text), 'mit Fallzahlen');
check(/Pochend, pulsierend\s+20 Mal/.test(text), 'und den Merkmalen');

// Dasselbe auf dem Musterreiter: Die Kopfkarte steht da, die Kriterien
// bleiben bei null Beschwerden.
await setze({ begruesst: true, tab: 'muster', eintraege: nurKopf, tage: {}, fenster: 4, mindestFaelle: 5 });
check(await page.locator('.karte-kopf').count() === 1, 'die Kopfkarte steht auf dem Musterreiter');
const kopfKarte = await page.locator('.karte-kopf').textContent();
check(
  /Eingetragen\s*20 Mal an 20 Tagen/.test(kopfKarte.replace(/\s+/g, ' '))
    && /Anteil der notierten Tage\s*100 %/.test(kopfKarte.replace(/\s+/g, ' ')),
  'mit allen zwanzig',
);
const seite = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(!/Kaffee[^.]*auffällig/.test(seite), 'Kaffee steht nirgends als auffällig');

/* ---------- 4. Warnzeichen aus dem Kopfbogen ---------- */

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: [
    { id: 'w1', am: vorTagen(1), um: '09:00', art: 'kopf', staerke: 9, warnzeichen: ['donnerschlag'] },
    ...nurKopf,
  ],
  tage: {},
  fenster: 4,
  mindestFaelle: 5,
});
check(await page.locator('.karte-warn').count() === 1, 'ein schlagartiger Kopfschmerz erzeugt die Warnkarte');
const warnText = await page.locator('.karte-warn').textContent();
check(warnText.includes('so stark war wie nie zuvor'), 'mit seinem Namen');
check(warnText.includes('heute abgeklärt'), 'und mit der Dringlichkeit „sofort"');

/* ---------- 5. Schmerzmittel und der Bauch danach ---------- */

// Vierzig Tage, jeder mit einer Mahlzeit (also notiert). An jedem sechsten
// Tag Kopfschmerz mit Ibuprofen. An den zwei Tagen danach Bauch 6, an allen
// anderen Tagen Bauch 1. Erwartet: 6 gegen 1, 12 gegen 22 Tage.
const nsar = new Set([6, 12, 18, 24, 30, 36]);
const verknuepft = [];
for (let t = 1; t <= 40; t++) {
  const am = vorTagen(t);
  verknuepft.push({ id: `m${t}`, am, um: '12:00', art: 'essen', was: 'Mittag', tags: [], portion: 'normal' });
  if (nsar.has(t)) {
    verknuepft.push({ id: `k${t}`, am, um: '10:00', art: 'kopf', staerke: 7, kopfArten: ['drueckend'] });
    verknuepft.push({ id: `i${t}`, am, um: '10:30', art: 'medikament', mittel: 'Ibuprofen', dosis: '400 mg' });
  } else {
    // „Danach" heißt näher an heute: der Tag nach t ist t-1.
    const danach = nsar.has(t + 1) || nsar.has(t + 2);
    verknuepft.push({ id: `b${t}`, am, um: '18:00', art: 'beschwerde', staerke: danach ? 6 : 1, arten: ['brennen'] });
  }
}
await setze({ begruesst: true, tab: 'muster', eintraege: verknuepft, tage: {}, fenster: 4, mindestFaelle: 5 });
const karte = (await page.locator('.karte-kopf').textContent()).replace(/\s+/g, ' ');
check(
  /Medikament am selben Tag\s*an 6 von 6 Tagen/.test(karte) && /davon entzündungshemmend\s*6 von 6/.test(karte),
  'an allen sechs Kopfschmerztagen stand ein entzündungshemmendes Mittel',
);
check(
  /nach einem Kopfschmerztag mit entzündungshemmendem Schmerzmittel lag der Bauch im Mittel bei 6, an den übrigen Tagen bei 1/.test(karte),
  'die Nachwirkung: 6 danach gegen 1 sonst',
);
check(karte.includes('(12 gegen 22 Tage)'), 'mit beiden Fallzahlen');
check(karte.includes('Hinweis, kein Beweis'), 'und dem Satz, dass das kein Beweis ist');

// Dieselbe Verbindung in „Was noch fehlt": Die Frage nach der Alternative
// weiß jetzt, wogegen das Mittel genommen wurde.
const fehlt = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  fehlt.includes('An 6 davon wegen Kopfschmerzen'),
  'die Frage nach dem magenfreundlicheren Mittel nennt den Grund',
);

// Gegenprobe: ohne das Medikament gibt es keinen Satz zur Nachwirkung –
// ein Kopfschmerz allein sagt über den Bauch nichts.
await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: verknuepft.filter((e) => e.art !== 'medikament'),
  tage: {},
  fenster: 4,
  mindestFaelle: 5,
});
const ohne = (await page.locator('.karte-kopf').textContent()).replace(/\s+/g, ' ');
check(!ohne.includes('lag der Bauch im Mittel'), 'ohne Medikament kein Satz zur Nachwirkung');
check(!ohne.includes('Medikament am selben Tag'), 'und keine Zeile zum Medikament');

/* ---------- 6. Nach Zyklusphase ---------- */

// Sechzig Tage mit Tagesfrage, Blutung an Tag 1 bis 4 jedes 28-Tage-Zyklus,
// Kopfschmerz an jedem Blutungstag und sonst nie.
const tage = {};
const zyklisch = [];
for (let t = 1; t <= 60; t++) {
  const am = vorTagen(t);
  const zyklusTag = ((60 - t) % 28) + 1;
  tage[am] = { stimmung: 3 };
  if (zyklusTag <= 4) {
    tage[am].blutung = 3;
    zyklisch.push({ id: `z${t}`, am, um: '09:00', art: 'kopf', staerke: 5, kopfArten: ['pochend'] });
  }
}
await setze({ begruesst: true, tab: 'muster', eintraege: zyklisch, tage, fenster: 4, mindestFaelle: 5 });
const phasen = (await page.locator('.karte-kopf').textContent()).replace(/\s+/g, ' ');
check(phasen.includes('Nach Zyklusphase'), 'mit Periode im Tagebuch zählt die Karte nach Phase');
check(/Periode\s*an 12 von 12 Tagen/.test(phasen), 'alle zwölf Periodentage mit Kopfschmerz');
check(/zweite Zyklushälfte\s*an 0 von/.test(phasen), 'und die zweite Hälfte ohne');

await page.screenshot({ path: `${SHOT}/97-kopf.png`, fullPage: true });

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
