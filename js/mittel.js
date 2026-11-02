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
  {
    id: 'ppi',
    gruppe: 'Protonenpumpenhemmer',
    kuerzel: 'PPI',
    // Mit den Handelsnamen aus der Packung: Wer „Pantozol“ einträgt, nimmt
    // einen Säureblocker, und ohne den Namen fehlte er bei jeder Frage, die
    // nach einem Säureblocker fragt – auch bei der nach dem Methylphenidat
    // in js/zusammen.js. Rifun ist Pantoprazol, Omep Omeprazol; „Omep" trifft
    // als Teilwort auch Esomep (Esomeprazol).
    beispiele: ['Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Lansoprazol', 'Rabeprazol',
      'Pantozol', 'Nexium', 'Antra', 'Agopton', 'Rifun', 'Omep'],
    kurz: 'Drosselt die Säurebildung, damit die Schleimhaut zur Ruhe kommt.',
    wirkung: 'Blockiert die Pumpen in der Magenwand, an denen die Säure entsteht. '
      + 'Es wird also nicht neutralisiert, was schon da ist – es kommt weniger nach. '
      + 'Deshalb ist die volle Wirkung erst nach ein bis vier Tagen da, und deshalb '
      + 'hilft eine einzelne Tablette gegen akutes Brennen kaum.',
    einnahme: 'Üblicherweise morgens auf nüchternen Magen, eine halbe bis eine Stunde '
      + 'vor dem Frühstück. Hemmen lassen sich nur Pumpen, die gerade arbeiten – und '
      + 'das tun sie zur ersten Mahlzeit.',
    hinweis: 'Nach längerer Einnahme nicht von einem Tag auf den anderen weglassen: '
      + 'Der Magen antwortet dann vorübergehend mit mehr Säure als vorher, und das '
      + 'fühlt sich an wie ein Rückfall. Das Ausschleichen gehört besprochen. Bei '
      + 'monatelanger Einnahme wird gelegentlich auf Magnesium, Vitamin B12 und '
      + 'Eisen geschaut.',
  },
  {
    id: 'h2',
    gruppe: 'H2-Blocker',
    beispiele: ['Famotidin', 'Cimetidin'],
    kurz: 'Drosselt die Säure auch, schwächer als ein PPI, aber schneller.',
    wirkung: 'Setzt eine Stufe früher an als der PPI: Er besetzt den Schalter '
      + '(den Histamin-H2-Rezeptor), über den die Säurebildung angeregt wird. '
      + 'Wirkt innerhalb einer Stunde, dafür weniger stark.',
    einnahme: 'Oft abends, weil er die nächtliche Säure gut abfängt.',
    hinweis: 'Bei täglicher Einnahme lässt die Wirkung nach einigen Tagen nach – '
      + 'der Körper gewöhnt sich daran. Ranitidin, das früher hierher gehörte, ist '
      + 'seit 2020 vom Markt.',
  },
  {
    id: 'antazida',
    gruppe: 'Antazida',
    beispiele: ['Magaldrat', 'Hydrotalcit', 'Riopan', 'Talcid', 'Rennie', 'Antazidum', 'Maaloxan'],
    kurz: 'Neutralisiert die Säure, die schon da ist. Wirkt in Minuten.',
    wirkung: 'Eine Base, die die vorhandene Säure abpuffert. Nichts wird gedrosselt '
      + 'und nichts geheilt – es wird das gelöscht, was gerade brennt. Nach ein bis '
      + 'drei Stunden ist es vorbei.',
    einnahme: 'Bei Bedarf, häufig etwa eine Stunde nach dem Essen und vor dem '
      + 'Schlafengehen.',
    hinweis: 'Der wichtigste Punkt steht selten vorn auf der Packung: Antazida binden '
      + 'andere Wirkstoffe und können sie damit unwirksam machen. Zu anderen '
      + 'Medikamenten gehören ein bis zwei Stunden Abstand. Magnesiumhaltige wirken '
      + 'eher abführend, aluminium- und calciumhaltige eher stopfend.',
  },
  {
    id: 'alginat',
    gruppe: 'Alginate',
    beispiele: ['Gaviscon', 'Alginat'],
    kurz: 'Legt einen Deckel auf den Mageninhalt, gegen Aufsteigendes.',
    wirkung: 'Aus Algen gewonnen: Im Magen bildet sich ein leichtes Gel, das oben '
      + 'aufschwimmt und die Säure am Übertritt in die Speiseröhre hindert. Zielt '
      + 'also auf Sodbrennen und Aufstoßen, nicht auf die Säuremenge.',
    einnahme: 'Nach dem Essen und vor dem Hinlegen – dann ist etwas da, worauf sich '
      + 'das Gel legen kann.',
    hinweis: 'Auch hier Abstand zu anderen Medikamenten.',
  },
  {
    id: 'sucralfat',
    gruppe: 'Sucralfat',
    beispiele: ['Sucralfat', 'Ulcogant'],
    kurz: 'Legt sich als Film über die wunden Stellen.',
    wirkung: 'Haftet an entzündeter oder verletzter Schleimhaut und bildet dort eine '
      + 'Schutzschicht gegen Säure und Verdauungsenzyme. Greift nicht in die '
      + 'Säurebildung ein – es deckt ab.',
    einnahme: 'Auf nüchternen Magen, meist etwa eine Stunde vor den Mahlzeiten.',
    hinweis: 'Braucht ein saures Milieu, um zu haften – zusammen mit einem Antazidum '
      + 'im selben Moment wirkt es schlechter. Auch von anderen Medikamenten Abstand '
      + 'halten.',
  },
  {
    id: 'prokinetika',
    gruppe: 'Prokinetika',
    beispiele: ['Domperidon', 'Metoclopramid', 'MCP'],
    kurz: 'Bringt den Magen dazu, sich schneller zu entleeren.',
    wirkung: 'Regt die Magenbewegung an. Gedacht für den Fall, dass das Essen zu '
      + 'lange liegen bleibt – Völlegefühl, Übelkeit, frühes Sattsein. Bei Migräne '
      + 'wird es auch gegen die Übelkeit des Anfalls verordnet – und damit die '
      + 'Schmerztablette aus dem Magen weiterkommt, der im Anfall stillsteht.',
    einnahme: 'Vor den Mahlzeiten – bei Migräne eine Viertelstunde vor dem '
      + 'Schmerzmittel. Verschreibungspflichtig.',
    hinweis: 'Nicht für den Dauergebrauch gedacht; die zugelassene Anwendungsdauer '
      + 'ist begrenzt, wegen möglicher Wirkungen auf Herzrhythmus und Nervensystem. '
      + 'Gehört in ärztliche Hand.',
  },
  {
    id: 'pflanzlich',
    gruppe: 'Pflanzliche Mittel',
    beispiele: ['Iberogast', 'Kamille', 'Kamillentee', 'Süßholz', 'Kümmel', 'Fenchel', 'Anis'],
    kurz: 'Wirkt eher auf Krampf und Bewegung als auf die Säure.',
    wirkung: 'Iberogast ist eine Mischung aus neun Pflanzenauszügen und zielt auf '
      + 'Krämpfe und die Magenbewegung. Kamille wirkt reizlindernd, Kümmel, Fenchel '
      + 'und Anis entkrampfen und helfen gegen Blähungen. Süßholzwurzel wird bei '
      + 'gereizter Schleimhaut verwendet.',
    einnahme: 'Meist zu oder nach den Mahlzeiten; Tee, wann man ihn braucht.',
    hinweis: '„Pflanzlich" heißt nicht „harmlos". Für Iberogast gibt es wegen des '
      + 'Schöllkraut-Anteils einen Warnhinweis zu den Leberwerten. Süßholz in größeren '
      + 'Mengen über längere Zeit kann Blutdruck und Kalium beeinflussen. Beides '
      + 'gehört in ein Gespräch in der Apotheke.',
  },
  {
    id: 'heilerde',
    gruppe: 'Heilerde und Bismut',
    beispiele: ['Heilerde', 'Bismut'],
    kurz: 'Bindet Säure und legt sich über die Schleimhaut.',
    wirkung: 'Feiner Löss, der Säure bindet – ähnlich einem Antazidum, nur langsamer '
      + 'und milder. Bismutsalze legen sich zusätzlich schützend auf und werden vor '
      + 'allem in Kombinationstherapien gegen Helicobacter eingesetzt.',
    einnahme: 'Zwischen den Mahlzeiten, mit reichlich Wasser.',
    hinweis: 'Auch das bindet andere Wirkstoffe: Abstand halten. Bismut färbt Stuhl '
      + 'und Zunge dunkel – erwartbar, kein Alarmzeichen.',
  },
  {
    id: 'eradikation',
    gruppe: 'Helicobacter-Behandlung',
    beispiele: ['Amoxicillin', 'Clarithromycin', 'Metronidazol'],
    kurz: 'Eine befristete Kombination, die ein bestimmtes Bakterium beseitigt.',
    wirkung: 'Helicobacter pylori ist eine der häufigsten Ursachen einer chronischen '
      + 'Gastritis. Behandelt wird nicht mit einem Mittel, sondern mit einer '
      + 'Kombination aus einem PPI und zwei bis drei Antibiotika über sieben bis '
      + 'vierzehn Tage.',
    einnahme: 'Genau nach Schema, meist morgens und abends.',
    hinweis: 'Das eine Mittel, bei dem „ich fühl mich besser, ich lass den Rest weg" '
      + 'wirklich schadet: Eine abgebrochene Behandlung kann Keime zurücklassen, die '
      + 'gegen das Antibiotikum unempfindlich geworden sind. Ob der Keim weg ist, '
      + 'wird hinterher nachgeprüft.',
  },
];

