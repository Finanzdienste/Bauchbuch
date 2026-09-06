/*
 * Der Speicher. Alles, was eingetragen wird, liegt hier – und nur hier.
 *
 * Es gibt keinen Server, kein Konto und keine Anmeldung. Der gesamte Zustand
 * steht im localStorage dieses einen Browsers auf diesem einen Gerät. Das ist
 * keine Sparmaßnahme, sondern die Bauart: Ein Tagebuch über den eigenen Körper
 * soll nirgendwohin gehen, wo es jemand anders lesen könnte, und was nie
 * verschickt wird, kann auch nicht abhandenkommen.
 *
 * Die Kehrseite steht ehrlich in der App: Ein gelöschter Browser-Speicher
 * nimmt alles mit. Dagegen hilft nur die Sicherung unter „Mehr" – deshalb
 * erinnert die App daran, und deshalb ist der Export eine gewöhnliche
 * JSON-Datei, die man auch ohne diese App noch lesen kann.
 */
import { heuteISO, jetztUhr, minutenAmTag, zeitpunkt } from './datum.js';

const KEY = 'bauchbuch.state.v1';

const VORGABE = {
  // Alle Eintragungen in einer Liste, nach Zeitpunkt sortiert gehalten.
  // Ein Eintrag ist immer { id, am, um, art } plus die Felder seiner Art:
  //   essen       { was, zutaten: [{ id, rolle }], portion: 'klein'|'normal'|'gross' }
  //   beschwerde  { staerke: 0..10, arten: [beschwerdeId], notiz, stuhlbezug }
  //   stuhl       { form: 1..7, dringend, unvollstaendig, warnzeichen: [id] }
  //   medikament  { mittel, dosis }
  //   notiz       { text }
  eintraege: [],
  // Was für einen ganzen Tag gilt, nicht für einen Zeitpunkt. Welche Angaben
  // es gibt, steht in TAGESFRAGEN (js/daten.js):
  // { 'YYYY-MM-DD': { stimmung, stress, schlaf, bewegung, blutung, sex, nachtwach, notiz } }
  tage: {},
  // In wie vielen Stunden nach einer Mahlzeit eine Beschwerde ihr noch
  // zugerechnet wird. Vier Stunden sind der Vorschlag, nicht das Gesetz –
  // wer weiß, dass es bei ihm später kommt, stellt es unter Mehr um.
  fenster: 4,
  // Ab wie vielen Mahlzeiten mit einem Auslöser die Auswertung überhaupt
  // etwas dazu sagt. Darunter ist jede Aussage Zufall, und eine App, die aus
  // zwei Fällen eine Regel macht, schadet mehr als sie nützt.
  mindestFaelle: 5,
  // Verbesserungsvorschläge zur App selbst: [{ id, am, text, erledigt }].
  // Bewusst neben den Eintragungen und nicht in ihnen – eine Idee ist kein
  // Tagebucheintrag und hat in keiner Auswertung etwas zu suchen.
  ideen: [],
  eigeneAusloeser: [],   // [{ id: 'x:...', name }]
  zuletztMittel: [],     // zuletzt eingetragene Medikamente, als Vorschlag
  // Welche Tagesfragen erscheinen. Im Auslieferungszustand alle – wer eine
  // davon nicht beantworten will, schaltet sie unter Mehr ab.
  tagesfragen: ['stimmung', 'stress', 'schlaf', 'bewegung', 'blutung', 'sex', 'nachtwach'],
  /*
   * Seit wann die Beschwerden bestehen, als 'YYYY-MM'.
   *
   * Die eine Angabe, die aus dem Tagebuch grundsätzlich nicht hervorgeht: Es
   * beginnt an dem Tag, an dem jemand anfängt zu schreiben, und das ist fast
   * nie der Tag, an dem es angefangen hat. Die Rom-Kriterien verlangen aber
   * genau das – Beginn mindestens ein halbes Jahr her, Beschwerden in den
   * letzten drei Monaten. Ohne diese Zeile könnte js/kriterien.js die
   * Zeitbedingung nur behaupten.
   */
  beschwerdenSeit: null,
  /*
   * Der laufende oder letzte Auslassversuch – siehe js/versuch.js:
   * { id, art: 'ausloeser'|'klasse', ziel, start, tage, provokation, beendet }
   *
   * Einer zur Zeit. Zwei gleichzeitig wären zwei Versuche, die sich gegenseitig
   * die Aussage nehmen: Wird es besser, weiß hinterher niemand, wovon.
   */
  versuch: null,
  /*
   * Abgeschlossene Auslassversuche, der jüngste zuerst.
   *
   * Sie werden behalten statt weggeräumt, und zwar aus zwei Gründen: Ein
   * geprüfter Verdacht soll nicht in einem halben Jahr noch einmal geprüft
   * werden – zwei Wochen ohne Milch macht niemand gern zweimal –, und ein
   * Versuch, der *dagegen* sprach, ist für den Termin genauso ein Beleg wie
   * einer, der dafür sprach.
   *
   * Gespeichert wird nur der Versuch selbst, nicht sein Ergebnis: Das rechnet
   * js/versuch.js jedes Mal neu aus den Eintragungen. Sonst stünden hier
   * Zahlen, die zu den Eintragungen nicht mehr passen, sobald jemand einen
   * Eintrag korrigiert.
   */
  versuche: [],
  /*
   * Der laufende oder letzte Provokationstest – siehe js/provokation.js:
   * { id, art, ziel, was, nuechtern, fenster, laeufe: [{ am, um, leer }], beendet }
   *
   * Auch hier nur einer zur Zeit, und aus einem schärferen Grund als beim
   * Auslassversuch: Zwei Provokationen parallel hieße, an denselben Morgen zwei
   * Sachen nüchtern zu nehmen. Dann misst man beide zusammen und keine davon.
   *
   * Gespeichert wird, was sich nicht ausrechnen lässt – was, wie viel, wann
   * genommen. Ob ein Durchgang sauber war und was danach kam, liest
   * js/provokation.js jedes Mal neu aus den Eintragungen.
   */
  provokation: null,
  /*
   * Abgeschlossene Provokationstests, der jüngste zuerst. Aus demselben Grund
   * aufgehoben wie die Auslassversuche: Ein Test, der *nichts* fand, erspart
   * den nächsten – und ist für den Termin genauso ein Beleg wie einer, der
   * etwas fand.
   */
  provokationen: [],
  /*
   * Der Stufenplan – siehe js/stufenplan.js:
   * { id, start, karenzTage, gruppen: [id], stufen: [{ gruppe, start }], beendet }
   *
   * Das Größte, was diese App verlangt: Wochen. Gespeichert wird trotzdem nur,
   * was sich nicht ausrechnen lässt – ab wann, wie lange, welche Gruppen, und
   * an welchem Tag welche Gruppe geprüft wurde. Ob es geholfen hat, rechnet
   * js/stufenplan.js jedes Mal neu aus den Eintragungen.
   */
  stufenplan: null,
  /*
   * Abgeschlossene Pläne. Einer reicht im Leben meistens – aber wer nach einem
   * halben Jahr eine Gruppe noch einmal prüft, soll nachsehen können, was
   * damals herauskam.
   */
  stufenplaene: [],
  /*
   * Arzttermine als ISO-Daten, der jüngste zuerst.
   *
   * Der Bericht lief bisher über 30 oder 90 Tage – Fenster, die mit nichts zu
   * tun haben. Gefragt wird in der Sprechstunde aber nach der Zeit *seit dem
   * letzten Mal*, und genau die kennt nur sie.
   */
  termine: [],
  /*
   * Gewichtsmessungen: [{ am, kg }], die jüngste zuerst.
   *
   * Bewusst **neben** den Eintragungen und nicht in ihnen. Der Grund ist eine
   * Zeile weiter oben in js/auswertung.js: Dort gilt ein Tag als notiert,
   * sobald an ihm irgendein Eintrag steht. Ein Tag, an dem sich nur jemand
   * gewogen hat, wäre damit ein notierter Tag mit Beschwerdewert 0 – also ein
   * beschwerdefreier Tag. Er würde in jede Quote, in den Trend und in die
   * Kriterien eingehen, und zwar als Verbesserung.
   *
   * Das ist genau der Fehler, den diese App an allen anderen Stellen
   * ausdrücklich vermeidet: Ein Tag ohne Beschwerden ist etwas anderes als ein
   * Tag ohne Eintragung. Wer sich wiegt, hat über seinen Bauch nichts gesagt.
   */
  gewicht: [],
  /*
   * Ob gerade absichtlich abgenommen wird.
   *
   * Ohne diese Angabe wäre die Gewichtsüberwachung ein Fehlalarm-Automat: Ein
   * Verlust von fünf Prozent ist ein Warnzeichen, wenn er *ungewollt* ist –
   * und ein Erfolg, wenn jemand dafür gearbeitet hat. Den Unterschied kann
   * keine Rechnung sehen, nur der Mensch.
   */
  abnehmenGewollt: false,
  // Wie viele Ideen beim letzten Weitergeben in der Liste standen. Daran
  // erkennt die App, welche noch niemand gesehen hat – siehe ideenOffen().
  ideenGeschickt: 0,
  // Wurde der Hinweis auf die Unterleibsfragen schon einmal weggetippt? Dann
  // kommt er nicht wieder – ein Vorschlag, den man mehrfach abwehren muss,
  // ist keiner.
  unterleibGefragt: false,
  atemUebung: '478',     // zuletzt gewählte Atemübung
  atemRunden: null,      // eigene Rundenzahl; null = Vorschlag der Übung
  ton: true,             // Ton bei der Atemübung – der einzige der App
  theme: 'rosa',
  begruesst: false,
  tab: 'heute',
  lastBackup: null,      // { on, anzahl } – wann zuletzt gesichert wurde
  // Bis wann nicht mehr an die Sicherung erinnert wird (ISO-Datum). „Später"
  // heißt sieben Tage, nicht „nie" – wer einmal wegtippt, hat das Tagebuch
  // deshalb nicht aufgegeben.
  sicherungSpaeter: null,
};

