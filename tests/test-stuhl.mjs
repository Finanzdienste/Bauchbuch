/*
 * Der Stuhlgang: eintragen, zählen, und das eine Warnzeichen nicht verlieren.
 *
 * Die Angabe ist neu und sie ist die größte Lücke, die dieses Tagebuch hatte –
 * ohne sie lässt sich ein Reizdarm gar nicht prüfen. Geprüft wird deshalb
 * dreierlei:
 *
 *   1. Dass sich die Form überhaupt eintragen lässt und ohne Form nichts
 *      gespeichert wird. Ein Stuhlgang ohne Bristol-Zahl ist für jede
 *      Auswertung wertlos, und eine vorausgewählte 4 wäre die bequemste
 *      Antwort – sie würde als Angabe zählen, ohne eine zu sein.
 *   2. Dass die Anteile stimmen, denn an ihnen hängt der Reizdarm-Typ.
 *   3. Dass schwarzer Stuhl und Blut ganz oben landen. Sie stehen jetzt in
 *      einer *anderen* Eintragsart als bisher, und wer nur im Beschwerdebogen
 *      nach Warnzeichen sucht, sucht sie da, wo sie nicht sind.
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

/* ---------- Eintragen ---------- */

await setze({ begruesst: true, tab: 'heute', eintraege: [], tage: {} });

check(
  await page.locator('[data-act="neu"][data-art="stuhl"]').count() === 1,
  'auf dem Tagesreiter gibt es einen Knopf dafür',
);
await page.locator('[data-act="neu"][data-art="stuhl"]').click();
await page.waitForTimeout(150);
check(await page.locator('.bristol-btn').count() === 7, 'sieben Stufen der Bristol-Skala');
check(
  (await page.locator('.bristol-btn').first().textContent()).includes('harte Klümpchen'),
  'jede mit einer Beschreibung – „Typ 1" allein trifft niemand',
);
check(
  await page.locator('.bristol-bild').count() === 7,
  'und mit einer Zeichnung: Eine Frage, die peinlich und umständlich ist, wird gar nicht beantwortet',
);

// Ohne Form speichern: Der Eintrag darf nicht entstehen.
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(200);
check(await page.locator('.bogen').count() === 1, 'ohne gewählte Form bleibt der Bogen offen');
const nochNichts = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).eintraege.length, KEY);
check(nochNichts === 0, 'und es wird nichts gespeichert – eine Vorgabe wäre die bequemste Antwort');

await page.locator('[data-act="bristol"][data-n="6"]').click();
await page.waitForTimeout(120);
check(
  await page.locator('[data-act="bristol"][data-n="6"].an').count() === 1,
  'die gewählte Stufe ist markiert',
);
await page.locator('[data-act="stuhl-dringend"]').click();
await page.waitForTimeout(120);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);

const gespeichert = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).eintraege, KEY);
check(gespeichert.length === 1 && gespeichert[0].art === 'stuhl', 'der Eintrag ist da');
check(gespeichert[0].form === 6, 'mit der Form als Zahl 1 bis 7 – so wird in der Praxis darüber geredet');
check(gespeichert[0].dringend === true, 'und mit „musste dringend"');
check(
  (await page.locator('.strang-zeile').textContent()).includes('Typ 6'),
  'im Tagesstrang steht die Zahl',
);

/* ---------- Die Anteile, an denen der Typ hängt ---------- */

const stuehle = [];
// Zwölf weiche, vier normale, vier harte: der Durchfalltyp, aber deutlich.
for (let t = 1; t <= 20; t++) {
  const form = t <= 12 ? 6 : (t <= 16 ? 4 : 1);
  stuehle.push({ id: `s${t}`, am: vorTagen(t), um: '09:00', art: 'stuhl', form });
}
await setze({ begruesst: true, tab: 'muster', eintraege: stuehle, tage: {}, fenster: 4, mindestFaelle: 5 });

const stuhlKarte = page.locator('.karte-stuhl');
const stuhlText = await stuhlKarte.textContent();
check(stuhlText.includes('20 Mal'), 'die Übersicht zählt alle zwanzig');
check(stuhlText.includes('60 %'), 'zwölf von zwanzig weich sind 60 %');
check(stuhlText.includes('20 %'), 'vier von zwanzig hart sind 20 %');

/* ---------- Warnzeichen aus dem Stuhlbogen ---------- */

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: [
    { id: 'w1', am: vorTagen(2), um: '09:00', art: 'stuhl', form: 6, warnzeichen: ['teerstuhl'] },
    ...stuehle,
  ],
  tage: {},
  fenster: 4,
  mindestFaelle: 5,
});

check(await page.locator('.karte-warn').count() === 1, 'ein schwarzer Stuhl erzeugt die Warnkarte');
const warnText = await page.locator('.karte-warn').textContent();
check(
  warnText.includes('Schwarzer, klebriger Stuhl'),
  'das Warnzeichen steht mit Namen da – gefunden wird es in allen Eintragsarten, nicht nur in Beschwerden',
);
check(warnText.includes('heute abgeklärt'), 'und mit der Dringlichkeit „sofort"');
/*
 * Die Warnung steht vor jeder Statistik – egal, welche gerade dran ist.
 *
 * Früher wurde hier gegen die Kriterienkarte geprüft. Die gibt es bei so
 * wenigen Tagen nicht mehr: Der Reiter zeigt in der Frühphase eine kurze
 * Fassung mit dem Fortschrittsblock. Geprüft wird deshalb gegen das erste, was
 * überhaupt eine Zahl behauptet – so hält die Prüfung auch, wenn sich der
 * Aufbau des Reiters noch einmal ändert.
 */
const html = await page.locator('#view').innerHTML();
const ersteStatistik = Math.min(...['fortschritt', 'Kriterien', 'funde']
  .map((x) => html.indexOf(x)).filter((i) => i >= 0));
check(
  html.indexOf('karte-warn') >= 0 && html.indexOf('karte-warn') < ersteStatistik,
  'die Warnung steht vor jeder Statistik',
);
await page.screenshot({ path: `${SHOT}/96-stuhl.png`, fullPage: true });

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
