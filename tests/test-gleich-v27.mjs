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
 *     verschoben haben, ob mit Schalter oder ohne,
 *   * und einmal, bis „Gelesen", oben auf „Tag" die Karte „Neu: Hinweise zu
 *     zwei Mitteln zusammen" (Fassung 29) – für jedes Tagebuch, das schon
 *     Einträge hatte,
 *   * und unter „Was du nimmst" auf „Tag" der zweite Punkt nach dem letzten
 *     Datum („… zuletzt Mi, 09.09.. Was die Mittel …"), der ein
 *     Schreibfehler war (Fassung 29, siehe mittelPunkt unten).
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
  const neu = neuKarteRaus(ansichten.heute);
  const punkt = mittelPunkt(neu.zeilen);
  raus.heute = punkt.zeilen;
  return {
    raus, mehrKarte: mehr.block, musterKarte: muster.block, neuKarte: neu.block, neuMal: neu.mal, punktMal: punkt.mal,
  };
}

/*
 * „Was du nimmst": Die Liste endet mit dem Datum der letzten Einnahme, und
 * das endet schon mit einem Punkt („Mi, 09.09."). Die Fassung 27 setzte
 * trotzdem noch einen dahinter, und das Gold hat ihn mitgeschrieben. Seit der
 * Fassung 29 steht dort genau einer.
 *
 * Warum hier und nicht im Gold: Das Gold ist das, was die Fassung 27 gezeigt
 * hat, mit tests/gold/erzeugen.mjs aus ihrem Code erzeugt. Von Hand
 * nachgebessert wäre es eine Behauptung über eine Fassung, die das nie gezeigt
 * hat, und neu erzeugt mit dem heutigen Code verglichen die Tests ihn mit sich
 * selbst. Also wie bei der Legende des Monatsrasters: Der eine Unterschied
 * wird vor dem Vergleich herausgenommen – hier bekommt die Zeile ihren
 * zweiten Punkt zurück –, und eigene Prüfungen halten fest, dass die neue
 * Schreibweise wirklich dasteht und das Gold die alte noch hat. Namen, Daten
 * und Reihenfolge der Zeile vergleicht danach `vergleiche` Zeichen für
 * Zeichen; ein anderer Unterschied in ihr fällt weiter auf.
 */
const MITTEL_ENDE = /(\d\d\.\d\d\.) (Was die Mittel bewirken, steht unter „Mehr"\.)$/;
function mittelPunkt(zeilen) {
  let mal = 0;
  const raus = zeilen.map((z) => {
    if (!MITTEL_ENDE.test(z)) return z;
    mal += 1;
    return z.replace(MITTEL_ENDE, '$1. $2');
  });
  return { zeilen: raus, mal };
}

/* Das Gold hat die alte Schreibweise genau einmal – sonst wäre die Ausnahme oben überflüssig. */
check(gold.ansichten.heute.filter((z) => /\d\d\.\d\d\.\. Was die Mittel bewirken/.test(z)).length === 1,
  'das Gold hat unter „Was du nimmst“ den doppelten Punkt der Fassung 27 genau einmal');

/** Genau ein Punkt nach dem letzten Datum, und nirgends auf „Tag" zwei. */
function einPunkt(jetzt, punktMal) {
  const doppelt = jetzt.heute.filter((z) => /\.\. Was die Mittel/.test(z));
  check(punktMal === 1 && doppelt.length === 0,
    `unter „Was du nimmst“ nach dem Datum genau ein Punkt (${punktMal}× neu, ${doppelt.length}× doppelt)`);
}

/*
 * Die Karte „Neu" auf „Tag": von ihrer Überschrift bis einschließlich der
 * Zeile mit „Gelesen". Stehen beide Knöpfe in einer Zeile, endet sie dort.
 */
function neuKarteRaus(zeilen) {
  const titel = 'Neu: Hinweise zu zwei Mitteln zusammen';
  const mal = zeilen.filter((z) => z === titel).length;
  const i = zeilen.indexOf(titel);
  if (i < 0) return { zeilen, block: null, mal };
  const j = zeilen.findIndex((z, n) => n > i && /(^|\s)Gelesen$/.test(z));
  if (j < 0) return { zeilen, block: null, mal };
  return { zeilen: [...zeilen.slice(0, i), ...zeilen.slice(j + 1)], block: zeilen.slice(i, j + 1), mal };
}

function vergleiche(name, ist, soll) {
  const erste = soll.findIndex((z, i) => ist[i] !== z);
  const gleich = ist.length === soll.length && erste < 0;
  check(gleich, `${name}: Zeile für Zeile wie in der Fassung 27 (${ist.length} Zeilen)${gleich ? ''
    : ` – zuerst anders in Zeile ${erste}: „${ist[erste]}" statt „${soll[erste]}"`}`);
}

/* ---------- 1. Beide Schalter nie entschieden, Hinweiskarte gelesen ---------- */

{
  const zustand = { ...ansichtsZustand(), v28Gesagt: true, v29Gesagt: true };
  check(zustand.adhsAn === undefined && zustand.spannungAn === undefined,
    'der Stand des Golds kennt die Schalter nicht – sie gelten als nie entschieden');
  const jetzt = await ansichtenLesen({ wurzel: ROOT, port: PORT, zustand });
  const {
    raus, mehrKarte, musterKarte, neuMal, punktMal,
  } = bereinigt(jetzt);
  check(neuMal === 0, 'nach „Gelesen" steht oben auf „Tag" keine Karte „Neu"');
  einPunkt(jetzt, punktMal);
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
  const {
    raus, musterKarte, neuKarte, neuMal, punktMal,
  } = bereinigt(jetzt);
  einPunkt(jetzt, punktMal);
  /*
   * Das Tagebuch des Golds hat kein Methylphenidat – also weder eine
   * Rückfrage noch W1 –, und es hat Einträge aus der Zeit vor der Fassung 29:
   * Oben auf „Tag" steht genau einmal die Karte „Neu".
   */
  check(neuMal === 1 && Array.isArray(neuKarte) && neuKarte.some((z) => z.includes('Zu „Meine Mittel“'))
    && neuKarte.some((z) => /(^|\s)Gelesen$/.test(z)),
  `oben auf „Tag" genau einmal die Karte „Neu", mit „Zu „Meine Mittel““ und „Gelesen" (${neuMal})`);
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
