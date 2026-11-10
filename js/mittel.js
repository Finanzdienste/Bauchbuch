/*
 * Was die Mittel bewirken – eine Übersicht, kein Rat.
 *
 * Wer Magenbeschwerden hat, hat bald mehrere Schachteln im Schrank, und die
 * Beipackzettel beantworten selten die Frage, die man wirklich hat: Was macht
 * das eigentlich, und warum soll ich es ausgerechnet vor dem Frühstück nehmen?
 * Genau dafür steht das hier – in ganzen Sätzen, nicht in Fachsprache.
 *
 * Drei Regeln, an die sich dieser Text hält:
 *
 *   1. **Keine Dosierungen.** Was jemand nimmt und wie viel, steht auf seiner
 *      Packung und ist mit einer Ärztin besprochen. Eine App, die hier eine
 *      Zahl hinschreibt, macht sich zu etwas, das sie nicht ist.
 *   2. **Keine Empfehlung.** Nirgends steht „nimm", nirgends „hilft gegen".
 *      Beschrieben wird, wie ein Wirkstoff arbeitet – ob er für einen
 *      bestimmten Menschen der richtige ist, weiß diese App nicht und kann
 *      es nicht wissen.
 *   3. **Was schadet, steht mit dabei.** Eine Übersicht über Magenmittel, in
 *      der die Schmerzmittel fehlen, die den Magen erst reizen, ist die
 *      halbe Wahrheit – und die gefährlichere Hälfte. Siehe REIZSTOFFE.
 *
 * Reine Daten, keine Abhängigkeiten.
 */

export const MITTEL_WISSEN = [
  /*
   * Quellen (Fassung 30, jeweils im Volltext gelesen):
   *   kurz, wirkung  FI Pantozol 40 mg, fachinfo.de/fi/pdf/006633 (April 2023), 5.1:
   *                  „hemmt die H+/K+-ATPase, d. h. die Endstufe der Salzsäureproduktion“;
   *                  gesund.bund.de/gastritis (Stand 13.11.2025): Antazida „neutralisieren
   *                  die vorhandene Magensäure“, PPI „hemmen die Bildung von Magensäure“.
   *                  Der frühere Zweck „damit die Schleimhaut zur Ruhe kommt“ ist gestrichen:
   *                  Abheilung nennen die Quellen nur für bestimmte Erkrankungen.
   *   Aufbau         FI Antra MUPS, fachinfo.de/fi/pdf/004171 (Mai 2024), 5.1: „maximale
   *                  Wirkung innerhalb von vier Behandlungstagen“; FI Pariet,
   *                  fachinfo.de/fi/pdf/004599 (April 2026), 5.1: „nach drei Tagen stellt
   *                  sich ein steady-state der Hemmung ein“; FI Lansoprazol-ratiopharm,
   *                  fachinfo.de/fi/pdf/020704 (September 2026), 5.1: „über 7 Tage …
   *                  ungefähr 90%“.
   *   Linderung      FI PANTOZOL Control, fachinfo.de/fi/pdf/020222 (April 2023), 4.4:
   *                  „für eine sofortige Linderung nicht vorgesehen“, „nach ca. eintägiger
   *                  Behandlung … eine erste Linderung“. Lansoprazol 5.1 nennt Linderung ab
   *                  der ersten Dosis – deshalb steht der Satz nur für Pantozol Control.
   *   einnahme       FI Pantozol 40 mg 4.2: „1 Stunde vor einer Mahlzeit“; Lansoprazol
   *                  4.2: „morgens“, „mindestens 30 Minuten vor der Nahrungsaufnahme“;
   *                  Pariet 4.2: weder Tageszeit noch Nahrung „Auswirkungen auf die
   *                  Wirksamkeit“; FI
   *                  Nexium mups, fachinfo.de/fi/pdf/004417 (Juli 2025), 5.2: Nahrung ohne
   *                  „signifikanten Einfluss auf den Effekt … auf den Säuregehalt“. Der
   *                  frühere Satz, nur arbeitende Pumpen ließen sich hemmen, und das zur
   *                  ersten Mahlzeit, steht in keiner Quelle und ist gestrichen.
   *   hinweis        GI Pantozol 20 mg (patienteninfo-service.de, überarbeitet April 2023),
   *                  Abschnitt 3: „Setzen Sie die Tabletten nicht ab, ohne zuerst mit Ihrem
   *                  Arzt oder Apotheker zu sprechen.“ Ein Säure-Rebound nach dem Absetzen
   *                  und ein „Ausschleichen“ stehen in keiner geprüften Fach- oder
   *                  Gebrauchsinformation; beides ist gestrichen. FI Pantozol 40 mg 4.4:
   *                  schwere Hypomagnesiämie „selten“, nach „mindestens drei Monate[n]“;
   *                  Vitamin-B12-Aufnahme bei Langzeittherapie. Eisen steht dort nicht.
   */
  {
    id: 'ppi',
    gruppe: 'Protonenpumpenhemmer',
    kuerzel: 'PPI',
    // Mit den Handelsnamen aus der Packung: Wer „Pantozol“ einträgt, nimmt
    // einen Säureblocker, und ohne den Namen fehlte er bei jeder Frage, die
    // nach einem Säureblocker fragt – auch bei der Rückfrage zum Methylphenidat
    // in js/zusammen.js. Von Bedeutung ist ein Säureblocker laut Fachinformation
    // nur bei den Kapseln mit zweierlei Kügelchen: Medikinet retard,
    // fachinfo.de/fi/pdf/009621 (Dezember 2025), 4.3 und 4.5, nennt die Behandlung
    // mit H2-Blockern, Protonenpumpenhemmern oder Antazida unter den Gegenanzeigen;
    // für die anderen Formen war dazu nichts belegt (siehe MPH_FORMEN unten).
    // Rifun ist Pantoprazol, Omep Omeprazol; „Omep" trifft als Teilwort auch
    // Esomep (Esomeprazol).
    beispiele: ['Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Lansoprazol', 'Rabeprazol',
      'Pantozol', 'Nexium', 'Antra', 'Agopton', 'Rifun', 'Omep'],
    kurz: 'Drosselt die Säurebildung im Magen.',
    wirkung: 'Blockiert die Pumpen in der Magenwand, an denen die Säure entsteht. '
      + 'Es wird also nicht neutralisiert, was schon da ist – es kommt weniger nach. '
      + 'Die Hemmung baut sich über die ersten Tage der Einnahme auf; je nach Wirkstoff '
      + 'nennen die Fachinformationen dafür einige Tage bis etwa eine Woche. Laut '
      + 'Fachinformation von Pantozol Control sind die Tabletten nicht für eine sofortige '
      + 'Linderung gedacht; eine erste Linderung ist nach etwa einem Tag möglich.',
    einnahme: 'Wie die Einnahme zum Essen liegt, ist je nach Wirkstoff verschieden: Bei '
      + 'manchen steht in der Packungsbeilage „vor einer Mahlzeit“ oder „morgens“, bei '
      + 'anderen spielt das Essen für die Wirkung keine Rolle. Maßgeblich ist die eigene '
      + 'Packungsbeilage; Fragen dazu beantworten Praxis oder Apotheke.',
    hinweis: 'Laut Packungsbeilage mancher Präparate, etwa Pantozol, wird die Einnahme '
      + 'nicht beendet, ohne vorher mit Ärztin, Arzt oder Apotheke zu sprechen. Fragen zum '
      + 'Beenden oder Ändern der Einnahme gehören in die Praxis oder Apotheke. Bei Einnahme '
      + 'über Monate kann laut Fachinformation der Magnesiumwert sinken, in seltenen Fällen '
      + 'stark, und Vitamin B12 kann schlechter aufgenommen werden; deshalb wird dann '
      + 'mitunter auf diese Werte geschaut.',
  },
  /*
   * Quellen (Fassung 30):
   *   wirkung  FI Famotidin-ratiopharm, fachinfo.de/fi/pdf/007352 (März 2024), 5.1:
   *            „Nach oraler Gabe tritt die Wirkung innerhalb 1 Stunde ein“. In der FI
   *            Cimetidin Genericon (AT, BASG 17360) steht kein solcher Zeitpunkt, nur
   *            dass eine „sofortige symptomatische Wirkung“ zu Beginn ausbleiben kann.
   *            „Schwächer als ein PPI“ steht schon im Feld kurz.
   *   hinweis  Famotidin 4.2: Dauer je nach Erkrankung (Geschwür „4-8 Wochen“,
   *            Zollinger-Ellison „so lange …, wie sie klinisch erforderlich ist“).
   *            Ein Nachlassen der Wirkung bei täglicher Einnahme („gewöhnt sich“)
   *            steht in keiner Fachinformation; der Satz ist gestrichen.
   */
  {
    id: 'h2',
    gruppe: 'H2-Blocker',
    beispiele: ['Famotidin', 'Cimetidin'],
    kurz: 'Drosselt die Säure auch, schwächer als ein PPI, aber schneller.',
    wirkung: 'Setzt eine Stufe früher an als der PPI: Er besetzt den Schalter '
      + '(den Histamin-H2-Rezeptor), über den die Säurebildung angeregt wird. '
      + 'Bei Famotidin setzt die Wirkung laut Fachinformation innerhalb einer Stunde ein.',
    einnahme: 'Oft abends, weil er die nächtliche Säure gut abfängt.',
    hinweis: 'Wie lange er genommen wird, hängt laut Fachinformation vom Anlass ab; '
      + 'Fragen dazu gehören in die Praxis oder Apotheke. Ranitidin, das früher hierher '
      + 'gehörte, ist seit 2020 vom Markt.',
  },
  /*
   * Quellen (Fassung 30):
   *   wirkung   FI Rennie, fachinfo.de/fi/pdf/008317 (01.2024), 5.1: Wirkmechanismus
   *             „lokal, basiert auf der Neutralisation von Magensäure“; gesund.bund.de/
   *             gastritis (13.11.2025): PPI und H2-Blocker „hemmen die Bildung von
   *             Magensäure“, Antazida „neutralisieren die vorhandene“. FI Talcid,
   *             fachinfo.de/fi/pdf/003027 (10.2024), 4.1: „Zur symptomatischen
   *             Behandlung“. Dauer: Talcid 5.1 „für ca. 2 Stunden“ im Bereich pH 3–5;
   *             FI RIOPAN Magen Tabletten, fachinfo.de/fi/pdf/007171 (März 2025), 5.1:
   *             „durchschnittlich 20 – 40 min“. Die frühere Spanne von ein bis drei
   *             Stunden stand in keiner Fachinformation.
   *   einnahme  Rennie 4.2: „bevorzugt eine Stunde nach den Mahlzeiten oder vor dem
   *             Zubettgehen, aber auch bei Bedarf“; Talcid 4.2: „zwischen den Mahlzeiten
   *             und vor dem Schlafengehen“; Riopan 4.2: „Bei Bedarf“.
   *   hinweis   Rennie 4.5: verminderte Absorption durch „nichtresorbierbarer
   *             Verbindungen (Chelate)“, „Abstand von 1 – 2 Stunden“; GI Talcid
   *             (überarbeitet Oktober 2024): „Die Aufnahme und damit auch die
   *             Wirksamkeit von anderen Arzneimitteln kann … vermindert werden“; FI
   *             Maaloxan 25 mVal, fachinfo.de/fi/pdf/021873 (Juli 2022), 4.5: „mindestens
   *             2 Stunden“, bei bestimmten Antibiotika „von einer Einnahme der Antacida
   *             abzuraten“; 5.1: „Magnesiumhydroxid wirkt laxierend, während
   *             Aluminiumhydroxid obstipiert“. Für Calcium war „stopfend“ nicht belegt.
   */
  {
    id: 'antazida',
    gruppe: 'Antazida',
    beispiele: ['Magaldrat', 'Hydrotalcit', 'Riopan', 'Talcid', 'Rennie', 'Antazidum', 'Maaloxan'],
    kurz: 'Neutralisiert die Säure, die schon da ist. Wirkt in Minuten.',
    wirkung: 'Eine Base, die die vorhandene Säure abpuffert. Die Säurebildung selbst '
      + 'wird nicht gehemmt; laut Fachinformation dient es der Linderung der Beschwerden. '
      + 'Wie lange es anhält, hängt vom Wirkstoff ab: Laut Fachinformation bleibt der '
      + 'Säurewert im Magen bei Magaldrat im Mittel 20 bis 40 Minuten im Zielbereich, '
      + 'bei Hydrotalcit etwa zwei Stunden.',
    einnahme: 'Laut Packungsbeilagen meist bei Bedarf. Welche Zeiten sie sonst nennen, ist '
      + 'je nach Präparat verschieden, etwa nach den Mahlzeiten, zwischen den Mahlzeiten '
      + 'oder vor dem Schlafengehen. Was für das eigene Präparat gilt, steht in dessen '
      + 'Packungsbeilage; bei Fragen hilft die Apotheke.',
    hinweis: 'Der wichtigste Punkt steht selten vorn auf der Packung: Antazida können die '
      + 'Aufnahme mancher anderer Medikamente ins Blut vermindern und damit deren Wirkung '
      + 'abschwächen – teils, weil sie sich mit ihnen zu Verbindungen zusammenschließen, '
      + 'die der Körper nicht aufnehmen kann. Die Packungsbeilagen nennen deshalb einen '
      + 'zeitlichen Abstand zu anderen Medikamenten, je nach Präparat ein bis zwei Stunden '
      + 'oder mindestens zwei Stunden; zu einzelnen Antibiotika steht dort mehr. Was für '
      + 'die eigenen Medikamente gilt, weiß die Apotheke. Magnesiumhaltige wirken eher '
      + 'abführend, aluminiumhaltige eher stopfend.',
  },
  /*
   * Quellen (Fassung 30):
   *   wirkung   GI Gaviscon Advance Pfefferminz (DE, überarbeitet August 2021),
   *             Information für Patienten: Beschwerden „unabhängig davon, ob der Magen
   *             normal oder zuviel Magensäure enthält“, Behandlung: „den Rückfluss des
   *             sauren Mageninhalts zu verhindern“. GI Gaviscon Dual (DE, überarbeitet
   *             Oktober 2019, Wiedergabe medikamio): „eine Kombination aus einem Alginat
   *             und zwei Antazida … wirkt in zweifacher Weise“ – deshalb nicht mehr
   *             „nicht auf die Säuremenge“.
   *   einnahme  FI Gaviscon Mint Kautabletten (AT), BASG 1-30357 (Oktober 2020), 4.2:
   *             „nach den Mahlzeiten und vor dem Schlafengehen“; 5.1: Gel, „die auf dem
   *             Mageninhalt schwimmt“. Die frühere Begründung („dann ist etwas da …“)
   *             ist gestrichen.
   */
  {
    id: 'alginat',
    gruppe: 'Alginate',
    beispiele: ['Gaviscon', 'Alginat'],
    kurz: 'Legt einen Deckel auf den Mageninhalt, gegen Aufsteigendes.',
    wirkung: 'Aus Algen gewonnen: Im Magen bildet sich ein leichtes Gel, das oben '
      + 'aufschwimmt und die Säure am Übertritt in die Speiseröhre hindert. Zielt '
      + 'also auf den Rückfluss von saurem Mageninhalt, der Sodbrennen und saures '
      + 'Aufstoßen macht. Manche Alginat-Präparate wie Gaviscon Dual enthalten zusätzlich '
      + 'säurebindende Stoffe (Antazida).',
    einnahme: 'Laut Packungsbeilage nach den Mahlzeiten und vor dem Schlafengehen; das Gel '
      + 'schwimmt auf dem Mageninhalt. Bei Fragen zur Einnahme hilft die Apotheke.',
    hinweis: 'Auch hier Abstand zu anderen Medikamenten.',
  },
  /*
   * Quellen (Fassung 30): FI Sucralfat Genericon (AT), BASG 1-20571 (Stand 02.2026):
   *   5.1 „lokalen Wirkmechanismen an der Magen- und Duodenalschleimhaut“; 5.2 „nur in
   *   geringem Umfang … resorbiert“ (0,5 bis 2,2 %); 4.2 „möglichst auf leeren Magen.
   *   Bei Behandlung der Refluxösophagitis … nach den Mahlzeiten“; 4.5 „Gleichzeitige
   *   Einnahme von Antacida oder säurehemmenden Mitteln beeinträchtigt die Wirksamkeit“
   *   und verminderte Resorption anderer Arzneimittel, vermeidbar mit „längeren
   *   zeitlichen Abstand“. Dass es nicht in die Säurebildung eingreife und ein saures
   *   Milieu zum Haften brauche, steht dort nicht; beides ist gestrichen.
   */
  {
    id: 'sucralfat',
    gruppe: 'Sucralfat',
    beispiele: ['Sucralfat', 'Ulcogant'],
    kurz: 'Legt sich als Film über die wunden Stellen.',
    wirkung: 'Haftet an entzündeter oder verletzter Schleimhaut und bildet dort eine '
      + 'Schutzschicht gegen Säure und Verdauungsenzyme. Es wirkt örtlich an der '
      + 'Schleimhaut und wird kaum ins Blut aufgenommen – es deckt ab.',
    einnahme: 'Laut Fachinformation möglichst auf leeren Magen; bei einer Entzündung der '
      + 'Speiseröhre durch Rückfluss dagegen nach den Mahlzeiten. Den genauen Zeitpunkt '
      + 'nennen Packungsbeilage, Praxis oder Apotheke.',
    hinweis: 'Laut Fachinformation beeinträchtigen Antazida oder säurehemmende Mittel, '
      + 'gleichzeitig eingenommen, seine Wirksamkeit. Auch zu manchen anderen Medikamenten '
      + 'nennt sie einen zeitlichen Abstand. Den Abstand für die eigenen Mittel klären '
      + 'Praxis oder Apotheke.',
  },
  /*
   * Quellen (Fassung 30):
   *   wirkung   FI Domperidon-ratiopharm, fachinfo.de/fi/pdf/007740 (September 2025),
   *             4.1: „zur Besserung der Symptome Übelkeit und Erbrechen“, 5.1:
   *             „die Magenentleerung beschleunigt“. FI MCP-ratiopharm 10 mg,
   *             fachinfo.de/fi/pdf/010786 (Juli 2026), 4.1: „einschließlich Übelkeit und
   *             Erbrechen, die durch akute Migräne hervorgerufen werden“, „um die
   *             Resorption des Schmerzmittels bei akuter Migräne zu fördern“. EMA,
   *             Referral Domperidon (11/09/2014): „no longer be authorised to treat other
   *             conditions such as bloating or heartburn“; Referral Metoclopramid
   *             (06/02/2014): „no longer be used … chronic (long-term) disorders due to
   *             slow emptying of the stomach“. FI Migraeflux MCP,
   *             fachinfo.de/fi/pdf/007336 (01/2025), 5.1: „Beeinträchtigungen der
   *             gastrointestinalen Motilität“ bei Migräne; FI Migränerton,
   *             fachinfo.de/fi/pdf/001353 (Januar 2025), 5.2: „im Migräneanfall durch
   *             verminderte enterale Motilität“. Ein Stillstand steht dort nicht. Für
   *             Domperidon nennt keine Quelle die Migräne eigens.
   *   einnahme  MCP 4.2 und Domperidon 4.2: vor den Mahlzeiten. Eine „Viertelstunde
   *             vor dem Schmerzmittel“ steht in keiner Fachinformation; gestrichen.
   */
  {
    id: 'prokinetika',
    gruppe: 'Prokinetika',
    beispiele: ['Domperidon', 'Metoclopramid', 'MCP'],
    kurz: 'Regt die Magenbewegung an; zugelassen bei Übelkeit und Erbrechen.',
    wirkung: 'Regt die Magenbewegung an und beschleunigt die Magenentleerung. Zugelassen '
      + 'sind diese Mittel laut Fachinformation zur Behandlung von Übelkeit und Erbrechen; '
      + 'für Völlegefühl oder einen dauerhaft trägen Magen sind sie in der EU nicht mehr '
      + 'zugelassen. Metoclopramid ist laut Fachinformation auch bei Übelkeit und Erbrechen '
      + 'im akuten Migräneanfall zugelassen und kann dort die Aufnahme eines Schmerzmittels '
      + 'zum Einnehmen fördern; im Anfall kann die Magen-Darm-Bewegung vermindert sein.',
    einnahme: 'Laut Fachinformation vor den Mahlzeiten. Wie es bei Migräne zeitlich mit dem '
      + 'Schmerzmittel zusammen genommen wird, legt die Praxis fest. Verschreibungspflichtig.',
    hinweis: 'Nicht für den Dauergebrauch gedacht; die zugelassene Anwendungsdauer '
      + 'ist begrenzt, wegen möglicher Wirkungen auf Herzrhythmus und Nervensystem. '
      + 'Gehört in ärztliche Hand.',
  },
  /*
   * Quellen (Fassung 30):
   *   kurz      FI Iberogast Classic, fachinfo.de/fi/pdf/022252 (09.2023), 4.1:
   *             „Magenschmerzen, Völlegefühl, Blähungen, Magen-Darm-Krämpfen, Übelkeit
   *             und Sodbrennen“; EMA-Monographien unten. Der Vergleich „eher … als auf
   *             die Säure“ ist gestrichen: Dieselbe FI nennt in 5.1 auch eine Hemmung
   *             der Säurebildung.
   *   wirkung   Iberogast Classic FI, Abschnitt 2: neun Auszüge, darunter Schöllkraut;
   *             FI Iberogast ADVANCE, fachinfo.de/fi/pdf/023043 (09.2023), Abschnitt 2:
   *             sechs Auszüge, ohne Schöllkraut. EMA/HMPC, Abschnitt 4.1, jeweils
   *             „exclusively based upon long-standing use“: Kamille EMA/HMPC/55843/2011
   *             (7.7.2015) „minor gastro-intestinal complaints such as bloating and minor
   *             spasms“; Fenchel EMA/HMPC/372841/2016 Rev. 1 (31.1.2024) und Anis
   *             EMA/HMPC/321184/2012 (12.11.2013) „mild, spasmodic gastrointestinal
   *             complaints including bloating and flatulence“; Kümmel EMA/HMPC/715092/2013
   *             (7.7.2015) „digestive disorders such as bloating and flatulence“ – ohne
   *             Krämpfe; Süßholz EMA/HMPC/108399/2024 Rev. 1 (4.3.2026) „relief of
   *             digestive symptoms including burning sensation and dyspepsia“.
   *   einnahme  GI Iberogast Classic und ADVANCE (patienteninfo-service.de, beide
   *             überarbeitet September 2023), Abschnitt 3: „vor oder zu den Mahlzeiten“.
   *             Das frühere „zu oder nach“ widersprach dem.
   *   hinweis   Iberogast Classic FI 4.3: bei Lebererkrankungen „darf das Arzneimittel
   *             nicht eingenommen werden“; 4.4/4.8: „Leberschädigung einschließlich
   *             Leberversagen“; ebenso GI Iberogast Classic, Abschnitte 2 und 4. In der
   *             FI von Iberogast ADVANCE steht kein Leberhinweis.
   */
  {
    id: 'pflanzlich',
    gruppe: 'Pflanzliche Mittel',
    beispiele: ['Iberogast', 'Kamille', 'Kamillentee', 'Süßholz', 'Kümmel', 'Fenchel', 'Anis'],
    kurz: 'Werden vor allem bei Krämpfen, Blähungen und Völlegefühl angewendet.',
    wirkung: 'Iberogast Classic ist eine Mischung aus neun Pflanzenauszügen, darunter '
      + 'Schöllkraut; Iberogast Advance enthält sechs, ohne Schöllkraut. Beide zielen auf '
      + 'Krämpfe und die Magenbewegung. Kamille wird traditionell bei leichten '
      + 'Magen-Darm-Beschwerden wie Blähungen und leichten Krämpfen angewendet, Fenchel und '
      + 'Anis bei leichten krampfartigen Beschwerden mit Blähungen, Kümmel bei '
      + 'Verdauungsbeschwerden wie Blähungen, Süßholzwurzel bei Verdauungsbeschwerden, auch '
      + 'mit brennendem Gefühl. Bei diesen Pflanzen beruht die Anwendung laut '
      + 'EU-Arzneimittelbehörde allein auf langjähriger Erfahrung.',
    einnahme: 'Wann und wie oft ein Mittel oder ein Arzneitee genommen wird, steht in der '
      + 'jeweiligen Packungsbeilage – bei Iberogast etwa „vor oder zu den Mahlzeiten“. '
      + 'Fragen dazu beantwortet die Apotheke.',
    hinweis: '„Pflanzlich" heißt nicht „harmlos". Für Iberogast Classic, das Schöllkraut '
      + 'enthält, nennen Fach- und Gebrauchsinformation Fälle von Leberschäden bis hin zu '
      + 'Leberversagen; bei Lebererkrankungen ist es dort ausgeschlossen. Iberogast Advance '
      + 'enthält kein Schöllkraut. Süßholz in größeren Mengen über längere Zeit kann '
      + 'Blutdruck und Kalium beeinflussen. Beides gehört in ein Gespräch in der Apotheke.',
  },
  /*
   * Quellen (Fassung 30):
   *   wirkung   GI Santerra Heilerde supra Pulver (Wiedergabe medikamio), Abschnitt 1:
   *             „mild wirkendes Arzneimittel bei Sodbrennen und säurebedingten
   *             Magenbeschwerden … zur Bindung überschüssiger Magensäure“; „auf
   *             Lösszubereitungen“. Der Vergleich „langsamer“ als ein Antazidum ist
   *             nicht belegt und gestrichen.
   *   einnahme  GI Adolf Justs Luvos Heilerde ultrafein (überarbeitet Juli 2014),
   *             Abschnitt 3: „morgens nüchtern und abends vor dem Schlafengehen sowie bei
   *             Bedarf jeweils eine halbe Stunde vor oder nach dem Essen“. FI Pylera,
   *             fachinfo.de/fi/pdf/013842 (Februar 2023), 4.2: „nach der Mahlzeit“. Das
   *             frühere „zwischen den Mahlzeiten“ passte zu keinem der beiden.
   *   hinweis   Luvos GI, Abschnitt 2: „Wegen des ausgeprägten Vermögens, andere Stoffe
   *             zu binden, … im zeitlichen Abstand von einer bis zwei Stunden“. Pylera 4.4:
   *             „Bismut kann eine vorübergehende, harmlose Dunkelfärbung der Fäces
   *             verursachen“; 4.8: Stuhl schwarz sehr häufig, Zungenverfärbung
   *             gelegentlich. US-Fachinformation Pylera (accessdata.fda.gov, Revised
   *             3/2025), 5.9 und 17: „Stool darkening should not be confused with melena
   *             (blood in the stool)“. Schwarzer, klebriger Stuhl ist in js/bild.js ein
   *             Warnzeichen der Stufe „sofort“ (teerstuhl); der Satz folgt der Warnkarte.
   */
  {
    id: 'heilerde',
    gruppe: 'Heilerde und Bismut',
    beispiele: ['Heilerde', 'Bismut'],
    kurz: 'Bindet Säure und legt sich über die Schleimhaut.',
    wirkung: 'Heilerde ist eine Zubereitung aus Löss; laut Packungsbeilage ein mild '
      + 'wirkendes Mittel bei Sodbrennen und säurebedingten Magenbeschwerden, das '
      + 'überschüssige Magensäure bindet. Bismutsalze legen sich zusätzlich schützend auf '
      + 'und werden vor allem in Kombinationstherapien gegen Helicobacter eingesetzt.',
    einnahme: 'Je nach Mittel verschieden: Bismut in einer Helicobacter-Behandlung folgt '
      + 'dem Einnahmeplan aus der Praxis, Heilerde hat eigene Einnahmezeiten. Was für das '
      + 'eigene Mittel gilt, steht in der Packungsbeilage; bei Fragen hilft die Apotheke.',
    hinweis: 'Heilerde kann andere Stoffe binden; laut Packungsbeilage wird sie deshalb mit '
      + 'zeitlichem Abstand zu anderen Arzneimitteln eingenommen. Für Bismut-Präparate '
      + 'gelten eigene Hinweise zu anderen Mitteln – was für die eigenen Mittel gilt, '
      + 'erklären Praxis oder Apotheke. Bismut kann den Stuhl dunkel bis schwarz färben, '
      + 'seltener auch die Zunge; laut Fachinformation ist diese Färbung vorübergehend und '
      + 'harmlos. Schwarzer Stuhl kann aber auch verdautes Blut sein. Bei schwarzem, '
      + 'klebrigem Stuhl nicht auf einen Termin warten – Notaufnahme oder 112 – und dort '
      + 'dazusagen, dass Bismut genommen wird.',
  },
  /*
   * Quellen (Fassung 30):
   *   kurz      gesund.bund.de/magengeschwuer (Stand 07.01.2022): Behandlung „über 1 bis
   *             2 Wochen“, Kontrolle „frühestens nach 4 Wochen … ob die Therapie
   *             erfolgreich war“ – der Erfolg ist also das Ziel, nicht sicher.
   *   einnahme  GI Pantozol 40 mg (patienteninfo-service.de, überarbeitet April 2023),
   *             Abschnitt 3: bei Helicobacter „Zweimal täglich“; FI Pylera,
   *             fachinfo.de/fi/pdf/013842 (Februar 2023), 4.2:
   *             viermal täglich. Ein „meist morgens und abends“ trifft nicht jede
   *             Kombination; die Zeiten stehen deshalb nicht mehr hier.
   *   hinweis   GI Pylera (AT, BASG, überarbeitet April 2025), Abschnitt 3: „Es ist
   *             wichtig, dass Sie den gesamten Behandlungszeitraum einhalten, auch wenn
   *             Sie sich nach ein paar Tagen schon besser fühlen“, sonst „möglicherweise
   *             nicht vollständig ausgeheilt“ und „Resistenz gegen Tetracyclin und/oder
   *             Metronidazol“. Die frühere Einleitung „Das eine Mittel, bei dem … wirklich
   *             schadet“ ist gestrichen: Auch bei anderen Mitteln hier steht in der
   *             Packungsbeilage, nicht ohne Rücksprache abzusetzen.
   */
  {
    id: 'eradikation',
    gruppe: 'Helicobacter-Behandlung',
    beispiele: ['Amoxicillin', 'Clarithromycin', 'Metronidazol'],
    kurz: 'Eine befristete Kombination, die ein bestimmtes Bakterium beseitigen soll.',
    wirkung: 'Helicobacter pylori ist eine der häufigsten Ursachen einer chronischen '
      + 'Gastritis. Behandelt wird nicht mit einem Mittel, sondern mit einer '
      + 'Kombination aus einem PPI und zwei bis drei Antibiotika über sieben bis '
      + 'vierzehn Tage.',
    einnahme: 'Nach dem Einnahmeplan aus der Praxis. Wie oft am Tag und zu welchen '
      + 'Tageszeiten, unterscheidet sich je nach Kombination; das steht im Plan und in den '
      + 'Packungsbeilagen.',
    hinweis: 'Laut Packungsbeilage ist es wichtig, die ganze Behandlungszeit einzuhalten, '
      + 'auch wenn es einem nach ein paar Tagen schon besser geht: Zu früh beendet, heilt '
      + 'die Infektion womöglich nicht ganz aus, und die Keime können gegen die '
      + 'Antibiotika unempfindlich werden. Ob der Keim weg ist, wird hinterher '
      + 'nachgeprüft. Fragen zur Einnahme und zur Dauer klären Praxis oder Apotheke.',
  },
];

