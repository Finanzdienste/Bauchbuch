/*
 * Die Übersicht „Was die Mittel bewirken".
 *
 * Zwei Dinge werden geprüft, und das zweite ist das wichtigere.
 *
 * Erstens die Zuordnung: Eingetragen wird frei Text – „Pantoprazol 20mg",
 * „pantoprazol", „Riopan". Findet die App die passende Gruppe nicht, steht bei
 * ihrem eigenen Mittel nichts, und die Übersicht ist genau für den wertlos,
 * der sie braucht.
 *
 * Zweitens der Ton. Dieser Text handelt von Medikamenten, und er darf keine
 * Dosierung nennen und keine Empfehlung aussprechen – dafür ist die Apotheke
 * da und nicht ein Tagebuch. Das steht nicht nur im Kommentar von
 * js/mittel.js, sondern wird hier nachgezählt.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import {
  ADHS_MITTEL, KLAER_SATZ, MITTEL_WISSEN, MPH_FORMEN, REIZSTOFFE, SONSTIGE_MITTEL, WEITERE_MITTEL,
} from '../js/mittel.js';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const eintraege = [
  { id: 'm1', am: vorTagen(2), um: '07:00', art: 'medikament', mittel: 'Pantoprazol 20mg', dosis: '' },
  { id: 'm2', am: vorTagen(1), um: '07:00', art: 'medikament', mittel: 'Pantoprazol 20mg', dosis: '' },
  { id: 'm3', am: vorTagen(1), um: '21:00', art: 'medikament', mittel: 'Riopan', dosis: '' },
  { id: 'm4', am: vorTagen(0), um: '12:00', art: 'medikament', mittel: 'Ibuprofen', dosis: '' },
  // Methylphenidat einmal mit eingetragener Form, einmal mit einer, die nur
  // der Name verrät; dazu Paracetamol mit Koffein.
  { id: 'm5', am: vorTagen(3), um: '07:30', art: 'medikament', mittel: 'Medikinet', dosis: '', form: 'sofort' },
  { id: 'm6', am: vorTagen(1), um: '08:00', art: 'medikament', mittel: 'Concerta', dosis: '' },
  { id: 'm7', am: vorTagen(2), um: '15:00', art: 'medikament', mittel: 'Paracetamol + Coffein', dosis: '' },
];

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
  [KEY, { eintraege, tage: {}, begruesst: true, tab: 'mehr' }]);
await page.reload({ waitUntil: 'networkidle' });

/* ---------- Was eingetragen wurde, steht oben ---------- */

const meine = await page.locator('.wartend').first().textContent();
check(meine.includes('Pantoprazol 20mg'), 'das eigene Mittel steht in der Übersicht');
check(meine.includes('2 Mal'), 'mit der Anzahl der Einnahmen');
check(
  meine.includes('Drosselt die Säurebildung'),
  '„Pantoprazol 20mg" wird trotz angehängter Menge dem PPI zugeordnet',
);
check(
  meine.includes('Neutralisiert die Säure'),
  'ein Handelsname wie Riopan findet ebenfalls seine Gruppe',
);
check(
  meine.includes('häufigsten Gründe für eine entzündete Magenschleimhaut'),
  'und Ibuprofen wird als das ausgewiesen, was den Magen belastet',
);
// Die Zeile, die mit dem Namen beginnt: Der Kurztext von Methylphenidat nennt selbst
// „Medikinet retard, Medikinet adult" und steht auch in der Zeile von Concerta.
const zeile = async (name) => (await page.locator('.wartend').first()
  .locator('li', { hasText: new RegExp(`^\\s*${name.replace(/[+]/g, '\\+')}`) }).textContent()) || '';
check((await zeile('Medikinet')).includes('Form: nicht retardierte Tablette'),
  'bei Methylphenidat steht die eingetragene Form dabei');
check((await zeile('Concerta')).includes('Form: Retardtablette mit Hülle'),
  'ohne eingetragene Form die, die der Name eindeutig nennt');
check((await zeile('Paracetamol + Coffein')).includes('Kombinationsmittel mit niedrigerer Übergebrauchsgrenze'),
  'Paracetamol mit Koffein ist ein Kombinationsmittel, für den Magen kein NSAR');
