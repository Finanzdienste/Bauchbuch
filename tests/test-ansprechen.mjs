/*
 * Ob sich unter einem Mittel etwas geändert hat.
 *
 * Der Fall, der hier im Mittelpunkt steht, ist ein Säureblocker, unter dem die
 * Bauchwerte nicht besser geworden sind. Seit der Fassung 30 sagt die App dazu
 * nur, was die Fachinformationen nennen – weitere Untersuchungen –, und keinen
 * Schluss auf die Ursache mehr (Belege im Kopf von js/ansprechen.js).
 *
 * Drei Grenzen werden mitgeprüft, weil sie leicht zu übertreten wären:
 *
 *   * Kein Rat zum Absetzen, und kein Säure-Rebound: Den nennt keine geprüfte
 *     Fach- oder Gebrauchsinformation. Belegt ist nur der Satz der
 *     Packungsbeilage, dass die Einnahme nicht ohne Rücksprache beendet wird.
 *   * Kein Triumph bei Besserung. Wird ein Mittel begonnen, während es gerade
 *     schlecht ist, kann eine Besserung danach auch von selbst kommen.
 *   * Ein Urteil aus dem Bauchwert nur bei Magenmitteln – bei Ibuprofen,
 *     Bupropion oder einem ADHS-Mittel stehen nur die Zahlen.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, pruefer, vorTagen } from './umgebung.mjs';
import {
  ANSPRECHEN_URTEIL, befund, mittelBilanz, urteilAnzeige,
} from '../js/ansprechen.js';
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
  kText.includes('ohne dass die Bauchwerte darunter besser geworden wären')
    && kText.includes('nennen manche Fachinformationen weitere Untersuchungen')
    && kText.includes('klärt die Praxis'),
  'ohne Besserung: was die Fachinformationen dafür nennen, und dass die Praxis es einordnet',
);
check(
  !kText.includes('Wenn Säure die Ursache wäre') && !kText.includes('vier bis acht Wochen')
    && !kText.includes('Das ist selbst ein Befund'),
  'kein Schluss auf die Säure als Ursache mehr (bis zur Fassung 29)',
);
check(
  kText.includes('Frage für den Termin'),
  'und mit der fertigen Frage dafür',
);
check(
  kText.includes('Laut Packungsbeilage mancher Präparate, etwa Pantozol, wird die Einnahme nicht beendet, '
    + 'ohne vorher mit Ärztin, Arzt oder Apotheke zu sprechen')
    && !kText.includes('mehr Säure als vorher') && !kText.includes('Nicht von selbst absetzen'),
  'zum Beenden nur der Satz der Packungsbeilage – kein Säure-Rebound, keine Anweisung',
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
  besser.includes('Vorsicht bei der Deutung')
    && besser.includes('kann eine Besserung danach auch von selbst kommen')
    && !/\bmeist\b|\boft\b/.test(besser),
  'aber mit dem Vorbehalt, dass eine Besserung auch von selbst kommen kann – als Möglichkeit, ohne „meist“ und „oft“',
);
check(
  !besser.includes('weitere Untersuchungen'),
  'und ohne den Satz zum Säureblocker ohne Besserung – der gilt hier nicht',
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
/*
 * Fassung 30: Ein Urteil aus dem Bauchwert steht nur bei den Magenmitteln.
 * Gerechnet wird es für alle weiter – ausgegeben wird es bei Bupropion oder
 * Ibuprofen nicht, sondern nur die beiden Zahlen. Bei Ibuprofen hieß es bis
 * zur Fassung 29 „Das heißt nicht, dass das Mittel schadet".
 */
const [bupro] = mittelBilanz(verlaufMit('Elontril', 2, 7), {}, { heute: vorTagen(0), gruppeVon });
const buproSatz = befund(bupro);
check(bupro.urteil === 'schlechter' && urteilAnzeige(bupro) === 'offen'
  && buproSatz.includes('ob das etwas mit dem Mittel zu tun hat, zeigt dieser Vergleich nicht')
  && !/besser|schlechter|Kein Unterschied/.test(buproSatz),
`Bupropion: gerechnet „schlechter", angezeigt ohne Urteil – nur die Zahlen (${urteilAnzeige(bupro)})`);
const [ibu] = mittelBilanz(verlaufMit('Ibuprofen', 2, 7), {}, { heute: vorTagen(0), gruppeVon });
const ibuSatz = befund(ibu);
check(ibu.gruppe === 'nsar' && ibu.urteil === 'schlechter' && urteilAnzeige(ibu) === 'offen'
  && ibuSatz.startsWith(`Seit dem ersten Eintrag (${vorTagen(35).split('-').reverse().join('.')}) im Mittel 7,0, in der Zeit davor 2,0`)
  && !ibuSatz.includes('schadet') && !/besser|schlechter/.test(ibuSatz),
`Ibuprofen: ohne Urteil und ohne „schadet nicht", nur die Zahlen (${ibuSatz.slice(0, 90)})`);
const [ibero] = mittelBilanz(verlaufMit('Iberogast', 2, 7), {}, { heute: vorTagen(0), gruppeVon });
check(urteilAnzeige(ibero) === 'schlechter' && befund(ibero).startsWith('Darunter schlechter als davor')
  && befund(ibero).includes('Woran das liegt, zeigt dieser Vergleich nicht') && !befund(ibero).includes('schadet'),
'ein Magenmittel behält sein Urteil – ohne Deutung, woran es liegt');

await setze({ begruesst: true, tab: 'muster', eintraege: verlaufMit('Intuniv', 1, 6), tage: {}, fenster: 4, mindestFaelle: 5 });
const adhsKarte = await text(page.locator('.karte', { hasText: 'Ob es etwas bewirkt' }));
check(adhsKarte.includes('Intuniv') && adhsKarte.includes('ohne Urteil') && adhsKarte.includes('Seit dem ersten Eintrag')
  && !adhsKarte.includes('darunter schlechter'),
`in der App: „ohne Urteil" und der Satz statt „darunter schlechter" (${adhsKarte.slice(0, 120)})`);

await setze({ begruesst: true, tab: 'muster', eintraege: verlaufMit('Ibuprofen', 2, 7), tage: {}, fenster: 4, mindestFaelle: 5 });
const ibuKarte = await text(page.locator('.karte', { hasText: 'Ob es etwas bewirkt' }));
check(ibuKarte.includes('Ibuprofen') && ibuKarte.includes('ohne Urteil') && !ibuKarte.includes('darunter schlechter'),
  `in der App bei Ibuprofen: „ohne Urteil" statt „darunter schlechter" (${ibuKarte.slice(0, 120)})`);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
