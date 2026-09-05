/*
 * Der Bericht seit dem letzten Termin.
 *
 * „Letzte 30 Tage" ist eine runde Zahl, die niemanden interessiert. Was in der
 * Sprechstunde besprochen wird, ist die Zeit seit dem letzten Mal – und
 * niemand rechnet die im Kopf aus. Ein Bericht über 30 Tage nach einem Termin
 * vor 47 Tagen lässt siebzehn Tage weg, ohne es zu sagen; einer nach einem
 * Termin vor 12 Tagen nimmt achtzehn Tage mit, über die schon geredet wurde.
 *
 * Geprüft wird deshalb, dass das Fenster wirklich am Termin anfängt und dass
 * im Kopf des Berichts steht, dass es das tut.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();

/*
 * 60 Tage Tagebuch. In den ersten 30 (also vor 60 bis 31 Tagen) steht eine
 * Notiz, die im Bericht seit dem Termin *nicht* auftauchen darf.
 */
const eintraege = [];
const tage = {};
for (let i = 1; i <= 60; i++) {
  const am = vorTagen(i);
  tage[am] = { notiert: true };
  eintraege.push({
    id: `b${i}`, am, um: '14:00', art: 'beschwerde', staerke: 5, arten: ['brennen'],
  });
}
eintraege.push({
  id: 'alt', am: vorTagen(50), um: '20:00', art: 'notiz', text: 'Lange vor dem Termin',
});
eintraege.push({
  id: 'neu', am: vorTagen(10), um: '20:00', art: 'notiz', text: 'Nach dem Termin',
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, {
  begruesst: true, tab: 'mehr', eintraege, tage,
}]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);

/* ---------- Ohne Termin gibt es den Knopf nicht ---------- */

check(
  await page.locator('[data-act="bericht-seit"]').count() === 0,
  'ohne eingetragenen Termin steht der Knopf nicht da',
);
check(
  (await text(page.locator('.karte', { hasText: 'Arzttermine' }))).includes('Noch keiner'),
  'die Terminliste sagt, dass sie leer ist',
);

/* ---------- Einen Termin eintragen ---------- */

const termin = vorTagen(30);
await page.locator('[data-act="termin-neu"]').fill(termin);
await page.waitForTimeout(300);
const liste = await text(page.locator('.karte', { hasText: 'Arzttermine' }));
check(liste.includes('der letzte'), 'der eingetragene Termin steht als der letzte da');
check(
  await page.locator('[data-act="bericht-seit"]').count() === 1,
  'und jetzt gibt es den Knopf für den Bericht seitdem',
);

/* ---------- Das Fenster fängt am Termin an ---------- */

await page.locator('[data-act="bericht-seit"]').click();
await page.waitForTimeout(500);
const bericht = await page.locator('.bericht').inputValue();
check(bericht.includes('31 Tage'), `der Bericht deckt 31 Tage ab (${bericht.split('\n')[1]})`);
check(
  bericht.includes('Zeit seit dem letzten Termin'),
  'und sagt im Kopf, dass das die Zeit seit dem Termin ist',
);
check(bericht.includes('Nach dem Termin'), 'was danach war, steht drin');
check(!bericht.includes('Lange vor dem Termin'), 'was davor war, nicht');

/* ---------- Die Richtung rechnet nicht heimlich von davor ---------- */

/*
 * 31 Tage reichen für zweimal 14 notierte Tage – aber nur knapp. Stünde in der
 * Richtung eine größere Zahl als 14, hätte sie Tage von vor dem Termin
 * mitgezählt, unter einer Überschrift, die etwas anderes verspricht.
 */
const richtung = bericht.split('\n').find((z) => z.includes('notierten Tage gegen'));
check(!!richtung, 'die Richtung steht auch im Bericht seit dem Termin');
check(
  richtung.includes('14 notierten Tage gegen die 14 davor'),
  `sie bleibt im Zeitraum (${(richtung || '').trim()})`,
);

/* ---------- 30 Tage sind weiter da, aber nicht mehr die erste Wahl ---------- */

check(
  await page.locator('[data-act="bericht"][data-n="30"].btn-primary').count() === 0,
  'mit einem Termin ist „Letzte 30 Tage" nicht mehr der hervorgehobene Knopf',
);

/* ---------- Wieder löschen ---------- */

await page.locator('[data-act="termin-weg"]').click();
await page.waitForTimeout(300);
check(
  await page.locator('[data-act="bericht-seit"]').count() === 0,
  'ohne Termin verschwindet der Knopf wieder',
);

/* ---------- Zweimal derselbe Tag bleibt ein Termin ---------- */

await page.locator('[data-act="termin-neu"]').fill(termin);
await page.waitForTimeout(250);
await page.locator('[data-act="termin-neu"]').fill(termin);
await page.waitForTimeout(250);
check(
  await page.locator('[data-act="termin-weg"]').count() === 1,
  'derselbe Tag zweimal eingetragen bleibt ein Eintrag',
);

/* ---------- Der jüngere Termin gewinnt ---------- */

await page.locator('[data-act="termin-neu"]').fill(vorTagen(5));
await page.waitForTimeout(300);
check(
  (await text(page.locator('[data-act="bericht-seit"]'))).includes('Seit dem'),
  'der Knopf trägt ein Datum',
);
await page.locator('[data-act="bericht-seit"]').click();
await page.waitForTimeout(500);
const kurz = await page.locator('.bericht').inputValue();
check(kurz.includes('6 Tage'), `der jüngere Termin gewinnt (${kurz.split('\n')[1]})`);
check(
  !kurz.includes('RICHTUNG'),
  'und über sechs Tage behauptet die App keine Richtung',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/termin.png`, fullPage: true });
await browser.close();
ende();
