/*
 * Das Bild: so weit Richtung Diagnose, wie ein Tagebuch ehrlich kommt.
 *
 * Diese Datei sagt nicht, was jemand hat. Sie sagt, wonach das aussieht, was
 * er eingetragen hat – und zwar in den Begriffen, die in einer Praxis benutzt
 * werden, damit das Gespräch dort nicht bei null anfängt.
 *
 * Warum nicht weiter? Weil weiter geraten wäre. Gastritis, Magengeschwür,
 * Refluxkrankheit, funktionelle Dyspepsie und ein Reizdarm machen im Tagebuch
 * teils dasselbe Bild. Auseinander hält sie eine Magenspiegelung, ein Test auf
 * Helicobacter, ein Blutbild, ein Atemtest – Dinge, die man nicht eintippen
 * kann. Eine App, die sich trotzdem für eine entscheidet, nimmt der
 * Untersuchung ihre Frage weg und der Nutzerin die Möglichkeit zu merken, dass
 * es etwas anderes ist.
 *
 * Was hier deshalb steht, ist dreierlei:
 *
 *   1. **Warnzeichen.** Der einzige Teil, der wirklich dringt. Wo Blut,
 *      Gewichtsverlust oder eine Schluckstörung im Tagebuch stehen, gehört ein
 *      klarer Satz hin und keine Statistik.
 *   2. **Muster mit Belegen.** „Säuretypisch, in 78 % der Einträge Brennen
 *      oder Sodbrennen, davon 12 von 15 nachts" – eine Beschreibung, die man
 *      nachrechnen und vorlesen kann.
 *   3. **Was dahinterstecken kann und was es unterscheidet.** Also welche
 *      Untersuchung welche Frage beantwortet. Das ist die nützlichste Zeile
 *      des ganzen Programms.
 */
import { artAnteil, essensbezug, faktorenBilanz, nachTageszeit, tagesWert } from './auswertung.js';
import { phasenBilanz, belastbar } from './zyklus.js';
import { unterleibsBild } from './unterleib.js';

/*
 * ---------------------------------------------------------------------------
 * 1. Warnzeichen
 * ---------------------------------------------------------------------------
 *
 * Sie stehen als eigene Liste im Beschwerdebogen, getrennt von der Frage, wie
 * es sich anfühlt. Ein Warnzeichen ist keine Ausprägung von „Brennen", es ist
 * eine andere Art von Angabe – und es darf nie in einer Statistik verschwinden.
 *
 * `dringlichkeit`:
 *   'sofort'  heute, notfalls über die 112 oder eine Notaufnahme
 *   'zeitnah' in den nächsten Tagen ein Termin, nicht „irgendwann mal"
 */
