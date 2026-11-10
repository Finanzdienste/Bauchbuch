/*
 * Was Sache ist – drei bis fünf Sätze, ganz oben
 *
 * DAS PROBLEM
 *
 * Der Reiter „Muster" zeigt inzwischen zehn Karten, der Arztbericht zwölf
 * Abschnitte. Alles darin ist geprüft, mit Fallzahlen versehen und ehrlich
 * gerechnet – und trotzdem ist die Frage unbeantwortet, mit der jemand die App
 * überhaupt aufmacht: *Was ist jetzt eigentlich los?*
 *
 * Wer Beschwerden hat, liest keine zehn Karten. Wer sie in der Sprechstunde
 * vorzeigt, hat dafür keine zehn Minuten. Eine Auswertung, die man erst
 * zusammensetzen muss, ist für den, der sie am nötigsten braucht, keine.
 *
 * WAS HIER PASSIERT – UND VOR ALLEM, WAS NICHT
 *
 * Diese Datei rechnet **nichts**. Sie bekommt die fertigen Befunde der anderen
 * Module gereicht und tut genau zwei Dinge: auswählen und in einen Satz
 * bringen. Das ist Absicht. Jede Schwelle, die hier stünde, wäre eine
 * Schwelle, die zweimal existiert und irgendwann auseinanderläuft – und dann
 * stünde oben etwas anderes als unten, im selben Bild.
 *
 * Daraus folgt die Regel, an der sich alles hier messen lässt: **Es steht
 * nichts oben, was nicht unten mit seinen Zahlen steht.** Wer einen Satz hier
 * nicht wiederfindet, hat einen Fehler gefunden.
 *
 * DIE REIHENFOLGE IST DIE AUSSAGE
 *
 * Warnzeichen zuerst, immer, auch wenn sonst alles gut aussieht. Dann die
 * Richtung, weil sie die Frage beantwortet, die sich jeder zuerst stellt. Dann
 * der stärkste Befund, der die Störfaktorenprüfung überstanden hat – nicht der
 * stärkste überhaupt. Und zum Schluss, was fehlt.
 *
 * Fünf Sätze sind das Höchste. Der sechste würde nicht gelesen, und ein Satz,
 * der nicht gelesen wird, verdrängt einen, der gelesen worden wäre.
 */
import { ADHS_GRUPPEN } from './mittel.js';
import { KEIN_ORT } from './zeitprofil.js';

/** Mehr als das liest niemand, und mehr braucht auch niemand. */
const HOECHSTENS = 5;

/*
 * Die Gruppen aus js/mittel.js, die wegen Magen- und Bauchbeschwerden
 * genommen werden. Nur für sie steht oben ein Satz, wenn sich die Bauchwerte
 * darunter nicht geändert haben (siehe 6.).
 */
const MAGEN_GRUPPEN = ['ppi', 'h2', 'antazida', 'alginat', 'sucralfat', 'prokinetika', 'pflanzlich', 'heilerde'];

/**
 * Aus den fertigen Befunden ein paar Sätze machen.
 *
 * Alle Angaben sind freiwillig; was fehlt, wird übersprungen. Genau deshalb
 * kann diese Funktion auch nichts kaputt machen: Sie erfindet keinen Befund,
 * sie wählt unter den vorhandenen.
 *
 * @param {object} q
 * @param {object[]} [q.warnungen]  aus bildLesen(): { name, dringlichkeit }
 * @param {object} [q.trend]        aus trend(): { pruefbar, richtung, ... }
 * @param {object[]} [q.funde]      { name, differenz, faelle, gegenFaelle, urteil,
 *                                  menge, mengeSatz } – urteil ist das der
 *                                  Schichtung, menge das der Dosisrechnung
 * @param {object[]} [q.spaet]      { name, fensterName }
 * @param {object[]} [q.wechsel]    { name, phase }
 * @param {object} [q.zeit]         aus zeitBild()
 * @param {object[]} [q.mittel]     { name, gruppe, urteil, satz }
 * @param {object} [q.versuch]      { was, wort }
 * @param {object} [q.gewicht]      aus gewichtsBild(): { warnung, satz }
 * @param {object} [q.luecke]       { satz }
 * @param {number} [q.notierteTage]
 * @param {object[]} [q.paare]      Hinweise der Stufe A aus js/zusammen.js: { id }
 */
