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
import {
  KNOPF_TAGESZEIT, heuteISO, istISO, istUhr, jetztUhr, minutenAmTag, zeitpunkt,
} from './datum.js';
import { KUECHEN_ARTEN, JE_LISTE, MAX_NAME } from './kueche.js';
import { BEFUND_VON, JE_BEFUNDE } from './befunde.js';
import { WASSER_HOECHSTENS, glasMl, wasserVon } from './wasser.js';

const KEY = 'bauchbuch.state.v1';

const VORGABE = {
  // Alle Eintragungen in einer Liste, nach Zeitpunkt sortiert gehalten.
  // Ein Eintrag ist immer { id, am, um, art } plus die Felder seiner Art:
  //   essen       { was, zutaten: [{ id, rolle }], portion: 'klein'|'normal'|'gross' }
  //   beschwerde  { staerke: 0..10, arten: [beschwerdeId], notiz, stuhlbezug }
  //   stuhl       { form: 1..7, dringend, unvollstaendig, warnzeichen: [id] }
  //   medikament  { mittel, dosis, zuKopf, form, essen, essenGesetzt }
  //   kopf        { staerke: 1..10, kopfArten: [id], dauer, verlauf, mittelWirkung }
  //   notiz       { text }
  //   aktivitaet  { aktivitaeten: [id], intensitaet: 'leicht'|'mittel'|'hart'|null, notiz }
  // Eine Aktivität ist ein Eintrag mit Uhrzeit, aber über den Körper sagt sie
  // nichts – ein Tag, an dem nur sie steht, gilt nirgends als notiert (siehe
  // js/aktivitaet.js). Ältere Stände haben keine.
  // Eine Mahlzeit trägt seit November 2026 optional `auswaerts: true`.
  // `zuKopf` (optional) ist die Kennung des Kopfschmerzes, mit dem das Mittel
  // über „Dazu genommen?" angelegt wurde. Ältere Einträge haben es nicht.
  // Mit einem Zeitknopf eingetragen, trägt jeder Eintrag außerdem
  //   { ungefaehr: true, tageszeit: 'morgens'|'mittags'|'abends',
  //     bezug: 'vor'|'beim'|'nach'|null, bezugMahlzeit: Kennung der Mahlzeit|null }
  // – `um` ist dann aus dem Knopf gerechnet, nicht erhoben (siehe
  // KNOPF_TAGESZEIT in js/datum.js). Beim Ändern stehen die vier Felder
  // ausdrücklich auf false/null, statt zu fehlen.
  // Ein Medikament trägt seit der Fassung 28 optional:
  //   form          die Freisetzungsform bei Methylphenidat, eine Kennung aus
  //                 FORM_IDS (siehe unten); fehlt = nicht angegeben
  //   essen         'mit'|'vor'|'ohne' – ausdrücklich angegeben, nicht abgeleitet
  //   essenGesetzt  wann `essen` angegeben wurde (ms). Eine Angabe, die erst
  //                 nach dem kam, womit sie verglichen wird, darf dort nicht
  //                 zählen – sonst entschiede das Ergebnis über die Einteilung.
  eintraege: [],
  // Was für einen ganzen Tag gilt, nicht für einen Zeitpunkt. Welche Angaben
  // es gibt, steht in TAGESFRAGEN (js/daten.js):
  // { 'YYYY-MM-DD': { stimmung, stress, schlaf, bewegung, blutung, sex, nachtwach, notiz, wasser } }
  // `wasser` ist die Zahl der Gläser an diesem Tag – keine Tagesfrage, sondern
  // ein Zähler, und ein Tag, an dem nur sie steht, gilt nirgends als notiert
  // (siehe js/wasser.js). Ältere Stände haben das Feld nicht.
  // Seit der Fassung 28 optional dazu – keines davon macht einen Tag zu einem
  // notierten (ZAEHLT_NICHT in js/wasser.js), siehe tageSauber():
  //   adhsPause  'pause'|'geplant'|'vergessen'|'beschwerden' – ohne ADHS-Mittel
  //   verspannt  0..4  Nacken und Schultern
  //   kiefer     0..4  Kiefer und Zähne beim Aufwachen; gilt wie `schlaf` für
  //                    die Nacht davor
  //   gepresst   0|1   tagsüber gepresst oder geknirscht bemerkt
  //   schiene    0|1   Aufbissschiene in der Nacht davor getragen; fehlt heißt
  //                    „nicht angegeben", nie „ohne"
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
  /*
   * Eigene Aktivitäten, die in der Auswahl des Bogens fehlen: [{ id: 'a:...', name }].
   *
   * Wie die eigenen Auslöser nur die Auswahl, nicht das Tagebuch: Wer eine
   * entfernt, nimmt sie aus dem Bogen, und die Einträge damit bleiben.
   */
  eigeneAktivitaeten: [],
  /*
   * Was geht und was nicht – selbst notiert, nicht gerechnet.
   *
   * [{ id, name, art: 'geht'|'nicht', am }]
   *
   * Steht neben den Eintragungen und nicht in ihnen: Das hier ist kein
   * Tagebucheintrag und hat in keiner Auswertung etwas zu suchen. Es ist das
   * Gegenstück dazu – was jemand über sich selbst weiß, ohne dass es
   * jemand nachrechnen muss. Siehe js/kueche.js.
   */
  kueche: [],
  /*
   * Was schon feststeht: [{ id, am }] – siehe js/befunde.js.
   *
   * Keine Rechengrundlage, sondern eine Angabe darüber, was diese App noch
   * behaupten darf. Ohne sie redet sie weiter, als sei alles offen, und
   * schlägt Untersuchungen vor, die längst gelaufen sind.
   */
  befunde: [],
  zuletztMittel: [],     // zuletzt eingetragene Medikamente, als Vorschlag
  /*
   * Die eigenen Mittel, die regelmäßig genommen werden – mit Dosis und, wenn
   * gewählt, der üblichen Zeit: [{ id, mittel, dosis, tageszeit, bezug }].
   *
   * Anders als zuletztMittel (die fünf zuletzt benutzten Namen) legt diese
   * Liste nur der Mensch an, ausdrücklich, im Bogen. Ein Mittel, das einmal
   * wegen Kopfschmerzen genommen wurde, ist noch keins, das man täglich
   * nimmt – und genau dafür ist sie da: die tägliche Tablette mit einem Tipp.
   */
  standardMittel: [],
  // Welche Tagesfragen erscheinen. Im Auslieferungszustand alle – wer eine
  // davon nicht beantworten will, schaltet sie unter Mehr ab.
  tagesfragen: ['stimmung', 'stress', 'schlaf', 'bewegung', 'blutung', 'sex', 'nachtwach'],
  /*
   * Ob auf „Tag" die Reihe zum Wasserzählen steht, und wie groß ein Glas ist.
   *
   * Ein eigener Schalter und kein Eintrag in `tagesfragen`: Gespeicherte
   * Stände tragen ihre eigene Liste der Tagesfragen und überschreiben damit
   * die Vorgabe. Eine neue Frage dort käme bei niemandem an, der die App schon
   * benutzt. Hier dagegen fehlt der Schlüssel in jedem älteren Stand, und die
   * Vorgabe greift.
   *
   * Die Glasgröße in Millilitern dient nur der Umrechnung „≈ 0,75 l";
   * gezählt werden Gläser.
   */
  wasserZeigen: true,
  wasserGlas: 250,
  /*
   * Was Body Check mitdenken soll – zwei Schalter unter „Mehr":
   *
   *   adhsAn      ADHS-Mittel: wann genommen, ob mit oder ohne Essen, und die
   *               Zahlen dazu.
   *   spannungAn  Kiefer, Nacken, Schiene: die Tagesfragen dazu und die
   *               Zahlen, ob Kopfschmerz mit ihnen öfter oder seltener kommt.
   *
   * Dreiwertig, und darauf kommt es an: null heißt „nie entschieden", false
   * „ausgeschaltet" oder „Nein danke". Nur so wird ein Angebot einmal gemacht
   * und nach „Nein danke" nie wieder. Und beim Zusammenführen gewinnt, wer von
   * der Vorgabe abweicht (siehe zusammenfuehren) – ein ausdrückliches Aus also
   * auch gegen eine ältere Sicherung, in der es noch an war.
   *
   * Kein Schalter ändert eine Rechnung. Gerechnet wird immer, sobald Daten da
   * sind; die Schalter entscheiden nur, was gefragt und was gezeigt wird.
   */
  adhsAn: null,
  spannungAn: null,
  /*
   * Ob die einmalige Karte „Was sich an deinen Zahlen geändert hat" gelesen
   * ist. Mit der Fassung 28 zählen manche Tage anders als vorher, und das soll
   * niemand daran merken müssen, dass sich eine Zahl still verschoben hat.
   */
  v28Gesagt: false,
  /*
   * Welche Hinweise zu zwei Mitteln zusammen schon mit „Gelesen" weggetippt
   * sind: ein Schlüssel je Paar, etwa 'W1|<mittel a>|<mittel b>', Namen klein.
   * Nach Paar und nicht nach Hinweis – kommt ein anderes Mittel dazu, ist das
   * ein neuer Hinweis und erscheint wieder.
   */
  wechselGelesen: [],
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
  /*
   * Die alte Buchführung über verschickte Ideen: wie viele beim letzten
   * Weitergeben in der Liste standen.
   *
   * Sie hatte zwei Fehler, die erst zusammen auffielen. Wer eine Idee
   * löschte und eine neue schrieb, hatte wieder dieselbe Länge – die neue
   * galt als verschickt und ging nie hinaus, während der Reiter „alle bei
   * Tobi angekommen" sagte. Und verschickt wurde jedes Mal die ganze Liste;
   * ab 2000 Zeichen lehnte der Kasten sie ab, und zwar für immer.
   *
   * Jetzt trägt jede Idee ihr eigenes `geschickt`. Diese Zahl bleibt nur
   * stehen, damit ein alter Stand beim Laden richtig umgerechnet wird – siehe
   * ideenMitMarke().
   */
  ideenGeschickt: 0,
  /*
   * Woran die letzte Abgabe gescheitert ist – oder null, wenn nichts offen
   * ist. Wird angezeigt, nicht bloß gespeichert; siehe ideenAnsicht().
   */
  ideenFehler: null,
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
  /*
   * Der Umzug in die App auf dem Startbildschirm.
   *
   * Auf dem iPhone hat diese App dort einen eigenen Speicher, getrennt von
   * Safari. Wer in Safari angefangen hat, nimmt seine Einträge über die
   * Zwischenablage mit (siehe js/app.js, „Einträge mitnehmen").
   *
   *   umzug         { am, anzahl, letzter, ids, wasser, mittel, aktiv } – in
   *                 Safari gesetzt, sobald mitgenommen wurde. Danach sagt
   *                 Safari auf jedem Reiter, dass dort nicht mehr eingetragen
   *                 werden sollte, und bietet „Nochmal mitnehmen" an, sobald
   *                 seitdem etwas dazukam – ein Eintrag, ein Glas Wasser, ein
   *                 eigenes Mittel, eine eigene Aktivität. Ältere Vermerke
   *                 haben nur einen Teil davon.
   *   umzugGeholt   { am, anzahl } – in der App gesetzt, nachdem geholt wurde.
   *   startbildschirmWeg  der Hinweis „auf den Startbildschirm" wurde
   *                 weggetippt.
   */
  umzug: null,
  umzugGeholt: null,
  startbildschirmWeg: false,
  /*
   * Bis Oktober 2026 hieß die App „Bauchbuch". Ein Symbol, das damals auf den
   * Home-Bildschirm kam, heißt dort weiter so und zeigt das alte Bild: iOS
   * übernimmt Name und Bild nur beim Hinzufügen. 'offen': Dieser Speicher
   * stammt aus der Zeit davor, und der Hinweis darauf steht noch auf „Tag".
   * 'gesehen': weggetippt. null: angelegt nach der Umbenennung.
   */
  alterName: null,
};

