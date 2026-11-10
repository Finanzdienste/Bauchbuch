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
 *   'eigen'      Kommt aus den eigenen Eintragungen. Belastbar, soweit die
 *                Fallzahl reicht, und die steht dabei.
 *   'allgemein'  Nicht aus den eigenen Eintragungen gerechnet. Teils Hinweise,
 *                die allgemeine Gesundheitsinformationen bei Magen-Darm-
 *                Beschwerden nennen (Schonkost, kleine Portionen, Bewegung,
 *                Entspannung) – und für vieles davon ist nicht gut
 *                untersucht, ob es hilft: „Ob diese Maßnahmen helfen, ist aber
 *                nicht ausreichend erforscht" (gesund.bund.de, Gastritis,
 *                Stand 13.11.2025, „Nicht medikamentöse Behandlung"); beim
 *                Reizmagen gibt es zur Ernährung „keine verlässlichen
 *                Empfehlungen" (Reizmagensyndrom, Stand 05.02.2026,
 *                Behandlung). Teils der Verweis auf die Atemübungen unter
 *                „Ruhe" und die Liste der eingenommenen Mittel, die kein Rat
 *                ist. Bis zur Fassung 30 stand hier „Deshalb immer nachrangig
 *                hinter dem eigenen Verlauf", und die Fußzeile der Karte sagte
 *                „dein eigener Verlauf sticht das" – unter „allgemein" stehen
 *                aber auch Verweise an die Praxis, und eine Auffälligkeit im
 *                Tagebuch ist kein Beleg (siehe 'essen-eigen' unten). Sortiert
 *                wird nicht nach der Quelle.
 *                Bis zur Fassung 29 hieß es hier „was bei Magenbeschwerden
 *                üblicherweise empfohlen wird" – das traf auf die Atem- und
 *                Sportkarten und auf die Mittelliste nicht zu.
 *
 * WAS HIER NICHT VORKOMMT: welches Medikament jemand nehmen soll. Diese Wahl
 * hängt an Diagnose, anderen Medikamenten, Nieren, Leber, Schwangerschaft –
 * nichts davon weiß diese App, und keines davon kann sie erfragen, ohne so zu
 * tun, als wüsste sie es dann. Was stattdessen kommt: was selbst eingenommen
 * wurde, wann zuletzt, und die Frage dazu für den nächsten Termin.
 *
 * Die Überschriften der Karten beschreiben, worum es geht, statt etwas
 * anzuordnen („Bewegung kurz nach dem Essen" statt „Erst in zwei Stunden
 * intensiv"). Feste Zeiten und Minutenzahlen, die keine Quelle nennt, stehen
 * nicht mehr in den Texten; die Rechnung, wann welche Karte kommt, ist
 * unverändert.
 */
import { UMSTAND_IDS, ausloeserName } from './daten.js';
import { einstufung, tagesWert } from './auswertung.js';
import { phaseVon, phasenName } from './zyklus.js';

/**
 * Was gesund.bund.de bei akuter Magenschleimhautentzündung als Schonkost und
 * bei akutem Durchfall als magenschonend nennt.
 *
 *   Gastritis (Stand 13.11.2025, „Nicht medikamentöse Behandlung"): „Außerdem
 *   wird oft zu Schonkost wie Zwieback oder Haferschleim und Ausruhen
 *   geraten." Und: „Ob diese Maßnahmen helfen, ist aber nicht ausreichend
 *   erforscht."
 *   Durchfall (Stand 08.03.2024, „Wie wird eine Durchfallerkrankung
 *   behandelt?"): „Reis, Bananen oder Zwieback sind magenschonend und werden
 *   ebenfalls häufig bei akutem Durchfall empfohlen."
 *
 * Bis zur Fassung 29 standen hier auch gestampfte Kartoffeln, gedünstete
 * Karotte oder Zucchini, mageres Geflügel oder Fisch, Kamillen- oder
 * Fencheltee und stilles Wasser, und die Karte zeigte davon sechs – ohne den
 * Zwieback. Keine erreichbare Quelle nennt sie so; jetzt steht nur, was die
 * beiden Seiten nennen.
 *
 * Gedacht für akute Tage: Eine akute Gastritis klingt laut derselben Seite
 * „für gewöhnlich … nach ein paar Tagen von selbst wieder ab", akuter
 * Durchfall dauert „meist wenige Tage bis eine Woche". Halten die Beschwerden
 * an, gehört das in die Praxis – das sagt die Karte auch. („Zwei, drei Tage"
 * und „auf Dauer zu einseitig", wie es hier stand, nennt keine Quelle.)
 */
export const SCHONKOST = ['Zwieback', 'Haferschleim', 'Reis', 'Banane'];

const rat = (id, bereich, titel, text, warum, quelle) => ({
  id, bereich, titel, text, warum, quelle,
});

/*
 * Vorsicht beim Essen – wenn ein ADHS-Mittel den Appetit nehmen kann.
 *
 * Die Vorschläge zum Essen sagen „weniger davon" oder „früher". Bei jemandem,
 * der ein ADHS-Mittel nimmt und dabei abnimmt oder tagsüber keinen Appetit
 * hat, ist das der falsche Rat: Weniger Appetit steht in den Fachinformationen
 * mancher ADHS-Mittel unter den sehr häufigen Nebenwirkungen (Belege unten bei
 * SPAET_ZUSATZ und in ADHS_MITTEL, js/mittel.js). Was gegessen wird, wägt in
 * diesem Fall die Praxis ab.
 *
 *   'bremse'  Schalter ADHS an, eine Einnahme in den letzten 14 Tagen, und
 *             ungewollt abgenommen oder „Kein Appetit" an mindestens 3 der
 *             letzten 7 Bauch-Tage: „Auffällig in deinem Verlauf: …" (auch
 *             in der Form „Möglicherweise auffällig …") und „Spätes Essen und
 *             Liegen" entfallen.
 *   'zusatz'  Schalter und Einnahme, sonst nichts: „Spätes Essen und Liegen"
 *             bekommt einen Satz dazu.
 *
 * Berechnet wird das in js/app.js (ratKarte) und hier nur gelesen – diese
 * Datei bleibt rein und kennt keinen Schalter.
 */
export const ESSEN_VORSICHT = ['bremse', 'zusatz'];

/*
 * Der Satz dazu sagt nur, was die Fachinformationen hergeben.
 *
 * „Verminderter Appetit – Sehr häufig" (Elvanse, www.fachinfo.de/fi/pdf/
 * 020737, Stand Oktober 2026, 4.8) und „Appetitverlust – Sehr häufig"
 * (Ritalin LA, www.fachinfo.de/fi/pdf/010445, Stand September 2025, 4.8);
 * dazu Elvanse 4.4, bei Erwachsenen: „Das Körpergewicht ist unter der
 * Behandlung mit Stimulanzien zu überwachen". Dass der Appetit tagsüber fehle
 * und erst abends komme und die späte Mahlzeit deshalb „vielleicht nötig"
 * sei, wie es bis zur Fassung 29 hieß, steht in keiner der beiden. Ritalin LA
 * 4.2 („Laufende Überwachung"): „Das Wachstum (bei Kindern), das
 * Körpergewicht, sowie der psychische und der kardiovaskuläre Status sollten
 * kontinuierlich überwacht werden".
 *
 * Mit den Präparaten, nicht mit den Wirkstoffen: „bei Methylphenidat sehr
 * häufig" wäre für Equasym Retard falsch – dort steht „Häufig – Anorexie,
 * Appetitverlust" (www.fachinfo.de/fi/pdf/012100, Stand Juni 2026, 4.8;
 * siehe die Leitregeln in js/mittel.js).
 */
const SPAET_ZUSATZ = 'Weniger Appetit steht etwa in den Fachinformationen von Ritalin LA und Elvanse '
  + 'unter den sehr häufigen Nebenwirkungen, und das Gewicht wird dabei ärztlich beobachtet. Wann '
  + 'gegessen wird, wägt deshalb die Praxis ab, nicht diese Karte.';

/*
 * Bewegung und Reflux – derselbe Satz auf mehreren Karten.
 *
 * gesund.bund.de, Sodbrennen und Refluxkrankheit (Stand 04.04.2025,
 * Ursachen): „Auch nach körperlicher Anstrengung oder durch bestimmte
 * Körperhaltungen, etwa beim Bücken oder Liegen, können vermehrt Probleme
 * auftreten."
 */
const REFLUX_ANSTRENGUNG = 'Bei Reflux können nach körperlicher Anstrengung und beim Bücken oder Liegen '
  + 'vermehrt Beschwerden auftreten.';

/*
 * Für Erwachsene bis 65 nennt gesund.bund.de, Gesund durch Bewegung (Stand
 * 25.11.2025), „mindestens 150 Minuten mäßig anstrengende … Bewegung …
 * – oder mindestens 75 Minuten anstrengende körperliche Aktivität" in der
 * Woche, und bei chronischen Erkrankungen: „das Trainingsprogramm vorab mit
 * der behandelnden Ärztin oder dem behandelnden Arzt abzusprechen".
 */
const BEWEGUNG_RICHTWERT = 'Die allgemeinen Richtwerte für Erwachsene nennen auch anstrengende Bewegung; '
  + 'bei Reflux können danach vermehrt Beschwerden auftreten.';
const BEWEGUNG_PRAXIS = 'Welche Bewegung für dich passt, kann die Praxis einschätzen.';

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

  // Was der eigene Verlauf hergibt, steht vor allem Allgemeinen. Ohne die
  // Umstände: „Auswärts gegessen" ist keine Zutat, und für Portion und
  // Uhrzeit gibt es unten eigene Vorschläge.
  const auffaellig = (d.bilanz || [])
    .filter((b) => b.genug && ['auffaellig', 'moeglich'].includes(einstufung(b)))
    .filter((b) => !UMSTAND_IDS.includes(b.id))
    .slice(0, 3);

  const bremse = d.essenVorsicht === 'bremse';

  if (auffaellig.length && !bremse) {
    /*
     * Der Titel mit demselben Wort wie die Auslöserliste unter „Muster"
     * (EINSTUFUNG_WORT in js/auswertung.js): 'auffaellig' heißt dort
     * „auffällig", 'moeglich' nur „möglicherweise". Bis zur Fassung 30 stand
     * über beiden „Auffällig in deinem Verlauf" – derselbe Fund wäre auf
     * „Für heute" höher eingestuft gewesen als unter „Muster". Welche Zeilen
     * auf die Karte kommen, ist unverändert.
     */
    const namenVon = (liste) => liste.map((b) => ausloeserName(b.id, d.eigene)).join(', ');
    const sicher = auffaellig.filter((b) => einstufung(b) === 'auffaellig');
    const vielleicht = auffaellig.filter((b) => einstufung(b) === 'moeglich');
    let titel;
    if (!vielleicht.length) titel = `Auffällig in deinem Verlauf: ${namenVon(sicher)}`;
    else if (!sicher.length) titel = `Möglicherweise auffällig in deinem Verlauf: ${namenVon(vielleicht)}`;
    else titel = `Auffällig in deinem Verlauf: ${namenVon(sicher)}; möglicherweise auch ${namenVon(vielleicht)}`;
    /*
     * Was ein Tagebuch dabei kann und was nicht. gesund.bund.de,
     * Reizmagensyndrom (Stand 05.02.2026): „durch das Führen eines
     * Beschwerde-Tagebuchs herauszufinden, ob bestimmte Lebensmittel die
     * Symptome auslösen"; sicher festgestellt wird eine Unverträglichkeit
     * aber im Test, bei einer Allergie mit einem Provokationstest „unter
     * ärztlicher Beobachtung" (Laktoseintoleranz, Stand 23.02.2026;
     * Nahrungsmittelallergie, Stand 27.05.2024, Diagnose). Bis zur
     * Fassung 29 stand hier „Ein Auslöser, der sich in zwei Wochen ohne ihn
     * nicht bestätigt, war keiner" – diese Frist und diesen Schluss nennt
     * keine Quelle.
     *
     * Die Karte rät auch nicht zum Weglassen. Bis zur Fassung 30 hieß sie
     * „Heute eher ohne …", mit „an Tagen wie diesem einmal weglassen und im
     * Tagebuch schauen"; die Quellen oben tragen das Tagebuch, keinen Rat zum
     * Weglassen – zur Ernährung beim Reizmagen heißt es dort sogar: „Deshalb
     * gibt es dazu keine verlässlichen Empfehlungen." Wie der Auslassversuch
     * in js/luecken.js und versuchTeil in js/app.js verweist die Karte deshalb
     * an die Praxis. Dass der Bauchwert danach höher lag, ist die Bedingung,
     * unter der die Karte überhaupt steht (einstufung in js/auswertung.js:
     * Unterschied mindestens eine Stufe).
     */
    raus.push(rat('essen-eigen', 'essen',
      titel,
      'Danach lag dein Bauchwert im Mittel höher als ohne. Ob ein Lebensmittel '
      + 'wirklich der Auslöser ist, lässt sich aus dem Tagebuch allein nicht sicher '
      + 'sagen; ob ein Auslassversuch für dich sinnvoll ist, lässt sich in der Praxis '
      + 'besprechen.',
      auffaellig.map((b) => `${ausloeserName(b.id, d.eigene)}: danach im Mittel `
        + `${b.schnittMit.toFixed(1).replace('.', ',')} statt `
        + `${b.schnittOhne.toFixed(1).replace('.', ',')} `
        + `(${b.faelle} Mahlzeiten damit, ${b.gegenFaelle} ohne)`).join(' · '),
      'eigen'));
  }

  if (akut) {
    // Quellen bei SCHONKOST oben. Ein Tageswert ab 6 ist keine Diagnose
    // „Gastritis" – deshalb nennt der Text, wofür die Seiten das schreiben.
    raus.push(rat('essen-schon', 'essen',
      'Schonkost an Tagen mit starken Beschwerden',
      'Bei akuter Magenschleimhautentzündung wird laut gesund.bund.de oft zu '
      + 'kleinen Portionen und Schonkost wie Zwieback oder Haferschleim geraten – '
      + 'ob das hilft, ist nicht ausreichend erforscht. Bei akutem Durchfall gelten '
      + 'dort Reis, Bananen und Zwieback als magenschonend. Halten die Beschwerden '
      + 'an, gehört das in die Praxis.',
      `Der heutige Wert liegt bei ${heuteWert} von 10.`,
      'allgemein'));
  }

  const spaet = (d.bilanz || []).find((b) => b.id === 'spaet');
  if (spaet && spaet.genug && spaet.differenz >= 1 && !bremse) {
    /*
     * Die drei Stunden stehen in der Packungsbeilage von PANTOZOL Control
     * (EMA-Produktinformation, deutsch, Gebrauchsinformation, Abschnitt
     * „Empfehlungen zum Lebenswandel und zur Änderung der Ernährung"): „Vermeiden
     * Sie, weniger als 3 Stunden vor dem Zubettgehen zu essen" – dort für
     * Sodbrennen und säurebedingte Symptome. Fürs Liegen gesund.bund.de, siehe
     * REFLUX_ANSTRENGUNG. Die Karte rechnet aber mit allen Bauchbeschwerden;
     * deshalb sagt der Text, wofür die Quellen gelten. Die „Schwerkraft" von
     * früher nennt keine Quelle.
     */
    raus.push(rat('essen-spaet', 'essen',
      'Spätes Essen und Liegen',
      'In der Packungsbeilage eines rezeptfreien Säureblockers steht für Sodbrennen: in '
      + 'den letzten drei Stunden vor dem Zubettgehen nichts mehr essen. Im Liegen können '
      + 'Refluxbeschwerden zunehmen. Ob das auch für deine Beschwerden gilt, kann die Praxis '
      + 'oder Apotheke einordnen.',
      `Nach Mahlzeiten nach 20 Uhr lag der Wert bei `
      + `${spaet.schnittMit.toFixed(1).replace('.', ',')} statt `
      + `${spaet.schnittOhne.toFixed(1).replace('.', ',')} (${spaet.faelle} Fälle).`
      + (d.essenVorsicht === 'zusatz' ? ` ${SPAET_ZUSATZ}` : ''),
      'eigen'));
  }

  const gross = (d.bilanz || []).find((b) => b.id === 'gross');
  if (gross && gross.genug && gross.differenz >= 1) {
    /*
     * gesund.bund.de, Sodbrennen und Refluxkrankheit (Stand 04.04.2025): „Durch
     * beispielsweise ein üppiges Mahl kann der Magen stark gedehnt werden."
     * Reizmagensyndrom (Stand 05.02.2026): „Andere machen gute Erfahrungen
     * damit, über den Tag verteilt kleinere Mahlzeiten zu sich zu nehmen. …
     * Deshalb gibt es dazu keine verlässlichen Empfehlungen." Ähnlich beim
     * Reizdarm (Stand 28.08.2024): „Bei manchen … verringern sich die
     * Beschwerden". „Fünf statt drei" und „der Magen muss nie viel auf einmal
     * bewegen" nennt keine Quelle.
     */
    raus.push(rat('essen-portion', 'essen',
      'Große Portionen',
      'Ein üppiges Essen kann den Magen stark dehnen. Manche kommen mit mehreren '
      + 'kleineren Mahlzeiten über den Tag besser zurecht als mit wenigen großen – '
      + 'verlässlich untersucht ist das laut gesund.bund.de nicht.',
      `Nach großen Portionen lag der Wert bei `
      + `${gross.schnittMit.toFixed(1).replace('.', ',')} statt `
      + `${gross.schnittOhne.toFixed(1).replace('.', ',')} (${gross.faelle} Fälle).`,
      'eigen'));
  }

  /* ---------- Entspannung ---------- */

  /*
   * Was über Atmen und Anspannung belegt ist – und was nicht.
   *
   * gesund.bund.de, Stress (Stand 14.01.2026): Bei einer akuten Stressreaktion
   * werden Vorgänge zurückgefahren, „Das betrifft unter anderem die Magen-,
   * Darm- und Blasentätigkeit", und „Tiefes Ein- und Ausatmen kann die
   * Entspannung fördern." Schlafstörungen (Stand 04.04.2025, Behandlung):
   * Atemübungen „insbesondere vor dem Schlafengehen" stehen unter den
   * Methoden, „deren Wirksamkeit jedoch nicht hinreichend untersucht ist".
   * Zu 4–7–8 selbst: „Square and 4-7-8 breathing are popularly promoted by
   * psychotherapists but have little empirical support" (Marchant et al.,
   * Appl Psychophysiol Biofeedback 2025;50(2):261-276, PMID 39864026,
   * Abstract).
   *
   * Nicht belegt waren und deshalb nicht mehr da: dass langes Ausatmen auf
   * den Teil des Nervensystems umschalte, unter dem der Darm arbeitet; dass
   * 4–7–8 „zum Runterkommen" und Gleichmaß „fürs Sitzen" sei; und dass die
   * Übung „ursprünglich fürs Einschlafen gedacht" sei. Die Dauer stimmte
   * auch nicht: 4–7–8 hat 19 Sekunden je Runde und vier Runden vorgegeben
   * (js/atem.js), das ist gut eine Minute, nicht „gut zwei".
   */
  const stress = d.faktoren && d.faktoren.stress;
  const heuteAngespannt = Number(heuteTag.stress) >= 3;
  const schlechtGeschlafen = Number(heuteTag.schlaf) >= 3;

  if (stress && stress.genug && stress.differenz >= 1) {
    raus.push(rat('ruhe-eigen', 'ruhe',
      heuteAngespannt ? 'Atemübung unter „Ruhe“' : 'Anspannung ist bei dir ein Faktor',
      'Bei dir hängen Anspannung und Beschwerden messbar zusammen. Bei akutem Stress '
      + 'fährt der Körper laut gesund.bund.de unter anderem die Magen- und '
      + 'Darmtätigkeit zurück; tiefes Ein- und Ausatmen kann die Entspannung fördern. '
      + 'Unter „Ruhe“ liegt die Übung 4–7–8, mit vier Runden gut eine Minute.',
      `An angespannten Tagen ${stress.hoch.schnitt.toFixed(1).replace('.', ',')} `
      + `statt ${stress.niedrig.schnitt.toFixed(1).replace('.', ',')} `
      + `(${stress.hoch.tage} gegen ${stress.niedrig.tage} Tage).`,
      'eigen'));
  } else if (heuteAngespannt || akut) {
    raus.push(rat('ruhe-heute', 'ruhe',
      'Atemübungen unter „Ruhe“',
      'Unter „Ruhe“ liegen Atemübungen, etwa 4–7–8 und Gleichmaß, mit Ton, damit '
      + 'die Augen zubleiben können. Tiefes Ein- und Ausatmen kann laut '
      + 'gesund.bund.de die Entspannung fördern.',
      heuteAngespannt ? 'Du hast heute viel Anspannung eingetragen.'
        : `Der heutige Wert liegt bei ${heuteWert} von 10.`,
      'allgemein'));
  }

  if (schlechtGeschlafen) {
    raus.push(rat('ruhe-schlaf', 'ruhe',
      'Atemübung vor dem Schlafen',
      'Atemübungen vor dem Schlafengehen zählt gesund.bund.de zu den '
      + 'Entspannungstechniken bei Schlafproblemen; wie gut sie wirken, ist nicht '
      + 'hinreichend untersucht, und für 4–7–8 gibt es bisher wenig Belege. Die '
      + 'Übung liegt unter „Ruhe“.',
      'Du hast für heute schlechten Schlaf eingetragen.',
      'allgemein'));
  }

  /* ---------- Sport ---------- */

  raus.push(sportRat(d, {
    heuteWert, heuteNotiert, heuteAnderes, akut, leicht, heuteTag, heuteAngespannt,
  }));

  /* ---------- Medikamente: kein Rat, sondern der Stand ---------- */

  if (d.mittel && d.mittel.length) {
    // Das Datum der letzten Einnahme („Mi, 04.11.") endet schon mit einem
    // Punkt; dann schließt er auch den Satz. Ein zweiter stand hier bis zur
    // Fassung 29 („04.11.. Was die Mittel …").
    const stand = d.mittel.map((m) => `${m.name} – zuletzt ${m.zuletzt}`).join(' · ');
    raus.push(rat('mittel', 'mittel',
      'Was du nimmst',
      `${stand}${stand.endsWith('.') ? '' : '.'} Was die Mittel bewirken, steht unter „Mehr".`,
      'Diese App schlägt bewusst kein Medikament vor: Das hängt an Diagnose, '
      + 'anderen Mitteln und Vorerkrankungen, und nichts davon weiß sie. Nimm '
      + 'die Liste mit zum Termin.',
      'allgemein'));
  }

  return raus.filter(Boolean);
}

