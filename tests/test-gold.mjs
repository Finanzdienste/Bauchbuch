/*
 * Rechnet diese Fassung über ein altes Tagebuch noch genau das, was die
 * Fassung 27 gerechnet hat?
 *
 * Die Fassung 28 bringt viel Neues: ADHS-Mittel, Koffein als eigene Gruppe,
 * mehr Namen für Säureblocker, Kiefer, Nacken und Schiene. Wer nichts davon
 * einträgt, darf davon nichts merken – an keiner Zahl, in keinem Satz. Das
 * ist leicht versprochen und schwer gehalten, denn jede neue Regel sitzt in
 * einer Rechnung, die auch alle anderen Tagebücher durchläuft.
 *
 * Deshalb kein Vergleich Stelle für Stelle, sondern das Gold
 * (tests/gold/v27-rechnungen.json): alle Rechnungen aus tests/rechnungen.mjs,
 * mit dem Code der Fassung 27 über feste Tagebücher gerechnet und
 * eingecheckt, bevor sich am Code etwas geändert hat. Hier läuft dieselbe
 * Liste mit dem heutigen Code über dieselben Tagebücher und muss Zeichen für
 * Zeichen dasselbe ergeben. So fällt auch eine Stelle auf, an die beim
 * Schreiben niemand gedacht hat.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, pruefer } from './umgebung.mjs';
import {
  GOLD_SAATEN, GRUNDDATUM, TAGE, alleRechnungen, nichtLeer, tagebuch,
} from './rechnungen.mjs';

const { check, ende } = pruefer();
const HIER = path.dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(path.join(HIER, 'gold', 'v27-rechnungen.json'), 'utf8'));

check(
  gold.grunddatum === GRUNDDATUM && gold.tage === TAGE
    && JSON.stringify(gold.saaten) === JSON.stringify(GOLD_SAATEN),
  `das Gold gehört zu diesem Generator (${gold.grunddatum}, ${gold.tage} Tage, Saaten ${gold.saaten.join(', ')})`,
);

/*
 * Das Tagebuch des Golds enthält nichts, was erst die Fassung 28 kennt – sonst
 * wäre „dasselbe Ergebnis" kein Versprechen, sondern ein Fehler: Ein
 * ADHS-Mittel soll ja anders zählen als vorher.
 */
const NEU = /methylphenidat|ritalin|medikinet|concerta|kinecteen|equasym|\bmph\b|lisdex|elvanse|dexamfetamin|attentin|atomoxetin|strattera|guanfacin|intuniv|bupropion|elontril|zyban|koffein|coffein|pantozol|nexium|antra|agopton|maaloxan|massagepistole|"massage"|"waerme"|adhsPause|verspannt|"kiefer"|gepresst|"schiene"|essenGesetzt/i;
for (const saat of GOLD_SAATEN) {
  const d = tagebuch(saat);
  const text = JSON.stringify(d);
  const mittelNeu = d.eintraege.filter((e) => e.art === 'medikament' && ('form' in e || 'essen' in e));
  check(!NEU.test(text) && !mittelNeu.length,
    `Tagebuch ${saat}: ohne ADHS-, Koffein- und neue Säureblocker-Namen, ohne neue Aktivitäten und Felder`);
  check(d.eintraege.length > 400 && Object.keys(d.tage).length > 60,
    `Tagebuch ${saat}: kein leeres Tagebuch (${d.eintraege.length} Einträge, ${Object.keys(d.tage).length} Tage)`);
}

/* ---------- Jede Rechnung im Gold sagt etwas ---------- */

for (const saat of GOLD_SAATEN) {
  const leer = Object.entries(gold.rechnungen[saat]).filter(([, v]) => !nichtLeer(v)).map(([k]) => k);
  check(
    Object.keys(gold.rechnungen[saat]).length >= 34 && leer.length === 0,
    `Gold ${saat}: ${Object.keys(gold.rechnungen[saat]).length} Rechnungen, keine davon leer${leer.length ? ` (leer: ${leer.join(', ')})` : ''}`,
  );
}

/* ---------- G5: zeichengleich ---------- */

for (const saat of GOLD_SAATEN) {
  // eslint-disable-next-line no-await-in-loop
  const jetzt = await alleRechnungen(ROOT, tagebuch(saat));
  const alt = gold.rechnungen[saat];
  check(
    JSON.stringify(Object.keys(jetzt)) === JSON.stringify(Object.keys(alt)),
    `Tagebuch ${saat}: dieselben Rechnungen wie im Gold`,
  );
  const anders = Object.keys(alt).filter((k) => JSON.stringify(jetzt[k]) !== JSON.stringify(alt[k]));
  check(
    anders.length === 0,
    `Tagebuch ${saat}: alle ${Object.keys(alt).length} Rechnungen zeichengleich mit der Fassung 27`
      + `${anders.length ? ` – anders: ${anders.join(', ')}` : ''}`,
  );
  // Bei einem Unterschied die Stelle zeigen – sonst sucht man im Dunkeln.
  anders.slice(0, 3).forEach((k) => {
    const a = JSON.stringify(alt[k]);
    const b = JSON.stringify(jetzt[k]);
    let i = 0;
    while (i < a.length && a[i] === b[i]) i += 1;
    console.log(`     ${k}: …${a.slice(Math.max(0, i - 60), i + 60)}\n       jetzt …${b.slice(Math.max(0, i - 60), i + 60)}`);
  });
}

ende();
