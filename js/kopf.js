/*
 * Kopfschmerzen – eine eigene Eintragsart, und warum gerade das.
 *
 * Die Beschwerden dieser App sind Bauchbeschwerden. Jede Rechnung – der
 * Tageswert, die Auslöserbilanz, die Kriterien, die Richtung – holt sich die
 * Einträge mit `art === 'beschwerde'` und liest deren Stärke. Ein Kopfschmerz,
 * der dort als „Beschwerde mit der Art Kopf" läge, zählte überall als Bauch:
 * Eine 7 am Kopf machte aus dem Kaffee davor einen Auslöser, aus dem Tag einen
 * Beschwerdetag und aus einer ruhigen Woche eine schlechte.
 *
 * Deshalb ist der Kopf eine *Art* wie Stuhlgang oder Medikament, keine
 * Beschwerdeart. Keine der vorhandenen Rechnungen sieht ihn, und das ist kein
 * Versehen, sondern der Zweck: Was hier steht, rechnet nur mit sich selbst.
 *
 * Was den Kopf und den Bauch trotzdem verbinden kann, ist das Schmerzmittel.
 * Die häufige Einnahme entzündungshemmender Schmerzmittel (NSAR, etwa ASS,
 * Diclofenac, Ibuprofen) zählt zu den häufigsten Gründen einer
 * Magenschleimhautentzündung. Wer sie nur kurz bei akuten Schmerzen nimmt,
 * hat laut derselben Quelle eher selten Nebenwirkungen; über Wochen oder
 * Monate genommen, können sie die Schutzfunktion der Schleimhaut stören. Bei
 * starken Migräneschmerzen nehmen viele solche Mittel, daneben auch
 * Paracetamol oder Triptane. Eine Typ-C-Gastritis ist eine, die durch
 * chemische Stoffe entsteht; als Ursache kommen dort unter anderem
 * zurücklaufende Gallenflüssigkeit, Alkohol und bestimmte Schmerzmittel in
 * Frage. (Quellen: gesund.bund.de/gastritis, mit IQWiG, Stand 13.11.2025,
 * „Welche Ursachen hat eine Gastritis?" und „Einnahme von NSAR-
 * Schmerzmitteln"; gesund.bund.de/migraene, Stand 21.12.2022, Behandlung;
 * gesund.bund.de/glossar/typ-c-gastritis.) Deshalb zählt dieses Modul, an
 * wie vielen Kopfschmerztagen ein solches Mittel im Tagebuch steht, und
 * vergleicht den Bauch danach – und zwar, wo es geht, mit Kopfschmerztagen
 * *ohne* ein solches Mittel, damit der Kopfschmerz auf beiden Seiten steht
 * und der Unterschied das Mittel ist.
 *
 * FÜR EINE MIGRÄNE
 *
 * Ein Kopfschmerztagebuch verbessert laut Kopfschmerzklassifikation die
 * diagnostische Genauigkeit und erlaubt, den Medikamentengebrauch genauer zu
 * beurteilen; für häufige Kopfschmerzen nennt sie Schmerz und Begleitsymptome
 * Tag für Tag über mindestens einen Monat (ICHD-3, 2018, „How to use the
 * classification" Punkt 12; 1.3 Note 2). Body Check zählt dafür:
 * Kopfschmerztage je Monat, Tage mit Akutmedikation je Monat und Klasse,
 * Dauer und Stärke der Attacken, Begleitmerkmale, ob der Tag ausgefallen ist,
 * ob das Mittel geholfen hat, und ob die Attacken an der Periode hängen. Die
 * ersten beiden sind die Größen, an denen die Klassifikation ihre Schwellen
 * festmacht; die übrigen sind eine Auswahl der App. Die Schwellen stehen
 * dabei – als Frage für die Sprechstunde, nie als Urteil: Die App zählt
 * Kopfschmerztage, keine Migränetage. Die Definitionen für chronische Migräne
 * und für Kopfschmerz bei Medikamentenübergebrauch verlangen mehr als drei
 * Monate (ICHD-3 1.3 Kriterium A, 8.2 Kriterium B). Body Check rechnet
 * deshalb drei Fenster zu dreißig Tagen – zusammen etwa drei Monate, nicht
 * mehr – und wird erst laut, wenn zwei der drei Fenster über der Schwelle
 * liegen. Ein einzelnes Fenster ist eine Zahl, kein Verlauf.
 */
import { fmtMonat, minutenAmTag, monatsStart, plusMonate, plusTage } from './datum.js';
import { PHASEN, phaseVon, zyklen } from './zyklus.js';
import { eintragZaehlt, tagZaehlt } from './wasser.js';

/*
 * Wie er sich anfühlt. Keine Diagnose-Schublade, sondern Merkmale, nach
 * denen die Kopfschmerzklassifikation Kopfschmerzarten unterscheidet: pochend
 * oder drückend, eine Seite oder beide, Übelkeit oder Erbrechen, Licht- und
 * Lärmempfindlichkeit, Verstärkung durch alltägliche Bewegung, Aura (ICHD-3,
 * 2018, 1.1 Kriterien C und D, 1.2, 2.1 Kriterien C und D). Aus der
 * Kombination schließt eine Ärztin etwas; die App schließt nichts, sie zählt.
 *
 * „Nackenschmerz dabei", nicht „vom Nacken her": Nackensteifigkeit oder
 * Nackenschmerz nennt die Klassifikation als mögliches Zeichen vor oder nach
 * einer Migräneattacke, nicht als Kriterium (ICHD-3, Einleitung zu Kapitel 1:
 * „fatigue and neck stiffness and/or pain"). Ob der Nacken die Ursache ist,
 * beurteilt die Praxis; der Bogen fragt nur, ob er dabei war.
 *
 * Seit der Fassung 28:
 *
 *   * „Licht stört" und „Lärm stört" getrennt. Die Kopfschmerzklassifikation
 *     fragt nach beiden zusammen; wer nur eins davon hat, konnte das bisher
 *     nicht sagen. Das alte `licht` („Licht oder Lärm stören") bleibt mit
 *     `alt: true` in der Liste – sonst zählte kopfZahlen() die früheren
 *     Einträge nicht mehr (siehe KOPF_MAP). Der Bogen zeigt es nur bei einem
 *     Eintrag, der es trägt, und deutet es nie in eines der beiden neuen um.
 *   * „Beidseitig" neben „Einseitig" – die beiden schließen sich im Bogen
 *     aus – und „Schon beim Aufwachen da".
 *   * Drei Merkmale mit `nurMit: 'spannung'`: Sie stehen im Bogen nur, wenn
 *     „Kiefer, Nacken, Schiene" eingeschaltet ist. Gespeicherte bleiben
 *     lesbar und gezählt, auch wenn er wieder aus ist.
 */
export const KOPF_ARTEN = [
  { id: 'pochend', name: 'Pochend, pulsierend' },
  { id: 'drueckend', name: 'Drückend, wie ein Band' },
  { id: 'einseitig', name: 'Einseitig' },
  { id: 'beidseitig', name: 'Beidseitig' },
  { id: 'kopfuebel', name: 'Mit Übelkeit' },
  { id: 'kopferbrechen', name: 'Erbrochen' },
  { id: 'lichtscheu', name: 'Licht stört' },
  { id: 'laermscheu', name: 'Lärm stört' },
  { id: 'licht', name: 'Licht oder Lärm stören', alt: true },
  { id: 'bewegung', name: 'Schlimmer bei Bewegung' },
  { id: 'nacken', name: 'Nackenschmerz dabei' },
  { id: 'aufwachen', name: 'Schon beim Aufwachen da' },
  { id: 'aura', name: 'Aura vorher (Flimmern, Zacken, wanderndes Kribbeln, Wortsuche)' },
  { id: 'kauen', name: 'Schlimmer beim Kauen oder Kieferbewegen', nurMit: 'spannung' },
  { id: 'nackenbewegung', name: 'Schlimmer, wenn ich Kopf oder Nacken bewege', nurMit: 'spannung' },
  { id: 'schlaefe', name: 'An Schläfe oder Kiefer', nurMit: 'spannung' },
];

/** Die beiden Merkmale, von denen höchstens eines zutreffen kann. */
export const KOPF_SEITE = ['einseitig', 'beidseitig'];

/*
 * Wie lange. Vier grobe Stufen statt einer Stundenzahl: Wer eine Attacke
 * hinter sich hat, weiß „den halben Tag" oder „bis übermorgen", aber nicht
 * „elf Stunden". Die Grenzen sind die der Klassifikation: Eine unbehandelte
 * oder erfolglos behandelte Migräneattacke dauert bei Erwachsenen vier
 * Stunden bis drei Tage (ICHD-3, 2018, 1.1 Kriterium B; bei unter
 * 18-Jährigen zwei bis 72 Stunden, Note 3). Kürzer kann sie sein, wenn sie
 * behandelt wurde – früh behandelte Attacken erreichen oft nicht alle
 * Merkmale (Kommentar zu 1.5). Eine stark beeinträchtigende Migräneattacke
 * über 72 Stunden führt die Klassifikation als eigene Komplikation (1.4.1
 * Status migrainosus); dazu der Satz in statusSatz(). „Weiß ich nicht mehr"
 * wird gespeichert, aber nicht gezählt.
 */
export const KOPF_DAUER = [
  { id: 'kurz', name: 'unter 4 Stunden' },
  { id: 'mittel', name: '4 bis 24 Stunden' },
  { id: 'lang', name: '1 bis 3 Tage' },
  { id: 'status', name: 'länger als 3 Tage' },
];

