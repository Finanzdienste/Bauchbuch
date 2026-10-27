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
 * Was den Kopf und den Bauch trotzdem verbindet, ist das Schmerzmittel.
 * Ibuprofen, Diclofenac und ASS gehören zu den häufigsten Ursachen einer
 * gereizten Magenschleimhaut – und wer Kopfschmerzen hat, greift genau dazu.
 * Bei einer Gastritis Typ C sind sie einer der Hauptverdächtigen. Deshalb
 * zählt dieses Modul, an wie vielen Kopfschmerztagen ein solches Mittel im
 * Tagebuch steht, und vergleicht den Bauch danach – und zwar, wo es geht,
 * mit Kopfschmerztagen *ohne* ein solches Mittel, damit der Kopfschmerz auf
 * beiden Seiten steht und der Unterschied das Mittel ist.
 *
 * FÜR EINE MIGRÄNE
 *
 * Ein Kopfschmerztagebuch für die Sprechstunde braucht wenige Zahlen, und sie
 * stehen hier alle: Kopfschmerztage je Monat, Tage mit Akutmedikation je Monat
 * und Klasse, Dauer und Stärke der Attacken, Begleitmerkmale, ob der Tag
 * ausgefallen ist, ob das Mittel geholfen hat, und ob die Attacken an der
 * Periode hängen. Die Schwellen, die die Neurologie dafür benutzt, stehen
 * dabei – als Frage für die Sprechstunde, nie als Urteil: Die App zählt
 * Kopfschmerztage, keine Migränetage. Und weil die Definitionen mehr als drei
 * Monate verlangen, rechnet sie drei Fenster zu dreißig Tagen; ein einzelnes
 * Fenster ist bei einer Migräne ein Zufallswert – eine schlechte Woche, ein
 * Zyklus.
 */
import { fmtMonat, monatsStart, plusMonate, plusTage } from './datum.js';
import { PHASEN, phaseVon, zyklen } from './zyklus.js';

/*
 * Wie er sich anfühlt. Keine Diagnose-Schublade, sondern die Fragen, die in
 * der Sprechstunde gestellt werden: pochend oder drückend, eine Seite oder
 * beide, Übelkeit, Erbrechen, Licht, Bewegung, Nacken, Aura. Aus der
 * Kombination schließt eine Ärztin etwas; die App schließt nichts, sie zählt.
 *
 * „Nackenschmerz dabei", nicht „vom Nacken her": Nackenschmerz begleitet die
 * meisten Migräneanfälle, und wer ihn als Ursache einträgt, landet in der
 * falschen Sprechstunde.
 */
export const KOPF_ARTEN = [
  { id: 'pochend', name: 'Pochend, pulsierend' },
  { id: 'drueckend', name: 'Drückend, wie ein Band' },
  { id: 'einseitig', name: 'Einseitig' },
  { id: 'kopfuebel', name: 'Mit Übelkeit' },
  { id: 'kopferbrechen', name: 'Erbrochen' },
  { id: 'licht', name: 'Licht oder Lärm stören' },
  { id: 'bewegung', name: 'Schlimmer bei Bewegung' },
  { id: 'nacken', name: 'Nackenschmerz dabei' },
  { id: 'aura', name: 'Aura vorher (Flimmern, Zacken, wanderndes Kribbeln, Wortsuche)' },
];

/*
 * Wie lange. Vier grobe Stufen statt einer Stundenzahl: Wer eine Attacke
 * hinter sich hat, weiß „den halben Tag" oder „bis übermorgen", aber nicht
 * „elf Stunden". Die Grenzen sind die, die etwas bedeuten: Unter vier Stunden
 * ist für eine Migräne untypisch oder früh behandelt, vier Stunden bis drei
 * Tage ist ihr Bereich, und länger als drei Tage ist ein Grund, in der Praxis
 * anzurufen. „Weiß ich nicht mehr" wird gespeichert, aber nicht gezählt.
 */
export const KOPF_DAUER = [
  { id: 'kurz', name: 'unter 4 Stunden' },
  { id: 'mittel', name: '4 bis 24 Stunden' },
  { id: 'lang', name: '1 bis 3 Tage' },
  { id: 'status', name: 'länger als 3 Tage' },
];

