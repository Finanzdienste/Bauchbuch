/*
 * Störfaktoren herausrechnen – oder: liegt es wirklich am Kaffee?
 *
 * DAS PROBLEM, DAS DIESE DATEI LÖST
 *
 * Bisher wurde jeder Auslöser für sich verglichen: Mahlzeiten mit Kaffee gegen
 * Mahlzeiten ohne. Kommt dabei ein Unterschied heraus, stand da „auffällig".
 *
 * Nur trinkt niemand Kaffee zufällig verteilt. Kaffee gibt es an
 * Arbeitstagen, und Arbeitstage sind die angespannten. Wenn Anspannung den
 * Bauch verschlechtert, sieht der Kaffee schuldig aus, ohne es zu sein – und
 * jemand streicht ihn, isst fortan einseitiger und hat nichts gewonnen.
 *
 * Der Ausweg ist alt und heißt Schichtung: Man vergleicht nicht mehr alles
 * mit allem, sondern **innerhalb** vergleichbarer Gruppen. Hält der
 * Kaffee-Unterschied auch, wenn man nur die ruhigen Tage ansieht? Und auch,
 * wenn man nur die angespannten ansieht? Dann ist es der Kaffee. Zeigt er
 * sich nur in einer Schicht, war es der Störfaktor.
 *
 * DAS IST NICHT NUR EINE ABSCHWÄCHUNG
 *
 * Die Schichtung kann einen Befund auch *erzeugen*. Wenn jemand an ruhigen
 * Tagen selten Kaffee trinkt und an Stresstagen viel, kann sich der
 * Kaffee-Effekt im Gesamtschnitt fast aufheben und erst innerhalb der
 * Schichten sichtbar werden. Beides ist derselbe Rechenfehler – das
 * Simpson-Paradox – nur in verschiedene Richtungen.
 *
 * WAS DAS KOSTET, UND WARUM DIE SCHWELLEN STEIGEN
 *
 * Jede Schicht halbiert die Fallzahl ungefähr, und drei Schichtmerkmale mal
 * zwanzig Auslöser sind schnell hundert Vergleiche. Bei hundert Vergleichen
 * ist ein „auffälliger" Zufallstreffer nicht unwahrscheinlich, sondern zu
 * erwarten. Deshalb gilt hier strenger als sonst:
 *
 *   * Jede Schicht braucht auf **beiden** Seiten genug Fälle, sonst zählt sie
 *     gar nicht mit.
 *   * Mindestens **zwei** Schichten müssen prüfbar sein. Aus einer einzigen
 *     Schicht lässt sich nichts über Störfaktoren sagen.
 *   * Der Befund muss in **allen** prüfbaren Schichten dieselbe Richtung
 *     zeigen. Einmal dafür und einmal dagegen heißt: es liegt am Störfaktor,
 *     nicht am Auslöser.
 *
 * Und wenn das nicht reicht, kommt kein abgeschwächtes Urteil heraus, sondern
 * „dafür reichen die Daten nicht". Das ist die einzige ehrliche Antwort und
 * die einzige, die niemanden in die Irre führt.
 */

/**
 * Die Schichtmerkmale.
 *
 * Alles Dinge, die den Bauch nachweislich beeinflussen und die gleichzeitig
 * beeinflussen, *was* jemand isst – genau die Kombination, die einen
 * Störfaktor ausmacht. Wetter oder Wochentag stehen nicht hier: Sie ändern
 * zwar das Essen, aber nicht den Bauch.
 */
export const SCHICHTEN = [
  {
    id: 'stress',
    name: 'Anspannung',
    // Die Tagesfragen laufen von 0 (ruhig) bis 4 (sehr viel).
    teile: [
      { id: 'ruhig', name: 'an ruhigen Tagen', passt: (v) => v !== null && v <= 1 },
      { id: 'angespannt', name: 'an angespannten Tagen', passt: (v) => v !== null && v >= 3 },
    ],
  },
  {
    id: 'schlaf',
    name: 'Schlaf',
    teile: [
      { id: 'gut', name: 'nach guten Nächten', passt: (v) => v !== null && v <= 1 },
      { id: 'schlecht', name: 'nach schlechten Nächten', passt: (v) => v !== null && v >= 3 },
    ],
  },
  {
    id: 'blutung',
    name: 'Zyklus',
    teile: [
      { id: 'ohne', name: 'außerhalb der Blutung', passt: (v) => !v },
      { id: 'mit', name: 'während der Blutung', passt: (v) => v > 0 },
    ],
  },
];

/*
 * Die mittlere Zone bleibt bewusst außen vor.
 *
 * „Geht so" ist weder ruhig noch angespannt; Mahlzeiten von solchen Tagen in
 * eine der beiden Schichten zu stecken, würde den Vergleich verwässern, den
 * er schärfen soll. Sie fehlen dann in der Rechnung – das kostet Fälle und
 * ist der Preis dafür, dass die beiden Schichten wirklich verschieden sind.
 */

/** Ab wie vielen Mahlzeiten je Seite eine Schicht überhaupt zählt. */
const MINDEST_JE_SCHICHT = 4;

/** So viele Schichten müssen prüfbar sein, damit ein Urteil möglich ist. */
const MINDEST_SCHICHTEN = 2;

const schnitt = (liste) => (liste.length
  ? liste.reduce((s, x) => s + x, 0) / liste.length : 0);

/**
 * Einen einzelnen Auslöser gegen die Störfaktoren halten.
 *
 * @param {object[]} bewertet  [{ merkmale:Set, wert:number, am:string }]
 * @param {string} id          der Auslöser
 * @param {object} tage        der Tagesspeicher
 * @returns {object} das Urteil samt allen Schichten, auch den nicht prüfbaren
 */