export const WARNZEICHEN = [
  {
    id: 'bluterbrechen',
    name: 'Blut erbrochen oder kaffeesatzartiges Erbrechen',
    dringlichkeit: 'sofort',
    warum: 'Das kann eine Blutung im Magen oder in der Speiseröhre sein.',
  },
  {
    id: 'teerstuhl',
    name: 'Schwarzer, klebriger Stuhl',
    dringlichkeit: 'sofort',
    warum: 'Schwarzer Stuhl kann verdautes Blut sein. (Eisentabletten, Heidelbeeren '
      + 'und Bismut färben ihn ebenfalls dunkel – das gehört dazugesagt, aber '
      + 'geklärt wird das dort und nicht hier.)',
  },
  {
    id: 'ausstrahlung',
    name: 'Schmerz strahlt in Arm, Kiefer oder Rücken aus, mit Luftnot oder kaltem Schweiß',
    dringlichkeit: 'sofort',
    warum: 'Beschwerden in der Magengegend können vom Herzen kommen, besonders '
      + 'bei Frauen. Das ist der eine Fall, in dem Abwarten teuer wird.',
  },
  {
    id: 'blutstuhl',
    name: 'Frisches Blut im Stuhl',
    dringlichkeit: 'zeitnah',
    warum: 'Gehört abgeklärt, auch wenn Hämorrhoiden die häufigste Ursache sind.',
  },
  {
    id: 'schlucken',
    name: 'Schluckstörung, Essen bleibt stecken',
    dringlichkeit: 'zeitnah',
    warum: 'Eine Enge in der Speiseröhre wird nicht von selbst besser.',
  },
  {
    id: 'gewicht',
    name: 'Ungewollter Gewichtsverlust',
    dringlichkeit: 'zeitnah',
    warum: 'Abnehmen, ohne es zu wollen, ist immer eine eigene Frage wert.',
  },
  {
    id: 'erbrechen',
    name: 'Anhaltendes Erbrechen',
    dringlichkeit: 'zeitnah',
    warum: 'Länger als ein, zwei Tage: Es geht dabei auch Flüssigkeit verloren.',
  },
  {
    id: 'nachtschmerz',
    name: 'Schmerz weckt nachts auf',
    dringlichkeit: 'zeitnah',
    warum: 'Beschwerden, die aus dem Schlaf reißen, unterscheiden sich von '
      + 'solchen, die tagsüber kommen und gehen.',
  },
  {
    id: 'blaesse',
    name: 'Auffällige Blässe, Schwäche oder Luftnot bei Anstrengung',
    dringlichkeit: 'zeitnah',
    /*
     * gesund.bund.de/blutarmut-anaemie (mit IQWiG, Stand 13.07.2021): „Eine
     * Anämie macht sich meist durch Blässe, Müdigkeit, Kopfschmerzen und
     * Schwächegefühl bemerkbar", dazu „Kurzatmigkeit bei Anstrengung"; „Um eine
     * Anämie festzustellen, ist ein umfangreiches ärztliches Gespräch
     * (Anamnese) wesentlich. … Anschließend wird eine Blutprobe … untersucht."
     * Bis zur Fassung 30: „ein Blutbild klärt das in einer Viertelstunde" –
     * die Dauer nennt keine geprüfte Quelle.
     */
    warum: 'Blässe, Schwäche und Kurzatmigkeit bei Anstrengung nennt gesund.bund.de '
      + 'als mögliche Zeichen einer Blutarmut. Festgestellt wird sie im ärztlichen '
      + 'Gespräch und mit einer Blutprobe.',
  },
  {
    id: 'fieber',
    name: 'Fieber dazu',
    dringlichkeit: 'zeitnah',
    warum: 'Fieber gehört nicht zu einer gereizten Magenschleimhaut.',
  },
  /*
   * Die Warnzeichen des Kopfes. Sie stehen in derselben Liste, damit die
   * Warnkarte und der Bericht sie wie alle anderen finden – aber mit dem
   * Vermerk `bereich`, damit der Bauchbogen sie nicht anbietet und der
   * Kopfbogen nur sie. Wer im Bauchbogen „Kopfschmerz mit steifem Nacken"
   * liest, hält die Liste für Lärm und kreuzt dann auch das Blut nicht an.
   */
  {
    id: 'donnerschlag',
    name: 'Kopfschmerz, der binnen Sekunden bis zu einer Minute so stark war wie nie zuvor – auch beim Sex, Pressen oder Sport',
    dringlichkeit: 'sofort',
    bereich: 'kopf',
    warum: 'Ein Schmerz, der schlagartig auf dem Höhepunkt ist, kann eine Blutung '
      + 'im Kopf sein – auch wenn er wieder nachlässt. Notaufnahme oder 112, '
      + 'nicht der nächste Termin.',
  },
  /*
   * Nicht „zum ersten Mal". Wer eine Migräne mit Aura kennt, erklärt sich
   * einen Schlaganfall mit „kenne ich von meiner Aura" weg – das ist die
   * klassische Verzögerung. Und eine zweite Lähmung ist genauso ein Notfall
   * wie die erste. Was Aura und Ausfall trennt, ist nicht die Neuheit, sondern
   * der Charakter: Tempo, Dauer, Lähmung, Sprache.
   */
  {
    id: 'kopfausfall',
    name: 'Lähmung, Taubheit einer Körperseite, Sprachstörung, Sehverlust oder Verwirrtheit – plötzlich, länger als eine Stunde oder anders als deine gewohnte Aura',
    dringlichkeit: 'sofort',
    bereich: 'kopf',
    warum: 'Eine Aura, wie du sie kennst, baut sich über Minuten auf, wandert und '
      + 'ist nach spätestens einer Stunde ganz vorbei. Was schlagartig da ist, '
      + 'eine Seite lähmt oder taub macht, das Sprechen nimmt oder länger als '
      + 'eine Stunde bleibt, kann ein Schlaganfall sein – auch mit Migräne, und '
      + 'auch wenn du so etwas schon einmal hattest. 112, nicht der nächste Termin.',
  },
  {
    id: 'kopfnacken',
    name: 'Kopfschmerz mit Fieber und steifem Nacken',
    dringlichkeit: 'sofort',
    bereich: 'kopf',
    warum: 'Die drei zusammen sind die Zeichen einer Hirnhautentzündung. Nicht abwarten.',
  },
  {
    id: 'kopfsturz',
    name: 'Kopfschmerz nach einem Sturz oder Schlag auf den Kopf',
    dringlichkeit: 'zeitnah',
    bereich: 'kopf',
    warum: 'Gehört angesehen, auch wenn es Tage her ist. Kommt Erbrechen, '
      + 'Verwirrtheit oder Schläfrigkeit dazu, oder nimmst du einen Blutverdünner: '
      + 'sofort, nicht zeitnah.',
  },
  {
    id: 'kopfneu50',
    name: 'Kopfschmerz, der zum ersten Mal im Leben nach dem 50. Geburtstag kommt',
    dringlichkeit: 'zeitnah',
    bereich: 'kopf',
    warum: 'So spät fängt selten eine Migräne neu an. Das gehört einmal angesehen, '
      + 'mit Blutwerten – mit Kauschmerz, Sehstörung oder empfindlichen Schläfen zügig.',
  },
  {
    id: 'kopfschwanger',
    name: 'Neuer oder anderer Kopfschmerz in der Schwangerschaft oder in den Wochen nach der Geburt',
    dringlichkeit: 'zeitnah',
    bereich: 'kopf',
    warum: 'In dieser Zeit stecken hinter einem neuen Kopfschmerz Dinge, die man '
      + 'messen und behandeln kann – Blutdruck zum Beispiel. Mit Sehstörung, '
      + 'Schwellungen oder Oberbauchschmerz: sofort.',
  },
  {
    id: 'kopfanstrengung',
    name: 'Kopfschmerz, der zum ersten Mal bei Husten, Pressen, Sex oder Anstrengung kommt',
    dringlichkeit: 'zeitnah',
    bereich: 'kopf',
    warum: 'Ein Kopfschmerz, der sich durch Druck auslösen lässt, hat oft einen '
      + 'harmlosen Grund – und gehört trotzdem einmal angesehen. Kommt er '
      + 'schlagartig und so stark wie nie, ist es die Zeile ganz oben.',
  },
  {
    id: 'kopfwandel',
    name: 'Kopfschmerz, der anders ist als dein gewohnter – anderer Ort, andere Art, andere Begleitzeichen – oder der über Wochen immer häufiger oder stärker wird',
    dringlichkeit: 'zeitnah',
    bereich: 'kopf',
    warum: 'Ein wiederkehrender Kopfschmerz hat sein Muster, und du kennst deins. '
      + 'Einer, der anders sitzt, sich anders anfühlt oder andere Begleitzeichen '
      + 'hat, ist ein neuer Kopfschmerz, bis jemand hingesehen hat – nicht wegen '
      + 'des einzelnen Tages, sondern wegen des Unterschieds.',
  },
];

