/*
 * Der Stuhlgang: die Angabe, ohne die der halbe Bauch unsichtbar bleibt.
 *
 * Dieses Tagebuch hat lange nur nach oben geschaut – Brennen, Druck, Übelkeit.
 * Das reicht für die Magenfragen und für die Darmfragen überhaupt nicht: Nach
 * den Rom-IV-Kriterien gehören zum Reizdarmsyndrom wiederkehrende
 * Bauchschmerzen, die mit mindestens zwei von drei Merkmalen verbunden sind –
 * „Related to defecation“, „Associated with a change in frequency of stool“,
 * „Associated with a change in form (appearance) of stool“ (FDA, NDA 211801
 * Ibsrela, Multidisciplinary Review, Version 12.09.2018, 2.1, Table 1, nach
 * Mearin et al. 2016). Alle drei betreffen den Stuhlgang; ohne Angaben dazu
 * lassen sie sich im Tagebuch nicht nachrechnen. Ob ein Reizdarm, ein
 * Reizmagen oder beides vorliegt, klärt die ärztliche Untersuchung. Der Typ –
 * Verstopfung, Durchfall, gemischt – richtet sich nach dem vorherrschenden
 * Stuhlmuster, und die medikamentöse Behandlung richtet sich meist danach,
 * welche Beschwerden im Vordergrund stehen („The pharmacological treatment of
 * IBS is usually symptomatic, and depends on the predominance of the
 * symptoms“, EMA, Truberzi, Beurteilungsbericht EMA/549473/2016, 2.1); manche
 * Arzneimittel sind nur für einen Typ zugelassen (Constella: „Reizdarmsyndrom
 * mit Obstipation (RDS-O)“, Produktinformation 4.1). Fassung 30: Vorher hieß
 * es, ohne Stuhlangaben lasse sich ein Reizdarm von einer funktionellen
 * Dyspepsie „grundsätzlich nicht trennen“ und der Typ „entscheide“ über die
 * Behandlung – beides ging über die Quellen hinaus.
 *
 * Gerechnet wird hier nur, gefragt wird woanders. Wie überall in dieser
 * Schicht: reine Funktionen, alles kommt als Argument herein.
 *
 * Zur Einordnung der Zahlen: Die Anteile unten sind über *alle* eingetragenen
 * Stuhlgänge gerechnet, nicht über Tage. So setzen auch die erreichbaren
 * amtlichen Wiedergaben der Rom-Kriterien die Schwelle von einem Viertel an:
 * Rom III in der EMA-Leitlinie zum Reizdarm (CPMP/EWP/785/97 Rev. 1,
 * 25.09.2014, Kapitel 4: „… <25% of the bowel movements“), Rom IV im
 * FDA-Prüfbericht zu Ibsrela (Table 2: „More than one-fourth (25%) of bowel
 * movements with Bristol Stool Scale Types 1-2“). Ob die Originalfassung von
 * Rom IV nur bestimmte Tage einbezieht, ist hier nicht belegt; bis zur
 * Fassung 29 stand, dort gehe es um Tage mit mindestens einem auffälligen
 * Stuhlgang. Die Einordnung selbst gehört in die Praxis.
 */
import { bristolVon } from './daten.js';
import { tagZaehlt, wasserVon, zaehltFuerBauch } from './wasser.js';

