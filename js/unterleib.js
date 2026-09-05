/*
 * Der Unterleib – und warum ein Magentagebuch danach fragt.
 *
 * Endometriose wird im Mittel sieben bis zehn Jahre lang nicht erkannt, und
 * die häufigste Fehldeutung auf diesem Weg ist „Reizdarm". Das ist kein
 * Zufall: Endometrioseherde am Darm oder im Douglasraum machen Blähungen,
 * Krämpfe, Durchfall und Verstopfung – dieselben Beschwerden, die dieses
 * Tagebuch ohnehin zählt, nur mit einer anderen Ursache.
 *
 * Was die beiden auseinanderhält, steht in Daten, die eine Magensprechstunde
 * nicht erhebt:
 *
 *   * **Zyklusbindung.** Reizdarmbeschwerden schwanken auch, aber nicht
 *     verlässlich mit der Blutung. Endometriose tut das.
 *   * **Tiefer Schmerz beim Sex.** Das ist das Merkmal mit dem größten
 *     Gewicht und zugleich das, nach dem am seltensten gefragt wird. Schmerz
 *     am Eingang deutet woanders hin (Beckenboden, Trockenheit, Vaginismus) –
 *     deshalb wird hier getrennt gezählt.
 *   * **Starker Regelschmerz**, der Schmerzmittel oder Fehltage erzwingt.
 *   * **Darmbeschwerden, die zur Blutung hin schlimmer werden**, oft mit
 *     schmerzhaftem Stuhlgang während der Periode.
 *
 * WAS DIESES MODUL NICHT TUT: eine Diagnose stellen. Endometriose wird
 * bildgebend und letztlich durch eine Bauchspiegelung festgestellt, nie durch
 * ein Tagebuch. Was hier herauskommt, ist ein Satz für die Sprechstunde – und
 * der ist trotzdem viel wert, weil er eine Frage auslöst, die sonst über Jahre
 * nicht gestellt wird.
 *
 * UND ES SCHWEIGT LIEBER. Alle vier Merkmale sind nur zu haben, wenn jemand
 * die Fragen dazu eingeschaltet und ein paar Wochen ausgefüllt hat. Fehlen
 * sie, steht hier nicht „unauffällig", sondern „nicht prüfbar" – der
 * Unterschied ist der ganze Punkt. Ein „unauffällig" auf leerer Grundlage
 * hätte genau die Wirkung, die es hier zu vermeiden gilt: dass niemand mehr
 * nachfragt.
 */

/** Ab wie vielen Tagen mit einer Angabe ein Merkmal überhaupt zählt. */
const GENUG_TAGE = 8;

/** Ab wie vielen Gelegenheiten mit Sex die Schmerzfrage etwas hergibt. */
const GENUG_SEX = 4;

/** Ab wie vielen Blutungstagen sich der Regelschmerz beurteilen lässt. */
const GENUG_BLUTUNG = 6;

const zahl = (x) => (Number.isFinite(x) ? x : null);

/**
 * Die vier Merkmale, jedes mit seiner eigenen Prüfbarkeit.
 *
 * @param {object[]} eintraege
 * @param {object} tage       der Tagesspeicher
 * @param {function} tagesWert (eintraege, iso, tage) -> { notiert, wert }
 */
