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

/** Mehr als das liest niemand, und mehr braucht auch niemand. */
const HOECHSTENS = 5;

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
 * @param {object[]} [q.spaet]      { name, fensterName, ort }
 * @param {object[]} [q.wechsel]    { name, phase }
 * @param {object} [q.zeit]         aus zeitBild()
 * @param {object[]} [q.mittel]     { name, urteil, satz }
 * @param {object} [q.versuch]      { was, wort }
 * @param {object} [q.luecke]       { satz }
 * @param {number} [q.notierteTage]
 */
export function wasSacheIst(q = {}) {
  const saetze = [];
  const sag = (art, text) => saetze.push({ art, text });

  /*
   * 1. Warnzeichen. Immer, und immer zuerst.
   *
   * Sie sind der einzige Teil dieser App, bei dem ein übersehener Befund
   * teurer ist als ein überflüssiger Hinweis.
   */
  const warn = q.warnungen || [];
  if (warn.length) {
    const sofort = warn.filter((w) => w.dringlichkeit === 'sofort');
    const liste = warn.slice(0, 3).map((w) => w.name.toLowerCase()).join(', ');
    sag('warnung', sofort.length
      ? `Im Tagebuch stehen Dinge, die ärztlich abgeklärt gehören, und zwar `
        + `bald: ${liste}. Das ist keine Diagnose, sondern der Grund, einen `
        + 'Termin zu machen.'
      : `Im Tagebuch stehen Dinge, die ärztlich abgeklärt gehören – beim `
        + `nächsten Termin anzusprechen: ${liste}.`);
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
     */
    const menge = bester.menge === 'schwelle'
      ? ` Es kommt dabei auf die Menge an: ${bester.mengeSatz}`
      : (bester.menge === 'ab-hier'
        ? ' Ob kleinere Mengen davon durchgehen, ist noch nicht geprüft – ganz '
          + 'weglassen wäre womöglich mehr als nötig.'
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
   */
  const w = (q.wechsel || [])[0];
  if (w) {
    sag('wechsel', `${w.name} wirkt nicht immer gleich, sondern vor allem in `
      + `der Phase „${w.phase}". Dieselbe Menge, andere Wirkung – das spricht `
      + 'eher für eine wechselnde Empfindlichkeit als für eine Unverträglichkeit.');
  }
  const sp = (q.spaet || [])[0];
  if (sp && saetze.length < HOECHSTENS) {
    sag('spaet', `${sp.name} fällt im üblichen Zeitfenster nicht auf, wohl aber `
      + `${sp.fensterName.toLowerCase()} – so spät entsteht Beschwerde im `
      + `${sp.ort}, nicht im Magen.`);
  }

  /*
   * 5. Wann es überhaupt kommt.
   *
   * Nur, wenn ein Schwerpunkt da ist. „Verteilt sich" ist unten eine
   * brauchbare Zeile und oben eine verschenkte.
   */
  if (q.zeit && q.zeit.pruefbar && q.zeit.schwerpunkt && saetze.length < HOECHSTENS) {
    const teil = q.zeit.teile.find((x) => x.id === q.zeit.schwerpunkt);
    sag('zeit', `Die meisten Beschwerden kommen ${teil.name.toLowerCase()} – das `
      + `deutet auf ${teil.ort} als Ort.`);
  }

  /*
   * 6. Ob die Mittel etwas bewirken.
   *
   * Das Ausbleiben einer Wirkung ist hier der wertvollere Befund: Ein
   * Säureblocker, der nach Wochen nichts tut, spricht gegen die Säure als
   * Ursache – und niemand rechnet das im Kopf nach.
   */
  const ohneWirkung = (q.mittel || []).find((m) => m.urteil === 'unveraendert');
  if (ohneWirkung && saetze.length < HOECHSTENS) {
    sag('mittel', `${ohneWirkung.name} hat in dieser Zeit nichts geändert. Das `
      + 'ist selbst ein Befund und gehört in die Sprechstunde – nicht als Grund, '
      + 'etwas abzusetzen, sondern als Frage.');
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
  const auskunft = saetze.filter((x) => x.art !== 'luecke');
  if (!auskunft.length) {
    return {
      genug: false,
      saetze: [{
        art: 'wenig',
        text: q.notierteTage
          ? `Aus ${q.notierteTage} notierten Tagen lässt sich noch nichts `
            + 'Belastbares sagen. Das heißt nicht, dass nichts da ist – es heißt, '
            + 'dass die Zahlen dafür noch nicht reichen.'
          : 'Noch ist nichts eingetragen. Sobald ein paar Tage beisammen sind, '
            + 'steht hier, was sich daraus ergibt.',
      // Der Hinweis, was am meisten hülfe, darf bleiben – er ist dann der
      // einzige nützliche Satz, den es zu sagen gibt.
      }, ...saetze],
    };
  }

  return { genug: true, saetze: saetze.slice(0, HOECHSTENS) };
}
