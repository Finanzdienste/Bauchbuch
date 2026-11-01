/*
 * Wasser: wie viele Gläser an einem Tag getrunken wurden.
 *
 * Gezählt wird je Tag und ohne Uhrzeit, in tage[iso].wasser – eine ganze
 * Zahl, und 0 steht gar nicht erst da. Kein Eintrag im Strang und erst recht
 * keine Mahlzeit, und das ist der Kern dieser Datei: Ein Glas Wasser als
 * Mahlzeit eingetragen, wäre für die Auswertung ein Essen. Es machte aus einem
 * späten Glas „spät gegessen", stünde bei jedem Auslöser auf der Seite „ohne"
 * als Gegenfall, hielte im Provokationstest die Nüchternzeit für gebrochen
 * und zählte als notierter Tag – ohne Beschwerde also als beschwerdefreier.
 *
 * Bleibt die eine Gefahr, die der Tagesspeicher selbst mitbringt: An vielen
 * Stellen gilt ein Tag als notiert, sobald er dort überhaupt steht. Ein Tag,
 * an dem nur Wasser gezählt wurde, wäre damit genau der Tag, den diese App an
 * jeder anderen Stelle zu vermeiden sucht – eine Lücke, die als guter Tag
 * mitzählt. Wer ein Glas antippt, hat über seinen Bauch nichts gesagt. Deshalb
 * fragt jede dieser Stellen tagZaehlt() statt nach dem bloßen Dasein.
 *
 * Dieselbe Gefahr hat seit den Aktivitäten (js/aktivitaet.js) auch der Strang
 * selbst: „Gym um 18 Uhr" ist ein Eintrag, sagt aber über Bauch und Kopf so
 * wenig wie ein Glas Wasser. Für ihn gibt es eintragZaehlt(), die Schwester
 * von tagZaehlt() – beide stehen hier, damit es die Regel nur einmal gibt.
 *
 * Hängt von nichts ab und darf deshalb überall benutzt werden.
 */

/** Mehr als vierzig Gläser an einem Tag sind ein Tippfehler, keine Angabe. */
export const WASSER_HOECHSTENS = 40;

/*
 * Was ein Glas ist, in Millilitern. Die Zahl der Gläser bleibt die Angabe;
 * die Literzahl daneben ist nur eine Umrechnung, und deshalb genügen die
 * üblichen Größen. Ein Wechsel rechnet alles neu um, auch schon Gezähltes –
 * gespeichert werden Gläser, nicht Liter.
 */
export const GLAS_GROESSEN = [200, 250, 330, 500];
export const GLAS_VORGABE = 250;

/*
 * Felder des Tagesspeichers, die einen Tag nicht zu einem notierten machen.
 * Eine Liste und kein einzelner Vergleich, damit die nächste Angabe dieser
 * Art an genau einer Stelle dazukommt.
 */
const ZAEHLT_NICHT = ['wasser'];

const feldLeer = (v) => v === null || v === undefined || v === ''
  || (typeof v === 'string' && !v.trim());

/**
 * Ist an diesem Tag zum Tag selbst etwas gesagt – eine Tagesfrage, eine
 * Notiz – und nicht bloß Wasser gezählt?
 *
 * Das ersetzt die Frage „steht der Tag im Speicher?". Bis hierher war sie
 * richtig, denn leere Tage legt der Speicher nicht an (siehe tagSetzen in
 * js/store.js). Leer heißt dabei dasselbe wie dort, und ein Rest aus einer
 * älteren Fassung, in dem nur noch leere Felder stehen, zählt auch hier nicht.
 */
export function tagZaehlt(tag) {
  if (!tag || typeof tag !== 'object') return false;
  return Object.entries(tag).some(([k, v]) => !ZAEHLT_NICHT.includes(k) && !feldLeer(v));
}

/*
 * Arten im Strang, die einen Tag nicht zu einem notierten machen – weder für
 * den Bauch noch für den Kopf. Wie oben eine Liste, damit die nächste Art
 * dieser Sorte an genau einer Stelle dazukommt.
 *
 * Eine Notiz steht mit Absicht nicht hier: Wer abends „alles ruhig" schreibt,
 * hat etwas über den Tag gesagt. Wer „Sauna" antippt, nicht.
 */
const SAGT_NICHTS = ['aktivitaet'];

/**
 * Sagt dieser Eintrag etwas über den Tag – oder hält er nur fest, was jemand
 * gemacht hat?
 *
 * Jede Stelle, die einen Tag schon wegen irgendeines Eintrags für notiert
 * hielt, fragt jetzt das. Ohne diese Frage wäre der Tag, an dem nur „Laufen"
 * steht, ein beschwerdefreier Tag – und das Laufen sähe in jeder Rechnung
 * besser aus, als es war.
 */
export function eintragZaehlt(e) {
  return !!e && typeof e === 'object' && !SAGT_NICHTS.includes(e.art);
}

/** Die Gläser eines Tages als ganze Zahl von 0 bis WASSER_HOECHSTENS. */
export function wasserVon(tag) {
  const n = Number(tag && typeof tag === 'object' ? tag.wasser : 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(WASSER_HOECHSTENS, Math.round(n));
}

/** Eine Glasgröße, die es in der Auswahl gibt – sonst die Vorgabe. */
export function glasMl(ml) {
  return GLAS_GROESSEN.includes(Number(ml)) ? Number(ml) : GLAS_VORGABE;
}

/** „0,25 l" – für die Auswahl unter „Mehr". */
export function glasName(ml) {
  return `${String(glasMl(ml) / 1000).replace('.', ',')} l`;
}

/**
 * „≈ 0,75 l" – oder '' ohne Glas. Auf eine Nachkommastelle, ab zwei Litern
 * auf halbe: Mehr Genauigkeit gibt eine Zählung in Gläsern nicht her.
 */
export function literText(glaeser, ml) {
  const n = Number(glaeser) || 0;
  if (n <= 0) return '';
  const liter = (n * glasMl(ml)) / 1000;
  const gerundet = liter < 1 ? Math.round(liter * 100) / 100
    : (liter < 2 ? Math.round(liter * 10) / 10 : Math.round(liter * 2) / 2);
  return `≈ ${String(gerundet).replace('.', ',')} l`;
}

/**
 * Wie viel an den Tagen eines Zeitraums gezählt wurde.
 *
 * Gemittelt wird nur über Tage mit Angabe. Ein Tag ohne Zahl ist einer, an dem
 * nicht gezählt wurde – kein Tag ohne Trinken –, und ihn als null mitzurechnen
 * hieße, eine Lücke im Tagebuch als Durst zu lesen.
 *
 * @returns {{ tage: number, summe: number, schnitt: number }}
 */
export function wasserZahlen(tage, von, bis) {
  const werte = Object.keys(tage || {})
    .filter((iso) => (!von || iso >= von) && (!bis || iso <= bis))
    .map((iso) => wasserVon(tage[iso]))
    .filter((n) => n > 0);
  const summe = werte.reduce((s, n) => s + n, 0);
  return { tage: werte.length, summe, schnitt: werte.length ? summe / werte.length : 0 };
}