/**
 * Was den Magen von der anderen Seite belastet.
 *
 * Gehört in eine Übersicht über Magenmittel, weil regelmäßig eingenommene NSAR
 * neben Helicobacter pylori zu den häufigsten Gründen für eine
 * Magenschleimhautentzündung zählen und Kortison diese Wirkung verstärken kann
 * (gesund.bund.de/gastritis, Stand 13.11.2025, „Welche Ursachen hat eine
 * Gastritis?“ und „Einnahme von NSAR-Schmerzmitteln“) – und weil es das Einzige
 * hier ist, was jemand womöglich gerade selbst einnimmt, ohne den Zusammenhang
 * zu kennen.
 */
export const REIZSTOFFE = [
  /*
   * Quellen (Fassung 30):
   *   kurz, wirkung  gesund.bund.de/gastritis (13.11.2025): „Zu den häufigsten Gründen
   *                  zählen eine Infektion mit Helicobacter-Pylori-Bakterien oder die
   *                  häufige Einnahme“ von NSAR; „über einen längeren Zeitraum von Wochen
   *                  oder Monaten, kann das die Schutzfunktion der Magenschleimhaut
   *                  stören“; Prostaglandin sorgt dafür, „dass der Körper Magenschleim und
   *                  Stoffe bildet, welche die Magensäure neutralisieren“. Eine Rangfolge
   *                  („häufigster vermeidbarer Grund“) und ein „Abschalten“ des Schutzes
   *                  stehen dort nicht.
   *   hinweis        FI ben-u-ron 500 mg, fachinfo.de/fi/pdf/005407 (Januar 2025), 5.1:
   *                  „periphere Prostaglandinsynthese nur schwach gehemmt“; FI Novalgin,
   *                  fachinfo.de/fi/pdf/014708 (November 2024), 4.8: „Fälle von
   *                  gastrointestinalen Blutungen berichtet“. Gel und Pflaster: FI Voltaren
   *                  Schmerzgel, fachinfo.de/fi/pdf/022162 (Dezember 2024), 5.2:
   *                  Resorption „etwa 6 %“, Plasmaspitzen „etwa 100-mal niedriger“; 4.8:
   *                  großflächig und länger angewendet systemische Nebenwirkungen (auch
   *                  gastrointestinale) möglich; FI Voltaren 24 Stunden Schmerzpflaster,
   *                  fachinfo.de/fi/pdf/024162 (September 2024), 4.8: ebenso.
   */
  {
    id: 'nsar',
    gruppe: 'Entzündungshemmende Schmerzmittel (NSAR)',
    // Mit den Handelsnamen von Ibuprofen-Präparaten, die laut Gebrauchsinformation
    // auch bei der akuten Kopfschmerzphase der Migräne angewendet werden (Dolormin
    // Migräne, Nurofen Ibuprofen; Wiedergabe medikamio, Abschnitt 1). Laut
    // gesund.bund.de/migraene (Stand 21.12.2022) nehmen viele Menschen mit Migräne
    // entzündungshemmende Schmerzmittel wie Ibuprofen. Ohne diese Namen erkannte
    // Body Check solche Einträge nicht als NSAR – und jeder Satz zum Magen hängt an
    // dieser Zählung.
    beispiele: ['Ibuprofen', 'Ibu', 'Dolormin', 'Nurofen', 'Diclofenac', 'Diclo',
      'Voltaren', 'Naproxen', 'ASS', 'Aspirin'],
    kurz: 'Regelmäßig genommen, neben Helicobacter einer der häufigsten Gründe für eine entzündete Magenschleimhaut.',
    wirkung: 'Sie hemmen Botenstoffe, die Schmerz und Entzündung machen – dieselben '
      + 'Botenstoffe sorgen aber auch dafür, dass der Magen Schleim und säureneutralisierende '
      + 'Stoffe bildet. Bei Einnahme über Wochen oder Monate kann das die Schutzfunktion der '
      + 'Magenschleimhaut stören.',
    einnahme: '–',
    hinweis: 'Wer regelmäßig zu einem davon greift und Magenbeschwerden hat, kann das in '
      + 'der Praxis ansprechen: Es gibt Schmerzmittel, die diese Botenstoffe nur schwach '
      + 'hemmen – Magen-Darm-Nebenwirkungen sind aber auch bei manchen von ihnen '
      + 'beschrieben –, und wenn es ohne NSAR nicht geht, einen Magenschutz dazu. Welches '
      + 'davon, entscheidet sich nicht am Magen allein. Zusammen mit Kortison steigt das '
      + 'Risiko weiter. Als Gel oder Pflaster auf der Haut zählt Body Check es hier nicht '
      + 'mit: Davon gelangt laut Fachinformation nur ein kleiner Teil ins Blut, viel weniger '
      + 'als beim Einnehmen. Großflächig und über längere Zeit angewendet, sind '
      + 'Nebenwirkungen auch an Magen und Darm aber nicht ganz ausgeschlossen.',
  },
  /*
   * Quelle: ICHD-3 8.2.5 Combination-analgesic-overuse headache,
   * ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-2-medication-overuse-headache-moh/8-2-5-combination-analgesic-overuse-headache/
   * (Note 1: Koffein als wirkungsverstärkender Zusatz – „acting as adjuvants“ –
   * macht ein Schmerzmittel zum Kombinationsmittel; in der Fachinformation steht
   * Koffein unter den Wirkstoffen, nicht unter den sonstigen Bestandteilen (etwa FI
   * Neuralgin Schmerztabletten, 004721, Januar 2025, Abschnitt 2), ist also kein
   * Hilfsstoff. Kriterium B: Einnahme an zehn oder mehr
   * Tagen im Monat über mehr als drei Monate, bei einem Kopfschmerz, der die
   * Kriterien von 8.2 erfüllt. Comments: „widely used by people with headache, and
   * are very commonly implicated in 8.2 Medication-overuse headache“.) Zum
   * Vergleich 8.2.3: nicht-opioide Schmerzmittel allein „on 15 or more days/month“.
   * Die frühere Aussage „die meistgekauften rezeptfreien Kopfschmerzmittel“ ist
   * eine Marktangabe ohne Quelle und gestrichen.
   *
   * Neuralgin: FI Neuralgin extra Ibu-Lysinat, fachinfo.de/fi/pdf/010211 (August
   * 2024), Abschnitte 2 und 6.1 – nur Ibuprofen, kein Koffein. Das Beispiel bleibt
   * (Neuralgin Schmerztabletten, 004721, und Neuralgin PAC, 023934, beide Januar
   * 2025, enthalten ASS, Paracetamol und Koffein), denn es steuert die Zuordnung in
   * wissenZu(); der Hinweis sagt dazu, dass es unter einer Marke auch Präparate ohne
   * Koffein gibt.
   *
   * „Koffein" steht hier nicht mehr als Beispiel: Allein ist es kein
   * Schmerzmittel (siehe SONSTIGE_MITTEL), und mit ASS oder Paracetamol im
   * Namen sortiert es wissenZu() nach dem Schmerzmittel ein.
   *
   * Hierher kommt jedes NSAR mit Koffein, nicht nur ASS: auch Ibuprofen mit
   * Koffein (etwa Thomapyrin Tension Duo). Deshalb nennen Gruppe und Text
   * beide – wer Ibuprofen mit Koffein einträgt, soll nicht lesen, sein Mittel
   * enthalte ASS.
   */
  {
    id: 'kombi',
    gruppe: 'Kombinationsmittel mit ASS oder Ibuprofen und Koffein',
    beispiele: ['Thomapyrin', 'Neuralgin'],
    kurz: 'Für den Magen ein NSAR – für den Kopf ein Mittel mit der niedrigsten Übergebrauchsgrenze.',
    wirkung: 'ASS (meist zusammen mit Paracetamol) oder Ibuprofen, dazu Koffein, das die '
      + 'Wirkung verstärkt und beschleunigt. Für die Magenschleimhaut zählt der ASS- oder '
      + 'Ibuprofen-Anteil wie jedes NSAR: Bei Einnahme über Wochen oder Monate kann er die '
      + 'Schutzfunktion der Magenschleimhaut stören.',
    einnahme: '–',
    hinweis: 'Kombinationsmittel sind bei Kopfschmerzen weit verbreitet; laut '
      + 'internationaler Kopfschmerzklassifikation sind sie sehr häufig an einem '
      + 'Kopfschmerz durch zu häufige Einnahme beteiligt. Wird ein Kombinationsmittel über '
      + 'mehr als drei Monate an zehn oder mehr Tagen im Monat genommen, kann es den '
      + 'Kopfschmerz selbst unterhalten; bei ASS, Ibuprofen oder Paracetamol allein nennt '
      + 'die Klassifikation dafür fünfzehn Tage. Für den Magen zählt es wie ein NSAR. Auch '
      + 'ein Präparat, das nur ASS und Koffein oder nur Ibuprofen und Koffein enthält, '
      + 'zählt hier. Unter einer Marke gibt es manchmal auch Präparate ohne Koffein, etwa '
      + 'Neuralgin extra Ibu-Lysinat nur mit Ibuprofen; welche Wirkstoffe drin sind, steht '
      + 'auf der Packung.',
  },
  /*
   * Quellen (Fassung 30): FI Prednisolon acis, fachinfo.de/fi/pdf/013291 (01.2026),
   *   4.8: Nebenwirkungen, „die sehr stark von Dosis und Therapiedauer abhängig sind“,
   *   darunter „Magen-Darm-Ulcera, gastrointestinale Blutungen“; 4.5: mit NSAR „Die
   *   Gefahr von Magen-Darm-Ulzeration und -Blutungen wird erhöht“. Ein Ausmaß
   *   („deutlich“) und eine Neubewertung („geringerer Magenreiz als lange
   *   angenommen“) stehen dort nicht; beides ist gestrichen.
   */
  {
    id: 'kortison',
    gruppe: 'Kortison',
    beispiele: ['Prednisolon', 'Kortison'],
    kurz: 'Kann auch für sich den Magen belasten; zusammen mit NSAR ist die Gefahr erhöht.',
    wirkung: 'Laut Fachinformation können auch unter Kortison allein Magen-Darm-Geschwüre '
      + 'und -Blutungen als Nebenwirkung auftreten; wie häufig, hängt stark von Dosis und '
      + 'Behandlungsdauer ab. Zusammen mit einem entzündungshemmenden Schmerzmittel (NSAR) '
      + 'ist die Gefahr von Magengeschwüren und Magen-Darm-Blutungen erhöht.',
    einnahme: '–',
    hinweis: 'Nie eigenmächtig absetzen. Änderungen gehören in ärztliche Hand.',
  },
];

