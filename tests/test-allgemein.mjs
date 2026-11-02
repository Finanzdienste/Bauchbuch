/*
 * Das öffentliche Repository bleibt allgemein – und zwar dort, wo es zählt.
 *
 * Drei Wächter halten Sätze über einen bestimmten Menschen aus dem
 * Repository: tools/pruefung/allgemein.py in CI und lokal die beiden Haken in
 * tools/haken/, die zusätzlich eine Sperrliste lesen, die nur auf dem eigenen
 * Rechner liegt. Jeder hatte eine Lücke, durch die genau das rutschte, wofür
 * er da ist:
 *
 *   1. CI las die Commit-Texte über origin/main..HEAD. Hier geht jede Fassung
 *      direkt auf main; nach dem Checkout zeigt origin/main dann auf den
 *      gepushten Stand, der Bereich ist leer – und die Meldung lautete
 *      trotzdem „und die Commit-Texte ohne Personenbezug“. Dazu machte ein
 *      `git fetch --depth=1` im Schritt davor den vollen Klon flach.
 *   2. commit-msg übersprang Zeilen mit #, weil git sie „ohnehin entfernt“.
 *      Bei -m und -F bleiben sie stehen.
 *   3. pre-commit las Dateinamen nur aus der „+++“-Zeile des Diffs. Die fehlt
 *      bei Binärdateien, leeren Dateien und reinen Umbenennungen, und Namen
 *      mit Umlauten stehen dort in Oktal.
 *   4. allgemein.py durchsuchte css/, index.html und sw.js nicht, obwohl sie
 *      in dist/bauchbuch.html stecken und weitergegeben werden.
 *
 * Alles läuft in Wegwerf-Repositorys im Temp-Ordner, mit einer eigenen
 * Probeliste über BODYCHECK_VERBOTEN und ohne die globale git-Konfiguration.
 * Die echte Liste liest dieser Test nie. Und kein Satz, nach dem gesucht wird,
 * steht hier am Stück: Sie werden erst zur Laufzeit zusammengesetzt, sonst
 * träfe allgemein.py diese Datei selbst.
 */
import {
  chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();

const angelegt = [];
process.on('exit', () => {
  for (const o of angelegt) rmSync(o, { recursive: true, force: true });
});
function tempOrdner(name) {
  const o = mkdtempSync(path.join(tmpdir(), `bauchbuch-allgemein-${name}-`));
  angelegt.push(o);
  return o;
}

/* ---------- Probeliste und Probesätze ---------- */

// Fantasiewörter: Sie stehen in keiner echten Liste, und ein Treffer kann nur
// von hier kommen. Das zweite hat einen Umlaut – git schreibt solche Namen in
// seinen Diffs als Oktalfolge.
const PROBE = 'Quaxelbrod';
const PROBE_UMLAUT = 'Quäxelbrod';
// Woran sich ein durchgesickertes Probewort in einer Meldung erkennen ließe –
// auch als Oktalfolge („Qu\303\244xelbrod“), denn das Ende bleibt lesbar.
const VERRAETERISCH = /xelbrod/i;

const LISTE = path.join(tempOrdner('liste'), 'verboten.txt');
writeFileSync(LISTE, `# Probeliste dieses Tests\n${PROBE}\n${PROBE_UMLAUT}\n`);
const KEINE_LISTE = path.join(path.dirname(LISTE), 'gibt-es-nicht.txt');

// Die beiden Regeln von allgemein.py, je ein Satz, der treffen muss.
const REGEL_EINS = ['Probe:', 'jemand', 'hat', 'ADHS'].join(' ');
const REGEL_ZWEI = ['Er', 'trägt', 'die', 'Schiene', 'seit', 'Mai.'].join(' ');
// Und einer, der nicht treffen darf – so sollen Commit-Texte klingen.
const ALLGEMEIN = 'Einschaltbare Teile für alle, die ein ADHS-Mittel nehmen';

/* ---------- git ohne fremde Einstellungen ---------- */

/*
 * GIT_CONFIG_GLOBAL=/dev/null: Eine globale Einstellung wie commit.gpgsign
 * oder core.hooksPath darf hier nichts entscheiden. Die Haken lesen die Liste
 * aus BODYCHECK_VERBOTEN – nie die vom eigenen Rechner.
 */
function umgebung(liste = LISTE, extra = {}) {
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Probe',
    GIT_AUTHOR_EMAIL: 'probe@example.invalid',
    GIT_COMMITTER_NAME: 'Probe',
    GIT_COMMITTER_EMAIL: 'probe@example.invalid',
    BODYCHECK_VERBOTEN: liste,
    PYTHONDONTWRITEBYTECODE: '1',
    ...extra,
  };
}

