/*
 * Der Stuhlgang: die Angabe, ohne die der halbe Bauch unsichtbar bleibt.
 *
 * Dieses Tagebuch hat lange nur nach oben geschaut – Brennen, Druck, Übelkeit.
 * Das reicht für die Magenfragen und für die Darmfragen überhaupt nicht: Ein
 * Reizdarmsyndrom wird an drei Dingen festgemacht, und zwei davon sind
 * Häufigkeit und Form des Stuhlgangs. Ohne sie lässt sich ein Reizdarm von
 * einer funktionellen Dyspepsie im Tagebuch grundsätzlich nicht trennen, und
 * der Typ – Verstopfung, Durchfall, gemischt – entscheidet in der Praxis über
 * die Behandlung.
 *
 * Gerechnet wird hier nur, gefragt wird woanders. Wie überall in dieser
 * Schicht: reine Funktionen, alles kommt als Argument herein.
 *
 * Zur Einordnung der Zahlen: Die Anteile unten sind über *alle* eingetragenen
 * Stuhlgänge gerechnet, nicht über Tage. Die Rom-Kriterien rechnen ähnlich,
 * aber nicht identisch – dort geht es um Tage mit mindestens einem auffälligen
 * Stuhlgang. Der Unterschied ist klein und die Zahl hier nachvollziehbar;
 * beides steht in der Anzeige dabei.
 */
import { bristolVon } from './daten.js';

/** Alle Stuhl-Eintragungen mit gültiger Bristol-Form. */
export function stuhlgaenge(eintraege) {
  return (eintraege || []).filter((e) => e.art === 'stuhl' && bristolVon(e.form));
}

/**
 * Wie die Formen verteilt sind.
 *
 * `hart` sind Bristol 1–2 (zu lange gelegen), `weich` 6–7 (zu kurz), der Rest
 * gilt als unauffällig. Das ist die Einteilung, mit der auch in der
 * Sprechstunde gearbeitet wird.
 */
export function formBilanz(eintraege) {
  const alle = stuhlgaenge(eintraege);
  const zaehl = { hart: 0, normal: 0, weich: 0 };
  alle.forEach((e) => { zaehl[bristolVon(e.form).gruppe] += 1; });
  const teil = (n) => (alle.length ? n / alle.length : 0);
  return {
    gesamt: alle.length,
    ...zaehl,
    anteilHart: teil(zaehl.hart),
    anteilWeich: teil(zaehl.weich),
    anteilNormal: teil(zaehl.normal),
  };
}

/**
 * Der Reizdarm-Typ nach der Verteilung der Stuhlform.
 *
 * Die Schwelle von einem Viertel steht so in den Rom-Kriterien: Über einem
 * Viertel harter Stühle und unter einem Viertel weicher heißt „Verstopfungstyp"
 * und umgekehrt; beides über einem Viertel heißt „gemischt".
 *
 * Wichtig und deshalb im Rückgabewert: Das hier ist eine *Beschreibung der
 * Stuhlform*, keine Diagnose. Der Typ sagt nur, wie es aussähe, *wenn* ein
 * Reizdarm vorläge – ob einer vorliegt, entscheidet er nicht. Unter 15
 * eingetragenen Stuhlgängen kommt gar nichts zurück; darunter kippt der Anteil
 * mit jedem einzelnen Eintrag.
 */
export const TYP_NAME = {
  verstopfung: 'Verstopfungstyp (IBS-C)',
  durchfall: 'Durchfalltyp (IBS-D)',
  gemischt: 'Gemischter Typ (IBS-M)',
  unbestimmt: 'Nicht zuzuordnen (IBS-U)',
};

export function stuhlTyp(eintraege, mindest = 15) {
  const b = formBilanz(eintraege);
  if (b.gesamt < mindest) {
    return { typ: null, fehlt: mindest - b.gesamt, bilanz: b };
  }
  const vielHart = b.anteilHart > 0.25;
  const vielWeich = b.anteilWeich > 0.25;
  let typ = 'unbestimmt';
  if (vielHart && vielWeich) typ = 'gemischt';
  else if (vielHart) typ = 'verstopfung';
  else if (vielWeich) typ = 'durchfall';
  return { typ, name: TYP_NAME[typ], fehlt: 0, bilanz: b };
}

/** Wie viele Stuhlgänge an einem Tag eingetragen sind. */
export function anzahlAm(eintraege, iso) {
  return stuhlgaenge(eintraege).filter((e) => e.am === iso).length;
}

