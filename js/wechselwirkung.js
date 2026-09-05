/*
 * Zyklus mal Auslöser – dieselbe Menge, andere Wirkung
 *
 * WORUM ES GEHT
 *
 * Die Auslöserbilanz fragt: Ging es nach diesem Essen schlechter? Sie fragt
 * nicht, *wann im Monat*. Und das ist bei vielen Menschen der halbe Befund.
 *
 * Die Empfindlichkeit des Bauchs schwankt mit dem Zyklus – nicht als Gefühl,
 * sondern messbar: Vor und während der Periode reagiert der Darm auf dieselbe
 * Dehnung stärker, die Passage ändert sich, Prostaglandine tun das Ihre. Wer
 * drei Wochen lang Zwiebeln verträgt und in der vierten nicht, hat keine
 * Zwiebelunverträglichkeit – und wird trotzdem Zwiebeln streichen, wenn die
 * Rechnung über alle vier Wochen mittelt.
 *
 * Herauskommt dabei nämlich etwas, das doppelt falsch ist: In drei Wochen von
 * vier ist der Auslöser unschuldig, in der vierten ist er es nicht, und der
 * Mittelwert sagt „ein bisschen auffällig" – eine Aussage, die für keinen
 * einzigen Tag stimmt.
 *
 * WAS DIESE DATEI NICHT TUT
 *
 * Sie sagt nicht voraus. Die Phasen sind aus eingetragenen Blutungstagen
 * geschätzt (siehe js/zyklus.js, und dort steht auch, wie grob das ist). Sie
 * taugen zum Zurückschauen und zu nichts sonst.
 *
 * Und sie urteilt nicht über eine einzelne Phase. Verlangt wird, dass
 * mindestens zwei Phasen prüfbar sind – eine Zahl allein ist kein Wechsel,
 * sondern eine Zahl.
 */
import { PHASEN, phaseVon, belastbar } from './zyklus.js';

/** Mahlzeiten je Seite und Phase, ab denen eine Phase überhaupt zählt. */
const MINDEST_JE_PHASE = 5;

/** So viele Phasen müssen prüfbar sein. */
const MINDEST_PHASEN = 2;

/**
 * Ab welchem Unterschied zwischen den Phasen von einem Wechsel die Rede ist.
 *
 * Anderthalb Stufen, und das ist mit Absicht mehr als die Schwelle der
 * Auslöserbilanz selbst (eine Stufe). Hier werden Unterschiede von
 * Unterschieden verglichen, und die schwanken stärker als die Unterschiede
 * selbst – wer denselben Maßstab anlegte, fände in jedem Tagebuch einen
 * Wechsel.
 */
const SPANNE = 1.5;

/** Und irgendwo muss überhaupt eine Wirkung sein, sonst wechselt nichts. */
const MINDEST_WIRKUNG = 1;

const mittel = (liste) => (liste.length
  ? liste.reduce((s, x) => s + x, 0) / liste.length : 0);

/**
 * Ein Auslöser, aufgeteilt nach Zyklusphase.
 *
 * @param {object[]} bewertet  aus bewerteteMahlzeiten(): { am, merkmale, wert }
 * @param {string} id          der Auslöser
 * @param {object} tage        der Tagesspeicher, für die Phasenschätzung
 */
