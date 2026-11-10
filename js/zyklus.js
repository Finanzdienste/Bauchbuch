/*
 * Der Zyklus – gerechnet aus dem, was eingetragen wurde, und aus nichts sonst.
 *
 * Warum das in ein Magentagebuch gehört: Bei manchen Menschen verändern sich
 * Verdauung und Appetit mit dem Zyklus. Vor der Periode kommen etwa
 * Verdauungsprobleme, Heißhunger oder ein aufgeschwemmtes Gefühl vor
 * (gesund.bund.de/praemenstruelles-syndrom-pms, Stand 21.10.2022; „Abdominal
 * bloating“ unter den typischen PMS-Beschwerden, EMA/HMPC/606741/2018,
 * Tabelle 5), während der Periode bei einigen Frauen auch Übelkeit oder
 * Durchfall (gesund.bund.de/regelschmerzen, Stand 27.08.2024: „Einige Frauen
 * leiden zusätzlich zu Krämpfen an Übelkeit, Erbrechen oder Durchfall.“). Wer
 * das nicht mitzählt, sucht die Ursache womöglich im Essen. Ein Muster, das
 * sich alle vier Wochen wiederholt, sieht man nur, wenn man weiß, wo die
 * Wochen anfangen. (Bis zur Fassung 29: „Bei vielen Menschen schwanken
 * Übelkeit, Blähungen, Sodbrennen und Appetit“ – „viele“ und Sodbrennen
 * trägt keine dieser Quellen.)
 *
 * WOFÜR DAS HIER NICHT TAUGT, und das ist keine Formalie:
 *
 *   * **Nicht zur Verhütung.** Der Eisprung wird hier nicht gemessen, sondern
 *     aus der halben Zykluslänge geschätzt, und sein Zeitpunkt lässt sich nicht
 *     vorhersagen (EMA, ellaOne, Fachinformation 4.4: „Da der Zeitpunkt der
 *     Ovulation nicht vorhergesagt werden kann“). Der Zyklus kann sich außerdem
 *     verändern – die Regelblutung kann etwa ausbleiben, „wenn man psychisch
 *     belastet ist oder wenn man zu wenig wiegt“ (gesund.bund.de, ICD N91.1),
 *     und eine Schilddrüsenunterfunktion kann den Menstruationszyklus stören
 *     (gesund.bund.de/schilddruesenunterfunktion, Stand 23.02.2026). Dann liegt
 *     die Schätzung daneben. (Bis zur Fassung 29: Er verschiebe sich „gerade
 *     dann, wenn jemand krank ist oder unter Druck steht“ – so steht es in
 *     keiner dieser Quellen.)
 *   * **Nicht als Vorhersage.** „Nächste Periode am …" steht nirgends. Eine
 *     Zahl, die aus drei beobachteten Zyklen stammt, sieht genauso aus wie
 *     eine, die aus dreißig stammt – und wird genauso geglaubt.
 *
 * Was hier steht, ist eine Einordnung des *vergangenen* Verlaufs: In welcher
 * Phase lag ein bestimmter Tag, gemessen an den eingetragenen Blutungstagen.
 */
import { plusTage, tageDazwischen } from './datum.js';

/** Ab hier gilt ein Tag als Blutungstag – Schmierblutung zählt mit. */
const BLUTUNG_AB = 1;

/**
 * Liegen zwei eingetragene Blutungstage mindestens so viele Tage auseinander –
 * also mit mindestens zwei Tagen ohne Blutung dazwischen –, beginnt hier ein
 * neuer Zyklus; ein einzelner Tag ohne Blutung trennt nicht. Sonst käme bei
 * einer kurzen Pause eine Zykluslänge von wenigen Tagen heraus.
 *
 * Das ist eine Festlegung dieser App für die Auswertung, keine medizinische
 * Grenze. Bis zur Fassung 29 hieß es, zwei Tage Pause seien „nichts
 * Ungewöhnliches“ und drei Tage „die übliche Grenze“ – dafür fand sich keine
 * Quelle. Wie lange und wie gleichmäßig eine Periode verläuft, ist von Mensch
 * zu Mensch verschieden; Fragen dazu gehören in die gynäkologische Praxis.
 */