export function wasSacheIst(q = {}) {
  const saetze = [];
  const sag = (art, text) => saetze.push({ art, text });

  /*
   * 1. Warnzeichen. Immer, und immer zuerst.
   *
   * Sie sind der einzige Teil dieser App, bei dem ein übersehener Befund
   * teurer ist als ein überflüssiger Hinweis.
   *
   * Der Wortlaut folgt der Warnkarte (warnTeil in js/app.js) und den Stufen in
   * js/bild.js: „sofort" heißt nicht auf einen Termin warten – Notaufnahme
   * oder 112; „zeitnah" heißt zeitnah abklären. Ein „bald … Termin" für ein
   * Zeichen der Stufe „sofort" wäre eine Entwarnung, wo die Quellen Eile
   * verlangen:
   *   - gesund.bund.de, Herzinfarkt (Stand 28.08.2020), „Was sind Anzeichen
   *     …": bei Schmerzen im Brustbereich „immer den Notruf 112 wählen"
   *     (ausdrücklich nicht den Bereitschaftsdienst).
   *   - gesund.bund.de, Schlaganfall (Stand 16.12.2022): „schnell den Notruf
   *     112 zu wählen. Man sollte keinesfalls darauf warten, dass die
   *     Beschwerden wieder verschwinden."
   *   - gesund.bund.de, Meningitis (Stand 10.01.2025): „sollte man sofort ein
   *     Krankenhaus aufsuchen".
   *   - EMA, Produktinformation PANTOZOL Control (Packungsbeilage, Abschnitt
   *     2): „Informieren Sie sofort Ihren Arzt" u. a. bei Erbrechen von Blut,
   *     schwarzem oder teerigem Stuhl und Schmerzen in der Brust.
   * Für „zeitnah": gesund.bund.de, Magengeschwür (Stand 07.01.2022,
   * „Komplikationen"): Zeichen „zeitnah ärztlich abklären lassen"; Darmkrebs
   * (Stand 28.05.2026): bei Blut im Stuhl „nicht bis zum Vorsorgetermin
   * warten".
   *
   * Es bleiben dieselben drei Zeichen wie bisher (die Liste aus warnungen() ist
   * nach Dringlichkeit sortiert). Die Zeichen der Stufe „sofort" stehen im
   * Satz mit der 112, die übrigen dahinter für sich – sonst stünde ein
   * „zeitnah" unter „Notaufnahme" oder ein „sofort" unter „zeitnah".
   */
  const warn = q.warnungen || [];
  if (warn.length) {
    // Die Namen, wie sie im Bogen stehen: Klein geschrieben stünde da
    // „schwarzer, klebriger stuhl"; und weil manche Namen selbst ein Komma
    // haben, trennt ein Semikolon.
    const namen = (liste) => liste.map((w) => w.name).join('; ');
    const sofort = warn.filter((w) => w.dringlichkeit === 'sofort').slice(0, 3);
    const zeitnah = warn.filter((w) => w.dringlichkeit !== 'sofort').slice(0, 3 - sofort.length);
    sag('warnung', sofort.length
      ? `Im Tagebuch stehen Warnzeichen, die heute abgeklärt gehören: ${namen(sofort)}. `
        + 'Dafür nicht auf einen Termin warten – Notaufnahme oder 112. Das ist keine '
        + `Diagnose.${zeitnah.length ? ` Zeitnah abzuklären ist außerdem: ${namen(zeitnah)}.` : ''}`
      : `Im Tagebuch stehen Dinge, die zeitnah ärztlich abgeklärt gehören: ${namen(zeitnah)}. `
        + 'Das ist keine Diagnose.');
  }

  /*
   * 1b. Die Waage – direkt hinter den Warnzeichen, weil sie eines ist.
   *
   * Sie steht vor der Richtung und vor jedem Auslöser, und zwar aus einem
   * Grund: Ein unbeabsichtigter Gewichtsverlust gehört zu den Zeichen, bei
   * denen ärztlicher Rat gesucht werden soll und eine Malignität auszuschließen
   * ist (EMA, Produktinformation PANTOZOL Control, Fachinformation 4.4).
   * Welche Zutat auffällt, ist daneben zweitrangig.
   */
  if (q.gewicht && q.gewicht.warnung) {
    sag('warnung', q.gewicht.satz);
  }

  /*
   * 1c. Zwei Mittel, die laut Fachinformation zusammen eine Gegenanzeige sind
   * (Stufe A in js/zusammen.js) – gleich nach den Warnzeichen.
   *
   * Es ist kein Befund aus dem Tagebuch, sondern eine Frage, die in die
   * Sprechstunde gehört: Body Check sieht beide Mittel in einer Liste, auch
   * wenn sie aus verschiedenen Praxen kommen oder eines ohne Rezept gekauft
   * ist. Je Art ein Satz, auch bei mehreren Paaren; die Namen stehen unten
   * bei den Mitteln. Er sagt nie, etwas wegzulassen.
   *
   * Belegt ist die Gegenanzeige nur für Medikinet retard und Medikinet adult
   * (Fachinformation www.fachinfo.de/fi/pdf/009621, Stand Dezember 2025, und
   * /013066, Stand September 2025, je 4.3 und 4.5): genannt sind dort
   * H2-Rezeptorenblocker, Protonenpumpen-Inhibitoren und Antazida. Ritalin LA
   * hat laut Fachinformation ebenfalls „zwei verschiedene Arten von
   * Kügelchen" (www.fachinfo.de/fi/pdf/010445, Stand September 2025, 4.2),
   * dort steht aber keine solche Gegenanzeige – deshalb stehen die beiden
   * Namen im Satz. Und er nennt die Gruppen so, wie die Fachinformation sie
   * nennt, statt „Säureblocker": Ob ein eingetragenes Mittel (etwa ein reines
   * Alginat) dazugehört, sagt er damit nicht, das klären Praxis oder
   * Apotheke.
   */
  const paarIds = new Set((q.paare || []).map((p) => p && p.id));
  if (paarIds.has('W1')) {
    sag('paar', 'Eingetragen sind Methylphenidat als Kapsel mit zweierlei Kügelchen (Medikinet '
      + 'retard, Medikinet adult) und ein Mittel gegen Magensäure. In der Fachinformation dieser '
      + 'Kapseln steht die Behandlung mit H2-Blockern, Protonenpumpenhemmern oder Antazida unter '
      + 'den Gegenanzeigen; das gehört in Praxis oder Apotheke geprüft, ohne etwas eigenmächtig '
      + 'wegzulassen.');
  }
  if (paarIds.has('W1u')) {
    sag('paar', 'Eingetragen sind Methylphenidat ohne Angabe der Form und ein Mittel gegen '
      + 'Magensäure. Bei manchen Kapseln (Medikinet retard, Medikinet adult) steht die Behandlung '
      + 'mit H2-Blockern, Protonenpumpenhemmern oder Antazida in der Fachinformation unter den '
      + 'Gegenanzeigen; die Form gehört geklärt.');
  }

  /*
   * 2. Wird es besser oder schlechter?
   *
   * Die Frage, die sich jeder zuerst stellt und die aus dem Kopf niemand
   * beantwortet – „mal so, mal so" ist die ehrliche und die nutzloseste
   * Antwort.
   */
  const t = q.trend;
  if (t && t.pruefbar) {
    const wort = {
      besser: 'Zuletzt wurde es besser',
      schlechter: 'Zuletzt wurde es schlechter',
      gleich: 'Zuletzt hat sich nichts Deutliches geändert',
    }[t.richtung] || 'Zuletzt hat sich nichts Deutliches geändert';
    sag('trend', `${wort}: ${t.jetzt.schnitt.toFixed(1)} im Mittel über die `
      + `letzten ${t.jetzt.tage} notierten Tage gegen ${t.davor.schnitt.toFixed(1)} `
      + `über die ${t.davor.tage} davor.`);
  }

  /*
   * 3. Der stärkste Befund, der die Prüfung überstanden hat.
   *
   * „Überstanden" heißt: Er ist auch dann noch da, wenn man nur Tage mit
   * gleicher Anspannung, gleichem Schlaf und gleicher Zyklusphase miteinander
   * vergleicht. Ein Fund, der das nicht übersteht, gehört nicht in den ersten
   * Absatz – und er steht unten trotzdem, mit seinem Grund.
   */
  const haltbar = (q.funde || []).filter((f) => f.urteil === 'haelt' || f.urteil === 'unklar');
  const bester = haltbar.sort((a, b) => b.differenz - a.differenz)[0];
  if (bester) {
    const gehalten = bester.urteil === 'haelt'
      ? ' Der Unterschied bleibt auch bestehen, wenn man nur Tage mit gleicher '
        + 'Anspannung, gleichem Schlaf und gleicher Zyklusphase vergleicht.'
      : ' Ob das an den Umständen liegt, ließ sich noch nicht prüfen.';
    /*
     * Und wenn es eine Menge gibt, gehört sie in denselben Satz.
     *
     * „Zwiebeln fallen auf" führt zum Streichen; „Zwiebeln fallen als
     * Hauptzutat auf, als Würze nicht" führt zu einer Faustregel, die jemand
     * auch in vier Wochen noch einhält. Der Zusatz ist deshalb keine
     * Verfeinerung, sondern der Unterschied zwischen einer brauchbaren und
     * einer schädlichen Auskunft.
     *
     * Ohne Prüfung kleinerer Mengen sagt der Satz nur, dass sie fehlt – und
     * keine Einschätzung zum Weglassen: Ob es auf die Menge ankommt, hängt an
     * der Ursache, die das Tagebuch nicht kennt. Bei einer Laktoseintoleranz
     * werden „bestimmte Mengen" vertragen, bei einer Nahrungsmittelallergie
     * reichen „bereits kleine Mengen" (gesund.bund.de, Laktoseintoleranz,
     * Stand 23.02.2026, „Was ist …"; Nahrungsmittelallergie, Stand 27.05.2024).
     */
    const menge = bester.menge === 'schwelle'
      ? ` Es kommt dabei auf die Menge an: ${bester.mengeSatz}`
      : (bester.menge === 'ab-hier'
        ? ' Ob kleinere Mengen anders wirken, lässt sich aus dem Tagebuch noch nicht sagen.'
        : '');
    sag('fund', `Am deutlichsten fällt ${bester.name} auf: danach war es im `
      + `Mittel um ${bester.differenz.toFixed(1)} Stufen schlechter `
      + `(${bester.faelle} Mahlzeiten damit, ${bester.gegenFaelle} ohne).${gehalten}${menge}`);
  }

  /*
   * 4. Was der Schnitt versteckt.
   *
   * Zwei Befunde, die es nur gibt, weil jemand genauer hingesehen hat – und
   * die deshalb auch oben stehen dürfen: der Auslöser, der erst nach dem
   * Fenster wirkt, und der, dessen Wirkung mit dem Zyklus wechselt.
   *
   * Beim Zyklus nur, was gerechnet ist: je Phase Mahlzeiten mit und ohne den
   * Auslöser (phasenWirkung in js/wechselwirkung.js), ohne Mengen. Früher
   * stand hier, das spreche „eher für eine wechselnde Empfindlichkeit als für
   * eine Unverträglichkeit" – das belegt keine Quelle, und laut gesund.bund.de
   * können eine Nahrungsmittel-Unverträglichkeit und ein Reizdarm auch
   * zugleich vorliegen (Reizdarmsyndrom, Stand 28.08.2024, „Wie wird …
   * festgestellt?"). Wie im Bericht (js/bericht.js, WIRKUNG WECHSELT MIT DER
   * ZYKLUSPHASE).
   */
  const w = (q.wechsel || [])[0];
  if (w) {
    sag('wechsel', `${w.name} fällt nicht in jeder Zyklusphase gleich auf, sondern vor allem in `
      + `der Phase „${w.phase}". Die Phasen sind geschätzt; was dahintersteckt, lässt sich `
      + 'daraus nicht ablesen.');
  }
  /*
   * Der späte Auslöser und der zeitliche Schwerpunkt: nur die Stunden. Früher
   * folgte ein Ort („so spät entsteht Beschwerde im Dickdarm", „das deutet auf
   * Magen und Speiseröhre als Ort"); die Quellen widersprechen einer festen
   * Zuordnung (Belege im Kopf von js/zeitprofil.js).
   */
  const sp = (q.spaet || [])[0];
  if (sp && saetze.length < HOECHSTENS) {
    sag('spaet', `${sp.name} fällt im eingestellten Zeitfenster nach dem Essen nicht auf, `
      + `wohl aber ${sp.fensterName}.`);
  }

  /*
   * 5. Wann es überhaupt kommt.
   *
   * Nur, wenn ein Schwerpunkt da ist. „Verteilt sich" ist unten eine
   * brauchbare Zeile und oben eine verschenkte.
   */
  if (q.zeit && q.zeit.pruefbar && q.zeit.schwerpunkt && saetze.length < HOECHSTENS) {
    const teil = q.zeit.teile.find((x) => x.id === q.zeit.schwerpunkt);
    sag('zeit', `Die meisten Beschwerden nach dem Essen kommen ${teil.name}. ${KEIN_ORT}`);
  }

  /*
   * 6. Ob sich unter einem Magenmittel etwas geändert hat.
   *
   * Bleiben die Bauchwerte unter einem Magenmittel, wie sie waren, ist das
   * für die Sprechstunde eine eigene Auskunft – und niemand rechnet das im
   * Kopf nach. Was das für die Ursache heißt, sagt die App nicht: Die
   * Fachinformationen ziehen daraus keinen Schluss, sie nennen weitere
   * Untersuchungen bzw. den Weg zum Arzt (Antra MUPS, www.fachinfo.de/fi/pdf/
   * 004171, Stand Mai 2024, 4.2: wenn die Kontrolle der Symptome nach einer
   * vierwöchigen Behandlung nicht erreicht wurde, „werden weitere
   * Untersuchungen empfohlen"; EMA, PANTOZOL Control, Fachinformation 4.2:
   * nach 2 Wochen ohne Linderung „einen Arzt zu konsultieren"). Und auch bei
   * endoskopisch gesicherter Refluxkrankheit war in Studien nach 28 Tagen
   * nicht jeder beschwerdefrei (PANTOZOL Control, Fachinformation 5.1:
   * vollständige Linderung bei „68,1 % bis 92,3 %").
   *
   * Der Satz selbst: Packungsbeilagen von Magenmitteln ohne Rezept nennen
   * Beschwerden, die nicht besser werden, als Anlass für den Weg zum Arzt –
   * PANTOZOL Control (EMA-Produktinformation, Packungsbeilage): „Wenn Sie sich
   * nach 2 Wochen nicht besser oder gar schlechter fühlen, wenden Sie sich an
   * Ihren Arzt."; Iberogast Classic (Gebrauchsinformation, Stand September
   * 2023): „Wenn Sie sich nach 1 Woche nicht besser … fühlen". Deshalb
   * „manche", und deshalb eine Frage, kein Rat.
   */
  // Nur für Mittel, die wegen des Bauchs genommen werden. Verglichen wird
  // immer der Bauchwert (js/ansprechen.js); für ein Schmerzmittel, ein
  // Triptan oder ein ADHS-Mittel hieße „unverändert" nichts über das Mittel
  // und läse sich trotzdem wie ein Urteil darüber.
  const ohneWirkung = (q.mittel || []).find((m) => m.urteil === 'unveraendert'
    && MAGEN_GRUPPEN.includes(m.gruppe) && !ADHS_GRUPPEN.includes(m.gruppe));
  if (ohneWirkung && saetze.length < HOECHSTENS) {
    sag('mittel', `Unter ${ohneWirkung.name} waren die Bauchwerte ähnlich wie in der Zeit davor. `
      + 'Manche Packungsbeilagen von Magenmitteln nennen Beschwerden, die nicht besser werden, '
      + 'als Anlass für ein Gespräch mit Ärztin oder Arzt – eine Frage für die Sprechstunde, kein '
      + 'Grund, selbst etwas abzusetzen.');
  }

  /*
   * 7. Und was fehlt.
   *
   * Der letzte Satz gehört dem, was noch nicht beantwortbar ist. Ohne ihn
   * liest sich der Absatz vollständiger, als er ist.
   */
  if (q.luecke && q.luecke.satz && saetze.length < HOECHSTENS) {
    sag('luecke', q.luecke.satz);
  }

  /*
   * Und wenn gar nichts zusammenkam.
   *
   * Dann steht hier kein beruhigender Satz. „Alles unauffällig" wäre die
   * bequemste Lüge dieser App: Was nicht erhoben wurde, ist nicht unauffällig,
   * sondern nicht erhoben.
   *
   * Gezählt wird dabei nur, was wirklich eine Auskunft ist. Der Hinweis, was
   * noch fehlt, ist keine – er sagt gerade, dass etwas fehlt. Stünde er
   * alleine da, läse sich die Karte wie eine Antwort, wo keine ist.
   */
  // Der Hinweis zu zwei Mitteln ist ebenso wenig eine Auskunft über das
  // Tagebuch: Er steht dann vor dem Satz, dass die Zahlen noch nicht reichen.
  const auskunft = saetze.filter((x) => x.art !== 'luecke' && x.art !== 'paar');
  if (!auskunft.length) {
    return {
      genug: false,
      saetze: [...saetze.filter((x) => x.art === 'paar'), {
        art: 'wenig',
        text: q.notierteTage
          ? `Aus ${q.notierteTage} notierten Tagen lässt sich noch nichts `
            + 'Belastbares sagen. Das heißt nicht, dass nichts da ist – es heißt, '
            + 'dass die Zahlen dafür noch nicht reichen.'
          : 'Noch ist nichts eingetragen. Sobald ein paar Tage beisammen sind, '
            + 'steht hier, was sich daraus ergibt.',
      // Der Hinweis, was am meisten hülfe, darf bleiben – er ist dann der
      // einzige nützliche Satz, den es zu sagen gibt.
      }, ...saetze.filter((x) => x.art !== 'paar')],
    };
  }

  return { genug: true, saetze: saetze.slice(0, HOECHSTENS) };
}
