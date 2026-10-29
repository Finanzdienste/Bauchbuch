/*
 * Der Fingerabdruck in sw.js – ändert er sich genau dann, wenn er soll?
 *
 * Ein Browser holt eine neue Fassung der App nur, wenn sich sw.js um
 * mindestens ein Byte unterscheidet. Damit das nicht an einer von Hand
 * hochgezählten Nummer hängt, trägt tools/build-single.py einen Fingerabdruck
 * (STAND) über alle Dateien aus SHELL ein, und die CI schlägt an, wenn er
 * nicht mehr zum Inhalt passt.
 *
 * Diese Zusage hat zwei Seiten, und beide gehen still kaputt:
 *
 *   zu taub      Eine Datei fehlt in der Rechnung, oder nur ihr Name zählt.
 *                Dann kommt eine Änderung an ihr auf keinem Startbildschirm
 *                an – die CI bleibt grün, die App läuft weiter, nur alt.
 *   zu nervös    Etwas zählt mit, das gar nicht ausgeliefert wird, oder der
 *                Wert hängt am Zufall. Dann ist die CI bei jeder Korrektur am
 *                README rot, und wer oft genug „einfach neu bauen" hört, achtet
 *                auf das Rot nicht mehr.
 *
 * Kein Browser, keine Ports: Hier wird gerechnet, nicht geklickt. Was der
 * Browser mit einem neuen Stand anfängt, prüfen test-nachschub.mjs und
 * test-auffrischen.mjs.
 *
 *     node tests/test-stand.mjs
 *     BAUCHBUCH_PRUEFLING=/ordner node tests/test-stand.mjs   # eine andere Fassung der App
 *     BAUCHBUCH_BAU=/datei.py node tests/test-stand.mjs       # ein anderes Bauskript
 *
 * Das Repo selbst wird nie angefasst: Jeder Bau läuft in einer Kopie.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, renameSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT, pruefer } from './umgebung.mjs';
import { shellListe } from './vorrat.mjs';

const { check, ende } = pruefer();

/** Die Fassung der App, die geprüft wird, und das Skript, das baut. */
const PRUEFLING = path.resolve(process.env.BAUCHBUCH_PRUEFLING || ROOT);
const BAU = path.resolve(process.env.BAUCHBUCH_BAU || path.join(ROOT, 'tools/build-single.py'));
console.log(`Prüfling: ${PRUEFLING}\nBauskript: ${BAU}\n`);

const standVon = (t) => (/^const STAND = '([0-9a-f]*)';$/m.exec(t) || [])[1];
const lesen = (ordner, rel) => readFileSync(path.join(ordner, rel), 'utf8');

/* ---------- Werkzeug ---------- */

// Alles, was hier entsteht, wird am Ende weggeräumt – auch wenn der Test
// unterwegs abbricht. Sonst sammeln sich bei jedem Lauf ein paar Megabyte an.
const angelegt = [];
// Ein --nur-stand im Repo schriebe dort sw.js um, während andere daran
// arbeiten. Das darf aus Versehen gar nicht erst gehen.
const geschuetzt = new Set([ROOT, PRUEFLING]);
process.on('exit', () => {
  for (const o of angelegt) rmSync(o, { recursive: true, force: true });
});
function tempOrdner(name) {
  const o = mkdtempSync(path.join(tmpdir(), `bauchbuch-stand-${name}-`));
  angelegt.push(o);
  return o;
}

/*
 * Eine Kopie: alles aus SHELL, dazu sw.js, und auf Wunsch, was außerhalb von
 * SHELL im Repo liegt. Nicht appKopie() aus vorrat.mjs, denn die kopiert
 * immer ROOT – hier soll auch eine verfälschte Fassung geprüft werden können.
 */
const AUSSERHALB = ['README.md', 'icon-512.png', 'icon-maskable-512.png', 'dist/bauchbuch.html'];
const ABLAUF = '.github/workflows/pruefung.yml';
function kopieVon(quelle, name, extra = []) {
  const ordner = tempOrdner(name);
  for (const rel of [...new Set([...shellListe(quelle), 'sw.js', 'index.html', ...extra])]) {
    const von = path.join(quelle, rel);
    // Fehlt eine Datei, soll das der Bau melden, nicht das Kopieren.
    if (!existsSync(von)) continue;
    mkdirSync(path.dirname(path.join(ordner, rel)), { recursive: true });
    cpSync(von, path.join(ordner, rel));
  }
  return ordner;
}