const LUECKE = 3;

export const PHASEN = [
  { id: 'menstruation', name: 'Periode' },
  { id: 'follikel', name: 'erste Zyklushälfte' },
  { id: 'ovulation', name: 'Zyklusmitte' },
  { id: 'luteal', name: 'zweite Zyklushälfte' },
];

const PHASEN_MAP = Object.fromEntries(PHASEN.map((p) => [p.id, p]));

export function phasenName(id) {
  return PHASEN_MAP[id] ? PHASEN_MAP[id].name : id;
}

/** Alle eingetragenen Blutungstage, aufsteigend. */
export function blutungsTage(tage) {
  return Object.keys(tage || {})
    .filter((iso) => Number(tage[iso] && tage[iso].blutung) >= BLUTUNG_AB)
    .sort();
}

/**
 * Die beobachteten Zyklen: [{ start, laenge }].
 *
 * Ein Zyklus beginnt am ersten Blutungstag nach einer Lücke. Seine Länge ist
 * der Abstand zum nächsten Anfang – der letzte Zyklus hat deshalb keine, er
 * läuft noch.
 */
export function zyklen(tage) {
  const bt = blutungsTage(tage);
  if (!bt.length) return [];
  const starts = [bt[0]];
  const blutungsEnden = [];
  for (let i = 1; i < bt.length; i++) {
    if (tageDazwischen(bt[i - 1], bt[i]) >= LUECKE) {
      blutungsEnden.push(bt[i - 1]);
      starts.push(bt[i]);
    }
  }
  blutungsEnden.push(bt[bt.length - 1]);
  return starts.map((start, i) => ({
    start,
    blutungBis: blutungsEnden[i],
    blutungsTage: tageDazwischen(start, blutungsEnden[i]) + 1,
    laenge: i + 1 < starts.length ? tageDazwischen(start, starts[i + 1]) : null,
  }));
}

/**
 * Die mittlere Zykluslänge aus den abgeschlossenen Zyklen.
 *
 * Ohne abgeschlossenen Zyklus gibt es keine – dann liefert das hier `null`,
 * und alles, was darauf aufbaut, hält den Mund. 28 als stille Annahme
 * einzusetzen wäre bequem und falsch: Zykluslängen unterscheiden sich. Als zu
 * selten gilt erst ein Abstand von mehr als 35 Tagen, als zu häufig je nach
 * Definition einer von weniger als 21 bis 25 Tagen (EMA/HMPC/606741/2018,
 * 4.2.2.6/4.2.2.7: „intervals greater than 35 days“, „more frequently than
 * every 21 to 25 days“; gesund.bund.de/glossar/oligomenorrhoe). Wer zum
 * Beispiel 26 oder 34 Tage hat, läge mit einer 28-Tage-Annahme bei den Phasen
 * durchgehend daneben. (Bis zur Fassung 29: „genug Menschen, bei denen 24
 * oder 34 der Normalfall ist“ – eine Häufigkeit nennt keine Quelle, und 24
 * liegt nach mancher Definition schon unter der Grenze.)
 */
export function mittlereLaenge(tage) {
  const fertig = zyklen(tage).filter((z) => z.laenge && z.laenge >= 15 && z.laenge <= 60);
  if (!fertig.length) return null;
  return Math.round(fertig.reduce((s, z) => s + z.laenge, 0) / fertig.length);
}

/** Wie stark die Zykluslänge schwankt – die Spanne zwischen kürzestem und längstem. */
export function schwankung(tage) {
  const laengen = zyklen(tage).map((z) => z.laenge)
    .filter((l) => l && l >= 15 && l <= 60);
  if (laengen.length < 2) return null;
  return { von: Math.min(...laengen), bis: Math.max(...laengen), anzahl: laengen.length };
}