/*
 * Was sonst noch gegen Schmerzen und Migräne genommen wird – Mittel, die keine
 * NSAR sind. Magen-Darm-Nebenwirkungen sind auch bei ihnen beschrieben, etwa
 * Übelkeit, bei Metamizol laut Fachinformation auch Magen-Darm-Blutungen (FI
 * Novalgin, fachinfo.de/fi/pdf/014708, November 2024, 4.8).
 *
 * Gehört hierher, weil unter „Was noch fehlt" die Frage nach einer
 * magenfreundlicheren Möglichkeit für die Sprechstunde steht: Die App soll
 * erkennen, wenn jemand Paracetamol nimmt. In der Fachinformation von ben-u-ron
 * stehen – anders als bei Ibuprofen – Magen-Darm-Geschwüre und -Blutungen nicht
 * unter den Nebenwirkungen (FI ben-u-ron 500 mg, fachinfo.de/fi/pdf/005407,
 * Januar 2025, 4.8; FI IBU-ratiopharm 400 mg akut, fachinfo.de/fi/pdf/014937,
 * Juni 2026, 4.4); seine Risiken liegen woanders. Und sie soll Triptane kennen,
 * weil die Kopfschmerzklassifikation bei einer Migräne neben den Kopfschmerztagen
 * die Tage mit Akutmedikation im Monat zählt, um einen Medikamentenübergebrauch
 * einzuordnen – und für Triptane die niedrigere der beiden Schwellen gilt, zehn
 * statt fünfzehn Tage, wie für Ergotamin, Opioide und Kombinationsmittel (ICHD-3
 * 8.2, 8.2.1 bis 8.2.5, ichd-3.org). Beides ohne Empfehlung: Welches Mittel für
 * wen passt, entscheidet niemand hier.
 */