const klon = (o) => JSON.parse(JSON.stringify(o));

let zustand = laden();
const hoerer = new Set();

function laden() {
  try {
    const roh = localStorage.getItem(KEY);
    if (!roh) return klon(VORGABE);
    const gelesen = JSON.parse(roh);
    const s = Object.assign(klon(VORGABE), gelesen);
    // Wer schon etwas eingetragen hat, hat die Begrüßung hinter sich – auch
    // wenn der Stand aus einer Fassung stammt, die den Schlüssel noch nicht
    // kannte. Sonst stünde die Einführung eines Tages wieder vor dem Tagebuch.
    if (!('begruesst' in gelesen) && s.eintraege.length) s.begruesst = true;
    s.eintraege = sortiert((Array.isArray(s.eintraege) ? s.eintraege : []).map(mahlzeitFrisch));
    return s;
  } catch {
    return klon(VORGABE);
  }
}

/**
 * Eine Mahlzeit auf den heutigen Stand bringen.
 *
 * Früher standen die Zutaten als bloße Liste von IDs unter `tags`. Seit sie
 * eine Rolle tragen – Hauptzutat, Beilage, Topping … –, stehen sie unter
 * `zutaten`. Umgerechnet wird beim Laden und beim Einlesen einer Sicherung,
 * also an genau den zwei Stellen, an denen fremde Daten hereinkommen.
 *
 * Alte Eintragungen bekommen `haupt`. Das ist die einzig ehrliche Annahme:
 * Wer damals „Zwiebel" angekreuzt hat, hat nicht gesagt, es sei nur ein Hauch
 * gewesen – und die harmlosere Rolle nachträglich zu unterstellen, würde alte
 * Auffälligkeiten stillschweigend kleinrechnen.
 *
 * `tags` fällt dabei weg, damit es die Angabe nur an einer Stelle gibt. Was an
 * dieser Umrechnung vorbeikommt, fängt zutatenVon() in js/auswertung.js ab.
 */