/**
 * Was den Magen von der anderen Seite belastet.
 *
 * Gehört in eine Übersicht über Magenmittel, weil es der häufigste vermeidbare
 * Grund für eine gereizte Schleimhaut ist – und weil es das Einzige hier ist,
 * was jemand womöglich gerade selbst einnimmt, ohne den Zusammenhang zu kennen.
 */
export const REIZSTOFFE = [
  {
    id: 'nsar',
    gruppe: 'Entzündungshemmende Schmerzmittel (NSAR)',
    // Mit den Handelsnamen, die bei Migräne im Schrank stehen:
    // Ohne „Dolormin" und „Nurofen" zählte die App die Hälfte der NSAR-Tage
    // nicht – und jeder Satz zum Magen hängt an dieser Zählung.
    beispiele: ['Ibuprofen', 'Ibu', 'Dolormin', 'Nurofen', 'Diclofenac', 'Diclo',
      'Voltaren', 'Naproxen', 'ASS', 'Aspirin'],
    kurz: 'Häufigster vermeidbarer Grund für eine gereizte Magenschleimhaut.',
    wirkung: 'Sie hemmen Botenstoffe, die Schmerz und Entzündung machen – dieselben '
      + 'Botenstoffe sorgen aber auch für die Schleimschicht, die den Magen vor '
      + 'seiner eigenen Säure schützt. Der Schutz wird also mit abgeschaltet.',
    einnahme: '–',
    hinweis: 'Wer regelmäßig zu einem davon greift und Magenbeschwerden hat, sollte '
      + 'das ansprechen: Es gibt Schmerzmittel, die den Magen nicht angreifen, und '
      + 'wenn es ohne NSAR nicht geht, einen Magenschutz dazu. Welches davon, '
      + 'entscheidet sich nicht am Magen allein. Zusammen mit Kortison steigt das '
      + 'Risiko weiter. Als Gel oder Pflaster auf der Haut zählt es hier nicht – '
      + 'davon kommt kaum etwas im Magen an.',
  },
  /*
   * Quelle: ICHD-3 8.2.5 Combination-analgesic-overuse headache,
   * ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-2-medication-overuse-headache-moh/8-2-5-combination-analgesic-overuse-headache/
   * (Koffein als Hilfsstoff macht ein Kombinationsmittel, Grenze zehn Tage).
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
      + 'Wirkung verstärkt und beschleunigt. Für die Magenschleimhaut gilt, was für jedes '
      + 'NSAR gilt: Der Schutzfilm wird mit abgeschaltet.',
    einnahme: '–',
    hinweis: 'Die meistgekauften rezeptfreien Kopfschmerzmittel – und gerade deshalb '
      + 'die, die am ehesten zu oft genommen werden. Ab etwa zehn Tagen im Monat '
      + 'kann ein Kombinationsmittel den Kopfschmerz selbst unterhalten, früher als '
      + 'ein einzelnes Schmerzmittel. Für den Magen zählt es wie ein NSAR. Auch ein '
      + 'Präparat mit nur ASS oder nur Ibuprofen und Koffein zählt hier.',
  },
  {
    id: 'kortison',
    gruppe: 'Kortison',
    beispiele: ['Prednisolon', 'Kortison'],
    kurz: 'Allein weniger heikel, zusammen mit NSAR deutlich mehr.',
    wirkung: 'Für sich genommen ein geringerer Magenreiz als lange angenommen. In '
      + 'Kombination mit einem entzündungshemmenden Schmerzmittel steigt das Risiko '
      + 'für Schleimhautschäden jedoch deutlich.',
    einnahme: '–',
    hinweis: 'Nie eigenmächtig absetzen. Änderungen gehören in ärztliche Hand.',
  },
];

/*
 * Was sonst noch gegen Schmerzen genommen wird – und den Magen nicht angreift.
 *
 * Gehört hierher, weil die Frage nach der „magenfreundlicheren Alternative"
 * unter „Was noch fehlt" sonst ins Leere zeigt: Die App soll erkennen, wenn
 * jemand bereits Paracetamol statt Ibuprofen nimmt. Und sie soll Triptane
 * kennen, weil bei einer Migräne die Zahl der Tage mit Akutmedikation im
 * Monat die wichtigste Zahl für die Neurologie ist – und die niedrigste
 * Schwelle ausgerechnet beim Migränemittel liegt. Beides ohne Empfehlung:
 * Welches Mittel für wen passt, entscheidet niemand hier.
 */
export const WEITERE_MITTEL = [
  {
    id: 'triptan',
    gruppe: 'Triptane',
    // „triptan" als Teilwort fängt jeden Wirkstoff; dazu die Handelsnamen.
    beispiele: ['triptan', 'Imigran', 'Maxalt', 'AscoTop', 'Naramig', 'Formigran',
      'Dolortriptan', 'Relpax', 'Almogran'],
    kurz: 'Ein Mittel eigens gegen den Migräneanfall – für einen Spannungskopfschmerz das falsche Werkzeug, und nicht für den Magen.',
    wirkung: 'Dockt an Serotonin-Schaltern an den Nerven und Gefäßen der Hirnhaut an '
      + 'und dämpft dort die Weiterleitung des Anfalls; nebenbei engt es Gefäße – '
      + 'auch außerhalb des Kopfes. Deshalb bessert es auch die Übelkeit, die zum '
      + 'Anfall gehört, und deshalb ist es für einen Spannungskopfschmerz das '
      + 'falsche Werkzeug. Die Magenschleimhaut greift es nicht an.',
    einnahme: 'Früh im Anfall, sobald der Schmerz da ist; während einer Aura '
      + 'üblicherweise noch nicht. Wie oft an einem Tag und mit welchem Abstand, '
      + 'steht auf der Packung – es ist begrenzt. Im Anfall steht der Magen oft '
      + 'still, und eine Tablette kommt dann schlecht weiter; dafür gibt es '
      + 'Schmelztabletten, Nasenspray und Spritze. Wer im Anfall erbricht, hat '
      + 'damit eine Frage für die Sprechstunde.',
    hinweis: 'Triptane engen Gefäße auch außerhalb des Kopfes. Darum sind sie bei '
      + 'Herz- und Gefäßkrankheiten, nach einem Schlaganfall und bei unbehandeltem '
      + 'Bluthochdruck nicht vorgesehen – das wird vor dem ersten Rezept geprüft '
      + 'und gehört neu gefragt, wenn sich daran etwas ändert. Ein Engegefühl in '
      + 'Brust oder Hals kurz nach der Einnahme ist beschrieben und meist harmlos – '
      + 'trotzdem vor der nächsten Einnahme in der Praxis ansprechen, nicht erst '
      + 'beim nächsten Termin. Kommt es mit Luftnot oder kaltem Schweiß, oder hält '
      + 'es an: sofort. Übelkeit kann vom Anfall kommen und vom Mittel. Sehr selten: '
      + 'plötzliche Bauchkrämpfe mit blutigem Durchfall nach der Einnahme, das ist '
      + 'ein Fall für sofort. Und ab etwa zehn Tagen im Monat kann ein Triptan den '
      + 'Kopfschmerz selbst unterhalten – früher als einfache Schmerzmittel, '
      + 'gleichauf mit Kombinationsmitteln.',
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
  {
    id: 'opioid',
    gruppe: 'Opioide',
    beispiele: ['Tramadol', 'Tramal', 'Tilidin', 'Valoron', 'Codein', 'Oxycodon', 'Tapentadol'],
    kurz: 'Greift den Magen nicht an – für den Kopf gilt die niedrige Grenze von zehn Tagen.',
    wirkung: 'Dämpft den Schmerz im Nervensystem, nicht an der Stelle, wo er entsteht. '
      + 'Gegen Migräne sehen die Leitlinien es nicht vor – es wirkt dort schlecht '
      + 'und macht leicht abhängig; wenn es trotzdem im Schrank steht, soll die '
      + 'App es wenigstens zählen.',
    einnahme: '–',
    hinweis: 'Verstopfung und Übelkeit gehören dazu; Müdigkeit auch. Ab etwa zehn '
      + 'Tagen im Monat kann ein Opioid den Kopfschmerz selbst unterhalten – wie '
      + 'ein Triptan. Nicht eigenmächtig absetzen und nicht eigenmächtig '
      + 'steigern; beides gehört in ärztliche Hand.',
  },
  {
    id: 'gepant',
    gruppe: 'Gepante und Ditane',
    // Mit Namen, nicht mit dem Teilwort „gepant": Atogepant ist Vorbeugung.
    beispiele: ['Rimegepant', 'Vydura', 'Ubrogepant', 'Zavegepant', 'Lasmiditan', 'Rayvow'],
    kurz: 'Die neueren Anfallsmittel – ohne Gefäßverengung, ohne Angriff auf den Magen.',
    wirkung: 'Blockieren einen Botenstoff des Anfalls (CGRP) oder dämpfen die '
      + 'Weiterleitung an anderer Stelle als Triptane – ohne Gefäße zu verengen. '
      + 'Deshalb kommen sie auch für Menschen infrage, die kein Triptan nehmen '
      + 'dürfen. Für den Magen sind sie kein Reizstoff.',
    einnahme: 'Früh im Anfall, nach Rezept. Lasmiditan macht müde und schwindelig – '
      + 'danach stundenlang nicht fahren.',
    hinweis: 'Zählt hier als Tag mit Akutmittel, ohne eigene Übergebrauchsgrenze – '
      + 'die Klassifikation kennt dafür noch keine. Was es im Einzelnen tut und '
      + 'verträgt, steht auf dem Rezept und im Gespräch.',
  },
  {
    id: 'nichtnsar',
    gruppe: 'Schmerzmittel ohne Entzündungshemmung',
    beispiele: ['Paracetamol', 'ben-u-ron', 'Dafalgan', 'Mexalen', 'Metamizol', 'Novalgin', 'Novaminsulfon'],
    kurz: 'Lässt die Schutzschicht des Magens in Ruhe – belastet dafür anderes.',
    wirkung: 'Paracetamol wirkt vor allem im Gehirn gegen Schmerz und Fieber, kaum '
      + 'gegen Entzündung, und greift die Schleimschicht des Magens nicht an. '
      + 'Metamizol wirkt stärker und auch krampflösend; für den Magen gilt '
      + 'dasselbe. „Harmlos" heißt das nicht – die Risiken liegen nur woanders.',
    einnahme: 'Paracetamol gibt es frei, Metamizol nur auf Rezept. Beide stecken '
      + 'auch in Kombinationsmitteln gegen Erkältung und Kopfschmerz – wer '
      + 'zweierlei nimmt, nimmt es leicht doppelt.',
    hinweis: 'Paracetamol geht über die Leber. Die Grenze pro Tag steht auf der '
      + 'Packung; sie gilt auch an Tagen, an denen nichts im Magen bleibt – da '
      + 'verträgt die Leber eher weniger, nicht mehr –, und mit regelmäßig Alkohol '
      + 'erst recht. Metamizol kann die weißen Blutkörperchen verschwinden lassen '
      + '(Agranulozytose) – selten, aber nicht so selten wie lange angenommen, und '
      + 'auch, wenn es früher gut vertragen wurde: Fieber, Schüttelfrost, '
      + 'Halsschmerzen oder wunde Stellen im Mund unter oder kurz nach der Einnahme '
      + 'sind ein Grund, sofort anzurufen und ein Blutbild machen zu lassen. Für den '
      + 'Kopf zählen beide wie jedes Akutmittel: Ab etwa fünfzehn Tagen im Monat '
      + 'kann das Mittel den Kopfschmerz selbst unterhalten. Welches Mittel bei '
      + 'Migräne das richtige ist, entscheidet sich nicht am Magen allein – das ist '
      + 'die Frage für die Neurologie.',
  },
  /*
   * Paracetamol mit Koffein – für den Kopf ein Kombinationsmittel, für den
   * Magen kein NSAR. Bis zur Fassung 27 stand „Paracetamol Koffein" unter
   * kombi und zählte damit für den Magen als ASS; „Paracetamol + Coffein"
   * dagegen als einfaches Schmerzmittel mit der Grenze von fünfzehn Tagen.
   * Beides war falsch. Erkannt wird die Gruppe nur über die Koffein-Regel in
   * wissenZu(); das Beispiel steht für die Übersicht da.
   *
   * Quelle: ICHD-3 8.2.5 (wie bei kombi), Stand der Seite 2018: Koffein als
   * Hilfsstoff macht ein Kombinationsmittel, Übergebrauch ab zehn Tagen im
   * Monat über mehr als drei Monate.
   */
  {
    id: 'kombipara',
    gruppe: 'Kombinationsmittel mit Paracetamol und Koffein',
    beispiele: ['Paracetamol + Koffein'],
    kurz: 'Für den Kopf ein Kombinationsmittel mit niedrigerer Übergebrauchsgrenze; für den Magen kein NSAR.',
    wirkung: 'Paracetamol zusammen mit Koffein, das die Wirkung verstärken soll. Ohne '
      + 'ASS greift es die Schleimschicht des Magens nicht an; für die Leber gilt, '
      + 'was für Paracetamol gilt.',
    einnahme: '–',
    hinweis: 'Nach der Kopfschmerzklassifikation zählt jedes Schmerzmittel mit Koffein '
      + 'als Kombinationsmittel: Ab etwa zehn Tagen im Monat kann es den Kopfschmerz '
      + 'selbst unterhalten, früher als ein einzelnes Schmerzmittel. Die Grenze für '
      + 'Paracetamol pro Tag steht auf der Packung. Fragen dazu: Ärztin oder Apotheke.',
  },
  /*
   * Vorbeugende Mittel stehen hier, damit die App sie kennt und *nicht* als
   * Akutmittel zählt: Ein tägliches Metoprolol würde sonst die Übergebrauchs-
   * zählung sprengen. Manche davon sind zugleich Blutdruck- oder
   * Stimmungsmittel – was es bei wem ist, weiß die App nicht.
   */
  {
    id: 'prophylaxe',
    gruppe: 'Vorbeugende Migränemittel',
    beispiele: ['Metoprolol', 'Propranolol', 'Amitriptylin', 'Topiramat', 'Valproat',
      'Flunarizin', 'Candesartan', 'Erenumab', 'Aimovig', 'Galcanezumab', 'Emgality',
      'Fremanezumab', 'Ajovy', 'Eptinezumab', 'Atogepant', 'Aquipta'],
    kurz: 'Regelmäßig genommen, damit Anfälle seltener kommen – kein Akutmittel.',
    wirkung: 'Senkt die Bereitschaft des Nervensystems, einen Anfall zu starten. '
      + 'Wirkt nicht gegen den Anfall, der gerade da ist, sondern über Wochen auf '
      + 'die Zahl der Anfälle. Einige davon sind zugleich Mittel gegen hohen '
      + 'Blutdruck, Epilepsie oder Depression – bei Migräne werden sie in anderer '
      + 'Absicht eingesetzt. Die Antikörper (Spritze alle vier Wochen oder alle '
      + 'drei Monate) richten sich gezielt gegen einen Botenstoff des Anfalls.',
    einnahme: 'Regelmäßig nach Plan, unabhängig davon, ob gerade ein Anfall ist. '
      + 'Ob es wirkt, zeigt sich erst nach Wochen – deshalb gehört das '
      + 'Kopfschmerztagebuch dazu.',
    hinweis: 'Zählt in dieser App nicht als Akutmittel. Nicht eigenmächtig absetzen; '
      + 'bei den Blutdruckmitteln darunter schon gar nicht. Was es im Einzelnen '
      + 'tut und welche Nebenwirkungen es hat, ist bei jedem anders – das steht '
      + 'auf der Packung und im Gespräch, nicht hier. Eine Ausnahme ist allgemein: '
      + 'Topiramat und Valproat gehören bei Frauen, die schwanger werden könnten, '
      + 'in ein eigenes Gespräch über Verhütung – das gilt seit 2024 ausdrücklich.',
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
 * dem es steht, bleibt ein notierter Tag. Ob es dort wegen ADHS oder aus
 * einem anderen Grund steht, kann die App nicht wissen.
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
 *     „bei Methylphenidat sehr häufig" wäre für Ritalin falsch.
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
   *   Medikinet adult, Rote Liste www.rote-liste.de/rle/detail/23061/ , 4.8 – sehr häufig
   *   Ritalin LA FI, fachinfo.de/fi/pdf/010445/ritalin-la (09/2025), 4.2/4.8 – häufig, Essen
   *   EMA CMDh, PSUSA 00002024 (2019), www.ema.europa.eu/documents/psusa/methylphenidate-cmdh-scientific-conclusions-grounds-variation-amendments-product-information/00002024/201910_hu.pdf – Bruxismus häufig
   *   MIMS-Wiedergabe der Medikinet-Produktinformation,
   *     prdmimsweb.azurewebsites.net/singapore/drug/info/medikinet/special-precautions – Alkohol und ZNS
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
    kurz: 'Stimulans bei ADHS. Für den Magen zählt auch, wie die Tablette oder Kapsel den Wirkstoff freisetzt.',
    wirkung: 'Wie schnell es ins Blut geht und wie lange es anhält, hängt vor allem an '
      + 'der Form: sofort freisetzend oder retardiert, und retardiert auf verschiedene '
      + 'Weise. Darum fragt Body Check nach der Form.',
    einnahme: 'Je nach Form verschieden – siehe „Je nach Form“. Spät am Tag genommen kann '
      + 'es laut Fachinformation den Schlaf stören.',
    nebenwirkung: 'Laut Fachinformation von Medikinet adult sehr häufig: weniger Appetit, '
      + 'Schlaflosigkeit, Nervosität, Kopfschmerzen, Übelkeit und Mundtrockenheit. Laut '
      + 'Fachinformation von Ritalin LA häufig: Bauchschmerzen, Durchfall, '
      + 'Magenbeschwerden, Erbrechen und Verdauungsbeschwerden. Seit einer Bewertung der '
      + 'EU-Arzneimittelbehörden steht auch Zähneknirschen als häufig in den '
      + 'Fachinformationen von Methylphenidat. Laut Fachinformation von Ritalin LA kann '
      + 'Essen zur selben Zeit helfen, Bauchschmerzen, Übelkeit oder Erbrechen zu verhindern.',
    hinweis: 'Alkohol verstärkt laut Fachinformation Nebenwirkungen auf das Nervensystem. '
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
      + 'Serotoninsyndrom möglich ist. Nicht zusammen mit MAO-Hemmern. Nicht eigenmächtig '
      + 'ändern oder absetzen – Fragen dazu: Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   Attentin 5 mg FI, www.fachinfo.de/fi/pdf/013378/attentin-5-mg-tablette (08/2022),
   *     4.2 – Nahrungseinfluss nicht untersucht, gleich zu den Mahlzeiten; 4.3 – MAO-Hemmer; 5.2 – rasch resorbiert
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
      + 'Aufnahme. Nicht zusammen mit MAO-Hemmern. Nicht eigenmächtig ändern oder '
      + 'absetzen – Fragen dazu: Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   US-Label Strattera (Wiedergabe medlibrary.org) – mit oder ohne Essen; Fluoxetin,
   *     Paroxetin, Chinidin erhöhen die Exposition deutlich
   *   SAHPRA-PI Strattera (2018), www.sahpra.org.za/wp-content/uploads/2020/02/Strattera_PI_Eli-Lilly_MCC-format-20-March-2018.pdf
   *     – CYP2D6, langsame Metabolisierer; Leberzeichen (dunkler Urin, Gelbsucht, rechter Oberbauch)
   *   DE-Packungsbeilagen Atomoxetin – „Selten: Leberschädigungen"
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
      + 'Fachinformation den Spiegel deutlich. Selten sind Leberschäden beschrieben; gelbe '
      + 'Haut oder Augen, dunkler Urin oder Schmerzen im rechten Oberbauch gehören laut '
      + 'Fachinformation sofort ärztlich abgeklärt. Nicht eigenmächtig ändern oder '
      + 'absetzen – Fragen dazu: Ärztin oder Apotheke.',
  },
  /*
   * Quellen:
   *   EMA, EPAR-Zusammenfassung Intuniv, www.ema.europa.eu/de/documents/overview/intuniv-epar-summary-public_de.pdf
   *     und www.ema.europa.eu/sv/medicines/human/EPAR/intuniv – Häufigkeiten, 6 bis 17 Jahre
   *   Intuniv FI, www.fachinfo.de/fi/pdf/020868 – Zielgruppe
   *   US-Label Intuniv, www.accessdata.fda.gov/drugsatfda_docs/label/2009/022037lbl.pdf
   *     – fettreiche Mahlzeit, CYP3A4
   *   AkdÄ Drug Safety Mail 2021-61, www.akdae.de/arzneimittelsicherheit/drug-safety-mail/newsdetail/drug-safety-mail-2021-61
   *     – abruptes Absetzen, Rebound-Hypertonie, laut FI ausschleichen
   */
  {
    id: 'guanf',
    gruppe: 'Guanfacin',
    beispiele: namenVon('guanf'),
    kurz: 'ADHS-Mittel, kein Stimulans; in der EU für 6- bis 17-Jährige zugelassen.',
    wirkung: 'Kein Stimulans; es kann Puls und Blutdruck senken, und viele werden davon schläfrig.',
    einnahme: 'Laut US-Produktinformation nicht zu einer fettreichen Mahlzeit – das erhöht '
      + 'den Spiegel.',
    nebenwirkung: 'Laut EMA bei fast jeder zweiten Person Schläfrigkeit, bei mehr als einer '
      + 'von vier Kopfschmerzen, bei etwa einer von fünf Müdigkeit und bei etwa einer von '
      + 'zehn Oberbauchschmerzen. Niedriger Blutdruck betrifft etwa eine von dreißig '
      + 'Personen, ein langsamer Puls etwa eine von sechzig, Ohnmacht weniger als eine von '
      + 'hundert.',
    hinweis: 'Plötzliches Absetzen kann laut Fachinformation den Blutdruck stark ansteigen '
      + 'lassen; absetzen oder ändern nur nach Rücksprache mit der Ärztin. Mittel, die das '
      + 'Leberenzym CYP3A4 hemmen oder anregen, verändern den Spiegel. Schwindel oder '
      + 'Ohnmacht gehören angesprochen. Fragen dazu: Ärztin oder Apotheke.',
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
 * Koffein als Tablette ist kein Schmerzmittel. Bis zur Fassung 27 stand
 * „Koffein" als Beispiel bei kombi und zählte damit als ASS-Kombination: für
 * den Magen als NSAR, für den Kopf mit der Grenze von zehn Tagen. Beides
 * stimmt für eine Koffeintablette nicht.
 *
 * Quelle: ICHD-3 8.3.1 Caffeine-withdrawal headache,
 * ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-3-headache-attributed-to-substance-withdrawal/8-3-1-caffeine-withdrawal-headache
 * (Beginn innerhalb von 24 Stunden nach dem letzten Koffein, nach mehr als
 * zwei Wochen regelmäßiger Einnahme).
 */
export const SONSTIGE_MITTEL = [
  {
    id: 'koffeinmittel',
    gruppe: 'Koffein als Tablette',
    beispiele: ['Koffein', 'Coffein'],
    kurz: 'Kein Schmerzmittel und für den Magen kein NSAR.',
    wirkung: 'Ein anregender Stoff, derselbe wie im Kaffee.',
    einnahme: '–',
    hinweis: 'Wer über Wochen regelmäßig Koffein nimmt und dann aussetzt, kann davon '
      + 'Kopfschmerz bekommen; die Kopfschmerzklassifikation beschreibt ihn mit Beginn '
      + 'innerhalb eines Tages nach dem letzten Koffein. Fragen dazu: Apotheke.',
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
 * Was auf der Haut bleibt, zählt nicht: Ein Diclofenac-Gel fürs Knie kommt
 * im Magen praktisch nicht an und ist kein Kopfschmerz-Akutmittel. Es
 * steht dann unter „nicht zugeordnet" statt in der Zählung. „Spray" bleibt
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
 * Kombinationsmittel (ICHD-3 8.2.5). Für den Magen zählt dabei nur, ob ASS
 * oder ein anderes NSAR darin steckt:
 *
 *   * mit einem NSAR („ASS Koffein", „Ibuprofen + Coffein",
 *     „Spalt plus Coffein N")                                    → kombi
 *   * mit Paracetamol oder Metamizol („Paracetamol + Coffein",
 *     „Vivimed mit Coffein")                                     → kombipara
 *   * nur Koffein, Form und Stärke („Koffeintabletten")         → koffeinmittel
 *   * sonst die allgemeine Suche ohne koffeinmittel – und ohne Treffer null.
 *
 * Das Letzte ist Absicht: Ein Name mit Koffein und einem Rest, den die App
 * nicht kennt („Kopfschmerztablette mit Koffein"), ist womöglich ein
 * Kombinationsmittel – das mit der niedrigsten Übergebrauchsgrenze. Als
 * „Koffein als Tablette" stünde dort „Kein Schmerzmittel", und er fiele still
 * aus der Zählung. Ohne Gruppe steht er unter „nicht zugeordnet" und am
 * Kopfschmerztag mit Namen da (siehe kopfMittel in js/kopf.js).
 *
 * Ohne die Regel stand „ASS Koffein" unter nsar (Grenze fünfzehn statt zehn)
 * und „Paracetamol Koffein" unter kombi (für den Magen ein NSAR). Ein Opioid
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
 * Säureblocker zum Präparat passt, hängt an der Form, und die kennt die
 * Apotheke.
 */
export const KLAER_SATZ = 'Ob ein Säureblocker zu deinem Präparat passt, hängt bei '
  + 'Methylphenidat an der Form – das klären Apotheke oder Praxis.';

/*
 * Methylphenidat gibt es in Formen, die sich beim Essen und bei
 * Säureblockern verschieden verhalten. Für den Magen ist das der wichtigste
 * Unterschied zwischen zwei Packungen mit demselben Wirkstoff: Bei der Kapsel
 * mit zweierlei Kügelchen hält ein Teil nur so lange dicht, wie der Magen
 * sauer ist – mit einem Säureblocker kann alles auf einmal frei werden.
 *
 * Die Kennungen stehen als FORM_IDS noch einmal in js/store.js (der Speicher
 * weiß nichts von den Texten); tests/test-adhs-wissen.mjs prüft, dass beide
 * Listen gleich sind.
 *
 * `saeure` ist der Satz zum Säureblocker, `extra` alles, was sonst zur Form
 * gehört. Wo nichts steht, ist nichts belegt – auch kein beruhigender Satz.
 * Wirkdauern stehen nicht hier: Belegt war keine.
 *
 * Quellen:
 *   sofort    Medikinet Tabletten FI, fachinfo.de/pdf/002039 (06/2023), 4.2
 *   pellet    Medikinet retard FI, www.fachinfo.de/fi/pdf/009621 (12/2025), 4.3/4.5;
 *             Medikinet adult FI, fachinfo.de/pdf/013066 (04/2023; 50/60 mg 12/2014), 4.2
 *   sodas     GI Ritalin Adult, PatientenInfo-Service
 *             (www.patienteninfo-service.de/a-z-liste/r/ritalinR-adult-10-20-30-40-mg-hartkapseln-mit-veraenderter-wirkstofffreisetzung)
 *   oros      GI Concerta (Wiedergabe medikamio, 18 und 54 mg; Stand 08/2020) – Essen, Ganzschlucken,
 *             Hülle im Stuhl; Concerta FI (Janssen),
 *             static.janssen-emea.com/sites/default/files/Germany/SMPC/DE-PL-0005.pdf (02/2026)
 *             und …/DE-PL-0003.pdf, 4.4 „Möglichkeit einer gastrointestinalen Obstruktion“
 *             – bei schwerer Verengung normalerweise nicht (ein Warnhinweis, keine Gegenanzeige)
 *   retardtab GI Kinecteen, www.patienteninfo-service.de/gi/14910/ – nur Verweis
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
      + 'nüchtern deutlich schneller aufgenommen; die Wirkung hält dann nicht wie '
      + 'vorgesehen an, und es entstehen hohe Spitzen im Blut.',
    saeure: 'Laut Fachinformation nicht zusammen mit Protonenpumpenhemmern (etwa '
      + 'Pantoprazol), H2-Blockern oder säurebindenden Mitteln (Antazida) vorgesehen: In '
      + 'einem weniger sauren Magen kann der ganze Wirkstoff früher frei werden. Ein '
      + 'Magen, der von sich aus kaum Säure bildet, steht dort als Gegenanzeige.',
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
    name: 'Andere Retardtablette (z. B. Kinecteen, Generika)',
    kurzname: 'andere Retardtablette',
    einnahme: 'Wie sie zum Essen genommen wird, steht in der Packungsbeilage.',
    saeure: KLAER_SATZ,
  },
  {
    id: 'equasym',
    name: 'Equasym Retard',
    kurzname: 'Equasym Retard',
    einnahme: 'Laut Packungsbeilage morgens vor der Mahlzeit; laut Fachinformation darf die '
      + 'Kapsel geöffnet und der Inhalt auf etwas Apfelmus gegeben werden.',
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
