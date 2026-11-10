/*
 * Was die App über ADHS-Mittel, Koffein und Säureblocker weiß – und welche
 * Paare von Mitteln sie anspricht.
 *
 * Drei Arten von Fehlern, die hier auffallen sollen, bevor sie jemand liest:
 *
 *   1. Ein Name landet in der falschen Gruppe. „Lisdexamfetamin" als
 *      Dexamfetamin, „Paracetamol Koffein" als ASS – für den Magen ein NSAR,
 *      das keines ist –, „Koffein" als Schmerzmittel, „Pantozol" als gar
 *      nichts. Jeder dieser Fehler verschiebt eine Zahl, die in die
 *      Sprechstunde mitgeht.
 *   2. Ein Paar fehlt oder steht zu viel da. Fehlt der Hinweis zu Medikinet
 *      und Pantoprazol, fehlt die eine Auskunft, die auf keiner der beiden
 *      Packungen steht. Steht einer zu Concerta und Pantoprazol da, ist er
 *      ausgedacht – belegt war dazu nichts.
 *   3. Ein Text nennt eine Dosis oder empfiehlt etwas. Das darf an keiner
 *      Stelle passieren, auch nicht in einem Formtext.
 *
 * Und am Ende der Wächter für die Sicherheitstexte (tools/pruefung/unantastbar.py):
 * Ein Zweig aus dem Briefkasten darf sie nicht ändern.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT, pruefer } from './umgebung.mjs';
import {
  ADHS_MITTEL, ADHS_NAMEN, KLAER_SATZ, MITTEL_WISSEN, MPH_FORMEN, SONSTIGE_MITTEL, WEITERE_MITTEL,
  adhsGruppe, formAusName, istAdhsMittel, mphForm, wissenZu,
} from '../js/mittel.js';
import { WECHSEL_TAGE, formZu, wechselHinweise } from '../js/zusammen.js';
// Als Namensraum dazu: Die Prüfungen der Rückfrage (Abschnitt 8) sollen rot
// werden, wenn etwas fehlt – nicht die ganze Datei beim Laden abbrechen.
import * as zusammen from '../js/zusammen.js';
import { MASSAGE_HINWEIS } from '../js/aktivitaet.js';
import { plusTage } from '../js/datum.js';

const { check, ende } = pruefer();
const gruppe = (name) => {
  const g = wissenZu(name);
  return g ? g.id : null;
};
const liste = (paare) => paare.filter(([n, g]) => gruppe(n) !== g).map(([n]) => `${n} → ${gruppe(n)}`);

/* ---------- 1. Namen ---------- */

const NAMEN = [
  ['Methylphenidat', 'mph'], ['Ritalin', 'mph'], ['Medikinet', 'mph'], ['Concerta', 'mph'],
  ['Kinecteen', 'mph'], ['Equasym', 'mph'], ['MPH retard', 'mph'],
  ['Elvanse', 'lisdex'], ['Lisdexamfetamin', 'lisdex'], ['Attentin', 'dex'], ['Dexamfetamin', 'dex'],
  ['Strattera', 'atomox'], ['Intuniv', 'guanf'], ['Elontril', 'bupro'], ['Zyban', 'bupro'],
  ['Atomoxetin-Gel', null],
  // Die Schreibweise mit „ph" ist im Deutschen ebenso verbreitet – und auch
  // dort steht Lisdexamfetamin vor Dexamfetamin.
  ['Lisdexamphetamin', 'lisdex'], ['Dexamphetamin', 'dex'],
];
let falsch = liste(NAMEN);
check(falsch.length === 0, `Namen → Gruppe${falsch.length ? ` – falsch: ${falsch.join(', ')}` : ''}`);
const nichtErkannt = ADHS_NAMEN.flatMap((x) => x.beispiele.filter((b) => gruppe(b) !== x.id));
check(nichtErkannt.length === 0, `jedes Beispiel aus ADHS_NAMEN findet seine Gruppe${nichtErkannt.length ? ` – nicht: ${nichtErkannt.join(', ')}` : ''}`);
check(ADHS_MITTEL.every((g) => JSON.stringify(g.beispiele)
  === JSON.stringify(ADHS_NAMEN.find((x) => x.id === g.id).beispiele)),
'die Texte nehmen ihre Beispiele aus ADHS_NAMEN – eine Liste, nicht zwei');
check(JSON.stringify(ADHS_MITTEL.map((g) => g.id)) === JSON.stringify(['mph', 'lisdex', 'dex', 'atomox', 'guanf', 'bupro']),
  'sechs ADHS-Gruppen, Lisdexamfetamin vor Dexamfetamin');
check(NAMEN.every(([n, g]) => adhsGruppe(n) === g),
  'adhsGruppe() sagt dasselbe wie wissenZu() – eine Erkennung für alles');
check(istAdhsMittel('Elvanse') && !istAdhsMittel('Elontril') && !istAdhsMittel('Koffein'),
  'Bupropion und Koffein zählen nicht als ADHS-Mittel');
check(istAdhsMittel('Lisdexamphetamin') && istAdhsMittel('Dexamphetamin 5 mg'),
  'auch in der Schreibweise mit „ph" ein ADHS-Mittel – sonst wäre ein Tag nur mit ihm wieder ein notierter');

/* ---------- 2. Formen ---------- */

