/*
 * Der Provokationstest: die Frage stellen, statt auf die Antwort zu warten
 *
 * WAS HIER ANDERS IST ALS ÜBERALL SONST
 *
 * Alles Übrige in dieser App wertet aus, was ohnehin geschieht. Das hat eine
 * Grenze, die auch ein Jahr Tagebuch nicht verschiebt: Wer an schlechten Tagen
 * anders isst, findet sein Essen auffällig, ohne dass es damit zu tun hätte.
 * Der Auslassversuch (js/versuch.js) dreht das zur Hälfte um – er greift ein.
 * Aber er greift über Wochen ein, und in zwei Wochen ändert sich noch anderes:
 * Stress, Jahreszeit, Zyklus, Aufmerksamkeit.
 *
 * Ein Provokationstest macht daraus etwas Kurzes und Wiederholbares. Eine
 * festgelegte Menge, nüchtern, ein festes Beobachtungsfenster – und das Ganze
 * mehrmals. Ähnlich gedacht, aber nicht gleich, ist der Atemtest in einer
 * Praxis: Nach dem Trinken einer Milchzuckerlösung wird mehrmals der
 * Wasserstoff in der Atemluft gemessen, und nur wenn während des Tests
 * typische Beschwerden auftreten, lässt sich eine Laktoseintoleranz sicher
 * feststellen (gesund.bund.de/laktoseintoleranz, Stand 23.02.2026, „Wie wird
 * eine Laktoseintoleranz diagnostiziert?“); für Fruktose gibt es einen
 * solchen Atemtest ebenso (North American Consensus, Am J Gastroenterol 2017,
 * PMID 28323273, Abstract), und die europäische Leitlinie verlangt dazu eine
 * Erfassung der Beschwerden während des Tests (UEG J 2022, PMID 34431620,
 * Abstract). Zu Hause fehlt die Messung, es bleibt die Beschwerdestärke.
 * Wiederholung und Leerdurchgang gehören zum Aufbau dieser App, nicht zum
 * Test in der Praxis. („Genau so wird … geprüft“ stand hier bis zur Fassung
 * 29.)
 *
 * DREI DINGE MACHEN DEN UNTERSCHIED ZU „ICH TRINK MAL EIN GLAS MILCH"
 *
 *   1. NÜCHTERN. Vier Stunden nichts davor, nichts während des Fensters. Sonst
 *      steht am Ende ein Bauchweh, das ebenso gut vom Frühstück kommen kann.
 *      Praktisch heißt das: morgens nach dem Aufstehen, dann ist die Hälfte
 *      der Bedingung schon von selbst erfüllt.
 *   2. WIEDERHOLUNG. Ein einzelner Durchgang beweist nichts, weil an genau dem
 *      Tag auch Schlaf, Stress oder Zyklus schuld sein können. Erst wenn
 *      dieselbe Menge mehrfach dasselbe tut, ist es die Menge.
 *   3. DER LEERDURCHGANG. Derselbe Ablauf ohne die Sache – nüchtern, gleiche
 *      Uhrzeit, gleiches Fenster, nur ohne Milch. Er kostet einen Morgen und
 *      ist das Wertvollste am ganzen Test: Ohne ihn wird das Nüchternsein
 *      selbst zum Verdächtigen. Manche Magenbeschwerden treten gerade bei
 *      leerem Magen auf (beim Zwölffingerdarmgeschwür „eher bei leerem Magen“,
 *      gesund.bund.de/zwoelffingerdarmgeschwuer, Stand 27.01.2022) – diese App
 *      führt Nüchternschmerz an anderer Stelle sogar auf. Wer ohne
 *      Leerdurchgang testet, kann solche Beschwerden nicht von einer
 *      Unverträglichkeit unterscheiden.
 *
 * WARUM EIN GEPLANTER TEST WENIGER VERLANGT ALS EIN FUND IM TAGEBUCH
 *
 * js/zufall.js hebt die Schwelle, je mehr Vergleiche angestellt werden – wer
 * fünfzig Fragen stellt, bekommt eine zufällige Antwort geschenkt. Hier wird
 * genau eine Frage gestellt, vorher festgelegt, an einem Tag, der dafür
 * eingerichtet wurde. Deshalb rechnet diese Datei mit `vergleiche = 1`, und das
 * ist keine Nachlässigkeit, sondern der eigentliche Gewinn des Verfahrens: Ein
 * geplanter Test darf einen kleineren Unterschied ernst nehmen als eine
 * Entdeckung in derselben Datenmenge, weil vorher niemand suchen musste.
 *
 * WAS ER NICHT IST
 *
 * Nicht verblindet. Wer das Glas trinkt, weiß, was drin ist, und schon die
 * Erwartung kann echte Beschwerden auslösen (Nocebo-Effekt: „stellen sich
 * manchmal tatsächlich Symptome … ein“, gesund.bund.de/elektromagnetische-
 * felder-emf, Stand 24.03.2022; das heißt nicht, dass sich jemand Beschwerden
 * einbildet). Sie kann Beschwerden aber auch abschwächen: Bei gleicher
 * tatsächlicher Glutenmenge hatten Menschen, die glutenfreies Brot erwarteten,
 * deutlich weniger Magen-Darm-Beschwerden als die, die Gluten erwarteten
 * (de Graaf et al., Lancet Gastroenterol Hepatol 2024, PMID 38040019,
 * Abstract). Deshalb steht in jeder Ausgabe: **Ohne Verblindung ist keines der
 * Ergebnisse ein Nachweis** – weder das mit noch das ohne Reaktion. Bis zur
 * Fassung 29 hieß es hier, die Erwartung schiebe „nur in eine Richtung“ und
 * ein Test ohne Befund sei deshalb verlässlicher; das trägt keine Quelle.
 *
 * Reine Rechnung. Was gestartet und eingetragen wird, steht in js/store.js.
 */
