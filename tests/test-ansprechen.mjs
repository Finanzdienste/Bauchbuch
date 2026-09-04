/*
 * Ob ein Mittel etwas bewirkt.
 *
 * Der interessante Fall ist nicht die Besserung, sondern ihr Ausbleiben: Ein
 * Säureblocker, der nach vier bis acht Wochen nichts geändert hat, spricht
 * gegen die Säure als Ursache. Das ist eine der wenigen Stellen, an denen ein
 * Tagebuch eine Untersuchung ersetzt, und deshalb steht dieser Fall hier im
 * Mittelpunkt.
 *
 * Zwei Grenzen werden mitgeprüft, weil sie leicht zu übertreten wären:
 *
 *   * Kein Rat zum Absetzen. Ein Säureblocker wird nach längerer Einnahme
 *     nicht von einem Tag auf den anderen weggelassen – der Magen antwortet
 *     dann mit mehr Säure als vorher.
 *   * Kein Triumph bei Besserung. Man fängt ein Mittel meistens an, *weil* es
 *     gerade besonders schlecht ist; danach wird es oft von selbst besser.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, pruefer, vorTagen } from './umgebung.mjs';

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

const beschwerde = (t, staerke) => ({
  id: `b${t}`, am: vorTagen(t), um: '11:00', art: 'beschwerde', staerke, arten: ['brennen'],
});
const mittelEintrag = (t, name) => ({
  id: `m${t}`, am: vorTagen(t), um: '07:00', art: 'medikament', mittel: name, dosis: '20 mg',
});

/* ---------- Der ausgereizte Säureblocker ---------- */

/*
 * Fünf Wochen Pantoprazol, und die Beschwerden bleiben genau, wo sie waren.
 * Davor fünf Wochen ohne, zum Vergleich – gleich lang, wie die Rechnung es tut.
 */
const ohneWirkung = [];
for (let t = 70; t >= 36; t--) ohneWirkung.push(beschwerde(t, 6));
for (let t = 35; t >= 1; t--) {
  ohneWirkung.push(beschwerde(t, 6));
  ohneWirkung.push(mittelEintrag(t, 'Pantoprazol'));
}

await setze({ begruesst: true, tab: 'muster', eintraege: ohneWirkung, tage: {}, fenster: 4, mindestFaelle: 5 });

const karte = page.locator('.karte', { hasText: 'Ob es etwas bewirkt' });
check(await karte.count() === 1, 'es gibt einen Abschnitt zum Ansprechen');
const kText = await text(karte);
check(kText.includes('Pantoprazol'), 'das Mittel steht mit Namen da');
check(kText.includes('kein Unterschied'), 'und das Urteil: darunter nicht anders als davor');
check(
  kText.includes('35 Einnahmetage'),
  'mit der Zahl der Einnahmetage – daran hängt, ob das Urteil überhaupt etwas wert ist',
);
check(
  kText.includes('Das ist selbst ein Befund'),
  'ausbleibendes Ansprechen wird als Befund benannt, nicht als Lücke',
);
check(
  kText.includes('vier bis acht Wochen'),
  'mit der Frist, nach der ein Säureblockerversuch ausgereizt ist',
);
check(
  kText.includes('Frage für den Termin'),
  'und mit der fertigen Frage dafür',
);
check(
  kText.includes('Nicht von selbst absetzen'),
  'ausdrücklich ohne Rat zum Absetzen – der Magen antwortet dann mit mehr Säure als vorher',
);
check(
  kText.includes('6,0 davor gegen 6,0 darunter'),
  'beide Mittelwerte stehen daneben, nicht nur ihre Differenz',
);

/* ---------- Besserung wird nicht als Beweis verkauft ---------- */

const mitWirkung = [];
for (let t = 70; t >= 36; t--) mitWirkung.push(beschwerde(t, 7));
for (let t = 35; t >= 1; t--) {
  mitWirkung.push(beschwerde(t, 2));
  mitWirkung.push(mittelEintrag(t, 'Pantoprazol'));
}
await setze({ begruesst: true, tab: 'muster', eintraege: mitWirkung, tage: {}, fenster: 4, mindestFaelle: 5 });
const besser = await text(page.locator('.karte', { hasText: 'Ob es etwas bewirkt' }));
check(besser.includes('darunter besser'), 'eine deutliche Besserung wird auch so genannt');
check(
  besser.includes('Vorsicht bei der Deutung'),
  'aber mit dem Vorbehalt: Man fängt ein Mittel an, wenn es gerade besonders schlecht ist',
);
check(
  !besser.includes('Das ist selbst ein Befund'),
  'und ohne den Satz zum ausgereizten Versuch – der gilt hier nicht',
);

/* ---------- Zu wenige Tage: gar kein Urteil ---------- */

const wenig = [];
for (let t = 40; t >= 1; t--) wenig.push(beschwerde(t, 5));
for (let t = 5; t >= 1; t--) wenig.push(mittelEintrag(t, 'Iberogast'));
await setze({ begruesst: true, tab: 'muster', eintraege: wenig, tage: {}, fenster: 4, mindestFaelle: 5 });
check(
  await page.locator('.karte', { hasText: 'Ob es etwas bewirkt' }).count() === 0,
  'fünf Einnahmetage tragen kein Urteil – dann steht der Abschnitt gar nicht erst da',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