const FORMEN = [
  ['Medikinet adult', 'pellet'], ['Medikinet retard 20 mg', 'pellet'], ['Medikinet', null],
  ['Ritalin LA', 'sodas'], ['Ritalin Adult', 'sodas'], ['Ritalin', null], ['Concerta', 'oros'],
  ['Kinecteen', 'retardtab'], ['Equasym Retard', 'equasym'], ['Methylphenidat', null], ['MPH retard', null],
  // So, wie es auf Packungen und in Apotheken steht: mit Bindestrich oder ®.
  ['Medikinet-retard', 'pellet'], ['Medikinet® retard', 'pellet'], ['Medikinet®adult', 'pellet'],
  ['Ritalin-Adult', 'sodas'], ['Ritalin® LA', 'sodas'], ['Ritalin-LA', 'sodas'], ['Medikinet®', null],
];
falsch = FORMEN.filter(([n, f]) => formAusName(n) !== f).map(([n]) => `${n} → ${formAusName(n)}`);
check(falsch.length === 0, `Form aus dem Namen nur, wo sie eindeutig ist${falsch.length ? ` – falsch: ${falsch.join(', ')}` : ''}`);
check(formAusName('Kinecteen') !== 'oros', 'Kinecteen ist keine Retardtablette mit Hülle (nicht belegt)');

const ids = MPH_FORMEN.map((f) => f.id);
const speicher = readFileSync(path.join(ROOT, 'js/store.js'), 'utf8');
const imSpeicher = /export const FORM_IDS = \[([^\]]*)\];/.exec(speicher);
check(
  !!imSpeicher && JSON.stringify(imSpeicher[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1))) === JSON.stringify(ids),
  `FORM_IDS in js/store.js sind die Kennungen von MPH_FORMEN (${ids.join(', ')})`,
);
check(MPH_FORMEN.length === 7 && MPH_FORMEN.every((f) => f.name && f.kurzname && f.einnahme),
  'sieben Formen, jede mit Name, Kurzname und Einnahme');
check(mphForm('unbekannt').kurzname === 'Form nicht angegeben' && mphForm('x') === null,
  'die Form zu ihrer Kennung');
check(['sofort', 'retardtab', 'unbekannt', 'sodas'].every((id) => mphForm(id).saeure === KLAER_SATZ),
  'wo nichts Genaueres belegt ist, steht der Klär-Satz – auch bei Ritalin LA / Adult');
check(!mphForm('oros').saeure && !mphForm('equasym').saeure,
  'bei Concerta und Equasym kein Satz zum Säureblocker – auch kein beruhigender');
check(/Protonenpumpenhemmern/.test(mphForm('pellet').saeure) && /Gegenanzeige/.test(mphForm('pellet').saeure),
  'bei der Kapsel mit zweierlei Kügelchen der Satz aus der Fachinformation');
/*
 * Und zwar so streng, wie die Quelle ist: Die Fachinformation von Medikinet
 * retard nennt unter den Gegenanzeigen (4.3) neben der Anazidität des Magens
 * auch die Behandlung mit H2-Blockern, Protonenpumpenhemmern oder Antazida, und
 * unter den Wechselwirkungen (4.5) „darf nicht zusammen … eingenommen werden“.
 * Ein Satz, der nur den Magen „von sich aus“ ohne Säure eine Gegenanzeige nennt
 * und das Paar bloß „nicht vorgesehen“, gibt die Quelle schwächer wieder, als
 * sie ist – und schließt gerade den Fall aus, um den es geht.
 */
const pelletSaeure = mphForm('pellet').saeure;
check(/nicht zusammen mit Protonenpumpenhemmern/.test(pelletSaeure)
  && /Behandlung damit steht dort unter den Gegenanzeigen/.test(pelletSaeure)
  && !/vorgesehen|von sich aus/.test(pelletSaeure),
  `Kapsel mit zweierlei Kügelchen: die Behandlung mit Säureblockern selbst steht unter den Gegenanzeigen (${pelletSaeure.slice(0, 60)}…)`);
check(/nichts eigenmächtig weglassen/.test(pelletSaeure),
  'und der Satz sagt dazu, nichts eigenmächtig wegzulassen');
/*
 * Im Medikamenten-Bogen steht unter „Welche Form?" nur der Text der
 * gewählten Form – ohne den Hinweis des Wirkstoffs, der auf Ärztin und
 * Apotheke verweist. Deshalb nennt jede Form selbst, wen man fragt.
 */
const formOhneVerweis = MPH_FORMEN.filter((f) => !/Ärztin|Praxis|Apotheke/
  .test([f.einnahme, f.saeure, f.extra].filter(Boolean).join(' ')));
check(formOhneVerweis.length === 0,
  `jeder Formtext verweist auf Ärztin, Praxis oder Apotheke${formOhneVerweis.length ? ` – nicht: ${formOhneVerweis.map((f) => f.id).join(', ')}` : ''}`);
/*
 * Concerta: Die Verengung im Magen-Darm-Trakt steht in der Fachinformation
 * unter den Warnhinweisen („normalerweise nicht"), nicht unter den
 * Gegenanzeigen. Ein Satz, der eine Quelle falsch wiedergibt, ist schlimmer
 * als keiner.
 */
check(!/Gegenanzeige/.test(mphForm('oros').extra) && /normalerweise nicht/.test(mphForm('oros').extra)
  && /Ärztin oder Apotheke/.test(mphForm('oros').extra),
  `bei der Retardtablette mit Hülle die Verengung so, wie die Fachinformation sie nennt (${mphForm('oros').extra.slice(70, 140)}…)`);

/* ---------- 3. Koffein: K2 und K2b ---------- */

