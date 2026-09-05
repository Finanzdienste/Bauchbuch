/*
 * Die Sicherung mit Passwort.
 *
 * Der wundeste Punkt dieser App hatte nie etwas mit Medizin zu tun: Die
 * Sicherung war eine offene JSON-Datei im Download-Ordner. Ein Tagebuch über
 * den Körper eines Menschen, im Klartext, auf einem Gerät, das man verleiht,
 * verliert oder irgendwann verkauft. Alles andere hier ist gegen Übertragung
 * geschützt – und die einzige Kopie lag frei herum.
 *
 * Verschlüsselt wird im Browser selbst, mit dem, was er ohnehin mitbringt:
 *
 *   PBKDF2  macht aus dem Passwort einen Schlüssel und ist dabei absichtlich
 *           langsam. 250 000 Runden kosten auf einem Handy ein bis zwei
 *           Sekunden – beim Sichern einmal, beim Raten eines Passworts
 *           ebenfalls, und genau darauf kommt es an.
 *   AES-GCM verschlüsselt und versiegelt in einem: Wer an der Datei etwas
 *           ändert, bekommt sie nicht mehr auf, statt stillschweigend Unsinn
 *           zu entschlüsseln.
 *
 * Salz und Startwert stehen unverschlüsselt in der Datei. Das ist richtig so –
 * sie sind keine Geheimnisse, sie sorgen nur dafür, dass zwei Sicherungen mit
 * demselben Passwort verschieden aussehen und dass eine vorberechnete Liste
 * nichts nützt.
 *
 * ZWEI EHRLICHKEITEN, DIE IN DIE ANZEIGE GEHÖREN:
 *
 *   * **Passwort vergessen heißt Sicherung weg.** Es gibt keine Hintertür,
 *     kein Zurücksetzen, niemanden zum Fragen. Das ist der Preis dafür, dass
 *     es auch für alle anderen keine gibt.
 *   * **Ohne sichere Adresse gibt es das nicht.** `crypto.subtle` steht nur in
 *     einem sicheren Kontext zur Verfügung – über https oder auf dem eigenen
 *     Rechner. Die Ein-Datei-Fassung, die per Doppelklick aus dem Download-
 *     Ordner startet (file://), hat keinen. Dort bleibt nur die offene
 *     Sicherung, und die App sagt das, statt einen Knopf anzubieten, der
 *     nichts täte.
 *
 * Kein Netzwerk, keine Bibliothek, keine Abhängigkeit: WebCrypto ist im
 * Browser. tools/pruefung/keine-leitung.py bleibt damit zufrieden.
 */

/** Kennzeichen im Dateikopf, damit das Einlesen die Fassung erkennt. */
export const TRESOR_ART = 'bauchbuch-tresor';
export const TRESOR_FASSUNG = 1;

/*
 * Runden für die Schlüsselableitung.
 *
 * Hoch genug, dass Durchprobieren teuer wird, niedrig genug, dass ein altes
 * Handy nicht eine halbe Minute steht. Die Zahl steht in der Datei mit drin:
 * Wird sie hier später erhöht, lassen sich ältere Sicherungen trotzdem noch
 * öffnen.
 */
const RUNDEN = 250000;

/** Steht die Verschlüsselung in diesem Browser überhaupt zur Verfügung? */
export function tresorMoeglich() {
  try {
    return !!(globalThis.crypto && globalThis.crypto.subtle
      && typeof globalThis.crypto.subtle.deriveKey === 'function');
  } catch {
    return false;
  }
}

const roher = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/*
 * Bytes als Text und zurück.
 *
 * base64 statt einer Zahlenliste: Die Datei wird sonst dreimal so groß, und
 * sie soll sich noch per Nachricht verschicken lassen. In Stücken umgewandelt,
 * weil String.fromCharCode mit einem Argument je Byte bei ein paar hunderttausend
 * Bytes den Aufrufstapel sprengt – genau bei der großen Sicherung also, bei
 * der es darauf ankommt.
 */
function zuBase64(bytes) {
  let s = '';
  const stueck = 0x8000;
  for (let i = 0; i < bytes.length; i += stueck) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + stueck));
  }
  return btoa(s);
}

function ausBase64(text) {
  const roh = atob(text);
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

async function schluessel(passwort, salz, runden) {
  const roh = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passwort), 'PBKDF2', false, ['deriveKey'],
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salz, iterations: runden, hash: 'SHA-256' },
    roh,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Klartext zu einer Tresordatei.
 *
 * Zurück kommt wieder JSON – lesbar genug, dass man sieht, was es ist, und
 * dass ein Fehlversuch beim Einlesen erklärbar bleibt. Was drinsteht, ist
 * ohne Passwort trotzdem nichts.
 */
export async function verschluesseln(klartext, passwort) {
  if (!tresorMoeglich()) throw new Error('Dieser Browser kann nicht verschlüsseln.');
  if (!passwort) throw new Error('Kein Passwort angegeben.');
  const salz = roher(16);
  const iv = roher(12);
  const k = await schluessel(passwort, salz, RUNDEN);
  const daten = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, k, new TextEncoder().encode(klartext),
  ));
  return JSON.stringify({
    art: TRESOR_ART,
    fassung: TRESOR_FASSUNG,
    hinweis: 'Verschlüsselte Bauchbuch-Sicherung. Ohne das Passwort ist hier '
      + 'nichts zu holen – auch nicht für den, der sie geschrieben hat.',
    verfahren: 'PBKDF2-SHA256/AES-GCM',
    runden: RUNDEN,
    salz: zuBase64(salz),
    iv: zuBase64(iv),
    daten: zuBase64(daten),
  }, null, 2);
}

/** Ist das eine Tresordatei? Wird beim Einlesen gebraucht, bevor gefragt wird. */
export function istTresor(text) {
  try {
    const o = JSON.parse(text);
    return !!o && o.art === TRESOR_ART && typeof o.daten === 'string';
  } catch {
    return false;
  }
}

/**
 * Tresordatei zurück zu Klartext.
 *
 * Ein falsches Passwort und eine beschädigte Datei sehen für AES-GCM gleich
 * aus – beides scheitert an der Prüfsumme. Gemeldet wird deshalb das
 * Wahrscheinlichere, aber mit beiden Möglichkeiten: Wer sein Passwort für
 * richtig hält, soll nicht denken, er habe es vergessen.
 */
export async function entschluesseln(text, passwort) {
  if (!tresorMoeglich()) throw new Error('Dieser Browser kann nicht entschlüsseln.');
  const o = JSON.parse(text);
  if (!o || o.art !== TRESOR_ART) throw new Error('Das ist keine verschlüsselte Sicherung.');
  const runden = Number.isFinite(o.runden) && o.runden > 0 ? o.runden : RUNDEN;
  const k = await schluessel(passwort, ausBase64(o.salz), runden);
  let klar;
  try {
    klar = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ausBase64(o.iv) }, k, ausBase64(o.daten),
    );
  } catch {
    throw new Error('Falsches Passwort – oder die Datei ist beschädigt.');
  }
  return new TextDecoder().decode(klar);
}
