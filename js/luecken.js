/*
 * Was noch fehlt – und was nur eine Untersuchung beantworten kann.
 *
 * Bis hierher sagt die App, was sie sieht. Diese Datei sagt, was sie *nicht*
 * sieht, und das ist bei einem Tagebuch die nützlichere Hälfte. Zwei Sorten
 * Lücken, sauber getrennt, weil sie verschiedene Schlüsse verlangen:
 *
 *   1. **Lücken im Tagebuch.** Fragen, die offen sind, weil etwas nicht
 *      eingetragen wurde. Die kann sie selbst schließen, und hier steht, womit
 *      und wie viel es noch braucht. Das ist der Unterschied zwischen einer App,
 *      die mitschreibt, und einer, die weiterfragt.
 *
 *   2. **Lücken, die keine App schließt.** Helicobacter, Gewebe, Blutwerte,
 *      Atemtest. Dort steht nicht „unbekannt", sondern welche Untersuchung die
 *      Frage beantwortet – die eine Zeile, für die sich der ganze Aufwand
 *      lohnt, weil man sie beim Termin vorlesen kann.
 *
 * Kein Ranking von Diagnosen nach Wahrscheinlichkeit. Was hier je Verdacht
 * steht, ist: was dafür spricht, was dagegen, und was es entscheidet. Die
 * Entscheidung selbst fällt woanders.
 *
 * FASSUNG 30: GLEICHER WORTLAUT WIE DER KRITERIEN-KASTEN. Bis zur Fassung 29
 * standen hier Sätze, die die Fassung 30 im Kriterien-Kasten (kriterienTeil in
 * js/app.js) und im Arztbericht schon gestrichen hatte, weil keine Quelle sie
 * trägt: „ab 8 gilt Reflux als wahrscheinlich", „die PDS-/EPS-Kriterien sind
 * erfüllt (verlangt sind …)", „die Kriterien setzen voraus, dass nichts
 * Organisches dahintersteckt. Das entscheidet die Spiegelung", „die
 * Rom-Kriterien verlangen …". Dazu der Schluss aus einem Säureblocker ohne
 * Besserung („Wäre Säure die Ursache, wäre nach vier bis acht Wochen etwas zu
 * sehen"), der die Refluxkrankheit auf „spricht eher dagegen" stellte – die
 * Fachinformationen ziehen daraus keinen Schluss (Belege im Kopf von
 * js/ansprechen.js). Die Rechnungen in js/kriterien.js und js/ansprechen.js
 * sind unverändert; entfallen ist nur, was hier als Einordnung daraus wurde:
 * Der Punktwert und die gezählten Magenbeschwerden stehen ohne Schwelle unter
 * dem Verdacht, nicht mehr als „dafür" oder „dagegen", und bestimmen den
 * Stand nicht mehr. Quellen für den neuen Wortlaut stehen jeweils am Satz.
 */

/** Wie weit ein Verdacht aus dem Tagebuch heraus gestützt ist. */
export const STAND_WORT = {
  gestuetzt: 'passt zum Verlauf',
  moeglich: 'kommt in Frage',
  unwahrscheinlich: 'spricht eher dagegen',
  offen: 'nicht beurteilbar',
};

/* ---------------------------------------------------------------------------
 * 1. Was sie selbst schließen kann
 * ---------------------------------------------------------------------------
 *
 * Sortiert nach Gewicht: Was die meisten Fragen auf einmal aufmacht, steht
 * oben. Eine Liste mit fünfzehn Punkten liest niemand – die Anzeige nimmt die
 * ersten paar.
 */
export function tagebuchLuecken(d) {
  const raus = [];
  const k = d.kriterien;
  const s = d.stuhl;
  const nimm = (id, gewicht, titel, text) => raus.push({ id, gewicht, titel, text });

  if (s.gesamt === 0) {
    nimm('stuhl', 10, 'Stuhlgang eintragen',
      'Die größte Lücke. Ohne eingetragenen Stuhlgang fehlen dem Reizdarm-Kasten '
      + 'unter „Muster“ die Angaben zu Häufigkeit und Form, und er kann keinen Typ '
      + 'bestimmen – Verstopfung, Durchfall, gemischt. Zwei Tipper am Tag, mit '
      + 'Bildchen statt Text.');
  } else if (s.gesamt < 15) {
    nimm('stuhl', 8, 'Weiter Stuhlgang eintragen',
      `${s.gesamt} von 15 Eintragungen. Ab fünfzehn lässt sich der Typ `
      + 'bestimmen; darunter kippt der Anteil mit jedem einzelnen Eintrag.');
  }

  if (!k.dauer.seit) {
    nimm('seit', 9, 'Seit wann hast du das?',
      'Die eine Angabe, die aus dem Tagebuch grundsätzlich nicht hervorgeht – '
      + 'es beginnt an dem Tag, an dem du anfängst zu schreiben. Für den '
      + 'Reizdarm-Kasten unter „Muster“ rechnet Body Check mit einem Beginn vor '
      + 'mindestens sechs Monaten. Steht unter „Mehr“, dauert fünf Sekunden.');
  }

  const bez = d.bezug;
  if (bez && !bez.genug) {
    nimm('stuhlbezug', 7, 'Die Frage nach dem Stuhlgang beantworten',
      `Unten im Beschwerdebogen: „Danach besser, schlechter, unverändert?" `
      + `Bisher ${bez.beantwortet} von 4 Malen beantwortet. Das ist eines der `
      + 'drei Merkmale im Reizdarm-Kasten unter „Muster“, und das einzige, das '
      + 'sich nicht aus Zahlen ableiten lässt.');
  }

  if (!d.benutzt.oberbauch || !d.benutzt.saettigung) {
    nimm('arten', 6, 'Zwei neue Beschwerdezeilen benutzen',
      'Im Beschwerdebogen stehen jetzt „Schmerz im Oberbauch" und „Früh satt". '
      + 'Sie klingen wie „Brennen" und „kein Appetit" und sind etwas anderes: '
      + 'Frühes Sattsein und Schmerz im Oberbauch gehören zu den Beschwerden, '
      + 'mit denen Rom IV die funktionelle Dyspepsie beschreibt. Gezählt werden '
      + 'sie im Kasten „Magenbeschwerden ab Stärke 4“ unter „Muster“ – ohne Einordnung.');
  }

  // Die Grenzen wie in js/kriterien.js: Reizdarm und Magenbeschwerden ab 30
  // notierten Tagen in den letzten 90, der GerdQ-Punktwert aus den letzten
  // sieben Tagen (belastbar ab vier erfassten). Bis zur Fassung 30 hieß es
  // hier für alle drei Kästen „ab dreißig" und „mit den letzten drei Monaten".
  if (k.zeitraum.notierteTage < 30) {
    nimm('tage', 8, 'Regelmäßiger eintragen',
      `In den letzten drei Monaten sind ${k.zeitraum.notierteTage} Tage notiert. `
      + 'Ab dreißig rechnet Body Check den Reizdarm-Kasten und die Magenbeschwerden '
      + 'unter „Kriterien“; der Punktwert zu Reflux braucht nur die letzte Woche. '
      + 'Wichtig ist nicht die Menge je Tag, sondern dass kein Tag fehlt – eine Lücke '
      + 'ist kein guter Tag, und Lücken häufen sich genau in den schlechten Wochen.');
  } else if (k.zeitraum.tagebuchTage < 90) {
    nimm('tage', 4, 'Weiterschreiben',
      `Das Tagebuch läuft seit ${k.zeitraum.tagebuchTage} Tagen. Der `
      + 'Reizdarm-Kasten und die Magenbeschwerden unter „Kriterien“ rechnen mit den '
      + 'letzten drei Monaten – bis dahin sind ihre Zahlen vorläufig.');
  }

  // Der Punktwert ohne „zu niedrig statt falsch": Zwei Posten zählen
  // umgekehrt (js/kriterien.js), fehlende Tage machen ihn also nicht nur
  // niedriger. Wie der Kasten unter „Muster" (kriterienTeil in js/app.js).
  if (!k.gerdq.belastbar) {
    nimm('gerdq', 5, 'Die letzte Woche vollständig eintragen',
      `Der Punktwert angelehnt an den GerdQ schaut auf sieben Tage; erfasst sind `
      + `davon ${k.gerdq.erfasst}. Was nicht eingetragen ist, zählt als „nicht `
      + 'gehabt“ – die Punktzahl wäre damit nicht zu gebrauchen.');
  }

  if (!d.nachtwachAn) {
    nimm('nachtwach', 4, 'Die Frage „Nachts davon wach" anschalten',
      'Sie steht unter „Mehr“ bei den Tagesfragen. Der Punktwert angelehnt an '
      + 'den GerdQ zählt sie als eigenen Posten. Ist die Frage ausgeschaltet, zählt '
      + 'dieser Posten immer null.');
  }

  // Wortlaut wie versuchTeil in js/app.js (Belege dort): Bis zur Fassung 29
  // hieß es „Zwei Wochen weglassen … Das ist der einzige Weg"; die zwei
  // Wochen nennen die Quellen nicht, und in der Praxis geschieht das
  // Wiederessen ärztlich begleitet.
  if (d.versuchMoeglich && !d.versuchLaeuft) {
    nimm('versuch', 7, 'Einen Auslassversuch machen',
      'In deiner Bilanz steht etwas Auffälliges. Zählen allein macht daraus nie '
      + 'einen Beleg – wer an schlechten Tagen anders isst, findet sein Essen '
      + 'auffällig, ohne dass es damit zu tun hat. Ein Versuch dreht das um: eine '
      + 'Zeit lang weglassen, dann bewusst wieder essen. Ob ein solcher Versuch '
      + 'für dich sinnvoll ist, lässt sich in der Praxis besprechen. Steht unter '
      + '„Muster“.');
  }

  const ohneZutaten = d.mahlzeitenOhneZutaten;
  if (ohneZutaten >= 5) {
    nimm('zutaten', 3, 'Bei Mahlzeiten ankreuzen, was drin war',
      `${ohneZutaten} Mahlzeiten stehen ohne angekreuzte Zutat da. Sie zählen `
      + 'für den Verlauf, aber für keine einzige Auslöserfrage.');
  }

  return raus.sort((a, b) => b.gewicht - a.gewicht);
}