/*
 * Wie der Tag weiterging – in den drei Stufen, nach denen die Sprechstunde
 * graduiert: Ausfalltage und Tage mit halber Leistung über drei Monate.
 * Ja/nein wäre bequemer und verlöre die Mitte, in der die meisten
 * Migränetage liegen.
 */
export const KOPF_VERLAUF = [
  { id: 'normal', name: 'Normal weitergemacht', kurz: '' },
  { id: 'eingeschraenkt', name: 'Eingeschränkt, aber weitergemacht', kurz: 'eingeschränkt' },
  { id: 'ausgefallen', name: 'Ausgefallen – hinlegen müssen, Arbeit oder Pläne abgesagt', kurz: 'ausgefallen' },
];

/** Die Antwort, die man auf der Nachtrag-Karte geben darf, ohne zu raten. */
export const UNBEKANNT = 'unbekannt';

/*
 * Hat das Mittel geholfen? Nach etwa zwei Stunden – das ist der Zeitpunkt, an
 * dem die Akuttherapie beurteilt und angepasst wird. Die eine Angabe, ohne
 * die ein Kopfschmerztagebuch für die Sprechstunde unvollständig ist.
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

/**
 * Alle Tage, an denen überhaupt etwas eingetragen wurde – gleich was.
 *
 * Für den Kopf ist ein Tag mit nur einem Kopfeintrag ein notierter Tag; für
 * den Bauch ist er eine Lücke (siehe tagesWert in auswertung.js). Beides ist
 * richtig, und deshalb hat der Kopf hier seine eigene Zählung.
 */
