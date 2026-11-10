/*
 * Ob sich unter einem Mittel etwas geändert hat.
 *
 * Diese App schlägt kein Medikament vor; das steht in js/rat.js und bleibt so.
 * Hier geht es um etwas anderes: Wer schon etwas nimmt und es einträgt, hat
 * die Zahlen für einen Vergleich, und niemand rechnet ihn im Kopf nach. Für
 * die Sprechstunde ist das eine eigene Auskunft.
 *
 * WAS DARAUS NICHT FOLGT. Bleiben die Bauchwerte unter einem Säureblocker,
 * wie sie waren, sagt diese Datei nichts über die Ursache. Die
 * Fachinformationen ziehen daraus keinen Schluss, sie nennen weitere
 * Untersuchungen: Antra MUPS (www.fachinfo.de/fi/pdf/004171, Stand Mai 2024,
 * 4.2): wenn die Kontrolle der Symptome nach einer vierwöchigen Behandlung
 * nicht erreicht wurde, „werden weitere Untersuchungen empfohlen";
 * Pantoprazol-ratiopharm 20 mg (www.fachinfo.de/fi/pdf/020159, Stand Juni
 * 2026, 4.4): „Sollten die Symptome trotz adäquater Behandlung weiter bestehen
 * bleiben, sind weitere Untersuchungen in Betracht zu ziehen." Dieselbe
 * Fachinformation sagt in 4.2, eine Besserung komme „im Allgemeinen innerhalb
 * von 2-4 Wochen", sonst „normalerweise innerhalb weiterer 4 Wochen"; und
 * auch bei meist endoskopisch gesicherter Refluxkrankheit war nach 28 Tagen
 * eine vollständige Linderung des Sodbrennens nur bei „68,1 % bis 92,3 %"
 * erreicht (EMA, Produktinformation PANTOZOL Control, Fachinformation 5.1).
 * Bis zur Fassung 29 stand hier und im Satz für die Sprechstunde, ein
 * Säureblocker ohne Wirkung nach vier bis acht Wochen spreche gegen die Säure
 * als Ursache („wäre … etwas zu sehen"); das trägt keine dieser Quellen, und
 * verglichen wird ohnehin der Bauchwert, nicht das Sodbrennen allein.
 *
 * WAS HIER AUCH NICHT PASSIERT: kein „nimm mehr", kein „setz es ab", kein
 * „wechsle das Präparat". Ob und wie ein Mittel beendet wird, gehört in
 * Praxis oder Apotheke. Belegt ist dazu nur der Satz der Packungsbeilage:
 * „Setzen Sie die Tabletten nicht ab, ohne zuerst mit Ihrem Arzt oder
 * Apotheker zu sprechen." (Gebrauchsinformation Pantozol 20 mg,
 * patienteninfo-service.de, überarbeitet April 2023, Abschnitt 3). Ein
 * Säure-Rebound nach dem Absetzen steht in keiner geprüften Fach- oder
 * Gebrauchsinformation (siehe js/mittel.js, ppi); der Satz dazu ist
 * gestrichen.
 *
 * NUR MAGENMITTEL BEKOMMEN EIN URTEIL. Verglichen wird immer der Bauchwert.
 * Für ein Mittel, das wegen des Bauchs genommen wird, ist „darunter besser
 * oder nicht" eine Auskunft über das Mittel; für ein Schmerzmittel, ein
 * Triptan oder ein Mittel, das Body Check nicht kennt, hieße es nichts und
 * läse sich trotzdem wie ein Befund darüber – „darunter schlechter" bei
 * Ibuprofen etwa, für das die Fachinformation sagt: „Die am häufigsten
 * beobachteten Nebenwirkungen betreffen den Verdauungstrakt" (Ibuprofen-CT
 * Filmtabletten, Stand Juni 2025, 4.8). Bis zur Fassung 29 hieß es dann „Das
 * heißt nicht, dass das Mittel schadet"; das trägt keine Quelle. Dort stehen
 * jetzt nur die beiden Zahlen (siehe urteilAnzeige), wie oben auf „Muster"
 * (js/lage.js, 6.). Gerechnet wird `urteil` weiter für alle.
 *
 * EIN ADHS-MITTEL BEKOMMT KEIN URTEIL. Für den Säureblocker ist das
 * Vorher-Nachher die eine ehrliche Rechnung; für ein ADHS-Mittel ist es
 * keine. Es wird nicht wegen des Bauchs angefangen, also fehlt der Grund,
 * aus dem „danach wurde es besser" überhaupt etwas hieße – und ob es vorher
 * schon genommen und nur nicht eingetragen wurde, weiß niemand. Ein
 * „darunter schlechter" läse sich trotzdem wie ein Befund über das Mittel.
 * Deshalb stehen dort nur die beiden Zahlen nebeneinander (`urteil` 'offen').
 *
 * Reine Rechnung, alles kommt als Argument herein.
 */
