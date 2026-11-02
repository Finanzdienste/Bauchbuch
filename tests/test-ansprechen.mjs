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
import { ANSPRECHEN_URTEIL, befund, mittelBilanz } from '../js/ansprechen.js';
import { wissenZu } from '../js/mittel.js';

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

/* ---------- B4: ein ADHS-Mittel bekommt kein Urteil ---------- */

/*
 * Ein ADHS-Mittel fängt man nicht wegen des Bauchs an, und ob es vorher
 * schon genommen und nur nicht eingetragen wurde, weiß niemand. Ein
 * „darunter schlechter" läse sich trotzdem wie ein Befund über das Mittel.
 * Deshalb: beide Zahlen nebeneinander, kein besser, kein schlechter, kein
 * unverändert – bei jeder der fünf Gruppen. Bupropion zählt nicht dazu.
 */
const gruppeVon = (name) => {
  const g = wissenZu(name);
  return g ? g.id : null;
};
const verlaufMit = (name, vorher, nachher) => {
  const e = [];
  for (let t = 70; t >= 36; t--) e.push(beschwerde(t, vorher));
  for (let t = 35; t >= 1; t--) {
    e.push(beschwerde(t, nachher));
    e.push(mittelEintrag(t, name));
  }
  return e;
};
const B4 = [['Strattera', 2, 7], ['Medikinet', 7, 2], ['Elvanse', 5, 5], ['Intuniv', 1, 6], ['Attentin', 6, 1]];
B4.forEach(([name, vorher, nachher]) => {
  const [m] = mittelBilanz(verlaufMit(name, vorher, nachher), {}, { heute: vorTagen(0), gruppeVon });
  const satz = befund(m);
  check(m.urteil === 'offen' && ANSPRECHEN_URTEIL[m.urteil] === 'ohne Urteil'
    && satz.startsWith(`Seit dem ersten Eintrag (${vorTagen(35).split('-').reverse().join('.')}) im Mittel ${nachher},0, in der Zeit davor ${vorher},0 (35 gegen 35 notierte Tage).`)
    && satz.includes('ein ADHS-Mittel fängt man auch nicht wegen des Bauchs an')
    && !/besser|schlechter|Kein Unterschied/.test(satz),
  `${name} (${vorher} → ${nachher}): kein Urteil, nur die beiden Zahlen (${m.urteil})`);
});
const [bupro] = mittelBilanz(verlaufMit('Elontril', 2, 7), {}, { heute: vorTagen(0), gruppeVon });
check(bupro.urteil === 'schlechter', 'Bupropion bekommt sein Urteil wie jedes andere Mittel');

await setze({ begruesst: true, tab: 'muster', eintraege: verlaufMit('Intuniv', 1, 6), tage: {}, fenster: 4, mindestFaelle: 5 });
const adhsKarte = await text(page.locator('.karte', { hasText: 'Ob es etwas bewirkt' }));
check(adhsKarte.includes('Intuniv') && adhsKarte.includes('ohne Urteil') && adhsKarte.includes('Seit dem ersten Eintrag')
  && !adhsKarte.includes('darunter schlechter'),
`in der App: „ohne Urteil" und der Satz statt „darunter schlechter" (${adhsKarte.slice(0, 120)})`);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