function mahlzeitFrisch(e) {
  if (!e || e.art !== 'essen' || Array.isArray(e.zutaten)) return e;
  const { tags, ...rest } = e;
  return {
    ...rest,
    zutaten: (Array.isArray(tags) ? tags : [])
      .filter((id) => typeof id === 'string')
      .map((id) => ({ id, rolle: 'haupt' })),
  };
}

/** Nach Tag und Uhrzeit. Die Liste wird nirgends anders sortiert. */
function sortiert(liste) {
  return [...liste].sort((a, b) => (a.am === b.am
    ? minutenAmTag(a.um) - minutenAmTag(b.um)
    : (a.am < b.am ? -1 : 1)));
}

/* ---------- Schreiben ---------- */

let schreibUhr = null;

/**
 * Warum nicht gespeichert werden kann – und das sind zwei verschiedene Lagen.
 *
 *   'gesperrt'  Der Browser lässt gar nicht erst speichern: privates Fenster,
 *               eingebettete Ansicht, blockierte Website-Daten. Nichts bleibt,
 *               aber es war auch nie etwas da.
 *
 *   'voll'      Es ging bisher, und jetzt nicht mehr. Das ist die gefährliche
 *               Lage: Monate an Eintragungen liegen gespeichert, der heutige
 *               Eintrag kommt nicht mehr dazu. Hier gehört der Rat zur
 *               Sicherung hin, sofort und deutlich.
 */
function warumNicht(fehler) {
  // Chrome/Safari melden QuotaExceededError, Firefox NS_ERROR_DOM_QUOTA_REACHED,
  // ältere Fassungen nur den Code 22. Alles andere ist eine Sperre.
  const name = fehler && (fehler.name || '');
  const code = fehler && fehler.code;
  return (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || code === 22 || code === 1014) ? 'voll' : 'gesperrt';
}

let speicherGeht = true;
let speicherFehler = null;

try {
  localStorage.setItem(`${KEY}.probe`, '1');
  localStorage.removeItem(`${KEY}.probe`);
} catch {
  // Beim Start ist auch ein voller Speicher eine Sperre: Es gibt noch nichts
  // zu retten, und der Rat wäre derselbe wie bei jeder anderen Ursache.
  speicherGeht = false;
  speicherFehler = 'gesperrt';
}

/** false, wenn der Browser nichts speichern kann – Eintragungen sind flüchtig. */
export function kannSpeichern() { return speicherGeht; }

/** 'gesperrt', 'voll' oder null – siehe warumNicht(). */
export function speicherGrund() { return speicherGeht ? null : speicherFehler; }

function schreibe() {
  schreibUhr = null;
  const vorher = speicherGeht;
  try {
    localStorage.setItem(KEY, JSON.stringify(zustand));
    speicherGeht = true;
    speicherFehler = null;
  } catch (e) {
    speicherGeht = false;
    speicherFehler = warumNicht(e);
  }
  // Beim Wechsel melden, in *beide* Richtungen: Der Schreibvorgang läuft nach
  // dem Zeichnen, die Warnung stünde sonst einen Eintrag zu spät da – und
  // bliebe nach dem Aufräumen kleben, bis zufällig etwas anderes neu zeichnet.
  if (speicherGeht !== vorher) melde();
}