function alleNotiertenTage(eintraege, tage) {
  return new Set([
    ...(eintraege || []).map((e) => e.am),
    ...Object.keys(tage || {}),
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
  // Ausfalltage über die letzten 90 Tage – der Zeitraum, nach dem gefragt wird.
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
 *   nsar       greift den Magen an – die Verbindung zum Bauch
 *   kombi      ASS plus Koffein – für den Magen ein NSAR, für den Kopf die
 *              niedrige Übergebrauchsgrenze der Kombinationsmittel
 *   triptan    das Migränemittel – schont den Magen, Grenze zehn Tage
 *   nichtnsar  Paracetamol, Metamizol – ohne Entzündungshemmung
 *   opioid     Tramadol, Tilidin, Codein – Grenze zehn Tage
 *   gepant     die neuen Anfallsmittel – zählen als Akuttag, ohne eigene Grenze
 *
 * Für die Übergebrauchsregel gelten nsar und nichtnsar als EINE Klasse: die
 * einfachen Schmerzmittel, Grenze fünfzehn Tage – auch mehrere zusammen.
 * „Verschiedene durcheinander" meint Triptan, Kombination, Opioid und
 * einfache Schmerzmittel untereinander, Grenze zehn.
 *
 * Vorbeugende Mittel (Gruppe 'prophylaxe') und Magenmittel sind keine Klasse:
 * Sie zählen nirgends als Akutmittel. Welche Gruppe ein Name hat, weiß
 * mittel.js; hierher kommt nur die Kennung.
 */
const AKUT_KLASSEN = ['nsar', 'kombi', 'triptan', 'nichtnsar', 'opioid', 'gepant'];
const KLASSE_VON_GRUPPE = Object.fromEntries(AKUT_KLASSEN.map((k) => [k, k]));

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
  const tage = Object.fromEntries(AKUT_KLASSEN.map((k) => [k, drin(alle[k]).length]));
  const einfach = new Set([...drin(alle.nsar), ...drin(alle.nichtnsar)]);
  const nsarKombi = new Set([...drin(alle.nsar), ...drin(alle.kombi)]);
  const akut = new Set();
  AKUT_KLASSEN.forEach((k) => drin(alle[k]).forEach((iso) => akut.add(iso)));
  // Die Klassen, zwischen denen „durcheinander" zählt.
  const gruppen = [
    einfach.size > 0, tage.kombi > 0, tage.triptan > 0, tage.opioid > 0,
  ].filter(Boolean).length;
  const uebergebrauch = tage.triptan >= UEBERGEBRAUCH.triptan
    || tage.kombi >= UEBERGEBRAUCH.kombi
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

/** Die Sorten eines Fensters als Text: „4 Triptan, 5 entzündungshemmend, …". */
export function sortenText(f) {
  if (!f) return '';
  return [
    f.tage.triptan ? `${f.tage.triptan} Triptan` : '',
    f.nsarKombi ? `${f.nsarKombi} entzündungshemmend` : '',
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
 * Kopfschmerz eingetragen wurde oder nicht. Für die Frage, ob das Mittel
 * selbst den Kopfschmerz unterhält, ist gleichgültig, wogegen es genommen
 * wurde; und ein vergessener Kopfeintrag darf die Zahl nicht kleiner machen.
 * Den Namen aus der Klassifikation bekommt das aber erst zusammen mit
 * fünfzehn Kopfschmerztagen im selben Fenster – sonst stünde er bei jedem
 * täglichen ASS zum Blutschutz.
 *
 * Was an einem Kopfschmerztag eingetragen ist und keiner Gruppe zuzuordnen,
 * steht unter `unbekannt` mit Namen: Ein Schmerzmittel, das die App nicht
 * kennt, fehlt sonst still in der Zählung, und die Nutzerin trägt eine zu
 * kleine Zahl in die Sprechstunde. Nur Kopfschmerztage – sonst stünde dort
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
  // Für den Magen zählt ein Kombinationsmittel mit ASS wie ein NSAR.
  const nsarKopfTage = new Set([...amKopfTag.nsar, ...amKopfTag.kombi]);
  const kopfTageOhneNsar = [...kopfTage].filter((iso) => !nsarKopfTage.has(iso)).sort();

  const fenster = heute
    ? Array.from({ length: KOPF_FENSTER }, (_, i) => fensterMittel(alle, kopfTage, fensterGrenzen(heute, i)))
    : [];
  const leer = { akut: 0, tage: Object.fromEntries(AKUT_KLASSEN.map((k) => [k, 0])), nsarKombi: 0, einfach: 0, kopfTage: 0, uebergebrauch: false, moh: false };
  const juengst = fenster[0] || leer;
  const einnahmeFenster = fenster.filter((f) => f.uebergebrauch).length;
  const mohFenster = fenster.filter((f) => f.moh).length;
  return {
    kopfTage: kopfTage.size,
    mitAkut: amKopfTag.akut.size,
    mitNsar: nsarKopfTage.size,
    mitTriptan: amKopfTag.triptan.size,
    mitNichtNsar: amKopfTag.nichtnsar.size,
    mitKombi: amKopfTag.kombi.size,
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
 * Verglichen wird der Bauch-Tageswert am Tag selbst und am Tag danach – dort
 * liegt das Signal: Der Schaden an der Schleimhaut entsteht binnen Stunden,
 * der Ausfall des Schutzfilms hält grob einen Tag an.
 *
 * Die Vergleichsgruppe ist der Punkt. Gegen „alle übrigen Tage" misst man vor
 * allem den Anfall – Übelkeit, Nüchternbleiben, Liegen –, nicht das Mittel.
 * Deshalb wird, wo es geht, *innerhalb* der Kopfschmerztage verglichen: Tage
 * mit NSAR (und der Tag danach) gegen Kopfschmerztage ohne NSAR (und der Tag
 * danach). Beide Seiten haben den Kopfschmerz; der Unterschied ist das
 * Mittel – oder die Schwere des Anfalls, denn ein Mittel nimmt man eher an
 * den schlimmeren Tagen. Deshalb steht die mittlere Kopfstärke beider Seiten
 * mit dabei. Erst wenn es keinen Kopfschmerztag ohne NSAR gibt, bleibt der
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
 * Eine Fußnote, keine Auskunft: Das Ergebnis ist in beide Richtungen
 * erwartbar, weil Übelkeit und Liegen zum Anfall gehören – und weil an
 * solchen Tagen wenig gegessen und wenig eingetragen wird. Es steht da, damit
 * niemand den Bauchwert eines Kopfschmerztages als Aussage über das Essen
 * davor liest – oder über das Mittel.
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
    notiert: amTag.length > 0 || !!tage[iso],
    wert: amTag.some((e) => e.art === 'kopf' && Number(e.staerke) >= 1) ? 1 : 0,
  };
}

/*
 * Kopfschmerz nach Umständen: nur der Schlaf.
 *
 * Die Nacht davor ist der eine Umstand, der sauber *vor* dem Kopfschmerz
 * liegt. Anspannung am selben Tag liegt es nicht: Ein Anfall kündigt sich oft
 * einen Tag vorher an – mit Unruhe, Müdigkeit, Nackenschmerz –, und ein
 * Vergleich am selben Tag misst dann den Anfang des Anfalls und nennt ihn
 * Auslöser. Deshalb steht die Anspannung hier nicht, und auch beim Schlaf
 * steht der Vorbehalt daneben.
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

/** Die 0/1-Reihe hinter einem Anteil, für den Zufallsspielraum. */
function nullEins(tage, anteil) {
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
 * Das ist die Frage, die in der Kopfschmerzsprechstunde gestellt wird –
 * „menstruell?" –, und die vier Phasen beantworten sie nicht: Die zwei Tage
 * vor der Blutung, in denen das Östrogen fällt, verschwinden dort in der
 * breiten zweiten Zyklushälfte.
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
 * Die letzten drei Kalendermonate nebeneinander – das Format des
 * Kopfschmerzkalenders, mit dem die Neurologie chronischen Kopfschmerz und
 * Übergebrauch beurteilt.
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

/**
 * Fragen für die Sprechstunde, aus den Kopfzahlen – so, wie die Muster sie
 * für den Bauch stellen. Jede ist eine Frage, keine davon eine Empfehlung,
 * und keine legt der Nutzerin eine Diagnose in den Mund; die Antwort hat die
 * Praxis.
 */
export function kopfFragen({ zahlen: z, mittel: m, befundIds = [] } = {}) {
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
  return fragen;
}

/* ---------- Die Sätze ---------- */

const zahlFormat = (fmt) => fmt || ((x) => String(Math.round(x * 10) / 10).replace('.', ','));
const prozentText = (x) => `${Math.round(x * 100)} %`;

/** Die Fensterzahlen als Kette: „12 · davor 9 · davor 4". */
function fensterKette(fenster, feld) {
  return fenster.map((f, i) => `${i ? 'davor ' : ''}${f[feld]}`).join(' · ');
}

/** Der Satz zur Nachwirkung – nur, wenn er deutlich ist. */
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
    return `${zahlen} Also niedriger, nicht höher – an solchen Tagen wird oft wenig `
      + 'gegessen und wenig eingetragen. Ein Hinweis, kein Beweis.';
  }
  if (n.modus === 'innerhalb') {
    const staerker = n.staerke.mit - n.staerke.ohne >= 1;
    return `${zahlen} Beide Seiten haben den Kopfschmerz (im Mittel ${z(n.staerke.mit)} `
      + `gegen ${z(n.staerke.ohne)}) – aber ein Mittel nimmt man eher an den schlimmeren `
      + 'Tagen, und die haben mehr Übelkeit. '
      + (staerker
        ? 'Die Tage mit Mittel waren auch die stärkeren – der Unterschied kann daran liegen. '
        : '')
      + 'Ein Hinweis, kein Beweis, aber einer, der in die Sprechstunde gehört.';
  }
  return `${zahlen} Bisher gab es keinen Kopfschmerztag ohne ein solches Mittel, `
    + 'mit dem sich das vergleichen ließe – in dem Unterschied steckt deshalb auch '
    + 'der Anfall selbst. Ein Hinweis, kein Beweis.';
}

/** Der Bauch an Kopfschmerztagen – als Fußnote, nur wenn deutlich. */
export function bauchAnKopfTagenSatz(b, fmt) {
  if (!b || !b.genug || !b.deutlich) return '';
  const z = zahlFormat(fmt);
  const zahlen = `An Kopfschmerztagen lag der Bauch im Mittel bei ${z(b.mit.schnitt)}, `
    + `an den übrigen Tagen bei ${z(b.ohne.schnitt)} (${b.mit.tage} gegen ${b.ohne.tage} Tage).`;
  if (b.differenz < 0) {
    return `${zahlen} Also niedriger. An solchen Tagen wird oft wenig gegessen und `
      + 'wenig eingetragen; die Zahl sagt wenig.';
  }
  return `${zahlen} Übelkeit, Erbrechen, Nüchternbleiben und stundenlanges Liegen `
    + 'gehören zu einem Anfall – das allein reicht, damit der Bauch an solchen Tagen '
    + 'schlechter aussieht; mit Reflux oder Zwerchfellbruch erst recht. Ein Bauchwert '
    + 'an einem Kopfschmerztag sagt deshalb wenig über das Essen davor und nichts '
    + 'über das Mittel.';
}

/**
 * Der Satz zum Übergebrauch.
 *
 * Drei Stufen. Den Namen aus der Sprechstunde gibt es erst, wenn in zwei
 * der drei Fenster sowohl die Einnahme als auch die Kopfschmerztage über der
 * Schwelle liegen – das ist, was die Klassifikation meint. Viel Mittel ohne
 * viele Kopfschmerztage (das tägliche ASS zum Blutschutz, das Diclofenac fürs
 * Knie) bekommt die Zahlen und die Regel, keinen Namen. Und ein einzelnes
 * Fenster bekommt nur die Zahlen: Zehn Triptan-Tage in einem Monat sind bei
 * einer Migräne nichts Ungewöhnliches – ein Zyklus, eine schlechte Woche –,
 * und wer danach den Diagnosenamen liest, lässt das Mittel womöglich von
 * sich aus weg und liegt mit unbehandelten Anfällen da.
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

/** Ein Anfall über drei Tage – nur, wenn er frisch ist. */
export function statusSatz(z, heute) {
  if (!z || !z.statusZuletzt || !heute) return '';
  if (z.statusZuletzt < plusTage(heute, -13)) return '';
  return 'Ein Anfall, der länger als drei Tage nicht aufhört, ist ein Grund, in der '
    + 'Praxis anzurufen und nicht auf den nächsten Termin zu warten.';
}

/** Das Fenster um die Periode – nur ab drei beobachteten Zyklen. */
export function umPeriodeSatz(u) {
  if (!u || !u.genug) return '';
  return `In ${u.mit} von ${u.zyklen} beobachteten Zyklen lag ein Kopfschmerztag in den `
    + 'Tagen um die Periode – zwei Tage davor bis zum dritten Blutungstag'
    + `${u.offen ? ` (${u.offen === 1 ? 'ein Zyklus' : `${u.offen} Zyklen`} noch offen)` : ''}. `
    + 'Genau danach fragt die Neurologie: In mindestens zwei von drei Zyklen heißt das '
    + 'menstruationsgebunden – gezählt werden dort Migräneanfälle; ob deine '
    + 'Kopfschmerztage welche sind, klärt die Sprechstunde.';
}

/** Die Sätze zu den Umständen – nur die deutlichen. */
export function umstaendeSaetze(liste) {
  return (liste || []).filter((u) => u.genug && u.deutlich).map((u) => {
    const zahlen = `${u.hochName.charAt(0).toUpperCase()}${u.hochName.slice(1)} an `
      + `${prozentText(u.hoch.anteil)} der Tage Kopfschmerz, ${u.niedrigName} an `
      + `${prozentText(u.niedrig.anteil)} (${u.hoch.tage} gegen ${u.niedrig.tage} Tage).`;
    return `${zahlen} Ein Anfall kündigt sich oft schon am Vortag an – mit Unruhe, `
      + 'Müdigkeit, Nackenschmerz oder schlechtem Schlaf. Was Vorbote war und was '
      + 'Auslöser, sieht man an Zahlen allein nicht. Gezählt sind nur Tage mit '
      + 'beantworteter Tagesfrage.';
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
