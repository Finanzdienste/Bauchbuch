/*
 * Vorschläge für heute – hergeleitet, nicht ausgedacht.
 *
 * Jeder Vorschlag trägt ein `warum`, und das ist keine Höflichkeit: Ein Rat
 * ohne Begründung ist ein Befehl, und Befehle über das eigene Essen befolgt man
 * entweder blind oder gar nicht. Beides ist schlecht. Steht daneben „weil es
 * nach deinen letzten 14 Mahlzeiten mit Kaffee im Mittel schlechter war",
 * kann man widersprechen – und genau das soll möglich sein.
 *
 * Zwei Quellen, sauber getrennt und in der Anzeige unterscheidbar:
 *
 *   'eigen'      Kommt aus ihren eigenen Eintragungen. Belastbar, soweit die
 *                Fallzahl reicht, und die steht dabei.
 *   'allgemein'  Kommt aus dem, was bei Magenbeschwerden üblicherweise
 *                empfohlen wird. Gilt für einen Durchschnitt, den es nicht
 *                gibt – deshalb immer nachrangig hinter dem eigenen Verlauf.
 *
 * WAS HIER NICHT VORKOMMT: welches Medikament sie nehmen soll. Diese Wahl
 * hängt an Diagnose, anderen Medikamenten, Nieren, Leber, Schwangerschaft –
 * nichts davon weiß diese App, und keines davon kann sie erfragen, ohne so zu
 * tun, als wüsste sie es dann. Was stattdessen kommt: was sie selbst
 * eingenommen hat, wann zuletzt, und die Frage dazu für den nächsten Termin.
 */
import { UMSTAND_IDS, ausloeserName } from './daten.js';
import { einstufung, tagesWert } from './auswertung.js';
import { phaseVon, phasenName } from './zyklus.js';

/**
 * Was bei gereiztem Magen üblicherweise gut vertragen wird.
 *
 * Bewusst kurz und bewusst langweilig. Das ist keine Diät und keine
 * Empfehlung auf Dauer – wer wochenlang nur das isst, isst zu einseitig.
 * Gedacht für die zwei, drei Tage, an denen ohnehin nichts anderes geht.
 */
export const SCHONKOST = [
  'Haferbrei mit Wasser', 'Kartoffeln, gestampft', 'gedünstete Karotte oder Zucchini',
  'Reis', 'Banane', 'mageres Geflügel oder Fisch', 'Zwieback',
  'Kamillen- oder Fencheltee', 'stilles Wasser',
];

const rat = (id, bereich, titel, text, warum, quelle) => ({
  id, bereich, titel, text, warum, quelle,
});

/*
 * Vorsicht beim Essen – wenn ein ADHS-Mittel den Appetit nehmen kann.
 *
 * Die Vorschläge zum Essen sagen „weniger davon" oder „früher". Bei jemandem,
 * der ein ADHS-Mittel nimmt und dabei abnimmt oder tagsüber keinen Appetit
 * hat, ist das der falsche Rat: Weniger Appetit steht etwa bei Methylphenidat
 * und Lisdexamfetamin unter den häufigsten Nebenwirkungen (siehe die Texte in
 * ADHS_MITTEL, js/mittel.js), und eine späte Mahlzeit ist dann womöglich die
 * einzige, die gelingt. Was gegessen wird, wägt in diesem Fall die Praxis ab.
 *
 *   'bremse'  Schalter ADHS an, eine Einnahme in den letzten 14 Tagen, und
 *             ungewollt abgenommen oder „Kein Appetit" an mindestens 3 der
 *             letzten 7 Bauch-Tage: „Heute eher ohne …" und „Die letzte
 *             Mahlzeit früher legen" entfallen.
 *   'zusatz'  Schalter und Einnahme, sonst nichts: „Die letzte Mahlzeit früher
 *             legen" bekommt einen Satz dazu.
 *
 * Berechnet wird das in js/app.js (ratKarte) und hier nur gelesen – diese
 * Datei bleibt rein und kennt keinen Schalter.
 */
export const ESSEN_VORSICHT = ['bremse', 'zusatz'];

const SPAET_ZUSATZ = 'Wenn der Appetit tagsüber fehlt und erst abends kommt, ist die späte Mahlzeit '
  + 'vielleicht nötig – das wägt die Praxis ab, nicht diese Karte.';