/*
 * Einstellungen, die keine Tagebuchdaten sind. Beim Zusammenführen zweier
 * Stände gewinnt die Seite, auf der jemand etwas umgestellt hat – siehe
 * zusammenfuehren().
 */
const EINSTELLUNGEN = [
  'fenster', 'mindestFaelle', 'tagesfragen', 'theme', 'atemUebung', 'atemRunden',
  'ton', 'abnehmenGewollt', 'unterleibGefragt', 'beschwerdenSeit',
  'wasserZeigen', 'wasserGlas', 'adhsAn', 'spannungAn', 'v28Gesagt',
];

/** Die dreiwertigen Schalter – siehe adhsAn in VORGABE. */
const SCHALTER = ['adhsAn', 'spannungAn'];
const schalterWert = (v) => (v === true || v === false ? v : null);

/**
 * Wie lang ein gelesener Hinweis (`wechselGelesen`) beim Einlesen sein darf:
 * etwas mehr als die 165 Zeichen, die ein Schlüssel aus js/zusammen.js
 * höchstens hat. tests/test-sicherung.mjs prüft den Weg mit zwei Namen von
 * je 80 Zeichen.
 */
const WECHSEL_SCHLUESSEL_LAENGE = 170;

/*
 * Was zu diesem Gerät gehört und nicht zum Tagebuch. Eine Sicherung trägt
 * diese Felder mit, eingelesen werden sie nicht: Sonst stünde auf einem
 * neuen Telefon „Mitgenommen am …" mit den Zahlen eines anderen, und die
 * Anleitung für den Startbildschirm fehlte.
 */
const GERAETEBEZOGEN = ['umzug', 'umzugGeholt', 'startbildschirmWeg', 'sicherungSpaeter', 'alterName'];
const geraetBehalten = (dazu) => { GERAETEBEZOGEN.forEach((k) => { dazu[k] = zustand[k]; }); };

const klon = (o) => JSON.parse(JSON.stringify(o));

/*
 * Ein Stand, der hier neu anfängt. Die Karte „Was sich an deinen Zahlen
 * geändert hat" erzählt von Zahlen, die sich mit der Fassung 28 verschoben
 * haben – wer erst jetzt anfängt, hatte nie andere, und für ihn wäre jeder
 * ihrer Sätze falsch. Darum gilt sie bei einem neuen Stand als gesagt. Ein
 * älterer Stand im Speicher trägt den Schlüssel nicht und behält die Vorgabe
 * false; kommen ältere Einträge über eine Sicherung dazu, siehe
 * zusammenfuehren().
 */
const neuerStand = () => ({ ...klon(VORGABE), v28Gesagt: true });

/**
 * Jede Idee bekommt ihr eigenes `geschickt`.
 *
 * Ein alter Stand kennt nur die Zahl `ideenGeschickt`. Neue Ideen wurden vorn
 * eingefügt, also sind die hinteren die alten – und so viele davon gelten als
 * verschickt, wie die Zahl sagt. Das ist genau die Auskunft, die die alte
 * Buchführung gab, nur ab jetzt je Idee.
 */
function ideenMitMarke(ideen, geschicktAlt) {
  const liste = (Array.isArray(ideen) ? ideen : [])
    .filter((x) => x && typeof x === 'object' && typeof x.text === 'string');
  const n = Math.max(0, Math.min(liste.length, Number(geschicktAlt) || 0));
  return liste.map((x, i) => (typeof x.geschickt === 'boolean'
    ? x
    : { ...x, geschickt: i >= liste.length - n }));
}