const KOFFEIN = [
  ['ASS Koffein', 'kombi'], ['ASS + Coffein', 'kombi'], ['Ibuprofen Koffein', 'kombi'],
  ['Thomapyrin', 'kombi'], ['Neuralgin', 'kombi'],
  ['Paracetamol Koffein', 'kombipara'], ['Paracetamol + Coffein', 'kombipara'],
  ['Koffein', 'koffeinmittel'], ['Koffeintabletten', 'koffeinmittel'], ['Coffein', 'koffeinmittel'],
  // Ein Opioid oder Triptan mit Koffein im Namen bleibt, was es ist – sonst
  // fiele es aus der Zählung der Akutmittel.
  ['Tramadol Koffein', 'opioid'],
  ['Paracetamol', 'nichtnsar'], ['ASS 100', 'nsar'], ['Koffein-Shampoo-Creme', null],
  // Koffein als Tablette ist nur, was außer Koffein, Form und Stärke nichts trägt.
  ['Coffeinum N 0,2 g', 'koffeinmittel'], ['Coffein 200 mg', 'koffeinmittel'], ['Koffein 200 mg', 'koffeinmittel'],
  ['Koffein-Tabletten', 'koffeinmittel'], ['Koffein Tabletten', 'koffeinmittel'], ['Coffeinum purum', 'koffeinmittel'],
  // Schmerzmittel mit Koffein unter ihrer Marke oder mit dem ausgeschriebenen
  // Wirkstoff: nie „Koffein als Tablette – kein Schmerzmittel". Die beiden
  // Marken mit belegter Zusammensetzung (ASS, Paracetamol und Coffein bzw.
  // Paracetamol und Coffein) haben ihre Gruppe.
  ['Spalt plus Coffein N', 'kombi'], ['Spalt plus Koffein', 'kombi'],
  ['Vivimed mit Coffein', 'kombipara'], ['Vivimed mit Koffein', 'kombipara'],
  ['Acetylsalicylsäure + Coffein', 'kombi'], ['Ibuprofen + Coffein', 'kombi'],
  // Alles andere mit Koffein und einem unbekannten Rest: keine Gruppe – dann
  // steht es unter „nicht zugeordnet" und fällt nicht still aus der Zählung.
  ['Kopfweg mit Coffein', null], ['Kopfschmerztablette mit Koffein', null], ['Schmerzmittel + Koffein', null],
  ['Ergotamin Coffein', null], ['Propyphenazon Coffein', null],
  // Ohne Koffein bleibt eine Marke, was sie war: nicht zugeordnet.
  ['Spalt Schmerztabletten', null], ['Vivimed', null],
];
falsch = liste(KOFFEIN);
check(falsch.length === 0, `die Koffein-Regel${falsch.length ? ` – falsch: ${falsch.join(', ')}` : ''}`);
const mitWort = ['Kopfweg', 'Taurin', 'Ergotamin', 'plus Guarana', 'Kombi', 'Migräne']
  .flatMap((w) => [`Koffein ${w}`, `${w} Coffein`, `Coffeinum ${w} N`]);
falsch = mitWort.filter((n) => gruppe(n) === 'koffeinmittel');
check(falsch.length === 0, `kein Name mit einem weiteren Wort ist „Koffein als Tablette“${falsch.length ? ` – doch: ${falsch.join(', ')}` : ''}`);
check(KOFFEIN.filter(([n]) => /koffein|coffein/i.test(n) && gruppe(n) !== 'koffeinmittel')
  .every(([n]) => !/Kein Schmerzmittel/.test((wissenZu(n) || {}).kurz || '')),
  'ein Schmerzmittel mit Koffein liest nirgends „Kein Schmerzmittel"');
/*
 * Ibuprofen mit Koffein (etwa Thomapyrin Tension Duo) ist ein
 * Kombinationsmittel – aber keines mit ASS. Die Gruppe darf das nicht
 * behaupten.
 */
const kombi = wissenZu('Ibuprofen + Coffein');
check(/Ibuprofen/.test(kombi.gruppe) && /Ibuprofen/.test(kombi.wirkung) && !/jedes ASS gilt/.test(kombi.wirkung)
  && /Ibuprofen/.test(kombi.hinweis),
  `Kombinationsmittel mit Koffein nennen ASS und Ibuprofen („${kombi.gruppe}")`);
check(WEITERE_MITTEL.findIndex((g) => g.id === 'kombipara') === WEITERE_MITTEL.findIndex((g) => g.id === 'nichtnsar') + 1,
  'kombipara steht direkt nach den Schmerzmitteln ohne Entzündungshemmung');
check(SONSTIGE_MITTEL.length === 1 && SONSTIGE_MITTEL[0].id === 'koffeinmittel', 'SONSTIGE_MITTEL ist das Koffein');

/* ---------- 4. Säureblocker-Namen ---------- */

const SAEURE = [
  ['Pantozol', 'ppi'], ['Nexium', 'ppi'], ['Antra', 'ppi'], ['Agopton', 'ppi'], ['Maaloxan', 'antazida'],
  ['Kaiser Natron', null], ['Bullrich Salz', null],
  // Rifun (Pantoprazol), Omep und Esomep (Omeprazol, Esomeprazol).
  ['Rifun 40', 'ppi'], ['Omep 20', 'ppi'], ['Esomep 20', 'ppi'], ['Omeprazol', 'ppi'],
];
falsch = liste(SAEURE);
check(falsch.length === 0, `Handelsnamen der Säureblocker${falsch.length ? ` – falsch: ${falsch.join(', ')}` : ''}`);

/* ---------- 5. Paare (W1 bis W11) ---------- */

const heute = '2026-11-02';
const meine = (...namen) => namen.map((n, i) => (typeof n === 'string'
  ? { id: `s${i}`, mittel: n, dosis: '', tageszeit: null, bezug: null }
  : { id: `s${i}`, dosis: '', tageszeit: null, bezug: null, ...n }));