function git(repo, args, liste = LISTE) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: umgebung(liste) });
  return { code: r.status, text: `${r.stdout || ''}${r.stderr || ''}` };
}
const kopf = (repo) => git(repo, ['rev-parse', 'HEAD']).text.trim();

function datei(repo, rel, inhalt) {
  mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
  writeFileSync(path.join(repo, rel), inhalt);
}

/** Eine Arbeitskopie wie die echte: Haken installiert, allgemein.py im Repository. */
function hakenRepo(name) {
  const repo = tempOrdner(name);
  git(repo, ['init', '-q', '-b', 'main']);
  for (const h of ['pre-commit', 'commit-msg']) {
    const ziel = path.join(repo, '.git', 'hooks', h);
    cpSync(path.join(ROOT, 'tools', 'haken', h), ziel);
    chmodSync(ziel, 0o755);
  }
  datei(repo, 'tools/pruefung/allgemein.py', readFileSync(path.join(ROOT, 'tools/pruefung/allgemein.py')));
  datei(repo, 'a.txt', 'Anfang\n');
  git(repo, ['add', '-A']);
  const r = git(repo, ['commit', '-q', '-m', 'Anfang']);
  check(r.code === 0, `${name}: das Wegwerf-Repository nimmt einen harmlosen ersten Commit an (${r.code})`);
  return repo;
}

/* ---------- 1. CI liest alle Commit-Texte, auch nach einem Push auf main ---------- */

/*
 * Nicht nachgebaut, sondern die echten Schritte aus pruefung.yml: der Schritt
 * mit allgemein.py, und davor jeder Schritt desselben Ablaufs, der git
 * aufruft – ein solcher kann ändern, was der Schritt danach von der
 * Vorgeschichte sieht. Genau so war es mit dem flachen Fetch.
 */
const ABLAUF = readFileSync(path.join(ROOT, '.github/workflows/pruefung.yml'), 'utf8');
const SCHRITTE = ABLAUF.split(/\n(?=\s*- (?:name|id|uses): )/).slice(1);

/** Der Shell-Text eines Schritts: `run: |` mit Block oder `run: …` in einer Zeile. */
function skriptAus(schritt) {
  const zeilen = schritt.split('\n');
  const i = zeilen.findIndex((z) => /^\s*run:/.test(z));
  if (i < 0) return '';
  const rest = zeilen[i].replace(/^\s*run:\s*/, '').trim();
  if (!/^[|>][-+]?$/.test(rest)) return rest;
  const einzug = zeilen[i].search(/\S/);
  const block = [];
  for (const z of zeilen.slice(i + 1)) {
    if (z.trim() && z.search(/\S/) <= einzug) break;
    block.push(z);
  }
  const rand = Math.min(...block.filter((z) => z.trim()).map((z) => z.search(/\S/)));
  return block.map((z) => z.slice(rand)).join('\n');
}

const stelle = SCHRITTE.findIndex((s) => /tools\/pruefung\/allgemein\.py/.test(skriptAus(s)));
check(stelle >= 0, 'pruefung.yml hat einen Schritt mit tools/pruefung/allgemein.py');
const ALLGEMEIN_SKRIPT = stelle >= 0 ? skriptAus(SCHRITTE[stelle]) : 'false';
const DAVOR = SCHRITTE.slice(0, Math.max(stelle, 0)).map(skriptAus).filter((s) => /\bgit\b/.test(s));
check(/--commits\b/.test(ALLGEMEIN_SKRIPT), 'und der liest auch die Commit-Texte (--commits)');

// So startet GitHub einen run-Block: bash, ohne Profil, mit -e und pipefail.
// Ein Push auf main: kein Kopfzweig eines Pull Requests.
function schritt(repo, skript) {
  const r = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', skript], {
    cwd: repo,
    encoding: 'utf8',
    env: umgebung(KEINE_LISTE, {
      GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'main', GITHUB_HEAD_REF: '',
    }),
  });
  return { code: r.status, text: `${r.stdout || ''}${r.stderr || ''}` };
}