import { plusTage, tageDazwischen } from './datum.js';
import { tagesWert } from './auswertung.js';
import { ADHS_GRUPPEN } from './mittel.js';

/** Ab so vielen Einnahmetagen lohnt der Vergleich überhaupt. */
const MINDEST_TAGE = 8;

/*
 * Ab so vielen Wochen steht beim Säureblocker der eigene Satz in befund().
 * Vier Wochen nennt Antra MUPS (4.2, siehe oben) für die Refluxkrankheit;
 * ein Urteil über das Mittel oder die Ursache ist das nicht – laut
 * Fachinformation kann eine Besserung auch erst später kommen.
 */
export const PPI_WOCHEN = 4;

/** Säureblocker: Protonenpumpenhemmer und H2-Blocker. */
const SAEURE_GRUPPEN = ['ppi', 'h2'];

/*
 * Die Gruppen aus js/mittel.js, die wegen Magen- und Bauchbeschwerden
 * genommen werden – dieselben wie in js/lage.js. Nur für sie heißt der
 * Vergleich der Bauchwerte etwas über das Mittel (siehe oben).
 */
export const MAGEN_GRUPPEN = ['ppi', 'h2', 'antazida', 'alginat', 'sucralfat', 'prokinetika', 'pflanzlich', 'heilerde'];

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
 * herauszuholen ist – und sie hat eine bekannte Schwäche, die dabeisteht:
 * Wird ein Mittel begonnen, während es gerade schlecht ist, kann eine
 * Besserung danach auch von selbst kommen. Deshalb steht bei einer Besserung
 * ein Vorbehalt dabei – und ein Ausbleiben ist ebenso wenig ein Schluss auf
 * die Ursache (siehe oben). Als Möglichkeit, nicht als Häufigkeit: Wie oft
 * ein Mittel in einer schlechten Phase begonnen wird, belegt keine geprüfte
 * Quelle; bis zur Fassung 29 hieß es hier und im Satz dazu „meist" und „oft"
 * (wie bei V4 in js/spannung.js).
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
    else if (ADHS_GRUPPEN.includes(gruppe)) urteil = 'offen';
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
      // Ein Säureblocker, mindestens PPI_WOCHEN genommen, ohne dass die
      // Bauchwerte darunter besser geworden wären.
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
  // Bei allem außer den Magenmitteln: Zahlen nebeneinander, kein Urteil
  // (siehe oben).
  offen: 'ohne Urteil',
};

/** Hat dieses Mittel ein Urteil aus dem Bauchwert? Nur die Magenmittel. */
function mitUrteil(m) {
  return MAGEN_GRUPPEN.includes(m.gruppe) && !ADHS_GRUPPEN.includes(m.gruppe);
}

/**
 * Das Urteil, wie es dasteht: Außerhalb der Magenmittel keines (siehe oben).
 * Die Rechnung in mittelBilanz bleibt dieselbe.
 */
export function urteilAnzeige(m) {
  if (!m.genug || !m.vergleichbar || mitUrteil(m)) return m.urteil;
  return 'offen';
}

