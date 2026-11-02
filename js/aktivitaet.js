/*
 * Aktivitäten: was jemand gemacht hat oder wo er war.
 *
 * Gym, Laufen, Arbeit, unterwegs, eine Feier, die Sauna – alles Dinge, die
 * Bauch oder Kopf aus dem Gleichgewicht bringen können und in keiner
 * Mahlzeit stehen. Bis hierher gab es dafür nur die Tagesfrage „Bewegung",
 * eine Zahl für den ganzen Tag, und die stand in keiner Rechnung. Ein
 * Zeitpunkt sagt mehr: Kam es in den Stunden nach dem Training, oder war es
 * ohnehin ein schlechter Tag?
 *
 * Eine Aktivität ist deshalb ein Eintrag mit Uhrzeit, wie eine Mahlzeit –
 * aber keine Mahlzeit, und das ist der Kern dieser Datei. Sie wird nie
 * gegessen, also nie ein Auslöser, nie ein Gegenfall bei den Auslösern, nie
 * ein Bruch der Nüchternzeit. Und sie macht einen Tag nicht zu einem
 * notierten: Wer „Laufen" antippt und sonst nichts, hat über seinen Bauch
 * nichts gesagt, und ein Tag ohne Beschwerde, an dem nur das Laufen steht,
 * wäre genau die Lücke, die diese App an keiner Stelle als guten Tag zählt
 * (siehe eintragZaehlt in js/wasser.js).
 *
 * Gerechnet wird wie bei den Auslösern und mit denselben Vorbehalten: gegen
 * den eigenen Alltag statt gegen null, erst ab einer Mindestzahl von Fällen
 * auf beiden Seiten, mit dem Spielraum des Zufalls, und als Häufigkeit, nie
 * als Ursache. Einen Rat gibt es hier nicht – nur Zahlen mit Fallzahl.
 *
 * „Auswärts gegessen" steht nicht in dieser Liste, obwohl es danach klingt:
 * Es ist ein Umstand einer Mahlzeit (siehe UMSTAENDE in js/daten.js) und geht
 * dort in die Auslöserbilanz ein, mit dem Fenster nach dem Essen und gegen
 * die Mahlzeiten zu Hause. Als Aktivität stünde es neben der Mahlzeit, die
 * es meint, und hätte nichts, womit es sich vergleichen ließe.
 */
import { knopfTageszeit, minutenAmTag, plusTage, tageDazwischen, zeitpunkt } from './datum.js';
import { fmtZahl } from './text.js';
import { einstufung, reihenfolgeUnklar, tagesWert } from './auswertung.js';
import { kopfTagesWert } from './kopf.js';
import { zufallsSpielraum } from './zufall.js';

/*
 * Die Auswahl im Bogen. Kurz, aus demselben Grund wie die Zutaten: Eine Liste,
 * in der man sucht, wird nicht ausgefüllt. Was fehlt, legt man selbst an.
 *
 * `id` ist der Schlüssel im Speicher und darf sich nie ändern – daran hängen
 * alle gemachten Eintragungen. Namen dürfen sich ändern. Sie tragen kein
 * Komma: Mehrere Aktivitäten eines Eintrags stehen hintereinander in einer
 * Zeile, und „Gym, Krafttraining, Sauna" wären drei.
 */
export const AKTIVITAETEN = [
  { id: 'gym', name: 'Gym/Krafttraining', icon: '🏋️' },
  { id: 'laufen', name: 'Laufen', icon: '👟' },
  { id: 'rad', name: 'Radfahren', icon: '🚴' },
  { id: 'schwimmen', name: 'Schwimmen', icon: '🏊' },
  { id: 'spazieren', name: 'Spazieren', icon: '🚶' },
  { id: 'yoga', name: 'Yoga/Dehnen', icon: '🧘' },
  { id: 'arbeit', name: 'Arbeit', icon: '💼' },
  { id: 'unterwegs', name: 'Unterwegs/Reise', icon: '🧳' },
  { id: 'feier', name: 'Feier/Ausgehen', icon: '🎉' },
  { id: 'sauna', name: 'Sauna', icon: '🧖' },
  /*
   * Was man gegen Verspannung tut – `gegenmittel`. Sie stehen am Ende, damit
   * die Reihenfolge der bisherigen gleich bleibt. Gerechnet werden sie nur
   * auf der Kopfseite (siehe aktivitaetBilanz): Massiert und gewärmt wird,
   * wenn schon etwas wehtut – Wärme oft gerade wegen Bauchschmerzen –, und
   * eine Bauch-Zeile darunter sähe aus wie eine Wirkung auf den Bauch.
   */
  { id: 'massagepistole', name: 'Massagepistole', icon: '🔨', gegenmittel: true },
  { id: 'massage', name: 'Massage/Physio', icon: '💆', gegenmittel: true },
  { id: 'waerme', name: 'Wärme', icon: '♨️', gegenmittel: true },
];