/** Die Tage des Tagesspeichers, an denen mehr steht als gezähltes Wasser. */
function tageMitAngabe(tage) {
  return Object.keys(tage || {}).filter((iso) => tagZaehlt(tage[iso]));
}

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
  // Ohne die Kopf-Einträge: Ein Tag mit nur einem Kopfschmerz ist für den
  // Bauch eine Lücke, kein Tag ohne Bauchschmerz (siehe tagesWert). Ohne die
  // Tage mit nur gezähltem Wasser oder nur einer Aktivität aus demselben Grund.
  const notierte = [...new Set([
    ...alle.filter(zaehltFuerBauch).map((e) => e.am), ...tageMitAngabe(tage),
  ])].sort();
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
 * Eines der drei Rom-Merkmale, und das einzige, das sich nicht rechnen lässt:
 * der Bezug des Bauchschmerzes zum Stuhlgang – in Rom IV „Related to
 * defecation“ (FDA, NDA 211801, Table 1), in der Rom-III-Fassung der EMA noch
 * „Improvement with defecation“ (CPMP/EWP/785/97 Rev. 1, Kapitel 4). Dass an
 * einem Tag Schmerz und Stuhlgang beide vorkamen, sagt nichts darüber, ob das
 * eine das andere verändert hat. (Bis zur Fassung 29 hieß es „das dritte“
 * Merkmal; in beiden Wiedergaben steht es an erster Stelle.) Also wird gefragt (STUHLBEZUG in
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

/*
 * Ab so vielen Tagen und Stuhlgängen je Seite sagt der Vergleich mit dem
 * Wasser etwas – dieselbe Grenze wie bei schmerzVergleich, aus demselben
 * Grund: Eine Formverteilung aus zwei Einträgen ist keine Verteilung.
 */
const WASSER_GENUG = 5;

/**
 * Harter Stuhlgang an Tagen mit wenig gegen Tagen mit viel Wasser.
 *
 * Wenig und viel misst sich am eigenen Alltag, nicht an einer Empfehlung: Die
 * Grenze ist die eigene mittlere Zahl (der Median), und Tage genau darauf
 * bleiben außen vor – wie die mittlere Zone in js/schichten.js, damit die
 * beiden Seiten wirklich verschieden sind. Gezählt werden nur Tage, an denen
 * Wasser gezählt *und* ein Stuhlgang eingetragen ist. Ein Tag ohne Zahl ist
 * einer, an dem nicht gezählt wurde, und ein Tag ohne Stuhlgang sagt über die
 * Form nichts.
 *
 * Verglichen wird derselbe Tag; was an den Tagen davor war, bildet der
 * Vergleich nicht ab. Wie lange der Stuhl im Darm bleibt und wie er aussieht,
 * hängt unter anderem davon ab, was gegessen und getrunken wurde und wie viel
 * Bewegung dazukam (gesund.bund.de/verstopfung-bei-erwachsenen, Stand
 * 02.10.2023: „faserarme Nahrung mit wenig Ballaststoffen, zu wenig trinken,
 * mangelnde Bewegung“; „Diese Ursachen führen aber nur bei manchen Menschen zu
 * Beschwerden“) – das steckt alles mit darin. Deshalb sagt die Anzeige nur,
 * was gezählt ist, und nichts darüber, woran es liegt.
 */
export function wasserVergleich(eintraege, tage) {
  const stuhl = stuhlgaenge(eintraege);
  const stuhlTage = new Set(stuhl.map((e) => e.am));
  const glaeser = new Map(Object.keys(tage || {})
    .map((iso) => [iso, wasserVon(tage[iso])])
    .filter(([iso, n]) => n > 0 && stuhlTage.has(iso)));
  const zahlen = [...glaeser.values()].sort((a, b) => a - b);
  const h = Math.floor(zahlen.length / 2);
  const mitte = !zahlen.length ? 0
    : (zahlen.length % 2 ? zahlen[h] : (zahlen[h - 1] + zahlen[h]) / 2);

  const seite = (passt) => {
    const isos = new Set([...glaeser].filter(([, n]) => passt(n)).map(([iso]) => iso));
    const dort = stuhl.filter((e) => isos.has(e.am));
    const hart = dort.filter((e) => bristolVon(e.form).gruppe === 'hart').length;
    const werte = [...isos].map((iso) => glaeser.get(iso));
    return {
      tage: isos.size,
      stuhlgaenge: dort.length,
      hart,
      anteil: dort.length ? hart / dort.length : 0,
      wenigste: werte.length ? Math.min(...werte) : 0,
      meiste: werte.length ? Math.max(...werte) : 0,
    };
  };
  const wenig = seite((n) => n < mitte);
  const viel = seite((n) => n > mitte);
  const genug = wenig.tage >= WASSER_GENUG && viel.tage >= WASSER_GENUG
    && wenig.stuhlgaenge >= WASSER_GENUG && viel.stuhlgaenge >= WASSER_GENUG;
  return {
    genug,
    mitte,
    wenig,
    viel,
    // Zwanzig Prozentpunkte, wie bei formAnders oben.
    anders: genug && Math.abs(wenig.anteil - viel.anteil) >= 0.2,
  };
}

/**
 * Der Satz dazu – oder '' bei zu wenigen Fällen. Mit beiden Fallzahlen und
 * ohne Rat: Die Zählung sagt, was an welchen Tagen war, nicht was man tun
 * soll, und schon gar nicht, wie viel zu trinken wäre.
 */
export function wasserSatz(v) {
  if (!v || !v.genug) return '';
  const glas = (n) => `${n} ${n === 1 ? 'Glas' : 'Gläser'}`;
  const glasAb = (n) => `${n} ${n === 1 ? 'Glas' : 'Gläsern'}`;
  const mal = (s) => `${s.hart} von ${s.stuhlgaenge} Mal`;
  const wenig = `an Tagen mit wenig Wasser (bis ${glas(v.wenig.meiste)})`;
  const viel = `an Tagen mit mehr (ab ${glasAb(v.viel.wenigste)})`;
  if (!v.anders) {
    return `Harter Stuhlgang (Typ 1–2) ${wenig}: ${mal(v.wenig)}, ${viel}: ${mal(v.viel)} – `
      + 'kein deutlicher Unterschied.';
  }
  const oefter = v.wenig.anteil > v.viel.anteil ? 'wenig' : 'viel';
  const erst = oefter === 'wenig' ? wenig : `an Tagen mit mehr Wasser (ab ${glasAb(v.viel.wenigste)})`;
  const dann = oefter === 'wenig' ? viel : `an Tagen mit weniger (bis ${glas(v.wenig.meiste)})`;
  const a = oefter === 'wenig' ? v.wenig : v.viel;
  const b = oefter === 'wenig' ? v.viel : v.wenig;
  const satz = `${erst} war der Stuhlgang öfter hart: ${mal(a)} Typ 1–2, ${dann} ${mal(b)}.`;
  return satz.charAt(0).toUpperCase() + satz.slice(1);
}

/** Die Zahlen für die Übersicht: wie oft, wie oft auffällig, wie oft dringend. */
export function stuhlZahlen(eintraege, tage) {
  const alle = stuhlgaenge(eintraege);
  const notierte = [...new Set([
    ...(eintraege || []).filter(zaehltFuerBauch).map((e) => e.am),
    ...tageMitAngabe(tage),
  ])];
  const b = formBilanz(eintraege);
  return {
    gesamt: alle.length,
    proTag: notierte.length ? alle.length / notierte.length : 0,
    dringend: alle.filter((e) => e.dringend).length,
    unvollstaendig: alle.filter((e) => e.unvollstaendig).length,
    ...b,
  };
}
