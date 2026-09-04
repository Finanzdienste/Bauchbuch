/*
 * Ob ein Mittel etwas bewirkt – und was es heißt, wenn nicht.
 *
 * Diese App schlägt kein Medikament vor; das steht in js/rat.js und bleibt so.
 * Hier geht es um etwas anderes: Sie *nimmt* schon etwas, sie trägt es ein, und
 * niemand rechnet nach, ob es wirkt. Genau diese Rechnung ist in der
 * Sprechstunde eine eigene Auskunft.
 *
 * Denn ausbleibendes Ansprechen ist selbst ein Befund. Ein Säureblocker, der
 * nach vier bis acht Wochen nichts geändert hat, spricht gegen die Säure als
 * Ursache – und damit für eine funktionelle Störung oder für etwas, das noch
 * nicht gefunden wurde. Das ist eine der wenigen Stellen, an denen ein
 * Tagebuch eine Untersuchung ersetzen kann: Der „PPI-Versuch" ist genau das,
 * ein Versuch mit Beobachtung, und beobachtet wird hier ohnehin.
 *
 * WAS HIER TROTZDEM NICHT PASSIERT: kein „nimm mehr", kein „setz es ab", kein
 * „wechsle das Präparat". Ein Säureblocker wird nach längerer Einnahme nicht
 * von einem Tag auf den anderen weggelassen – der Magen antwortet dann mit mehr
 * Säure als vorher. Was hier steht, ist die Zahl und die Frage dazu.
 *
 * Reine Rechnung, alles kommt als Argument herein.
 */
import { plusTage, tageDazwischen } from './datum.js';
import { tagesWert } from './auswertung.js';

/** Ab so vielen Einnahmetagen lohnt der Vergleich überhaupt. */
const MINDEST_TAGE = 8;

/** Ab so vielen Wochen ist ein Säureblocker-Versuch ausgereizt. */
export const PPI_WOCHEN = 4;

/** Gruppen, bei denen ausbleibendes Ansprechen eine eigene Aussage ist. */
const SAEURE_GRUPPEN = ['ppi', 'h2'];

function schnittUeber(eintraege, tage, von, bis) {
  const werte = [];
  const n = Math.max(0, tageDazwischen(von, bis));
  for (let i = 0; i <= n; i++) {
    const t = tagesWert(eintraege, plusTage(von, i), tage);
    if (t.notiert) werte.push(t.wert);
  }
  return {
    notierte: werte.length,
    schnitt: werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0,
    frei: werte.filter((w) => w === 0).length,
  };
}

/**
 * Ein Mittel gegen die Zeit davor.
 *
 * Der Vergleichszeitraum ist genauso lang wie die Einnahmezeit und liegt
 * unmittelbar davor. Das ist die ehrlichste Zuordnung, die aus einem Tagebuch
 * herauszuholen ist – und sie hat eine bekannte Schwäche, die dabeisteht: Man
 * fängt ein Mittel meistens an, *weil* es gerade besonders schlecht ist.
 * Danach wird es oft von selbst wieder besser, Mittel hin oder her. Deshalb
 * sagt eine Besserung hier weniger als ein Ausbleiben.
 */
