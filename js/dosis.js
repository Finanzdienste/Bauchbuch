/*
 * Wie viel verträgst du – nicht ob
 *
 * DER UNTERSCHIED, UM DEN ES GEHT
 *
 * „Zwiebeln sind auffällig" ist eine Auskunft, die im Alltag genau eine
 * Handlung nahelegt: Zwiebeln streichen. Und das ist fast immer zu viel.
 *
 * Die meisten Unverträglichkeiten sind keine Allergien, sondern
 * Mengenfragen. Wer eine Zwiebelsuppe nicht verträgt, verträgt oft drei Ringe
 * auf dem Brot problemlos; wer nach einem Glas Milch Beschwerden bekommt,
 * kommt mit einem Schuss im Kaffee meist zurecht. Der Unterschied zwischen
 * diesen beiden Auskünften ist der Unterschied zwischen einem Leben mit einer
 * Streichliste und einem Leben mit einer Faustregel.
 *
 * Und er entscheidet, ob jemand dabeibleibt. Streichlisten werden aufgegeben –
 * nicht aus Nachlässigkeit, sondern weil sie das Essen unmöglich machen und
 * weil sie meistens mehr streichen, als nötig wäre.
 *
 * WOHER DIE MENGE KOMMT, OHNE DASS JEMAND WIEGT
 *
 * Beim Eintragen bekommt jede Zutat eine **Rolle**: Hauptzutat, Beilage,
 * Topping, Würze. Das ist keine Grammangabe und soll auch keine sein – es ist
 * die Angabe, die man beim Eintragen ohne Nachdenken trifft, und für diese
 * Frage ist sie die richtige: Ob eine Zwiebel stört, hängt weniger an ihren
 * Gramm als daran, ob sie die Suppe war oder die Garnitur.
 *
 * Diese vier Rollen sind eine Reihenfolge von viel nach wenig, und damit
 * lässt sich fragen: Ab welcher Stufe fällt es auf? Verglichen wird jede Stufe
 * gegen dieselbe Gruppe – die Mahlzeiten ohne diese Zutat.
 *
 * WAS AUSDRÜCKLICH NICHT MITZÄHLT
 *
 * „Getränk dazu" ist keine Menge, sondern eine Art. Ein Glas Wein ist nicht
 * die kleinere Fassung von Wein als Hauptzutat, und ein Kaffee ist nie eine
 * Beilage. Diese Rolle steht deshalb außerhalb der Reihe.
 */
import { wertNach, zutatenVon } from './auswertung.js';
import { zufallsSpielraum } from './zufall.js';

/**
 * Die Mengenreihe, von wenig nach viel.
 *
 * `rang` ist die Reihenfolge, nicht eine Menge – zwischen „Topping" und
 * „Beilage" liegt kein festes Verhältnis, und so zu tun wäre eine Genauigkeit,
 * die die Angabe nicht hergibt.
 */
export const STUFEN = [
  { id: 'wuerze', rang: 0, name: 'als Würze', satz: 'nur als Würze' },
  { id: 'topping', rang: 1, name: 'als Topping', satz: 'als Topping' },
  { id: 'beilage', rang: 2, name: 'als Beilage', satz: 'als Beilage' },
  { id: 'haupt', rang: 3, name: 'als Hauptzutat', satz: 'als Hauptzutat' },
];

/** Mahlzeiten je Stufe, ab denen sie überhaupt zählt. */
const MINDEST_JE_STUFE = 5;

/** Und so viele Mahlzeiten ohne die Zutat als Vergleich. */
const MINDEST_OHNE = 8;

/** Ab welchem Unterschied eine Stufe auffällt – wie in der Auslöserbilanz. */
const STUFEN_SCHWELLE = 1;

const schnittVon = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);

/**
 * Ab welcher Menge fällt dieser Auslöser auf?
 *
 * @param {object[]} eintraege
 * @param {string} id       der Auslöser
 * @param {number} fenster  Stunden nach dem Essen
 */