function merke() {
  clearTimeout(schreibUhr);
  schreibUhr = setTimeout(schreibe, 120);
}

/**
 * Ausstehenden Schreibvorgang sofort ausführen. Nötig, bevor die App in den
 * Hintergrund geht: mobile Browser verwerfen die Seite dort ohne Vorwarnung,
 * und der letzte Eintrag wäre verloren.
 */
export function sofortSchreiben() {
  if (schreibUhr === null) return;
  clearTimeout(schreibUhr);
  schreibe();
}

function melde() {
  hoerer.forEach((fn) => fn(zustand));
}

export function horche(fn) {
  hoerer.add(fn);
  return () => hoerer.delete(fn);
}

export function zustandLesen() { return zustand; }

/* ---------- Eintragungen ---------- */

/**
 * Eine Kennung, die auch dann eindeutig bleibt, wenn zwei Einträge in
 * derselben Millisekunde entstehen – beim Einlesen einer Sicherung etwa, oder
 * wenn jemand schnell hintereinander tippt.
 */
let zaehler = 0;
function neueId() {
  zaehler += 1;
  return `e${Date.now().toString(36)}${zaehler.toString(36)}`;
}

/**
 * Einen Eintrag anlegen. Datum und Uhrzeit sind optional und stehen sonst auf
 * jetzt – der Normalfall ist „ich trage gerade ein, was gerade war".
 */
export function eintragen(eintrag) {
  const neu = {
    id: neueId(),
    am: eintrag.am || heuteISO(),
    um: eintrag.um || jetztUhr(),
    ...eintrag,
  };
  zustand.eintraege = sortiert([...zustand.eintraege, neu]);
  merke();
  melde();
  return neu.id;
}

export function eintragAendern(id, patch) {
  const i = zustand.eintraege.findIndex((e) => e.id === id);
  if (i < 0) return;
  zustand.eintraege[i] = { ...zustand.eintraege[i], ...patch, id };
  zustand.eintraege = sortiert(zustand.eintraege);
  merke();
  melde();
}

export function eintragLoeschen(id) {
  const vorher = zustand.eintraege.length;
  zustand.eintraege = zustand.eintraege.filter((e) => e.id !== id);
  if (zustand.eintraege.length === vorher) return;
  merke();
  melde();
}

export function eintragVon(id) {
  return zustand.eintraege.find((e) => e.id === id) || null;
}

/** Alle Eintragungen eines Tages, in zeitlicher Reihenfolge. */
export function eintraegeAm(iso) {
  return zustand.eintraege.filter((e) => e.am === iso);
}

/** Der Tag der jüngsten Eintragung – oder heute, wenn es keine gibt. */
export function letzterTag() {
  const e = zustand.eintraege;
  return e.length ? e[e.length - 1].am : heuteISO();
}

/**
 * Wann zuletzt etwas eingetragen wurde, als Zeitpunkt. Die Tagesansicht
 * braucht das, um „seit 6 Stunden nichts" sagen zu können.
 */
export function letzterZeitpunkt() {
  const e = zustand.eintraege;
  return e.length ? zeitpunkt(e[e.length - 1].am, e[e.length - 1].um) : null;
}

/* ---------- Tagesangaben ---------- */

export function tagLesen(iso) {
  return zustand.tage[iso] || {};
}

export function tagSetzen(iso, patch) {
  const neu = { ...tagLesen(iso), ...patch };
  // Einen leeren Tag gar nicht erst anlegen: Sonst wächst `tage` mit jedem
  // angetippten und wieder abgewählten Regler, und die Sicherung füllt sich
  // mit Zeilen, die nichts aussagen. Geprüft wird über alle Felder, nicht über
  // eine feste Liste – sonst hinterlässt jede neue Tagesfrage leere Tage.
  const leer = Object.values(neu).every((v) => v === null || v === undefined
    || v === '' || (typeof v === 'string' && !v.trim()));
  if (leer) delete zustand.tage[iso];
  else zustand.tage[iso] = neu;
  merke();
  melde();
}

/* ---------- Einstellungen ---------- */

export function einstellen(schluessel, wert) {
  if (!(schluessel in VORGABE)) return;
  zustand[schluessel] = wert;
  merke();
  melde();
}

/** Ein eigener Auslöser. Doppelte Namen führen auf denselben Eintrag zurück. */
export function ausloeserAnlegen(id, name) {
  if (zustand.eigeneAusloeser.some((a) => a.id === id)) return;
  zustand.eigeneAusloeser = [...zustand.eigeneAusloeser, { id, name }];
  merke();
  melde();
}

/**
 * Einen eigenen Auslöser wieder loswerden.
 *
 * Er verschwindet aus der Auswahl, aber nicht aus den Eintragungen, in denen
 * er steht. Das ist Absicht: Ein Tagebuch rückwirkend zu verändern, weil eine
 * Auswahlliste sich geändert hat, wäre das Gegenteil von dem, wofür man es
 * führt.
 */
