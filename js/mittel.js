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
    beispiele: ['Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Lansoprazol', 'Rabeprazol'],
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
    beispiele: ['Magaldrat', 'Hydrotalcit', 'Riopan', 'Talcid', 'Rennie', 'Antazidum'],
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
    // Mit den Handelsnamen, die im Schrank einer Migränepatientin stehen:
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
  {
    id: 'kombi',
    gruppe: 'Kombinationsmittel mit ASS und Koffein',
    beispiele: ['Thomapyrin', 'Neuralgin', 'Koffein'],
    kurz: 'Für den Magen ein NSAR – für den Kopf ein Mittel mit der niedrigsten Übergebrauchsgrenze.',
    wirkung: 'ASS, meist zusammen mit Paracetamol, und dazu Koffein, das die Wirkung '
      + 'verstärkt und beschleunigt. Für die Magenschleimhaut gilt, was für jedes '
      + 'ASS gilt: Der Schutzfilm wird mit abgeschaltet.',
    einnahme: '–',
    hinweis: 'Die meistgekauften rezeptfreien Kopfschmerzmittel – und gerade deshalb '
      + 'die, die am ehesten zu oft genommen werden. Ab etwa zehn Tagen im Monat '
      + 'kann ein Kombinationsmittel den Kopfschmerz selbst unterhalten, früher als '
      + 'ein einzelnes Schmerzmittel. Für den Magen zählt es wie ein NSAR.',
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

const ALLE = [...MITTEL_WISSEN, ...REIZSTOFFE, ...WEITERE_MITTEL];

/**
 * Zu einem eingetragenen Namen die passende Gruppe finden.
 *
 * Eingetragen wird frei: „Pantoprazol 20mg", „pantoprazol", „Panto". Deshalb
 * wird kleingeschrieben verglichen und geprüft, ob eines der Beispiele im
 * Eingetragenen vorkommt – nicht auf Gleichheit.
 */
export function wissenZu(name) {
  const gesucht = String(name || '').toLowerCase().trim();
  if (!gesucht) return null;
  /*
   * Kurze Kürzel („ASS", „Ibu", „MCP") nur am Wortanfang: Als bloßes Teilwort
   * traf „ass" auch „Wasser" und „Passionsblume" – und ein Glas Wasser zählte
   * als entzündungshemmendes Schmerzmittel. Lange Namen dürfen weiter überall
   * im Eingetragenen stehen („Pantoprazol 20mg", „IbuHexal").
   */
  /*
   * Was auf der Haut bleibt, zählt nicht: Ein Diclofenac-Gel fürs Knie kommt
   * im Magen praktisch nicht an und ist kein Kopfschmerz-Akutmittel. Es
   * steht dann unter „nicht zugeordnet" statt in der Zählung. „Spray" bleibt
   * draußen aus dieser Regel – das Triptan-Nasenspray wirkt im ganzen Körper.
   */
  if (/(gel|salbe|creme|pflaster)\b/.test(gesucht)) return null;
  const passt = (b) => {
    const k = b.toLowerCase();
    if (k.length > 3) return gesucht.includes(k);
    return new RegExp(`(^|[^a-zäöüß])${k}`).test(gesucht);
  };
  return ALLE.find((g) => g.beispiele.some(passt))
    || ALLE.find((g) => gesucht.includes(g.gruppe.toLowerCase()))
    || null;
}