export const WEITERE_MITTEL = [
  /*
   * Quellen (Fassung 30), Fachinformationen von fachinfo.de/fi/pdf/<nr>:
   *   kurz, wirkung  Imigran 012361 (August 2025) 4.4: „nur bei eindeutiger Diagnose
   *                  einer Migräne“; 5.1: Gehirnhaut, „kraniale Vasokonstriktion und
   *                  Inhibierung der Aktivität des Trigeminus-Nervs … tragen
   *                  wahrscheinlich … bei“; Maxalt 003603 (Juni 2024) 5.1: Gefäße, „die –
   *                  so wird angenommen – während einer Attacke dilatieren“. Imigran-Inject
   *                  006022 (Mai 2026) 4.1: auch „Cluster-Kopfschmerz“. Spannungskopfschmerz
   *                  steht in keinem Anwendungsgebiet. Außerhalb des Kopfes: Imigran 4.4
   *                  „peripheren Gefäßwiderstandes“, Maxalt 4.5 „Vasokonstriktion der
   *                  Herzkranzgefäße“. Magen-Darm, 4.8: Maxalt „Häufig: Übelkeit, trockener
   *                  Mund, Erbrechen, Durchfall, Verdauungsstörung“; AscoTop 001556 (Januar
   *                  2022) „Häufig abdominale Schmerzen, Übelkeit, Erbrechen“. Dass es die
   *                  Magenschleimhaut „nicht angreift“, sagt keine Quelle; gestrichen.
   *   einnahme       AscoTop 5.2: Plasmaspiegel im Anfall geringer, „im Einklang mit der …
   *                  verzögerten Magenentleerung“; Relpax 004260 (November 2025) 5.2: im
   *                  Anfall AUC „um etwa 30 %“ geringer; Imigran 5.2 „anscheinend … nicht
   *                  signifikant beeinflusst“; Maxalt 5.2 „keinen Einfluss“. AscoTop
   *                  Schmelztabletten 000789 (Mai 2026) 4.2: „mit dem Speichel
   *                  heruntergeschluckt“; AscoTop Nasal 007410 (Juni 2023) 4.2: „insbesondere
   *                  bei Patienten, die während des Migräneanfalls unter Übelkeit und
   *                  Erbrechen leiden, von Nutzen“. Ein stillstehender Magen steht nirgends.
   *   hinweis        Gegenanzeigen 4.3: Imigran (Herzinfarkt, ischämische Herzkrankheit,
   *                  periphere vaskuläre Erkrankungen, Schlaganfall oder TIA,
   *                  „mittelschwerem bis schwerem Bluthochdruck und leichtem,
   *                  unkontrolliertem“), Maxalt („unbehandelte leichte Hypertonie“).
   *                  Prüfung vor dem Rezept nur bei Risikofaktoren: AscoTop 4.4 „nicht ohne
   *                  vorherige Untersuchung“; GI Imigran 50 mg (patienteninfo-service.de,
   *                  August 2025), Abschnitt 2. Engegefühl: GI Imigran, Abschnitte 2 und 4,
   *                  „können intensiv sein, gehen aber im Allgemeinen schnell vorüber“, „Bei
   *                  sehr wenigen Patienten … durch einen Herzinfarkt verursacht“, bei
   *                  Andauern „umgehend einen Arzt“. Darm: GI AscoTop 5 mg (Januar 2022)
   *                  sehr selten, „sofort einen Arzt“; GI Naramig (September 2023) selten;
   *                  Imigran und Maxalt 4.8 „Nicht bekannt“. Beide Fälle sind
   *                  Warnzeichen der Stufe „sofort“ und folgen dem Text der Warnkarte.
   *                  Übergebrauch: ICHD-3 8.2.2 „≥10 days/month for >3 months“, 8.2.3 „15
   *                  or more days/month“, 8.2.5 „≥10 days/month“.
   */
  {
    id: 'triptan',
    gruppe: 'Triptane',
    // „triptan" als Teilwort fängt jeden Wirkstoff; dazu die Handelsnamen.
    beispiele: ['triptan', 'Imigran', 'Maxalt', 'AscoTop', 'Naramig', 'Formigran',
      'Dolortriptan', 'Relpax', 'Almogran'],
    kurz: 'Ein Mittel eigens gegen den Migräneanfall – für einen Spannungskopfschmerz ist es nicht zugelassen.',
    wirkung: 'Dockt an bestimmten Serotonin-Schaltern an. Nach heutiger Vorstellung verengt '
      + 'es so die im Anfall erweiterten Blutgefäße der Hirnhaut und dämpft an den Nerven, '
      + 'die sie versorgen, die Weiterleitung des Schmerzes. Deshalb bessert es auch die '
      + 'Übelkeit, die zum Anfall gehört. Auch Gefäße außerhalb des Kopfes können sich '
      + 'verengen, etwa die Herzkranzgefäße. Laut Fachinformation wird es nur angewendet, '
      + 'wenn eine Migräne eindeutig festgestellt ist; einzelne Formen sind auch für '
      + 'Cluster-Kopfschmerz zugelassen. Magen-Darm-Beschwerden wie Übelkeit, Bauchschmerzen '
      + 'oder Verdauungsstörungen sind je nach Wirkstoff als Nebenwirkung beschrieben.',
    einnahme: 'Früh im Anfall, sobald der Schmerz da ist; während einer Aura '
      + 'üblicherweise noch nicht. Wie oft an einem Tag und mit welchem Abstand, '
      + 'steht auf der Packung – es ist begrenzt. Im Anfall kann sich die Magenentleerung '
      + 'verzögern; bei manchen Triptanen wird der Wirkstoff aus einer Tablette dann '
      + 'langsamer aufgenommen, bei anderen beschreibt die Fachinformation keinen solchen '
      + 'Einfluss. Manche Triptane gibt es außer als Tablette auch als Schmelztablette, '
      + 'Nasenspray oder Spritze. Die Schmelztablette löst sich auf der Zunge und wird mit '
      + 'dem Speichel geschluckt, geht also ebenfalls über den Magen; das Nasenspray nennt '
      + 'die Fachinformation von AscoTop Nasal vor allem für Übelkeit und Erbrechen im '
      + 'Anfall. Wer im Anfall erbricht, hat damit eine Frage für die Sprechstunde.',
    hinweis: 'Triptane engen Gefäße auch außerhalb des Kopfes. Darum sind sie laut '
      + 'Fachinformation nicht vorgesehen bei Erkrankungen der Herzkranzgefäße, nach einem '
      + 'Herzinfarkt, bei Durchblutungsstörungen etwa der Beine, nach einem Schlaganfall '
      + 'oder einer vorübergehenden Durchblutungsstörung im Gehirn (TIA) und bei stärkerem '
      + 'oder nicht gut eingestelltem Bluthochdruck. Bei Risikofaktoren für eine '
      + 'Herzkrankheit sehen Fachinformation und Packungsbeilage vor der Verordnung eine '
      + 'Untersuchung von Herz und Gefäßen vor; ändert sich etwas an Herz, Gefäßen oder '
      + 'Blutdruck, ist das ein Thema für die Praxis. Ein Druck- oder Engegefühl in Brust '
      + 'oder Hals nach der Einnahme ist als Nebenwirkung beschrieben; laut Packungsbeilage '
      + 'kann es stark sein und geht meist schnell vorüber, bei sehr wenigen Menschen steckt '
      + 'aber ein Herzinfarkt dahinter. Darum vor der nächsten Einnahme in der Praxis '
      + 'ansprechen, nicht erst beim nächsten Termin. Hält es an, wird es schlimmer oder '
      + 'kommt es mit Luftnot oder kaltem Schweiß: nicht auf einen Termin warten – '
      + 'Notaufnahme oder 112. Übelkeit kann vom Anfall kommen und vom Mittel. Beschrieben '
      + 'ist außerdem, je nach Mittel selten, sehr selten oder ohne bekannte Häufigkeit, '
      + 'eine Durchblutungsstörung des Darms: Bauchschmerzen mit blutigem Durchfall nach '
      + 'der Einnahme. Dann ebenso nicht auf einen Termin warten – Notaufnahme oder 112. '
      + 'Und wird ein Triptan über mehr als drei Monate an zehn oder mehr Tagen im Monat '
      + 'genommen, kann es den Kopfschmerz selbst unterhalten – die Grenze liegt niedriger '
      + 'als bei einfachen Schmerzmitteln und gleichauf mit Kombinationsmitteln.',
  },
  /*
   * Nicht „magenschonend" – das wäre eine Empfehlung in einem Wort, und
   * welches Mittel bei Migräne passt, entscheidet sich nicht am Magen allein.
   * Beschrieben wird der Unterschied im Mechanismus, und was er kostet.
   */
  /*
   * Opioide und die neuen Anfallsmittel stehen hier, damit die Zählung sie
   * sieht – nicht als Magenwissen. Ein Codein-Kombinationsmittel zählt für
   * den Kopf wie ein Triptan ab zehn Tagen; die Gruppe steht deshalb VOR den
   * einfachen Schmerzmitteln, damit „Paracetamol Codein" hier landet.
   */
  /*
   * Quellen (Fassung 30), Fachinformationen von fachinfo.de/fi/pdf/<nr>:
   *   wirkung  GI Tramal Kapseln (patienteninfo-service.de, überarbeitet Oktober 2025),
   *            Abschnitt 1: Wirkung „an spezifischen Nervenzellen des Rückenmarks und des
   *            Gehirns“; FI Oxygesic akut 010492 (Februar 2025) 5.1: Rezeptoren „in
   *            Gehirn, Rückenmark und peripheren Organen“ – deshalb „vor allem“.
   *            Anwendungsgebiete 4.1: Tramal 012321 (Oktober 2025) „mäßig starken bis
   *            starken Schmerzen“, Oxygesic akut „mittelstarken bis starken“,
   *            Tilidin-ratiopharm plus 007761 „starker und sehr starker“; Migräne
   *            nennt keine. Abhängigkeit: Tramal 4.8 „auch in therapeutischer
   *            Dosierung“; GI Tramal Abschnitt 2 „von Person zu Person unterschiedlich“.
   *            Für „Leitlinien sehen es nicht vor“, „wirkt dort schlecht“ und „leicht
   *            abhängig“ fand sich kein Beleg; gestrichen, ebenso „greift den Magen
   *            nicht an“ (Tramal 4.8: „gastrointestinale Beschwerden (z. B. Magendruck,
   *            Völlegefühl)“; Übelkeit sehr häufig).
   *   hinweis  4.8: Tramal Übelkeit sehr häufig, Obstipation häufig, Benommenheit und
   *            Erschöpfung häufig; Oxygesic akut „am häufigsten … Übelkeit … und
   *            Obstipation“, Somnolenz sehr häufig; Tilidin-ratiopharm plus Übelkeit zu
   *            Behandlungsbeginn sehr häufig, Müdigkeit häufig, Verstopfung nicht
   *            aufgeführt. Übergebrauch: ICHD-3 8.2.4 „≥10 days/month for >3 months“,
   *            wie 8.2.2 bei Triptanen.
   */
  {
    id: 'opioid',
    gruppe: 'Opioide',
    beispiele: ['Tramadol', 'Tramal', 'Tilidin', 'Valoron', 'Codein', 'Oxycodon', 'Tapentadol'],
    kurz: 'Ein Opioid – für den Kopf gilt die niedrigere Grenze von zehn Tagen im Monat.',
    wirkung: 'Wirkt vor allem an bestimmten Nervenzellen in Rückenmark und Gehirn. Die '
      + 'Fachinformationen nennen als Anwendungsgebiet Schmerzen allgemein, je nach Wirkstoff '
      + 'mäßig starke bis sehr starke; Migräne steht dort nicht eigens. Bei wiederholter '
      + 'Einnahme kann es abhängig machen, auch in üblicher Dosierung; wie hoch dieses '
      + 'Risiko ist, ist laut Packungsbeilage von Person zu Person unterschiedlich. Body '
      + 'Check zählt die Tage, an denen es eingetragen ist, wie bei jedem Akutmittel mit.',
    einnahme: '–',
    hinweis: 'Übelkeit und Müdigkeit oder Benommenheit sind laut Fachinformationen häufig, '
      + 'Verstopfung bei vielen Opioiden auch. Wird ein Opioid über mehr als drei Monate an '
      + 'zehn oder mehr Tagen im Monat genommen, kann es den Kopfschmerz selbst unterhalten '
      + '– die Grenze liegt so niedrig wie bei Triptanen. Nicht eigenmächtig absetzen und '
      + 'nicht eigenmächtig steigern; beides gehört in ärztliche Hand.',
  },
  /*
   * Quellen (Fassung 30), alle im Volltext gelesen:
   *   wirkung   EMA-Produktinformation Vydura (Rimegepant),
   *             ema.europa.eu/de/documents/product-information/vydura-epar-product-information_de.pdf
   *             (abgerufen November 2026): 4.1 „Akuttherapie der Migräne“ und „präventiven
   *             Behandlung von episodischer Migräne“; 5.1 bindet an den CGRP-Rezeptor „und
   *             antagonisiert dessen Funktion“; 4.8 Übelkeit „Häufig“. EMA-Produktinformation
   *             Rayvow (Lasmiditan), ema.europa.eu/de/documents/product-information/rayvow-epar-product-information_de.pdf
   *             (abgerufen November 2026): 5.1 5-HT1F-Agonist, „Der exakte Wirkmechanismus ist
   *             nicht bekannt“, vermutet u. a. „eine Hemmung von Schmerzwegen“; „verengt ex vivo
   *             nicht die Koronararterien des Menschen“; 4.8 Übelkeit und Erbrechen häufig, „Die
   *             klinischen Daten zur Anwendung von Lasmiditan bei Patienten mit ischämischer
   *             Herzkrankheit sind begrenzt.“ EMA-Bewertungsbericht Vydura, EMA/CHMP/172260/2022
   *             (24.02.2022): Rimegepant „does not contract human coronary arteries“; Menschen mit
   *             instabiler oder frisch erkannter Herz-Kreislauf-Erkrankung waren aus den Studien
   *             ausgeschlossen, „It remains therefore unclear which patients with existing
   *             contraindications to triptans would actually be eligible“. Deshalb ist „kommen
   *             auch für Menschen infrage, die kein Triptan nehmen dürfen“ gestrichen, ebenso „ohne
   *             Angriff auf den Magen“ und „kein Reizstoff“ (Übelkeit ist bei beiden häufig).
   *             Ubrogepant und Zavegepant sind in der EU nicht zugelassen; die US-Labels (Ubrelvy
   *             Revised 3/2025, Zavzpret Revised 8/2025, 5.2/5.3) warnen nach Markteinführung vor
   *             Bluthochdruck und Raynaud-Phänomen unter CGRP-Antagonisten – „ohne
   *             Gefäßverengung“ gilt also nicht für die ganze Gruppe.
   *   einnahme  Anhang II B beider Produktinformationen: „Arzneimittel, das der
   *             Verschreibungspflicht unterliegt“. Rayvow 4.1 „Akutbehandlung der
   *             Kopfschmerzphase“; ein „früh im Anfall“ steht in keiner Quelle. Rayvow 4.4 und 4.7:
   *             „für mindestens 8 Stunden kein Fahrzeug zu führen“, „wie das Bedienen von
   *             Maschinen“, „selbst wenn sie sich dazu in der Lage fühlen“; 4.8: Benommenheit
   *             (19,9 %) sehr häufig, Schläfrigkeit, Erschöpfung und Schwindel häufig.
   *   hinweis   ICHD-3 8.2.8 (ichd-3.org): „Regular overuse, on ≥10 days/month for >3 months, of
   *             one or more medications other than those described above“; Gepante und Ditane
   *             nennt die Klassifikation nicht eigens. js/kopf.js zählt die Gruppe nur als
   *             Akuttag, ohne eigene Grenze (UEBERGEBRAUCH) – das sagt der Text jetzt als
   *             Aussage über Body Check.
   */
  {
    id: 'gepant',
    gruppe: 'Gepante und Ditane',
    // Mit Namen, nicht mit dem Teilwort „gepant": Atogepant (Aquipta) steht unter den
    // vorbeugenden Mitteln. Laut EMA-Produktinformation Aquipta (zuletzt aktualisiert
    // 25.08.2026), 4.1, ist es zur Akutbehandlung und zur Prophylaxe der Migräne
    // zugelassen; am Namen erkennt Body Check nicht, wofür es eingetragen ist. Die
    // Zuordnung bleibt, weil sie die Zählung steuert (tests/test-kopf.mjs); die Texte der
    // Gruppe prophylaxe sagen das dazu.
    beispiele: ['Rimegepant', 'Vydura', 'Ubrogepant', 'Zavegepant', 'Lasmiditan', 'Rayvow'],
    kurz: 'Neuere Mittel bei Migräne, die anders wirken als Triptane.',
    wirkung: 'Rimegepant, ein Gepant, blockiert laut Fachinformation die Andockstelle '
      + 'eines körpereigenen Botenstoffs (CGRP). Lasmiditan, ein Ditan, setzt an einer '
      + 'anderen Serotonin-Andockstelle an als die Triptane; wie es genau wirkt, ist laut '
      + 'Fachinformation nicht bekannt, vermutet wird unter anderem eine Dämpfung von '
      + 'Schmerzbahnen. Im Laborversuch verengten Rimegepant und Lasmiditan menschliche '
      + 'Herzkranzgefäße nicht. Menschen mit bestimmten Herz- und Gefäßerkrankungen waren '
      + 'aber aus den Studien zu Rimegepant ausgeschlossen, und für Lasmiditan sind die '
      + 'Daten bei Erkrankungen der Herzkranzgefäße laut Fachinformation begrenzt. Ob eines '
      + 'dieser Mittel infrage kommt, wenn ein Triptan nicht vorgesehen ist, klärt die '
      + 'Praxis. Übelkeit gehört bei beiden zu den häufigen Nebenwirkungen.',
    einnahme: 'Rimegepant und Lasmiditan gibt es nur auf Rezept. Zugelassen sind beide '
      + 'zur Behandlung des Migräneanfalls, Rimegepant (Vydura) auch zur Vorbeugung; wann '
      + 'und wie es genommen wird, steht in der Packungsbeilage und wird in der Praxis '
      + 'besprochen. Lasmiditan macht laut Fachinformation sehr häufig benommen; '
      + 'Schläfrigkeit, Erschöpfung und Schwindel sind häufig. Dort steht auch, dass nach '
      + 'jeder Einnahme mindestens acht Stunden lang kein Fahrzeug geführt und keine '
      + 'Maschine bedient werden soll, auch wenn man sich dazu in der Lage fühlt.',
    hinweis: 'Body Check zählt jeden Tag, an dem eines davon eingetragen ist, als Tag mit '
      + 'Akutmittel – auch Rimegepant, wenn es zur Vorbeugung genommen wird. Eine eigene '
      + 'Übergebrauchsgrenze prüft Body Check für diese Mittel nicht. Die internationale '
      + 'Kopfschmerzklassifikation nennt Gepante und Ditane nicht eigens; für Akutmittel, '
      + 'die dort nicht einzeln aufgeführt sind, nennt sie eine Grenze: über mehr als drei '
      + 'Monate an zehn oder mehr Tagen im Monat. Was es im Einzelnen tut und verträgt, '
      + 'steht in der Packungsbeilage; Fragen dazu beantworten Praxis oder Apotheke.',
  },
  /*
   * Quellen (Fassung 30), Fachinformationen von fachinfo.de/fi/pdf/<nr>, im Volltext
   * gelesen:
   *   gruppe    FI ben-u-ron 500 mg Tabletten 005407 (Januar 2025) 5.1: „ausgeprägte Hemmung
   *             der cerebralen Prostaglandinsynthese, während die periphere
   *             Prostaglandinsynthese nur schwach gehemmt wird“; FI vivimed mit Coffein 000807
   *             (01.2025) 5.1: „sehr schwache antiphlogistische Wirkung“; EMA/143912/2019
   *             (Metamizol): „weak anti-inflammatory effects“. „Ohne Entzündungshemmung“ war
   *             absolut; daher „kaum entzündungshemmend“. Gezählt wird an der Kennung
   *             nichtnsar; nur ein Eintrag, der wörtlich den alten Gruppennamen trägt, fände
   *             über den Namensvergleich in wissenZu() diese Gruppe nicht mehr.
   *   kurz,     FI Novalgin Filmtabletten 014708 (November 2024) 4.8 „Nicht bekannt: Es wurden
   *   wirkung   Fälle von gastrointestinalen Blutungen berichtet.“ (ebenso Novaminsulfon-
   *             ratiopharm 009618, November 2024); 5.1 „analgetische, antipyretische und
   *             spasmolytische Eigenschaften“. Ein Vergleich der Wirkstärke („wirkt stärker“)
   *             steht in keiner Quelle; gestrichen, ebenso „lässt die Schutzschicht in Ruhe“,
   *             „greift die Schleimschicht nicht an“ und „für den Magen gilt dasselbe“. Dass
   *             NSAR den Magenschutz über die Prostaglandine schwächen: gesund.bund.de/gastritis
   *             (13.11.2025). FI ben-u-ron 4.8 nennt keine Magen-Darm-Geschwüre oder -Blutungen.
   *   einnahme  FI ben-u-ron 11: „Apothekenpflichtig: 20 Tabletten Verschreibungspflichtig:
   *             50 Tabletten“; FI Novalgin 11: „Verschreibungspflichtig“. FI Doregrippin 005049
   *             (Dezember 2024) 4.1 (Paracetamol bei Erkältung), FI vivimed mit Coffein (gegen
   *             Kopfschmerzen); beide 4.4: andere Mittel dürfen kein Paracetamol enthalten. Eine
   *             Metamizol-Kombination gegen Erkältung oder Kopfschmerz gibt es laut EMA-Referral
   *             2024 (Annex I) in Deutschland und Österreich nicht; „Beide stecken …“ gestrichen.
   *   hinweis   FI ben-u-ron 5.2 „vorwiegend in der Leber … metabolisiert“; 4.2 niedrigere
   *             Höchstmenge ohne ärztliche Anweisung u. a. bei „Wasserentzug“, „Chronischer
   *             Unterernährung“, „Chronischem Alkoholismus“; GI ben-u-ron (Wiedergabe medikamio,
   *             überarbeitet Januar 2025) Abschnitt 2: Rücksprache vorher u. a. „bei einem Mangel
   *             von Flüssigkeit im Körper (Dehydratation) z.B. durch geringe Trinkmenge, Durchfall
   *             oder Erbrechen“, „bei chronischer Mangelernährung“, „chronisch alkoholkrank“; „darf
   *             nicht zusammen mit Alkohol eingenommen“ werden. FI Novalgin 4.4: „die seltenen,
   *             aber lebensbedrohlichen Risiken des Schocks und der Agranulozytose“, „kann auch
   *             auftreten, wenn Metamizol früher ohne Komplikationen angewendet wurde“,
   *             „jederzeit während der Behandlung und auch kurz nach deren Beendigung“; Zeichen
   *             „Fieber, Schüttelfrost, Halsschmerzen und schmerzhafte Schleimhautveränderungen“,
   *             „sofort einen Arzt aufzusuchen“, „sofort ein Blutbild“. EMA/470471/2024
   *             (05.09.2024): „the risk is still considered as rare“, „uncertainties regarding its
   *             exact incidence“; eine Neubewertung nach oben („nicht so selten wie lange
   *             angenommen“) steht dort nicht – gestrichen. Übergebrauch: ICHD-3 8.2.3 „15 or more
   *             days/month for more than 3 months“, „all non-opioid analgesics are regarded as a
   *             single class“; 8.2.2, 8.2.4, 8.2.5 je „≥10 days/month“.
   */
  {
    id: 'nichtnsar',
    gruppe: 'Schmerz- und Fiebermittel, kaum entzündungshemmend (keine NSAR)',
    beispiele: ['Paracetamol', 'ben-u-ron', 'Dafalgan', 'Mexalen', 'Metamizol', 'Novalgin', 'Novaminsulfon'],
    kurz: 'Gehören nicht zu den entzündungshemmenden Schmerzmitteln (NSAR) – haben aber '
      + 'eigene Risiken; bei Metamizol sind auch Magen-Darm-Blutungen beschrieben.',
    wirkung: 'Paracetamol wirkt gegen Schmerz und Fieber. Laut Fachinformation hemmt es '
      + 'bestimmte Botenstoffe (Prostaglandine) vor allem im Gehirn, im übrigen Körper nur '
      + 'schwach – über die Hemmung dieser Botenstoffe schwächen NSAR den Schutz der '
      + 'Magenschleimhaut. Magen-Darm-Geschwüre oder -Blutungen stehen in der '
      + 'Fachinformation von ben-u-ron nicht unter den Nebenwirkungen. Metamizol wirkt '
      + 'gegen Schmerz und Fieber und zusätzlich krampflösend; für Metamizol nennt die '
      + 'Fachinformation Magen-Darm-Blutungen als Nebenwirkung, Häufigkeit nicht bekannt. '
      + '„Harmlos“ heißt das alles nicht – beide haben eigene, teils schwere Risiken.',
    einnahme: 'Paracetamol gibt es in der Apotheke ohne Rezept – in Deutschland größere '
      + 'Packungen nur auf Rezept –, Metamizol nur auf Rezept. Paracetamol steckt auch in '
      + 'Kombinationsmitteln gegen Erkältung und Kopfschmerz – wer zweierlei nimmt, nimmt '
      + 'es leicht doppelt. Welche Wirkstoffe ein Mittel enthält, steht auf der Packung; '
      + 'die Apotheke kann das nachsehen.',
    hinweis: 'Paracetamol wird vor allem in der Leber abgebaut. Die Grenze pro Tag steht '
      + 'auf der Packung. Laut Packungsbeilage von ben-u-ron gehört die Einnahme vorher '
      + 'mit Ärztin, Arzt oder Apotheke besprochen, unter anderem bei Flüssigkeitsmangel – '
      + 'etwa durch Erbrechen, Durchfall oder wenig Trinken –, bei chronischer '
      + 'Mangelernährung und bei Alkoholkrankheit; für solche Fälle nennt die '
      + 'Fachinformation ohne ärztliche Anweisung eine niedrigere Tagesgrenze. Laut '
      + 'Packungsbeilage darf es nicht zusammen mit Alkohol eingenommen werden. Metamizol '
      + 'kann bestimmte weiße Blutkörperchen stark vermindern oder ganz fehlen lassen (Agranulozytose) – '
      + 'laut Fachinformation selten, aber lebensbedrohlich; wie häufig genau, ist laut '
      + 'EU-Arzneimittelbehörde nicht sicher bekannt. Das kann jederzeit während der '
      + 'Einnahme und kurz danach auftreten, auch wenn es früher gut vertragen wurde: '
      + 'Fieber, Schüttelfrost, Halsschmerzen oder schmerzhafte Stellen an den '
      + 'Schleimhäuten, besonders im Mund, sind laut Fachinformation ein Grund, sofort '
      + 'ärztliche Hilfe zu suchen; dann wird gleich ein Blutbild gemacht. Für den Kopf '
      + 'zählen beide als Akutmittel: Nach der Kopfschmerzklassifikation können einfache '
      + 'Schmerzmittel wie diese den Kopfschmerz selbst unterhalten, wenn sie über mehr als '
      + 'drei Monate an fünfzehn oder mehr Tagen im Monat genommen werden; mehrere einfache '
      + 'Schmerzmittel werden dabei zusammengezählt. Für Triptane, Opioide und '
      + 'Kombinationsmittel liegt die Grenze bei zehn Tagen. Welches Mittel bei Migräne das '
      + 'richtige ist, entscheidet sich nicht am Magen allein – das ist die Frage für die '
      + 'Neurologie.',
  },
  /*
   * Paracetamol mit Koffein – für den Kopf ein Kombinationsmittel, für den
   * Magen kein NSAR. Bis zur Fassung 27 stand „Paracetamol Koffein" unter
   * kombi und zählte damit für den Magen als ASS; „Paracetamol + Coffein"
   * dagegen als einfaches Schmerzmittel mit der Grenze von fünfzehn Tagen.
   * Beides war falsch. Erkannt wird die Gruppe nur über die Koffein-Regel in
   * wissenZu(); das Beispiel steht für die Übersicht da.
   *
   * Quellen (Fassung 30), im Volltext gelesen: ICHD-3 8.2.5 (wie bei kombi), Stand der
   * Seite 2018, Note 1: Koffein als wirkungsverstärkender Zusatz („acting as adjuvants“,
   * deutsche Fassung „adjuvanter Effekt“) macht ein Schmerzmittel zum Kombinationsmittel
   * – ein Hilfsstoff im Sinne der Fachinformation ist es nicht, dort steht es unter den
   * Wirkstoffen (FI vivimed mit Coffein, fachinfo.de/fi/pdf/000807, 01.2025, Abschnitt 2);
   * Kriterium B: an zehn oder mehr Tagen im Monat über mehr als drei Monate. Zum
   * Vergleich 8.2.3.1: Paracetamol allein „on ≥15 days/month for >3 months“.
   * Magen: FI vivimed mit Coffein 5.1 „sehr schwache antiphlogistische Wirkung“,
   * periphere Prostaglandinsynthese „nur schwach gehemmt“; 4.8 „Magenbeschwerden“,
   * Häufigkeit nicht bekannt. Dass es die Magenschleimhaut „nicht angreift“, sagt keine
   * Quelle; gestrichen.
   */
  {
    id: 'kombipara',
    gruppe: 'Kombinationsmittel mit Paracetamol und Koffein',
    beispiele: ['Paracetamol + Koffein'],
    kurz: 'Für den Kopf ein Kombinationsmittel mit niedrigerer Übergebrauchsgrenze; für den Magen kein NSAR.',
    wirkung: 'Paracetamol zusammen mit Koffein, das die Wirkung verstärken soll. Ohne ASS '
      + 'ist es kein NSAR: Paracetamol hemmt bestimmte Botenstoffe (Prostaglandine) laut '
      + 'Fachinformation außerhalb des Gehirns nur schwach. Als Nebenwirkung am Magen nennt '
      + 'die Fachinformation von vivimed mit Coffein Magenbeschwerden, Häufigkeit nicht '
      + 'bekannt. Für die Leber gilt, was für Paracetamol gilt.',
    einnahme: '–',
    hinweis: 'Nach der Kopfschmerzklassifikation zählt jedes Präparat, das ein '
      + 'Schmerzmittel und Koffein enthält, als Kombinationsmittel: Wird es über mehr als '
      + 'drei Monate an zehn oder mehr Tagen im Monat genommen, kann es den Kopfschmerz '
      + 'selbst unterhalten; bei Paracetamol allein nennt die Klassifikation dafür fünfzehn '
      + 'Tage. Die Grenze für Paracetamol pro Tag steht auf der Packung. Fragen dazu: '
      + 'Ärztin oder Apotheke.',
  },
  /*
   * Vorbeugende Mittel stehen hier, damit die App sie kennt und *nicht* als
   * Akutmittel zählt: Ein tägliches Metoprolol würde sonst die Übergebrauchs-
   * zählung sprengen. Manche davon sind zugleich Blutdruck- oder
   * Stimmungsmittel – was es bei wem ist, weiß die App nicht.
   *
   * Quellen (Fassung 30), im Volltext gelesen; Fachinformationen von
   * fachinfo.de/fi/pdf/<nr>, EMA-Produktinformationen von
   * ema.europa.eu/de/documents/product-information/<name>-epar-product-information_de.pdf
   * (abgerufen November 2026):
   *   gruppe    Zugelassen zur Migräneprophylaxe laut 4.1 u. a. Topamax 014374 (Dezember
   *             2023), Amitriptylin neuraxpharm 024337 (02/2026), Flunarizin acis 013557
   *             (April 2026), Aimovig, Emgality, Ajovy, Vyepti, Aquipta. Nicht zugelassen:
   *             Candesartan Mylan 023658 (Juni 2026) 4.1 nur Hypertonie und Herzinsuffizienz;
   *             EMA-Bewertungsbericht Aimovig, EMA/CHMP/413393/2018 (31.05.2018), 2.1.5:
   *             candesartan „not approved for this use in most European countries“. Ergenyl
   *             chrono 006301 (August 2026) 4.4: „Ergenyl darf nicht angewendet werden zur
   *             Migräneprophylaxe“. Die Beispiele bleiben (sie steuern, dass diese Mittel nicht
   *             als Akutmittel zählen); der Text sagt dazu, was zugelassen ist.
   *   Atogepant EMA-Produktinformation Aquipta (zuletzt aktualisiert 25.08.2026) 4.1:
   *             „Akutbehandlung von Migräne“ und „Prophylaxe von Migräne“. Deshalb stimmt „kein
   *             Akutmittel“ für Aquipta nicht mehr; die Texte nennen die Ausnahme, und
   *             „Body Check zählt …“ sagt, wie die App rechnet (js/kopf.js, AKUT_KLASSEN ohne
   *             prophylaxe).
   *   wirkung   Topamax 5.1: „Der genaue Mechanismus, durch den Topiramat seine
   *             antiepileptischen und Migräne prophylaktischen Eigenschaften ausübt, ist
   *             unbekannt.“ Flunarizin 5.1: „bislang nicht definitiv geklärt“. Eine allgemein
   *             gesenkte „Bereitschaft des Nervensystems“ steht in keiner Quelle; gestrichen.
   *             Antikörper 5.1: Erenumab bindet an den CGRP-Rezeptor, Galcanezumab,
   *             Fremanezumab und Eptinezumab an CGRP selbst; 4.2: Aimovig „alle 4 Wochen“,
   *             Emgality „einmal monatlich mittels subkutaner Injektion“, Ajovy „einmal
   *             monatlich“ oder „alle drei Monate“, Vyepti „alle 12 Wochen mittels intravenöser
   *             Infusion“.
   *   einnahme  Beurteilung des Nutzens, 4.2: Emgality „3 Monate nach Behandlungsbeginn“,
   *             Aimovig und Ajovy innerhalb von 3 Monaten, Vyepti „6 Monate“; Amitriptylin 4.2:
   *             „Die analgetische Wirkung setzt in der Regel nach 2–4 Wochen
   *             Behandlungsdauer ein.“ Dass „das Kopfschmerztagebuch dazugehört“, steht in
   *             keiner Fach- oder Gebrauchsinformation; jetzt als Aussage über Body Check.
   *   hinweis   GI Candesartan Mylan (patienteninfo-service.de, Juni 2026): „Beenden Sie die
   *             Einnahme … nicht eigenmächtig“, „kann Ihr Blutdruck erneut ansteigen“; GI
   *             Metoprolol 100 – 1 A Pharma (April 2022): „sollte nicht abrupt abgesetzt werden
   *             und darf nur auf ärztliche Anweisung erfolgen“; GI Dociton 40 mg (Januar 2023):
   *             „darf nicht abrupt abgesetzt werden“, „nicht eigenmächtig“. Verhütung: EMA,
   *             Valproat-Referral (CMDh 21.03.2018, EU-Beschluss 31.05.2018): „pregnancy
   *             prevention programme“; EMA, Topiramat-Referral, Annex V: CMDh Oktober 2023,
   *             Umsetzung bis 08.12.2023; Topamax 4.3/4.4 (Dezember 2023):
   *             „Schwangerschaftsverhütungsprogramm“, auch für Mädchen. „Seit 2024“ war falsch.
   */
  {
    id: 'prophylaxe',
    gruppe: 'Vorbeugende Migränemittel',
    beispiele: ['Metoprolol', 'Propranolol', 'Amitriptylin', 'Topiramat', 'Valproat',
      'Flunarizin', 'Candesartan', 'Erenumab', 'Aimovig', 'Galcanezumab', 'Emgality',
      'Fremanezumab', 'Ajovy', 'Eptinezumab', 'Atogepant', 'Aquipta'],
    kurz: 'Zur Vorbeugung regelmäßig angewendet, damit Migräneanfälle seltener kommen; '
      + 'Atogepant (Aquipta) ist zusätzlich für den Anfall selbst zugelassen.',
    wirkung: 'Wie diese Mittel Migräneanfällen vorbeugen, ist laut Fachinformation bei '
      + 'mehreren nicht genau bekannt, etwa bei Topiramat und Flunarizin. Die meisten wirken '
      + 'nicht gegen den Anfall, der gerade da ist, sondern sollen über Wochen bis Monate die '
      + 'Zahl der Migränetage senken; Atogepant (Aquipta) ist laut Fachinformation '
      + 'zusätzlich zur Behandlung eines Anfalls zugelassen. Einige davon sind zugleich '
      + 'Mittel gegen hohen Blutdruck, Epilepsie oder Depression. Nicht jedes ist auch zur '
      + 'Migränevorbeugung zugelassen: Die Fachinformation von Candesartan nennt als '
      + 'Anwendungsgebiet nur Bluthochdruck und Herzschwäche, und die Fachinformation von '
      + 'Valproat (Ergenyl chrono) schließt die Migränevorbeugung ausdrücklich aus. Wofür ein Mittel bei dir '
      + 'verordnet ist, weiß die Praxis. Die Antikörper richten sich gezielt gegen den '
      + 'Botenstoff CGRP oder seine Andockstelle; sie werden je nach Mittel alle vier '
      + 'Wochen, einmal im Monat oder alle drei Monate unter die Haut gespritzt, '
      + 'Eptinezumab alle zwölf Wochen als Infusion in die Vene.',
    einnahme: 'Zur Vorbeugung nach einem festen Plan, den die Praxis festlegt – je nach '
      + 'Mittel täglich oder in größeren Abständen. Ob es wirkt, wird laut Fachinformation '
      + 'erst nach einiger Zeit beurteilt: Bei Amitriptylin setzt die schmerzlindernde '
      + 'Wirkung in der Regel nach zwei bis vier Wochen ein, bei den Antikörpern wird der '
      + 'Nutzen nach etwa drei Monaten beurteilt, bei Eptinezumab nach sechs. Was für das eigene '
      + 'Mittel gilt, steht in der Packungsbeilage. Body Check hält fest, wie sich die Zahl '
      + 'der Kopfschmerztage in dieser Zeit verändert.',
    hinweis: 'Body Check zählt diese Mittel nicht als Akutmittel – auch Atogepant nicht, '
      + 'wenn es gegen einen Anfall genommen wird; am Namen ist nicht zu erkennen, wofür es '
      + 'eingetragen ist. Nicht ohne Rücksprache mit Ärztin oder Arzt absetzen oder ändern – '
      + 'so steht es in den Packungsbeilagen vieler dieser Mittel; Fragen beantwortet auch '
      + 'die Apotheke. Bei den Betablockern Metoprolol und Propranolol warnen die '
      + 'Packungsbeilagen ausdrücklich vor plötzlichem Absetzen. Was es im Einzelnen tut '
      + 'und welche Nebenwirkungen es hat, ist bei jedem anders – das steht in der '
      + 'Packungsbeilage und gehört ins Gespräch, nicht hierher. Eine Ausnahme ist '
      + 'allgemein: Für Topiramat und Valproat gelten laut Fachinformation besondere Regeln '
      + 'für Mädchen und Frauen, die schwanger werden könnten – ein Programm zur Verhütung '
      + 'einer Schwangerschaft mit Aufklärung über die Risiken, bei Valproat seit 2018, bei '
      + 'Topiramat seit Ende 2023. Fragen dazu beantworten Ärztin, Arzt oder Apotheke.',
  },
];

