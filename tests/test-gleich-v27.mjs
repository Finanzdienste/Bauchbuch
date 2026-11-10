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
 *   * und die Sätze, die die Fassung 30 nach dem Abgleich mit den Quellen
 *     berichtigt hat – jeder einzeln, mit neuem und altem Wortlaut (siehe
 *     WORTLAUT_30 unten). Zahlen und Urteile bleiben dabei, wie sie waren.
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
  // Fassung 30: der Wortlaut vor dem Abgleich mit den Quellen (WORTLAUT_30).
  const wortlautMal = new Map();
  ['heute', 'muster', 'mehr'].forEach((tab) => { raus[tab] = wortlaut30(raus[tab], tab, wortlautMal); });
  return {
    raus,
    mehrKarte: mehr.block,
    musterKarte: muster.block,
    neuKarte: neu.block,
    neuMal: neu.mal,
    punktMal: punkt.mal,
    wortlautMal,
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
 * Fassung 30: Die medizinischen Sätze der App sind gegen Fachinformationen,
 * Gebrauchsinformationen und weitere Quellen im Volltext geprüft und
 * berichtigt worden. Wo ein solcher Satz auf „Tag", „Muster" oder „Mehr"
 * steht, bekommt die Zeile vor dem Vergleich ihren Wortlaut der Fassung 27
 * zurück – wie oben beim Punkt nach dem Datum und aus demselben Grund: Das
 * Gold ist das, was die Fassung 27 gezeigt hat, und bleibt unangetastet.
 *
 * Jede Regel nennt genau eine Stelle, mit dem neuen und dem alten Text. Eine
 * Zahl, die je Tagebuch anders ist, steht als Gruppe im Muster und wird
 * übernommen, nicht ersetzt – ändert sie sich, fällt das weiter auf. Alles
 * außerhalb dieser Stellen vergleicht `vergleiche` Zeichen für Zeichen, und
 * jede Regel muss mindestens einmal greifen, sonst gehört sie gestrichen.
 * Warum sich ein Satz geändert hat und welche Quelle ihn trägt, steht am
 * Code, der ihn schreibt; hier steht nur, wo.
 *
 * Formen: `neu` ist eine ganze Zeile (Text oder Muster) oder eine Folge
 * solcher Zeilen; mit `teil` ist es ein Stück einer Zeile, und nur dieses
 * Stück wird getauscht.
 */
const WORTLAUT_30 = [
  /* ----- „Tag": Vorschläge für heute (js/rat.js) und ihre Fußzeile (js/app.js) ----- */
  {
    tab: 'heute',
    neu: 'Danach lag dein Bauchwert im Mittel höher als ohne. Ob ein Lebensmittel wirklich der Auslöser ist, lässt '
      + 'sich aus dem Tagebuch allein nicht sicher sagen; ob ein Auslassversuch für dich sinnvoll ist, lässt sich in '
      + 'der Praxis besprechen.',
    alt: 'Nicht für immer streichen – nur an Tagen wie diesem einmal weglassen und schauen, ob es einen Unterschied '
      + 'macht. Ein Auslöser, der sich in zwei Wochen ohne ihn nicht bestätigt, war keiner.',
  },
  // Der Titel derselben Karte: ohne Rat zum Weglassen; die Namen danach je Tagebuch.
  { tab: 'heute', teil: true, neu: 'Auffällig in deinem Verlauf: ', alt: 'Heute eher ohne ' },
  { tab: 'heute', neu: 'Schonkost an Tagen mit starken Beschwerden', alt: 'Heute klein und mild' },
  {
    tab: 'heute',
    neu: 'Bei akuter Magenschleimhautentzündung wird laut gesund.bund.de oft zu kleinen Portionen und Schonkost '
      + 'wie Zwieback oder Haferschleim geraten – ob das hilft, ist nicht ausreichend erforscht. Bei akutem '
      + 'Durchfall gelten dort Reis, Bananen und Zwieback als magenschonend. Halten die Beschwerden an, gehört '
      + 'das in die Praxis.',
    alt: 'Mehrere kleine Portionen statt zwei großen, und dabei bleiben bei: Haferbrei mit Wasser, Kartoffeln, '
      + 'gestampft, gedünstete Karotte oder Zucchini, Reis, Banane, mageres Geflügel oder Fisch.',
  },
  { tab: 'heute', neu: 'Atemübungen unter „Ruhe“', alt: 'Zwei Minuten Atmen' },
  {
    tab: 'heute',
    neu: 'Unter „Ruhe“ liegen Atemübungen, etwa 4–7–8 und Gleichmaß, mit Ton, damit die Augen zubleiben können. '
      + 'Tiefes Ein- und Ausatmen kann laut gesund.bund.de die Entspannung fördern.',
    alt: 'Unter „Ruhe": 4–7–8 zum Runterkommen, Gleichmaß fürs Sitzen zwischendurch. Mit Ton, damit die Augen '
      + 'zubleiben können.',
  },
  { tab: 'heute', neu: 'Atemübung vor dem Schlafen', alt: 'Heute Abend 4–7–8 vor dem Schlafen' },
  {
    tab: 'heute',
    neu: 'Atemübungen vor dem Schlafengehen zählt gesund.bund.de zu den Entspannungstechniken bei Schlafproblemen; '
      + 'wie gut sie wirken, ist nicht hinreichend untersucht, und für 4–7–8 gibt es bisher wenig Belege. Die '
      + 'Übung liegt unter „Ruhe“.',
    alt: 'Die Übung ist ursprünglich fürs Einschlafen gedacht. Vier Runden im Bett, Licht schon aus.',
  },
  { tab: 'heute', neu: 'Bewegung bei starken Beschwerden', alt: 'Heute nur spazieren' },
  {
    tab: 'heute',
    neu: 'Bei Reflux können nach körperlicher Anstrengung und beim Bücken oder Liegen vermehrt Beschwerden '
      + 'auftreten. Welche Bewegung an einem Tag mit starken Beschwerden passt, kann die Praxis einschätzen.',
    alt: 'Bei einem Wert wie heute bringt intensives Training nichts und kann die Beschwerden verstärken. '
      + 'Zwanzig Minuten gehen hilft der Verdauung trotzdem.',
  },
  // Die Fußzeile: ohne „dein eigener Verlauf sticht das", und „Aus deinem
  // Verlauf“ mit deutschem Schlusszeichen.
  {
    tab: 'heute',
    neu: '„Aus deinem Verlauf“ heißt: aus deinen eigenen Eintragungen gerechnet, mit den Zahlen daneben. '
      + '„Allgemein“ heißt: allgemeine Hinweise, oft nicht gut untersucht.',
    alt: '„Aus deinem Verlauf" heißt: aus deinen eigenen Eintragungen gerechnet, mit den Zahlen daneben. '
      + '„Allgemein" heißt: gilt für einen Durchschnitt, den es nicht gibt – dein eigener Verlauf sticht das.',
  },

  /* ----- „Muster": In Kürze, Säureblocker, Kriterien (js/lage.js, js/app.js) ----- */
  {
    tab: 'muster',
    teil: true,
    neu: ' fällt im eingestellten Zeitfenster nach dem Essen nicht auf, wohl aber 4–8 Stunden danach.',
    alt: ' fällt im üblichen Zeitfenster nicht auf, wohl aber 4–8 stunden danach – so spät entsteht Beschwerde '
      + 'im Dickdarm, nicht im Magen.',
  },
  {
    tab: 'muster',
    neu: /^Unter (.+?) waren die Bauchwerte ähnlich wie in der Zeit davor\. Manche Packungsbeilagen von Magenmitteln nennen Beschwerden, die nicht besser werden, als Anlass für ein Gespräch mit Ärztin oder Arzt – eine Frage für die Sprechstunde, kein Grund, selbst etwas abzusetzen\.$/,
    alt: ([, mittel]) => `${mittel} hat in dieser Zeit nichts geändert. Das ist selbst ein Befund und gehört in die `
      + 'Sprechstunde – nicht als Grund, etwas abzusetzen, sondern als Frage.',
  },
  {
    tab: 'muster',
    neu: 'Erfüllte Kriterien sind keine Diagnose. Von einem Reizdarm oder Reizmagen (funktionelle Dyspepsie) '
      + 'sprechen Ärztinnen und Ärzte '
      + 'erst, wenn andere Ursachen für die Beschwerden abgeklärt und ausgeschlossen sind. Ob das so ist und welche '
      + 'Untersuchungen dafür nötig sind, klärt die Praxis. Auch der Punktwert zu Reflux ist keine Diagnose.',
    alt: 'Erfüllte Kriterien sind keine Diagnose. Beide Regelwerke setzen ausdrücklich voraus, dass nichts '
      + 'Organisches dahintersteckt – und das weiß nur eine Untersuchung. „Erfüllt" heißt hier: Wenn Spiegelung und '
      + 'Blutbild unauffällig sind, passt dieser Name. Das ist weniger als eine Diagnose und mehr als ein Gefühl, und '
      + 'es ist genau der Satz, mit dem sich ein Termin anfangen lässt.',
  },
  {
    tab: 'muster',
    neu: /^Beschwerden seit (\S+), also seit (\d+) Monaten \(in Kalendermonaten gerechnet\)\. Die Bedingung, mit der Body Check beim Reizdarm rechnet – Beginn vor mindestens sechs Monaten –, ist damit erfüllt\.$/,
    alt: ([, seit, monate]) => `Beschwerden seit ${seit}, also seit ${monate} Monaten. Die Rom-Bedingung „Beginn `
      + 'vor mindestens sechs Monaten" ist damit erfüllt.',
  },
  /*
   * Die Magenbeschwerden werden nur noch gezählt, ohne Rom-IV-Urteil. „Kriterien
   * nicht erfüllt" und die Striche sind das, was die Fassung 27 für dieses
   * Tagebuch zeigte; ob es noch so gerechnet wird, prüft die Rechnung
   * `kriterien` in tests/test-gold.mjs Zeichen für Zeichen.
   */
  {
    tab: 'muster',
    neu: [
      'Magenbeschwerden ab Stärke 4',
      'gezählt, keine Einordnung',
      '·',
      /^Druck, Völlegefühl oder früh satt\. (An \d+ Tage?n?, [\d,]+ je Woche der notierten Tage\.)$/,
      '·',
      /^Brennen oder Schmerz im Oberbauch\. (An \d+ Tage?n?, [\d,]+ je Woche der notierten Tage\.)$/,
      'Rom IV beschreibt die funktionelle Dyspepsie mit solchen Beschwerden – Völlegefühl nach dem Essen, frühes '
        + 'Sattsein, Schmerz oder Brennen im Oberbauch –, wenn eine übliche ärztliche Untersuchung sie nicht '
        + 'erklärt. Wie oft sie dafür auftreten müssen, gibt dieser Kasten nicht wieder; die Einordnung trifft die '
        + 'Praxis. Gezählt werden nur Eintragungen ab Stärke 4 („merklich“). Diese Grenze hat Body Check festgelegt.',
    ],
    alt: (titel, urteil, s1, [, pds], s2, [, eps]) => [
      'Funktionelle Dyspepsie (Rom IV)',
      'Kriterien nicht erfüllt',
      '–',
      `Postprandiales Distress-Syndrom (PDS). Völlegefühl nach dem Essen und frühes Sattsein stehen im Vordergrund. ${pds}`,
      '–',
      'Epigastrisches Schmerzsyndrom (EPS). Schmerz oder Brennen im Oberbauch stehen im Vordergrund, unabhängig vom '
        + `Essen. ${eps}`,
      'Gezählt werden nur Eintragungen ab Stärke 4 („merklich") – die Kriterien sagen „belastend", und eine 2 '
        + 'mitzuzählen würde sie bei fast jedem erfüllen.',
    ],
  },
  /*
   * GerdQ ohne Schwelle. Die 9 im alten Satz ist der Punktwert dieses
   * Tagebuchs; er steht weiter in der Zeile „9 von 18" und wird dort
   * verglichen.
   */
  {
    tab: 'muster',
    neu: 'Gezählt aus deinen Eintragungen der letzten sieben Tage, kein ausgefüllter Fragebogen. Der GerdQ ist ein '
      + 'Fragebogen mit sechs Fragen zur Selbsteinschätzung, der Praxen bei der Einordnung von Reflux helfen soll. '
      + 'Zwei Posten zählt Body Check umgekehrt: Je öfter sie eingetragen sind, desto weniger Punkte. Was die '
      + 'Punktzahl hier bedeutet, kann die Praxis einordnen.',
    alt: 'Ab 8 Punkten gilt eine Refluxkrankheit als wahrscheinlich – du liegst bei 9. Zwei der sechs Fragen zählen '
      + 'umgekehrt: Oberbauchschmerz und Übelkeit sprechen eher gegen Reflux und für etwas anderes im Magen. Das ist '
      + 'kein Fehler, das ist der Trick des Fragebogens.',
  },
  {
    tab: 'muster',
    neu: /^Grundlage: (\d+) notierte Tage in den letzten (\d+)\. Body Check zählt nur, was eingetragen ist; die Angaben je Woche beziehen sich auf die notierten Tage\. Ob die Zahlen dadurch eher zu hoch oder zu niedrig ausfallen, lässt sich nicht sagen\. Gezählt wird nach Rom IV von 2016; 2026 wurde eine Nachfolgefassung \(Rom V\) vorgestellt, nach der hier nicht gezählt wird\.$/,
    alt: ([, notiert, von]) => `Grundlage: ${notiert} notierte Tage in den letzten ${von}. Ein Tagebuch untererfasst `
      + '– wer einen Tag nicht einträgt, hat an diesem Tag laut Tagebuch nichts gehabt. Jede Zahl hier ist eher zu '
      + 'niedrig als zu hoch.',
  },

  /* ----- „Muster": Einordnung (js/bild.js) ----- */
  {
    tab: 'muster',
    neu: 'Im Tagebuch stehen entzündungshemmende Schmerzmittel. Häufig genommen, gehören sie laut gesund.bund.de '
      + 'neben Helicobacter zu den häufigsten Gründen für eine entzündete Magenschleimhaut.',
    alt: 'Im Tagebuch stehen entzündungshemmende Schmerzmittel – die häufigste vermeidbare Ursache einer gereizten '
      + 'Magenschleimhaut.',
  },
  {
    tab: 'muster',
    neu: 'Ob eine Magenspiegelung zur Abklärung sinnvoll ist und ob ein anderes Mittel oder ein Magenschutz infrage '
      + 'kommt, klärt die Praxis.',
    alt: 'Auslassversuch unter ärztlicher Begleitung; bei anhaltenden Beschwerden Spiegelung.',
  },

  /* ----- „Muster": Auslassversuch, Klassen, Wirkweise (js/app.js) ----- */
  {
    tab: 'muster',
    neu: 'Alles andere hier zählt, was ohnehin passiert – daraus wird nie ein Beleg: Wer an schlechten Tagen anders '
      + 'isst, findet sein Essen auffällig, ohne dass es damit zu tun hat. Ein Versuch dreht das um: eine Zeit lang '
      + 'weglassen und dann bewusst wieder essen; erst diese zweite Hälfte zeigt etwas. In der Praxis wird ein '
      + 'Verdacht auf eine Unverträglichkeit ähnlich geprüft, dort ärztlich begleitet, bei Verdacht auf eine '
      + 'Allergie unter ärztlicher Beobachtung. Ob ein solcher Versuch für dich sinnvoll ist, lässt sich dort '
      + 'besprechen.',
    alt: 'Alles andere hier zählt, was ohnehin passiert – daraus wird nie ein Beleg: Wer an schlechten Tagen anders '
      + 'isst, findet sein Essen auffällig, ohne dass es damit zu tun hat. Ein Versuch dreht das um. Zwei Wochen '
      + 'weglassen und dann bewusst wieder essen; erst diese zweite Hälfte entscheidet. Genau so wird in der '
      + 'Ernährungsmedizin gearbeitet.',
  },
  {
    tab: 'muster',
    neu: 'Klassen stehen vor einzelnen Zutaten, weil eine Klasse in mehr Mahlzeiten vorkommt und der Vergleich so '
      + 'auf mehr Fällen beruht. Ob eine einzelne Zutat oder eine ganze Gruppe dahintersteckt, kann das Tagebuch '
      + 'nicht entscheiden.',
    alt: 'Klassen stehen vor einzelnen Zutaten: Hinter „Zwiebel" steckt fast immer die ganze Klasse, und wer nur die '
      + 'Zwiebel weglässt, isst die übrigen Fruktane weiter und lernt nichts.',
  },
  {
    tab: 'muster',
    teil: true,
    neu: ' Die Zuordnung ist grob: Alles in einer Gruppe wird hier gleich behandelt, auch wenn sich einzelne '
      + 'Lebensmittel darin unterscheiden können.',
    alt: ' Die Zuordnung ist grob: Ein Apfel ist FODMAP-reich, eine Banane kaum, und beide wären hier Obst.',
  },

  /* ----- „Muster": Zeitabstand ohne Ort (js/zeitprofil.js, js/app.js) ----- */
  {
    tab: 'muster',
    neu: /^(Diese Auslöser fallen im eingestellten Fenster von \d+ Stunden nicht auf – wohl aber später\.) Woher eine Beschwerde kommt, lässt sich am Zeitpunkt allein nicht ablesen\.$/,
    alt: ([, anfang]) => `${anfang} Das ist kein schwächerer Befund, sondern ein anderer: So spät entsteht `
      + 'Beschwerde im Dickdarm.',
  },
  {
    tab: 'muster',
    neu: /^(\d+ Mahlzeiten damit, \d+ ohne – jeweils nur die, bei denen dieses Fenster überhaupt beobachtbar war)$/,
    alt: ([, zeile]) => `${zeile} (Dickdarm)`,
  },
  {
    tab: 'muster',
    neu: 'Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne erkennbaren Schwerpunkt.',
    alt: 'Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne erkennbaren Schwerpunkt. Das spricht '
      + 'eher gegen einen einzelnen Ort als Ursache.',
  },
  {
    tab: 'muster',
    teil: true,
    neu: 'isst, erfährt über die späten Stunden wenig.',
    alt: 'isst, kann über den Dickdarm wenig erfahren.',
  },

  /* ----- „Muster": Säureblocker-Balken (js/app.js) ----- */
  {
    tab: 'muster',
    teil: true,
    neu: ' rät weder zum Absetzen noch zum Ändern. Ob und wie ein Mittel beendet wird, gehört in die Praxis oder '
      + 'Apotheke – manche Packungsbeilagen sagen dazu ausdrücklich etwas.',
    alt: ' rät zu keinem Absetzen – ein Säureblocker wird nach längerer Einnahme nicht von einem Tag auf den anderen '
      + 'weggelassen.',
  },

  /* ----- „Muster": Ob es etwas bewirkt (js/ansprechen.js) ----- */
  {
    tab: 'muster',
    neu: /^Seit (\d+) Wochen im Gebrauch, ohne dass die Bauchwerte darunter besser geworden wären: ([\d,]+) davor gegen ([\d,]+) darunter \((\d+) gegen (\d+) notierte Tage\)\. Bleiben Beschwerden unter der Behandlung bestehen, nennen manche Fachinformationen weitere Untersuchungen; was es hier bedeutet, klärt die Praxis\. Frage für den Termin: Was heißt es, dass es darunter nicht besser geworden ist – und wie geht es weiter\? Laut Packungsbeilage mancher Präparate, etwa Pantozol, wird die Einnahme nicht beendet, ohne vorher mit Ärztin, Arzt oder Apotheke zu sprechen\.$/,
    alt: ([, wochen, davor, unter, nDavor, nUnter]) => `Seit ${wochen} Wochen im Gebrauch, ohne dass sich die `
      + `Beschwerdestärke geändert hätte: ${davor} davor gegen ${unter} darunter (${nDavor} gegen ${nUnter} `
      + 'notierte Tage). Das ist selbst ein Befund. Wenn Säure die Ursache wäre, wäre nach vier bis acht '
      + 'Wochen etwas zu sehen. Frage für den Termin: Was heißt es, dass es darunter nicht besser geworden '
      + 'ist – und wie geht es weiter? Nicht von selbst absetzen: Nach längerer Einnahme antwortet der Magen '
      + 'kurzzeitig mit mehr Säure als vorher.',
  },

  /* ----- „Muster": Was noch fehlt (js/luecken.js) ----- */
  {
    tab: 'muster',
    neu: 'In deiner Bilanz steht etwas Auffälliges. Zählen allein macht daraus nie einen Beleg – wer an schlechten '
      + 'Tagen anders isst, findet sein Essen auffällig, ohne dass es damit zu tun hat. Ein Versuch dreht das um: '
      + 'eine Zeit lang weglassen, dann bewusst wieder essen. Ob ein solcher Versuch für dich sinnvoll ist, lässt '
      + 'sich in der Praxis besprechen. Steht unter „Muster“.',
    alt: 'In deiner Bilanz steht etwas Auffälliges. Zählen allein macht daraus nie einen Beleg – wer an schlechten '
      + 'Tagen anders isst, findet sein Essen auffällig, ohne dass es damit zu tun hat. Zwei Wochen weglassen, dann '
      + 'bewusst wieder essen: Das ist der einzige Weg von „fällt zusammen" zu „liegt daran". Steht unter „Muster".',
  },

  /* ----- „Muster": Kopfschmerz (js/kopf.js, js/app.js) ----- */
  {
    tab: 'muster',
    teil: true,
    neu: ' Dieses Fenster nutzt die Kopfschmerzklassifikation, bisher nur in ihrem Anhang: Liegen Migräneanfälle in '
      + 'mindestens zwei von drei Zyklen darin, spricht sie von rein menstrueller Migräne (nur dann) oder '
      + 'menstruationsassoziierter Migräne (auch zu anderen Zeiten). Gezählt werden dort Migräneanfälle; ob deine '
      + 'Kopfschmerztage welche sind, klärt die Sprechstunde.',
    alt: ' Genau danach fragt die Neurologie: In mindestens zwei von drei Zyklen heißt das menstruationsgebunden – '
      + 'gezählt werden dort Migräneanfälle; ob deine Kopfschmerztage welche sind, klärt die Sprechstunde.',
  },
  {
    tab: 'muster',
    teil: true,
    neu: ' Verbinden können beide die Schmerzmittel: Bei entzündungshemmenden wie Ibuprofen nennt die '
      + 'Fachinformation Magen-Darm-Beschwerden als häufige Nebenwirkung – deshalb stehen sie dabei. Auch eine '
      + 'Migräne selbst kann mit Übelkeit oder Erbrechen einhergehen.',
    alt: ' Was beide verbindet, ist das Schmerzmittel – deshalb steht es dabei.',
  },

  /* ----- „Muster": Bewegung als Tagesfrage (js/app.js) ----- */
  {
    tab: 'muster',
    teil: true,
    neu: ' Gezählt am selben Tag – was zuerst kam, die Bewegung oder die Beschwerden, lässt sich daraus nicht ablesen.',
    alt: ' Gezählt am selben Tag – an schlechten Tagen bewegt man sich oft weniger.',
  },

  /* ----- „Mehr": Kurztexte der Mittel (js/mittel.js) ----- */
  {
    tab: 'mehr',
    neu: 'Drosselt die Säurebildung im Magen.',
    alt: 'Drosselt die Säurebildung, damit die Schleimhaut zur Ruhe kommt.',
  },
  {
    tab: 'mehr',
    neu: 'Häufig genommen, neben Helicobacter einer der häufigsten Gründe für eine entzündete Magenschleimhaut.',
    alt: 'Häufigster vermeidbarer Grund für eine gereizte Magenschleimhaut.',
  },
  {
    tab: 'mehr',
    neu: 'Gehören nicht zu den entzündungshemmenden Schmerzmitteln (NSAR) – haben aber eigene Risiken; bei '
      + 'Metamizol sind auch Magen-Darm-Blutungen beschrieben.',
    alt: 'Lässt die Schutzschicht des Magens in Ruhe – belastet dafür anderes.',
  },

  /* ----- „Mehr": Gewicht (js/gewicht.js, js/app.js) und Beginn der Beschwerden (js/app.js) ----- */
  {
    tab: 'mehr',
    teil: true,
    neu: ' Das Gewicht ist damit stabil. Über andere Zeichen wie Blut im Stuhl, Fieber oder Blässe sagt die Waage '
      + 'nichts.',
    alt: ' Das Gewicht ist damit stabil, und das ist bei Bauchbeschwerden eine gute Nachricht: Der wichtigste '
      + 'Hinweis darauf, dass mehr dahintersteckt, ist ein ungewollter Verlust.',
  },
  {
    tab: 'mehr',
    neu: 'Das ist keine Nebensache: Ein ungewollter Gewichtsverlust gehört ärztlich abgeklärt. Body Check meldet '
      + 'sich ab fünf Prozent weniger in bis zu einem halben Jahr – diese Grenze hat die App festgelegt. Ob ein '
      + 'Verlust gewollt ist, sieht keine Rechnung, das weißt nur du.',
    alt: 'Das ist keine Nebensache: Ein Verlust von fünf Prozent gehört abgeklärt, wenn er ungewollt kommt – und '
      + 'ist ein Erfolg, wenn du dafür gearbeitet hast. Den Unterschied sieht keine Rechnung, nur du.',
  },
  {
    tab: 'mehr',
    teil: true,
    neu: ' Für den Reizdarm-Kasten unter „Muster“ rechnet Body Check mit einem Beginn vor mindestens sechs Monaten;',
    alt: ' Die Rom-Kriterien unter „Muster" verlangen einen Beginn vor mindestens einem halben Jahr;',
  },
];

/** Eine Zeile gegen ein Stück von `neu`: der Treffer oder null. */
function trifft(muster, zeile) {
  if (zeile === undefined) return null;
  if (typeof muster === 'string') return zeile === muster ? [zeile] : null;
  return zeile.match(muster);
}

/**
 * Die Zeilen eines Reiters mit dem Wortlaut der Fassung 27. `mal` zählt, wie
 * oft jede Regel gegriffen hat.
 */
function wortlaut30(zeilen, tab, mal) {
  const regeln = WORTLAUT_30.filter((r) => r.tab === tab);
  const zaehle = (r) => mal.set(r, (mal.get(r) || 0) + 1);
  const raus = [];
  let i = 0;
  while (i < zeilen.length) {
    const ganz = regeln.filter((r) => !r.teil).map((r) => {
      const folge = [].concat(r.neu);
      return { r, folge, treffer: folge.map((m, k) => trifft(m, zeilen[i + k])) };
    }).find((x) => x.treffer.every(Boolean));
    if (ganz) {
      zaehle(ganz.r);
      raus.push(...[].concat(typeof ganz.r.alt === 'function' ? ganz.r.alt(...ganz.treffer) : ganz.r.alt));
      i += ganz.folge.length;
    } else {
      raus.push(regeln.filter((r) => r.teil && zeilen[i].includes(r.neu)).reduce((z, r) => {
        zaehle(r);
        return z.split(r.neu).join(r.alt);
      }, zeilen[i]));
      i += 1;
    }
  }
  return raus;
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
    raus, mehrKarte, musterKarte, neuMal, punktMal, wortlautMal,
  } = bereinigt(jetzt);
  check(neuMal === 0, 'nach „Gelesen" steht oben auf „Tag" keine Karte „Neu"');
  const nie = WORTLAUT_30.filter((r) => !wortlautMal.get(r)).map((r) => `„${String(r.neu).slice(0, 40)}…“`);
  check(nie.length === 0,
    `jede der ${WORTLAUT_30.length} Regeln für den Wortlaut der Fassung 30 greift${nie.length ? ` – nie: ${nie.join(', ')}` : ''}`);
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
