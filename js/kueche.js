/*
 * Die Küche: was geht und was nicht – als Merkliste, nicht als Rechnung.
 *
 * WARUM DAS HIER UND NICHT IN DER AUSWERTUNG STEHT
 *
 * Diese App konnte bisher nur eine Richtung: was Beschwerden macht. Und sie
 * konnte es erst nach Wochen, ab einer Mindestzahl Fälle, mit Zufallsschranke.
 * Das ist richtig für einen Befund und nutzlos für die Frage, die abends um
 * sieben tatsächlich ansteht:
 *
 *     „Was kann ich jetzt essen, ohne darüber nachzudenken?"
 *
 * Darauf antwortet keine Statistik rechtzeitig. Wer eine Gastritis hat und auf
 * die meisten Sachen keinen Appetit, hat nach drei Tagen eine klare Vorstellung
 * davon, was geht – nur steht sie nirgends, und beim nächsten Einkauf fängt
 * das Überlegen wieder von vorn an.
 *
 * Deshalb: keine Fallzahl, keine Schwelle, kein Urteil. Zwei Listen, die man
 * selbst füllt. Das Gegenstück zu allem anderen in dieser App – und das Stück,
 * das vom ersten Tag an etwas wert ist.
 *
 * WAS DIE APP TROTZDEM BEITRÄGT
 *
 * Sobald die Auswertung genug Material hat, kann sie der eigenen Liste
 * widersprechen: „Du hast Haferbrei als ‚geht gut‘ notiert, nach Mahlzeiten
 * damit war es aber auffällig schlechter." Dieser Widerspruch ist das
 * Wertvollste, was hier herauskommen kann – er zeigt genau die Stelle, an der
 * jemand sich täuscht, und zwar in der Richtung, die er selbst nicht sieht.
 *
 * Er wird deshalb gezeigt und nicht aufgelöst. Die App überschreibt die Liste
 * nicht und streicht nichts durch: Was jemand über seinen eigenen Körper weiß,
 * hat Vorrang vor achtzehn Mahlzeiten Datenlage. Sie sagt nur, dass beides
 * nicht zusammenpasst.
 */

/**
 * Die beiden Listen.
 *
 * „Geht nicht" ist bewusst dabei, obwohl die Auswertung Auslöser ohnehin
 * sucht: Was jemand sicher weiß, muss er nicht erst herausrechnen lassen.
 * Eine App, die auf ihrer eigenen Rechnung besteht, wo längst eine Antwort da
 * ist, macht sich lästig.
 */
export const KUECHEN_ARTEN = [
  {
    id: 'geht',
    name: 'Geht gut',
    frage: 'Was verträgst du, worauf hast du Appetit?',
    icon: '👍',
  },
  {
    id: 'nicht',
    name: 'Geht nicht',
    frage: 'Was lässt du lieber weg?',
    icon: '👎',
  },
];

/** Höchstens so viele je Liste – darüber findet niemand mehr etwas wieder. */
export const JE_LISTE = 40;

/** Länger nimmt kein Eintrag an. Eine Merkliste, kein Rezeptbuch. */
export const MAX_NAME = 60;

/**
 * Ab wann die Auswertung der Liste überhaupt widersprechen darf.
 *
 * Dieselbe Zurückhaltung wie überall sonst: Eine Zeile ohne genug Fälle sagt
 * nichts, und jemandem seine eigene Erfahrung mit vier Mahlzeiten Datenlage
 * auszureden wäre schlimmer als zu schweigen.
 */
export function widersprechendeFunde(kueche, bilanz, namen) {
  if (!Array.isArray(kueche) || !Array.isArray(bilanz)) return [];

  /*
   * Verglichen wird über den Namen, kleingeschrieben und ohne Ränder.
   *
   * Grob, und mit Absicht: Die Liste ist frei getippt („Haferbrei"), die
   * Auswertung kennt Kennungen („hafer"). Ein unscharfer Abgleich fände mehr
   * und läge öfter daneben – und ein falscher Widerspruch ist hier teurer als
   * ein übersehener. Wer „Haferbrei mit Banane" notiert, bekommt keinen
   * Hinweis; das ist besser, als ihm die Banane auszureden.
   */
  const schluessel = (t) => String(t || '').trim().toLowerCase();
  const nachName = new Map();
  bilanz.forEach((z) => {
    const name = namen(z.id);
    if (name) nachName.set(schluessel(name), z);
  });

  const treffer = [];
  kueche.forEach((e) => {
    const z = nachName.get(schluessel(e.name));
    if (!z || !z.genug) return;

    /*
     * Nur der *deutliche* Widerspruch, und nur in beide Richtungen echt:
     *
     *   „geht gut"  + die Auswertung sieht es auffällig schlechter
     *   „geht nicht" + die Auswertung sieht keinen Unterschied
     *
     * Die zweite Richtung ist die freundlichere und wird oft vergessen: Wer
     * sich etwas verbietet, das gar nichts macht, isst ohne Grund enger.
     */
    if (e.art === 'geht' && z.differenz >= 1) {
      treffer.push({ ...e, zeile: z, richtung: 'schlechter' });
    } else if (e.art === 'nicht' && Math.abs(z.differenz) < 0.5) {
      treffer.push({ ...e, zeile: z, richtung: 'unauffaellig' });
    }
  });
  return treffer;
}

/** Der Satz zu einem Widerspruch – je Richtung einer, beide ohne Urteil. */
export function widerspruchsSatz(t) {
  const n = t.zeile.faelle;
  if (t.richtung === 'schlechter') {
    return `Nach den ${n} Mahlzeiten damit war es im Schnitt `
      + `${t.zeile.differenz.toFixed(1).replace('.', ',')} Stufen schlechter als sonst. `
      + 'Das muss nicht heißen, dass du dich irrst – vielleicht isst du es an '
      + 'Tagen, an denen ohnehin wenig geht. Aber es ist einen Blick wert.';
  }
  return `Aus ${n} Mahlzeiten damit lässt sich kein Unterschied erkennen. `
    + 'Vielleicht lohnt ein Versuch, es wieder zu probieren – wer etwas '
    + 'weglässt, das nichts macht, isst ohne Grund enger.';
}