/*
 * Die Mittel bei ADHS – zuerst zum Erkennen.
 *
 * Die Namen stehen hier, weil die Zählung sie braucht: Ein Tag, an dem nur
 * „Medikinet" steht, sagt über Bauch und Kopf so wenig wie ein Glas Wasser
 * (siehe eintragZaehlt in js/wasser.js). Ohne die Namen wäre er ein
 * notierter Tag und ohne Beschwerde ein beschwerdefreier – und das Mittel,
 * das man jeden Morgen nimmt, machte aus jeder Lücke im Tagebuch einen guten
 * Tag.
 *
 * Die Reihenfolge ist Absicht: „Lisdexamfetamin" enthält „dexamfetamin".
 * Stünde Dexamfetamin vorn, wäre Lisdexamfetamin Dexamfetamin – ein anderer
 * Wirkstoff mit anderer Einnahme. Erkannt wird über ADHS_MITTEL unten (siehe
 * wissenZu); dort stehen die Gruppen in derselben Reihenfolge, und
 * tests/test-adhs-wissen.mjs prüft das. Die Schreibweise mit „ph" ist im
 * Deutschen ebenso verbreitet und steht deshalb dabei – ohne sie wäre ein Tag
 * nur mit „Lisdexamphetamin" wieder ein notierter.
 *
 * Bupropion steht dabei, damit es erkannt wird – gezählt wird es wie bisher,
 * wie jedes andere Mittel: Es gehört nicht zu ADHS_GRUPPEN, und ein Tag, an
 * dem es steht, bleibt ein notierter Tag. Zugelassen ist es laut Fach- und
 * Gebrauchsinformation für depressive Episoden (FI Elontril,
 * fachinfo.de/fi/pdf/010164, März 2026, 4.1) und zur Raucherentwöhnung (GI
 * Zyban, Wiedergabe medikamio, Abschnitt 1), nicht für ADHS. Warum es
 * eingetragen ist, kann die App nicht wissen.
 */