const AKTIV_MAP = Object.fromEntries(AKTIVITAETEN.map((a) => [a.id, a]));

/** Ist das etwas, das man gegen Verspannung tut? Nur eingebaute zählen. */
export function istGegenmittel(id) {
  return !!(AKTIV_MAP[id] && AKTIV_MAP[id].gegenmittel);
}

/*
 * Was Hersteller von Massagepistolen dazu schreiben – gezeigt im Bogen,
 * sobald „Massagepistole" gewählt ist, auch ohne jeden Schalter.
 *
 * Kein Rat, wo und wie: nur, was die Hersteller selbst ausschließen oder
 * vorher abgeklärt haben wollen, und was in Fallberichten beschrieben ist.
 * Die Warnzeichen am Ende gehören dazu, weil die schwerste beschriebene
 * Folge – ein Einriss einer Halsarterie – sich erst Stunden oder Tage später
 * mit Schwindel oder Lähmung zeigen kann.
 *
 * Quellen:
 *   Therabody, Precautions and Contraindications,
 *     www.therabody.com/us/en-us/precautions-and-contraindications.html
 *     („face, head, throat, neck … bony prominences"; Schwangerschaft, veränderte
 *     Empfindung, frische Verletzung oder Operation)
 *   Theragun PRO Plus Warnings, content.abt.com/documents/176399/therabody-theragun-pro-plus-TG0003970-1A10-warnings.pdf
 *     und Relief User Warnings (Therabody) – Schrittmacher/ICD, Embolie,
 *     Blutungsneigung, Blutverdünner: ärztliche Rückfrage
 *   Sulkowski u. a. 2022, pubmed.ncbi.nlm.nih.gov/35701359/ – Dissektion
 *     der Vertebralarterie nach Massagepistole am Hals
 *   AAN 2024, Abstract 56206 – Dissektion mit Hirnstamminfarkt nach Anwendung am Hals
 *   Chen u. a. 2021, Phys Ther 101(1):pzaa199 – Rhabdomyolyse nach langer Anwendung
 *   gesund.bund.de/schlaganfall – Warnzeichen, 112
 */
export const MASSAGE_HINWEIS = {
  satz: 'Hersteller von Massagepistolen schreiben, je nach Gerät: nicht an Kopf, Gesicht, '
    + 'Kehle, Hals oder Nacken und nicht direkt auf Knochen. Wo am Körper, besprichst du am '
    + 'besten mit Praxis oder Physiotherapie.',
  details: 'Mit Herzschrittmacher oder Defibrillator, nach einer Embolie, bei Nervenschäden '
    + 'mit verändertem Gefühl, bei Blutungsneigung, mit Blutverdünnern, nach frischer '
    + 'Operation oder Verletzung und in der Schwangerschaft nennen Hersteller eine '
    + 'ärztliche Rückfrage vorab. In Fallberichten – Einzelfällen, wie oft so etwas '
    + 'vorkommt, ist unbekannt – sind nach Anwendung am Hals Einrisse einer Halsarterie '
    + 'mit Schlaganfall beschrieben, außerdem Muskelschäden nach langer Anwendung. '
    + 'Plötzliche Lähmung, Taubheit, Sprach- oder Sehstörung, starker Schwindel oder '
    + 'Gangunsicherheit sind ein Notfall: 112.',
};

/*
 * Wie anstrengend – freiwillig, drei Stufen. Mehr nicht: Wer nach dem
 * Training eine Skala von eins bis zehn ausfüllen soll, trägt das Training
 * nicht ein. Ohne Angabe heißt ohne Angabe, nicht „leicht".
 */
export const INTENSITAETEN = [
  { id: 'leicht', name: 'leicht' },
  { id: 'mittel', name: 'mittel' },
  { id: 'hart', name: 'anstrengend' },
];

export function intensitaetName(id) {
  const x = INTENSITAETEN.find((i) => i.id === id);
  return x ? x.name : '';
}

/**
 * Aus einem freien Namen eine eigene Kennung machen.
 *
 * Mit der Vorsilbe `a:`, wie die eigenen Auslöser `x:` tragen: Keine spätere
 * Erweiterung der Liste oben kann so eine schon vergebene eigene Kennung
 * überschreiben. Derselbe Name ergibt dieselbe Kennung – zweimal „Klettern"
 * angelegt ist einmal Klettern, auch auf zwei Geräten, die später
 * zusammengeführt werden.
 *
 * Buchstaben jeder Schrift bleiben stehen. Früher blieb nur a–z: „Йога" und
 * „Бег" wurden beide zu „a:eigen", und die zweite landete still unter dem
 * Namen der ersten. Umlaute werden wie bisher ausgeschrieben, damit schon
 * vergebene Kennungen gleich bleiben; Akzente lateinischer Buchstaben fallen
 * weg („Café" → „a:cafe"). Was dann noch zusammenfällt – ein Name nur aus
 * Zeichen ohne Buchstaben –, trennt freieAktivitaetId().
 */
