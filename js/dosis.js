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

/** Eine Zehntelzahl mit Komma, wie überall in der Anzeige („3,0"). */
const zehntel = (x) => x.toFixed(1).replace('.', ',');

/** „a, b und c" – oder mit „oder". */
const undOder = (namen, wort) => (namen.length > 1
  ? `${namen.slice(0, -1).join(', ')} ${wort} ${namen[namen.length - 1]}`
  : namen.join(''));

/**
 * Ab welcher Menge fällt dieser Auslöser auf?
 *
 * @param {object[]} eintraege
 * @param {string} id       der Auslöser
 * @param {number} fenster  Stunden nach dem Essen
 */
export function dosisBild(eintraege, id, fenster = 4) {
  // Jede Mahlzeit, auch eine, bei der offen ist, ob eine Beschwerde vor oder
  // nach ihr kam – sie zählt dann als danach, wie in der Auslöserbilanz
  // (siehe wertNach). Sie wegzulassen, ließe nur die beschwerdefreien übrig.
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
     * Der häufigste Fall: Meistens kommt eine Zutat in derselben Rolle vor –
     * wer Zwiebeln isst, isst sie oft mitgekocht. Dann gibt es keine
     * Mengenfrage zu beantworten, und der Satz sagt nur, was gezählt ist und
     * was fehlt – wie im Zweig 'ab-hier' unten.
     *
     * Bis zur Fassung 30 stand hier „Um eine Menge zu finden, müsste es auch
     * mal in kleinerer Rolle vorkommen", und der Kommentar nannte das
     * ausdrücklich „etwas zu tun: Es einmal in kleinerer Menge essen". Dieser
     * Block steht aber nur unter auffälligen oder möglichen Funden, und bei
     * einer Nahrungsmittelallergie reichen laut gesund.bund.de „Bereits kleine
     * Mengen eines Lebensmittels" (Nahrungsmittelallergie, Stand 27.05.2024;
     * ein Provokationstest läuft dort „unter ärztlicher Beobachtung"). Dazu
     * hieß es „fast immer", auch wenn die Zutat in der Hälfte der Fälle schon
     * kleiner vorkam; jetzt steht die Zahl dabei. Das Urteil 'unklar' ist
     * unverändert.
     *
     * Kommen zwei Rollen gleich oft vor, ist keine „am häufigsten": Dann
     * stehen alle gleich häufigen da. Bis zur Fassung 30 gewann bei
     * Gleichstand die Rolle, die in STUFEN zuerst steht.
     */
    const haeufigste = [...stufen].sort((a, b) => b.faelle - a.faelle)[0];
    const gesamt = stufen.reduce((s, st) => s + st.faelle, 0);
    const gleichOft = haeufigste ? stufen.filter((st) => st.faelle === haeufigste.faelle) : [];
    let wieOft;
    if (haeufigste && haeufigste.faelle === gesamt) {
      wieOft = `Bisher kam das immer ${haeufigste.satz} vor (${gesamt} Mal).`;
    } else if (gleichOft.length > 1) {
      wieOft = `Bisher kam das gleich oft ${undOder(gleichOft.map((st) => st.name), 'und')} vor `
        + `(je ${haeufigste.faelle} von ${gesamt} Mal).`;
    } else if (haeufigste) {
      wieOft = `Bisher kam das am häufigsten ${haeufigste.satz} vor (${haeufigste.faelle} `
        + `von ${gesamt} Mal).`;
    }
    return {
      urteil: 'unklar',
      stufen,
      gegenFaelle,
      satz: haeufigste && haeufigste.faelle
        ? `${wieOft} Ob die Menge eine Rolle spielt, lässt sich aus dem `
          + 'Tagebuch noch nicht sagen: Für einen Vergleich nach Menge sind bisher zu '
          + 'wenige Mahlzeiten eingetragen.'
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

  /*
   * Die Sätze sagen nur, was gezählt ist – keinen Schluss auf die Ursache und
   * nichts zum Weglassen. Ob eine kleinere Menge vertragen wird, hängt an der
   * Ursache, die das Tagebuch nicht kennt: Bei einer Laktoseintoleranz werden
   * „bestimmte Mengen an Milchzucker" vertragen, bei einer
   * Nahrungsmittelallergie reichen „Bereits kleine Mengen eines Lebensmittels"
   * (gesund.bund.de, Laktoseintoleranz, Stand 23.02.2026; Nahrungsmittelallergie,
   * Stand 27.05.2024). Bis zur Fassung 29 hieß es hier „Es sieht also nach
   * einer Menge aus, nicht nach der Zutat selbst – was heißt, dass Weglassen
   * vermutlich zu viel wäre" und „Bis dahin wäre ganz weglassen womöglich
   * mehr als nötig", dazu der Vorschlag, es einmal in kleinerer Rolle zu
   * essen; js/lage.js hatte dieselbe Aussage in der Fassung 30 schon
   * gestrichen. Die Urteile ('schwelle', 'ab-hier') sind unverändert.
   */
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
        + `${zehntel(niedrigsteAuffaellig.differenz)} Stufen schlechter `
        + `(${niedrigsteAuffaellig.faelle} Mahlzeiten). Woran das liegt, zeigt das `
        + 'Tagebuch nicht: Ob eine kleinere Menge vertragen wird, hängt an der Ursache. '
        + 'Was das für dein Essen heißt, lässt sich in der Praxis besprechen.',
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
        + `${zehntel(niedrigsteAuffaellig.differenz)} Stufen schlechter). Eine `
        + 'Menge, die durchgeht, ist bisher nicht dabei.',
    };
  }

  /*
   * Die kleineren Rollen, die hier zu selten sind: nur die unter der
   * auffälligen Stufe. Wäre eine davon prüfbar, stünde sie oben als
   * auffällig oder harmlos da. Bis zur Fassung 30 hieß es fest „nur als
   * Beilage, Topping oder Würze" – auch wenn die Beilage selbst die
   * auffällige Stufe war und ihre Mahlzeiten im Satz davor standen.
   */
  const kleiner = STUFEN.filter((st) => st.rang < niedrigsteAuffaellig.rang)
    .reverse().map((st) => st.name.replace(/^als /, ''));
  return {
    urteil: 'ab-hier',
    stufen,
    gegenFaelle,
    abStufe: niedrigsteAuffaellig,
    satz: `Auffällig wird es ${niedrigsteAuffaellig.satz} `
      + `(${niedrigsteAuffaellig.faelle} Mahlzeiten, um `
      + `${zehntel(niedrigsteAuffaellig.differenz)} Stufen schlechter). Ob `
      + 'kleinere Mengen anders wirken, lässt sich aus dem Tagebuch noch nicht sagen: '
      + `Mahlzeiten, in denen es nur als ${undOder(kleiner, 'oder')} vorkommt, sind `
      + 'bisher zu wenige eingetragen.',
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