import { plusTage, stundenDazwischen, tageDazwischen, tageszeitVon, zeitpunkt } from './datum.js';
import { reihenfolgeUnklar } from './auswertung.js';
import { zufallsSpielraum } from './zufall.js';
import { zaehltFuerBauch } from './wasser.js';

/** So viele Durchgänge mit der Sache, bevor überhaupt ein Urteil fällt. */
export const MINDEST_LAEUFE = 3;

/** Und so viele Leerdurchgänge, damit gegen sie verglichen werden darf. */
export const MINDEST_LEER = 2;

/**
 * Zwischen zwei Durchgängen: so viele Tage – eine Festlegung dieser App,
 * keine Vorgabe aus einer Quelle. Nach Milchzucker können Beschwerden „über
 * mehrere Stunden andauern“ (gesund.bund.de/laktoseintoleranz, Stand
 * 23.02.2026); wie lange ein Durchgang nachwirken kann, sagt keine
 * erreichbare Quelle. („damit nichts nachwirkt“ stand hier bis zur Fassung 29.)
 */
export const ABSTAND_TAGE = 2;

/** Eine ganze Stufe – dieselbe Schwelle wie überall in dieser App. */
export const PROVOKATION_SCHWELLE = 1;

/** Vorgaben, die sich beim Anlegen ändern lassen. */
export const NUECHTERN_STD = 4;
export const FENSTER_STD = 4;

const mittelAus = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);

/**
 * Was sich zu Hause überhaupt provozieren lässt – und womit.
 *
 * Eine kurze feste Liste und keine Ableitung aus der Bilanz, denn nicht jeder
 * Verdacht taugt für dieses Verfahren. „Fettiges" hat keine Menge, die man
 * nüchtern zu sich nimmt; Milchzucker, Fruchtzucker, Zuckeralkohole und Koffein
 * schon. Für Milch- und Fruchtzucker gibt es in der Praxis außerdem einen
 * Atemtest (siehe oben; North American Consensus, PMID 28323273: „Consensus
 * doses for … fructose and lactose BT were … 25 and 25 g“); für
 * Zuckeralkohole und Koffein nennt keine geprüfte Quelle einen solchen Test.
 * („Genau deshalb gibt es für diese vier auch in der Klinik einen Test“ stand
 * hier bis zur Fassung 29.)
 *
 * DIE MENGEN SIND ABSICHTLICH KLEINER ALS IN DER PRAXIS. Der Atemtest arbeitet
 * mit 25 g Laktose (PMID 28323273); 24 g stecken in etwa 500 ml Milch
 * (gesund.bund.de/laktoseintoleranz: „bis zu 24 Gramm Laktose über den Tag
 * verteilt: zum Beispiel 500 Milliliter Milch“). Seine Messwerte zeigen, ob
 * Milchzucker unverdaut bleibt; ob er Beschwerden macht, zeigen erst die
 * Beschwerden während des Tests (gesund.bund.de; europäische Leitlinie, PMID
 * 34431620). Hier steht dagegen eine Portion, wie sie im Alltag vorkommt, weil
 * hier die Frage zählt: „macht mir das, was ich tatsächlich esse,
 * Beschwerden".
 *
 * Woher die Mengen kommen: 250 ml Milch nennt gesund.bund.de als Beispiel für
 * „bis zu 12 Gramm Laktose auf einmal“, die normalerweise gut verträglich
 * sind. Die übrigen (Apfelsaft oder Apfel, Kaugummis oder Trockenpflaumen,
 * eine Tasse Kaffee) hat Body Check als Alltagsportionen festgelegt; sie
 * stammen aus keiner Quelle. Ob eine Unverträglichkeit vorliegt, klären
 * Ärztin oder Arzt – das sagt die Karte dazu (js/app.js).
 */