export function ausloeserLoeschen(id) {
  zustand.eigeneAusloeser = zustand.eigeneAusloeser.filter((a) => a.id !== id);
  merke();
  melde();
}

/** Ein benutztes Mittel als Vorschlag merken – die fünf jüngsten. */
export function mittelMerken(name) {
  const sauber = String(name).trim();
  if (!sauber) return;
  zustand.zuletztMittel = [sauber, ...zustand.zuletztMittel.filter((m) => m !== sauber)].slice(0, 5);
  merke();
}

/* ---------- Auslassversuch ---------- */

/**
 * Einen Auslassversuch beginnen.
 *
 * Nur einer zur Zeit, und ein laufender wird nicht stillschweigend ersetzt –
 * wer einen neuen anfängt, verwirft den alten sichtbar (die Anzeige fragt
 * vorher). Alles Weitere rechnet js/versuch.js aus den Daten; hier steht nur,
 * was sich nicht ausrechnen lässt: was, ab wann, wie lange.
 */
export function versuchStarten(art, ziel, tage = 14) {
  zustand.versuch = {
    id: neueId(),
    art,
    ziel,
    start: heuteISO(),
    tage: Math.max(7, Math.min(28, Number(tage) || 14)),
    provokation: null,   // ISO-Tag der bewussten Wiedereinführung
    beendet: null,       // ISO-Tag des Abbruchs, falls abgebrochen
  };
  merke();
  melde();
  return zustand.versuch.id;
}

/** Der Tag der Provokation – ab hier wird wieder gegessen und weiter gezählt. */
export function versuchProvozieren(iso) {
  if (!zustand.versuch) return;
  zustand.versuch = { ...zustand.versuch, provokation: iso || heuteISO() };
  merke();
  melde();
}

/**
 * Abbrechen. Der Versuch bleibt stehen statt zu verschwinden: Ein abgebrochener
 * Versuch ist selbst eine Auskunft („zwei Tage durchgehalten"), und ihn zu
 * löschen hieße, das Tagebuch schönzumachen.
 */
export function versuchBeenden() {
  if (!zustand.versuch) return;
  zustand.versuch = { ...zustand.versuch, beendet: heuteISO() };
  merke();
  melde();
}

/**
 * Den laufenden Versuch abhaken und in die Historie legen.
 *
 * Früher hieß dieser Knopf „Wegräumen" und warf ihn weg. Das war die falsche
 * Bewegung: Ein fertiger Versuch ist das Wertvollste, was dieses Tagebuch
 * hervorbringt – zwei Wochen Verzicht plus eine bewusste Wiedereinführung –,
 * und er ist genau dann weg, wenn man ihn ein halbes Jahr später bräuchte.
 */
export function versuchAblegen() {
  if (!zustand.versuch) return;
  const abgelegt = { ...zustand.versuch, abgelegt: heuteISO() };
  zustand.versuche = [abgelegt, ...zustand.versuche].slice(0, 40);
  zustand.versuch = null;
  merke();
  melde();
}

/** Einen abgelegten Versuch endgültig löschen – die eine Stelle, die vergisst. */
export function versuchLoeschen(id) {
  const vorher = zustand.versuche.length;
  zustand.versuche = zustand.versuche.filter((v) => v.id !== id);
  if (zustand.versuche.length === vorher) return;
  merke();
  melde();
}

/* ---------- Stufenplan ---------- */

/**
 * Einen Stufenplan beginnen.
 *
 * `gruppen` ist die Auswahl und ihre Reihenfolge – beides trifft der Mensch
 * und nicht die App. Wer viel Brot isst, prüft Weizen zuerst, weil diese
 * Antwort seinen Alltag am stärksten ändert; wer selten auswärts isst, kann
 * die Zwiebel hinten anstellen.
 */
export function planStarten(gruppen, karenzTage = 21) {
  zustand.stufenplan = {
    id: neueId(),
    start: heuteISO(),
    karenzTage: Math.max(14, Math.min(42, Number(karenzTage) || 21)),
    gruppen: (gruppen || []).filter((g) => typeof g === 'string').slice(0, 10),
    stufen: [],
    beendet: null,
  };
  merke();
  melde();
  return zustand.stufenplan.id;
}

/** Eine Gruppe ab heute prüfen – drei Tage mit steigender Menge. */
export function stufeStarten(gruppe) {
  const p = zustand.stufenplan;
  if (!p || p.beendet) return;
  if (p.stufen.some((st) => st.gruppe === gruppe)) return;
  zustand.stufenplan = { ...p, stufen: [...p.stufen, { gruppe, start: heuteISO() }] };
  merke();
  melde();
}

/**
 * Eine Stufe verwerfen.
 *
 * Für den Fall, der im wirklichen Leben garantiert eintritt: Mitten in der
 * Weizenstufe kommt ein Magen-Darm-Infekt, eine Geburtstagsfeier oder eine
 * schlaflose Nacht. Diese drei Tage messen dann nicht die Gruppe. Sie
 * stehenzulassen wäre schlimmer als sie zu wiederholen – die Gruppe fiele zu
 * Unrecht durch, und jemand striche sie für Jahre vom Speiseplan.
 */