/**
 * Bauchschmerz-Tage gegen die übrigen – bei Häufigkeit und bei Form.
 *
 * Das sind zwei der drei Rom-Merkmale für ein Reizdarmsyndrom. Dort werden sie
 * *gefragt* („ändert sich dabei die Häufigkeit?"), hier werden sie gerechnet.
 * Das ist nicht dasselbe, und es steht in der Anzeige dabei: Wer sich nicht
 * erinnert, antwortet auf die Frage schlechter als das Tagebuch – wer an
 * schlechten Tagen seltener einträgt, besser.
 *
 * Verglichen wird nur über Tage, an denen überhaupt etwas notiert wurde. Eine
 * Lücke im Tagebuch ist kein schmerzfreier Tag.
 */
export function schmerzVergleich(eintraege, tage, schmerzArten = ['krampf']) {
  const alle = eintraege || [];
  const notierte = [...new Set([...alle.map((e) => e.am), ...Object.keys(tage || {})])].sort();
  const mitSchmerz = new Set(alle
    .filter((e) => e.art === 'beschwerde' && (e.arten || []).some((a) => schmerzArten.includes(a)))
    .map((e) => e.am));

  const gruppe = (wollen) => {
    const isos = notierte.filter((iso) => mitSchmerz.has(iso) === wollen);
    const stuhl = stuhlgaenge(alle).filter((e) => isos.includes(e.am));
    const auffaellig = stuhl.filter((e) => bristolVon(e.form).gruppe !== 'normal');
    return {
      tage: isos.length,
      stuhlgaenge: stuhl.length,
      proTag: isos.length ? stuhl.length / isos.length : 0,
      auffaellig: auffaellig.length,
      anteilAuffaellig: stuhl.length ? auffaellig.length / stuhl.length : 0,
    };
  };

  const mit = gruppe(true);
  const ohne = gruppe(false);
  return {
    mit,
    ohne,
    // Genug heißt hier: auf beiden Seiten fünf Tage und fünf Stuhlgänge. Eine
    // Formverteilung aus zwei Einträgen ist keine Verteilung.
    genugTage: mit.tage >= 5 && ohne.tage >= 5,
    genugStuhl: mit.stuhlgaenge >= 5 && ohne.stuhlgaenge >= 5,
    haeufigkeitAnders: Math.abs(mit.proTag - ohne.proTag) >= 0.5,
    formAnders: Math.abs(mit.anteilAuffaellig - ohne.anteilAuffaellig) >= 0.2,
  };
}

/**
 * Wie oft eine Beschwerde sich mit dem Stuhlgang geändert hat.
 *
 * Das dritte Rom-Merkmal, und das einzige, das sich nicht rechnen lässt:
 * Dass an einem Tag Schmerz und Stuhlgang beide vorkamen, sagt nichts darüber,
 * ob das eine das andere verändert hat. Also wird gefragt (STUHLBEZUG in
 * js/daten.js) und hier nur ausgezählt. Unbeantwortete Beschwerden zählen
 * nirgends mit – weder dafür noch dagegen.
 */
export function bezugBilanz(eintraege) {
  const beantwortet = (eintraege || []).filter((e) => e.art === 'beschwerde'
    && e.stuhlbezug && e.stuhlbezug !== 'keiner');
  const geaendert = beantwortet.filter((e) => e.stuhlbezug === 'besser' || e.stuhlbezug === 'schlechter');
  return {
    beantwortet: beantwortet.length,
    geaendert: geaendert.length,
    besser: beantwortet.filter((e) => e.stuhlbezug === 'besser').length,
    schlechter: beantwortet.filter((e) => e.stuhlbezug === 'schlechter').length,
    anteil: beantwortet.length ? geaendert.length / beantwortet.length : 0,
    genug: beantwortet.length >= 4,
  };
}

/** Die Zahlen für die Übersicht: wie oft, wie oft auffällig, wie oft dringend. */
export function stuhlZahlen(eintraege, tage) {
  const alle = stuhlgaenge(eintraege);
  const notierte = [...new Set([...(eintraege || []).map((e) => e.am),
    ...Object.keys(tage || {})])];
  const b = formBilanz(eintraege);
  return {
    gesamt: alle.length,
    proTag: notierte.length ? alle.length / notierte.length : 0,
    dringend: alle.filter((e) => e.dringend).length,
    unvollstaendig: alle.filter((e) => e.unvollstaendig).length,
    ...b,
  };
}