/*
 * Einmal am Anfang ein Schnappschuss, und jede weitere Kopie entsteht aus
 * ihm statt aus dem Prüfling. Im Repo wird nebenher gearbeitet; ohne den
 * Schnappschuss sähe Teil 1 die Fassung von vor einer Änderung und Teil 5 die
 * von danach, und der Test widerspräche sich selbst.
 */
const QUELLE = kopieVon(PRUEFLING, 'schnappschuss', AUSSERHALB);
const ablaufVon = [PRUEFLING, ROOT].map((w) => path.join(w, ABLAUF)).find(existsSync);
if (ablaufVon) {
  mkdirSync(path.dirname(path.join(QUELLE, ABLAUF)), { recursive: true });
  cpSync(ablaufVon, path.join(QUELLE, ABLAUF));
}
// Der Schnappschuss ist die Vorlage für alles Weitere und wird nie gebaut.
geschuetzt.add(QUELLE);
const kopie = (name, { ausserhalb = false } = {}) => kopieVon(QUELLE, name, ausserhalb ? AUSSERHALB : []);

/*
 * Den Stand in einem Ordner eintragen lassen – genau so, wie vorrat.mjs es
 * für die Browsertests tut, nur mit dem Bauskript unter Prüfung.
 *
 * Jeder Lauf bekommt eine andere Saat für Pythons Mengen. Hängt der Stand an
 * der Reihenfolge, in der eine Menge durchlaufen wird, ergibt dieselbe Datei
 * dann verschiedene Stände – und das soll hier auffallen, nicht erst in der
 * CI, die zufällig eine andere Saat zieht.
 */
let saat = 0;
function bauen(ordner) {
  if (geschuetzt.has(path.resolve(ordner))) throw new Error(`nie im Repo selbst bauen: ${ordner}`);
  saat += 1;
  const r = spawnSync('python3', [BAU, '--nur-stand', ordner], {
    cwd: ordner,
    encoding: 'utf8',
    env: { ...process.env, PYTHONHASHSEED: String(saat), PYTHONDONTWRITEBYTECODE: '1' },
  });
  const swDa = existsSync(path.join(ordner, 'sw.js'));
  const sw = swDa ? lesen(ordner, 'sw.js') : '';
  return {
    code: r.status,
    aus: (r.stdout || '').trim(),
    fehler: `${r.stderr || ''}${r.error ? r.error.message : ''}`.trim(),
    sw,
    imSw: standVon(sw),
  };
}

/** Ein Byte anhängen, oder eines in der Mitte umdrehen. */
function anhaengen(datei) {
  writeFileSync(datei, Buffer.concat([readFileSync(datei), Buffer.from('\n')]));
}
function umdrehen(datei) {
  // Gleiche Länge, anderer Inhalt: So fällt auch ein Bau auf, der nur auf
  // die Größe einer Datei sieht.
  const b = Buffer.from(readFileSync(datei));
  const i = Math.floor(b.length / 2);
  b[i] ^= 0x01;
  writeFileSync(datei, b);
}

/* ---------- 1. Der eingetragene Stand ist der, der herauskommt ---------- */

/*
 * Das ist die Frage, die die CI bei jedem Push stellt. Hier wird sie an einer
 * Kopie gestellt: Rechnet der Bau dort etwas anderes aus, als in sw.js steht,
 * wurde nach der letzten Änderung nicht gebaut – und der Browser hält die neue
 * Fassung für die alte.
 */
const swPruefling = lesen(QUELLE, 'sw.js');
const eingetragen = standVon(swPruefling);
const shell = [...new Set(shellListe(QUELLE))];
const fehlenImPruefling = shell.filter((rel) => !existsSync(path.join(QUELLE, rel)));

