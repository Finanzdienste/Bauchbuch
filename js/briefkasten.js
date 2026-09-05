/*
 * Die einzige Stelle dieser App, die nach draußen spricht.
 *
 * Bis hierher galt: Die App sendet nichts, punktum. Das war einfach zu prüfen
 * und einfach zu erklären, und es hatte einen Preis, den niemand sah – der
 * Reiter „Ideen" war eine Sackgasse. Wer etwas eintrug, hatte es
 * *aufgeschrieben*; angekommen war es nirgends, solange niemand es von Hand
 * weiterreichte. Der Umweg über das Teilen-Menü half, aber ein Umweg bleibt
 * ein Umweg, und Umwege werden nicht gegangen.
 *
 * DIE ZUSAGE IST DESHALB NICHT WEG, SONDERN GENAUER:
 *
 *   vorher   „Die App sendet nichts."
 *   jetzt    „Die App sendet nichts außer den Ideen, die du selbst eintippst
 *             und selbst abschickst."
 *
 * Was unverändert gilt und der eigentliche Grund für all das war:
 * **Gesundheitsdaten verlassen dieses Gerät nie.** Kein Eintrag, kein Tag,
 * keine Auswertung, kein Bericht, keine Kennung, keine Zählung von Aufrufen.
 *
 * Und das ist keine Absichtserklärung:
 *
 *   * Diese Datei ist die einzige im Projekt, in der eine fremde Adresse
 *     stehen darf. tools/pruefung/keine-leitung.py lässt sie hier zu und
 *     nirgends sonst.
 *   * `schicken()` bekommt einen fertigen Text übergeben und kommt an den
 *     Speicher gar nicht heran – dieses Modul importiert store.js nicht.
 *   * tests/test-still.mjs schreibt im laufenden Browser jede Anfrage mit:
 *     Erlaubt ist genau ein POST an genau diese Adresse, und nur nachdem
 *     jemand den Knopf gedrückt hat. Der Rumpf wird gegen ein volles Tagebuch
 *     gehalten – taucht daraus auch nur ein Wort auf, scheitert der Test.
 *   * tests/test-schweigen.mjs klickt die ganze App mit Tagebuchdaten durch
 *     und verlangt: null Anfragen.
 *
 * Von selbst passiert nie etwas. Kein Wiederholen im Hintergrund, keine
 * Warteschlange, die später doch noch sendet. Geht es nicht, sagt die App das
 * und der Text bleibt stehen – dann entscheidet wieder ein Mensch.
 */

/**
 * Wohin die Ideen gehen.
 *
 * Ein eigener kleiner Kasten (Finanzdienste/Briefkasten), der einen Text
 * entgegennimmt und sonst nichts kann: kein Feld für ein Tagebuch, keins für
 * einen Namen, keins für eine Kennung. Er speichert den Wortlaut und wann er
 * ankam. Mehr gibt es dort nicht.
 */
export const KASTEN = 'https://briefkasten.tobias-kruse-184.workers.dev/idee';

/** Länger nimmt der Kasten nicht an. */
export const MAX_ZEICHEN = 2000;

/**
 * Einen Text abschicken.
 *
 * Wirft mit einer Meldung, die man jemandem zeigen kann – die Anzeige gibt sie
 * unverändert weiter. „Fehler 500" hilft niemandem; „gerade kein Netz" schon,
 * weil daraus folgt, was man tun kann.
 *
 * @param {string} text  der fertige Ideentext, sonst nichts
 * @returns {Promise<void>}
 */
export async function schicken(text) {
  const inhalt = String(text || '').trim();
  if (!inhalt) throw new Error('Da steht noch nichts.');
  if (inhalt.length > MAX_ZEICHEN) {
    throw new Error(`Das ist zu lang – höchstens ${MAX_ZEICHEN} Zeichen.`);
  }

  /*
   * Abbruch nach zwanzig Sekunden.
   *
   * Ohne ihn hängt der Knopf in einem Funkloch, bis der Browser irgendwann
   * von selbst aufgibt – und solange weiß niemand, ob es geklappt hat. Lieber
   * früh und deutlich scheitern.
   */
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), 20000);

  let antwort;
  try {
    antwort = await fetch(KASTEN, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Genau ein Feld. Es gibt hier nichts anderes zu schicken.
      body: JSON.stringify({ text: inhalt }),
      signal: abbruch.signal,
    });
  } catch {
    throw new Error('Kein Netz. Der Text bleibt stehen – später noch einmal.');
  } finally {
    clearTimeout(uhr);
  }

  if (antwort.ok) return;

  // Der Kasten begründet seine Absagen; wenn er es tut, hat er den besseren
  // Satz, weil er weiß, woran es lag.
  let grund = '';
  try {
    const d = await antwort.json();
    grund = d && d.fehler ? String(d.fehler) : '';
  } catch { /* dann eben ohne */ }
  throw new Error(grund || `Ging nicht (${antwort.status}).`);
}