export const PRUEFBAR = [
  /*
   * Quelle: gesund.bund.de/laktoseintoleranz (Stand 23.02.2026), „Was sind die
   * Ursachen?“: Reicht die Laktase nicht aus, „bleibt im Dünndarm Milchzucker
   * übrig“, der im Dickdarm vergoren wird; „Woran bemerkt man …?“: Blähungen,
   * Unterbauchschmerzen, Durchfall u. a., „frühestens eine halbe Stunde“ danach,
   * am stärksten „nach etwa eineinhalb bis zwei Stunden“, „über mehrere
   * Stunden“. Bis zur Fassung 29: „Fehlt das spaltende Enzym“ und „meist ein
   * bis vier Stunden danach“ – so stand es dort nicht.
   */
  {
    id: 'laktose',
    name: 'Laktose – Milchzucker',
    was: '250 ml Milch',
    warum: 'Reicht das spaltende Enzym (Laktase) nicht aus, bleibt Milchzucker übrig und '
      + 'wird im Dickdarm von Bakterien vergoren: Blähungen, Bauchschmerzen, Durchfall. '
      + 'Die Beschwerden beginnen frühestens nach einer halben Stunde, sind nach etwa '
      + 'eineinhalb bis zwei Stunden am stärksten und können mehrere Stunden anhalten.',
  },
  /*
   * Quelle: EMA/CHMP/460886/2014, Information for the package leaflet regarding
   * fructose and sorbitol (9. Oktober 2017), 3.1: „fructose absorption is
   * dose-dependent and facilitated by the simultaneous ingestion of glucose“;
   * 4.1: „It occurs when the amount of fructose consumed is more than the small
   * intestines can absorb. Unabsorbed fructose acts as an osmotic load which
   * can cause diarrhoea and other gastrointestinal symptoms“, und die erbliche
   * Fruktoseintoleranz (HFI) ist davon zu unterscheiden – bei ihr reichert sich
   * in der Leber ein giftiges Abbauprodukt an. Bis zur Fassung 29: „Der
   * häufigste und der am meisten übersehene“ und „Apfelsaft ist die
   * unbarmherzigste Form“ – das sagt keine erreichbare Quelle.
   *
   * Der Ausschluss so deutlich wie NICHT_BEI_ALLERGIE unten. Dieselbe Quelle,
   * Tabelle zum Einnahmeweg „Oral“ (S. 5): „a rare genetic disorder in which a
   * person cannot break down fructose“, und in der Spalte Comments: „Patients
   * with hereditary fructose intolerance (HFI) should not take/be given this
   * medicinal product.“ Bis zur Fassung 30: „Nicht gedacht bei …“ – schwächer
   * als die Quelle, und „das ist eine andere Erkrankung“ ließ sich so lesen, als
   * erkenne der Test sie bloß nicht.
   */
  {
    id: 'fruktose',
    name: 'Fruktose – Fruchtzucker',
    was: '200 ml Apfelsaft oder ein großer Apfel',
    warum: 'Der Dünndarm nimmt Fruchtzucker nur bis zu einer gewissen Menge auf; wie '
      + 'viel, hängt davon ab, wie viel auf einmal kommt und ob gleichzeitig Traubenzucker '
      + 'dabei ist. Was nicht aufgenommen wird, kann Durchfall und andere '
      + 'Magen-Darm-Beschwerden auslösen. Nicht anwenden bei der seltenen erblichen '
      + 'Fruktoseintoleranz: Bei ihr kann der Körper Fruchtzucker nicht abbauen.',
  },
  /*
   * Quellen: EMA/CHMP/460886/2014 (siehe oben), 3.1: „Sorbitol is incompletely
   * absorbed“, Aufnahme als Einzeldosis „no more than 2–10 g“, „it has been
   * suggested that, when given together, sorbitol and fructose compete for
   * absorption“; Tabelle: „Sorbitol may cause gastrointestinal discomfort and
   * mild laxative effect“; Sorbitol „is a source of fructose“ (Hinweis zur
   * HFI). medikamio.com, Fructoseintoleranz: Sorbit steckt „in zuckerfreien
   * Süßigkeiten und Früchten wie Pflaumen oder Marillen“; medikamio.com,
   * Verstopfung: „Trockenpflaumen … enthalten jedoch oft eine große Menge an
   * Sorbit, das an sich abführend wirkt“. Bis zur Fassung 29: „in allem
   * Zuckerfreien“, „kaum aufgenommen“, „verstärkt obendrein die Wirkung“ – zu
   * bestimmt für diese Quellen.
   */
  {
    id: 'sorbit',
    name: 'Sorbit – Zuckeralkohol',
    was: '3 zuckerfreie Kaugummis oder 5 Trockenpflaumen',
    warum: 'Steckt als Süßungsmittel in manchen „zuckerfreien“ Süßigkeiten und kommt in '
      + 'manchen Früchten vor, in Trockenpflaumen oft reichlich. Der Darm nimmt es nur '
      + 'begrenzt auf; größere Mengen können Bauchbeschwerden machen und leicht '
      + 'abführend wirken. Zusammen mit Fruchtzucker konkurriert es womöglich um die '
      + 'Aufnahme. Sorbit ist eine Quelle von Fruchtzucker – nicht anwenden bei der '
      + 'seltenen erblichen Fruktoseintoleranz.',
  },
  /*
   * Quellen: Nehlig, Effects of Coffee on the Gastro-Intestinal Tract,
   * Nutrients 2022;14(2):399, PMID 35057580, Abstract: „the stimulation of
   * gastric acid secretion … the stimulation of colic motility“ – das gilt für
   * Kaffee, nicht für Koffein allein. Beschwerden bei leerem Magen:
   * gesund.bund.de/zwoelffingerdarmgeschwuer (Stand 27.01.2022): „eher bei
   * leerem Magen“; gesund.bund.de/reizmagen-funktionelle-dyspepsie (Stand
   * 05.02.2026): „Treten diese Beschwerden über Monate hinweg immer wieder auf,
   * sollte man sie ärztlich abklären lassen.“ Bis zur Fassung 29: „Nüchtern
   * trifft es am deutlichsten“ und „Ein leerer Magen tut auch ohne Kaffee weh“
   * – das Erste sagt keine Quelle, das Zweite machte ein Zeichen, das abgeklärt
   * gehören kann, zum Normalfall.
   */
  {
    id: 'koffein',
    name: 'Koffein',
    was: 'eine Tasse Kaffee',
    warum: 'Kaffee regt laut einer Übersichtsarbeit die Bildung von Magensäure und die '
      + 'Bewegung des Dickdarms an. Getestet wird nüchtern, und Beschwerden bei leerem '
      + 'Magen können auch andere Ursachen haben – deshalb ist gerade hier der '
      + 'Leerdurchgang wichtig. Kommen Magenbeschwerden über Monate immer wieder, '
      + 'gehören sie ärztlich abgeklärt.',
  },
];