export function haeltStand(bewertet, id, tage) {
  const schichten = [];

  SCHICHTEN.forEach((s) => {
    const paar = [];
    s.teile.forEach((teil) => {
      const drin = bewertet.filter((b) => {
        const tag = (tage || {})[b.am];
        if (!tag || !tag.notiert) return false;
        const v = tag[s.id];
        return teil.passt(v === undefined ? null : v);
      });
      const mit = drin.filter((b) => b.merkmale.has(id));
      const ohne = drin.filter((b) => !b.merkmale.has(id));
      const pruefbar = mit.length >= MINDEST_JE_SCHICHT && ohne.length >= MINDEST_JE_SCHICHT;
      const schnittMit = schnitt(mit.map((b) => b.wert));
      const schnittOhne = schnitt(ohne.map((b) => b.wert));

      paar.push({
        merkmal: s.id,
        merkmalName: s.name,
        id: `${s.id}:${teil.id}`,
        name: teil.name,
        pruefbar,
        faelle: mit.length,
        gegenFaelle: ohne.length,
        schnittMit,
        schnittOhne,
        differenz: pruefbar ? schnittMit - schnittOhne : 0,
        fehlt: Math.max(0, MINDEST_JE_SCHICHT - Math.min(mit.length, ohne.length)),
      });
    });

    /*
     * Eine Schicht zählt nur, wenn ihre Gegenschicht auch etwas hergibt.
     *
     * Das ist keine Feinheit, sondern der Kern der Sache – und es war im
     * ersten Entwurf falsch. Wer nie eine Blutung einträgt, dessen Mahlzeiten
     * fallen restlos in „außerhalb der Blutung". Diese eine Schicht enthält
     * dann *alles* und wiederholt damit genau den ungeschichteten Vergleich,
     * den sie prüfen soll – samt seiner Verzerrung. Sie stimmte die echten
     * Schichten nieder, und der Scheinbefund kam durch.
     *
     * Schichten gibt es deshalb nur im Paar: „ruhig" ist nur dann eine
     * Auskunft, wenn es auch „angespannt" gibt, mit dem man sie vergleichen
     * kann. Fehlt die Gegenseite, fehlt der Kontrast, und dann ist die Frage
     * nach dem Störfaktor gar nicht gestellt.
     */
    const beideDa = paar.every((x) => x.pruefbar);
    paar.forEach((x) => schichten.push({ ...x, pruefbar: x.pruefbar && beideDa }));
  });

  const pruefbare = schichten.filter((s) => s.pruefbar);

  if (pruefbare.length < MINDEST_SCHICHTEN) {
    return {
      urteil: 'unklar',
      schichten,
      pruefbare: pruefbare.length,
      satz: pruefbare.length === 0
        ? 'Für einen Vergleich unter gleichen Umständen fehlen die Angaben zu '
          + 'Anspannung, Schlaf oder Zyklus – ohne die lässt sich nicht sagen, '
          + 'ob es am Essen liegt oder an den Umständen.'
        : 'Bisher lässt sich das nur unter einem einzigen Umstand vergleichen. '
          + 'Aus einer einzigen Schicht folgt nichts über Störfaktoren.',
    };
  }

  /*
   * Zeigen alle prüfbaren Schichten in dieselbe Richtung? „Dieselbe Richtung"
   * heißt hier: nennenswert, nicht bloß dasselbe Vorzeichen. Ein Unterschied
   * von 0,05 ist kein Beleg dafür, dass etwas hält.
   */
  const SCHWELLE = 0.5;
  const dafuer = pruefbare.filter((s) => s.differenz >= SCHWELLE);
  const dagegen = pruefbare.filter((s) => s.differenz <= -SCHWELLE);
  const neutral = pruefbare.filter((s) => Math.abs(s.differenz) < SCHWELLE);

  if (dafuer.length === pruefbare.length) {
    return {
      urteil: 'haelt',
      schichten,
      pruefbare: pruefbare.length,
      satz: `Der Unterschied bleibt ${pruefbare.map((s) => s.name).join(' und ')} `
        + 'bestehen. Das spricht dafür, dass es am Essen liegt und nicht an den '
        + 'Umständen.',
    };
  }

  if (dafuer.length && (dagegen.length || neutral.length)) {
    const nur = dafuer.map((s) => s.name).join(' und ');
    const nicht = [...dagegen, ...neutral].map((s) => s.name).join(' und ');
    return {
      urteil: 'nur-dann',
      schichten,
      pruefbare: pruefbare.length,
      wo: dafuer.map((s) => s.name),
      satz: `Auffällig ist es ${nur}, ${nicht} dagegen nicht. Das deutet eher `
        + 'auf die Umstände als auf das Essen selbst – oder darauf, dass beides '
        + 'zusammenkommen muss.',
    };
  }

  return {
    urteil: 'verschwindet',
    schichten,
    pruefbare: pruefbare.length,
    satz: 'Unter gleichen Umständen verglichen bleibt kein Unterschied übrig. '
      + 'Der Verdacht kam vermutlich daher, dass dieses Essen und die schlechten '
      + 'Tage zusammenfallen, ohne dass eins das andere macht.',
  };
}

/** Für die Anzeige: kurzes Wort zum Urteil. */
export const SCHICHT_WORT = {
  haelt: 'hält stand',
  'nur-dann': 'nur unter Umständen',
  verschwindet: 'verschwindet',
  unklar: 'nicht prüfbar',
};