/*
 * Wie der Tag weiterging – in drei Stufen, die die App festlegt. Zum
 * Vergleich: Der Fragebogen MIDAS zählt über die letzten drei Monate die
 * verpassten Tage und die Tage mit höchstens halber Leistung in Beruf oder
 * Schule und im Haushalt sowie die verpassten Tage in Familie und Freizeit
 * (FDA, BLA 761089, COA Consult Review, Reference ID 4245266; EMA-EPAR
 * Ajovy, EMA/118499/2019, S. 38). „Eingeschränkt" ist hier weiter gefasst
 * als „höchstens halbe Leistung". Ja/nein wäre bequemer und verlöre die
 * Mitte: Etwa 90 % der Menschen mit Migräne sind in der Attacke in ihrer
 * Leistungsfähigkeit eingeschränkt, ein Drittel braucht Bettruhe (EMA-EPAR
 * Emgality, EMA/708631/2018, Background: „reduced ability to function").
 */
export const KOPF_VERLAUF = [
  { id: 'normal', name: 'Normal weitergemacht', kurz: '' },
  { id: 'eingeschraenkt', name: 'Eingeschränkt, aber weitergemacht', kurz: 'eingeschränkt' },
  { id: 'ausgefallen', name: 'Ausgefallen – hinlegen müssen, Arbeit oder Pläne abgesagt', kurz: 'ausgefallen' },
];

/** Die Antwort, die man auf der Nachtrag-Karte geben darf, ohne zu raten. */
export const UNBEKANNT = 'unbekannt';

/*
 * Hat das Mittel geholfen? Nach etwa zwei Stunden – zu diesem Zeitpunkt
 * messen Studien, ob ein Mittel gegen die Migräneattacke wirkt (EMA,
 * CPMP/EWP/788/01 Rev. 1, 24.01.2007, „Acute migraine attack trials": „pain-
 * free at 2 hours" als primärer Studienendpunkt). Was daraus für die
 * Behandlung folgt, klärt die Praxis; die App hält nur die Antwort fest.
 */
export const MITTEL_WIRKUNG = [
  { id: 'weg', name: 'Weg' },
  { id: 'besser', name: 'Besser' },
  { id: 'nicht', name: 'Nicht geholfen' },
];

const KOPF_MAP = Object.fromEntries(KOPF_ARTEN.map((a) => [a.id, a]));
const DAUER_MAP = Object.fromEntries(KOPF_DAUER.map((d) => [d.id, d]));
const VERLAUF_MAP = Object.fromEntries(KOPF_VERLAUF.map((v) => [v.id, v]));
const WIRKUNG_MAP = Object.fromEntries(MITTEL_WIRKUNG.map((w) => [w.id, w]));

export function kopfArtName(id) {
  return KOPF_MAP[id] ? KOPF_MAP[id].name : id;
}

export function kopfDauerName(id) {
  return DAUER_MAP[id] ? DAUER_MAP[id].name : '';
}

export function kopfVerlaufKurz(id) {
  return VERLAUF_MAP[id] ? VERLAUF_MAP[id].kurz : '';
}

export function mittelWirkungName(id) {
  return WIRKUNG_MAP[id] ? WIRKUNG_MAP[id].name : '';
}

/**
 * Nur die Kopfschmerz-Einträge, und nur die mit einer Stärke. Mit `heute`
 * bleibt draußen, was danach liegt – ein Bericht für einen früheren
 * Zeitraum darf keinen späteren Anfall mitzählen.
 */
export function kopfEintraege(eintraege, heute) {
  return (eintraege || []).filter((e) => e.art === 'kopf' && Number(e.staerke) >= 1
    && (!heute || e.am <= heute));
}

/** Die Kopfschmerztage als Menge – für alles, was Tage vergleicht. */
export function kopfTageVon(eintraege, heute) {
  return new Set(kopfEintraege(eintraege, heute).map((e) => e.am));
}

/** Ab dieser Uhrzeit reicht ein Kopfschmerz in den nächsten Tag hinein. */
const HINEIN_AB = 18 * 60;

/**
 * Reicht ein Kopfschmerz vom Vortag in diesen Tag hinein?
 *
 * Ja, wenn er am Vortag ab 18 Uhr begann oder als „1 bis 3 Tage" oder
 * „länger als 3 Tage" eingetragen ist. Ein Kopfschmerz an einem solchen Tag
 * ist dann womöglich kein neuer, sondern derselbe – und wer fragt, was einen
 * Kopfschmerz auslöst oder wann er nach einer Einnahme beginnt, darf ihn
 * nicht als neuen zählen. Gezählt wird, was da ist: ohne Dauer und vor 18 Uhr
 * gilt er als vorbei, auch wenn er es nicht war – die Rechnungen lassen
 * solche Tage deshalb nur weg und zählen sie nie als frei.
 */
export function herueberreichend(eintraege, iso) {
  const vortag = plusTage(iso, -1);
  return (eintraege || []).some((e) => e && e.art === 'kopf' && e.am === vortag && Number(e.staerke) >= 1
    && (e.dauer === 'lang' || e.dauer === 'status' || minutenAmTag(e.um) >= HINEIN_AB));
}

/*
 * Die Merkmale, die es erst seit der Fassung 28 gibt. Steht im Zeitraum
 * keines davon, bleibt der Bericht, wie er war – ein Tagebuch aus der
 * Fassung 27 bekommt keine Zeilen, die es nicht füllen konnte.
 */
const KOPF_NEU = ['beidseitig', 'aufwachen', 'lichtscheu', 'laermscheu', 'kauen', 'nackenbewegung', 'schlaefe'];

/**
 * Die Merkmale der Kopfschmerzen eines Zeitraums – so gezählt, wie die
 * Kopfschmerzklassifikation fragt: eine Seite oder beide, pochend oder
 * drückend, Licht und Lärm zusammen oder nur eins, Übelkeit oder Erbrechen,
 * schon beim Aufwachen. Das alte „Licht oder Lärm" steht für sich: Es lässt
 * sich nicht sagen, welches von beiden gemeint war.
 *
 * Gezählt, nicht eingeordnet: Welche Art Kopfschmerz das ist, sagt die
 * Ärztin, nicht diese Zählung.
 *
 * @returns {{ neu: boolean, anzahl: number, zeilen: {id, name, anzahl}[], satz: string }}
 */
export function kopfMerkmale(eintraege, von, bis) {
  const kopf = kopfEintraege(eintraege).filter((e) => (!von || e.am >= von) && (!bis || e.am <= bis));
  const hat = (e, id) => (e.kopfArten || []).includes(id);
  const neu = kopf.some((e) => KOPF_NEU.some((id) => hat(e, id)));
  const zaehl = (fn) => kopf.filter(fn).length;
  const zeilen = [
    { id: 'beidseitig', name: 'beidseitig', anzahl: zaehl((e) => hat(e, 'beidseitig')) },
    { id: 'einseitig', name: 'einseitig', anzahl: zaehl((e) => hat(e, 'einseitig')) },
    { id: 'drueckend', name: 'drückend', anzahl: zaehl((e) => hat(e, 'drueckend')) },
    { id: 'pochend', name: 'pochend', anzahl: zaehl((e) => hat(e, 'pochend')) },
    {
      id: 'lichtlaerm',
      name: 'Licht und Lärm zusammen',
      anzahl: zaehl((e) => hat(e, 'lichtscheu') && hat(e, 'laermscheu')),
    },
    {
      id: 'lichtoderlaerm',
      name: 'nur Licht oder nur Lärm',
      anzahl: zaehl((e) => hat(e, 'lichtscheu') !== hat(e, 'laermscheu')),
    },
    { id: 'licht', name: 'früher eingetragen: Licht oder Lärm', anzahl: zaehl((e) => hat(e, 'licht')) },
    {
      id: 'uebel',
      name: 'mit Übelkeit oder Erbrechen',
      anzahl: zaehl((e) => hat(e, 'kopfuebel') || hat(e, 'kopferbrechen')),
    },
    { id: 'aufwachen', name: 'schon beim Aufwachen', anzahl: zaehl((e) => hat(e, 'aufwachen')) },
  ];
  return {
    neu,
    anzahl: kopf.length,
    zeilen: neu ? zeilen.filter((z) => z.anzahl > 0) : [],
    satz: neu ? 'Gezählt nach den Merkmalen der Kopfschmerzklassifikation (ICHD-3); die '
      + 'Einordnung nimmt die Ärztin vor.' : '',
  };
}

/**
 * Alle Tage, an denen überhaupt etwas eingetragen wurde – gleich was.
 *
 * Für den Kopf ist ein Tag mit nur einem Kopfeintrag ein notierter Tag; für
 * den Bauch ist er eine Lücke (siehe tagesWert in auswertung.js). Beides ist
 * richtig, und deshalb hat der Kopf hier seine eigene Zählung.
 *
 * Gleich ist nur der Tag, an dem bloß Wasser gezählt wurde: Er ist für beide
 * eine Lücke. Wer ein Glas antippt, hat nicht gesagt, dass der Kopf frei war.
 * Ebenso der Tag, an dem nur eine Aktivität steht – wer „Sauna" einträgt,
 * sagt damit nichts über den Kopf.
 */
function alleNotiertenTage(eintraege, tage) {
  return new Set([
    ...(eintraege || []).filter(eintragZaehlt).map((e) => e.am),
    ...Object.keys(tage || {}).filter((iso) => tagZaehlt(tage[iso])),
  ]);
}

/**
 * Drei Fenster zu dreißig Tagen, das jüngste zuerst: [heute−29, heute],
 * [heute−59, heute−30], [heute−89, heute−60]. Die Definitionen der
 * Neurologie verlangen mehr als drei Monate; ein Fenster allein ist ein
 * Punktwert.
 */
export const KOPF_FENSTER = 3;

