/*
 * Laufen die Shell-Schritte der GitHub-Abläufe überhaupt?
 *
 * Am 28.10.2026 kam eine Idee nie an. Der Schritt, der am offenen Entwurf
 * Bescheid sagen sollte, endete nach einer Viertelsekunde mit
 *
 *     unexpected EOF while looking for matching `"'
 *
 * Im Text stand „Vorschläge" – und das schließende deutsche Anführungszeichen
 * war ein gewöhnliches ASCII-Zeichen. Es beendete den Bash-String, das Ende
 * der Nachricht öffnete einen neuen, der nie zuging. Der Schritt war seit
 * Wochen kaputt; aufgefallen ist es erst, als er zum ersten Mal gebraucht
 * wurde.
 *
 * Kein Test hatte die Abläufe je *ausgeführt*. Geprüft wurde, was darin
 * steht (test-vorschlaege.mjs liest sie als Text), nicht ob Bash sie lesen
 * kann. Das holt diese Datei nach: Jeder `run:`-Block wird herausgelöst, die
 * Ausdrücke `${{ … }}` werden durch einen Platzhalter ersetzt – das tut
 * GitHub auch, bevor die Shell sie sieht –, und dann prüft `bash -n` die
 * Syntax, ohne etwas auszuführen.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();

/**
 * Die Shell-Blöcke einer Ablaufdatei.
 *
 * Ohne YAML-Bibliothek – dieses Projekt kommt ohne Pakete aus, und die
 * Struktur ist schlicht: Ein Block beginnt mit `run: |` und reicht so weit,
 * wie die Zeilen tiefer eingerückt sind als die Zeile mit `run:`.
 *
 * @returns {{ zeile: number, skript: string }[]}
 */
export function shellBloecke(text) {
  const zeilen = text.split('\n');
  const bloecke = [];
  for (let i = 0; i < zeilen.length; i++) {
    const m = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(zeilen[i]);
    if (!m) continue;
    const einzug = m[1].length;
    const rest = m[2].trim();
    if (/^[|>][-+]?$/.test(rest)) {
      const inhalt = [];
      let j = i + 1;
      for (; j < zeilen.length; j++) {
        const z = zeilen[j];
        if (z.trim() === '') { inhalt.push(''); continue; }
        if (z.length - z.trimStart().length <= einzug) break;
        inhalt.push(z);
      }
      const tiefe = Math.min(...inhalt.filter((z) => z.trim())
        .map((z) => z.length - z.trimStart().length));
      bloecke.push({
        zeile: i + 1,
        skript: inhalt.map((z) => z.slice(Number.isFinite(tiefe) ? tiefe : 0)).join('\n'),
      });
      i = j - 1;
    } else if (rest) {
      bloecke.push({ zeile: i + 1, skript: rest });
    }
  }
  return bloecke;
}

/** Was GitHub vor der Shell erledigt: Ausdrücke einsetzen. */
const eingesetzt = (skript) => skript.replace(/\$\{\{[\s\S]*?\}\}/g, 'PLATZHALTER');

function bashLiest(skript) {
  const r = spawnSync('bash', ['-n'], { input: eingesetzt(skript), encoding: 'utf8' });
  return { ok: r.status === 0, meldung: (r.stderr || '').trim() };
}

/* ---------- 1. Der Prüfer selbst fällt auf den alten Fehler herein ---------- */

/*
 * Erst die Gegenprobe: Erkennt die Prüfung genau den Satz, der am 28.10.
 * gescheitert ist? Ein Prüfer, der seinen Anlass nicht wiederfindet, beweist
 * mit lauter grünen Zeilen gar nichts.
 */
const alterFehler = `run: |
          gh pr comment "$NR" --body "$marke
          @\${{ github.repository_owner }} — im Briefkasten liegen **$NEU Vorschläge**.

          _Automatisch vom Ablauf „Vorschläge"._"
`;
const [alt] = shellBloecke(alterFehler);
check(alt && /Vorschläge"\._"/.test(alt.skript), 'der Ausschnitt wird als Shell-Block erkannt');
check(alt && !bashLiest(alt.skript).ok, 'und der Fehler vom 28.10. fällt bei bash -n auf');
check(bashLiest('echo "„Vorschläge“"').ok, 'ein richtig gesetztes „…“ dagegen nicht');

/* ---------- 2. Jeder Block jedes Ablaufs ---------- */

const ordner = path.join(ROOT, '.github', 'workflows');
const dateien = readdirSync(ordner).filter((f) => /\.ya?ml$/.test(f)).sort();
check(dateien.length >= 2, `die Abläufe sind da (${dateien.join(', ')})`);

let gesamt = 0;
for (const datei of dateien) {
  const bloecke = shellBloecke(readFileSync(path.join(ordner, datei), 'utf8'));
  gesamt += bloecke.length;
  const kaputt = bloecke
    .map((b) => ({ ...b, ...bashLiest(b.skript) }))
    .filter((b) => !b.ok);
  check(
    kaputt.length === 0,
    `${datei}: alle ${bloecke.length} Shell-Blöcke sind gültiges Bash`
      + (kaputt.length ? ` – kaputt ab Zeile ${kaputt.map((b) => `${b.zeile} (${b.meldung.split('\n')[0]})`).join('; ')}` : ''),
  );
}
check(gesamt >= 20, `und es sind wirklich Blöcke gefunden worden (${gesamt})`);

/* ---------- 3. Was direkt in einem Shell-Block stehen darf ---------- */

/*
 * GitHub setzt ${{ … }} als Text in den Block ein, bevor die Shell ihn sieht.
 * Steht dort etwas, das aus einem Zettel stammen kann – eine Begründung des
 * Gegenlesers, ein Titel, ein Text –, wird aus fremdem Text ein Befehl. Für
 * solche Werte gibt es env:, dort kommen sie als Variable an und nie als Code.
 *
 * Erlaubt sind deshalb nur Ausdrücke, deren Wert nie aus einem Zettel kommt:
 * Namen des Repositorys, Schalter, Zahlen und Ergebnisse von Schritten. Wer
 * hier etwas ergänzen will, muss sich diese Frage stellen – das ist der Sinn
 * der Liste.
 */
const ERLAUBT = new Set([
  'github.repository', 'github.repository_owner',
  'env.AGENT_GEWOLLT', 'env.SCHLUESSEL_DA',
  'steps.zweig.outputs.name', 'steps.holen.outputs.neu', 'steps.offen.outputs.anzahl',
  'steps.gegenlesen.outcome',
]);
for (const datei of dateien) {
  const fremd = new Set();
  for (const b of shellBloecke(readFileSync(path.join(ordner, datei), 'utf8'))) {
    for (const m of b.skript.matchAll(/\$\{\{\s*([\s\S]*?)\s*\}\}/g)) {
      if (!ERLAUBT.has(m[1])) fremd.add(m[1]);
    }
  }
  check(
    fremd.size === 0,
    `${datei}: in Shell-Blöcken stehen nur unbedenkliche Ausdrücke${fremd.size ? ` – nicht: ${[...fremd].join(', ')}` : ''}`,
  );
}

// Gegenprobe: Der Prüfer erkennt eine eingesetzte Begründung.
const boese = shellBloecke('run: |\n  echo "${{ steps.urteil.outputs.grund }}"\n')[0];
check(
  boese && [...boese.skript.matchAll(/\$\{\{\s*([\s\S]*?)\s*\}\}/g)].some((m) => !ERLAUBT.has(m[1])),
  'eine Begründung aus dem Gegenleser direkt im Block würde auffallen',
);

ende();
