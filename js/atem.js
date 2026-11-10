/*
 * Atemübungen – die Daten dazu, nicht der Ablauf.
 *
 * Warum in einem Magentagebuch, und nur so viel, wie die Quellen tragen:
 * gesund.bund.de, Stress (Stand 14.01.2026): Bei einer akuten Stressreaktion
 * werden Vorgänge zurückgefahren, „Das betrifft unter anderem die Magen-,
 * Darm- und Blasentätigkeit", und „Tiefes Ein- und Ausatmen kann die
 * Entspannung fördern." Schlafstörungen (Stand 04.04.2025, „Wie wird eine
 * Schlafstörung behandelt?"): Atemübungen stehen unter den Methoden, „deren
 * Wirksamkeit jedoch nicht hinreichend untersucht ist". Zu 4–7–8 und zur
 * Quadrat-Atmung: „popularly promoted by psychotherapists but have little
 * empirical support" (Marchant et al., Appl Psychophysiol Biofeedback
 * 2025;50(2):261-276, PMID 39864026, Abstract).
 *
 * Bis zur Fassung 29 stand hier und in den Texten der Übungen, langes
 * Ausatmen schalte „messbar" auf den Teil des Nervensystems um, unter dem der
 * Darm arbeitet, es sei „das Mittel, das man ohne Rezept und ohne
 * Nebenwirkung hat", „der Wirkstoff", „direkt auf den Bauch, bei Druck und
 * Krämpfen", das Zwerchfell „massiert", und umgekehrtes Atmen „täte das
 * Gegenteil". Das trägt keine dieser Quellen; die Texte beschreiben jetzt
 * nur, was die Übung ist.
 *
 * Reine Daten, keine Abhängigkeiten. Wer die Übung *ausführt*, ist js/app.js;
 * getaktet wird sie mit den Tönen aus js/klang.js.
 */

/**
 * Eine Übung besteht aus Phasen. `sek: 0` heißt: Phase fällt weg.
 *
 * `runden` ist der Vorschlag, nicht die Vorschrift – wer mehr will, stellt um.
 */
export const UEBUNGEN = [
  {
    id: '478',
    name: '4–7–8',
    zweck: 'Mit langem Ausatmen',
    beschreibung: 'Vier Sekunden durch die Nase ein, sieben halten, acht durch '
      + 'den Mund aus. Wird das Halten unangenehm, lässt sich die Übung jederzeit '
      + 'abbrechen.',
    runden: 4,
    phasen: [
      { art: 'ein', sek: 4, wort: 'Einatmen' },
      { art: 'halten', sek: 7, wort: 'Halten' },
      { art: 'aus', sek: 8, wort: 'Ausatmen' },
    ],
  },
  {
    id: 'box',
    name: 'Quadrat',
    zweck: 'Vier gleich lange Abschnitte',
    beschreibung: 'Vier ein, vier halten, vier aus, vier halten – der gleiche '
      + 'Takt in alle vier Richtungen.',
    runden: 6,
    phasen: [
      { art: 'ein', sek: 4, wort: 'Einatmen' },
      { art: 'halten', sek: 4, wort: 'Halten' },
      { art: 'aus', sek: 4, wort: 'Ausatmen' },
      { art: 'halten', sek: 4, wort: 'Halten' },
    ],
  },
  {
    id: 'kohaerenz',
    name: 'Gleichmaß',
    // 5,5 s ein und 5,5 s aus sind 11 s je Atemzug, also 60/11 ≈ 5,5 in der
    // Minute; bis zur Fassung 30 stand hier „gut sechs".
    zweck: 'Ohne Halten, etwa fünfeinhalb Atemzüge in der Minute',
    beschreibung: 'Fünfeinhalb Sekunden ein, fünfeinhalb aus. '
      + 'Unauffällig genug für den Bus.',
    runden: 10,
    phasen: [
      { art: 'ein', sek: 5.5, wort: 'Einatmen' },
      { art: 'aus', sek: 5.5, wort: 'Ausatmen' },
    ],
  },
  {
    id: 'bauch',
    name: 'Bauchatmung',
    zweck: 'Mit der Hand auf dem Bauch',
    beschreibung: 'Eine Hand auf den Bauch, vier Sekunden so einatmen, dass sich '
      + 'die Hand hebt und nicht die Schulter, sechs Sekunden aus.',
    runden: 8,
    phasen: [
      { art: 'ein', sek: 4, wort: 'Einatmen, Bauch hebt sich' },
      { art: 'aus', sek: 6, wort: 'Ausatmen, Bauch senkt sich' },
    ],
  },
];

const MAP = Object.fromEntries(UEBUNGEN.map((u) => [u.id, u]));

export function uebungVon(id) {
  return MAP[id] || UEBUNGEN[0];
}

/** Wie lange eine Runde dauert, in Sekunden. */
export function rundenDauer(uebung) {
  return uebung.phasen.reduce((s, p) => s + p.sek, 0);
}

/** Die ganze Übung, in Sekunden – für die Anzeige „etwa 2 Minuten". */
export function gesamtDauer(uebung, runden) {
  return rundenDauer(uebung) * (runden || uebung.runden);
}

export function dauerText(sekunden) {
  const m = Math.round(sekunden / 60);
  if (sekunden < 90) return `${Math.round(sekunden)} Sekunden`;
  return `${m} Minuten`;
}

/**
 * Der Ablauf als flache Liste: jede Phase jeder Runde, einmal ausgerollt.
 *
 * Ausgerollt statt gerechnet, weil der Ablauf dadurch selbst zum Prüfgegenstand
 * wird – man kann ihn ansehen und nachzählen, statt einer Schleife zu glauben.
 */
export function ablauf(uebung, runden) {
  const n = runden || uebung.runden;
  const schritte = [];
  for (let r = 1; r <= n; r++) {
    uebung.phasen.forEach((p, i) => {
      schritte.push({
        runde: r,
        von: n,
        art: p.art,
        wort: p.wort,
        sek: p.sek,
        letzte: r === n && i === uebung.phasen.length - 1,
      });
    });
  }
  return schritte;
}