export function eigeneAktivitaetId(name) {
  const rumpf = String(name).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/([a-z])[\u0300-\u036f]+/g, '$1').normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  return `a:${rumpf || 'eigen'}`;
}

/**
 * Die Kennung für einen neuen Namen, die es noch nicht für einen anderen
 * Namen gibt: „a:eigen", dann „a:eigen-2" und so weiter. Gibt es den Namen
 * schon (ohne Groß und klein), dessen Kennung – dann bleibt es bei einer.
 */
export function freieAktivitaetId(name, eigene = []) {
  const basis = eigeneAktivitaetId(name);
  const gleich = (a) => String(a.name || '').trim().toLowerCase() === String(name).trim().toLowerCase();
  for (let n = 1; n < 1000; n++) {
    const id = n === 1 ? basis : `${basis}-${n}`;
    const da = (eigene || []).find((a) => a && a.id === id);
    if (!da || gleich(da)) return id;
  }
  return `${basis}-${Date.now()}`;
}

/** Die eigenen Aktivitäten, die zur Auswahl stehen – ohne die entfernten. */
export function sichtbareEigene(eigene = []) {
  return (eigene || []).filter((a) => a && !a.ausgeblendet);
}

/**
 * Eine Aktivität zu ihrer Kennung – auch eine eigene, und auch eine, die es in
 * der Auswahl nicht mehr gibt.
 *
 * Wer eine eigene Aktivität unter „Mehr" entfernt, nimmt sie aus der Auswahl,
 * nicht aus dem Tagebuch. Die Einträge damit bleiben und behalten ihren
 * Namen: Entfernt wird nur zum Schein (`ausgeblendet`, siehe
 * aktivitaetEntfernen in js/store.js). Ältere Fassungen löschten wirklich;
 * für solche Kennungen kommt der Name aus der Kennung selbst
 * („a:kletterhalle" → „Kletterhalle"). Umlaute sind dabei verloren – besser
 * als eine Kennung im Klartext.
 */
export function aktivitaetVon(id, eigene = []) {
  if (AKTIV_MAP[id]) return AKTIV_MAP[id];
  const selbst = (eigene || []).find((a) => a && a.id === id);
  if (selbst) return { id, name: selbst.name, icon: '•', eigen: true, ...(selbst.ausgeblendet ? { weg: true } : {}) };
  const rumpf = String(id || '').replace(/^a:/, '').replace(/-/g, ' ').trim();
  return {
    id,
    name: rumpf ? rumpf.charAt(0).toUpperCase() + rumpf.slice(1) : 'Aktivität',
    icon: '•',
    eigen: true,
    weg: true,
  };
}

export function aktivitaetName(id, eigene = []) {
  return aktivitaetVon(id, eigene).name;
}

/** Gibt es diese Aktivität in der Auswahl – im Katalog oder als eigene? */
export function aktivitaetBekannt(id, eigene = []) {
  return !!AKTIV_MAP[id] || sichtbareEigene(eigene).some((a) => a.id === id);
}

/**
 * Die Kennungen eines Eintrags: jede höchstens einmal, nur Zeichenketten.
 *
 * Der zweite Riegel nach dem Einlesen (siehe aktivitaetFrisch in
 * js/store.js) – für alles, was daran vorbeikommt.
 */
export function aktivitaetenVon(e) {
  if (!e || e.art !== 'aktivitaet' || !Array.isArray(e.aktivitaeten)) return [];
  return [...new Set(e.aktivitaeten.filter((id) => typeof id === 'string' && id.trim()))];
}

/** „Gym/Krafttraining · Sauna" – die Namen eines Eintrags. */
export function aktivitaetText(e, eigene = []) {
  return aktivitaetenVon(e).map((id) => aktivitaetName(id, eigene)).join(' · ');
}

/** Wie oft jede Aktivität eingetragen ist – für die Reihenfolge im Bogen. */
export function aktivitaetHaeufigkeit(eintraege) {
  const zaehler = new Map();
  (eintraege || []).forEach((e) => aktivitaetenVon(e)
    .forEach((id) => zaehler.set(id, (zaehler.get(id) || 0) + 1)));
  return zaehler;
}

/**
 * Die zuletzt benutzten Aktivitäten, die jüngste zuerst – für die Reihe auf
 * dem Tag-Reiter.
 *
 * Aus den Einträgen gelesen und nirgends gespeichert: So stimmt die Reihe
 * auch nach dem Löschen eines Eintrags und nach dem Einlesen einer Sicherung,
 * ohne dass eine zweite Liste nachgeführt werden müsste. Eine eigene
 * Aktivität, die unter „Mehr" entfernt wurde, fehlt – wer sie entfernt, will
 * sie nicht mehr angeboten bekommen.
 */