/**
 * Wofür dieses Verfahren *nicht* gedacht ist.
 *
 * Der eine Satz, der in dieser Datei aus einem anderen Grund steht als alle
 * übrigen. Eine Milchzucker-Unverträglichkeit „ist keine Allergie“: Wer sie
 * hat, verträgt bestimmte Mengen (gesund.bund.de/laktoseintoleranz). Eine
 * Nahrungsmittelallergie setzt meist innerhalb einer halben Stunde ein und
 * kann zu einer anaphylaktischen Reaktion führen, mit Blutdruckabfall,
 * Bewusstlosigkeit, Schwellungen und Atemnot; mögliche Zeichen sind auch
 * Schwellungen der Mund- und Rachenschleimhaut und Hautausschläge. Weil
 * andere Erkrankungen ähnliche Beschwerden machen können („Die
 * Verwechslungsgefahr ist hoch“), gehört ein Verdacht ärztlich abgeklärt; ein
 * Provokationstest findet dann „unter ärztlicher Beobachtung“ statt
 * (gesund.bund.de/nahrungsmittelallergie, Stand 27.05.2024). Bis zur
 * Fassung 29 hieß es „Das wäre eine Allergie“ – das stellte eine Diagnose,
 * wo die Quelle einen Verdacht nennt.
 */
export const NICHT_BEI_ALLERGIE = 'Nicht anwenden, wenn du nach dieser Sache '
  + 'schon einmal Ausschlag, Schwellungen im Mund oder Rachen, Atemnot oder '
  + 'Kreislaufprobleme hattest. Solche Beschwerden können auf eine Allergie '
  + 'hindeuten, ähnliche aber auch andere Ursachen haben. Das wird nicht zu Hause '
  + 'provoziert, sondern ärztlich abgeklärt – ein Provokationstest findet dann unter '
  + 'ärztlicher Beobachtung statt.';

/**
 * Ein einzelner Durchgang: was danach kam, und ob er zählt.
 *
 * `sauber` ist die härteste Bedingung des ganzen Verfahrens, und sie wird
 * nicht geglaubt, sondern im Tagebuch nachgesehen. Steht im Nüchternfenster
 * oder im Beobachtungsfenster eine Mahlzeit, ist der Durchgang keine Antwort –
 * kein Vorwurf, aber auch kein Ergebnis. Ihn trotzdem mitzuzählen hieße, die
 * eine Eigenschaft wegzuwerfen, für die jemand auf sein Frühstück verzichtet
 * hat.
 */