export function stufeVerwerfen(gruppe) {
  const p = zustand.stufenplan;
  if (!p) return;
  const stufen = p.stufen.filter((st) => st.gruppe !== gruppe);
  if (stufen.length === p.stufen.length) return;
  zustand.stufenplan = { ...p, stufen };
  merke();
  melde();
}

/** Abbrechen. Bleibt stehen – auch ein abgebrochener Plan ist eine Auskunft. */
export function planBeenden() {
  if (!zustand.stufenplan) return;
  zustand.stufenplan = { ...zustand.stufenplan, beendet: heuteISO() };
  merke();
  melde();
}

export function planAblegen() {
  if (!zustand.stufenplan) return;
  const abgelegt = { ...zustand.stufenplan, abgelegt: heuteISO() };
  zustand.stufenplaene = [abgelegt, ...zustand.stufenplaene].slice(0, 10);
  zustand.stufenplan = null;
  merke();
  melde();
}

export function planLoeschen(id) {
  const vorher = zustand.stufenplaene.length;
  zustand.stufenplaene = zustand.stufenplaene.filter((p) => p.id !== id);
  if (zustand.stufenplaene.length === vorher) return;
  merke();
  melde();
}

/* ---------- Provokationstest ---------- */

/**
 * Einen Provokationstest anlegen.
 *
 * `was` ist Freitext und mit Absicht keine Auswahlliste: Die Menge ist der
 * halbe Test, und „250 ml Milch" oder „ein Apfel" sagt mehr, als eine App
 * vorgeben könnte. Sie muss nur jedes Mal dieselbe sein – deshalb steht sie
 * einmal hier und nicht bei jedem Durchgang neu.
 */
export function provokationStarten(art, ziel, was, opt = {}) {
  zustand.provokation = {
    id: neueId(),
    art,
    ziel,
    was: String(was || '').slice(0, 120),
    // Zwei bis acht Stunden sind der Rahmen, in dem das noch alltagstauglich
    // ist. Zwölf Stunden nüchtern wären klinisch sauberer und macht niemand.
    nuechtern: Math.max(2, Math.min(8, Number(opt.nuechtern) || 4)),
    fenster: Math.max(2, Math.min(8, Number(opt.fenster) || 4)),
    laeufe: [],
    beendet: null,
  };
  merke();
  melde();
  return zustand.provokation.id;
}

/**
 * Einen Durchgang eintragen – mit der Sache oder als Leerdurchgang.
 *
 * Der Zeitpunkt wird festgehalten und nicht bloß der Tag: Das Fenster hängt an
 * der Uhrzeit, und „irgendwann am Dienstag" ist kein Protokoll.
 */
export function provokationLauf(leer = false, iso = null, uhr = null) {
  if (!zustand.provokation || zustand.provokation.beendet) return;
  const lauf = { am: iso || heuteISO(), um: uhr || jetztUhr(), leer: !!leer };
  zustand.provokation = {
    ...zustand.provokation,
    laeufe: [...zustand.provokation.laeufe, lauf],
  };
  merke();
  melde();
}

/** Einen Durchgang zurücknehmen – für den Fehlgriff, nicht für das Ergebnis. */
export function provokationLaufWeg(am, um) {
  if (!zustand.provokation) return;
  const laeufe = zustand.provokation.laeufe.filter((l) => !(l.am === am && l.um === um));
  if (laeufe.length === zustand.provokation.laeufe.length) return;
  zustand.provokation = { ...zustand.provokation, laeufe };
  merke();
  melde();
}

/** Abbrechen. Bleibt stehen – ein Test, den man nicht durchhält, ist auch eine Auskunft. */
export function provokationBeenden() {
  if (!zustand.provokation) return;
  zustand.provokation = { ...zustand.provokation, beendet: heuteISO() };
  merke();
  melde();
}

/** Abhaken und in die Historie legen. */
export function provokationAblegen() {
  if (!zustand.provokation) return;
  const abgelegt = { ...zustand.provokation, abgelegt: heuteISO() };
  zustand.provokationen = [abgelegt, ...zustand.provokationen].slice(0, 40);
  zustand.provokation = null;
  merke();
  melde();
}

export function provokationLoeschen(id) {
  const vorher = zustand.provokationen.length;
  zustand.provokationen = zustand.provokationen.filter((p) => p.id !== id);
  if (zustand.provokationen.length === vorher) return;
  merke();
  melde();
}

/* ---------- Gewicht ---------- */

/**
 * Ein Gewicht notieren – ein Wert je Tag, der neuere ersetzt den alten.
 *
 * Zweimal am Tag zu wiegen ergibt zwei Zahlen, die sich um ein Kilo
 * unterscheiden können, ohne dass sich am Menschen etwas geändert hätte.
 * Gespeichert wird deshalb der letzte Wert des Tages und nicht beide.
 */
export function gewichtNotieren(iso, kg) {
  const wert = Number(kg);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return;
  // Unter 20 und über 400 Kilo ist ein Tippfehler, keine Messung.
  if (!Number.isFinite(wert) || wert < 20 || wert > 400) return;
  zustand.gewicht = [{ am: iso, kg: Math.round(wert * 10) / 10 }]
    .concat(zustand.gewicht.filter((g) => g.am !== iso))
    .sort((a, b) => (a.am < b.am ? 1 : -1));
  merke();
  melde();
}