check(shell.length >= 40, `SHELL wird ausgewertet wie im Browser (${shell.length} Dateien)`);
check(
  fehlenImPruefling.length === 0,
  `jede in SHELL genannte Datei gibt es auch (es fehlt: ${fehlenImPruefling.join(', ') || 'keine'})`,
);
check(/^[0-9a-f]{12}$/.test(eingetragen || ''), `sw.js trägt einen Stand aus zwölf Hexziffern (${eingetragen})`);

const k1 = kopie('nachrechnen');
const r1 = bauen(k1);
check(r1.code === 0, `der Bau rechnet ihn in einer Kopie ohne Fehler nach (Exitcode ${r1.code}${r1.fehler ? `: ${r1.fehler}` : ''})`);
check(
  r1.aus === eingetragen,
  `und kommt auf denselben Stand (eingetragen ${eingetragen}, nachgerechnet ${r1.aus})`,
);
check(r1.sw === swPruefling, 'sw.js bleibt dabei Byte für Byte, wie sie eingecheckt ist');
check(r1.imSw === r1.aus, `was der Bau ausgibt, steht auch in sw.js (${r1.imSw})`);

// Ein Stand, der an sich selbst hinge, wäre bei jedem Bau ein anderer – die
// CI wäre dann immer rot, und niemand hätte etwas falsch gemacht.
const r1b = bauen(k1);
check(r1b.aus === r1.aus && r1b.sw === r1.sw, 'ein zweiter Lauf ändert nichts mehr');

/*
 * Steht in sw.js ein falscher Stand – von Hand eingetragen, aus einem
 * Zusammenführen übrig –, muss der Bau trotzdem den richtigen ausrechnen. Die
 * Zeile, in die er schreibt, darf also nicht mitzählen.
 */
const k1c = kopie('falscher-stand');
const swFalsch = lesen(k1c, 'sw.js').replace(/^const STAND = '[0-9a-f]*';$/m, "const STAND = '000000000000';");
writeFileSync(path.join(k1c, 'sw.js'), swFalsch);
const r1c = bauen(k1c);
check(
  r1c.aus === r1.aus && r1c.sw === swPruefling,
  `ein falscher Stand in sw.js wird durch den richtigen ersetzt (${r1c.aus})`,
);

/* ---------- 2. Jede Datei in SHELL zählt, mit ihrem Inhalt ---------- */

/*
 * Für jede einzelne Datei: ein Byte anhängen, dann – auf dem alten Inhalt –
 * eines umdrehen. Beides muss den Stand ändern. Zurückgesetzt muss wieder
 * genau der alte herauskommen, sonst wäre die CI nach einem sauberen Bau auf
 * einem anderen Rechner rot.
 *
 * Bewusst jede Datei und nicht eine Stichprobe: Fällt eine aus der Rechnung,
 * dann ist es eine bestimmte, und wer an ihr etwas ändert, merkt es nie.
 */
const k2 = kopie('jede-datei');
const basis = bauen(k2);
const taubAnhaengen = [];
const taubUmdrehen = [];
const nichtEingetragen = [];
const nichtZurueck = [];
const k2shell = [...new Set(shellListe(k2))].filter((rel) => existsSync(path.join(k2, rel)));
for (const rel of k2shell) {
  const datei = path.join(k2, rel);
  const vorher = readFileSync(datei);

  anhaengen(datei);
  const mit = bauen(k2);
  if (mit.code !== 0 || mit.aus === basis.aus) taubAnhaengen.push(rel);
  if (mit.imSw !== mit.aus) nichtEingetragen.push(rel);

  writeFileSync(datei, vorher);
  umdrehen(datei);
  const gedreht = bauen(k2);
  if (gedreht.code !== 0 || gedreht.aus === basis.aus) taubUmdrehen.push(rel);

  writeFileSync(datei, vorher);
  const zurueck = bauen(k2);
  if (zurueck.aus !== basis.aus || zurueck.sw !== basis.sw) nichtZurueck.push(rel);
}
check(basis.code === 0 && basis.aus === eingetragen, `Ausgangspunkt ist der eingetragene Stand (${basis.aus})`);
check(
  taubAnhaengen.length === 0,
  `für jede der ${k2shell.length} Dateien ändert ein angehängtes Byte den Stand `
  + `(gleich blieb er bei: ${taubAnhaengen.join(', ') || 'keiner'})`,
);
check(
  taubUmdrehen.length === 0,
  'und ebenso ein umgedrehtes Byte bei gleicher Länge – es zählt der Inhalt, nicht die Größe '
  + `(gleich blieb er bei: ${taubUmdrehen.join(', ') || 'keiner'})`,
);
check(
  nichtEingetragen.length === 0,
  `der neue Stand steht jedes Mal auch in sw.js (nicht bei: ${nichtEingetragen.join(', ') || 'keiner'})`,
);
check(
  nichtZurueck.length === 0,
  'zurückgesetzt ergibt jede Datei wieder genau den alten Stand und dieselbe sw.js '
  + `(anders bei: ${nichtZurueck.join(', ') || 'keiner'})`,
);