const ein = (mittel, vor, extra = {}) => ({
  id: `e-${mittel}-${vor}`, art: 'medikament', am: plusTage(heute, -vor), um: '08:00', mittel, dosis: '', ...extra,
});
const ergibt = (std, eintraege = []) => wechselHinweise(std, eintraege, heute).map((h) => h.id);
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Je Hinweis ein Paar, das ihn auslöst, und eines knapp daneben, das es nicht tut.
const FAELLE = [
  ['W1', meine({ mittel: 'Medikinet retard', form: 'pellet' }, 'Omeprazol'), meine({ mittel: 'Medikinet retard', form: 'pellet' }, 'Ibuprofen')],
  ['W1u', meine('Methylphenidat', 'Rennie'), meine('Methylphenidat', 'Paracetamol')],
  ['W3', meine({ mittel: 'Ritalin Adult' }, 'Famotidin'), meine({ mittel: 'Ritalin Adult' }, 'Iberogast')],
  ['W4', meine({ mittel: 'Ritalin', form: 'sofort' }, 'Gaviscon'), meine({ mittel: 'Ritalin', form: 'sofort' }, 'Kamillentee')],
  ['W5', meine('Attentin', 'Kaiser Natron'), meine('Attentin', 'Vitamin C')],
  ['W6', meine('Elvanse', 'Vitamin C'), meine('Elvanse', 'Vitamin D')],
  ['W7', meine('Elvanse', 'Sumatriptan'), meine('Elvanse', 'Paracetamol')],
  ['W8', meine('Elontril', 'Novalgin'), meine('Elontril', 'Ibuprofen')],
  ['W9', meine('Strattera', 'Paroxetin'), meine('Strattera', 'Elontril')],
  ['W10', meine({ mittel: 'Concerta' }, 'Sertralin'), meine({ mittel: 'Concerta' }, 'Metoprolol')],
  ['W11', meine({ mittel: 'Equasym Retard' }, 'Marcumar'), meine({ mittel: 'Equasym Retard' }, 'ASS 100')],
];
FAELLE.forEach(([id, an, aus]) => {
  const a = ergibt(an);
  const b = ergibt(aus);
  check(a.includes(id) && !b.includes(id), `${id}: ${an.map((m) => m.mittel).join(' + ')} ja, ${aus.map((m) => m.mittel).join(' + ')} nein (${a.join(',') || '–'} / ${b.join(',') || '–'})`);
});

check(gleich(ergibt(meine('Concerta', 'Pantoprazol')), []) && gleich(ergibt(meine('Equasym Retard', 'Pantoprazol')), []),
  'Concerta und Equasym mit Pantoprazol: kein Hinweis');
const mitForm = (form) => meine({ mittel: 'Medikinet', ...(form ? { form } : {}) }, 'Pantoprazol');
const w1u = wechselHinweise(mitForm(null), [], heute);
check(gleich(w1u.map((h) => [h.id, h.stufe]), [['W1u', 'A']]), `Medikinet + Pantoprazol ohne Form → W1u, Stufe A (${JSON.stringify(w1u.map((h) => h.id))})`);
check(gleich(ergibt(mitForm('sodas')), ['W3']), 'nach Wahl der Form Ritalin LA / Adult → W3 statt W1u');
check(gleich(ergibt(mitForm('pellet')), ['W1']) && gleich(ergibt(mitForm('oros')), []),
  'Kapsel mit zweierlei Kügelchen → W1; Hülle → nichts');
check(w1u[0].schluessel === 'W1u|medikinet|pantoprazol' && gleich(w1u[0].namen, ['Medikinet', 'Pantoprazol']),
  `Schlüssel mit kleingeschriebenen Namen (${w1u[0].schluessel})`);
check(w1u[0].frage === 'Passt mein Säureblocker zu meinem Methylphenidat?' && w1u[0].text.includes('Medikinet retard, Medikinet adult'),
  'W1u mit Frage und Kartentext');
check(wechselHinweise(meine('Medikinet adult', 'Pantozol'), [], heute)[0].text.includes('auch Pantozol nicht'),
  'die Karte W1 nennt den Säureblocker beim Namen – und rät nicht, ihn wegzulassen');
// Die Karten geben die Quelle so streng wieder, wie sie ist (siehe Formen oben).
const w1Text = wechselHinweise(meine('Medikinet adult', 'Pantozol'), [], heute)[0].text;
check(/unter den Gegenanzeigen/.test(w1Text) && /unter den Gegenanzeigen/.test(w1u[0].text)
  && !/nicht zusammen vor/.test(`${w1Text} ${w1u[0].text}`),
  'W1 und W1u: die Einnahme zusammen mit einem Säureblocker steht unter den Gegenanzeigen – nicht bloß „nicht vorgesehen"');

// Eingetragen ist „Meine Mittel" oder eine Einnahme in den letzten 30 Tagen.
check(gleich(ergibt([], [ein('Medikinet adult', WECHSEL_TAGE - 1), ein('Nexium', 3)]), ['W1']),
  `eine Einnahme vor ${WECHSEL_TAGE - 1} Tagen zählt`);
check(gleich(ergibt([], [ein('Medikinet adult', WECHSEL_TAGE), ein('Nexium', 3)]), []),
  `eine vor ${WECHSEL_TAGE} Tagen nicht mehr`);

// Die Form: zuletzt eingetragen, dann „Meine Mittel", dann der Name, sonst unbekannt.
const std = meine({ mittel: 'Medikinet', form: 'sofort' });
check(formZu('Medikinet', std, []) === 'sofort', 'Form aus „Meine Mittel"');
check(formZu('Medikinet', std, [ein('Medikinet', 5, { form: 'oros' }), ein('medikinet', 2, { form: 'pellet' })]) === 'pellet',
  'die zuletzt eingetragene Form geht vor – auch anders geschrieben');
check(formZu('Medikinet retard', [], []) === 'pellet' && formZu('Medikinet', [], []) === 'unbekannt',
  'sonst die Form aus dem Namen, sonst „unbekannt"');
/*
 * „Weiß ich nicht" bei einer Einnahme ist keine Auskunft über die Form. Es
 * darf weder die Wahl unter „Meine Mittel" überdecken – die Karte W1u
 * schickt genau dorthin – noch einen Namen, der die Form eindeutig nennt.
 */
const weissNicht = ein('Medikinet', 1, { form: 'unbekannt' });
const stdSodas = meine({ mittel: 'Medikinet', form: 'sodas' }, 'Pantoprazol');
check(formZu('Medikinet', stdSodas, [weissNicht]) === 'sodas',
  `„Weiß ich nicht" im Eintrag überdeckt die Form unter „Meine Mittel" nicht (${formZu('Medikinet', stdSodas, [weissNicht])})`);