check(!(await zeile('Ibuprofen')).includes('Form:'), 'andere Mittel haben keine Form');

/* ---------- Die ganze Liste ---------- */

check(await page.locator('.mittel').count() === 0, 'die volle Liste steht nicht ungefragt da');
await page.locator('[data-act="mittel"]').click();
await page.waitForTimeout(250);
const gruppen = await page.locator('.mittel').count();
check(
  gruppen === 25,
  `fünfundzwanzig Gruppen: neun Mittel, drei Reizstoffe, sechs Schmerz- und Migränemittel, `
    + `sechs bei ADHS, eins sonst (${gruppen})`,
);
const ueberschriften = await page.locator('.mittel-liste > .feld-name').allTextContents();
check(
  JSON.stringify(ueberschriften) === JSON.stringify(['Was den Magen von der anderen Seite belastet',
    'Schmerz- und Migränemittel', 'Mittel bei ADHS', 'Sonst noch']),
  `die Abschnitte in dieser Reihenfolge (${ueberschriften.join(' | ')})`,
);

const ppi = page.locator('.mittel').first();
await ppi.locator('summary').click();
await page.waitForTimeout(150);
const text = await ppi.textContent();
check(text.includes('Wie es wirkt'), 'jede Gruppe erklärt, wie sie wirkt');
check(text.includes('Wann man es nimmt'), 'und wann man sie nimmt');
check(text.includes('Worauf zu achten ist'), 'und worauf zu achten ist');
check(
  text.includes('nicht beendet, ohne vorher mit Ärztin, Arzt oder Apotheke zu sprechen'),
  'beim PPI steht, was die Packungsbeilage zum Beenden sagt – mit Verweis auf Praxis oder Apotheke',
);
check(
  !/Ausschleichen|mehr Säure als vorher|von einem Tag auf den anderen/.test(text),
  'und kein Säure-Rebound und kein Rat zum Ausschleichen: Beides steht in keiner Packungsbeilage',
);

await page.screenshot({ path: `${SHOT}/70-mittel.png` });

/* ---------- Methylphenidat: Fachinformation und „Je nach Form" ---------- */

const mph = page.locator('.mittel', { has: page.locator('summary > b', { hasText: /^Methylphenidat$/ }) });
await mph.locator('summary').click();
await page.waitForTimeout(150);
const mphText = (await mph.textContent()).replace(/\s+/g, ' ');
const reihe = ['Wie es wirkt', 'Wann man es nimmt', 'Was in der Fachinformation steht', 'Worauf zu achten ist']
  .map((t) => mphText.indexOf(t));
check(reihe.every((x, i) => x >= 0 && (i === 0 || x > reihe[i - 1])),
  `„Was in der Fachinformation steht" zwischen „Wann man es nimmt" und „Worauf zu achten ist" (${reihe.join(', ')})`);
check(await mph.locator('.mittel-formen').count() === 1 && mphText.includes('Je nach Form'),
  'unter Methylphenidat der Abschnitt „Je nach Form"');
check(await mph.locator('.mittel-formen p:not(.feld-name)').count() === 7,
  'mit allen sieben Formen');
check(mphText.includes('Kapsel mit zweierlei Kügelchen') && mphText.includes('Protonenpumpenhemmern'),
  'die Kapsel mit zweierlei Kügelchen samt Säureblocker-Satz');
check(await page.locator('.mittel', { hasText: 'Lisdexamfetamin' }).locator('.mittel-formen').count() === 0,
  'die Formen nur bei Methylphenidat');
const ohneNw = await page.locator('.mittel', { has: page.locator('summary > b', { hasText: /^Dexamfetamin$/ }) }).textContent();
check(!ohneNw.includes('Was in der Fachinformation steht'),
  'wo keine Häufigkeit belegt ist, fehlt der Abschnitt (Dexamfetamin)');
const breit = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
check(breit[0] <= breit[1], `nichts ragt über den Rand (${breit.join('/')})`);

/* ---------- Der Ton: keine Dosierung, keine Empfehlung ---------- */