/**
 * @param {object} d
 *   eintraege, tage, heute (ISO), bilanz (aus ausloeserBilanz),
 *   faktoren ({stress, schlaf, stimmung, bewegung} aus faktorenBilanz),
 *   phasen (aus phasenBilanz), eigene (eigene Auslöser),
 *   letzteMahlzeitStunden (Zahl oder null), mittel (zuletzt eingenommene),
 *   essenVorsicht ('bremse', 'zusatz' oder nichts – siehe ESSEN_VORSICHT)
 */
export function raete(d) {
  const raus = [];
  const heute = tagesWert(d.eintraege, d.heute, d.tage);
  const heuteWert = heute.wert;
  /*
   * Ob für heute überhaupt etwas dasteht – und nicht nur, ob der Wert 0 ist.
   *
   * `tagesWert` liefert für einen leeren Tag 0, und das ist richtig gerechnet:
   * Es gibt keine Beschwerde. Es heißt aber nicht, dass keine da war. Wer
   * daraus einen Rat ableitet, sagt jemandem am Morgen, bevor irgendetwas
   * eingetragen ist, wie es ihm heute geht.
   */
  const heuteNotiert = heute.notiert;
  // Steht heute schon etwas, das über den Bauch nichts sagt – ein
  // Kopfschmerz, eine Aktivität –, wäre „noch nichts im Tagebuch" falsch.
  // Gesagt wird dann, wozu nichts dasteht.
  const heuteAnderes = !heuteNotiert && (d.eintraege || []).some((e) => e.am === d.heute);
  const heuteTag = d.tage[d.heute] || {};
  const akut = heuteWert >= 6;
  const leicht = heuteWert > 0 && heuteWert < 6;

  /* ---------- Essen ---------- */

  // Was ihr eigener Verlauf hergibt, steht vor allem Allgemeinen. Ohne die
  // Umstände: „Heute eher ohne Auswärts gegessen" ist kein Satz, und für
  // Portion und Uhrzeit gibt es unten eigene Vorschläge.
  const auffaellig = (d.bilanz || [])
    .filter((b) => b.genug && ['auffaellig', 'moeglich'].includes(einstufung(b)))
    .filter((b) => !UMSTAND_IDS.includes(b.id))
    .slice(0, 3);

  const bremse = d.essenVorsicht === 'bremse';

  if (auffaellig.length && !bremse) {
    const namen = auffaellig.map((b) => ausloeserName(b.id, d.eigene)).join(', ');
    raus.push(rat('essen-eigen', 'essen',
      `Heute eher ohne ${namen}`,
      'Nicht für immer streichen – nur an Tagen wie diesem einmal weglassen und '
      + 'schauen, ob es einen Unterschied macht. Ein Auslöser, der sich in zwei '
      + 'Wochen ohne ihn nicht bestätigt, war keiner.',
      auffaellig.map((b) => `${ausloeserName(b.id, d.eigene)}: danach im Mittel `
        + `${b.schnittMit.toFixed(1).replace('.', ',')} statt `
        + `${b.schnittOhne.toFixed(1).replace('.', ',')} `
        + `(${b.faelle} Mahlzeiten damit, ${b.gegenFaelle} ohne)`).join(' · '),
      'eigen'));
  }

  if (akut) {
    raus.push(rat('essen-schon', 'essen',
      'Heute klein und mild',
      `Mehrere kleine Portionen statt zwei großen, und dabei bleiben bei: `
      + `${SCHONKOST.slice(0, 6).join(', ')}.`,
      `Der heutige Wert liegt bei ${heuteWert} von 10.`,
      'allgemein'));
  }

  const spaet = (d.bilanz || []).find((b) => b.id === 'spaet');
  if (spaet && spaet.genug && spaet.differenz >= 1 && !bremse) {
    raus.push(rat('essen-spaet', 'essen',
      'Die letzte Mahlzeit früher legen',
      'Zwischen dem letzten Essen und dem Hinlegen etwa drei Stunden – im Liegen '
      + 'hat der Magen keine Schwerkraft mehr auf seiner Seite.',
      `Nach Mahlzeiten nach 20 Uhr lag der Wert bei `
      + `${spaet.schnittMit.toFixed(1).replace('.', ',')} statt `
      + `${spaet.schnittOhne.toFixed(1).replace('.', ',')} (${spaet.faelle} Fälle).`
      + (d.essenVorsicht === 'zusatz' ? ` ${SPAET_ZUSATZ}` : ''),
      'eigen'));
  }

  const gross = (d.bilanz || []).find((b) => b.id === 'gross');
  if (gross && gross.genug && gross.differenz >= 1) {
    raus.push(rat('essen-portion', 'essen',
      'Lieber öfter und kleiner',
      'Fünf kleine Mahlzeiten belasten weniger als drei große – der Magen muss '
      + 'dann nie viel auf einmal bewegen.',
      `Nach großen Portionen lag der Wert bei `
      + `${gross.schnittMit.toFixed(1).replace('.', ',')} statt `
      + `${gross.schnittOhne.toFixed(1).replace('.', ',')} (${gross.faelle} Fälle).`,
      'eigen'));
  }

  /* ---------- Entspannung ---------- */

  const stress = d.faktoren && d.faktoren.stress;
  const heuteAngespannt = Number(heuteTag.stress) >= 3;
  const schlechtGeschlafen = Number(heuteTag.schlaf) >= 3;

  if (stress && stress.genug && stress.differenz >= 1) {
    raus.push(rat('ruhe-eigen', 'ruhe',
      heuteAngespannt ? 'Heute wäre eine Atemrunde dran' : 'Anspannung ist bei dir ein Faktor',
      'Bei dir hängen Anspannung und Beschwerden messbar zusammen. Langes '
      + 'Ausatmen schaltet auf den Teil des Nervensystems um, unter dem der Darm '
      + 'arbeitet – unter „Ruhe" liegt 4–7–8, gut zwei Minuten.',
      `An angespannten Tagen ${stress.hoch.schnitt.toFixed(1).replace('.', ',')} `
      + `statt ${stress.niedrig.schnitt.toFixed(1).replace('.', ',')} `
      + `(${stress.hoch.tage} gegen ${stress.niedrig.tage} Tage).`,
      'eigen'));
  } else if (heuteAngespannt || akut) {
    raus.push(rat('ruhe-heute', 'ruhe',
      'Zwei Minuten Atmen',
      'Unter „Ruhe": 4–7–8 zum Runterkommen, Gleichmaß fürs Sitzen zwischendurch. '
      + 'Mit Ton, damit die Augen zubleiben können.',
      heuteAngespannt ? 'Du hast heute viel Anspannung eingetragen.'
        : `Der heutige Wert liegt bei ${heuteWert} von 10.`,
      'allgemein'));
  }

  if (schlechtGeschlafen) {
    raus.push(rat('ruhe-schlaf', 'ruhe',
      'Heute Abend 4–7–8 vor dem Schlafen',
      'Die Übung ist ursprünglich fürs Einschlafen gedacht. Vier Runden im Bett, '
      + 'Licht schon aus.',
      'Du hast für heute schlechten Schlaf eingetragen.',
      'allgemein'));
  }

  /* ---------- Sport ---------- */

  raus.push(sportRat(d, {
    heuteWert, heuteNotiert, heuteAnderes, akut, leicht, heuteTag, heuteAngespannt,
  }));

  /* ---------- Medikamente: kein Rat, sondern der Stand ---------- */

  if (d.mittel && d.mittel.length) {
    raus.push(rat('mittel', 'mittel',
      'Was du nimmst',
      d.mittel.map((m) => `${m.name} – zuletzt ${m.zuletzt}`).join(' · ')
      + '. Was die Mittel bewirken, steht unter „Mehr".',
      'Diese App schlägt bewusst kein Medikament vor: Das hängt an Diagnose, '
      + 'anderen Mitteln und Vorerkrankungen, und nichts davon weiß sie. Nimm '
      + 'die Liste mit zum Termin.',
      'allgemein'));
  }

  return raus.filter(Boolean);
}