check(gleich(wechselHinweise(stdSodas, [weissNicht], heute).map((h) => `${h.id}/${h.stufe}`), ['W3/B']),
  'Medikinet mit Form unter „Meine Mittel", Pantoprazol und ein Eintrag „Weiß ich nicht" → W3, nicht W1u');
check(formZu('Medikinet adult', [], [ein('Medikinet adult', 1, { form: 'unbekannt' })]) === 'pellet'
  && gleich(ergibt(meine('Pantoprazol'), [ein('Medikinet adult', 1, { form: 'unbekannt' })]), ['W1']),
  'ein eindeutiger Name bleibt eindeutig, auch wenn ein Eintrag „Weiß ich nicht" trägt → W1');
check(formZu('Medikinet', [], [ein('Medikinet', 3, { form: 'pellet' }), ein('Medikinet', 1, { form: 'unbekannt' })]) === 'pellet'
  && formZu('Medikinet', [], [weissNicht]) === 'unbekannt',
  'eine früher eingetragene Form bleibt stehen; ohne jede Angabe „unbekannt"');

/*
 * Eine Form aus einer alten Einnahme sagt nichts über die Packung von heute.
 * Für die Paare zählt wie beim Namen nur, was in den letzten WECHSEL_TAGE
 * Tagen eingenommen wurde; davor gilt „Meine Mittel". Sonst sticht ein
 * halbes Jahr alter Eintrag die Wahl, zu der die Karte W1u selbst rät – und
 * der wichtigste Hinweis (Stufe A) fehlt ganz.
 */
const stufen = (std, eintraege) => wechselHinweise(std, eintraege, heute).map((h) => `${h.id}/${h.stufe}`);
const mphPellet = meine({ mittel: 'Methylphenidat', form: 'pellet' }, 'Pantoprazol');
const altUndUnbekannt = [ein('Methylphenidat', 186, { form: 'oros' }), ein('Methylphenidat', 1, { form: 'unbekannt' })];
check(gleich(stufen(mphPellet, altUndUnbekannt), ['W1/A'])
  && formZu('Methylphenidat', mphPellet, altUndUnbekannt, heute) === 'pellet',
`die Kügelchen unter „Meine Mittel" gehen vor einer Hülle von vor 186 Tagen → W1 (${stufen(mphPellet, altUndUnbekannt).join(',') || '–'})`);
check(gleich(stufen(mphPellet, [ein('Methylphenidat', 202, { form: 'sofort' })]), ['W1/A']),
  `ebenso vor einer nicht retardierten Tablette von vor 202 Tagen → W1 (${stufen(mphPellet, [ein('Methylphenidat', 202, { form: 'sofort' })]).join(',') || '–'})`);
check(gleich(stufen(meine('Methylphenidat', 'Pantoprazol'), altUndUnbekannt), ['W1u/A']),
  `ohne Form unter „Meine Mittel" und mit „Weiß ich nicht" zuletzt: W1u, auch wenn vor einem halben Jahr eine Hülle stand (${stufen(meine('Methylphenidat', 'Pantoprazol'), altUndUnbekannt).join(',') || '–'})`);
check(formZu('Methylphenidat', mphPellet, [ein('Methylphenidat', 3, { form: 'oros' })], heute) === 'oros'
  && gleich(stufen(mphPellet, [ein('Methylphenidat', 3, { form: 'oros' })]), []),
'eine Form aus den letzten 30 Tagen geht weiter vor „Meine Mittel" – die neue Packung wird oft zuerst beim Eintrag angegeben');
/*
 * Sagt die jüngste Einnahme nichts zur Form, gilt die Kapsel mit zweierlei
 * Kügelchen unter „Meine Mittel" auch vor einer anderen Form aus den 30
 * Tagen: Im Zweifel die Form, zu der die Fachinformation die Gegenanzeige nennt.
 */
const huelleDannUnbekannt = [ein('Methylphenidat', 10, { form: 'oros' }), ein('Methylphenidat', 1, { form: 'unbekannt' })];
check(gleich(stufen(mphPellet, huelleDannUnbekannt), ['W1/A'])
  && gleich(stufen(meine({ mittel: 'Methylphenidat', form: 'sodas' }, 'Pantoprazol'), huelleDannUnbekannt), []),
`jüngste Einnahme „Weiß ich nicht", davor eine Hülle: die Kügelchen unter „Meine Mittel" gehen vor → W1; eine andere Form dort nicht (${stufen(mphPellet, huelleDannUnbekannt).join(',') || '–'})`);
// Ein Mittel, das gerade nicht eingetragen ist, behält die Form seines letzten Eintrags (Karte „Was du eingetragen hast").
check(formZu('Concerta 18', [], [ein('Concerta 18', 200, { form: 'oros' })], heute) === 'oros'
  && formZu('Methylphenidat', [], [ein('Methylphenidat', 200, { form: 'sofort' })], heute) === 'sofort',
'ein länger nicht genommenes Mittel behält die zuletzt eingetragene Form');

// Packungsschreibweisen und weitere Säureblocker-Namen ergeben dieselben Paare.
check(gleich(ergibt(meine('Medikinet-retard', 'Nexium')), ['W1']) && gleich(ergibt(meine('Medikinet® adult', 'Omep 20')), ['W1'])
  && gleich(ergibt(meine('Medikinet adult', 'Rifun 40')), ['W1']),
  'Medikinet-retard mit Nexium, Medikinet® adult mit Omep, Medikinet adult mit Rifun → W1');
check(gleich(wechselHinweise(meine('Ritalin-Adult', 'Nexium'), [], heute).map((h) => `${h.id}/${h.stufe}`), ['W3/B']),
  'Ritalin-Adult mit Nexium → W3 (Stufe B), nicht W1u');
check(gleich(ergibt(meine('Lisdexamphetamin', 'Vitamin C')), ['W6']) && gleich(ergibt(meine('Dexamphetamin', 'Kaiser Natron')), ['W5']),
  'die Schreibweise mit „ph" bekommt dieselben Paare');

