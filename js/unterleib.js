/*
 * Der Unterleib – und warum ein Magentagebuch danach fragt.
 *
 * Bis eine Endometriose erkannt wird, dauert es oft Jahre; bis dahin halten
 * viele Frauen ihre Schmerzen für normale Menstruationsbeschwerden
 * (gesund.bund.de/endometriose, Stand 21.08.2025, „Was ist eine
 * Endometriose?“). Eine Endometriose kann zusammen mit einem Reizdarm
 * vorkommen oder für einen gehalten werden („may coexist with or be
 * misdiagnosed as pelvic inflammatory disease or IBS“, Ballard et al., BJOG
 * 2008, PMID 18715240, Abstract). Zu ihren Beschwerden können krampfartige
 * Schmerzen, Übelkeit, Erbrechen und Durchfall gehören, und wie sie sich
 * äußern, hängt unter anderem davon ab, wo die Herde sitzen (gesund.bund.de,
 * „Was sind die Symptome?“); manche Betroffene haben Schmerzen beim Stuhlgang
 * (EMA, Ryeqo, Bewertungsbericht EMA/528959/2023, 2.1.1: „painful bowel
 * movements (dyschezia)“). Das sind zum Teil dieselben Beschwerden, die dieses
 * Tagebuch ohnehin zählt. Fassung 30: Die frühere feste Spanne in Jahren,
 * „die häufigste Fehldeutung“ und die Zuordnung der Darmbeschwerden zu Herden
 * am Darm oder im Douglasraum standen so in keiner geprüften Quelle.
 *
 * Dazu zählt dieses Modul vier Merkmale, nach denen ein Magentagebuch sonst
 * nicht fragt. Keines davon trennt Endometriose und Reizdarm sicher; das kann
 * nur die Praxis.
 *
 *   * **Bezug zur Blutung.** Endometriosebeschwerden treten oft während der
 *     Monatsblutung auf (gesund.bund.de/endometriose), sekundäre Regelschmerzen
 *     – auch durch Endometriose – „können auch außerhalb der Monatsblutung
 *     vorkommen“ (gesund.bund.de/regelschmerzen, Stand 27.08.2024), und ein
 *     Reizdarm zeigt sich häufig schubweise (gesund.bund.de/reizdarmsyndrom,
 *     Stand 28.08.2024). Ein Muster zur Blutung hin unterscheidet die beiden
 *     deshalb nicht sicher, und fehlt es, ist eine Endometriose damit nicht
 *     ausgeschlossen. Bis zur Fassung 29 stand hier, Endometriose schwanke
 *     „verlässlich“ mit der Blutung – das widerspricht diesen Quellen.
 *   * **Tiefer Schmerz beim Sex.** Schmerzen beim oder nach dem
 *     Geschlechtsverkehr können auf Endometriose hinweisen (gesund.bund.de);
 *     eine Übersichtsarbeit nennt starken tiefen Schmerz beim Sex und Schmerz
 *     beim Stuhlgang als Beschwerden, die zu bestimmten Orten der Herde passen
 *     (Fauconnier & Chapron, Hum Reprod Update 2005, PMID 16172113, Abstract).
 *     Gezählt wird hier nur der tiefe; Schmerz am Eingang zählt getrennt und
 *     nicht als Merkmal – eine Festlegung dieser App, kein Ausschluss. Dass
 *     tiefer Schmerz „das größte Gewicht“ habe und „am seltensten“ erfragt
 *     werde, stand bis zur Fassung 29 hier und ist nicht belegt.
 *   * **Starker Regelschmerz**, der Schmerzmittel oder Fehltage erzwingt. Bis
 *     zu 50 Prozent der Frauen mit stark schmerzhaften Regelblutungen haben
 *     laut gesund.bund.de/endometriose („Wie häufig?“) eine Endometriose.
 *   * **Bauch schlechter zur Blutung hin und schmerzhafter Stuhlgang während
 *     der Blutung.** Schmerz beim Stuhlgang während der Periode sagte in einer
 *     großen Studie unter Frauen vor einer Bauchspiegelung eine Endometriose
 *     am stärksten voraus (Nnoaham et al., Fertil Steril 2012, PMID 22657249,
 *     Abstract: „Menstrual dyschezia … most strongly predicted“). Magen-Darm-
 *     Beschwerden vor oder während der Periode hatten in einer Befragung aber
 *     auch 73 % gesunder Frauen (Bernstein et al., BMC Womens Health 2014,
 *     PMID 24450290, Abstract).
 *
 * WAS DIESES MODUL NICHT TUT: eine Diagnose stellen. Endometriose wird
 * bildgebend und letztlich durch eine Bauchspiegelung festgestellt, nie durch
 * ein Tagebuch (gesund.bund.de/endometriose: Gespräch, Untersuchung, „bis hin
 * zu einer Spiegelung der Bauchhöhle (Laparoskopie)“). Was hier herauskommt,
 * ist ein Satz für die Sprechstunde: eine Frage, die sich dort stellen lässt.
 *
 * UND ES SCHWEIGT LIEBER. Alle vier Merkmale sind nur zu haben, wenn jemand
 * die Fragen dazu eingeschaltet und ein paar Wochen ausgefüllt hat. Fehlen
 * sie, steht hier nicht „unauffällig", sondern „nicht prüfbar" – der
 * Unterschied ist der ganze Punkt. Ein „unauffällig" auf leerer Grundlage
 * hätte genau die Wirkung, die es hier zu vermeiden gilt: dass niemand mehr
 * nachfragt.
 */

