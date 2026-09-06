/*
 * Den Bildschirm wach halten, solange die Atemübung läuft
 *
 * DAS EIGENTLICHE PROBLEM
 *
 * Die Übung führt jemand mit geschlossenen Augen durch, das Telefon liegt
 * daneben. Nach zwanzig, dreißig Sekunden schaltet der Bildschirm ab – und
 * damit friert das Betriebssystem die Zeitgeber dieser Seite ein. Der nächste
 * Ton kommt zu spät oder gar nicht, und die Übung, die gerade beim Ausatmen
 * war, steht still. Genau in dem Moment, in dem sie am ehesten wirkt.
 *
 * Der erste Gedanke war, den Phasenwechsel als Benachrichtigung zu schicken.
 * Das löst es nicht, sondern beschreibt es nur aus einer anderen Richtung: Eine
 * Benachrichtigung, die aus einem eingefrorenen Zeitgeber kommt, kommt genauso
 * spät. Die Frage ist nicht, wie die Nachricht herauskommt, sondern wie die Uhr
 * weiterläuft.
 *
 * DIE ANTWORT
 *
 * `navigator.wakeLock` – eine Bitte an das Betriebssystem, den Bildschirm
 * anzulassen. Damit läuft alles weiter: der Kreis, der Ton, die Zeitrechnung.
 * Man kann das Telefon weglegen und die Augen zumachen, und genau darum ging es.
 *
 * DREI DINGE, DIE MAN DABEI FALSCH MACHEN KANN
 *
 *   1. Sie nicht wieder loslassen. Eine Sperre, die nach der Übung stehen
 *      bleibt, hält den Bildschirm für immer an und leert den Akku. Sie wird
 *      deshalb an *jedem* Ende der Übung gelöst – auch beim Abbrechen.
 *   2. Vergessen, dass das Betriebssystem sie von sich aus wegnimmt. Sobald
 *      die Seite in den Hintergrund geht, ist die Sperre weg und kommt nicht
 *      von allein zurück; wer beim Zurückkehren nicht neu bittet, hat sie
 *      still verloren.
 *   3. Sich darauf verlassen. Es ist eine Bitte, keine Garantie: bei niedrigem
 *      Akku, im Stromsparmodus oder in einem Browser ohne diese Schnittstelle
 *      wird sie abgelehnt. Deshalb gibt jede Funktion hier zurück, ob es
 *      geklappt hat, und die Anzeige sagt es weiter – statt zu versprechen,
 *      was sie nicht halten kann.
 */

let sperre = null;

/**
 * Den Bildschirm anlassen. Gibt zurück, ob es geklappt hat.
 *
 * Muss aus einer Nutzergeste heraus aufgerufen werden – „Anfangen" ist diese
 * Geste.
 */
export async function wachHalten() {
  if (sperre) return true;
  try {
    if (!navigator.wakeLock || !navigator.wakeLock.request) return false;
    sperre = await navigator.wakeLock.request('screen');
    // Das Betriebssystem kann jederzeit loslassen. Dann darf hier keine
    // Leiche stehen bleiben, sonst hält sich die App für wach und ist es nicht.
    sperre.addEventListener('release', () => { sperre = null; });
    return true;
  } catch {
    sperre = null;
    return false;
  }
}

/** Wieder loslassen. Ohne das bleibt der Bildschirm an, bis der Akku leer ist. */
export async function wachLoslassen() {
  const s = sperre;
  sperre = null;
  if (!s) return;
  try {
    await s.release();
  } catch { /* schon weg – dann ist ja gut */ }
}

/** Ob die Sperre gerade steht. */
export function istWach() {
  return !!sperre;
}
