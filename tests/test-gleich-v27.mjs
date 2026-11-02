/*
 * Wer nichts einschaltet, sieht dieselbe App wie in der Fassung 27.
 *
 * Die Fassung 28 bringt zwei Schalter („ADHS" und „Kiefer, Nacken, Schiene")
 * und eine Menge, was nur mit ihnen erscheint. Solange beide nie entschieden
 * sind (null), darf sich an den Reitern Tag, Verlauf, Muster und Mehr nichts
 * ändern außer dem, was ausdrücklich für alle dazukommt:
 *
 *   * die neue Karte „Was Body Check mitdenken soll" unter „Mehr",
 *   * die Legende des Monatsrasters („nichts eingetragen oder zum Bauch
 *     nichts"),
 *   * die Fassungsnummer, falls eine dasteht,
 *   * und einmal, bis „Gelesen", oben auf „Muster" die Karte „Was sich an
 *     deinen Zahlen geändert hat" – sie betrifft jeden, dessen Zahlen sich
 *     verschoben haben, ob mit Schalter oder ohne.
 *
 * Verglichen wird mit dem Gold (tests/gold/v27-ansichten.json): derselbe
 * Speicherstand, dieselbe Uhr, dieselbe iPhone-Kennung, als App vom
 * Home-Bildschirm. Zeile für Zeile, in derselben Reihenfolge – eine
 * verschobene Karte ist auch eine Änderung.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, pruefer } from './umgebung.mjs';
import { ansichtenLesen, ansichtsZustand } from './gold/erzeugen.mjs';

const { check, ende } = pruefer();
const PORT = Number(process.env.BAUCHBUCH_PORT_GLEICH || 8541);
if (PORT < 8541 || PORT > 8549) throw new Error(`Port ${PORT} liegt außerhalb von 8541–8549`);

const gold = JSON.parse(readFileSync(path.join(ROOT, 'tests', 'gold', 'v27-ansichten.json'), 'utf8'));

/** Die Zeilen einer Karte, von ihrer Überschrift bis vor die nächste. */
function ohneBlock(zeilen, anfang, naechste) {
  const i = zeilen.indexOf(anfang);
  if (i < 0) return { zeilen, block: null };
  const j = zeilen.indexOf(naechste, i + 1);
  if (j < 0) return { zeilen, block: null };
  return { zeilen: [...zeilen.slice(0, i), ...zeilen.slice(j)], block: zeilen.slice(i, j) };
}

/** Die erlaubten Unterschiede herausnehmen – und sagen, ob sie da waren. */
function bereinigt(ansichten) {
  const raus = { ...ansichten };
  const mehr = ohneBlock(ansichten.mehr, 'Was Body Check mitdenken soll', 'Welche Fragen stellt der Tag?');
  raus.mehr = mehr.zeilen.filter((z) => !/^Läuft: v\d+/.test(z));
  raus.verlauf = ansichten.verlauf.map((z) => (z === 'nichts eingetragen oder zum Bauch nichts' ? 'nichts eingetragen' : z));
  const muster = ohneBlock(ansichten.muster, 'Was sich an deinen Zahlen geändert hat', 'Gelesen');
  raus.muster = muster.block ? muster.zeilen.filter((z, i) => !(i === muster.zeilen.indexOf('Gelesen'))) : ansichten.muster;
  return { raus, mehrKarte: mehr.block, musterKarte: muster.block };
}

function vergleiche(name, ist, soll) {
  const erste = soll.findIndex((z, i) => ist[i] !== z);
  const gleich = ist.length === soll.length && erste < 0;
  check(gleich, `${name}: Zeile für Zeile wie in der Fassung 27 (${ist.length} Zeilen)${gleich ? ''
    : ` – zuerst anders in Zeile ${erste}: „${ist[erste]}" statt „${soll[erste]}"`}`);
}

/* ---------- 1. Beide Schalter nie entschieden, Hinweiskarte gelesen ---------- */

{
  const zustand = { ...ansichtsZustand(), v28Gesagt: true };
  check(zustand.adhsAn === undefined && zustand.spannungAn === undefined,
    'der Stand des Golds kennt die Schalter nicht – sie gelten als nie entschieden');
  const jetzt = await ansichtenLesen({ wurzel: ROOT, port: PORT, zustand });
  const { raus, mehrKarte, musterKarte } = bereinigt(jetzt);
  check(Array.isArray(mehrKarte) && mehrKarte.includes('ADHS') && mehrKarte.includes('Kiefer, Nacken, Schiene'),
    'unter „Mehr" steht die neue Karte mit beiden Schaltern');
  check(mehrKarte && !mehrKarte.some((z) => z.startsWith('✓')), 'beide aus – nur bei true stünde ein Häkchen');
  check(musterKarte === null, 'nach „Gelesen" steht oben auf „Muster" keine Hinweiskarte');
  check(jetzt.verlauf.includes('nichts eingetragen oder zum Bauch nichts'), 'die Legende des Monatsrasters hat den neuen Wortlaut');
  for (const tab of Object.keys(gold.ansichten)) vergleiche(tab, raus[tab], gold.ansichten[tab]);
}

/* ---------- 2. Derselbe Stand, die Hinweiskarte noch nicht gelesen ---------- */

{
  const jetzt = await ansichtenLesen({ wurzel: ROOT, port: PORT, zustand: ansichtsZustand() });
  const { raus, musterKarte } = bereinigt(jetzt);
  check(jetzt.muster[0] === 'Was sich an deinen Zahlen geändert hat',
    `die Hinweiskarte steht ganz oben auf „Muster" (${jetzt.muster[0]})`);
  // Das Tagebuch des Golds hat Kopfschmerzen, aber kein ADHS-Mittel, kein
  // Koffein und keinen der neuen Säureblocker-Namen – also genau ein Punkt.
  check(musterKarte && musterKarte.length === 2 && musterKarte[1].includes('„Licht“ und „Lärm“ jetzt getrennt'),
    `mit genau dem einen Punkt, der hier zutrifft (${(musterKarte || []).slice(1).join(' | ')})`);
  vergleiche('muster ohne die Hinweiskarte', raus.muster, gold.ansichten.muster);
  vergleiche('heute', raus.heute, gold.ansichten.heute);
}

ende();