/**
 * Der Satz, der in die Sprechstunde gehört.
 *
 * Für jedes Mittel mit genug Tagen einer. Er nennt die Zahlen und, wo es
 * passt, eine Frage für den Termin – keinen Schluss auf die Ursache und
 * keinen Rat zum Mittel (Belege oben).
 */
export function befund(m) {
  if (!m.genug) {
    return `Noch ${m.fehlt} Einnahmetage, dann lässt sich vergleichen.`;
  }
  if (!m.vergleichbar) {
    return 'Vor der Einnahme sind zu wenige Tage notiert, um zu vergleichen.';
  }
  const komma = (x) => x.toFixed(1).replace('.', ',');
  const seitDatum = String(m.seit).split('-').reverse().join('.');
  if (ADHS_GRUPPEN.includes(m.gruppe)) {
    return `Seit dem ersten Eintrag (${seitDatum}) im Mittel ${komma(m.unter.schnitt)}, in der `
      + `Zeit davor ${komma(m.davor.schnitt)} (${m.unter.notierte} gegen `
      + `${m.davor.notierte} notierte Tage). Ob das Mittel vorher schon genommen und nur `
      + 'nicht eingetragen wurde, weiß Body Check nicht; ein ADHS-Mittel fängt man auch '
      + 'nicht wegen des Bauchs an.';
  }
  if (!mitUrteil(m)) {
    return `Seit dem ersten Eintrag (${seitDatum}) im Mittel ${komma(m.unter.schnitt)}, in der `
      + `Zeit davor ${komma(m.davor.schnitt)} (${m.unter.notierte} gegen `
      + `${m.davor.notierte} notierte Tage). Verglichen wird der Bauchwert; ob das etwas `
      + 'mit dem Mittel zu tun hat, zeigt dieser Vergleich nicht.';
  }
  const zahlen = `${m.davor.schnitt.toFixed(1).replace('.', ',')} davor gegen `
    + `${m.unter.schnitt.toFixed(1).replace('.', ',')} darunter `
    + `(${m.davor.notierte} gegen ${m.unter.notierte} notierte Tage).`;

  /*
   * Der Säureblocker ohne Besserung: die Zahlen, was die Fachinformationen
   * für diesen Fall nennen, die Frage für den Termin und der Satz der
   * Packungsbeilage zum Beenden (Belege im Kopf dieser Datei). „Nicht besser
   * geworden" statt „nicht geändert": Der Zweig gilt auch, wenn die Werte
   * darunter höher waren.
   */
  if (m.saeureVersuchAusgereizt) {
    return `Seit ${Math.round(m.wochen)} Wochen im Gebrauch, ohne dass die Bauchwerte `
      + `darunter besser geworden wären: ${zahlen} Bleiben Beschwerden unter der `
      + 'Behandlung bestehen, nennen manche Fachinformationen weitere Untersuchungen; '
      + 'was es hier bedeutet, klärt die Praxis. Frage für den Termin: Was heißt es, '
      + 'dass es darunter nicht besser geworden ist – und wie geht es weiter? Laut '
      + 'Packungsbeilage mancher Präparate, etwa Pantozol, wird die Einnahme nicht '
      + 'beendet, ohne vorher mit Ärztin, Arzt oder Apotheke zu sprechen.';
  }
  if (m.urteil === 'besser') {
    return `Darunter ${m.differenz.toFixed(1).replace('.', ',')} Stufen besser: ${zahlen} `
      + 'Vorsicht bei der Deutung: Wird ein Mittel begonnen, während es gerade schlecht '
      + 'ist, kann eine Besserung danach auch von selbst kommen.';
  }
  if (m.urteil === 'schlechter') {
    return `Darunter schlechter als davor: ${zahlen} Woran das liegt, zeigt dieser `
      + 'Vergleich nicht. Wenn es dabei bleibt, gehört es angesprochen.';
  }
  return `Kein Unterschied zur Zeit davor: ${zahlen} Ob das gegen das Mittel `
    + `spricht, hängt daran, wie lange es schon läuft – ${Math.round(m.wochen)} `
    + `${m.wochen < 2 ? 'Woche' : 'Wochen'} bisher.`;
}