let zustand = laden();
const hoerer = new Set();

function laden() {
  try {
    const roh = localStorage.getItem(KEY);
    if (!roh) return neuerStand();
    const gelesen = JSON.parse(roh);
    const s = Object.assign(klon(VORGABE), gelesen);
    // Wer schon etwas eingetragen hat, hat die Begrüßung hinter sich – auch
    // wenn der Stand aus einer Fassung stammt, die den Schlüssel noch nicht
    // kannte. Sonst stünde die Einführung eines Tages wieder vor dem Tagebuch.
    if (!('begruesst' in gelesen) && s.eintraege.length) s.begruesst = true;
    // Ein Stand ohne diesen Schlüssel hat eine Fassung von vor der
    // Umbenennung geschrieben – das Symbol dazu heißt noch „Bauchbuch".
    if (!('alterName' in gelesen)) s.alterName = 'offen';
    s.eintraege = sortiert((Array.isArray(s.eintraege) ? s.eintraege : []).map(mahlzeitFrisch));
    s.ideen = ideenMitMarke(s.ideen, s.ideenGeschickt);
    if (!Array.isArray(s.eigeneAktivitaeten)) s.eigeneAktivitaeten = [];
    if (!Array.isArray(s.standardMittel)) s.standardMittel = [];
    /*
     * Die Felder der Fassung 28. Ein älterer Stand hat sie nicht, und dann
     * greift die Vorgabe – umgeschrieben wird nichts. Ein Wert vom falschen
     * Typ dagegen (von Hand geändert, halb geschrieben) gilt als nicht
     * entschieden: Ein Schalter, der "ja" heißt, ist weder an noch aus, und
     * eine Liste, die keine ist, darf beim ersten includes() nicht die ganze
     * App anhalten.
     */
    SCHALTER.forEach((k) => { s[k] = schalterWert(s[k]); });
    if (typeof s.v28Gesagt !== 'boolean') s.v28Gesagt = false;
    s.wechselGelesen = Array.isArray(s.wechselGelesen)
      ? s.wechselGelesen.filter((x) => typeof x === 'string') : [];
    return s;
  } catch {
    // Unlesbar oder gar kein Speicher: Auch das ist ein neuer Anfang.
    return neuerStand();
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

/*
 * Die Stufen von „Wie anstrengend?" – dieselben wie INTENSITAETEN in
 * js/aktivitaet.js. Hier noch einmal, weil der Speicher vor der Rechenschicht
 * geladen wird und nichts von ihr wissen soll; tests/test-aktivitaet.mjs
 * prüft, dass beide Listen gleich sind.
 */
const INTENSITAET_IDS = ['leicht', 'mittel', 'hart'];

/**
 * Eine Aktivität so einlesen, dass jede Rechnung sie versteht: die Kennungen
 * als Liste von Zeichenketten, jede einmal; „wie anstrengend" nur mit einer
 * Stufe, die es gibt, sonst ohne Angabe. Eine Aktivität ohne jede Kennung
 * bleibt stehen – vielleicht trägt sie eine Notiz –, zählt aber nirgends.
 */
function aktivitaetFrisch(e) {
  if (!e || e.art !== 'aktivitaet') return e;
  const ids = (Array.isArray(e.aktivitaeten) ? e.aktivitaeten : [])
    .filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim());
  return {
    ...e,
    aktivitaeten: [...new Set(ids)],
    intensitaet: INTENSITAET_IDS.includes(e.intensitaet) ? e.intensitaet : null,
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
 *
 * Optional heißt auch: Ein leeres Feld zählt als nicht angegeben. Bis
 * November 2026 überschrieb ein mitgegebenes `am: ''` die Vorgabe, und der
 * Eintrag stand an keinem Tag. Der Bogen lässt das inzwischen gar nicht erst
 * durch (siehe zeitFehler() in js/app.js); hier fängt es jeden anderen Weg ab.
 */
export function eintragen(eintrag) {
  const neu = {
    id: neueId(),
    ...eintrag,
    am: istISO(eintrag.am) ? eintrag.am : heuteISO(),
    um: istUhr(eintrag.um) ? eintrag.um : jetztUhr(),
  };
  zustand.eintraege = sortiert([...zustand.eintraege, neu]);
  merke();
  melde();
  return neu.id;
}

/**
 * Einen Eintrag ändern. Ein leeres oder unbrauchbares Datum und eine solche
 * Uhrzeit überschreiben nichts – aus demselben Grund wie oben: Der Eintrag
 * verschwände sonst aus jedem Tag.
 */
export function eintragAendern(id, patch) {
  const i = zustand.eintraege.findIndex((e) => e.id === id);
  if (i < 0) return;
  const sauber = { ...patch };
  if ('am' in sauber && !istISO(sauber.am)) delete sauber.am;
  if ('um' in sauber && !istUhr(sauber.um)) delete sauber.um;
  zustand.eintraege[i] = { ...zustand.eintraege[i], ...sauber, id };
  zustand.eintraege = sortiert(zustand.eintraege);
  merke();
  melde();
}

/**
 * Einträge genau so zurücklegen, wie sie waren – mit ihren alten Kennungen.
 *
 * Für „Rückgängig" nach dem Löschen: Der gelöschte Eintrag kommt wieder, und
 * was beim Löschen einer Mahlzeit mitgerückt ist, steht wieder wie vorher.
 * Ersetzt wird ganz, nicht gemischt – ein Feld, das erst das Nachziehen
 * gesetzt hat, bliebe beim Mischen stehen. Die alte Kennung ist der Punkt:
 * Ein Medikament, das über `zuKopf` an einem zurückgeholten Kopfschmerz
 * hängt, hängt danach wieder daran, und eine Sicherung erkennt ihn als
 * denselben Eintrag statt als neuen.
 */
export function eintraegeZurueck(liste) {
  const zurueck = new Map((Array.isArray(liste) ? liste : [])
    .filter((e) => e && typeof e === 'object' && e.id && istISO(e.am) && typeof e.art === 'string')
    .map((e) => [e.id, { ...e }]));
  if (!zurueck.size) return 0;
  zustand.eintraege = sortiert([
    ...zustand.eintraege.filter((e) => !zurueck.has(e.id)),
    ...zurueck.values(),
  ]);
  merke();
  melde();
  return zurueck.size;
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
  tagAblegen(iso, { ...tagLesen(iso), ...patch });
}

function tagAblegen(iso, neu) {
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

/**
 * Ein Glas Wasser dazu (`schritt` > 0) oder eines zurück. Zurück kommt die
 * neue Zahl – oder null für einen Tag, an dem nicht gezählt werden kann.
 *
 * Für heute und vergangene Tage, nie für künftige: Was morgen getrunken wird,
 * weiß heute niemand, und ein Tipp auf einen Tag, zu dem man nicht blättern
 * kann, wäre ein Glas, das man nie wieder findet. Bei 0 verschwindet das Feld
 * ganz, statt als 0 dazustehen – „nicht gezählt" und „nichts getrunken" lassen
 * sich ohnehin nicht unterscheiden, und ein leerer Tag soll leer bleiben.
 */
export function wasserZaehlen(iso, schritt) {
  if (!istISO(iso) || iso > heuteISO()) return null;
  const jetzt = wasserVon(tagLesen(iso));
  const n = Math.max(0, Math.min(WASSER_HOECHSTENS, jetzt + (Number(schritt) > 0 ? 1 : -1)));
  if (n === jetzt) return n;
  const { wasser, ...rest } = tagLesen(iso);
  tagAblegen(iso, n ? { ...rest, wasser: n } : rest);
  return n;
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

/* ---------- Eigene Aktivitäten ---------- */

/*
 * Mehr passen in den Bogen nicht, ohne dass man darin sucht. Wie bei den
 * eigenen Mitteln sagt die App das, statt still eine nicht zu merken.
 */
export const AKTIV_HOECHSTENS = 24;
export const AKTIV_NAME_MAX = 40;

/** Wie viele eigene Aktivitäten zur Auswahl stehen – ohne die entfernten. */
const sichtbarAktiv = () => zustand.eigeneAktivitaeten.filter((a) => !a.ausgeblendet).length;

/**
 * Eine eigene Aktivität anlegen. Die Kennung kommt von außen (siehe
 * freieAktivitaetId in js/aktivitaet.js), wie bei den eigenen Auslösern.
 *
 * Zurück kommt { id, schon } – `schon`, wenn es sie genau so gibt; dann bleibt
 * es bei einer –, { fehler: 'leer' } ohne Namen oder { fehler: 'voll' }. Eine
 * entfernte mit dieser Kennung kommt zurück in die Auswahl, mit ihrem Namen.
 */
export function aktivitaetAnlegen(id, name) {
  const sauber = String(name || '').trim().slice(0, AKTIV_NAME_MAX);
  if (!sauber || typeof id !== 'string' || !id.startsWith('a:')) return { fehler: 'leer' };
  const da = zustand.eigeneAktivitaeten.find((a) => a.id === id);
  if (da && !da.ausgeblendet) return { id, schon: true };
  if (sichtbarAktiv() >= AKTIV_HOECHSTENS) return { fehler: 'voll' };
  zustand.eigeneAktivitaeten = da
    ? zustand.eigeneAktivitaeten.map((a) => (a.id === id ? { id, name: a.name } : a))
    : [...zustand.eigeneAktivitaeten, { id, name: sauber }];
  merke();
  melde();
  return { id, schon: false };
}

/**
 * Aus der Auswahl nehmen. Die Einträge, in denen sie steht, bleiben – und
 * mit ihnen ihr Name: Die Aktivität bleibt im Speicher, nur `ausgeblendet`.
 * Ganz gelöscht, hieße „Rückenschule" in jedem alten Eintrag danach
 * „Rueckenschule", gebaut aus der Kennung.
 */
export function aktivitaetEntfernen(id) {
  if (!zustand.eigeneAktivitaeten.some((a) => a.id === id && !a.ausgeblendet)) return;
  zustand.eigeneAktivitaeten = zustand.eigeneAktivitaeten
    .map((a) => (a.id === id ? { ...a, ausgeblendet: true } : a));
  merke();
  melde();
}

/** „Rückgängig" nach dem Entfernen: wieder in die Auswahl, an ihrer Stelle. */
export function aktivitaetZurueck(id) {
  if (!zustand.eigeneAktivitaeten.some((a) => a.id === id && a.ausgeblendet)) return false;
  if (sichtbarAktiv() >= AKTIV_HOECHSTENS) return false;
  zustand.eigeneAktivitaeten = zustand.eigeneAktivitaeten
    .map((a) => (a.id === id ? { id, name: a.name } : a));
  merke();
  melde();
  return true;
}

/* ---------- Die eigenen Mittel ---------- */

/**
 * Doppelte Kennungen in den eigenen Mitteln auflösen.
 *
 * Seit die übliche Zeit zum Schlüssel gehört (siehe mittelSchluessel), konnte
 * das Zusammenführen dasselbe Mittel zweimal mit einer Kennung anlegen – hier
 * mit geänderter Zeit, in der Sicherung mit der alten. Alles, was nach der
 * Kennung sucht, traf dann das falsche oder beide: Der Tipp auf „· morgens"
 * trug die Abendzeit ein, und „×" entfernte beide. Ein späteres mit
 * gleichem Schlüssel fällt weg, sonst bekommt es eine neue Kennung.
 */
function mittelEindeutig(liste) {
  const ids = new Set();
  const schluessel = new Set();
  const raus = [];
  liste.forEach((x) => {
    if (ids.has(x.id)) {
      if (schluessel.has(mittelSchluessel(x))) return;
      raus.push({ ...x, id: neueId() });
    } else raus.push(x);
    ids.add(raus[raus.length - 1].id);
    schluessel.add(mittelSchluessel(x));
  });
  return raus;
}

/*
 * Mehr passen in die Reihe auf dem Tag-Reiter nicht, ohne dass man darin
 * sucht. Wer an die Grenze kommt, erfährt das (siehe standardMerken) – ein
 * Mittel, das still nicht gemerkt wird, fehlt erst Tage später auffällig.
 */
export const STANDARD_HOECHSTENS = 12;

// Dieselben Kennungen wie die Zeitknöpfe. Eine zweite Liste hier verwürfe
// eine neue Tageszeit beim Merken und Einlesen still.
const TAGESZEIT_IDS = Object.keys(KNOPF_TAGESZEIT);
/*
 * Der Bezug zum Essen – dieselben Kennungen wie ESSENSBEZUG in js/app.js.
 * Hier noch einmal, weil der Speicher nichts von der Anzeige wissen soll;
 * tests/test-zeit-mittel.mjs prüft, dass beide Listen gleich sind.
 */
const BEZUG_IDS = ['vor', 'beim', 'nach'];

/*
 * Die Freisetzungsformen bei Methylphenidat – dieselben Kennungen wie
 * MPH_FORMEN in js/mittel.js. Hier noch einmal aus demselben Grund wie
 * INTENSITAET_IDS: Der Speicher soll von den Texten nichts wissen.
 * tests/test-adhs-wissen.mjs prüft, dass beide Listen gleich sind.
 */
export const FORM_IDS = ['sofort', 'pellet', 'sodas', 'oros', 'retardtab', 'equasym', 'unbekannt'];

/** Ein Standardmittel in seine gespeicherte Form bringen. */
function standardSauber(x) {
  return {
    mittel: String(x.mittel || '').trim().slice(0, 80),
    dosis: String(x.dosis || '').trim().slice(0, 40),
    tageszeit: TAGESZEIT_IDS.includes(x.tageszeit) ? x.tageszeit : null,
    bezug: BEZUG_IDS.includes(x.bezug) ? x.bezug : null,
    /*
     * Die Form nur, wenn die Vorlage sie überhaupt nennt. Wer unter „Mehr"
     * die Dosis ändert, schickt keine Form mit – und meint damit nicht, dass
     * sie weg ist. Mit `form` im Ergebnis setzte jede solche Änderung sie auf
     * null (standardAendern mischt das hier über das alte Mittel), und mit
     * ihr verschwände der Hinweis, der an ihr hängt.
     */
    ...(Object.hasOwn(x, 'form') ? { form: FORM_IDS.includes(x.form) ? x.form : null } : {}),
  };
}

/**
 * Woran zwei Standardmittel als dasselbe erkannt werden: Name, Dosis und
 * übliche Zeit.
 *
 * Die Zeit gehört dazu, seit dasselbe Mittel zweimal am Tag ein eigener Knopf
 * sein soll – „Pantoprazol 40 mg · morgens" und „· abends". Vorher frischte
 * das zweite Merken nur die Zeit des ersten auf, und der Morgen war weg.
 */
function mittelSchluessel(x) {
  const s = standardSauber(x);
  return [s.mittel, s.dosis, s.tageszeit || '', s.bezug || ''].join('|').toLowerCase();
}

/**
 * Ein Mittel als eigenes Standardmittel merken.
 *
 * Zurück kommt { id, schon }: die Kennung und ob es genau so schon dastand –
 * dann bleibt es bei einem Eintrag. Oder { fehler: 'leer' } ohne Namen und
 * { fehler: 'voll' }, wenn schon STANDARD_HOECHSTENS dastehen. Die Anzeige
 * sagt das; verworfen wird nichts still.
 */
export function standardMerken(vorlage) {
  const sauber = standardSauber(vorlage);
  // Ein neu gemerktes Mittel hat seine Form – oder ausdrücklich keine.
  const neu = { id: neueId(), ...sauber, form: sauber.form ?? null };
  if (!neu.mittel) return { fehler: 'leer' };
  const da = zustand.standardMittel.find((x) => mittelSchluessel(x) === mittelSchluessel(neu));
  if (da) return { id: da.id, schon: true };
  if (zustand.standardMittel.length >= STANDARD_HOECHSTENS) return { fehler: 'voll' };
  zustand.standardMittel = [...zustand.standardMittel, neu];
  merke();
  melde();
  return { id: neu.id, schon: false };
}

/**
 * Ein Standardmittel ändern – Name, Dosis, übliche Zeit, Form.
 *
 * { id } bei Erfolg, { fehler: 'leer' } ohne Namen, { fehler: 'doppelt' },
 * wenn es genau so schon ein anderes gibt, { fehler: 'weg' }, wenn es dieses
 * nicht mehr gibt. Die Einträge, die damit schon angelegt wurden, bleiben,
 * wie sie sind: Sie sagen, was an jenem Tag genommen wurde.
 *
 * Felder, die die Vorlage nicht nennt, bleiben, wie sie waren – „nur die Form
 * ändern" ist { form }, ohne Namen und Dosis noch einmal mitzuschicken. Eine
 * Ausnahme hat die Form: Bekommt das Mittel einen anderen Namen und nennt die
 * Vorlage keine Form, wird sie null. Sie stand auf der Packung des alten
 * Mittels; behielte „Pantoprazol" die Freisetzungsform von „Ritalin Adult",
 * oder „Medikinet retard" die Hülle von „Concerta", hinge daran ein falscher
 * Hinweis – oder es fehlte einer. Null ist die sichere Seite: Was der Name
 * eindeutig sagt, findet formAusName() in js/mittel.js wieder.
 */
export function standardAendern(id, vorlage) {
  const i = zustand.standardMittel.findIndex((x) => x.id === id);
  if (i < 0) return { fehler: 'weg' };
  const alt = zustand.standardMittel[i];
  const v = vorlage && typeof vorlage === 'object' ? vorlage : {};
  const neu = { ...alt, ...standardSauber({ ...alt, ...v }), id };
  const nameKlein = (x) => String(x || '').trim().toLowerCase();
  if (!Object.hasOwn(v, 'form') && nameKlein(neu.mittel) !== nameKlein(alt.mittel)) neu.form = null;
  if (!neu.mittel) return { fehler: 'leer' };
  if (zustand.standardMittel.some((x) => x.id !== id && mittelSchluessel(x) === mittelSchluessel(neu))) {
    return { fehler: 'doppelt' };
  }
  zustand.standardMittel = zustand.standardMittel.map((x) => (x.id === id ? neu : x));
  merke();
  melde();
  return { id };
}

/** Das Standardmittel mit genau diesem Namen, dieser Dosis und Zeit – oder null. */
export function standardVon(vorlage) {
  const k = mittelSchluessel(vorlage);
  return zustand.standardMittel.find((x) => mittelSchluessel(x) === k) || null;
}

/**
 * Entfernen. Zurück kommt, was entfernt wurde, samt seiner Stelle – für
 * „Rückgängig" (standardZurueck) – oder null.
 */
export function standardEntfernen(id) {
  const stelle = zustand.standardMittel.findIndex((x) => x.id === id);
  if (stelle < 0) return null;
  const mittel = zustand.standardMittel[stelle];
  zustand.standardMittel = zustand.standardMittel.filter((x) => x.id !== id);
  merke();
  melde();
  return { mittel: klon(mittel), stelle };
}

/**
 * „Rückgängig" nach dem Entfernen: mit derselben Kennung an dieselbe Stelle.
 * Nicht, wenn es inzwischen genau so wieder dasteht oder die Liste voll ist.
 */
export function standardZurueck(weg) {
  if (!weg || !weg.mittel) return false;
  const m = { ...weg.mittel, ...standardSauber(weg.mittel) };
  if (!m.mittel || zustand.standardMittel.some((x) => x.id === m.id
    || mittelSchluessel(x) === mittelSchluessel(m))) return false;
  if (zustand.standardMittel.length >= STANDARD_HOECHSTENS) return false;
  const liste = [...zustand.standardMittel];
  liste.splice(Math.min(Math.max(0, weg.stelle || 0), liste.length), 0, m);
  zustand.standardMittel = liste;
  merke();
  melde();
  return true;
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

/* ---------- Was schon feststeht ---------- */

export function befundNotieren(id) {
  if (!BEFUND_VON[id]) return false;
  if (zustand.befunde.some((b) => b.id === id)) return false;
  if (zustand.befunde.length >= JE_BEFUNDE) return false;
  zustand.befunde = [...zustand.befunde, { id, am: heuteISO() }];
  merke();
  melde();
  return true;
}

export function befundLoeschen(id) {
  const vorher = zustand.befunde.length;
  zustand.befunde = zustand.befunde.filter((b) => b.id !== id);
  if (zustand.befunde.length === vorher) return;
  merke();
  melde();
}

/* ---------- Die Küche: was geht, was nicht ---------- */

/**
 * Etwas auf eine der beiden Listen setzen.
 *
 * Steht derselbe Name schon auf der *anderen* Liste, wandert er hinüber statt
 * doppelt dazustehen. Das ist der häufige Fall und kein Sonderfall: Was im
 * Januar nicht ging, geht im März vielleicht wieder, und wer dann zweimal
 * „Kaffee" dastehen hat, glaubt der Liste nicht mehr.
 */
export function kuecheNotieren(name, art) {
  const sauber = String(name || '').trim().slice(0, MAX_NAME);
  if (!sauber) return null;
  if (!KUECHEN_ARTEN.some((a) => a.id === art)) return null;

  const gleich = (x) => x.name.toLowerCase() === sauber.toLowerCase();
  const vorhanden = zustand.kueche.find(gleich);
  if (vorhanden) {
    if (vorhanden.art === art) return vorhanden.id;
    zustand.kueche = zustand.kueche.map((x) => (gleich(x) ? { ...x, art, am: heuteISO() } : x));
    merke();
    melde();
    return vorhanden.id;
  }

  // Die Obergrenze gilt je Liste, nicht insgesamt: Wer vierzig Sachen hat, die
  // gehen, soll deshalb nichts aufschreiben können, das nicht geht.
  if (zustand.kueche.filter((x) => x.art === art).length >= JE_LISTE) return null;

  const neu = { id: neueId(), name: sauber, art, am: heuteISO() };
  zustand.kueche = [neu, ...zustand.kueche];
  merke();
  melde();
  return neu.id;
}

/** Von einer Liste auf die andere – der Weg, den „geht wieder" nimmt. */
export function kuecheUmschalten(id) {
  const i = zustand.kueche.findIndex((x) => x.id === id);
  if (i < 0) return;
  const art = zustand.kueche[i].art === 'geht' ? 'nicht' : 'geht';
  zustand.kueche[i] = { ...zustand.kueche[i], art, am: heuteISO() };
  merke();
  melde();
}

export function kuecheLoeschen(id) {
  const vorher = zustand.kueche.length;
  zustand.kueche = zustand.kueche.filter((x) => x.id !== id);
  if (zustand.kueche.length === vorher) return;
  merke();
  melde();
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
 * Gezählt wird je Idee. Hier stand einmal „die Länge der Liste beim letzten
 * Weitergeben", mit der Begründung, das sei gröber und dafür ehrlich. Es war
 * falsch: Eine Idee löschen und eine neue schreiben ergab dieselbe Länge, die
 * neue galt als verschickt und kam nie an.
 */
export function ideenOffen() {
  return zustand.ideen.filter((x) => !x.geschickt).length;
}

/** Die noch nicht verschickten Ideen, die älteste zuerst. */
export function ideenUnterwegs() {
  return zustand.ideen.filter((x) => !x.geschickt).reverse();
}

function geschicktZaehlen() {
  zustand.ideenGeschickt = zustand.ideen.filter((x) => x.geschickt).length;
}

/** Eine einzelne Idee ist beim Kasten angekommen. */
export function ideeGeschicktMerken(id) {
  const i = zustand.ideen.findIndex((x) => x.id === id);
  if (i < 0) return;
  zustand.ideen[i] = { ...zustand.ideen[i], geschickt: true };
  geschicktZaehlen();
  zustand.ideenFehler = null;
  merke();
  melde();
}

/** Alle auf einmal – nach „Kopieren" oder „Anders schicken". */
export function ideenGeschicktMerken() {
  zustand.ideen = zustand.ideen.map((x) => ({ ...x, geschickt: true }));
  geschicktZaehlen();
  zustand.ideenFehler = null;
  merke();
  melde();
}

/**
 * Warum die Abgabe nicht geklappt hat.
 *
 * Das hier ist die Lehre aus einem Abend Fehlersuche: Der Sendeversuch fing
 * seinen Fehler ab und tat nichts damit – kein Wort in der Anzeige, keine
 * Zeile irgendwo. In der App stand weiter „noch nicht weitergegeben", und
 * das stimmte ja auch, sagte aber nicht, ob gerade gar nicht gesendet wurde
 * oder ob der Kasten die Annahme verweigert. Ein Vorschlag, der stillschweigend
 * liegen bleibt, ist genau die Sackgasse, gegen die dieser Rückkanal gebaut
 * wurde.
 */
export function ideenFehlerMerken(text) {
  zustand.ideenFehler = text ? String(text) : null;
  merke();
  melde();
}

/* ---------- Ideen zur App ---------- */

/*
 * Eine Änderung an den Ideen räumt die alte Fehlermeldung weg. Sie gehört zu
 * einem Versuch, der vorbei ist; stehen zu lassen, was gerade nicht mehr
 * stimmt, ist schlimmer als nichts zu sagen.
 */
function ideenBeruehrt() {
  zustand.ideenFehler = null;
}

export function ideeAnlegen(text) {
  const sauber = String(text || '').trim();
  if (!sauber) return null;
  const neu = { id: neueId(), am: heuteISO(), text: sauber, erledigt: false, geschickt: false };
  zustand.ideen = [neu, ...zustand.ideen];
  ideenBeruehrt();
  merke();
  melde();
  return neu.id;
}

/** Abgehakt oder wieder offen. Gelöscht wird eine Idee dadurch nicht. */
export function ideeUmschalten(id) {
  const i = zustand.ideen.findIndex((x) => x.id === id);
  if (i < 0) return;
  zustand.ideen[i] = { ...zustand.ideen[i], erledigt: !zustand.ideen[i].erledigt };
  ideenBeruehrt();
  merke();
  melde();
}

export function ideeLoeschen(id) {
  const vorher = zustand.ideen.length;
  zustand.ideen = zustand.ideen.filter((x) => x.id !== id);
  if (zustand.ideen.length === vorher) return;
  ideenBeruehrt();
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
function sicherungLesen(text) {
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
  )).map((e) => mittelFrisch(aktivitaetFrisch(mahlzeitFrisch({ ...e, id: e.id || neueId() })))));
  // Die Schalter nur mit einem der drei Werte; alles andere gilt als nicht
  // entschieden. Die Schleife oben nimmt hier jeden Typ, weil die Vorgabe
  // null ist und null keinen Typ vorgibt.
  SCHALTER.forEach((k) => { frisch[k] = schalterWert(gelesen[k]); });
  // Gelesene Hinweise: kurze Zeichenketten, die jüngsten fünfzig. Mehr gibt
  // es bei ein paar eigenen Mitteln nicht, und eine Datei, die hier Unsinn
  // trägt, soll den Speicher nicht füllen. Kurz heißt: so lang, wie ein
  // Schlüssel aus js/zusammen.js werden kann – zwei Namen mit je bis zu 80
  // Zeichen (W_SCHLUESSEL_NAME) und die Kennung, höchstens 165. Wäre die
  // Grenze knapper, erschiene eine gelesene Karte zu zwei langen Namen nach
  // einem Umzug oder Einlesen wieder.
  frisch.wechselGelesen = frisch.wechselGelesen
    .filter((x) => typeof x === 'string' && x.length <= WECHSEL_SCHLUESSEL_LAENGE).slice(-50);
  // Tageszeit und Bezug nur aus den Knöpfen – ein Wert, den es dort nicht
  // gibt, würde beim Eintragen keine Uhrzeit ergeben, sondern gar keine.
  frisch.standardMittel = mittelEindeutig(frisch.standardMittel
    .filter((x) => x && typeof x === 'object' && typeof x.mittel === 'string' && x.mittel.trim())
    .map((x) => ({ ...x, ...standardSauber(x), id: x.id || neueId() })));
  // Eigene Aktivitäten: eine Kennung mit `a:` und ein Name – sonst stünde im
  // Bogen ein Knopf ohne Beschriftung. Doppelte fallen weg.
  frisch.eigeneAktivitaeten = frisch.eigeneAktivitaeten
    .filter((a) => a && typeof a === 'object' && typeof a.id === 'string' && a.id.startsWith('a:')
      && typeof a.name === 'string' && a.name.trim())
    .map((a) => ({
      id: a.id,
      name: a.name.trim().slice(0, AKTIV_NAME_MAX),
      // Eine entfernte bleibt entfernt – und behält ihren Namen.
      ...(a.ausgeblendet === true ? { ausgeblendet: true } : {}),
    }))
    .filter((a, i, alle) => alle.findIndex((x) => x.id === a.id) === i);
  frisch.ideen = ideenMitMarke(frisch.ideen, gelesen.ideenGeschickt)
    .map((x) => ({ ...x, id: x.id || neueId(), erledigt: !!x.erledigt }));
  if (!Number.isFinite(frisch.fenster) || frisch.fenster <= 0) frisch.fenster = VORGABE.fenster;
  frisch.tage = tageSauber(frisch.tage);
  frisch.wasserGlas = glasMl(frisch.wasserGlas);
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
  return frisch;
}

/**
 * Die Wasserzahl jedes Tages auf eine ganze Zahl von 1 bis WASSER_HOECHSTENS
 * bringen – oder weglassen.
 *
 * Eine Sicherung ist eine Datei, die jemand öffnen und ändern kann; "3",
 * 2.5 oder -1 kämen sonst als Zahl der Gläser an, und eine Summe über
 * Zeichenketten hängte sie aneinander. Ein Tag, an dem danach nichts mehr
 * steht, fällt weg, wie es auch beim Zählen geschieht. Alle übrigen Tage
 * bleiben genau so, wie sie in der Datei stehen.
 */
function wasserSauber(tage) {
  const raus = {};
  Object.entries(tage || {}).forEach(([iso, t]) => {
    if (!t || typeof t !== 'object' || Array.isArray(t) || !('wasser' in t)) {
      raus[iso] = t;
      return;
    }
    const { wasser, ...rest } = t;
    const n = wasserVon(t);
    const neu = n ? { ...rest, wasser: n } : rest;
    if (Object.keys(neu).length) raus[iso] = neu;
  });
  return raus;
}

/*
 * Die Tagesangaben der Fassung 28 und was als Wert gilt. Was nicht passt,
 * fällt weg statt umgedeutet zu werden: Eine 7 bei „Schiene" ist weder
 * „getragen" noch „nicht getragen", und eine Antwort, die als 0 gelesen
 * würde, wäre eine erfundene Nacht ohne Schiene.
 */
const stufeNullVier = (v) => Number.isInteger(v) && v >= 0 && v <= 4;
const nullOderEins = (v) => v === 0 || v === 1;
const TAGESFELD_PRUEFUNG = {
  adhsPause: (v) => ['pause', 'geplant', 'vergessen', 'beschwerden'].includes(v),
  verspannt: stufeNullVier,
  kiefer: stufeNullVier,
  gepresst: nullOderEins,
  schiene: nullOderEins,
};

/**
 * Den Tagesspeicher aus einer Sicherung lesen: erst das Wasser (siehe
 * wasserSauber), dann die Angaben der Fassung 28. Ein Tag, an dem danach
 * nichts mehr steht, fällt weg. Alle übrigen Felder bleiben, wie sie sind.
 */
function tageSauber(tage) {
  const raus = {};
  Object.entries(wasserSauber(tage)).forEach(([iso, t]) => {
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      raus[iso] = t;
      return;
    }
    const neu = { ...t };
    Object.entries(TAGESFELD_PRUEFUNG).forEach(([k, gilt]) => {
      if (k in neu && !gilt(neu[k])) delete neu[k];
    });
    if (Object.keys(neu).length) raus[iso] = neu;
  });
  return raus;
}

/**
 * Ein Medikament aus einer Sicherung: die Angaben der Fassung 28 nur mit
 * Werten, die es gibt. Eine unbekannte Form wäre im Bogen keine der Marken
 * und im Hinweis keine Form. Der Zeitpunkt der Essensangabe zählt nur als
 * Zahl und nur neben einer Angabe – ein Zeitpunkt, der keiner ist, ließe
 * sich mit der Einnahme nicht vergleichen, und ohne Angabe gehört er zu
 * nichts.
 */
function mittelFrisch(e) {
  if (!e || e.art !== 'medikament') return e;
  const neu = { ...e };
  if ('form' in neu && !FORM_IDS.includes(neu.form)) delete neu.form;
  if ('essen' in neu && !['mit', 'vor', 'ohne'].includes(neu.essen)) delete neu.essen;
  if ('essenGesetzt' in neu
    && !(neu.essen && Number.isFinite(neu.essenGesetzt) && neu.essenGesetzt > 0)) {
    delete neu.essenGesetzt;
  }
  return neu;
}

/* ---------- Einlesen, ohne etwas zu verlieren ---------- */

/*
 * Hier stand bis zum 28.10.2026 nur ausJSON(): Der eingelesene Stand ersetzte
 * den vorhandenen, ohne Rückfrage und ohne Kopie. Solange eine Sicherung nur
 * nach einem verlorenen Gerät eingelesen wurde, ging das gut. Mit dem Umzug
 * von Safari in die App auf dem Startbildschirm wurde es zur Falle: Wer in
 * der neuen App erst ein Frühstück einträgt und danach die Safari-Einträge
 * holt, hätte das Frühstück verloren – oder umgekehrt, wer zweimal holt, die
 * Einträge dazwischen.
 *
 * Deshalb jetzt zwei Sicherungen hintereinander:
 *
 *   1. Vor jedem Einlesen liegt der bisherige Stand unter einem eigenen
 *      Schlüssel und lässt sich mit rueckgaengig() zurückholen.
 *   2. Ist schon etwas da, wird zusammengeführt statt ersetzt: Einträge,
 *      Ideen, Listen über ihre Kennung, Tagesfragen je Tag und je Feld.
 *      Bei Gleichstand gewinnt, was schon hier stand. Nur das Wasser nicht –
 *      siehe zusammenfuehren().
 */

const VORHER = `${KEY}.vorher`;

/**
 * Steht in diesem Tagebuch noch gar nichts? Einstellungen zählen nicht.
 *
 * Die eigenen Mittel zählen: Wer sie unter „Mehr" angelegt hat, bevor die
 * Sicherung vom alten Gerät da war, hat etwas eingetragen – und verlöre es,
 * wenn das Einlesen den Stand als leer ersetzte statt zusammenzuführen.
 * Gezähltes Wasser ebenso – es steht in `tage` und zählt damit hier mit. Und
 * die eigenen Aktivitäten, wie die eigenen Auslöser.
 */
export function istLeer(s = zustand) {
  return !s.eintraege.length && !Object.keys(s.tage || {}).length && !s.ideen.length
    && !s.kueche.length && !s.befunde.length && !s.termine.length && !s.gewicht.length
    && !s.eigeneAusloeser.length && !s.versuche.length && !s.provokationen.length
    && !s.stufenplaene.length && !s.versuch && !s.provokation && !s.stufenplan
    && !(s.standardMittel || []).length && !(s.eigeneAktivitaeten || []).length;
}

function vorherAblegen() {
  try {
    localStorage.setItem(VORHER, JSON.stringify({ am: new Date().toISOString(), zustand }));
    return true;
  } catch {
    return false;
  }
}

/** Liegt ein Stand von vor dem letzten Einlesen? { am, anzahl } oder null. */
export function vorherDa() {
  try {
    const roh = localStorage.getItem(VORHER);
    if (!roh) return null;
    const v = JSON.parse(roh);
    return { am: v.am, anzahl: (v.zustand && v.zustand.eintraege || []).length };
  } catch {
    return null;
  }
}

/** Den Stand von vor dem letzten Einlesen zurückholen. */
export function rueckgaengig() {
  const roh = localStorage.getItem(VORHER);
  if (!roh) throw new Error('Es gibt keinen früheren Stand mehr.');
  const v = JSON.parse(roh);
  zustand = sicherungLesen(JSON.stringify(v.zustand));
  try { localStorage.removeItem(VORHER); } catch { /* dann bleibt er eben */ }
  merke();
  melde();
  return zustand.eintraege.length;
}

/** Zwei Listen vereinigen; bei gleicher Kennung bleibt der erste Teil. */
function vereinigt(hier, dazu, kennung) {
  const schon = new Set(hier.map(kennung));
  return [...hier, ...dazu.filter((x) => !schon.has(kennung(x)))];
}

const gleichWie = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function zusammenfuehren(hier, dazu) {
  const neu = { ...hier };
  neu.eintraege = sortiert(vereinigt(hier.eintraege, dazu.eintraege, (e) => e.id));
  neu.tage = { ...hier.tage };
  Object.keys(dazu.tage || {}).forEach((iso) => {
    neu.tage[iso] = { ...dazu.tage[iso], ...(hier.tage[iso] || {}) };
    /*
     * Das Wasser ist ein Zähler, keine Antwort, und bei einem Zähler gewinnt
     * der größere Wert. Der häufige Fall ist derselbe Tag auf zwei Ständen,
     * von denen einer weitergezählt hat: eine Sicherung von heute Morgen,
     * abends eingelesen; der Umzug von Safari, nachdem in der App schon
     * getippt wurde. Dort steckt die kleinere Zahl in der größeren. Die Summe
     * zählte die gemeinsamen Gläser doppelt, und „was hier stand, gewinnt"
     * verlöre die Gläser, die nur dort gezählt wurden. Zu wenig wird es nur,
     * wenn auf zwei Geräten am selben Tag verschiedene Gläser gezählt wurden –
     * dem selteneren Fall, und dort ist es eine Angabe zu wenig statt einer
     * erfundenen.
     */
    const w = Math.max(wasserVon(hier.tage[iso]), wasserVon(dazu.tage[iso]));
    if (w) neu.tage[iso].wasser = w;
  });
  neu.ideen = vereinigt(hier.ideen, dazu.ideen, (x) => x.id);
  neu.eigeneAusloeser = vereinigt(hier.eigeneAusloeser, dazu.eigeneAusloeser, (a) => a.id);
  // Ohne Kürzen auf AKTIV_HOECHSTENS, aus demselben Grund wie bei den Mitteln.
  neu.eigeneAktivitaeten = vereinigt(hier.eigeneAktivitaeten || [], dazu.eigeneAktivitaeten || [],
    (a) => a.id);
  neu.kueche = vereinigt(hier.kueche, dazu.kueche, (k) => String(k.name || '').toLowerCase());
  neu.befunde = vereinigt(hier.befunde, dazu.befunde, (b) => b.id);
  neu.zuletztMittel = [...new Set([...hier.zuletztMittel, ...dazu.zuletztMittel])].slice(0, 5);
  // Was auf einem Gerät gelesen wurde, ist gelesen – ein Hinweis, den man
  // schon weggetippt hat, soll nach dem Umzug nicht wiederkommen.
  neu.wechselGelesen = [...new Set([...(hier.wechselGelesen || []), ...(dazu.wechselGelesen || [])])];
  // Ohne Kürzen auf STANDARD_HOECHSTENS: Was in einer Sicherung steht, geht
  // beim Zusammenführen nicht still verloren. Die Grenze gilt fürs Merken.
  // Erst nach der Kennung: Dieselbe Kennung ist dasselbe Mittel, auch wenn
  // hier inzwischen die Zeit geändert wurde (Ändern behält die Kennung) –
  // und wie bei den Einträgen gewinnt dann, was hier steht. Danach nach dem
  // Schlüssel, damit dasselbe Mittel von zwei Geräten nicht doppelt dasteht.
  const hierIds = new Set(hier.standardMittel.map((x) => x.id));
  neu.standardMittel = mittelEindeutig(vereinigt(hier.standardMittel,
    dazu.standardMittel.filter((x) => !hierIds.has(x.id)), mittelSchluessel));
  neu.termine = [...new Set([...hier.termine, ...dazu.termine])].sort().reverse();
  neu.gewicht = vereinigt(hier.gewicht, dazu.gewicht, (g) => g.am)
    .sort((a, b) => String(b.am).localeCompare(String(a.am)));
  ['versuche', 'provokationen', 'stufenplaene'].forEach((k) => {
    neu[k] = vereinigt(hier[k], dazu[k], (x) => x.id || JSON.stringify(x));
  });
  ['versuch', 'provokation', 'stufenplan'].forEach((k) => {
    neu[k] = hier[k] || dazu[k];
  });
  // Einstellungen: Wer hier noch nichts umgestellt hat, bekommt die von dort.
  EINSTELLUNGEN.forEach((k) => {
    if (gleichWie(hier[k], VORGABE[k])) neu[k] = dazu[k];
  });
  /*
   * Die Karte zur Fassung 28 gilt wieder, wenn von dort Einträge kommen, die
   * hier noch fehlen, und dort die Karte nicht gelesen ist – eine Sicherung
   * der Fassung 27 (ohne den Schlüssel, also false) oder ein Stand aus Safari,
   * auf dem sie noch wartet. Sonst bliebe sie auf einem neu angelegten Stand
   * (siehe neuerStand) für immer weg, obwohl jetzt frühere Einträge da sind,
   * die anders zählen als vorher. Wer nur die eigenen Einträge noch einmal
   * einliest, bekommt sie nicht noch einmal.
   */
  const schonHier = new Set(hier.eintraege.map((e) => e.id));
  if (dazu.v28Gesagt !== true && dazu.eintraege.some((e) => !schonHier.has(e.id))) neu.v28Gesagt = false;
  neu.begruesst = true;
  return neu;
}

/**
 * Eine Sicherung einlesen, ohne etwas zu verlieren.
 *
 * Zurück kommt { anzahl, vorher, zusammengefuehrt }: wie viele Einträge
 * jetzt da sind, wie viele es vorher waren, und ob zusammengeführt wurde.
 */
export function einlesen(text) {
  const dazu = sicherungLesen(text);
  geraetBehalten(dazu);
  const vorher = zustand.eintraege.length;
  const leer = istLeer();
  vorherAblegen();
  zustand = leer ? dazu : zusammenfuehren(zustand, dazu);
  merke();
  melde();
  return { anzahl: zustand.eintraege.length, vorher, zusammengefuehrt: !leer };
}

/** Wie einlesen(), aber ersetzt immer. Bleibt für alte Aufrufer. */
export function ausJSON(text) {
  const dazu = sicherungLesen(text);
  geraetBehalten(dazu);
  vorherAblegen();
  zustand = dazu;
  merke();
  melde();
  return dazu.eintraege.length;
}

/* ---------- Umzug in die App auf dem Startbildschirm ---------- */

/** In Safari: vermerken, dass gerade mitgenommen wurde. */
export function umzugMerken() {
  const letzter = zustand.eintraege[zustand.eintraege.length - 1] || null;
  zustand.umzug = {
    am: heuteISO(),
    anzahl: zustand.eintraege.length,
    letzter: letzter ? { am: letzter.am, um: letzter.um || '' } : null,
    // Woran Safari später erkennt, was seitdem dazukam.
    ids: zustand.eintraege.map((e) => e.id),
    /*
     * Und was sonst beim Holen mitkommt: das Wasser je Tag (dort kommt die
     * größere Zahl mit, siehe zusammenfuehren), die eigenen Mittel und
     * Aktivitäten. Ein Glas, das danach in Safari gezählt wird, ist sonst für
     * den Hinweis unsichtbar – es steht nicht im Strang.
     */
    wasser: Object.fromEntries(Object.entries(zustand.tage || {})
      .map(([iso, t]) => [iso, wasserVon(t)]).filter(([, n]) => n > 0)),
    // Nach Kennung: Ein hier nur geändertes Mittel kommt beim Holen nicht
    // mit (dort gewinnt dieselbe Kennung), ein neu angelegtes schon.
    mittel: zustand.standardMittel.map((m) => m.id),
    aktiv: zustand.eigeneAktivitaeten.map((a) => a.id),
  };
  merke();
  melde();
  return zustand.umzug;
}

/**
 * In der App: vermerken, dass geholt wurde.
 *
 * Die Sicherungserinnerung fängt danach von vorn an. Was aus Safari kam,
 * trägt dessen lastBackup mit – aber die Kopie in Safari verschwindet nach
 * einer Woche ohne Besuch von selbst, und die Zwischenablage beim nächsten
 * Kopieren. Hier soll so bald wie möglich eine echte Sicherung entstehen.
 */
export function umzugGeholtMerken() {
  zustand.umzugGeholt = { am: heuteISO(), anzahl: zustand.eintraege.length };
  zustand.lastBackup = null;
  zustand.sicherungSpaeter = null;
  zustand.begruesst = true;
  merke();
  melde();
}

export function allesLoeschen() {
  // Ein neuer Anfang, auch für die Karte zur Fassung 28 (siehe neuerStand):
  // Frühere Einträge, die anders zählen könnten, gibt es danach nicht mehr.
  zustand = neuerStand();
  // Die Begrüßung nicht noch einmal: Wer gerade bewusst alles gelöscht hat,
  // weiß, was die App ist.
  zustand.begruesst = true;
  try { localStorage.removeItem(KEY); } catch { /* dann eben nicht */ }
  merke();
  melde();
}

/*
 * Schon gespeicherte doppelte Kennungen bei den eigenen Mitteln heilen (siehe
 * mittelEindeutig), ohne dass jemand neu einlesen muss. Hier am Ende und
 * nicht in laden(): laden() läuft, wenn das Modul startet – bevor die Listen
 * und Zähler weiter oben stehen, die es dafür braucht. Ein Fehler dort fiele
 * in dessen catch und begänne mit einem leeren Tagebuch.
 */
try {
  const geheilt = mittelEindeutig(zustand.standardMittel);
  if (geheilt.length !== zustand.standardMittel.length
    || geheilt.some((x, i) => x.id !== zustand.standardMittel[i].id)) {
    zustand.standardMittel = geheilt;
    merke();
  }
} catch { /* dann bleibt es, wie es war */ }