const WARN_MAP = Object.fromEntries(WARNZEICHEN.map((w) => [w.id, w]));

export function warnzeichenVon(id) {
  return WARN_MAP[id] || null;
}

/**
 * Welche Warnzeichen im Tagebuch stehen – mit Datum und Häufigkeit.
 *
 * Ohne Zeitgrenze und ohne Schwelle: Ein einziges Mal Blut erbrochen ist ein
 * einziges Mal zu viel, und ein Eintrag von vor drei Monaten, der nie
 * abgeklärt wurde, ist keine alte Nachricht.
 *
 * Gesucht wird in *allen* Eintragungen, nicht nur in den Beschwerden. Seit es
 * den Stuhlgang als eigene Art gibt, lassen sich schwarzer Stuhl und frisches
 * Blut im Beschwerde- und im Stuhlbogen ankreuzen (siehe den Stuhlbogen in
 * js/app.js); wer nur in den Beschwerden sucht, übersieht die Einträge aus dem
 * Stuhlbogen. Bis zur Fassung 30 hießen die beiden hier „die zwei wichtigsten
 * Warnzeichen überhaupt" – eine Rangfolge, die keine Quelle aufstellt und die
 * auch nicht zu den Stufen oben passt (frisches Blut ist „zeitnah").
 */
export function warnungen(eintraege) {
  const zaehler = new Map();
  eintraege.filter((e) => Array.isArray(e.warnzeichen)).forEach((e) => {
    (e.warnzeichen || []).forEach((id) => {
      const w = WARN_MAP[id];
      if (!w) return;
      const v = zaehler.get(id) || { ...w, anzahl: 0, zuerst: e.am, zuletzt: e.am };
      v.anzahl += 1;
      if (e.am < v.zuerst) v.zuerst = e.am;
      if (e.am > v.zuletzt) v.zuletzt = e.am;
      zaehler.set(id, v);
    });
  });
  // Das Dringende zuerst, sonst nach Häufigkeit.
  const rang = { sofort: 0, zeitnah: 1 };
  return [...zaehler.values()]
    .sort((a, b) => (rang[a.dringlichkeit] - rang[b.dringlichkeit]) || (b.anzahl - a.anzahl));
}

/*
 * ---------------------------------------------------------------------------
 * 2. Die Muster
 * ---------------------------------------------------------------------------
 *
 * Jedes Muster prüft ein paar Bedingungen an den eigenen Daten. Jede erfüllte
 * Bedingung bringt Punkte *und* einen Beleg im Klartext – ein Punktestand ohne
 * Begründung wäre ein Orakel. Angezeigt wird nur, was mindestens zwei Belege
 * hat: Ein einzelner Treffer ist noch kein Bild.
 */

const SAEURE_ARTEN = ['brennen', 'sodbrennen', 'aufstossen'];
const FUELLE_ARTEN = ['druck', 'uebelkeit', 'appetit'];
const DARM_ARTEN = ['blaehung', 'krampf'];

const pz = (x) => `${Math.round(x * 100)} %`;

function musterSaeure(d) {
  const belege = [];
  let punkte = 0;
  const a = artAnteil(d.eintraege, SAEURE_ARTEN);
  if (a.gesamt >= 5 && a.anteil >= 0.5) {
    punkte += 2;
    belege.push(`In ${a.anzahl} von ${a.gesamt} Eintragungen ging es um Brennen, `
      + `Sodbrennen oder Aufstoßen (${pz(a.anteil)}).`);
  }
  const nacht = d.zeiten.find((z) => z.id === 'nacht');
  const abend = d.zeiten.find((z) => z.id === 'abend');
  const spaet = (nacht ? nacht.anzahl : 0) + (abend ? abend.anzahl : 0);
  const gesamtZeiten = d.zeiten.reduce((s, z) => s + z.anzahl, 0);
  if (gesamtZeiten >= 5 && spaet / gesamtZeiten >= 0.4) {
    punkte += 1;
    belege.push(`${spaet} von ${gesamtZeiten} Beschwerden traten abends oder nachts auf.`);
  }
  const spaetEssen = d.bilanz.find((b) => b.id === 'spaet');
  if (spaetEssen && spaetEssen.genug && spaetEssen.differenz >= 1) {
    punkte += 1;
    belege.push('Nach spätem Essen war es im Mittel deutlich schlechter als sonst.');
  }
  return { punkte, belege };
}

function musterFuelle(d) {
  const belege = [];
  let punkte = 0;
  const a = artAnteil(d.eintraege, FUELLE_ARTEN);
  if (a.gesamt >= 5 && a.anteil >= 0.5) {
    punkte += 2;
    belege.push(`In ${a.anzahl} von ${a.gesamt} Eintragungen ging es um Völlegefühl, `
      + `Übelkeit oder fehlenden Appetit (${pz(a.anteil)}).`);
  }
  if (d.essen.bewertbar >= 8 && d.essen.anteilNachDemEssen >= 0.6) {
    punkte += 2;
    belege.push(`${d.essen.nachDemEssen} von ${d.essen.bewertbar} zuordenbaren `
      + `Beschwerden kamen innerhalb von zwei Stunden nach dem Essen.`);
  }
  const gross = d.bilanz.find((b) => b.id === 'gross');
  if (gross && gross.genug && gross.differenz >= 1) {
    punkte += 1;
    belege.push('Nach großen Portionen war es im Mittel schlechter als nach kleinen.');
  }
  return { punkte, belege };
}