export function phasenWirkung(bewertet, id, tage) {
  const phasen = PHASEN.map((p) => {
    const drin = bewertet.filter((b) => phaseVon(tage, b.am) === p.id);
    const mit = drin.filter((b) => b.merkmale.has(id));
    const ohne = drin.filter((b) => !b.merkmale.has(id));
    const pruefbar = mit.length >= MINDEST_JE_PHASE && ohne.length >= MINDEST_JE_PHASE;
    const schnittMit = mittel(mit.map((b) => b.wert));
    const schnittOhne = mittel(ohne.map((b) => b.wert));
    return {
      phase: p.id,
      name: p.name,
      pruefbar,
      faelle: mit.length,
      gegenFaelle: ohne.length,
      schnittMit,
      schnittOhne,
      differenz: pruefbar ? schnittMit - schnittOhne : 0,
    };
  });

  const pruefbare = phasen.filter((p) => p.pruefbar);

  /*
   * Ohne zwei abgeschlossene Zyklen ist die Phaseneinteilung geraten.
   *
   * Das steht vor der Fallzahlprüfung, weil es der schwerere Einwand ist: Bei
   * einem einzigen beobachteten Zyklus ist die mittlere Länge diese eine
   * Länge, und die Phasengrenzen sind dann keine Schätzung, sondern ein Echo
   * der Daten, an denen sie geprüft werden.
   */
  if (!belastbar(tage)) {
    return {
      urteil: 'unklar',
      phasen,
      pruefbare: 0,
      satz: 'Für einen Vergleich nach Zyklusphase fehlen die Zyklen: Es braucht '
        + 'mindestens zwei vollständig eingetragene, sonst sind die Phasen '
        + 'geraten und nicht geschätzt.',
    };
  }

  if (pruefbare.length < MINDEST_PHASEN) {
    return {
      urteil: 'unklar',
      phasen,
      pruefbare: pruefbare.length,
      satz: 'Bisher ist das nur in einer Phase oder in gar keiner vergleichbar. '
        + 'Aus einer einzelnen Phase folgt nichts über den Zyklus.',
    };
  }

  const sortiert = [...pruefbare].sort((a, b) => b.differenz - a.differenz);
  const staerkste = sortiert[0];
  const schwaechste = sortiert[sortiert.length - 1];
  const spanne = staerkste.differenz - schwaechste.differenz;

  if (spanne >= SPANNE && staerkste.differenz >= MINDEST_WIRKUNG) {
    return {
      urteil: 'wechselt',
      phasen,
      pruefbare: pruefbare.length,
      staerkste,
      schwaechste,
      spanne,
      satz: `In der Phase „${staerkste.name}" fällt das deutlich stärker aus `
        + `(${staerkste.differenz.toFixed(1)} Stufen Unterschied) als in der Phase `
        + `„${schwaechste.name}" (${schwaechste.differenz.toFixed(1)}). Dieselbe `
        + 'Menge, andere Wirkung – das spricht eher für eine wechselnde '
        + 'Empfindlichkeit als für eine Unverträglichkeit.',
    };
  }

  return {
    urteil: 'gleich',
    phasen,
    pruefbare: pruefbare.length,
    staerkste,
    schwaechste,
    spanne,
    satz: 'Über die Zyklusphasen hinweg fällt das ähnlich aus. Der Zyklus '
      + 'erklärt hier also nichts – was gegen ihn spricht und für das Essen.',
  };
}

/**
 * Und dieselbe Frage einmal ohne Essen: Ist eine Phase für sich schon schlimmer?
 *
 * js/zyklus.js liefert dazu die Zahlen, aber bewusst kein Urteil. Hier steht
 * es, mit denselben zwei Bedingungen: zwei vollständige Zyklen, und genug Tage
 * in beiden verglichenen Phasen.
 */
export function phasenUrteil(bilanz, tage, mindestTage = 5) {
  const brauchbar = (bilanz || []).filter((p) => p.tage >= mindestTage);
  if (!belastbar(tage) || brauchbar.length < 2) {
    return {
      pruefbar: false,
      satz: 'Ob eine Zyklusphase für sich schlimmer ist, lässt sich noch nicht '
        + 'sagen – dafür fehlen entweder Zyklen oder Tage in den einzelnen Phasen.',
    };
  }
  const sortiert = [...brauchbar].sort((a, b) => b.schnitt - a.schnitt);
  const schlimm = sortiert[0];
  const mild = sortiert[sortiert.length - 1];
  const spanne = schlimm.schnitt - mild.schnitt;
  if (spanne < 1) {
    return {
      pruefbar: true,
      deutlich: false,
      satz: 'Über die Zyklusphasen hinweg sind die Beschwerden ähnlich stark. '
        + 'Ein Zyklusmuster ist hier nicht zu erkennen.',
    };
  }
  return {
    pruefbar: true,
    deutlich: true,
    schlimm,
    mild,
    spanne,
    satz: `Am stärksten ist es in der Phase „${schlimm.name}" `
      + `(${schlimm.schnitt.toFixed(1)} im Mittel über ${schlimm.tage} Tage), `
      + `am schwächsten in der Phase „${mild.name}" (${mild.schnitt.toFixed(1)} `
      + `über ${mild.tage} Tage). Die Phasen sind aus den eingetragenen `
      + 'Blutungstagen geschätzt.',
  };
}

/**
 * Für die Anzeige: alle Auslöser, deren Wirkung mit dem Zyklus wechselt.
 *
 * Nur die – „ändert sich nicht" ist keine Karte wert, sondern höchstens eine
 * Zeile unter dem einzelnen Fund. Was hier steht, ist die Auskunft, die man
 * sonst nirgends bekommt.
 */
export function wechselnde(bewertet, ids, tage) {
  const raus = [];
  (ids || []).forEach((id) => {
    const w = phasenWirkung(bewertet, id, tage);
    if (w.urteil === 'wechselt') raus.push({ id, ...w });
  });
  return raus.sort((a, b) => b.spanne - a.spanne);
}

/** Für die Anzeige: kurzes Wort zum Urteil. */
export const WECHSEL_WORT = {
  wechselt: 'wechselt mit dem Zyklus',
  gleich: 'über den Zyklus gleich',
  unklar: 'nicht prüfbar',
};