// Stufe A zuerst, jedes Paar einmal.
const viele = wechselHinweise(meine('Strattera', 'Fluoxetin', 'Methylphenidat', 'Rennie', 'Rennie'), [], heute);
check(viele[0].id === 'W1u' && new Set(viele.map((h) => h.schluessel)).size === viele.length,
  `Stufe A zuerst, jedes Paar einmal (${viele.map((h) => h.id).join(', ')})`);
check(wechselHinweise(meine('Strattera', 'Bupropion'), [], heute).length === 0,
  'Bupropion steht nicht in der Liste für Atomoxetin – nicht belegt');

/* ---------- 6. Der Ton ---------- */

const DOSIS = /\d+\s?(mg|ml|µg|Gramm|Tabletten)\b/;
const RAT = /\b(nimm|nehmen Sie|empfehlen|empfohlen|du solltest|hilft gegen)\b/i;
const alleW = FAELLE.flatMap(([, an]) => wechselHinweise(an, [], heute));
const texte = [
  ...MPH_FORMEN.flatMap((f) => [f.name, f.kurzname, f.einnahme, f.saeure, f.extra]),
  ...[...ADHS_MITTEL, ...SONSTIGE_MITTEL, ...WEITERE_MITTEL.filter((g) => g.id === 'kombipara')]
    .flatMap((g) => [g.kurz, g.wirkung, g.einnahme, g.nebenwirkung, g.hinweis]),
  ...alleW.flatMap((h) => [h.text, h.frage]),
  MASSAGE_HINWEIS.satz, MASSAGE_HINWEIS.details,
].filter(Boolean);
const mitDosis = texte.filter((t) => DOSIS.test(t));
const mitRat = texte.filter((t) => RAT.test(t));
check(texte.length > 60 && mitDosis.length === 0, `keine Dosis in ${texte.length} Texten${mitDosis.length ? `: ${mitDosis[0].slice(0, 80)}` : ''}`);
check(mitRat.length === 0, `keine Empfehlung${mitRat.length ? `: ${mitRat[0].slice(0, 80)}` : ''}`);
check(alleW.every((h) => /Praxis|Apotheke|Ärztin/.test(h.text)),
  'jeder Paar-Hinweis verweist auf Praxis, Ärztin oder Apotheke');
check(/Praxis oder Physiotherapie/.test(MASSAGE_HINWEIS.satz) && /112/.test(MASSAGE_HINWEIS.details),
  'der Massagehinweis verweist auf Praxis oder Physiotherapie und nennt den Notruf');
check(!texte.some((t) => /\b(absetzen|weglassen)\b/i.test(t) && !/(nicht|nichts|nur nach)/i.test(t)),
  'absetzen oder weglassen nur verneint');

// Was eine Quelle sagt, steht so da – nicht ungefährer und nicht anders.
check(/^Laut EMA bei fast jeder zweiten Person Schläfrigkeit/.test(ADHS_MITTEL.find((g) => g.id === 'guanf').nebenwirkung),
  'Guanfacin: Schläfrigkeit bei „fast" jeder zweiten Person, wie die EMA schreibt – nicht „etwa"');
const w6 = wechselHinweise(meine('Elvanse', 'Vitamin C'), [], heute)[0].text;
check(!/Spiegel von Lisdexamfetamin/.test(w6) && /Spiegel des Wirkstoffs, der im Körper aus Lisdexamfetamin entsteht/.test(w6),
  'W6: Der Urin verändert den Spiegel des Wirkstoffs, der aus Lisdexamfetamin entsteht – nicht den der Vorstufe');

/* ---------- 7. Der Wächter für die Sicherheitstexte ---------- */

/*
 * Wie in tests/test-vorschlaege.mjs: ein kleines Repository mit den echten
 * Dateien, ein Zweig „vorschlag/…" je Änderung, und unantastbar.py dagegen.
 */
const ort = mkdtempSync(path.join(tmpdir(), 'unantastbar-t2-'));
const git = (...a) => execFileSync('git', a, { cwd: ort, encoding: 'utf8' });
const wacht = (zweig) => {
  try {
    execFileSync('python3', [path.join(ROOT, 'tools/pruefung/unantastbar.py'), 'basis'],
      { cwd: ort, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GITHUB_HEAD_REF: zweig } });
    return 0;
  } catch (e) { return e.status; }
};
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'test@test');
git('config', 'user.name', 'Test');
mkdirSync(path.join(ort, 'js'), { recursive: true });
['bild.js', 'mittel.js', 'zusammen.js', 'aktivitaet.js', 'app.js']
  .forEach((d) => cpSync(path.join(ROOT, 'js', d), path.join(ort, 'js', d)));
git('add', '-A');
git('commit', '-qm', 'Anfang');
git('branch', '-f', 'basis', 'HEAD');
const probe = (name, datei, tu) => {
  git('checkout', '-q', 'basis');
  git('checkout', '-qb', `vorschlag/t2-${name}`);
  const p = path.join(ort, 'js', datei);
  writeFileSync(p, tu(readFileSync(p, 'utf8')));
  git('add', '-A');
  git('commit', '-qm', name, '--allow-empty');
  return wacht(`vorschlag/t2-${name}`);
};
check(probe('anzeige', 'app.js', (t) => `${t}\n// größerer Knopf\n`) === 0,
  'Wächter: ein Entwurf, der keinen Sicherheitstext anfasst, geht durch');
check(probe('kurz', 'mittel.js', (t) => t.replace("kurz: 'Stimulans bei ADHS, wird erst", "kurz: 'Ein Stimulans bei ADHS, wird erst")) === 0,
  'Wächter: ein umformulierter Kurztext ist erlaubt');
check(probe('pellet', 'mittel.js', (t) => t.replace('Zusammen \'\n      + \'mit diesen Mitteln', 'Gemeinsam \'\n      + \'mit diesen Mitteln')) === 1,
  'Wächter: eine Änderung am Säuretext der Kapsel mit zweierlei Kügelchen wird abgewiesen');