function musterNuechtern(d) {
  const belege = [];
  let punkte = 0;
  if (d.essen.bewertbar >= 8 && d.essen.anteilNuechtern >= 0.5) {
    // Höher gewichtet als die anderen Muster, und das mit Absicht: „Brennen"
    // haben fast alle, aber *wann* es kommt, ist die spezifische Angabe. Sie
    // trennt den Nüchternschmerz vom Völlegefühl nach dem Essen – und das sind
    // zwei verschiedene Sprechstunden.
    punkte += 4;
    belege.push(`${d.essen.nuechtern} von ${d.essen.bewertbar} zuordenbaren `
      + `Beschwerden kamen erst vier Stunden oder länger nach der letzten Mahlzeit.`);
    // Die Gegenprobe gehört dazu: Dass es *nicht* nach dem Essen kommt, ist
    // hier der halbe Befund, und ohne ihn stünde die Aussage auf einem Bein.
    punkte += 1;
    belege.push(`Nur ${d.essen.nachDemEssen} davon kamen innerhalb von zwei `
      + `Stunden nach einer Mahlzeit.`);
  }
  const nacht = d.zeiten.find((z) => z.id === 'nacht');
  if (nacht && nacht.anzahl >= 3) {
    punkte += 1;
    belege.push(`${nacht.anzahl}-mal traten Beschwerden nachts auf.`);
  }
  return { punkte, belege };
}

function musterDarm(d) {
  const belege = [];
  let punkte = 0;
  const a = artAnteil(d.eintraege, DARM_ARTEN);
  if (a.gesamt >= 5 && a.anteil >= 0.4) {
    punkte += 2;
    belege.push(`In ${a.anzahl} von ${a.gesamt} Eintragungen ging es um Blähungen `
      + `oder Krämpfe (${pz(a.anteil)}).`);
  }
  ['huelsen', 'milch', 'rohkost', 'vollkorn'].forEach((id) => {
    const b = d.bilanz.find((x) => x.id === id);
    if (b && b.genug && b.differenz >= 1) {
      punkte += 1;
      belege.push(`Auffällig nach Mahlzeiten mit ${d.name(id)} `
        + `(${b.faelle} Mahlzeiten damit, ${b.gegenFaelle} ohne).`);
    }
  });
  return { punkte, belege };
}

function musterNsar(d) {
  const belege = [];
  let punkte = 0;
  if (d.nsarTage >= 3) {
    punkte += 3;
    belege.push(`An ${d.nsarTage} Tagen wurde ein entzündungshemmendes `
      + `Schmerzmittel eingetragen (Ibuprofen, Diclofenac, ASS oder ähnlich).`);
    if (d.nsarSchnitt > d.schnittGesamt + 0.5) {
      punkte += 1;
      belege.push(`An diesen Tagen lag die Beschwerdestärke bei `
        + `${d.nsarSchnitt.toFixed(1).replace('.', ',')} statt `
        + `${d.schnittGesamt.toFixed(1).replace('.', ',')}.`);
    }
  }
  return { punkte, belege };
}

function musterStress(d) {
  const belege = [];
  let punkte = 0;
  [['stress', 'Anspannung'], ['schlaf', 'schlechtem Schlaf'], ['stimmung', 'gedrückter Stimmung']]
    .forEach(([id, wort]) => {
      const f = d.faktoren[id];
      if (f && f.genug && f.differenz >= 1) {
        punkte += 2;
        belege.push(`An Tagen mit ${wort} lag die Beschwerdestärke bei `
          + `${f.hoch.schnitt.toFixed(1).replace('.', ',')} statt `
          + `${f.niedrig.schnitt.toFixed(1).replace('.', ',')} `
          + `(${f.hoch.tage} gegen ${f.niedrig.tage} Tage).`);
      }
    });
  return { punkte, belege };
}

function musterZyklus(d) {
  const belege = [];
  let punkte = 0;
  if (!d.zyklusBelastbar || d.phasen.length < 2) return { punkte, belege };
  const sortiert = [...d.phasen].sort((a, b) => b.schnitt - a.schnitt);
  const hoch = sortiert[0];
  const tief = sortiert[sortiert.length - 1];
  if (hoch.schnitt - tief.schnitt >= 1.5 && hoch.tage >= 4 && tief.tage >= 4) {
    punkte += 3;
    belege.push(`In der Phase „${hoch.name}" lag die Beschwerdestärke bei `
      + `${hoch.schnitt.toFixed(1).replace('.', ',')} (${hoch.tage} Tage), `
      + `in der Phase „${tief.name}" bei ${tief.schnitt.toFixed(1).replace('.', ',')} `
      + `(${tief.tage} Tage).`);
  }
  return { punkte, belege };
}

/*
 * Das Muster, wegen dem dieses Modul überhaupt nach dem Unterleib fragt.
 *
 * Bis eine Endometriose erkannt wird, dauert es oft Jahre (gesund.bund.de/
 * endometriose, Stand 21.08.2025), und sie kann zusammen mit einem Reizdarm
 * vorkommen oder für einen gehalten werden (Ballard et al., BJOG 2008, PMID
 * 18715240, Abstract) – weitere Belege im Kopf von js/unterleib.js. Die
 * Gewichte der Merkmale (m.gewicht) kommen von dort; sie sind eine Festlegung
 * dieser App. Bis zur Fassung 30 stand hier, Endometriose werde „im Mittel
 * sieben bis zehn Jahre lang nicht erkannt", die häufigste Fehldeutung sei
 * „Reizdarm", und der tiefe Schmerz beim Sex habe „die größte Aussagekraft" –
 * das trägt keine geprüfte Quelle.
 */