/*
 * sw.js selbst zählt mit, außer der Zeile mit dem Stand: Eine Fassung, die nur
 * den Service Worker ändert, braucht einen eigenen Vorrat. Teilte sie den
 * Namen mit der laufenden, verwürfe eine gescheiterte Installation womöglich
 * den Vorrat, aus dem die App gerade ohne Netz startet.
 */
const k2b = kopie('sw-selbst');
const vorSw = bauen(k2b);
writeFileSync(path.join(k2b, 'sw.js'), `${lesen(k2b, 'sw.js')}\n// eine Zeile mehr\n`);
const nachSw = bauen(k2b);
check(
  nachSw.code === 0 && nachSw.aus !== vorSw.aus,
  `eine Änderung an sw.js außerhalb der Zeile STAND ändert den Stand (${vorSw.aus} → ${nachSw.aus})`,
);
const nachSw2 = bauen(k2b);
check(nachSw2.aus === nachSw.aus && nachSw2.sw === nachSw.sw, 'und auch danach bleibt ein zweiter Lauf ohne Wirkung');

/* ---------- 3. Was nicht in SHELL steht, zählt nicht ---------- */

/*
 * Der Service Worker liefert diese Dateien nicht aus dem Vorrat; eine neue
 * Fassung ihretwegen hieße, bei allen Nutzerinnen den ganzen Vorrat neu zu
 * laden, ohne dass sich an der App etwas ändert. Und in der CI hieße es Rot
 * für eine Tippfehlerkorrektur im README.
 */
const k3 = kopie('ausserhalb', { ausserhalb: true });
const basis3 = bauen(k3);
const NEU = ['js/ungelistet.js', 'tests/test-irgendwas.mjs', 'notizen.txt', 'css/entwurf.css'];
const nervoes = [];
const swGeaendert = [];
for (const rel of [...AUSSERHALB, ...NEU]) {
  const datei = path.join(k3, rel);
  if (existsSync(datei)) anhaengen(datei);
  else {
    mkdirSync(path.dirname(datei), { recursive: true });
    writeFileSync(datei, `// ${rel}: liegt im Ordner, steht aber nicht in SHELL\n`);
  }
  const r = bauen(k3);
  if (r.code !== 0 || r.aus !== basis3.aus) nervoes.push(rel);
  if (r.sw !== basis3.sw) swGeaendert.push(rel);
}
check(
  nervoes.length === 0,
  'geänderte oder neue Dateien außerhalb von SHELL lassen den Stand, wie er ist '
  + `(${[...AUSSERHALB, ...NEU].length} probiert, geändert hat ihn: ${nervoes.join(', ') || 'keine'})`,
);
check(swGeaendert.length === 0, 'und sw.js bleibt dabei unberührt');

/* ---------- 4. Fehlt eine Datei, bricht der Bau ab ---------- */

/*
 * Im Betrieb scheitert dann die Installation, und die neue Fassung kommt nie
 * an. Rechnete der Bau still über die übrigen weiter, sähe alles grün aus.
 * Für jede Datei einzeln, denn ein Bau, der „nur" Symbole überspringen
 * dürfte, wäre derselbe Fehler mit kleinerem Radius.
 */