check(probe('klaer', 'mittel.js', (t) => t.replace('das klären Apotheke oder Praxis.', 'das ist meist kein Problem.')) === 1,
  'Wächter: ebenso der Klär-Satz');
check(probe('saeure-weg', 'mittel.js', (t) => t.replace("    saeure: KLAER_SATZ,\n  },\n  {\n    id: 'oros',", "  },\n  {\n    id: 'oros',")) === 1,
  'Wächter: ebenso ein gestrichener Säure-Satz');
check(probe('hinweis', 'mittel.js', (t) => t.replace('Nach dem Absetzen können laut Fachinformation', 'Nach dem Absetzen können')) === 1,
  'Wächter: ebenso ein ADHS-Hinweis');
check(probe('karte', 'zusammen.js', (t) => t.replace('Bitte nichts davon eigenmächtig', 'Bitte etwas davon')) === 1,
  'Wächter: ebenso ein Text in js/zusammen.js');
check(probe('massage', 'aktivitaet.js', (t) => t.replace('Dann 112, nicht auf einen Termin warten.', 'Das ist meist harmlos.')) === 1,
  'Wächter: ebenso der Massagehinweis');
check(probe('umbenannt', 'mittel.js', (t) => t.replace('export const MPH_FORMEN = [', 'export const FORMEN = [')) === 1,
  'Wächter: und eine umbenannte Liste – sie wäre nicht mehr auffindbar');
rmSync(ort, { recursive: true, force: true });

/* ---------- 8. Die Rückfrage zu Methylphenidat ---------- */

/*
 * Was zu einem eingetragenen Methylphenidat fehlt, damit die Paare oben
 * vollständig sind: die Form oder ein Mittel gegen Magensäure. Danach fragt
 * die Karte auf „Tag" (tests/test-rueckfrage.mjs) – und nur danach. Eine
 * Frage, deren Antwort an keinem Hinweis etwas ändert, wäre Drängeln.
 */
check(typeof zusammen.mphRueckfragen === 'function', 'js/zusammen.js hat mphRueckfragen()');
const rf = typeof zusammen.mphRueckfragen === 'function' ? zusammen.mphRueckfragen : () => [];
const istSaeure = typeof zusammen.istSaeureMittel === 'function' ? zusammen.istSaeureMittel : () => null;
const schl = typeof zusammen.rueckfrageSchluessel === 'function' ? zusammen.rueckfrageSchluessel : () => null;
const WAHL = Array.isArray(zusammen.SAEURE_WAHL) ? zusammen.SAEURE_WAHL : [];
const kurzRf = (liste) => liste.map((x) => [x.name, x.form, x.fehltForm, x.fehltSaeure, x.saeureDa]);
const nurEins = (std, eintraege = []) => {
  const l = rf(std, eintraege, heute);
  return l.length === 1 ? l[0] : {};
};

// 1. Medikinet ohne Form und ohne Säureblocker: beides fehlt.
const r1 = rf(meine('Medikinet'), [], heute);
check(r1.length === 1 && r1[0].name === 'Medikinet' && r1[0].schluessel === 'medikinet'
  && r1[0].form === 'unbekannt' && r1[0].fehltForm === true && r1[0].fehltSaeure === true && r1[0].saeureDa === false,
`Medikinet allein: Form und Säureblocker fehlen (${JSON.stringify(kurzRf(r1))})`);
// 2. Die Form steht im Namen.
const r2 = nurEins(meine('Medikinet adult'));
check(r2.fehltForm === false && r2.fehltSaeure === true && r2.form === 'pellet',
  `Medikinet adult: die Form steht im Namen, es fehlt nur der Säureblocker (${r2.form}, ${r2.fehltForm}, ${r2.fehltSaeure})`);
// 3. Hülle und Equasym: kein Hinweis, also keine Frage.
const r3a = nurEins(meine('Concerta'));
const r3b = nurEins(meine('Equasym Retard'));
check(r3a.fehltForm === false && r3a.fehltSaeure === false && r3b.fehltForm === false && r3b.fehltSaeure === false,
  'Concerta und Equasym Retard: keine Frage – mit einem Säureblocker gäbe es dort keinen Hinweis');
// 4. Säureblocker da, Form fehlt – auch Natron zählt.
const r4a = nurEins(meine('Medikinet', 'Pantoprazol'));
const r4b = nurEins(meine('Medikinet', 'Kaiser Natron'));
check(r4a.fehltForm === true && r4a.fehltSaeure === false && r4a.saeureDa === true
  && r4b.fehltForm === true && r4b.fehltSaeure === false && r4b.saeureDa === true,
'Medikinet mit Pantoprazol oder Kaiser Natron: nur die Form fehlt');
check(rf(meine('Medikinet', 'Pantoprazol'), [], heute).length === 1,
  'gelistet wird nur das Methylphenidat, nicht der Säureblocker');
// 5. Eingetragen wie bei den Paaren: eine Einnahme vor 40 Tagen zählt nicht, vor 29 schon.
check(nurEins(meine('Medikinet adult'), [ein('Pantoprazol', 40)]).fehltSaeure === true
  && nurEins(meine('Medikinet adult'), [ein('Pantoprazol', 29)]).fehltSaeure === false,
'ein Säureblocker vor 40 Tagen ist nicht eingetragen, einer vor 29 Tagen schon');
// 6. Auf der Haut ist kein Mittel gegen Magensäure.
check(nurEins(meine('Medikinet adult', 'Pantoprazol Creme')).fehltSaeure === true,
  'Pantoprazol Creme zählt nicht als Säureblocker');