function musterUnterleib(d) {
  const belege = [];
  let punkte = 0;
  const u = d.unterleib;
  // Ohne die eigens dafür eingeschalteten Fragen gibt es hier nichts zu sagen,
  // was das Zyklusmuster nicht schon sagt.
  if (!u || !u.neueFragen || !u.ansprechen) return { punkte, belege };

  u.merkmale.filter((m) => m.erfuellt).forEach((m) => {
    punkte += m.gewicht;
    belege.push(`${m.name}: ${m.text}.`);
  });

  const offen = u.merkmale.filter((m) => !m.pruefbar);
  if (offen.length) {
    belege.push(`Nicht prüfbar: ${offen.map((m) => m.name.toLowerCase()).join(', ')} `
      + `– das kann dafür sprechen oder dagegen, es ist schlicht offen.`);
  }
  return { punkte, belege };
}

/**
 * Die Muster mit dem, was dahinterstecken kann – und, das ist die eigentliche
 * Auskunft, womit sich das eine vom anderen unterscheiden lässt.
 *
 * Quellen für den Wortlaut der Fassung 30 (dieselben Sätze, die js/luecken.js,
 * js/mittel.js, js/unterleib.js und unterleibVorschlag in js/app.js schon
 * berichtigt hatten):
 *
 *   Refluxkrankheit  gesund.bund.de, Sodbrennen und Refluxkrankheit (Stand
 *                    04.04.2025): „Eine Refluxerkrankung lässt sich an den
 *                    typischen Symptomen erkennen. … Bei einem Verdacht auf
 *                    Refluxkrankheit sind weitere Untersuchungen möglich. Dazu
 *                    gehören eine Magenspiegelung und die Messung des pH-Werts
 *                    in der unteren Speiseröhre." Bis zur Fassung 30: „oft wird
 *                    zuerst probeweise ein Säureblocker gegeben" – die
 *                    Reihenfolge nennt keine geprüfte Quelle.
 *   Helicobacter     gesund.bund.de/gastritis (Stand 13.11.2025): Gewebeproben,
 *                    Atemtest, „Blut- oder Stuhluntersuchung";
 *                    gesund.bund.de/reizmagen-funktionelle-dyspepsie (Stand
 *                    05.02.2026): „kann gut mit Antibiotika behandelt werden";
 *                    gesund.bund.de/magengeschwuer (Stand 07.01.2022): „frühestens
 *                    nach 4 Wochen kontrolliert, ob die Therapie erfolgreich war
 *                    … Sind sie noch nachweisbar, kann die Behandlung …
 *                    wiederholt werden". Bis zur Fassung 30: „Behandelbar, und
 *                    dann ist es weg."
 *   Funkt. Dyspepsie gesund.bund.de/reizmagen-funktionelle-dyspepsie: „Von einem
 *                    Reizmagen wird deshalb erst gesprochen, wenn andere
 *                    Ursachen für die Beschwerden abgeklärt und ausgeschlossen
 *                    wurden"; „eine der häufigsten Erkrankungen des
 *                    Magen-Darm-Trakts"; „verschiedene Behandlungsmöglichkeiten".
 *                    Bis zur Fassung 30: „Die Diagnose, die bleibt, wenn die
 *                    Spiegelung nichts zeigt" – die Spiegelung als Maßstab nennt
 *                    die Seite nicht. Aus demselben Grund ist beim
 *                    Nüchternschmerz „Übersäuerung ohne Geschwür – Bleibt übrig,
 *                    wenn die Spiegelung unauffällig ist" gestrichen: Eine
 *                    „Übersäuerung" als Restbefund nennt keine geprüfte Quelle;
 *                    was nach dem Ausschluss anderer Ursachen bleibt, heißt dort
 *                    Reizmagen.
 *   Nüchternschmerz  gesund.bund.de/zwoelffingerdarmgeschwuer (Stand 27.01.2022):
 *                    „Zur Diagnose reicht meist eine Magenspiegelung mit
 *                    Gewebeentnahme."; „Bei einem Zwölffingerdarmgeschwür kommt es
 *                    – anders als beim Magengeschwür – eher bei leerem Magen zu
 *                    Beschwerden. Nach dem Essen bessern sie sich oft."; „meist
 *                    die Folge einer Infektion mit dem Bakterium Helicobacter
 *                    pylori". Bis zur Fassung 30: „das klassische Muster" und
 *                    „häufigste Ursache" ohne Quelle, und die Frage behauptete
 *                    „bessert sich nach dem Essen" – das Muster zählt nur
 *                    Beschwerden mit Abstand zur Mahlzeit.
 *   Laktose          gesund.bund.de, Laktoseintoleranz (Stand 23.02.2026, „Wie
 *                    wird eine Laktoseintoleranz diagnostiziert?"): „Das
 *                    Standardverfahren in Deutschland ist der Atemtest." Bis zur
 *                    Fassung 30: „H2-Atemtest, dauert einen Vormittag" – die
 *                    Dauer nennt keine geprüfte Quelle. Einen Atemtest auf
 *                    Fruktose belegt der North American Consensus (Am J
 *                    Gastroenterol 2017, PMID 28323273, Abstract: „Consensus
 *                    doses for lactulose, glucose, fructose and lactose BT
 *                    …"; siehe provokationTeil in js/app.js); eine Dauer
 *                    nennt auch er nicht. Der sichtbare Satz bleibt bei Laktose,
 *                    weil er die Seite von gesund.bund.de wiedergibt, und
 *                    überlässt die Wahl des Tests der Praxis.
 *   Zöliakie         EMA/CHMP/639441/2013 corr. 2 (9. Oktober 2017), S. 4:
 *                    „Diagnosis is by blood tests to check for relevant
 *                    antibodies, followed by endoscopy/gastroscopy and biopsy.
 *                    … However all tests lose their usefulness if the person has
 *                    already been eating a gluten-free diet for 6–12 months."
 *                    Bis zur Fassung 30: „sonst ist er falsch negativ" – so
 *                    zwingend sagt es die Quelle nicht.
 *   NSAR             gesund.bund.de/gastritis: „Zu den häufigsten Gründen zählen
 *                    eine Infektion mit Helicobacter-Pylori-Bakterien oder die
 *                    häufige Einnahme" von NSAR; „Zur weiteren Abklärung kann
 *                    danach eine Magenspiegelung sinnvoll sein"; bei erhöhtem
 *                    Risiko für ein Geschwür „vorbeugend zusätzlich ein
 *                    säurehemmendes Medikament … Die Ärztin oder der Arzt berät
 *                    hierzu." Bis zur Fassung 30: „die häufigste vermeidbare
 *                    Ursache" (eine Rangfolge, die dort nicht steht) und
 *                    „Auslassversuch unter ärztlicher Begleitung".
 *   Zyklus           gesund.bund.de/regelschmerzen (Stand 27.08.2024):
 *                    „Regelschmerzen sind weit verbreitet." – „Einige Frauen
 *                    leiden zusätzlich zu Krämpfen an Übelkeit, Erbrechen oder
 *                    Durchfall." – „Bei sehr starken oder sich verschlimmernden
 *                    Schmerzen ist eine ärztliche Untersuchung sinnvoll." Bis zur
 *                    Fassung 30: „Häufig und für sich genommen harmlos – die
 *                    Hormonschwankung wirkt auf den Darm"; die Entwarnung
 *                    widerspricht dem Rat zur Abklärung starker Schmerzen.
 *                    Das Muster kann in jeder Phase liegen (musterZyklus), nicht
 *                    nur bei der Regel; deshalb dazu
 *                    gesund.bund.de/praemenstruelles-syndrom-pms (Stand
 *                    21.10.2022): Beschwerden „einige Tage bis zwei Wochen vor der
 *                    Regelblutung", darunter „Schlaf- oder Verdauungsprobleme".
 *                    (Angezeigt wird ein Muster erst ab zwei Belegen;
 *                    musterZyklus liefert bisher höchstens einen.)
 *   Endometriose     gesund.bund.de/endometriose (Stand 21.08.2025): „Oft dauert
 *                    es Jahre bis zur Diagnose"; nach dem Gespräch „eine
 *                    allgemeine körperliche sowie gynäkologische Untersuchung.
 *                    Weitere Untersuchungen können sich je nach Beschwerden
 *                    anschließen, bis hin zu einer Spiegelung der Bauchhöhle
 *                    (Laparoskopie)". Bis zur Fassung 30: „Wird im Mittel sieben
 *                    bis zehn Jahre lang für einen Reizdarm gehalten" und
 *                    „Tastuntersuchung, Ultraschall" – beides steht so in keiner
 *                    geprüften Quelle.
 *   Adenomyose       gesund.bund.de/endometriose: „Bei einer Endometriose findet
 *                    sich Gewebe, welches der Gebärmutterschleimhaut ähnelt, in
 *                    der Gebärmutterwand oder außerhalb der Gebärmutter."; „Die
 *                    erste Anlaufstelle bei Endometriose ist meist die
 *                    Frauenarztpraxis." Bis zur Fassung 30: „Ultraschall, oft
 *                    zusätzlich MRT" – ohne Quelle.
 *   Beckenboden      EMA, Ryeqo, Bewertungsbericht EMA/528959/2023 (14.09.2023),
 *                    S. 45, Ausschlusskriterium 1: „chronic pelvic pain that was
 *                    not caused by endometriosis (eg, vaginismus, … or pelvic
 *                    floor disorders)". Bis zur Fassung 30: „Kommt eher bei
 *                    Schmerz am Eingang und bei Verstopfung in Frage; … ist gut
 *                    behandelbar" – eine Zuordnung und ein Erfolgsversprechen
 *                    ohne Quelle.
 *   Nebeneinander    Bis zur Fassung 30: „Möglich und häufig – … ohne
 *                    gemeinsame Ursache"; Häufigkeit und fehlende gemeinsame
 *                    Ursache nennt keine geprüfte Quelle. Geblieben ist, dass
 *                    beides zugleich da sein kann und sich nur klären lässt,
 *                    wenn man beides ansieht.
 *   Anspannung       gesund.bund.de/stress (Stand 14.01.2026): bei einer akuten
 *                    Stressreaktion werden Vorgänge zurückgefahren, „unter
 *                    anderem die Magen-, Darm- und Blasentätigkeit"; bei
 *                    anhaltendem Stress können „Reizdarm- oder
 *                    Reizmagen-Symptome" entstehen. Bis zur Fassung 30:
 *                    „Entspannungsverfahren sind hier eine Behandlung, keine
 *                    Beschäftigung" – eine Wirkaussage ohne Quelle, die der
 *                    Reiter „Ruhe" schon gestrichen hatte.
 */