/**
 * Der Zyklustag eines Datums: 1 am ersten Blutungstag.
 *
 * `null`, wenn der Tag vor dem ersten eingetragenen Zyklus liegt oder mehr als
 * zwei Monate hinter seinem Anfang – dann ist die Zuordnung geraten, nicht
 * gerechnet.
 */
export function zyklusTag(tage, iso) {
  const alle = zyklen(tage);
  let letzter = null;
  for (const z of alle) {
    if (z.start <= iso) letzter = z;
  }
  if (!letzter) return null;
  const tag = tageDazwischen(letzter.start, iso) + 1;
  return tag >= 1 && tag <= 60 ? tag : null;
}

/**
 * Die Phase eines Tages.
 *
 * Grob und offen gesagt grob: Die Periode kommt aus den Eintragungen, die
 * Mitte wird aus der halben Zykluslänge geschätzt, der Rest teilt sich davor
 * und danach auf. Feiner geht es aus den Blutungstagen allein nicht: Ob der
 * Eisprung unmittelbar bevorsteht, „lässt sich zeitnah nur mit einer
 * Ultraschall-Untersuchung feststellen“ (gesund.bund.de/notfallverhuetung,
 * Stand 29.10.2025). Feiner zu *tun* wäre schlimmer als grob zu sein. (Bis zur
 * Fassung 29 hieß es „ohne Temperatur- oder Hormonmessung“; die Quelle nennt
 * den Ultraschall.)
 */
export function phaseVon(tage, iso) {
  const tag = zyklusTag(tage, iso);
  if (!tag) return null;
  const tagInfo = (tage || {})[iso];
  if (Number(tagInfo && tagInfo.blutung) >= BLUTUNG_AB) return 'menstruation';
  const laenge = mittlereLaenge(tage);
  if (!laenge) return null;
  const mitte = Math.round(laenge / 2);
  if (tag >= mitte - 2 && tag <= mitte + 2) return 'ovulation';
  return tag < mitte ? 'follikel' : 'luteal';
}

/**
 * Beschwerdestärke je Zyklusphase.
 *
 * Die eigentliche Auskunft dieses Moduls. Zurück kommt für jede Phase, in der
 * überhaupt etwas notiert wurde: wie viele Tage, wie stark im Mittel, und wie
 * viele davon mit Beschwerden. Ohne Schwelle und ohne Urteil – die Fallzahlen
 * stehen daneben, damit man selbst sieht, ob drei Tage oder dreißig gemeint
 * sind.
 */
export function phasenBilanz(eintraege, tage, tagesWert) {
  const eimer = Object.fromEntries(PHASEN.map((p) => [p.id, { tage: 0, summe: 0, mit: 0 }]));
  const gesehen = new Set();
  const alleTage = new Set([
    ...Object.keys(tage || {}),
    ...eintraege.map((e) => e.am),
  ]);
  alleTage.forEach((iso) => {
    if (gesehen.has(iso)) return;
    gesehen.add(iso);
    const p = phaseVon(tage, iso);
    if (!p) return;
    const t = tagesWert(eintraege, iso, tage);
    if (!t.notiert) return;
    eimer[p].tage += 1;
    eimer[p].summe += t.wert;
    if (t.wert > 0) eimer[p].mit += 1;
  });
  return PHASEN
    .filter((p) => eimer[p.id].tage > 0)
    .map((p) => ({
      phase: p.id,
      name: p.name,
      tage: eimer[p.id].tage,
      schnitt: eimer[p.id].summe / eimer[p.id].tage,
      anteil: eimer[p.id].mit / eimer[p.id].tage,
    }));
}