function fensterGrenzen(heute, i) {
  const bis = plusTage(heute, -30 * i);
  return { von: plusTage(bis, -29), bis };
}

function imFenster(tageMenge, grenzen) {
  return [...tageMenge].filter((iso) => iso >= grenzen.von && iso <= grenzen.bis).length;
}

/** Ab so vielen Kopfschmerztagen in 30 Tagen fragt die Neurologie nach „chronisch". */
export const CHRONISCH_AB = 15;

/**
 * Die Grundzahlen: wie oft, an wie vielen Tagen, wie stark, wie oft was.
 *
 * `anteil` ist Kopfschmerztage durch notierte Tage – nicht durch Kalendertage.
 * Eine Lücke im Tagebuch ist kein kopfschmerzfreier Tag, sie ist eine Lücke.
 * Die Fenster dagegen zählen Kalendertage: Die Schwelle „fünfzehn im Monat"
 * ist eine Kalenderzahl, und so wird sie auch in der Sprechstunde gefragt –
 * mit den notierten Tagen daneben, damit niemand zehn Lücken für zehn gute
 * Tage hält.
 */
export function kopfZahlen(eintraege, tage, heute) {
  const kopf = kopfEintraege(eintraege, heute);
  const kopfTage = new Set(kopf.map((e) => e.am));
  const notiert = alleNotiertenTage(eintraege, tage);
  const zaehler = new Map();
  const dauern = new Map();
  const verlauf = { eingeschraenkt: new Set(), ausgefallen: new Set() };
  const wirkung = { weg: 0, besser: 0, nicht: 0 };
  let statusZuletzt = null;
  let auraAnzahl = 0;
  let erbrochenAnzahl = 0;
  // Ausfalltage über die letzten 90 Tage – etwa der Dreimonatszeitraum, über
  // den der Fragebogen MIDAS verlorene Tage erfasst (EMA-EPAR Ajovy,
  // EMA/118499/2019, S. 38: „over the previous 3 months").
  const ab90 = heute ? plusTage(heute, -89) : null;
  kopf.forEach((e) => {
    const arten = e.kopfArten || [];
    arten.forEach((id) => {
      if (KOPF_MAP[id]) zaehler.set(id, (zaehler.get(id) || 0) + 1);
    });
    if (arten.includes('aura')) auraAnzahl += 1;
    if (arten.includes('kopferbrechen')) erbrochenAnzahl += 1;
    if (DAUER_MAP[e.dauer]) dauern.set(e.dauer, (dauern.get(e.dauer) || 0) + 1);
    if (e.dauer === 'status' && (!statusZuletzt || e.am > statusZuletzt)) statusZuletzt = e.am;
    if (verlauf[e.verlauf] && (!ab90 || e.am >= ab90)) verlauf[e.verlauf].add(e.am);
    if (wirkung[e.mittelWirkung] !== undefined) wirkung[e.mittelWirkung] += 1;
  });
  const summe = kopf.reduce((s, e) => s + Number(e.staerke), 0);
  const fenster = heute
    ? Array.from({ length: KOPF_FENSTER }, (_, i) => {
      const g = fensterGrenzen(heute, i);
      return { ...g, kopfTage: imFenster(kopfTage, g), notiert: imFenster(notiert, g) };
    })
    : [];
  const chronischFenster = fenster.filter((f) => f.kopfTage >= CHRONISCH_AB).length;
  return {
    anzahl: kopf.length,
    tage: kopfTage.size,
    notierteTage: notiert.size,
    anteil: notiert.size ? kopfTage.size / notiert.size : 0,
    schnitt: kopf.length ? summe / kopf.length : 0,
    hoechster: kopf.reduce((m, e) => Math.max(m, Number(e.staerke)), 0),
    arten: [...zaehler.entries()]
      .map(([id, anzahl]) => ({ id, name: kopfArtName(id), anzahl }))
      .sort((a, b) => b.anzahl - a.anzahl),
    dauern: KOPF_DAUER
      .filter((d) => dauern.has(d.id))
      .map((d) => ({ id: d.id, name: d.name, anzahl: dauern.get(d.id) })),
    verlauf: {
      eingeschraenkt: verlauf.eingeschraenkt.size,
      ausgefallen: verlauf.ausgefallen.size,
      zeitraum: ab90 ? 90 : null,
    },
    wirkung,
    fenster,
    letzte30: fenster.length ? fenster[0].kopfTage : 0,
    notiert30: fenster.length ? fenster[0].notiert : 0,
    // Laut erst, wenn zwei der drei Fenster über der Schwelle liegen; ein
    // einzelnes Fenster ist eine Zahl, kein Verdacht.
    chronischFenster,
    chronischVerdacht: chronischFenster >= 2,
    statusZuletzt,
    auraAnzahl,
    erbrochenAnzahl,
  };
}

/*
 * Die Klassen von Akutmitteln, die hier auseinandergehalten werden.
 *
 *   nsar       kann den Magen belasten – die Verbindung zum Bauch: NSAR
 *              bremsen die Prostaglandine, die die Magenwand schützen; über
 *              Wochen oder Monate genommen, kann das die Schutzfunktion der
 *              Schleimhaut stören (gesund.bund.de/gastritis, Stand
 *              13.11.2025). Die Fachinformation nennt Magen-Darm-Beschwerden
 *              als häufigste Nebenwirkung, dazu Geschwüre und Blutungen,
 *              deren Risiko von Dosis und Dauer abhängt (IBU-ratiopharm 400 mg
 *              akut, Stand 06/2026, 4.4 und 4.8)
 *   kombi      ASS oder Ibuprofen (ein NSAR) plus Koffein – für den Magen ein
 *              NSAR, für den Kopf die niedrige Übergebrauchsgrenze der
 *              Kombinationsmittel
 *   triptan    das Migränemittel – kein NSAR; die Fachinformation nennt
 *              eigene Magen-Darm-Nebenwirkungen (Imigran Filmtabletten,
 *              Stand 08/2025, 4.8: häufig Übelkeit und Erbrechen, unklar, ob
 *              vom Mittel oder vom Anfall). Grenze zehn Tage (ICHD-3 8.2.2)
 *   nichtnsar  Paracetamol, Metamizol – keine NSAR: In den Fachinformationen
 *              als „andere Analgetika und Antipyretika" eingeordnet und als
 *              schmerzstillend und fiebersenkend beschrieben, Metamizol auch
 *              krampflösend; Entzündungshemmung nennen sie nicht
 *              (Paracetamol-ratiopharm 500 mg, Stand 12/2024, 5.1; Novalgin
 *              Filmtabletten, Stand 11/2024, 5.1)
 *   opioid     Tramadol, Tilidin, Codein – Grenze zehn Tage
 *   gepant     Gepante und Ditane (mittel.js) – zur Attackenbehandlung
 *              zugelassen, Rimegepant auch zur Vorbeugung (EMA-
 *              Produktinformation Vydura, 4.1). ICHD-3 nennt sie nicht eigens;
 *              für andere Akutmittel gilt dort die Auffangregel 8.2.8 (zehn
 *              Tage). Body Check zählt sie als Akuttag, wendet für sie aber
 *              keine eigene Schwelle an – eine Festlegung der App
 *   kombipara  Paracetamol plus Koffein – für den Kopf ein Kombinationsmittel
 *              wie kombi (ICHD-3 8.2.5), für den Magen kein NSAR
 *
 * Für die Übergebrauchsregel gelten nsar und nichtnsar als EINE Klasse: die
 * einfachen Schmerzmittel, Grenze fünfzehn Tage – auch mehrere zusammen.
 * Ebenso kombi und kombipara: die Kombinationsmittel, Grenze zehn. Getrennt
 * sind die beiden nur für den Magen. „Verschiedene durcheinander" folgt
 * ICHD-3 8.2.6: Mittel aus mehreren Klassen, von denen keine allein ihre
 * Grenze erreicht, an zusammen zehn oder mehr Tagen im Monat über mehr als
 * drei Monate. Die Klassifikation nennt dort Ergotamin, Triptane,
 * Nicht-Opioid-Analgetika und Opioide; Note 2 bezieht die
 * Kombinationsmittel (8.2.5) ein. Ergotamin führt die App nicht. Dass auch
 * Gepant-Tage in die Summe zählen, ist eine Festlegung der App – 8.2.6
 * nennt Gepante nicht.
 *
 * Vorbeugende Mittel (Gruppe 'prophylaxe'), Koffein als Tablette
 * ('koffeinmittel'), ADHS-Mittel und Magenmittel sind keine Klasse: Body
 * Check zählt sie nirgends als Akutmittel. Grundlage: Beim Übergebrauch
 * zählt die Klassifikation Mittel, die akut oder symptomatisch gegen
 * Kopfschmerz genommen werden können (ICHD-3 8.2 Kriterium B); Kopfschmerz
 * durch Mittel, die zu einem anderen Zweck genommen werden, führt sie
 * getrennt (8.1.9, 8.1.10). Wird ein anderes Mittel gegen den Kopfschmerz
 * selbst genommen, kann es nach der Klassifikation unter 8.2.8 fallen (zehn
 * Tage); wofür etwas genommen wurde, weiß die App nicht. Welche Gruppe ein
 * Name hat, weiß mittel.js; hierher kommt nur die Kennung.
 */
const AKUT_KLASSEN = ['nsar', 'kombi', 'triptan', 'nichtnsar', 'opioid', 'gepant', 'kombipara'];
const KLASSE_VON_GRUPPE = Object.fromEntries(AKUT_KLASSEN.map((k) => [k, k]));