const MUSTER = [
  {
    id: 'saeure',
    name: 'Säuretypisches Bild',
    satz: 'Brennen, Sodbrennen und Aufstoßen stehen im Vordergrund, oft abends '
      + 'oder im Liegen.',
    pruefe: musterSaeure,
    ursachen: [
      { name: 'Refluxkrankheit', klaerung: 'Laut gesund.bund.de an den typischen Beschwerden zu erkennen; bei Verdacht sind weitere Untersuchungen möglich, etwa eine Magenspiegelung und die Messung des Säurewerts in der unteren Speiseröhre.' },
      { name: 'Gastritis', klaerung: 'Magenspiegelung mit Gewebeprobe – nur die zeigt, ob und welche Entzündung da ist.' },
      { name: 'Helicobacter pylori', klaerung: 'Atemtest, Stuhltest oder Probe bei der Spiegelung. Laut gesund.bund.de gut mit Antibiotika behandelbar; ob der Keim danach weg ist, wird nachgeprüft.' },
    ],
    fragen: [
      'Wäre ein Test auf Helicobacter pylori sinnvoll?',
      'Spricht etwas für oder gegen einen befristeten Versuch mit einem Säureblocker?',
    ],
  },
  {
    id: 'nuechtern',
    name: 'Nüchternschmerz',
    satz: 'Die Beschwerden kommen mit Abstand zur letzten Mahlzeit oder nachts, '
      + 'nicht direkt nach dem Essen.',
    pruefe: musterNuechtern,
    ursachen: [
      { name: 'Geschwür im Zwölffingerdarm', klaerung: 'Zur Diagnose reicht laut gesund.bund.de meist eine Magenspiegelung mit Gewebeprobe. Die Beschwerden kommen dabei eher bei leerem Magen und bessern sich nach dem Essen oft.' },
      { name: 'Helicobacter pylori', klaerung: 'Atem-, Stuhl- oder Gewebetest. Ein Geschwür im Zwölffingerdarm ist laut gesund.bund.de meist die Folge einer Infektion mit diesem Bakterium.' },
    ],
    fragen: [
      'Der Schmerz kommt oft nüchtern, mit Abstand zum Essen – wie wird das eingeordnet?',
      'Ist eine Magenspiegelung angezeigt?',
    ],
  },
  {
    id: 'fuelle',
    name: 'Völlegefühl nach dem Essen',
    satz: 'Druck, frühes Sattsein und Übelkeit, vor allem in den zwei Stunden '
      + 'nach einer Mahlzeit.',
    pruefe: musterFuelle,
    ursachen: [
      { name: 'Funktionelle Dyspepsie', klaerung: 'Auch Reizmagen genannt. Davon wird laut gesund.bund.de erst gesprochen, wenn andere Ursachen der Beschwerden abgeklärt und ausgeschlossen sind; dort zählt sie zu den häufigsten Erkrankungen des Magen-Darm-Trakts, mit verschiedenen Behandlungsmöglichkeiten.' },
      { name: 'Verzögerte Magenentleerung', klaerung: 'Szintigrafie oder Atemtest; kommt unter anderem bei langjährigem Diabetes vor.' },
      { name: 'Gastritis', klaerung: 'Magenspiegelung mit Gewebeprobe.' },
    ],
    fragen: [
      'Passt das Bild eher zu einer funktionellen Störung oder steckt etwas dahinter?',
      'Wären kleinere, häufigere Mahlzeiten hier der richtige Ansatz?',
    ],
  },
  {
    id: 'darm',
    name: 'Darmbetontes Bild',
    satz: 'Blähungen und Krämpfe stehen im Vordergrund, oft nach bestimmten '
      + 'Kohlenhydraten.',
    pruefe: musterDarm,
    ursachen: [
      { name: 'Reizdarmsyndrom', klaerung: 'Diagnose nach Ausschluss; die Auslöserliste aus diesem Tagebuch ist dafür brauchbares Material.' },
      { name: 'Laktose- oder Fruktoseunverträglichkeit', klaerung: 'Bei Laktoseintoleranz ist laut gesund.bund.de der Atemtest das Standardverfahren in Deutschland. Welcher Test infrage kommt, klärt die Praxis.' },
      { name: 'Zöliakie', klaerung: 'Bluttest auf Antikörper, danach Spiegelung mit Gewebeprobe. Laut EMA verlieren diese Untersuchungen ihren Nutzen, wenn schon 6 bis 12 Monate glutenfrei gegessen wurde.' },
    ],
    fragen: [
      'Wäre ein Atemtest auf Laktose oder Fruktose sinnvoll?',
      'Ist Zöliakie schon einmal ausgeschlossen worden?',
    ],
  },
  {
    id: 'nsar',
    name: 'Zusammenhang mit Schmerzmitteln',
    satz: 'Im Tagebuch stehen entzündungshemmende Schmerzmittel. Häufig genommen, gehören '
      + 'sie laut gesund.bund.de neben Helicobacter zu den häufigsten Gründen für eine '
      + 'entzündete Magenschleimhaut.',
    pruefe: musterNsar,
    ursachen: [
      { name: 'NSAR-bedingte Magenschleimhautschädigung', klaerung: 'Ob eine Magenspiegelung zur Abklärung sinnvoll ist und ob ein anderes Mittel oder ein Magenschutz infrage kommt, klärt die Praxis.' },
    ],
    fragen: [
      'Ich nehme regelmäßig ein entzündungshemmendes Schmerzmittel – gibt es dafür eine magenfreundlichere Alternative?',
      'Wenn es dabei bleiben muss: Ist ein Magenschutz angezeigt?',
    ],
  },
  {
    id: 'zyklus',
    name: 'Zyklusgebundenes Bild',
    satz: 'Die Beschwerden schwanken deutlich mit dem Zyklus.',
    pruefe: musterZyklus,
    ursachen: [
      { name: 'Zyklusabhängige Verdauungsbeschwerden', klaerung: 'Regelschmerzen sind laut gesund.bund.de weit verbreitet, bei manchen mit Übelkeit, Erbrechen oder Durchfall; in den Tagen vor der Regelblutung können beim prämenstruellen Syndrom auch Verdauungsprobleme vorkommen. Bei sehr starken oder sich verschlimmernden Schmerzen ist eine ärztliche Untersuchung sinnvoll.' },
      { name: 'Endometriose', klaerung: 'Kommt in Frage, wenn dazu starke Regelschmerzen, Schmerzen beim Sex oder zyklische Darmbeschwerden gehören. Wird oft jahrelang übersehen; abgeklärt wird sie gynäkologisch.' },
    ],
    fragen: [
      'Meine Beschwerden folgen dem Zyklus – kann das zusammenhängen?',
      'Wäre eine gynäkologische Abklärung sinnvoll?',
    ],
  },
  {
    id: 'unterleib',
    name: 'Unterleib und Zyklus zusammen auffällig',
    satz: 'Die Bauchbeschwerden gehen mit Beschwerden im Unterleib einher – '
      + 'das ist ein anderes Bild als ein reiner Reizdarm.',
    pruefe: musterUnterleib,
    ursachen: [
      { name: 'Endometriose', klaerung: 'Abgeklärt wird sie gynäkologisch: laut gesund.bund.de mit Gespräch und Untersuchung, je nach Beschwerden auch mit weiteren Untersuchungen bis hin zu einer Bauchspiegelung. Bis zur Diagnose dauert es oft Jahre.' },
      { name: 'Adenomyose', klaerung: 'Gewebe, das der Gebärmutterschleimhaut ähnelt, in der Gebärmutterwand. Laut gesund.bund.de zählt auch das zur Endometriose; abgeklärt wird es ebenfalls gynäkologisch.' },
      { name: 'Beckenbodenstörung', klaerung: 'Kann laut einem Bewertungsbericht der EMA chronische Beckenschmerzen machen, die nicht von einer Endometriose kommen. Ob das hier eine Rolle spielt, klärt die Praxis.' },
      { name: 'Reizdarm und Regelschmerz nebeneinander', klaerung: 'Zwei Dinge können auch gleichzeitig da sein. Das lässt sich nur klären, indem man beides ansieht.' },
    ],
    fragen: [
      'Meine Darmbeschwerden hängen am Zyklus, und ich habe Schmerzen beim Sex – kann eine Endometriose dahinterstecken?',
      'Wäre eine gynäkologische Abklärung sinnvoll, bevor weiter Richtung Reizdarm behandelt wird?',
    ],
  },
  {
    id: 'stress',
    name: 'Zusammenhang mit Anspannung und Schlaf',
    satz: 'An angespannten Tagen und nach schlechten Nächten ist es messbar '
      + 'schlechter.',
    pruefe: musterStress,
    ursachen: [
      { name: 'Stressassoziierte Beschwerden', klaerung: 'Bei akutem Stress fährt der Körper laut gesund.bund.de unter anderem die Magen- und Darmtätigkeit zurück, und bei anhaltendem Stress können Reizdarm- oder Reizmagen-Beschwerden entstehen. Was an Unterstützung infrage kommt, lässt sich in der Praxis besprechen.' },
    ],
    fragen: [
      'Meine Beschwerden hängen deutlich an Anspannung – was ist da an Unterstützung möglich?',
    ],
  },
];