/** Bis wie viele Stunden nach dem Essen die Karte „Bewegung kurz nach dem Essen" steht. */
const NACH_ESSEN_STUNDEN = 2;

/**
 * „Die letzte Mahlzeit ist 25 Minuten her." – der Grund unter „Bewegung kurz
 * nach dem Essen".
 *
 * Bis zur Fassung 29 stand hier die Zehntelstunde mit Punkt: „0.4 Stunden".
 * Jetzt unter einer Stunde in Minuten, darunter „gerade eben" (so zählt
 * stundenSeitLetzterMahlzeit auch eine Mahlzeit dieser Tageszeit, deren
 * Knopfzeit noch vor uns liegt), und ab einer Stunde dieselbe Zehntelstunde
 * wie vorher, nur mit Komma – wie die übrigen Zahlen dieser Karte („7,0 statt
 * 0,0"). Nicht die Viertelstunden der Jetzt-Zeile („vor 1½ Std."): Die stehen
 * neben der Uhrzeit, die die genaue Angabe ist; hier gibt es keine, und die
 * Zahl ab einer Stunde soll bleiben, was sie war.
 *
 * Die Minuten werden gerundet, nicht abgeschnitten: Die Stunden kommen aus
 * ganzen Minuten geteilt durch 60, und gerundet kommt genau diese Zahl
 * zurück, auch wo das Teilen einen Rest hinterlässt.
 *
 * Nur knapp unter der Grenze (117 bis 119 Minuten) ergäbe die Zehntelstunde
 * schon die Grenze selbst. Die Karte steht nur bis zwei Stunden nach dem
 * Essen; bis zur Fassung 29 hieß sie „Erst in zwei Stunden intensiv", und
 * „… ist 2 Stunden her" darunter widersprach ihr. Dort steht weiter „knapp 2
 * Stunden"; alle anderen Zahlen bleiben.
 */