/*
 * Die Sorten, die ein Fenster als Tage je Klasse ausweist (`tage`). kombipara
 * hat dort keinen eigenen Platz: Für den Kopf ist es ein Kombinationsmittel
 * und zählt unter kombi mit. So bleibt jede Zahl, die ein Tagebuch ohne
 * Paracetamol-Koffein-Mittel ergibt, Zeichen für Zeichen die alte (siehe
 * tests/test-gold.mjs).
 */
const SORTEN = AKUT_KLASSEN.filter((k) => k !== 'kombipara');

/**
 * Schwellen für den Übergebrauch, Tage je 30 Tage – nach der internationalen
 * Kopfschmerzklassifikation. Die Klassifikation verlangt das über mehr als
 * drei Monate UND fünfzehn oder mehr Kopfschmerztage im Monat; deshalb wird
 * jedes der drei Fenster geprüft, und der Name fällt erst, wenn beides in
 * zwei von drei Fenstern zusammenkommt.
 */
export const UEBERGEBRAUCH = { triptan: 10, kombi: 10, opioid: 10, einfach: 15, gemischt: 10 };

function fensterMittel(alle, kopfTage, grenzen) {
  const drin = (menge) => [...menge].filter((iso) => iso >= grenzen.von && iso <= grenzen.bis);
  // Für den Kopf jedes Kombinationsmittel, ob mit ASS oder mit Paracetamol.
  const kombiAlle = new Set([...drin(alle.kombi), ...drin(alle.kombipara)]);
  const tage = Object.fromEntries(SORTEN.map((k) => [k, k === 'kombi' ? kombiAlle.size : drin(alle[k]).length]));
  const einfach = new Set([...drin(alle.nsar), ...drin(alle.nichtnsar)]);
  // Für den Magen nur, was ein NSAR enthält – kombipara nicht.
  const nsarKombi = new Set([...drin(alle.nsar), ...drin(alle.kombi)]);
  const akut = new Set();
  AKUT_KLASSEN.forEach((k) => drin(alle[k]).forEach((iso) => akut.add(iso)));
  // Die Klassen, zwischen denen „durcheinander" zählt.
  const gruppen = [
    einfach.size > 0, kombiAlle.size > 0, tage.triptan > 0, tage.opioid > 0,
  ].filter(Boolean).length;
  const uebergebrauch = tage.triptan >= UEBERGEBRAUCH.triptan
    || kombiAlle.size >= UEBERGEBRAUCH.kombi
    || tage.opioid >= UEBERGEBRAUCH.opioid
    || einfach.size >= UEBERGEBRAUCH.einfach
    || (akut.size >= UEBERGEBRAUCH.gemischt && gruppen >= 2);
  const kopf = imFenster(kopfTage, grenzen);
  return {
    ...grenzen,
    akut: akut.size,
    tage,
    nsarKombi: nsarKombi.size,
    einfach: einfach.size,
    kopfTage: kopf,
    uebergebrauch,
    // Erst Einnahme UND Kopfschmerztage zusammen sind das, was die
    // Klassifikation meint.
    moh: uebergebrauch && kopf >= CHRONISCH_AB,
  };
}

/**
 * Die Sorten eines Fensters als Text: „4 Triptan, 5 entzündungshemmend, …".
 *
 * Kombinationsmittel stehen für sich, ob mit ASS oder mit Paracetamol: Für
 * den Kopf ist das die Sorte mit der Grenze von zehn Tagen. Eines mit ASS
 * steht zugleich unter „entzündungshemmend" – für den Magen ist es das auch.
 */
export function sortenText(f) {
  if (!f) return '';
  return [
    f.tage.triptan ? `${f.tage.triptan} Triptan` : '',
    f.nsarKombi ? `${f.nsarKombi} entzündungshemmend` : '',
    f.tage.kombi ? `${f.tage.kombi} Kombinationsmittel` : '',
    f.tage.nichtnsar ? `${f.tage.nichtnsar} ohne Entzündungshemmung` : '',
    f.tage.opioid ? `${f.tage.opioid} Opioid` : '',
    f.tage.gepant ? `${f.tage.gepant} Gepant` : '',
  ].filter(Boolean).join(', ');
}

/**
 * Kopfschmerz und Akutmittel – am selben Tag und je 30-Tage-Fenster.
 *
 * Gezählt werden Tage, nicht Einnahmen: Zwei Ibuprofen an einem Tag sind ein
 * Tag mit Ibuprofen. `gruppeVon(name)` kommt von außen (mittel.js kennt die
 * Gruppen), damit dieses Modul nicht wissen muss, was Rizatriptan ist.
 *
 * „Am selben Tag" zählt nur Akutmittel. Ein täglicher Säureblocker stünde
 * sonst an jedem Kopfschmerztag als „Medikament" dabei – eine Zahl ohne
 * Aussage, die die wichtige daneben entwertet.
 *
 * Die Fenster zählen jeden Tag mit einem Akutmittel – ob daneben ein
 * Kopfschmerz eingetragen wurde oder nicht; ein vergessener Kopfeintrag darf
 * die Zahl nicht kleiner machen. Die Klassifikation fasst den Übergebrauch
 * nach Mitteln, die gegen Kopfschmerz genommen werden können, und nennt in
 * den Unterformen nur Einnahmetage, keinen Anlass (ICHD-3 8.2 Kriterium B,
 * 8.2.3.2.1); ob ein aus anderem Grund genommenes Mittel, etwa ASS zum
 * Blutschutz, mitgemeint ist, sagt sie nicht ausdrücklich. Body Check zählt
 * es mit; ob es dazugehört, klärt die Praxis. Den Namen aus der
 * Klassifikation bekommt das erst zusammen mit fünfzehn Kopfschmerztagen im
 * selben Fenster (Kriterium A) – sonst stünde er bei jedem täglichen ASS
 * zum Blutschutz.
 *
 * Was an einem Kopfschmerztag eingetragen ist und keiner Gruppe zuzuordnen,
 * steht unter `unbekannt` mit Namen: Ein Schmerzmittel, das die App nicht
 * kennt, fehlt sonst still in der Zählung, und wer einträgt, nimmt eine zu
 * kleine Zahl mit in die Sprechstunde. Nur Kopfschmerztage – sonst stünde dort
 * das Schilddrüsenmittel von jedem Morgen.
 */
export function kopfMittel(eintraege, gruppeVon, heute) {
  const kopfTage = kopfTageVon(eintraege, heute);
  const amKopfTag = Object.fromEntries(AKUT_KLASSEN.map((k) => [k, new Set()]));
  amKopfTag.akut = new Set();
  const alle = Object.fromEntries(AKUT_KLASSEN.map((k) => [k, new Set()]));
  const unbekannt = new Map();
  (eintraege || []).filter((e) => e.art === 'medikament' && (!heute || e.am <= heute)).forEach((e) => {
    const gruppe = gruppeVon ? gruppeVon(e.mittel) : null;
    const klasse = KLASSE_VON_GRUPPE[gruppe] || null;
    if (!gruppe && kopfTage.has(e.am)) {
      const name = String(e.mittel || '').trim();
      if (name) {
        const v = unbekannt.get(name.toLowerCase()) || { name, tage: new Set() };
        v.tage.add(e.am);
        unbekannt.set(name.toLowerCase(), v);
      }
    }
    if (!klasse) return;
    alle[klasse].add(e.am);
    if (!kopfTage.has(e.am)) return;
    amKopfTag.akut.add(e.am);
    amKopfTag[klasse].add(e.am);
  });
  // Für den Magen zählt ein Kombinationsmittel mit ASS oder Ibuprofen wie ein NSAR.
  const nsarKopfTage = new Set([...amKopfTag.nsar, ...amKopfTag.kombi]);
  /*
   * Für den Kopf jedes Kombinationsmittel, ob mit ASS oder mit Paracetamol –
   * wie `tage.kombi` in den Fenstern. Sonst stünde Paracetamol mit Koffein am
   * selben Tag in keiner Teilzahl, und das Mittel mit der niedrigsten Grenze
   * bliebe in Karte und Bericht ungenannt. Ein eigenes neues Feld wäre
   * sauberer zu lesen, änderte aber das Ergebnis jedes Tagebuchs der Fassung
   * 27 (tests/test-gold.mjs); `mitKombi` stand dort schon und wurde nirgends
   * gezeigt.
   */
  const kombiKopfTage = new Set([...amKopfTag.kombi, ...amKopfTag.kombipara]);
  const kopfTageOhneNsar = [...kopfTage].filter((iso) => !nsarKopfTage.has(iso)).sort();

  const fenster = heute
    ? Array.from({ length: KOPF_FENSTER }, (_, i) => fensterMittel(alle, kopfTage, fensterGrenzen(heute, i)))
    : [];
  const leer = { akut: 0, tage: Object.fromEntries(SORTEN.map((k) => [k, 0])), nsarKombi: 0, einfach: 0, kopfTage: 0, uebergebrauch: false, moh: false };
  const juengst = fenster[0] || leer;
  const einnahmeFenster = fenster.filter((f) => f.uebergebrauch).length;
  const mohFenster = fenster.filter((f) => f.moh).length;
  return {
    kopfTage: kopfTage.size,
    mitAkut: amKopfTag.akut.size,
    mitNsar: nsarKopfTage.size,
    mitTriptan: amKopfTag.triptan.size,
    mitNichtNsar: amKopfTag.nichtnsar.size,
    mitKombi: kombiKopfTage.size,
    mitOpioid: amKopfTag.opioid.size,
    mitGepant: amKopfTag.gepant.size,
    nsarTage: [...nsarKopfTage].sort(),
    kopfTageOhneNsar,
    fenster,
    akutTage30: juengst.akut,
    tage30: juengst.tage,
    triptanTage30: juengst.tage.triptan,
    nsarTage30: juengst.nsarKombi,
    // Das jüngste Fenster über der Einnahmeschwelle: eine Zahl.
    uebergebrauch: juengst.uebergebrauch,
    // Zwei von drei Fenstern über der Einnahmeschwelle: viel Mittel – aber
    // noch kein Name, solange die Kopfschmerztage fehlen.
    einnahmeHoch: einnahmeFenster >= 2,
    einnahmeFenster,
    // Zwei von drei Fenstern mit Einnahme UND Kopfschmerztagen über der
    // Schwelle: das, was die Klassifikation meint.
    mohFenster,
    uebergebrauchBestaetigt: mohFenster >= 2,
    unbekannt: [...unbekannt.values()]
      .map((v) => ({ name: v.name, tage: v.tage.size }))
      .sort((a, b) => b.tage - a.tage)
      .slice(0, 5),
  };
}