const k4 = kopie('fehlt');
const sw4 = lesen(k4, 'sw.js');
const stillWeiter = [];
const ohneName = [];
const swAngefasst = [];
for (const rel of k2shell) {
  const datei = path.join(k4, rel);
  renameSync(datei, `${datei}.weg`);
  const r = bauen(k4);
  if (r.code === 0) stillWeiter.push(rel);
  else if (!r.fehler.includes(rel)) ohneName.push(rel);
  if (r.sw !== sw4) swAngefasst.push(rel);
  renameSync(`${datei}.weg`, datei);
}
check(
  stillWeiter.length === 0,
  `fehlt eine Datei aus SHELL, endet --nur-stand mit einem Exitcode ungleich 0 (still weiter bei: ${stillWeiter.join(', ') || 'keiner'})`,
);
check(
  ohneName.length === 0,
  `und die Meldung nennt die Datei, die fehlt (nicht bei: ${ohneName.join(', ') || 'keiner'})`,
);
check(
  swAngefasst.length === 0,
  `sw.js bleibt dabei unangetastet – kein Stand über eine halbe Liste (angefasst bei: ${swAngefasst.join(', ') || 'keiner'})`,
);

/*
 * Dasselbe, wenn der Bau die Stelle nicht findet, an die er schreibt. Ein
 * Stand in doppelten Anführungszeichen sieht für einen Menschen richtig aus;
 * der Bau sucht ihn so nicht, und ohne Abbruch bliebe er für immer stehen.
 */
const k4b = kopie('ohne-zeile');
const swOhne = lesen(k4b, 'sw.js').replace(/^const STAND = '([0-9a-f]*)';$/m, 'const STAND = "$1";');
writeFileSync(path.join(k4b, 'sw.js'), swOhne);
const r4b = bauen(k4b);
check(
  r4b.code !== 0 && r4b.sw === swOhne,
  `steht die Zeile const STAND nicht in der erwarteten Form da, bricht der Bau ab (Exitcode ${r4b.code})`,
);

/* ---------- 5. Die CI, nachgestellt ---------- */

/*
 * Was die CI tut, in einem eigenen kleinen Repository: eingecheckter Stand,
 * eine Änderung, der Bau, dann git diff --exit-code -- sw.js. Erst das zeigt,
 * dass die rote Lampe wirklich angeht – und dass sie bei einer Änderung, die
 * niemanden betrifft, aus bleibt.
 */