export function dosisBild(eintraege, id, fenster = 4) {
  const mahlzeiten = eintraege.filter((e) => e.art === 'essen').map((m) => ({
    wert: wertNach(eintraege, m, fenster),
    rolle: (zutatenVon(m).find((z) => z.id === id) || {}).rolle || null,
  }));

  // Die Vergleichsgruppe ist für alle Stufen dieselbe: Mahlzeiten, in denen
  // diese Zutat gar nicht vorkam. Jede Stufe gegen ihre eigene Gruppe zu
  // halten, hieße vier verschiedene Maßstäbe an dieselbe Frage anzulegen.
  const ohne = mahlzeiten.filter((x) => x.rolle === null).map((x) => x.wert);
  const schnittOhne = schnittVon(ohne);

  const stufen = STUFEN.map((st) => {
    const werte = mahlzeiten.filter((x) => x.rolle === st.id).map((x) => x.wert);
    const pruefbar = werte.length >= MINDEST_JE_STUFE && ohne.length >= MINDEST_OHNE;
    const r = zufallsSpielraum(werte, ohne, STUFEN.length);
    return {
      ...st,
      pruefbar,
      faelle: werte.length,
      schnitt: schnittVon(werte),
      schnittOhne,
      differenz: pruefbar ? schnittVon(werte) - schnittOhne : 0,
      spielraum: r.spielraum,
      // Auffällig heißt hier dasselbe wie überall: groß genug, um jemanden zu
      // interessieren, und größer als das, was der Zufall ohnehin hergibt.
      auffaellig: pruefbar && (schnittVon(werte) - schnittOhne) >= Math.max(STUFEN_SCHWELLE, r.spielraum),
    };
  });

  const pruefbare = stufen.filter((s) => s.pruefbar);
  const gegenFaelle = ohne.length;

  if (!pruefbare.length) {
    /*
     * Der häufigste Fall, und er hat eine nützliche Antwort.
     *
     * Meistens kommt eine Zutat immer in derselben Rolle vor – wer Zwiebeln
     * isst, isst sie fast immer mitgekocht. Dann gibt es keine Mengenfrage zu
     * beantworten, aber sehr wohl etwas zu tun: Es einmal in kleinerer Menge
     * essen und eintragen. Das ist eine Handlung, kein Achselzucken.
     */
    const haeufigste = [...stufen].sort((a, b) => b.faelle - a.faelle)[0];
    return {
      urteil: 'unklar',
      stufen,
      gegenFaelle,
      satz: haeufigste && haeufigste.faelle
        ? `Bisher kam das fast immer ${haeufigste.satz} vor `
          + `(${haeufigste.faelle} Mal). Um eine Menge zu finden, müsste es auch `
          + 'mal in kleinerer Rolle vorkommen – als Beilage, Topping oder Würze.'
        : 'Dafür ist es noch zu selten eingetragen.',
    };
  }

  const auffaellige = pruefbare.filter((s) => s.auffaellig);
  const harmlose = pruefbare.filter((s) => !s.auffaellig);

  if (!auffaellige.length) {
    /*
     * Keine Stufe fällt auf – aber „unauffällig" ist nur so viel wert wie die
     * größte geprüfte Menge. Wer bloß die Würze geprüft hat, hat nichts über
     * die Suppe gesagt.
     */
    const groesste = pruefbare[pruefbare.length - 1];
    return {
      urteil: 'unauffaellig',
      stufen,
      gegenFaelle,
      bisStufe: groesste,
      satz: `Bis hin zu „${groesste.name}" ist nichts aufgefallen `
        + `(${groesste.faelle} Mahlzeiten). ${groesste.rang === 3
          ? 'Größere Mengen als eine Hauptzutat gibt es nicht – das spricht gegen '
            + 'diese Zutat als Auslöser.'
          : 'Über größere Mengen sagt das nichts; die sind noch nicht geprüft.'}`,
    };
  }

  const niedrigsteAuffaellig = auffaellige[0];
  const hoechsteHarmlos = harmlose.filter((s) => s.rang < niedrigsteAuffaellig.rang).pop();

  if (hoechsteHarmlos) {
    return {
      urteil: 'schwelle',
      stufen,
      gegenFaelle,
      gehtBis: hoechsteHarmlos,
      abStufe: niedrigsteAuffaellig,
      satz: `${hoechsteHarmlos.satz.replace(/^./, (c) => c.toUpperCase())} `
        + `war es unauffällig (${hoechsteHarmlos.faelle} Mahlzeiten), `
        + `${niedrigsteAuffaellig.satz} dagegen um `
        + `${niedrigsteAuffaellig.differenz.toFixed(1)} Stufen schlechter `
        + `(${niedrigsteAuffaellig.faelle} Mahlzeiten). Es sieht also nach einer `
        + 'Menge aus, nicht nach der Zutat selbst – was heißt, dass Weglassen '
        + 'vermutlich zu viel wäre.',
    };
  }

  /*
   * Auffällig, ohne dass darunter etwas Geprüftes liegt – und jetzt kommt es
   * darauf an, *welche* Stufe das ist. Das war im ersten Entwurf falsch: Der
   * Fall hieß pauschal „auch in kleiner Menge", auch wenn die auffällige
   * Stufe die Hauptzutat war. „Schon als Hauptzutat fällt es auf" ist aber
   * keine Aussage über kleine Mengen, sondern gar keine Aussage über Mengen –
   * und sie hätte jemanden dazu gebracht, eine Zutat ganz zu streichen, ohne
   * dass je eine kleinere Menge geprüft worden wäre. Genau das soll diese
   * Datei verhindern.
   */
  if (niedrigsteAuffaellig.rang <= 1) {
    return {
      urteil: 'auch-wenig',
      stufen,
      gegenFaelle,
      abStufe: niedrigsteAuffaellig,
      satz: `Schon ${niedrigsteAuffaellig.satz} fällt es auf `
        + `(${niedrigsteAuffaellig.faelle} Mahlzeiten, um `
        + `${niedrigsteAuffaellig.differenz.toFixed(1)} Stufen schlechter). Eine `
        + 'Menge, die durchgeht, ist bisher nicht dabei.',
    };
  }

  return {
    urteil: 'ab-hier',
    stufen,
    gegenFaelle,
    abStufe: niedrigsteAuffaellig,
    satz: `Auffällig wird es ${niedrigsteAuffaellig.satz} `
      + `(${niedrigsteAuffaellig.faelle} Mahlzeiten, um `
      + `${niedrigsteAuffaellig.differenz.toFixed(1)} Stufen schlechter). Ob `
      + 'kleinere Mengen durchgehen, ist damit nicht gesagt – dafür müsste es '
      + 'auch mal in kleinerer Rolle vorkommen, als Beilage, Topping oder Würze. '
      + 'Bis dahin wäre ganz weglassen womöglich mehr als nötig.',
  };
}

/** Für die Anzeige: das Urteil in einem Wort. */
export const DOSIS_WORT = {
  schwelle: 'kommt auf die Menge an',
  'auch-wenig': 'auch in kleiner Menge',
  'ab-hier': 'ab dieser Menge',
  unauffaellig: 'in jeder geprüften Menge unauffällig',
  unklar: 'Menge nicht prüfbar',
};