/**
 * Was der Bauch nach Kopfschmerztagen mit entzündungshemmendem Mittel macht.
 *
 * Verglichen wird der Bauch-Tageswert am Tag selbst und am Tag danach. Das
 * ist eine gewählte Näherung, keine belegte Wirkdauer: NSAR bremsen die
 * Bildung von Prostaglandinen, die die Magenwand mit Schleim und
 * säureneutralisierenden Stoffen schützen (gesund.bund.de/gastritis, Stand
 * 13.11.2025); wie schnell eine Schädigung entsteht und wie lange der Schutz
 * nachlässt, sagen die geprüften Quellen nicht, und laut Fachinformation
 * können Magen-Darm-Blutungen oder Geschwüre zu jedem Zeitpunkt der
 * Behandlung auftreten (IBU-ratiopharm 400 mg akut, Stand 06/2026, 4.4).
 *
 * Die Vergleichsgruppe ist der Punkt. Gegen „alle übrigen Tage" misst man
 * womöglich vor allem den Anfall, nicht das Mittel: Bei einer Migräne können
 * Übelkeit oder Erbrechen dazugehören, und alltägliche Bewegung verstärkt
 * den Schmerz oder wird gemieden (ICHD-3 1.1 Kriterien C und D). Deshalb
 * wird, wo es geht, *innerhalb* der Kopfschmerztage verglichen: Tage mit
 * NSAR (und der Tag danach) gegen Kopfschmerztage ohne NSAR (und der Tag
 * danach). Beide Seiten haben den Kopfschmerz; der Unterschied ist das
 * Mittel – oder die Schwere des Anfalls, denn viele nehmen ein Mittel vor
 * allem bei starken Schmerzen (gesund.bund.de/migraene, Stand 21.12.2022,
 * Behandlung). Deshalb steht die mittlere Kopfstärke beider Seiten mit
 * dabei. Erst wenn es keinen Kopfschmerztag ohne NSAR gibt, bleibt der
 * Vergleich gegen alle übrigen Tage – und der Satz sagt das dann auch.
 *
 * Ein Tag, der auf beide Seiten fiele (der Tag nach einem NSAR-Tag ist selbst
 * ein Kopfschmerztag ohne NSAR), gehört auf keine. `tagesWert` kommt von
 * außen, wie bei zyklus.js – der Bauch wird in auswertung.js gerechnet.
 *
 * Ab fünf Tagen auf beiden Seiten ist das eine Zahl, darunter ein Zufall.
 * „Deutlich" gilt in beide Richtungen: Ein Bauch, der nach dem Mittel
 * *niedriger* liegt, ist kein „kein Unterschied".
 */
export function nsarNachwirkung(eintraege, tage, mitTagen, ohneTagen, tagesWert) {
  const fenster = (liste) => {
    const s = new Set();
    (liste || []).forEach((iso) => { s.add(iso); s.add(plusTage(iso, 1)); });
    return s;
  };
  const a = fenster(mitTagen);
  const innerhalb = (ohneTagen || []).length > 0;
  const b = innerhalb ? fenster(ohneTagen) : null;
  if (innerhalb) {
    [...a].forEach((iso) => {
      if (b.has(iso)) { a.delete(iso); b.delete(iso); }
    });
  }
  const mit = { tage: 0, summe: 0 };
  const ohne = { tage: 0, summe: 0 };
  alleNotiertenTage(eintraege, tage).forEach((iso) => {
    const t = tagesWert(eintraege, iso, tage);
    if (!t.notiert) return;
    if (a.has(iso)) {
      mit.tage += 1;
      mit.summe += t.wert;
    } else if (!innerhalb || b.has(iso)) {
      ohne.tage += 1;
      ohne.summe += t.wert;
    }
  });
  const mittel = (x) => (x.tage ? x.summe / x.tage : 0);
  // Die Kopfstärke beider Seiten – der Vorbehalt, der sich prüfen lässt.
  const kopf = kopfEintraege(eintraege);
  const staerkeVon = (liste) => {
    const menge = new Set(liste || []);
    const w = kopf.filter((e) => menge.has(e.am)).map((e) => Number(e.staerke));
    return w.length ? w.reduce((s, x) => s + x, 0) / w.length : 0;
  };
  const genug = mit.tage >= 5 && ohne.tage >= 5;
  const differenz = mittel(mit) - mittel(ohne);
  return {
    modus: innerhalb ? 'innerhalb' : 'gegenAlle',
    mit: { tage: mit.tage, schnitt: mittel(mit) },
    ohne: { tage: ohne.tage, schnitt: mittel(ohne) },
    staerke: { mit: staerkeVon(mitTagen), ohne: innerhalb ? staerkeVon(ohneTagen) : 0 },
    differenz,
    genug,
    // Eine ganze Stufe, wie bei der Richtung: Darunter ist es Schwankung.
    deutlich: genug && Math.abs(differenz) >= 1,
  };
}

/**
 * Der Bauch an Kopfschmerztagen selbst – gegen alle übrigen Tage.
 *
 * Eine Fußnote, keine Auskunft: Das Ergebnis kann in beide Richtungen
 * ausfallen – bei einer Migräne können Übelkeit und Erbrechen zum Anfall
 * gehören (ICHD-3 1.1 Kriterium D), und Body Check zählt nur, was
 * eingetragen ist; was an solchen Tagen gegessen und eingetragen wird, kann
 * vom Üblichen abweichen. Es steht da, damit niemand den Bauchwert eines
 * Kopfschmerztages als Aussage über das Essen davor liest – oder über das
 * Mittel.
 */
export function bauchAnKopfTagen(eintraege, tage, tagesWert) {
  const kopfTage = kopfTageVon(eintraege);
  const mit = { tage: 0, summe: 0 };
  const ohne = { tage: 0, summe: 0 };
  alleNotiertenTage(eintraege, tage).forEach((iso) => {
    const t = tagesWert(eintraege, iso, tage);
    if (!t.notiert) return;
    const eimer = kopfTage.has(iso) ? mit : ohne;
    eimer.tage += 1;
    eimer.summe += t.wert;
  });
  const mittel = (x) => (x.tage ? x.summe / x.tage : 0);
  const genug = mit.tage >= 5 && ohne.tage >= 5;
  const differenz = mittel(mit) - mittel(ohne);
  return {
    mit: { tage: mit.tage, schnitt: mittel(mit) },
    ohne: { tage: ohne.tage, schnitt: mittel(ohne) },
    differenz,
    genug,
    deutlich: genug && Math.abs(differenz) >= 1,
  };
}

/**
 * Ein Tageswert für den Kopf, in der Form, die auswertung.js für den Bauch
 * liefert – damit sich die Umstände-Bilanz dort (faktorBilanz) auch für den
 * Kopf rechnen lässt. `wert` ist 1 oder 0: Tag mit oder ohne Kopfschmerz.
 * Der Mittelwert darüber ist dann der Anteil der Kopfschmerztage.
 */
export function kopfTagesWert(eintraege, iso, tage = {}) {
  const amTag = (eintraege || []).filter((e) => e.am === iso);
  return {
    am: iso,
    notiert: amTag.some(eintragZaehlt) || tagZaehlt((tage || {})[iso]),
    wert: amTag.some((e) => e.art === 'kopf' && Number(e.staerke) >= 1) ? 1 : 0,
  };
}

/*
 * Kopfschmerz nach Umständen: nur der Schlaf.
 *
 * Die Nacht davor ist der eine Umstand, der sauber *vor* dem Kopfschmerz
 * liegt. Anspannung am selben Tag liegt es nicht: Bei manchen Menschen mit
 * Migräne kündigt sich ein Anfall Stunden bis zu zwei Tage vorher an – etwa
 * mit Müdigkeit, Gähnen, Konzentrationsschwierigkeiten, Hyperaktivität oder
 * Nackensteifigkeit (ICHD-3, 2018, Einleitung zu Kapitel 1: „Some patients
 * also experience a prodromal phase"; Kommentar zu 1.1; Begriffsliste
 * „Prodrome": bis 48 Stunden) –, und ein Vergleich am selben Tag misst dann
 * womöglich den Anfang des Anfalls und nennt ihn Auslöser. Deshalb steht die
 * Anspannung hier nicht, und auch beim Schlaf steht der Vorbehalt daneben.
 *
 * Verglichen werden Anteile, und Anteile aus wenigen Tagen springen in großen
 * Schritten. Deshalb zwölf Tage je Seite, und „deutlich" nur, wenn der
 * Unterschied über dem Zufallsspielraum liegt (js/zufall.js) – derselben
 * Schwelle, die auch die Auslöserbilanz anlegt. Dazu der Vorbehalt der
 * Auswahl: Gezählt sind nur Tage mit beantworteter Tagesfrage, und gerade an
 * den schlimmsten Tagen beantwortet niemand eine.
 */
export const KOPF_UMSTAENDE = [
  { id: 'schlaf', hoch: 'nach schlechten Nächten', niedrig: 'nach guten Nächten' },
];