export function mittelBilanz(eintraege, tage, opt = {}) {
  const gruppeVon = opt.gruppeVon || (() => null);
  const heute = opt.heute;
  const alle = eintraege || [];

  const nachName = new Map();
  alle.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = String(e.mittel || '').trim();
    if (!name) return;
    // Groß- und Kleinschreibung zusammenfassen, sonst stehen „Pantoprazol" und
    // „pantoprazol" als zwei Mittel da, jedes mit der halben Fallzahl.
    const schluessel = name.toLowerCase();
    const v = nachName.get(schluessel) || { name, tage: new Set() };
    v.name = name;
    v.tage.add(e.am);
    nachName.set(schluessel, v);
  });

  const raus = [];
  nachName.forEach((v) => {
    const tageListe = [...v.tage].sort();
    const von = tageListe[0];
    const bis = tageListe[tageListe.length - 1];
    const gruppe = gruppeVon(v.name);
    const spanne = tageDazwischen(von, bis) + 1;
    const laeuft = heute ? tageDazwischen(bis, heute) <= 3 : false;

    if (tageListe.length < MINDEST_TAGE) {
      raus.push({
        name: v.name,
        gruppe,
        einnahmeTage: tageListe.length,
        genug: false,
        fehlt: MINDEST_TAGE - tageListe.length,
        seit: von,
        zuletzt: bis,
        laeuft,
      });
      return;
    }

    // Der Zeitraum der Einnahme, nicht nur die Tage mit Eintrag: Wer ein Mittel
    // täglich nimmt, trägt es nicht täglich ein.
    const unter = schnittUeber(alle, tage, von, bis);
    const davor = schnittUeber(alle, tage, plusTage(von, -spanne), plusTage(von, -1));
    const differenz = davor.schnitt - unter.schnitt;
    const vergleichbar = davor.notierte >= 5 && unter.notierte >= 5;
    const wochen = spanne / 7;

    let urteil = 'offen';
    if (!vergleichbar) urteil = 'zuwenig';
    else if (differenz >= 1) urteil = 'besser';
    else if (differenz <= -1) urteil = 'schlechter';
    else urteil = 'unveraendert';

    raus.push({
      name: v.name,
      gruppe,
      einnahmeTage: tageListe.length,
      genug: true,
      seit: von,
      zuletzt: bis,
      spanne,
      wochen,
      laeuft,
      davor,
      unter,
      differenz,
      vergleichbar,
      urteil,
      // Der Fall, für den es diese Datei gibt: ein Säureblocker, lange genug
      // genommen, ohne dass sich etwas geändert hat.
      saeureVersuchAusgereizt: SAEURE_GRUPPEN.includes(gruppe)
        && wochen >= PPI_WOCHEN && vergleichbar && differenz < 1,
    });
  });

  return raus.sort((a, b) => (b.einnahmeTage - a.einnahmeTage));
}

export const ANSPRECHEN_URTEIL = {
  besser: 'darunter besser',
  schlechter: 'darunter schlechter',
  unveraendert: 'kein Unterschied',
  zuwenig: 'zu wenige notierte Tage',
  offen: 'noch offen',
};

/**
 * Der Satz, der in die Sprechstunde gehört.
 *
 * Für jedes Mittel mit genug Tagen einer – und für den ausgereizten
 * Säureblocker der eine, der etwas verändert: Er beendet eine Frage, statt eine
 * neue aufzumachen.
 */
export function befund(m) {
  if (!m.genug) {
    return `Noch ${m.fehlt} Einnahmetage, dann lässt sich vergleichen.`;
  }
  if (!m.vergleichbar) {
    return 'Vor der Einnahme sind zu wenige Tage notiert, um zu vergleichen.';
  }
  const zahlen = `${m.davor.schnitt.toFixed(1).replace('.', ',')} davor gegen `
    + `${m.unter.schnitt.toFixed(1).replace('.', ',')} darunter `
    + `(${m.davor.notierte} gegen ${m.unter.notierte} notierte Tage).`;

  if (m.saeureVersuchAusgereizt) {
    return `Seit ${Math.round(m.wochen)} Wochen im Gebrauch, ohne dass sich die `
      + `Beschwerdestärke geändert hätte: ${zahlen} Das ist selbst ein Befund. `
      + `Wenn Säure die Ursache wäre, wäre nach vier bis acht Wochen etwas zu `
      + `sehen. Frage für den Termin: Was heißt es, dass es darunter nicht besser `
      + `geworden ist – und wie geht es weiter? Nicht von selbst absetzen: Nach `
      + `längerer Einnahme antwortet der Magen kurzzeitig mit mehr Säure als vorher.`;
  }
  if (m.urteil === 'besser') {
    return `Darunter ${m.differenz.toFixed(1).replace('.', ',')} Stufen besser: ${zahlen} `
      + `Vorsicht bei der Deutung: Ein Mittel fängt man meist an, wenn es gerade `
      + `besonders schlecht ist – danach wird es oft von selbst wieder besser.`;
  }
  if (m.urteil === 'schlechter') {
    return `Darunter schlechter als davor: ${zahlen} Das heißt nicht, dass das `
      + `Mittel schadet – eher, dass es angefangen wurde, als es schlechter wurde. `
      + `Wenn es dabei bleibt, gehört es angesprochen.`;
  }
  return `Kein Unterschied zur Zeit davor: ${zahlen} Ob das gegen das Mittel `
    + `spricht, hängt daran, wie lange es schon läuft – ${Math.round(m.wochen)} `
    + `${m.wochen < 2 ? 'Woche' : 'Wochen'} bisher.`;
}