export function zuletztAktivitaeten(eintraege, eigene = [], anzahl = 5) {
  const raus = [];
  const liste = eintraege || [];
  for (let i = liste.length - 1; i >= 0 && raus.length < anzahl; i--) {
    aktivitaetenVon(liste[i]).forEach((id) => {
      if (raus.length < anzahl && !raus.includes(id) && aktivitaetBekannt(id, eigene)) raus.push(id);
    });
  }
  return raus;
}

/* ---------- Was danach kam ---------- */

/*
 * Kopfschmerz zählt in den 24 Stunden nach einer Aktivität.
 *
 * Kürzer wäre sauberer und ginge am Kopf vorbei: Die Anstrengung macht ihren
 * Kopfschmerz noch am selben Abend, die Feier ihren erst am nächsten Morgen.
 * Ein Fenster bis zum selben Zeitpunkt am nächsten Tag fängt beides, und weil
 * die Vergleichstage dasselbe Fenster bekommen, wird es dadurch nicht
 * ungerecht – nur verdünnter.
 *
 * Und zwölf Fälle je Seite, wie bei den Umständen des Kopfes (js/kopf.js):
 * Verglichen werden Anteile, und Anteile aus wenigen Fenstern springen in
 * großen Schritten.
 */
export const AKTIV_KOPF_STUNDEN = 24;
export const AKTIV_KOPF_MINDEST = 12;

const STUNDE_MS = 3600000;

/**
 * Die mittlere Uhrzeit einer Aktivität, als „18:30" – der Median, damit ein
 * einzelnes Training am frühen Morgen die Vergleichszeit nicht verschiebt.
 */