/**
 * Das ganze Bild.
 *
 * @param {{eintraege, tage, fenster, mindestFaelle, bilanz, nsarNamen}} d
 *   `bilanz` ist das Ergebnis von ausloeserBilanz(), `nsarNamen` die Prüfung,
 *   ob ein eingetragenes Mittel ein NSAR ist – beides kommt von außen herein,
 *   damit diese Datei nichts doppelt rechnet und nichts über die Anzeige weiß.
 */
export function bildLesen(d) {
  const eintraege = d.eintraege || [];
  const tage = d.tage || {};

  const tageMitBeschwerden = [...new Set(eintraege
    .filter((e) => e.art === 'beschwerde').map((e) => e.am))];
  const alleNotiert = [...new Set([...eintraege.map((e) => e.am), ...Object.keys(tage)])]
    .filter((iso) => tagesWert(eintraege, iso, tage).notiert);
  const schnittGesamt = alleNotiert.length
    ? alleNotiert.reduce((s, iso) => s + tagesWert(eintraege, iso, tage).wert, 0) / alleNotiert.length
    : 0;

  const nsarTageListe = [...new Set(eintraege
    .filter((e) => e.art === 'medikament' && d.istNsar(e.mittel))
    .map((e) => e.am))];
  const nsarSchnitt = nsarTageListe.length
    ? nsarTageListe.reduce((s, iso) => s + tagesWert(eintraege, iso, tage).wert, 0) / nsarTageListe.length
    : 0;

  const daten = {
    eintraege,
    tage,
    bilanz: d.bilanz || [],
    name: d.name || ((id) => id),
    zeiten: nachTageszeit(eintraege),
    essen: essensbezug(eintraege),
    // Mit der Bewegung (siehe FAKTOR_FRAGEN). musterStress liest davon nur
    // Anspannung, Schlaf und Stimmung – intensive Bewegung ist keine Anspannung.
    faktoren: faktorenBilanz(eintraege, tage, tagesWert),
    phasen: phasenBilanz(eintraege, tage, tagesWert),
    zyklusBelastbar: belastbar(tage),
    nsarTage: nsarTageListe.length,
    nsarSchnitt,
    schnittGesamt,
    unterleib: unterleibsBild(eintraege, tage, tagesWert),
  };

  const muster = MUSTER
    .map((m) => ({ ...m, ...m.pruefe(daten) }))
    // Zwei Belege sind die Untergrenze. Ein einzelner Treffer ist ein Zufall,
    // und ein Zufall, der als „Bild" ausgegeben wird, führt jemanden in die
    // falsche Sprechstunde.
    .filter((m) => m.belege.length >= 2)
    .sort((a, b) => b.punkte - a.punkte);

  return {
    warnungen: warnungen(eintraege),
    muster,
    // Woran das alles hängt – steht in der Anzeige daneben, damit sichtbar ist,
    // wie dünn oder dick die Grundlage ist.
    basis: {
      beschwerden: eintraege.filter((e) => e.art === 'beschwerde').length,
      tageMitBeschwerden: tageMitBeschwerden.length,
      notierteTage: alleNotiert.length,
      zuordenbar: daten.essen.bewertbar,
    },
    fragen: [...new Set(muster.flatMap((m) => m.fragen))].slice(0, 6),
  };
}

/** Reicht die Grundlage, damit die Einordnung überhaupt etwas bedeutet? */
export function genugFuerBild(basis) {
  return basis.notierteTage >= 10 && basis.beschwerden >= 5;
}