const ganz = await page.locator('#view').textContent();
check(
  ganz.includes('keine Beratung'),
  'die Übersicht sagt von sich, dass sie keine Beratung ist',
);
check(
  ganz.includes('Apotheke'),
  'und verweist auf Ärztin oder Apotheke',
);
const dosis = ganz.match(/\d+\s?(mg|ml|µg|Gramm|Tabletten)\b/g) || [];
// "Pantoprazol 20mg" ist die Eintragung des Nutzers, nicht der Text der App.
const eigene = dosis.filter((d) => !'Pantoprazol 20mg'.includes(d));
check(
  eigene.length === 0,
  `nirgends eine Dosierung${eigene.length ? `: ${eigene.join(', ')}` : ''}`,
);
const raten = ganz.match(/\b(nimm|nehmen Sie|empfehlen|empfohlen|du solltest|hilft gegen)\b/gi) || [];
check(
  raten.length === 0,
  `kein Satz, der etwas empfiehlt${raten.length ? `: ${raten.join(', ')}` : ''}`,
);
check(ganz.includes('Je nach Form') && ganz.includes('Koffein als Tablette'),
  'die Prüfung umfasst die ganze Karte samt „Je nach Form" und „Sonst noch"');

/*
 * Jeder neue Hinweis endet bei Ärztin oder Apotheke: die sechs bei ADHS,
 * das Koffein und Paracetamol mit Koffein.
 */
const neu = [...ADHS_MITTEL, ...SONSTIGE_MITTEL, ...WEITERE_MITTEL.filter((g) => g.id === 'kombipara')];
const ohneVerweis = neu.filter((g) => !/Ärztin|Apotheke/.test(g.hinweis)).map((g) => g.id);
check(neu.length === 8 && ohneVerweis.length === 0,
  `jeder neue Hinweis nennt Ärztin oder Apotheke${ohneVerweis.length ? ` – nicht: ${ohneVerweis.join(', ')}` : ''}`);

/*
 * Die Berichtigungen der Fassung 30 an den Magen- und Schmerzmitteln: Sätze,
 * die keine Fach- oder Gebrauchsinformation trägt, kommen nicht zurück.
 * Geprüft am Text selbst, nicht an der Karte – so fällt auch ein Satz auf, der
 * nur im Bogen oder in der Kurzzeile steht.
 */
const gruppe = (id) => [...MITTEL_WISSEN, ...REIZSTOFFE, ...WEITERE_MITTEL].find((g) => g.id === id);
const textVon = (g) => [g.kurz, g.wirkung, g.einnahme, g.hinweis].join(' ');
const magenUndSchmerz = [...MITTEL_WISSEN, ...REIZSTOFFE,
  ...WEITERE_MITTEL.filter((g) => ['triptan', 'opioid'].includes(g.id))];
const unbelegt = [
  /zur Ruhe kommt/, /gewöhnt sich/, /Ausschleichen/, /Hemmen lassen sich nur/,
  /unwirksam machen/, /ein bis drei Stunden/, /calciumhaltige eher stopfend/,
  /saures Milieu/, /stillsteht|steht der Magen oft still/, /Viertelstunde vor dem Schmerzmittel/,
  /zu oder nach den Mahlzeiten/, /kein Alarmzeichen/, /reichlich Wasser/,
  /wirklich schadet/, /häufigste[rn]? vermeidbare/, /abgeschaltet/, /meistgekauft/,
  /weniger heikel/, /als lange angenommen/, /falsche Werkzeug/,
  /greift (es|den Magen) nicht an|Greift den Magen nicht an|den Magen nicht angreifen/,
  /Leitlinien/, /leicht abhängig/, /meist harmlos/, /Fall für sofort/,
];
const treffer = magenUndSchmerz.flatMap((g) => unbelegt
  .filter((r) => r.test(textVon(g))).map((r) => `${g.id}: ${r.source}`));
check(treffer.length === 0,
  `kein gestrichener, unbelegter Satz ist zurück${treffer.length ? `: ${treffer.join(' | ')}` : ''}`);

// Warnzeichen der Stufe „sofort" lauten wie auf der Warnkarte (js/app.js, warnTeil).
const SOFORT = 'nicht auf einen Termin warten – Notaufnahme oder 112';
check(gruppe('heilerde').hinweis.includes(SOFORT) && gruppe('heilerde').hinweis.includes('verdautes Blut'),
  'schwarzer Stuhl unter Bismut: harmlos laut Fachinformation, aber das Warnzeichen bleibt eins');