export const ADHS_NAMEN = [
  { id: 'mph', beispiele: ['Methylphenidat', 'Ritalin', 'Medikinet', 'Concerta', 'Kinecteen', 'Equasym', 'MPH'] },
  { id: 'lisdex', beispiele: ['Lisdexamfetamin', 'Elvanse', 'Lisdexamphetamin'] },
  { id: 'dex', beispiele: ['Dexamfetamin', 'Attentin', 'Dexamphetamin'] },
  { id: 'atomox', beispiele: ['Atomoxetin', 'Strattera'] },
  { id: 'guanf', beispiele: ['Guanfacin', 'Intuniv'] },
  { id: 'bupro', beispiele: ['Bupropion', 'Elontril', 'Zyban'] },
];

/** Die Gruppen, die als ADHS-Mittel zählen – ohne Bupropion (siehe oben). */
export const ADHS_GRUPPEN = ['mph', 'lisdex', 'dex', 'atomox', 'guanf'];

/** Die Stimulanzien darunter. */
export const STIMULANZIEN = ['mph', 'lisdex', 'dex'];

const namenVon = (id) => ADHS_NAMEN.find((x) => x.id === id).beispiele;

/*
 * Was dazu in den Fach- und Gebrauchsinformationen steht.
 *
 * Strenger als oben, weil diese Mittel nicht für den Magen verordnet werden
 * und jemand, der hier liest, sie womöglich jeden Tag nimmt:
 *
 *   * Jeder Satz mit „laut Fachinformation", „laut Packungsbeilage" oder
 *     „laut EMA" ist an einer amtlichen oder Hersteller-Quelle geprüft. Die
 *     Quelle steht über jedem Eintrag. Was sich nicht belegen ließ, steht
 *     nicht da – auch nicht vorsichtiger formuliert.
 *   * Gilt ein Satz nur für ein Präparat, nennt er das Präparat. „Laut
 *     Fachinformation von Medikinet adult sehr häufig: …" ist eine Auskunft;
 *     „bei Methylphenidat sehr häufig" wäre etwa für Equasym Retard falsch:
 *     Dort stehen Appetitverlust, Übelkeit und Mundtrockenheit als „häufig“
 *     (FI fachinfo.de/fi/pdf/012100, Juni 2026, 4.8). Die Ritalin-
 *     Fachinformationen (002958, 010445, 015153, je September 2025, 4.8) führen
 *     dieselben sechs als „sehr häufig“ wie Medikinet adult.
 *   * Keine Dosis, keine Empfehlung, kein Rat zum Absetzen. Jeder Hinweis
 *     endet bei Ärztin oder Apotheke.
 *
 * Die Quellen stehen als Adresse ohne „https://" da: In js/ darf keine
 * vollständige Adresse stehen, auch nicht in einem Kommentar (siehe
 * tools/pruefung/keine-leitung.py) – so bleibt die eine Tür nach draußen
 * die einzige, die eine Suche findet.
 *
 * `nebenwirkung` ist neu und freiwillig: Die Karte zeigt es als „Was in der
 * Fachinformation steht." Wo sich keine Häufigkeit belegen ließ, fehlt es.
 */
