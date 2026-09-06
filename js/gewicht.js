/*
 * Das einzige harte Maß
 *
 * WARUM AUSGERECHNET DIE WAAGE
 *
 * Alles andere in dieser App ist Selbstauskunft. „Stärke 6" ist eine
 * Einschätzung, „Blähungen" ein Gefühl, und wie stark etwas war, verschiebt
 * sich mit der Stimmung, mit der Erwartung und mit dem, was gestern war. Das
 * ist kein Mangel – anders geht es bei Bauchbeschwerden nicht –, aber es hat
 * eine Folge: Kein Wert in dieser App lässt sich von außen nachprüfen.
 *
 * Das Gewicht schon. Es ist die eine Zahl, die eine Waage sagt und nicht der
 * Mensch, und ausgerechnet sie ist die klinisch wichtigste, die ein Tagebuch
 * beitragen kann.
 *
 * WAS SIE ENTSCHEIDET
 *
 * Bei Bauchbeschwerden verläuft die entscheidende Grenze zwischen
 * „funktionell" – unangenehm, oft langwierig, aber ohne Schaden – und „da muss
 * jemand nachsehen". Ein ungewollter Gewichtsverlust ist das stärkste einzelne
 * Zeichen, das auf die zweite Seite deutet, und er steht in jeder Leitlinie
 * unter den Alarmzeichen. Fünf Prozent des Körpergewichts in sechs Monaten
 * gilt als die Grenze, ab der nachgesehen wird.
 *
 * Bisher stand das hier nur zum Ankreuzen. Angekreuzt wird es aber von dem,
 * der es schon bemerkt hat – und schleichende Verluste bemerkt niemand.
 *
 * ZWEI DINGE, DIE DIESE DATEI RICHTIG MACHEN MUSS
 *
 *   1. **Nicht auf Wasser hereinfallen.** Ein Mensch schwankt am Tag um ein
 *      bis zwei Kilo, je nach Trinken, Salz, Stuhlgang und Zyklus. Verglichen
 *      werden deshalb keine Einzelwerte, sondern Mittel aus mehreren
 *      Messungen, und zwischen ihnen muss ordentlich Zeit liegen.
 *   2. **Nicht bei jeder Diät Alarm schlagen.** Fünf Prozent weniger sind ein
 *      Warnzeichen, wenn sie *ungewollt* kommen, und ein Erfolg, wenn jemand
 *      dafür gearbeitet hat. Den Unterschied sieht keine Rechnung – deshalb
 *      wird gefragt.
 */

/** Ab hier gilt ein Verlust als abklärungsbedürftig: fünf Prozent. */
const ALARM_ANTEIL = 0.05;

/** In diesem Zeitraum – länger zurück ist eine andere Geschichte. */
const WAAGE_FENSTER = 180;

/** So weit müssen „früher" und „jetzt" auseinanderliegen. */
const MINDEST_ABSTAND = 30;

/** Und so viele Messungen gehen höchstens in ein Mittel ein. */
const JE_SEITE = 3;

const kiloSchnitt = (l) => (l.length ? l.reduce((s, x) => s + x.kg, 0) / l.length : 0);