export function laufBild(eintraege, lauf, p, vorheriger = null) {
  const t0 = zeitpunkt(lauf.am, lauf.um);
  const nuechtern = Number(p.nuechtern) || NUECHTERN_STD;
  const fenster = Number(p.fenster) || FENSTER_STD;

  const mahlzeiten = (eintraege || []).filter((e) => e.art === 'essen');
  const davor = mahlzeiten.filter((e) => {
    const d = stundenDazwischen(zeitpunkt(e.am, e.um), t0);
    return d > 0 && d < nuechtern;
  });
  const waehrend = mahlzeiten.filter((e) => {
    const d = stundenDazwischen(t0, zeitpunkt(e.am, e.um));
    return d > 0 && d <= fenster;
  });
  /*
   * Mit den Zeitknöpfen eingetragen, steht ein Frühstück „morgens" auf acht
   * Uhr – womöglich auf derselben Minute wie der Durchgang. Ob es davor,
   * danach oder weit weg davon war, weiß dann niemand. Ein Durchgang, bei dem
   * das offen ist, zählt nicht: Sonst wäre er sauber, weil eine Minute
   * ausgedacht ist. Ob gegessen wurde, hängt nicht davon ab, wie der
   * Durchgang ausging – dieser Grund siebt nicht nach dem Ergebnis.
   *
   * Eine Beschwerde „morgens" ohne Bezug zum Essen ist offen auf dieselbe
   * Weise, und doch etwas anderes: Sie *ist* das Ergebnis. Wer Durchgänge mit
   * einer solchen Beschwerde verwirft, verwirft genau die mit Reaktion und
   * behält die ruhigen – und am Ende stünde „bestätigt sich nicht", obwohl
   * gerade die Reaktionen aussortiert wären. Deshalb zählt sie als
   * Wert des Durchgangs, bei Durchgängen mit der Sache wie bei
   * Leerdurchgängen. War sie in Wahrheit schon vorher da, ist sie genau das,
   * was der Leerdurchgang auffängt: Sie steht dann auf beiden Seiten.
   */
  const ort = { am: lauf.am, um: lauf.um };
  const ungefaehrGegessen = mahlzeiten.filter((e) => e.ungefaehr && e.am === lauf.am
    && !davor.includes(e) && !waehrend.includes(e) && tageszeitVon(e) === tageszeitVon(ort));
  const ungefaehrBeschwerde = (eintraege || [])
    .filter((e) => e.art === 'beschwerde' && reihenfolgeUnklar(ort, e));

  const wert = (eintraege || [])
    .filter((e) => e.art === 'beschwerde')
    .filter((e) => {
      const d = stundenDazwischen(t0, zeitpunkt(e.am, e.um));
      return (d >= 0 && d <= fenster) || ungefaehrBeschwerde.includes(e);
    })
    .reduce((m, e) => Math.max(m, Number(e.staerke) || 0), 0);

  /*
   * Zu dicht am vorherigen Durchgang zählt ebenfalls nicht: Der Abstand
   * (ABSTAND_TAGE) ist eine Festlegung dieser App, damit jeder Durchgang für
   * sich ausgewertet wird (siehe dort).
   */
  const zuNah = vorheriger ? tageDazwischen(vorheriger.am, lauf.am) < ABSTAND_TAGE : false;

  const warum = [];
  if (davor.length) warum.push(`${davor.length}× gegessen in den ${nuechtern} Stunden davor`);
  if (waehrend.length) warum.push(`${waehrend.length}× gegessen im Beobachtungsfenster`);
  if (ungefaehrGegessen.length) {
    warum.push(`${ungefaehrGegessen.length}× gegessen zur selben Tageszeit, ohne genaue Uhrzeit`);
  }
  if (zuNah) warum.push(`weniger als ${ABSTAND_TAGE} Tage nach dem vorigen Durchgang`);

  return {
    am: lauf.am,
    um: lauf.um,
    leer: !!lauf.leer,
    wert,
    sauber: warum.length === 0,
    warum,
    // Woran es lag – für den Satz über die verworfenen Durchgänge, der sonst
    // „weil dabei gegessen wurde" sagte, auch wo nur der Abstand fehlte.
    gegessen: davor.length > 0 || waehrend.length > 0 || ungefaehrGegessen.length > 0,
    zuNah,
    // Eine Beschwerde ohne genaue Uhrzeit zählt mit (siehe oben) – die
    // Anzeige sagt das beim Durchgang dazu.
    ungefaehr: ungefaehrBeschwerde.length > 0,
  };
}

/**
 * Der Alltagsvergleich, wenn keine Leerdurchgänge da sind.
 *
 * Genommen wird dasselbe Fenster derselben Uhrzeit an Tagen, an denen kein
 * Durchgang war – der eigene Normalzustand zur selben Tageszeit. Das ist der
 * zweitbeste Vergleich und wird auch so benannt: An diesen Tagen wurde
 * gefrühstückt, an den Testtagen nicht, und dieser Unterschied bleibt in der
 * Rechnung stehen.
 */
function alltagsWerte(eintraege, p, laufTage, heute) {
  const fenster = Number(p.fenster) || FENSTER_STD;
  const uhr = (p.laeufe && p.laeufe[0] && p.laeufe[0].um) || '08:00';
  const werte = [];
  const tage = new Set(laufTage);
  const start = p.laeufe && p.laeufe.length ? p.laeufe[p.laeufe.length - 1].am : heute;

  for (let i = 0; i <= tageDazwischen(plusTage(start, -30), heute); i++) {
    const iso = plusTage(plusTage(start, -30), i);
    if (tage.has(iso)) continue;
    const amTag = (eintraege || []).filter((e) => e.am === iso);
    // Ein Tag ohne jede Eintragung ist kein ruhiger Tag, sondern ein
    // unbekannter. Er darf den Vergleichswert nicht nach unten ziehen. Ein
    // Tag mit nur einem Kopfschmerz ebenso wenig – zum Bauch steht da nichts –,
    // und einer mit nur einer Aktivität auch nicht.
    if (!amTag.some(zaehltFuerBauch)) continue;
    const t0 = zeitpunkt(iso, uhr);
    // Eine Beschwerde ohne genaue Uhrzeit in derselben Tageszeit zählt hier
    // wie am Testmorgen (siehe laufBild) – sonst zählte die Testseite
    // großzügiger als ihr Vergleich.
    const ort = { am: iso, um: uhr };
    werte.push(amTag
      .filter((e) => e.art === 'beschwerde')
      .filter((e) => {
        const d = stundenDazwischen(t0, zeitpunkt(e.am, e.um));
        return (d >= 0 && d <= fenster) || reihenfolgeUnklar(ort, e);
      })
      .reduce((m, e) => Math.max(m, Number(e.staerke) || 0), 0));
  }
  return werte;
}