export function aktivUhrzeit(liste) {
  const minuten = (liste || []).map((e) => minutenAmTag(e.um)).sort((a, b) => a - b);
  if (!minuten.length) return '12:00';
  const mitte = minuten[Math.floor((minuten.length - 1) / 2)];
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(mitte / 60))}:${p(mitte % 60)}`;
}

function aktivVergleich(mit, ohne, mindest) {
  const schnitt = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);
  const mitBeschwerden = mit.filter((w) => w > 0).length;
  const ohneBeschwerden = ohne.filter((w) => w > 0).length;
  return {
    faelle: mit.length,
    gegenFaelle: ohne.length,
    mitTreffer: mitBeschwerden,
    ohneTreffer: ohneBeschwerden,
    quoteMit: mit.length ? mitBeschwerden / mit.length : 0,
    quoteOhne: ohne.length ? ohneBeschwerden / ohne.length : 0,
    schnittMit: schnitt(mit),
    schnittOhne: schnitt(ohne),
    differenz: schnitt(mit) - schnitt(ohne),
    genug: mit.length >= mindest && ohne.length >= mindest,
    mindest,
    fehlt: Math.max(0, mindest - mit.length),
    fehltGegen: Math.max(0, mindest - ohne.length),
    werte: { mit, ohne },
  };
}

/**
 * Je Aktivität: was danach kam, gegen dieselben Stunden an Tagen ohne sie.
 *
 * Für den Bauch die stärkste Beschwerde in den `fenster` Stunden danach – dem
 * Fenster der Auslöser, damit „danach" hier dasselbe heißt wie bei einer
 * Mahlzeit. Für den Kopf, ob in den 24 Stunden danach ein Kopfschmerz
 * eingetragen wurde.
 *
 * Verglichen wird nicht mit anderen Aktivitäten – wer nur sein Training
 * einträgt, hätte sonst keinen Vergleich –, sondern mit denselben Stunden an
 * Tagen ohne diese Aktivität: Wer abends zum Training geht, wird mit seinen
 * Abenden ohne Training verglichen, nicht mit seinen Vormittagen. Abends geht
 * es vielen ohnehin schlechter, und das soll nicht dem Training angelastet
 * werden. Die Vergleichszeit ist die mittlere Uhrzeit der Aktivität.
 *
 * Was nicht zählt, auf keiner der beiden Seiten:
 *
 *   * Tage, an denen zum Bauch (beim Kopf: überhaupt) nichts notiert ist –
 *     eine Lücke ist kein Abend ohne Beschwerden. Beim Kopf auch der Tag
 *     danach, denn das Fenster reicht hinein.
 *   * Fenster, die noch laufen. Das Training von vor einer Stunde ist noch
 *     kein Training ohne Folgen.
 *   * Beim Kopf ein Fenster, vor dem am selben Tag schon ein Kopfschmerz
 *     stand: Was schon da war, kam nicht danach.
 *   * Vergleichsfenster, in denen oder kurz vor denen die Aktivität doch
 *     vorkam – etwa das Training am frühen Morgen des nächsten Tages.
 *   * Vergleichstage vor dem ersten Eintrag dieser Aktivität und nach dem
 *     letzten Tag, an dem überhaupt eine eingetragen wurde. Davor ist
 *     unbekannt, ob jemand ins Training ging – er hat es nur noch nicht
 *     aufgeschrieben.
 *
 * Gezählt wird beim Kopf je Tag: Zweimal Spazieren am selben Tag ist ein Tag
 * mit Spazieren, so wie die Vergleichsseite Tage zählt. Zwei 24-Stunden-
 * Fenster desselben Tages überlappen fast ganz, und derselbe Kopfschmerz
 * stünde sonst zweimal da. Beim Bauch zählt jedes Vorkommen, wie jede
 * Mahlzeit bei den Auslösern – nur eins, das im Fenster des vorigen beginnt,
 * ist kein eigenes: Es teilte sich mit ihm die Beschwerde.
 *
 * UND WENN DIE REIHENFOLGE OFFEN IST
 *
 * Mit den Zeitknöpfen eingetragen, steht „Gym, abends" auf 19:30 – die Minute
 * ist ausgedacht. Ob eine Beschwerde desselben Abends davor oder danach kam,
 * weiß dann niemand (siehe reihenfolgeUnklar in js/auswertung.js), ebenso
 * wenig bei einer Beschwerde „abends" ohne Bezug zum Essen. Eine solche
 * Beschwerde zählt als danach – auf beiden Seiten gleich: Die Vergleichszeit
 * gilt als genauso ungefähr wie die Aktivität meistens war, und eine offene
 * Beschwerde am Vergleichsabend zählt dort ebenso. Das misst dann „am selben
 * Teil des Tages" statt „in den Stunden danach", und `offen` sagt, bei wie
 * vielen Fällen das so ist.
 *
 * Früher fiel eine Aktivität mit offener Reihenfolge heraus. Heraus fielen
 * damit genau die Abende mit Beschwerde, die ruhigen blieben, und auf der
 * Vergleichsseite gab es die Regel nicht – jede Knopf-Aktivität sah danach
 * schützend aus. Ob ein Fall zählt, darf nie davon abhängen, was danach kam.
 *
 * ZWEI OPTIONEN FÜR EINE ENGERE FRAGE (seit der Fassung 28)
 *
 *   tagFilter(iso)  Nur Tage, für die das wahr ist – auf beiden Seiten: das
 *                   Vorkommen an diesem Tag ebenso wie der Vergleichstag.
 *                   Gebraucht für „Massage nach einem verspannten Vortag"
 *                   (js/spannung.js). Der Filter fragt mit Absicht nach dem
 *                   Vortag: Was vor der Massage feststand, entscheidet, nicht
 *                   was danach kam.
 *   nurIds          Nur diese Aktivitäten bekommen eine Zeile.
 *
 * Mit einer der beiden steht in der Kopfseite jeder Zeile auch, welche Tage
 * gezählt wurden (`kopf.tage`), damit der Aufrufer prüfen kann, ob sie
 * verschieden in der Woche liegen. Ohne Optionen ist das Ergebnis Zeichen für
 * Zeichen das der Fassung 27 (siehe tests/test-gold.mjs).
 *
 * @param {object[]} eintraege
 * @param {object} tage   der Tagesspeicher
 * @param {{fenster?: number, mindestFaelle?: number, jetzt?: number,
 *          tagFilter?: function, nurIds?: string[]}} opt
 */
export function aktivitaetBilanz(eintraege, tage, opt = {}) {
  const alle = eintraege || [];
  const fenster = Number(opt.fenster) > 0 ? Number(opt.fenster) : 4;
  const mindest = Number(opt.mindestFaelle) > 0 ? Number(opt.mindestFaelle) : 5;
  const kopfMindest = Math.max(mindest, AKTIV_KOPF_MINDEST);
  const jetzt = Number.isFinite(opt.jetzt) ? opt.jetzt : Date.now();
  const tagFilter = typeof opt.tagFilter === 'function' ? opt.tagFilter : null;
  const nurIds = Array.isArray(opt.nurIds) ? opt.nurIds : null;
  const mitTagen = !!(tagFilter || nurIds);
  const tagGilt = (iso) => !tagFilter || !!tagFilter(iso);
  const aktiv = alle.filter((e) => aktivitaetenVon(e).length && typeof e.am === 'string');
  if (!aktiv.length) return [];

  // Nach Tag – jede Frage unten gilt einem Tag und dem danach.
  const nachTag = new Map();
  alle.forEach((e) => {
    if (!nachTag.has(e.am)) nachTag.set(e.am, []);
    nachTag.get(e.am).push(e);
  });
  const am = (iso) => nachTag.get(iso) || [];
  const gemerkt = (fn) => {
    const m = new Map();
    return (iso) => {
      if (!m.has(iso)) m.set(iso, fn(iso));
      return m.get(iso);
    };
  };
  const bauchNotiert = gemerkt((iso) => tagesWert(am(iso), iso, tage).notiert);
  const kopfNotiert = gemerkt((iso) => kopfTagesWert(am(iso), iso, tage).notiert);
  const zweiTage = (iso) => [...am(iso), ...am(plusTage(iso, 1))];
  const abstand = (t0, e) => (zeitpunkt(e.am, e.um) - t0) / STUNDE_MS;
  const letzterTag = aktiv.reduce((m, e) => (e.am > m ? e.am : m), aktiv[0].am);
  /*
   * Für den Bauch zählt das Ende nur aus Aktivitäten, die eine Bauchseite
   * haben. Sonst verlängerte eine Massage nach dem letzten Training die
   * Vergleichstage des Trainings – und Wärme oder Massage änderten die
   * Bauch-Bilanz einer Aktivität, mit der sie nichts zu tun haben.
   */
  const mitBauch = aktiv.filter((e) => aktivitaetenVon(e).some((id) => !istGegenmittel(id)));
  const letzterBauchTag = mitBauch.length
    ? mitBauch.reduce((m, e) => (e.am > m ? e.am : m), mitBauch[0].am)
    : '';

  const vorkommen = new Map();
  aktiv.forEach((e) => aktivitaetenVon(e).forEach((id) => {
    if (nurIds && !nurIds.includes(id)) return;
    if (!vorkommen.has(id)) vorkommen.set(id, []);
    vorkommen.get(id).push(e);
  }));

  /*
   * Ist bei diesem Eintrag offen, ob er vor oder nach `orte` kam – einer
   * Aktivität oder der Vergleichszeit? Dann zählt er als danach (siehe oben).
   */
  const offenGegen = (orte, e) => orte.some((o) => reihenfolgeUnklar(o, e));

  /**
   * Die stärkste Beschwerde in (t0, t0 + fenster] – und dazu jede, deren
   * Reihenfolge zu `orte` offen ist. `offen`, wenn eine solche mitzählt.
   */
  const bauchWert = (t0, iso, orte) => {
    let wert = 0;
    let offen = false;
    zweiTage(iso).filter((b) => b.art === 'beschwerde').forEach((b) => {
      const st = Number(b.staerke) || 0;
      if (abstand(t0, b) > 0 && abstand(t0, b) <= fenster) wert = Math.max(wert, st);
      else if (b.am === iso && offenGegen(orte, b)) {
        wert = Math.max(wert, st);
        offen = true;
      }
    });
    return { wert, offen };
  };

  /** 1 oder 0 – oder null, wenn sich das Fenster nicht beurteilen lässt. */
  const kopfWert = (t0, iso, orte) => {
    if (t0 + AKTIV_KOPF_STUNDEN * STUNDE_MS > jetzt) return null;
    if (!kopfNotiert(iso) || !kopfNotiert(plusTage(iso, 1))) return null;
    const koepfe = zweiTage(iso).filter((k) => k.art === 'kopf' && Number(k.staerke) >= 1);
    const offen = (k) => k.am === iso && offenGegen(orte, k);
    if (koepfe.some((k) => k.am === iso && abstand(t0, k) <= 0 && !offen(k))) return null;
    return koepfe.some((k) => (abstand(t0, k) > 0 && abstand(t0, k) <= AKTIV_KOPF_STUNDEN) || offen(k))
      ? 1 : 0;
  };

  const zeilen = [];
  vorkommen.forEach((liste, id) => {
    const zeiten = liste.map((e) => zeitpunkt(e.am, e.um));
    const tageMit = new Set(liste.map((e) => e.am));
    const erster = liste.reduce((m, e) => (e.am < m ? e.am : m), liste[0].am);
    const uhr = aktivUhrzeit(liste);
    // Kein Vorkommen dieser Aktivität im Fenster und in den Stunden davor.
    const frei = (t0, stunden) => !zeiten.some((t) => t > t0 - stunden * STUNDE_MS
      && t <= t0 + stunden * STUNDE_MS);
    // Die Vergleichszeit ist so ungefähr, wie die Aktivität meistens
    // eingetragen ist: Wer nur „abends" sagt, hat auch an den Tagen ohne
    // Training keinen genaueren Abend.
    const meistUngefaehr = liste.filter((e) => e.ungefaehr).length * 2 >= liste.length;
    const vergleichszeit = (iso) => (meistUngefaehr
      ? { am: iso, um: uhr, ungefaehr: true, tageszeit: knopfTageszeit(uhr) }
      : { am: iso, um: uhr });
    const sortiert = [...liste].sort((a, b) => zeitpunkt(a.am, a.um) - zeitpunkt(b.am, b.um));

    const bauchMit = [];
    const kopfMit = [];
    const kopfMitTage = [];
    const kopfOhneTage = [];
    let offenMit = 0;
    let letztesFenster = -Infinity;
    sortiert.forEach((a) => {
      const t0 = zeitpunkt(a.am, a.um);
      // Beginnt im Fenster des vorigen Vorkommens: kein eigener Fall.
      if (t0 <= letztesFenster + fenster * STUNDE_MS) return;
      letztesFenster = t0;
      if (!tagGilt(a.am)) return;
      if (t0 + fenster * STUNDE_MS > jetzt || !bauchNotiert(a.am)) return;
      const w = bauchWert(t0, a.am, [a]);
      bauchMit.push(w.wert);
      if (w.offen) offenMit += 1;
    });
    // Beim Kopf je Tag ein Fall, ab dem ersten Vorkommen des Tages.
    const jeTag = new Map();
    sortiert.forEach((a) => {
      if (!jeTag.has(a.am)) jeTag.set(a.am, []);
      jeTag.get(a.am).push(a);
    });
    jeTag.forEach((amTag, iso) => {
      if (!tagGilt(iso)) return;
      const k = kopfWert(zeitpunkt(iso, amTag[0].um), iso, amTag);
      if (k !== null) {
        kopfMit.push(k);
        kopfMitTage.push(iso);
      }
    });

    const bauchOhne = [];
    const kopfOhne = [];
    let offenOhne = 0;
    const n = tageDazwischen(erster, letzterTag);
    for (let i = 0; i <= n; i++) {
      const iso = plusTage(erster, i);
      // Ein Tag mit der Aktivität ist nie ein Tag ohne – auch dann nicht, wenn
      // der Filter ihn auf der Seite „mit" nicht zulässt.
      if (tageMit.has(iso) || !tagGilt(iso)) continue;
      const t0 = zeitpunkt(iso, uhr);
      const ort = [vergleichszeit(iso)];
      if (iso <= letzterBauchTag && t0 + fenster * STUNDE_MS <= jetzt && bauchNotiert(iso)
        && frei(t0, fenster)) {
        const w = bauchWert(t0, iso, ort);
        bauchOhne.push(w.wert);
        if (w.offen) offenOhne += 1;
      }
      if (frei(t0, AKTIV_KOPF_STUNDEN)) {
        const k = kopfWert(t0, iso, ort);
        if (k !== null) {
          kopfOhne.push(k);
          kopfOhneTage.push(iso);
        }
      }
    }

    /*
     * Massage, Massagepistole, Wärme: ohne Bauchseite. Gezählt wird, damit
     * die Zahlen stimmen, wenn jemand nachsieht – aber nie `genug`. Damit
     * fehlen sie unter den Bauch-Vergleichen, die den Zufallsspielraum
     * aller anderen bestimmen, und eine Bauch-Zeile gibt es nirgends.
     */
    const gegen = istGegenmittel(id);
    const bauch = { ...aktivVergleich(bauchMit, bauchOhne, mindest), offen: offenMit, offenOhne };
    if (gegen) bauch.genug = false;
    zeilen.push({
      id,
      anzahl: liste.length,
      zuletzt: liste[liste.length - 1].am,
      uhr,
      ...(gegen ? { gegenmittel: true } : {}),
      bauch,
      kopf: {
        ...aktivVergleich(kopfMit, kopfOhne, kopfMindest),
        ...(mitTagen ? { tage: { mit: kopfMitTage, ohne: kopfOhneTage } } : {}),
      },
    });
  });

  /*
   * Erst jetzt der Zufallsspielraum, wie in der Auslöserbilanz: Erst hier
   * steht fest, wie viele Vergleiche überhaupt angestellt wurden – und wer
   * zehn Aktivitäten prüft, findet sonst auch in einem Tagebuch ohne jeden
   * Zusammenhang eine auffällige.
   */
  ['bauch', 'kopf'].forEach((seite) => {
    const vergleiche = zeilen.filter((z) => z[seite].genug).length;
    zeilen.forEach((z) => {
      const v = z[seite];
      const r = zufallsSpielraum(v.werte.mit, v.werte.ohne, Math.max(1, vergleiche));
      v.spielraum = r.spielraum;
      v.vergleiche = vergleiche;
      delete v.werte;
    });
  });
  zeilen.forEach((z) => {
    z.bauch.art = einstufung(z.bauch);
    z.kopf.art = aktivKopfEinstufung(z.kopf);
  });

  return zeilen.sort((a, b) => (b.bauch.differenz - a.bauch.differenz) || (b.anzahl - a.anzahl));
}

/**
 * Wie der Kopfteil zu lesen ist – mit den Wörtern der Auslöser.
 *
 * Verglichen werden Anteile: Ab zwanzig Prozentpunkten und über dem
 * Zufallsspielraum gilt ein Unterschied als deutlich, wie bei den Umständen
 * des Kopfes in js/kopf.js. Darunter heißt es „kein Unterschied", in beide
 * Richtungen.
 */
export function aktivKopfEinstufung(v) {
  if (!v.genug) return 'zuwenig';
  const zufall = Number.isFinite(v.spielraum) ? v.spielraum : 0;
  if (Math.abs(v.differenz) < Math.max(0.2, zufall)) return 'neutral';
  return v.differenz > 0 ? 'auffaellig' : 'unauffaellig';
}

/* ---------- Sätze ---------- */

const prozentVon = (x) => `${Math.round(x * 100)} %`;

/**
 * „In den 4 Stunden danach 7 von 12 Mal Beschwerden (58 %, im Mittel 3,1) –
 * an 30 Tagen ohne, ab 18:30, 13 % (0,4)."
 */
export function aktivBauchSatz(z, fenster) {
  const b = z.bauch;
  // Wo nur die Tageszeit feststeht, wird das gesagt – sonst läse sich „danach"
  // wie eine erhobene Reihenfolge.
  const offen = b.offen
    ? ` Bei ${b.offen} davon steht nur die Tageszeit fest – dort zählt, was am selben `
      + 'Teil des Tages kam, an den Tagen ohne genauso.'
    : '';
  return `In den ${fenster} Stunden danach ${b.mitTreffer} von ${b.faelle} Mal Beschwerden `
    + `(${prozentVon(b.quoteMit)}, im Mittel ${fmtZahl(b.schnittMit)}) – an ${b.gegenFaelle} Tagen `
    + `ohne, ab ${z.uhr}, ${prozentVon(b.quoteOhne)} (${fmtZahl(b.schnittOhne)}).${offen}`;
}

/**
 * „In den 24 Stunden danach an 5 von 12 Tagen Kopfschmerz (42 %) – an Tagen
 * ohne 6 von 40 (15 %)." Tage, nicht Male: Gezählt wird je Tag (siehe
 * aktivitaetBilanz).
 */
export function aktivKopfSatz(z) {
  const k = z.kopf;
  /*
   * Bei Massage und Wärme ist die Reihenfolge verdächtig, in beide
   * Richtungen: Man greift dazu, wenn sich etwas anbahnt – ein Kopfschmerz
   * danach war womöglich schon unterwegs –, und danach wird vieles ohnehin
   * besser. Beides gehört neben die Zahl.
   */
  const vorbehalt = istGegenmittel(z.id)
    ? ' Massiert oder gewärmt wird oft, wenn sich etwas anbahnt – ein Kopfschmerz danach '
      + 'kann schon unterwegs gewesen sein; danach wird es außerdem oft von selbst besser.'
    : '';
  return `In den ${AKTIV_KOPF_STUNDEN} Stunden danach an ${k.mitTreffer} von ${k.faelle} Tagen `
    + `Kopfschmerz (${prozentVon(k.quoteMit)}) – an Tagen ohne ${k.ohneTreffer} von `
    + `${k.gegenFaelle} (${prozentVon(k.quoteOhne)}).${vorbehalt}`;
}

/**
 * Die Tagesfrage „Bewegung" in einem Satz – oder '' ohne genug Tage.
 *
 * Gezählt am selben Tag, und deshalb mit dem Vorbehalt in beide Richtungen:
 * An einem schlechten Tag bewegt man sich weniger, und an einem Tag mit viel
 * Bewegung isst man anders. Was hier steht, kam zusammen vor.
 */
export function bewegungSatz(f) {
  if (!f || !f.genug) return '';
  const tage = `${f.hoch.tage} gegen ${f.niedrig.tage} Tage`;
  // Eine ganze Stufe, wie überall bei den Tagesfragen: Darunter ist es
  // Schwankung, und das wird auch so gesagt.
  // Mit derselben Größe wie im anderen Zweig: „im Mittel 2,2" allein läse
  // sich wie eine Stufe der Bewegung.
  if (Math.abs(f.differenz) < 1) {
    return 'Bewegung am Tag: kein deutlicher Unterschied – an Tagen mit intensiver Bewegung '
      + `lag die Beschwerdestärke im Mittel bei ${fmtZahl(f.hoch.schnitt)}, an Tagen mit wenig `
      + `oder keiner bei ${fmtZahl(f.niedrig.schnitt)} (${tage}).`;
  }
  return `An Tagen mit intensiver Bewegung lag die Beschwerdestärke im Mittel bei `
    + `${fmtZahl(f.hoch.schnitt)}, an Tagen mit wenig oder keiner bei `
    + `${fmtZahl(f.niedrig.schnitt)} (${tage}).`;
}