const tageZwischen = (a, b) => Math.round(
  (new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000,
);

/**
 * Was die Waage über die letzten Monate sagt.
 *
 * @param {object[]} messungen  [{ am, kg }], jüngste zuerst
 * @param {string} heute        ISO-Datum
 * @param {boolean} gewollt     ob gerade absichtlich abgenommen wird
 */
export function gewichtsBild(messungen, heute, gewollt = false) {
  const liste = [...(messungen || [])]
    .filter((g) => g && g.am && Number.isFinite(Number(g.kg)))
    .sort((a, b) => (a.am < b.am ? 1 : -1));

  if (!liste.length) {
    return {
      urteil: 'keine',
      messungen: liste,
      satz: 'Noch nichts gewogen. Alle ein bis zwei Wochen reicht – es ist die '
        + 'einzige Zahl hier, die nicht aus dem Gefühl kommt, und ein '
        + 'ungewollter Verlust ist das wichtigste Zeichen, das ein Tagebuch '
        + 'überhaupt liefern kann.',
    };
  }

  const imFenster = liste.filter((g) => tageZwischen(g.am, heute) <= WAAGE_FENSTER);
  const jetzt = imFenster.slice(0, JE_SEITE);
  const aktuell = kiloSchnitt(jetzt);

  /*
   * „Früher" sind die ältesten Messungen im Fenster – aber nur, wenn sie weit
   * genug zurückliegen. Zwei Wiegungen aus derselben Woche zu vergleichen
   * misst den Wasserhaushalt, nicht den Verlauf.
   */
  const weitGenug = imFenster.filter((g) => tageZwischen(g.am, jetzt[0].am) >= MINDEST_ABSTAND);
  const frueher = weitGenug.slice(-JE_SEITE);

  if (!frueher.length) {
    return {
      urteil: 'zu-kurz',
      messungen: liste,
      aktuell,
      satz: `Zuletzt ${aktuell.toFixed(1)} kg. Für eine Richtung braucht es `
        + `Messungen, die mindestens ${MINDEST_ABSTAND} Tage auseinanderliegen – `
        + 'darunter misst man Wasser und nicht den Verlauf.',
    };
  }

  const davor = kiloSchnitt(frueher);
  const differenz = aktuell - davor;
  const anteil = davor ? differenz / davor : 0;
  const spanne = tageZwischen(frueher[frueher.length - 1].am, jetzt[0].am);

  const grundlage = `${aktuell.toFixed(1)} kg zuletzt gegen ${davor.toFixed(1)} kg `
    + `vor gut ${Math.round(spanne / 30)} Monaten `
    + `(${jetzt.length} gegen ${frueher.length} Messungen).`;

  if (anteil <= -ALARM_ANTEIL) {
    /*
     * Der Fall, für den das Ganze da ist. Und die Frage, die ihn entscheidet,
     * kann die App nicht selbst beantworten – deshalb steht die Antwort des
     * Menschen mit im Urteil und nicht bloß im Text.
     */
    return {
      urteil: gewollt ? 'verlust-gewollt' : 'verlust',
      messungen: liste,
      aktuell,
      davor,
      differenz,
      anteil,
      spanne,
      warnung: !gewollt,
      satz: gewollt
        ? `${grundlage} Das sind ${Math.abs(anteil * 100).toFixed(0)} Prozent – `
          + 'du hast angegeben, dass das so gewollt ist, deshalb steht hier kein '
          + 'Warnzeichen. Sollte sich das ändern, stell es unter „Mehr" um.'
        : `${grundlage} Das sind ${Math.abs(anteil * 100).toFixed(0)} Prozent `
          + 'weniger. Ein ungewollter Verlust ab fünf Prozent gehört ärztlich '
          + 'abgeklärt – das ist keine Diagnose, sondern die Grenze, ab der '
          + 'nachgesehen wird. Wenn du absichtlich abnimmst, sag es der App '
          + 'unter „Mehr", dann hört sie damit auf.',
    };
  }

  if (anteil >= ALARM_ANTEIL) {
    return {
      urteil: 'zunahme',
      messungen: liste,
      aktuell,
      davor,
      differenz,
      anteil,
      spanne,
      satz: `${grundlage} Das sind ${(anteil * 100).toFixed(0)} Prozent mehr. `
        + 'Kein Alarmzeichen – aber eine Zahl, die zum übrigen Bild gehört.',
    };
  }

  return {
    urteil: 'stabil',
    messungen: liste,
    aktuell,
    davor,
    differenz,
    anteil,
    spanne,
    satz: `${grundlage} Das Gewicht ist damit stabil, und das ist bei `
      + 'Bauchbeschwerden eine gute Nachricht: Der wichtigste Hinweis darauf, '
      + 'dass mehr dahintersteckt, ist ein ungewollter Verlust.',
  };
}

/** Für die Anzeige: das Urteil in einem Wort. */
export const GEWICHT_WORT = {
  verlust: 'deutlich weniger',
  'verlust-gewollt': 'weniger, wie gewollt',
  zunahme: 'deutlich mehr',
  stabil: 'stabil',
  'zu-kurz': 'noch keine Richtung',
  keine: 'nichts gewogen',
};
