/*
 * Die ersten Wochen – oder: wie man „noch nicht" sagt, ohne zehnmal nein zu sagen
 *
 * WAS HIER SCHIEFLIEF
 *
 * Am fünften Tag hatte der Muster-Reiter über neuntausend Zeichen, und der weit
 * überwiegende Teil davon war eine Absage: „noch nichts Belastbares", „fehlt
 * noch Material", „ab etwa zwei Wochen", „noch keine Klasse mit genug Fällen",
 * „zu wenige", „zählt noch". Zehn Karten, die alle dasselbe sagten.
 *
 * Jede einzelne davon war richtig – daran ändert sich nichts, und daran soll
 * sich nichts ändern. Aber die Menge war das Problem, und zwar ausgerechnet in
 * den Wochen, die über alles Weitere entscheiden. Im README dieses Projekts
 * steht der Satz: „Das größte Risiko für ein Tagebuch ist nicht ein Fehler in
 * der Auswertung, sondern dass nach drei Wochen niemand mehr etwas einträgt."
 * Genau dagegen arbeitete dieser Reiter.
 *
 * WAS STATTDESSEN
 *
 * Dieselbe Auskunft, einmal statt zehnmal – und in die andere Richtung
 * formuliert. Nicht „dafür reicht es noch nicht", sondern „dafür fehlen noch
 * vier Tage". Das ist kein Schönreden: Die Zahlen sind dieselben, die Schwellen
 * sind dieselben, und was noch nicht gesagt werden kann, wird weiterhin nicht
 * gesagt. Es steht nur als Ziel da statt als Zurückweisung.
 *
 * WAS DIESE DATEI AUSDRÜCKLICH NICHT TUT
 *
 * Sie schaltet nichts frei und rechnet nichts aus. Die Schwellen stehen dort,
 * wo sie hingehören – in js/bild.js, js/kriterien.js, in den Einstellungen der
 * Bilanz. Hier wird nur nachgesehen, wie weit es noch ist. Und sie verdeckt
 * nichts: Warnzeichen stehen auch am ersten Tag oben, ohne Schwelle und ohne
 * Fortschrittsbalken. Ein einziges Mal Blut ist ein einziges Mal zu viel, und
 * das hat mit Fallzahlen nichts zu tun.
 */

/** Ab so vielen notierten Tagen lohnt der Stufenplan – siehe js/app.js. */
const PLAN_AB = 14;

/**
 * Wie weit ist es noch bis wohin?
 *
 * @param {object} z  { notierteTage, beschwerden, zuordenbar, mahlzeiten,
 *                      naechsteBilanz: {name, faelle, gegen} | null,
 *                      mindestFaelle }
 * @returns {{fertig: boolean, schritte: object[]}}
 */
export function freischaltung(z) {
  const schritte = [];
  const offen = (jetzt, brauch) => Math.max(0, brauch - jetzt);

  /*
   * Die Reihenfolge ist dieselbe wie auf dem Reiter selbst, damit sich die
   * Liste später an derselben Stelle wiederfindet, an der sie versprochen
   * wurde.
   */
  schritte.push({
    id: 'bild',
    titel: 'Die Einordnung deines Musters',
    was: 'wonach das Bild aussieht, in den Worten, die in einer Praxis benutzt werden',
    offen: Math.max(offen(z.notierteTage, 10), offen(z.beschwerden, 5)),
    stand: `${z.notierteTage} von 10 notierten Tagen, ${z.beschwerden} von 5 Eintragungen zu Beschwerden`,
  });

  schritte.push({
    id: 'kriterien',
    titel: 'Rom IV und GerdQ',
    was: 'die Regelwerke, mit denen in der Sprechstunde eingeordnet wird',
    offen: offen(z.notierteTage, 14),
    stand: `${z.notierteTage} von 14 notierten Tagen`,
  });

  /*
   * Die Bilanz hat keine Tagesschwelle, sondern eine je Merkmal: fünf
   * Mahlzeiten damit und fünf ohne. Deshalb steht hier nicht „noch n Tage",
   * sondern der eine Auslöser, der am nächsten dran ist – das ist die Zahl, die
   * sich durch Eintragen tatsächlich bewegt.
   */
  if (z.naechsteBilanz) {
    const b = z.naechsteBilanz;
    schritte.push({
      id: 'bilanz',
      titel: 'Der erste Auslöser mit Zahlen',
      was: 'was nach welchem Essen wie oft kam – verglichen mit deinem eigenen Alltag',
      offen: Math.max(offen(b.faelle, z.mindestFaelle), offen(b.gegen, z.mindestFaelle)),
      stand: `am nächsten dran: ${b.name} – ${b.faelle} Mahlzeiten damit, `
        + `${b.gegen} ohne, gebraucht werden je ${z.mindestFaelle}`,
    });
  } else {
    schritte.push({
      id: 'bilanz',
      titel: 'Der erste Auslöser mit Zahlen',
      was: 'was nach welchem Essen wie oft kam – verglichen mit deinem eigenen Alltag',
      offen: Math.max(1, z.mindestFaelle - z.mahlzeiten),
      stand: `${z.mahlzeiten} Mahlzeiten eingetragen; je Merkmal braucht es `
        + `${z.mindestFaelle} damit und ${z.mindestFaelle} ohne`,
    });
  }

  schritte.push({
    id: 'plan',
    titel: 'Der Stufenplan',
    was: 'das Verfahren, das am Ende einen Speiseplan hinterlässt statt einer Auskunft',
    offen: offen(z.notierteTage, PLAN_AB),
    stand: `${z.notierteTage} von ${PLAN_AB} notierten Tagen`,
  });

  return { fertig: schritte.every((s) => s.offen === 0), schritte };
}

/**
 * Ein Satz darüber, was als Nächstes dazukommt.
 *
 * Er nennt *eine* Schwelle und nur die. Eine Liste aus vier Entfernungen ist
 * wieder nur eine Wand.
 *
 * Genommen wird die erste offene in der Reihenfolge oben – und ausdrücklich
 * nicht die mit der kleinsten Zahl. Die Zahlen messen Verschiedenes: „noch acht
 * Tage" und „noch fünf Mahlzeiten" lassen sich nicht vergleichen, und wer sie
 * gegeneinander sortiert, sortiert Äpfel gegen Birnen und nennt das Ergebnis
 * dann auch noch „am nächsten dran".
 */
export function naechsteSchwelle(schritte) {
  const naechster = schritte.find((s) => s.offen > 0);
  if (!naechster) return null;
  return { ...naechster, satz: `Als Nächstes: ${naechster.titel} – ${naechster.stand}.` };
}