function seitLetzterMahlzeit(stunden) {
  const minuten = Math.round(stunden * 60);
  if (minuten < 1) return 'Die letzte Mahlzeit war gerade eben.';
  if (minuten < 60) return `Die letzte Mahlzeit ist ${minuten} ${minuten === 1 ? 'Minute' : 'Minuten'} her.`;
  const zehntel = Math.round(stunden * 10) / 10;
  if (stunden < NACH_ESSEN_STUNDEN && zehntel >= NACH_ESSEN_STUNDEN) {
    return `Die letzte Mahlzeit ist knapp ${NACH_ESSEN_STUNDEN} Stunden her.`;
  }
  const zahl = Number.isInteger(zehntel) ? String(zehntel) : zehntel.toFixed(1).replace('.', ',');
  return `Die letzte Mahlzeit ist ${zahl} ${zehntel === 1 ? 'Stunde' : 'Stunden'} her.`;
}

/**
 * Welche Bewegung zu welcher Lage – beschrieben, nicht angeordnet.
 *
 * Belegt ist, und das tragen die Karten:
 *
 *   * Viele Fachleute nennen Bewegung und Sport, „weil das die Verdauung
 *     anregt" (gesund.bund.de, Reizmagensyndrom, Stand 05.02.2026,
 *     Behandlung); „Ausreichend Bewegung und eine ausgewogene Ernährung
 *     gelten als Voraussetzungen für eine gesunde Verdauung"
 *     (Reizdarmsyndrom, Stand 28.08.2024, Behandlung).
 *   * Bei Reflux können nach Anstrengung und im Liegen vermehrt Beschwerden
 *     auftreten (siehe REFLUX_ANSTRENGUNG).
 *   * Mit vollem Magen: In Studien mit gesunden Freiwilligen löste Laufen
 *     nach dem Essen mehr Rückfluss aus als nüchtern, und mehr, je
 *     intensiver: „Postprandial exercise showed a similar pattern of induced
 *     gastroesophageal reflux, although of greater amount" (Clark et al.,
 *     JAMA 1989;261(24):3599-601, PMID 2724505); „Postprandial running
 *     exercises induce gastroesophageal reflux, which correlates with
 *     exercise intensity" (Choi et al., J Korean Med Sci 2001;16(2):183-7,
 *     PMID 11306744); „The presence of food in the stomach greatly increased
 *     the amount of reflux during post-prandial running" (Yazaki et al.,
 *     Aust J Sci Med Sport 1996;28(4):93-6, PMID 9040897). Alle drei
 *     Abstracts.
 *   * „Gesundheitsfördernd ist es, mittags in Ruhe … zu essen und
 *     anschließend einen kleinen Verdauungsspaziergang zu machen"
 *     (Gesund durch Bewegung, Stand 25.11.2025).
 *   * Bei Stress: „Alltagsbewegung und Sport helfen abzuschalten, wirken
 *     Stress entgegen" (Stress, Stand 14.01.2026).
 *
 * Nicht belegt und deshalb nicht mehr da: „Bewegung hilft bei fast allem
 * hier", die Grenze „erst in zwei Stunden intensiv" (NACH_ESSEN_STUNDEN
 * entscheidet weiter nur, wann die Karte steht), „mindestens eine Stunde,
 * bevor du dich hinlegst", „Zwanzig Minuten gehen", „30 bis 45 Minuten",
 * der Sprechtest und „Intensive Intervalle tun an einem angespannten Tag das
 * Gegenteil". Alles andere kommt aus dem eigenen Verlauf.
 */