export function unterleibsBild(eintraege, tage, tagesWert) {
  const alle = Object.entries(tage || {}).filter(([, t]) => t && t.notiert);

  /* ---------- 1. Schmerz beim Sex ---------- */

  // Gezählt werden nur Tage, an denen es Sex gab – sonst sagt „kein Schmerz"
  // nichts aus. Das ist der Unterschied zwischen „tut nicht weh" und
  // „kam nicht vor".
  const mitSex = alle.filter(([, t]) => zahl(t.sex) > 0);
  const mitAngabe = mitSex.filter(([, t]) => zahl(t.sexschmerz) !== null);
  const schmerzhaft = mitAngabe.filter(([, t]) => zahl(t.sexschmerz) > 0);
  const tief = mitAngabe.filter(([, t]) => zahl(t.sextief) > 0);

  const sexSchmerz = {
    pruefbar: mitAngabe.length >= GENUG_SEX,
    gelegenheiten: mitAngabe.length,
    mitSchmerz: schmerzhaft.length,
    tief: tief.length,
    anteil: mitAngabe.length ? schmerzhaft.length / mitAngabe.length : 0,
    // Der stärkste einzelne Hinweis: tiefer Schmerz, mehrfach.
    tiefWiederholt: tief.length >= 2,
    fehlt: Math.max(0, GENUG_SEX - mitAngabe.length),
  };

  /* ---------- 2. Regelschmerz ---------- */

  const blutungsTage = alle.filter(([, t]) => zahl(t.blutung) > 0);
  const mitRegelAngabe = blutungsTage.filter(([, t]) => zahl(t.regelschmerz) !== null);
  const starkeTage = mitRegelAngabe.filter(([, t]) => zahl(t.regelschmerz) >= 3);

  const regel = {
    pruefbar: mitRegelAngabe.length >= GENUG_BLUTUNG,
    blutungsTage: mitRegelAngabe.length,
    starkeTage: starkeTage.length,
    anteilStark: mitRegelAngabe.length ? starkeTage.length / mitRegelAngabe.length : 0,
    // „Stark" heißt hier: mindestens die Hälfte der Blutungstage deutlich.
    auffaellig: mitRegelAngabe.length >= GENUG_BLUTUNG
      && starkeTage.length / mitRegelAngabe.length >= 0.5,
    fehlt: Math.max(0, GENUG_BLUTUNG - mitRegelAngabe.length),
  };

  /* ---------- 3. Beschwerden zur Blutung hin ---------- */

  /*
   * Verglichen wird der Bauch an Blutungstagen gegen den Bauch an allen
   * übrigen notierten Tagen. Gegen null zu vergleichen wäre sinnlos – fast
   * jeder hat irgendwann Beschwerden; interessant ist der Abstand zum eigenen
   * Alltag.
   */
  const wertVon = ([iso]) => tagesWert(eintraege, iso, tage).wert;
  const beiBlutung = blutungsTage.map(wertVon);
  const sonst = alle.filter(([, t]) => !(zahl(t.blutung) > 0)).map(wertVon);
  const schnitt = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  const zyklisch = {
    pruefbar: beiBlutung.length >= GENUG_TAGE && sonst.length >= GENUG_TAGE,
    blutungsTage: beiBlutung.length,
    andereTage: sonst.length,
    beiBlutung: schnitt(beiBlutung),
    sonst: schnitt(sonst),
    differenz: schnitt(beiBlutung) - schnitt(sonst),
    // Eine ganze Stufe Unterschied, dieselbe Schwelle wie beim Verlauf.
    auffaellig: beiBlutung.length >= GENUG_TAGE && sonst.length >= GENUG_TAGE
      && schnitt(beiBlutung) - schnitt(sonst) >= 1,
    fehlt: Math.max(0, GENUG_TAGE - Math.min(beiBlutung.length, sonst.length)),
  };

  /* ---------- 4. Schmerzhafter Stuhlgang während der Blutung ---------- */

  const blutungsSet = new Set(blutungsTage.map(([iso]) => iso));
  const stuhl = eintraege.filter((e) => e.art === 'stuhl');
  const stuhlBeiBlutung = stuhl.filter((e) => blutungsSet.has(e.am));
  const schmerzhaftBeiBlutung = stuhlBeiBlutung.filter((e) => e.schmerz || e.dringend);

  const stuhlgang = {
    pruefbar: stuhlBeiBlutung.length >= 3,
    waehrendBlutung: stuhlBeiBlutung.length,
    davonSchwer: schmerzhaftBeiBlutung.length,
  };

  /* ---------- Zusammengesetzt ---------- */

  /*
   * Wie viele der Merkmale sprechen dafür – und wie viele ließen sich
   * überhaupt prüfen. Das zweite ist genauso wichtig: „eins von vier" heißt
   * etwas ganz anderes als „eins von vier, drei nicht prüfbar".
   */
  const merkmale = [
    {
      id: 'sextief',
      name: 'Tiefer Schmerz beim Sex',
      gewicht: 2,
      pruefbar: sexSchmerz.pruefbar,
      erfuellt: sexSchmerz.pruefbar && sexSchmerz.tiefWiederholt,
      text: sexSchmerz.pruefbar
        ? `${sexSchmerz.tief} von ${sexSchmerz.gelegenheiten} Malen mit tiefem Schmerz`
        : `noch ${sexSchmerz.fehlt} Angaben nötig`,
    },
    {
      id: 'regelschmerz',
      name: 'Starker Regelschmerz',
      gewicht: 1,
      pruefbar: regel.pruefbar,
      erfuellt: regel.auffaellig,
      text: regel.pruefbar
        ? `an ${regel.starkeTage} von ${regel.blutungsTage} Blutungstagen stark`
        : `noch ${regel.fehlt} Blutungstage mit Angabe nötig`,
    },
    {
      id: 'zyklisch',
      name: 'Bauch schlechter zur Blutung hin',
      gewicht: 1,
      pruefbar: zyklisch.pruefbar,
      erfuellt: zyklisch.auffaellig,
      text: zyklisch.pruefbar
        ? `${zyklisch.beiBlutung.toFixed(1).replace('.', ',')} gegen `
          + `${zyklisch.sonst.toFixed(1).replace('.', ',')} an anderen Tagen`
        : `noch ${zyklisch.fehlt} Tage nötig`,
    },
    {
      id: 'stuhlgang',
      name: 'Stuhlgang während der Blutung schwer',
      gewicht: 1,
      pruefbar: stuhlgang.pruefbar,
      erfuellt: stuhlgang.pruefbar && stuhlgang.davonSchwer >= 2,
      text: stuhlgang.pruefbar
        ? `${stuhlgang.davonSchwer} von ${stuhlgang.waehrendBlutung} Mal`
        : 'zu wenige Einträge während der Blutung',
    },
  ];

  const pruefbare = merkmale.filter((m) => m.pruefbar);
  const erfuellte = merkmale.filter((m) => m.erfuellt);
  const punkte = erfuellte.reduce((s, m) => s + m.gewicht, 0);

  /*
   * Wann ein Satz in den Bericht gehört – und warum die Schwelle nicht
   * niedriger sein darf, als sie beim ersten Entwurf war.
   *
   * Erst hieß die Regel „zwei Punkte genügen". Die Prüfung hat gezeigt, was
   * das bedeutet: Schmerzhafte Perioden und ein Bauch, der zur Blutung hin
   * schlechter wird, sind zusammen bei sehr vielen Menschen der Normalzustand.
   * Eine App, die daraufhin bei jeder Zweiten Endometriose in den Raum stellt,
   * schickt Leute in Sprechstunden, in denen nichts gefunden wird – und beim
   * nächsten Mal, wenn es wirklich etwas wäre, glaubt ihr niemand mehr.
   *
   * Deshalb zwei Wege statt eines Schwellwerts:
   *
   *   * Tiefer Schmerz beim Sex, wiederholt. Das ist das Merkmal mit der
   *     eigenen Aussagekraft und trägt allein.
   *   * Oder ALLE drei übrigen zusammen. Einzeln sind sie alltäglich, zu
   *     dritt sind sie es nicht mehr.
   */
  const ansprechen = (sexSchmerz.pruefbar && sexSchmerz.tiefWiederholt) || punkte >= 3;

  /*
   * Wurden die Fragen, um die es hier geht, überhaupt beantwortet?
   *
   * Ohne sie bleiben nur Blutung und Stuhlgang – und dafür gibt es bereits das
   * Zyklusmuster, das Endometriose ohnehin als Möglichkeit nennt. Ein zweites,
   * fast gleiches Muster daneben wäre keine zusätzliche Auskunft, sondern
   * doppelte Lautstärke bei gleichem Inhalt.
   */
  const neueFragen = sexSchmerz.pruefbar || regel.pruefbar;

  return {
    sexSchmerz,
    regel,
    zyklisch,
    stuhlgang,
    merkmale,
    punkte,
    pruefbare: pruefbare.length,
    erfuellte: erfuellte.length,
    ansprechen,
    neueFragen,
    /*
     * Ob überhaupt jemand die Fragen eingeschaltet hat. Ohne diese
     * Unterscheidung sähe „keine Merkmale" wie Entwarnung aus, obwohl gar
     * nichts erhoben wurde.
     */
    erhoben: pruefbare.length > 0,
  };
}

/**
 * Lohnt es sich, die Fragen überhaupt vorzuschlagen?
 *
 * Nur wenn das Tagebuch schon von sich aus in diese Richtung zeigt: Blutungen
 * eingetragen und der Bauch dabei auffällig schlechter. Dann – und nur dann –
 * ist der Hinweis eine Hilfe und keine Zudringlichkeit.
 */
export function fragenVorschlagen(eintraege, tage, tagesWert, tagesfragen) {
  const schon = Array.isArray(tagesfragen) ? tagesfragen : [];
  if (schon.includes('sexschmerz') && schon.includes('regelschmerz')) return null;

  const bild = unterleibsBild(eintraege, tage, tagesWert);
  if (!bild.zyklisch.pruefbar || !bild.zyklisch.auffaellig) return null;

  return {
    differenz: bild.zyklisch.differenz,
    blutungsTage: bild.zyklisch.blutungsTage,
    fehlende: ['sexschmerz', 'sextief', 'regelschmerz'].filter((f) => !schon.includes(f)),
  };
}