function ciRepo(name) {
  const repo = kopie(name, { ausserhalb: true });
  // Die Ein-Datei-Fassung bleibt außen vor: Hier geht es um sw.js, und ihr
  // eigener Vergleich soll das Ergebnis nicht verdecken.
  rmSync(path.join(repo, 'dist'), { recursive: true, force: true });
  mkdirSync(path.join(repo, 'tools'), { recursive: true });
  cpSync(BAU, path.join(repo, 'tools/build-single.py'));
  const git = (...args) => spawnSync('git', [
    '-c', 'user.name=Pruefung', '-c', 'user.email=pruefung@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args,
  ], { cwd: repo, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  writeFileSync(path.join(repo, '.gitignore'), 'dist/\n__pycache__/\n');
  git('add', '-A');
  const c = git('commit', '-qm', 'Anfang');
  return { repo, git, angelegt: c.status === 0 };
}

const ci = ciRepo('ci');
const swDiff = () => ci.git('diff', '--exit-code', '--', 'sw.js').status;
check(ci.angelegt, 'das kleine Repository für die Nachstellung ist angelegt');

bauen(ci.repo);
check(swDiff() === 0, `auf dem eingecheckten Stand findet git diff --exit-code -- sw.js nichts (${swDiff()})`);

anhaengen(path.join(ci.repo, 'js/app.js'));
bauen(ci.repo);
check(swDiff() === 1, `nach einer Änderung an js/app.js und dem Bau meldet git diff --exit-code -- sw.js eine 1 (${swDiff()})`);

// Wer den Bau laufen lässt und sw.js mit eincheckt, hat wieder Ruhe.
ci.git('commit', '-qam', 'app.js geändert, Stand nachgetragen');
bauen(ci.repo);
check(swDiff() === 0, `wer den neuen Stand mit eincheckt, hat wieder eine saubere sw.js (${swDiff()})`);

anhaengen(path.join(ci.repo, 'README.md'));
bauen(ci.repo);
check(swDiff() === 0, `eine Änderung nur am README lässt sw.js in Ruhe (${swDiff()})`);

/*
 * Und jetzt nicht nachgebaut, sondern der echte Schritt aus pruefung.yml.
 * Ein Vergleich, den es nur hier gäbe, schützte niemanden; und ein Schritt,
 * der den vollen Bau ausführt, aber den Stand dabei vergäße, fiele oben nicht
 * auf, weil dort nur --nur-stand läuft.
 */
const ablauf = existsSync(path.join(QUELLE, ABLAUF)) ? lesen(QUELLE, ABLAUF) : '';
const schritte = ablauf.split(/\n(?=\s*- (?:name|id|uses): )/).slice(1);
const schritt = schritte.find((s) => /git diff --exit-code -- sw\.js/.test(s)) || '';

/** Den Block unter `run: |` herauslösen, so wie ihn GitHub an bash übergibt. */
function skriptAus(text) {
  const zeilen = text.split('\n');
  const i = zeilen.findIndex((z) => /^\s*run: \|\s*$/.test(z));
  if (i < 0) return '';
  const einzug = zeilen[i].search(/\S/);
  const block = [];
  for (const z of zeilen.slice(i + 1)) {
    if (z.trim() && z.search(/\S/) <= einzug) break;
    block.push(z);
  }
  const rand = Math.min(...block.filter((z) => z.trim()).map((z) => z.search(/\S/)));
  return block.map((z) => z.slice(rand)).join('\n');
}
const skript = skriptAus(schritt);
check(
  /python3 tools\/build-single\.py\s*$/m.test(skript) && /git diff --exit-code -- sw\.js/.test(skript),
  'pruefung.yml hat einen Schritt, der baut und danach sw.js vergleicht',
);

// So startet GitHub einen run-Block: bash, ohne Profil, mit -e und pipefail.
const ciLauf = (repo) => {
  const r = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', skript],
    { cwd: repo, encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  return { code: r.status, text: `${r.stdout || ''}${r.stderr || ''}` };
};

const echt = ciRepo('ci-echt');
const gruen = ciLauf(echt.repo);
check(gruen.code === 0, `der Schritt ist auf dem eingecheckten Stand grün (Exitcode ${gruen.code})`);
echt.git('checkout', '-q', '--', '.');

// Jemand ändert js/store.js und vergisst den Bau.
anhaengen(path.join(echt.repo, 'js/store.js'));
echt.git('commit', '-qam', 'store.js geändert, Bau vergessen');
const rot = ciLauf(echt.repo);
check(rot.code !== 0, `vergisst jemand den Bau, wird der Schritt rot (Exitcode ${rot.code})`);
check(
  /Stand in sw\.js ist veraltet/.test(rot.text),
  'und zwar an sw.js, mit einem Satz, der sagt, was zu tun ist',
);

// Der Bau, den die Meldung verlangt, macht ihn wieder grün.
echt.git('commit', '-qm', 'Stand nachgetragen', '--', 'sw.js');
const wieder = ciLauf(echt.repo);
check(wieder.code === 0, `nach dem Bau und einem Commit von sw.js ist er wieder grün (Exitcode ${wieder.code})`);

/* ---------- 6. Der Vorrat heißt nach VERSION und STAND ---------- */

/*
 * Der Stand nützt nur, wenn er im Namen des Vorrats steckt: Gleicher Name
 * hieße gleicher Vorrat, und eine neue Fassung legte ihre Dateien zu denen der
 * alten. Ausgewertet wird wie im Browser – die drei Zeilen in der Reihenfolge,
 * in der sie in der Datei stehen. Käme CACHE vor STAND, scheiterte schon das.
 */
function fassungAus(text) {
  const zeilen = ['VERSION', 'STAND', 'CACHE'].map((n) => {
    const m = new RegExp(`^const ${n} = .*;$`, 'm').exec(text);
    return m ? { stelle: m.index, zeile: m[0] } : null;
  });
  if (zeilen.some((z) => !z)) return { fehler: 'eine der drei Zeilen fehlt' };
  zeilen.sort((a, b) => a.stelle - b.stelle);
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`${zeilen.map((z) => z.zeile).join('\n')}\nreturn { VERSION, STAND, CACHE };`)();
  } catch (e) {
    return { fehler: e.message };
  }
}

const cacheZeile = (/^const CACHE = .*$/m.exec(swPruefling) || [''])[0];
check(
  /\bVERSION\b/.test(cacheZeile) && /\bSTAND\b/.test(cacheZeile),
  `die Zeile const CACHE setzt sich aus VERSION und STAND zusammen (${cacheZeile || 'nicht gefunden'})`,
);
const f = fassungAus(swPruefling);
check(
  !f.fehler && f.CACHE.startsWith('bauchbuch-') && f.CACHE.includes(f.VERSION) && f.CACHE.includes(f.STAND),
  `ausgewertet heißt der Vorrat ${f.CACHE || f.fehler}`,
);

// Nach einer Änderung muss der Vorrat anders heißen – bei gleicher VERSION.
const k6 = kopie('vorratsname');
anhaengen(path.join(k6, 'css/styles.css'));
const r6 = bauen(k6);
const f6 = fassungAus(r6.sw);
check(
  !f6.fehler && f6.CACHE !== f.CACHE && f6.VERSION === f.VERSION && f6.CACHE.includes(r6.aus),
  `eine geänderte Datei gibt bei gleicher VERSION einen neuen Vorrat (${f.CACHE} → ${f6.CACHE || f6.fehler})`,
);

check(
  /caches\.open\(CACHE\)/.test(swPruefling) && /k !== CACHE/.test(swPruefling),
  'unter diesem Namen legt die Installation an, und alle anderen räumt activate weg',
);

/* ---------- 7. Was der Bau nicht stillschweigend hinnimmt ---------- */

/*
 * Ein Eintrag in doppelten Anführungszeichen ist für den Browser derselbe
 * Eintrag. Das Muster im Bau sähe ihn nicht, und eine Änderung an genau
 * dieser Datei käme nirgends an. Also bricht der Bau ab.
 */
const k7 = kopie('anfuehrung');
const sw7 = lesen(k7, 'sw.js');
writeFileSync(path.join(k7, 'sw.js'), sw7.replace("  './js/wach.js',", '  "./js/wach.js",'));
const r7 = bauen(k7);
check(
  r7.code !== 0 && /SHELL/.test(r7.fehler) && r7.imSw === standVon(sw7),
  `ein SHELL-Eintrag in doppelten Anführungszeichen bricht den Bau ab (Exitcode ${r7.code}: ${r7.fehler.split('\n').pop()})`,
);

/*
 * Ein vertippter Aufruf. Früher baute er still das Repository, in dem das
 * Skript liegt. Damit das hier nicht das echte trifft, liegt das Skript für
 * diese Prüfung in einer Kopie – die fertige Einzeldatei dort darf sich nicht
 * rühren.
 */
const k7b = kopie('aufruf', { ausserhalb: true });
mkdirSync(path.join(k7b, 'tools'), { recursive: true });
cpSync(BAU, path.join(k7b, 'tools/build-single.py'));
const distVorher = existsSync(path.join(k7b, 'dist/bauchbuch.html')) ? lesen(k7b, 'dist/bauchbuch.html') : null;
const swVorher = lesen(k7b, 'sw.js');
for (const falsch of [['--nur-stand'], ['--nur_stand', k7b], ['--nur-stand', k7b, 'zuviel'], ['--nur-stand', path.join(k7b, 'gibt-es-nicht')]]) {
  const r = spawnSync('python3', [path.join(k7b, 'tools/build-single.py'), ...falsch], {
    cwd: k7b,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  const distNachher = existsSync(path.join(k7b, 'dist/bauchbuch.html')) ? lesen(k7b, 'dist/bauchbuch.html') : null;
  check(
    r.status !== 0 && distNachher === distVorher && lesen(k7b, 'sw.js') === swVorher,
    `„build-single.py ${falsch.map((a) => a.replace(k7b, '<kopie>')).join(' ')}" bricht ab und baut nichts (Exitcode ${r.status})`,
  );
}

ende();