function sportRat(d, k) {
  const seitEssen = d.letzteMahlzeitStunden;
  const frischGegessen = seitEssen !== null && seitEssen < NACH_ESSEN_STUNDEN;
  const phase = phaseVon(d.tage, d.heute);
  const phasenSchlecht = phase && (d.phasen || [])
    .some((p) => p.phase === phase && p.schnitt >= 4 && p.tage >= 4);

  if (k.akut) {
    return rat('sport', 'sport', 'Bewegung bei starken Beschwerden',
      `${REFLUX_ANSTRENGUNG} Welche Bewegung an einem Tag mit starken Beschwerden `
      + 'passt, kann die Praxis einschätzen.',
      `Der heutige Wert liegt bei ${k.heuteWert} von 10.`, 'allgemein');
  }
  if (frischGegessen) {
    return rat('sport', 'sport', 'Bewegung kurz nach dem Essen',
      'In Studien mit gesunden Freiwilligen löste Laufen mit vollem Magen mehr '
      + 'Rückfluss aus als nüchtern, und mehr, je intensiver gelaufen wurde. Ein '
      + 'kleiner Spaziergang nach dem Essen gilt als gesundheitsfördernd.',
      seitLetzterMahlzeit(seitEssen),
      'allgemein');
  }
  if (phasenSchlecht) {
    return rat('sport', 'sport', 'Bewegung in dieser Zyklusphase',
      'In dieser Zyklusphase war es bei dir bisher schwerer. Was das für Bewegung '
      + `heißt, sagt dieser Verlauf nicht. ${BEWEGUNG_PRAXIS}`,
      `In der Phase „${phasenName(phase)}" lagen deine Werte höher als sonst.`,
      'eigen');
  }
  if (k.heuteAngespannt) {
    return rat('sport', 'sport', 'Bewegung und Anspannung',
      'Alltagsbewegung und Sport helfen laut gesund.bund.de abzuschalten und wirken '
      + `Stress entgegen. ${BEWEGUNG_PRAXIS}`,
      'Du hast heute viel Anspannung eingetragen.', 'allgemein');
  }
  if (k.leicht) {
    return rat('sport', 'sport', 'Bewegung bei leichten Beschwerden',
      'Bewegung und Sport regen nach Ansicht vieler Fachleute die Verdauung an. '
      + `${REFLUX_ANSTRENGUNG} ${BEWEGUNG_PRAXIS}`,
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
   * nichts da, sagt er nichts über den Tag. „An beschwerdefreien Tagen spricht
   * nichts gegen intensives Training, und danach mindestens eine Stunde, bevor
   * du dich hinlegst" stand hier bis zur Fassung 29; beides nennt keine
   * Quelle. Jetzt steht ohne Eintrag nur der Satz zu Reflux, mit Eintrag
   * ohne Beschwerden die allgemeinen Richtwerte und dazu Reflux. Kurz
   * gehalten, nicht länger als vorher: Die Karte steht auf „Tag" über den
   * Knöpfen zum Eintragen, und test-rueckfrage und test-standardmittel tippen
   * dort auf Knöpfe, die nicht unter den Rand rutschen dürfen.
   */
  if (!k.heuteNotiert) {
    const wozu = k.heuteAnderes ? ' zum Bauch' : '';
    return rat('sport', 'sport', 'Bewegung heute',
      `Für heute steht${wozu} noch nichts im Tagebuch, deshalb keine Aussage über den `
      + `Tag. ${REFLUX_ANSTRENGUNG}`,
      `Für heute ist${wozu} noch nichts eingetragen – das heißt nicht, dass nichts war.`,
      'allgemein');
  }

  return rat('sport', 'sport', 'Bewegung heute',
    BEWEGUNG_RICHTWERT,
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