export function gewichtLoeschen(iso) {
  const vorher = zustand.gewicht.length;
  zustand.gewicht = zustand.gewicht.filter((g) => g.am !== iso);
  if (zustand.gewicht.length === vorher) return;
  merke();
  melde();
}

/* ---------- Arzttermine ---------- */

/**
 * Einen Termin eintragen. Doppelte Daten fallen weg, sortiert wird absteigend –
 * der jüngste steht vorn, weil ihn der Bericht braucht.
 */
export function terminAnlegen(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return;
  if (zustand.termine.includes(iso)) return;
  zustand.termine = [...zustand.termine, iso].sort().reverse();
  merke();
  melde();
}

export function terminLoeschen(iso) {
  const vorher = zustand.termine.length;
  zustand.termine = zustand.termine.filter((t) => t !== iso);
  if (zustand.termine.length === vorher) return;
  merke();
  melde();
}

/**
 * Der jüngste Termin, der nicht in der Zukunft liegt.
 *
 * Ein Termin nächste Woche ist der *nächste*, nicht der letzte – der Bericht
 * müsste sonst über einen Zeitraum von minus drei Tagen berichten.
 */
export function letzterTermin(bis) {
  return zustand.termine.find((t) => t <= bis) || null;
}

/* ---------- Ideen weitergeben ---------- */

/**
 * Wie viele Ideen noch niemand gesehen hat.
 *
 * Die App hat keinen Server, also kommen ihre Vorschläge bei niemandem an,
 * solange sie sie nicht selbst weitergibt. Bisher stand der Knopf dafür unten
 * auf dem Ideenreiter und wurde übersehen – eine Idee, die niemand liest, ist
 * dasselbe wie keine.
 *
 * Gezählt wird schlicht die Länge der Liste beim letzten Weitergeben. Das ist
 * gröber als eine Markierung je Idee und dafür ehrlich: Wer zwischendurch
 * etwas löscht, bekommt eher zu wenig „neu" angezeigt als zu viel.
 */
export function ideenOffen() {
  return Math.max(0, zustand.ideen.length - (zustand.ideenGeschickt || 0));
}

export function ideenGeschicktMerken() {
  zustand.ideenGeschickt = zustand.ideen.length;
  merke();
  melde();
}

/* ---------- Ideen zur App ---------- */

export function ideeAnlegen(text) {
  const sauber = String(text || '').trim();
  if (!sauber) return null;
  const neu = { id: neueId(), am: heuteISO(), text: sauber, erledigt: false };
  zustand.ideen = [neu, ...zustand.ideen];
  merke();
  melde();
  return neu.id;
}

/** Abgehakt oder wieder offen. Gelöscht wird eine Idee dadurch nicht. */
export function ideeUmschalten(id) {
  const i = zustand.ideen.findIndex((x) => x.id === id);
  if (i < 0) return;
  zustand.ideen[i] = { ...zustand.ideen[i], erledigt: !zustand.ideen[i].erledigt };
  merke();
  melde();
}

export function ideeLoeschen(id) {
  const vorher = zustand.ideen.length;
  zustand.ideen = zustand.ideen.filter((x) => x.id !== id);
  if (zustand.ideen.length === vorher) return;
  merke();
  melde();
}

/* ---------- Sicherung ---------- */

export function alsJSON() {
  return JSON.stringify(zustand, null, 2);
}

/**
 * Ist eine Sicherung fällig?
 *
 * Es gibt schon einen Hinweis unter „Mehr", der sagt, wann zuletzt gesichert
 * wurde. Nur liest den niemand – Hinweise an Stellen, die man selten aufmacht,
 * sind Dekoration. Deshalb fragt die App von sich aus, und zwar nach der
 * Anzahl *oder* nach der Zeit: Wer zwei Wochen lang nichts einträgt, hat
 * genauso viel zu verlieren wie jemand mit dreißig neuen Einträgen.
 *
 * Zurück kommt `null` oder `{ grund, seit, neue }` – die Anzeige entscheidet,
 * was sie daraus macht.
 */
export function sicherungFaellig() {
  const heute = heuteISO();
  if (zustand.sicherungSpaeter && zustand.sicherungSpaeter > heute) return null;
  if (!zustand.eintraege.length) return null;

  const b = zustand.lastBackup;
  if (!b) {
    // Noch nie gesichert: erst fragen, wenn wirklich etwas zu verlieren ist.
    // Nach dem dritten Eintrag zu betteln, treibt Leute aus der App.
    return zustand.eintraege.length >= 15
      ? { grund: 'nie', neue: zustand.eintraege.length, seit: null }
      : null;
  }
  const neue = zustand.eintraege.length - (b.anzahl || 0);
  const seit = tageSeit(b.on, heute);
  if (neue >= 30) return { grund: 'anzahl', neue, seit };
  if (seit >= 14 && neue > 0) return { grund: 'zeit', neue, seit };
  return null;
}