import { tagZaehlt } from './wasser.js';

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
  /*
   * Jeder Tag, der im Tagesspeicher steht – leere Tage legt der Speicher
   * nicht an. Bis eben stand hier `t.notiert`; das Feld setzt die App aber
   * nirgends, es stand nur in den Testvorlagen. Damit war diese ganze
   * Rechnung in Wirklichkeit leer: kein Tag kam durch, nichts war prüfbar,
   * und der Test blieb grün, weil seine Tage das Feld hatten.
   *
   * Ohne die Tage, an denen nur Wasser gezählt ist: Sie stünden sonst unten
   * unter „übrige Tage" als Tage ohne Beschwerden und drückten den Vergleich
   * mit den Blutungstagen.
   */
  const alle = Object.entries(tage || {}).filter(([, t]) => tagZaehlt(t));

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
    // Tiefer Schmerz, mehrfach – der eine Weg, der hier allein reicht (eine
    // Festlegung dieser App, siehe „Zwei Wege“ unten).
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
      // Doppelt gezählt – eine Festlegung dieser App, kein Befund aus einer Quelle.
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
   * Erst hieß die Regel „zwei Punkte genügen". Regelschmerzen sind aber weit
   * verbreitet (gesund.bund.de/regelschmerzen, Stand 27.08.2024), und
   * Magen-Darm-Beschwerden vor oder während der Periode hatten in einer
   * Befragung 73 % gesunder Frauen (Bernstein et al. 2014, PMID 24450290,
   * Abstract); schmerzhafte Beschwerden sind auch ohne Endometriose häufig
   * („painful symptoms are frequent in women without this pathology“,
   * Fauconnier & Chapron 2005, PMID 16172113, Abstract). Mit zwei Punkten
   * hätte dieses Modul sehr oft angeschlagen. Bis zur Fassung 29 hieß es hier,
   * beides zusammen sei „bei sehr vielen Menschen der Normalzustand“ – das
   * beziffert keine Quelle, und gesund.bund.de schreibt, starke Schmerzen, die
   * monatlich für mehrere Tage das Leben beeinträchtigen, „müssen aber nicht als
   * ‚natürlich‘ hingenommen werden“.
   *
   * Deshalb zwei Wege statt eines Schwellwerts – beide eine Festlegung dieser
   * App, keine Leitlinie:
   *
   *   * tiefer Schmerz beim Sex, mehrfach eingetragen;
   *   * oder alle drei übrigen Merkmale zusammen.
   *
   * Das sagt nichts darüber, welches Merkmal medizinisch mehr wiegt. In
   * Studien hängen starker Regelschmerz, Schmerz beim Sex und Schmerz beim
   * Stuhlgang während der Periode jeweils mit Endometriose zusammen (Ballard
   * 2008, PMID 18715240: Dysmenorrhö OR 8,1, Dyspareunie und/oder Blutung nach
   * dem Verkehr OR 6,8; Nnoaham 2012, PMID 22657249; Fauconnier & Chapron 2005).
   * Bis zur Fassung 29 stand hier, nur der tiefe Schmerz habe „eigene
   * Aussagekraft“ und die übrigen seien einzeln „alltäglich“ – das widerspricht
   * diesen Quellen. Bei sehr starken oder sich verschlimmernden Schmerzen ist
   * laut gesund.bund.de/regelschmerzen eine ärztliche Untersuchung sinnvoll,
   * auch wenn dieses Modul kein Muster ausgibt.
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
