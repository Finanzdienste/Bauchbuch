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
 * mehrmals. Genau so wird auf Laktose- und Fruktoseunverträglichkeit geprüft;
 * in der Klinik misst dabei ein Atemtest den Wasserstoff mit, zu Hause bleibt
 * die Beschwerdestärke. Der Aufbau ist derselbe.
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
 *      selbst zum Verdächtigen. Nüchternschmerz ist bei Magenbeschwerden ein
 *      eigenes Muster – diese App führt es an anderer Stelle sogar auf. Wer
 *      ohne Leerdurchgang testet, kann einen Magen, der leer wehtut, nicht von
 *      einer Unverträglichkeit unterscheiden.
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
 * Nicht verblindet. Wer das Glas trinkt, weiß, was drin ist, und Erwartung
 * erzeugt bei Bauchbeschwerden echte Beschwerden – das ist keine Einbildung
 * zweiter Klasse, das ist Physiologie. Daraus folgt eine Schieflage, die in
 * jeder Ausgabe steht: **Ein Test, der nichts findet, ist verlässlicher als
 * einer, der etwas findet.** Die Erwartung schiebt nur in eine Richtung. Wer
 * nach drei sauberen Durchgängen nichts merkt, hat eine echte Entlastung; wer
 * etwas merkt, hat einen starken Verdacht und keinen Beweis.
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

/** Zwischen zwei Durchgängen: so viele Tage, damit nichts nachwirkt. */
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
 * schon. Genau deshalb gibt es für diese vier auch in der Klinik einen Test.
 *
 * DIE MENGEN SIND ABSICHTLICH KLEINER ALS IN DER KLINIK. Ein Atemtest arbeitet
 * mit 25 g Laktose – das sind gut 500 ml Milch, und die Menge beantwortet die
 * Frage „liegt eine Malabsorption vor". Hier steht eine alltagsübliche Menge,
 * weil hier die andere Frage zählt: „macht mir das, was ich tatsächlich esse,
 * Beschwerden". Nur die zweite ändert etwas am Alltag – und die Testdosis
 * eigenhändig zu Hause zu nehmen, macht vor allem einen scheußlichen Tag.
 */
export const PRUEFBAR = [
  {
    id: 'laktose',
    name: 'Laktose – Milchzucker',
    was: '250 ml Milch',
    warum: 'Fehlt das spaltende Enzym, bleibt der Milchzucker liegen und wird im '
      + 'Dickdarm vergoren: Gas, Krämpfe, weicher Stuhl, meist ein bis vier '
      + 'Stunden danach.',
  },
  {
    id: 'fruktose',
    name: 'Fruktose – Fruchtzucker',
    was: '200 ml Apfelsaft oder ein großer Apfel',
    warum: 'Der häufigste und der am meisten übersehene: Fruchtzucker wird nur '
      + 'begrenzt aufgenommen, und was übrig bleibt, wird vergoren. Apfelsaft '
      + 'ist die unbarmherzigste Form, weil er viel davon auf einmal liefert.',
  },
  {
    id: 'sorbit',
    name: 'Sorbit – Zuckeralkohol',
    was: '3 zuckerfreie Kaugummis oder 5 Trockenpflaumen',
    warum: 'Steckt in allem „Zuckerfreien" und in getrocknetem Obst. Wird kaum '
      + 'aufgenommen und zieht Wasser in den Darm – und verstärkt obendrein die '
      + 'Wirkung von Fruchtzucker, wenn beides zusammen kommt.',
  },
  {
    id: 'koffein',
    name: 'Koffein',
    was: 'eine Tasse Kaffee',
    warum: 'Regt die Säurebildung an und beschleunigt den Darm. Nüchtern trifft '
      + 'es am deutlichsten – deshalb ist gerade hier der Leerdurchgang wichtig: '
      + 'Ein leerer Magen tut auch ohne Kaffee weh.',
  },
];

/**
 * Wofür dieses Verfahren *nicht* gedacht ist.
 *
 * Der eine Satz, der in dieser Datei aus einem anderen Grund steht als alle
 * übrigen. Eine Unverträglichkeit ist mengenabhängig und unangenehm; eine
 * Allergie ist etwas anderes und kann in Minuten gefährlich werden. Wer bei
 * einem Lebensmittel schon einmal Ausschlag, Schwellung, Atemnot oder
 * Kreislaufprobleme hatte, darf es nicht auf eigene Faust noch einmal
 * versuchen – das gehört unter Aufsicht, mit dem Nötigen im Raum.
 */