/** Ganze Tage zwischen zwei ISO-Daten. Klein gehalten, damit js/store.js
 *  nicht wegen einer Subtraktion an der Datumsschicht hängt. */
function tageSeit(vonISO, bisISO) {
  const t = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return Math.round((t(bisISO) - t(vonISO)) / 86400000);
}

/** „Später": sieben Tage Ruhe, dann wird wieder gefragt. */
export function sicherungVerschieben() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const p = (x) => String(x).padStart(2, '0');
  zustand.sicherungSpaeter = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  merke();
  melde();
}

export function sicherungNotiert() {
  zustand.lastBackup = { on: heuteISO(), anzahl: zustand.eintraege.length };
  // Ein aufgeschobenes „später" ist mit der Sicherung erledigt.
  zustand.sicherungSpaeter = null;
  merke();
  melde();
}

/**
 * Sicherung einlesen.
 *
 * Geprüft wird nicht aus Misstrauen, sondern weil eine halb passende Datei
 * sonst still einen Zustand hinterlässt, in dem die App merkwürdig wird –
 * `eintraege` als Zeichenkette etwa. Alles Unbekannte fällt weg, alles
 * Bekannte wird auf seinen Typ gebracht, und jeder einzelne Eintrag muss
 * mindestens Datum und Art haben, sonst fliegt er raus.
 */
export function ausJSON(text) {
  const gelesen = JSON.parse(text);
  if (!gelesen || typeof gelesen !== 'object' || Array.isArray(gelesen)
      || !Array.isArray(gelesen.eintraege)) {
    throw new Error('Unerwartetes Format – die Liste "eintraege" fehlt.');
  }
  const frisch = klon(VORGABE);
  Object.keys(VORGABE).forEach((k) => {
    const v = gelesen[k];
    if (v === undefined || v === null) return;
    const soll = VORGABE[k];
    if (Array.isArray(soll) !== Array.isArray(v)) return;
    if (soll !== null && typeof soll !== typeof v) return;
    frisch[k] = v;
  });
  frisch.eintraege = sortiert(gelesen.eintraege.filter((e) => (
    e && typeof e === 'object' && typeof e.am === 'string' && typeof e.art === 'string'
  )).map((e) => mahlzeitFrisch({ ...e, id: e.id || neueId() })));
  frisch.ideen = frisch.ideen.filter((x) => x && typeof x === 'object' && typeof x.text === 'string')
    .map((x) => ({ ...x, id: x.id || neueId(), erledigt: !!x.erledigt }));
  if (!Number.isFinite(frisch.fenster) || frisch.fenster <= 0) frisch.fenster = VORGABE.fenster;
  // Ein halb gelesener Versuch würde die Tagesansicht mit „Tag NaN von
  // undefined" begrüßen. Was nicht vollständig ist, gilt als keiner.
  const v = frisch.versuch;
  if (!v || typeof v !== 'object' || typeof v.start !== 'string'
      || typeof v.ziel !== 'string' || !Number.isFinite(Number(v.tage))) {
    frisch.versuch = null;
  }
  /*
   * Dasselbe für den Provokationstest, mit einer Zeile mehr: Die Durchgänge
   * tragen das Fenster, in dem gerechnet wird. Ein Eintrag ohne Uhrzeit ließe
   * das Fenster auf Mittag rutschen und rechnete dann Beschwerden mit, die
   * Stunden nach dem Durchgang kamen.
   */
  const pv = frisch.provokation;
  if (!pv || typeof pv !== 'object' || typeof pv.ziel !== 'string'
      || !Array.isArray(pv.laeufe)) {
    frisch.provokation = null;
  } else {
    frisch.provokation = {
      ...pv,
      laeufe: pv.laeufe.filter((l) => l && typeof l.am === 'string' && typeof l.um === 'string'),
    };
  }
  /*
   * Und für den Stufenplan. Ohne `start` und `karenzTage` gäbe es keine
   * Zeitrechnung, ohne `stufen` keine Wiedereinführung – ein halb gelesener
   * Plan würde den Tagesreiter mit „Tag NaN von undefined" begrüßen.
   */
  const sp = frisch.stufenplan;
  if (!sp || typeof sp !== 'object' || typeof sp.start !== 'string'
      || !Number.isFinite(Number(sp.karenzTage)) || !Array.isArray(sp.gruppen)) {
    frisch.stufenplan = null;
  } else {
    frisch.stufenplan = {
      ...sp,
      stufen: (Array.isArray(sp.stufen) ? sp.stufen : [])
        .filter((st) => st && typeof st.gruppe === 'string' && typeof st.start === 'string'),
    };
  }
  zustand = frisch;
  merke();
  melde();
  return frisch.eintraege.length;
}

export function allesLoeschen() {
  zustand = klon(VORGABE);
  // Die Begrüßung nicht noch einmal: Wer gerade bewusst alles gelöscht hat,
  // weiß, was die App ist.
  zustand.begruesst = true;
  try { localStorage.removeItem(KEY); } catch { /* dann eben nicht */ }
  merke();
  melde();
}
