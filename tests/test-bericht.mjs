/*
 * Der Zettel für den Arzttermin.
 *
 * Er ist der Grund, aus dem man so ein Tagebuch überhaupt führt: In zehn
 * Minuten Sprechstunde erinnert sich niemand an sechs Wochen. Deshalb wird
 * geprüft, dass die Zahlen darin stimmen und nicht nur schön aussehen – und
 * dass er nichts behauptet, was er nicht gezählt hat.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, vorTagen, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const eintraege = [];
// Zehn Tage: mittags Kaffee, danach Brennen. Abends nichts.
for (let t = 0; t < 10; t++) {
  const am = vorTagen(t);
  eintraege.push({ id: `m${t}`, am, um: '12:00', art: 'essen', was: 'Mittag', tags: ['kaffee'], portion: 'normal' });
  eintraege.push({ id: `w${t}`, am, um: '13:00', art: 'beschwerde', staerke: 6, arten: ['brennen'] });
  eintraege.push({ id: `a${t}`, am, um: '18:30', art: 'essen', was: 'Abend', tags: [], portion: 'klein' });
  eintraege.push({ id: `p${t}`, am, um: '07:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg' });
}
eintraege.push({ id: 'n1', am: vorTagen(2), um: '22:00', art: 'notiz', text: 'Viel Stress im Büro.' });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
  [KEY, { eintraege, tage: {}, fenster: 4, mindestFaelle: 5, begruesst: true, tab: 'mehr' }]);
await page.reload({ waitUntil: 'networkidle' });

await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(300);
check(await page.locator('.bericht').count() === 1, 'der Bericht erscheint');
const text = await page.locator('.bericht').inputValue();

check(text.startsWith('Magen-Tagebuch'), 'er hat eine Überschrift');
check(text.includes('Tage mit Eintragung        10 von 30'), 'zehn von dreißig Tagen notiert');
check(text.includes('Tage mit Beschwerden       10 (100 %'), 'alle zehn davon mit Beschwerden');
check(/Stärke im Mittel\s+6/.test(text), 'die mittlere Stärke ist 6');
check(text.includes('Höchster Wert              6'), 'und der höchste ebenfalls');
check(text.includes('Mahlzeiten eingetragen     20'), 'zwanzig Mahlzeiten');
check(text.includes('Medikamenteneinnahmen      10'), 'zehn Einnahmen');
check(/Brennen\s+10 Mal/.test(text), 'die Beschwerdeart mit ihrer Häufigkeit');
check(/mittags\s+10 Mal/.test(text), 'die Tageszeit, in der es auftrat');
check(/Pantoprazol\s+10 Mal/.test(text), 'das eingenommene Mittel');
check(text.includes('Viel Stress im Büro.'), 'die Notiz steht mit dabei');
check(
  /Kaffee\s+6 gegen 0 \(10 Mahlzeiten damit, 10 ohne\)/.test(text),
  'der auffällige Auslöser mit beiden Mittelwerten und beiden Fallzahlen',
);
check(
  text.includes('gezählt, nicht gedeutet'),
  'und der Satz, dass hier nichts gedeutet wird',
);
// „Diagnose" darf vorkommen – aber nur in dem Satz, der sagt, dass keine
// gestellt wird. Behauptet werden darf sie nirgends.
check(
  text.includes('stellt keine Diagnose'),
  'der Bericht sagt von sich, dass er keine Diagnose stellt',
);
const behauptet = text.match(/Diagnose:|Diagnose lautet|Ursache ist|verursacht durch/gi) || [];
check(
  behauptet.length === 0,
  `nirgends eine zugeschriebene Ursache${behauptet.length ? `: ${behauptet.join(', ')}` : ''}`,
);

/* ---------- Was neu dazugekommen ist, steht auch auf dem Zettel ---------- */

/*
 * Ein Verlauf, an dem sich alles Neue zeigt – und zwar so gebaut, dass jede
 * Rechnung ihre Vergleichsgruppe hat. Daran scheitert es sonst still:
 *
 *   * Schmerz an drei von vier Tagen, nicht an allen. Ohne schmerzfreie Tage
 *     lassen sich die Rom-Merkmale „ändert sich die Häufigkeit/Form dabei?"
 *     gegen nichts vergleichen, und die Kriterien bleiben ungeprüft.
 *   * An Schmerztagen weicher Stuhl, sonst unauffälliger – das ist das
 *     Merkmal, das hier erfüllt sein soll.
 *   * Pantoprazol erst in der zweiten Hälfte, damit es eine Zeit davor gibt.
 *     Die Beschwerden bleiben gleich: der ausgereizte Säureblockerversuch.
 */
const lang = [];
for (let t = 90; t >= 1; t--) {
  const am = vorTagen(t);
  const schmerz = t % 4 !== 0;
  if (schmerz) {
    lang.push({ id: `lb${t}`, am, um: '11:00', art: 'beschwerde', staerke: 6,
      arten: ['krampf', 'oberbauch'], stuhlbezug: 'besser' });
  }
  lang.push({ id: `ls${t}`, am, um: '09:00', art: 'stuhl', form: schmerz ? 6 : 4 });
  if (t <= 45) lang.push({ id: `lm${t}`, am, um: '07:00', art: 'medikament', mittel: 'Pantoprazol' });
  lang.push({ id: `le${t}`, am, um: '12:00', art: 'essen', was: 'Mittag', portion: 'normal',
    zutaten: t % 2 ? [{ id: 'milch', rolle: 'haupt' }] : [] });
}
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
  [KEY, { eintraege: lang, tage: {}, fenster: 4, mindestFaelle: 5, begruesst: true,
    tab: 'mehr', beschwerdenSeit: '2023-01' }]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="bericht"][data-n="90"]').click();
await page.waitForTimeout(400);
const voll = await page.locator('.bericht').inputValue();

check(voll.includes('STUHLGANG (BRISTOL)'), 'der Stuhlgang steht als eigener Abschnitt drin');
check(/Typ 6-7 \(weich\)\s+\d+/.test(voll), 'mit den Anteilen nach Bristol-Gruppe');
check(voll.includes('KRITERIEN'), 'die Kriterien stehen auf dem Zettel');
check(
  voll.includes('Rom IV, Reizdarmsyndrom'),
  'mit dem Regelwerk beim Namen – so heißt es auch in der Praxis',
);
check(
  voll.includes('GerdQ') && voll.includes('von 18 Punkten'),
  'und der GerdQ mit seiner Punktzahl',
);
check(
  voll.includes('Erfüllte Kriterien sind KEINE Diagnose'),
  'unmittelbar gefolgt von dem Satz, dass das keine Diagnose ist',
);
check(
  voll.includes('Beschwerden seit 2023-01'),
  'die Dauer der Beschwerden, ohne die eine Rom-Bedingung ungeprüft bliebe',
);
check(voll.includes('HAT ES ETWAS BEWIRKT?'), 'das Ansprechen auf die Mittel steht drin');
check(
  voll.includes('Das ist selbst ein Befund'),
  'und der Säureblocker ohne Wirkung wird als Befund benannt – das ist die nützlichste Zeile',
);
check(
  !/^.{80,}$/m.test(voll),
  'keine Zeile länger als achtzig Zeichen – der Zettel wird ausgedruckt',
);

/* ---------- Ein leerer Zeitraum sagt das ---------- */

await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'mehr' })), KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(300);
const leer = await page.locator('.bericht').inputValue();
check(
  leer.includes('wurde nichts eingetragen'),
  'ohne Eintragungen steht das im Bericht statt einer Reihe von Nullen',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
