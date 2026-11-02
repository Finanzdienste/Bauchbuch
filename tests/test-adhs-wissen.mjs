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
  ADHS_MITTEL, ADHS_NAMEN, KLAER_SATZ, MPH_FORMEN, SONSTIGE_MITTEL, WEITERE_MITTEL,
  adhsGruppe, formAusName, istAdhsMittel, mphForm, wissenZu,
} from '../js/mittel.js';
import { WECHSEL_TAGE, formZu, wechselHinweise } from '../js/zusammen.js';
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

/* ---------- 2. Formen ---------- */

const FORMEN = [
  ['Medikinet adult', 'pellet'], ['Medikinet retard 20 mg', 'pellet'], ['Medikinet', null],
  ['Ritalin LA', 'sodas'], ['Ritalin Adult', 'sodas'], ['Ritalin', null], ['Concerta', 'oros'],
  ['Kinecteen', 'retardtab'], ['Equasym Retard', 'equasym'], ['Methylphenidat', null], ['MPH retard', null],
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
];
falsch = liste(KOFFEIN);
check(falsch.length === 0, `die Koffein-Regel${falsch.length ? ` – falsch: ${falsch.join(', ')}` : ''}`);
check(WEITERE_MITTEL.findIndex((g) => g.id === 'kombipara') === WEITERE_MITTEL.findIndex((g) => g.id === 'nichtnsar') + 1,
  'kombipara steht direkt nach den Schmerzmitteln ohne Entzündungshemmung');
check(SONSTIGE_MITTEL.length === 1 && SONSTIGE_MITTEL[0].id === 'koffeinmittel', 'SONSTIGE_MITTEL ist das Koffein');

/* ---------- 4. Säureblocker-Namen ---------- */

const SAEURE = [
  ['Pantozol', 'ppi'], ['Nexium', 'ppi'], ['Antra', 'ppi'], ['Agopton', 'ppi'], ['Maaloxan', 'antazida'],
  ['Kaiser Natron', null], ['Bullrich Salz', null],
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
check(probe('pellet', 'mittel.js', (t) => t.replace('In \'\n      + \'einem weniger sauren Magen', 'Bei \'\n      + \'einem weniger sauren Magen')) === 1,
  'Wächter: eine Änderung am Säuretext der Kapsel mit zweierlei Kügelchen wird abgewiesen');
check(probe('klaer', 'mittel.js', (t) => t.replace('das klären Apotheke oder Praxis.', 'das ist meist kein Problem.')) === 1,
  'Wächter: ebenso der Klär-Satz');
check(probe('saeure-weg', 'mittel.js', (t) => t.replace("    saeure: KLAER_SATZ,\n  },\n  {\n    id: 'oros',", "  },\n  {\n    id: 'oros',")) === 1,
  'Wächter: ebenso ein gestrichener Säure-Satz');
check(probe('hinweis', 'mittel.js', (t) => t.replace('Plötzliches Absetzen kann laut Fachinformation', 'Absetzen kann laut Fachinformation')) === 1,
  'Wächter: ebenso ein ADHS-Hinweis');
check(probe('karte', 'zusammen.js', (t) => t.replace('Bitte nichts davon eigenmächtig', 'Bitte etwas davon')) === 1,
  'Wächter: ebenso ein Text in js/zusammen.js');
check(probe('massage', 'aktivitaet.js', (t) => t.replace('sind ein Notfall: 112.', 'sind meist harmlos.')) === 1,
  'Wächter: ebenso der Massagehinweis');
check(probe('umbenannt', 'mittel.js', (t) => t.replace('export const MPH_FORMEN = [', 'export const FORMEN = [')) === 1,
  'Wächter: und eine umbenannte Liste – sie wäre nicht mehr auffindbar');
rmSync(ort, { recursive: true, force: true });

ende();