/* ---------------------------------------------------------------------------
 * 2. Was keine App schließt
 * ---------------------------------------------------------------------------
 *
 * Je Verdacht: was im Tagebuch dafür spricht, was dagegen, was offen bleibt –
 * und die Untersuchung, die es entscheidet. Die letzte Zeile ist die, für die
 * es diese Liste gibt.
 */
const VERDAECHTE = [
  /*
   * Quellen (Fassung 30): gesund.bund.de/glossar/typ-b-gastritis: die durch
   * Helicobacter verursachte Form „ist am häufigsten"; gesund.bund.de/
   * magengeschwuer (Stand 07.01.2022, „Was ist ein Magengeschwür?"): „meist
   * durch eine Infektion mit Helicobacter-pylori-Bakterien" und
   * („Behandlung") „frühestens nach 4 Wochen kontrolliert, ob die Therapie
   * erfolgreich war … Sind sie noch nachweisbar, kann die Behandlung …
   * wiederholt werden"; gesund.bund.de/reizmagen-funktionelle-dyspepsie
   * (Stand 05.02.2026): „kann gut mit Antibiotika behandelt werden". Bis zur
   * Fassung 30 hieß es, Helicobacter sei „die einzige Möglichkeit auf dieser
   * Liste, die sich in zwei Wochen behandeln und danach abhaken lässt" – ein
   * sicherer Erfolg und eine Rangfolge, die keine dieser Seiten nennt.
   */
  {
    id: 'hpylori',
    name: 'Helicobacter pylori',
    was: 'Ein Bakterium in der Magenschleimhaut. Häufigste Ursache von Gastritis '
      + 'und Magengeschwür. Laut gesund.bund.de gut mit Antibiotika behandelbar; ob '
      + 'der Keim danach weg ist, wird nachgeprüft.',
    /*
     * Bis zur Fassung 29: „Säureblocker zwei Wochen vorher absetzen (nach
     * Absprache), sonst wird der Test falsch negativ" – eine Anweisung zum
     * Absetzen, und die zwei Wochen stehen in keiner geprüften Quelle. Belegt
     * ist: EMA, Produktinformation PANTOZOL Control, Fachinformation 4.4:
     * „Patienten, bei denen eine Endoskopie oder ein 13C-HarnstoffAtemtest
     * durchgeführt werden soll, sollten ihren Arzt vor Einnahme dieses
     * Arzneimittels befragen."
     */
    untersuchung: 'Atemtest, Stuhltest oder Gewebeprobe bei der Spiegelung. '
      + 'Laut Fachinformation von Pantozol Control ist eine geplante Spiegelung '
      + 'oder ein Harnstoff-Atemtest ein Anlass, vor der Einnahme ärztlich '
      + 'nachzufragen; was ein Säureblocker für den Test bedeutet, klärt die Praxis.',
    frage: 'Wäre ein Test auf Helicobacter pylori sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      const m = d.musterIds;
      // gesund.bund.de/zwoelffingerdarmgeschwuer (Stand 27.01.2022): Beschwerden
      // „eher bei leerem Magen"; das Geschwür ist „meist die Folge einer
      // Infektion mit dem Bakterium Helicobacter pylori". Bis zur Fassung 30:
      // „Der Nüchternschmerz ist das klassische Muster dafür" – ohne Quelle.
      if (m.includes('nuechtern')) {
        dafuer.push('Beschwerden bei leerem Magen passen laut gesund.bund.de zu einem '
          + 'Zwölffingerdarmgeschwür, und das ist meist die Folge einer Infektion mit '
          + 'diesem Bakterium.');
      }
      if (m.includes('saeure')) dafuer.push('Das säuretypische Bild passt dazu.');
      return {
        stand: 'offen',
        dafuer,
        dagegen: [],
        offen: 'Aus einem Tagebuch grundsätzlich nicht zu sehen. Ein Bakterium '
          + 'macht kein eigenes Muster – es macht die Entzündung, die dann alles '
          + 'andere macht.',
      };
    },
  },
  /*
   * Quellen (Fassung 30): gesund.bund.de/magengeschwuer (mit IQWiG, Stand
   * 07.01.2022): „eine tiefe Wunde in der Magenwand"; „Welche Symptome deuten
   * auf ein Magengeschwür hin?": „Schmerzen im Oberbauch, oft unabhängig von
   * Mahlzeiten oder eher nach als vor dem Essen"; „Zur Diagnose reicht meist
   * eine Magenspiegelung mit Gewebeentnahme."; Komplikationen: schwarz
   * gefärbten Stuhl, erbrochenes Blut und „Anzeichen einer Blutarmut"
   * „zeitnah ärztlich abklären zu lassen". gesund.bund.de/
   * zwoelffingerdarmgeschwuer (mit IQWiG, Stand 27.01.2022): „eine tiefe Wunde
   * in der Innenwand des Zwölffingerdarms"; „Woran erkennt man …?": „Bei einem
   * Zwölffingerdarmgeschwür kommt es – anders als beim Magengeschwür – eher
   * bei leerem Magen zu Beschwerden. Nach dem Essen bessern sie sich oft."
   *
   * Bis zur Fassung 30 hieß es hier für beide Geschwüre „Tut typischerweise
   * nüchtern weh und wird nach dem Essen kurz besser" – die Seiten sagen das
   * nur für das Zwölffingerdarmgeschwür –, und Beschwerden überwiegend kurz
   * nach dem Essen standen als „Dagegen spricht". Gerade dieses Muster nennt
   * gesund.bund.de beim Magengeschwür; ein Schluss aus dem Zeitabstand auf
   * eine Diagnose ist es ohnehin (siehe Kopf von js/zeitprofil.js). Die
   * Rechnung (essensbezug in js/auswertung.js) ist unverändert, nur dieser
   * Satz entfällt. Ebenso „Sie ist auch die einzige, die eine Blutung gleich
   * mitbehandeln kann" – eine Rangfolge, die keine der Seiten aufstellt. Die
   * Frage zum Vorlesen behauptet kein Nüchternmuster mehr, wenn das Tagebuch
   * keines zeigt; mit Muster sagt sie nur, was es zählt (Beschwerden erst
   * vier Stunden oder länger nach dem Essen), kein „bessert sich danach". Den
   * schwarzen, klebrigen Stuhl stuft js/bild.js als „sofort" ein; dafür steht
   * der Satz der Warnkarte.
   */
  {
    id: 'ulkus',
    name: 'Magen- oder Zwölffingerdarmgeschwür',
    was: 'Eine tiefe Wunde in der Wand von Magen oder Zwölffingerdarm. Beim '
      + 'Zwölffingerdarmgeschwür kommen die Beschwerden laut gesund.bund.de eher bei '
      + 'leerem Magen und bessern sich nach dem Essen oft; beim Magengeschwür sind '
      + 'Schmerzen im Oberbauch oft unabhängig von den Mahlzeiten oder eher nach als '
      + 'vor dem Essen.',
    untersuchung: 'Magenspiegelung mit Gewebeprobe – laut gesund.bund.de reicht sie '
      + 'zur Diagnose meist.',
    frage: 'Ist eine Magenspiegelung angezeigt?',
    pruefe: (d) => {
      const dafuer = [];
      if (d.musterIds.includes('nuechtern')) {
        dafuer.push(`${d.essen.nuechtern} von ${d.essen.bewertbar} zuordenbaren `
          + 'Beschwerden kamen erst vier Stunden oder länger nach dem Essen.');
      }
      if (d.nsarTage >= 3) dafuer.push(`An ${d.nsarTage} Tagen ein entzündungshemmendes Schmerzmittel.`);
      // An der Engstelle eines Zwerchfellbruchs können kleine Schleimhautdefekte
      // entstehen – bei großen Brüchen häufiger –, und ein NSAR macht das
      // wahrscheinlicher.
      const bruchMitNsar = (d.befundIds || []).includes('hiatushernie') && d.nsarTage >= 1;
      if (bruchMitNsar) {
        dafuer.push('Zwerchfellbruch und entzündungshemmendes Schmerzmittel zusammen: '
          + 'An der Engstelle des Bruchs können kleine Schleimhautdefekte entstehen '
          + '(bei großen Brüchen häufiger), und ein solches Mittel macht das '
          + 'wahrscheinlicher.');
      }
      // Die Frage so, wie sie sich vorlesen lässt: Ohne Nüchternmuster darf
      // sie keines behaupten, und mit ihm nur das, was gezählt ist.
      let frage;
      if (d.musterIds.includes('nuechtern')) {
        frage = 'Der Schmerz kommt oft nüchtern, mit Abstand zum Essen – ist eine '
          + 'Magenspiegelung angezeigt?';
      } else if (bruchMitNsar) {
        frage = 'Ich habe einen Zwerchfellbruch und nehme bei Kopfschmerzen ein '
          + 'entzündungshemmendes Schmerzmittel – spricht das für eine Magenspiegelung?';
      }
      return {
        stand: dafuer.length ? 'moeglich' : 'offen',
        ...(frage ? { frage } : {}),
        dafuer,
        dagegen: [],
        offen: 'Ein Geschwür sieht man, man errechnet es nicht. Bei schwarzem, '
          + 'klebrigem Stuhl nicht auf einen Termin warten – Notaufnahme oder 112. '
          + 'Zeichen einer Blutarmut gehören laut gesund.bund.de zeitnah ärztlich '
          + 'abgeklärt.',
      };
    },
  },
  {
    id: 'reflux',
    name: 'Refluxkrankheit',
    was: 'Mageninhalt kommt in die Speiseröhre zurück. Brennen hinter dem '
      + 'Brustbein, oft im Liegen und nach spätem Essen.',
    /*
     * Bis zur Fassung 29: „Meist zuerst ein befristeter Versuch mit einem
     * Säureblocker; bleibt es dabei …, Spiegelung" – die Reihenfolge nennt
     * keine geprüfte Quelle. gesund.bund.de, Sodbrennen und Refluxkrankheit
     * (Stand 04.04.2025, „Wie wird eine Refluxerkrankung diagnostiziert?"):
     * „Eine Refluxerkrankung lässt sich an den typischen Symptomen erkennen.
     * … Bei einem Verdacht auf Refluxkrankheit sind weitere Untersuchungen
     * möglich. Dazu gehören eine Magenspiegelung und die Messung des pH-Werts
     * in der unteren Speiseröhre."
     */
    untersuchung: 'Laut gesund.bund.de lässt sich eine Refluxerkrankung an den '
      + 'typischen Beschwerden erkennen; bei Verdacht sind weitere Untersuchungen '
      + 'möglich, etwa eine Magenspiegelung und die Messung des Säurewerts in der '
      + 'unteren Speiseröhre. Welche davon nötig ist, klärt die Praxis.',
    frage: 'Spricht etwas für oder gegen einen befristeten Versuch mit einem '
      + 'Säureblocker – und was, wenn er nichts ändert?',
    /*
     * Der Punktwert angelehnt an den GerdQ und ein Säureblocker ohne
     * Besserung stehen ohne Deutung im offenen Teil (siehe Kopf dieser
     * Datei). Bis zur Fassung 29 waren sie „dafür" (ab 8 Punkten) oder
     * „dagegen" (unter 8, oder ein Säureblocker ohne Besserung) und stellten
     * die Refluxkrankheit damit auch auf „spricht eher dagegen". Die Schwelle
     * 8 steht im Abstract nicht (Jones et al. 2009, PMID 19737151), und zum
     * Säureblocker ziehen die Fachinformationen keinen Schluss auf die
     * Ursache, sie nennen weitere Untersuchungen (Belege im Kopf von
     * js/ansprechen.js). Der Satz zum Säureblocker ist derselbe wie dort.
     */
    pruefe: (d) => {
      const dafuer = [];
      const g = d.kriterien.gerdq;
      const hinweise = [];
      if (g.belastbar) {
        hinweise.push(`Punktwert angelehnt an den GerdQ: ${g.punkte} von 18, gezählt aus `
          + 'deinen Eintragungen der letzten sieben Tage, kein ausgefüllter Fragebogen. '
          + 'Was er bedeutet, kann die Praxis einordnen.');
      }
      if (d.musterIds.includes('saeure')) dafuer.push('Das Muster ist säuretypisch.');
      const ppi = (d.mittel || []).find((m) => m.saeureVersuchAusgereizt);
      if (ppi) {
        hinweise.push(`${ppi.name} läuft seit ${Math.round(ppi.wochen)} Wochen, ohne dass die `
          + 'Bauchwerte darunter besser geworden wären. Bleiben Beschwerden unter der '
          + 'Behandlung bestehen, nennen manche Fachinformationen weitere Untersuchungen; '
          + 'was es hier bedeutet, klärt die Praxis.');
      }
      return {
        stand: dafuer.length ? 'gestuetzt' : 'offen',
        dafuer,
        dagegen: [],
        offen: [...hinweise, 'Ob die Speiseröhre Schaden genommen hat, zeigt kein '
          + 'Tagebuch. Der Punktwert sagt etwas über die eingetragenen Beschwerden, '
          + 'nichts über den Zustand der Speiseröhre.'].join(' '),
      };
    },
  },
  {
    id: 'dyspepsie',
    name: 'Funktionelle Dyspepsie',
    /*
     * gesund.bund.de, Reizmagensyndrom (funktionelle Dyspepsie), Stand
     * 05.02.2026: Mit „funktionell" ist gemeint, „dass der Magen und der
     * Zwölffingerdarm zwar gesund erscheinen, aber nicht so arbeiten, wie sie
     * sollen"; „eine der häufigsten Erkrankungen des Magen-Darm-Trakts";
     * „verschiedene Behandlungsmöglichkeiten". Bis zur Fassung 29 hieß es „die
     * häufigste Erklärung überhaupt" – so steht es dort nicht.
     */
    was: 'Beschwerden im Oberbauch, für die sich keine andere Ursache findet: '
      + 'Magen und Zwölffingerdarm erscheinen gesund, arbeiten aber nicht so, wie '
      + 'sie sollen. Keine Einbildung – laut gesund.bund.de eine der häufigsten '
      + 'Erkrankungen des Magen-Darm-Trakts, mit verschiedenen '
      + 'Behandlungsmöglichkeiten.',
    /*
     * Dieselbe Seite, „Wie wird ein Reizmagen diagnostiziert?": „Von einem
     * Reizmagen wird deshalb erst gesprochen, wenn andere Ursachen für die
     * Beschwerden abgeklärt und ausgeschlossen wurden"; nach dem Gespräch
     * „Blut- und Stuhltests, ein Bauch-Ultraschall und manchmal eine
     * Magenspiegelung". Bis zur Fassung 29: „Die Diagnose steht, wenn die
     * Kriterien erfüllt sind *und* eine Spiegelung nichts zeigt" – die
     * Spiegelung als Maßstab nennt die Quelle nicht, und die Sternchen
     * standen wörtlich auf dem Bildschirm.
     */
    untersuchung: 'Von einem Reizmagen (so heißt die funktionelle Dyspepsie auch) wird laut gesund.bund.de erst gesprochen, '
      + 'wenn andere Ursachen der Beschwerden abgeklärt und ausgeschlossen sind – '
      + 'nach einem Gespräch etwa mit Blut- und Stuhltests, Ultraschall und '
      + 'manchmal einer Magenspiegelung. Welche Untersuchungen nötig sind, klärt '
      + 'die Praxis.',
    frage: 'Passt das Bild zu einer funktionellen Dyspepsie – und wenn ja, welche '
      + 'Form, PDS oder EPS?',
    /*
     * Die Magenbeschwerden nur gezählt, wie im Kasten „Magenbeschwerden ab
     * Stärke 4" (kriterienTeil in js/app.js): Rom IV beschreibt die
     * funktionelle Dyspepsie mit Völlegefühl nach dem Essen, frühem Sattsein,
     * Schmerz oder Brennen im Oberbauch, „unexplained after a routine
     * clinical evaluation" (Stanghellini et al. 2016, PMID 27147122,
     * Abstract); wie oft sie dafür auftreten müssen, steht dort nicht. Bis zur
     * Fassung 29 hieß es „Die PDS-/EPS-Kriterien sind erfüllt … (verlangt sind
     * 3 / ist 1)", und daran hing der Stand „passt zum Verlauf" oder „spricht
     * eher dagegen". Die Rechnung (dy.pds, dy.eps) ist unverändert.
     */
    pruefe: (d) => {
      const dy = d.kriterien.dyspepsie;
      const zahl = (x) => x.toFixed(1).replace('.', ',');
      const tage = (n) => `${n} ${n === 1 ? 'Tag' : 'Tagen'}`;
      const gezaehlt = dy.pruefbar
        ? `Gezählt ab Stärke 4: Druck, Völlegefühl oder früh satt an ${tage(dy.pds.tage)} `
          + `(${zahl(dy.pds.proWoche)} je Woche der notierten Tage), Brennen oder Schmerz `
          + `im Oberbauch an ${tage(dy.eps.tage)} (${zahl(dy.eps.proWoche)} je Woche). Wie `
          + 'oft diese Beschwerden für die Einordnung auftreten müssen, gibt Body Check '
          + 'nicht wieder; ob andere Ursachen dahinterstecken, klärt die Praxis, nicht '
          + 'dieses Tagebuch.'
        : 'Für die Zählung fehlen noch notierte Tage.';
      return {
        stand: 'offen',
        dafuer: [],
        dagegen: [],
        offen: gezaehlt,
      };
    },
  },
  /*
   * Quellen (Fassung 30): gesund.bund.de, Reizdarmsyndrom (Stand 28.08.2024,
   * „Wie wird ein Reizdarmsyndrom festgestellt?"): Ärztinnen und Ärzte
   * sprechen davon, wenn unter anderem „keine Hinweise auf eine andere
   * Erkrankung vorliegen, die die Beschwerden verursachen könnte"; „Auch
   * andere Gründe wie eine Unverträglichkeit gegen Milchzucker
   * (Laktoseintoleranz) oder eine Zöliakie kommen in Frage"; „Durch Bluttests
   * und weitere Untersuchungen können andere Ursachen ausgeschlossen werden."
   * Calprotectin nennt die Seite nicht; die EMA-Leitlinie zu Studien bei
   * Reizdarm (EMA/CHMP/60337/2013, CPMP/EWP/785/97 Rev. 1, 25. September 2014,
   * Abschnitt zu den Einschlusskriterien) verlangt den Ausschluss einer
   * Entzündung „(e.g. CRP and/or calprotectin)" – für Studienteilnehmer, nicht
   * als Vorgabe für die Sprechstunde. Deshalb steht es nur in der Frage. Bis
   * zur Fassung 30 hieß es, der Reizdarm sei „eine eigene Diagnose mit eigener
   * Behandlung – und oft beides zusammen", beides „wird oft vergessen" und
   * „den Ausschluss macht das Labor"; das trägt keine geprüfte Quelle.
   *
   * Die Frage zum Vorlesen hängt am Stand des Reizdarm-Kastens unter
   * „Kriterien": „erfüllt" nur, wenn er dort auch so steht (r.erfuellt). Bis
   * zur Fassung 30 stand es fest in jeder Frage, auch neben „Kriterien nicht
   * erfüllt" oder „noch nicht prüfbar".
   */
  {
    id: 'reizdarm',
    name: 'Reizdarmsyndrom',
    was: 'Bauchschmerz, der mit dem Stuhlgang zusammenhängt. Zu den typischen '
      + 'Beschwerden zählen laut gesund.bund.de Krämpfe, anhaltende Bauchschmerzen '
      + 'und ein veränderter Stuhl.',
    untersuchung: 'Von einem Reizdarmsyndrom sprechen Ärztinnen und Ärzte laut '
      + 'gesund.bund.de, wenn keine Hinweise auf eine andere Erkrankung vorliegen; '
      + 'als andere Gründe nennt die Seite etwa eine Laktoseintoleranz oder eine '
      + 'Zöliakie. Durch Bluttests und weitere Untersuchungen können andere Ursachen '
      + 'ausgeschlossen werden. Welche davon nötig sind, klärt die Praxis.',
    frage: 'Sind andere Ursachen wie eine Zöliakie oder eine Entzündung im Darm schon '
      + 'abgeklärt worden, etwa mit einem Calprotectin-Test – und passt das Bild zu einem '
      + 'Reizdarmsyndrom?',
    pruefe: (d) => {
      const r = d.kriterien.reizdarm;
      const dafuer = [];
      const dagegen = [];
      if (r.pruefbar && r.schmerzErfuellt) {
        dafuer.push(`Bauchschmerz an ${r.schmerzTage} Tagen, `
          + `${r.proWoche.toFixed(1).replace('.', ',')} je Woche der notierten Tage `
          + '(verlangt ist 1).');
      }
      r.merkmale.filter((m) => m.erfuellt).forEach((m) => dafuer.push(`${m.name}: ${m.text}`));
      if (r.pruefbar && !r.schmerzErfuellt) {
        dagegen.push(`Bauchschmerz nur an ${r.schmerzTage} Tagen – das ist seltener `
          + 'als einmal pro Woche.');
      }
      if (r.typ.typ) dafuer.push(`Stuhlform: ${r.typ.name}.`);
      let stand = 'offen';
      if (r.erfuellt) stand = 'gestuetzt';
      else if (r.pruefbar && dafuer.length) stand = 'moeglich';
      else if (r.pruefbar) stand = 'unwahrscheinlich';
      // „Erfüllt" nur, wenn der Kasten unter „Kriterien" es auch sagt.
      const frage = r.erfuellt
        ? 'In meinem Tagebuch sind die Rom-IV-Kriterien für ein Reizdarmsyndrom '
          + 'erfüllt – sind andere Ursachen wie eine Zöliakie oder eine Entzündung im '
          + 'Darm schon abgeklärt worden, etwa mit einem Calprotectin-Test?'
        : undefined;
      return {
        stand,
        ...(frage ? { frage } : {}),
        dafuer,
        dagegen,
        offen: r.typ.typ ? 'Von einem Reizdarm wird erst gesprochen, wenn andere '
          + 'Ursachen abgeklärt sind – das Tagebuch liefert Material für das Gespräch; '
          + 'ob und welche Untersuchungen nötig sind, klärt die Praxis.'
          : `Für den Typ fehlen noch ${r.typ.fehlt} eingetragene Stuhlgänge.`,
      };
    },
  },
  {
    id: 'unvertraeglich',
    name: 'Laktose- oder Fruktoseunverträglichkeit',
    was: 'Ein Zucker wird im Dünndarm nicht aufgenommen und im Dickdarm vergoren. '
      + 'Gas, Krämpfe, Durchfall – meist Stunden nach dem Essen.',
    /*
     * gesund.bund.de, Laktoseintoleranz (Stand 23.02.2026, „Wie wird eine
     * Laktoseintoleranz diagnostiziert?"): „Atemtest: Nach dem Trinken einer
     * Milchzuckerlösung wird der Gehalt von Wasserstoff in der Atemluft
     * mehrmals gemessen." Bis zur Fassung 30: „H2-Atemtest, dauert einen
     * Vormittag. Je Zucker ein Termin." – die Dauer und die Termine nennt
     * keine geprüfte Quelle. Einen Atemtest auf Fruktose belegt der North
     * American Consensus (Am J Gastroenterol 2017, PMID 28323273, Abstract:
     * „Consensus doses for lactulose, glucose, fructose and lactose BT …";
     * siehe provokationTeil in js/app.js); Dauer und Termine nennt auch er
     * nicht. Der sichtbare Satz beschreibt das Verfahren nur für Laktose, so
     * wie gesund.bund.de es beschreibt, und überlässt die Wahl des Tests bei
     * jedem Zucker der Praxis.
     */
    untersuchung: 'Bei Laktose etwa ein Atemtest: Nach dem Trinken einer '
      + 'Milchzuckerlösung wird laut gesund.bund.de mehrmals der Wasserstoff in der '
      + 'Atemluft gemessen. Welcher Test bei welchem Zucker infrage kommt, klärt die '
      + 'Praxis.',
    frage: 'Wäre ein Atemtest auf Laktose oder Fruktose sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      (d.klassen || []).filter((k) => k.genug && k.differenz >= 0.5
        && ['laktose', 'fodmap'].includes(k.id))
        .forEach((k) => dafuer.push(`${k.name}: danach im Mittel `
          + `${k.schnittMit.toFixed(1).replace('.', ',')} statt `
          + `${k.schnittOhne.toFixed(1).replace('.', ',')} `
          + `(${k.faelle} Mahlzeiten damit, ${k.gegenFaelle} ohne).`));
      return {
        stand: dafuer.length ? 'moeglich' : 'offen',
        dafuer,
        dagegen: [],
        /*
         * Bis zur Fassung 29: „Ein Auslassversuch bringt hier fast so viel wie
         * der Test" – ohne Quelle; die Sternchen standen wörtlich da.
         * gesund.bund.de, Laktoseintoleranz (Stand 23.02.2026, „Wie wird eine
         * Laktoseintoleranz diagnostiziert?"): Diät- oder Auslasstest, bei dem
         * „die Ärztin oder der Arzt … die körperliche Reaktion" überwacht,
         * Laktosetoleranztest oder Atemtest; „Das Standardverfahren in
         * Deutschland ist der Atemtest."
         */
        offen: 'Das Tagebuch zählt nur, was nach dem Essen eingetragen ist. Bei '
          + 'Laktoseintoleranz nennt gesund.bund.de einen ärztlich überwachten '
          + 'Auslasstest, einen Laktosetoleranztest oder den Atemtest, in Deutschland '
          + 'das Standardverfahren; welcher Test infrage kommt, klärt die Praxis.',
      };
    },
  },
  {
    id: 'zoeliakie',
    name: 'Zöliakie',
    was: 'Eine Abwehrreaktion auf Gluten, die die Dünndarmschleimhaut zerstört. '
      + 'Kann sich als Reizdarm tarnen und bleibt oft jahrelang unentdeckt.',
    /*
     * Wie in planAngebot (js/app.js): EMA, Wheat starch (containing gluten)
     * used as an excipient, EMA/CHMP/639441/2013 corr. 2, 9. Oktober 2017,
     * S. 4: „Diagnosis is by blood tests to check for relevant antibodies,
     * followed by endoscopy/gastroscopy and biopsy. … However all tests lose
     * their usefulness if the person has already been eating a gluten-free
     * diet for 6–12 months." Bis zur Fassung 29: „wer vorher weglässt,
     * bekommt ein falsch unauffälliges Ergebnis" – so zwingend sagt es die
     * Quelle nicht; welche Antikörper bestimmt werden, nennt sie nicht.
     */
    untersuchung: 'Bluttest auf Antikörper, danach Spiegelung mit Gewebeprobe. '
      + '**Laut EMA verlieren diese Untersuchungen ihren Nutzen, wenn schon 6 bis 12 '
      + 'Monate glutenfrei gegessen wurde.**',
    frage: 'Ist Zöliakie schon einmal ausgeschlossen worden?',
    pruefe: (d) => {
      const dafuer = [];
      const g = (d.klassen || []).find((k) => k.id === 'gluten');
      if (g && g.genug && g.differenz >= 0.5) {
        dafuer.push(`Weizen und Gluten: danach im Mittel `
          + `${g.schnittMit.toFixed(1).replace('.', ',')} statt `
          + `${g.schnittOhne.toFixed(1).replace('.', ',')} (${g.faelle} Mahlzeiten damit).`);
      }
      return {
        stand: 'offen',
        dafuer,
        dagegen: [],
        // Ohne „Nur der Bluttest trennt sie. Deshalb: erst testen, dann
        // weglassen" (bis zur Fassung 29): ein Rat zur Reihenfolge, den die
        // Quelle oben so nicht gibt.
        offen: 'Aus dem Tagebuch nicht zu unterscheiden von anderen Gründen, warum '
          + 'Weizen nicht vertragen wird. Ob eine Zöliakie schon abgeklärt ist, lässt '
          + 'sich vor einem Weglassen in der Praxis besprechen.',
      };
    },
  },
  /*
   * Quelle (Fassung 30): gesund.bund.de/gallensteine (mit IQWiG, Stand
   * 04.04.2025). „Auf einen Blick": „Gallensteine sind Ablagerungen aus
   * verdickter Gallenflüssigkeit. Sie können zu krampfartigen Schmerzen im
   * Oberbauch führen. Viele Menschen haben Gallensteine, ohne es zu merken."
   * „Welche Symptome …?": „Die Schmerzen kommen in Wellen und können in den
   * Rücken und die rechte Schulter ausstrahlen." „Wie diagnostiziert man
   * …?": „Um die Symptome besser deuten zu können, ist es wichtig, der Ärztin
   * oder dem Arzt zu Beginn der Untersuchung alle Beschwerden genau zu
   * beschreiben." – „Auf das Untersuchungsgespräch folgt eine körperliche
   * Untersuchung und ein Ultraschall des Bauchraums. Meist ist das bereits
   * ausreichend."
   *
   * Bis zur Fassung 30 hieß es „klassisch nach fettem Essen und oft abends
   * oder nachts. Häufig, und im Tagebuch leicht mit einer Gastritis zu
   * verwechseln", zum Ultraschall „Zehn Minuten, keine Vorbereitung außer
   * nüchtern sein" und zur Stelle „Für die Unterscheidung ist genau das die
   * erste Frage" – das alles steht dort nicht. Die Frage zum Vorlesen
   * behauptete immer „Der Schmerz kommt nach fettem Essen", auch wenn das
   * Tagebuch nichts dafür zeigte; jetzt nennt sie den Fettbezug nur, wenn er
   * unter „Dafür spricht" steht, und auch dann nur, was gezählt ist.
   */
  {
    id: 'galle',
    name: 'Gallensteine',
    was: 'Ablagerungen aus verdickter Gallenflüssigkeit. Sie können laut '
      + 'gesund.bund.de krampfartige Schmerzen im Oberbauch auslösen, die in Wellen '
      + 'kommen und in den Rücken und die rechte Schulter ausstrahlen können. Viele '
      + 'Menschen haben Gallensteine, ohne es zu merken.',
    untersuchung: 'Gespräch, körperliche Untersuchung und ein Ultraschall des '
      + 'Bauchraums – laut gesund.bund.de reicht das zur Diagnose meist aus.',
    frage: 'Wäre ein Ultraschall der Gallenblase sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      const f = (d.klassen || []).find((k) => k.id === 'fett');
      const fett = !!(f && f.genug && f.differenz >= 0.5);
      if (fett) {
        dafuer.push(`Fett: danach im Mittel ${f.schnittMit.toFixed(1).replace('.', ',')} `
          + `statt ${f.schnittOhne.toFixed(1).replace('.', ',')} (${f.faelle} Mahlzeiten damit).`);
      }
      if (d.krampfAnteil >= 0.3) {
        dafuer.push(`In ${Math.round(d.krampfAnteil * 100)} % der Eintragungen ging es `
          + 'um Krämpfe oder Bauchschmerz.');
      }
      // Die Frage so, wie sie sich vorlesen lässt: den Fettbezug nur, wenn das
      // Tagebuch ihn zeigt, und dann nur den Vergleich, den es gerechnet hat.
      const frage = fett
        ? 'Nach fettem Essen sind meine Beschwerden laut Tagebuch im Mittel stärker '
          + '– wäre ein Ultraschall der Gallenblase sinnvoll?'
        : undefined;
      return {
        stand: dafuer.length >= 2 ? 'moeglich' : 'offen',
        ...(frage ? { frage } : {}),
        dafuer,
        dagegen: [],
        offen: 'Wo der Schmerz sitzt und wohin er ausstrahlt, weiß dieses Tagebuch '
          + 'nicht – es fragt nicht nach der Stelle. Laut gesund.bund.de ist es wichtig, '
          + 'der Ärztin oder dem Arzt alle Beschwerden genau zu beschreiben, damit sie '
          + 'sich besser deuten lassen.',
      };
    },
  },
  /*
   * Quelle (Fassung 30): gesund.bund.de/gastritis (Stand 13.11.2025, „Welche
   * Ursachen hat eine Gastritis?" und „Einnahme von NSAR-Schmerzmitteln"):
   * „Zu den häufigsten Gründen zählen eine Infektion mit
   * Helicobacter-Pylori-Bakterien oder die häufige Einnahme" von NSAR; „Wer
   * solche Schmerzmittel nur kurz bei akuten Schmerzen einnimmt, hat eher
   * selten mit Nebenwirkungen zu tun. Erfolgt die Einnahme jedoch über einen
   * längeren Zeitraum von Wochen oder Monaten, kann das die Schutzfunktion der
   * Magenschleimhaut stören." Wortlaut nah an REIZSTOFFE in js/mittel.js; dort
   * bezieht sich „das" auf die gehemmten Botenstoffe, hier steht „sie" für die
   * Mittel, weil dieser Satz davor fehlt. Bis zur
   * Fassung 30: „greifen die Magenschleimhaut direkt an. Die häufigste
   * vermeidbare Ursache" – ohne die Bedingung der Dauer und mit einer
   * Rangfolge, die dort nicht steht.
   */
  {
    id: 'nsar',
    name: 'Schaden durch Schmerzmittel',
    was: 'Ibuprofen, Diclofenac und ASS gehören zu den entzündungshemmenden '
      + 'Schmerzmitteln (NSAR). Häufig genommen, zählen sie laut gesund.bund.de neben '
      + 'Helicobacter zu den häufigsten Gründen für eine entzündete Magenschleimhaut: '
      + 'Bei Einnahme über Wochen oder Monate können sie die Schutzfunktion der '
      + 'Magenschleimhaut stören. Ob und wie oft so ein Mittel genommen wurde, steht '
      + 'im Tagebuch.',
    untersuchung: 'Keine nötig, um die Frage zu stellen. Es geht um eine '
      + 'Alternative oder um einen Magenschutz – beides gehört besprochen, nicht '
      + 'selbst entschieden.',
    frage: 'Ich nehme regelmäßig ein entzündungshemmendes Schmerzmittel – gibt es '
      + 'eine magenfreundlichere Alternative, oder ist ein Magenschutz angezeigt?',
    pruefe: (d) => {
      const dafuer = [];
      const gastritisC = (d.befundIds || []).includes('gastritis-c');
      if (d.nsarTage >= 1) {
        dafuer.push(`An ${d.nsarTage} ${d.nsarTage === 1 ? 'Tag' : 'Tagen'} der letzten 90 `
          + 'steht ein entzündungshemmendes Schmerzmittel im Tagebuch.');
        // Wogegen – das ist die Hälfte der Frage nach der Alternative. Ein
        // Mittel gegen Kopfschmerzen hat andere Ersatzkandidaten als eines
        // gegen Rückenschmerzen.
        if (d.nsarKopfTage > 0) {
          dafuer.push(`An ${d.nsarKopfTage} davon wegen Kopfschmerzen – am `
            + 'selben Tag eingetragen.');
        }
      }
      /*
       * Mit einer Gastritis Typ C im Befund, Wortlaut wie im README
       * („Was Kopf und Bauch verbindet"). Quellen: gesund.bund.de/glossar/
       * typ-c-gastritis („durch die Einwirkung von chemischen Stoffen
       * entstanden"); Owen, Mod Pathol 2003;16(4):325-41 (PMID 12692198,
       * Abstract): „Reactive gastropathy … in most instances it is associated
       * with either reflux of duodenal contents or therapy with nonsteroidal
       * anti-inflammatory drugs."; FI IBU-ratiopharm akut Schmerztabletten
       * (fachinfo.de/fi/pdf/014937, Stand Juni 2026), 4.4: „Eine besonders
       * sorgfältige ärztliche Überwachung ist erforderlich: bei
       * Magen-Darm-Störungen … in der Vorgeschichte"; FI Aspirin
       * (fachinfo.de/fi/pdf/000174, Stand März 2026), 4.4: „verstärktem
       * Monitoring" bei „Gastritis in der Anamnese". Bis zur Fassung 30 stand
       * hier „Sicher ist nur: Sie treffen eine Schleimhaut, die schon gereizt
       * ist" – stärker als jede dieser Quellen, und ein älterer Befund kann
       * abgeheilt sein.
       *
       * „Rückfluss von Darminhalt" (zuerst in der Fassung 30) machte aus dem
       * Zwölffingerdarm („duodenal contents") den ganzen Darm, und der
       * Befundtext (js/befunde.js) nennt dieselbe Ursache mit gesund.bund.de
       * „zurücklaufende Gallenflüssigkeit" (glossar/typ-c-gastritis: „Neben
       * zurücklaufender Gallenflüssigkeit, Alkohol oder bestimmten
       * Schmerzmitteln …"). Dass die Galle am Zwölffingerdarm ankommt:
       * gesund.bund.de/gallensteine (Stand 04.04.2025, Diagnostik) beschreibt
       * die Spiegelung „über die Speiseröhre, den Magen und den Anfang des
       * Zwölffingerdarms bis zur Mündung des Gallengangs".
       */
      if (gastritisC && d.nsarTage >= 1) {
        dafuer.push('Deine Gastritis ist als Typ C eingetragen – durch chemische Stoffe '
          + 'entstanden. Neben zurücklaufender Gallenflüssigkeit aus dem Zwölffingerdarm '
          + 'gehören entzündungshemmende '
          + 'Schmerzmittel zu den häufigsten Ursachen einer solchen Schleimhautschädigung; '
          + 'ob sie es bei dir sind, steht in deinem Befund, nicht hier. Bei '
          + 'Magen-Darm-Störungen in der Vorgeschichte sehen Fachinformationen mancher '
          + 'dieser Mittel, etwa von Ibuprofen und ASS, eine besonders sorgfältige '
          + 'ärztliche Überwachung vor. Was das für dich heißt, klären Praxis oder Apotheke.');
      }
      /*
       * Der Stand beschreibt den Verlauf, nicht die Dringlichkeit der Frage:
       * „passt zum Verlauf" erst ab drei Tagen, ein einzelner Tag ist kein
       * Verlauf. Aber „spricht eher dagegen" bei ein, zwei Tagen ohne einen
       * einzigen Dagegen-Grund wäre die falsche Botschaft – dann „möglich".
       */
      let stand = 'unwahrscheinlich';
      if (d.nsarTage >= 3) stand = 'gestuetzt';
      else if (d.nsarTage >= 1) stand = 'moeglich';
      // Die Frage so, dass sie sich in der Sprechstunde vorlesen lässt:
      // „regelmäßig" stimmt bei anfallsweiser Einnahme nicht. Und ohne ein
      // eingetragenes Mittel behauptet sie keine Einnahme (bis zur Fassung 30
      // stand dann „Ich nehme regelmäßig …" neben „Kein solches Schmerzmittel
      // eingetragen").
      let frage;
      if (d.nsarKopfTage > 0 || (d.nsarTage >= 1 && d.nsarTage < 3)) {
        frage = `${d.nsarKopfTage > 0 ? 'Bei Kopfschmerzen' : 'Gelegentlich'} nehme ich ein `
          + 'entzündungshemmendes Schmerzmittel'
          + `${gastritisC ? ' – mit meiner Gastritis Typ C' : ''}: Ist das so in Ordnung, `
          + 'braucht es einen Magenschutz dazu, oder gibt es für mich eine andere Lösung?';
      } else if (!(d.nsarTage >= 1)) {
        frage = 'Falls ich ein entzündungshemmendes Schmerzmittel brauche: Gibt es eine '
          + 'magenfreundlichere Alternative, oder wäre ein Magenschutz angezeigt?';
      }
      return {
        stand,
        ...(frage ? { frage } : {}),
        dafuer,
        dagegen: d.nsarTage === 0 ? ['Kein solches Schmerzmittel eingetragen.'] : [],
        offen: d.nsarTage >= 1 ? 'Ob die Schleimhaut schon Schaden genommen hat, '
          + 'zeigt nur die Spiegelung. Die Frage nach Magenschutz oder Alternative '
          + 'lohnt sich trotzdem jetzt.' : '',
      };
    },
  },
  /*
   * Quelle (Fassung 30): gesund.bund.de/blutarmut-anaemie (mit IQWiG, Stand
   * 13.07.2021). „Häufige Ursache für die Blutarmut ist ein Eisenmangel."
   * „Wie entsteht …?": Ein Eisenmangel ist möglich, wenn „aufgrund einer
   * Erkrankung wie einer Glutenunverträglichkeit (Zöliakie) zu wenig Eisen
   * aus dem Darm aufgenommen wird" oder „es zu einem chronischen Blutverlust
   * kommt, etwa nach Verletzungen im Magen-Darm-Trakt, durch eine
   * Magenschleimhautentzündung oder bei starken Regelblutungen". „Wie kann
   * …verlaufen?": „bleibt oft lange unbemerkt". „Wie wird …diagnostiziert?":
   * „Dabei werden zum Beispiel der Gehalt an rotem Blutfarbstoff (Hämoglobin)
   * bestimmt und die Zahl der roten Blutkörperchen überprüft. Im Blut kann man
   * zudem die Menge an Eisen … messen" – und „Lässt sich ein Eisenmangel nicht
   * durch eine zu geringe Aufnahme mit der Nahrung erklären", schauen
   * Ärztinnen und Ärzte nach einer Darmentzündung und prüfen, „ob zum Beispiel
   * kleine Wunden im Darm zu einem chronischen Blutverlust führen".
   *
   * Bis zur Fassung 30 stand hier „seine häufigste stille Folge", das Blutbild
   * mit Ferritin beantworte in „einer Viertelstunde" „zwei Fragen auf einmal:
   * ob Blut verlorengeht und ob eine Zöliakie schon Spuren hinterlassen hat",
   * und es sei „die billigste Untersuchung auf dieser Liste" und schließe „am
   * meisten auf einmal" aus. Eine Rangfolge und eine Dauer nennt die Seite
   * nicht, und woher ein Eisenmangel kommt, beantwortet die Blutprobe dort
   * nicht – danach wird weiter gesucht. Ferritin nennt keine geprüfte Quelle
   * beim Namen; die Frage zum Vorlesen fragt deshalb nach der Untersuchung,
   * nicht nach einem Laborwert.
   *
   * Schwarzer, klebriger Stuhl (teerstuhl) ist in js/bild.js „sofort" und
   * bekommt den Satz der Warnkarte (warnTeil in js/app.js), wie beim Geschwür
   * oben; Zeichen einer Blutarmut (blaesse) sind „zeitnah": gesund.bund.de/
   * magengeschwuer (Stand 07.01.2022) nennt „Anzeichen einer Blutarmut
   * (Anämie) wie Abgeschlagenheit, Luftnot bei körperlichen Anstrengungen oder
   * Blässe" unter dem, was „zeitnah ärztlich abklären zu lassen" ist.
   */
  {
    id: 'blut',
    name: 'Blutarmut, Eisenmangel',
    was: 'Häufige Ursache einer Blutarmut ist laut gesund.bund.de ein Eisenmangel. '
      + 'Er kann mit dem Verdauungstrakt zu tun haben: durch einen chronischen '
      + 'Blutverlust, etwa nach Verletzungen im Magen-Darm-Trakt oder durch eine '
      + 'Magenschleimhautentzündung, oder weil bei einer Zöliakie zu wenig Eisen '
      + 'aufgenommen wird. Eine Blutarmut bleibt oft lange unbemerkt.',
    untersuchung: 'Eine Blutuntersuchung: Laut gesund.bund.de werden dabei etwa der '
      + 'rote Blutfarbstoff und die Zahl der roten Blutkörperchen bestimmt, und die '
      + 'Menge an Eisen lässt sich messen. Lässt sich ein Eisenmangel nicht durch die '
      + 'Ernährung erklären, suchen Ärztinnen und Ärzte laut derselben Seite weiter '
      + 'nach dem Grund, etwa nach einem Blutverlust im Darm.',
    frage: 'Wäre eine Blutuntersuchung auf Blutarmut und Eisenmangel sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      const teer = d.warnIds.includes('teerstuhl');
      const blass = d.warnIds.includes('blaesse');
      if (blass || teer) {
        dafuer.push('Im Tagebuch steht ein Warnzeichen, das dazu passt.');
      }
      /*
       * Mit Zwerchfellbruch und NSAR wird die Untersuchung zu einer konkreten
       * Frage. Moskovitz, Am J Gastroenterol 1992 (PMID 1595651, Abstract):
       * bei großen Brüchen „small erosions at the waist of the hernia which
       * bleed slowly"; Kimer, BMJ Case Rep 2010 (PMID 22791730, Abstract):
       * „associated with occult bleeding and development of chronic iron
       * deficiency anaemia"; Gray, Dis Esophagus 2015 (PMID 24758713,
       * Abstract): „frequent non-steroidal anti-inflammatory drug (NSAID) use
       * … significantly greater with Cameron lesions" und „Large HH size and
       * NSAID use were identified as independent risk factors". Bis zur
       * Fassung 30: „selten, aber genau die Frage, die ein Blutbild
       * beantwortet" – ob ein Bruch blutet, zeigt eine Blutprobe nicht.
       */
      if ((d.befundIds || []).includes('hiatushernie') && d.nsarTage >= 1) {
        dafuer.push('Zwerchfellbruch und entzündungshemmendes Schmerzmittel zusammen: '
          + 'An der Engstelle des Bruchs können, vor allem bei großen Brüchen, kleine '
          + 'Schleimhautdefekte entstehen, die langsam und unbemerkt bluten und zu '
          + 'Eisenmangel führen können; in einer Studie fanden sie sich bei häufiger '
          + 'Einnahme solcher Mittel öfter. Ob das bei dir zutrifft, klärt die Praxis.');
      }
      const eile = [
        teer ? 'Bei schwarzem, klebrigem Stuhl nicht auf einen Termin warten – '
          + 'Notaufnahme oder 112.' : '',
        blass ? 'Zeichen einer Blutarmut gehören laut gesund.bund.de zeitnah ärztlich '
          + 'abgeklärt.' : '',
      ].filter(Boolean).join(' ');
      return {
        stand: dafuer.length > 1 ? 'moeglich' : 'offen',
        dafuer,
        dagegen: [],
        offen: `Aus einem Tagebuch nicht zu sehen.${eile ? ` ${eile}` : ''}`,
      };
    },
  },
];

/**
 * Der ganze Zettel.
 *
 * @param {object} d
 *   kriterien (aus js/kriterien.js), stuhl (stuhlZahlen), bezug (bezugBilanz),
 *   klassen (klassenBilanz), mittel (mittelBilanz), musterIds, essen
 *   (essensbezug), nsarTage, nsarKopfTage (davon an Kopfschmerztagen), warnIds,
 *   krampfAnteil, benutzt, nachtwachAn, versuchMoeglich, versuchLaeuft,
 *   mahlzeitenOhneZutaten
 */
export function luecken(d) {
  return {
    tagebuch: tagebuchLuecken(d),
    verdaechte: VERDAECHTE.map((v) => {
      const p = v.pruefe(d);
      return {
        id: v.id,
        name: v.name,
        was: v.was,
        untersuchung: v.untersuchung,
        frage: v.frage,
        ...p,
        wort: STAND_WORT[p.stand],
      };
    }).sort((a, b) => {
      const rang = { gestuetzt: 0, moeglich: 1, offen: 2, unwahrscheinlich: 3 };
      return (rang[a.stand] - rang[b.stand]) || (b.dafuer.length - a.dafuer.length);
    }),
  };
}