export const PROVOKATION_WORT = {
  laeuft: 'läuft noch',
  unsauber: 'nicht auswertbar',
  bestaetigt: 'bestätigt sich',
  offen: 'deutet sich an',
  wechselhaft: 'mal so, mal so',
  'nicht-bestaetigt': 'bestätigt sich nicht',
  abgebrochen: 'abgebrochen',
};

/**
 * Das Ergebnis über alle Durchgänge.
 *
 * Zwei Zahlen tragen es, und beide stehen in der Ausgabe: wie *stark* im Mittel
 * reagiert wurde, und in wie *vielen* Durchgängen überhaupt. Sie sagen
 * Verschiedenes. Dreimal mittelmäßig ist ein anderer Befund als einmal heftig
 * und zweimal gar nicht, obwohl der Mittelwert derselbe sein kann. Welcher
 * Fall häufiger ist, sagt keine Quelle („der zweite Fall ist der häufigere“
 * stand hier bis zur Fassung 29). Ein wechselndes Ergebnis lässt mehrere
 * Deutungen zu: Bei einer Laktoseintoleranz hängt es von der Menge ab, ob
 * Beschwerden auftreten, und davon, ob Milch zusammen mit anderen
 * Lebensmitteln aufgenommen wird (gesund.bund.de/laktoseintoleranz, Stand
 * 23.02.2026); ein Reizdarm zeigt sich häufig schubweise
 * (gesund.bund.de/reizdarmsyndrom, Stand 28.08.2024); und die Beschwerden
 * können mit der Sache auch nichts zu tun haben. Nur den Mittelwert zu zeigen
 * hieße, diesen Unterschied zu verstecken.
 */