/**
 * Die 0/1-Reihe hinter einem Anteil, für den Zufallsspielraum.
 *
 * Exportiert, weil jeder Vergleich von Anteilen sie braucht – Kopfschmerz ja
 * oder nein, gepresst ja oder nein. Sie bleibt trotzdem hier: js/zufall.js
 * steht im Bündel hinter dieser Datei, und kopf.js importiert zufall.js mit
 * Absicht nicht (der Spielraum kommt als Argument herein).
 */
export function nullEins(tage, anteil) {
  const einsen = Math.round(anteil * tage);
  return [...Array(einsen).fill(1), ...Array(Math.max(0, tage - einsen)).fill(0)];
}

export function kopfUmstaende(eintraege, tage, faktorBilanz, zufallsSpielraum) {
  return KOPF_UMSTAENDE.map((u) => {
    const f = faktorBilanz(eintraege, tage, u.id, kopfTagesWert);
    const genug = f.hoch.tage >= 12 && f.niedrig.tage >= 12;
    const differenz = f.hoch.schnitt - f.niedrig.schnitt;
    const spielraum = genug && zufallsSpielraum
      ? zufallsSpielraum(nullEins(f.hoch.tage, f.hoch.schnitt), nullEins(f.niedrig.tage, f.niedrig.schnitt), 3).spielraum
      : 0.2;
    return {
      id: u.id,
      hochName: u.hoch,
      niedrigName: u.niedrig,
      hoch: { tage: f.hoch.tage, anteil: f.hoch.schnitt },
      niedrig: { tage: f.niedrig.tage, anteil: f.niedrig.schnitt },
      differenz,
      spielraum,
      genug,
      deutlich: genug && Math.abs(differenz) >= Math.max(0.2, spielraum),
    };
  });
}

/**
 * Kopfschmerztage je Zyklusphase – nur, wenn die Periode eingetragen wird.
 *
 * Für jede Phase: wie viele notierte Tage, wie viele davon mit Kopfschmerz.
 * Ohne Urteil; die Fallzahlen stehen daneben. Eine Phase ohne notierte Tage
 * fehlt in der Liste, statt mit 0 von 0 zu prahlen.
 */
export function kopfNachPhase(eintraege, tage) {
  const kopfTage = kopfTageVon(eintraege);
  const eimer = Object.fromEntries(PHASEN.map((p) => [p.id, { tage: 0, mit: 0 }]));
  alleNotiertenTage(eintraege, tage).forEach((iso) => {
    const p = phaseVon(tage, iso);
    if (!p) return;
    eimer[p].tage += 1;
    if (kopfTage.has(iso)) eimer[p].mit += 1;
  });
  return PHASEN
    .filter((p) => eimer[p.id].tage > 0)
    .map((p) => ({
      phase: p.id,
      name: p.name,
      tage: eimer[p.id].tage,
      mit: eimer[p.id].mit,
      anteil: eimer[p.id].mit / eimer[p.id].tage,
    }));
}

/**
 * Das Fenster um die Periode: zwei Tage davor bis zum dritten Blutungstag.
 *
 * Das ist das Fenster, mit dem die Kopfschmerzklassifikation „menstruell"
 * fasst (ICHD-3, 2018, Anhang A1.1.1 und A1.1.2: Tag −2 bis +3, einen Tag 0
 * gibt es nicht), und die vier Phasen bilden es nicht ab: Die zwei Tage vor
 * der Blutung verschwinden dort in der breiten zweiten Zyklushälfte. Laut
 * ICHD-3 gibt es Hinweise, dass menstruelle Anfälle zumindest bei manchen
 * Frauen mit dem Abfall des Östrogens zusammenhängen; andere hormonelle
 * Veränderungen in dieser Zeit können ebenso eine Rolle spielen (Kommentar
 * im Anhang A1.1, S. 190 f.: „some evidence … at least in some women").
 *
 * Gezählt wird je beobachtetem Zyklus, ob im Fenster ein Kopfschmerztag lag.
 * „Beobachtet" heißt: Das Fenster ist vorbei, und an mindestens einem seiner
 * Tage wurde etwas eingetragen. Ein Zyklus, dessen Fenster noch läuft oder
 * ganz leer ist, zählt nicht als „ohne Kopfschmerz" – er zählt gar nicht.
 * Mindestens drei beobachtete Zyklen, denn die Regel heißt „zwei von drei".
 */
export function kopfUmPeriode(eintraege, tage, heute) {
  const kopfTage = kopfTageVon(eintraege, heute);
  const notiert = alleNotiertenTage(eintraege, tage);
  let beobachtet = 0;
  let mit = 0;
  let offen = 0;
  zyklen(tage).forEach((z) => {
    const fenster = [-2, -1, 0, 1, 2].map((i) => plusTage(z.start, i));
    if (heute && fenster[fenster.length - 1] > heute) { offen += 1; return; }
    if (!fenster.some((iso) => notiert.has(iso))) return;
    beobachtet += 1;
    if (fenster.some((iso) => kopfTage.has(iso))) mit += 1;
  });
  return { zyklen: beobachtet, mit, offen, genug: beobachtet >= 3 };
}

/**
 * Die letzten drei Kalendermonate nebeneinander. Die Klassifikation setzt
 * für chronische Migräne und für Kopfschmerz bei Medikamentenübergebrauch
 * mehr als drei Monate an (ICHD-3 1.3 Kriterium A, 8.2 Kriterium B), und ein
 * Kopfschmerztagebuch verbessert laut ICHD-3 die diagnostische Genauigkeit
 * und erlaubt eine genauere Einschätzung des Medikamentengebrauchs („How to
 * use the classification" Punkt 12). Die Beurteilung selbst liegt bei der
 * Praxis.
 */
export function kopfMonate(eintraege, tage, gruppeVon, heute, anzahl = 3) {
  if (!heute) return [];
  const kopfTage = kopfTageVon(eintraege, heute);
  const klasseTage = Object.fromEntries(AKUT_KLASSEN.map((k) => [k, new Set()]));
  (eintraege || []).filter((e) => e.art === 'medikament').forEach((e) => {
    const klasse = KLASSE_VON_GRUPPE[gruppeVon ? gruppeVon(e.mittel) : null];
    if (klasse) klasseTage[klasse].add(e.am);
  });
  const verlaufTage = { ausgefallen: new Set(), eingeschraenkt: new Set() };
  kopfEintraege(eintraege, heute).forEach((e) => {
    if (verlaufTage[e.verlauf]) verlaufTage[e.verlauf].add(e.am);
  });
  const notiert = alleNotiertenTage(eintraege, tage);
  const blutung = new Set(Object.keys(tage || {})
    .filter((iso) => Number(tage[iso] && tage[iso].blutung) >= 1));
  const raus = [];
  for (let i = anzahl - 1; i >= 0; i--) {
    const start = plusMonate(monatsStart(heute), -i);
    const praefix = start.slice(0, 7);
    const im = (menge) => [...menge].filter((iso) => iso.startsWith(praefix) && iso <= heute).length;
    const akut = new Set();
    AKUT_KLASSEN.forEach((k) => klasseTage[k].forEach((iso) => {
      if (iso.startsWith(praefix) && iso <= heute) akut.add(iso);
    }));
    raus.push({
      monat: praefix,
      name: fmtMonat(start),
      angefangen: i === 0,
      kopfTage: im(kopfTage),
      notiert: im(notiert),
      akut: akut.size,
      nsar: im(new Set([...klasseTage.nsar, ...klasseTage.kombi])),
      triptan: im(klasseTage.triptan),
      nichtnsar: im(klasseTage.nichtnsar),
      ausgefallen: im(verlaufTage.ausgefallen),
      eingeschraenkt: im(verlaufTage.eingeschraenkt),
      blutung: im(blutung),
    });
  }
  return raus;
}

/** Ab so vielen Kopfschmerzen „schon beim Aufwachen" in 30 Tagen fragt der Zettel nach. */
export const AUFWACH_AB = 4;
/** Ab so vielen Nächten mit Schiene in denselben 30 Tagen nennt die Frage die Schiene. */
export const SCHIENE_NAECHTE_AB = 10;

/**
 * Für die Aufwach-Frage: wie viele Kopfschmerzen in den letzten 30 Tagen
 * „schon beim Aufwachen" da waren, und in wie vielen Nächten derselben Zeit
 * die Schiene getragen wurde.
 *
 * Gezählt über dieselben 30 Kalendertage wie `letzte30` in kopfZahlen() –
 * die Frage gehört zu dem Fenster, nach dem die Sprechstunde fragt, nicht
 * zum Berichtszeitraum.
 */
export function aufwachZahlen(eintraege, tage, heute) {
  const von = heute ? plusTage(heute, -29) : null;
  const drin = (iso) => !heute || (iso >= von && iso <= heute);
  return {
    aufwachen: kopfEintraege(eintraege, heute)
      .filter((e) => drin(e.am) && (e.kopfArten || []).includes('aufwachen')).length,
    schiene: Object.keys(tage || {})
      .filter((iso) => drin(iso) && tage[iso] && Number(tage[iso].schiene) === 1).length,
  };
}