/*
 * Der Server ist ein nacktes Repository, angesprochen über file:// – nur so
 * verhält sich `git fetch --depth` wie gegen GitHub. Der Checkout ist ein
 * voller Klon (fetch-depth: 0) nach dem Push; origin/main zeigt dann auf
 * genau den gepushten Stand.
 */
const server = tempOrdner('server');
git(server, ['init', '-q', '--bare', '-b', 'main']);
const arbeit = tempOrdner('arbeit');
git(arbeit, ['init', '-q', '-b', 'main']);
datei(arbeit, 'tools/pruefung/allgemein.py', readFileSync(path.join(ROOT, 'tools/pruefung/allgemein.py')));
datei(arbeit, 'tools/pruefung/bot-grenzen.py', readFileSync(path.join(ROOT, 'tools/pruefung/bot-grenzen.py')));
git(arbeit, ['add', '-A']);
git(arbeit, ['commit', '-q', '-m', 'Anfang']);
git(arbeit, ['remote', 'add', 'origin', `file://${server}`]);
git(arbeit, ['push', '-q', 'origin', 'main']);

function ciNachPush(name) {
  const ci = path.join(tempOrdner(name), 'klon');
  const r = git(path.dirname(ci), ['clone', '-q', `file://${server}`, ci]);
  check(r.code === 0, `${name}: der volle Klon nach dem Push gelingt (${r.code})`);
  const lauf = [];
  for (const s of DAVOR) lauf.push(schritt(ci, s));
  return { ci, lauf, allgemein: schritt(ci, ALLGEMEIN_SKRIPT) };
}

// Erst drei harmlose Commits, auf einmal gepusht – so geht hier eine Fassung
// auf main.
for (const n of ['eins', 'zwei', 'drei']) git(arbeit, ['commit', '-q', '--allow-empty', '-m', `Probe ${n}`]);
git(arbeit, ['push', '-q', 'origin', 'main']);
const sauber = ciNachPush('ci-sauber');
check(
  git(sauber.ci, ['rev-parse', 'origin/main']).text === git(sauber.ci, ['rev-parse', 'HEAD']).text,
  'wie beim Push auf main: origin/main zeigt im Klon auf den gepushten Stand',
);
check(sauber.lauf.every((l) => l.code === 0), 'die Schritte davor sind grün');
check(sauber.allgemein.code === 0, `ohne Personenbezug ist der Schritt grün (${sauber.allgemein.code})`);
check(
  /\b4 Commit-Texte\b/.test(sauber.allgemein.text),
  `und er sagt, wie viele Commit-Texte er gelesen hat: alle vier (${sauber.allgemein.text.trim().split('\n').pop()})`,
);
check(
  git(sauber.ci, ['rev-parse', '--is-shallow-repository']).text.trim() === 'false',
  'nach den Schritten ist der Klon nicht flach – die Vorgeschichte bleibt ganz',
);

// Dann ein Satz über einen Menschen, mitten in einem Push mit drei Commits.
git(arbeit, ['commit', '-q', '--allow-empty', '-m', 'Probe vier']);
git(arbeit, ['commit', '-q', '--allow-empty', '-m', REGEL_EINS]);
const verraeter = kopf(arbeit);
git(arbeit, ['commit', '-q', '--allow-empty', '-m', 'Probe sechs']);
git(arbeit, ['push', '-q', 'origin', 'main']);
const rot = ciNachPush('ci-rot');
check(rot.allgemein.code === 1, `ein Commit-Text mit Personenbezug macht den Schritt rot – auch nach einem Push auf main (${rot.allgemein.code})`);
check(
  rot.allgemein.text.includes(`Commit ${verraeter.slice(0, 12)}`),
  'die Meldung nennt den Commit, auch wenn er nicht der oberste ist',
);
check(!rot.allgemein.text.includes(REGEL_EINS), 'und nie den Text selbst – CI-Protokolle sind öffentlich');

// Ein leerer Bereich darf nicht nach Erfolg für die Commit-Texte klingen.
const leer = spawnSync('python3', [path.join(rot.ci, 'tools/pruefung/allgemein.py'), '--commits', 'HEAD..HEAD'],
  { encoding: 'utf8', env: umgebung(KEINE_LISTE) });
