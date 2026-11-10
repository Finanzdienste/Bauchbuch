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
 * Mensch.
 *
 * WOZU SIE DA IST
 *
 * Ein deutlicher Gewichtsverlust gehört – neben Blut im Stuhl, Fieber oder
 * Blässe – zu den Zeichen, bei denen es sich eher um andere Darmerkrankungen
 * als einen Reizdarm handeln kann (gesund.bund.de/reizdarmsyndrom, Stand
 * 28.08.2024, „Wie wird ein Reizdarmsyndrom festgestellt?“: „Kommt es zu
 * deutlichem Gewichtsverlust, Blut im Stuhl, Fieber oder Blässe, kann es sich
 * eher um andere Darmerkrankungen handeln.“). Bei Magenkrebs nennt
 * gesund.bund.de/magenkrebs (Stand 22.12.2023) einen „unklaren
 * Gewichtsverlust“ unter den Symptomen, bei denen Ärzte eine Spiegelung
 * empfehlen. Eine Rangfolge der Zeichen gibt keine der Quellen an; bis zur
 * Fassung 29 stand hier, das Gewicht sei „die klinisch wichtigste“ Angabe
 * eines Tagebuchs und der Verlust „das stärkste einzelne Zeichen“ und stehe
 * „in jeder Leitlinie“ – das war nicht belegt.
 *
 * Die fünf Prozent in sechs Monaten sind eine Festlegung dieser App. Als Zahl
 * kommt „≥ 5 % in 6 Monaten“ etwa in der Konsensdefinition der Tumorkachexie
 * vor, die die EMA wiedergibt (Adlumiz, EMA/647868/2017, 2.5.2: „involuntary
 * weight loss of ≥ 5% body weight within 6 months“, nach Fearon et al.
 * 2011); eine allgemeine Grenze, ab der ein Verlust abgeklärt wird, nennen
 * die erreichbaren Quellen nicht.
 *
 * Bisher stand das hier nur zum Ankreuzen. Angekreuzt wird es aber von dem,
 * der es schon bemerkt hat – und schleichende Verluste bemerkt niemand.
 *
 * ZWEI DINGE, DIE DIESE DATEI RICHTIG MACHEN MUSS
 *
 *   1. **Nicht auf einzelne Wiegungen hereinfallen.** Eine einzelne Messung
 *      kann zufällig hoch oder niedrig liegen. Verglichen werden deshalb keine
 *      Einzelwerte, sondern Mittel aus mehreren Messungen, und zwischen ihnen
 *      müssen mindestens MINDEST_ABSTAND Tage liegen – eine Festlegung dieser
 *      App. (Die frühere Angabe, ein Mensch schwanke am Tag um ein bis zwei
 *      Kilo, ließ sich an keiner erreichbaren Quelle prüfen.)
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
      // Quelle zum Gewichtsverlust: gesund.bund.de/reizdarmsyndrom (siehe oben).
      satz: 'Noch nichts gewogen. Das Gewicht ist die einzige Zahl hier, die nicht aus '
        + 'dem Gefühl kommt. Ein deutlicher, ungewollter Gewichtsverlust gehört wie Blut '
        + 'im Stuhl oder Fieber zu den Zeichen, bei denen Bauchbeschwerden eher eine '
        + 'andere Ursache als einen Reizdarm haben können. Eine Richtung zeigt Body Check, '
        + `sobald Messungen mindestens ${MINDEST_ABSTAND} Tage auseinanderliegen.`,
    };
  }

  const imFenster = liste.filter((g) => tageZwischen(g.am, heute) <= WAAGE_FENSTER);
  const jetzt = imFenster.slice(0, JE_SEITE);
  const aktuell = kiloSchnitt(jetzt);

  /*
   * „Früher" sind die ältesten Messungen im Fenster – aber nur, wenn sie weit
   * genug zurückliegen (MINDEST_ABSTAND, eine Festlegung dieser App). Bis zur
   * Fassung 29 stand hier, zwei Wiegungen aus derselben Woche mäßen den
   * Wasserhaushalt – das war nicht belegt.
   */
  const weitGenug = imFenster.filter((g) => tageZwischen(g.am, jetzt[0].am) >= MINDEST_ABSTAND);
  const frueher = weitGenug.slice(-JE_SEITE);

  if (!frueher.length) {
    return {
      urteil: 'zu-kurz',
      messungen: liste,
      aktuell,
      satz: `Zuletzt ${aktuell.toFixed(1)} kg. Eine Richtung zeigt Body Check erst bei `
        + `Messungen, die mindestens ${MINDEST_ABSTAND} Tage auseinanderliegen – so ist `
        + 'die App eingestellt, damit einzelne Wiegungen nicht als Verlauf gelten.',
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
        /*
         * Quellen: gesund.bund.de/reizdarmsyndrom und /magenkrebs (siehe oben).
         * Die fünf Prozent sind die Grenze dieser App, keine Leitliniengrenze.
         */
        : `${grundlage} Das sind ${Math.abs(anteil * 100).toFixed(0)} Prozent `
          + 'weniger. Ein deutlicher, ungewollter Gewichtsverlust gehört zu den Zeichen, '
          + 'die ärztlich abgeklärt werden. Body Check meldet sich ab fünf Prozent – das '
          + 'ist keine Diagnose, sondern die Grenze dieser App. Wenn du absichtlich '
          + 'abnimmst, sag es der App unter „Mehr", dann hört sie damit auf.',
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
      /*
       * Bis zur Fassung 29: „Kein Alarmzeichen“ – eine Entwarnung, die keine
       * Quelle trägt (gesund.bund.de/herzschwaeche, Stand 14.03.2024, nennt etwa
       * eine „Gewichtszunahme aufgrund der Wassereinlagerungen“ als Zeichen).
       * Gerechnet wird wie bisher; nur der Satz sagt nicht mehr, was das heißt.
       */
      satz: `${grundlage} Das sind ${(anteil * 100).toFixed(0)} Prozent mehr. `
        + 'Auch eine Zunahme gehört zum übrigen Bild; einordnen kann sie die Praxis.',
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
    /*
     * Ohne Entwarnung: Die Waage zeigt nur eines der Zeichen, die
     * gesund.bund.de/reizdarmsyndrom nennt (siehe oben). Bis zur Fassung 29:
     * „eine gute Nachricht: Der wichtigste Hinweis … ist ein ungewollter
     * Verlust“ – eine Rangfolge, die keine Quelle angibt.
     */
    satz: `${grundlage} Das Gewicht ist damit stabil. Über andere Zeichen wie Blut im `
      + 'Stuhl, Fieber oder Blässe sagt die Waage nichts.',
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