/**
 * Fragen für die Sprechstunde, aus den Kopfzahlen – so, wie die Muster sie
 * für den Bauch stellen. Jede ist eine Frage, keine davon eine Empfehlung,
 * und keine legt eine Diagnose in den Mund; die Antwort hat die Praxis.
 *
 * Die Aufwach-Frage gilt für alle (sie hängt an keinem Schalter). Kopfschmerz
 * beim Aufwachen ist laut Klassifikation ein unspezifisches Zeichen: Er kommt
 * bei vielen Kopfschmerzformen vor und bei Schlafstörungen wie einer
 * Schlafapnoe (ICHD-3, 2018, 10.1.4, Kommentar: „headache present upon
 * awakening is a non-specific symptom"); bei Kopfschmerz, der aus dem Schlaf
 * weckt, nennt sie neben der Schlafapnoe auch den Medikamentenübergebrauch
 * als mögliche andere Ursache (4.9, Note 2). Koffein ist eine eigene
 * Kopfschmerzursache – beim Entzug (8.3.1) –, ein besonderer Bezug zum
 * Aufwachen steht dort nicht; deshalb fragt der zweite Satz danach getrennt
 * und ohne Bezug zum Aufwachen. Wer „Kiefer, Nacken, Schiene" eingeschaltet
 * hat und die Schiene oft trägt, bekommt sie mit der Schiene im ersten Satz,
 * damit die Praxis weiß, wovon die Rede ist. `aufwach` kommt aus
 * aufwachZahlen(); ohne bleibt es bei den alten Fragen.
 *
 * Die Frage nach der Vorbeugung erscheint ab vier Kopfschmerztagen in 30
 * Tagen. Die Zahl 4 steht in den Anwendungsgebieten mancher vorbeugender
 * Mittel, dort aber als „mindestens 4 Migränetage pro Monat" (EMA-
 * Produktinformation Aimovig, 4.1); Body Check zählt Kopfschmerztage jeder
 * Art. Deshalb steht sie nur als offene Frage da, ohne Zahl als Grenze –
 * die Antwort hat die Praxis.
 */
export function kopfFragen({
  zahlen: z, mittel: m, befundIds = [], aufwach = null, spannungAn = false,
} = {}) {
  const fragen = [];
  if (!z || !z.anzahl) return fragen;
  if (z.letzte30 >= 4) {
    fragen.push(`Ich hatte ${z.letzte30} Kopfschmerztage in den letzten 30 Tagen – `
      + 'kommt für mich eine vorbeugende Behandlung infrage?');
  }
  if (m && m.uebergebrauchBestaetigt) {
    fragen.push('Kann mein Schmerz- oder Migränemittel den Kopfschmerz selbst '
      + 'unterhalten – und wie würde man das prüfen?');
  }
  if (befundIds.includes('gastritis-c') && m && m.mitNsar > 0) {
    fragen.push('Bei mir ist eine Gastritis Typ C festgestellt – welches Akutmittel '
      + 'passt bei meinen Kopfschmerzen dazu, und was, wenn ein entzündungshemmendes '
      + 'nötig ist?');
  }
  if (z.erbrochenAnzahl >= 1) {
    fragen.push(`Im Anfall habe ich ${z.erbrochenAnzahl}-mal erbrochen – gibt es für `
      + 'mich ein Mittel in einer Form, die nicht über den Magen geht?');
  }
  if (z.auraAnzahl >= 2) {
    fragen.push(`Vor dem Kopfschmerz hatte ich ${z.auraAnzahl}-mal Flimmern, Zacken oder `
      + 'wanderndes Kribbeln (eine Aura) – falls Verhütung ein Thema ist: Spielt das '
      + 'für eine Pille mit Östrogen eine Rolle?');
  }
  if (aufwach && aufwach.aufwachen >= AUFWACH_AB) {
    const schiene = spannungAn === true && aufwach.schiene >= SCHIENE_NAECHTE_AB;
    fragen.push(`${schiene ? 'Ich trage eine Aufbissschiene und habe' : 'Ich habe'} oft schon beim `
      + 'Aufwachen Kopfschmerzen. Kann das mit meinem Schlaf (Schnarchen, Atemaussetzer) oder mit '
      + 'meinen Schmerzmitteln zu tun haben? Und spielt Koffein bei meinen Kopfschmerzen eine Rolle?');
  }
  return fragen;
}

/* ---------- Die Sätze ---------- */

const zahlFormat = (fmt) => fmt || ((x) => String(Math.round(x * 10) / 10).replace('.', ','));
const prozentText = (x) => `${Math.round(x * 100)} %`;

/** Die Fensterzahlen als Kette: „12 · davor 9 · davor 4". */
function fensterKette(fenster, feld) {
  return fenster.map((f, i) => `${i ? 'davor ' : ''}${f[feld]}`).join(' · ');
}

/**
 * Der Satz zur Nachwirkung – nur, wenn er deutlich ist.
 *
 * Liegt der Bauch nach dem Mittel niedriger, sagt der Satz, was Body Check
 * zählt: nur, was eingetragen ist. Dass an solchen Tagen weniger gegessen
 * wird, nennt keine geprüfte Quelle; deshalb steht da nur, dass Essen und
 * Einträge vom Üblichen abweichen können.
 *
 * Im Vergleich innerhalb der Kopfschmerztage: „viele nehmen ein Mittel eher
 * bei starken Schmerzen" nach gesund.bund.de/migraene (Stand 21.12.2022,
 * Behandlung: „nehmen viele bei starken Schmerzen auch Medikamente ein");
 * Übelkeit und Erbrechen als mögliche Begleiter einer Migräne ebenda
 * (Symptome) und ICHD-3 1.1 Kriterium D.
 */
export function nachwirkungSatz(n, fmt) {
  if (!n || !n.genug || !n.deutlich) return '';
  const z = zahlFormat(fmt);
  const zahlen = n.modus === 'innerhalb'
    ? 'An Kopfschmerztagen mit entzündungshemmendem Schmerzmittel und am Tag danach '
      + `lag der Bauch im Mittel bei ${z(n.mit.schnitt)}, an Kopfschmerztagen ohne ein `
      + `solches Mittel und am Tag danach bei ${z(n.ohne.schnitt)} (${n.mit.tage} gegen `
      + `${n.ohne.tage} Tage).`
    : 'An Kopfschmerztagen mit entzündungshemmendem Schmerzmittel und am Tag danach '
      + `lag der Bauch im Mittel bei ${z(n.mit.schnitt)}, an allen übrigen Tagen bei `
      + `${z(n.ohne.schnitt)} (${n.mit.tage} gegen ${n.ohne.tage} Tage).`;
  if (n.differenz < 0) {
    return `${zahlen} Also niedriger, nicht höher. Body Check zählt nur, was eingetragen ist – was `
      + 'an solchen Tagen gegessen und eingetragen wurde, kann vom Üblichen abweichen. Ein Hinweis, '
      + 'kein Beweis.';
  }
  if (n.modus === 'innerhalb') {
    const staerker = n.staerke.mit - n.staerke.ohne >= 1;
    return `${zahlen} Beide Seiten haben den Kopfschmerz (im Mittel ${z(n.staerke.mit)} `
      + `gegen ${z(n.staerke.ohne)}) – aber viele nehmen ein Mittel eher bei starken Schmerzen, `
      + 'und bei einer Migräne können Übelkeit und Erbrechen zum Anfall gehören. '
      + (staerker
        ? 'Die Tage mit Mittel waren auch die stärkeren – der Unterschied kann daran liegen. '
        : '')
      + 'Ein Hinweis, kein Beweis, aber einer, der in die Sprechstunde gehört.';
  }
  return `${zahlen} Bisher gab es keinen Kopfschmerztag ohne ein solches Mittel, `
    + 'mit dem sich das vergleichen ließe – in dem Unterschied steckt deshalb auch '
    + 'der Anfall selbst. Ein Hinweis, kein Beweis.';
}

/**
 * Der Bauch an Kopfschmerztagen – als Fußnote, nur wenn deutlich.
 *
 * Quellen der Begründung: Übelkeit und Erbrechen bei Migräne – ICHD-3 1.1
 * Kriterium D, gesund.bund.de/migraene (Stand 21.12.2022, Symptome). Hinlegen
 * – ein Drittel braucht im Anfall Bettruhe (EMA-EPAR Emgality,
 * EMA/708631/2018, Background). Reflux – bei manchen ist ein Zwerchfellbruch
 * die Ursache, und beim Bücken oder Liegen können vermehrt Beschwerden
 * auftreten (gesund.bund.de/sodbrennen-refluxkrankheit, Stand 04.04.2025,
 * Ursachen). Ob ein Mittel beteiligt ist, kann dieser Vergleich nicht sagen:
 * Er trennt Anfall und Mittel nicht.
 */
export function bauchAnKopfTagenSatz(b, fmt) {
  if (!b || !b.genug || !b.deutlich) return '';
  const z = zahlFormat(fmt);
  const zahlen = `An Kopfschmerztagen lag der Bauch im Mittel bei ${z(b.mit.schnitt)}, `
    + `an den übrigen Tagen bei ${z(b.ohne.schnitt)} (${b.mit.tage} gegen ${b.ohne.tage} Tage).`;
  if (b.differenz < 0) {
    return `${zahlen} Also niedriger. Body Check zählt nur, was eingetragen ist – was an solchen `
      + 'Tagen gegessen und eingetragen wurde, kann vom Üblichen abweichen; die Zahl sagt wenig.';
  }
  return `${zahlen} Bei einer Migräne können Übelkeit und Erbrechen zum Anfall gehören, und `
    + 'manche müssen sich hinlegen – das kann den Bauch an solchen Tagen schlechter aussehen '
    + 'lassen; mit Reflux oder Zwerchfellbruch können Beschwerden im Liegen zusätzlich zunehmen. '
    + 'Ein Bauchwert an einem Kopfschmerztag sagt deshalb wenig über das Essen davor. Ob ein '
    + 'Mittel beteiligt ist, zeigt dieser Vergleich nicht – er trennt Anfall und Mittel nicht.';
}