check(leer.status === 0, `ein leerer Bereich ist kein Fehler (${leer.status})`);
check(
  !/Commit-Texte?\s+ohne/.test(leer.stdout) && /keine Commit-Texte/.test(leer.stdout),
  `meldet aber ehrlich, dass er keine Commit-Texte gelesen hat (${leer.stdout.trim().split('\n').pop()})`,
);

/* ---------- 2. commit-msg: jede Zeile, die im Commit landen kann ---------- */

const nachricht = hakenRepo('nachricht');
const basisN = kopf(nachricht);

// Zur Begründung: Mit -m behält git eine Zeile, die mit # beginnt.
let r = git(nachricht, ['commit', '-q', '--allow-empty', '-m', 'Neu', '-m', '# Überschrift']);
check(
  r.code === 0 && /^# Überschrift$/m.test(git(nachricht, ['log', '-1', '--format=%B']).text),
  'mit -m bleibt eine #-Zeile im Commit stehen – git entfernt sie nicht',
);
git(nachricht, ['reset', '-q', '--hard', basisN]);

r = git(nachricht, ['commit', '-q', '--allow-empty', '-m', 'Neu', '-m', `# ${PROBE}`]);
check(r.code !== 0 && kopf(nachricht) === basisN, `commit-msg bricht ab, wenn das Probewort in einer #-Zeile steht (${r.code})`);
check(!VERRAETERISCH.test(r.text), 'die Meldung nennt das Probewort nicht');
git(nachricht, ['reset', '-q', '--hard', basisN]);

const nachrichtDatei = path.join(tempOrdner('nachrichttext'), 'COMMIT_EDITMSG');
function haken(text, liste = LISTE) {
  writeFileSync(nachrichtDatei, text);
  const p = spawnSync('python3', [path.join(nachricht, '.git/hooks/commit-msg'), nachrichtDatei],
    { cwd: nachricht, encoding: 'utf8', env: umgebung(liste) });
  return { code: p.status, text: `${p.stdout || ''}${p.stderr || ''}` };
}
// Bei `git commit -v` steht unter der Scherenzeile der Diff, und git schneidet
// ihn ab. Was dort steht, kommt nicht in den Commit.
const SCHERE = '# ------------------------ >8 ------------------------';
r = haken(`Neu\n\n${SCHERE}\n# Nicht ändern.\ndiff --git a/x b/x\n+${PROBE}\n`);
check(r.code === 0, `unter der Scherenzeile wird nicht geprüft – das schneidet git ab (${r.code})`);
r = haken(`Neu\n# ${PROBE}\n${SCHERE}\n`);
check(r.code !== 0, `über der Scherenzeile schon, auch mit # (${r.code})`);

// Die allgemeinen Regeln greifen schon lokal, bevor ein Text öffentlich wird –
// auch dort, wo es keine Sperrliste gibt.
r = git(nachricht, ['commit', '-q', '--allow-empty', '-m', REGEL_EINS], KEINE_LISTE);
check(r.code !== 0 && kopf(nachricht) === basisN, `commit-msg wendet die Regeln aus allgemein.py an, auch ohne Sperrliste (${r.code})`);
check(/Zeile 1\b/.test(r.text) && !r.text.includes(REGEL_EINS), 'die Meldung nennt die Zeile, nicht den Text');
r = git(nachricht, ['commit', '-q', '--allow-empty', '-m', 'Neu', '-m', REGEL_ZWEI]);
check(r.code !== 0 && kopf(nachricht) === basisN, `und die zweite Regel, Thema und Person in einer Zeile (${r.code})`);
r = git(nachricht, ['commit', '-q', '--allow-empty', '-m', 'Neu', '-m', `# ${REGEL_ZWEI}`]);
check(r.code !== 0 && kopf(nachricht) === basisN, `auch in einer #-Zeile (${r.code})`);
r = git(nachricht, ['commit', '-q', '--allow-empty', '-m', ALLGEMEIN]);
check(r.code === 0 && kopf(nachricht) !== basisN, `ein allgemein gefasster Text geht durch (${r.code})`);

/* ---------- 3. pre-commit: jeder neue Dateiname, auch ohne „+++“-Zeile ---------- */

const namen = hakenRepo('namen');
const basis = kopf(namen);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);