export function provokationsBild(p, eintraege, heute) {
  if (!p) return null;
  const eintr = eintraege || [];
  const laeufe = [...(p.laeufe || [])].sort((a, b) => (a.am < b.am ? -1 : 1));

  const bilder = [];
  let letzterEcht = null;
  laeufe.forEach((l) => {
    const b = laufBild(eintr, l, p, l.leer ? null : letzterEcht);
    if (!l.leer) letzterEcht = l;
    bilder.push(b);
  });

  const echte = bilder.filter((b) => !b.leer && b.sauber);
  const leere = bilder.filter((b) => b.leer && b.sauber);
  const verworfen = bilder.filter((b) => !b.sauber);

  const grund = {
    laeufe: bilder,
    echte: echte.length,
    leere: leere.length,
    verworfen: verworfen.length,
    was: p.was || '',
  };

  if (p.beendet) {
    return {
      ...grund,
      urteil: 'abgebrochen',
      wort: PROVOKATION_WORT.abgebrochen,
      satz: `Abgebrochen nach ${echte.length} auswertbaren Durchgängen. Auch das ist `
        + 'eine Auskunft – ein Test, den man nicht durchhält, ist im Alltag keine '
        + 'Antwort.',
    };
  }

  if (echte.length < MINDEST_LAEUFE) {
    const fehlt = MINDEST_LAEUFE - echte.length;
    // Der Grund, der wirklich dahintersteht: Gegessen wurde nicht bei jedem
    // verworfenen Durchgang – mancher lag nur zu dicht am vorigen.
    const nurEssen = verworfen.every((b) => b.gegessen && !b.zuNah);
    const klammer = verworfen.length
      ? ` (${verworfen.length} ${verworfen.length === 1 ? 'zählt' : 'zählen'} nicht mit, `
        + `${nurEssen ? 'weil dabei gegessen wurde' : 'warum, steht beim Durchgang'})`
      : '';
    return {
      ...grund,
      urteil: 'laeuft',
      wort: PROVOKATION_WORT.laeuft,
      satz: `Noch ${fehlt} auswertbare${fehlt === 1 ? 'r' : ''} Durchgang${fehlt === 1 ? '' : 'e'}`
        + `, dann steht hier ein Ergebnis${klammer}. `
        + `Ein einzelner Durchgang beweist nichts: An genau dem Tag können auch `
        + `Schlaf, Anspannung oder der Zyklus schuld sein. Erst die Wiederholung `
        + `trennt die Sache vom Tag.`,
    };
  }

  /*
   * Woran gemessen wird. Der Leerdurchgang ist der bessere Vergleich, weil er
   * das Nüchternsein auf beiden Seiten stehen lässt; ohne ihn bleibt der eigene
   * Alltag zur selben Uhrzeit – und mit ihm ein Rest Unklarheit, der benannt
   * gehört statt weggerechnet zu werden.
   */
  const gegenLeer = leere.length >= MINDEST_LEER;
  const vergleichsWerte = gegenLeer
    ? leere.map((b) => b.wert)
    : alltagsWerte(eintr, p, laeufe.map((l) => l.am), heute);
  const grundlage = gegenLeer ? 'leerdurchgang' : 'alltag';

  const testWerte = echte.map((b) => b.wert);
  const schnitt = mittelAus(testWerte);
  const vergleich = mittelAus(vergleichsWerte);
  const unterschied = schnitt - vergleich;

  // vergleiche = 1: genau eine Frage, vorher festgelegt. Siehe oben.
  const { spielraum } = zufallsSpielraum(testWerte, vergleichsWerte, 1);
  const schranke = Math.max(PROVOKATION_SCHWELLE, spielraum);

  // „Reagiert" heißt: über dem eigenen Vergleichswert, nicht über null.
  const reagiert = echte.filter((b) => b.wert - vergleich >= PROVOKATION_SCHWELLE).length;

  const zahlen = `${schnitt.toFixed(1).replace('.', ',')} gegen `
    + `${vergleich.toFixed(1).replace('.', ',')} von 10, aus ${echte.length} Durchgängen `
    + `gegen ${gegenLeer ? `${leere.length} Leerdurchgänge` : `${vergleichsWerte.length} Alltagstage`}.`;

  const nachsatz = gegenLeer
    ? ''
    : ' Verglichen wird hier mit dem eigenen Alltag zur selben Uhrzeit – an diesen '
      + 'Tagen wurde aber gefrühstückt und an den Testtagen nicht. Zwei '
      + 'Leerdurchgänge (nüchtern, gleiche Zeit, ohne die Sache) würden genau '
      + 'diesen Rest ausräumen: Manche Magenbeschwerden treten gerade bei leerem '
      + 'Magen auf und sähen sonst aus wie eine Unverträglichkeit. Kommen sie über '
      + 'Monate immer wieder, gehören sie ärztlich abgeklärt.';

  if (vergleichsWerte.length < 2) {
    return {
      ...grund,
      urteil: 'laeuft',
      wort: PROVOKATION_WORT.laeuft,
      grundlage,
      schnitt,
      satz: 'Es fehlt der Vergleich. Zwei Leerdurchgänge – nüchtern, gleiche Uhrzeit, '
        + 'ohne die Sache – machen aus den Durchgängen erst einen Test. Ohne sie '
        + 'lässt sich nicht trennen, ob die Beschwerden von der Sache kommen oder '
        + 'damit zusammenhängen, nüchtern zu sein – manche Magenbeschwerden treten '
        + 'gerade bei leerem Magen auf.',
    };
  }

  const gemeinsam = {
    ...grund, grundlage, schnitt, vergleich, unterschied, spielraum, schranke, reagiert,
  };

  if (unterschied >= schranke && reagiert > echte.length / 2) {
    return {
      ...gemeinsam,
      urteil: 'bestaetigt',
      wort: PROVOKATION_WORT.bestaetigt,
      satz: `In ${reagiert} von ${echte.length} Durchgängen kam es, und im Mittel `
        + `deutlich stärker als ohne: ${zahlen} Weil die Frage vorher feststand, `
        + `zählt dieser Unterschied schwerer als derselbe Unterschied im Tagebuch – `
        + `hier musste niemand erst suchen. Was fehlt, ist die Verblindung: Du `
        + `wusstest jedes Mal, was du zu dir nimmst, und schon die Erwartung kann `
        + `echte Beschwerden auslösen. Das ist ein Hinweis und kein Nachweis; `
        + `einordnen lässt er sich in der Praxis.${nachsatz}`,
    };
  }

  /*
   * Quellen zum Satz: gesund.bund.de/laktoseintoleranz (Menge, „gleichzeitig
   * mit anderen Lebensmitteln“), /reizdarmsyndrom („schubweise“),
   * /praemenstruelles-syndrom-pms (Stand 21.10.2022: vor der Regelblutung
   * „Schlaf- oder Verdauungsprobleme“). Bis zur Fassung 29 stand hier „der
   * häufigste“ Befund und der Rat, mit einer kleineren Menge weiterzumachen
   * statt wegzulassen – beides ist gestrichen: eine Empfehlung zum Essen gibt
   * Body Check nicht.
   */
  if (reagiert > 0 && reagiert <= echte.length / 2) {
    return {
      ...gemeinsam,
      urteil: 'wechselhaft',
      wort: PROVOKATION_WORT.wechselhaft,
      satz: `In ${reagiert} von ${echte.length} Durchgängen kam es, in den übrigen `
        + `nicht (${zahlen}) Das ist selbst ein Befund: Die Beschwerden kamen nicht `
        + `jedes Mal. Woran das liegt, lässt sich daraus nicht sicher ablesen. Bei einer `
        + `Laktoseintoleranz etwa hängt es von der Menge ab und davon, ob zugleich `
        + `anderes gegessen wird; Darmbeschwerden kommen auch in Schüben, und vor der `
        + `Regelblutung können Verdauungsprobleme auftreten. Was daraus für dein Essen `
        + `folgt, lässt sich in der Praxis besprechen.${nachsatz}`,
    };
  }

  /*
   * Mehr als die Hälfte der Durchgänge über dem Vergleich, aber der
   * Unterschied noch innerhalb dessen, was bei dieser Streuung und so wenigen
   * Werten auch der Zufall hergibt. Das ist kein „bestätigt sich" – und erst
   * recht kein „kein Unterschied": Das stünde da, während die Zahlen gerade
   * in die andere Richtung zeigen. Was hilft, sind mehr Durchgänge auf
   * beiden Seiten.
   */
  if (reagiert > echte.length / 2) {
    return {
      ...gemeinsam,
      urteil: 'offen',
      wort: PROVOKATION_WORT.offen,
      satz: `In ${reagiert} von ${echte.length} Durchgängen kam es (${zahlen}) Das deutet `
        + 'auf eine Reaktion, ist aber noch nicht sicher vom Zufall zu trennen: Dafür '
        + 'schwanken die Werte zu stark, oder es gibt zu wenige Vergleiche. Ein, zwei '
        + `weitere Durchgänge und Leerdurchgänge machen das Ergebnis klarer.${nachsatz}`,
    };
  }

  return {
    ...gemeinsam,
    urteil: 'nicht-bestaetigt',
    wort: PROVOKATION_WORT['nicht-bestaetigt'],
    /*
     * Ohne „das belastbarste Ergebnis“ und „schiebt nur in eine Richtung“
     * (bis zur Fassung 29): Erwartung kann Beschwerden auch abschwächen
     * (de Graaf 2024, PMID 38040019, siehe Kopf dieser Datei).
     */
    satz: `Kein Unterschied zum Vergleich: ${zahlen} Mit dieser Menge zeigte sich in `
      + `diesen Durchgängen keine Reaktion. Auch dieses Ergebnis ist ohne Verblindung `
      + `kein Nachweis: Du wusstest jedes Mal, was du zu dir nimmst, und Erwartungen `
      + `können Beschwerden verstärken, aber auch abschwächen. Was das für dein Essen `
      + `heißt, lässt sich in der Praxis besprechen.${nachsatz}`,
  };
}