/**
 * Intensiv oder moderat?
 *
 * Bewegung hilft bei fast allem hier – aber nicht jede Bewegung zu jeder
 * Stunde. Zwei Regeln sind unstrittig genug, um sie hinzuschreiben: nicht
 * intensiv direkt nach dem Essen (im Liegen und Springen kommt hoch, was
 * unten bleiben soll), und nicht intensiv, während es akut weh tut. Alles
 * andere kommt aus ihrem eigenen Verlauf.
 */
function sportRat(d, k) {
  const seitEssen = d.letzteMahlzeitStunden;
  const frischGegessen = seitEssen !== null && seitEssen < 2;
  const phase = phaseVon(d.tage, d.heute);
  const phasenSchlecht = phase && (d.phasen || [])
    .some((p) => p.phase === phase && p.schnitt >= 4 && p.tage >= 4);

  if (k.akut) {
    return rat('sport', 'sport', 'Heute nur spazieren',
      'Bei einem Wert wie heute bringt intensives Training nichts und kann die '
      + 'Beschwerden verstärken. Zwanzig Minuten gehen hilft der Verdauung '
      + 'trotzdem.',
      `Der heutige Wert liegt bei ${k.heuteWert} von 10.`, 'allgemein');
  }
  if (frischGegessen) {
    return rat('sport', 'sport', 'Erst in zwei Stunden intensiv',
      'Jetzt passt ein Spaziergang. Intensives Training kurz nach dem Essen '
      + 'drückt auf den vollen Magen – danach spricht nichts dagegen.',
      `Die letzte Mahlzeit ist ${Math.round(seitEssen * 10) / 10} Stunden her.`,
      'allgemein');
  }
  if (phasenSchlecht) {
    return rat('sport', 'sport', 'Heute eher moderat',
      'Ausdauer in ruhigem Tempo, 30 bis 45 Minuten. In dieser Zyklusphase war '
      + 'es bei dir bisher schwerer – das heißt nicht „gar nichts", sondern '
      + '„nicht auf Zeit".',
      `In der Phase „${phasenName(phase)}" lagen deine Werte höher als sonst.`,
      'eigen');
  }
  if (k.heuteAngespannt) {
    return rat('sport', 'sport', 'Moderate Ausdauer wäre heute richtig',
      'Laufen, Rad, zügiges Gehen in einem Tempo, bei dem Reden noch geht – das '
      + 'baut Anspannung ab, ohne neuen Stress zu machen. Intensive Intervalle '
      + 'tun an einem angespannten Tag das Gegenteil.',
      'Du hast heute viel Anspannung eingetragen.', 'allgemein');
  }
  if (k.leicht) {
    return rat('sport', 'sport', 'Moderat spricht nichts dagegen',
      'Bei leichten Beschwerden ist Bewegung eher hilfreich als schädlich. '
      + 'Intensiv würde ich heute noch nicht ansetzen.',
      `Der heutige Wert liegt bei ${k.heuteWert} von 10.`, 'allgemein');
  }
  /*
   * Der letzte Fall – und die Stelle, an der dieser Rat einmal falsch war.
   *
   * Er sagte „beschwerdefrei und ausgeruht", wenn der Tageswert 0 war, und der
   * Beleg darunter sagte im selben Atemzug „bisher nichts eingetragen". Das
   * sind zwei verschiedene Dinge, und der Unterschied ist das Leitmotiv dieser
   * App: Ein Tag ohne Beschwerden ist etwas anderes als ein Tag ohne
   * Eintragung. Weil ein Tag naturgemäß leer anfängt, erschien der Satz jeden
   * Morgen – auch bei jemandem, der an jedem der letzten Tage eine Sechs
   * eingetragen hatte. Ein Rat, der einem den eigenen Zustand mitteilt, statt
   * ihn zu erfragen, verliert genau das Vertrauen, von dem alles Übrige hier
   * lebt.
   *
   * Also: Steht für heute etwas da, darf der Rat sich darauf berufen. Steht
   * nichts da, sagt er nichts über den Tag, sondern stellt eine Bedingung.
   */
  if (!k.heuteNotiert) {
    const wozu = k.heuteAnderes ? ' zum Bauch' : '';
    return rat('sport', 'sport', 'Wenn es dir heute gut geht, geht auch intensiv',
      `Für heute steht${wozu} noch nichts im Tagebuch, deshalb keine Aussage über den `
      + 'Tag – nur die Regel: An beschwerdefreien Tagen spricht nichts gegen '
      + 'intensives Training, und danach mindestens eine Stunde, bevor du dich '
      + 'hinlegst.',
      `Für heute ist${wozu} noch nichts eingetragen – das heißt nicht, dass nichts war.`,
      'allgemein');
  }

  return rat('sport', 'sport', 'Heute geht auch intensiv',
    'Beschwerdefrei und ausgeruht: Wenn du intensiv trainieren willst, ist heute '
    + 'der Tag dafür. Danach mindestens eine Stunde, bevor du dich hinlegst.',
    'Für heute ist etwas eingetragen, aber keine Beschwerden und keine hohe '
    + 'Anspannung.',
    'allgemein');
}

export const BEREICH_NAME = {
  essen: 'Essen',
  ruhe: 'Ruhe',
  sport: 'Bewegung',
  mittel: 'Medikamente',
};

export const BEREICH_ICON = {
  essen: '🍽️', ruhe: '🌬️', sport: '🚶', mittel: '💊',
};