// 7. Nur eine Einnahme: dasselbe Fenster.
check(rf([], [ein('Methylphenidat', WECHSEL_TAGE - 1)], heute).length === 1
  && rf([], [ein('Methylphenidat', WECHSEL_TAGE)], heute).length === 0,
`eine Einnahme vor ${WECHSEL_TAGE - 1} Tagen ist eingetragen, eine vor ${WECHSEL_TAGE} nicht`);
// 8. Reihenfolge wie bei den Paaren: „Meine Mittel" zuerst.
check(gleich(rf(meine('Medikinet'), [ein('Methylphenidat', 2)], heute).map((x) => x.name), ['Medikinet', 'Methylphenidat']),
  'zwei Namen: „Meine Mittel" vor der Einnahme');
// 9. „Weiß ich nicht" ist eine Antwort – an der richtigen Stelle.
check(nurEins(meine({ mittel: 'Medikinet', form: 'unbekannt' })).fehltForm === false,
  '„Weiß ich nicht" unter „Meine Mittel": die Form wird nicht mehr gefragt');
check(nurEins([], [ein('Medikinet', 3), ein('Medikinet', 1, { form: 'unbekannt' })]).fehltForm === false,
  '„Weiß ich nicht" bei der jüngsten Einnahme: ebenso');
const r9 = nurEins([], [ein('Medikinet', 3, { form: 'unbekannt' }), ein('Medikinet', 1)]);
check(r9.fehltForm === true && r9.fehltSaeure === true,
  'nur bei einer älteren Einnahme „Weiß ich nicht", die jüngste ohne Form: wieder gefragt');
// 10. Gleichlauf mit den Paaren: gefragt wird nach dem Säureblocker genau dann,
// wenn ein Säureblocker einen Hinweis ergäbe.
const gleichlauf = MPH_FORMEN.filter((f) => {
  const fehlt = nurEins(meine({ mittel: 'Medikinet', form: f.id })).fehltSaeure === true;
  const hinweis = wechselHinweise(meine({ mittel: 'Medikinet', form: f.id }, 'Pantoprazol'), [], heute)
    .some((h) => h.namen.includes('Medikinet'));
  return fehlt !== hinweis;
});
check(rf(meine('Medikinet'), [], heute).length === 1 && gleichlauf.length === 0,
  `je Form: Säurefrage genau dann, wenn es mit einem Säureblocker einen Hinweis gäbe${gleichlauf.length ? ` – nicht bei ${gleichlauf.map((f) => f.id).join(', ')}` : ''}`);
// 11. istSaeureMittel ist dieselbe Erkennung wie bei den Paaren.
const SAEURE_PROBE = ['Pantoprazol', 'Rennie', 'Gaviscon', 'Famotidin', 'Kaiser Natron', 'Iberogast', 'Ibuprofen', 'Pantoprazol Creme'];
const abweichend = SAEURE_PROBE.filter((n) => istSaeure(n)
  !== ergibt(meine('Medikinet adult', n)).includes('W1'));
check(abweichend.length === 0 && istSaeure('Pantoprazol') === true && istSaeure('Ibuprofen') === false,
  `istSaeureMittel() wie die Paare${abweichend.length ? ` – anders: ${abweichend.join(', ')}` : ''}`);
// 12. Die Wahl unter „Ja": nur Namen, die die Erkennung schon kennt.
const BEISPIELE = new Set(MITTEL_WISSEN.filter((g) => ['ppi', 'h2', 'antazida', 'alginat'].includes(g.id))
  .flatMap((g) => g.beispiele));
const fremdeWahl = WAHL.filter((n) => !istSaeure(n) || !(BEISPIELE.has(n) || n === 'Natron'));
check(WAHL.length >= 8 && fremdeWahl.length === 0 && new Set(WAHL.map((n) => n.toLowerCase())).size === WAHL.length,
  `SAEURE_WAHL: ${WAHL.length} Namen, jeder erkannt und aus den Beispielen der App, keiner doppelt${fremdeWahl.length ? ` – nicht: ${fremdeWahl.join(', ')}` : ''}`);
check(['Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Famotidin'].every((n) => WAHL.includes(n))
  && WAHL.some((n) => (wissenZu(n) || {}).id === 'antazida'),
'darunter Pantoprazol, Omeprazol, Esomeprazol, Famotidin und ein Antazidum');
// 13. Der Schlüssel: klein, gekürzt, getrimmt – auch nach dem Kürzen.
const mitLeer80 = `Methylphenidat ${'x'.repeat(64)} Rest`;
const k80 = schl(mitLeer80);
check(schl('  Medikinet  ') === 'medikinet' && typeof k80 === 'string' && k80.length === 79 && k80 === k80.trim(),
  `rueckfrageSchluessel: klein und getrimmt, auch wenn das 80. Zeichen ein Leerzeichen ist (${k80 && k80.length})`);
const langA = `Methylphenidat ${'a'.repeat(65)}Erste`;
const langB = `Methylphenidat ${'a'.repeat(65)}Zweite`;
const r13 = rf([], [ein(langA, 3), ein(langB, 2)], heute);
check(schl(langA) === schl(langB) && String(schl(langA) || '').length === 80 && r13.length === 1 && r13[0].name === langA,
  `zwei Namen, gleich bis Zeichen 80: ein Schlüssel, ein Eintrag mit dem ersten Namen (${r13.length})`);
// 14. Rein: Eingaben bleiben, wie sie sind.
const tiefFrieren = (o) => {
  Object.values(o).forEach((v) => { if (v && typeof v === 'object') tiefFrieren(v); });
  return Object.freeze(o);
};
const stdRein = meine('Medikinet', { mittel: 'Ritalin', form: 'unbekannt' });
const einRein = [ein('Methylphenidat', 4, { form: 'pellet' }), ein('Medikinet', 2), ein('Nexium', 1)];
const vorherRein = JSON.stringify([stdRein, einRein]);
let wirft = false;
try { rf(tiefFrieren(stdRein), tiefFrieren(einRein), heute); } catch { wirft = true; }
check(!wirft && JSON.stringify([stdRein, einRein]) === vorherRein && rf(stdRein, einRein, heute).length === 3,
  'mphRueckfragen verändert seine Eingaben nicht (tief eingefroren, kein Fehler)');

ende();