check((gruppe('triptan').hinweis.split(SOFORT).length - 1) === 2 && !/:\s*sofort\b/.test(gruppe('triptan').hinweis),
  'beim Triptan beide Notfälle – Brust und Darm – im Wortlaut der Warnkarte');

// Übergebrauch nach ICHD-3: die Schwelle mit ihrer Dauer, nicht ein einzelner Monat.
const ohneDauer = ['kombi', 'triptan', 'opioid']
  .filter((id) => !/mehr als drei Monate an zehn oder mehr Tagen im Monat/.test(gruppe(id).hinweis));
check(ohneDauer.length === 0,
  `Kombinationsmittel, Triptan und Opioid nennen die Dauer von mehr als drei Monaten${ohneDauer.length ? ` – nicht: ${ohneDauer.join(', ')}` : ''}`);

// Wo Präparate sich unterscheiden, steht das Präparat dabei.
check(/Iberogast Classic/.test(gruppe('pflanzlich').hinweis) && /Advance enthält kein Schöllkraut/.test(gruppe('pflanzlich').hinweis),
  'der Leberhinweis gilt Iberogast Classic, nicht Iberogast Advance');
check(/Neuralgin extra Ibu-Lysinat/.test(gruppe('kombi').hinweis),
  'unter einer Marke gibt es auch Präparate ohne Koffein (Neuralgin extra)');
check(/Übelkeit und Erbrechen/.test(gruppe('prokinetika').kurz) && /nicht mehr\s+zugelassen/.test(gruppe('prokinetika').wirkung),
  'Prokinetika: zugelassen bei Übelkeit und Erbrechen, nicht mehr für Völlegefühl');

/*
 * Dieselbe Prüfung für die übrigen Schmerz- und Migränemittel, die Mittel bei
 * ADHS und das Koffein (Fassung 30, zweiter Teil der Datei).
 */
const restlich = [...WEITERE_MITTEL.filter((g) => !['triptan', 'opioid'].includes(g.id)),
  ...ADHS_MITTEL, ...SONSTIGE_MITTEL];
const textVonAlles = (g) => [g.kurz, g.wirkung, g.einnahme, g.nebenwirkung, g.hinweis].filter(Boolean).join(' ');
const unbelegtRest = [
  /ohne Angriff auf den Magen/, /kein Reizstoff/, /die kein Triptan nehmen dürfen/, /Früh im Anfall/,
  /stundenlang/, /kennt dafür noch keine/, /Schutzschicht des Magens in Ruhe/, /Schleimschicht/,
  /für den Magen gilt dasselbe/, /wirkt stärker/, /liegen nur woanders/, /als lange angenommen/,
  /Beide stecken/, /Bereitschaft des Nervensystems/, /schon gar nicht/, /seit 2024/, /gehört das Kopfschmerztagebuch/,
  /Alkohol verstärkt/, /den Blutdruck stark ansteigen/, /gehören angesprochen/, /hängt vor allem an/,
  /über Wochen regelmäßig Koffein/, /Ab etwa (zehn|fünfzehn) Tagen/,
];
const trefferRest = restlich.flatMap((g) => unbelegtRest
  .filter((r) => r.test(textVonAlles(g))).map((r) => `${g.id}: ${r.source}`));
check(trefferRest.length === 0,
  `auch bei Gepanten, Paracetamol, Vorbeugung, ADHS und Koffein kein gestrichener Satz zurück${trefferRest.length ? `: ${trefferRest.join(' | ')}` : ''}`);

// Metamizol schont den Magen nicht: Die Fachinformation nennt Magen-Darm-Blutungen.
check(/Metamizol sind auch Magen-Darm-Blutungen/.test(gruppe('nichtnsar').kurz)
  && /Metamizol nennt die\s+Fachinformation Magen-Darm-Blutungen/.test(gruppe('nichtnsar').wirkung)
  && /Magenbeschwerden/.test(gruppe('kombipara').wirkung),
  'Paracetamol und Metamizol: keine NSAR, aber nicht frei von Magen-Darm-Nebenwirkungen');