/**
 * Reicht das für eine Aussage?
 *
 * Zwei abgeschlossene Zyklen sind die Untergrenze, unter der eine Phase
 * bestenfalls ein Zufall ist. Steht hier `false`, zeigt die App die Zahlen
 * trotzdem – aber ohne den Satz, dass daraus etwas folgt.
 */
export function belastbar(tage) {
  return zyklen(tage).filter((z) => z.laenge).length >= 2;
}

/** Ab so vielen Tagen mit Antwort hat eine Phase einen Mittelwert. */
export const PHASE_FRAGE_MINDEST = 8;

/**
 * Eine Tagesfrage (Stimmung, Anspannung) je Zyklusphase.
 *
 * Nur Tage, an denen die Frage beantwortet ist – ein Tag ohne Antwort ist
 * keine gute Stimmung. Nur Phasen mit mindestens acht solchen Tagen haben
 * einen Mittelwert; die übrigen stehen mit ihrer Zahl da und ohne Schnitt.
 * Kein Urteil: Wer aus vier Phasen die höchste und die niedrigste heraussucht,
 * findet immer einen Abstand. Deshalb kommt der Standardfehler dieses
 * Abstands mit (`se`); wie streng er zu lesen ist, entscheidet der Aufrufer
 * (js/zufall.js, das hier nicht hergehört – es steht im Bündel weiter hinten).
 *
 * @returns {{ id, belastbar, phasen: {phase, name, tage, schnitt|null}[],
 *             genug, hoch, tief, abstand, se }}
 */
export function phasenFrage(tage, id) {
  const eimer = Object.fromEntries(PHASEN.map((p) => [p.id, []]));
  Object.keys(tage || {}).forEach((iso) => {
    const wert = tage[iso] ? tage[iso][id] : null;
    if (wert === null || wert === undefined || wert === '' || !Number.isFinite(Number(wert))) return;
    const p = phaseVon(tage, iso);
    if (p) eimer[p].push(Number(wert));
  });
  const mittel = (l) => l.reduce((s, x) => s + x, 0) / l.length;
  const phasen = PHASEN.filter((p) => eimer[p.id].length).map((p) => ({
    phase: p.id,
    name: p.name,
    tage: eimer[p.id].length,
    schnitt: eimer[p.id].length >= PHASE_FRAGE_MINDEST ? mittel(eimer[p.id]) : null,
  }));
  const voll = phasen.filter((p) => p.schnitt !== null);
  const genug = belastbar(tage) && voll.length === PHASEN.length;
  if (!genug) return { id, belastbar: belastbar(tage), phasen, genug: false, hoch: null, tief: null, abstand: 0, se: Infinity };
  const sortiert = [...voll].sort((a, b) => b.schnitt - a.schnitt);
  const hoch = sortiert[0];
  const tief = sortiert[sortiert.length - 1];
  // Gemeinsame Streuung über alle Phasen – wie in zufallsSpielraum.
  let quadrate = 0;
  let n = 0;
  voll.forEach((p) => {
    eimer[p.phase].forEach((x) => { quadrate += (x - p.schnitt) ** 2; });
    n += eimer[p.phase].length;
  });
  const varianz = n > voll.length ? quadrate / (n - voll.length) : 0;
  const se = Math.sqrt(varianz * (1 / hoch.tage + 1 / tief.tage));
  return {
    id, belastbar: true, phasen, genug: true, hoch: hoch.phase, tief: tief.phase, abstand: hoch.schnitt - tief.schnitt, se,
  };
}

/** Der Stand von heute, für die Tagesansicht. */
export function heutigerStand(tage, iso) {
  const tag = zyklusTag(tage, iso);
  if (!tag) return null;
  return {
    tag,
    phase: phaseVon(tage, iso),
    laenge: mittlereLaenge(tage),
    // Nur zur Einordnung des Heute, nicht als Vorhersage: Wie weit ist der
    // Zyklus, gemessen an der bisherigen mittleren Länge.
    seitAnfang: plusTage(iso, -(tag - 1)),
  };
}