export const NICHT_BEI_ALLERGIE = 'Nicht anwenden, wenn du bei dieser Sache '
  + 'schon einmal Ausschlag, Schwellung im Mund oder Hals, Atemnot oder '
  + 'Kreislaufprobleme hattest. Das wäre eine Allergie und keine '
  + 'Unverträglichkeit – die wird nicht zu Hause provoziert, sondern ärztlich '
  + 'abgeklärt.';

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
   * behält die ruhigen – und am Ende stünde „bestätigt sich nicht", das
   * Ergebnis, das dieser Test das belastbarste nennt. Deshalb zählt sie als
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
   * Zu dicht am vorherigen Durchgang ist ebenfalls unsauber, und zwar aus
   * demselben Grund: Was noch von gestern nachhallt, gehört nicht dem heutigen
   * Glas.
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
 * und zweimal gar nicht, obwohl der Mittelwert derselbe sein kann – und der
 * zweite Fall ist der häufigere, weil eine Unverträglichkeit von der Menge und
 * vom Tag abhängt. Nur den Mittelwert zu zeigen hieße, den Unterschied
 * zwischen „das ist es" und „da ist noch etwas anderes im Spiel" zu verstecken.
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
      + 'diesen Rest ausräumen: Ein Magen, der leer wehtut, sieht sonst aus wie '
      + 'eine Unverträglichkeit.';

  if (vergleichsWerte.length < 2) {
    return {
      ...grund,
      urteil: 'laeuft',
      wort: PROVOKATION_WORT.laeuft,
      grundlage,
      schnitt,
      satz: 'Es fehlt der Vergleich. Zwei Leerdurchgänge – nüchtern, gleiche Uhrzeit, '
        + 'ohne die Sache – machen aus den Durchgängen erst einen Test. Ohne sie '
        + 'ist nicht zu trennen, ob die Beschwerden von der Sache kommen oder vom '
        + 'leeren Magen.',
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
        + `wusstest jedes Mal, was du zu dir nimmst, und Erwartung erzeugt echte `
        + `Beschwerden. Das ist ein starker Verdacht und kein Nachweis.${nachsatz}`,
    };
  }

  if (reagiert > 0 && reagiert <= echte.length / 2) {
    return {
      ...gemeinsam,
      urteil: 'wechselhaft',
      wort: PROVOKATION_WORT.wechselhaft,
      satz: `In ${reagiert} von ${echte.length} Durchgängen kam es, in den übrigen `
        + `nicht (${zahlen}) Das ist selbst ein Befund und der häufigste: Dann hängt `
        + `es nicht an der Sache allein, sondern an der Menge oder am Tag – wie viel `
        + `es war, wie voll der Bauch, welche Zyklusphase. Weglassen wäre hier `
        + `wahrscheinlich zu viel; eher lohnt ein zweiter Satz Durchgänge mit einer `
        + `kleineren Menge.${nachsatz}`,
    };
  }

  /*
   * Mehr als die Hälfte der Durchgänge über dem Vergleich, aber der
   * Unterschied noch innerhalb dessen, was bei dieser Streuung und so wenigen
   * Werten auch der Zufall hergibt. Das ist kein „bestätigt sich" – und erst
   * recht kein „kein Unterschied": Das stünde mit dem Satz da, es sei das
   * belastbarste Ergebnis, während die Zahlen gerade in die andere Richtung
   * zeigen. Was hilft, sind mehr Durchgänge auf beiden Seiten.
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
    satz: `Kein Unterschied zum Vergleich: ${zahlen} Das ist das belastbarste `
      + `Ergebnis, das dieser Test hergibt, und zwar mehr wert als ein positives: `
      + `Die Erwartung, die hier nicht ausgeschaltet werden kann, schiebt nur in `
      + `eine Richtung – zur Reaktion hin. Wer nüchtern und mehrfach nichts merkt, `
      + `hat das trotz dieser Schieflage nicht gemerkt.${nachsatz}`,
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
      satz: `Heute nicht – zwischen zwei Durchgängen liegen ${ABSTAND_TAGE} Tage, `
        + 'sonst hallt der letzte noch nach.',
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