/** Vorbereiten, committen, prüfen – und zurück auf den Anfang. */
function versuch(text, vorbereiten, abbruch) {
  vorbereiten();
  git(namen, ['add', '-A']);
  const v = git(namen, ['commit', '-q', '-m', 'Probe']);
  const ging = kopf(namen) !== basis;
  if (abbruch) check(v.code !== 0 && !ging, `${text}: abgebrochen (${v.code})`);
  else check(v.code === 0 && ging, `${text}: geht durch (${v.code})`);
  check(!VERRAETERISCH.test(v.text), `${text}: die Meldung nennt weder Probewort noch Dateinamen`);
  git(namen, ['reset', '-q', '--hard', basis]);
  git(namen, ['clean', '-qfdx']);
  return v;
}

versuch('Textdatei mit Probewort im Namen', () => datei(namen, `${PROBE}-notiz.txt`, 'harmlos\n'), true);
versuch('Binärdatei mit Probewort im Namen', () => datei(namen, `${PROBE}-foto.png`, PNG), true);
versuch('leere Datei mit Probewort im Namen', () => datei(namen, `${PROBE}-leer.txt`, ''), true);
versuch('reine Umbenennung auf einen Namen mit Probewort',
  () => git(namen, ['mv', 'a.txt', `${PROBE}-neu.txt`]), true);
versuch('Name mit Umlaut-Probewort, harmloser Inhalt',
  () => datei(namen, `notiz-${PROBE_UMLAUT}.txt`, 'harmlos\n'), true);
const beides = versuch('Name mit Umlaut-Probewort und Probewort im Inhalt',
  () => datei(namen, `${PROBE_UMLAUT}-text.txt`, `harmlos\n${PROBE}\n`), true);
check(/ein Dateiname/.test(beides.text), 'dann heißt die Datei in der Meldung nur „ein Dateiname“');
const inhalt = versuch('Probewort nur im Inhalt', () => datei(namen, 'notiz.txt', `harmlos\n${PROBE}\n`), true);
check(/notiz\.txt, Zeile 2\b/.test(inhalt.text), 'dann nennt die Meldung Datei und Zeile');

// Gegenproben: Dieselben Wege ohne Probewort gehen durch.
versuch('harmlose Binärdatei', () => datei(namen, 'foto.png', PNG), false);
versuch('harmlose leere Datei', () => datei(namen, 'leer.txt', ''), false);
versuch('harmlose Umbenennung', () => git(namen, ['mv', 'a.txt', 'b.txt']), false);
versuch('harmloser Name mit Umlaut', () => datei(namen, 'übersicht.txt', 'harmlos\n'), false);

/* ---------- 4. allgemein.py durchsucht, was ausgeliefert wird ---------- */

/*
 * css/styles.css, index.html, sw.js und das Manifest stecken in
 * dist/bauchbuch.html – der Datei, die weitergegeben wird – und haben eigene
 * Kommentare. js/app.js ist die Gegenprobe, die schon immer durchsucht wurde.
 */
const orte = tempOrdner('orte');
datei(orte, 'tools/pruefung/allgemein.py', readFileSync(path.join(ROOT, 'tools/pruefung/allgemein.py')));
const KOMMENTAR = {
  'js/app.js': `'use strict';\n// ${REGEL_ZWEI}\n`,
  'css/styles.css': `body { margin: 0; }\n/* ${REGEL_ZWEI} */\n`,
  'index.html': `<!doctype html>\n<!-- ${REGEL_ZWEI} -->\n`,
  'sw.js': `const VERSION = 'v0';\n// ${REGEL_ZWEI}\n`,
  'manifest.webmanifest': `{\n  "description": "${REGEL_ZWEI}"\n}\n`,
  'package.json': `{\n  "description": "${REGEL_ZWEI}"\n}\n`,
};
for (const [rel, text] of Object.entries(KOMMENTAR)) {
  datei(orte, rel, text);
  const p = spawnSync('python3', [path.join(orte, 'tools/pruefung/allgemein.py')],
    { encoding: 'utf8', env: umgebung(KEINE_LISTE) });
  check(p.status === 1 && p.stdout.includes(`${rel}:2`), `allgemein.py findet den Satz in ${rel} (${p.status})`);
  rmSync(path.join(orte, rel));
}
check(!existsSync(path.join(orte, 'sw.js')), 'die Probedateien sind wieder weg');

ende();