export const ADHS_MITTEL = [
  /*
   * Quellen (Stand, soweit genannt):
   *   Medikinet Tabletten FI, fachinfo.de/pdf/002039 (06/2023), 4.2 – Schlaf
   *   Medikinet adult FI, fachinfo.de/fi/pdf/013066 (09/2025), 4.8 – sehr häufig; 4.5 –
   *     „Alkohol kann die ZNS-Nebenwirkungen von psychoaktiven Arzneimitteln
   *     einschließlich Methylphenidat verstärken“ (Fassung 30: „kann“, nicht „verstärkt“;
   *     die frühere Quelle, eine MIMS-Wiedergabe, war nicht erreichbar)
   *   Ritalin LA FI, fachinfo.de/fi/pdf/010445/ritalin-la (09/2025), 4.2/4.8 – häufig, Essen
   *   EMA CMDh, PSUSA 00002024 (2019), www.ema.europa.eu/documents/psusa/methylphenidate-cmdh-scientific-conclusions-grounds-variation-amendments-product-information/00002024/201910_hu.pdf – Bruxismus häufig
   *   kurz, wirkung (Fassung 30): Medikinet retard FI, fachinfo.de/fi/pdf/009621 (12/2025),
   *     4.5 – mit H2-Blockern, PPI oder Antazida „zu einer rascheren Freisetzung der
   *     gesamten Wirkstoffmenge“; 5.2 – ohne Nahrung „Risiko einer sofortigen Freisetzung“;
   *     Medikinet adult 4.2 – nüchtern „wesentlich schneller … resorbiert“. Für Ritalin LA,
   *     Equasym Retard, Concerta und die Tabletten steht nichts dergleichen – deshalb nennt
   *     der Satz die Präparate. 4.4 aller Methylphenidat-FI: Die Darreichungsform wird „je
   *     nach gewünschter Wirkungsdauer“ gewählt; Ritalin 10 mg FI 002958 5.2: Wirkdauer
   *     „1 bis 4 Stunden“; Concerta FI (02/2026) 5.1: bis 12 Stunden; Essen verschiebt den
   *     höchsten Spiegel bei Equasym Retard FI 012100 5.2 um „annähernd eine Stunde“, bei
   *     Medikinet retard 5.2 um „annähernd 1,5 Stunden“. Ein „vor allem“ steht nirgends.
   *   US-Label Ritalin LA (Wiedergabe www.rxlist.com/ritalin-la-drug.htm) – Alkohol im Laborversuch
   *   GI Ritalin (BASG), medikamente.basg.gv.at/documents/1-22028__DOTC_GEBR_INFO.pdf,
   *     Gelbe Liste www.gelbe-liste.de/wirkstoffe/Methylphenidat_1306 – MAO-Hemmer, Blutdrucksenker
   *   GI Methylphenidat AL, beipackzettel.apocdn.net/medien/39fb9f1aac92a8eb24dff85248f0317104b4c45223aaea5cb26e4555f8d7d7e0.pdf
   *     – Serotoninsyndrom
   *   GI Ritalin, www.patienteninfo-service.de/gi/19260/pdf – Lactose, Abschnitt 6
   */
  {
    id: 'mph',
    gruppe: 'Methylphenidat',
    kuerzel: 'MPH',
    beispiele: namenVon('mph'),
    kurz: 'Stimulans bei ADHS. Bei manchen Kapseln (Medikinet retard, Medikinet adult) kann '
      + 'der Wirkstoff laut Fachinformation nüchtern oder zusammen mit Säureblockern schneller '
      + 'frei werden – mehr unter „Je nach Form“.',
    wirkung: 'Wie schnell es ins Blut geht und wie lange es wirkt, ist laut '
      + 'Fachinformationen je nach Form verschieden: sofort freisetzend oder retardiert, und '
      + 'retardiert auf verschiedene Weise. Bei manchen Formen verschiebt auch Essen den '
      + 'Verlauf. Darum fragt Body Check nach der Form.',
    einnahme: 'Je nach Form verschieden – siehe „Je nach Form“. Spät am Tag genommen kann '
      + 'es laut Fachinformation den Schlaf stören.',
    nebenwirkung: 'Laut Fachinformation von Medikinet adult sehr häufig: weniger Appetit, '
      + 'Schlaflosigkeit, Nervosität, Kopfschmerzen, Übelkeit und Mundtrockenheit. Laut '
      + 'Fachinformation von Ritalin LA häufig: Bauchschmerzen, Durchfall, '
      + 'Magenbeschwerden, Erbrechen und Verdauungsbeschwerden. Seit einer Bewertung der '
      + 'EU-Arzneimittelbehörden steht auch Zähneknirschen als häufig in den '
      + 'Fachinformationen von Methylphenidat. Laut Fachinformation von Ritalin LA kann '
      + 'Essen zur selben Zeit helfen, Bauchschmerzen, Übelkeit oder Erbrechen zu verhindern.',
    hinweis: 'Alkohol kann laut Fachinformation Nebenwirkungen auf das Nervensystem verstärken. '
      + 'Laut US-Fachinformation von Ritalin LA setzte sehr hochprozentiger Alkohol im '
      + 'Laborversuch fast den ganzen Wirkstoff schon in der ersten Stunde frei. Zusammen '
      + 'mit MAO-Hemmern droht eine Blutdruckkrise; mit Mitteln, die auf Serotonin '
      + 'wirken, ist ein Serotoninsyndrom beschrieben – ob eines deiner Mittel dazugehört, '
      + 'weiß die Apotheke. Blutdrucksenker können schwächer wirken. Welche Hilfsstoffe '
      + 'drin sind (etwa Lactose oder Zucker), steht in Abschnitt 2 und 6 der '
      + 'Packungsbeilage. Nicht eigenmächtig ändern oder absetzen – Fragen dazu '
      + 'beantworten Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   Elvanse FI, fachinfo.de/pdf/020737, 4.2 – mit oder ohne Essen, Nachmittag
   *   UK-SmPC (Wiedergabe findmeds.uk), 5.2 – Essen verschiebt Tmax um etwa eine Stunde
   *   G-BA-Dossier des Herstellers, Modul 2 (2019) – Umwandlung in den Erythrozyten
   *   UK-Packungsbeilage Elvanse Adult, www.medicines.org.uk/emc/files/pil.15433.pdf – häufigste Nebenwirkungen
   *   US-FI Vyvanse, www.accessdata.fda.gov/drugsatfda_docs/label/2025/021977s054%2C208510s011lbl.pdf
   *     – Urin-pH (Ascorbinsäure, Natriumhydrogencarbonat), Triptane, MAO-Hemmer
   *   MAO-Hemmer (Fassung 30): Elvanse FI, fachinfo.de/pdf/020737 (Oktober 2026), 4.3 –
   *     „Gleichzeitige Anwendung von Monoaminoxidasehemmern (MAO-Hemmern) oder Anwendung
   *     innerhalb von 14 Tagen nach Behandlung mit MAO-Hemmern (da es zu einer hypertensiven
   *     Krise kommen kann …)“; das bloße „nicht zusammen“ ließ die 14 Tage weg.
   */
  {
    id: 'lisdex',
    gruppe: 'Lisdexamfetamin',
    beispiele: namenVon('lisdex'),
    kurz: 'Stimulans bei ADHS, wird erst im Körper zum Wirkstoff.',
    wirkung: 'Eine Vorstufe, die erst im Blut zu Dexamfetamin umgewandelt wird.',
    einnahme: 'Laut Fachinformation mit oder ohne Essen; Essen verschiebt den höchsten '
      + 'Spiegel um etwa eine Stunde nach hinten. Am Nachmittag genommen kann es laut '
      + 'Fachinformation den Schlaf stören.',
    nebenwirkung: 'Laut Packungsbeilage von Elvanse Adult sind bei Erwachsenen die '
      + 'häufigsten Nebenwirkungen weniger Appetit, Schlaflosigkeit, Mundtrockenheit und '
      + 'Kopfschmerzen.',
    hinweis: 'Mittel, die den Urin saurer machen, etwa Vitamin C (Ascorbinsäure), senken '
      + 'laut US-Fachinformation den Spiegel; basische Mittel wie Natron erhöhen ihn. '
      + 'Dieselbe Fachinformation nennt Triptane unter den Mitteln, mit denen ein '
      + 'Serotoninsyndrom möglich ist. Laut Fachinformation darf es nicht zusammen mit '
      + 'MAO-Hemmern angewendet werden, auch nicht innerhalb von vierzehn Tagen nach einer '
      + 'Behandlung damit, weil es sonst zu einer gefährlichen Blutdruckkrise kommen kann. '
      + 'Nicht eigenmächtig ändern oder absetzen – Fragen dazu: Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   Attentin 5 mg FI, www.fachinfo.de/fi/pdf/013378/attentin-5-mg-tablette (08/2022),
   *     4.2 – Nahrungseinfluss nicht untersucht, gleich zu den Mahlzeiten; 4.3 – MAO-Hemmer
   *     („nicht-selektiven, irreversiblen“, auch „innerhalb von mindestens 14 Tagen nach
   *     Absetzen“, „Risiko einer hypertensiven Krise“; Fassung 30 wie bei Lisdexamfetamin
   *     ergänzt); 5.2 – rasch resorbiert
   *   Attentin 10/20 mg FI, www.fachinfo.de/fi/pdf/020945 (08/2024), 4.5 – Natriumhydrogencarbonat
   *   GI Attentin – Fruchtsäfte
   * Kein `nebenwirkung`: Häufigkeiten ließen sich nicht belegen.
   */
  {
    id: 'dex',
    gruppe: 'Dexamfetamin',
    beispiele: namenVon('dex'),
    kurz: 'Stimulans bei ADHS.',
    wirkung: 'Wird laut Fachinformation schnell aus Magen und Darm aufgenommen.',
    einnahme: 'Wie Essen die Aufnahme beeinflusst, ist laut Fachinformation nicht '
      + 'untersucht; dort steht deshalb, es immer auf dieselbe Weise zu den Mahlzeiten zu '
      + 'nehmen, vorzugsweise zu oder direkt nach dem Essen.',
    hinweis: 'Laut Packungsbeilage können Fruchtsäfte die Wirkung abschwächen; laut '
      + 'Fachinformation erhöht Basisches wie Natron (Natriumhydrogencarbonat) die '
      + 'Aufnahme. Laut Fachinformation darf es nicht zusammen mit bestimmten MAO-Hemmern '
      + 'genommen werden, auch nicht innerhalb von mindestens vierzehn Tagen danach, weil '
      + 'sonst eine Blutdruckkrise droht. Nicht eigenmächtig ändern oder absetzen – Fragen '
      + 'dazu: Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   US-Label Strattera (Wiedergabe medlibrary.org) – mit oder ohne Essen; Fluoxetin,
   *     Paroxetin, Chinidin erhöhen die Exposition deutlich
   *   SAHPRA-PI Strattera (2018), www.sahpra.org.za/wp-content/uploads/2020/02/Strattera_PI_Eli-Lilly_MCC-format-20-March-2018.pdf
   *     – CYP2D6, langsame Metabolisierer (in Fassung 30 nicht erreichbar)
   *   DE-Packungsbeilagen Atomoxetin – „Selten: Leberschädigungen"
   *   Leberzeichen (Fassung 30, im Volltext gelesen): GI Strattera (BASG, überarbeitet
   *     November 2024), Abschnitt 4: „Selten … Leberschädigungen“; „Sie müssen die
   *     Behandlung mit Strattera abbrechen und unverzüglich Ihren Arzt benachrichtigen, wenn
   *     bei Ihnen Folgendes auftritt: – dunkler Urin – gelbliche Haut oder gelbliche Augen –
   *     Bauchschmerzen, die bei Druck unterhalb des rechten Rippenbogens stärker werden“.
   *     Die Fachinformation (Atomoxetin-ratiopharm, fachinfo.de/fi/pdf/022556, September
   *     2024, 4.4) nennt nur Gelbsucht und Laborwerte, die US-Fachinformation Strattera
   *     (Revised 6/2026, 5.2 und 17) die Zeichen mit „immediately“ – deshalb jetzt „laut
   *     Packungsbeilage“. Der allgemeine Satz „Nicht eigenmächtig …“ steht vor den
   *     Leberzeichen, damit er der Packungsbeilage für diesen Fall nicht widerspricht.
   * Kein `nebenwirkung`: Häufigkeiten ließen sich nicht belegen.
   */
  {
    id: 'atomox',
    gruppe: 'Atomoxetin',
    beispiele: namenVon('atomox'),
    kurz: 'ADHS-Mittel, kein Stimulans.',
    wirkung: 'Kein Stimulans. Abgebaut wird es über ein Leberenzym (CYP2D6), das bei '
      + 'manchen Menschen deutlich langsamer arbeitet.',
    einnahme: 'Laut US-Fachinformation mit oder ohne Essen. Wie die Einnahme über den Tag '
      + 'verteilt wird, legt die Ärztin fest.',
    hinweis: 'Einige Mittel gegen Depression – etwa Fluoxetin oder Paroxetin – erhöhen laut '
      + 'Fachinformation den Spiegel deutlich. Nicht eigenmächtig ändern oder absetzen – '
      + 'Fragen dazu: Ärztin oder Apotheke. Selten sind laut Packungsbeilage Leberschäden '
      + 'beschrieben. Als Zeichen nennt sie dunklen Urin, gelbliche Haut oder Augen und '
      + 'Bauchschmerzen, die bei Druck unter dem rechten Rippenbogen stärker werden; dann '
      + 'soll laut Packungsbeilage unverzüglich die Ärztin oder der Arzt benachrichtigt '
      + 'werden, und dort steht auch, was dann für die Einnahme gilt.',
  },
  /*
   * Quellen:
   *   EMA, EPAR-Zusammenfassung Intuniv, www.ema.europa.eu/de/documents/overview/intuniv-epar-summary-public_de.pdf
   *     und www.ema.europa.eu/sv/medicines/human/EPAR/intuniv – Häufigkeiten, 6 bis 17 Jahre
   *   Intuniv FI, www.fachinfo.de/fi/pdf/020868 – Zielgruppe
   *   US-Label Intuniv, www.accessdata.fda.gov/drugsatfda_docs/label/2009/022037lbl.pdf
   *     – fettreiche Mahlzeit, CYP3A4
   *   AkdÄ Drug Safety Mail 2021-61, www.akdae.de/arzneimittelsicherheit/drug-safety-mail/newsdetail/drug-safety-mail-2021-61
   *     – abruptes Absetzen, laut FI ausschleichen (in Fassung 30 nicht erreichbar)
   *   Fassung 30, im Volltext gelesen: Intuniv FI, fachinfo.de/fi/pdf/020868 (September
   *     2026), 4.1 – „bei Kindern und Jugendlichen im Alter von 6‑17 Jahren, für die eine
   *     Behandlung mit Stimulanzien nicht in Frage kommt oder unverträglich ist oder sich
   *     als unwirksam erwiesen hat“; 5.1 „Guanfacin ist kein Stimulans.“; 4.2 „nicht ohne
   *     Rücksprache mit dem behandelnden Arzt absetzen“; 4.4 „Nach dem Absetzen von
   *     Guanfacin kann es zu einem Anstieg des Blutdrucks und der Pulsfrequenz kommen“, nach
   *     abruptem Absetzen „in sehr seltenen Fällen eine hypertensive Enzephalopathie“ – ein
   *     „starker“ Anstieg steht dort nicht. EMA-Produktinformation Intuniv,
   *     ema.europa.eu/de/documents/product-information/intuniv-epar-product-information_de.pdf
   *     (abgerufen November 2026), Packungsbeilage Abschnitt 4: unter den schwerwiegenden
   *     Nebenwirkungen „Schwindel (Hypotonie)“, „Schwächeanfall oder Bewusstseinsverlust
   *     (Kreislaufkollaps)“, „hoher Blutdruck bei abruptem Absetzen … mögliche Symptome sind
   *     Kopfschmerz, Verwirrtheit, Nervosität, Erregung und Zittern“; „Wenn Sie eine dieser
   *     Nebenwirkungen feststellen, wenden Sie sich sofort an Ihren Arzt.“
   */
  {
    id: 'guanf',
    gruppe: 'Guanfacin',
    beispiele: namenVon('guanf'),
    kurz: 'ADHS-Mittel, kein Stimulans. Laut Fachinformation in der EU zugelassen für Kinder '
      + 'und Jugendliche von 6 bis 17 Jahren, wenn Stimulanzien nicht infrage kommen, nicht '
      + 'vertragen werden oder sich als unwirksam erwiesen haben.',
    wirkung: 'Kein Stimulans; es kann Puls und Blutdruck senken, und viele werden davon schläfrig.',
    einnahme: 'Laut US-Produktinformation nicht zu einer fettreichen Mahlzeit – das erhöht '
      + 'den Spiegel.',
    nebenwirkung: 'Laut EMA bei fast jeder zweiten Person Schläfrigkeit, bei mehr als einer '
      + 'von vier Kopfschmerzen, bei etwa einer von fünf Müdigkeit und bei etwa einer von '
      + 'zehn Oberbauchschmerzen. Niedriger Blutdruck betrifft etwa eine von dreißig '
      + 'Personen, ein langsamer Puls etwa eine von sechzig, Ohnmacht weniger als eine von '
      + 'hundert.',
    hinweis: 'Nach dem Absetzen können laut Fachinformation Blutdruck und Puls ansteigen; '
      + 'nach plötzlichem Absetzen ist laut Packungsbeilage sehr selten ein hoher Blutdruck '
      + 'als schwerwiegende Nebenwirkung beschrieben, etwa mit Kopfschmerz, Verwirrtheit oder '
      + 'Zittern. Absetzen oder ändern nur nach Rücksprache mit der Ärztin. Mittel, die das '
      + 'Leberenzym CYP3A4 hemmen oder anregen, verändern den Spiegel. Schwindel, einen '
      + 'Schwächeanfall oder Bewusstseinsverlust führt die Packungsbeilage unter den '
      + 'schwerwiegenden Nebenwirkungen; dann soll man sich laut Packungsbeilage sofort an '
      + 'die Ärztin oder den Arzt wenden. Fragen dazu: Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   Elontril FI, www.fachinfo.de/fi/pdf/010164/elontril-150-mg-300-mg-tabletten (03/2026)
   *     – Anwendungsgebiet Depression; Krampfanfälle
   *   GI Zyban, medikamio.com/de-de/medikamente/zyban-150-mg-retardtabletten/pil – Raucherentwöhnung
   *   FI Bupropion-neuraxpharm (12/2025) – Gegenanzeige: abrupter Alkoholentzug
   *   EMA CMDh, PSUSA 00001997 (2020), Metamizol: senkt Plasmaspiegel u. a. von Bupropion
   * Kein `nebenwirkung`: nicht belegt.
   */
  {
    id: 'bupro',
    gruppe: 'Bupropion',
    beispiele: namenVon('bupro'),
    kurz: 'Mittel gegen Depression und zur Rauchentwöhnung; für ADHS nicht zugelassen.',
    wirkung: 'In Deutschland für Depression (Elontril) und zur Rauchentwöhnung (Zyban) '
      + 'zugelassen; für ADHS ist es nicht zugelassen.',
    einnahme: '–',
    hinweis: 'Laut Fachinformation besteht ein Risiko für Krampfanfälle; ein plötzlicher '
      + 'Alkoholentzug steht dort unter den Gegenanzeigen. Metamizol (Novalgin, '
      + 'Novaminsulfon) kann laut seiner Fachinformation den Bupropion-Spiegel senken. '
      + 'Nicht eigenmächtig ändern oder absetzen – Fragen dazu: Ärztin oder Apotheke.',
  },
];

/*
 * Was sonst noch im Schrank steht und erkannt werden muss, damit es nicht
 * falsch zählt.
 *
 * Koffein als Tablette ist kein Schmerzmittel und kein NSAR: Die Fachinformation
 * von Coffeinum N 0,2 g (fachinfo.de/fi/pdf/022844, Dezember 2025) nennt als
 * Anwendungsgebiet (4.1) „Zur kurzfristigen Beseitigung von
 * Ermüdungserscheinungen“ und ordnet Coffein den Psychostimulanzien zu (5.1,
 * Xanthin-Derivate). Bis zur Fassung 27 stand „Koffein" als Beispiel bei kombi
 * und zählte damit als Kombinationsmittel aus ASS oder Ibuprofen und Koffein: für
 * den Magen als NSAR, für den Kopf mit der Grenze der Kombinationsmittel (zehn
 * oder mehr Tage im Monat über mehr als drei Monate, ICHD-3 8.2.5). Beides trifft
 * auf eine reine Koffeintablette nicht zu, denn ein Kombinationsmittel verbindet
 * nach ICHD-3 8.2.5, Note 1, Wirkstoffe aus zwei oder mehr Klassen. Wird ein
 * anderes Mittel gegen Kopfschmerz genommen, nennt ICHD-3 8.2.8 („other
 * medication“) dieselbe Grenze von zehn Tagen; Body Check zählt eine
 * Koffeintablette trotzdem nicht als Akutmittel, denn zugelassen ist sie gegen
 * Müdigkeit, nicht gegen Kopfschmerz.
 *
 * Quelle zum Hinweis: ICHD-3 8.3.1 Caffeine-withdrawal headache,
 * ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-3-headache-attributed-to-substance-withdrawal/8-3-1-caffeine-withdrawal-headache
 * (Beginn innerhalb von 24 Stunden nach dem letzten Koffein, wenn zuvor mehr als
 * zwei Wochen lang mehr als 200 mg Koffein am Tag aufgenommen wurden und das
 * unterbrochen oder verzögert wurde; klingt ohne weiteres Koffein innerhalb von
 * sieben Tagen ab). Der sichtbare Text nennt keine Menge, sagt aber „größere
 * Mengen“: Ohne diese Einschränkung galt er für jede regelmäßige Tasse.
 */
export const SONSTIGE_MITTEL = [
  {
    id: 'koffeinmittel',
    gruppe: 'Koffein als Tablette',
    beispiele: ['Koffein', 'Coffein'],
    kurz: 'Kein Schmerzmittel und für den Magen kein NSAR.',
    wirkung: 'Ein anregender Stoff, derselbe wie im Kaffee.',
    einnahme: '–',
    hinweis: 'Wer über mehr als zwei Wochen regelmäßig größere Mengen Koffein aufnimmt und '
      + 'dann aussetzt, kann davon Kopfschmerz bekommen; die Kopfschmerzklassifikation '
      + 'beschreibt ihn mit Beginn innerhalb eines Tages nach dem letzten Koffein. Fragen '
      + 'dazu: Apotheke.',
  },
];

/*
 * Die Reihenfolge entscheidet, wenn ein Name zu zwei Gruppen passt: Die
 * Magenmittel und Schmerzmittel stehen vorn, wie bisher. Die ADHS-Mittel und
 * das Koffein stehen hinten, damit sie keinem bisherigen Namen eine neue
 * Gruppe geben – ein Tagebuch ohne sie rechnet wie in der Fassung 27.
 */
const ALLE = [...MITTEL_WISSEN, ...REIZSTOFFE, ...WEITERE_MITTEL, ...ADHS_MITTEL, ...SONSTIGE_MITTEL];

const gruppeMit = (id) => ALLE.find((g) => g.id === id);
const NSAR = gruppeMit('nsar');
const KOMBI = gruppeMit('kombi');
const NICHTNSAR = gruppeMit('nichtnsar');
const KOMBIPARA = gruppeMit('kombipara');
const KOFFEINMITTEL = gruppeMit('koffeinmittel');

/*
 * Die allgemeine Suche kennt „Koffein als Tablette" nicht: Dorthin kommt ein
 * Name nur über die Koffein-Regel in wissenZu(), wenn er außer Koffein nichts
 * trägt. Sonst landete jeder Name mit Koffein darin – auch ein
 * Kombinationsschmerzmittel unter seiner Marke.
 */
const SUCHE = ALLE.filter((g) => g !== KOFFEINMITTEL);

/** Ein eingetragener Name, so wie er verglichen wird. */
const suchform = (name) => String(name || '').toLowerCase().trim();

/*
 * Was auf die Haut kommt, zählt Body Check nicht: Von einem Diclofenac-Gel fürs
 * Knie gelangt laut Fachinformation nur wenig Wirkstoff ins Blut – die
 * Spitzenwerte liegen „etwa 100-mal niedriger als nach oraler Therapie“ –,
 * Magen-Darm-Beschwerden sind „sehr selten“, bei großflächiger und längerer
 * Anwendung aber „nicht auszuschließen“; Kopfschmerz gehört nicht zu seinen
 * Anwendungsgebieten (FI Voltaren Emulgel, fachinfo.de/fi/pdf/022160, Dezember
 * 2024, 4.1, 4.8, 5.2). Es steht dann unter „nicht zugeordnet" statt in der
 * Zählung. „Spray" bleibt
 * draußen aus dieser Regel – das Triptan-Nasenspray wirkt im ganzen Körper.
 */
const aufDerHaut = (gesucht) => /(gel|salbe|creme|pflaster)\b/.test(gesucht);

/*
 * Kurze Kürzel („ASS", „Ibu", „MCP") nur am Wortanfang: Als bloßes Teilwort
 * traf „ass" auch „Wasser" und „Passionsblume" – und ein Glas Wasser zählte
 * als entzündungshemmendes Schmerzmittel. Lange Namen dürfen weiter überall
 * im Eingetragenen stehen („Pantoprazol 20mg", „IbuHexal").
 */
function beispielPasst(gesucht, beispiel) {
  const k = beispiel.toLowerCase();
  if (k.length > 3) return gesucht.includes(k);
  return new RegExp(`(^|[^a-zäöüß])${k}`).test(gesucht);
}

/** „Koffein" oder „Coffein" irgendwo im Namen. */
const MIT_KOFFEIN = /koffein|coffein/;

/*
 * Marken, unter denen ein Schmerzmittel mit Koffein verkauft wird – nur
 * innerhalb der Koffein-Regel und nur mit belegter Zusammensetzung (Quellen in
 * den Gebrauchsinformationen, Nachweis außerhalb des Repositorys):
 *
 *   Spalt plus Coffein N   ASS, Paracetamol und Coffein   → kombi
 *   Vivimed mit Coffein    Paracetamol und Coffein        → kombipara
 *
 * Als allgemeine Beispiele taugen die Marken nicht: Unter „Spalt" gibt es auch
 * Mittel ohne Koffein und solche mit Ibuprofen, unter „Vivimed" Paracetamol
 * allein. „Acetylsalicylsäure" ist ASS, ausgeschrieben – das Kürzel trifft es
 * nicht, weil es nur am Wortanfang zählt.
 */
const KOFFEIN_MIT_NSAR = /acetylsalicyl|spalt/;
const KOFFEIN_MIT_PARACETAMOL = /vivimed/;

/*
 * Nur Koffein und nichts sonst: „Koffein", „Koffeintabletten", „Koffein
 * 200 mg", „Coffeinum N 0,2 g". Weg fallen das Koffein, die Form und die
 * Stärke; bleibt danach noch ein Buchstabe, ist es ein weiterer Bestandteil
 * oder eine Marke – womöglich ein Schmerzmittel.
 */
function nurKoffein(gesucht) {
  return gesucht
    .replace(/koffein|coffein(um)?/g, ' ')
    .replace(/(kau|brause|film)?tabletten?|tabs?|kapseln?|dragees?|purum/g, ' ')
    .replace(/\d+([.,]\d+)?\s*(mg|g)?/g, ' ')
    .replace(/(^|[^a-zäöüß])(n|mg|g)(?=$|[^a-zäöüß])/g, ' ')
    .replace(/[^a-zäöüß]+/g, '') === '';
}

/**
 * Zu einem eingetragenen Namen die passende Gruppe finden.
 *
 * Eingetragen wird frei: „Pantoprazol 20mg", „pantoprazol", „Panto". Deshalb
 * wird kleingeschrieben verglichen und geprüft, ob eines der Beispiele im
 * Eingetragenen vorkommt – nicht auf Gleichheit.
 *
 * DIE KOFFEIN-REGEL kommt vor der allgemeinen Suche. Nach der
 * Kopfschmerzklassifikation ist jedes Schmerzmittel mit Koffein ein
 * Kombinationsmittel (ICHD-3 8.2.5). Ob Body Check es für den Magen als NSAR
 * zählt, hängt dabei nur davon ab, ob ASS oder ein anderes NSAR darin steckt –
 * die Warnungen vor Magen-Darm-Geschwüren und -Blutungen stehen in den
 * Fachinformationen bei den NSAR (etwa FI Thomapyrin CLASSIC,
 * fachinfo.de/fi/pdf/005596, Juni 2026, 4.4: „Während der Behandlung mit allen
 * NSAR …“). Frei von Magen-Darm-Nebenwirkungen sind die anderen damit nicht:
 * „Magenbeschwerden“ nennt FI vivimed mit Coffein (000807, 01.2025, 4.8),
 * Magen-Darm-Beschwerden schon bei niedrigen Dosen FI Coffeinum N (022844,
 * Dezember 2025, 4.8), Magen-Darm-Blutungen FI Novalgin (014708, November 2024,
 * 4.8).
 *
 *   * mit einem NSAR („ASS Koffein", „Ibuprofen + Coffein",
 *     „Spalt plus Coffein N")                                    → kombi
 *   * mit Paracetamol oder Metamizol („Paracetamol + Coffein",
 *     „Vivimed mit Coffein")                                     → kombipara:
 *     für den Kopf ein Kombinationsmittel, aber kein NSAR – zählt deshalb
 *     nicht in der NSAR-Zählung für den Magen
 *   * nur Koffein, Form und Stärke („Koffeintabletten")         → koffeinmittel
 *   * sonst die allgemeine Suche ohne koffeinmittel – und ohne Treffer null.
 *
 * Das Letzte ist Absicht: Ein Name mit Koffein und einem Rest, den die App
 * nicht kennt („Kopfschmerztablette mit Koffein"), ist womöglich ein
 * Kombinationsmittel – mit der niedrigeren Übergebrauchsgrenze von zehn Tagen im
 * Monat (ICHD-3 8.2.5), die ebenso für Triptane, Ergotamin und Opioide gilt,
 * statt fünfzehn wie bei einem einzelnen einfachen Schmerzmittel (8.2.3). Als
 * „Koffein als Tablette" stünde dort „Kein Schmerzmittel", und er fiele still
 * aus der Zählung. Ohne Gruppe steht er unter „nicht zugeordnet" und am
 * Kopfschmerztag mit Namen da (siehe kopfMittel in js/kopf.js).
 *
 * Ohne die Regel stand „ASS Koffein" unter nsar (Grenze fünfzehn statt zehn)
 * und „Paracetamol Koffein" unter kombi (in der Zählung für den Magen ein NSAR). Ein Opioid
 * oder Triptan mit Koffein im Namen behält über die allgemeine Suche seine
 * Gruppe und damit seine Zählung als Akutmittel.
 */
export function wissenZu(name) {
  const gesucht = suchform(name);
  if (!gesucht) return null;
  if (aufDerHaut(gesucht)) return null;
  const passt = (b) => beispielPasst(gesucht, b);
  if (MIT_KOFFEIN.test(gesucht)) {
    if ([...NSAR.beispiele, ...KOMBI.beispiele].some(passt) || KOFFEIN_MIT_NSAR.test(gesucht)) return KOMBI;
    if (NICHTNSAR.beispiele.some(passt) || KOFFEIN_MIT_PARACETAMOL.test(gesucht)) return KOMBIPARA;
    if (nurKoffein(gesucht)) return KOFFEINMITTEL;
  }
  return SUCHE.find((g) => g.beispiele.some(passt))
    || SUCHE.find((g) => gesucht.includes(g.gruppe.toLowerCase()))
    || null;
}

const ADHS_IDS = ADHS_NAMEN.map((x) => x.id);

/**
 * Die ADHS-Gruppe eines eingetragenen Namens – 'mph', 'lisdex', 'dex',
 * 'atomox', 'guanf', 'bupro' – oder null.
 *
 * Seit es zu den ADHS-Mitteln etwas zu lesen gibt, über wissenZu(): eine
 * Erkennung für alles, mit denselben Regeln (Kürzel am Wortanfang, nichts
 * auf der Haut, die Reihenfolge von ALLE).
 */
export function adhsGruppe(name) {
  const g = wissenZu(name);
  return g && ADHS_IDS.includes(g.id) ? g.id : null;
}

/*
 * Gefragt wird für jeden Eintrag in jeder Rechnung, die Tage zählt – bei
 * einem Jahr Tagebuch viele tausend Mal, und fast immer nach denselben
 * wenigen Namen. Deshalb je Name einmal gerechnet und gemerkt.
 */
const adhsSchon = new Map();

/** Zählt dieser Name als ADHS-Mittel? (Bupropion nicht, siehe ADHS_NAMEN.) */
export function istAdhsMittel(name) {
  const k = suchform(name);
  if (!adhsSchon.has(k)) adhsSchon.set(k, ADHS_GRUPPEN.includes(adhsGruppe(k)));
  return adhsSchon.get(k);
}

/* ---------- Die Formen von Methylphenidat ---------- */

/**
 * Wo sich nichts Genaueres belegen lässt, steht dieser Satz: Ob ein
 * Säureblocker zum Präparat passt, hängt am einzelnen Präparat, und das kennt
 * die Apotheke.
 *
 * Fassung 30: „hängt an der Form“ ging über die Quellen hinaus. Eine Gegenanzeige
 * nennen nur die Fachinformationen von Medikinet retard (fachinfo.de/fi/pdf/009621,
 * Dezember 2025) und Medikinet adult (013066, September 2025), 4.3 und 4.5, mit der
 * Begründung „da es dabei zu einer rascheren Freisetzung der gesamten Wirkstoffmenge
 * kommen kann“. Ritalin LA und Ritalin Adult sind ebenfalls Kapseln mit zweierlei
 * Kügelchen, ihre Fachinformationen (010445, 015153, September 2025) nennen
 * Säureblocker aber nicht, ebenso wenig Ritalin (002958), Equasym Retard (012100),
 * Concerta (Februar 2026) und Methylphenidat-HCl-ratiopharm Retardtabletten (022094).
 */
export const KLAER_SATZ = 'Ob ein Säureblocker zu deinem Präparat passt, hängt bei '
  + 'Methylphenidat am einzelnen Präparat: Bei Medikinet retard und Medikinet adult steht '
  + 'die Behandlung mit Säureblockern laut Fachinformation unter den Gegenanzeigen, weil '
  + 'dann die gesamte Wirkstoffmenge rascher frei werden kann. Was für deins gilt, '
  + 'das klären Apotheke oder Praxis.';

/*
 * Methylphenidat gibt es in Formen, die sich beim Essen und bei
 * Säureblockern verschieden verhalten. Für den Magen können sich zwei Packungen
 * mit demselben Wirkstoff damit deutlich unterscheiden: Bei der Kapsel mit
 * zweierlei Kügelchen wird ein Teil des Wirkstoffs erst „nach Magenpassage im
 * Dünndarm“ frei (FI Medikinet retard 5.2); zusammen mit H2-Blockern,
 * Protonenpumpenhemmern oder Antazida kann es laut Fachinformation „zu einer
 * rascheren Freisetzung der gesamten Wirkstoffmenge kommen“ (4.5), und eine
 * ausgeprägte Anazidität des Magens „mit einem pH-Wert über 5,5“ steht unter
 * den Gegenanzeigen (4.3). Dass ein Teil „nur so lange dicht hält, wie der Magen
 * sauer ist“, und „alles auf einmal“ standen so in keiner Quelle (Fassung 30).
 *
 * Die Kennungen stehen als FORM_IDS noch einmal in js/store.js (der Speicher
 * weiß nichts von den Texten); tests/test-adhs-wissen.mjs prüft, dass beide
 * Listen gleich sind.
 *
 * `saeure` ist der Satz zum Säureblocker, `extra` alles, was sonst zur Form
 * gehört. Wo nichts steht, ist nichts belegt – auch kein beruhigender Satz.
 * Wirkdauern stehen nicht hier: Belegt war keine.
 *
 * Jede Form sagt selbst, wen man fragt: Im Medikamenten-Bogen steht unter
 * „Welche Form?" nur ihr Text, ohne den Hinweis des Wirkstoffs.
 *
 * Bei der Kapsel mit zweierlei Kügelchen gibt der Satz die Quelle so streng
 * wieder, wie sie ist: Unter den Gegenanzeigen (4.3) steht dort nicht nur ein
 * Magen ohne Säure, sondern ausdrücklich auch die Behandlung mit H2-Blockern,
 * Protonenpumpenhemmern oder Antazida, und unter 4.5 „darf nicht zusammen …
 * eingenommen werden". Weil das nach Weglassen klingt, sagt der Satz dazu,
 * dass nichts eigenmächtig weggelassen wird – wer einen Säureblocker absetzt,
 * hat womöglich ein anderes Problem als vorher.
 *
 * Quellen:
 *   sofort    Medikinet Tabletten FI, fachinfo.de/pdf/002039 (06/2023), 4.2
 *   pellet    Medikinet retard FI, www.fachinfo.de/fi/pdf/009621 (12/2025), 4.3/4.5;
 *             Rote Liste 19655-1 (Gegenanzeigen); Medikinet adult FI,
 *             fachinfo.de/pdf/013066 (04/2023; 50/60 mg 12/2014), 4.2, und
 *             www.fachinfo.de/fi/pdf/013066 (09/2025), 4.3; GI Medikinet adult,
 *             www.patienteninfo-service.de/gi/14524/ (Abschnitt 2)
 *   sodas     GI Ritalin Adult, PatientenInfo-Service
 *             (www.patienteninfo-service.de/a-z-liste/r/ritalinR-adult-10-20-30-40-mg-hartkapseln-mit-veraenderter-wirkstofffreisetzung)
 *   oros      GI Concerta (Wiedergabe medikamio, 18 und 54 mg; Stand 08/2020) – Essen, Ganzschlucken,
 *             Hülle im Stuhl; Concerta FI (Janssen),
 *             static.janssen-emea.com/sites/default/files/Germany/SMPC/DE-PL-0005.pdf (02/2026)
 *             und …/DE-PL-0003.pdf, 4.4 „Möglichkeit einer gastrointestinalen Obstruktion“
 *             – bei schwerer Verengung normalerweise nicht (ein Warnhinweis, keine Gegenanzeige)
 *             Fassung 30: Auch manche Generika haben eine solche Hülle – GI
 *             Methylphenidathydrochlorid HEXAL Retardtabletten
 *             (www.patienteninfo-service.de/gi/20002/, Juni 2026), Abschnitt 3: „die
 *             Tablettenhülle manchmal im Stuhl sichtbar“, Abschnitt 2: Verengung oder
 *             Verschluss im Darm oder in der Speiseröhre. Der Name der Form bleibt
 *             trotzdem kurz: Die Formfrage muss bei 320 Pixeln Breite in die
 *             vorgesehene Höhe passen (tests/test-rueckfrage.mjs).
 *   retardtab GI Kinecteen, www.patienteninfo-service.de/gi/14910/ – nur Verweis.
 *             Fassung 30: Das frühere „Generika“ im Namen stimmte nicht für alle –
 *             die Generika mit Hülle gehören zur Form oben; Generika ohne Hülle gibt
 *             es auch (etwa FI Methylphenidat-HCl-ratiopharm Retardtabletten,
 *             fachinfo.de/fi/pdf/022094, September 2025, ohne Hinweis auf eine Hülle
 *             im Stuhl oder eine Verengung). Der Name nennt deshalb nur Kinecteen.
 *   equasym   Equasym Retard FI, www.fachinfo.de/fi/pdf/012100 (Apfelmus);
 *             GI-Wiedergabe Apotheken Umschau (morgens vor der Mahlzeit)
 *   unbekannt aus den obigen abgeleitet
 */
export const MPH_FORMEN = [
  {
    id: 'sofort',
    name: 'Tablette, nicht retardiert (z. B. Ritalin, Medikinet Tabletten)',
    kurzname: 'nicht retardierte Tablette',
    einnahme: 'Medikinet-Tabletten laut Fachinformation zu oder direkt nach den Mahlzeiten; '
      + 'für andere Präparate steht es in der Packungsbeilage.',
    saeure: KLAER_SATZ,
  },
  {
    id: 'pellet',
    name: 'Kapsel mit zweierlei Kügelchen (Medikinet retard, Medikinet adult)',
    kurzname: 'Kapsel mit zweierlei Kügelchen',
    einnahme: 'Laut Fachinformation von Medikinet adult und Medikinet retard mit oder nach '
      + 'einer Mahlzeit. Laut Fachinformation von Medikinet adult wird der Wirkstoff '
      + 'nüchtern wesentlich schneller aufgenommen; die Freisetzung ist dann womöglich nicht '
      + 'ausreichend verlängert. Die Einnahme mit oder nach der Mahlzeit soll dort eine '
      + 'ausreichend verlängerte Wirkung erreichen und hohe Spitzen im Blut verhindern.',
    saeure: 'Laut Fachinformation nicht zusammen mit Protonenpumpenhemmern (etwa Pantoprazol), '
      + 'H2-Blockern oder säurebindenden Mitteln (Antazida) zu nehmen; die Behandlung damit '
      + 'steht dort unter den Gegenanzeigen, ebenso ein Magen, der kaum Säure bildet. Zusammen '
      + 'mit diesen Mitteln kann laut Fachinformation die gesamte Wirkstoffmenge rascher frei '
      + 'werden. Wer beides nimmt: nichts eigenmächtig weglassen, sondern in Praxis oder '
      + 'Apotheke ansprechen.',
  },
  {
    id: 'sodas',
    name: 'Ritalin LA / Ritalin Adult',
    kurzname: 'Ritalin LA / Ritalin Adult',
    einnahme: 'Ritalin Adult laut Packungsbeilage mit oder ohne Essen.',
    saeure: KLAER_SATZ,
  },
  {
    id: 'oros',
    name: 'Retardtablette mit Hülle (Concerta)',
    kurzname: 'Retardtablette mit Hülle',
    einnahme: 'Laut Packungsbeilage mit oder ohne Essen; die Tablette wird im Ganzen '
      + 'geschluckt, nicht gekaut, gebrochen oder zerkleinert.',
    extra: 'Die leere Tablettenhülle kann im Stuhl zu sehen sein – laut Packungsbeilage '
      + 'normal. Bei einer schweren Verengung in Speiseröhre, Magen oder Darm soll diese '
      + 'Tablette laut Fachinformation normalerweise nicht genommen werden, weil sie ihre '
      + 'Form nicht verändert. Fragen dazu: Ärztin oder Apotheke.',
  },
  {
    id: 'retardtab',
    name: 'Andere Retardtablette (z. B. Kinecteen)',
    kurzname: 'andere Retardtablette',
    einnahme: 'Wie sie zum Essen genommen wird, steht in der Packungsbeilage.',
    saeure: KLAER_SATZ,
  },
  {
    id: 'equasym',
    name: 'Equasym Retard',
    kurzname: 'Equasym Retard',
    einnahme: 'Laut Packungsbeilage morgens vor der Mahlzeit; laut Fachinformation darf die '
      + 'Kapsel geöffnet und der Inhalt auf etwas Apfelmus gegeben werden. Fragen dazu: '
      + 'Ärztin oder Apotheke.',
  },
  {
    id: 'unbekannt',
    name: 'Weiß ich nicht',
    kurzname: 'Form nicht angegeben',
    einnahme: 'Methylphenidat gibt es in Formen, die sich beim Essen und bei Säureblockern '
      + 'verschieden verhalten. Welche du hast, steht auf der Packung oder weiß die '
      + 'Apotheke.',
    saeure: KLAER_SATZ,
  },
];

/** Die Form zu ihrer Kennung – oder null. */
export function mphForm(id) {
  return MPH_FORMEN.find((f) => f.id === id) || null;
}

/*
 * Nur Namen, die eine Form eindeutig festlegen. „Medikinet" allein gibt es
 * als Tablette und als Kapsel, „Methylphenidat" in jeder Form – dort wird
 * gefragt statt geraten. Kinecteen ist eine Retardtablette, aber keine mit
 * der Hülle von Concerta: Belegt war das nicht, also eine eigene Form.
 */
const FORM_NACH_NAME = [
  [/medikinet\s*(retard|adult)/, 'pellet'],
  [/ritalin\s*(la|adult)\b/, 'sodas'],
  [/concerta/, 'oros'],
  [/kinecteen/, 'retardtab'],
  [/equasym/, 'equasym'],
];

/**
 * Die Form, die der Name eindeutig nennt – oder null.
 *
 * Bindestrich, ® und Punkt zählen wie ein Leerzeichen: „Medikinet® retard"
 * steht so auf der Packung, „Ritalin-Adult" so in mancher Apotheke – und beide
 * nennen ihre Form so eindeutig wie ohne.
 */
export function formAusName(name) {
  const gesucht = suchform(name).replace(/[^a-zäöüß0-9]+/g, ' ');
  if (!gesucht.trim()) return null;
  const treffer = FORM_NACH_NAME.find(([muster]) => muster.test(gesucht));
  return treffer ? treffer[1] : null;
}