// Übergebrauch nach ICHD-3 auch hier mit der Dauer – und bei Gepanten die Sammelgruppe.
const dauer = /mehr als drei Monate an (zehn|fünfzehn) oder mehr Tagen im Monat/;
check(['nichtnsar', 'kombipara', 'gepant'].every((id) => dauer.test(gruppe(id).hinweis))
  && /prüft Body Check für diese Mittel nicht/.test(gruppe('gepant').hinweis),
  'Paracetamol, Paracetamol mit Koffein und Gepante: Grenze mit Dauer; was Body Check nicht prüft, steht dabei');

// Atogepant ist in der EU auch für den Anfall zugelassen; Body Check zählt es trotzdem nicht.
check(/Atogepant \(Aquipta\) ist zusätzlich/.test(gruppe('prophylaxe').kurz)
  && /auch Atogepant nicht/.test(gruppe('prophylaxe').hinweis)
  && /Valproat \(Ergenyl chrono\) schließt die Migränevorbeugung ausdrücklich aus/.test(gruppe('prophylaxe').wirkung.replace(/\s+/g, ' ')),
  'Vorbeugung: Atogepant als Ausnahme, Valproat und Candesartan nicht zur Migränevorbeugung zugelassen');

// Lasmiditan und das Fahren: so, wie es die Fachinformation sagt.
check(/mindestens acht Stunden lang kein Fahrzeug/.test(gruppe('gepant').einnahme),
  'Lasmiditan: mindestens acht Stunden kein Fahrzeug, laut Fachinformation');

// Die ADHS-Hinweise: vollständig, wo die Quelle mehr sagt.
const adhs = (id) => ADHS_MITTEL.find((g) => g.id === id);
check(/innerhalb von vierzehn Tagen/.test(adhs('lisdex').hinweis) && /mindestens vierzehn Tagen/.test(adhs('dex').hinweis),
  'MAO-Hemmer: auch nicht innerhalb von vierzehn Tagen danach (Lisdexamfetamin, Dexamfetamin)');
check(adhs('atomox').hinweis.indexOf('Nicht eigenmächtig') < adhs('atomox').hinweis.indexOf('Leberschäden')
  && /unverzüglich die Ärztin oder der Arzt/.test(adhs('atomox').hinweis),
  'Atomoxetin: Leberzeichen wie in der Packungsbeilage, ohne dass „nicht eigenmächtig" ihr widerspricht');
check(/sofort an\s+die Ärztin oder den Arzt/.test(adhs('guanf').hinweis.replace(/\s+/g, ' ')),
  'Guanfacin: Schwindel oder Bewusstseinsverlust sofort ärztlich, wie in der Packungsbeilage');

// Säureblocker und Methylphenidat: am Präparat, nicht an einer erschlossenen Säuregrenze.
const pellet = MPH_FORMEN.find((f) => f.id === 'pellet');
check(/am einzelnen Präparat/.test(KLAER_SATZ) && /Medikinet retard und Medikinet adult/.test(KLAER_SATZ)
  && !/an der Form/.test(KLAER_SATZ),
  'der Klär-Satz nennt die Präparate, für die die Fachinformation eine Gegenanzeige nennt');
check(!/weniger sauren Magen|alles auf einmal/.test(pellet.saeure) && /gesamte Wirkstoffmenge rascher frei/.test(pellet.saeure)
  && /womöglich nicht\s+ausreichend verlängert/.test(pellet.einnahme) && !/es entstehen hohe Spitzen/.test(pellet.einnahme),
  'Kapsel mit zweierlei Kügelchen: Freisetzung und Nüchterneinnahme so vorsichtig wie die Fachinformation');

/* ---------- Beim Eintragen steht es gleich dabei ---------- */

await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(200);
await page.locator('[data-act="neu"][data-art="medikament"]').click();
await page.waitForTimeout(200);
check(
  await page.locator('.mittel-hinweis').count() === 0,
  'ohne Eingabe steht im Bogen kein Hinweis',
);
await page.locator('.marke[data-id="Iberogast"]').click();
await page.waitForTimeout(250);
check(
  (await page.locator('.mittel-hinweis').textContent()).includes('Pflanzliche Mittel'),
  'ein gewähltes Mittel bringt seine Gruppe gleich mit',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