/**
 * Der Satz zum Übergebrauch.
 *
 * Drei Stufen. Den Namen aus der Sprechstunde gibt es erst, wenn in zwei
 * der drei Fenster sowohl die Einnahme als auch die Kopfschmerztage über der
 * Schwelle liegen – das ist, was die Klassifikation meint. Viel Mittel ohne
 * viele Kopfschmerztage (das tägliche ASS zum Blutschutz, das Diclofenac fürs
 * Knie) bekommt die Zahlen und die Regel, keinen Namen. Und ein einzelnes
 * Fenster bekommt nur die Zahlen: Die Klassifikation verlangt die
 * regelmäßige Einnahme über mehr als drei Monate, zusammen mit Kopfschmerz
 * an fünfzehn oder mehr Tagen im Monat (ICHD-3, 2018, 8.2 Kriterien A und
 * B, 8.2.2); ein einzelner Monat erfüllt das nicht. Wer den Diagnosenamen zu
 * früh liest, lässt das Mittel womöglich von sich aus weg – und dazu rät
 * diese App an keiner Stelle.
 */
export function uebergebrauchSatz(m) {
  if (!m || !m.fenster || !m.fenster.length) return '';
  if (!m.uebergebrauch && !m.einnahmeHoch) return '';
  const j = m.fenster[0];
  const zahlen = `An ${j.akut} der letzten 30 Tage ein Schmerz- oder Migränemittel `
    + `(${sortenText(j) || 'ohne Zuordnung'}); in den 30 Tagen davor an `
    + `${m.fenster[1] ? m.fenster[1].akut : 0}, davor an ${m.fenster[2] ? m.fenster[2].akut : 0} Tagen.`;
  const regel = 'Ab zehn Tagen mit Triptan, Kombinationsmittel oder Opioid, fünfzehn mit '
    + 'einfachen Schmerzmitteln (auch mehreren zusammen) oder zehn, wenn verschiedene '
    + 'Sorten durcheinandergehen';
  if (m.uebergebrauchBestaetigt) {
    return `${zahlen} Dazu ${j.kopfTage} Kopfschmerztage im jüngsten Fenster. ${regel} – `
      + 'über mehr als drei Monate und zusammen mit fünfzehn oder mehr Kopfschmerztagen '
      + 'im Monat – kann das Mittel den Kopfschmerz selbst unterhalten; die Neurologie '
      + 'nennt das Kopfschmerz bei Medikamentenübergebrauch. Eine Frage für die '
      + 'Sprechstunde, keine Anweisung – auch nicht die, es wegzulassen.';
  }
  if (m.einnahmeHoch) {
    return `${zahlen} ${regel}, über mehr als drei Monate, wird daraus eine Frage für `
      + 'die Sprechstunde – aber erst zusammen mit fünfzehn oder mehr Kopfschmerztagen '
      + `im Monat, und davon stehen hier ${j.kopfTage}. Die Zahl gehört trotzdem mit.`;
  }
  return `${zahlen} ${regel}, über mehr als drei Monate, wird daraus eine Frage für die `
    + 'Sprechstunde – ein einzelner Monat ist noch keine.';
}

/** Der Satz zur Häufigkeit – laut ab zwei von drei Fenstern, sonst nur die Zahlen. */
export function chronischSatz(z) {
  if (!z || !z.fenster || !z.fenster.length) return '';
  if (!z.chronischVerdacht && z.letzte30 < CHRONISCH_AB) return '';
  const zahlen = `${fensterKette(z.fenster, 'kopfTage')} Kopfschmerztage je 30 Tage `
    + `(${z.notiert30} der letzten 30 Tage notiert).`;
  if (!z.chronischVerdacht) {
    return `${zahlen} Ab fünfzehn Tagen im Monat über mehr als drei Monate fragt die `
      + 'Neurologie nach einem chronischen Kopfschmerz – ein einzelner Monat ist dafür '
      + 'noch kein Grund.';
  }
  return `${zahlen} In ${z.chronischFenster} der drei Fenster über fünfzehn. Ab fünfzehn `
    + 'Tagen im Monat über mehr als drei Monate spricht die Neurologie von einem '
    + 'chronischen Kopfschmerz – ob chronische Migräne oder etwas anderes, und ob ein '
    + 'Mittel beteiligt ist, klärt die Sprechstunde, nicht diese Zahl. Nimm die '
    + 'Monatszahlen mit.';
}

/**
 * Ein Anfall über drei Tage – nur, wenn er frisch ist.
 *
 * Quellen: Gebrauchsinformation Thomapyrin INTENSIV (patienteninfo-
 * service.de, überarbeitet Juni 2026, Abschnitt 2): „Wenn Schmerzen und/
 * oder Kopfschmerzen länger als 3 bis 4 Tage anhalten … sollte ein Arzt
 * zurate gezogen werden"; ICHD-3, 2018, 1.4.1 Status migrainosus: „A
 * debilitating migraine attack lasting for more than 72 hours" als
 * Komplikation der Migräne. Eine Eile („nicht auf den Termin warten") nennen
 * diese Quellen nicht; deshalb steht sie hier nicht.
 */
export function statusSatz(z, heute) {
  if (!z || !z.statusZuletzt || !heute) return '';
  if (z.statusZuletzt < plusTage(heute, -13)) return '';
  return 'Ein Anfall, der länger als drei Tage nicht aufhört, ist ein Grund, die Praxis zu '
    + 'fragen: Packungsbeilagen mancher Kopfschmerzmittel nennen Kopfschmerzen, die länger als '
    + 'drei bis vier Tage anhalten, als Anlass für ärztlichen Rat.';
}

/**
 * Das Fenster um die Periode – nur ab drei beobachteten Zyklen.
 *
 * Quelle: ICHD-3, 2018, Anhang A1.1.1 und A1.1.2 (deutsche Fassung auf
 * ichd-3.org: „rein menstruelle Migräne", „menstruationsassoziierte
 * Migräne"; Tag −2 bis +3 in mindestens 2 von 3 Zyklen, gezählt werden
 * Attacken, die die Kriterien einer Migräne erfüllen). Dass diese Kriterien
 * nur im Anhang stehen, sagt der Kommentar zu 1.1: „da weiter Unklarheit
 * darüber besteht, ob es sich um separate Entitäten handelt".
 */
export function umPeriodeSatz(u) {
  if (!u || !u.genug) return '';
  return `In ${u.mit} von ${u.zyklen} beobachteten Zyklen lag ein Kopfschmerztag in den `
    + 'Tagen um die Periode – zwei Tage davor bis zum dritten Blutungstag'
    + `${u.offen ? ` (${u.offen === 1 ? 'ein Zyklus' : `${u.offen} Zyklen`} noch offen)` : ''}. `
    + 'Dieses Fenster nutzt die Kopfschmerzklassifikation, bisher nur in ihrem Anhang: Liegen '
    + 'Migräneanfälle in mindestens zwei von drei Zyklen darin, spricht sie von rein menstrueller '
    + 'Migräne (nur dann) oder menstruationsassoziierter Migräne (auch zu anderen Zeiten). '
    + 'Gezählt werden dort Migräneanfälle; ob deine Kopfschmerztage welche sind, klärt die '
    + 'Sprechstunde.';
}

/**
 * Die Sätze zu den Umständen – nur die deutlichen.
 *
 * Die Vorboten nach ICHD-3, 2018: Einleitung zu Kapitel 1 („Some patients
 * also experience a prodromal phase, occurring hours or days before the
 * headache") und Kommentar zu 1.1 („Prodromal symptoms may begin hours or a
 * day or two before … fatigue, difficulty in concentrating, neck stiffness …
 * yawning"). Schlechter Schlaf steht in keiner dieser Listen; deshalb nennt
 * der Satz ihn nicht als Vorboten, sondern sagt nur, dass die Zahlen eine
 * Nacht nicht als Auslöser ausweisen können.
 */
export function umstaendeSaetze(liste) {
  return (liste || []).filter((u) => u.genug && u.deutlich).map((u) => {
    const zahlen = `${u.hochName.charAt(0).toUpperCase()}${u.hochName.slice(1)} an `
      + `${prozentText(u.hoch.anteil)} der Tage Kopfschmerz, ${u.niedrigName} an `
      + `${prozentText(u.niedrig.anteil)} (${u.hoch.tage} gegen ${u.niedrig.tage} Tage).`;
    return `${zahlen} Bei einer Migräne kündigt sich ein Anfall bei manchen schon Stunden bis `
      + 'zwei Tage vorher an, etwa mit Müdigkeit, Gähnen, Konzentrationsschwierigkeiten oder '
      + 'steifem Nacken. Ob eine Nacht dabei Auslöser war, zeigen Zahlen allein nicht. Gezählt '
      + 'sind nur Tage mit beantworteter Tagesfrage.';
  });
}

/**
 * Alles, was verglichen wurde und nichts hergab, in einer Zeile – statt
 * dreimal „kein deutlicher Unterschied" untereinander.
 */
export function unauffaelligeVergleiche({ nach, bauch, umstaende } = {}) {
  const teile = [];
  if (nach && nach.genug && !nach.deutlich) {
    teile.push(`Bauch nach dem Schmerzmittel (${nach.mit.tage} gegen ${nach.ohne.tage} Tage)`);
  }
  (umstaende || []).filter((u) => u.genug && !u.deutlich).forEach((u) => {
    teile.push(`${u.id === 'schlaf' ? 'Schlaf' : u.id} (${u.hoch.tage} gegen ${u.niedrig.tage} Tage)`);
  });
  if (bauch && bauch.genug && !bauch.deutlich) {
    teile.push(`Bauch an Kopfschmerztagen (${bauch.mit.tage} gegen ${bauch.ohne.tage} Tage)`);
  }
  return teile.length ? `Kein deutlicher Unterschied: ${teile.join(', ')}.` : '';
}