/**
 * Was jetzt zu tun ist – die eine Zeile für den Tagesreiter.
 *
 * Ein Test ohne diese Zeile wird vergessen. Er besteht ja gerade nicht aus
 * einem Knopf, sondern aus Terminen, die man sich selbst setzt.
 */
export function naechsterSchritt(p, heute, urteil = null) {
  if (!p || p.beendet) return null;
  const laeufe = [...(p.laeufe || [])].sort((a, b) => (a.am < b.am ? -1 : 1));
  const letzter = laeufe[laeufe.length - 1];
  const echte = laeufe.filter((l) => !l.leer).length;
  const leere = laeufe.filter((l) => l.leer).length;

  if (letzter && tageDazwischen(letzter.am, heute) < ABSTAND_TAGE) {
    /*
     * `am` ist der Tag, an dem der nächste Durchgang dran ist. Er wird hier
     * ausgerechnet, weil hier die Frist steht – die Anzeige braucht ihn nur,
     * um daraus einen Kalendertermin zu machen, und soll sie nicht ein zweites
     * Mal nachrechnen.
     */
    return {
      dran: false,
      am: plusTage(letzter.am, ABSTAND_TAGE),
      titel: `Body Check: ${p.was || 'Provokationstest'} – nächster Durchgang`,
      satz: `Heute nicht – Body Check lässt zwischen zwei Durchgängen ${ABSTAND_TAGE} `
        + 'Tage Abstand, damit jeder für sich ausgewertet wird. Das ist eine Festlegung '
        + 'der App, keine ärztliche Vorgabe.',
    };
  }
  if (echte < MINDEST_LAEUFE) {
    return {
      dran: true,
      leer: false,
      satz: `Morgen früh nüchtern: ${p.was || 'die festgelegte Menge'}. Danach `
        + `${p.fenster || FENSTER_STD} Stunden nichts essen und eintragen, wie es dir geht.`,
    };
  }
  if (leere < MINDEST_LEER) {
    return {
      dran: true,
      leer: true,
      satz: 'Jetzt ein Leerdurchgang: derselbe Ablauf, gleiche Uhrzeit, nüchtern – '
        + 'nur ohne die Sache. Er kostet einen Morgen und ist der Teil, der aus '
        + 'den Durchgängen einen Test macht.',
    };
  }
  /*
   * „Deutet sich an": Mehr Durchgänge machen es klarer, und zwar abwechselnd –
   * ein weiterer mit der Sache, dann ein weiterer Leerdurchgang. Nur eine
   * Seite zu verlängern, verschöbe den Vergleich.
   */
  if (urteil === 'offen') {
    const leer = !!letzter && !letzter.leer;
    return {
      dran: true,
      leer,
      satz: leer
        ? 'Noch ein Leerdurchgang: derselbe Ablauf, gleiche Uhrzeit, nüchtern – nur ohne '
          + 'die Sache. Mehr Vergleiche machen das Ergebnis klarer.'
        : `Noch ein Durchgang: morgen früh nüchtern ${p.was || 'die festgelegte Menge'}, `
          + `danach ${p.fenster || FENSTER_STD} Stunden nichts essen und eintragen, wie es dir geht.`,
    };
  }
  return { dran: false, satz: 'Genug Durchgänge beisammen – das Ergebnis steht unten.' };
}
