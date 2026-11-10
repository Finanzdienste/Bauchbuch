/*
 * Die Anzeige. Alles, was man sieht und antippt, steht hier.
 *
 * Aufbau in einem Satz: Ein Zustand im Speicher, eine Funktion, die daraus
 * HTML macht, und ein einziger Klick-Empfänger für alles. Kein Rahmenwerk,
 * keine Abhängigkeit, kein Bauschritt – index.html im Browser öffnen genügt.
 *
 * Was hier *nicht* steht, ist das Rechnen. Ob ein Auslöser auffällig ist,
 * entscheidet js/auswertung.js, und zwar ohne von dieser Datei zu wissen. Die
 * Richtung hält nur, solange sie geprüft wird – dafür gibt es
 * tools/pruefung/schichten.py.
 */
import * as store from './store.js';
import {
  fmtDatum, fmtMonat, fmtTag, heuteISO, istISO, istUhr, jetztUhr, KNOPF_TAGESZEIT, knopfTageszeit,
  minutenAmTag, monatsRaster, monatsStart, plusMonate, plusTage, tageDazwischen, tageszeitVon, WOCHE_KOPF,
  zeitpunkt,
} from './datum.js';
import { esc, fmtZahl, kuerze, mehrzahl } from './text.js';
import {
  AUSLOESER, BESCHWERDEN, BRISTOL, MITTEL_VORSCHLAEGE, PORTIONEN, ROLLEN,
  ROLLE_VORGABE, SPANNUNG_FRAGEN, STAERKE_WORT, STUHLBEZUG, TAGESFRAGEN, UMSTAND_IDS, ausloeserName,
  beschwerdeName, bristolName, eigeneId, klasseName, rolleName, sichtbareFragen,
} from './daten.js';
import {
  artAnteil, ausloeserBilanz, einstufung, EINSTUFUNG_WORT, essensbezug,
  faktorBilanz, faktorenBilanz, gesamtZahlen, haeufigeMahlzeiten, haeufigeZutaten,
  klasseZutaten, klassenBilanz, klassenEinstufung, nachArt, nachTageszeit,
  bewerteteMahlzeiten, rollenBilanz, serieOhne, stundenSeitLetzterMahlzeit, tagesWert,
  trend, TREND_WORT,
  verlaufReihe, zutatenVon,
} from './auswertung.js';
import { entschluesseln, istTresor, tresorMoeglich, verschluesseln } from './tresor.js';
import { bezugBilanz, stuhlZahlen, wasserSatz, wasserVergleich } from './stuhl.js';
import {
  GLAS_GROESSEN, WASSER_HOECHSTENS, glasMl, glasName, literText, wasserVon,
} from './wasser.js';
import { genugFuerKriterien, kriterien } from './kriterien.js';
import {
  DAUER_VORSCHLAEGE, VERSUCH_URTEIL, betrifft, ergebnis, phase, versuchStand,
  vorschlaege,
} from './versuch.js';
import { ANSPRECHEN_URTEIL, befund, mittelBilanz } from './ansprechen.js';
import { luecken } from './luecken.js';
import { vergleichBalken, verlaufTafel } from './chart.js';
import { arztBericht, berichtName } from './bericht.js';
import {
  ADHS_MITTEL, MITTEL_WISSEN, MPH_FORMEN, REIZSTOFFE, SONSTIGE_MITTEL, WEITERE_MITTEL,
  formAusName, istAdhsMittel, mphForm, wissenZu,
} from './mittel.js';
import {
  SAEURE_WAHL, WECHSEL_TAGE, formZu, istSaeureMittel, mphRueckfragen, rueckfrageSchluessel, wechselHinweise,
} from './zusammen.js';
import {
  ESSEN_GILT_MIN, PAUSE_GRUENDE, a2ZuWenig, adhsAuswertung, adhsEinnahmen, ausloeserNahAmMittel,
  ausloeserNahSatz, essenZurEinnahme, istStimulans, zeitprofilNahAmMittel,
} from './adhs.js';
import { V3_IDS, spannungAuswertung } from './spannung.js';
import { grenzeText, hatUrteil } from './vergleich.js';
import {
  belastbar, heutigerStand, mittlereLaenge, phasenBilanz, phasenName, schwankung,
} from './zyklus.js';
import { WARNZEICHEN, bildLesen, genugFuerBild } from './bild.js';
import {
  KOPF_ARTEN, KOPF_DAUER, KOPF_SEITE, KOPF_VERLAUF, MITTEL_WIRKUNG, aufwachZahlen, bauchAnKopfTagen,
  bauchAnKopfTagenSatz, chronischSatz, kopfArtName, kopfDauerName, kopfFragen,
  kopfMittel, kopfMonate, kopfNachPhase, kopfTageVon, kopfUmPeriode, kopfUmstaende,
  kopfVerlaufKurz, kopfZahlen, mittelWirkungName, nachwirkungSatz, nsarNachwirkung,
  sortenText, statusSatz, uebergebrauchSatz, umPeriodeSatz, umstaendeSaetze,
  unauffaelligeVergleiche, UNBEKANNT,
} from './kopf.js';
import { freischaltung, naechsteSchwelle } from './anfang.js';
import {
  KALENDER_NAME, ZEIT_VORSCHLAEGE, erinnerungsTermin, terminEintrag,
} from './kalender.js';
import { fragenVorschlagen } from './unterleib.js';
import { haeltStand, SCHICHT_WORT } from './schichten.js';
import {
  FENSTER, KEIN_ORT, fensterWerte, spaeteFunde, zeitBild, zeitProfil,
} from './zeitprofil.js';
import { phasenUrteil, wechselnde } from './wechselwirkung.js';
import { wasSacheIst } from './lage.js';
import { spielraumSatz, zufallsSpielraum } from './zufall.js';
import { dosisBild, DOSIS_WORT } from './dosis.js';
import { gewichtsBild, GEWICHT_WORT } from './gewicht.js';
import {
  NICHT_BEI_ALLERGIE, PRUEFBAR, naechsterSchritt, provokationsBild,
} from './provokation.js';
import {
  FODMAP_GRUPPEN, GRUPPE_VON, KARENZ_VORSCHLAEGE, STUFE_TAGE, planBild,
} from './stufenplan.js';
import { BEREICH_ICON, BEREICH_NAME, raete } from './rat.js';
import { UEBUNGEN, ablauf, dauerText, gesamtDauer, uebungVon } from './atem.js';
import { KLAENGE, ruettel, weckKlang } from './klang.js';
import { wachHalten, wachLoslassen } from './wach.js';
import { schicken } from './briefkasten.js';
import {
  KUECHEN_ARTEN, widersprechendeFunde, widerspruchsSatz,
} from './kueche.js';
import { BEFUNDE, BEFUND_VON, geklaert, kriterienVorbehalt } from './befunde.js';
import {
  AKTIVITAETEN, AKTIV_KOPF_MINDEST, AKTIV_KOPF_STUNDEN, GEGENMITTEL_VORBEHALT, INTENSITAETEN, MASSAGE_HINWEIS,
  aktivBauchSatz, aktivKopfSatz, aktivitaetBilanz, aktivitaetHaeufigkeit, aktivitaetText, aktivitaetVon,
  aktivitaetName, bewegungSatz, eingebauteGleichnamig, freieAktivitaetId, intensitaetName, sichtbareEigene,
  zuletztAktivitaeten,
} from './aktivitaet.js';

const viewEl = document.getElementById('view');
const tabbarEl = document.getElementById('tabbar');
const toastEl = document.getElementById('toast');

const REITER = [
  { id: 'heute', name: 'Tag', icon: '📓' },
  { id: 'verlauf', name: 'Verlauf', icon: '📅' },
  { id: 'muster', name: 'Muster', icon: '🔍' },
  { id: 'ruhe', name: 'Ruhe', icon: '🌬️' },
  { id: 'ideen', name: 'Ideen', icon: '💡' },
  { id: 'mehr', name: 'Mehr', icon: '⚙️' },
];

const THEMEN = [
  { id: 'rosa', name: 'Rosé' },
  { id: 'flieder', name: 'Flieder' },
  { id: 'koralle', name: 'Koralle' },
  { id: 'salbei', name: 'Salbei' },
];

/*
 * Flüchtiger Zustand: der angesehene Tag, der offene Bogen, der erzeugte
 * Bericht. Bewusst nicht im Speicher – wer die App morgen wieder aufmacht,
 * will beim heutigen Tag anfangen und nicht dort, wo er zuletzt geblättert
 * hat.
 */
const ui = {
  tag: heuteISO(),
  monat: monatsStart(heuteISO()),
  zeitraum: 30,
  bogen: null,      // { art, id, entwurf } – der offene Eingabebogen
  bericht: null,    // erzeugter Berichtstext, solange er angezeigt wird
  // Die Sicherung als Text, solange sie offen steht. Sie gibt es zusätzlich
  // zur Datei, weil ein Herunterladen nicht überall geht: eingebettete
  // Ansichten, der Browser in einer Messenger-App, manche Verwaltungsgeräte.
  // Dort wäre die einzige Kopie, die es je geben wird, sonst nicht erreichbar.
  sicherung: null,
  /*
   * Bleibt die Küchenliste beim Neuzeichnen offen?
   *
   * Klingt nach Kosmetik und war ein echter Bedienfehler: Die Karte klappt
   * zu, sobald etwas darin steht – richtig beim Öffnen der App, falsch direkt
   * nach einem Eintrag. Wer zwei Sachen hintereinander notieren wollte, musste
   * nach jeder wieder aufklappen, weil mit der Klappe auch das Eingabefeld
   * verschwand. Beim ersten Testlauf aufgefallen, nicht beim Lesen.
   */
  kuecheOffen: false,
  // Steht die Passwortabfrage offen, und was ist eingetippt? Das Passwort
  // steht nur hier und nirgends sonst: im Speicher abgelegt wäre es dasselbe,
  // als läge die Sicherung wieder offen da.
  schloss: false,
  tresorWort: '',
  // Der eingefügte Text einer Sicherung – siehe einfuegeKarte().
  einfuegen: null,
  // Hat der Browser zugesagt, diesen Speicher nicht wegzuräumen? null heißt
  // „weiß man nicht", und das wird auch so angezeigt statt beruhigt.
  speicher: null,
  mittel: false,    // steht die ganze Mittelübersicht offen?
  // Die laufende Atemübung: { schritte, i, bisMs, uhr, wecker }. Nicht im
  // Speicher – eine Übung, die beim nächsten Öffnen weiterliefe, wäre keine.
  atem: null,
  // Was im Ideenfeld steht, solange es noch nicht eingetragen ist.
  ideeEntwurf: '',
  // Das Ergebnis eines Umzugs aus Safari, solange die Karte dazu offen ist:
  // { anzahl, vorher, zusammengefuehrt, letzter }.
  umzug: null,
  // Die Fassung, die gerade läuft: { version, stand } oder null, und wann
  // zuletzt nach einer neueren gesucht wurde (ms seit 1970).
  fassung: null,
  gesucht: Date.now(),   // Beim Laden sieht der Browser selbst nach.
  // Flüchtige Schalter rund um den Umzug: Hinweis für diese Sitzung
  // weggetippt, Angebot zum Holen abgelehnt, gerade in Safari kopiert, und
  // das Einfügefeld ist für einen Umzug offen (anderer Hinweistext).
  startbildschirmZu: false,
  umzugHolenZu: false,
  umzugKopiert: false,
  einfuegenUmzug: false,
  // Steht unter „Mehr" gerade die Anleitung (Home-Bildschirm und Sichern)?
  // Flüchtig: Wer „Mehr" antippt, landet wieder auf „Mehr".
  anleitung: false,
  // Das offene Formular in der Karte „Meine Mittel" unter „Mehr":
  // { id, mittel, dosis, tageszeit, bezug }, id null für ein neues.
  mittelForm: null,
  // Welcher Löschknopf gerade „Löschen?" fragt, als '<act>:<id>' – siehe
  // zweiterTipp(). Flüchtig: Eine Frage, die einen Neustart überlebt, wäre
  // eine, auf die man nach Tagen versehentlich antwortet.
  loeschFrage: null,
  // Was zuletzt gelöscht wurde, für „Rückgängig":
  // { eintraege: [wie vorher], nachher: { id: wie direkt nach dem Löschen } }.
  geloescht: null,
  // Was zuletzt unter „Meine Mittel" oder „Eigene Aktivitäten" entfernt
  // wurde, für „Rückgängig": { art: 'mittel', weg } oder { art: 'aktiv', id }.
  entfernt: null,
  // Welcher Tag „heute" war, als die App zuletzt verlassen wurde, und ob
  // „Tag" dort stand: { heute, standDort } – siehe tagNachRueckkehr().
  // Flüchtig wie der Tag selbst.
  heuteBeimVerlassen: null,
  // Der Tag, an dem zuletzt „Heute keins" getippt wurde, für „Rückgängig".
  pauseZurueck: null,
  /*
   * Die Rückfrage zu Methylphenidat mitten in einem Schritt, der nicht aus
   * dem Speicher folgt: { schluessel, schritt: 'merken'|'welches'|'pruefen',
   * am, einnahme?, form?, eigen? } – siehe rueckfrageHeute(). Flüchtig: Nach
   * einem Neustart fragt die Karte wieder, was offen ist. `am` ist der Tag,
   * an dem der Schritt begann; er gilt nur an diesem Tag (rueckfrageSchritt).
   */
  rueckfrage: null,
  // Kurz nach einer Antwort auf „Tag" zählt kein Tipp – siehe nachtippSperren():
  // false, 'inhalt' (ganz #view) oder 'karte' (nur in der Rückfrage und der Karte „Neu").
  nachtipp: false,
  // Was das letzte Zeichnen von „Tag" als gezeigt meldet, bis es gestempelt
  // ist – siehe gezeigtStempeln().
  gezeigt: null,
};

/*
 * Wie viele Vorgänge gerade laufen, die ein Neuladen abbrechen würde: ein
 * Versand, eine Verschlüsselung, ein Einlesen, ein Teilen-Blatt. Solange die
 * Zahl über null steht, lädt die App nicht von selbst neu – siehe inArbeit().
 */
let beschaeftigt = 0;

/*
 * Wer bediente diese Seite beim Laden?
 *
 * Hier oben und nicht später, weil es auf den Augenblick ankommt: Beim
 * allerersten Besuch übernimmt der Service Worker die Seite per
 * clients.claim(), und das löst dasselbe Ereignis aus wie eine neue Fassung
 * (controllerchange). Wer das nicht auseinanderhält, lädt jede Seite beim
 * ersten Besuch einmal neu – und jeder Test, der gerade etwas in den Speicher
 * schreibt, läuft in dieses Neuladen hinein.
 */
const SW_DA = 'serviceWorker' in navigator && location.protocol.startsWith('http');
const startController = SW_DA ? navigator.serviceWorker.controller : null;
const NEULADEN_MERK = 'bauchbuch.neugeladen';
// Unter diesem Schlüssel steht nach einem Neuladen, wo sie gerade war.
const NACH_NEULADEN = 'bauchbuch.nachNeuladen';
let bereit = null;          // { version, stand } einer neuen Fassung, die wartet
let angefasst = false;      // seit dem Start oder der Rückkehr berührt?
// „Nach neuer Fassung suchen" getippt: Bis zu diesem Zeitpunkt darf sie
// auch unter den Fingern neu laden. Ein Zeitfenster und kein Schalter – ein
// Schalter bliebe nach einer Suche ohne Fund an, und die nächste Fassung
// käme mitten beim Lesen.
let ausdruecklichBis = 0;

/*
 * Auf den Startbildschirm – als App, nicht als Lesezeichen.
 *
 * Android meldet über 'beforeinstallprompt', dass die Seite installierbar ist,
 * und lässt den Dialog *einmal* über dieses Ereignis auslösen. Ohne das liegt
 * die Installation im Browsermenü unter einem Punkt, den niemand sucht – und
 * eine App, die man nicht findet, wird nicht benutzt.
 *
 * Safari kennt das Ereignis nicht; dort geht es nur von Hand über „Teilen".
 * Deshalb steht dort ein Satz statt eines Knopfes.
 */
let installEreignis = null;

function laeuftAlsApp() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

/**
 * Was für ein Gerät, und in welchem Browser.
 *
 * Drei Fallen, die alle schon jemanden die falsche Anleitung lesen ließen:
 *
 *   * Safari unter iOS 26 meldet in der Kennung eine eingefrorene
 *     Systemversion („iPhone OS 18_6"). Verlässlich ist nur „Version/26".
 *   * Ein iPad meldet sich in Safari als Mac. Nur die Berührungspunkte
 *     verraten es.
 *   * Wer den Link aus einer Nachricht oder aus Instagram öffnet, landet im
 *     eingebauten Browser dieser App. Dort gibt es kein „Zum Home-Bildschirm".
 */
function geraet() {
  const ua = navigator.userAgent || '';
  const ipad = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipad;
  const inApp = /FBAN|FBAV|Instagram|GSA\/|Line\/|WhatsApp|Snapchat|TikTok/i.test(ua);
  const anderer = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  // Safari auf dem Mac: dieselbe Kennung wie das iPad, nur ohne Berührung.
  // Chrome und Firefox auf dem Mac tragen kein „Version/".
  const mac = /Macintosh/.test(ua) && !ipad && /Version\/\d+/.test(ua) && /Safari\//.test(ua);
  return {
    ios,
    ipad,
    mac,
    inApp,
    anderer,
    version: Number((/Version\/(\d+)/.exec(ua) || [])[1]) || 0,
  };
}

const istApfel = () => geraet().ios;

/*
 * Apple schreibt im Teilen-Menü „Zum Home-Bildschirm", Android
 * „Startbildschirm". Wer den Satz in der App liest und dann das Menü sucht,
 * soll dasselbe Wort finden.
 */
const heim = () => (istApfel() ? 'Home-Bildschirm' : 'Startbildschirm');
const geraetName = (g) => (g.ipad ? 'iPad' : 'iPhone');

/*
 * Wo das Tagebuch liegt, in Worten – und das passende Fürwort dazu: „ihr
 * Speicher" gehört zur App, „sein Speicher" zum Browser. Auf dem iPhone heißt
 * Safari auch Safari; Chrome und eingebaute Browser bleiben „dieser Browser".
 */
function speicherOrt() {
  const g = geraet();
  if (laeuftAlsApp()) return { wo: 'auf diesem Gerät, in dieser App', wessen: 'ihr' };
  if (g.ios && !g.anderer && !g.inApp) return { wo: 'hier in Safari', wessen: 'dieser' };
  return { wo: 'in diesem Browser', wessen: 'sein' };
}

/** Die Schritte auf den Startbildschirm, passend zum Gerät. */
function anleitung(g) {
  const liste = (punkte) => `<ol class="schritte">${punkte.map((x) => `<li>${x}</li>`).join('')}</ol>`;
  if (g.inApp) {
    return `<p class="klein">Du hast Body Check gerade in einer anderen App geöffnet,
      zum Beispiel aus einer Nachricht. Von dort geht es nicht auf den
      Home-Bildschirm. Öffne Body Check in Safari: Tippe auf <b>•••</b> und dann auf
      <b>In Safari öffnen</b>. Siehst du stattdessen ein Kompass-Symbol, tippe
      darauf.</p>`;
  }
  if (g.anderer) {
    return liste([
      'Oben rechts auf das <b>Teilen</b>-Symbol tippen (Quadrat mit Pfeil nach oben).',
      'Auf <b>Zum Home-Bildschirm</b> tippen, dann auf <b>Hinzufügen</b>.',
    ]);
  }
  // Safari auf dem iPad hat keine Leiste unten; dort sitzt alles oben.
  if (g.version >= 26 && g.ipad) {
    return liste([
      'Oben rechts auf das <b>Teilen</b>-Symbol tippen (Quadrat mit Pfeil nach oben). Ist es nicht zu sehen, zuerst auf <b>•••</b> neben der Adresse.',
      'In der Liste <b>Zum Home-Bildschirm</b> antippen. Steht es nicht da, ganz unten auf <b>Aktionen bearbeiten</b> tippen und es hinzufügen.',
      'Der Schalter <b>Als Web-App öffnen</b> muss an sein (grün). Dann auf <b>Hinzufügen</b> tippen.',
    ]);
  }
  /*
   * Unter iOS 26 sitzt das Teilen-Symbol je nach Leiste mal direkt unten,
   * mal hinter „•••". Der Schalter „Als Web-App öffnen" ist an, wenn er grün
   * ist – „eingeschaltet lassen" setzte voraus, dass er es schon ist.
   */
  if (g.version >= 26) {
    return liste([
      'Tippe unten rechts neben der Adresse auf <b>•••</b> und dann auf <b>Teilen</b>. Siehst du unten gleich das <b>Teilen</b>-Symbol (Quadrat mit Pfeil nach oben), tippe direkt darauf.',
      'Weiter unten in der Liste steht <b>Zum Home-Bildschirm</b>. Tippe darauf. Steht es nicht da, tippe ganz unten auf <b>Aktionen bearbeiten</b> und füge es hinzu.',
      'Der Schalter <b>Als Web-App öffnen</b> muss an sein (grün). Dann tippe auf <b>Hinzufügen</b>.',
    ]);
  }
  return liste([
    `${g.ipad ? 'Oben' : 'Unten'} auf das <b>Teilen</b>-Symbol tippen (Quadrat mit Pfeil nach oben).`,
    'In der Liste <b>Zum Home-Bildschirm</b> suchen und antippen.',
    'Oben rechts auf <b>Hinzufügen</b>.',
  ]);
}

const datumKurz = (iso) => {
  const [, m, d] = String(iso || '').split('-');
  return d && m ? `${Number(d)}.${Number(m)}.` : '';
};

/** „der letzte vom 27.10. um 19:30" – zum Vergleichen beider Seiten. */
function letzterText(letzter) {
  if (!letzter) return 'noch kein Eintrag';
  return `der letzte vom ${datumKurz(letzter.am)}${letzter.um ? ` um ${letzter.um}` : ''}`;
}

/**
 * Die Karte „Auf den Startbildschirm".
 *
 * Auf dem iPhone ist das nicht nur Bequemlichkeit. Safari darf gespeicherte
 * Daten einer Seite löschen, die an sieben Tagen mit Safari nicht benutzt
 * wurde; eine App auf dem Home-Bildschirm ist davon ausgenommen (WebKit,
 * „Full Third-Party Cookie Blocking and More", 2020). Nur fängt sie mit einem
 * eigenen, leeren Speicher an – wer schon eingetragen hat, muss seine
 * Einträge mitnehmen, und zwar *bevor* er umzieht. Deshalb steht das hier
 * vorn und nicht in einer Fußnote.
 *
 * `ort` ist 'tag' (der wegklickbare Hinweis oben auf dem Tag-Reiter) oder
 * 'mehr' (dauerhaft unter „Mehr").
 */
function startbildschirmKarte(s, ort) {
  const g = geraet();
  if (laeuftAlsApp()) {
    if (ort !== 'mehr') return '';
    /*
     * Auf Apple-Geräten hat jedes Symbol seinen eigenen Speicher. Wer es
     * löscht oder ein zweites anlegt, steht vor einem leeren Tagebuch – das
     * ist der eine Fehler, den man hier noch machen kann. „Wahrscheinlich":
     * Ob iOS die Daten dabei wirklich löscht oder nur unerreichbar liegen
     * lässt, ist nirgends dokumentiert; für sie läuft es aufs Gleiche hinaus.
     */
    return `<div class="karte">
      <h3>Läuft als App</h3>
      <p class="klein">Body Check liegt auf deinem ${heim()}. Die App öffnet
      sich ohne Browserleiste, läuft ohne Netz und holt neue Fassungen von
      selbst. Was du hier einträgst, steht in dieser App – nicht in Safari.</p>
      ${istApfel() ? `<p class="klein"><b>Lösch das Body-Check-Symbol nicht</b>${s.alterName
    ? ', auch wenn es noch den alten Namen „Bauchbuch“ trägt' : ''}.
      Sonst sind deine Einträge wahrscheinlich weg. Und leg es nicht ein
      zweites Mal an: Ein zweites Symbol hat deine Einträge nicht.</p>` : ''}
    </div>`;
  }
  if (installEreignis) {
    return `<div class="karte karte-merk">
      <h3>Auf den Startbildschirm</h3>
      <p class="klein">Dann liegt Body Check als eigenes Symbol zwischen deinen
      Apps, öffnet sich ohne Browserleiste und startet auch ohne Netz.</p>
      ${knopf('installieren', 'Installieren', 'btn-primary btn-block')}
    </div>`;
  }
  if (g.mac && g.version >= 17) {
    if (ort !== 'mehr') return '';
    return `<div class="karte">
      <h3>Ins Dock</h3>
      <p class="klein">In Safari oben in der Menüleiste <b>Ablage › Zum Dock hinzufügen</b>
      wählen. Danach öffnet sich Body Check wie ein eigenes Programm, mit
      eigenem Speicher – getrennt von dem in Safari.</p>
    </div>`;
  }
  if (!g.ios) {
    if (ort !== 'mehr') return '';
    return `<div class="karte">
      <h3>Auf den Startbildschirm</h3>
      <p class="klein">Im Browsermenü (die drei Punkte) auf <b>App installieren</b>
      oder <b>Zum Startbildschirm hinzufügen</b>. Danach liegt Body Check als
      eigenes Symbol zwischen deinen Apps.</p>
    </div>`;
  }
  if (ort === 'tag' && (s.startbildschirmWeg || ui.startbildschirmZu || s.umzug)) return '';

  const hatDaten = !store.istLeer();
  const mitnehmen = hatDaten ? `
    <p class="klein"><b>Wichtig: Die App auf dem Home-Bildschirm fängt leer an.</b>
    Sie hat ihren eigenen Speicher, getrennt von Safari. Nimm deine Einträge
    vorher mit – das dauert einen Tipp.</p>
    ${s.umzug
    ? `<p class="klein">Mitgenommen am ${datumKurz(s.umzug.am)}:
       ${mehrzahl(s.umzug.anzahl, 'Eintrag', 'Einträge')}, ${letzterText(s.umzug.letzter)}.
       Jetzt Body Check auf den Home-Bildschirm legen, dort öffnen und auf
       <b>Einträge aus Safari holen</b> tippen.</p>
       <p class="klein">Bis dahin liegt dein Tagebuch in der Zwischenablage.
       Kopier in der Zwischenzeit nichts anderes.</p>`
    : ''}
    <div class="reihe">${knopf('umzug-mitnehmen', s.umzug ? 'Nochmal mitnehmen' : '1. Einträge mitnehmen', 'btn-primary')}</div>` : '';

  /*
   * Die Sieben-Tage-Regel gilt für Safari, belegt vom WebKit-Team: gezählt
   * werden Tage, an denen Safari benutzt wurde, und „kann löschen", nicht
   * „löscht". Für Chrome und Co. auf dem iPhone ist sie nicht belegt, also
   * steht sie dort nicht.
   */
  const ding = geraetName(g);
  return `<div class="karte karte-merk">
    <h3>Als App auf den Home-Bildschirm</h3>
    <p class="klein">Dann öffnet sich Body Check mit einem Tipp wie eine App.${g.anderer ? '' : ` Und:
    In Safari kann dein ${ding} deine Einträge löschen, wenn du Body Check eine
    Weile nicht benutzt – im ungünstigsten Fall schon nach sieben Tagen, an
    denen du Safari benutzt hast. Als App auf dem Home-Bildschirm passiert das
    nicht.`}</p>
    ${mitnehmen}
    ${g.inApp ? '' : hatDaten
    ? `<p class="klein"><b>2. Body Check auf den Home-Bildschirm legen.</b>
      Liegt die App dort schon (vielleicht noch unter dem alten Namen
      „Bauchbuch“), lass diesen Schritt aus – ein zweites Symbol hat deine
      Einträge nicht.</p>`
    // Die Frage vor die Schritte: Wer Schritt für Schritt abarbeitet, legt
    // sonst das zweite Symbol an, bevor er sie liest. Den alten Namen nennt
    // sie, weil ein Symbol von vor der Umbenennung ihn behält.
    : `<p class="klein"><b>Liegt Body Check schon auf deinem Home-Bildschirm?</b>
      Vielleicht noch unter dem alten Namen „Bauchbuch“? Dann öffne die App
      dort und leg sie nicht noch einmal an – ein zweites Symbol hat deine
      Einträge nicht.</p>`}
    ${anleitung(g)}
    ${g.inApp ? '' : hatDaten
    ? `<p class="klein"><b>Zum Schluss:</b> Öffne Body Check über das Symbol auf
      deinem Home-Bildschirm und tippe dort auf <b>Einträge aus Safari holen</b>.
      Benutzt du die App schon, steht der Knopf unter „Mehr“ › „Sicherung“ und
      heißt <b>Aus Safari holen</b>.</p>`
    : '<p class="klein">Danach öffnest du Body Check nur noch über das neue Symbol auf deinem Home-Bildschirm.</p>'}
    ${ort === 'tag' ? `<div class="reihe">
      ${knopf('startbildschirm-spaeter', 'Später', 'btn-ghost')}
      ${knopf('startbildschirm-weg', 'Nicht mehr zeigen', 'btn-ghost')}
    </div>` : ''}
  </div>`;
}

/**
 * Einmal, auf „Tag": Bauchbuch heißt jetzt Body Check.
 *
 * Nur in der App auf iPhone und iPad, und nur, wenn ihr Speicher von vor der
 * Umbenennung stammt. Ihr Symbol heißt weiter „Bauchbuch": iOS übernimmt den
 * Namen beim Hinzufügen und fragt danach nie wieder. Ob es auch das alte Bild
 * behält, ist nicht dokumentiert – wahrscheinlich ja. Wer den neuen Namen
 * sehen will, legt sonst ein zweites Symbol an, das leer anfängt, und löscht
 * danach womöglich das alte, in dem die Einträge stehen.
 */
function alterNameKarte(s) {
  if (s.alterName !== 'offen' || !laeuftAlsApp() || !istApfel()) return '';
  return `<div class="karte karte-merk">
    <h3>Bauchbuch heißt jetzt Body Check</h3>
    <p class="klein">Deine Einträge sind alle da. Auf deinem ${heim()}
    heißt das Symbol weiter „Bauchbuch“ und zeigt wahrscheinlich das alte
    Bild. Das bleibt so, und das ist richtig so.</p>
    <p class="klein"><b>Lösch es nicht und leg kein neues an.</b> Ein neues
    Symbol fängt leer an – deine Einträge stehen in diesem.</p>
    <div class="reihe">${knopf('alter-name-weg', 'Verstanden', 'btn-primary')}</div>
  </div>`;
}

/** Die alte Karte unter „Mehr" – jetzt dieselbe wie oben. */
const installKarte = () => startbildschirmKarte(store.zustandLesen(), 'mehr');

/**
 * In Safari, nachdem mitgenommen wurde: auf jedem Reiter oben.
 *
 * Links aus Nachrichten und Mails öffnen auf dem iPhone immer Safari, nie die
 * App auf dem Startbildschirm. Ohne diesen Hinweis wird früher oder später an
 * zwei Orten eingetragen – und keiner der beiden ist dann vollständig.
 */
function umzugHinweis(s, tab) {
  if (!s.umzug || laeuftAlsApp()) return '';
  // Gemessen an den Kennungen von damals: Wer einen Eintrag löscht und einen
  // neuen anlegt, hat trotzdem einen neuen. Ältere Vermerke ohne Kennungen
  // fallen auf den Längenvergleich zurück.
  const damals = Array.isArray(s.umzug.ids) ? new Set(s.umzug.ids) : null;
  const seitdem = damals
    ? s.eintraege.filter((x) => !damals.has(x.id)).length
    : Math.max(0, s.eintraege.length - (s.umzug.anzahl || 0));
  /*
   * Und was nicht im Strang steht, beim Holen aber mitkommt: Wasser (die
   * größere Zahl gewinnt), neue eigene Mittel und Aktivitäten. Ein Tipp aufs
   * Glas in Safari liegt nahe – Links öffnen auf dem iPhone dort. Ein Vermerk
   * aus der Zeit vor dem Wasser hat kein Feld dafür; dann zählt jedes Glas,
   * denn damals gab es keins.
   */
  const wasserDamals = s.umzug.wasser || {};
  const wasserTage = Object.keys(s.tage || {})
    .filter((iso) => wasserVon(s.tage[iso]) > (Number(wasserDamals[iso]) || 0)).length;
  const neuMittel = Array.isArray(s.umzug.mittel)
    ? s.standardMittel.filter((m) => !s.umzug.mittel.includes(m.id)).length : 0;
  const neuAktiv = Array.isArray(s.umzug.aktiv)
    ? (s.eigeneAktivitaeten || []).filter((a) => !s.umzug.aktiv.includes(a.id)).length : 0;
  const sonst = [
    wasserTage ? `an ${mehrzahl(wasserTage, 'Tag', 'Tagen')} Wasser gezählt` : '',
    neuMittel ? `${mehrzahl(neuMittel, 'eigenes Mittel', 'eigene Mittel')} angelegt` : '',
    neuAktiv ? `${mehrzahl(neuAktiv, 'eigene Aktivität', 'eigene Aktivitäten')} angelegt` : '',
  ].filter(Boolean);
  const sonstText = sonst.length > 1 ? `${sonst.slice(0, -1).join(', ')} und ${sonst[sonst.length - 1]}` : sonst[0];
  const eintragText = seitdem === 1 ? 'steht hier 1 neuer Eintrag' : `stehen hier ${seitdem} neue Einträge`;
  // „Seitdem hast du …" allein, sonst „…, und du hast …" – die Wortstellung
  // hängt daran, was vorne steht.
  const neuText = seitdem
    ? `${eintragText}${sonst.length ? `, und du hast hier ${sonstText}` : ''}`
    : (sonst.length ? `hast du hier ${sonstText}` : '');
  const voll = tab === 'heute';
  return `<div class="karte karte-merk">
    <h3>Mitgenommen am ${datumKurz(s.umzug.am)}</h3>
    <p class="klein">${mehrzahl(s.umzug.anzahl, 'Eintrag', 'Einträge')},
    ${letzterText(s.umzug.letzter)}. <b>Trag ab jetzt bitte nur noch in der
    App auf dem Home-Bildschirm ein.</b> Was du hier in Safari einträgst,
    kommt dort nicht an.</p>
    ${neuText ? `<p class="klein"><b>Seitdem ${neuText}.</b>
      Nimm noch einmal mit und hol es in der App unter „Mehr" › „Aus Safari
      holen" – Doppeltes erkennt sie. Was du hier an schon
      mitgenommenen Einträgen änderst, kommt dabei nicht mit; dort gilt der
      Stand der App.</p>
      <div class="reihe">${knopf('umzug-mitnehmen', 'Nochmal mitnehmen', 'btn-primary')}</div>` : ''}
    ${voll ? `<details${ui.umzugKopiert ? ' open' : ''}>
      <summary>So kommt Body Check auf den Home-Bildschirm</summary>
      ${anleitung(geraet())}
      <p class="klein">Dann Body Check über das neue Symbol öffnen und auf
      <b>Einträge aus Safari holen</b> tippen. Bis dahin liegt dein Tagebuch
      in der Zwischenablage – kopier in
      der Zwischenzeit nichts anderes.</p>
    </details>` : ''}
  </div>`;
}

/**
 * In der App, solange sie leer ist: das Angebot, aus Safari zu holen.
 *
 * Steht auch auf der Begrüßung (willkommen()), denn dort landet eine frisch
 * hinzugefügte App – ohne Reiter, und eine Karte auf „Tag" sähe sie erst
 * nach „Anfangen".
 */
function umzugHolenKarte(s) {
  if (!laeuftAlsApp() || s.umzugGeholt || s.eintraege.length || ui.umzugHolenZu) return '';
  return `<div class="karte karte-merk">
    <h3>Schon in Safari eingetragen?</h3>
    <p class="klein">Diese App hat ihren eigenen Speicher. Wenn du vorher in
    Safari auf <b>Einträge mitnehmen</b> getippt hast, hol sie hier herein.
    Gleich erscheint oben ein kleines Feld <b>Einsetzen</b> – darauf tippen.</p>
    <div class="reihe">
      ${knopf('umzug-holen', 'Einträge holen', 'btn-primary')}
      ${knopf('umzug-holen-nein', 'Nein, ich fange hier neu an', 'btn-ghost')}
    </div>
  </div>`;
}

/** Nach dem Holen: was gekommen ist, und was jetzt zu tun bleibt. */
function umzugErgebnisKarte() {
  const e = ui.umzug;
  if (!e) return '';
  return `<div class="karte karte-merk">
    <h3>Deine Einträge sind da</h3>
    <p class="klein"><b>${mehrzahl(e.anzahl, 'Eintrag', 'Einträge')}</b>,
    ${letzterText(e.letzter)}. In Safari stand beim Mitnehmen dieselbe Zahl.
    ${e.zusammengefuehrt ? `Zusammengeführt mit dem, was hier schon stand (vorher ${e.vorher}).` : ''}</p>
    <p class="klein">Zwei Dinge noch: Dein Tagebuch liegt gerade in der
    Zwischenablage – leer sie. Und sichere einmal als Datei; die Kopie in
    Safari kann nach einiger Zeit von selbst verschwinden.</p>
    <div class="reihe">
      ${knopf('ablage-leeren', 'Zwischenablage leeren', 'btn-primary')}
      ${knopf('export', 'Als Datei sichern')}
    </div>
    <div class="reihe">
      ${knopf('rueckgaengig', 'Rückgängig')}
      ${knopf('umzug-fertig', 'Fertig', 'btn-ghost')}
    </div>
  </div>`;
}

/** Nach erfolgreichem Holen – aus der Zwischenablage oder aus dem Feld. */
function umzugAbschliessen(ergebnis) {
  const s = store.zustandLesen();
  const letzter = s.eintraege[s.eintraege.length - 1] || null;
  store.umzugGeholtMerken();
  store.einstellen('tab', 'heute');
  ui.umzug = { ...ergebnis, letzter: letzter ? { am: letzter.am, um: letzter.um || '' } : null };
  ui.tag = heuteISO();
  melden(`${mehrzahl(ergebnis.anzahl, 'Eintrag', 'Einträge')} geholt.`);
}

/*
 * Wie die Sicherungsdateien heißen. Bis zur Umbenennung hießen sie
 * bauchbuch-…, seitdem body-check-… – in „iCloud Drive“ stehen beide, nach
 * Namen sortiert weit auseinander, und die neueste ist nicht mehr die letzte.
 */
const SICHERUNGSNAMEN = 'Deine Sicherungen heißen „body-check-“ und dann das Datum, ältere noch „bauchbuch-“ und dann das Datum.';

/**
 * Fehler so sagen, dass jemand ohne Technikkenntnis weiß, was zu tun ist.
 * Eine rohe Meldung wie „Unexpected token 'H'" hilft niemandem.
 *
 * `ausDatei`: Die Datei kam über „Datei einlesen“. Dann hilft der Dateiname
 * beim nächsten Versuch.
 */
function lesbarerFehler(fehler, ausDatei = false) {
  const m = String(fehler && fehler.message || fehler || '');
  if (/JSON|Unexpected|token|eintraege/i.test(m)) {
    if (ui.einfuegenUmzug) {
      return 'Das ist keine Body-Check-Sicherung. Öffne Body Check in Safari, tippe dort auf „Einträge mitnehmen" und komm dann hierher zurück.';
    }
    // Ohne den Namen der App: Die Sicherungen von vor der Umbenennung
    // heißen bauchbuch-…, und „keine Body-Check-Sicherung" läse sich bei
    // einer beschädigten davon wie „die alten gehen hier nicht".
    return `Ging nicht: Das ist keine Sicherung, oder sie ist beschädigt.${ausDatei ? ` ${SICHERUNGSNAMEN}` : ''}`;
  }
  return `Ging nicht: ${m}`;
}

let toastUhr = null;
/**
 * Eine Meldung unten über den Reitern – wahlweise mit einem Knopf daneben,
 * `knopf` = { act, text }, etwa „Rückgängig" nach dem Löschen.
 *
 * Mit Knopf steht sie mindestens acht Sekunden: Wer liest „Gelöscht." und
 * merkt, dass es der falsche war, braucht einen Moment, bis der Finger
 * dort ist. Danach verschwindet der Knopf mit der Meldung, damit nichts
 * Unsichtbares antippbar bleibt.
 */
function melden(text, knopf = null) {
  toastEl.textContent = text;
  toastEl.classList.toggle('mit-knopf', !!knopf);
  // Wieder unten und durchlässig – ob sie einem Knopf ausweicht und ob sie
  // Tipps abfängt, entscheidet der Klick-Verteiler (meldungAusweichen,
  // nachtippSperren).
  toastEl.classList.remove('oben', 'deckt');
  meldungNr += 1;
  if (knopf) {
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'toast-knopf';
    k.dataset.act = knopf.act;
    // Woran der Knopf sich richtet, etwa der Eintrag bei „Uhrzeit ändern".
    if (knopf.id) k.dataset.id = knopf.id;
    k.textContent = knopf.text;
    toastEl.append(' ', k);
  }
  toastEl.classList.add('an');
  clearTimeout(toastUhr);
  // Lange Sätze länger stehen lassen: etwa 60 ms je Zeichen, mindestens 2,4 s.
  toastUhr = setTimeout(meldungZu, Math.max(knopf ? 8000 : 2400, String(text).length * 60));
}

/** Die Meldung weg – nach ihrer Zeit, oder auf einen Tipp auf sie (siehe beim Klick-Verteiler). */
function meldungZu() {
  clearTimeout(toastUhr);
  toastEl.classList.remove('an', 'mit-knopf');
  meldungNachlauf(MELDUNG_AUSBLENDEN_MS);
  const k = toastEl.querySelector('button');
  // Hatte der Knopf den Fokus, fiele er mit ihm an den Anfang der Seite –
  // und VoiceOver begänne oben. Er geht dorthin, wo zuletzt etwas geschah.
  const mitFokus = k && document.activeElement === k;
  if (k) k.remove();
  if (mitFokus) fokusAnker();
}

/*
 * Fängt eine Meldung Tipps ab (nach einer Antwort, siehe beim
 * Klick-Verteiler), dann auch noch einen Augenblick danach: während sie
 * ausblendet (css/styles.css, 0,18 s), und nach einem Tipp, der sie schloss,
 * NACHTIPP_MS lang. Sonst ginge der zweite Tipp eines Doppeltipps durch die
 * eben verschwundene Meldung auf den Knopf darunter, den noch niemand
 * gesehen hat – eine Form, die niemand gewählt hat, oder das nur einmal
 * angebotene „Später". In dieser Zeit bewirkt ein Finger auf der Meldung
 * nichts, auch auf einer, die gerade neu erschienen ist.
 */
const MELDUNG_AUSBLENDEN_MS = 250;
let meldungNr = 0;
let meldungRuhe = false;
let meldungRuheUhr = 0;
function meldungNachlauf(ms) {
  meldungRuhe = true;
  toastEl.classList.add('faengt');
  clearTimeout(meldungRuheUhr);
  meldungRuheUhr = setTimeout(() => {
    meldungRuhe = false;
    toastEl.classList.remove('faengt');
  }, ms);
}

/*
 * Eine Meldung ohne Knopf legt sich nicht über den Knopf, der sie eben
 * ausgelöst hat und noch unter dem Finger steht – sie zeigt sich dann oben,
 * wie bei offenem Bogen. Wer zählt („+" und „−" beim Wasser), tippt dieselbe
 * Stelle gleich noch einmal und soll den Knopf dabei sehen.
 * „Derselbe Knopf" heißt: dieselbe Aktion mit denselben Angaben (data-*) an
 * der Stelle des Tipps, nach dem Neuzeichnen. Springt die Karte nach einer
 * Antwort zum nächsten Schritt, steht dort ein anderer Knopf, und die
 * Meldung bleibt unten über dem, was noch niemand gesehen hat. Eine Meldung
 * mit „Rückgängig" bleibt, wo sie war: Ihr Knopf gehört unter den Finger.
 */
const knopfZeichen = (el) => [...el.attributes].filter((a) => a.name.startsWith('data-'))
  .map((a) => `${a.name}=${a.value}`).sort().join('&');
function meldungAusweichen(zeichen, x, y) {
  if (!toastEl.classList.contains('an') || toastEl.classList.contains('mit-knopf')
    || document.body.classList.contains('bogen-auf')) return;
  const k = [...viewEl.querySelectorAll('[data-act]')].find((b) => {
    if (knopfZeichen(b) !== zeichen) return false;
    const r = b.getBoundingClientRect();
    return x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2;
  });
  if (!k) return;
  const r = k.getBoundingClientRect();
  const m = toastEl.getBoundingClientRect();
  // Beim Erscheinen gleitet sie von 12 Pixeln weiter unten herein.
  if (r.left < m.right && m.left < r.right && r.top < m.bottom && m.top - 12 < r.bottom) {
    toastEl.classList.add('oben');
  }
}

/*
 * Der Streifen, in dem man etwas sieht: unter der feststehenden Kopfleiste
 * und über den Reitern. Gemessen, denn mit größerer Schrift bricht die
 * Kopfleiste um, und auf der Begrüßung gibt es keine Reiter.
 */
function sichtStreifen() {
  const leiste = document.querySelector('.topbar');
  const reiter = document.getElementById('tabbar');
  const r = reiter && !reiter.hidden ? reiter.getBoundingClientRect() : null;
  return {
    oben: leiste ? Math.max(0, leiste.getBoundingClientRect().bottom) : 0,
    unten: r && r.height ? Math.min(window.innerHeight, r.top) : window.innerHeight,
  };
}

/**
 * Bevor der Fokus mit preventScroll auf el geht: el ganz in den Streifen
 * holen. Sonst säße er auf etwas unter der Kopfleiste, hinter den Reitern
 * oder außerhalb des Bildes – wer mit dem Auge bedient, sähe den neuen
 * Schritt oder das Feld nicht und tippte blind. Steht el schon ganz da,
 * rollt nichts. Sonst kommt der Anfang dessen, wozu el gehört (anfang, etwa
 * die Karte oder das Formular), unter die Kopfleiste – oder, wäre el dann
 * noch nicht ganz zu sehen, el gerade über die Reiter.
 */
function insBild(el, anfang = el) {
  const { oben, unten } = sichtStreifen();
  const r = el.getBoundingClientRect();
  if (r.top >= oben - 1 && r.bottom <= unten + 1) return;
  const a = (anfang || el).getBoundingClientRect();
  let um = a.top - oben - 8;
  if (r.bottom - um > unten - 8) um = r.bottom - (unten - 8);
  window.scrollTo(0, Math.max(0, window.scrollY + um));
}

/**
 * Das Formular unter „Meine Mittel" ist eben aufgegangen: der Fokus ins
 * Namensfeld. Der Knopf, der es öffnete, ist beim Neuzeichnen verschwunden,
 * und ohne das hier stünde VoiceOver wieder am Anfang der Seite.
 *
 * Das Formular steht unter der Liste der eigenen Mittel. Bei mehreren lag
 * das Feld sonst hinter den Reitern oder unter dem Bildrand, und man tippte
 * blind (insBild).
 */
function mittelFeldFokus() {
  setTimeout(() => {
    const f = document.getElementById('mmName');
    if (!f) return;
    insBild(f, f.closest('.mittel-formular') || f);
    f.focus({ preventScroll: true });
  }, 0);
}

/*
 * Zur Karte „Meine Mittel" unter „Mehr", das Formular für ein neues Mittel
 * gleich offen. Von „Tag" aus über drei Wege: den Satz ohne eigene Mittel,
 * die Karte „Neu" und die Rückfrage bei vollem „Meine Mittel".
 *
 * Unter die feststehende Kopfleiste gerechnet, nicht bloß an den oberen
 * Rand: Dort läge die Überschrift „Meine Mittel" unter ihr, und man sähe
 * ein Formular mitten in einem Text. Gemessen statt geschätzt, denn mit
 * größerer Schrift bricht die Kopfleiste um. Der Fokus geht danach ins
 * Namensfeld – und liegt es dann hinter den Reitern, weil die Liste lang
 * ist, rückt das Formular unter die Kopfleiste (mittelFeldFokus).
 *
 * Mit { formular: false } (die Rückfrage und die Karte „Neu" bei vollem
 * „Meine Mittel") bleibt das Formular zu: Gebraucht wird dort die Liste mit
 * den Knöpfen zum Entfernen und der Satz zum vollen Stand, nicht ein Feld
 * für ein Mittel, das nicht mehr hineinpasst. Der Fokus geht dann auf die
 * Überschrift. Ein offenes Formular zum Ändern eines Mittels bleibt offen.
 */
function meineMittelZeigen({ formular = true } = {}) {
  store.einstellen('tab', 'mehr');
  Object.assign(ui, { bericht: null, sicherung: null, mittel: false, anleitung: false });
  if (formular) ui.mittelForm = { id: null, mittel: '', dosis: '', tageszeit: null, bezug: null };
  else if (ui.mittelForm && !ui.mittelForm.id) ui.mittelForm = null;
  zeichne();
  setTimeout(() => {
    const karte = document.getElementById('meineMittel');
    if (!karte) return;
    const leiste = document.querySelector('.topbar');
    const oben = leiste ? leiste.getBoundingClientRect().bottom : 0;
    window.scrollTo(0, Math.max(0, karte.getBoundingClientRect().top + window.scrollY - oben - 8));
    if (formular) {
      mittelFeldFokus();
      return;
    }
    const titel = karte.querySelector('h3');
    if (!titel) return;
    titel.setAttribute('tabindex', '-1');
    titel.focus({ preventScroll: true });
  }, 0);
}

/** Der Fokus an eine feste Stelle der Seite: den Tag, sonst die Überschrift. */
function fokusAnker() {
  const ziel = document.querySelector('.tag-datum') || viewEl.querySelector('h2, h3');
  if (!ziel) return;
  if (!ziel.matches('input, button, [tabindex]')) ziel.setAttribute('tabindex', '-1');
  ziel.focus({ preventScroll: true });
}

/*
 * Nach einem Löschen oder Entfernen ist der Knopf weg, der den Fokus hatte.
 * Hatte er ihn, geht er auf „Rückgängig" in der Meldung – dorthin, wo man
 * jetzt am ehesten hin will, und nicht an den Anfang der Seite.
 */
function fokusNachEntfernen(hatteFokus) {
  if (!hatteFokus) return;
  setTimeout(() => {
    const k = toastEl.querySelector('.toast-knopf');
    if (k) k.focus();
    else fokusAnker();
  }, 0);
}

/* ==================== Bausteine ==================== */

const knopf = (act, text, klasse = '', extra = '') => `<button type="button" class="btn ${klasse}" data-act="${act}" ${extra}>${text}</button>`;

/*
 * „Meine Mittel" ist voll: wie viele dort stehen und wie viele weg müssen,
 * damit eins dazukommt. Meist ist es eins – mehr als STANDARD_HOECHSTENS
 * lässt das Merken nicht zu. Beim Zusammenführen zweier Stände kürzt der
 * Speicher aber nicht (zusammenfuehren in js/store.js); dann stehen auch 14
 * da. Ein Satz mit „schon 12" und „eins entfernen" führte dann nach dem
 * Entfernen zurück zum selben Satz. Bei genau STANDARD_HOECHSTENS bleibt
 * jeder Satz, wie er war.
 */
const ZAHLWORT = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
function zuVieleMittel(s) {
  const n = s.standardMittel.length;
  const weg = Math.max(1, n - store.STANDARD_HOECHSTENS + 1);
  const wort = ZAHLWORT[weg] || String(weg);
  return { n, mehr: n > store.STANDARD_HOECHSTENS, wort, wieViele: weg === 1 ? 'eins, das' : `${wort}, die` };
}
/** Der Satz auf „Tag" (Rückfrage) und im Bogen. */
function vollSatz(s) {
  const v = zuVieleMittel(s);
  return v.mehr
    ? `Bei deinen Mitteln stehen schon ${v.n} – mehr als ${store.STANDARD_HOECHSTENS} passen nicht. Damit eins
      dazukommt, entferne unter „Mehr“ erst ${v.wieViele} du nicht mehr nimmst.`
    : `Bei deinen Mitteln stehen schon ${store.STANDARD_HOECHSTENS} – mehr passen nicht. Unter „Mehr“ kannst du
      eins entfernen, das du nicht mehr nimmst.`;
}
/** Der Satz unter „Meine Mittel" selbst. */
function vollSatzHier(s) {
  const v = zuVieleMittel(s);
  return v.mehr
    ? `Hier stehen ${v.n} – mehr als ${store.STANDARD_HOECHSTENS} passen nicht. Damit eins dazukommt, entferne
      erst ${v.wieViele} du nicht mehr nimmst.`
    : `Mehr als ${store.STANDARD_HOECHSTENS} passen nicht. Entferne erst eins, das du nicht mehr nimmst.`;
}
/** Die Meldung, wenn ein Merken an der Höchstzahl scheitert. */
function vollMeldung(s) {
  const v = zuVieleMittel(s);
  return `Mehr als ${store.STANDARD_HOECHSTENS} eigene Mittel passen nicht${v.mehr ? `, und es stehen schon ${v.n}` : ''}. `
    + `Entferne erst ${v.wieViele} du nicht mehr nimmst.`;
}
/** Die Meldung nach dem Eintragen, wenn „Als mein Mittel merken" an der Höchstzahl scheitert. */
function vollBeimEintragen(getan) {
  const v = zuVieleMittel(store.zustandLesen());
  return v.mehr
    ? `${getan}. Bei deinen Mitteln ist kein Platz mehr – höchstens ${store.STANDARD_HOECHSTENS}, es stehen schon ${v.n}. `
      + `Damit eins dazukommt, entferne unter „Mehr“ erst ${v.wort}.`
    : `${getan}. Bei deinen Mitteln ist kein Platz mehr – höchstens ${store.STANDARD_HOECHSTENS}. `
      + 'Unter „Mehr“ kannst du eins entfernen.';
}

/** Eine Reihe an- und abwählbarer Marken. */
function marken(liste, gewaehlt, act) {
  return `<div class="marken">${liste.map((m) => `
    <button type="button" class="marke${gewaehlt.includes(m.id) ? ' an' : ''}"
            data-act="${act}" data-id="${esc(m.id)}" aria-pressed="${gewaehlt.includes(m.id)}">
      ${m.icon ? `<span class="marke-i">${m.icon}</span>` : ''}${esc(m.name)}
    </button>`).join('')}</div>`;
}

/** Die Skala von 0 bis 10. Elf Knöpfe statt eines Schiebereglers: Ein Regler
 *  trifft man auf dem Handy nicht genau, und „war es jetzt 6 oder 7" ist
 *  genau die Frage, die eine Eintragung wertlos macht. */
function skala(wert) {
  let raus = '<div class="skala" role="group" aria-label="Stärke von 0 bis 10">';
  for (let i = 0; i <= 10; i++) {
    const stufe = i === 0 ? 'null' : (i >= 7 ? 'hoch' : (i >= 4 ? 'mittel' : 'tief'));
    raus += `<button type="button" class="stufe s-${stufe}${i === wert ? ' an' : ''}"
      data-act="staerke" data-n="${i}" aria-pressed="${i === wert}"
      aria-label="Stärke ${i}: ${STAERKE_WORT[i]}">${i}</button>`;
  }
  return `${raus}</div><p class="skala-wort">${STAERKE_WORT[wert] ?? ''}</p>`;
}

/**
 * Eine Tagesfrage als Reihe von Stufen. `null` heißt: nicht beantwortet.
 *
 * Ein zweites Tippen auf dieselbe Stufe nimmt die Antwort zurück – „ich habe
 * nichts eingetragen" und „ich habe null eingetragen" müssen verschiedene
 * Dinge bleiben, sonst zählt die Auswertung Nichtwissen als Wohlbefinden.
 */
function tagesFrage(frage, wert) {
  return `<p class="feld-name">${esc(frage.name)}</p>
    <div class="vier">${frage.worte.map((w, i) => `
      <button type="button" class="vier-btn${wert === i ? ' an' : ''}"
              data-act="tagfrage" data-id="${frage.id}" data-n="${i}"
              aria-pressed="${wert === i}">${esc(w)}</button>`).join('')}</div>
    ${frage.hinweis ? `<p class="klein frage-hinweis">${esc(frage.hinweis)}</p>` : ''}`;
}

/* ==================== Reiter: Tag ==================== */

// „Kopfschmerz" ist eine eigene Art und keine Beschwerdeart – siehe js/kopf.js,
// warum das kein Geschmack ist, sondern die Bedingung dafür, dass die
// Bauchauswertung stimmt. Die Aktivität ebenso, aus einem verwandten Grund:
// siehe js/aktivitaet.js.
const ART_NAME = {
  essen: 'Mahlzeit', beschwerde: 'Beschwerden', kopf: 'Kopfschmerz', stuhl: 'Stuhlgang',
  medikament: 'Medikament', notiz: 'Notiz', aktivitaet: 'Aktivität',
};
const ART_ICON = {
  essen: '🍽️', beschwerde: '🔥', kopf: '🤕', stuhl: '🚽', medikament: '💊', notiz: '✏️',
  aktivitaet: '🏃',
};

/*
 * „Gym/Krafttraining" ist für den Browser ein einziges Wort. In der schmalen
 * Zeile auf 320 Pixeln bräche er es irgendwo – „Krafttrainin g". Nach dem
 * Schrägstrich darf er stattdessen.
 */
const mitUmbruch = (text) => esc(text).replace(/\//g, '/<wbr>');

function zeileText(e, eigene, eigeneAktiv = []) {
  if (e.art === 'essen') {
    // Die Rolle steht nur dabei, wenn sie nicht die Vorgabe ist – „Kaffee
    // (Haupt)" bei jedem Kaffee wäre Lärm, „Zwiebel (Würze)" ist die Auskunft.
    const zutaten = zutatenVon(e).map((z) => ausloeserName(z.id, eigene)
      + (z.rolle === ROLLE_VORGABE ? '' : ` (${rolleName(z.rolle, true)})`)).join(', ');
    const portion = e.portion && e.portion !== 'normal' ? ` · ${e.portion === 'gross' ? 'große' : 'kleine'} Portion` : '';
    const wo = e.auswaerts === true ? ' · auswärts' : '';
    return `<b>${esc(kuerze(e.was || 'Mahlzeit'))}</b>${portion}${wo}`
      + (zutaten ? `<span class="zeile-tags">${esc(zutaten)}</span>` : '');
  }
  if (e.art === 'beschwerde') {
    const arten = (e.arten || []).map(beschwerdeName).join(', ');
    const bezug = STUHLBEZUG.find((b) => b.id === e.stuhlbezug);
    return `<b>Stärke ${e.staerke} – ${STAERKE_WORT[e.staerke] || ''}</b>`
      + (arten ? `<span class="zeile-tags">${esc(arten)}</span>` : '')
      + (bezug && e.stuhlbezug !== 'keiner' ? `<span class="zeile-tags">Stuhlgang: ${esc(bezug.name.toLowerCase())}</span>` : '')
      + (e.notiz ? `<span class="zeile-tags">${esc(kuerze(e.notiz))}</span>` : '');
  }
  if (e.art === 'stuhl') {
    const zusatz = [e.dringend ? 'dringend' : '', e.unvollstaendig ? 'Gefühl, nicht fertig' : '']
      .filter(Boolean).join(', ');
    return `<b>Typ ${e.form} – ${esc(bristolName(e.form, true))}</b>`
      + (zusatz ? `<span class="zeile-tags">${esc(zusatz)}</span>` : '');
  }
  if (e.art === 'medikament') {
    return `<b>${esc(e.mittel || 'Medikament')}</b>`
      + (e.dosis ? `<span class="zeile-tags">${esc(e.dosis)}</span>` : '');
  }
  if (e.art === 'kopf') {
    const arten = (e.kopfArten || []).map(kopfArtName).join(', ');
    const dazu = [
      kopfDauerName(e.dauer),
      kopfVerlaufKurz(e.verlauf),
      e.mittelWirkung ? `Mittel: ${mittelWirkungName(e.mittelWirkung).toLowerCase()}` : '',
    ].filter(Boolean).join(', ');
    return `<b>Kopfschmerz ${e.staerke} – ${STAERKE_WORT[e.staerke] || ''}</b>`
      + (arten ? `<span class="zeile-tags">${esc(arten)}</span>` : '')
      + (dazu ? `<span class="zeile-tags">${esc(dazu)}</span>` : '')
      + (e.notiz ? `<span class="zeile-tags">${esc(kuerze(e.notiz))}</span>` : '');
  }
  if (e.art === 'aktivitaet') {
    const anstrengend = intensitaetName(e.intensitaet);
    return `<b>${mitUmbruch(kuerze(aktivitaetText(e, eigeneAktiv) || 'Aktivität', 70))}</b>`
      + (anstrengend ? `<span class="zeile-tags">${esc(anstrengend)}</span>` : '')
      + (e.notiz ? `<span class="zeile-tags">${esc(kuerze(e.notiz))}</span>` : '');
  }
  return `<b>${esc(kuerze(e.text || '', 90))}</b>`;
}

/**
 * Eine Zeile in Worten: „Kopfschmerz, Stärke 6, um 14:30".
 *
 * Für VoiceOver und die Tastatur. Dort sagen „›" und „×" nichts, und ein
 * Knopf, der nur „Eintrag löschen" heißt, sagt nicht, welcher – bei sechs
 * Zeilen untereinander ist das die eine Auskunft, auf die es ankommt.
 */
function zeileWorte(e, eigeneAktiv = []) {
  const voll = (x) => String(x || '').trim();
  const was = {
    essen: () => (voll(e.was) ? `„${kuerze(e.was, 40)}“` : ''),
    beschwerde: () => `Stärke ${e.staerke}`,
    kopf: () => `Stärke ${e.staerke}`,
    stuhl: () => (e.form ? `Typ ${e.form}` : ''),
    medikament: () => [voll(e.mittel), voll(e.dosis)].filter(Boolean).join(' '),
    notiz: () => (voll(e.text) ? `„${kuerze(e.text, 40)}“` : ''),
    aktivitaet: () => kuerze(aktivitaetText(e, eigeneAktiv), 40),
  }[e.art];
  const teil = was ? was() : '';
  return `${ART_NAME[e.art] || 'Eintrag'}${teil ? `, ${teil}` : ''}, um ${e.ungefaehr ? 'etwa ' : ''}${e.um}`;
}

/*
 * Löschen mit zwei Tipps.
 *
 * Das × saß bis November 2026 direkt neben dem Text, den man zum Ändern
 * antippt, und löschte beim ersten Tipp – ohne Frage und ohne Weg zurück. Wer
 * einen Eintrag ändern wollte und ein paar Millimeter danebentraf, hatte ihn
 * verloren. Jetzt fragt der erste Tipp („Löschen?"), der zweite löscht, und
 * nach vier Sekunden ohne zweiten Tipp steht wieder das ×.
 *
 * Gefragt wird im Knopf selbst und nicht in einem Dialog: Ein Dialog legt
 * sich über die Zeile, um die es geht, und auf dem iPhone über die halbe
 * Seite. Der Knopf wird dafür an Ort und Stelle umbeschriftet statt neu
 * gezeichnet – sonst ginge der Tastatur und VoiceOver die Stelle verloren,
 * an der sie gerade stehen.
 *
 * Die Knöpfe tragen ihre beiden Beschriftungen selbst: data-normal und
 * data-frage für den Text, data-sagt für das, was VoiceOver ohne Frage liest.
 */
const FRAGE_MS = 4000;
let frageUhr = null;

function loeschKnopf(act, id, { normal, frage, sagt, klasse }) {
  const fragt = ui.loeschFrage === `${act}:${id}`;
  return `<button type="button" class="${klasse}${fragt ? ' frage' : ''}" data-act="${act}"
            data-id="${esc(id)}" data-normal="${esc(normal)}" data-frage="${esc(frage)}"
            data-sagt="${esc(sagt)}"
            aria-label="${esc(fragt ? `${frage} Noch einmal tippen.` : sagt)}">${esc(fragt ? frage : normal)}</button>`;
}

function frageZeigen(k, fragt) {
  k.classList.toggle('frage', fragt);
  k.textContent = fragt ? k.dataset.frage : k.dataset.normal;
  k.setAttribute('aria-label', fragt ? `${k.dataset.frage} Noch einmal tippen.` : k.dataset.sagt);
}

/** Die offene Frage zurücknehmen – am Knopf selbst, ohne neu zu zeichnen. */
function frageEnde() {
  clearTimeout(frageUhr);
  frageUhr = null;
  const offen = ui.loeschFrage;
  ui.loeschFrage = null;
  if (!offen) return;
  const trenner = offen.indexOf(':');
  const act = offen.slice(0, trenner);
  const id = offen.slice(trenner + 1);
  document.querySelectorAll(`[data-act="${act}"]`).forEach((k) => {
    if (k.dataset.id === id) frageZeigen(k, false);
  });
}

/**
 * true beim zweiten Tipp auf denselben Knopf. Beim ersten fragt der Knopf
 * und fällt nach FRAGE_MS von selbst zurück; eine andere offene Frage fällt
 * sofort zurück – gefragt wird immer nur an einer Stelle.
 */
function zweiterTipp(el) {
  const schluessel = `${el.dataset.act}:${el.dataset.id}`;
  if (ui.loeschFrage === schluessel) {
    frageEnde();
    return true;
  }
  frageEnde();
  ui.loeschFrage = schluessel;
  frageZeigen(el, true);
  frageUhr = setTimeout(frageEnde, FRAGE_MS);
  return false;
}

/** Eine Zeile im Tagesstrang: antippen zum Ändern, × zum Löschen. */
function strangZeile(e, s) {
  const worte = zeileWorte(e, s.eigeneAktivitaeten);
  return `<li class="strang-zeile z-${e.art}">
      <span class="strang-uhr"${e.ungefaehr ? ' title="ungefähre Zeit"' : ''}>${e.ungefaehr ? '≈' : ''}${esc(e.um)}</span>
      <span class="strang-punkt" aria-hidden="true">${ART_ICON[e.art]}</span>
      <button type="button" class="strang-text" data-act="bearbeiten" data-id="${esc(e.id)}"
              aria-label="${esc(`${worte} ändern`)}">
        <span class="strang-inhalt">${zeileText(e, s.eigeneAusloeser, s.eigeneAktivitaeten)}${zeitWorte(e)}</span>
        <span class="strang-auf" aria-hidden="true">›</span>
      </button>
      <span class="strang-weg-platz">${loeschKnopf('loeschen', e.id, {
    normal: '×', frage: 'Löschen?', sagt: `${worte} löschen`, klasse: 'strang-weg strang-loeschen',
  })}</span>
    </li>`;
}

function tagAnsicht(s) {
  const iso = ui.tag;
  const liste = s.eintraege.filter((e) => e.am === iso);
  const t = tagesWert(s.eintraege, iso, s.tage);
  const tagInfo = store.tagLesen(iso);
  const kuenftig = tageDazwischen(heuteISO(), iso) > 0;

  const kopf = `<div class="tagkopf">
    ${knopf('tag-blaettern', '‹', 'btn-rund', 'data-d="-1" aria-label="Tag zurück"')}
    <div class="tagkopf-mitte">
      <h2>${esc(fmtTag(iso))}</h2>
      <input type="date" class="tag-datum" data-act="tag-datum" value="${iso}"
             max="${heuteISO()}" aria-label="Datum wählen">
    </div>
    ${knopf('tag-blaettern', '›', 'btn-rund', `data-d="1" ${kuenftig || iso === heuteISO() ? 'disabled' : ''} aria-label="Tag vor"`)}
  </div>`;

  /*
   * Die häufigsten Mahlzeiten als Direkttaste – ein Tipp statt fünf.
   *
   * Der Bogen ist gut, wenn man etwas Neues einträgt. Für den Haferbrei, den
   * sie jeden Morgen isst, ist er fünf Handgriffe für null neue Auskunft. Hier
   * wird derselbe Eintrag mit einem Tipp angelegt, vollständig samt Zutaten,
   * Rollen und Portion, mit der aktuellen Uhrzeit.
   *
   * Das ist keine Bequemlichkeit, sondern der Punkt, an dem Tagebücher
   * sterben: Nicht ein Fehler in der Auswertung bringt sie um, sondern dass
   * nach drei Wochen niemand mehr etwas einträgt. Erst ab zwei Vorkommen –
   * eine Mahlzeit, die es einmal gab, ist keine Gewohnheit.
   *
   * Auch auf vergangenen Tagen, denn wer abends nachträgt, trägt oft gestern
   * nach. Dort trägt der Tipp aber nicht ein, sondern öffnet den Bogen,
   * vorgefüllt: „jetzt" wäre für gestern gelogen, und die Zeit ist mit einem
   * Zeitknopf schnell gewählt.
   */
  const heute = iso === heuteISO();
  const schnell = !kuenftig
    ? haeufigeMahlzeiten(s.eintraege, 12).filter((v) => v.anzahl >= 2).slice(0, 3) : [];
  /*
   * Die eigenen Mittel als Direkttaste – auf jedem Tag, nicht nur heute: Wer
   * abends den ganzen Tag nachträgt, trägt auch gestern nach. Ein Häkchen
   * zeigt, was an diesem Tag schon steht; ein zweiter Tipp legt trotzdem
   * einen zweiten Eintrag an, denn manches wird zweimal am Tag genommen.
   *
   * Ohne gemerktes Mittel steht an dieser Stelle ein Satz, wo das geht – der
   * Weg über den Medikamenten-Bogen ist sonst nur zu finden, wenn man ihn
   * schon kennt.
   */
  const imBogen = s.standardMittel.some((m) => mittelImBogen(m, iso));
  const mittelReihe = kuenftig ? '' : s.standardMittel.length ? `<div class="schnell">
    <p class="feld-name">Meine Mittel – ${imBogen
    ? (s.standardMittel.every((m) => mittelImBogen(m, iso)) ? 'die Zeit wählst du im Bogen'
      : 'ohne übliche Zeit wählst du sie im Bogen')
    : 'ein Tipp trägt ein'}</p>
    <div class="marken marken-eng">${s.standardMittel.map((m) => standardKnopf(m, liste, iso, s.standardMittel, s)).join('')}</div>
  </div>` : `<p class="klein mittel-tipp">Deine täglichen Mittel kannst du einmal unter
    <button type="button" class="link-knopf" data-act="meine-mittel-zeigen">„Mehr“ › „Meine Mittel“</button>
    anlegen – dann trägt sie hier ein Tipp ein.</p>`;

  /*
   * Die zuletzt benutzten Aktivitäten, wie „Meine Mittel": ein Tipp trägt
   * heute mit der jetzigen Uhrzeit ein. An einem vergangenen Tag öffnet er den
   * Bogen, vorgefüllt – „jetzt" wäre für gestern gelogen. Ein Häkchen zeigt,
   * was an diesem Tag schon steht.
   */
  const aktivReihe = kuenftig ? '' : aktivSchnellReihe(s, liste, iso);

  const schnellReihe = schnell.length ? `<div class="schnell">
    <p class="feld-name">Noch mal wie immer${heute ? '' : ' – die Zeit wählst du im Bogen'}</p>
    <div class="marken marken-eng">${schnell.map((v, i) => `
      <button type="button" class="marke marke-schnell" data-act="schnell" data-i="${i}">
        ${esc(kuerze(v.text, 22))} <span class="marke-zahl">${v.anzahl}×</span>
      </button>`).join('')}</div>
  </div>` : '';

  // Die Notiz steht als breite Zeile darunter (siehe .a-notiz): Mit der
  // Aktivität sind es sieben Knöpfe, und zwei Reihen zu drei plus einem
  // einzelnen sähen nach einem vergessenen aus.
  const anlegen = `<div class="anlegen">
    ${['essen', 'beschwerde', 'kopf', 'stuhl', 'medikament', 'aktivitaet', 'notiz'].map((a) => `
      <button type="button" class="anlegen-btn a-${a}" data-act="neu" data-art="${a}">
        <span class="anlegen-i">${ART_ICON[a]}</span>${ART_NAME[a]}
      </button>`).join('')}
  </div>`;

  // Nicht auf künftigen Tagen – dort lässt sich auch sonst nichts eintragen.
  const wasser = !kuenftig && s.wasserZeigen !== false ? wasserZeile(s, iso) : '';

  /*
   * Ändern ging schon immer – nur sah man es keiner Zeile an. Deshalb das „›"
   * an jeder Zeile und der Satz darüber: Wer nicht weiß, dass ein Eintrag
   * sich öffnen lässt, löscht ihn und legt ihn neu an, und bei Nachgetragenem
   * stimmt dann die Uhrzeit nicht mehr.
   */
  const zeilen = liste.length ? `<p class="klein strang-tipp">Tipp auf einen Eintrag, um ihn zu ändern.</p>
    <ul class="strang">${liste.map((e) => strangZeile(e, s)).join('')}</ul>`
    : `<p class="leer">Für ${esc(fmtTag(iso))} ist noch nichts eingetragen.</p>`;

  /*
   * Ein Tag mit nur einem Kopfeintrag ist für den Bauch eine Lücke, kein
   * beschwerdefreier Tag (siehe tagesWert). Die Karte sagt das, statt mit
   * einem grünen „beschwerdefrei" das Gegenteil zu behaupten.
   */
  const bilanz = t.notiert ? `<div class="karte tagbilanz">
    <div class="gross ${t.wert === 0 ? 'gut' : (t.wert >= 7 ? 'schlecht' : 'mittel')}">
      ${t.wert === 0 ? (t.kopf ? 'Bauch beschwerdefrei' : 'beschwerdefrei') : `Stärke ${t.wert}`}
    </div>
    <p class="klein">${mehrzahl(t.mahlzeiten, 'Mahlzeit', 'Mahlzeiten')},
      ${mehrzahl(t.anzahl, 'Beschwerde', 'Beschwerden')}${t.medikamente ? `, ${mehrzahl(t.medikamente, 'Medikament', 'Medikamente')}` : ''}${t.kopf ? `, Kopfschmerz bis ${t.kopf}` : ''}</p>
  </div>` : (t.kopf ? `<div class="karte tagbilanz">
    <div class="gross ${t.kopf >= 7 ? 'schlecht' : 'mittel'}">Kopfschmerz bis ${t.kopf}</div>
    <p class="klein">Zum Bauch ist nichts eingetragen – für den Bauch zählt der Tag
      als Lücke, nicht als beschwerdefrei.</p>
  </div>` : nurMittelKarte(liste));

  // Die Fragen zu Kiefer, Nacken und Schiene nur mit eingeschaltetem
  // Schalter – siehe sichtbareFragen().
  const fragen = sichtbareFragen(s.tagesfragen, s);
  const umstaende = fragen.length ? `<div class="karte">
    <h3>Wie war der Tag sonst?</h3>
    ${fragen.map((f) => tagesFrage(f, tagInfo[f.id] === undefined ? null : tagInfo[f.id])).join('')}
    <p class="klein">Welche Fragen hier stehen, wählst du unter „Mehr".</p>
  </div>` : '';

  const stand = heutigerStand(s.tage, iso);
  const zyklusZeile = stand ? `<p class="klein zyklus-zeile">
    Zyklustag ${stand.tag}${stand.phase ? ` · ${esc(phasenName(stand.phase))}` : ''}
    ${stand.laenge ? ` · deine Zyklen dauern im Mittel ${stand.laenge} Tage` : ''}
  </p>` : '';

  /*
   * Die Karten der Fassung 29 – die Rückfrage zu Methylphenidat und die
   * Karte „Neu" – stehen als Block direkt unter den Hinweisen zu zwei
   * Mitteln (W1/W1u). Sie verdrängen nie etwas, was schon da war:
   *
   *   * Die Rückfrage steht nur, wenn von den Hinweisen der Stufe A und dem
   *     Angebot höchstens eine Karte dasteht. Sonst wartet sie, ohne dass
   *     der Tag zählt.
   *   * Die Karte „Neu" steht nur ohne offenen Hinweis der Stufe A und ohne
   *     Rückfrage – nie neben einer Karte mit demselben Knopf.
   *
   * Was dasteht, gilt erst als gezeigt, wenn man es sieht (gezeigtStempeln).
   */
  const offen = heute ? wechselOffen(s) : [];
  const angebot = heute ? angebotKarte(s) : '';
  const gesehen = store.gezeigtLesen();
  const frage = heute ? rueckfrageSichtbar(s, gesehen, offen, angebot) : null;
  const mitFrage = !!frage;
  const mitNeu = heute && v29Offen(s, gesehen) && !offen.length && !mitFrage;
  // Jeder Tag, an dem die Rückfrage sichtbar stand, zählt – auch einer, an
  // dem „Ja" an einem vollen „Meine Mittel" scheiterte. Sonst käme sie dann
  // jeden Tag wieder, mit „Später" (siehe rueckfrageDran).
  ui.gezeigt = mitFrage || mitNeu
    ? { am: heuteISO(), rueckfrage: mitFrage ? frage.alleDran : [], neu: mitNeu } : null;

  return alterNameKarte(s) + umzugErgebnisKarte() + umzugHolenKarte(s) + startbildschirmKarte(s, 'tag')
    + kopf + jetztZeile(s, iso) + sicherungKarte(iso) + wechselKarte(s, iso)
    + (mitFrage ? rueckfrageKarte(frage, s) : '') + (mitNeu ? v29Karte(s) : '')
    + planZeile(s, iso) + versuchZeile(s, iso)
    + provokationZeile(s, iso) + bilanz + zyklusZeile + kopfNachtragKarte(s, iso)
    + (heute ? ratKarte(s) + angebot : '') + schnellReihe + mittelReihe
    + (kuenftig ? '' : adhsTeil(s, iso)) + aktivReihe + anlegen + wasser
    + zeilen + umstaende
    // Ans Ende und zugeklappt: Die Liste ist zum Nachsehen da, nicht zum
    // täglichen Durchscrollen. Wer sie sucht, findet sie an derselben Stelle.
    + (iso === heuteISO() ? kuecheKarte(s) : '');
}

/* ---------- Tag: ADHS-Mittel, Hinweise zu den Mitteln, Angebote ---------- */

/** „07:40" oder „≈07:40" – wie im Strang. */
const uhrText = (e) => `${e.ungefaehr ? '≈' : ''}${e.um}`;

/**
 * Wie lange etwas her ist: „vor 40 Min.", ab einer Stunde in Viertelstunden
 * („vor 3¼ Std."). Genauer wäre nicht ehrlicher – die Uhrzeit daneben ist
 * die genaue Angabe, das hier nur die Lesehilfe.
 */
function vorWieLange(ms) {
  const min = Math.floor(ms / 60000);
  // Geschützte Leerzeichen: „(vor 30" am Zeilenende und „Min.)" am Anfang
  // der nächsten liest sich bei 320 Pixeln wie zwei Angaben.
  if (min < 1) return 'gerade\u00a0eben';
  if (min < 60) return `vor\u00a0${min}\u00a0Min.`;
  const viertel = Math.round(min / 15);
  return `vor\u00a0${Math.floor(viertel / 4)}${['', '¼', '½', '¾'][viertel % 4]}\u00a0Std.`;
}

/** Die ADHS-Einnahmen eines Tages, nach der Zeit. */
const adhsAm = (s, iso) => adhsEinnahmen(s.eintraege, s.standardMittel).filter((x) => x.e.am === iso);

/**
 * Die Jetzt-Zeile unter dem Tageskopf: was heute mit Uhrzeit dasteht.
 *
 * Nur mit eingeschaltetem „ADHS" und nur heute. Sie nennt ausschließlich, was
 * eingetragen ist – nie, dass etwas fehlt oder „noch nicht" genommen ist. Eine
 * Zeile, die jeden Morgen meldet, was noch aussteht, wäre eine Erinnerung, und
 * die gehört nicht in ein Tagebuch, das nur zählt. Keine Farbe, kein Takt:
 * Erneuert wird sie, wenn die Seite ohnehin neu gezeichnet wird und wenn die
 * App wieder nach vorn kommt.
 */
function jetztZeile(s, iso) {
  if (s.adhsAn !== true || iso !== heuteISO()) return '';
  const jetzt = Date.now();
  const seit = (e) => {
    const t = zeitpunkt(e.am, e.um);
    return t <= jetzt ? `\u00a0(${vorWieLange(jetzt - t)})` : '';
  };
  const teile = [`Stand ${jetztUhr()}`];
  adhsAm(s, iso).forEach(({ e }) => teile.push(`${esc(e.mittel)} ${uhrText(e)}${seit(e)}`));
  if ((s.tage[iso] || {}).adhsPause) teile.push('heute als Tag ohne ADHS-Mittel notiert');
  const mahlzeit = s.eintraege.filter((e) => e.art === 'essen' && e.am === iso)
    .filter((e) => zeitpunkt(e.am, e.um) <= jetzt).pop();
  teile.push(mahlzeit ? `letzte Mahlzeit ${uhrText(mahlzeit)}${seit(mahlzeit)}` : 'Mahlzeit heute: keine eingetragen');
  return `<p class="klein jetzt-zeile">${teile.join(' · ')}</p>`;
}

/**
 * Ist ein Stimulans „eingetragen" – unter „Meine Mittel" oder in den letzten
 * Wochen genommen? Nur dann gibt es „Heute keins".
 */
function stimulansDa(s) {
  const ab = plusTage(heuteISO(), -(WECHSEL_TAGE - 1));
  return s.standardMittel.some((m) => istStimulans(m.mittel))
    || s.eintraege.some((e) => e.art === 'medikament' && e.am >= ab && istStimulans(e.mittel));
}

const PAUSE_NAME = { geplant: 'geplant', vergessen: 'vergessen', beschwerden: 'wegen Beschwerden' };
const ESSEN_WAHL = [
  { id: 'mit', name: 'mit/nach Essen' },
  { id: 'vor', name: 'kurz vor dem Essen' },
  { id: 'ohne', name: 'ohne Essen' },
];

/**
 * Unter „Meine Mittel" mit eingeschaltetem „ADHS": der Tag ohne Mittel und
 * die Frage „Zum Essen?".
 *
 * „Heute keins" gibt es nur bei Stimulanzien und nur, wenn an diesem Tag
 * weder eine Einnahme noch schon eine Pause steht. Ein Tipp genügt; der Grund
 * ist freiwillig. „Wegen Beschwerden" wird mitgezählt, aber in keinem
 * Vergleich gewertet – wer das Mittel an einem schlechten Tag weglässt, macht
 * die Tage ohne schlechter, ohne dass das Mittel etwas getan hat.
 *
 * „Zum Essen?" steht je heutiger Einnahme mit genauer oder gebundener Zeit,
 * solange nichts angegeben ist, sich nichts aus den Mahlzeiten ergibt und
 * die Einnahme höchstens ESSEN_GILT_MIN Minuten her ist. Danach weiß man, wie
 * es dem Bauch ging, und eine Angabe zählte nicht mehr (siehe js/adhs.js) –
 * also wird auch nicht mehr gefragt.
 */
function adhsTeil(s, iso) {
  if (s.adhsAn !== true) return '';
  const tag = s.tage[iso] || {};
  const heute = iso === heuteISO();
  const einnahmen = adhsAm(s, iso);
  const mitStimulans = einnahmen.some((x) => istStimulans(x.e.mittel));
  let pause = '';
  if (tag.adhsPause) {
    pause = `<div class="adhs-pause" role="group" aria-label="Tag ohne ADHS-Mittel">
      <p class="feld-name">Ohne ADHS-Mittel · Warum?</p>
      <div class="marken marken-eng">${PAUSE_GRUENDE.map((g) => `
        <button type="button" class="marke${tag.adhsPause === g ? ' an' : ''}" data-act="adhs-pause-grund"
                data-id="${g}" aria-pressed="${tag.adhsPause === g}">${PAUSE_NAME[g]}</button>`).join('')}
        <button type="button" class="marke" data-act="adhs-pause-weg"
                aria-label="Tag ohne ADHS-Mittel zurücknehmen">×</button>
      </div>
      <p class="klein">„Wegen Beschwerden“ zählt in keinem Vergleich – sonst sähe das Mittel
        besser aus, als es war.</p>
    </div>`;
  } else if (!mitStimulans && stimulansDa(s)) {
    pause = `<div class="reihe adhs-pause">
      ${knopf('adhs-pause', heute ? 'Heute keins' : 'Keins genommen', 'btn-ghost btn-klein')}
    </div>`;
  }
  const jetzt = Date.now();
  const offen = heute ? einnahmen.filter((x) => (x.zeitArt === 'genau' || x.zeitArt === 'gebunden')
    && !x.e.essen && jetzt <= x.t + ESSEN_GILT_MIN * 60000
    && [null, 'unklar'].includes(essenZurEinnahme(s.eintraege, x).art)) : [];
  const essen = offen.map((x) => `<div class="adhs-essen" role="group"
      aria-label="${esc(`${x.e.mittel} ${x.e.um} – zum Essen?`)}">
    <p class="feld-name">${esc(x.e.mittel)} ${esc(uhrText(x.e))} – zum Essen?</p>
    <div class="marken marken-eng">${ESSEN_WAHL.map((w) => `
      <button type="button" class="marke" data-act="adhs-essen" data-id="${esc(x.e.id)}"
              data-wert="${w.id}" aria-pressed="false">${w.name}</button>`).join('')}</div>
  </div>`).join('');
  return pause || essen ? `<div class="adhs-tag">${pause}${essen}</div>` : '';
}

/**
 * Hinweise der Stufe A (siehe js/zusammen.js) als Karte auf „Tag" – nur
 * heute, bis sie gelesen sind. Stufe A heißt: Methylphenidat als Kapsel mit
 * zweierlei Kügelchen (Medikinet retard, Medikinet adult) zusammen mit einem
 * Mittel gegen Magensäure, wie Body Check es zählt (W1) – die Fachinformation
 * dieser Kapseln führt die Behandlung mit H2-Rezeptorenblockern,
 * Protonenpumpen-Inhibitoren oder Antazida unter den Gegenanzeigen (Medikinet
 * retard, www.fachinfo.de/fi/pdf/009621, Stand Dezember 2025, 4.3 und 4.5:
 * „darf nicht zusammen mit H2-Rezeptorenblockern, Protonenpumpen-Inhibitoren
 * oder Antazida eingenommen werden"; ebenso Medikinet adult, 013066, Stand
 * September 2025). Oder Methylphenidat ohne bekannte Form zusammen mit einem
 * solchen Mittel (W1u): Dann könnte es so sein, belegt ist es für dieses
 * Paar nicht. Alginate und Natron zählt Body Check dabei mit, die
 * Fachinformation nennt sie nicht ausdrücklich.
 *
 * Ohne Schalter: Was hier steht, betrifft jeden mit diesen beiden Mitteln, ob
 * er ADHS mitdenken will oder nicht.
 */
function wechselOffen(s) {
  const gelesen = new Set(Array.isArray(s.wechselGelesen) ? s.wechselGelesen : []);
  return wechselHinweise(s.standardMittel, s.eintraege, heuteISO())
    .filter((h) => h.stufe === 'A' && !gelesen.has(h.schluessel));
}

function wechselKarte(s, iso) {
  if (iso !== heuteISO()) return '';
  return wechselOffen(s).map((h) => `<div class="karte karte-merk wechsel-karte">
    <h3>Hinweis zu deinen Mitteln</h3>
    <p class="klein">${esc(h.text)}</p>
    <div class="reihe">${knopf('wechsel-gelesen', 'Gelesen', 'btn-ghost', `data-id="${esc(h.schluessel)}"`)}</div>
  </div>`).join('');
}

/**
 * Der Satz für die Meldung, wenn eine Eintragung gerade ein Paar der Stufe A
 * vollständig gemacht hat. `vorher` sind die offenen Schlüssel davor.
 */
function wechselZusatz(vorher) {
  const neu = wechselOffen(store.zustandLesen()).some((h) => !vorher.has(h.schluessel));
  return neu ? ' Hinweis zu deinen Mitteln oben auf „Tag“.' : '';
}
const wechselStand = () => new Set(wechselOffen(store.zustandLesen()).map((h) => h.schluessel));

/* ---------- Tag: die Rückfrage zu Methylphenidat (Fassung 29) ---------- */

/*
 * Die Hinweise zu zwei Mitteln gibt es nur, wenn beide eingetragen sind und
 * die Form bekannt ist. Wer ein Methylphenidat einträgt, aber die Form nicht
 * angibt oder den Säureblocker nirgends notiert, erfuhr bisher nichts. Die
 * Rückfrage fragt genau das, was fehlt (mphRueckfragen in js/zusammen.js),
 * und nicht mehr. Die Antwort landet dort, wo die Paare sie lesen – die Form
 * beim eigenen Mittel oder bei der jüngsten Einnahme, der Säureblocker unter
 * „Meine Mittel" –, und danach erscheint die passende bestehende Karte von
 * selbst. Die Rückfrage stellt nichts fest; sie sagt nur, warum sie fragt.
 *
 * Ohne Schalter, wie W1: Sie betrifft jeden mit einem Methylphenidat.
 *
 * Kein Drängeln. Je Name steht sie an höchstens zwei Tagen: dem ersten, an
 * dem sie sichtbar war, und frühestens RUECKFRAGE_WIEDER Tage danach noch
 * ein letztes Mal – egal ob „Später" getippt oder übergangen. Täglich, bis
 * man reagiert, wäre eine Erinnerung. „Später" gibt es nur am ersten Tag,
 * „Nicht mehr fragen" ist je Name endgültig, ein neuer Name ein neues Mittel.
 * Das gilt ohne Ausnahme: auch für einen Zwischenschritt, der über Nacht
 * offen blieb (rueckfrageSchritt), und auch, wenn „Ja" an einem vollen
 * „Meine Mittel" scheitert – der Tag zählt wie jeder andere.
 */

/** Nach wie vielen Tagen die Rückfrage ein zweites und letztes Mal kommt. */
const RUECKFRAGE_WIEDER = 7;

/** Welche Frage zu diesem Namen offen ist: 'form', 'saeure' oder null. r: seine Antworten. */
function rueckfrageFrage(x, r) {
  if (r.nie) return null;
  if (x.fehltForm && r.form !== 'weissnicht') return 'form';
  if (x.fehltSaeure && !r.saeure) return 'saeure';
  return null;
}

/**
 * Steht die Rückfrage zu Schlüssel k heute? g ist store.gezeigtLesen().
 *   heute „Später" oder „Nicht mehr fragen" getippt → nein
 *   heute schon gestempelt                         → ja
 *   an zwei Tagen gestempelt                       → nein
 *   an einem Tag gestempelt                        → ab diesem + RUECKFRAGE_WIEDER
 *   nie gestempelt                                 → ja
 * Steht die Uhr vor dem ersten Tag, ist sie nicht dran.
 */
function rueckfrageDran(k, g, heute) {
  if (g.zu === heute) return false;
  const tage = g.tage[k] || [];
  if (tage.includes(heute)) return true;
  if (tage.length >= 2) return false;
  if (tage.length === 1) return heute >= plusTage(tage[0], RUECKFRAGE_WIEDER);
  return true;
}

/** Die Methylphenidat-Namen von heute, mit ihren Antworten und der offenen Frage. */
function rueckfragenMit(s) {
  const antworten = s.mphRueckfrage || {};
  return mphRueckfragen(s.standardMittel, s.eintraege, heuteISO()).map((x) => {
    const r = antworten[x.schluessel] || {};
    return { ...x, r, frage: rueckfrageFrage(x, r) };
  });
}

/*
 * Ein Zwischenschritt (MERKEN, WELCHES, PRUEFEN) – mit dem Tag, an dem er
 * begann. Er gilt nur an diesem Tag: Eine App vom Home-Bildschirm bleibt oft
 * über Nacht offen, und ohne den Tag stünde der Schritt an jedem neuen Tag
 * wieder oben, an rueckfrageDran vorbei, bis man reagiert. Am nächsten Tag
 * entscheiden wieder die gezeigten Tage. Eine Antwort prüft den Tag nicht
 * (siehe rueckfrageOffen): Wer um 23:58 die Wahl sieht und um 0:01 tippt,
 * hat trotzdem geantwortet.
 */
function rueckfrageSchritt(u) {
  ui.rueckfrage = { ...u, am: heuteISO() };
}

/**
 * Die Rückfrage, die heute auf „Tag" steht – oder null: { x, schritt,
 * erster, alleDran }.
 *
 *   x         der Name mitten in einem Schritt (ui.rueckfrage, nur von
 *             heute), sonst der erste mit offener Frage, der heute dran ist
 *   schritt   'form', 'saeure', oder aus ui.rueckfrage 'merken', 'welches',
 *             'pruefen' – solange der Schritt noch passt
 *   erster    der erste Tag dieses Namens: Nur dann gibt es „Später".
 *   alleDran  alle Namen mit offener Frage, die heute dran sind. Gestempelt
 *             werden alle, nicht nur der gezeigte – sonst käme bei zwei
 *             Namen die Karte an aufeinanderfolgenden Tagen, und „Später"
 *             gäbe es zweimal.
 */
function rueckfrageHeute(s, g) {
  const heute = heuteISO();
  const alle = rueckfragenMit(s);
  const kandidaten = alle.filter((x) => x.frage && rueckfrageDran(x.schluessel, g, heute));
  let x = null;
  let schritt = null;
  if (ui.rueckfrage && ui.rueckfrage.am !== heute) ui.rueckfrage = null;
  const u = ui.rueckfrage;
  if (u) {
    const y = alle.find((z) => z.schluessel === u.schluessel);
    const gilt = !!y && !y.r.nie && (u.schritt === 'merken'
      ? !!merkenEinnahme(s, y, u)
      : (u.schritt === 'welches' || u.schritt === 'pruefen') && y.frage === 'saeure');
    if (gilt) {
      x = y;
      schritt = u.schritt;
    } else {
      ui.rueckfrage = null;
    }
  }
  if (!x && kandidaten.length) {
    [x] = kandidaten;
    schritt = x.frage;
  }
  if (!x) return null;
  const tage = g.tage[x.schluessel] || [];
  return {
    x,
    schritt,
    erster: !tage.length || (tage.length === 1 && tage[0] === heute),
    alleDran: kandidaten.map((y) => y.schluessel),
  };
}

/**
 * Die Rückfrage, die jetzt sichtbar auf „Tag" steht – oder null. Sie steht
 * nur, wenn von den Hinweisen der Stufe A und dem Angebot höchstens eine
 * Karte dasteht (siehe tagAnsicht). offen und angebot gibt tagAnsicht mit,
 * weil es sie ohnehin hat.
 */
function rueckfrageSichtbar(s, g, offen = wechselOffen(s), angebot = angebotKarte(s)) {
  const frage = rueckfrageHeute(s, g);
  return frage && offen.length + (angebot ? 1 : 0) < 2 ? frage : null;
}

/*
 * Der Satz am Ende der Meldung, wenn die Karte nach einer Antwort zu k zu
 * einem anderen Namen springt: „Jetzt zu Methylphenidat." Die Karte des
 * nächsten Namens hat dieselben Knöpfe an derselben Stelle; ohne den Satz
 * – und ohne den Namen in der Überschrift (rueckfrageKarte) – läse sich ihre
 * Frage wie die eben beantwortete, und ein zweiter Tipp gäbe dem zweiten
 * Mittel die Form des ersten. Gerechnet mit dem Stand nach der Antwort.
 */
function rueckfrageWeiter(k) {
  const f = rueckfrageSichtbar(store.zustandLesen(), store.gezeigtLesen());
  return f && f.x.schluessel !== k ? ` Jetzt zu ${f.x.name}.` : '';
}

/**
 * Für eine Antwort: der Name, wenn er eingetragen und nicht „nie" ist –
 * sonst null. Ob er heute dran ist, spielt dabei keine Rolle: Wer um 23:58
 * die Karte sieht und um 0:01 tippt, hat trotzdem geantwortet.
 */
function rueckfrageOffen(s, k) {
  const x = rueckfragenMit(s).find((y) => y.schluessel === k);
  return x && !x.r.nie ? x : null;
}

/*
 * Die Namen, bei denen gerade nach dem Säureblocker gefragt würde – „Ja"
 * gilt für alle (danach ist der Säureblocker eingetragen).
 */
const alleOffenSaeure = (s) => rueckfragenMit(s)
  .filter((x) => x.fehltSaeure && !x.r.saeure && !x.r.nie).map((x) => x.schluessel);

/*
 * Die Schlüssel aller Methylphenidat-Namen, die bis jetzt dastehen: unter
 * „Meine Mittel" oder in einer Einnahme beliebigen Alters. Für „Nein": Die
 * Meldung verspricht, erst bei einem neuen Namen wieder nach dem
 * Säureblocker zu fragen. Merkte sich „Nein" nur die Namen mit offener
 * Säurefrage, käme dieselbe Frage zu einem Namen, der beim „Nein" schon
 * dastand – sobald er eine andere Form bekommt (die Hülle hat keine
 * Säurefrage, eine neue Packung vielleicht schon) oder nach mehr als
 * WECHSEL_TAGE Tagen wieder eingenommen wird. Gefragt ist nach dem Menschen,
 * nicht nach dem einzelnen Mittel.
 */
function alleMphSchluessel(s) {
  const namen = [...s.standardMittel.map((m) => m.mittel),
    ...s.eintraege.filter((e) => e.art === 'medikament').map((e) => e.mittel)]
    .map((n) => String(n || '').trim()).filter((n) => n && (wissenZu(n) || {}).id === 'mph');
  return [...new Set(namen.map(rueckfrageSchluessel).filter(Boolean))];
}

/*
 * Die Einnahme, deren Form MERKEN unter „Meine Mittel" legen würde – oder
 * null, wenn der Schritt nicht mehr gilt. y ist der Name aus rueckfragenMit
 * (mit y.form = formZu von heute), u der Schritt. Er gilt nur, solange
 *
 *   – an der Einnahme noch genau die beantwortete Form steht und sie noch
 *     zu diesem Namen gehört,
 *   – diese Form noch die ist, die formZu liest: Kommt eine neuere Einnahme
 *     mit einer anderen Form dazu – zwei Einnahmen an einem Tag kommen
 *     vor –, gilt die neuere, und die beantwortete ist überholt, auch
 *     wenn sie noch an der älteren Einnahme steht,
 *   – der Name nicht inzwischen unter „Meine Mittel" steht (etwa über „Als
 *     mein Mittel merken" im Bogen; dann gilt die Form von dort, und MERKEN
 *     überschreibt sie nie),
 *   – und unter „Meine Mittel" Platz bleibt (merkenPlatz).
 *
 * Sonst legte „Ja, merken" eine Form dorthin, die nicht mehr gilt – etwa
 * nach einem Fehltipp, den man im Bogen korrigiert oder mit der nächsten
 * Einnahme richtig angibt. Der Knopf trüge sie in jede neue Einnahme
 * weiter, und ein Hinweis verschwände ohne Meldung oder stünde zu einer
 * Form, die man gar nicht hat.
 */
function merkenEinnahme(s, y, u) {
  const e = store.eintragVon(u.einnahme);
  if (!e || e.art !== 'medikament' || !gleichText(e.mittel, y.name) || !u.form || e.form !== u.form) return null;
  if (y.form !== u.form || !merkenPlatz(s, y)) return null;
  return s.standardMittel.some((m) => gleichText(m.mittel, y.name)) ? null : e;
}

/*
 * Ob für MERKEN unter „Meine Mittel" Platz ist. Kommt heute danach noch
 * eine Säurefrage, bleibt ein Platz für den Säureblocker frei: Sonst
 * belegte „Ja, merken" bei elf eigenen Mitteln den letzten, und einen
 * Schritt später passte der Säureblocker – an dem W1 hängt – nicht mehr
 * hinein. Die Form bleibt dann an der Einnahme, wie nach „Nicht merken".
 *
 * Das gilt für die Säurefrage zu diesem Namen und für die jedes anderen,
 * der heute noch dran ist (rueckfrageDran, wie alleDran): Die Karte fragt
 * sie als Nächstes, und eine Antwort gilt für alle. Ein Name, dessen zwei
 * Tage vorbei sind, kommt heute nicht mehr – für ihn bleibt nichts frei.
 */
function merkenPlatz(s, y) {
  const frei = store.STANDARD_HOECHSTENS - s.standardMittel.length;
  return frei > (saeureFolgtHeute(s, y) ? 1 : 0);
}

/** Kommt heute noch eine Säurefrage – zu y oder zu einem anderen Namen, der heute dran ist? */
function saeureFolgtHeute(s, y) {
  const g = store.gezeigtLesen();
  const heute = heuteISO();
  return rueckfragenMit(s).some((z) => z.fehltSaeure && !z.r.saeure && !z.r.nie
    && (z.schluessel === y.schluessel || rueckfrageDran(z.schluessel, g, heute)));
}

/** Die jüngste Einnahme dieses Namens in den letzten WECHSEL_TAGE Tagen – dort liest formZu. */
function juengsteEinnahme(s, name) {
  const heute = heuteISO();
  const ab = plusTage(heute, -(WECHSEL_TAGE - 1));
  return s.eintraege.filter((e) => e.art === 'medikament' && gleichText(e.mittel, name)
    && e.am >= ab && e.am <= heute).pop() || null;
}

/** „von heute", „von gestern", „vom Mo, 09.03." */
function wannText(am) {
  const heute = heuteISO();
  if (am === heute) return 'von heute';
  if (am === plusTage(heute, -1)) return 'von gestern';
  return `vom ${fmtDatum(am)}`;
}

/*
 * Ein Satz, der mit wannText endet: Das Datum („vom So, 08.03.") trägt seinen
 * Punkt schon, ein zweiter wäre ein Schreibfehler – wie früher bei „zuletzt …"
 * auf der Karte „Für heute".
 */
const satzEnde = (t) => (t.endsWith('.') ? t : `${t}.`);

/** Alle Paare je Schlüssel (mit Stufe und Namen) – zum Vergleich vor und nach einer Antwort. */
const wechselAlle = () => {
  const s = store.zustandLesen();
  return new Map(wechselHinweise(s.standardMittel, s.eintraege, heuteISO()).map((h) => [h.schluessel, h]));
};

/**
 * Der Satz für die Meldung nach einer Antwort. `vorher` sind die offenen
 * Hinweise der Stufe A davor (wechselStand), `vorherAlle` alle Paare.
 *
 *   1. ein neuer ungelesener Hinweis der Stufe A → wo er steht
 *   2. sonst ein neues Paar irgendeiner Stufe → wo es steht
 *   3. sonst ist ein Paar der Stufe A weggefallen (W1u → Hülle oder
 *      Equasym): dass Body Check dazu keinen Hinweis kennt – und dass das
 *      nicht heißt, dass beides zusammenpasst. Sonst verschwände W1u
 *      kommentarlos, und das läse sich wie eine Entwarnung. Fallen mehrere
 *      weg (zwei Mittel gegen Magensäure), in der Mehrzahl und mit den
 *      Namen: Wer nur die Karte zum einen gesehen hat, erführe sonst nicht,
 *      dass auch das andere gemeint ist.
 *   4. sonst nichts. Nie ein Satz wie „passt".
 */
function hinweisZusatz(vorher, vorherAlle) {
  const satz = wechselZusatz(vorher);
  if (satz) return satz;
  const jetzt = wechselAlle();
  if ([...jetzt.keys()].some((k) => !vorherAlle.has(k))) return ' Ein Hinweis dazu steht unter „Mehr“ › „Meine Mittel“.';
  // Bei W1 und W1u steht das Mittel gegen Magensäure an zweiter Stelle.
  const weg = [...new Set([...vorherAlle].filter(([k, h]) => h.stufe === 'A' && !jetzt.has(k)).map(([, h]) => h.namen[1]))];
  if (weg.length === 1) {
    return ' Zu dieser Form und deinem Mittel gegen Magensäure kennt Body Check keinen Hinweis. '
      + 'Das heißt nicht, dass beides zusammenpasst – fragen kannst du in Apotheke oder Praxis.';
  }
  if (weg.length > 1) {
    const namen = `${weg.slice(0, -1).join(', ')} und ${weg[weg.length - 1]}`;
    return ` Zu dieser Form und deinen Mitteln gegen Magensäure (${namen}) kennt Body Check keinen Hinweis. `
      + 'Das heißt nicht, dass sie mit dieser Form zusammenpassen – fragen kannst du in Apotheke oder Praxis.';
  }
  return '';
}

/**
 * Der Fokus nach einer Antwort: auf die Frage, die jetzt dasteht – wenn eine
 * dasteht. Vorher kommt sie ins Bild (insBild): Fällt mit der Antwort eine
 * Karte darüber weg – etwa W1u, weil die Form ein Paar der Stufe B ergibt –,
 * rückt die Rückfrage um deren Höhe nach oben. Wer bis zum Knopf gerollt
 * hatte, sähe den nächsten Schritt sonst nicht und hielte die Rückfrage für
 * erledigt; das Angebot, die Form dauerhaft zu merken, ginge unter.
 */
function rueckfrageFokus(id = 'rueckfrageFrage') {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    insBild(el, el.closest('.rueckfrage-karte') || el);
    el.focus({ preventScroll: true });
  }, 0);
}

/*
 * Was unter „Ja" zur Wahl steht: bis zu drei Namen aus diesem Tagebuch, die
 * die Erkennung als Mittel gegen Magensäure kennt – aus allen Einnahmen und
 * den zuletzt benutzten, die jüngste zuerst –, dann die bekannten Namen.
 * Je Name einmal.
 */
function saeureWahl(s) {
  const eigene = [];
  [...s.eintraege].reverse().filter((e) => e.art === 'medikament').map((e) => e.mittel)
    .concat(s.zuletztMittel || [])
    .forEach((n) => {
      const name = String(n || '').trim();
      if (eigene.length < 3 && name && istSaeureMittel(name) && !eigene.some((x) => gleichText(x, name))) {
        eigene.push(name);
      }
    });
  return [...eigene, ...SAEURE_WAHL.filter((n) => !eigene.some((x) => gleichText(x, n)))];
}

/**
 * Die Karte. Die Frage jedes Schritts steht in der Überschrift
 * (#rueckfrageFrage); dorthin geht nach einer Antwort der Fokus. Die
 * Formknöpfe sind Aktionen, keine Umschalter – ohne aria-pressed, nichts
 * vorgewählt –, und tragen die Bezeichnungen wie im Bogen und unter „Meine
 * Mittel". Ein aria-label enthält immer die sichtbare Beschriftung, meist
 * vorn: Die Sprachsteuerung sucht einen Knopf über seinen Namen, und
 * „Tippe auf Nicht merken" ginge sonst ins Leere.
 */
function rueckfrageKarte(f, s) {
  const { x, schritt, erster } = f;
  const k = esc(x.schluessel);
  const name = esc(x.name);
  const u = ui.rueckfrage || {};
  const mitK = (extra = '') => `data-schluessel="${k}"${extra ? ` ${extra}` : ''}`;
  let frage = '';
  let teil = '';
  if (schritt === 'form') {
    // Mit dem Namen vorn: Bei zwei Methylphenidat-Namen folgt die Formfrage
    // zum zweiten gleich auf die zum ersten, mit denselben Knöpfen an
    // derselben Stelle. Der Fokus geht auf diese Überschrift – sie allein muss
    // sagen, um welches Mittel es jetzt geht (siehe auch rueckfrageWeiter).
    // Bei 320 Pixeln bleibt sie für übliche Namen zweizeilig wie vorher.
    frage = `${name}: Welche Form steht auf der Packung?`;
    teil = `${x.saeureDa
      ? '<p class="klein">Davon hängt ab, welcher Hinweis zu deinen Mitteln gilt. Nicht sicher? Dann „Weiß ich nicht“.</p>'
      : '<p class="klein">Davon hängt ab, ob es zu deinen Mitteln einen Hinweis gibt.</p>'}
      <div class="marken marken-eng" role="group" aria-label="${esc(`Form von ${x.name}`)}">${MPH_FORMEN.map((m) => `
        <button type="button" class="marke" data-act="rueckfrage-form" data-id="${m.id}" ${mitK()}>${esc(m.name)}</button>`).join('')}</div>`;
  } else if (schritt === 'saeure') {
    frage = 'Nimmst du außerdem ein Mittel gegen Magensäure?';
    // „Ja" legt selbst nichts an: Es führt zur Wahl – oder, wenn „Meine
    // Mittel" voll ist, zum Satz darüber. Die Ansage sagt nur, was geschieht.
    const jaSagt = s.standardMittel.length >= store.STANDARD_HOECHSTENS
      ? 'Ja, ich nehme ein Mittel gegen Magensäure' : 'Ja – das Mittel gegen Magensäure auswählen';
    teil = `<p class="klein">Auch eins, das du nur ab und zu bei Sodbrennen nimmst. Zum Beispiel Pantoprazol,
      Pantozol, Omeprazol, Nexium, Famotidin, Rennie, Maaloxan, Gaviscon oder Natron. Davon hängt ab, ob es
      zu deinen Mitteln einen Hinweis gibt.</p>
      <div class="reihe">${knopf('rueckfrage-saeure-ja', 'Ja', 'btn-primary', mitK(`aria-label="${jaSagt}"`))}
        ${knopf('rueckfrage-saeure-nein', 'Nein', 'btn-ghost', mitK('aria-label="Nein, kein Mittel gegen Magensäure"'))}</div>`;
  } else if (schritt === 'merken') {
    /*
     * Wie lange die Form an der Einnahme gilt, sagt formZu: Für ein
     * eingetragenes Mittel zählt die jüngste bekannte Form der letzten
     * WECHSEL_TAGE Tage – auch für spätere Einnahmen ohne Formangabe. Der
     * Text sagt genau das. „Nur diese Einnahme" wäre falsch und wirkte in
     * die unsichere Richtung: Wer bei einer neuen Packung mit anderer Form
     * nichts angibt, bekäme 30 Tage lang den Hinweis zur alten. Die Form
     * steht mit Namen da: Gemerkt wird genau sie, und das soll man vor dem
     * Tipp sehen, nicht erst in der Meldung danach.
     */
    const e = store.eintragVon(u.einnahme);
    const fm = mphForm(u.form);
    frage = 'Auch unter „Meine Mittel“ merken?';
    teil = `<p class="klein">Die Form „${esc(fm.kurzname)}“ steht jetzt bei deiner Einnahme ${esc(satzEnde(wannText(e.am)))}
      Sie gilt ab dieser Einnahme ${WECHSEL_TAGE} Tage lang, auch für weitere Einnahmen ohne Formangabe. Dauerhaft
      gilt sie, wenn ${name} unter „Meine Mittel“ steht. Dort trägt dann auch ein Tipp auf „Tag“ eine Einnahme ein.</p>
      <div class="reihe">${knopf('rueckfrage-merken', 'Ja, merken', 'btn-primary',
    mitK(`aria-label="${esc(`Ja, merken – ${x.name} mit der Form „${fm.kurzname}“ unter „Meine Mittel“ anlegen`)}"`))}
        ${knopf('rueckfrage-nicht-merken', 'Nicht merken', 'btn-ghost',
    mitK('aria-label="Nicht merken – die Form bleibt bei der Einnahme"'))}</div>`;
  } else if (schritt === 'welches') {
    frage = 'Welches Mittel gegen Magensäure?';
    const zurueck = knopf('rueckfrage-zurueck', 'Zurück', 'btn-ghost btn-klein', mitK());
    teil = s.standardMittel.length >= store.STANDARD_HOECHSTENS
      ? `<p class="klein">${vollSatz(s)}</p>
        <div class="reihe">${knopf('rueckfrage-meine-mittel', 'Zu „Meine Mittel“', 'btn-primary', mitK())} ${zurueck}</div>`
      : `<p class="klein">Wähl den Namen, der auf der Packung steht. Er kommt unter „Meine Mittel“, ohne
        Dosis – die kannst du dort ergänzen. Eine Einnahme wird dabei nicht notiert.</p>
        <div class="marken marken-eng" role="group" aria-label="Mittel gegen Magensäure wählen">${saeureWahl(s).map((n) => `
          <button type="button" class="marke rueckfrage-wahl" data-act="rueckfrage-name" data-name="${esc(n)}"
                  ${mitK()} aria-label="${esc(`${n} unter „Meine Mittel“ anlegen`)}">${esc(n)}</button>`).join('')}</div>
        <label class="feld-name" for="rueckfrageName">Steht ein anderer Name auf der Packung?</label>
        <div class="reihe rueckfrage-eigen">
          <input type="text" class="feld" id="rueckfrageName" data-act="rueckfrage-feld" maxlength="80"
                 autocomplete="off" placeholder="Name wie auf der Packung" value="${esc(u.eigen || '')}">
          ${knopf('rueckfrage-eigen', 'Anlegen', 'btn-ghost', mitK('aria-label="Diesen Namen unter „Meine Mittel“ anlegen"'))}
        </div>
        <div class="reihe">${zurueck}</div>`;
  } else if (schritt === 'pruefen') {
    // Nicht „Diesen Namen kennt Body Check nicht": Viele Namen kennt die
    // Erkennung (Sucralfat, Heilerde, Schmerzmittel …), zählt sie aber nicht
    // zu den Mitteln, nach denen die Paar-Hinweise fragen (Protonenpumpen-
    // hemmer, H2-Blocker, Antazida, Alginate, dazu Natron; js/zusammen.js) –
    // Bogen und „Mehr" beschreiben sie. Gesagt wird nur, was die App tut.
    // Sucralfat überzieht laut Gebrauchsinformation erkrankte
    // Schleimhautbereiche „mit einer Schutzschicht" und wird von den Antazida
    // abgegrenzt („Die gleichzeitige Gabe Säure bindender Arzneimittel
    // (Antacida) beeinträchtigt die Wirksamkeit", Sucrabest 1 g Tabletten,
    // Abschnitte 1 und 2, überarbeitet Februar 2026). Heilerde dagegen
    // wird laut Gebrauchsinformation „zur Bindung überschüssiger Magensäure
    // angewendet" (Santerra Heilerde supra); ob sie unter die Gegenanzeige
    // „Antazidatherapie" der Medikinet-Fachinformation fällt, sagt keine
    // geprüfte Quelle – ihr Fehlen in der Liste ist eine Festlegung der App,
    // kein Befund.
    frage = 'Nicht als Mittel gegen Magensäure erkannt';
    teil = `<p class="klein">„${esc(u.eigen)}“ erkennt Body Check nicht als Mittel gegen Magensäure. Dann kann
      ein Hinweis zu deinen Mitteln fehlen. Steht einer der Namen aus der Liste auf der Packung, wähl lieber
      den.</p>
      <div class="reihe">${knopf('rueckfrage-aendern', 'Namen ändern', 'btn-primary', mitK())}
        ${knopf('rueckfrage-trotzdem', 'Trotzdem so anlegen', 'btn-ghost',
    mitK(`aria-label="${esc(`Trotzdem so anlegen – „${u.eigen}“ unter „Meine Mittel“`)}"`))}</div>`;
  }
  const weg = schritt === 'form' || schritt === 'saeure'
    ? `<div class="reihe rueckfrage-weg">
      ${erster ? knopf('rueckfrage-spaeter', 'Später', 'btn-ghost btn-klein',
    mitK(`aria-label="${esc(`Später – zu ${x.name} frühestens in einer Woche noch ein letztes Mal`)}"`)) : ''}
      ${knopf('rueckfrage-nie', 'Nicht mehr fragen', 'btn-ghost btn-klein',
    mitK(`aria-label="${esc(`Zu ${x.name} nicht mehr fragen`)}"`))}
    </div>` : '';
  return `<div class="karte karte-merk rueckfrage-karte" role="region" aria-label="${esc(`Rückfrage zu ${x.name}`)}">
    <p class="klein rueckfrage-kopf">Rückfrage zu ${name}</p>
    <h3 id="rueckfrageFrage" tabindex="-1">${frage}</h3>
    ${teil}
    ${weg}
  </div>`;
}

/**
 * Einen Säureblocker unter „Meine Mittel" anlegen – aus der Wahl, aus dem
 * Feld oder nach „Trotzdem so anlegen". Ein Name, den die Erkennung nicht
 * als Mittel gegen Magensäure kennt, wird erst nachgefragt (PRUEFEN), statt
 * die Frage still zu schließen: Ein Tippfehler ergäbe sonst nie einen
 * Hinweis. Ob die Erkennung den Namen sonst kennt, prüft das nicht – Texte
 * und Meldung sagen deshalb nie, er sei unbekannt.
 */
function saeureAnlegen(name, trotzdem) {
  const u = ui.rueckfrage;
  const s = store.zustandLesen();
  const x = u ? rueckfrageOffen(s, u.schluessel) : null;
  if (!x || x.frage !== 'saeure') {
    ui.rueckfrage = null;
    zeichne();
    return;
  }
  const n = String(name || '').trim().slice(0, 80).trim();
  if (!n) { melden('Wie heißt das Mittel?'); return; }
  if ((wissenZu(n) || {}).id === 'mph') {
    melden('Das ist ein Methylphenidat-Mittel – gefragt ist eins gegen Magensäure.');
    return;
  }
  if (!trotzdem && !istSaeureMittel(n)) {
    rueckfrageSchritt({ ...u, schritt: 'pruefen', eigen: n });
    rueckfrageFokus();
    zeichne();
    return;
  }
  // Vor dem Anlegen: Danach ist der Säureblocker eingetragen, und keine
  // Säurefrage gilt mehr als offen.
  const offenSaeure = alleOffenSaeure(s);
  const vorher = wechselStand();
  const vorherAlle = wechselAlle();
  const res = store.standardMerken({ mittel: n, dosis: '', tageszeit: null, bezug: null });
  if (res.fehler === 'voll') {
    melden(vollMeldung(store.zustandLesen()));
    return;
  }
  if (res.fehler) return;
  store.rueckfrageSetzen(offenSaeure, { saeure: 'ja' });
  ui.rueckfrage = null;
  if (trotzdem) {
    melden(`${n} steht ${res.schon ? 'schon' : 'jetzt'} bei deinen Mitteln${res.schon ? '' : ' – ohne Dosis'}. `
      + 'Als Mittel gegen Magensäure kennt Body Check den Namen nicht; Fragen dazu beantwortet die Apotheke.'
      + rueckfrageWeiter(x.schluessel));
  } else {
    melden((res.schon ? `${n} steht schon bei deinen Mitteln.`
      : `${n} steht jetzt bei deinen Mitteln – ohne Dosis. Eine Einnahme ist damit nicht notiert.`)
      + hinweisZusatz(vorher, vorherAlle) + rueckfrageWeiter(x.schluessel));
  }
  rueckfrageFokus();
  zeichne();
}

/* ---------- Tag: die Karte „Neu" (Fassung 29) ---------- */

/*
 * Einmal, für Tagebücher, die schon Einträge hatten: Body Check zeigt jetzt
 * Hinweise zu zwei Mitteln – aber nur zu Mitteln, die hier stehen. Ein neuer
 * Stand gilt als gesagt (neuerStand in js/store.js); wer heute anfängt,
 * hatte nie eine Fassung ohne die Hinweise. „Einmal" heißt an genau einem
 * Tag: dem ersten, an dem sie sichtbar stand. Am nächsten kommt sie nicht
 * wieder, auch ohne „Gelesen".
 */
function v29Offen(s, g) {
  return s.v29Gesagt !== true && s.eintraege.length > 0 && (!g.am || g.am === heuteISO());
}

/*
 * Ohne Wertung: Oben stehen nur die ungelesenen Hinweise der Stufe A. Die
 * Stufen sagen, was die Fachinformation zu einem Paar schreibt, nicht, wie
 * wichtig es ist – „die wichtigen stehen oben" erklärte die übrigen still
 * für unwichtig, und oft steht über dieser Karte gar keiner.
 *
 * Belegt ist das Paar nur für bestimmte Formen: Medikinet retard und
 * Medikinet adult führen H2-Rezeptorenblocker, Protonenpumpen-Inhibitoren und
 * Antazida unter den Gegenanzeigen (www.fachinfo.de/fi/pdf/009621, Stand
 * Dezember 2025, und 013066, Stand September 2025, je 4.3 und 4.5); Ritalin
 * LA (010445) und Equasym Retard (012100) nennen nichts dazu. Deshalb sagt
 * die Karte, dass es von Präparat zu Präparat verschieden ist – wie der
 * Arztbericht (js/bericht.js, W3/W4) –, ohne Präparatnamen und ohne
 * „Gegenanzeigen": Diese Karte ist eine allgemeine Neuigkeit, die Namen und
 * die Gegenanzeige stehen in den Hinweisen selbst.
 */
function v29Karte(s) {
  // Ist „Meine Mittel" voll, führt der Knopf zur Liste (siehe 'v29-meine-mittel')
  // und kündigt kein Anlegen an.
  const zuMeinen = s.standardMittel.length >= store.STANDARD_HOECHSTENS
    ? 'Zu „Meine Mittel“ unter „Mehr“' : 'Zu „Meine Mittel“ unter „Mehr“ – dort ein Mittel anlegen';
  return `<div class="karte hinweis neu-karte" role="region" aria-labelledby="neuTitel">
    <h3 id="neuTitel">Neu: Hinweise zu zwei Mitteln zusammen</h3>
    <p class="klein">Zu einigen wenigen Paaren von Mitteln zeigt Body Check jetzt einen Hinweis, vor allem
      zu Methylphenidat zusammen mit einem Mittel gegen Magensäure. Was in der Fachinformation dazu steht,
      ist bei Methylphenidat von Präparat zu Präparat verschieden. Alle stehen unter „Mehr“ › „Meine
      Mittel“, einige auch hier oben.</p>
    <p class="klein">Steht kein Hinweis da, heißt das nicht, dass deine Mittel zusammenpassen. Body Check
      prüft nicht alle Mittel – das kann die Apotheke.</p>
    <p class="klein">Es klappt nur mit Mitteln, die hier stehen: unter „Meine Mittel“ oder in den letzten
      ${WECHSEL_TAGE} Tagen notiert. Was du regelmäßig nimmst, kannst du unter „Meine Mittel“ anlegen. Eine
      Einnahme wird dabei nicht notiert. Alles bleibt auf diesem Gerät.</p>
    <div class="reihe">
      ${knopf('v29-meine-mittel', 'Zu „Meine Mittel“', 'btn-primary', `aria-label="${zuMeinen}"`)}
      ${knopf('v29-gelesen', 'Gelesen', 'btn-ghost', 'aria-label="Neuigkeit gelesen"')}
    </div>
  </div>`;
}

/**
 * Was auf „Tag" steht, gilt als gezeigt – aber nur, wenn man es sieht: bei
 * sichtbarer Seite und ohne offenen Bogen. Nach einem Update lädt die App
 * oft unsichtbar neu; ein Stempel dabei verbrauchte die Karte „Neu" und den
 * ersten Tag der Rückfrage, ohne dass jemand sie gesehen hätte. Was so
 * gezeichnet wurde, wird beim Sichtbarwerden nachgestempelt.
 *
 * Gestempelt wird in einen eigenen Gerätespeicher (store.gezeigtMerken),
 * nie in den Tagebuchstand: Ansehen ist keine Handlung, und ein veralteter
 * zweiter Tab überschriebe sonst den neueren Stand.
 */
function gezeigtStempeln() {
  const g = ui.gezeigt;
  if (!g || ui.bogen || document.visibilityState !== 'visible') return;
  ui.gezeigt = null;
  // Über Mitternacht entscheidet das nächste Zeichnen.
  if (g.am !== heuteISO()) return;
  store.gezeigtMerken(g.am, g.rueckfrage, g.neu);
}

/**
 * Ein Tag, an dem nur ein ADHS-Mittel steht: für den Bauch eine Lücke. Die
 * Karte sagt das, statt still nichts zu zeigen – wer die Tablette eingetragen
 * hat, hält den Tag sonst für erledigt.
 */
function nurMittelKarte(liste) {
  if (!liste.some((e) => e.art === 'medikament' && istAdhsMittel(e.mittel))) return '';
  return `<div class="karte tagbilanz">
    <p class="klein">Eingetragen ist bisher nur ein Mittel. Zum Bauch steht nichts – für den
      Bauch zählt der Tag noch als Lücke, nicht als beschwerdefrei.</p>
  </div>`;
}

/*
 * Ein Angebot statt einer Einstellung, die niemand sucht.
 *
 * Steht ein ADHS-Mittel unter „Meine Mittel" oder im Tagebuch der letzten
 * Wochen, fragt „Tag" einmal, ob Body Check dazu mitzählen soll. Ebenso für
 * Kiefer, Nacken und Schiene, wenn eine Massage oder Wärme eingetragen ist
 * oder eine Notiz davon spricht – Nackenschmerz beim Kopfschmerz allein reicht
 * nicht: Nackenschmerz ist bei Migräne häufig. In Klinikstudien hatten ihn
 * gepoolt 77,0 % der Menschen mit Migräne (Übersichtsarbeit und
 * Metaanalyse, Cephalalgia 2022;42(7):663-673, PMID 35166137, Abstract), und
 * die Kopfschmerzklassifikation nennt Nackensteife oder -schmerz unter den
 * Vor- und Nachzeichen (ICHD-3, ichd-3.org, Kapitel 1, Einleitung: „neck
 * stiffness and/or pain"). Höchstens eine Karte,
 * ADHS zuerst, nur heute. „Nein danke" ist endgültig (der Schalter steht dann
 * auf false); umstellen lässt es sich nur noch unter „Mehr".
 *
 * Genannt wird der Gruppenname („Methylphenidat"), nie der eingetippte Name.
 */
const KIEFER_AKTIV = ['massagepistole', 'massage', 'waerme'];
const KIEFER_NOTIZ = /schiene|knirsch|kiefer/;

function angebotKarte(s) {
  const ab = plusTage(heuteISO(), -(WECHSEL_TAGE - 1));
  const neu = s.eintraege.filter((e) => e.am >= ab && e.am <= heuteISO());
  const umstellen = '<p class="klein">Umstellen kannst du das jederzeit unter „Mehr“ › „Was Body Check mitdenken soll“.</p>';
  if (s.adhsAn === null || s.adhsAn === undefined) {
    const name = [...s.standardMittel.map((m) => m.mittel),
      ...neu.filter((e) => e.art === 'medikament').map((e) => e.mittel)].find(istAdhsMittel);
    if (name) {
      return `<div class="karte karte-merk angebot">
        <p class="klein">${esc(wissenZu(name).gruppe)} gehört zu den Mitteln bei ADHS. Wenn du magst,
        zählt Body Check dazu mit: wann du es nimmst, ob mit oder ohne Essen, und wie Bauch, Kopf
        und Schlaf in den Stunden danach aussehen. Nur Zahlen, kein Rat – und wie alles hier nur
        auf diesem Gerät.</p>
        <div class="reihe">${knopf('adhs-angebot-ja', 'Einschalten', 'btn-primary')}
          ${knopf('adhs-angebot-nein', 'Nein danke', 'btn-ghost')}</div>
        ${umstellen}
      </div>`;
    }
  }
  if (s.spannungAn === null || s.spannungAn === undefined) {
    const aktiv = neu.filter((e) => e.art === 'aktivitaet')
      .flatMap((e) => e.aktivitaeten || []).find((id) => KIEFER_AKTIV.includes(id));
    const passt = (x) => typeof x === 'string' && KIEFER_NOTIZ.test(x.toLowerCase());
    const notiz = neu.some((e) => passt(e.text) || passt(e.notiz))
      || Object.entries(s.tage || {}).some(([iso, t]) => iso >= ab && t && passt(t.notiz));
    if (aktiv || notiz) {
      return `<div class="karte karte-merk angebot">
        <p class="klein">${aktiv ? `Du hast „${esc(aktivitaetName(aktiv, s.eigeneAktivitaeten))}“ eingetragen.`
    : 'In deinen Notizen steht etwas zu Kiefer oder Schiene.'} Wenn du magst, fragt der Tag
        zusätzlich nach Nacken und Schultern, dem Kiefer am Morgen, Pressen und einer
        Aufbissschiene. Dann zählt Body Check, ob Kopfschmerz mit ihnen zusammen öfter oder
        seltener kommt – als Zahlen fürs Gespräch, ohne Urteil.</p>
        <div class="reihe">${knopf('spannung-angebot-ja', 'Einschalten', 'btn-primary')}
          ${knopf('spannung-angebot-nein', 'Nein danke', 'btn-ghost')}</div>
        ${umstellen}
      </div>`;
    }
  }
  return '';
}

/**
 * Den Schalter „Kiefer, Nacken, Schiene" stellen – mit den vier Tagesfragen.
 *
 * An fügt sie in `tagesfragen` ein, aus nimmt sie heraus. Eingetragenes bleibt
 * in beiden Fällen, wo es ist: Ausschalten blendet nur aus.
 */
function spannungStellen(an) {
  const s = store.zustandLesen();
  const gewaehlt = Array.isArray(s.tagesfragen) ? s.tagesfragen : [];
  store.einstellen('tagesfragen', an
    ? [...new Set([...gewaehlt, ...SPANNUNG_FRAGEN])]
    : gewaehlt.filter((id) => !SPANNUNG_FRAGEN.includes(id)));
  store.einstellen('spannungAn', an);
}

const SCHALTER_AN = 'Eingeschaltet. Ausschalten blendet alles wieder aus – Eingetragenes bleibt.';
const SCHALTER_AUS = 'Ausgeschaltet. Eingetragenes bleibt und zählt weiter.';

/**
 * Hebt eine Stimulans-Einnahme an diesem Tag die Pause auf? Dann geht sie weg,
 * und die Meldung sagt es. Ohne Schalterprüfung: Ein Tag mit Einnahme ist kein
 * Tag ohne Mittel, ob „ADHS" gerade an ist oder nicht.
 */
function pauseAufheben(name, iso) {
  if (!istStimulans(name) || !(store.tagLesen(iso) || {}).adhsPause) return '';
  store.tagSetzen(iso, { adhsPause: null });
  return ' Der Tag ohne Mittel ist damit aufgehoben.';
}

/**
 * Die Reihe „Zuletzt gemacht" – oder nichts, solange keine Aktivität
 * eingetragen ist. Dann genügt der Knopf im Raster darunter.
 */
function aktivSchnellReihe(s, liste, iso) {
  const ids = zuletztAktivitaeten(s.eintraege, s.eigeneAktivitaeten, 5);
  if (!ids.length) return '';
  const heute = iso === heuteISO();
  const tag = fmtTag(iso);
  const wann = ['heute', 'gestern'].includes(tag) ? tag : `am ${tag}`;
  return `<div class="schnell">
    <p class="feld-name">Zuletzt gemacht – ${heute ? 'ein Tipp trägt ein' : 'die Zeit wählst du im Bogen'}</p>
    <div class="marken marken-eng">${ids.map((id) => {
    const a = aktivitaetVon(id, s.eigeneAktivitaeten);
    const da = liste.some((e) => e.art === 'aktivitaet' && (e.aktivitaeten || []).includes(id));
    return `<button type="button" class="marke marke-schnell" data-act="aktiv-schnell" data-id="${esc(id)}"
              aria-label="${esc(`${a.name} – ${wann} ${da ? 'schon eingetragen, noch einmal eintragen' : 'eintragen'}`)}">
        <span class="marke-i" aria-hidden="true">${a.icon}</span>${esc(kuerze(a.name, 22))}${da ? ' <span class="marke-zahl">✓</span>' : ''}
      </button>`;
  }).join('')}</div>
  </div>`;
}

/**
 * Wasser zählen: ein Tipp, ein Glas.
 *
 * Eine Reihe statt eines Knopfs im Raster darüber, weil hier nichts angelegt
 * wird – kein Bogen, keine Uhrzeit, keine Zeile im Strang. Das Plus ist groß,
 * weil es fast immer das Plus ist; das Minus nimmt einen Fehlgriff zurück und
 * ist bei null aus. Wie viel ein Glas ist, steht unter „Mehr“; die Literzahl
 * ist nur eine Umrechnung.
 *
 * Warum kein Eintrag und keine Mahlzeit, steht in js/wasser.js. Die Knöpfe
 * tragen eine id, damit der Fokus beim Neuzeichnen auf ihnen bleibt – wer mit
 * VoiceOver dreimal tippt, soll nicht dreimal suchen.
 */
function wasserZeile(s, iso) {
  const n = wasserVon((s.tage || {})[iso]);
  const liter = literText(n, s.wasserGlas);
  return `<div class="wasser" role="group" aria-label="Wasser ${esc(fmtTag(iso))}">
    <span class="wasser-name"><span aria-hidden="true">💧</span> Wasser</span>
    <button type="button" class="btn btn-rund wasser-weg" id="wasserWeniger" data-act="wasser"
            data-d="-1" aria-label="Ein Glas zurücknehmen"${n ? '' : ' disabled'}>−</button>
    <span class="wasser-zahl"><b>${n}</b> ${n === 1 ? 'Glas' : 'Gläser'}${liter
    ? `<span class="wasser-liter">${esc(liter)}</span>` : ''}</span>
    <button type="button" class="btn wasser-dazu" id="wasserMehr" data-act="wasser"
            data-d="1" aria-label="Ein Glas Wasser dazu">+</button>
  </div>`;
}

/**
 * „Geht gut" und „Geht nicht" – die Liste, die vom ersten Tag an etwas wert ist.
 *
 * Steht auf dem Tagesreiter, weil das der Reiter ist, den man aufmacht, und
 * zugeklappt, weil er sonst jeden Tag vor den Eintragungen stünde. Die Zahlen
 * in der Zusammenfassung sind der ganze Trick: Man sieht, dass da etwas ist,
 * ohne hinzusehen.
 *
 * Warum überhaupt auf dem Tagesreiter und nicht unter „Mehr": Unter „Mehr"
 * stehen Einstellungen, und das hier ist keine. Es ist die Antwort auf die
 * Frage, die abends tatsächlich ansteht – die gehört einen Tipp vom Start
 * entfernt und nicht zwei.
 */
function kuecheKarte(s) {
  const liste = s.kueche || [];
  const nach = (art) => liste.filter((x) => x.art === art);

  const zeile = (x) => `<li class="kueche-zeile k-${x.art}">
    <button type="button" class="kueche-dreh" data-act="kueche-dreh" data-id="${x.id}"
            aria-label="Auf die andere Liste setzen">
      ${x.art === 'geht' ? '👍' : '👎'}</button>
    <span class="kueche-text">${esc(x.name)}</span>
    <button type="button" class="strang-weg" data-act="kueche-weg" data-id="${x.id}"
            aria-label="Von der Liste nehmen">×</button>
  </li>`;

  const teil = (a) => {
    const meine = nach(a.id);
    return `<div class="kueche-teil">
      <p class="feld-name">${a.icon} ${esc(a.name)}${meine.length ? ` (${meine.length})` : ''}</p>
      ${meine.length ? `<ul class="kueche">${meine.map(zeile).join('')}</ul>`
    : `<p class="klein">${esc(a.frage)}</p>`}
      <div class="reihe">
        <input type="text" class="feld kueche-feld" id="kueche-${a.id}"
               maxlength="60" placeholder="${esc(a.name === 'Geht gut' ? 'Haferbrei' : 'Kaffee')}"
               aria-label="${esc(a.frage)}">
        ${knopf('kueche-neu', 'Dazu', '', `data-art="${a.id}"`)}
      </div>
    </div>`;
  };

  const gesamt = liste.length;
  return `<div class="karte">
    <details class="angebotbogen"${gesamt && !ui.kuecheOffen ? '' : ' open'}>
      <summary><h3>Was geht und was nicht</h3>
      <span class="klein">${gesamt
    ? `${nach('geht').length} × geht gut, ${nach('nicht').length} × lieber nicht. Zum Nachsehen antippen.`
    : 'Deine eigene Liste – ohne Rechnerei, ab dem ersten Tag.'}</span></summary>
      <p class="klein">Was du hier einträgst, wird <b>nicht ausgewertet</b> und
      zählt in keiner Statistik mit. Es ist eine Merkliste für den Moment, in
      dem du vor dem Kühlschrank stehst.</p>
      ${KUECHEN_ARTEN.map(teil).join('')}
      <p class="klein">Der Daumen schiebt etwas auf die andere Liste – was im
      Januar nicht ging, geht im März vielleicht wieder.</p>
    </details>
  </div>`;
}

/**
 * Wo die Auswertung der eigenen Liste widerspricht.
 *
 * Das Wertvollste, was aus der Verbindung von beidem herauskommen kann: Es
 * zeigt genau die Stelle, an der jemand sich täuscht – und zwar in der
 * Richtung, die er selbst nicht sehen kann, weil sie seiner Erfahrung
 * widerspricht.
 *
 * Aufgelöst wird der Widerspruch nicht. Die Liste bleibt, wie sie ist; die App
 * streicht nichts durch. Was jemand über seinen eigenen Körper weiß, hat
 * Vorrang vor achtzehn Mahlzeiten Datenlage – sie sagt nur, dass beides nicht
 * zusammenpasst, und überlässt den Schluss dem Menschen.
 */
function kuecheWiderspruchTeil(s, d) {
  const treffer = widersprechendeFunde(
    s.kueche || [], d.bilanz, (id) => ausloeserName(id, s.eigeneAusloeser),
  );
  if (!treffer.length) return '';

  return `<div class="karte karte-merk">
    <h3>Das passt nicht zu deiner Liste</h3>
    <p class="klein">Du hast das selbst eingeordnet, und die Zahlen sagen etwas
    anderes. Beides kann stimmen – deine Liste bleibt, wie sie ist.</p>
    <ul class="wartend">${treffer.map((t) => `<li class="geprueft g-${t.richtung}">
      <span><b>${esc(t.name)}</b>
        <span class="zeile-tags">steht bei dir unter
          „${t.art === 'geht' ? 'Geht gut' : 'Geht nicht'}"</span></span>
      <p class="klein">${esc(widerspruchsSatz(t))}</p>
    </li>`).join('')}</ul>
  </div>`;
}

/**
 * Der laufende Auslassversuch, auf dem Reiter, den man täglich sieht.
 *
 * Ein Versuch, an den man sich nicht erinnert, ist keiner. Deshalb steht hier
 * jeden Tag, was heute gilt und der wievielte Tag es ist – und wenn die
 * Auslasszeit um ist, der Knopf für die Wiedereinführung. Das ist der Moment,
 * an dem der Versuch sonst versandet: Zwei Wochen durchgehalten, dann nie
 * bewusst wieder gegessen, und damit war alles umsonst.
 */
function versuchZeile(s, iso) {
  const v = s.versuch;
  if (!v || iso !== heuteISO()) return '';
  const st = versuchStand(v, heuteISO());
  if (st.phase === 'abgebrochen' || st.phase === 'fertig') return '';
  const was = v.art === 'klasse' ? klasseName(v.ziel) : ausloeserName(v.ziel, s.eigeneAusloeser);

  if (st.phase === 'reif') {
    return `<div class="karte karte-merk versuch-zeile">
      <h3>Der Versuch ist reif</h3>
      <p class="klein">${st.von} Tage ohne ${esc(was)} sind um. Jetzt kommt der
      Teil, auf den es ankommt: einmal bewusst wieder essen. Kommen die
      Beschwerden zurück, ist das der Beleg – bleibt es ruhig, war es nicht das.</p>
      <div class="reihe">
        ${knopf('versuch-provokation', 'Heute wieder gegessen', 'btn-primary')}
        ${knopf('versuch-beenden', 'Abbrechen', 'btn-ghost')}
      </div>
    </div>`;
  }
  const heutigeVerstoesse = s.eintraege
    .filter((e) => e.am === iso && betrifft(e, v.art, v.ziel)).length;
  return `<div class="karte versuch-zeile">
    <h3>${st.phase === 'provokation' ? 'Wiedereinführung' : 'Auslassversuch'}</h3>
    <p class="klein">${st.phase === 'provokation'
    ? `Noch ${mehrzahl(st.rest, 'Tag', 'Tage')} beobachten. Einfach weiter eintragen wie sonst.`
    : `Tag ${st.tag} von ${st.von} – heute ohne <b>${esc(was)}</b>.`
      + (heutigeVerstoesse ? ` Heute steht es ${heutigeVerstoesse}× im Tagebuch; das ist kein Vorwurf, es geht nur in die Auswertung ein.` : '')}</p>
    ${knopf('versuch-beenden', 'Abbrechen', 'btn-ghost')}
  </div>`;
}

/**
 * Der Stufenplan auf dem Tagesreiter – die wichtigste Zeile der ganzen App,
 * solange er läuft.
 *
 * Ein Plan über zehn Wochen scheitert im Alltag nicht am Verzicht, sondern
 * daran, dass nach der dritten Woche niemand mehr weiß, welche Gruppe dran
 * ist, in welcher Menge und ob heute noch Pause ist. Deshalb steht hier jeden
 * Tag genau ein Satz: was heute zu tun ist. Und deshalb steht er ganz oben,
 * vor allem anderen.
 */
function planZeile(s, iso) {
  const p = s.stufenplan;
  if (!p || p.beendet || iso !== heuteISO()) return '';
  const b = planBild(p, s.eintraege, s.tage, heuteISO());
  if (!b.schritt) return '';
  const merk = b.stand.phase === 'stufe' || b.stand.phase === 'bereit'
    || b.stand.phase === 'entscheid';

  return `<div class="karte ${merk ? 'karte-merk ' : ''}plan-zeile">
    <h3>${b.stand.phase === 'karenz' ? 'Karenz'
    : (b.stand.phase === 'stufe' ? 'Wiedereinführung' : 'Stufenplan')}</h3>
    <p class="klein">${esc(b.schritt.satz)}</p>
    ${b.stand.phase === 'bereit'
    ? `<div class="reihe">${knopf('stufe-los', 'Diese Gruppe jetzt anfangen', 'btn-primary')}</div>`
    : ''}
    ${b.stand.phase === 'entscheid'
    ? '<p class="klein">Das Ergebnis der Karenz steht unter „Muster".</p>' : ''}
  </div>`;
}

/**
 * Der laufende Provokationstest, auf dem Tagesreiter.
 *
 * Anders als beim Auslassversuch besteht dieser Test nicht aus Durchhalten,
 * sondern aus einzelnen Terminen, die man sich selbst setzt – und genau daran
 * scheitert er ohne diese Zeile. Sie sagt jeden Morgen eines von drei Dingen:
 * heute dran, heute nicht (weil der letzte Durchgang nachhallt), oder: jetzt
 * fehlt noch der Leerdurchgang.
 */
function provokationZeile(s, iso) {
  const p = s.provokation;
  if (!p || p.beendet || iso !== heuteISO()) return '';
  const schritt = naechsterSchritt(p, heuteISO(), provokationsBild(p, s.eintraege, heuteISO()).urteil);
  if (!schritt || !schritt.dran) {
    return schritt ? `<div class="karte provokation-zeile">
      <h3>Provokationstest</h3>
      <p class="klein">${esc(schritt.satz)}</p>
    </div>` : '';
  }
  return `<div class="karte karte-merk provokation-zeile">
    <h3>${schritt.leer ? 'Heute der Leerdurchgang' : 'Heute ein Durchgang'}</h3>
    <p class="klein">${esc(schritt.satz)}</p>
    <div class="reihe">
      ${knopf(schritt.leer ? 'prov-leer' : 'prov-lauf',
    schritt.leer ? 'Leerdurchgang gemacht' : 'Jetzt genommen', 'btn-primary')}
    </div>
  </div>`;
}

/**
 * Die Erinnerung an die Sicherung – dort, wo sie jemand sieht.
 *
 * Unter „Mehr" steht seit jeher, wann zuletzt gesichert wurde. Nur macht
 * niemand „Mehr" auf, um sich Sorgen zu holen. Diese Karte steht auf dem
 * Reiter, den man täglich sieht, und sie geht mit einem Tipp wieder weg –
 * für sieben Tage, nicht für immer. Es ist die einzige Kopie, die es von
 * diesem Tagebuch je geben wird.
 */
function sicherungKarte(iso) {
  // Nach dem Holen fordert die Ergebniskarte schon zum Sichern auf; zwei
  // Karten untereinander mit derselben Bitte sind eine zu viel.
  if (iso !== heuteISO() || ui.umzug) return '';
  const f = store.sicherungFaellig();
  if (!f) return '';
  const satz = {
    nie: `Du hast ${mehrzahl(f.neue, 'Eintrag', 'Einträge')} und noch nie gesichert.`,
    anzahl: `Seit der letzten Sicherung sind ${mehrzahl(f.neue, 'Eintrag', 'Einträge')} dazugekommen.`,
    zeit: `Die letzte Sicherung ist ${mehrzahl(f.seit, 'Tag', 'Tage')} her, seitdem `
      + `${mehrzahl(f.neue, 'neuer Eintrag', 'neue Einträge')}.`,
  }[f.grund];
  return `<div class="karte karte-merk">
    <h3>Zeit für eine Sicherung</h3>
    <p class="klein">${satz} Alles liegt nur ${speicherOrt().wo} – wird
    ${speicherOrt().wessen} Speicher gelöscht, ist das Tagebuch weg. Dauert
    zehn Sekunden.</p>
    ${istApfel() && typeof navigator.canShare === 'function' ? `<p class="klein">So
      geht’s: Tippe auf <b>Als Datei</b> und dann weiter unten in der Liste auf
      <b>In Dateien sichern</b>. Wähle <b>iCloud Drive</b> (steht es nicht da:
      <b>Auf meinem ${geraetName(geraet())}</b>) und tippe oben rechts auf
      <b>Sichern</b>. Mehr dazu unter „Mehr“ › „Anleitung“.</p>` : ''}
    <div class="reihe">
      ${knopf('export', 'Als Datei', 'btn-primary')}
      ${knopf('sicherung-text', 'Als Text')}
      ${knopf('sicherung-spaeter', 'Später', 'btn-ghost')}
    </div>
  </div>`;
}

/**
 * Die Vorschläge für heute.
 *
 * Jeder trägt sein „warum" sichtbar mit sich, und woher es kommt: aus dem
 * eigenen Verlauf oder aus allgemeinen Hinweisen (siehe 'allgemein' im Kopf
 * von js/rat.js). Ohne diese Unterscheidung wäre beides gleich viel wert, und
 * das ist es nicht.
 */
/*
 * Vorsicht beim Essen (siehe ESSEN_VORSICHT in js/rat.js): nur mit dem
 * Schalter ADHS und einer Einnahme in den letzten 14 Tagen. Gebremst wird,
 * wenn das Gewicht ungewollt sinkt oder „Kein Appetit" an mindestens drei der
 * letzten sieben Tage mit Bauch-Angaben steht.
 */
function essenVorsichtVon(s, heute) {
  if (s.adhsAn !== true) return null;
  const ab = plusTage(heute, -13);
  const einnahme = adhsEinnahmen(s.eintraege.filter((e) => e.am >= ab && e.am <= heute)).length > 0;
  if (!einnahme) return null;
  const gewicht = gewichtsBild(s.gewicht, heute, s.abnehmenGewollt);
  if (gewicht && gewicht.warnung) return 'bremse';
  const bauchTage = [];
  for (let i = 0; i < 400 && bauchTage.length < 7; i++) {
    const iso = plusTage(heute, -i);
    if (tagesWert(s.eintraege, iso, s.tage).notiert) bauchTage.push(iso);
  }
  const appetit = bauchTage.filter((iso) => s.eintraege.some((e) => e.am === iso && e.art === 'beschwerde'
    && (e.arten || []).includes('appetit'))).length;
  return appetit >= 3 ? 'bremse' : 'zusatz';
}

function ratKarte(s) {
  const letzteMahlzeit = [...s.eintraege].reverse().find((e) => e.art === 'essen');
  const mittel = new Map();
  s.eintraege.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = String(e.mittel || '').trim();
    if (name) mittel.set(name, e.am);
  });

  const liste = raete({
    eintraege: s.eintraege,
    tage: s.tage,
    heute: heuteISO(),
    eigene: s.eigeneAusloeser,
    bilanz: ausloeserBilanz(s.eintraege, {
      fenster: s.fenster, mindestFaelle: s.mindestFaelle, eigene: s.eigeneAusloeser,
    }),
    faktoren: faktorenBilanz(s.eintraege, s.tage, tagesWert),
    phasen: phasenBilanz(s.eintraege, s.tage, tagesWert),
    // Wie lange das Essen jetzt her ist – ohne die Reihenfolge-Frage einer
    // Beschwerde: Was schon eingetragen ist, wurde vorher gegessen.
    letzteMahlzeitStunden: letzteMahlzeit
      ? stundenSeitLetzterMahlzeit(s.eintraege, heuteISO(), jetztUhr()) : null,
    mittel: [...mittel.entries()].slice(-3).map(([name, am]) => ({ name, zuletzt: fmtDatum(am) })),
    essenVorsicht: essenVorsichtVon(s, heuteISO()),
  });

  if (!liste.length) return '';
  return `<div class="karte rat">
    <h3>Für heute</h3>
    <ul class="raete">${liste.map((r) => `<li class="rat-${r.bereich}">
      <div class="rat-kopf">
        <span class="rat-i" aria-hidden="true">${BEREICH_ICON[r.bereich]}</span>
        <b>${esc(r.titel)}</b>
        <span class="rat-quelle q-${r.quelle}">${r.quelle === 'eigen' ? 'aus deinem Verlauf' : 'allgemein'}</span>
      </div>
      <p>${esc(r.text)}</p>
      <p class="klein">${esc(r.warum)}</p>
    </li>`).join('')}</ul>
    <p class="klein">„Aus deinem Verlauf" heißt: aus deinen eigenen Eintragungen
    gerechnet, mit den Zahlen daneben. „Allgemein" heißt: allgemeine Hinweise,
    oft nicht gut untersucht – dein eigener Verlauf sticht das.</p>
  </div>`;
}

/* ==================== Reiter: Verlauf ==================== */

function verlaufAnsicht(s) {
  const bis = heuteISO();
  const von = plusTage(bis, -(ui.zeitraum - 1));
  const reihe = verlaufReihe(s.eintraege, von, bis, s.tage);
  const z = gesamtZahlen(s.eintraege, s.tage, von, bis);
  const serie = serieOhne(s.eintraege, s.tage, bis);

  const wahl = `<div class="wahl">${[14, 30, 90].map((n) => `
    <button type="button" class="wahl-btn${ui.zeitraum === n ? ' an' : ''}"
            data-act="zeitraum" data-n="${n}">${n} Tage</button>`).join('')}</div>`;

  const zahlen = `<div class="kacheln">
    <div class="kachel"><b>${z.notierteTage}</b><span>Tage notiert</span></div>
    <div class="kachel"><b>${z.notierteTage ? `${Math.round(z.anteil * 100)} %` : '–'}</b><span>davon mit Beschwerden</span></div>
    <div class="kachel"><b>${z.notierteTage ? fmtZahl(z.schnitt) : '–'}</b><span>Stärke im Mittel</span></div>
    <div class="kachel"><b>${serie}</b><span>${serie === 1 ? 'Tag' : 'Tage'} frei in Folge</span></div>
  </div>`;

  const richtung = trendKarte(s, bis);

  const tafel = z.notierteTage
    ? verlaufTafel(reihe, { titel: 'Stärkste Beschwerde je Tag', hinweis: '0 – 10' })
    : '<p class="leer">Noch keine Eintragungen in diesem Zeitraum.</p>';

  // --- Monatsraster ---
  const mitEintrag = new Set(s.eintraege.map((e) => e.am));
  const felder = monatsRaster(ui.monat).map((iso) => {
    const t = tagesWert(s.eintraege, iso, s.tage);
    const fremd = iso.slice(0, 7) !== ui.monat.slice(0, 7);
    // Ein Tag mit nur einem Kopfschmerz ist für den Bauch eine Lücke – aber
    // keine stumme: Er bekommt eine eigene Stufe, damit niemand „nichts
    // eingetragen" liest, wo „Kopf 8" steht.
    const stufe = !t.notiert ? (t.kopf ? 'kopf' : 'leer')
      : (t.wert === 0 ? 'gut' : (t.wert >= 7 ? 'schlecht' : (t.wert >= 4 ? 'mittel' : 'leicht')));
    // Ein Tag mit nur einem ADHS-Mittel oder einer Aktivität bleibt in der
    // Farbe eine Lücke, sagt aber, dass dort etwas steht – „nichts
    // eingetragen" wäre für den, der die Tablette eingetragen hat, falsch.
    const wort = t.notiert
      ? (t.wert === 0 ? 'beschwerdefrei' : `Stärke ${t.wert}`)
      : (t.kopf ? `nur Kopfschmerz ${t.kopf} – zum Bauch nichts eingetragen`
        : (mitEintrag.has(iso) ? 'nur Mittel oder Aktivität – zum Bauch nichts eingetragen' : 'nichts eingetragen'));
    return `<button type="button" class="rfeld f-${stufe}${fremd ? ' fremd' : ''}${iso === heuteISO() ? ' heute' : ''}"
      data-act="tag-waehlen" data-iso="${iso}"
      aria-label="${fmtDatum(iso, true)}: ${wort}">
      <span>${Number(iso.slice(8))}</span></button>`;
  }).join('');

  const raster = `<div class="karte">
    <div class="monatkopf">
      ${knopf('monat-blaettern', '‹', 'btn-rund', 'data-d="-1" aria-label="Monat zurück"')}
      <h3>${esc(fmtMonat(ui.monat))}</h3>
      ${knopf('monat-blaettern', '›', 'btn-rund', `data-d="1" ${monatsStart(heuteISO()) === ui.monat ? 'disabled' : ''} aria-label="Monat vor"`)}
    </div>
    <div class="wochekopf">${WOCHE_KOPF.map((w) => `<span>${w}</span>`).join('')}</div>
    <div class="raster">${felder}</div>
    <div class="legende">
      <span><i class="f-gut"></i> frei</span><span><i class="f-leicht"></i> 1–3</span>
      <span><i class="f-mittel"></i> 4–6</span><span><i class="f-schlecht"></i> 7–10</span>
      <span><i class="f-leer"></i> nichts eingetragen oder zum Bauch nichts</span>
      <span><i class="f-kopf"></i> nur Kopfschmerz</span>
    </div>
  </div>`;

  return `${wahl}${zahlen}${richtung}<div class="karte">${tafel}</div>${raster}`;
}

/**
 * Wird es besser oder schlechter?
 *
 * Die Frage, die jeder stellt, der ein Tagebuch führt – und die diese App bis
 * eben nicht beantwortet hat: Alles war über den ganzen Zeitraum gemittelt.
 *
 * Sie steht auf dem Verlaufsreiter und nicht unter „Muster", weil sie keine
 * Einordnung ist, sondern eine Beobachtung. Und sie hält sich zurück: Eine
 * ganze Stufe Unterschied ist die Schwelle, darunter heißt es „kein
 * deutlicher Unterschied". Beschwerden schwanken von selbst, und aus jeder
 * Schwankung eine Richtung zu machen wäre ein Orakel, das mal grundlos Mut
 * macht und mal grundlos Angst.
 */
function trendKarte(s, bis) {
  const t = trend(s.eintraege, s.tage, bis, 14);
  if (!t.pruefbar) {
    return `<div class="karte">
      <h3>Wird es besser oder schlechter?</h3>
      <p class="klein">Dafür braucht es zweimal ${t.fenster} notierte Tage zum
      Vergleichen – noch ${mehrzahl(t.fehlt, 'Tag', 'Tage')} fehlen. Gezählt
      werden notierte Tage, nicht Kalendertage: Wer in einer schlechten Woche
      seltener einträgt, hätte sonst rechnerisch eine gute Woche.</p>
    </div>`;
  }
  return `<div class="karte trend t-${t.richtung}">
    <div class="fund-kopf">
      <h3>Wird es besser oder schlechter?</h3>
      <span class="fund-urteil">${TREND_WORT[t.richtung]}</span>
    </div>
    ${vergleichBalken(t.jetzt.schnitt, t.davor.schnitt,
    { mit: 'zuletzt', ohne: 'davor' })}
    <p class="klein">Die letzten ${t.jetzt.tage} notierten Tage gegen die
      ${t.davor.tage} davor · ${t.jetzt.frei} beschwerdefreie Tage gegen
      ${t.davor.frei}</p>
    <p class="klein">${t.richtung === 'gleich'
    ? 'Der Unterschied liegt unter einer Stufe. Das heißt nicht „nichts tut sich" – es heißt, dass sich aus diesen Zahlen keine Richtung ablesen lässt.'
    : 'Verglichen werden notierte Tage, nicht Kalendertage – eine Lücke im Tagebuch ist kein guter Tag. Beschwerden schwanken auch von selbst; eine Richtung über vier Wochen ist ein Hinweis, keine Gewissheit.'}</p>
  </div>`;
}

/* ==================== Reiter: Muster ==================== */

/*
 * Der Hinweis auf die Unterleibsfragen – und warum er nicht immer dasteht.
 *
 * Die drei Fragen (Schmerz beim Sex, tief oder außen, Regelschmerz) sind
 * standardmäßig aus. Das ist richtig: Eine App, die sich ungefragt nach dem
 * Sexleben erkundigt, wird zugeklappt, und dann ist auch alles andere weg.
 *
 * Nur hätte das eine Folge, die man kennt – niemand schaltet je etwas ein, das
 * er nicht kennt. Also fragt die App nach, aber erst, wenn ihre eigenen Daten
 * in diese Richtung zeigen: Blutungen eingetragen und der Bauch dabei
 * messbar schlechter. Dann ist der Hinweis eine Hilfe und keine
 * Zudringlichkeit, und er kann sagen, warum er kommt.
 *
 * Der Grund gehört dazu. „Schalt mal diese Fragen ein" ist übergriffig;
 * „dein Bauch ist an Blutungstagen um 1,8 Stufen schlechter, und das kommt
 * auch bei einer Endometriose vor" ist eine Auskunft, über die jemand selbst
 * entscheiden kann.
 *
 * Was die Karte sagt, und woher:
 *
 *   * gesund.bund.de, Regelschmerzen (mit IQWiG, Stand 27.08.2024):
 *     „Regelschmerzen sind weit verbreitet." – „Einige Frauen leiden
 *     zusätzlich zu Krämpfen an Übelkeit, Erbrechen oder Durchfall." – „Bei
 *     sehr starken oder sich verschlimmernden Schmerzen ist eine ärztliche
 *     Untersuchung sinnvoll." Dort auch: „Bei starken Schmerzen kann auch
 *     eine Endometriose der Grund sein."
 *   * gesund.bund.de, Endometriose (mit IQWiG, Stand 21.08.2025): „Das
 *     Hauptsymptom einer Endometriose sind Unterleibsschmerzen. Sie treten
 *     oft während der Monatsblutung auf. Aber auch Schmerzen beim oder nach
 *     dem Geschlechtsverkehr können auf Endometriose hinweisen." – „Auch kann
 *     es zu Übelkeit, Erbrechen und Durchfall kommen." – „Oft dauert es Jahre
 *     bis zur Diagnose".
 *
 * Bis zur Fassung 29 stand hier, das Muster sei „für sich genommen harmlos",
 * Endometriose werde „im Mittel sieben bis zehn Jahre lang für einen
 * Reizdarm gehalten", und Schmerz beim Sex und die Stärke des Regelschmerzes
 * unterschieden sie vom Reizdarm, „nach denen in der Magensprechstunde
 * niemand fragt". Die Entwarnung widerspricht dem Rat zur Abklärung starker
 * Schmerzen; die Zahl, die Verwechslung mit dem Reizdarm, die Abgrenzung und
 * der Satz über die Sprechstunde stehen in keiner erreichbaren Quelle.
 */
function unterleibVorschlag(s) {
  if (s.unterleibGefragt) return '';
  const v = fragenVorschlagen(s.eintraege, s.tage, tagesWert, s.tagesfragen);
  if (!v) return '';
  return `<div class="karte karte-merk">
    <h3>Zwei Fragen, die hier weiterhelfen könnten</h3>
    <p class="klein">An deinen Blutungstagen ist der Bauch im Mittel um
    <b>${v.differenz.toFixed(1).replace('.', ',')} Stufen</b> schlechter als
    sonst (${mehrzahl(v.blutungsTage, 'Blutungstag', 'Blutungstage')} verglichen).
    Beschwerden während der Regel sind weit verbreitet, bei manchen auch mit
    Übelkeit, Erbrechen oder Durchfall. Bei sehr starken oder sich
    verschlimmernden Schmerzen ist eine ärztliche Untersuchung sinnvoll.</p>
    <p class="klein">Beschwerden rund um die Regel kommen auch bei einer
    <b>Endometriose</b> vor: Typisch sind Unterleibsschmerzen, oft während der
    Monatsblutung; auch <b>Schmerzen beim oder nach dem Sex</b> können darauf
    hinweisen. Bis zu dieser Diagnose dauert es oft Jahre. Ob das bei dir eine
    Rolle spielt, kann nur eine ärztliche Untersuchung klären, etwa in der
    frauenärztlichen Praxis. Die zwei Fragen dazu: Schmerz beim Sex (und ob er
    tief innen sitzt oder außen) und <b>wie stark der Regelschmerz</b> ist.</p>
    <p class="klein">Die Fragen sind ausgeschaltet, und das bleiben sie, wenn
    du willst. Eingeschaltet erscheinen sie als zwei Regler beim Tageseintrag,
    und die App kann sagen, ob sich daraus ein Muster ergibt.</p>
    <div class="reihe">
      ${knopf('unterleib-an', 'Fragen einschalten', 'btn-primary')}
      ${knopf('unterleib-nein', 'Nein danke', 'btn-ghost')}
    </div>
  </div>`;
}

/*
 * Wie viel davon – die Frage, die über eine Streichliste entscheidet.
 *
 * „Zwiebeln sind auffällig" legt genau eine Handlung nahe: streichen. Und das
 * ist fast immer zu viel. Steht daneben, dass es als Würze unauffällig war und
 * erst als Hauptzutat auffällt, wird aus einem Verbot eine Faustregel – und
 * die hält jemand auch nach vier Wochen noch ein.
 *
 * Der Block steht nicht zugeklappt wie die anderen beiden, wenn er eine
 * Schwelle gefunden hat: Das ist die Auskunft, die den Alltag ändert, und sie
 * hinter einem Dreieck zu verstecken hieße, sie nicht ernst zu nehmen.
 */
function dosisBlock(d) {
  const geprueft = d.stufen.filter((st) => st.pruefbar);
  const liste = geprueft.length ? `<ul class="schichten">${geprueft.map((st) => `<li>
    <span>${esc(st.name)}${st.auffaellig ? ' ⚠' : ''}</span>
    <span class="klein">${fmtZahl(st.schnitt)} gegen ${fmtZahl(st.schnittOhne)}
      · ${st.faelle} Mahlzeiten</span>
  </li>`).join('')}</ul>` : '';

  return `<details class="stand d-${d.urteil}" ${d.urteil === 'schwelle' ? 'open' : ''}>
    <summary>Wie viel davon? <b>${DOSIS_WORT[d.urteil]}</b></summary>
    <p class="klein">${esc(d.satz)}</p>
    ${liste}
    <p class="klein">Verglichen wird jede Menge gegen dieselbe Gruppe: die
    ${d.gegenFaelle} Mahlzeiten ohne diese Zutat. „Getränk dazu" zählt hier
    nicht mit – ein Glas Wein ist keine kleinere Menge, sondern etwas anderes.</p>
  </details>`;
}

/*
 * Was von einem Verdacht übrig bleibt, wenn man die Umstände gleich hält.
 *
 * Der wichtigste Teil dieser Anzeige ist nicht das Urteil, sondern die Liste
 * darunter: Wer sehen kann, in welcher Schicht wie viele Fälle steckten,
 * kann selbst einschätzen, wie viel das Urteil wiegt. Ein Urteil ohne seine
 * Grundlage ist ein Orakel.
 */
function schichtBlock(stand) {
  const geprueft = stand.schichten.filter((x) => x.pruefbar);
  const liste = geprueft.length ? `<ul class="schichten">${geprueft.map((x) => `<li>
    <span>${esc(x.name)}</span>
    <span class="klein">${fmtZahl(x.schnittMit)} gegen ${fmtZahl(x.schnittOhne)}
      · ${x.faelle}/${x.gegenFaelle} Mahlzeiten</span>
  </li>`).join('')}</ul>` : '';

  return `<details class="stand s-${stand.urteil}">
    <summary>Liegt es wirklich daran? <b>${SCHICHT_WORT[stand.urteil]}</b></summary>
    <p class="klein">${esc(stand.satz)}</p>
    ${liste}
    <p class="klein">Verglichen wird jeweils <b>innerhalb</b> gleicher
    Umstände: Wer an angespannten Tagen anders isst, findet sonst das Essen
    auffällig, obwohl es an der Anspannung liegt.</p>
  </details>`;
}

/**
 * Alles einmal rechnen, dann herumreichen.
 *
 * Der Reiter „Muster" zeigt inzwischen sechs Abschnitte, und vier davon
 * brauchen dieselben Grundlagen – die Auslöserbilanz, die Kriterien, die
 * Mittel. Jeder für sich gerechnet wäre bei einem Jahr Tagebuch spürbar, und
 * schlimmer: Zwei Abschnitte könnten verschiedene Zahlen zeigen, wenn einer
 * andere Voreinstellungen mitgibt als der andere.
 */
function musterDaten(s) {
  const heute = heuteISO();
  // Für den Magen zählt ein Kombinationsmittel mit ASS oder Ibuprofen wie ein NSAR.
  const istNsar = (name) => {
    const g = wissenZu(name);
    return !!g && (g.id === 'nsar' || g.id === 'kombi');
  };
  // Dieselbe Frage, aber mit der ganzen Antwort: welche Gruppe. Der Kopf
  // braucht sie, weil er mehrere Klassen von Akutmitteln auseinanderhält.
  // Auch ein ADHS-Mittel hat hier seine Gruppe – sonst stünde es am
  // Kopfschmerztag unter „nicht zugeordnet", als wäre es ein Schmerzmittel,
  // das die App nicht kennt.
  const gruppeVon = (name) => {
    const g = wissenZu(name);
    return g ? g.id : null;
  };
  const bilanz = ausloeserBilanz(s.eintraege, {
    fenster: s.fenster, mindestFaelle: s.mindestFaelle, eigene: s.eigeneAusloeser,
  });
  const klassen = klassenBilanz(s.eintraege, { fenster: s.fenster });
  // Einmal für alle: Die Schichtung unten braucht dieselbe Liste wie die
  // Bilanz, und zweimal gerechnet wäre sie bei einem Jahr Tagebuch spürbar.
  const bewertet = bewerteteMahlzeiten(s.eintraege, s.fenster);
  const k = kriterien({
    eintraege: s.eintraege,
    tage: s.tage,
    heute,
    beschwerdenSeit: s.beschwerdenSeit,
    istSaeuremittel: (name) => {
      const g = wissenZu(name);
      return !!g && ['ppi', 'h2', 'antazida', 'alginat'].includes(g.id);
    },
  });
  const mittel = mittelBilanz(s.eintraege, s.tage, {
    heute,
    gruppeVon: (name) => {
      const g = wissenZu(name);
      return g ? g.id : null;
    },
  });
  // Die Fensterwerte einmal für alle: Sie kosten einen Durchlauf über alle
  // Beschwerden und werden von der Übersichtskarte und von jedem Fund
  // gebraucht.
  const fenster = fensterWerte(s.eintraege);
  // Gesucht wird nur unter denen, die die Bilanz nicht ohnehin schon nennt –
  // sonst stünde dieselbe Zutat zweimal da, einmal je Rechenweg.
  const uebersehen = spaeteFunde(
    fenster,
    bilanz.filter((b) => !['auffaellig', 'moeglich'].includes(einstufung(b))).map((b) => b.id),
    s.fenster || 4,
  );
  /*
   * Wechselt die Wirkung mit dem Zyklus?
   *
   * Gefragt wird für *alle* Auslöser mit genug Fällen, nicht nur für die
   * auffälligen – und das ist der Punkt: Ein Auslöser, der in einer Phase
   * wirkt und in dreien nicht, kommt im Schnitt über alle vier Wochen als
   * „unauffällig" oder „ein bisschen" heraus. Genau dann versteckt der
   * Mittelwert den Befund, statt ihn zu zeigen.
   */
  const wechsel = wechselnde(bewertet, bilanz.filter((b) => b.genug).map((b) => b.id), s.tage);

  /*
   * Das Bild und die Lücken einmal für alle.
   *
   * Beides wurde bis eben zweimal je Anzeige gerechnet – einmal für die
   * Einordnung oben, einmal für „Was noch fehlt" unten. Seit die Zusammen-
   * fassung dazugekommen ist, wären es drei. Und schlimmer als der Aufwand
   * wäre, dass drei Stellen auseinanderlaufen können.
   */
  const bild = bildLesen({
    eintraege: s.eintraege,
    tage: s.tage,
    bilanz,
    name: (id) => ausloeserName(id, s.eigeneAusloeser),
    istNsar,
  });
  const benutzt = {};
  ['oberbauch', 'saettigung'].forEach((id) => {
    benutzt[id] = s.eintraege.some((e) => (e.arten || []).includes(id));
  });
  const luecke = luecken({
    kriterien: k,
    stuhl: stuhlZahlen(s.eintraege, s.tage),
    bezug: bezugBilanz(s.eintraege),
    klassen,
    mittel,
    musterIds: bild.muster.map((m) => m.id),
    essen: essensbezugVon(s),
    // Die letzten 90 Tage: Drei Ibuprofen-Tage in zwei Jahren sind kein
    // „regelmäßig", und die Frage soll zum Tagebuch von jetzt passen.
    nsarTage: [...new Set(s.eintraege
      .filter((e) => e.art === 'medikament' && e.am >= plusTage(heute, -89) && istNsar(e.mittel))
      .map((e) => e.am))].length,
    nsarKopfTage: kopfMittel(s.eintraege.filter((e) => e.am >= plusTage(heute, -89)), gruppeVon, heute).mitNsar,
    befundIds: (s.befunde || []).map((b) => b.id),
    warnIds: bild.warnungen.map((w) => w.id),
    krampfAnteil: artAnteilVon(s, ['krampf']),
    benutzt,
    nachtwachAn: (s.tagesfragen || []).includes('nachtwach'),
    versuchMoeglich: vorschlaege(klassen, bilanz).length > 0,
    versuchLaeuft: !!s.versuch && !s.versuch.beendet,
    mahlzeitenOhneZutaten: s.eintraege
      .filter((e) => e.art === 'essen' && !zutatenVon(e).length).length,
  });

  /*
   * Die auffälligen Funde samt ihrer beiden Nachprüfungen.
   *
   * Nur für die auffälligen: Für Unauffälliges gäbe es nichts zu entkräften,
   * und jede zusätzliche Rechnung ist eine zusätzliche Gelegenheit für einen
   * Zufallstreffer. Einmal hier statt einmal je Anzeigestelle – die
   * Zusammenfassung oben muss dasselbe Urteil zeigen wie der Fund unten.
   */
  const gepruefte = bilanz
    .filter((b) => b.genug && ['auffaellig', 'moeglich'].includes(einstufung(b)))
    .map((b) => ({
      b,
      // Mit den Kopfschmerztagen: Die vierte Schicht fragt, ob der Unterschied
      // auch an Tagen ohne Migräne hält – siehe js/schichten.js.
      stand: haeltStand(bewertet, b.id, s.tage, { kopfTage: kopfTageVon(s.eintraege) }),
      profil: zeitProfil(fenster, b.id),
      // „Wie viel davon?" fragt nach der Rolle einer Zutat. Eine große Portion
      // oder ein Essen auswärts hat keine – die Frage stünde dort ohne Antwort.
      dosis: UMSTAND_IDS.includes(b.id) ? null : dosisBild(s.eintraege, b.id, s.fenster),
    }));

  /*
   * Die Familien der Fassung 28 – ADHS und Kiefer/Nacken – immer gerechnet,
   * auch mit ausgeschalteten Schaltern (R0): Die Schalter entscheiden nur,
   * was zu sehen ist. Einmal hier, damit die Karten unten und die Vorbehalte
   * an den alten Rechnungen dieselben Zahlen sehen.
   */
  const adhs = adhsAuswertung({
    eintraege: s.eintraege, tage: s.tage, heute, mindestFaelle: s.mindestFaelle,
    standardMittel: s.standardMittel, gewicht: s.gewicht,
  });
  const spannung = spannungAuswertung({
    eintraege: s.eintraege, tage: s.tage, heute, fenster: s.fenster, mindestFaelle: s.mindestFaelle,
    standardMittel: s.standardMittel,
  });
  const zeit = zeitBild(s.eintraege);

  return {
    heute, istNsar, gruppeVon, bewertet, bilanz, klassen, kriterien: k, mittel, fenster,
    uebersehen, wechsel, bild, luecke, gepruefte,
    zeit,
    // Ebene 0: Liegen die Beschwerden des Zeitprofils zugleich nach einem
    // ADHS-Mittel? Steht bei der Karte „Wie lange nach dem Essen".
    zeitNah: zeitprofilNahAmMittel(s.eintraege, zeit, FENSTER),
    adhs,
    spannung,
  };
}

/*
 * Die Schwelle, die man sonst nicht sieht.
 *
 * Dass ein Unterschied größer sein muss als der Zufallsspielraum, ist die
 * strengste Regel dieser App – und die einzige, die man am Ergebnis nicht
 * ablesen kann, weil sie sich darin äußert, dass etwas *nicht* dasteht. Also
 * steht sie als Zahl da, mit ihrem Grund.
 */
function spielraumZeile(d) {
  const zeile = d.bilanz.find((b) => b.genug && Number.isFinite(b.spielraum));
  if (!zeile) return '';
  return `<p class="klein">${esc(spielraumSatz(zeile.spielraum, zeile.vergleiche))}</p>`;
}

/*
 * Was Sache ist – drei bis fünf Sätze, bevor irgendeine Zahl kommt.
 *
 * Zehn Karten sind eine Auswertung, die man erst zusammensetzen muss. Wer
 * Beschwerden hat, liest sie nicht; wer sie in der Sprechstunde vorzeigt, hat
 * dafür keine zehn Minuten. Diese Karte rechnet nichts eigenes – sie wählt aus
 * dem, was unten steht, und bringt es in Sätze. Was hier steht, steht unten
 * mit seinen Zahlen; wer einen Satz nicht wiederfindet, hat einen Fehler
 * gefunden.
 */
/*
 * Wie viele Tage stehen überhaupt drin?
 *
 * Nur für den Satz, der kommt, wenn sonst nichts kommt – und der die Zahl
 * nennen muss, statt „noch zu wenig" zu sagen. Gezählt wird vom ersten
 * Eintrag bis heute; ein Tagebuch fängt an dem Tag an, an dem jemand anfängt.
 */
function tageMitEintrag(s, heute) {
  const alle = [...Object.keys(s.tage || {}), ...s.eintraege.map((e) => e.am)].sort();
  if (!alle.length) return 0;
  return gesamtZahlen(s.eintraege, s.tage, alle[0], heute).notierteTage;
}

function lageTeil(s, d) {
  const t = trend(s.eintraege, s.tage, d.heute);
  const l = wasSacheIst({
    warnungen: d.bild.warnungen,
    trend: t,
    funde: d.gepruefte.map(({ b, stand, dosis }) => ({
      name: ausloeserName(b.id, s.eigeneAusloeser),
      differenz: b.differenz,
      faelle: b.faelle,
      gegenFaelle: b.gegenFaelle,
      urteil: stand.urteil,
      // Ein Umstand – große Portion, spät, auswärts – hat keine Mengenfrage
      // (siehe musterDaten), dann fehlt der Zusatz einfach.
      menge: dosis ? dosis.urteil : null,
      mengeSatz: dosis ? dosis.satz : '',
    })),
    spaet: d.uebersehen.map((x) => ({
      name: ausloeserName(x.id, s.eigeneAusloeser),
      fensterName: x.fensterName,
    })),
    wechsel: d.wechsel.map((w) => ({
      name: ausloeserName(w.id, s.eigeneAusloeser),
      phase: w.staerkste.name,
    })),
    zeit: d.zeit,
    gewicht: gewichtsBild(s.gewicht, d.heute, s.abnehmenGewollt),
    mittel: d.mittel.filter((m) => m.genug),
    luecke: d.luecke.tagebuch.length
      ? { satz: `Am meisten würde jetzt helfen: ${d.luecke.tagebuch[0].titel}.` }
      : null,
    notierteTage: tageMitEintrag(s, d.heute),
  });

  return `<div class="karte karte-lage">
    <h3>Was Sache ist</h3>
    ${l.saetze.map((x) => `<p class="lage-satz l-${x.art}">${esc(x.text)}</p>`).join('')}
    <p class="klein">Zusammengefasst aus dem, was weiter unten mit seinen
      Fallzahlen steht – ohne eigene Rechnung und ohne Diagnose.</p>
  </div>`;
}

/*
 * Dieselbe Menge, andere Wirkung.
 *
 * Wer drei Wochen lang Zwiebeln verträgt und in der vierten nicht, hat keine
 * Zwiebelunverträglichkeit – und streicht trotzdem Zwiebeln, wenn die Rechnung
 * über alle vier Wochen mittelt. Diese Karte gibt es nur, wenn wirklich etwas
 * wechselt; „ändert sich nicht" ist keine Karte wert.
 */
function wechselTeil(s, d) {
  if (!d.wechsel.length) return '';
  return `<div class="karte karte-wechsel">
    <h3>Kommt auf den Zeitpunkt im Zyklus an</h3>
    <ul class="funde">${d.wechsel.slice(0, 4).map((w) => `<li class="fund f-moeglich">
      <div class="fund-kopf">
        <b>${esc(ausloeserName(w.id, s.eigeneAusloeser))}</b>
        <span class="fund-urteil">${esc(w.staerkste.name)}</span>
      </div>
      <p class="klein">${esc(w.satz)}</p>
      <ul class="schichten">${w.phasen.filter((p) => p.pruefbar).map((p) => `<li>
        <span>${esc(p.name)}</span>
        <span class="klein">${fmtZahl(p.schnittMit)} gegen ${fmtZahl(p.schnittOhne)}
          · ${p.faelle}/${p.gegenFaelle} Mahlzeiten</span>
      </li>`).join('')}</ul>
    </li>`).join('')}</ul>
    <p class="klein">Die Phasen sind aus den eingetragenen Blutungstagen
      geschätzt. Was hier steht, beschreibt vergangene Wochen und sagt nichts
      voraus.</p>
  </div>`;
}

/*
 * Was das eingestellte Fenster nicht sehen kann.
 *
 * Die Bilanz zählt Beschwerden in den Stunden des eingestellten Fensters nach
 * dem Essen. Was sich erst danach meldet, kommt dort nicht als „unauffällig"
 * vor, sondern gar nicht. Diese Karte stellt die Frage nach, statt sie am
 * Fenster scheitern zu lassen.
 *
 * Einen Ort nennt sie nicht. Früher stand hier „So spät entsteht Beschwerde
 * im Dickdarm" und im Kommentar „im Dickdarm vergärt nichts früher"; beides
 * widerspricht der Quelle: Bei einer Laktoseintoleranz wird im Dickdarm
 * vergoren, und die Beschwerden sind „nach etwa eineinhalb bis zwei Stunden"
 * am stärksten (gesund.bund.de, Laktoseintoleranz, Stand 23.02.2026). Belege
 * im Kopf von js/zeitprofil.js; der Satz unten ist KEIN_ORT von dort.
 */
function spaetTeil(s, d) {
  if (!d.uebersehen.length) return '';
  return `<div class="karte karte-spaet">
    <h3>Erst später auffällig</h3>
    <p class="klein">Diese Auslöser fallen im eingestellten Fenster von
      ${s.fenster || 4} Stunden nicht auf – wohl aber später. ${esc(KEIN_ORT)}</p>
    <ul class="funde">${d.uebersehen.slice(0, 4).map((x) => `<li class="fund f-moeglich">
      <div class="fund-kopf">
        <b>${esc(ausloeserName(x.id, s.eigeneAusloeser))}</b>
        <span class="fund-urteil">${esc(x.fensterName)}</span>
      </div>
      ${vergleichBalken(x.teil.schnittMit, x.teil.schnittOhne)}
      <p class="klein">${x.teil.faelle} Mahlzeiten damit, ${x.teil.gegenFaelle} ohne
        – jeweils nur die, bei denen dieses Fenster überhaupt beobachtbar war</p>
    </li>`).join('')}</ul>
  </div>`;
}

/*
 * Wann kommt es – nicht nach der Uhr, sondern nach dem Essen.
 *
 * „Wann es auftritt" weiter unten zählt nach Tageszeit; das ist eine andere
 * Frage und beantwortet vor allem, wie jemand lebt. Diese Karte zählt die
 * Stunden seit der letzten Mahlzeit – eine Angabe für die Sprechstunde, aber
 * keine über den Ort: Woher eine Beschwerde kommt, lässt sich am Zeitpunkt
 * allein nicht ablesen. Beschwerden durch Milchzucker, der im Dickdarm
 * vergoren wird, beginnen frühestens etwa eine halbe Stunde nach dem Essen
 * (gesund.bund.de, Laktoseintoleranz, Stand 23.02.2026), und ein Blähgefühl
 * nennt gesund.bund.de auch beim Reizmagen, mit einem verzögerten
 * Weitertransport des Mageninhalts als einer der vermuteten Ursachen
 * (Reizmagensyndrom, Stand 05.02.2026). Wie Beschwerden einzuordnen sind,
 * klärt die Praxis.
 */
function zeitTeil(d) {
  const z = d.zeit;
  if (!z.zugeordnet) return '';
  // Vorbehalt (Ebene 0): Fällt das Fenster nach dem Essen mit dem nach einem
  // ADHS-Mittel zusammen, kann das Profil auch das Mittel zeigen.
  const nah = d.zeitNah && d.zeitNah.zeigen
    ? `<p class="klein vorbehalt-mittel">${esc(d.zeitNah.satz)}</p>` : '';
  const zeilen = z.teile.map((t) => `<li>
    <span>${esc(t.name)}</span>
    <span class="klein">${t.anzahl}× · ${Math.round(t.anteil * 100)} %
      · im Mittel ${fmtZahl(t.schnitt)}</span>
  </li>`).join('');

  return `<div class="karte karte-zeit">
    <h3>Wie lange nach dem Essen</h3>
    <p>${esc(z.satz)}</p>
    <ul class="wartend">${zeilen}</ul>
    <p class="klein">${z.zugeordnet} von ${z.gesamt} Beschwerden ließen sich
      einer Mahlzeit davor zuordnen. ${esc(z.hinweis)}</p>
    ${nah}
  </div>`;
}

/*
 * Und dasselbe für einen einzelnen Auslöser.
 *
 * Der zeitliche Abstand zum Essen ist eine Beobachtung, die sich in der Praxis
 * besprechen lässt – mehr nicht. Aus dem Zeitpunkt allein lässt sich weder
 * der Ort noch die Ursache ablesen: Bei einer Laktoseintoleranz vergären
 * Bakterien den Milchzucker im Dickdarm, und die Beschwerden beginnen
 * frühestens nach einer halben Stunde; eine allergische Reaktion setzt
 * „meistens innerhalb einer halben Stunde, spätestens aber einige Stunden
 * nach dem Verzehr" ein (gesund.bund.de, Laktoseintoleranz, Stand
 * 23.02.2026; Nahrungsmittelallergie, Stand 27.05.2024). Was die
 * Beschwerden auslöst und welche Behandlung passt, klärt die Praxis.
 */
function zeitBlock(profil) {
  const geprueft = profil.teile.filter((t) => t.pruefbar);
  const liste = geprueft.length ? `<ul class="schichten">${geprueft.map((t) => `<li>
    <span>${esc(t.name)}</span>
    <span class="klein">${fmtZahl(t.schnittMit)} gegen ${fmtZahl(t.schnittOhne)}
      · ${t.faelle}/${t.gegenFaelle} Mahlzeiten</span>
  </li>`).join('')}</ul>` : '';

  return `<details class="stand s-zeit">
    <summary>Wann meldet es sich? <b>${profil.schwerpunkt
  ? esc(profil.teile.find((t) => t.id === profil.schwerpunkt).name)
  : 'kein Schwerpunkt'}</b></summary>
    <p class="klein">${esc(profil.satz)}</p>
    ${liste}
    <p class="klein">Ein Fenster zählt nur, wenn in diesen Stunden nichts
    dazwischengegessen wurde – sonst gehörte die Beschwerde der späteren
    Mahlzeit. Späte Fenster sind deshalb dünner besetzt.</p>
  </details>`;
}

/**
 * Nach Klassen statt nach Zutaten.
 *
 * Steht *vor* der Zutatenliste, weil es die belastbarere Zahl ist: „Zwiebel"
 * kommt zwölfmal vor, „FODMAP" achtzigmal. Und weil es die brauchbarere
 * Auskunft ist – wer weiß, dass es an den Fruktanen liegt, weiß auch etwas
 * über das Lebensmittel, das noch gar nicht im Tagebuch steht.
 *
 * Dass die Zuordnung grob ist, sagt die Karte ohne Beispiel. Bis zur
 * Fassung 29 stand dort „Ein Apfel ist FODMAP-reich, eine Banane kaum"; das
 * ließ sich in keiner erreichbaren Quelle prüfen.
 */
function klassenTeil(s, d) {
  const fertig = d.klassen.filter((k) => k.genug);
  if (!fertig.length) {
    const naechste = d.klassen.filter((k) => !k.genug).sort((a, b) => a.fehlt - b.fehlt)[0];
    if (!naechste) return '';
    return `<div class="karte zaehlt">
      <h3>Nach Wirkweise</h3>
      <p class="klein">Noch keine Klasse mit genug Fällen. Am nächsten dran:
      ${esc(naechste.kurz)} – ${naechste.faelle} Mahlzeiten damit,
      ${naechste.gegenFaelle} ohne, gebraucht werden je acht.</p>
    </div>`;
  }
  const zeile = (k) => {
    const art = klassenEinstufung(k);
    const zutaten = klasseZutaten(s.eintraege, k.id).slice(0, 5);
    return `<li class="fund fund-klasse f-${art}">
      <div class="fund-kopf">
        <b>${esc(k.name)}</b>
        <span class="fund-urteil">${EINSTUFUNG_WORT[art]}</span>
      </div>
      ${vergleichBalken(k.schnittMit, k.schnittOhne)}
      <p class="klein">${mehrzahl(k.faelle, 'Mahlzeit', 'Mahlzeiten')} damit,
        ${k.gegenFaelle} ohne · danach ${Math.round(k.quoteMit * 100)} % mit
        Beschwerden, sonst ${Math.round(k.quoteOhne * 100)} %</p>
      <p class="zeile-tags">${esc(k.was)}</p>
      ${zutaten.length ? `<p class="klein">Bei dir steckt das in:
        ${zutaten.map((z) => `${esc(ausloeserName(z.id, s.eigeneAusloeser))} (${z.anzahl}×)`).join(', ')}</p>` : ''}
    </li>`;
  };
  return `<div class="karte">
    <h3>Nach Wirkweise</h3>
    <p class="klein">Zusammengefasst, was im Körper denselben Weg nimmt. Das gibt
    mehr Fälle je Vergleich als eine einzelne Zutat – und die brauchbarere
    Antwort, weil sie auch für das gilt, was noch nicht im Tagebuch steht. Die
    Zuordnung ist grob: Alles in einer Gruppe wird hier gleich behandelt, auch
    wenn sich einzelne Lebensmittel darin unterscheiden können.</p>
    <ul class="funde funde-klassen">${fertig.map(zeile).join('')}</ul>
  </div>`;
}

/**
 * Die Kriterien – der Teil, der am nächsten an eine Diagnose herankommt.
 *
 * Und deshalb der Teil mit den meisten Vorbehalten. Sie stehen nicht im
 * Kleingedruckten, sondern im ersten Absatz: Erfüllte Kriterien sind keine
 * Diagnose, und von Reizdarm oder Reizmagen wird erst gesprochen, wenn andere
 * Ursachen ärztlich abgeklärt sind – das entscheidet eine Untersuchung, nicht
 * diese App.
 *
 * Beschrieben wird nur, was die Originalarbeiten im Abstract hergeben (PubMed,
 * im Volltext des Abstracts gelesen):
 *
 *   * Rom IV, Darm: Mearin et al., Bowel Disorders, Gastroenterology 2016
 *     (PMID 27144627) – überarbeitet die Rom-III-Kriterien von 2006, „to
 *     assist both clinicians and researchers". Die Schwellen des Kastens
 *     (Schmerz 1× je Woche, zwei von drei Merkmalen) stehen dort nicht; sie
 *     sind die Rechnung in js/kriterien.js.
 *   * Rom IV, Magen: Stanghellini et al., Gastroduodenal Disorders,
 *     Gastroenterology 2016;150(6):1380-92 (PMID 27147122) – funktionelle
 *     Dyspepsie: „1 or more of the following: postprandial fullness, early
 *     satiation, epigastric pain, and epigastric burning, which are
 *     unexplained after a routine clinical evaluation", mit zwei Unterformen,
 *     die sich überschneiden können. Wie oft die Beschwerden dafür auftreten
 *     müssen und dass sie „belastend" sein müssen, steht im Abstract nicht –
 *     deshalb zählt der Kasten die Magenbeschwerden nur und nennt kein
 *     „Kriterien erfüllt" mehr, wie der Arztbericht (js/bericht.js).
 *   * GerdQ: Jones et al., Aliment Pharmacol Ther 2009;30(10):1030-8 (PMID
 *     19737151) – „a patient-centred, self-assessment questionnaire to assist
 *     health care professionals in the diagnosis and effective management of
 *     patients with GERD", „six-item". Die Punkte je Frage, die Spanne bis 18,
 *     die Schwelle 8 und die umgekehrt gewerteten Fragen stehen im Abstract
 *     nicht. Deshalb steht keine Schwelle mehr da, der Kasten wird nie als
 *     „erfüllt" markiert, und „zählt umgekehrt" beschreibt nur, wie Body
 *     Check rechnet.
 *   * Den Beginn vor mindestens sechs Monaten nennen die beiden Abstracts
 *     nicht. Für die Vorgängerfassung Rom III beim Reizdarm gibt ihn die
 *     EMA-Leitlinie wieder: „onset at least 6 months prior to diagnosis"
 *     (CPMP/EWP/785/97 Rev. 1, 25.09.2014, Kapitel 4). Die Karte beschreibt
 *     ihn deshalb als Bedingung, mit der Body Check rechnet.
 *   * Rom IV ist nicht mehr die neueste Fassung: „The Rome V criteria for
 *     irritable bowel syndrome (IBS) were proposed in May, 2026" (Lancet
 *     Gastroenterol Hepatol 2026, Diagnosestudie aus Leeds, PMID 42392123,
 *     Abstract). Body Check rechnet weiter nach Rom IV und sagt das.
 *
 * Bis zur Fassung 29 hieß es, die Regelwerke seien die, „mit denen in der
 * Sprechstunde eingeordnet wird", beide setzten „ausdrücklich voraus, dass
 * nichts Organisches dahintersteckt", „erfüllt" heiße „Wenn Spiegelung und
 * Blutbild unauffällig sind, passt dieser Name", ab 8 Punkten gelte eine
 * Refluxkrankheit als wahrscheinlich, und ein Tagebuch untererfasse, die
 * Zahlen seien eher zu niedrig. Für den GerdQ gilt der Ausschluss gerade
 * nicht, die übrigen Sätze trägt keine erreichbare Quelle, und der letzte
 * stimmte nach der Rechnung nicht: Die Werte je Woche beziehen sich auf
 * notierte Tage, und zwei GerdQ-Posten zählen umgekehrt.
 */
function kriterienTeil(s, d) {
  const k = d.kriterien;
  if (!genugFuerKriterien(k)) {
    return `<div class="karte">
      <h3>Kriterien</h3>
      <p class="klein">Ab etwa zwei Wochen Tagebuch stehen hier Zählungen, die
      sich an veröffentlichten Kriterien orientieren – Rom IV von 2016 für das
      Reizdarmsyndrom, dazu die Magenbeschwerden und ein Punktwert angelehnt
      an den GerdQ-Fragebogen für Reflux. Sie ersetzen keine Untersuchung; die
      Einordnung trifft die Praxis. Bisher sind
      ${mehrzahl(k.zeitraum.notierteTage, 'Tag', 'Tage')} notiert.</p>
    </div>`;
  }

  const r = k.reizdarm;
  const dy = k.dyspepsie;
  const g = k.gerdq;
  const zahl = (x) => x.toFixed(1).replace('.', ',');

  const haken = (erfuellt, pruefbar = true) => (pruefbar
    ? `<span class="haken ${erfuellt ? 'ja' : 'nein'}">${erfuellt ? '✓' : '–'}</span>`
    : '<span class="haken offen">?</span>');

  const reizdarmKasten = `<li class="krit ${r.erfuellt ? 'erfuellt' : ''}">
    <div class="krit-kopf">
      <b>Reizdarmsyndrom (Rom IV)</b>
      <span class="fund-urteil">${r.pruefbar
    ? (r.erfuellt ? 'Kriterien erfüllt' : 'Kriterien nicht erfüllt') : 'noch nicht prüfbar'}</span>
    </div>
    <ul class="kritliste">
      <li>${haken(r.schmerzErfuellt, r.pruefbar)}
        <span><b>Bauchschmerz mindestens 1× je Woche.</b>
        An ${mehrzahl(r.schmerzTage, 'Tag', 'Tagen')} eingetragen, das sind
        ${zahl(r.proWoche)} je Woche der notierten Tage.</span></li>
      ${r.merkmale.map((m) => `<li>${haken(m.erfuellt, m.pruefbar)}
        <span><b>${esc(m.name)}.</b> ${esc(m.text)}</span></li>`).join('')}
    </ul>
    <p class="klein">Verlangt sind der Schmerz und mindestens zwei der drei
    Merkmale; erfüllt sind ${r.erfuellteMerkmale} von 3.
    ${r.typ.typ ? `Stuhlform: <b>${esc(r.typ.name)}</b> –
      ${Math.round(r.typ.bilanz.anteilHart * 100)} % hart,
      ${Math.round(r.typ.bilanz.anteilWeich * 100)} % weich, aus
      ${mehrzahl(r.typ.bilanz.gesamt, 'Stuhlgang', 'Stuhlgängen')}.`
    : `Für den Typ fehlen noch ${mehrzahl(r.typ.fehlt, 'Stuhlgang', 'Stuhlgänge')}.`}</p>
  </li>`;

  /*
   * Die Magenbeschwerden gezählt, ohne Rom-IV-Urteil – wie im Arztbericht.
   * Was Rom IV laut Abstract dazu sagt, steht im Satz darunter; Häufigkeiten
   * und „belastend" nennt das Abstract nicht (siehe oben). Die Rechnung in
   * js/kriterien.js ist unverändert, nur ihre Haken und ihr „erfüllt" stehen
   * nicht mehr da. Die beiden Zeilen heißen wie im Arztbericht nach den
   * Beschwerden, die dafür gezählt werden ('druck', 'saettigung' und
   * 'oberbauch', 'brennen').
   */
  const dyspepsieKasten = `<li class="krit">
    <div class="krit-kopf">
      <b>Magenbeschwerden ab Stärke 4</b>
      <span class="fund-urteil">${dy.pruefbar ? 'gezählt, keine Einordnung' : 'noch nicht gezählt'}</span>
    </div>
    <ul class="kritliste">
      ${[['Druck, Völlegefühl oder früh satt', dy.pds], ['Brennen oder Schmerz im Oberbauch', dy.eps]]
    .map(([name, f]) => `<li><span class="haken offen">·</span>
        <span><b>${name}.</b> An ${mehrzahl(f.tage, 'Tag', 'Tagen')}, ${zahl(f.proWoche)} je Woche der
        notierten Tage.</span></li>`).join('')}
    </ul>
    <p class="klein">Rom IV beschreibt die funktionelle Dyspepsie mit solchen
    Beschwerden – Völlegefühl nach dem Essen, frühes Sattsein, Schmerz oder
    Brennen im Oberbauch –, wenn eine übliche ärztliche Untersuchung sie nicht
    erklärt. Wie oft sie dafür auftreten müssen, gibt dieser Kasten nicht
    wieder; die Einordnung trifft die Praxis. Gezählt werden nur Eintragungen
    ab Stärke 4 („merklich"). Diese Grenze hat Body Check festgelegt.</p>
  </li>`;

  const gerdqKasten = `<li class="krit">
    <div class="krit-kopf">
      <b>GerdQ – Reflux</b>
      <span class="fund-urteil">${g.belastbar
    ? `${g.punkte} von 18` : 'zu wenig erfasst'}</span>
    </div>
    <ul class="kritliste kritliste-eng">
      ${g.posten.map((p) => `<li>
        <span class="haken ${p.punkte >= 2 ? 'ja' : 'nein'}">${p.punkte}</span>
        <span>${esc(p.frage)} – an ${mehrzahl(p.tage, 'Tag', 'Tagen')}${p.umgekehrt
    ? ' <i>(zählt umgekehrt)</i>' : ''}</span></li>`).join('')}
    </ul>
    <p class="klein">${g.belastbar
    ? `Gezählt aus deinen Eintragungen der letzten sieben Tage, kein ausgefüllter
       Fragebogen. Der GerdQ ist ein Fragebogen mit sechs Fragen zur
       Selbsteinschätzung, der Praxen bei der Einordnung von Reflux helfen soll.
       Zwei Posten zählt Body Check umgekehrt: Je öfter sie eingetragen sind,
       desto weniger Punkte. Was die Punktzahl hier bedeutet, kann die Praxis
       einordnen.`
    : `Von den letzten sieben Tagen sind nur ${g.erfasst} notiert. Was nicht
       eingetragen ist, zählt hier als „nicht gehabt" – die Punktzahl wäre damit
       nicht zu gebrauchen.`}</p>
  </li>`;

  const dauer = k.dauer.erfuellt === null
    ? `<p class="klein warnend">Seit wann die Beschwerden bestehen, ist nicht
       eingetragen – unter „Mehr". Body Check rechnet beim Reizdarm mit einem
       Beginn vor mindestens sechs Monaten; ohne diese Angabe fehlt dem
       Reizdarm-Kasten darunter eine Bedingung.</p>`
    : `<p class="klein">Beschwerden seit ${esc(k.dauer.seit)}, also seit
       ${mehrzahl(k.dauer.monate, 'Monat', 'Monaten')} (in Kalendermonaten
       gerechnet). Die Bedingung, mit der Body Check beim Reizdarm rechnet –
       Beginn vor mindestens sechs Monaten –, ist damit
       ${k.dauer.erfuellt ? 'erfüllt' : '<b>noch nicht</b> erfüllt'}.</p>`;

  /*
   * Der Vorbehalt richtet sich danach, was feststeht.
   *
   * Hier stand bisher in jedem Fall derselbe Satz: „setzen voraus, dass nichts
   * Organisches dahintersteckt – und das weiß nur eine Untersuchung". Richtig
   * für jemanden, bei dem die Frage offen ist, und falsch für jemanden, der
   * eine Spiegelung und einen Befund hinter sich hat. Dem erzählte die App,
   * seine Diagnose sei eine von mehreren Möglichkeiten.
   *
   * Die Rechnung darunter ändert sich nicht – dieselben Punkte, dieselben
   * Haken. Nur ihre Lesart: aus einer Einordnung wird eine Verlaufsbeobachtung.
   *
   * Der Satz ohne Befund, belegt für Reizdarm und Reizmagen: gesund.bund.de,
   * Reizmagensyndrom (Stand 05.02.2026, „Wie wird ein Reizmagen
   * diagnostiziert?"): „Von einem Reizmagen wird deshalb erst gesprochen,
   * wenn andere Ursachen für die Beschwerden abgeklärt und ausgeschlossen
   * wurden"; Reizdarmsyndrom (Stand 28.08.2024, „Wie wird ein Reizdarmsyndrom
   * festgestellt?"): „keine Hinweise auf eine andere Erkrankung vorliegen".
   * Für den GerdQ gilt das nicht – deshalb dort nur „keine Diagnose".
   * Welche Untersuchungen nötig sind, legt die Praxis fest; „Spiegelung und
   * Blutbild" als Maßstab nennt keine dieser Seiten.
   */
  const vorbehalt = kriterienVorbehalt(s.befunde || []);
  return `<div class="karte">
    <h3>Kriterien</h3>
    ${vorbehalt
    ? `<p class="klein"><b>Das hier ordnet nichts mehr ein.</b> ${esc(vorbehalt)}</p>`
    : `<p class="klein"><b>Erfüllte Kriterien sind keine Diagnose.</b> Von einem
    Reizdarm oder Reizmagen sprechen Ärztinnen und Ärzte erst, wenn andere
    Ursachen für die Beschwerden abgeklärt und ausgeschlossen sind. Ob das so
    ist und welche Untersuchungen dafür nötig sind, klärt die Praxis. Auch der
    Punktwert zu Reflux ist keine Diagnose.</p>`}
    ${dauer}
    <ul class="krit-liste">${reizdarmKasten}${dyspepsieKasten}${gerdqKasten}</ul>
    <p class="klein">Grundlage: ${mehrzahl(k.zeitraum.notierteTage, 'notierter Tag', 'notierte Tage')}
    in den letzten 90. Body Check zählt nur, was eingetragen ist; die Angaben je
    Woche beziehen sich auf die notierten Tage. Ob die Zahlen dadurch eher zu
    hoch oder zu niedrig ausfallen, lässt sich nicht sagen. Gezählt wird nach
    Rom IV von 2016; 2026 wurde eine Nachfolgefassung (Rom V) vorgestellt, nach
    der hier nicht gezählt wird.</p>
  </div>`;
}

/**
 * Der Auslassversuch: laufend, fertig, oder noch nicht angefangen.
 *
 * Das ist der einzige Teil der App, der aus Beobachtung einen Beleg machen
 * kann – und der einzige, der etwas von ihr verlangt. Deshalb steht der
 * Vorschlag nicht als Text da, sondern als Knopf mit dem Namen des
 * Verdächtigen darauf.
 */
function versuchTeil(s, d) {
  const v = s.versuch;
  /*
   * Die Liste der geprüften Versuche hängt an *keinem* der Zweige unten.
   *
   * Das war schon einmal falsch: Sie stand nur neben dem laufenden Versuch und
   * verschwand in dem Moment, in dem man einen abhakte – also genau dann, wenn
   * sie zum ersten Mal etwas enthielt. Dieselbe Falle wie damals bei den
   * Warnzeichen: Ein früher Rücksprung nimmt einen Abschnitt mit, den niemand
   * vermisst, weil er nie da war.
   */
  const alte = versuchHistorie(s, d);
  if (v) {
    const p = phase(v, d.heute);
    const erg = ergebnis(v, s.eintraege, s.tage, d.heute);
    const was = v.art === 'klasse' ? klasseName(v.ziel) : ausloeserName(v.ziel, s.eigeneAusloeser);
    const zahl = (x) => x.toFixed(1).replace('.', ',');
    return `<div class="karte versuch v-${erg.urteil}">
      <div class="fund-kopf">
        <b>Auslassversuch: ${esc(was)}</b>
        <span class="fund-urteil">${erg.wort}</span>
      </div>
      <ul class="versuch-zahlen">
        <li><span>Davor</span><b>${zahl(erg.vorher.schnitt)}</b>
          <span class="klein">${erg.vorher.notierte} Tage</span></li>
        <li><span>Ohne</span><b>${zahl(erg.auslass.schnitt)}</b>
          <span class="klein">${erg.auslass.notierte} Tage</span></li>
        <li><span>Danach</span><b>${erg.nachher ? zahl(erg.nachher.schnitt) : '–'}</b>
          <span class="klein">${erg.nachher ? `${erg.nachher.notierte} Tage` : 'noch nicht'}</span></li>
      </ul>
      <p>${esc(erg.satz)}</p>
      <p class="klein">Ein Versuch an einem einzigen Menschen, ohne Verblindung:
      Wer weiß, dass er heute die Milch weglässt, erwartet auch, dass es besser
      wird. Das Ergebnis ist der stärkste Hinweis, den ein Tagebuch hergibt, und
      kein Nachweis.</p>
      <div class="reihe">
        ${p === 'reif' ? knopf('versuch-provokation', 'Heute wieder gegessen', 'btn-primary') : ''}
        ${p === 'auslass' || p === 'provokation' || p === 'reif'
    ? knopf('versuch-beenden', 'Abbrechen', 'btn-ghost')
    : knopf('versuch-ablegen', 'Abhaken und behalten', 'btn-primary')}
      </div>
    </div>${alte}`;
  }

  const kandidaten = vorschlaege(d.klassen, d.bilanz);
  if (!kandidaten.length) return alte;
  const name = (x) => (x.art === 'klasse' ? klasseName(x.ziel) : ausloeserName(x.ziel, s.eigeneAusloeser));
  /*
   * Das Prinzip ist belegt, das „genau so" nicht. gesund.bund.de,
   * Laktoseintoleranz (Stand 23.02.2026, „Wie wird eine Laktoseintoleranz
   * diagnostiziert?"): „Diät- oder Auslasstest: Dabei verzichtet man für eine
   * Zeit auf Milch und Milchprodukte. Anschließend nimmt man eine bestimmte
   * Menge an Milchzucker zu sich – die Ärztin oder der Arzt überwacht dann die
   * körperliche Reaktion." Nahrungsmittelallergie (Stand 27.05.2024):
   * Provokationstest „unter ärztlicher Beobachtung". Zur Zöliakie siehe
   * planAngebot. Bis zur Fassung 29 stand hier „Genau so wird in der
   * Ernährungsmedizin gearbeitet" – in den Quellen geschieht das Wiederessen
   * ärztlich überwacht, die zwei Wochen nennen sie nicht. Die Tage zur Wahl
   * sind die der App (DAUER_VORSCHLAEGE).
   *
   * Der Satz unten zu den Klassen beschreibt nur, warum die App sie zuerst
   * nennt: Eine Klasse kommt in mehr Mahlzeiten vor (js/daten.js). „Hinter
   * „Zwiebel" steckt fast immer die ganze Klasse … und lernt nichts" stand
   * dort bis zur Fassung 29; diese Häufigkeit nennt keine erreichbare
   * Quelle, und js/stufenplan.js prüft Fruktane aus Getreide und aus Zwiebel
   * selbst getrennt.
   */
  return `<div class="karte karte-merk">
    <h3>Einen Auslassversuch machen</h3>
    <p class="klein">Alles andere hier zählt, was ohnehin passiert – daraus wird
    nie ein Beleg: Wer an schlechten Tagen anders isst, findet sein Essen
    auffällig, ohne dass es damit zu tun hat. Ein Versuch dreht das um: eine
    Zeit lang weglassen und dann <b>bewusst wieder essen</b>; erst diese zweite
    Hälfte zeigt etwas. In der Praxis wird ein Verdacht auf eine
    Unverträglichkeit ähnlich geprüft, dort ärztlich begleitet, bei Verdacht
    auf eine Allergie unter ärztlicher Beobachtung. Ob ein solcher Versuch für
    dich sinnvoll ist, lässt sich dort besprechen.</p>
    <ul class="versuch-wahl">${kandidaten.map((x) => `<li>
      <div><b>${esc(name(x))}</b>
        <span class="klein">${x.art === 'klasse' ? 'Klasse' : 'einzelne Zutat'} ·
        ${mehrzahl(x.faelle, 'Mahlzeit', 'Mahlzeiten')} damit ·
        ${x.differenz.toFixed(1).replace('.', ',')} Stufen Unterschied</span></div>
      <div class="wahl">${DAUER_VORSCHLAEGE.map((n) => `
        <button type="button" class="wahl-btn" data-act="versuch-start"
                data-art="${x.art}" data-id="${esc(x.ziel)}" data-n="${n}">${n} Tage</button>`).join('')}</div>
    </li>`).join('')}</ul>
    <p class="klein">Klassen stehen vor einzelnen Zutaten, weil eine Klasse in
    mehr Mahlzeiten vorkommt und der Vergleich so auf mehr Fällen beruht. Ob
    eine einzelne Zutat oder eine ganze Gruppe dahintersteckt, kann das
    Tagebuch nicht entscheiden.</p>
  </div>${alte}`;
}

/**
 * Der Stufenplan: Karenz, Weiche, Wiedereinführung.
 *
 * Steht direkt hinter den Kriterien und vor allen Einzelbefunden, weil er als
 * einziges Stück dieser App am Ende einen Speiseplan hinterlässt statt einer
 * Auskunft. Und weil die Weiche in der Mitte – hilft die Karenz überhaupt? –
 * die folgenreichste Frage ist, die hier gestellt wird.
 *
 * Was die Texte über die Fachliteratur sagen, steht in den Abstracts:
 *
 *   * Whelan et al., J Hum Nutr Diet 2018 (PMID 29336079): „the low FODMAP
 *     diet consists of three stages: FODMAP restriction; FODMAP
 *     reintroduction; and FODMAP personalisation" – „These stages can be
 *     covered in at least two dietetic appointments", und wiedereingeführt
 *     wird, „if restriction has successfully reduced IBS symptoms" (das ist
 *     die Weiche).
 *   * Tuck & Barrett, J Gastroenterol Hepatol 2017 (PMID 28244664):
 *     „patients are encouraged not to remain on a strict low FODMAP diet
 *     long-term" und „allowing the reintroduction of some moderate to high
 *     FODMAP foods back into the diet without symptom induction"; „Dietitians
 *     should tailor the challenge process to the individual patient".
 *
 * „bleibt für immer auf der strengsten Stufe – und das meiste, was jetzt
 * draußen ist, wäre wahrscheinlich verträglich", wie es bis zur Fassung 29
 * hieß, trägt keine davon: beschrieben sind „some" Lebensmittel, nicht „das
 * meiste".
 */
function planTeil(s, d) {
  const p = s.stufenplan;
  if (!p) return planAngebot(s, d);

  const b = planBild(p, s.eintraege, s.tage, d.heute);
  const abbruch = b.karenz && b.karenz.urteil === 'hilft-nicht';
  const zahl = (x) => x.toFixed(1).replace('.', ',');

  return `<div class="karte plan ${abbruch ? 'karte-warn' : ''}">
    <div class="fund-kopf">
      <b>Stufenplan</b>
      <span class="fund-urteil">${esc(b.karenz.wort)}</span>
    </div>

    <p class="feld-name">1. Karenz — ${p.karenzTage} Tage ab ${esc(fmtDatum(p.start, true))}</p>
    ${b.karenz.vorher.notierte >= 2 && b.karenz.karenz.notierte >= 2
    ? vergleichBalken(b.karenz.karenz.schnitt, b.karenz.vorher.schnitt,
      { mit: 'Karenz', ohne: 'davor' }) : ''}
    <p>${esc(b.karenz.satz.replace(/\*\*/g, ''))}</p>

    ${abbruch ? `<div class="reihe">
      ${knopf('plan-beenden', 'Plan beenden und wieder normal essen', 'btn-primary')}
    </div>` : ''}

    ${!abbruch && (b.stufen.length || b.stand.phase !== 'karenz') ? `
      <p class="feld-name">2. Wiedereinführung — eine Gruppe nach der anderen</p>
      ${b.stufen.length ? `<ul class="wartend plan-stufen">${b.stufen.map((x) => `<li class="geprueft g-${x.urteil}">
        <span><b>${esc(x.name)}</b><span class="zeile-tags">${esc(fmtDatum(x.start, true))} ·
          ${x.tageswerte.map((w, i) => `${esc((x.mengen[i] || '?'))}: ${w === null ? '–' : w}`).join(' · ')}</span></span>
        <span class="klein">${esc(x.wort)}${x.urteil !== 'laeuft' ? `
          <button type="button" class="strang-weg" data-act="stufe-weg"
                  data-id="${esc(x.gruppe)}"
                  aria-label="Diese Stufe verwerfen und noch einmal machen">×</button>` : ''}</span>
      </li>`).join('')}</ul>` : ''}
      ${b.stufen.filter((x) => x.satz).map((x) => `<p class="klein"><b>${esc(x.name)}:</b> ${esc(x.satz.replace(/\*\*/g, ''))}</p>`).join('')}
      ${b.offen.length ? `<p class="klein">Noch offen:
        ${b.offen.map((g) => esc((GRUPPE_VON[g] || {}).name || g)).join(', ')}.</p>` : ''}
    ` : ''}

    ${b.schritt ? `<p class="klein"><b>Als Nächstes:</b> ${esc(b.schritt.satz)}</p>` : ''}
    ${terminKnopf(b.schritt)}

    <div class="reihe">
      ${b.stand.phase === 'bereit' || b.stand.phase === 'entscheid'
    ? knopf('stufe-los', 'Nächste Gruppe anfangen', 'btn-primary') : ''}
      ${p.beendet || b.stand.phase === 'fertig'
    ? knopf('plan-ablegen', 'Abhaken und behalten', 'btn-primary')
    : (abbruch ? '' : knopf('plan-beenden', 'Abbrechen', 'btn-ghost'))}
    </div>

    <p class="klein">Die Karenz ist nicht das Ziel, sondern der Aufbau: In der
    Fachliteratur ist die strenge Karenz die erste von drei Stufen, nicht ein
    Dauerzustand. Welche der weggelassenen Lebensmittel wieder vertragen
    werden, zeigt erst die Wiedereinführung; beschrieben ist, dass manche davon
    zurückkehren können, ohne Beschwerden auszulösen. Eine Ernährungsfachkraft
    oder die Praxis kann dabei begleiten.</p>
    ${b.stufen.length ? `<p class="klein">Werte je Tag, weil die Menge steigt:
    ${zahl(b.karenz.karenz.schnitt)} war der Karenz-Schnitt, gegen den verglichen
    wird.</p>` : ''}
  </div>${planHistorie(s, d)}`;
}

/**
 * Das Angebot, wenn noch keiner läuft.
 *
 * Bewusst nicht als Vorschlag der App, sondern als Auswahl: Welche Gruppen
 * geprüft werden und in welcher Reihenfolge, hängt daran, wie jemand isst.
 * Wer viel Brot isst, fängt mit Getreide an, weil diese Antwort seinen Alltag
 * am stärksten ändert.
 */
function planAngebot(s, d) {
  const hist = planHistorie(s, d);
  // Erst anbieten, wenn überhaupt etwas dasteht: Ein Plan über Wochen ist die
  // falsche Antwort auf „ich trage seit vier Tagen ein".
  if (tageMitEintrag(s, d.heute) < 14) return hist;
  const gewaehlt = ui.planGruppen || FODMAP_GRUPPEN.map((g) => g.id);

  /*
   * Zugeklappt, und das ist keine Kosmetik.
   *
   * Dieser Kasten ist über tausend Bildpunkte hoch und steht auf einem Reiter,
   * auf dem sonst Befunde stehen. Er ist aber kein Befund, sondern ein Angebot:
   * einmal lesen, einmal entscheiden, danach für Wochen erledigt. Wer täglich
   * nachsieht, ob sich an den Zahlen etwas getan hat, scrollt sonst jedes Mal
   * an derselben Anleitung vorbei – und findet die Befunde schlechter.
   *
   * Die Zöliakie-Warnung geht dabei nicht verloren: Sie steht *im* Angebot,
   * und ohne das Angebot aufzuklappen kommt niemand an den Startknopf.
   *
   * Der Ablauf ist der dieser App, nicht ein Schema der Fachliteratur: Die
   * Karenz dauert, was man wählt (KARENZ_VORSCHLAEGE, 14 bis 28 Tage), jede
   * Gruppe drei Tage mit steigender Menge (STUFE_TAGE in js/stufenplan.js).
   * Belegt ist nur die Gliederung in Karenz, Wiedereinführung und den
   * eigenen Speiseplan danach, begleitet von einer Ernährungsfachkraft
   * (Whelan et al. 2018, siehe planTeil). Dauer, drei Tage und „dazwischen
   * zurück auf die Karenz" nennen die erreichbaren Abstracts nicht; „Das
   * Größte, was diese App vorschlägt" steht deshalb nicht mehr da.
   *
   * Zur Zöliakie: EMA, Wheat starch (containing gluten) used as an excipient,
   * EMA/CHMP/639441/2013 corr. 2, 9. Oktober 2017, S. 4: „Diagnosis is by
   * blood tests to check for relevant antibodies, followed by
   * endoscopy/gastroscopy and biopsy. … However all tests lose their
   * usefulness if the person has already been eating a gluten-free diet for
   * 6–12 months. Intestinal damage begins to heal within weeks of gluten
   * being removed from the diet, and antibody levels decline over months."
   * Bis zur Fassung 29 hieß es, wer vorher weglasse, bekomme „ein falsch
   * unauffälliges Ergebnis" – so zwingend sagt es die Quelle nicht.
   */
  return `<div class="karte karte-merk">
    <details class="angebotbogen">
    <summary><h3>Der Stufenplan</h3>
    <span class="klein">Vier bis sechs Wochen — am Ende ein Speiseplan statt
    einer Auskunft. Zum Lesen antippen.</span></summary>
    <p class="klein">Das einzige Stück dieser App, das am Ende einen Speiseplan
    hinterlässt statt einer Auskunft. In der Fachliteratur hat die Ernährung
    ohne die vergärbaren Kohlenhydrate (FODMAP) drei Stufen: weglassen, Gruppe
    für Gruppe wieder einführen, danach ein eigener, weniger strenger
    Speiseplan – begleitet von einer Ernährungsfachkraft. Der Plan hier folgt
    dieser Gliederung mit eigenen Zahlen: erst eine Karenz, deren Länge du
    wählst – die Frage dieser Phase ist nicht <i>was davon</i>, sondern
    <i>überhaupt</i>. Dann Gruppe für Gruppe zurück, jede über drei Tage mit
    steigender Menge, dazwischen jedes Mal zurück auf die Karenz. Ob und wie
    so ein Plan für dich passt, lässt sich mit der Praxis oder einer
    Ernährungsfachkraft besprechen.</p>

    <p class="klein"><b>Vorher zu klären:</b> Die Karenz lässt auch Weizen weg.
    Auf Zöliakie wird mit einem Bluttest auf Antikörper und einer Gewebeprobe
    untersucht. Laut EMA verlieren diese Untersuchungen ihren Nutzen, wenn schon
    6 bis 12 Monate glutenfrei gegessen wurde: Die Antikörper sinken über
    Monate, die Darmschleimhaut beginnt schon nach Wochen zu heilen. Ob eine Zöliakie
    schon abgeklärt ist, lässt sich <b>vor</b> dem Plan in der Praxis
    besprechen.</p>

    <p class="feld-name">Welche Gruppen, in welcher Reihenfolge</p>
    <ul class="plan-wahl">${FODMAP_GRUPPEN.map((g) => `<li>
      <div><b>${esc(g.name)}</b>
        <span class="klein">${esc(g.steckt)}</span></div>
      <div class="wahl">
        <button type="button" class="wahl-btn${gewaehlt.includes(g.id) ? ' an' : ''}"
                data-act="plan-gruppe" data-id="${esc(g.id)}">${gewaehlt.includes(g.id) ? 'dabei' : 'weglassen'}</button>
      </div>
    </li>`).join('')}</ul>

    <p class="feld-name">Wie lange die Karenz</p>
    <div class="wahl">${KARENZ_VORSCHLAEGE.map((n) => `
      <button type="button" class="wahl-btn" data-act="plan-start"
              data-n="${n}">${n} Tage</button>`).join('')}</div>

    <p class="klein">Wenn die Karenz nichts bringt, ist der Plan zu Ende — dann
    wird nicht trotzdem wiedereingeführt, sondern aufgehört. Eine Diät ohne
    Wirkung ist kein neutraler Zustand: Sie kostet Ballaststoffe, Kalzium und
    Vielfalt in der Darmflora, und dafür bekommst du nichts. Genau diese Weiche
    fehlt in den meisten Anleitungen.</p>
    </details>
  </div>${hist}`;
}

/**
 * Abgeschlossene Pläne – damit eine Gruppe nicht zweimal durchgeprüft wird.
 *
 * Der Satz darunter: gesund.bund.de, Laktoseintoleranz (Stand 23.02.2026,
 * Behandlung): „Ist die Milchzucker-Unverträglichkeit nicht genetisch
 * bedingt, sondern wird von einer anderen Erkrankung verursacht, spricht man
 * von einer sekundären Laktoseintoleranz. … Erholt sich die Darmschleimhaut
 * durch die Therapie, verschwinden auch die Beschwerden wieder." Und
 * Reizdarmsyndrom (Stand 28.08.2024): „Häufig zeigt sich die Erkrankung
 * schubweise". Bis zur Fassung 29 stand hier, eine Gruppe, die vor einem
 * Jahr durchfiel, „lohnt einen zweiten Versuch – besonders, wenn sich der
 * Darm zwischendurch beruhigt hat"; das ist ein Rat und nennt eine Besserung,
 * die keine erreichbare Quelle für diesen Fall beschreibt.
 */
function planHistorie(s, d) {
  const alte = s.stufenplaene || [];
  if (!alte.length) return '';
  return `<div class="karte karte-geprueft">
    <h3>Frühere Stufenpläne</h3>
    ${alte.map((p) => {
    const b = planBild(p, s.eintraege, s.tage, d.heute);
    return `<div>
      <p class="feld-name">Ab ${esc(fmtDatum(p.start, true))} — ${esc(b.karenz.wort)}</p>
      <ul class="wartend">${b.stufen.map((x) => `<li class="geprueft g-${x.urteil}">
        <span>${esc(x.name)}</span>
        <span class="klein">${esc(x.wort)}
          <button type="button" class="strang-weg" data-act="plan-alt-weg"
                  data-id="${esc(p.id)}" aria-label="Aus der Liste nehmen">×</button></span>
      </li>`).join('')}</ul>
    </div>`;
  }).join('')}
    <p class="klein">Verträglichkeiten können sich im Lauf der Zeit ändern: Ist
    eine Laktoseintoleranz durch eine andere Darmerkrankung entstanden, können
    die Beschwerden zurückgehen, wenn sich die Darmschleimhaut durch die
    Behandlung erholt. Ein Reizdarm verläuft oft in Schüben, ein früheres
    Ergebnis ist deshalb eine Momentaufnahme. Ob und wann ein erneuter Test
    sinnvoll ist, klären Praxis oder Ernährungsberatung.</p>
  </div>`;
}

/**
 * Der Provokationstest: laufend, fertig oder noch nicht angefangen.
 *
 * Er steht direkt hinter dem Auslassversuch, weil er dieselbe Bewegung macht –
 * eingreifen statt beobachten –, nur kürzer und wiederholbar. Und er steht nur
 * dort, wo man ohnehin nach Antworten sucht: Wer ihn nie anfängt, sieht eine
 * Karte, wer ihn laufen hat, sieht das Protokoll.
 */
function provokationTeil(s, d) {
  const p = s.provokation;
  const zahl = (x) => x.toFixed(1).replace('.', ',');

  if (p) {
    const b = provokationsBild(p, s.eintraege, d.heute);
    const schritt = naechsterSchritt(p, d.heute, b.urteil);
    // „Deutet sich an" ist noch nicht fertig: Dort geht es mit weiteren
    // Durchgängen weiter, samt Termin und Knopf.
    const fertig = p.beendet || !['laeuft', 'offen'].includes(b.urteil);
    return `<div class="karte provokation p-${b.urteil}">
      <div class="fund-kopf">
        <b>Provokationstest: ${esc(p.was || p.ziel)}</b>
        <span class="fund-urteil">${esc(b.wort)}</span>
      </div>
      ${b.laeufe.length ? `<ul class="wartend prov-laeufe">${b.laeufe.map((l) => `<li${l.sauber ? '' : ' class="prov-weg"'}>
        <span>${esc(fmtDatum(l.am, true))} ${esc(l.um)}
          <span class="zeile-tags">${l.leer ? 'Leerdurchgang' : 'mit'}${l.sauber ? '' : ` · zählt nicht: ${esc(l.warum.join(', '))}`}${l.sauber && l.ungefaehr ? ' · Beschwerde ohne genaue Uhrzeit, mitgezählt' : ''}</span></span>
        <span class="klein">${l.sauber ? `${l.wert} von 10` : '–'}
          <button type="button" class="strang-weg" data-act="prov-lauf-weg"
                  data-am="${l.am}" data-um="${esc(l.um)}"
                  aria-label="Durchgang zurücknehmen">×</button></span>
      </li>`).join('')}</ul>` : ''}
      ${Number.isFinite(b.unterschied)
    ? vergleichBalken(b.schnitt, b.vergleich,
      { mit: 'mit', ohne: b.grundlage === 'leerdurchgang' ? 'leer' : 'Alltag' })
    : ''}
      <p>${esc(b.satz)}</p>
      ${schritt && !fertig ? `<p class="klein"><b>Als Nächstes:</b> ${esc(schritt.satz)}</p>` : ''}
      ${fertig ? '' : terminKnopf(schritt)}
      <div class="reihe">
        ${schritt && schritt.dran
    ? knopf(schritt.leer ? 'prov-leer' : 'prov-lauf',
      schritt.leer ? 'Leerdurchgang gemacht' : 'Jetzt genommen', 'btn-primary') : ''}
        ${p.beendet
    ? knopf('prov-ablegen', 'Abhaken und behalten', 'btn-primary')
    : knopf('prov-beenden', 'Abbrechen', 'btn-ghost')}
      </div>
      <p class="klein">${esc(NICHT_BEI_ALLERGIE)}</p>
    </div>${provokationHistorie(s, d)}`;
  }

  /*
   * Angeboten wird der Test nicht von Anfang an. Er verlangt vier Morgen und
   * ist die falsche Antwort auf „ich trage seit drei Tagen ein" – erst wenn
   * genug dasteht, dass es überhaupt etwas zu prüfen gibt, lohnt der Aufwand.
   */
  if (d.bilanz.filter((b) => b.genug).length < 3) return provokationHistorie(s, d);

  /*
   * Wie beim Stufenplan: ein Angebot, kein Befund – siehe planAngebot().
   *
   * Der Ablauf (nüchtern, vier Stunden, dreimal) ist der dieser App
   * (js/provokation.js). Mit dem Test in einer Praxis setzt der Text ihn
   * nicht mehr gleich; „Genau so wird auf Laktose und Fruktose geprüft; in
   * der Klinik misst dabei zusätzlich ein Atemtest mit" stand hier bis zur
   * Fassung 29, und der Atemtest ist dort kein Zusatz, sondern das Verfahren.
   * Belegt:
   *
   *   * gesund.bund.de, Laktoseintoleranz (Stand 23.02.2026, „Wie wird eine
   *     Laktoseintoleranz diagnostiziert?"): „Atemtest: Nach dem Trinken einer
   *     Milchzuckerlösung wird der Gehalt von Wasserstoff in der Atemluft
   *     mehrmals gemessen." – „Das Standardverfahren in Deutschland ist der
   *     Atemtest." – „Nur wenn während eines Tests typische Beschwerden
   *     auftreten, lässt sich sicher feststellen, ob eine Laktoseintoleranz
   *     die Ursache ist."
   *   * Für Fruktose die feste Menge: „Consensus doses for lactulose,
   *     glucose, fructose and lactose BT were 10, 75, 25 and 25 g" (North
   *     American Consensus, Am J Gastroenterol 2017;112(5):775-784, PMID
   *     28323273, Abstract); und dass die Beschwerden dazugehören: „breath
   *     tests for carbohydrate malabsorption require additional validated
   *     concurrent symptom evaluation to establish carbohydrate intolerance"
   *     (European guideline, UEG J 2022;10(1):15-40, PMID 34431620, Abstract).
   *
   * Ebenso der Satz zu den Mengen weiter unten: Früher hieß es, in der Klinik
   * gehe es nur um die Malabsorption und die Klinikmenge auf eigene Faust
   * mache „vor allem einen scheußlichen Tag" – nach der europäischen
   * Leitlinie gehören die Beschwerden dort gerade dazu. Jetzt steht nur, was
   * die App nimmt: Portionen, wie sie im Alltag vorkommen (PRUEFBAR).
   */
  return `<div class="karte karte-merk">
    <details class="angebotbogen">
    <summary><h3>Eine Sache gezielt prüfen</h3>
    <span class="klein">Kürzer und schärfer als ein Auslassversuch: eine
    festgelegte Menge, nüchtern, dreimal. Zum Lesen antippen.</span></summary>
    <p class="klein">Der Auslassversuch dauert zwei Wochen, und in zwei Wochen
    ändert sich auch anderes. Ein Provokationstest fragt kürzer und schärfer:
    eine festgelegte Menge, <b>nüchtern</b>, dann vier Stunden nichts essen und
    aufschreiben, wie es geht – und das dreimal. Der Test in einer Praxis ist
    ähnlich gedacht, aber nicht gleich: Dort wird nach einer festgelegten Menge
    Milch- oder Fruchtzucker mehrmals die Atemluft gemessen, und für die
    Diagnose zählen auch die Beschwerden während des Tests.</p>
    <ul class="prov-wahl">${PRUEFBAR.map((x) => `<li>
      <div><b>${esc(x.name)}</b>
        <span class="klein">${esc(x.was)} · ${esc(x.warum)}</span></div>
      <div class="wahl">
        <button type="button" class="wahl-btn" data-act="prov-start"
                data-id="${esc(x.id)}">Diesen Test anfangen</button></div>
    </li>`).join('')}</ul>
    <p class="klein">Die Mengen hier sind Portionen, wie sie im Alltag
    vorkommen. Ob eine Unverträglichkeit vorliegt, klären Ärztin oder Arzt –
    für Laktose ist in Deutschland der Atemtest das Standardverfahren.</p>
    <p class="klein">${esc(NICHT_BEI_ALLERGIE)}</p>
    </details>
  </div>${provokationHistorie(s, d)}`;
}

/** Was schon durchprovoziert wurde – aus denselben Gründen wie „Schon geprüft". */
function provokationHistorie(s, d) {
  const alte = s.provokationen || [];
  if (!alte.length) return '';
  return `<div class="karte karte-geprueft">
    <h3>Schon getestet</h3>
    <ul class="wartend">${alte.map((p) => {
    const b = provokationsBild(p, s.eintraege, d.heute);
    return `<li class="geprueft g-${b.urteil}">
      <span><b>${esc(p.was || p.ziel)}</b><span class="zeile-tags">${b.echte} Durchgänge,
        ${b.leere} leer</span></span>
      <span class="klein">${esc(b.wort)}
        <button type="button" class="strang-weg" data-act="prov-alt-weg"
                data-id="${esc(p.id)}" aria-label="Aus der Liste nehmen">×</button></span>
    </li>`;
  }).join('')}</ul>
  </div>`;
}

/**
 * Was die Mittel bewirken – gemessen, nicht behauptet.
 *
 * Sie trägt ein, was sie nimmt, und niemand rechnet nach. Ausbleibendes
 * Ansprechen ist selbst ein Befund: Ein Säureblocker, der nach vier bis acht
 * Wochen nichts geändert hat, spricht gegen die Säure als Ursache.
 */
function ansprechenTeil(s, d) {
  const liste = d.mittel.filter((m) => m.genug);
  if (!liste.length) return '';
  return `<div class="karte">
    <h3>Ob es etwas bewirkt</h3>
    <ul class="funde funde-mittel">${liste.map((m) => `<li class="fund fund-mittel f-${m.urteil === 'besser' ? 'unauffaellig' : (m.saeureVersuchAusgereizt ? 'auffaellig' : 'neutral')}">
      <div class="fund-kopf">
        <b>${esc(m.name)}</b>
        <span class="fund-urteil">${ANSPRECHEN_URTEIL[m.urteil]}</span>
      </div>
      ${m.vergleichbar ? vergleichBalken(m.unter.schnitt, m.davor.schnitt,
    { mit: 'darunter', ohne: 'davor' }) : ''}
      <p class="klein">${mehrzahl(m.einnahmeTage, 'Einnahmetag', 'Einnahmetage')},
        seit ${esc(fmtDatum(m.seit, true))}</p>
      <p>${esc(befund(m))}</p>
    </li>`).join('')}</ul>
    <p class="klein">Der Balken vergleicht die Zeit davor mit der Zeit darunter,
    gleich lang. Diese App schlägt weiterhin kein Medikament vor und rät weder
    zum Absetzen noch zum Ändern. Ob und wie ein Mittel beendet wird, gehört in
    die Praxis oder Apotheke – manche Packungsbeilagen sagen dazu ausdrücklich
    etwas.</p>
  </div>`;
  /*
   * Bis zur Fassung 29 stand im letzten Satz „ein Säureblocker wird nach
   * längerer Einnahme nicht von einem Tag auf den anderen weggelassen" – eine
   * Anweisung, wie abgesetzt wird. Belegt ist das nur eng: für den H2-Blocker
   * Famotidin bei „bereits länger bestehender Ulkus-Krankheit" („nicht abrupt
   * abgesetzt werden", Famotidin-ratiopharm, www.fachinfo.de/fi/pdf/007352,
   * Stand März 2024, 4.4). Bei den Protonenpumpenhemmern sagen die
   * Fachinformationen dazu nichts; PANTOZOL Control sieht sogar vor, die
   * Einnahme bei Beschwerdefreiheit zu beenden (EMA-Produktinformation,
   * Gebrauchsinformation Abschnitt 3: „Beenden Sie die Einnahme von PANTOZOL
   * Control, wenn Sie vollständig beschwerdefrei sind"). Deshalb verweist der
   * Satz nur noch auf Praxis und Apotheke.
   */
}

/**
 * Was schon geprüft wurde.
 *
 * Ein fertiger Auslassversuch ist das Aufwändigste, was dieses Tagebuch
 * hervorbringt – zwei Wochen Verzicht und eine bewusste Wiedereinführung. Ihn
 * danach wegzuwerfen hieß, in einem halben Jahr dieselben zwei Wochen noch
 * einmal zu verlangen. Und ein Versuch, der *dagegen* sprach, ist für den
 * Termin genauso ein Beleg wie einer, der dafür sprach: eine Sache weniger,
 * auf die sie verzichten muss.
 *
 * Das Ergebnis wird jedes Mal neu aus den Eintragungen gerechnet, nicht
 * eingefroren. Sonst stünden hier Zahlen, die nicht mehr zum Tagebuch passen,
 * sobald jemand einen Eintrag korrigiert.
 */
function versuchHistorie(s, d) {
  const alte = s.versuche || [];
  if (!alte.length) return '';
  const zahl = (x) => x.toFixed(1).replace('.', ',');
  return `<div class="karte karte-geprueft">
    <h3>Schon geprüft</h3>
    <ul class="wartend">${alte.map((v) => {
    const e = ergebnis(v, s.eintraege, s.tage, d.heute);
    const was = v.art === 'klasse' ? klasseName(v.ziel) : ausloeserName(v.ziel, s.eigeneAusloeser);
    return `<li class="geprueft g-${e.urteil}">
      <span><b>${esc(was)}</b><span class="zeile-tags">${esc(fmtDatum(v.start, true))},
        ${mehrzahl(v.tage, 'Tag', 'Tage')} · ohne ${zahl(e.auslass.schnitt)} statt
        ${zahl(e.vorher.schnitt)}</span></span>
      <span class="klein">${esc(e.wort)}
        <button type="button" class="strang-weg" data-act="versuch-alt-weg"
                data-id="${esc(v.id)}" aria-label="Aus der Liste nehmen">×</button></span>
    </li>`;
  }).join('')}</ul>
    <p class="klein">Damit dasselbe nicht in einem halben Jahr noch einmal
    geprüft wird – und weil ein Versuch, der dagegen sprach, für den Termin
    genauso zählt wie einer, der dafür sprach.</p>
  </div>`;
}

/**
 * Was noch fehlt – und was keine App beantwortet.
 *
 * Der Abschnitt, der aus einem Tagebuch etwas macht, das weiterfragt. Zwei
 * Listen, streng getrennt: Was sie selbst schließen kann, und was eine
 * Untersuchung entscheidet. Die zweite Liste ist die, die man beim Termin
 * vorliest.
 */
function brauchtTeil(s, d) {
  // Gerechnet wird das in musterDaten, einmal für alle – siehe dort.
  const l = d.luecke;

  const offen = `<div class="karte">
    <h3>Was noch fehlt</h3>
    <p class="klein">Fragen, die offen sind, weil etwas nicht eingetragen wurde –
    die kannst du selbst schließen. Das Oberste bringt am meisten.</p>
    ${l.tagebuch.length ? `<ol class="luecken">${l.tagebuch.slice(0, 5).map((x) => `<li>
      <b>${esc(x.titel)}</b><span class="zeile-tags">${esc(x.text)}</span>
    </li>`).join('')}</ol>`
    : '<p class="klein">Nichts Offenes – das Tagebuch gibt gerade alles her, '
      + 'was es hergeben kann. Weiterschreiben ist trotzdem das Beste, was du '
      + 'tun kannst: Jede Woche macht jede Zahl hier belastbarer.</p>'}
  </div>`;

  /*
   * Was feststeht, steht nicht mehr unter „noch zu klären".
   *
   * Eine Liste offener Möglichkeiten, in der die eigene Diagnose als Frage
   * auftaucht, ist schlimmer als keine: Sie lässt jemanden nach etwas suchen,
   * das er schon gefunden hat, und verdeckt das, was wirklich noch offen ist.
   *
   * Gestrichen wird dabei nur, was mit dem Befund definitionsgemäß erledigt
   * ist – siehe die Begründung in js/befunde.js. Im Zweifel bleibt eine Zeile
   * stehen: Ein Verdacht zu viel kostet eine Nachfrage, einer zu wenig die
   * Untersuchung.
   */
  const erledigt = geklaert(s.befunde || []);
  const sichtbar = l.verdaechte.filter((v) => !erledigt.has(v.id));

  const zeile = (v) => `<li class="verdacht s-${v.stand}">
    <div class="fund-kopf">
      <b>${esc(v.name)}</b>
      <span class="fund-urteil">${esc(v.wort)}</span>
    </div>
    <p class="zeile-tags">${esc(v.was)}</p>
    ${v.dafuer.length ? `<p class="feld-name">Dafür spricht</p>
      <ul class="belege">${v.dafuer.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${v.dagegen.length ? `<p class="feld-name">Dagegen spricht</p>
      <ul class="belege">${v.dagegen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${v.offen ? `<p class="klein">${esc(v.offen)}</p>` : ''}
    <p class="feld-name">Was es entscheidet</p>
    <p class="klein">${v.untersuchung.replace(/\*\*(.+?)\*\*/g, (m, t) => `<b>${esc(t)}</b>`)}</p>
    <p class="frage-zeile">„${esc(v.frage)}"</p>
  </li>`;

  /*
   * Zehn Möglichkeiten mit je vier Absätzen sind zugeklappt richtig aufgehoben.
   * Das ist Nachschlagestoff für den Termin, kein Text zum täglichen Lesen –
   * und beim Drucken macht die App alle Klappen ohnehin auf (siehe
   * 'beforeprint' weiter unten), sodass er auf dem Zettel vollständig steht.
   */
  return `${offen}<div class="karte">
    <details class="verdachtbogen">
      <summary><h3>Was keine App beantwortet</h3></summary>
      <p class="klein">Je Möglichkeit: was im Tagebuch dafür spricht, was dagegen,
      und die Untersuchung, die es entscheidet. Die letzte Zeile ist jeweils der
      Satz zum Vorlesen – dafür ist der ganze Aufwand gut.</p>
      <ul class="verdaechte">${sichtbar.map(zeile).join('')}</ul>
      ${erledigt.size ? `<p class="klein">${mehrzahl(l.verdaechte.length - sichtbar.length,
    'Möglichkeit steht', 'Möglichkeiten stehen')} nicht mehr hier, weil sie bei
      dir schon geklärt ${l.verdaechte.length - sichtbar.length === 1 ? 'ist' : 'sind'} –
      siehe „Was schon feststeht" unter Mehr.</p>` : ''}
      <p class="klein">Keine Reihenfolge nach Wahrscheinlichkeit. Oben steht, wozu
      das Tagebuch am meisten zu sagen hat, nicht, was am ehesten zutrifft – das
      ist ein Unterschied, und ihn zu verwischen wäre genau die Art von Rat, die
      Leute in die falsche Sprechstunde schickt.</p>
    </details>
  </div>`;
}

/* Zwei kleine Umwege, damit brauchtTeil() nicht selbst rechnen muss – die
 * Rechnung steht in js/auswertung.js und wird hier nur abgeholt. */
function essensbezugVon(s) {
  return essensbezug(s.eintraege);
}
function artAnteilVon(s, arten) {
  return artAnteil(s.eintraege, arten).anteil;
}

/*
 * Was sich mit der Fassung 28 an den Zahlen geändert hat – einmal, oben auf
 * „Muster", bis „Gelesen".
 *
 * Manche Tage und Mittel zählen seitdem anders: ein Tag mit nur einem
 * ADHS-Mittel ist eine Lücke, Koffein als Tablette kein Schmerzmittel, jedes
 * erkannte Schmerzmittel mit Koffein ein Kombinationsmittel, ein Name mit
 * Koffein ohne erkannten Wirkstoff gar nichts mehr, und mehr Namen werden als
 * Mittel gegen Magensäure erkannt. Wer das nicht gesagt bekommt, merkt es nur
 * daran, dass sich eine Zahl still verschoben hat – und traut danach keiner
 * mehr. Jeder Punkt steht nur, wenn er dieses Tagebuch betrifft, und mit
 * seiner Zahl.
 */
/*
 * Die Namen, die seit der Fassung 28 erkannt werden. Pantozol und Rifun
 * (Pantoprazol), Nexium (Esomeprazol), Antra und Omep (Omeprazol) und Agopton
 * (Lansoprazol) sind Protonenpumpenhemmer, sie verringern die Bildung von
 * Magensäure (Fachinformationen Pantozol 20 mg, www.fachinfo.de/fi/pdf/003730,
 * Stand April 2023; Nexium mups, 004417, Stand Juli 2025; Antra MUPS, 004171,
 * Stand Mai 2024; Gebrauchsinformationen Rifun 20 mg, OMEP HEXAL 20 mg und
 * Agopton, je Abschnitt 1). Maaloxan ist „ein Mittel zur Bindung
 * überschüssiger Magensäure" (Gebrauchsinformation Maaloxan 25 mVal
 * Suspension, überarbeitet Oktober 2023, Abschnitt 1), also ein Antazidum
 * und kein Säureblocker – deshalb sagt die Karte „Mittel gegen Magensäure",
 * wie die App an anderen Stellen auch.
 *
 * „Omep" nicht, wo „Omeprazol" steht: Den Wirkstoffnamen erkannte die App
 * schon vorher.
 */
const NEUE_SAEURE_NAMEN = /pantozol|nexium|antra|agopton|maaloxan|rifun|omep(?!razol)/;

function v28Punkte(s) {
  const klein = (x) => String(x || '').toLowerCase();
  const mittel = s.eintraege.filter((e) => e.art === 'medikament');
  const gruppe = (name) => (wissenZu(name) || {}).id || null;
  const punkte = [];
  // Tage, die bisher über ein ADHS-Mittel als notiert galten und es jetzt
  // nicht mehr sind (siehe eintragZaehlt in js/wasser.js).
  const adhsTage = new Set(mittel.filter((e) => !e.zuKopf && istAdhsMittel(e.mittel)).map((e) => e.am));
  const luecken = [...adhsTage].filter((iso) => !tagesWert(s.eintraege, iso, s.tage).notiert).length;
  if (luecken) {
    punkte.push(luecken === 1
      ? 'Ein Tag, an dem nur ein ADHS-Mittel steht, zählt jetzt als Lücke statt als beschwerdefrei.'
      : `${luecken} Tage, an denen nur ein ADHS-Mittel steht, zählen jetzt als Lücke statt als beschwerdefrei.`);
  }
  // „Koffein" zählte bisher als Kombinationsmittel, „Coffein" gar nicht.
  const koffein = mittel.filter((e) => gruppe(e.mittel) === 'koffeinmittel' && klein(e.mittel).includes('koffein'));
  if (koffein.length) {
    punkte.push(`Koffein als Tablette zählt nicht mehr als Schmerzmittel und für den Magen nicht als NSAR (${mehrzahl(koffein.length, 'Eintrag', 'Einträge')}).`);
  }
  // Schmerzmittel mit Koffein: ASS mit Koffein war bisher NSAR (Grenze 15),
  // Paracetamol mit „Koffein" für den Magen ein NSAR.
  /*
   * Die Schwelle so, wie die Kopfschmerzklassifikation sie nennt: ICHD-3,
   * 8.2.5 Combination-analgesic-overuse headache, Kriterium B: „Regular
   * intake of one or more combination-analgesic medications on ≥10
   * days/month for >3 months"; Note 1 zählt Koffein als „adjuvant" dazu
   * (ichd-3.org; deutsche Übersetzung 2018 gleichlautend). Für einfache
   * Schmerzmittel gelten ≥15 Tage (8.2.3). „Grenze von etwa zehn Tagen"
   * ließ die drei Monate weg und las sich wie eine erlaubte Menge.
   *
   * Paracetamol mit Koffein ist kein NSAR: „Paracetamol ist ein
   * Anilinderivat … ATC-Code: N02BE51, Paracetamol, Kombinationen …
   * Paracetamol hat eine analgetische, antipyretische und sehr schwache
   * antiphlogistische Wirkung" (Fachinformation vivimed mit Coffein,
   * www.fachinfo.de/fi/pdf/000807, Stand Januar 2025, 5.1). Magenbeschwerden
   * nennt dieselbe Fachinformation in 4.8 trotzdem; „zählt für den Magen
   * nicht mehr als NSAR" konnte man als magenneutral lesen.
   */
  const kombiNamen = [...new Set(mittel.filter((e) => {
    const g = gruppe(e.mittel);
    return g === 'kombipara' || (g === 'kombi' && /koffein|coffein/.test(klein(e.mittel)));
  }).map((e) => String(e.mittel).trim()))];
  if (kombiNamen.length) {
    const para = mittel.some((e) => gruppe(e.mittel) === 'kombipara' && klein(e.mittel).includes('koffein'));
    punkte.push('Schmerzmittel mit Koffein, deren Wirkstoff die App erkennt, zählen jetzt als Kombinationsmittel. Für '
      + 'sie nennt die internationale Kopfschmerzklassifikation eine niedrigere Schwelle für Übergebrauch als für '
      + 'einzelne Schmerzmittel: an zehn oder mehr Tagen im Monat über mehr als drei Monate'
      + `${para ? '. Paracetamol mit Koffein zählt in der Magenauswertung nicht mehr als NSAR, weil Paracetamol '
        + 'nicht zu dieser Wirkstoffgruppe gehört – Magenbeschwerden nennt seine Fachinformation trotzdem als '
        + 'mögliche Nebenwirkung' : ''} `
      + `(${kombiNamen.join(', ')}).`);
  }
  /*
   * Und was mit „Koffein" bisher ein Kombinationsmittel war, jetzt aber keine
   * Gruppe hat („Kopfschmerztabletten mit Koffein"): Die Fassung 27 zählte
   * jeden Namen mit „Koffein" so, für den Kopf mit der Grenze zehn und für den
   * Magen als NSAR. Jetzt zählt er nirgends, weil offen ist, was darin steckt –
   * ohne diesen Punkt sänke die Zahl für den Übergebrauch still. Mit „Coffein"
   * kannte schon die Fassung 27 ihn nicht; auf der Haut zählte er nie.
   */
  const fremd = [...new Set(mittel.filter((e) => {
    const k = klein(e.mittel);
    return k.includes('koffein') && !/(gel|salbe|creme|pflaster)\b/.test(k) && !gruppe(e.mittel);
  }).map((e) => String(e.mittel).trim()))];
  if (fremd.length) {
    const eins = fremd.length === 1;
    punkte.push(`${undListe(fremd)} ${eins ? 'zählte' : 'zählten'} bisher als Kombinationsmittel – für den Kopf mit `
      + 'der Schwelle für Kombinationsmittel (zehn Tage im Monat), für den Magen wie ein NSAR. '
      + `${eins ? 'Es zählt' : 'Sie zählen'} jetzt nicht mehr mit: Die App erkennt den Wirkstoff darin nicht. `
      + `Mit dem Wirkstoff im Namen ordnet sie ${eins ? 'es' : 'sie'} wieder zu.`);
  }
  const saeure = [...new Set([...mittel.map((e) => e.mittel), ...s.standardMittel.map((m) => m.mittel)]
    .filter((n) => ['ppi', 'antazida'].includes(gruppe(n)) && NEUE_SAEURE_NAMEN.test(klein(n)))
    .map((n) => String(n).trim()))];
  if (saeure.length) punkte.push(`${undListe(saeure)} ${saeure.length === 1 ? 'wird' : 'werden'} jetzt als Mittel gegen Magensäure erkannt.`);
  if (s.eintraege.some((e) => e.art === 'kopf')) {
    punkte.push('Im Kopfbogen sind „Licht“ und „Lärm“ jetzt getrennt; frühere Einträge behalten „Licht oder Lärm“.');
  }
  return punkte;
}

function v28Karte(s) {
  if (s.v28Gesagt === true) return '';
  const punkte = v28Punkte(s);
  if (!punkte.length) return '';
  return `<div class="karte karte-merk v28-karte">
    <h3>Was sich an deinen Zahlen geändert hat</h3>
    <ul class="v28-liste">${punkte.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <div class="reihe">${knopf('v28-gelesen', 'Gelesen', 'btn-ghost')}</div>
  </div>`;
}

function musterAnsicht(s) {
  return v28Karte(s) + musterInhalt(s);
}

function musterInhalt(s) {
  const d = musterDaten(s);
  const bilanz = d.bilanz;
  const mahlzeiten = s.eintraege.filter((e) => e.art === 'essen').length;

  /*
   * Auch zugeklappt – aber mit dem Vorbehalt in der Zusammenfassung.
   *
   * Die Rechenregel (welches Fenster, ab wie vielen Fällen) ist Nachschlagestoff:
   * einmal verstanden, danach steht sie jeden Tag im Weg. Der Satz „Häufigkeit,
   * keine Ursache" ist das Gegenteil davon – er gehört neben jeden Fund und
   * bleibt deshalb sichtbar, während nur die Mechanik hinter den Tipp wandert.
   * Einen Vorbehalt wegzuklappen und die Funde stehen zu lassen wäre genau die
   * Art von Vereinfachung, gegen die diese App gebaut ist.
   */
  const erklaerung = `<div class="karte hinweis">
    <details class="angebotbogen">
    <summary><h3>Wie das gelesen wird</h3>
    <span class="klein">Das ist eine Häufigkeit, keine Ursache – und kein Ersatz
    für die Praxis. Wie gerechnet wird: antippen.</span></summary>
    <p>Verglichen wird die mittlere Beschwerdestärke in den
    <b>${s.fenster} Stunden</b> nach Mahlzeiten <b>mit</b> einem Merkmal gegen
    alle übrigen Mahlzeiten. Eine Zeile erscheint erst ab
    ${s.mindestFaelle} Fällen auf beiden Seiten.</p>
    ${spielraumZeile(d)}
    <p class="klein">Das ist eine Häufigkeit, keine Ursache. Wer an einem
    schlechten Tag ohnehin anders isst, findet sich hier wieder, ohne dass das
    Essen schuld wäre. Der Zettel ist für das Gespräch in der Praxis gedacht,
    nicht als Ersatz dafür.</p>
    </details>
  </div>`;

  // Warnzeichen und Einordnung stehen *vor* dieser Abkürzung: Wer Beschwerden
  // einträgt, aber keine Mahlzeiten, hat trotzdem ein Tagebuch – und wenn
  // darin ein Warnzeichen steht, ist das Fehlen von Mahlzeiten der falsche
  // Grund, es nicht anzuzeigen. Genau das war es einmal.
  /*
   * Ohne Mahlzeiten fällt nur die Auslöserrechnung weg – sonst nichts.
   *
   * Alles andere auf diesem Reiter hängt an Beschwerden, Stuhlgang und
   * Medikamenten und wäre auch ohne eine einzige Mahlzeit vollständig. Diese
   * Abkürzung hat schon einmal die Warnzeichen verschluckt; sie darf nicht
   * auch noch die Kriterien und den Stuhlgang verschlucken.
   *
   * Und erst recht nichts, was gerade *läuft*. Ein Auslassversuch und ein
   * Provokationstest hängen an keiner einzigen Mahlzeit – der eine misst
   * Tageswerte, der andere ein Fenster nach einem Durchgang. Fehlten sie hier,
   * verschwände mitten im Versuch die einzige Stelle, an der sein Ergebnis
   * steht, und zwar ausgerechnet bei dem, der gerade weniger einträgt, weil er
   * gerade weniger isst. Dieselbe Falle wie damals, eine Tür weiter.
   */
  /*
   * Die Frühphase: solange nichts auswertbar ist, eine kurze Fassung.
   *
   * Am fünften Tag standen hier über neuntausend Zeichen, und fast alles davon
   * war eine Absage – zehn Karten, die nacheinander „noch nicht" sagten. Jede
   * für sich richtig, zusammen die beste Art, jemanden das Eintragen aufgeben
   * zu lassen. Gezeigt wird deshalb: die Lage, die Warnzeichen, ein
   * Fortschrittsblock – und alles, was schon etwas zu sagen hat.
   *
   * Was hier NICHT passiert: Es wird nichts früher behauptet. Die Schwellen
   * sind dieselben geblieben. Und die Warnzeichen stehen weiter ganz oben, ohne
   * Schwelle und ohne Fortschritt: Ein einziges Mal Blut ist ein einziges Mal
   * zu viel, auch am zweiten Tag.
   *
   * Versuch, Plan und Provokation stehen mit in der Liste, obwohl sie in dieser
   * Phase fast immer leer sind: Sie melden sich, sobald einer davon *läuft* –
   * und ein laufender Versuch darf nie an einer Anzeigebedingung hängen.
   */
  const frueh = !genugFuerBild(d.bild.basis) && !bilanz.some((b) => b.genug);
  if (frueh) {
    return `${lageTeil(s, d)}${warnTeil(d)}${fortschrittTeil(s, d)}`
      + `${versuchTeil(s, d)}${planTeil(s, d)}${provokationTeil(s, d)}`
      + `${ansprechenTeil(s, d)}${stuhlTeil(s)}${kopfTeil(s, d)}${aktivTeil(s, true)}`
      + `${adhsKarte(s, d)}${spannungKarte(s, d)}${zyklusTeil(s)}${erklaerung}`;
  }

  if (!mahlzeiten) {
    return `${lageTeil(s, d)}${bildTeil(s, d)}${kriterienTeil(s, d)}${versuchTeil(s, d)}${planTeil(s, d)}${provokationTeil(s, d)}<p class="leer">Noch keine Mahlzeit
      eingetragen. Sobald ein paar Tage beisammen sind, steht hier, was
      auffällt.</p>${ansprechenTeil(s, d)}${stuhlTeil(s)}${kopfTeil(s, d)}${aktivTeil(s)}`
      + `${adhsKarte(s, d)}${spannungKarte(s, d)}${brauchtTeil(s, d)}${zyklusTeil(s)}${erklaerung}`;
  }

  const fertig = bilanz.filter((b) => b.genug);
  const offen = bilanz.filter((b) => !b.genug);

  const zeile = (b) => {
    const art = einstufung(b);
    // Störfaktorentest und Zeitprofil kommen aus musterDaten – nur für das,
    // was ohnehin auffällig ist, und nur einmal gerechnet, damit oben in der
    // Zusammenfassung nichts anderes stehen kann als hier.
    const g = d.gepruefte.find((x) => x.b.id === b.id);
    const stand = g ? g.stand : null;
    const profil = g ? g.profil : null;
    // Die Aufschlüsselung nach Rolle nur, wenn es überhaupt etwas zu
    // unterscheiden gibt: Bei einer einzigen Rolle wiederholte sie die
    // Hauptzahl mit anderen Worten.
    const rollen = rollenBilanz(s.eintraege, b.id, s.fenster);
    const nachRolle = rollen.length > 1 ? `<ul class="rollen">${rollen.map((r) => `<li>
      <span>als ${esc(rolleName(r.rolle))}</span>
      <span class="klein">${mehrzahl(r.faelle, 'Mal', 'Mal')}, danach ${fmtZahl(r.schnitt)}</span>
    </li>`).join('')}</ul>` : '';
    // Und die eigentliche Frage dahinter: wie viel, nicht ob – auch das kommt
    // aus musterDaten, damit oben und unten dasselbe steht.
    const dosis = g ? g.dosis : null;
    // Vorbehalt (Ebene 0): Liegen die Mahlzeiten mit diesem Auslöser deutlich
    // öfter nach einem ADHS-Mittel als die übrigen, misst der Fund das Mittel
    // womöglich mit.
    const nahSatz = ausloeserNahSatz(ausloeserNahAmMittel(d.bewertet, s.eintraege, b.id),
      ausloeserName(b.id, s.eigeneAusloeser));
    return `<li class="fund f-${art}">
      <div class="fund-kopf">
        <b>${esc(ausloeserName(b.id, s.eigeneAusloeser))}</b>
        <span class="fund-urteil">${EINSTUFUNG_WORT[art]}</span>
      </div>
      ${vergleichBalken(b.schnittMit, b.schnittOhne)}
      <p class="klein">${mehrzahl(b.faelle, 'Mahlzeit', 'Mahlzeiten')} damit,
        ${b.gegenFaelle} ohne · danach ${Math.round(b.quoteMit * 100)} % mit
        Beschwerden, sonst ${Math.round(b.quoteOhne * 100)} %</p>
      ${nahSatz ? `<p class="klein vorbehalt-mittel">${esc(nahSatz)}</p>` : ''}
      ${nachRolle}
      ${dosis ? dosisBlock(dosis) : ''}
      ${stand ? schichtBlock(stand) : ''}
      ${profil ? zeitBlock(profil) : ''}
    </li>`;
  };

  const gefunden = fertig.length
    ? `<ul class="funde funde-zutaten">${fertig.map(zeile).join('')}</ul>`
    : `<p class="leer">Noch reicht es für keine Aussage. Nach
       ${mehrzahl(mahlzeiten, 'Mahlzeit', 'Mahlzeiten')} braucht es je Merkmal
       ${s.mindestFaelle} Fälle mit und ${s.mindestFaelle} ohne.</p>`;

  const wartet = offen.length ? `<div class="karte zaehlt">
    <h3>Zählt noch</h3>
    <ul class="wartend">${offen.slice(0, 12).map((b) => `<li>
      <span>${esc(ausloeserName(b.id, s.eigeneAusloeser))}</span>
      <span class="klein">${b.faelle} von ${s.mindestFaelle}</span>
    </li>`).join('')}</ul>
  </div>` : '';

  const zeiten = nachTageszeit(s.eintraege);
  const wann = zeiten.length ? `<div class="karte">
    <h3>Wann es auftritt</h3>
    <ul class="wartend">${zeiten.map((t) => `<li>
      <span>${t.name}</span>
      <span class="klein">${mehrzahl(t.anzahl, 'Mal', 'Mal')}, im Mittel ${fmtZahl(t.schnitt)}</span>
    </li>`).join('')}</ul>
  </div>` : '';

  const arten = nachArt(s.eintraege);
  const wie = arten.length ? `<div class="karte">
    <h3>Womit es sich meldet</h3>
    <ul class="wartend">${arten.map((a) => `<li>
      <span>${esc(beschwerdeName(a.id))}</span>
      <span class="klein">${mehrzahl(a.anzahl, 'Mal', 'Mal')}</span>
    </li>`).join('')}</ul>
  </div>` : '';

  /*
   * Die Reihenfolge ist eine Aussage.
   *
   * Warnzeichen und Einordnung zuerst (bildTeil), dann die Kriterien – das
   * Nächste an einer Diagnose. Dann der Auslassversuch, weil er das Einzige
   * ist, was aus all dem einen Beleg macht. Danach erst die Zahlen: Klassen vor
   * einzelnen Zutaten, weil sie belastbarer sind. Und zum Schluss, was noch
   * fehlt – die Liste für den Termin. Wer nur die ersten beiden Karten liest,
   * hat trotzdem das Wichtigste.
   */
  return lageTeil(s, d) + bildTeil(s, d) + unterleibVorschlag(s)
    // Der Widerspruch steht weit oben, direkt bei der Einordnung: Er ist kein
    // Nebenbefund, sondern die eine Stelle, an der die Zahlen etwas sagen, das
    // man selbst nicht sehen kann – seiner eigenen Erfahrung zum Trotz.
    + kuecheWiderspruchTeil(s, d)
    + kriterienTeil(s, d) + versuchTeil(s, d) + planTeil(s, d) + provokationTeil(s, d)
    + klassenTeil(s, d) + gefunden + spaetTeil(s, d) + wechselTeil(s, d)
    + wartet + ansprechenTeil(s, d)
    + zeitTeil(d) + wann + wie + stuhlTeil(s) + kopfTeil(s, d) + aktivTeil(s)
    + adhsKarte(s, d) + spannungKarte(s, d) + brauchtTeil(s, d)
    + zyklusTeil(s) + erklaerung;
}

/**
 * Was du gemacht hast – die Aktivitäten und die Tagesfrage „Bewegung".
 *
 * Steht bei Stuhlgang und Kopf und nicht bei den Auslösern: Es ist dieselbe
 * Art Vergleich, aber nicht dieselbe Frage, und wer eine Aktivität für eine
 * Zutat hält, sucht im Essen. Der Vorbehalt steht in der Karte selbst und
 * nicht hinter einem Tipp – er gehört neben jede dieser Zahlen.
 *
 * Mit `nurFertig` (die Frühphase des Reiters) nur, was schon etwas zu sagen
 * hat; die Liste „Zählt noch" wäre dort eine Absage mehr.
 */
const AKTIV_BAUCH_WORT = { ...EINSTUFUNG_WORT, moeglich: 'möglicherweise auffällig' };
const AKTIV_KOPF_WORT = {
  auffaellig: 'öfter Kopfschmerz',
  unauffaellig: 'seltener Kopfschmerz',
  neutral: 'kein Unterschied',
  zuwenig: 'zu wenige Fälle',
};

/*
 * Was einer Seite noch fehlt. Gezählt wird erst mit genug Fällen auf beiden
 * Seiten; bei einer Aktivität, die fast täglich vorkommt, reichen die Fälle
 * mit ihr längst, und es fehlen die Tage ohne. „40 von 5" läse sich dann wie
 * ein Rechenfehler und sagte nicht, worauf es wartet. Beim Kopf zählen Tage.
 */
function aktivNoch(v, kopf = false) {
  return v.fehlt || !v.fehltGegen
    ? `${v.faelle} von ${v.mindest} ${kopf ? 'Tagen' : 'Mal'}`
    : `${v.gegenFaelle} von ${v.mindest} Tagen ohne`;
}

function aktivTeil(s, nurFertig = false) {
  const fenster = s.fenster || 4;
  const alleZeilen = aktivitaetBilanz(s.eintraege, s.tage, { fenster, mindestFaelle: s.mindestFaelle });
  /*
   * Mit „Kiefer, Nacken, Schiene" stehen Massage, Massagepistole und Wärme
   * nur noch gefiltert da – nach einem mindestens mittel verspannten Vortag,
   * in der Karte „Kiefer, Nacken, Schiene". Hier stünde sonst daneben der
   * ungefilterte Lauf mit einer anderen Zahl für dieselbe Aktivität. Für den
   * Kopf gilt das auch beim Dehnen (V3_IDS in js/spannung.js); seine
   * Bauchzeile bleibt hier, denn der gefilterte Lauf misst nur den Kopf.
   *
   * Gerechnet und gezählt wird trotzdem alles wie ohne Schalter (R0) – hier
   * wird nur ausgewählt, was zu sehen ist.
   */
  const gefiltert = s.spannungAn === true;
  const nurBauch = (z) => gefiltert && V3_IDS.includes(z.id);
  const kopfDa = (z) => !nurBauch(z) && z.kopf.genug;
  const zeilen = gefiltert ? alleZeilen.filter((z) => !z.gegenmittel) : alleZeilen;
  const verschoben = gefiltert && alleZeilen.some((z) => V3_IDS.includes(z.id));
  const fertig = zeilen.filter((z) => z.bauch.genug || kopfDa(z));
  const offen = zeilen.filter((z) => !z.bauch.genug && !kopfDa(z));
  const bewegung = bewegungSatz(faktorBilanz(s.eintraege, s.tage, 'bewegung', tagesWert));
  if (!fertig.length && !bewegung && (nurFertig || !offen.length)) {
    return verschoben && !nurFertig ? `<div class="karte karte-aktiv" id="wasDuGemachtHast">
      <h3>Was du gemacht hast</h3>
      <p class="klein">${esc(GEGENMITTEL_VERSCHOBEN)}</p>
    </div>` : '';
  }
  const rang = ['auffaellig', 'moeglich', 'unauffaellig', 'neutral', 'zuwenig'];
  const fund = (z) => {
    const a = aktivitaetVon(z.id, s.eigeneAktivitaeten);
    const art = [z.bauch.art, ...(nurBauch(z) ? [] : [z.kopf.art])]
      .sort((x, y) => rang.indexOf(x) - rang.indexOf(y))[0];
    // Massage, Massagepistole und Wärme haben keine Bauchseite (siehe
    // aktivitaetBilanz) – eine Zeile „Bauch: zählt noch" verspräche eine.
    const bauch = z.gegenmittel ? ''
      : (z.bauch.genug
        ? `<b>Bauch, ${esc(AKTIV_BAUCH_WORT[z.bauch.art])}:</b> ${esc(aktivBauchSatz(z, fenster))}`
        : `<b>Bauch:</b> zählt noch – ${aktivNoch(z.bauch)} auswertbar.`);
    let kopf = z.kopf.genug
      ? `<b>Kopf, ${esc(AKTIV_KOPF_WORT[z.kopf.art])}:</b> ${esc(aktivKopfSatz(z))}`
      : `<b>Kopf:</b> zählt noch – ${aktivNoch(z.kopf, true)} auswertbar.`;
    if (nurBauch(z)) kopf = '';
    return `<li class="fund f-${art}">
      <div class="fund-kopf">
        <b><span aria-hidden="true">${a.icon}</span> ${mitUmbruch(a.name)}</b>
        <span class="fund-urteil">${mehrzahl(z.anzahl, 'Mal', 'Mal')}</span>
      </div>
      ${bauch ? `<p class="klein">${bauch}</p>` : ''}
      ${kopf ? `<p class="klein">${kopf}</p>` : ''}
    </li>`;
  };
  // Zur Bewegung am selben Tag sagt die Karte nur, was der Vergleich nicht
  // kann. „An schlechten Tagen bewegt man sich oft weniger", wie es bis zur
  // Fassung 29 hieß, ist für Migräne belegt (ICHD-3 1.1 C4: „causing
  // avoidance of routine physical activity"), für Bauchtage allgemein nicht –
  // und der Satz hängt am Bauchwert.
  return `<div class="karte karte-aktiv" id="wasDuGemachtHast">
    <h3>Was du gemacht hast</h3>
    <p class="klein">Wie oft in den ${fenster} Stunden nach einer Aktivität Beschwerden
    kamen und in den ${AKTIV_KOPF_STUNDEN} Stunden danach Kopfschmerz – verglichen mit
    denselben Stunden an Tagen ohne sie. Erst ab ${s.mindestFaelle || 5} Fällen auf
    beiden Seiten, beim Kopf ab ${Math.max(s.mindestFaelle || 5, AKTIV_KOPF_MINDEST)} Tagen.</p>
    ${fertig.length ? `<ul class="funde funde-aktiv">${fertig.map(fund).join('')}</ul>` : ''}
    ${!nurFertig && offen.length ? `<p class="feld-name">Zählt noch</p>
      <ul class="wartend">${offen.slice(0, 8).map((z) => `<li>
        <span>${esc(aktivitaetVon(z.id, s.eigeneAktivitaeten).name)}</span>
        <span class="klein">${z.gegenmittel ? aktivNoch(z.kopf, true) : aktivNoch(z.bauch).replace(/ Mal$/, '')}</span>
      </li>`).join('')}</ul>` : ''}
    ${bewegung ? `<p class="klein aktiv-bewegung">${esc(bewegung)} Gezählt am selben Tag –
      was zuerst kam, die Bewegung oder die Beschwerden, lässt sich daraus nicht ablesen.</p>` : ''}
    ${verschoben ? `<p class="klein">${esc(GEGENMITTEL_VERSCHOBEN)}</p>` : ''}
    <p class="klein">Das ist eine Häufigkeit, keine Ursache. Wer an schlechten Tagen
    anders lebt, findet sich hier wieder, ohne dass die Aktivität schuld wäre.</p>
  </div>`;
}

const GEGENMITTEL_VERSCHOBEN = 'Massage, Massagepistole und Wärme – und beim Kopfschmerz auch Yoga/Dehnen – '
  + 'stehen unter „Kiefer, Nacken, Schiene“, gezählt nur nach einem mindestens mittel verspannten Vortag.';

/*
 * Die Wörter für ein Urteil in den neuen Karten. „Auffällig" heißt dort immer:
 * auf der genannten Seite mehr – mehr Beschwerden, mehr Kopfschmerz, schlechter
 * geschlafen. Wo höhere Zahlen besser wären, gibt es keine Zeile.
 */
const NEU_URTEIL_WORT = {
  auffaellig: 'auffällig',
  moeglich: 'möglicherweise',
  unauffaellig: 'eher weniger',
};

/*
 * Zwei Balken für Anteile, mit Prozent statt einer Zahl von 0 bis 10 –
 * vergleichBalken (js/chart.js) zeigt eine Stufe, und „0,4" läse sich hier
 * wie eine.
 */
function anteilBalken(a, b, worte) {
  const breite = (x) => `${Math.max(1.5, Math.min(100, x * 100)).toFixed(1)}%`;
  const zeile = (wort, x, farbe) => `<div class="vgl-zeile"><span class="vgl-mark">${esc(wort)}</span>
    <span class="vgl-spur"><i style="width:${breite(x)};background:${farbe}"></i></span>
    <b>${Math.round(x * 100)} %</b></div>`;
  return `<div class="vgl">${zeile(worte.mit, a, 'var(--warn)')}${zeile(worte.ohne, b, 'var(--muted)')}</div>`;
}

/** Ein Vergleich mit Urteil als Fund – oder '' ohne Urteil. */
function neuFund(titel, v, satz, worte) {
  if (!hatUrteil(v)) return '';
  const [a, b] = v.richtung === 'ohne' ? [v.ohne.schnitt, v.mit.schnitt] : [v.mit.schnitt, v.ohne.schnitt];
  const balken = v.skala === 'anteil' ? anteilBalken(a, b, worte) : vergleichBalken(a, b, worte);
  return `<li class="fund f-${v.art}">
    <div class="fund-kopf"><b>${esc(titel)}</b><span class="fund-urteil">${NEU_URTEIL_WORT[v.art]}</span></div>
    ${balken}
    <p class="klein">${esc(satz)}</p>
  </li>`;
}

const kleinSaetze = (liste) => liste.filter(Boolean).map((t) => `<p class="klein">${esc(t)}</p>`).join('');

/*
 * Vergleiche mit genug Fällen, aber ohne Urteil: als Zahlen in einer Liste,
 * und darunter in einem Satz, ab welchem Unterschied eines gefallen wäre (R5)
 * – oder warum keines fallen durfte (R6 bis R6c). Untereinander als ganze
 * Sätze wären es fünf Absätze, die alle fast dasselbe sagen.
 */
function ohneUrteilBlock(liste, seiten = ['mit Mittel', 'ohne']) {
  const da = liste.filter(({ v }) => v && v.genug && !hatUrteil(v));
  if (!da.length) return '';
  const wert = (v, x) => (v.skala === 'anteil' ? `${Math.round(x * 100)} %` : fmtZahl(x));
  const zeilen = da.map(({ titel, v }) => `<li><span>${esc(titel)}</span><span class="klein">${esc(
    `${seiten[0]} ${wert(v, v.mit.schnitt)} · ${seiten[1]} ${wert(v, v.ohne.schnitt)} (${v.mit.n}/${v.ohne.n})`,
  )}</span></li>`).join('');
  const grenzen = da.filter(({ v }) => v.art === 'neutral')
    .map(({ kurz, v }) => `${grenzeText(v.urteil.grenze, v.skala)} (${kurz})`);
  const grenzSatz = grenzen.length
    ? `Kein Unterschied über dem Zufall – unter ${grenzen.length > 1
      ? `${grenzen.slice(0, -1).join(', ')} und ${grenzen[grenzen.length - 1]}` : grenzen[0]} wäre hier keiner zu sehen.`
    : '';
  const stoerung = [...new Set(da.filter(({ v }) => v.stoerung).flatMap(({ v }) => v.saetze))];
  return `<ul class="wartend">${zeilen}</ul>${kleinSaetze([grenzSatz, ...stoerung])}`;
}

/**
 * Die Karte „ADHS-Mittel" – nur mit dem Schalter (Ebene 1).
 *
 * Alles hier kommt aus js/adhs.js und ist dort begründet. Die Karte wählt nur
 * aus: Was ein Urteil hat, steht als Fund mit Balken; was keines hat, steht als
 * Zahl, mit dem Grund daneben. Auf der Seite „ohne" steht nie, wie viel noch
 * fehlt (R9) – nur, wie viel es bisher gibt.
 */
function adhsKarte(s, d) {
  if (s.adhsAn !== true) return '';
  const a = d.adhs;
  if (!a || !a.einnahmen || !a.abschnitt) {
    return `<div class="karte karte-adhs">
      <h3>ADHS-Mittel</h3>
      <p class="klein">Bisher ist kein ADHS-Mittel eingetragen. Hier stehen Zahlen dazu, sobald es Einnahmen gibt –
      nur aus dem, was eingetragen ist.</p>
    </div>`;
  }
  const teile = [];
  const zeile = (name, wert) => `<li><span>${esc(name)}</span><span class="klein">${esc(wert)}</span></li>`;

  /* A1 */
  const h = a.a1 && a.a1.haupt;
  if (h) {
    const v = h.vergleich;
    const z = h.zaehl;
    const nicht = [
      z.vor ? `kurz vor dem Essen ${z.vor}` : '',
      z.ohneAngabe ? `ohne Angabe ${z.ohneAngabe}` : '',
      z.spaet ? `später angegeben ${z.spaet}` : '',
      z.widerspruch ? `Angabe und Mahlzeit widersprechen sich ${z.widerspruch}` : '',
      z.unklar ? `Mahlzeit nur ungefähr ${z.unklar}` : '',
      z.nichtZuzuordnen ? `Zeit nur ungefähr ${z.nichtZuzuordnen}` : '',
      z.davor ? `Beschwerde schon davor ${z.davor}` : '',
      z.offen ? `Reihenfolge offen ${z.offen}` : '',
    ].filter(Boolean).join(' · ');
    const fund = neuFund('Ohne gegen mit Essen', v, h.saetze[0], { mit: 'ohne Essen', ohne: 'mit Essen' });
    // Mit dem Namen des Mittels: A1 rechnet über das ganze Tagebuch, und nach
    // einem Wechsel stammen die Zahlen womöglich nicht vom Mittel in der
    // Kopfzeile. Dann steht auch dabei, bis wann es eingetragen war.
    const vonWem = `${h.anzeige}${!h.imAbschnitt && h.letzte ? `, Einnahmen bis ${fmtDatum(h.letzte)}` : ''}`;
    teile.push(`<p class="feld-name">Bauch in den 4 Stunden nach der ersten Einnahme – ${esc(vonWem)}</p>
      ${fund ? `<ul class="funde">${fund}</ul>${kleinSaetze(h.saetze.slice(1))}` : `<ul class="wartend">
        ${zeile('ohne Essen', `${mehrzahl(v.ohne.n, 'Mal', 'Mal')}${v.genug ? `, im Mittel ${fmtZahl(v.ohne.schnitt)}` : ''}`)}
        ${zeile('mit Essen', `${mehrzahl(v.mit.n, 'Mal', 'Mal')}${v.genug ? `, im Mittel ${fmtZahl(v.mit.schnitt)}` : ''}`)}
      </ul>${kleinSaetze(h.saetze)}`}
      ${nicht ? `<p class="klein">Nicht gewertet: ${esc(nicht)}.</p>` : ''}
      ${a.a1.auch.length ? `<p class="klein">Auch: ${esc(a.a1.auch.map((x) => `${x.anzeige}: ${mehrzahl(x.faelle, 'Fall', 'Fälle')}`).join(', '))}.</p>` : ''}`);
  }

  /* A2 */
  if (a.a2) {
    const g = a.a2.gruende;
    const gruende = [
      g.geplant ? `geplant ${g.geplant}` : '', g.vergessen ? `vergessen ${g.vergessen}` : '',
      g.pause ? `ohne Grund ${g.pause}` : '',
      g.beschwerden ? `wegen Beschwerden ${g.beschwerden} – nicht gewertet` : '',
    ].filter(Boolean).join(', ');
    const ids = ['bauch', 'kopf', 'schlaf', ...(s.spannungAn === true ? ['kiefer', 'gepresst'] : [])];
    const worte = { mit: 'mit Mittel', ohne: 'ohne' };
    const funde = ids.map((id) => neuFund(A2_TITEL[id], a.a2.zeilen[id], a.a2.zeilen[id].satz, worte)).join('');
    const ohneUrteil = ohneUrteilBlock(ids.map((id) => ({ titel: A2_TITEL[id], kurz: A2_KURZ[id], v: a.a2.zeilen[id] })));
    const st = a.a2.stuhl;
    const stuhl = st.genug && !st.stoerung
      ? `Harter Stuhl (Typ 1–2) an Tagen mit Mittel ${Math.round(st.mit.schnitt * 100)} % (${st.mit.n} Tage mit `
        + `Stuhlgang), ohne ${Math.round(st.ohne.schnitt * 100)} % (${st.ohne.n}) – nur beschrieben.`
      : '';
    teile.push(`<p class="feld-name">Tage mit gegen ohne Mittel (nur notierte Tage)</p>
      <ul class="wartend">${zeile('Tage ohne ADHS-Mittel', `${a.a2.alleTage}${gruende ? ` (${gruende})` : ''}`)}</ul>
      ${funde ? `<ul class="funde">${funde}</ul>` : ''}
      ${ohneUrteil}
      ${kleinSaetze([stuhl, ...a2ZuWenig(a.a2, ids), ...a.a2.saetze])}`);
  }

  /* A3 */
  if (a.a3 && a.a3.faelle) {
    const v = a.a3;
    const fund = neuFund('Schlaf nach späterer letzter Einnahme', v, v.saetze[0],
      { mit: `nach ${v.uhr}`, ohne: 'früher' });
    teile.push(`<p class="feld-name">Schlaf nach späterer letzter Einnahme (0 gut – 4 kaum)</p>
      ${fund ? `<ul class="funde">${fund}</ul>${kleinSaetze(v.saetze.slice(1))}` : kleinSaetze(v.saetze)}`);
  }

  /* A4 */
  if (a.a4 && a.a4.sichtbar) {
    const f = a.a4.faecher;
    teile.push(`<p class="feld-name">Kopfschmerz-Beginn ab der ersten Einnahme (${a.a4.n}, nur beschrieben)</p>
      <ul class="wartend">
        ${zeile('0–4 Stunden', `${f[0]}×`)}${zeile('4–8 Stunden', `${f[1]}×`)}${zeile('8–12 Stunden', `${f[2]}×`)}
      </ul>
      <p class="klein">Schon vorher ${a.a4.vorher}×, später als 12 Stunden ${a.a4.spaeter}×.</p>
      ${kleinSaetze(a.a4.saetze)}`);
  }

  const fragen = a.fragen.filter((f) => !f.nurMitSpannung || s.spannungAn === true).slice(0, 3);
  return `<div class="karte karte-adhs">
    <h3>ADHS-Mittel</h3>
    <p class="klein">${esc(a.abschnitt.namen.join(', '))} seit ${esc(a.abschnitt.datum)}:
      ${mehrzahl(a.abschnitt.tage, 'Einnahmetag', 'Einnahmetage')}. Gezählt wird in festen Fenstern –
      das sagt nichts darüber, wie lange ein Mittel wirkt.</p>
    ${teile.join('')}
    ${fragen.length ? `<p class="feld-name">Fragen für die Sprechstunde</p>
    <ul class="belege">${fragen.map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>` : ''}
    <p class="klein">Zahlen aus dem Tagebuch, kein Urteil über das Mittel – Fragen dazu gehören in die Praxis.</p>
  </div>`;
}

// Die Skala in Klammern bricht nicht am Strich um (Wortverbinder um „–").
const A2_TITEL = {
  bauch: 'Bauch am Tag (0\u2060–\u206010)',
  kopf: 'Kopfschmerz nach der Einnahmezeit',
  schlaf: 'Schlaf in der Nacht danach (0\u2060–\u20604)',
  kiefer: 'Kiefer am Morgen danach (0\u2060–\u20604)',
  gepresst: 'Tagsüber gepresst',
};
const A2_KURZ = { bauch: 'Bauch', kopf: 'Kopf', schlaf: 'Schlaf', kiefer: 'Kiefer', gepresst: 'gepresst' };

/**
 * Die Karte „Kiefer, Nacken, Schiene" – nur mit dem Schalter (Ebene 2).
 *
 * Wie die ADHS-Karte: Funde nur mit Urteil, sonst Zahlen mit Grund. Was am
 * selben Tag zusammen vorkommt, steht nur als Zahl (R7) – Nacken und
 * Kopfschmerz am selben Tag sagen nichts darüber, was zuerst kam.
 */
function spannungKarte(s, d) {
  if (s.spannungAn !== true) return '';
  const sp = d.spannung;
  const teile = [];
  const zeile = (name, wert) => `<li><span>${esc(name)}</span><span class="klein">${esc(wert)}</span></li>`;

  /* V1 */
  const v1 = sp.v1;
  if (v1.getragen || v1.nicht) {
    const worte = { mit: 'ohne Schiene', ohne: 'mit Schiene' };
    const funde = [
      neuFund('Kopf am Morgen', v1.v1a, v1.saetze.find((t) => t.startsWith('Kopf am Morgen')) || '', worte),
      neuFund('Kiefer am Morgen', v1.v1b, v1.saetze.find((t) => t.startsWith('Kiefer am Morgen')) || '', worte),
    ].join('');
    // Die Sätze zu V1a und V1b stehen als Fund oder als Zahl darüber; übrig
    // bleiben „zu wenige", die nicht gewerteten Nächte und der Satz zur Schiene.
    const rest = v1.saetze.filter((t) => !t.startsWith('Kopf am Morgen') && !t.startsWith('Kiefer am Morgen'));
    const ohne = ohneUrteilBlock([
      { titel: 'Kopf am Morgen', kurz: 'Kopf', v: v1.v1a },
      { titel: 'Kiefer am Morgen (0\u2060–\u20604)', kurz: 'Kiefer', v: v1.v1b },
    ], ['mit Schiene', 'ohne']);
    teile.push(`<p class="feld-name">Schiene</p>
      <ul class="wartend">
        ${zeile('Nächte getragen', String(v1.getragen))}
        ${zeile('nicht getragen', String(v1.nicht))}
        ${v1.ohneAngabe ? zeile('ohne Angabe', String(v1.ohneAngabe)) : ''}
      </ul>
      ${funde ? `<ul class="funde">${funde}</ul>` : ''}
      ${ohne}
      ${kleinSaetze(rest)}`);
  }

  /* V2 */
  const v2 = sp.v2;
  if (v2.mit.n || v2.ohne.n) {
    const fund = neuFund('Neuer Kopfschmerz am nächsten Tag', v2, v2.satz,
      { mit: 'stark verspannt', ohne: 'locker' });
    const gut = v2.gut.genug
      ? `Nur nach guten Nächten: nach stark verspanntem Tag ${v2.gut.mit.k} von ${v2.gut.mit.n}, nach lockerem `
        + `${v2.gut.ohne.k} von ${v2.gut.ohne.n} – nur beschrieben.`
      : '';
    teile.push(`<p class="feld-name">Nacken/Schultern und Kopfschmerz am nächsten Tag</p>
      ${fund ? `<ul class="funde">${fund}</ul>` : (v2.genug ? kleinSaetze([v2.satz])
    : `<ul class="wartend">${zeile('nach stark verspanntem Tag', mehrzahl(v2.mit.n, 'Tag', 'Tage'))}${zeile('nach lockerem Tag', mehrzahl(v2.ohne.n, 'Tag', 'Tage'))}</ul>`)}
      ${kleinSaetze([
    v2.genug ? `Anspannung an diesen Tagen: ${fmtZahl(v2.stress.mit)} gegen ${fmtZahl(v2.stress.ohne)}.` : '',
    gut, v2.vorbote,
  ])}`);
  }

  /* V3 */
  if (sp.v3.length) {
    const funde = sp.v3.map((z) => neuFund(z.name, z.vergleich, z.satz, { mit: 'danach', ohne: 'sonst' })).join('');
    const ohneUrteil = sp.v3.filter((z) => !hatUrteil(z.vergleich));
    teile.push(`<p class="feld-name">Nach mindestens mittel verspanntem Vortag: Kopfschmerz in 24 Stunden</p>
      ${funde ? `<ul class="funde">${funde}</ul>` : ''}
      ${ohneUrteil.length ? `<ul class="wartend">${ohneUrteil.map((z) => zeile(z.name,
    `${mehrzahl(z.vergleich.mit.n, 'Tag', 'Tage')} damit, ${z.vergleich.ohne.n} ohne`)).join('')}</ul>` : ''}
      ${kleinSaetze(ohneUrteil.filter((z) => z.vergleich.genug).map((z) => z.satz))}
      <p class="klein">${esc(GEGENMITTEL_VORBEHALT)}</p>`);
  }

  /* R7: am selben Tag */
  const g = sp.gleichzeitig;
  const zahlen = [
    g.nacken.an.n >= 4 && g.nacken.sonst.n >= 4
      ? zeile('Nacken/Schultern an Kopfschmerztagen', `${fmtZahl(g.nacken.an.schnitt)}, sonst ${fmtZahl(g.nacken.sonst.schnitt)}`)
      : '',
    g.gepresst.n ? zeile('Tagsüber gepresst', `an ${g.gepresst.ja} von ${mehrzahl(g.gepresst.n, 'Tag', 'Tagen')}`) : '',
    g.merkmale.kauen ? zeile('Kopfschmerz schlimmer beim Kauen', `${g.merkmale.kauen}×`) : '',
    g.merkmale.nackenbewegung ? zeile('Kopfschmerz schlimmer bei Kopf- oder Nackenbewegung', `${g.merkmale.nackenbewegung}×`) : '',
    g.merkmale.schlaefe ? zeile('Kopfschmerz an Schläfe oder Kiefer', `${g.merkmale.schlaefe}×`) : '',
  ].filter(Boolean);
  if (zahlen.length) {
    teile.push(`<p class="feld-name">Am selben Tag – nur gezählt</p>
      <ul class="wartend">${zahlen.join('')}</ul>
      <p class="klein">Gleichzeitig heißt nicht: das eine kommt vom anderen.</p>`);
  }

  const fragen = sp.fragen.slice(0, 2);
  return `<div class="karte karte-spannung">
    <h3>Kiefer, Nacken, Schiene</h3>
    ${teile.length ? teile.join('') : '<p class="klein">Bisher ist dazu nichts eingetragen. Gefragt wird auf „Tag“ unter „Wie war der Tag sonst?“.</p>'}
    ${fragen.length ? `<p class="feld-name">Fragen für die Sprechstunde</p>
    <ul class="belege">${fragen.map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>` : ''}
    <p class="klein">Body Check bestätigt oder widerlegt keine ärztliche oder zahnärztliche Einschätzung – es
    zählt, ob Kopfschmerz mit diesen Dingen zusammen öfter oder seltener kommt.</p>
  </div>`;
}

/** Der Stuhlgang in Zahlen, sobald überhaupt etwas eingetragen ist. */
function stuhlTeil(s) {
  const z = stuhlZahlen(s.eintraege, s.tage);
  if (!z.gesamt) return '';
  const anteil = (n) => (z.gesamt ? `${Math.round((n / z.gesamt) * 100)} %` : '–');
  // Nur mit genug Fällen auf beiden Seiten, sonst steht hier gar nichts – ein
  // „noch nicht" zum Wasser wäre eine Aufforderung, und die gibt es hier nicht.
  const wasser = wasserSatz(wasserVergleich(s.eintraege, s.tage));
  return `<div class="karte karte-stuhl">
    <h3>Stuhlgang</h3>
    <ul class="wartend">
      <li><span>Eingetragen</span><span class="klein">${mehrzahl(z.gesamt, 'Mal', 'Mal')},
        ${fmtZahl(z.proTag)} je notiertem Tag</span></li>
      <li><span>Hart (Typ 1–2)</span><span class="klein">${z.hart}× · ${anteil(z.hart)}</span></li>
      <li><span>Unauffällig (3–5)</span><span class="klein">${z.normal}× · ${anteil(z.normal)}</span></li>
      <li><span>Weich (6–7)</span><span class="klein">${z.weich}× · ${anteil(z.weich)}</span></li>
      ${z.dringend ? `<li><span>Musste dringend</span><span class="klein">${z.dringend}×</span></li>` : ''}
      ${z.unvollstaendig ? `<li><span>Gefühl, nicht fertig</span><span class="klein">${z.unvollstaendig}×</span></li>` : ''}
    </ul>
    ${wasser ? `<p class="klein wasser-hinweis"><span aria-hidden="true">💧</span> ${esc(wasser)}
      Gezählt am selben Tag – das zeigt, was zusammen vorkam, nicht woran es liegt.</p>` : ''}
  </div>`;
}

/**
 * Kopfschmerzen – getrennt vom Bauch gerechnet, siehe js/kopf.js.
 *
 * Die Karte steht bei Stuhlgang und Zyklus, nicht bei den Auslösern: Sie ist
 * eine Zählung, keine Bilanz. Was sie mit dem Bauch verbindet, ist das
 * Schmerzmittel – und der Satz dazu kommt nur, wenn die Fallzahl ihn trägt.
 */
/**
 * Gestern Kopfschmerz – wie lange ging es, wie ging der Tag weiter?
 *
 * Die Dauer kennt man erst hinterher, und ohne Erinnerung bleibt das Feld
 * leer. Ein Tipp hier trägt es nach, ohne den Bogen zu öffnen. Nur für
 * gestern und nur für das, was fehlt – eine Karte, die jeden Tag dasteht,
 * wird überlesen. „Weiß ich nicht mehr" ist eine zulässige Antwort: Sie
 * schließt die Frage, ohne gezählt zu werden.
 */
function kopfNachtragKarte(s, iso) {
  if (iso !== heuteISO()) return '';
  const gestern = plusTage(iso, -1);
  const offen = s.eintraege.filter((e) => e.art === 'kopf' && e.am === gestern
    && Number(e.staerke) >= 1 && (!e.dauer || !e.verlauf));
  if (!offen.length) return '';
  const e = offen[offen.length - 1];
  const knoepfe = (liste, feld, klasse = '') => `<div class="wahl${klasse}">${liste.map((x) => `
    <button type="button" class="wahl-btn" data-act="kopf-nachtrag" data-id="${e.id}"
            data-feld="${feld}" data-wert="${x.id}">${esc(x.name)}</button>`).join('')}
    <button type="button" class="wahl-btn btn-ghost" data-act="kopf-nachtrag" data-id="${e.id}"
            data-feld="${feld}" data-wert="${UNBEKANNT}">Weiß ich nicht mehr</button></div>`;
  return `<div class="karte karte-nachtrag">
    <h3>Gestern: Kopfschmerz ${e.staerke}</h3>
    ${!e.dauer ? `<p class="feld-name">Wie lange ging es – mit oder ohne Mittel?</p>
    ${knoepfe(KOPF_DAUER, 'dauer', ' wahl-vier')}` : ''}
    ${!e.verlauf ? `<p class="feld-name">Wie ging der Tag weiter?</p>
    ${knoepfe(KOPF_VERLAUF, 'verlauf', ' wahl-spalte')}` : ''}
  </div>`;
}

/**
 * Kopfschmerzen – getrennt vom Bauch gerechnet, siehe js/kopf.js.
 *
 * Oben die Zahlen, nach denen die Sprechstunde fragt – Kopfschmerztage und
 * Akutmittel-Tage je 30-Tage-Fenster, Stärke und Dauer, Merkmale –, dann die
 * lauten Sätze, dann die Vergleiche. Alles, was verglichen wurde und nichts
 * hergab, steht in einer kleinen Zeile; die App sagt „noch nicht" einmal,
 * nicht dreimal.
 */
function kopfTeil(s, d) {
  const z = kopfZahlen(s.eintraege, s.tage, d.heute);
  if (!z.anzahl) return '';
  const m = kopfMittel(s.eintraege, d.gruppeVon, d.heute);
  const befundIds = (s.befunde || []).map((b) => b.id);
  const nach = m.nsarTage.length
    ? nsarNachwirkung(s.eintraege, s.tage, m.nsarTage, m.kopfTageOhneNsar, tagesWert) : null;
  const bauch = bauchAnKopfTagen(s.eintraege, s.tage, tagesWert);
  const umstaende = kopfUmstaende(s.eintraege, s.tage, faktorBilanz, zufallsSpielraum);
  const periode = kopfUmPeriode(s.eintraege, s.tage, d.heute);
  const monate = kopfMonate(s.eintraege, s.tage, d.gruppeVon, d.heute);
  // Die Aufwach-Frage wie im Bericht – Muster und Zettel fragen dasselbe.
  const fragen = kopfFragen({
    zahlen: z, mittel: m, befundIds, aufwach: aufwachZahlen(s.eintraege, s.tage, d.heute), spannungAn: s.spannungAn,
  });
  const phasen = kopfNachPhase(s.eintraege, s.tage);
  const saetze = [
    { text: statusSatz(z, d.heute), laut: true },
    { text: uebergebrauchSatz(m), laut: m.uebergebrauchBestaetigt },
    { text: chronischSatz(z), laut: z.chronischVerdacht },
    { text: nachwirkungSatz(nach, fmtZahl), laut: true },
    { text: umPeriodeSatz(periode), laut: periode.genug && periode.mit * 3 >= periode.zyklen * 2 },
    ...umstaendeSaetze(umstaende).map((t) => ({ text: t, laut: true })),
    { text: bauchAnKopfTagenSatz(bauch, fmtZahl), laut: false },
    { text: unauffaelligeVergleiche({ nach, bauch, umstaende }), laut: false },
  ].filter((x) => x.text);
  const klein = (name) => `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
  const meist = z.arten.slice(0, 3).map((a) => `${klein(a.name)} (${a.anzahl}×)`).join(', ');
  const dauer = z.dauern.length
    ? [...z.dauern].sort((a, b) => b.anzahl - a.anzahl).slice(0, 2)
      .map((x) => `${x.name} (${x.anzahl}×)`).join(', ')
    : '';
  const w = z.wirkung;
  const wirkung = (w.weg + w.besser + w.nicht)
    ? [w.weg ? `weg ${w.weg}×` : '', w.besser ? `besser ${w.besser}×` : '', w.nicht ? `nicht ${w.nicht}×` : '']
      .filter(Boolean).join(', ')
    : '';
  const akutZeile = m.fenster.length && m.fenster.some((f) => f.akut)
    ? `${m.fenster[0].akut}${sortenText(m.fenster[0]) ? ` (${sortenText(m.fenster[0])})` : ''} · davor ${m.fenster[1].akut} · davor ${m.fenster[2].akut}`
    : '';
  const kopfZeile = z.fenster.length
    ? `${z.fenster[0].kopfTage} (${z.fenster[0].notiert} notiert) · davor ${z.fenster[1].kopfTage} · davor ${z.fenster[2].kopfTage}`
    : '';
  // Kombinationsmittel stehen für sich, wie in den Fenstern (sortenText): eines
  // mit ASS zugleich unter „entzündungshemmend", eines mit Paracetamol nur hier.
  const sortenAmTag = [
    m.mitNsar ? `${m.mitNsar} entzündungshemmend` : '',
    m.mitKombi ? `${m.mitKombi} Kombinationsmittel` : '',
    m.mitTriptan ? `${m.mitTriptan} Triptan` : '',
    m.mitNichtNsar ? `${m.mitNichtNsar} ohne Entzündungshemmung` : '',
    m.mitOpioid ? `${m.mitOpioid} Opioid` : '',
    m.mitGepant ? `${m.mitGepant} Gepant` : '',
  ].filter(Boolean).join(', ');
  const amSelbenTag = m.mitAkut
    ? `an ${m.mitAkut} von ${mehrzahl(m.kopfTage, 'Tag', 'Tagen')}${sortenAmTag ? ` (${sortenAmTag})` : ''}`
    : '';
  const zeile = (name, wert) => `<li><span>${name}</span><span class="klein">${wert}</span></li>`;
  return `<div class="karte karte-kopf">
    <h3>Kopfschmerzen</h3>
    <ul class="wartend">
      ${kopfZeile ? zeile('Kopfschmerztage je 30 Tage', kopfZeile) : zeile('Kopfschmerztage', String(z.tage))}
      ${akutZeile ? zeile('Akutmittel-Tage je 30 Tage', esc(akutZeile)) : ''}
      ${zeile('Stärke', `im Mittel ${fmtZahl(z.schnitt)}, höchstens ${z.hoechster}`)}
      ${dauer ? zeile('Dauer', esc(dauer)) : ''}
      ${(z.verlauf.ausgefallen || z.verlauf.eingeschraenkt) ? zeile(`Ausgefallen${z.verlauf.zeitraum ? ', letzte 90 Tage' : ''}`,
    `${mehrzahl(z.verlauf.ausgefallen, 'Tag', 'Tage')}${z.verlauf.eingeschraenkt ? `, dazu ${z.verlauf.eingeschraenkt} eingeschränkt` : ''}`) : ''}
      ${meist ? zeile('Meist', esc(meist)) : ''}
      ${wirkung ? zeile('Mittel nach zwei Stunden', esc(wirkung)) : ''}
      ${amSelbenTag ? zeile('Akutmittel am selben Tag', esc(amSelbenTag)) : ''}
    </ul>
    ${m.unbekannt.length ? `<p class="klein">An Kopfschmerztagen eingetragen, aber nicht als Akutmittel erkannt:
      ${esc(m.unbekannt.map((u) => `${u.name} (${mehrzahl(u.tage, 'Tag', 'Tage')})`).join(', '))}.
      Ist das ein Schmerz- oder Migränemittel, hilft meist der Wirkstoffname – dann
      zählt es mit. Kennt die App den Wirkstoff nicht, zählt es nicht; dann gehört
      es in der Sprechstunde dazugesagt.</p>` : ''}
    ${saetze.map((x) => `<p${x.laut ? '' : ' class="klein"'}>${esc(x.text)}</p>`).join('')}
    ${monate.length ? `<p class="feld-name">Die letzten drei Monate</p>
    <ul class="wartend">${monate.map((mo) => `<li>
      <span>${esc(mo.name)}${mo.angefangen ? ' (bis heute)' : ''}</span>
      <span class="klein">${mehrzahl(mo.kopfTage, 'Kopfschmerztag', 'Kopfschmerztage')}${mo.akut ? `, Akutmittel an ${mo.akut}${mo.triptan ? ` (Triptan ${mo.triptan})` : ''}` : ''}${mo.ausgefallen ? `, ${mo.ausgefallen} ausgefallen` : ''}${mo.blutung ? `, Periode ${mo.blutung}` : ''}</span>
    </li>`).join('')}</ul>` : ''}
    ${fragen.length ? `<p class="feld-name">Fragen für die Sprechstunde</p>
    <ul class="belege">${fragen.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${phasen.length > 1 ? `<p class="feld-name">Nach Zyklusphase</p>
    <ul class="wartend">${phasen.map((p) => `<li>
      <span>${esc(p.name)}</span>
      <span class="klein">an ${p.mit} von ${mehrzahl(p.tage, 'Tag', 'Tagen')}</span>
    </li>`).join('')}</ul>
    <p class="klein">Phasen geschätzt aus den eingetragenen Blutungstagen.</p>` : ''}
    <p class="klein">Der Kopf wird getrennt vom Bauch gezählt: Kein Kopfschmerz
    fließt in eine Bauchauswertung ein. Die Bauchwerte hier stehen nur zum
    Vergleich daneben. Verbinden können beide die Schmerzmittel: Bei
    entzündungshemmenden wie Ibuprofen nennt die Fachinformation
    Magen-Darm-Beschwerden als häufige Nebenwirkung – deshalb stehen sie dabei.
    Auch eine Migräne selbst kann mit Übelkeit oder Erbrechen einhergehen.</p>
  </div>`;
  /*
   * Quellen zum letzten Absatz: IBU-ratiopharm 400 mg akut,
   * www.fachinfo.de/fi/pdf/014937, Stand Juni 2026, 4.8: „Die am häufigsten
   * beobachteten Nebenwirkungen betreffen den Verdauungstrakt" und „Häufig:
   * Gastrointestinale Beschwerden wie Sodbrennen, Bauchschmerzen, Übelkeit,
   * Erbrechen …". ICHD-3 1.1 (ichd-3.org), Kriterium D: „During headache at
   * least one of the following: nausea and/or vomiting; photophobia and
   * phonophobia". Bis zur Fassung 29 hieß es „Was beide verbindet, ist das
   * Schmerzmittel" – als einzige Verbindung, und für jedes Akutmittel.
   */
}

/* ==================== Reiter: Ruhe ==================== */

function ruheAnsicht(s) {
  const u = uebungVon(s.atemUebung);
  const runden = s.atemRunden || u.runden;
  const laeuft = !!ui.atem;

  // Während die Übung läuft, steht auf dem Bildschirm nichts als der Kreis und
  // der Abbruchknopf: Wer die Augen zumacht, braucht keine Auswahl, und wer sie
  // aufmacht, soll nicht auf Einstellungen schauen.
  const wahl = `<div class="karte">
    <h3>Übung</h3>
    <div class="wahl">${UEBUNGEN.map((x) => `
      <button type="button" class="wahl-btn${x.id === u.id ? ' an' : ''}"
              data-act="atem-uebung" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
    <p class="feld-name">${esc(u.zweck)}</p>
    <p class="klein">${esc(u.beschreibung)}</p>
    <p class="feld-name">Runden – etwa ${dauerText(gesamtDauer(u, runden))}</p>
    <div class="wahl">${[2, 4, 6, 8, 10, 15].map((n) => `
      <button type="button" class="wahl-btn${runden === n ? ' an' : ''}"
              data-act="atem-runden" data-n="${n}">${n}</button>`).join('')}</div>
  </div>`;

  /*
   * Ob der Bildschirm anbleibt, steht dabei – und zwar als Tatsache und nicht
   * als Versprechen. Die Sperre ist eine Bitte ans Betriebssystem, die im
   * Stromsparmodus oder bei wenig Akku abgelehnt wird. „Du kannst das Handy
   * weglegen" zu behaupten, wo es gleich abschaltet, wäre schlimmer als nichts
   * zu sagen: Man macht die Augen zu und wundert sich hinterher.
   */
  const wachZeile = laeuft
    ? (ui.atem.wach
      ? '<p class="klein">Der Bildschirm bleibt an, solange die Übung läuft – '
        + 'du kannst das Telefon weglegen und die Augen zumachen.</p>'
      : '<p class="klein">Der Bildschirm lässt sich hier nicht anhalten '
        + '(Stromsparmodus oder ein Browser ohne diese Möglichkeit). Schaltet '
        + 'er ab, hält die Übung an – dann lieber kurz wach halten.</p>')
    : '';

  const kreis = `<div class="atem${laeuft ? ' laeuft' : ''}">
    <div class="atem-kreis" id="atemKreis"><span id="atemZahl">${laeuft ? '' : '·'}</span></div>
    <p class="atem-wort" id="atemWort">${laeuft ? '' : 'Bereit, wenn du bist'}</p>
    <p class="klein" id="atemRunde">${laeuft ? '' : `${runden} Runden, ${esc(u.name)}`}</p>
    ${wachZeile}
  </div>`;

  return `
  <h2>Ruhe</h2>
  <p class="klein">Langes Ausatmen schaltet auf den Teil des Nervensystems um,
  unter dem der Darm arbeitet statt stillzustehen. Bei Beschwerden, die an
  Anspannung hängen, ist das eine Behandlung und keine Beschäftigung.</p>

  ${kreis}

  <div class="karte">
    <div class="reihe">
      ${laeuft
    ? knopf('atem-stopp', 'Abbrechen', 'btn-block')
    : knopf('atem-start', 'Anfangen', 'btn-primary btn-block')}
    </div>
    <p class="klein" style="margin-top:10px">Der Ton sagt dir, was dran ist:
    aufwärts einatmen, ein kurzer Ton halten, abwärts ausatmen. Damit kannst du
    die Augen zumachen und das Handy weglegen.
    ${s.ton ? '' : '<b>Der Ton ist gerade aus – unter „Mehr" wieder an.</b>'}</p>
  </div>

  ${laeuft ? '' : wahl}`;
}

/* ---------- Der Ablauf ---------- */

function atemZeigen(schritt, restSek) {
  const zahl = document.getElementById('atemZahl');
  const wort = document.getElementById('atemWort');
  const runde = document.getElementById('atemRunde');
  const kreis = document.getElementById('atemKreis');
  if (!zahl || !kreis) return;
  zahl.textContent = String(Math.max(1, Math.ceil(restSek)));
  wort.textContent = schritt.wort;
  runde.textContent = `Runde ${schritt.runde} von ${schritt.von}`;
  // Der Kreis wächst über die Dauer der Phase mit. Beim Halten bleibt er,
  // wo er ist – deshalb wird die Größe nur bei ein und aus gesetzt.
  kreis.style.transitionDuration = `${schritt.sek}s`;
  if (schritt.art === 'ein') kreis.style.transform = 'scale(1)';
  else if (schritt.art === 'aus') kreis.style.transform = 'scale(0.45)';
  kreis.dataset.art = schritt.art;
}

function atemSchritt() {
  const a = ui.atem;
  if (!a) return;
  if (a.i >= a.schritte.length) { atemFertig(); return; }
  const schritt = a.schritte[a.i];
  a.bisMs = Date.now() + schritt.sek * 1000;
  if (a.ton) {
    if (schritt.art === 'ein') KLAENGE.ein();
    else if (schritt.art === 'aus') KLAENGE.aus();
    else KLAENGE.halten();
  }
  ruettel(schritt.art === 'halten' ? 30 : 60);
  atemZeigen(schritt, schritt.sek);
  a.wecker = setTimeout(() => { a.i += 1; atemSchritt(); }, schritt.sek * 1000);
}

function atemFertig() {
  const a = ui.atem;
  if (a && a.ton) KLAENGE.fertig();
  ruettel([60, 80, 60]);
  atemStopp();
  melden('Geschafft.');
}

function atemStart(s) {
  const u = uebungVon(s.atemUebung);
  const runden = s.atemRunden || u.runden;
  // Der Tonkontext darf erst hier entstehen: Browser lassen Audio nur nach
  // einer Nutzergeste zu, und "Anfangen" ist diese Geste.
  const ton = s.ton !== false && weckKlang();
  ui.atem = {
    schritte: ablauf(u, runden), i: 0, ton, wecker: null, uhr: null, wach: false,
  };
  /*
   * Den Bildschirm anlassen – dieselbe Geste, dieselbe Gelegenheit.
   *
   * Ohne das schaltet das Telefon nach einer halben Minute ab und friert
   * damit die Zeitgeber dieser Seite ein: Der nächste Ton käme zu spät oder
   * gar nicht, und die Übung stünde mitten im Ausatmen still. Es ist eine
   * Bitte und keine Garantie, deshalb wird das Ergebnis gemerkt und angezeigt
   * statt angenommen.
   */
  wachHalten().then((ok) => {
    if (ui.atem) { ui.atem.wach = ok; zeichne(); }
  });
  zeichne();
  // Erst zeichnen, dann anfangen – sonst greift der erste Schritt auf Elemente
  // zu, die es noch nicht gibt.
  queueMicrotask(() => {
    if (!ui.atem) return;
    ui.atem.uhr = setInterval(() => {
      const a = ui.atem;
      if (!a || a.i >= a.schritte.length) return;
      atemZeigen(a.schritte[a.i], (a.bisMs - Date.now()) / 1000);
    }, 200);
    atemSchritt();
  });
}

function atemStopp() {
  if (!ui.atem) return;
  clearTimeout(ui.atem.wecker);
  clearInterval(ui.atem.uhr);
  ui.atem = null;
  // An jedem Ende, auch beim Abbrechen: Eine Sperre, die stehen bleibt, hält
  // den Bildschirm an, bis der Akku leer ist.
  wachLoslassen();
  zeichne();
}

/*
 * Zurück aus dem Hintergrund: die Sperre neu erbitten.
 *
 * Das Betriebssystem nimmt sie weg, sobald die Seite verdeckt wird, und gibt
 * sie nicht von allein zurück. Wer hier nicht neu bittet, hat sie still
 * verloren – die App hielte sich für wach und wäre es nicht.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !ui.atem) return;
  wachHalten().then((ok) => {
    if (ui.atem && ui.atem.wach !== ok) { ui.atem.wach = ok; zeichne(); }
  });
});

/* ==================== Reiter: Ideen ==================== */

/** Die Ideen als Text – zum Kopieren oder Weitergeben. */
function ideenText(s) {
  const zeile = (i) => `${i.erledigt ? '[erledigt] ' : ''}${i.text}`;
  return ['Body Check – Ideen und Verbesserungsvorschläge', '']
    .concat(s.ideen.map(zeile)).join('\n');
}

/*
 * Vorschläge gehen hinaus, sobald einer eingetragen ist.
 *
 * ZWEI FEHLER, DIE ERST ZUSAMMEN AUFFIELEN
 *
 * Hier stand eine Bedenkzeit von einer Minute: Zeit, einen Tippfehler
 * auszubessern oder eine Idee zurückzunehmen, bevor sie draußen ist. Gut
 * gemeint, und in der Praxis eine Falle. Die Minute lief als Zeitgeber in
 * der offenen Seite – wer eintippte und die App zumachte, verschickte nie
 * etwas, und beim nächsten Öffnen fing sie von vorn an. Angestoßen wurde
 * obendrein nur beim Zeichnen des Ideenreiters; wer die App aufmachte und
 * auf dem Tagesbogen landete, stieß gar nicht an. Ein Vorschlag ging also
 * nur dann hinaus, wenn jemand nach dem Eintippen noch eine Minute auf
 * diesem Reiter stehen blieb. Das tut niemand.
 *
 * Die Bedenkzeit ist deshalb weg. Wer auf „Eintragen" tippt, hat entschieden;
 * das ist der Knopfdruck, auf den es ankommt. Zurücknehmen geht weiter – die
 * Idee lässt sich löschen, und der Kasten hat einen Weg dafür.
 *
 * Was unverändert gilt: kein Dienst im Hintergrund, keine Warteschlange, die
 * später doch noch sendet. Zwischen Zumachen und Wiederöffnen passiert
 * nichts. Geht es schief, wird nicht in einer Schleife weiter probiert – der
 * nächste Anlass (eine Änderung, ein Start, ein Blick auf den Reiter) nimmt
 * einen neuen Anlauf.
 *
 * UND DER FEHLER WIRD NICHT MEHR VERSCHLUCKT
 *
 * Hier stand einmal ein leeres `catch`, mit der Begründung, in der Anzeige
 * stehe ohnehin, dass etwas offen sei. Das stimmte und half niemandem: Ob
 * gerade gar nicht gesendet wird oder ob der Kasten die Annahme verweigert,
 * sind zwei völlig verschiedene Lagen, und die App sagte beide Male
 * dasselbe. Einen Abend Fehlersuche später steht der Grund jetzt da, wo er
 * hingehört – auf dem Reiter, bei der Idee, für den, der etwas ändern kann.
 */
let sendeUhr = null;
// Der laufende Durchgang, solange einer läuft. Wer währenddessen „Jetzt
// gleich" tippt, wartet auf ihn, statt einen zweiten zu starten – und statt
// „Angekommen" zu hören, bevor irgendetwas angekommen ist.
let durchgang = null;

/*
 * JEDE IDEE EINZELN
 *
 * Bis zum 28.10.2026 ging bei jedem Versand die ganze Liste hinaus, samt
 * Überschrift und erledigten Ideen. Zwei Folgen: Tobi bekam jede Idee so oft
 * zu lesen, wie danach noch welche kamen, und sobald die Liste 2000 Zeichen
 * überschritt, lehnte der Kasten sie ab – für immer, denn die Liste wird nur
 * länger. Jetzt geht jede Idee genau einmal, als eigener Zettel.
 *
 * Gibt es mehrere, gehen sie nacheinander, die älteste zuerst. Scheitert
 * eine, hört der Durchgang auf; der Grund steht auf dem Reiter, und der
 * nächste Anlass macht dort weiter.
 *
 * Nach jeder Idee wird neu nachgesehen, was noch offen ist – nicht einmal am
 * Anfang eine Liste gezogen. Sonst bliebe eine Idee liegen, die eingetragen
 * wird, während eine ältere noch unterwegs ist, und eine, die unterwegs
 * gelöscht wurde, ginge trotzdem hinaus.
 *
 * @returns {Promise<{ geschickt: number, fehler: string|null }>}
 */
function ideenVerschicken() {
  if (durchgang) return durchgang;
  durchgang = (async () => {
    beschaeftigt += 1;
    let geschickt = 0;
    let fehler = null;
    const unterwegs = new Set();
    try {
      for (;;) {
        const idee = store.ideenUnterwegs()[0];
        // Dieselbe Idee ein zweites Mal hieße: Das Abhaken hat nicht
        // gegriffen. Dann lieber aufhören als den Kasten zu fluten.
        if (!idee || unterwegs.has(idee.id)) break;
        unterwegs.add(idee.id);
        // eslint-disable-next-line no-await-in-loop
        await schicken(idee.text);
        store.ideeGeschicktMerken(idee.id);
        geschickt += 1;
      }
    } catch (e) {
      fehler = e && e.message ? e.message : 'Ging nicht.';
      store.ideenFehlerMerken(fehler);
    } finally {
      beschaeftigt -= 1;
    }
    return { geschickt, fehler };
  })().finally(() => { durchgang = null; });
  return durchgang;
}

function sendenAnstossen() {
  clearTimeout(sendeUhr);
  if (!store.ideenOffen() || durchgang) return;

  /*
   * Ein Sprung ans Ende der Warteschlange, keine Wartezeit: Der Anstoß kommt
   * mitten aus dem Zeichnen, und ein Netzaufruf hat da nichts zu suchen.
   *
   * Neu gezeichnet wird nur, wenn sich etwas getan hat. Hier stand ein
   * Neuzeichnen ohne Bedingung – und weil der Ideenreiter beim Zeichnen
   * selbst anstößt, lief das im Kreis: Solange ein Versand unterwegs war,
   * wurde die Seite ununterbrochen ersetzt (das Ideenfeld verlor dabei den
   * Fokus), und scheiterte er, ging der nächste Versuch sofort hinterher –
   * hunderte in der Sekunde an den Kasten.
   */
  sendeUhr = setTimeout(async () => {
    if (!store.ideenOffen() || durchgang) return;
    const { geschickt, fehler } = await ideenVerschicken();
    if (geschickt || fehler) zeichne();
  }, 0);
}

/*
 * Auf dem iPhone heißt „öffnen" meist „fortsetzen": Die App lag im
 * Hintergrund und kommt zurück, ohne neu zu starten. Der Reiter verspricht,
 * dass es dann von selbst noch einmal versucht wird – also hier, einmal je
 * Rückkehr. Ein Kreis kann daraus nicht werden: Ohne Rückkehr kein Anstoß.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') sendenAnstossen();
});

function ideenAnsicht(s) {
  /*
   * Beim Zeichnen nur anstoßen, wenn der letzte Versuch nicht gescheitert
   * ist. Sonst zeichnet der Fehlschlag neu, das Neuzeichnen stößt an, und es
   * geht im Kreis. Einen gescheiterten Versuch wiederholen der Wechsel auf
   * diesen Reiter, „Nochmal", eine geänderte Idee und der Start der App.
   */
  if (!s.ideenFehler) sendenAnstossen();
  const offen = s.ideen.filter((i) => !i.erledigt);
  const fertig = s.ideen.filter((i) => i.erledigt);

  const zeile = (i) => `<li class="idee${i.erledigt ? ' ab' : ''}">
    <button type="button" class="idee-haken" data-act="idee-haken" data-id="${i.id}"
            aria-pressed="${i.erledigt}"
            aria-label="${i.erledigt ? 'Wieder offen' : 'Als erledigt merken'}">
      ${i.erledigt ? '✓' : ''}</button>
    <span class="idee-text">${esc(i.text)}<span class="zeile-tags">${esc(fmtDatum(i.am))}</span></span>
    <button type="button" class="strang-weg" data-act="idee-weg" data-id="${i.id}"
            aria-label="Idee löschen">×</button>
  </li>`;

  /*
   * Der Hinweis, der oben stehen muss.
   *
   * Ohne ihn ist dieser Reiter eine Falle: Man tippt seine Vorschläge ein, sie
   * stehen ordentlich untereinander, und man nimmt selbstverständlich an, dass
   * sie jemanden erreichen. Sie erreichen niemanden – die App hat keinen
   * Server, das ist ihre wichtigste Eigenschaft und hier ihr Preis. Also steht
   * es dort, wo man es liest, bevor man den ersten Satz schreibt.
   */
  const nichtGeschickt = store.ideenOffen();
  /*
   * Der Grund, wenn es nicht geklappt hat – und zwar im Klartext.
   *
   * Vorher stand hier in jedem Fall „geht gleich raus", auch wenn der Kasten
   * seit Stunden ablehnte. Das ist die schlimmere Art von Falschauskunft:
   * beruhigend und falsch. Wer den Grund sieht, kann etwas tun – ein anderes
   * Netz nehmen, den Text kürzen, oder ihn eben anders schicken.
   */
  const versand = nichtGeschickt ? `<div class="karte karte-merk">
    <h3>${s.ideenFehler
    ? `${mehrzahl(nichtGeschickt, 'Idee ist', 'Ideen sind')} nicht rausgegangen`
    : `${mehrzahl(nichtGeschickt, 'Idee geht', 'Ideen gehen')} raus`}</h3>
    ${s.ideenFehler
    ? `<p class="klein"><b>${esc(s.ideenFehler)}</b></p>
       <p class="klein">Der Text steht weiter da und ist nicht verloren. Beim
       nächsten Öffnen versucht die App es von selbst noch einmal; du kannst
       auch gleich „Nochmal" antippen oder ihn anders schicken.</p>`
    : `<p class="klein">${nichtGeschickt === 1 ? 'Sie geht' : 'Sie gehen'}
       von selbst an Tobi, du musst nichts antippen. Danach hier zu löschen
       nimmt sie aus deiner Liste, aber nicht mehr aus seinem Kasten – dafür
       müsstest du ihm Bescheid sagen.</p>`}
    <div class="reihe">
      ${knopf('ideen-senden', s.ideenFehler ? 'Nochmal' : 'Jetzt gleich', 'btn-primary')}
      ${knopf('ideen-teilen', 'Anders schicken')}
      ${knopf('ideen-kopieren', 'Kopieren')}
    </div>
  </div>` : '';

  return `
  <h2>Ideen für Body Check</h2>
  <p class="klein">Was fehlt, was stört, was du anders hättest. <b>Was du hier
  einträgst, geht automatisch an Tobi</b>, sobald du auf „Eintragen" tippst.</p>
  <p class="klein">Es gehen <b>nur deine Ideen</b> raus, jede einzeln, sonst
  nichts. Beschwerden, Mahlzeiten, Medikamente und alles andere aus deinem
  Tagebuch bleiben auf diesem Gerät. Lesen kann sie nur Tobi.</p>

  ${versand}

  <div class="karte">
    <label class="feld-name" for="ideeText">Neue Idee</label>
    <textarea class="feld feld-breit" id="ideeText" rows="3" maxlength="2000"
              data-act="idee-entwurf" placeholder="Ich hätte gern …">${esc(ui.ideeEntwurf)}</textarea>
    <div class="reihe" style="margin-top:8px">
      ${knopf('idee-neu', 'Eintragen', 'btn-primary')}
    </div>
  </div>

  ${s.ideen.length ? `
    <ul class="ideen">${offen.map(zeile).join('')}${fertig.map(zeile).join('')}</ul>
    <div class="karte">
      <p class="klein">${mehrzahl(offen.length, 'offene Idee', 'offene Ideen')}${fertig.length ? `, ${fertig.length} erledigt` : ''}.
      ${nichtGeschickt ? `Davon ${mehrzahl(nichtGeschickt, 'noch unterwegs', 'noch unterwegs')}.`
    : 'Alle bei Tobi angekommen.'}</p>
      <div class="reihe">
        ${nichtGeschickt ? knopf('ideen-senden', 'Jetzt gleich', 'btn-primary') : ''}
        ${knopf('ideen-teilen', 'Anders schicken')}
        ${knopf('ideen-kopieren', 'Alle kopieren')}
      </div>
    </div>`
    : '<p class="leer">Noch keine Idee eingetragen.</p>'}`;
}

/**
 * Warnzeichen und die Einordnung – das, was am nächsten an eine Diagnose
 * herankommt, ohne eine zu sein.
 */
/**
 * Die Frühphase: ein Ziel statt zehnmal „noch nicht".
 *
 * Solange nichts auswertbar ist, sagten zehn Karten dasselbe. Jede für sich
 * richtig, zusammen eine Wand – und zwar genau in den Wochen, in denen sich
 * entscheidet, ob überhaupt weiter eingetragen wird. Hier steht dieselbe
 * Auskunft einmal, in die andere Richtung formuliert: nicht „dafür reicht es
 * nicht", sondern „dafür fehlen noch vier Tage".
 */
function fortschrittTeil(s, d) {
  const f = freischaltung({
    notierteTage: tageMitEintrag(s, d.heute),
    beschwerden: d.bild.basis.beschwerden,
    zuordenbar: d.bild.basis.zuordenbar,
    mahlzeiten: s.eintraege.filter((e) => e.art === 'essen').length,
    mindestFaelle: s.mindestFaelle,
    naechsteBilanz: naechsteBilanzZeile(s, d),
  });
  const naechst = naechsteSchwelle(f.schritte);

  return `<div class="karte karte-merk">
    <h3>Was als Nächstes dazukommt</h3>
    ${naechst ? `<p><b>${esc(naechst.satz)}</b></p>` : ''}
    <ul class="wartend fortschritt">${f.schritte.map((x) => `<li class="fs-${x.offen ? 'offen' : 'da'}">
      <span><b>${esc(x.titel)}</b><span class="zeile-tags">${esc(x.was)}</span></span>
      <span class="klein">${x.offen ? esc(x.stand) : 'steht unten'}</span>
    </li>`).join('')}</ul>
    <p class="klein">Das sind keine Punkte zum Sammeln, sondern die Fallzahlen,
    die eine Aussage braucht. Was hier noch fehlt, fehlt wirklich – eine App,
    die aus vier Tagen einen Auslöser macht, schickt dich hinterher auf eine
    Streichliste, die niemandem hilft. Zwei bis drei Wochen ist der ehrliche
    Preis, und danach steht hier deutlich mehr.</p>
    <p class="klein">Warnzeichen sind davon ausgenommen: Die stehen ab dem
    ersten Tag ganz oben, ohne Schwelle.</p>
  </div>`;
}

/** Der Auslöser, der der ersten Bilanz am nächsten ist – oder nichts. */
function naechsteBilanzZeile(s, d) {
  const offen = (d.bilanz || []).filter((b) => !b.genug)
    .sort((a, b) => (b.faelle + b.gegenFaelle) - (a.faelle + a.gegenFaelle))[0];
  if (!offen) return null;
  return {
    name: ausloeserName(offen.id, s.eigeneAusloeser),
    faelle: offen.faelle,
    gegen: offen.gegenFaelle,
  };
}

/*
 * Die Warnzeichen für sich, damit sie nirgends mitgeschluckt werden.
 *
 * Sie standen bisher als lokale Variable in bildTeil. Seit der Muster-Reiter in
 * der Frühphase eine kurze Fassung zeigt, braucht auch die sie – und zwar
 * unverändert. Ein Warnzeichen hat keine Fallzahl und keine Schwelle: Ein
 * einziges Mal Blut ist ein einziges Mal zu viel, ganz gleich, ob das Tagebuch
 * seit fünf Tagen oder seit fünf Monaten läuft.
 */
function warnTeil(d) {
  const b = d.bild;
  if (!b.warnungen.length) return '';
  return `<div class="karte karte-warn">
    <h3>${b.warnungen.some((w) => w.dringlichkeit === 'sofort')
    ? 'Das gehört heute abgeklärt' : 'Das gehört zeitnah abgeklärt'}</h3>
    <ul class="warnliste">${b.warnungen.map((w) => `<li class="w-${w.dringlichkeit}">
      <b>${esc(w.name)}</b>
      <span class="zeile-tags">${esc(w.warum)}</span>
      <span class="klein">${mehrzahl(w.anzahl, 'Mal', 'Mal')} eingetragen,
        zuletzt ${esc(fmtDatum(w.zuletzt, true))}</span>
    </li>`).join('')}</ul>
    <p class="klein">Bei erbrochenem Blut, schwarzem, klebrigem Stuhl, Schmerz,
    der in Arm, Kiefer oder Rücken ausstrahlt, mit Luftnot oder kaltem Schweiß,
    einem Kopfschmerz, der schlagartig so stark war wie nie, Kopfschmerz mit
    Fieber und steifem Nacken oder einer plötzlichen Lähmung, Taubheit einer
    Körperseite, Sprachstörung, einem Sehverlust oder Verwirrtheit nicht auf
    einen Termin warten – Notaufnahme oder 112.</p>
  </div>`;
  /*
   * Der Satz nennt genau die Warnzeichen der Stufe „sofort" aus js/bild.js
   * (bluterbrechen, teerstuhl, ausstrahlung, donnerschlag, kopfausfall,
   * kopfnacken) und sagt dazu dasselbe wie dort und wie js/lage.js. Bis zur
   * Fassung 29 stand „Bei Blut" – das schloss frisches Blut im Stuhl ein, das
   * in bild.js „zeitnah" ist –, und der Kopfschmerz mit Fieber und steifem
   * Nacken fehlte.
   *
   * Belege, je Zeichen:
   *   * Ausstrahlender Schmerz: gesund.bund.de, Herzinfarkt (Stand
   *     28.08.2020): Schmerzen, die „von der Brust in einen Arm, den Rücken,
   *     den Hals oder den Oberbauch ausstrahlen", „Blässe und kalten Schweiß";
   *     „sollten die Betroffenen deshalb immer den Notruf 112 wählen".
   *   * Lähmung, Sprache, Sehen: Schlaganfall (Stand 16.12.2022): „schnell den
   *     Notruf 112 zu wählen"; Notaufnahme (Stand 31.01.2025): „Plötzlich
   *     einsetzende Sprach- und Sehstörungen", „Plötzlich aufgetretene
   *     Lähmungen".
   *   * Schlagartiger Kopfschmerz: Hirnaneurysma (Stand 13.05.2026):
   *     „plötzliche, sehr starke Kopfschmerzen" als Anzeichen einer
   *     Subarachnoidalblutung, „ein lebensbedrohlicher Notfall".
   *   * Fieber, Kopfschmerz, steifer Nacken: Meningitis (Stand 10.01.2025):
   *     „sollte man sofort ein Krankenhaus aufsuchen"; dort auch „benommen
   *     oder verwirrt".
   *   * Erbrochenes Blut, schwarzer Stuhl: PANTOZOL Control,
   *     EMA-Produktinformation, Gebrauchsinformation Abschnitt 2: „Informieren
   *     Sie sofort Ihren Arzt" bei „Erbrechen von Blut" und „Blut im Stuhl,
   *     der schwarz oder teerig aussehen kann". gesund.bund.de, Magengeschwür
   *     (Stand 07.01.2022), schreibt dazu „zeitnah ärztlich abklären"; die
   *     Stufe „sofort" ist in js/bild.js festgelegt und hier nicht geändert.
   */
}

function bildTeil(s, d) {
  // Gerechnet wird das in musterDaten, einmal für alle – siehe dort.
  const b = d.bild;
  const warn = warnTeil(d);

  if (!b.muster.length) {
    return warn + (genugFuerBild(b.basis) ? '' : `<div class="karte">
      <h3>Einordnung</h3>
      <p class="klein">Für eine Einordnung fehlt noch Material:
      ${b.basis.notierteTage} notierte Tage und ${b.basis.beschwerden} Eintragungen
      zu Beschwerden. Ab etwa zehn Tagen und fünf Eintragungen steht hier, wonach
      das Bild aussieht.</p>
    </div>`);
  }

  const kasten = (m, i) => `<li class="muster${i === 0 ? ' erst' : ''}">
    <div class="muster-kopf">
      <b>${esc(m.name)}</b>
      ${i === 0 ? '<span class="fund-urteil">passt am ehesten</span>' : ''}
    </div>
    <p>${esc(m.satz)}</p>
    <p class="feld-name">Woran das zu sehen ist</p>
    <ul class="belege">${m.belege.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="feld-name">Was dahinterstecken kann – und was es unterscheidet</p>
    <ul class="ursachen">${m.ursachen.map((u) => `<li>
      <b>${esc(u.name)}</b><span class="zeile-tags">${esc(u.klaerung)}</span>
    </li>`).join('')}</ul>
  </li>`;

  return `${warn}<div class="karte">
    <h3>Einordnung</h3>
    <p class="klein">Das hier ist <b>keine Diagnose</b>, und zwar nicht aus
    Vorsicht, sondern weil es keine sein kann: Gastritis, Magengeschwür,
    Reflux, funktionelle Dyspepsie und ein Reizdarm sehen im Tagebuch teils
    gleich aus. Auseinander hält sie eine Untersuchung. Was hier steht, ist die
    Beschreibung deines Musters in den Worten, die in einer Praxis benutzt
    werden – damit das Gespräch dort nicht bei null anfängt.</p>
    <ul class="muster-liste">${b.muster.slice(0, 3).map(kasten).join('')}</ul>
    <p class="klein">Grundlage: ${b.basis.notierteTage} notierte Tage,
      ${b.basis.beschwerden} Eintragungen zu Beschwerden, davon
      ${b.basis.zuordenbar} einer Mahlzeit zuzuordnen.</p>
  </div>
  ${b.fragen.length ? `<div class="karte">
    <h3>Fragen für den nächsten Termin</h3>
    <ul class="fragen">${b.fragen.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <p class="klein">Stehen auch im Bericht unter „Mehr".</p>
  </div>` : ''}`;
}

/** Der Zyklus, wenn genug davon eingetragen wurde. */
function zyklusTeil(s) {
  const phasen = phasenBilanz(s.eintraege, s.tage, tagesWert);
  if (!phasen.length) return '';
  const laenge = mittlereLaenge(s.tage);
  const spanne = schwankung(s.tage);
  // Die Zahlen standen hier immer schon; was fehlte, war der Satz dazu. Er
  // kommt nur, wenn er zulässig ist – zwei abgeschlossene Zyklen und genug
  // Tage in beiden verglichenen Phasen.
  const urteil = phasenUrteil(phasen, s.tage);
  return `<div class="karte">
    <h3>Nach Zyklusphase</h3>
    ${urteil.deutlich ? `<p>${esc(urteil.satz)}</p>` : ''}
    <ul class="wartend">${phasen.map((p) => `<li>
      <span>${esc(p.name)}</span>
      <span class="klein">${mehrzahl(p.tage, 'Tag', 'Tage')}, im Mittel ${fmtZahl(p.schnitt)}</span>
    </li>`).join('')}</ul>
    ${urteil.pruefbar && !urteil.deutlich ? `<p class="klein">${esc(urteil.satz)}</p>` : ''}
    <p class="klein">
      ${laenge ? `Deine Zyklen dauern im Mittel ${laenge} Tage${spanne ? ` (${spanne.von} bis ${spanne.bis}, aus ${spanne.anzahl} Zyklen)` : ''}. ` : ''}
      ${belastbar(s.tage) ? '' : 'Noch keine zwei abgeschlossenen Zyklen – die Zahlen stehen da, aber es folgt noch nichts daraus. '}
      Die Phasen sind geschätzt: Die Periode kommt aus deinen Eintragungen, die
      Mitte aus der halben Zykluslänge. <b>Nicht zur Verhütung geeignet</b> –
      der Eisprung wird hier nicht gemessen.</p>
  </div>`;
}

/*
 * Die Waage – die einzige Zahl hier, die nicht aus dem Gefühl kommt.
 *
 * Alles andere in dieser App ist Selbstauskunft, und das ist bei
 * Bauchbeschwerden nicht anders möglich. Das Gewicht ist die Ausnahme. Ein
 * ungewollter Gewichtsverlust gehört zu den Zeichen, bei denen ärztlicher Rat
 * gesucht werden soll: Die Fachinformation von PANTOZOL Control nennt ihn
 * neben Anämie, Blutungen, Schluckbeschwerden und Erbrechen von Blut – „In
 * diesen Fällen sollte eine Malignität ausgeschlossen werden"
 * (EMA-Produktinformation, 4.4) –, und gesund.bund.de, Reizdarmsyndrom (Stand
 * 28.08.2024): „Kommt es zu deutlichem Gewichtsverlust, Blut im Stuhl, Fieber
 * oder Blässe, kann es sich eher um andere Darmerkrankungen handeln."
 * Bis zur Fassung 29 stand hier, das Gewicht sei „die klinisch wichtigste
 * Zahl" und ein ungewollter Verlust „das stärkste einzelne Zeichen" – keine
 * Quelle stellt eine solche Rangfolge auf; in einer Studie zu Warnzeichen
 * beim Reizdarm hatten Blutarmut und verstecktes Blut im Stuhl einen höheren
 * Vorhersagewert (PMID 35097082, Abstract).
 *
 * Die Frage nach der Absicht steht mit auf der Karte und nicht im
 * Kleingedruckten. Ohne sie wäre die ganze Rechnung ein Fehlalarm-Automat.
 * Body Check meldet sich ab fünf Prozent weniger in bis zu 180 Tagen
 * (ALARM_ANTEIL, WAAGE_FENSTER in js/gewicht.js) – diese Grenze hat die App
 * festgelegt. Belegt ist eine Fünf-Prozent-Schwelle in den erreichbaren
 * Quellen nur als Kriterium der Kachexie bei Krebs („Weight loss ≥ 5% over
 * past 6 months", EMA/647868/2017, Bewertungsbericht Adlumiz), nicht als
 * allgemeine Grenze. Ungewollt gehört ein deutlicher Verlust in die Praxis,
 * gewollt ist er ein anderer Fall.
 */
/*
 * Die tägliche Erinnerung – über den Kalender, weil es anders nicht ginge.
 *
 * Eine Benachrichtigung, die ankommt, während die App zu ist, bräuchte auf dem
 * iPhone einen Server, der sie verschickt, und eine Gerätekennung, die dort
 * liegt. Beides widerspricht der Zusage dieser App. Der Kalender kann dasselbe,
 * ohne dass irgendetwas das Gerät verlässt – und er erinnert auch dann noch,
 * wenn die App monatelang nicht geöffnet wird.
 */
/**
 * „In den Kalender" für einen Zeitpunkt, auf den die App wartet.
 *
 * Stufenplan und Provokationstest bestehen zur Hälfte aus Warten: drei Tage
 * Pause, zwei Tage Abstand. Das sind genau die Fristen, die im Alltag
 * verlorengehen – nicht weil sie schwer wären, sondern weil niemand sich einen
 * Termin in vier Tagen merkt, den ihm keiner sagt. Die App kann nicht
 * klingeln; der Kalender kann es.
 *
 * Erscheint nur, wenn wirklich ein künftiger Tag feststeht. Ein Knopf, der
 * heute schon anbietet, an heute zu erinnern, wäre Lärm.
 */
function terminKnopf(schritt) {
  if (!schritt || !schritt.am || schritt.am <= heuteISO()) return '';
  return `<div class="reihe">
    <button type="button" class="btn btn-ghost" data-act="termin-kalender"
            data-am="${schritt.am}" data-titel="${esc(schritt.titel || 'Body Check')}"
            data-text="${esc(schritt.satz || '')}">
      Am ${esc(fmtDatum(schritt.am, true))} erinnern
    </button>
  </div>`;
}

function erinnerungKarte(s) {
  const gewaehlt = ui.erinnerungZeit || '20:00';
  return `<div class="karte">
    <h3>Täglich erinnern lassen</h3>
    <p class="klein">Das Wichtigste an einem Tagebuch ist nicht die Auswertung,
    sondern dass es geführt wird. Hier entsteht ein ganz gewöhnlicher
    Kalendereintrag – täglich, mit Wecker –, den du einmal in deinen Kalender
    legst. Ab da erinnert dich das Telefon selbst, auch offline.</p>
    <p class="feld-name">Wann?</p>
    <div class="wahl">${ZEIT_VORSCHLAEGE.map((z) => `
      <button type="button" class="wahl-btn${z === gewaehlt ? ' an' : ''}"
              data-act="erinnern-zeit" data-z="${z}">${z} Uhr</button>`).join('')}</div>
    <div class="reihe">
      ${knopf('erinnern-datei', 'In den Kalender legen', 'btn-primary')}
      ${knopf('erinnern-teilen', 'Anders öffnen', 'btn-ghost')}
    </div>
    <p class="klein">Abends ist meist besser als morgens: Dann liegt der Tag
    hinter dir und du trägst ihn ein, statt ihn vorherzusagen.</p>
    <p class="klein">Zwei Ehrlichkeiten dazu. <b>Es ist ein Kalendereintrag,
    keine Funktion dieser App</b> – wer ihn löscht oder verschiebt, ändert damit
    die Erinnerung, und die App merkt davon nichts: Sie kann in deinen Kalender
    nicht hineinsehen. Und <b>eine echte Push-Nachricht gibt es hier bewusst
    nicht</b>: Die bräuchte einen Server, der sie verschickt, und eine Kennung
    deines Geräts, die dort liegt. Beides gibt es in dieser App nicht, und
    genau deshalb kann dein Tagebuch nirgendwo landen.</p>
  </div>`;
}

function gewichtKarte(s) {
  const g = gewichtsBild(s.gewicht, heuteISO(), s.abnehmenGewollt);
  const letzte = (s.gewicht || []).slice(0, 6);

  return `<div class="karte ${g.warnung ? 'karte-warn' : ''}">
    <h3>Gewicht</h3>
    ${g.urteil !== 'keine' ? `<p><b>${GEWICHT_WORT[g.urteil]}.</b></p>` : ''}
    <p class="klein">${esc(g.satz)}</p>
    <p class="feld-name">Heute gewogen</p>
    <div class="reihe">
      <!--
        Bewusst kein type="number": Auf einem deutschen Handy liefert die
        Zifferntastatur ein Komma, und ein Zahlenfeld wirft ein Komma
        stillschweigend weg – die Eingabe käme leer an. Mit inputmode="decimal"
        erscheint dieselbe Tastatur, das Komma kommt durch, und umgerechnet
        wird unten in „gewicht-los".
      -->
      <input type="text" class="feld" data-act="gewicht-neu" inputmode="decimal"
             placeholder="kg" aria-label="Gewicht in Kilogramm">
      ${knopf('gewicht-los', 'Eintragen', 'btn-primary')}
    </div>
    ${letzte.length ? `<ul class="wartend">${letzte.map((m) => `<li>
      <span>${esc(fmtDatum(m.am, true))}</span>
      <span class="klein">${fmtZahl(m.kg)} kg
        <button type="button" class="strang-weg" data-act="gewicht-weg"
                data-iso="${m.am}" aria-label="Messung löschen">×</button></span>
    </li>`).join('')}</ul>` : ''}
    <p class="feld-name">Nimmst du gerade absichtlich ab?</p>
    <div class="wahl">
      <button type="button" class="wahl-btn${s.abnehmenGewollt ? '' : ' an'}"
              data-act="abnehmen" data-n="nein">Nein</button>
      <button type="button" class="wahl-btn${s.abnehmenGewollt ? ' an' : ''}"
              data-act="abnehmen" data-n="ja">Ja, gewollt</button>
    </div>
    <p class="klein">Das ist keine Nebensache: Ein ungewollter Gewichtsverlust
    gehört ärztlich abgeklärt. Body Check meldet sich ab fünf Prozent weniger
    in bis zu einem halben Jahr – diese Grenze hat die App festgelegt. Ob ein
    Verlust gewollt ist, sieht keine Rechnung, das weißt nur du.</p>
  </div>`;
}

/*
 * Eine Sicherung, die als Text ankommt statt als Datei.
 *
 * Das fehlte, und es fiel erst bei einem Umzug auf: Wer die App an einer
 * Adresse benutzt hat und an eine andere wechselt, findet dort ein leeres
 * Tagebuch – der Speicher eines Browsers gehört der Adresse, nicht dem
 * Menschen. Der Weg hinaus über „Als Text" war da; der Weg hinein gab es nur
 * als Datei.
 *
 * Und eine Datei ist nicht immer zu haben. In einer eingebetteten Fassung
 * unterbindet der Rahmen jeden Download, den die Seite selbst auslöst – dort
 * bleibt der Knopf „Als Datei sichern" ohne Wirkung, und die Zwischenablage
 * ist der einzige Ausgang. Wer so aus einer Sackgasse heraus muss, braucht
 * auf der anderen Seite ein Feld zum Einfügen.
 *
 * Das ist zugleich der datensparsamste Weg: kopieren und einfügen bleibt auf
 * demselben Gerät. Eine Datei wandert über den Download-Ordner, und wer sie
 * sich selbst schickt, hat sein Tagebuch in einem Postfach liegen.
 */
function einfuegeKarte() {
  if (ui.einfuegen === null) return '';
  return `<div class="schloss">
    <p class="feld-name">Sicherungstext hier einfügen</p>
    <textarea class="bericht" rows="6" data-act="einfuegen-text"
      placeholder="Den kopierten Text einfügen (beginnt mit „{“)"></textarea>
    <p class="klein">${ui.einfuegenUmzug
    ? 'Kam das „Einsetzen" nicht? Dann hier lange tippen, „Einsetzen" wählen und auf „Einlesen" tippen.'
    : 'Was hier schon steht, bleibt: Einträge, die es auf beiden Seiten gibt, werden erkannt und nicht doppelt angelegt. Der Stand von vorher lässt sich danach unter „Sicherung" zurückholen.'}</p>
    <div class="reihe">
      ${knopf('einfuegen-los', 'Einlesen', 'btn-primary')}
      ${knopf('einfuegen-zu', 'Abbrechen', 'btn-ghost')}
    </div>
  </div>`;
}

/**
 * Die Sicherung mit Passwort.
 *
 * Der wundeste Punkt der App hatte nie etwas mit Medizin zu tun: Die Sicherung
 * lag als offene JSON-Datei im Download-Ordner. Ein Tagebuch über den Körper
 * eines Menschen, im Klartext, auf einem Gerät, das man verleiht oder verliert.
 *
 * Zwei Sätze müssen hier stehen und stehen deshalb groß da: Ein vergessenes
 * Passwort heißt, dass die Sicherung weg ist – es gibt keine Hintertür, und
 * das ist der Preis dafür, dass es auch für andere keine gibt. Und wo der
 * Browser nicht verschlüsseln kann (die Ein-Datei-Fassung per Doppelklick),
 * steht der Grund statt eines Knopfes, der nichts täte.
 */
function schlossKarte() {
  if (!tresorMoeglich()) {
    return `<p class="klein" style="margin-top:10px">Verschlüsseln geht hier
    nicht: Dein Browser gibt die Verschlüsselung nur über eine gesicherte
    Adresse frei, und diese Fassung läuft aus einer Datei. Über die Adresse
    (https) steht der Knopf da.</p>`;
  }
  if (!ui.schloss) {
    return `<div class="reihe" style="margin-top:10px">
      ${knopf('schloss-auf', 'Mit Passwort sichern')}
    </div>`;
  }
  return `<div class="schloss">
    <p class="feld-name">Passwort für diese Sicherungsdatei</p>
    <input type="password" class="feld feld-breit" id="tresorWort"
           data-act="tresor-wort" autocomplete="new-password"
           placeholder="mindestens acht Zeichen">
    <p class="klein"><b>Vergessen heißt weg.</b> Es gibt keine Hintertür, kein
    Zurücksetzen und niemanden zum Fragen – genau deshalb kommt auch sonst
    niemand hinein. Schreib es dir auf, bevor du hier tippst.</p>
    <div class="reihe">
      ${knopf('tresor-export', 'Verschlüsselt sichern', 'btn-primary')}
      ${knopf('schloss-zu', 'Abbrechen', 'btn-ghost')}
    </div>
  </div>`;
}

/* ==================== Reiter: Mehr ==================== */

/**
 * „Was schon feststeht" – die Angabe, ohne die diese App zu viel behauptet.
 *
 * Sie steht unter „Mehr" und nicht auf dem Tagesreiter, weil sie sich fast nie
 * ändert: Ein Befund wird einmal eingetragen und bleibt. Was sich täglich
 * ändert, gehört nach vorn; was einmal im Jahr dazukommt, hierher.
 *
 * Bewusst eine feste Auswahl und kein Freitextfeld. Nicht aus Bequemlichkeit:
 * Die App muss aus dem Eintrag etwas folgern – welche Vorbehalte gelten, was
 * aus „Was noch fehlt" verschwindet –, und das kann sie nur, wenn sie weiß,
 * was dasteht. Ein frei getippter Befund wäre eine Notiz, die nichts bewirkt,
 * und das wäre schlimmer als das Feld nicht zu haben.
 */
function befundeKarte(s) {
  const meine = s.befunde || [];
  const hat = (id) => meine.some((b) => b.id === id);
  const offenZurWahl = BEFUNDE.filter((b) => !hat(b.id));

  return `<div class="karte">
    <h3>Was schon feststeht</h3>
    <p class="klein">Diagnosen, die du <b>von einer Ärztin bekommen hast</b> –
    keine Vermutungen. Die App beurteilt sie nicht und rechnet nichts daraus.
    Sie ändert nur, was sie selbst behauptet: Was hier steht, taucht unter
    „Muster" nicht mehr als offene Frage auf, und die Kriterien ordnen dann
    nicht mehr ein, sondern beobachten den Verlauf.</p>

    ${meine.length ? `<ul class="befunde">${meine.map((b) => {
    const w = BEFUND_VON[b.id];
    if (!w) return '';
    return `<li class="befund">
      <div class="fund-kopf">
        <b>${esc(w.name)}</b>
        <button type="button" class="strang-weg" data-act="befund-weg" data-id="${esc(b.id)}"
                aria-label="Aus der Liste nehmen">×</button>
      </div>
      <p class="zeile-tags">${esc(w.was)}</p>
      <p class="klein">${esc(w.bedeutet)}</p>
    </li>`;
  }).join('')}</ul>` : '<p class="klein">Noch nichts eingetragen – dann rechnet die App weiter so, als sei alles offen.</p>'}

    ${offenZurWahl.length ? `<p class="feld-name">Dazu</p>
    <div class="marken marken-eng">${offenZurWahl.map((b) => `
      <button type="button" class="marke" data-act="befund-neu" data-id="${esc(b.id)}">
        ${esc(b.name)}</button>`).join('')}</div>` : ''}

    <p class="klein">Steht deine Diagnose nicht dabei, ist das kein Versehen:
    Die Liste führt nur, woraus diese App etwas folgern kann. Alles andere
    gehört in den Arztbericht und nicht hierher.</p>
  </div>`;
}

/*
 * DIE ANLEITUNG: HOME-BILDSCHIRM UND SICHERN
 *
 * Auf dem iPhone hängt an zwei Handgriffen, ob das Tagebuch über Monate hält:
 * Body Check als App auf den Home-Bildschirm legen, und ab und zu als Datei
 * sichern. Beides stand verstreut in Karten, die man wegtippen kann. Hier
 * steht es an einem Ort, den man unter „Mehr" immer wiederfindet, und so,
 * dass niemand es erklären muss.
 *
 * Was hier steht, ist gegen Quellen geprüft (WebKit-Blog, MDN, web.dev,
 * Apple-Support), Stand Oktober 2026. Was sich nicht belegen ließ, steht
 * bewusst nicht da: dass ein iCloud-Backup oder die Übertragung auf ein neues
 * iPhone die Einträge mitnimmt, wie die Menüpunkte zum Löschen eines Symbols
 * unter iOS 26 heißen, ob „Websitedaten löschen" auch die App trifft. Wo es
 * unsicher ist, heißt es „wahrscheinlich" oder „nicht sicher" – und der Weg,
 * der sicher geht, ist die eigene Sicherung.
 *
 * Nur auf Apple-Geräten. Android und der Rechner haben dieses Problem nicht
 * in dieser Form, und eine Anleitung für ein anderes Gerät liest niemand.
 */
function anleitungKarte() {
  return `<div class="karte">
    <h3>Anleitung</h3>
    <p class="klein">Wie Body Check auf deinen Home-Bildschirm kommt, wie du
    deine Einträge sicherst, was bei einem neuen ${geraetName(geraet())} zu tun ist
    und wie du einen Eintrag änderst.</p>
    ${knopf('anleitung', 'Anleitung öffnen', 'btn-primary btn-block')}
  </div>`;
}

function anleitungAnsicht(s) {
  const g = geraet();
  const app = laeuftAlsApp();
  const ding = geraetName(g);
  const safari = !app && !g.anderer && !g.inApp;
  const wo = app ? 'in dieser App' : safari ? 'hier in Safari' : 'hier im Browser';
  const teilen = typeof navigator.canShare === 'function';
  // Die Adresse aus dem, was gerade läuft – nicht fest im Code. Wer die App
  // woanders hinlegt, bekommt sonst eine Anleitung zu einer fremden Adresse.
  const adresse = location.protocol.startsWith('http')
    ? location.host + location.pathname.replace(/index\.html$/, '')
    : '';

  const neue = s.lastBackup ? Math.max(0, s.eintraege.length - (s.lastBackup.anzahl || 0)) : 0;
  const stand = !s.eintraege.length && !s.lastBackup
    ? 'Noch nichts zu sichern.'
    : !s.lastBackup
      ? 'Noch nie gesichert.'
      : `Zuletzt gesichert am ${fmtDatum(s.lastBackup.on, true)}.${neue
        ? ` Seitdem ${mehrzahl(neue, 'neuer Eintrag', 'neue Einträge')}.` : ''}`;

  const sichern = `<div class="karte" id="anleitung-sichern">
    <h3>Sichern</h3>
    <p class="klein"><b>${stand}</b></p>
    <p class="klein">Deine Einträge sind nur ${wo} auf diesem ${ding}. Eine
    Sicherung ist eine Datei mit deinem ganzen Tagebuch. Die hebst du selbst auf.</p>
    ${teilen ? `<ol class="schritte">
      <li>Tippe auf <b>Als Datei sichern</b>.</li>
      <li>Weiter unten in der Liste steht <b>In Dateien sichern</b>. Tippe darauf.</li>
      <li>Wähle <b>iCloud Drive</b>. Siehst du das nicht, nimm <b>Auf meinem ${ding}</b>.</li>
      <li>Tippe oben rechts auf <b>Sichern</b>.</li>
    </ol>
    ${knopf('export', 'Als Datei sichern', 'btn-primary btn-block')}
    <p class="klein">In „iCloud Drive“ ist deine Sicherung auch dann noch da,
    wenn dein ${ding} verloren geht oder kaputtgeht. „Auf meinem ${ding}“ liegt
    sie nur auf diesem ${ding}.</p>`
    : `${knopf('export', 'Als Datei sichern', 'btn-primary btn-block')}
    <p class="klein">Leg die Datei an einen Ort, an den du auch ohne dieses
    ${ding} kommst, zum Beispiel in „iCloud Drive“.</p>`}
    <p class="klein">Body Check erinnert dich auf „Tag“, wenn es wieder Zeit
    ist. Jede Sicherung enthält das ganze Tagebuch.</p>
    <p class="klein">Klappt „Als Datei sichern“ nicht, tippe auf „Als Text“ und
    dann auf „Kopieren“, und setz den Text in eine neue Notiz ein.</p>
    <div class="reihe">${knopf('sicherung-text', 'Als Text')}</div>
  </div>`;

  const punkte = [];
  if (app) {
    punkte.push(`<li><b>Öffne Body Check immer über das Symbol</b> auf deinem
      Home-Bildschirm. Was du in Safari einträgst, kommt hier nicht an.</li>`);
    // Zwei Punkte, nicht einer: Löschen kostet wahrscheinlich die Einträge,
    // ein zweites Symbol nicht – es fängt nur leer an, die Einträge bleiben
    // im ersten (jede Installation hat ihren eigenen Speicher, web.dev).
    punkte.push(`<li><b>Lösch das Body-Check-Symbol nicht</b>${s.alterName
      ? ', auch wenn es noch den alten Namen „Bauchbuch“ trägt' : ''}. Sonst
      sind deine Einträge wahrscheinlich weg.</li>`);
    punkte.push(`<li><b>Leg es kein zweites Mal an.</b> Ein zweites Symbol fängt
      leer an, deine Einträge bleiben im ersten. Hast du schon zwei, lösch
      erst mal keins: Öffne beide, schau, in welchem deine Einträge stehen, und
      sichere dort als Datei, bevor du das andere löschst.</li>`);
    punkte.push(`<li><b>Ein paar Wochen nicht reinschauen ist kein Problem.</b>
      Als App auf dem Home-Bildschirm löscht dein ${ding} deine Einträge deshalb nicht.</li>`);
  } else if (safari) {
    // Die Sieben-Tage-Regel steht schon in der Karte darüber.
    punkte.push(`<li><b>Leg Body Check auf den Home-Bildschirm</b> (siehe oben).
      Als App löscht dein ${ding} deine Einträge nicht, nur weil du ein paar
      Wochen nicht reinschaust.</li>`);
    punkte.push(`<li>Tippst du in den Einstellungen bei Safari auf „Verlauf und
      Websitedaten löschen“, sind deine Einträge hier in Safari weg.</li>`);
  } else {
    punkte.push(`<li><b>Leg Body Check auf den Home-Bildschirm</b> (siehe oben).
      Dann öffnest du die App mit einem Tipp und trägst immer an derselben Stelle ein.</li>`);
  }
  punkte.push(`<li><b>Sichere ab und zu als Datei</b>, am besten in „iCloud
    Drive“. Denn ganz ausschließen kann niemand, dass Einträge verschwinden:
    Ein ${ding} kann verloren gehen, kaputtgehen oder sehr voll werden.</li>`);
  punkte.push('<li><b>Neue Fassungen</b> von Body Check kommen von selbst. Deine Einträge bleiben dabei.</li>');

  const erhalten = `<div class="karte">
    <h3>So bleibt dein Tagebuch erhalten</h3>
    <ul class="punkte">${punkte.join('')}</ul>
    <details id="anleitung-neu" class="anleitung-auf">
      <summary>Neues ${ding} oder Symbol gelöscht?</summary>
      <p class="klein">Ein neu angelegtes Symbol fängt leer an. Ob deine
      Einträge von selbst aufs neue ${ding} kommen, ist nicht sicher – auch
      nicht mit iCloud-Backup oder wenn du dein altes ${ding} direkt aufs neue
      überträgst. So gehst du sicher:</p>
      <ol class="schritte">
        <li><b>Solange das alte Symbol noch da ist</b> (zum Beispiel auf dem
        alten ${ding}): Tippe dort auf „Als Datei sichern“ und leg die Datei in
        „iCloud Drive“. Ist es dafür zu spät, mach mit Schritt 2 weiter.</li>
        <li><b>Auf dem neuen ${ding} oder nach dem Löschen:</b> Ist das
        Body-Check-Symbol da (es kann auch noch „Bauchbuch“ heißen), öffne
        es – beim ersten Mal am besten mit Internet. ${adresse
    ? `Ist es nicht da, öffne in Safari <b>${esc(adresse)}</b>${/bauchbuch/i.test(adresse)
      ? ' (die Adresse trägt noch den alten Namen)' : ''} und leg Body Check wieder auf den Home-Bildschirm.`
    : 'Ist es nicht da, öffne Body Check in Safari und leg die App wieder auf den Home-Bildschirm.'}</li>
        <li>Fehlen in der App Einträge, tippe dort auf <b>Datei einlesen</b> –
        gleich auf dem ersten Bildschirm oder unter „Mehr“ › „Sicherung“. Such
        deine Sicherung, zum Beispiel unter <b>Durchsuchen</b> › <b>iCloud
        Drive</b>, und tippe sie an. ${SICHERUNGSNAMEN} Nimm die mit dem
        neuesten Datum.</li>
      </ol>
      <p class="klein">Hast du als Text in eine Notiz gesichert: Kopier dort den
      ganzen Text. Tippe dann in der App unter „Mehr“ › „Sicherung“ auf
      <b>Text einlesen</b>, setz den Text ins Feld ein und tippe auf
      <b>Einlesen</b>.</p>
      <p class="klein">Beim Einlesen geht nichts verloren, was schon in der App
      steht. Doppelte Einträge erkennt Body Check. Was nach deiner letzten
      Sicherung dazukam, fehlt allerdings.</p>
      <p class="klein">Keine Sicherung? Schau in Safari nach, ob dort noch
      Einträge stehen. Wenn ja, tippe dort auf „Einträge mitnehmen“ oder
      „Nochmal mitnehmen“. Öffne dann die App und tippe unter „Mehr“ ›
      „Sicherung“ auf „Aus Safari holen“.</p>
      ${app ? `<div class="reihe">${knopf('import', 'Datei einlesen')}${knopf('umzug-holen', 'Aus Safari holen')}</div>`
    : `<p class="klein">Lies die Sicherung in der App ein, nicht ${wo}. Sonst
      steht sie danach ${wo} statt in der App.</p>`}
    </details>
    <details id="anleitung-update" class="anleitung-auf">
      <summary>${g.ipad ? 'iPadOS-Update' : 'iOS-Update'}?</summary>
      <p class="klein">Bei einem Update bleiben deine Einträge normalerweise
      erhalten. Sichere trotzdem kurz vorher als Datei.</p>
    </details>
  </div>`;

  // Ändern ging immer, nur sah man es nicht – siehe tagAnsicht().
  const aendern = `<div class="karte" id="anleitung-aendern">
    <h3>Einträge ändern und löschen</h3>
    <ul class="punkte">
      <li><b>Tipp auf einen Eintrag</b> auf „Tag“, um ihn zu ändern – auch Tage
        später. Uhrzeit, Datum und alles andere lassen sich ändern. Dann tippe
        unten auf <b>Ändern</b>.</li>
      <li><b>Löschen:</b> Tippe auf das <b>×</b> neben dem Eintrag. Es fragt
        „Löschen?“ – tippe noch einmal, dann ist er weg. Gleich danach holt ihn
        <b>Rückgängig</b> zurück.</li>
    </ul>
  </div>`;

  // Kurz: wo es steht, was ein Tipp tut, und die eine Regel, die man sonst
  // nicht errät – eine Aktivität allein ist kein guter Tag.
  const aktiv = `<div class="karte" id="anleitung-aktivitaet">
    <h3>Was du gemacht hast</h3>
    <ul class="punkte">
      <li>Mit <b>Aktivität</b> auf „Tag“ hältst du fest, was du gemacht hast oder wo
        du warst – Gym, Arbeit, unterwegs. Was fehlt, legst du im Bogen selbst an.</li>
      <li>Danach steht es auf „Tag“ unter <b>Zuletzt gemacht</b>: Ein Tipp trägt es
        mit der jetzigen Uhrzeit ein.</li>
      <li>Nach ein paar Wochen steht unter „Muster“, ob danach öfter Beschwerden
        oder Kopfschmerzen kamen. Eine Aktivität allein macht keinen Tag ohne
        Beschwerden.</li>
    </ul>
  </div>`;

  return `
  <div class="reihe">${knopf('anleitung-zu', '‹ Zurück', 'btn-ghost')}</div>
  <h2>Anleitung</h2>
  <p class="klein">Zwei Dinge, dann bleibt dein Tagebuch erhalten: Body Check
  als App auf den Home-Bildschirm legen. Und ab und zu sichern. Du findest
  diese Seite immer unter „Mehr“.</p>
  ${startbildschirmKarte(s, 'mehr')}
  ${umzugHolenKarte(s)}
  ${sichern}
  ${erhalten}
  ${aendern}
  ${aktiv}
  ${knopf('anleitung-zu', '‹ Zurück zu „Mehr“', 'btn-ghost btn-block')}`;
}

/*
 * Der Satz zum dauerhaften Speicher.
 *
 * Gezeigt wird nur, was persist() wirklich gemeldet hat. Safari kennt die
 * Frage seit iOS 17 und sagt meist nein; was man auf dem iPhone wissen muss,
 * steht deshalb unabhängig von dieser Antwort da: In Safari gilt die
 * Sieben-Tage-Regel, in der App nicht. Für die App heißt es „ein paar
 * Wochen", nicht „eine Weile": Seit Mai 2026 kennt WebKit eine Räumung nach
 * langer Zeit ohne Zugriff, und ab welcher iOS-Fassung sie gilt, ist offen.
 * Für Chrome und eingebaute Browser auf dem iPhone ist die Regel nicht
 * belegt – dort steht nur, was sicher hilft.
 */
function speicherSatz() {
  const g = geraet();
  const ding = geraetName(g);
  const antwort = ui.speicher === false ? 'nicht zugesagt' : 'unbekannt';
  if (ui.speicher === true && g.ios) {
    return `<b>Dauerhafter Speicher: zugesagt.</b> Dein ${ding} hat zugesagt, `
      + 'diesen Speicher nicht von selbst aufzuräumen. Sichern solltest du '
      + `trotzdem – dein ${ding} kann verloren gehen oder kaputtgehen.`;
  }
  if (ui.speicher === true) {
    return '<b>Dauerhafter Speicher: zugesagt.</b> Der Browser hat zugesichert, '
      + 'diesen Speicher nicht von selbst aufzuräumen. Sichern solltest du '
      + 'trotzdem – eine Zusage ist kein Gerät, das nicht kaputtgeht.';
  }
  if (!g.ios) {
    return ui.speicher === false
      ? '<b>Dauerhafter Speicher: nicht zugesagt.</b> Der Browser darf diesen '
        + 'Speicher bei Platzmangel oder längerer Nichtbenutzung räumen. Meist '
        + 'gibt er die Zusage, sobald die App auf dem Startbildschirm liegt und '
        + 'ein paar Mal benutzt wurde. Bis dahin ist die Sicherung das Einzige, '
        + 'worauf Verlass ist.'
      : '<b>Dauerhafter Speicher: unbekannt.</b> Dieser Browser sagt nicht, ob '
        + 'er den Speicher verschont. Dann kann er nach längerer '
        + 'Nichtbenutzung geräumt werden. Sichern.';
  }
  if (laeuftAlsApp()) {
    return `<b>Dauerhafter Speicher: ${antwort}.</b> `
      + `${ui.speicher === false ? '' : 'iOS sagt das nicht. '}Als App auf dem `
      + `Home-Bildschirm löscht dein ${ding} deine Einträge aber nicht, nur weil `
      + 'du ein paar Wochen nicht reinschaust. Sichern solltest du trotzdem – '
      + `dein ${ding} kann verloren gehen oder kaputtgehen.`;
  }
  if (g.anderer || g.inApp) {
    return `<b>Dauerhafter Speicher: ${antwort}.</b> Leg Body Check auf den `
      + 'Home-Bildschirm (siehe oben) und sichere.';
  }
  return `<b>Dauerhafter Speicher: ${antwort}.</b> In Safari kann dein ${ding} `
    + 'deine Einträge löschen, wenn du Body Check eine Weile nicht benutzt – im '
    + 'ungünstigsten Fall schon nach sieben Tagen, an denen du Safari benutzt '
    + 'hast. Leg Body Check auf den Home-Bildschirm (siehe oben) und sichere.';
}

function mehrAnsicht(s) {
  if (ui.anleitung && istApfel()) return anleitungAnsicht(s);
  const gesichert = s.lastBackup
    ? `zuletzt am ${fmtDatum(s.lastBackup.on, true)} mit ${mehrzahl(s.lastBackup.anzahl, 'Eintrag', 'Einträgen')}`
    : 'noch nie';
  const alt = s.lastBackup ? tageDazwischen(s.lastBackup.on, heuteISO()) : 999;
  const seit = store.letzterTermin(heuteISO());

  const bericht = ui.bericht ? `<div class="karte">
    <h3>Bericht</h3>
    <textarea class="bericht" readonly rows="16">${esc(ui.bericht)}</textarea>
    <div class="reihe">
      ${knopf('bericht-kopieren', 'Kopieren', 'btn-primary')}
      ${knopf('bericht-laden', 'Als Datei')}
      ${knopf('bericht-zu', 'Schließen', 'btn-ghost')}
    </div>
  </div>` : '';

  return `
  ${istApfel() ? anleitungKarte() : ''}
  ${installKarte()}
  ${fassungKarte()}

  <div class="karte">
    <h3>Sicherung</h3>
    <p class="klein">Alles steht ausschließlich ${speicherOrt().wo}. Wird
    ${speicherOrt().wessen} Speicher gelöscht, ist das Tagebuch weg. Eine Kopie, auf die du dich
    verlassen kannst, gibt es nur, wenn du sicherst. Die Sicherung ist eine
    Datei, die du selbst aufbewahrst${istApfel() ? ' – am besten in „iCloud Drive“' : ''}.</p>
    ${(() => {
    const v = store.vorherDa();
    return v ? `<p class="klein">Vor dem letzten Einlesen (${fmtDatum(String(v.am).slice(0, 10), true)})
      standen hier ${mehrzahl(v.anzahl, 'Eintrag', 'Einträge')}.
      ${knopf('rueckgaengig', 'Diesen Stand zurückholen', 'btn-ghost')}</p>` : '';
  })()}
    <p class="klein">${speicherSatz()}</p>
    <p class="klein ${alt > 30 ? 'warnend' : ''}">Gesichert: ${gesichert}</p>
    <div class="reihe">
      ${knopf('export', 'Als Datei sichern', 'btn-primary')}
      ${knopf('sicherung-text', 'Als Text')}
      ${knopf('import', 'Datei einlesen')}
      ${knopf('einfuegen-auf', 'Text einlesen')}
      ${laeuftAlsApp() && istApfel() ? knopf('umzug-holen', 'Aus Safari holen') : ''}
    </div>
    ${schlossKarte()}
    ${einfuegeKarte()}
    ${ui.sicherung ? `
      <p class="klein" style="margin-top:10px">${istApfel()
    ? 'Tippe auf <b>Kopieren</b>. Öffne dann die App Notizen, leg eine neue Notiz an, tippe lange hinein und wähle <b>Einsetzen</b>.'
    : 'Tippe auf <b>Kopieren</b> und setz den Text in eine neue Notiz ein.'}
      Zum Zurückholen: den ganzen Text aus der Notiz kopieren, hier auf
      „Text einlesen“ tippen und einsetzen.</p>
      <textarea class="bericht" id="sicherungsText" readonly rows="10">${esc(ui.sicherung)}</textarea>
      <div class="reihe">
        ${knopf('sicherung-kopieren', 'Kopieren', 'btn-primary')}
        ${knopf('sicherung-zu', 'Schließen', 'btn-ghost')}
      </div>` : ''}
  </div>

  ${meineMittelKarte(s)}

  ${mittelKarte(s)}

  <div class="karte">
    <h3>Für den Arzttermin</h3>
    <p class="klein">Ein Blatt Text mit Zeitraum, Häufigkeit, Tageszeiten und
    dem, was auffällt. Zum Kopieren oder Ausdrucken.</p>
    <div class="reihe">
      ${seit ? knopf('bericht-seit', `Seit dem ${fmtDatum(seit)}`, 'btn-primary') : ''}
      ${knopf('bericht', 'Letzte 30 Tage', seit ? '' : 'btn-primary', 'data-n="30"')}
      ${knopf('bericht', '90 Tage', '', 'data-n="90"')}
      ${knopf('drucken', 'Drucken')}
    </div>
    <p class="klein">${seit
    ? `„Seit dem ${esc(fmtDatum(seit))}" deckt genau die Zeit seit deinem letzten
       Termin ab – das ist das Fenster, über das dort geredet wird, und keines
       der runden Zahlen daneben.`
    : '30 und 90 Tage sind runde Zahlen ohne Bedeutung. Trag unten deinen letzten Termin ein, dann deckt der Bericht genau die Zeit seitdem ab.'}</p>
    <p class="klein">„Drucken" nimmt den Reiter <b>Muster</b> mit aufs Papier –
    also die Einordnung, die Warnzeichen und den Verlauf als Bild. Das sagt in
    der Sprechstunde mehr als eine Textspalte.</p>
  </div>
  ${bericht}

  ${gewichtKarte(s)}

  ${erinnerungKarte(s)}

  <div class="karte">
    <h3>Arzttermine</h3>
    <p class="klein">Wann du dort warst. Mehr braucht es nicht – daraus weiß der
    Bericht, über welchen Zeitraum er berichten soll.</p>
    <input type="date" class="feld" data-act="termin-neu" max="${heuteISO()}"
           value="" aria-label="Datum eines Arzttermins">
    ${(s.termine || []).length ? `<ul class="wartend">${s.termine.map((t) => `<li>
      <span>${esc(fmtDatum(t, true))}</span>
      <span class="klein">${t === seit ? 'der letzte' : ''}
        <button type="button" class="strang-weg" data-act="termin-weg"
                data-iso="${t}" aria-label="Termin löschen">×</button></span>
    </li>`).join('')}</ul>` : '<p class="klein">Noch keiner eingetragen.</p>'}
  </div>

  <div class="karte">
    <h3>Auswertung</h3>
    <p class="feld-name">Beschwerden zählen bis <b>${s.fenster} Stunden</b> nach dem Essen</p>
    <div class="wahl">${[2, 3, 4, 6, 8].map((n) => `
      <button type="button" class="wahl-btn${s.fenster === n ? ' an' : ''}"
              data-act="fenster" data-n="${n}">${n} h</button>`).join('')}</div>
    <p class="feld-name">Erst ab <b>${s.mindestFaelle}</b> Fällen etwas sagen</p>
    <div class="wahl">${[3, 5, 8, 12].map((n) => `
      <button type="button" class="wahl-btn${s.mindestFaelle === n ? ' an' : ''}"
              data-act="mindest" data-n="${n}">${n}</button>`).join('')}</div>
  </div>

  <div class="karte">
    <h3>Eigene Auslöser</h3>
    <p class="klein">Was in der Liste fehlt – ein bestimmtes Gericht, ein
    Getränk, ein Medikament, das man nicht als Medikament einträgt.</p>
    ${s.eigeneAusloeser.length ? `<ul class="wartend">${s.eigeneAusloeser.map((a) => `<li>
      <span>${esc(a.name)}</span>
      <button type="button" class="strang-weg" data-act="ausloeser-weg" data-id="${esc(a.id)}"
              aria-label="Auslöser entfernen">×</button>
    </li>`).join('')}</ul>` : '<p class="klein">Noch keine.</p>'}
    <div class="reihe">
      <input type="text" class="feld" id="neuerAusloeser" placeholder="z. B. Rotwein"
             aria-label="Name des eigenen Auslösers">
      ${knopf('ausloeser-neu', 'Hinzufügen')}
    </div>
  </div>

  ${eigeneAktivKarte(s)}

  <div class="karte">
    <h3>Seit wann hast du das?</h3>
    <p class="klein">Die eine Angabe, die aus dem Tagebuch nicht hervorgeht – es
    beginnt an dem Tag, an dem du anfängst zu schreiben, und das ist fast nie
    der Tag, an dem es angefangen hat. Für den Reizdarm-Kasten unter „Muster"
    rechnet Body Check mit einem Beginn vor mindestens sechs Monaten; ohne
    diese Zeile bleibt dort eine Bedingung offen. Ungefähr genügt.</p>
    <input type="month" class="feld" data-act="seit" max="${heuteISO().slice(0, 7)}"
           value="${esc(s.beschwerdenSeit || '')}" aria-label="Monat, seit dem die Beschwerden bestehen">
    ${s.beschwerdenSeit ? `<p class="klein">Notiert: seit ${esc(s.beschwerdenSeit)}.
      ${knopf('seit-weg', 'Löschen', 'btn-ghost')}</p>` : ''}
  </div>

  ${befundeKarte(s)}

  ${mitdenkenKarte(s)}

  <div class="karte">
    <h3>Welche Fragen stellt der Tag?</h3>
    <p class="klein">Nicht jede Frage will jeder beantworten. Was hier aus ist,
    erscheint nicht in der Tagesansicht – schon Eingetragenes bleibt erhalten
    und wird weiter mitgerechnet.</p>
    ${marken(TAGESFRAGEN.filter((f) => f.gruppe !== 'spannung'), s.tagesfragen || [], 'frageAn')}
  </div>

  ${wasserKarte(s)}

  <div class="karte">
    <h3>Ton</h3>
    <p class="klein">Nur für die Atemübung unter „Ruhe". Sonst gibt diese App
    keinen Laut von sich.</p>
    <div class="wahl">
      <button type="button" class="wahl-btn${s.ton !== false ? ' an' : ''}" data-act="ton">
        ${s.ton !== false ? 'Ton ist an' : 'Ton ist aus'}</button>
    </div>
  </div>

  <div class="karte">
    <h3>Farbe</h3>
    <div class="wahl">${THEMEN.map((t) => `
      <button type="button" class="wahl-btn${s.theme === t.id ? ' an' : ''}"
              data-act="theme" data-id="${t.id}">${t.name}</button>`).join('')}</div>
  </div>

  <div class="karte">
    <h3>Was diese App nicht tut</h3>
    <p class="klein"><b>Deine Gesundheitsdaten gehen nirgendwohin.</b> Kein
    Server, kein Konto, keine Anmeldung, keine Zählung von Aufrufen. Was du
    isst, wie es dir geht, was du nimmst – das bleibt auf diesem Gerät.</p>
    <p class="klein">Das Einzige, was diese App je verschickt, sind die
    Verbesserungsvorschläge unter „Ideen". Die gehen von selbst raus, kurz
    nachdem du sie eingetragen hast – dort steht das auch. Sonst nichts.</p>
    <p class="klein">Sie stellt auch keine Diagnose und ersetzt keine ärztliche
    Beratung – sie zählt nur mit, was eingetragen wird.</p>
  </div>

  <div class="karte">
    <h3>Alles löschen</h3>
    <p class="klein">Entfernt jede Eintragung aus diesem Browser. Nicht
    rückgängig zu machen.</p>
    ${knopf('alles-weg', 'Tagebuch löschen', 'btn-danger')}
  </div>`;
}

/*
 * Was Body Check mitdenken soll: zwei Schalter, für alle, die sie brauchen.
 *
 * Beide sind dreiwertig (siehe VORGABE in js/store.js) und zeigen „an" nur
 * bei true. Keiner ändert eine Zahl – gerechnet wird ohnehin, die Schalter
 * entscheiden nur, was gefragt und gezeigt wird. Darunter je ein Abschnitt
 * „Was dazu bekannt ist": was Studien und Fachinformationen sagen, und wo
 * die Grenze dessen liegt, was ein Tagebuch zeigen kann. Die Quellen stehen
 * außerhalb des Repositorys beim Nachweis der übrigen Wissenstexte.
 *
 * Mit „Kiefer, Nacken, Schiene" stehen die vier Fragen hier als Marken – wer
 * keine Schiene trägt, wählt sie ab. Unter „Welche Fragen stellt der Tag?"
 * stehen sie nicht noch einmal.
 *
 * In der Fassung 30 geändert, mit Quelle hier:
 *
 *   * Magen-Darm und ADHS: „Reizdarm, Verstopfung und Reizmagen sind bei ADHS
 *     in großen Studien häufiger beschrieben" ist gestrichen – keine
 *     erreichbare Quelle, und das Repository nannte keine Studie. Es bleibt,
 *     was ein Tagebuch nicht kann.
 *   * Kopfschmerz und ADHS: ICHD-3, Kapitel 12, Einleitung (ichd-3.org): „In
 *     children and adolescents, primary headache disorders (1. Migraine,
 *     2.2 Frequent episodic tension-type headache and, especially, 2.3
 *     Chronic tension-type headache) are often comorbid with psychiatric
 *     disorder. Sleep disorders, …, attention-deficit/hyperactivity disorder
 *     (ADHD), … should be carefully looked for". „Für Spannungskopfschmerz
 *     fand eine Übersichtsarbeit keinen Zusammenhang" ließ sich nicht prüfen
 *     (die Abstracts waren nicht abrufbar) und ist gestrichen.
 *   * Knirschen im Schlaf: „merkt man selbst oft nicht" nennt keine
 *     erreichbare Quelle; der Satz sagt jetzt nur, warum Body Check am
 *     Morgen fragt.
 *   * Aufbissschiene: Health Technol Assess 2020;24(7) (PMID 32065109,
 *     Abstract): „did not demonstrate that splints reduced pain in
 *     temporomandibular disorders" und „There is insufficient evidence to
 *     determine whether or not splints reduce tooth wear in patients with
 *     bruxism"; zu Kopfschmerz J Oral Rehabil 2025;52(6):937-948 (PMID
 *     40312780, Abstract): „without certainty of their effects". Dass die
 *     Schiene „vor allem zum Schutz der Zähne gedacht" sei, steht in keiner.
 *   * Massagepistolen: J Funct Morphol Kinesiol 2023;8(3):138 (PMID
 *     37754971, Abstract): „281 records were screened, but only 11 could be
 *     included" – untersucht Beweglichkeit, Kraft und Erholung, nicht
 *     Kopfschmerz. „Meist mit Sportlern" und „keine abgeschlossene" zu
 *     Kopfschmerz trägt der Abstract nicht.
 */
const WISSEN_ADHS = 'Ob Magen-Darm-Beschwerden mit ADHS, den Mitteln, der Stimmung oder dem Essen '
  + 'zusammenhängen, kann ein Tagebuch nicht klären – das lässt sich in der Praxis besprechen. '
  + 'Bei Kindern und Jugendlichen kommen Migräne und Spannungskopfschmerz laut internationaler '
  + 'Kopfschmerzklassifikation oft zusammen mit psychischen Störungen vor; ADHS steht dort unter '
  + 'denen, nach denen gezielt geschaut werden soll. Kopfschmerz steht bei den meisten ADHS-Mitteln '
  + 'unter den häufigen Nebenwirkungen. Späteres Einschlafen gehört oft zu ADHS selbst; Stimulanzien können den Schlaf '
  + 'zusätzlich stören – beides lässt sich in einem Tagebuch nicht trennen. Knirschen und Pressen sind '
  + 'bei Kindern und Jugendlichen mit ADHS häufiger beschrieben, für Erwachsene gibt es erst kleine '
  + 'Studien; bei Methylphenidat steht Zähneknirschen in den Fachinformationen als häufige '
  + 'Nebenwirkung. Body Check rechnet nichts davon für dich aus – es zählt, was du einträgst, und '
  + 'stellt es nebeneinander.';
const WISSEN_SPANNUNG = 'Pressen und Knirschen gilt bei sonst Gesunden als Verhalten, nicht als '
  + 'Krankheit. Nach dem Kiefer fragt Body Check am Morgen, weil sich das, was nachts war, erst '
  + 'danach eintragen lässt. Ob eine Aufbissschiene die Zähne vor Abrieb schützt oder Kiefer- oder '
  + 'Kopfschmerz verringert, ist in Studien nicht sicher belegt. Das ist kein Grund, sie '
  + 'wegzulassen – ob und wie lange sie getragen wird, gehört in die Zahnarztpraxis. Bei Menschen mit '
  + 'bekannter Schlafapnoe stiegen in einer kleinen Studie die Atemaussetzer mit einer '
  + 'Oberkieferschiene teils an; ob das allgemein gilt, ist nicht geklärt. Schnarchen oder '
  + 'Atemaussetzer gehören in der Zahnarzt- oder Hausarztpraxis erwähnt. Zu Massagepistolen fand eine '
  + 'Übersichtsarbeit von 2023 nur elf Studien, vor allem zu Beweglichkeit, Kraft und Erholung; '
  + 'Kopfschmerz war darin kein Thema. Nackenschmerz haben '
  + 'auch etwa drei von vier Menschen mit Migräne (in Klinikstudien) – er sagt allein nichts über die '
  + 'Art des Kopfschmerzes. Body Check bestätigt oder widerlegt keine ärztliche Einschätzung – es '
  + 'zählt, ob Kopfschmerz mit diesen Dingen zusammen öfter oder seltener kommt.';

function mitdenkenKarte(s) {
  const schalter = (act, an, name) => `<div class="wahl">
    <button type="button" class="wahl-btn${an ? ' an' : ''}" data-act="${act}"
            aria-pressed="${an}">${an ? '✓ ' : ''}${name}</button>
  </div>`;
  const adhs = s.adhsAn === true;
  const spannung = s.spannungAn === true;
  const fragen = TAGESFRAGEN.filter((f) => f.gruppe === 'spannung');
  return `<div class="karte" id="mitdenken">
    <h3>Was Body Check mitdenken soll</h3>
    ${schalter('adhs-schalter', adhs, 'ADHS')}
    <p class="klein">Für alle, die ein ADHS-Mittel nehmen oder ADHS im Tagebuch mitdenken
    wollen. Ausgeschaltet ändert sich keine Zahl.</p>
    <details class="wissen"><summary>Was dazu bekannt ist</summary>
      <p class="klein">${esc(WISSEN_ADHS)}</p>
    </details>
    ${schalter('spannung-schalter', spannung, 'Kiefer, Nacken, Schiene')}
    <p class="klein">Fragt am Tag nach Nacken, Kiefer, Pressen und Schiene und zeigt im
    Kopfbogen drei Merkmale mehr.</p>
    ${spannung ? `<p class="feld-name">Diese Fragen stellt der Tag</p>
      ${marken(fragen, s.tagesfragen || [], 'frageAn')}` : ''}
    <details class="wissen"><summary>Was dazu bekannt ist</summary>
      <p class="klein">${esc(WISSEN_SPANNUNG)}</p>
    </details>
  </div>`;
}

/*
 * Eigene Aktivitäten anlegen und entfernen – ohne dabei etwas einzutragen.
 *
 * Wie die eigenen Auslöser darüber. Entfernen nimmt nur aus der Auswahl; die
 * Einträge damit bleiben, wie sie sind, und behalten ihren Namen.
 *
 * Heißt eine eigene wie eine, die es inzwischen fest gibt („Massagepistole"
 * aus einer älteren Fassung), steht das darunter – sonst stünden im Bogen
 * zwei gleich beschriftete Knöpfe, ohne dass man wüsste, warum.
 */
function eigeneAktivKarte(s) {
  const liste = sichtbareEigene(s.eigeneAktivitaeten);
  const voll = liste.length >= store.AKTIV_HOECHSTENS;
  const fest = (a) => {
    const da = eingebauteGleichnamig(a.name);
    return da ? `<span class="klein eigen-fest">„${esc(da.name)}“ gibt es jetzt auch fest eingebaut.
      Deine eigene bleibt mit allen Einträgen.</span>` : '';
  };
  // Die Eingabereihe wie im Bogen (.aktiv-eigen): Das Feld nimmt, was der
  // Knopf übrig lässt, statt bei 320 Pixeln über den Kartenrand zu ragen.
  return `<div class="karte" id="eigeneAktivitaeten">
    <h3>Eigene Aktivitäten</h3>
    <p class="klein">Was unter „Aktivität“ in der Auswahl fehlt – ein Sport, ein Ort,
    eine Gewohnheit. Entfernst du eine, bleiben die Einträge damit.</p>
    ${liste.length ? `<ul class="wartend">${liste.map((a) => `<li>
      <span>${esc(a.name)}${fest(a)}</span>
      <span class="strang-weg-platz">${loeschKnopf('aktiv-weg', a.id, {
    normal: '×', frage: 'Entfernen?', sagt: `${a.name} aus der Auswahl nehmen`, klasse: 'strang-weg',
  })}</span>
    </li>`).join('')}</ul>` : '<p class="klein">Noch keine.</p>'}
    ${voll ? `<p class="klein">Mehr als ${store.AKTIV_HOECHSTENS} passen nicht. Entferne erst eine,
      die du nicht mehr brauchst.</p>` : `<div class="reihe aktiv-eigen">
      <input type="text" class="feld" id="neueAktivitaet" maxlength="${store.AKTIV_NAME_MAX}"
             placeholder="z. B. Klettern" aria-label="Name der eigenen Aktivität">
      ${knopf('aktiv-neu', 'Hinzufügen')}
    </div>`}
  </div>`;
}

/*
 * Wasser ein- und ausblenden, und wie groß ein Glas ist.
 *
 * Ausgeblendet heißt nur: nicht auf „Tag“. Schon Gezähltes bleibt und steht
 * weiter im Bericht – wie bei den Tagesfragen, die man abschaltet.
 */
function wasserKarte(s) {
  const an = s.wasserZeigen !== false;
  const glas = glasMl(s.wasserGlas);
  return `<div class="karte" id="wasserKarte">
    <h3>Wasser</h3>
    <p class="klein">Auf „Tag“ zählst du mit einem Tipp, wie viele Gläser du
    getrunken hast. Das ist kein Eintrag und keine Mahlzeit. Ein Tag, an dem
    nur Wasser steht, gilt deshalb nicht als Tag ohne Beschwerden.</p>
    <div class="wahl">
      <button type="button" class="wahl-btn${an ? ' an' : ''}" data-act="wasser-zeigen"
              aria-pressed="${an}">${an ? 'Wasser zählen ist an' : 'Wasser zählen ist aus'}</button>
    </div>
    <p class="feld-name">Ein Glas sind</p>
    <div class="wahl">${GLAS_GROESSEN.map((ml) => `
      <button type="button" class="wahl-btn${glas === ml ? ' an' : ''}" data-act="wasser-glas"
              data-n="${ml}" aria-pressed="${glas === ml}">${glasName(ml)}</button>`).join('')}</div>
    <p class="klein">Gezählt werden Gläser – die Liter daneben sind nur
    umgerechnet. Schon Gezähltes bleibt, auch wenn du das Zählen ausschaltest.</p>
  </div>`;
}

/* ---------- Was die Mittel bewirken ---------- */

/*
 * „Meine Mittel" anlegen, ändern, entfernen – ohne dabei etwas einzutragen.
 *
 * Bisher entstand ein eigenes Mittel nur im Medikamenten-Bogen, also nur
 * zusammen mit einer Einnahme. Wer seine täglichen Tabletten einmal in Ruhe
 * anlegen will, bevor er die erste davon nimmt, oder die Dosis ändern muss,
 * weil die Praxis sie geändert hat, braucht dafür einen Ort ohne Bogen.
 */
function meineMittelKarte(s) {
  const f = ui.mittelForm;
  const voll = s.standardMittel.length >= store.STANDARD_HOECHSTENS;
  const wahl = (liste, act, aktiv) => `<div class="marken marken-eng">${liste.map((x) => `
    <button type="button" class="marke${aktiv === x.id ? ' an' : ''}" data-act="${act}"
            data-id="${x.id}" aria-pressed="${aktiv === x.id}">${x.name}</button>`).join('')}</div>`;
  const formular = () => `<div class="mittel-formular">
    <label class="feld-name" for="mmName">Name</label>
    <input type="text" class="feld feld-breit" id="mmName" data-act="mm-name"
           value="${esc(f.mittel)}" placeholder="z. B. Pantoprazol" autocomplete="off">
    <label class="feld-name" for="mmDosis">Dosis</label>
    <input type="text" class="feld feld-breit" id="mmDosis" data-act="mm-dosis"
           value="${esc(f.dosis)}" placeholder="z. B. 40 mg" autocomplete="off">
    <p class="feld-name">Wann du es üblicherweise nimmst</p>
    ${wahl(TAGESZEITEN, 'mm-tageszeit', f.tageszeit)}
    ${wahl(ESSENSBEZUG, 'mm-bezug', f.bezug)}
    <p class="klein">Ohne Zeit trägt ein Tipp heute mit der jetzigen Uhrzeit ein,
    an einem anderen Tag öffnet sich der Bogen.</p>
    <div class="reihe">
      ${knopf('mm-speichern', f.id ? 'Speichern' : 'Hinzufügen', 'btn-primary')}
      ${knopf('mm-abbrechen', 'Abbrechen', 'btn-ghost')}
    </div>
  </div>`;
  /*
   * Bei Methylphenidat das Präparat mit seiner Form: Was zum Essen und zu
   * Säureblockern gilt, steht je nach Präparat verschieden in der Fach- oder
   * Gebrauchsinformation. Die Formbezeichnung allein unterscheidet das nicht
   * immer – Medikinet retard und Ritalin LA sind beide „Hartkapsel mit
   * veränderter Wirkstofffreisetzung" (je Abschnitt 3), aber nur bei Medikinet
   * retard stehen Säureblocker unter den Gegenanzeigen (4.3) und die Einnahme
   * mit oder nach einer Mahlzeit (4.2); Ritalin LA „können zusammen mit oder
   * ohne Nahrung eingenommen werden" (www.fachinfo.de/fi/pdf/009621, Stand
   * Dezember 2025; 010445, Stand September 2025). Deshalb nennt die Liste
   * Präparatnamen. Ein zweiter Tipp nimmt die Wahl zurück.
   */
  const formWahl = (m) => {
    const g = wissenZu(m.mittel);
    if (!g || g.id !== 'mph') return '';
    return `<div class="mm-form" role="group" aria-label="${esc(`Form von ${mittelName(m)}`)}">
      <p class="feld-name">Welche Form? (steht auf der Packung)</p>
      <div class="marken marken-eng">${MPH_FORMEN.map((x) => `
        <button type="button" class="marke${m.form === x.id ? ' an' : ''}" data-act="mph-form"
                data-mittel="${esc(m.id)}" data-id="${x.id}" aria-pressed="${m.form === x.id}">${esc(x.name)}</button>`).join('')}</div>
    </div>`;
  };
  const zeile = (m) => (f && f.id === m.id ? `<li class="mm-offen">${formular()}</li>` : `<li class="${formWahl(m) ? 'mm-mit-form' : ''}">
    <span>${esc(mittelName(m))}<span class="zeile-tags">${esc(vorlageText(m) || 'ohne übliche Zeit')}</span></span>
    <span class="mm-knoepfe">
      ${knopf('meinmittel-aendern', 'Ändern', 'btn-ghost btn-klein', `data-id="${esc(m.id)}" aria-label="${esc(mittelName(m))} ändern"`)}
      <span class="strang-weg-platz">${loeschKnopf('meinmittel-weg', m.id, {
    normal: '×', frage: 'Entfernen?', sagt: `${mittelName(m)} entfernen`, klasse: 'strang-weg',
  })}</span>
    </span>
    ${formWahl(m)}
  </li>`);
  // Alle Hinweise zu Paaren, auch die schon gelesenen und die der Stufen B
  // und C – hier ist die Stelle, an der man sie wiederfindet.
  const hinweise = wechselHinweise(s.standardMittel, s.eintraege, heuteISO());
  const hinweisTeil = hinweise.length ? `<p class="feld-name">Hinweise zu deinen Mitteln</p>
    <ul class="wechsel-liste">${hinweise.map((h) => `<li>
      <b>${esc(h.namen.join(' und '))}</b>
      <p class="klein">${esc(h.text)}</p>
    </li>`).join('')}</ul>` : '';
  return `<div class="karte" id="meineMittel">
    <h3>Meine Mittel</h3>
    <p class="klein">Was du regelmäßig nimmst, mit Dosis und üblicher Zeit. Es steht
    dann auf dem Tag-Reiter als Knopf: ein Tipp, und die Einnahme ist eingetragen.
    Hier anlegen trägt noch nichts ein.</p>
    ${s.standardMittel.length ? `<ul class="wartend meine-mittel">${s.standardMittel.map(zeile).join('')}</ul>`
    : '<p class="klein">Noch keins angelegt.</p>'}
    ${hinweisTeil}
    ${f && !f.id ? formular() : ''}
    ${f ? '' : (voll
    ? `<p class="klein">${vollSatzHier(s)}</p>`
    : `<div class="reihe">${knopf('meinmittel-neu', 'Mittel hinzufügen')}</div>`)}
  </div>`;
}

function mittelKarte(s) {
  // Was tatsächlich eingetragen wurde – das steht oben, alles andere darunter.
  const eigene = new Map();
  s.eintraege.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = String(e.mittel || '').trim();
    if (!name) return;
    const v = eigene.get(name) || { name, anzahl: 0, zuletzt: e.am };
    v.anzahl += 1;
    if (e.am > v.zuletzt) v.zuletzt = e.am;
    eigene.set(name, v);
  });
  const meine = [...eigene.values()].sort((a, b) => b.anzahl - a.anzahl);

  /*
   * Bei Methylphenidat entscheidet die Form, was für den Magen gilt – deshalb
   * steht sie beim eigenen Mittel dabei und unter der Gruppe ein Abschnitt je
   * Form. „Form nicht angegeben" ist auch eine Auskunft: Dann fehlt die
   * Angabe, nach der sich die Hinweise richten.
   */
  const formTeil = (f) => `<p><b>${esc(f.name)}.</b> ${esc(f.einnahme)}`
    + `${f.saeure ? ` ${esc(f.saeure)}` : ''}${f.extra ? ` ${esc(f.extra)}` : ''}</p>`;
  const block = (g) => `<details class="mittel">
    <summary><b>${esc(g.gruppe)}</b>${g.kuerzel ? ` <span class="klein">(${esc(g.kuerzel)})</span>` : ''}
      <span class="zeile-tags">${esc(g.kurz)}</span></summary>
    <p><b>Wie es wirkt.</b> ${esc(g.wirkung)}</p>
    ${g.einnahme && g.einnahme !== '–' ? `<p><b>Wann man es nimmt.</b> ${esc(g.einnahme)}</p>` : ''}
    ${g.nebenwirkung ? `<p><b>Was in der Fachinformation steht.</b> ${esc(g.nebenwirkung)}</p>` : ''}
    <p><b>Worauf zu achten ist.</b> ${esc(g.hinweis)}</p>
    ${g.id === 'mph' ? `<div class="mittel-formen">
      <p class="feld-name">Je nach Form</p>
      ${MPH_FORMEN.map(formTeil).join('')}
    </div>` : ''}
    <p class="klein">Zum Beispiel: ${esc(g.beispiele.join(', '))}</p>
  </details>`;

  return `<div class="karte">
    <h3>Was die Mittel bewirken</h3>
    <p class="klein">Allgemeine Information, keine Beratung – und ausdrücklich
    keine Dosierungen. Was für dich gilt, steht auf deiner Packung und sagt dir
    deine Ärztin oder deine Apotheke.</p>

    ${meine.length ? `<p class="feld-name">Was du eingetragen hast</p>
      <ul class="wartend">${meine.map((m) => {
        const g = wissenZu(m.name);
        const form = g && g.id === 'mph' ? mphForm(formZu(m.name, s.standardMittel, s.eintraege, heuteISO())) : null;
        return `<li>
          <span>${esc(m.name)}<span class="zeile-tags">${g ? esc(g.kurz) : 'nicht in der Übersicht – frag in der Apotheke nach'}</span>${form ? `<span class="zeile-tags">Form: ${esc(form.kurzname)}</span>` : ''}</span>
          <span class="klein">${mehrzahl(m.anzahl, 'Mal', 'Mal')}</span>
        </li>`;
      }).join('')}</ul>`
    : '<p class="klein">Sobald du ein Medikament einträgst, steht es hier mit dem, was es bewirkt.</p>'}

    <div class="reihe" style="margin-top:10px">
      ${knopf('mittel', ui.mittel ? 'Übersicht schließen' : 'Alle Mittel im Überblick')}
    </div>

    ${ui.mittel ? `
      <div class="mittel-liste">
        ${MITTEL_WISSEN.map(block).join('')}
        <p class="feld-name">Was den Magen von der anderen Seite belastet</p>
        ${REIZSTOFFE.map(block).join('')}
        <p class="feld-name">Schmerz- und Migränemittel</p>
        ${WEITERE_MITTEL.map(block).join('')}
        <p class="feld-name">Mittel bei ADHS</p>
        ${ADHS_MITTEL.map(block).join('')}
        <p class="feld-name">Sonst noch</p>
        ${SONSTIGE_MITTEL.map(block).join('')}
      </div>` : ''}
  </div>`;
}

/* ==================== Eingabebogen ==================== */

/* ==================== Ungefähre Zeiten ==================== */

/*
 * „morgens, mittags, abends" und „vor, beim, nach dem Essen" – mit einem
 * Tipp statt einer Uhrzeit.
 *
 * Wer im Nachhinein einträgt, weiß nicht mehr, ob die Tablette um 7:40 oder
 * um 8:05 war, aber sehr wohl, dass es morgens vor dem Frühstück war. Die Uhrzeit-Auswahl zwang bisher zu
 * einer Genauigkeit, die es nicht gab – und eine erfundene Minute ist
 * schlechter als eine ehrliche Tageszeit.
 *
 * Was ein Knopf einträgt, ist trotzdem eine Uhrzeit, damit alles, was nach
 * Tag, Tageszeit und Mahlzeit fragt, weiter funktioniert: „nach dem Essen"
 * liegt eine halbe Stunde hinter der Mahlzeit dieser Tageszeit und gehört
 * damit zu genau dieser Mahlzeit. Der Eintrag trägt aber `ungefaehr: true`.
 * Das Zeitprofil (js/zeitprofil.js), das auf die Stunde genau fragt, wie
 * lange nach dem Essen etwas kommt, zählt solche Mahlzeiten deshalb als nicht
 * erhoben – sonst landete jede „nach dem Essen"-Beschwerde künstlich im
 * frühen Fenster.
 *
 * Uhrzeit und Fenster der drei Tageszeiten stehen in js/datum.js, bei der
 * Einteilung, nach der die Auswertung zählt. Zwei Listen, die sich
 * widersprechen konnten, gab es schon einmal: „abends" trug 18:30 ein, und die
 * Auswertung zählte erst ab 19 Uhr als Abend.
 */
const TAGESZEITEN = Object.entries(KNOPF_TAGESZEIT).map(([id, t]) => ({ id, name: id, um: t.um }));
/*
 * „beim Essen" liegt zehn Minuten nach dem Beginn der Mahlzeit und nicht auf
 * derselben Minute. Die Auswertung rechnet eine Beschwerde, die zur selben
 * Minute wie die Mahlzeit eingetragen ist, ausdrücklich *nicht* dieser
 * Mahlzeit zu (sie war schon da, siehe folgende() in js/auswertung.js). Wer
 * „beim Essen" tippt, meint aber: während ich esse.
 */
const ESSENSBEZUG = [
  { id: 'vor', name: 'vor dem Essen', minuten: -30 },
  { id: 'beim', name: 'beim Essen', minuten: 10 },
  { id: 'nach', name: 'nach dem Essen', minuten: 30 },
];
// Wobei der Bezug zum Essen etwas aussagt. Bei einer Mahlzeit selbst nicht,
// beim Stuhlgang und beim Kopf kaum.
const MIT_ESSENSBEZUG = ['beschwerde', 'medikament'];

function minutenVon(um) {
  const [h, m] = String(um || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

function uhrVon(minuten) {
  // Ungefähr heißt nicht „am Vortag": Über Mitternacht wird nicht gerechnet.
  const x = Math.max(0, Math.min(23 * 60 + 59, Math.round(minuten)));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(x / 60))}:${p(x % 60)}`;
}

/** Nachts gibt es keine Knopf-Tageszeit – dann höchstens so weit entfernt. */
const NACHTS_HOECHSTENS_MIN = 3 * 60;

/**
 * Die Mahlzeit, an der ein Bezug zum Essen einrastet – oder null.
 *
 * Ist eine Tageszeit gewählt, kommen nur die Mahlzeiten dieser Tageszeit in
 * Frage (Fenster in js/datum.js), und von ihnen die, die der Uhrzeit am
 * nächsten liegt. Sonst rastete „abends, nach dem Essen" am Frühstück ein,
 * wenn das Abendessen noch nicht eingetragen ist – mit 08:15 als
 * „Abendzeit".
 *
 * Ohne gewählte Tageszeit gilt still die Tageszeit der Uhrzeit, aus demselben
 * Grund: 20:30 und „nach dem Essen" meint das Abendessen, auch wenn bisher
 * nur das Frühstück dasteht. Früher galt dann die nächste Mahlzeit des ganzen
 * Tages, und die Abendbeschwerde wanderte auf halb acht am Morgen – je
 * nachdem, welche Mahlzeit zuerst nachgetragen war. Nachts, wo es keine
 * Tageszeit gibt, nur eine Mahlzeit höchstens drei Stunden entfernt. Ohne
 * gültige Uhrzeit gibt es nichts, wovon aus zu suchen.
 */
function bezugsMahlzeit(s, am, um, tageszeit = null) {
  const ziel = minutenVon(um);
  if (!tageszeit && !istUhr(um)) return null;
  const fenster = tageszeit || knopfTageszeit(um);
  let beste = null;
  s.eintraege.filter((x) => x.art === 'essen' && x.am === am
    && (fenster ? tageszeitVon(x) === fenster
      : Math.abs(minutenVon(x.um) - ziel) <= NACHTS_HOECHSTENS_MIN)).forEach((x) => {
    const abstand = Math.abs(minutenVon(x.um) - ziel);
    if (!beste || abstand < beste.abstand) beste = { e: x, abstand };
  });
  return beste ? beste.e : null;
}

/** Die beiden Knopfreihen unter der Uhrzeit. */
function zeitKnoepfe(art, e) {
  const reihe = (liste, act, aktiv) => `<div class="marken marken-eng">${liste.map((x) => `
    <button type="button" class="marke${aktiv === x.id ? ' an' : ''}" data-act="${act}"
            data-id="${x.id}" aria-pressed="${aktiv === x.id}">${x.name}</button>`).join('')}</div>`;
  // Ohne Mahlzeit sagt der Bogen, womit er gerechnet hat – und dass die Zeit
  // nachrückt, sobald die Mahlzeit eingetragen ist (siehe nachziehen).
  const ohne = e.bezug && !e.bezugMahlzeit
    ? (e.tageszeit
      ? ` – an diesem Tag steht ${esc(e.tageszeit)} noch keine Mahlzeit, gerechnet wird mit der Tageszeit`
      : ' – um diese Zeit steht an diesem Tag noch keine Mahlzeit, gerechnet wird mit der Uhrzeit')
      + '. Trägst du sie nach, rückt die Zeit mit'
    : '';
  const hinweis = e.ungefaehr
    ? `<p class="klein zeit-hinweis">Ungefähr${ohne}.
      Zählt für den Tag und die Mahlzeit, nicht für die Minute.</p>`
    : '';
  return `<div class="zeit-knoepfe" id="bogenZeitKnoepfe" role="group" aria-label="Ungefähre Zeit">
    ${reihe(TAGESZEITEN, 'zeit-tageszeit', e.tageszeit)}
    ${MIT_ESSENSBEZUG.includes(art) ? reihe(ESSENSBEZUG, 'zeit-bezug', e.bezug) : ''}
    ${hinweis}
  </div>`;
}

/**
 * Die Uhrzeit für einen Bezug zum Essen, ausgehend von einer Grundzeit – an
 * der Mahlzeit dieser Tageszeit (ohne gewählte: der der Grundzeit, siehe
 * bezugsMahlzeit), und ohne eine solche von der Grundzeit aus.
 */
function zeitMitBezug(s, am, basis, bezugId, tageszeit = null) {
  const bezug = ESSENSBEZUG.find((x) => x.id === bezugId);
  const mahlzeit = bezugsMahlzeit(s, am, basis, tageszeit);
  const ab = mahlzeit ? minutenVon(mahlzeit.um) : minutenVon(basis);
  return { um: uhrVon(ab + bezug.minuten), bezugMahlzeit: mahlzeit ? mahlzeit.id : null };
}

/**
 * Tageszeit und Bezug zum Essen in Felder eines Eintrags umsetzen – dieselbe
 * Rechnung wie bei den Knöpfen. Ohne beides: ein leeres Ergebnis.
 */
function zeitAusVorlage(s, am, um, tageszeit, bezug) {
  const t = TAGESZEITEN.find((x) => x.id === tageszeit);
  if (!t && !bezug) return {};
  // Nur ein Bezug und keine Uhrzeit, von der aus er gälte: nichts rechnen.
  // Aus einem leeren Feld würde sonst 00:00, und daraus „00:30 nach dem Essen".
  if (!t && !istUhr(um)) return {};
  const basis = t ? t.um : um;
  const patch = {
    ungefaehr: true,
    tageszeit: t ? t.id : null,
    um: basis,
    bezugBasis: basis,
    bezug: null,
    bezugMahlzeit: null,
  };
  if (bezug && ESSENSBEZUG.some((x) => x.id === bezug)) {
    Object.assign(patch, { bezug }, zeitMitBezug(s, am, basis, bezug, t ? t.id : null));
  }
  return patch;
}

/*
 * Nachtragen in beliebiger Reihenfolge.
 *
 * Wer abends den Tag nachträgt, trägt die Tablette „morgens, vor dem Essen"
 * vielleicht ein, bevor das Frühstück dasteht. Dann hat der Bogen von der
 * Tageszeit aus gerechnet – und ohne diese Stelle bliebe die Tablette dort,
 * auch wenn zwei Minuten später das Frühstück um halb zehn dazukommt.
 *
 * Wird eine Mahlzeit angelegt, verschoben oder gelöscht, rasten deshalb die
 * ungefähren Einträge desselben Tages mit Bezug zum Essen neu ein: die, deren
 * Tageszeit zur Mahlzeit passt, die an genau dieser Mahlzeit hingen, und die,
 * die noch an keiner hängen. Ein Eintrag ohne gewählte Tageszeit rastet dabei
 * nur an einer Mahlzeit der Tageszeit seiner Grundzeit ein (siehe
 * bezugsMahlzeit) – so hängt das Ergebnis nicht davon ab, welche Mahlzeit
 * zuerst nachgetragen wird. Eine von Hand gesetzte Uhrzeit bleibt, wie sie
 * ist – die hat jemand gewusst.
 *
 * Zurück kommt der Satz für die Meldung, oder ''. Ein Eintrag, der still
 * wandert, ist einer, dem man nicht mehr traut.
 */
function nachziehen(mahlzeitId, vorher, nachher) {
  const s = store.zustandLesen();
  const tage = new Set([vorher && vorher.am, nachher && nachher.am].filter(Boolean));
  const passt = (e, m) => !!m && !!e.tageszeit && m.am === e.am && tageszeitVon(m) === e.tageszeit;
  let zuMahlzeit = 0;
  let zuTageszeit = 0;
  s.eintraege.filter((e) => tage.has(e.am) && e.ungefaehr && MIT_ESSENSBEZUG.includes(e.art)
    && ESSENSBEZUG.some((x) => x.id === e.bezug)
    && (e.bezugMahlzeit === mahlzeitId || !e.bezugMahlzeit || passt(e, vorher) || passt(e, nachher)))
    .forEach((e) => {
      const neu = zeitNeu(s, e);
      if (neu.um === e.um && (neu.bezugMahlzeit || null) === (e.bezugMahlzeit || null)) return;
      store.eintragAendern(e.id, neu);
      if (neu.bezugMahlzeit) zuMahlzeit += 1;
      else zuTageszeit += 1;
    });
  return [
    zuMahlzeit ? `${mehrzahl(zuMahlzeit, 'Eintrag', 'Einträge')} an die Mahlzeit angepasst.` : '',
    zuTageszeit ? `${mehrzahl(zuTageszeit, 'Eintrag', 'Einträge')} an die Tageszeit angepasst.` : '',
  ].filter(Boolean).join(' ');
}

/** Wo ein ungefährer Eintrag mit Bezug zum Essen jetzt hingehört. */
function zeitNeu(s, e) {
  const bezug = ESSENSBEZUG.find((x) => x.id === e.bezug);
  const t = TAGESZEITEN.find((x) => x.id === e.tageszeit);
  if (t) return zeitMitBezug(s, e.am, t.um, e.bezug, t.id);
  // Ohne Tageszeit: an der bisherigen Mahlzeit, solange es sie an diesem Tag
  // gibt, sonst an der, die ihrer Zeit am nächsten liegt – innerhalb der
  // Tageszeit dieser Zeit. Hing der Eintrag an einer Mahlzeit, die gelöscht
  // wurde, ist das deren Uhrzeit; er bleibt also in ihrer Tageszeit, statt
  // ans Mittagessen zu springen, und kommt zurück, wenn sie wieder dasteht.
  const bisher = s.eintraege.find((x) => x.id === e.bezugMahlzeit && x.art === 'essen' && x.am === e.am);
  if (bisher) return { um: uhrVon(minutenVon(bisher.um) + bezug.minuten), bezugMahlzeit: bisher.id };
  return zeitMitBezug(s, e.am, uhrVon(minutenVon(e.um) - bezug.minuten), e.bezug);
}

/**
 * Die Zeit im Bogen für einen anderen Tag neu rechnen.
 *
 * „Morgens, vor dem Essen" ist an jedem Tag eine andere Uhrzeit, denn es
 * hängt am Frühstück dieses Tages. Wer nach dem Knopf noch das Datum ändert,
 * meint den neuen Tag – stehen bliebe sonst die Zeit vom alten. Gezeichnet
 * wird nur, was sich ändert: Ein neu gezeichnetes Datumsfeld schlösse auf dem
 * iPhone die Auswahl, in der man gerade blättert.
 */
function zeitFuerNeuenTag() {
  const b = ui.bogen;
  const e = b && b.entwurf;
  if (!e || !e.ungefaehr) return;
  const t = TAGESZEITEN.find((x) => x.id === e.tageszeit);
  const bezug = MIT_ESSENSBEZUG.includes(b.art) ? ESSENSBEZUG.find((x) => x.id === e.bezug) : null;
  const basis = t ? t.um : (e.bezugBasis || (bezug ? uhrVon(minutenVon(e.um) - bezug.minuten) : e.um));
  entwurf(zeitAusVorlage(store.zustandLesen(), e.am, basis, e.tageszeit, bezug ? bezug.id : null), false);
  const uhr = document.getElementById('bogenUhr');
  if (uhr) uhr.value = e.um;
  const knoepfe = document.getElementById('bogenZeitKnoepfe');
  if (knoepfe) knoepfe.outerHTML = zeitKnoepfe(b.art, e);
}

/* ---------- Meine Mittel ---------- */

const gleichText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** „Pantoprazol 40 mg" */
const mittelName = (m) => `${m.mittel}${m.dosis ? ` ${m.dosis}` : ''}`;

/** „morgens, vor dem Essen" – die übliche Zeit eines Standardmittels. */
function vorlageText(m) {
  return [
    (TAGESZEITEN.find((x) => x.id === m.tageszeit) || {}).name,
    (ESSENSBEZUG.find((x) => x.id === m.bezug) || {}).name,
  ].filter(Boolean).join(', ');
}

/** „Pantoprazol 40 mg · morgens, vor dem Essen" */
const vorlageVoll = (m) => `${mittelName(m)}${vorlageText(m) ? ` · ${vorlageText(m)}` : ''}`;

/** Tageszeit und Bezug eines Entwurfs – so, wie sie beim Merken gelten. */
function entwurfZeit(e) {
  return e.ungefaehr
    ? { tageszeit: e.tageszeit || null, bezug: e.bezug || null }
    : { tageszeit: null, bezug: null };
}

/**
 * Die kurze Zeitangabe auf dem Knopf: die Tageszeit, und der Bezug zum Essen
 * nur dann, wenn es dasselbe Mittel zur selben Tageszeit noch einmal mit
 * anderem Bezug gibt – sonst stünden zwei gleiche Knöpfe da.
 */
function knopfZeit(m, alle) {
  const t = (TAGESZEITEN.find((x) => x.id === m.tageszeit) || {}).name;
  const b = (ESSENSBEZUG.find((x) => x.id === m.bezug) || {}).name;
  if (!t) return b || '';
  const zwilling = alle.some((x) => x.id !== m.id && x.tageszeit === m.tageszeit
    && gleichText(x.mittel, m.mittel) && gleichText(x.dosis, m.dosis));
  return zwilling && b ? `${t}, ${b}` : t;
}

/**
 * Steht dieses Mittel an diesem Tag schon? Name und Dosis müssen passen, und
 * hat es eine übliche Tageszeit, auch die: Sonst trüge die Morgentablette
 * schon das Häkchen der abendlichen, und die abendliche fehlte unbemerkt.
 */
function schonEingetragen(m, liste) {
  return liste.some((x) => x.art === 'medikament' && gleichText(x.mittel, m.mittel)
    && gleichText(x.dosis, m.dosis) && (!m.tageszeit || tageszeitVon(x) === m.tageszeit));
}

/**
 * Öffnet der Tipp auf dem Tag-Reiter den Bogen, statt einzutragen? An einem
 * vergangenen Tag ohne übliche Tageszeit – siehe 'standard-eintragen'. Eine
 * Stelle für Knopf und Handler, damit die Ansage nie etwas anderes sagt, als
 * der Tipp tut.
 */
const mittelImBogen = (m, iso) => iso !== heuteISO() && !TAGESZEITEN.some((x) => x.id === m.tageszeit);

/*
 * „jetzt genommen": Mit eingeschaltetem „ADHS" trägt der Knopf eines
 * ADHS-Mittels heute die genaue Uhrzeit ein – ohne Tageszeit, ohne Bezug zum
 * Essen. Bei diesen Mitteln zählen die Stunden danach, und „morgens" ist für
 * Stunden zu ungenau. An anderen Tagen und ohne Schalter bleibt alles wie
 * bisher.
 */
const jetztModus = (s, m, iso) => !!s && s.adhsAn === true && iso === heuteISO() && istAdhsMittel(m.mittel);

/*
 * Die Einnahmen, die im Jetzt-Modus zu diesem Knopf gehören.
 *
 * Nicht wie schonEingetragen() über die Tageszeit: Der Jetzt-Eintrag trägt
 * keine, und die Tageszeit seiner Uhrzeit sagt nichts darüber, welcher Knopf
 * getippt wurde. Die Morgentablette um 11:20 läge sonst „mittags", passte zu
 * keinem Knopf, und ein genommenes Mittel stünde weiter als offen da – nach
 * zwei Stunden trüge ein zweiter Tipp ohne Rückfrage noch eine Einnahme ein.
 *
 * Darum zählen Name und Dosis. Gibt es dasselbe Mittel in derselben Dosis
 * mehrmals unter „Meine Mittel" (morgens und mittags), gehen die Einnahmen
 * des Tages der Reihe nach an die Knöpfe: die früheste an den frühesten
 * (morgens, mittags, abends, ohne Tageszeit), überzählige an den letzten.
 * Welcher Knopf getippt wurde, steht nirgends; im Jetzt-Modus sehen die
 * Knöpfe ohnehin gleich aus, und die Reihenfolge kommt ohne neues Feld aus.
 * Nur eine ungefähre Einnahme mit gewählter Tageszeit sagt selbst, wohin sie
 * gehört, und bekommt zuerst einen Knopf dieser Tageszeit.
 */
const RANG_TAGESZEIT = { morgens: 0, mittags: 1, abends: 2 };
function einnahmenJetzt(m, liste, alle) {
  const gleich = (x) => gleichText(x.mittel, m.mittel) && gleichText(x.dosis, m.dosis);
  const nachZeit = (a, b) => minutenAmTag(a.um) - minutenAmTag(b.um);
  const einnahmen = liste.filter((x) => x.art === 'medikament' && gleich(x)).sort(nachZeit);
  const zwillinge = alle.filter(gleich);
  if (!zwillinge.some((x) => x.id !== m.id)) return einnahmen;
  const rang = (v) => (v.tageszeit in RANG_TAGESZEIT ? RANG_TAGESZEIT[v.tageszeit] : 3);
  const reihe = [...zwillinge].sort((a, b) => rang(a) - rang(b));
  const zu = new Map(reihe.map((v) => [v.id, []]));
  const geben = (knoepfe, e) => {
    const frei = knoepfe.find((v) => !zu.get(v.id).length) || knoepfe[knoepfe.length - 1];
    zu.get(frei.id).push(e);
  };
  const genau = [];
  einnahmen.forEach((e) => {
    const eigene = e.ungefaehr && KNOPF_TAGESZEIT[e.tageszeit]
      ? reihe.filter((v) => v.tageszeit === e.tageszeit) : [];
    if (eigene.length) geben(eigene, e);
    else genau.push(e);
  });
  genau.forEach((e) => geben(reihe, e));
  const meine = zu.get(m.id) || [];
  return einnahmen.filter((e) => meine.includes(e));
}

/** Die letzte Einnahme eines Mittels (nach Namen, jede Dosis) – oder null. */
function letzteEinnahme(s, name) {
  const liste = s.eintraege.filter((x) => x.art === 'medikament' && gleichText(x.mittel, name));
  return liste.length ? liste[liste.length - 1] : null;
}

/**
 * Fragt der Knopf vor einer weiteren Einnahme nach? Nur, wenn die letzte
 * Einnahme dieses Mittels keine zwei Stunden her ist – dann ist ein
 * versehentlicher zweiter Tipp wahrscheinlicher als eine zweite Tablette.
 */
function einnahmeFrage(s, m) {
  const letzte = letzteEinnahme(s, m.mittel);
  if (!letzte) return '';
  const her = Date.now() - zeitpunkt(letzte.am, letzte.um);
  return her >= 0 && her < 2 * 3600000 ? `Schon um ${uhrText(letzte)} – noch eine Einnahme?` : '';
}

/** Ein Knopf in der Reihe „Meine Mittel" auf dem Tag-Reiter. */
function standardKnopf(m, liste, iso, alle, s = null) {
  if (jetztModus(s, m, iso)) {
    const schon = einnahmenJetzt(m, liste, alle);
    const zeiten = schon.length > 2 ? `${schon.length}×, zuletzt ${schon[schon.length - 1].um}`
      : schon.map((x) => x.um).join(', ');
    const name = `${kuerze(m.mittel, 18)}${m.dosis ? ` ${m.dosis}` : ''}`;
    const normal = schon.length ? `${name} · ${zeiten} ✓` : `${name} · jetzt`;
    const sagt = schon.length
      ? `${mittelName(m)} – heute um ${zeiten} eingetragen, noch eine Einnahme jetzt eintragen`
      : `${mittelName(m)} – jetzt genommen, eintragen`;
    const frage = einnahmeFrage(s, m);
    // Gefragt wird im Knopf selbst, wie beim Löschen (siehe zweiterTipp).
    const fragt = !!frage && ui.loeschFrage === `standard-eintragen:${m.id}`;
    return `<button type="button" class="marke marke-schnell marke-jetzt${fragt ? ' frage' : ''}"
              data-act="standard-eintragen" data-id="${esc(m.id)}" data-normal="${esc(normal)}"
              data-frage="${esc(frage)}" data-sagt="${esc(sagt)}"
              aria-label="${esc(fragt ? `${frage} Noch einmal tippen.` : sagt)}">${esc(fragt ? frage : normal)}</button>`;
  }
  const zeit = knopfZeit(m, alle);
  const da = schonEingetragen(m, liste);
  const tag = fmtTag(iso);
  const wann = ['heute', 'gestern'].includes(tag) ? tag : `am ${tag}`;
  // Ein Tipp auf ein Mittel mit Häkchen trägt eine zweite Einnahme ein – das
  // muss auch die Ansage sagen, wie bei den Aktivitäten.
  const sagt = mittelImBogen(m, iso)
    ? `${vorlageVoll(m)} – ${wann}${da ? ' schon eingetragen' : ''}, die Zeit wählst du im Bogen`
    : `${vorlageVoll(m)} – ${wann} ${da ? 'schon eingetragen, noch einmal eintragen' : 'eintragen'}`;
  // Gekürzt wird der Name, nie die Dosis: „Metoclopramid-ra… 10 mg" ist noch
  // zu erkennen, „Metoclopramid-ratiopharm 1…" nicht mehr zu gebrauchen.
  return `<button type="button" class="marke marke-schnell" data-act="standard-eintragen"
            data-id="${esc(m.id)}" aria-label="${esc(sagt)}">
      ${esc(kuerze(m.mittel, 18))}${m.dosis ? ` ${esc(m.dosis)}` : ''}${zeit ? ` · ${esc(zeit)}` : ''}${da ? ' <span class="marke-zahl">✓</span>' : ''}
    </button>`;
}

/**
 * Das eigene Mittel, auf das sich der Bogen bezieht: das gewählte, sonst eins
 * mit diesem Namen – dieselbe Dosis zuerst. Nur bei gleichem Namen; wer einen
 * anderen Namen tippt, meint ein anderes Mittel.
 */
function mittelVorlageVon(s, b) {
  const e = b.entwurf;
  if (!String(e.mittel || '').trim()) return null;
  const gleich = s.standardMittel.filter((x) => gleichText(x.mittel, e.mittel));
  return gleich.find((x) => x.id === b.vorlage)
    || gleich.find((x) => gleichText(x.dosis, e.dosis))
    || gleich[0] || null;
}

/**
 * Das eigene Mittel, das genau dem Entwurf entspricht – oder null.
 *
 * Mit einer von Hand gesetzten Uhrzeit zählen nur Name und Dosis: Eine
 * genaue Zeit sagt, wann es heute war, nicht, dass das Mittel keine übliche
 * Zeit mehr hat. Sonst hieß „07:10, dann Pantoprazol · morgens gewählt"
 * „anders als bei deinen Mitteln", und „Dort so ändern" löschte die übliche
 * Zeit. Das gewählte zuerst.
 */
function gemerktGenau(s, b) {
  const e = b.entwurf;
  if (!String(e.mittel || '').trim()) return null;
  if (e.ungefaehr) return store.standardVon({ mittel: e.mittel, dosis: e.dosis, ...entwurfZeit(e) });
  const gleich = (x) => gleichText(x.mittel, e.mittel) && gleichText(x.dosis, e.dosis);
  return s.standardMittel.find((x) => x.id === b.vorlage && gleich(x))
    || s.standardMittel.find(gleich) || null;
}

/**
 * Unter der Dosis: merken, oder sagen, dass und wie es schon gemerkt ist.
 *
 * Drei Lagen. Steht es genau so bei den eigenen Mitteln, sagt der Bogen das.
 * Steht es dort anders – andere Dosis, andere Zeit –, sagt er auch das, und
 * man kann das eigene Mittel so ändern oder dieses zusätzlich merken: Wer die
 * Dosis gewechselt hat, will nicht jeden Morgen 20 in 40 umtippen. Sonst der
 * Schalter „Als mein Mittel merken". Was gewählt ist, gilt beim Eintragen.
 */
function merkenTeil(s, b) {
  const e = b.entwurf;
  const voll = s.standardMittel.length >= store.STANDARD_HOECHSTENS;
  const schalter = (act, an, text) => `<button type="button" class="btn btn-ghost" data-act="${act}"
      aria-pressed="${an}">${an ? '✓ ' : ''}${text}</button>`;
  const genau = gemerktGenau(s, b);
  if (genau) {
    // Gleicher Name, gleiche Dosis, aber hier eine andere Form gewählt: Die
    // Packung hat gewechselt, und das eigene Mittel weiß es noch nicht.
    const f = formImBogen(s, b);
    const formAnders = f.quelle === 'gewaehlt' && f.form && (genau.form || null) !== f.form;
    return `<p class="klein">Steht bei deinen Mitteln.
      ${loeschKnopf('standard-entfernen', genau.id, {
    normal: 'Dort entfernen', frage: 'Wirklich entfernen?', sagt: `${mittelName(genau)} aus deinen Mitteln nehmen`, klasse: 'btn btn-ghost',
  })}</p>
      ${formAnders ? `<p class="klein">Dort steht ${genau.form ? `die Form „${esc(mphForm(genau.form).kurzname)}“` : 'keine Form'}.
        ${knopf('standard-form', 'Form dort übernehmen', 'btn-ghost', `data-id="${esc(genau.id)}"`)}</p>` : ''}`;
  }
  const ref = mittelVorlageVon(s, b);
  if (ref) {
    return `<p class="klein">Anders als bei deinen Mitteln – dort steht
      „${esc(vorlageVoll(ref))}“.</p>
      <div class="reihe">${schalter('standard-anpassen', !!b.vorlageAendern, 'Dort so ändern')}
        ${voll ? '' : schalter('standard-umschalten', !!b.alsStandard, 'Zusätzlich merken')}</div>
      ${b.vorlageAendern ? '<p class="klein">Beim Eintragen steht dein Mittel danach so da wie hier.</p>' : ''}
      ${b.alsStandard ? '<p class="klein">Beim Eintragen kommt es als weiteres Mittel dazu – etwa für eine zweite Zeit am Tag.</p>' : ''}`;
  }
  if (voll) {
    return `<p class="klein">${vollSatz(s)}</p>`;
  }
  return `<div class="reihe">${schalter('standard-umschalten', !!b.alsStandard, 'Als mein Mittel merken')}</div>
    ${b.alsStandard ? `<p class="klein">Mit Dosis${e.ungefaehr ? ' und Zeit' : ''} – beim nächsten Mal genügt ein Tipp, auch auf dem Tag-Reiter.</p>` : ''}`;
}

/*
 * Beim Tippen zeichnet der Bogen nicht neu (das Feld verlöre den Fokus).
 * Damit „Steht bei deinen Mitteln" trotzdem stimmt, sobald Name oder Dosis
 * abweichen, wird nur dieser Teil ersetzt – und nur, wenn sich sein Inhalt
 * ändert. Ein Ersetzen beim Verlassen des Feldes, also genau während des
 * Tipps auf einen seiner Knöpfe, schluckte sonst diesen Tipp.
 */
function merkenAuffrischen() {
  const el = document.getElementById('bogenMerken');
  if (!el || !ui.bogen || ui.bogen.art !== 'medikament') return;
  const html = merkenTeil(store.zustandLesen(), ui.bogen);
  if (ui.bogen.merkenStand === html) return;
  el.innerHTML = html;
  ui.bogen.merkenStand = html;
}

/*
 * Was der Medikamenten-Bogen zum getippten Namen weiß – in einem eigenen
 * Behälter (#bogenWissen), der beim Tippen aufgefrischt wird wie #bogenMerken:
 * Wer „Medikinet" tippt, soll die Frage nach der Form sehen, ohne dass der
 * Bogen neu gezeichnet wird und das Feld den Fokus verliert.
 *
 *   * Wissen zur Gruppe – kurz, mit dem Verweis auf „Mehr".
 *   * Bei Methylphenidat immer, ohne Schalter: „Welche Form?" mit den sieben
 *     Formen, vorgewählt nach „Meine Mittel" oder nach dem Namen, darunter
 *     die Texte der gewählten Form.
 *   * Mit „ADHS" und einem ADHS-Mittel: „Zum Essen?" – nur ohne gewählten
 *     Bezug zum Essen, denn der sagt es schon.
 *   * Die Hinweise, die dieser Name mit den eingetragenen Mitteln ergibt.
 */

/**
 * Die Form im Bogen: { form, quelle }. Gewählt ist gewählt (auch null –
 * ausdrücklich keine); sonst die des eigenen Mittels, sonst die, die der Name
 * eindeutig nennt. Nur bei Methylphenidat.
 *
 * Eine Form, die der Bogen mitgebracht hat – vom geöffneten Eintrag oder vom
 * Tipp auf ein eigenes Mittel –, gehört zu dessen Namen (`formFuer`). Steht
 * jetzt ein anderer Name da, gilt sie nicht mehr als gewählt: Aus „Concerta"
 * mit Hülle wird „Medikinet retard" sonst eine Kapsel mit Hülle, und der
 * Hinweis zum Säureblocker (Stufe A) fehlte. Vorgewählt wird dann neu, nach
 * dem eigenen Mittel oder dem Namen, mit dem Zusatz „vorgewählt …". Wer die
 * Form in diesem Bogen selbst angetippt hat (`formSelbst`), behält sie. Kommt
 * der alte Name zurück, gilt auch die Form wieder – nichts wird beim Tippen
 * gelöscht.
 */
function formImBogen(s, b) {
  const e = b.entwurf;
  const g = wissenZu(e.mittel);
  if (!g || g.id !== 'mph') return { form: null, quelle: null };
  const zumNamen = b.formSelbst || b.formFuer === undefined || gleichText(b.formFuer, e.mittel);
  if (e.form !== undefined && zumNamen) return { form: e.form, quelle: 'gewaehlt' };
  const ref = mittelVorlageVon(s, b);
  if (ref && ref.form) return { form: ref.form, quelle: 'gemerkt' };
  const ausName = formAusName(e.mittel);
  return ausName ? { form: ausName, quelle: 'name' } : { form: null, quelle: null };
}

/** Die Hinweise, die der Name im Bogen mit den eingetragenen Mitteln ergibt. */
function wechselImBogen(s, b) {
  const e = b.entwurf;
  const name = String(e.mittel || '').trim().toLowerCase();
  if (!name) return [];
  const f = formImBogen(s, b);
  // Der Entwurf zählt mit, als wäre er heute als Letztes eingetragen – mit der
  // Form, die hier gewählt ist.
  const probe = {
    art: 'medikament', am: heuteISO(), um: '23:59', mittel: e.mittel, ...(f.form ? { form: f.form } : {}),
  };
  return wechselHinweise(s.standardMittel, [...s.eintraege, probe], heuteISO())
    .filter((h) => h.namen.some((n) => n.trim().toLowerCase() === name));
}

function wissenTeil(s, b) {
  const e = b.entwurf;
  const g = wissenZu(e.mittel);
  if (!g) return '';
  const teile = [`<p class="klein mittel-hinweis">${esc(g.gruppe)}: ${esc(g.kurz)}
    <br>Ausführlich unter „Mehr".</p>`];
  if (g.id === 'mph') {
    const f = formImBogen(s, b);
    const form = mphForm(f.form);
    teile.push(`<div class="bogen-form" role="group" aria-label="Form">
      <p class="feld-name">Welche Form? (steht auf der Packung)</p>
      <div class="marken marken-eng">${MPH_FORMEN.map((x) => `
        <button type="button" class="marke${f.form === x.id ? ' an' : ''}" data-act="bogen-form"
                data-id="${x.id}" aria-pressed="${f.form === x.id}">${esc(x.name)}</button>`).join('')}</div>
      ${f.quelle === 'name' ? '<p class="klein">vorgewählt nach dem Namen</p>' : ''}
      ${f.quelle === 'gemerkt' ? '<p class="klein">vorgewählt wie bei deinen Mitteln</p>' : ''}
      ${form ? `<p class="klein form-text">${esc(form.einnahme)}${form.saeure ? ` ${esc(form.saeure)}` : ''}${form.extra ? ` ${esc(form.extra)}` : ''}</p>` : ''}
    </div>`);
  }
  if (s.adhsAn === true && istAdhsMittel(e.mittel) && !e.bezug) {
    teile.push(`<div class="bogen-essen" role="group" aria-label="Zum Essen?">
      <p class="feld-name">Zum Essen?</p>
      <div class="marken marken-eng">${ESSEN_WAHL.map((w) => `
        <button type="button" class="marke${e.essen === w.id ? ' an' : ''}" data-act="bogen-essen"
                data-id="${w.id}" aria-pressed="${e.essen === w.id}">${w.name}</button>`).join('')}</div>
    </div>`);
  }
  const paare = wechselImBogen(s, b);
  if (paare.length) {
    teile.push(`<div class="bogen-wechsel">${paare.map((h) => `<p class="klein">${esc(h.text)}</p>`).join('')}</div>`);
  }
  return teile.join('');
}

/*
 * Die Tablettenhülle im Stuhl.
 *
 * Wer Methylphenidat als Retardtablette mit Hülle nimmt (Concerta), findet
 * sie womöglich im Stuhl wieder – laut Packungsbeilage normal. Ohne diesen
 * Satz ist das der Moment, in dem jemand glaubt, die Tablette habe nicht
 * gewirkt. Er steht im Stuhl-Bogen, wenn so ein Mittel unter „Meine Mittel"
 * steht oder in den letzten Wochen eingetragen ist – ohne Schalter.
 *
 * Nur der erste Satz von `extra` der Form: Der Rest (schwere Verengungen im
 * Magen-Darm-Trakt) gehört zum Mittel, nicht zum Stuhlgang.
 */
function huellenSatz() {
  const text = mphForm('oros').extra;
  const ende = text.indexOf('. ');
  return ende > 0 ? text.slice(0, ende + 1) : text;
}

function huelleDa(s) {
  const ab = plusTage(heuteISO(), -(WECHSEL_TAGE - 1));
  const namen = [...s.standardMittel.map((m) => m.mittel),
    ...s.eintraege.filter((e) => e.art === 'medikament' && e.am >= ab).map((e) => e.mittel)];
  return [...new Set(namen.map((n) => String(n || '').trim()).filter(Boolean))]
    .some((n) => (wissenZu(n) || {}).id === 'mph' && formZu(n, s.standardMittel, s.eintraege, heuteISO()) === 'oros');
}

function wissenBehaelter(s, b) {
  b.wissenStand = wissenTeil(s, b);
  return `<div id="bogenWissen">${b.wissenStand}</div>`;
}

/** Wie merkenAuffrischen(): nur ersetzen, wenn sich etwas ändert. */
function wissenAuffrischen() {
  const el = document.getElementById('bogenWissen');
  if (!el || !ui.bogen || ui.bogen.art !== 'medikament') return;
  const html = wissenTeil(store.zustandLesen(), ui.bogen);
  if (ui.bogen.wissenStand === html) return;
  el.innerHTML = html;
  ui.bogen.wissenStand = html;
}

/**
 * Die Dosis für „Dazu genommen?" beim Kopfschmerz – aus den eigenen Mitteln.
 * Steht dasselbe Mittel dort mit mehreren Dosen, die zuletzt eingetragene.
 * Kein Treffer: keine Dosis. Die App erfindet keine.
 */
function dosisAusMeinenMitteln(s, name) {
  const meine = s.standardMittel.filter((m) => gleichText(m.mittel, name) && String(m.dosis || '').trim());
  if (!meine.length) return '';
  const passend = (dosis) => meine.find((m) => gleichText(m.dosis, dosis));
  const zuletzt = [...s.eintraege].reverse()
    .find((e) => e.art === 'medikament' && gleichText(e.mittel, name) && passend(e.dosis));
  return (zuletzt ? passend(zuletzt.dosis) : meine[0]).dosis;
}

/* ---------- Kopfschmerz und sein Mittel ---------- */

// Was „Dazu genommen?" anbietet: Mittel gegen den Anfall. Die App schlägt
// kein Schmerzmittel vor – angeboten wird nur, was schon einmal eingetragen
// oder bei den eigenen Mitteln gemerkt ist, und davon nur diese Gruppen.
// Nicht AKUT_KLASSEN wie in js/kopf.js: Dort zählen auch Opioide und
// Gepante mit, als Tipp angeboten werden sie nicht.
const DAZU_KLASSEN = ['nsar', 'kombi', 'triptan', 'nichtnsar', 'kombipara'];
const istAkutmittel = (name) => {
  const g = wissenZu(name);
  return !!g && DAZU_KLASSEN.includes(g.id);
};

/**
 * Die Medikamente, die zu einem Kopfschmerz gehören.
 *
 * Seit November 2026 trägt ein Mittel, das über „Dazu genommen?" entsteht,
 * die Kennung seines Kopfschmerzes (`zuKopf`). Ältere tragen keine; für sie
 * gilt, wie sie damals entstanden sind: ein Akutmittel am selben Tag zur
 * selben Minute. Der Säureblocker zur selben Minute gehört nicht dazu – der
 * wurde nicht gegen den Kopf genommen.
 */
function mittelZumKopf(s, kopf) {
  if (!kopf) return [];
  return s.eintraege.filter((x) => x.art === 'medikament' && (x.zuKopf
    ? x.zuKopf === kopf.id
    : x.am === kopf.am && x.um === kopf.um && istAkutmittel(x.mittel)));
}

/**
 * Was an diesem Kopfschmerz schon an Mitteln steht: die dazugehörigen und
 * jedes andere Akutmittel desselben Tages. Gezählt werden in der Auswertung
 * Tage, nicht Einnahmen – ein zweiter Ibuprofen-Eintrag für denselben Anfall
 * änderte keine Zahl, stünde aber doppelt in der Liste und im Bericht.
 */
function mittelSchonDa(s, kopf, am) {
  const dazu = mittelZumKopf(s, kopf);
  // Was zu einem anderen Kopfschmerz dieses Tages gehört, gehört nicht zu
  // diesem: Zwei Anfälle an einem Tag können zwei Einnahmen haben.
  const fremd = new Set(s.eintraege
    .filter((k) => k.art === 'kopf' && k.am === am && k.id !== kopf.id)
    .flatMap((k) => mittelZumKopf(s, k)));
  const tag = s.eintraege.filter((x) => x.art === 'medikament' && x.am === am
    && istAkutmittel(x.mittel) && !dazu.includes(x) && !fremd.has(x));
  return [...dazu, ...tag];
}

/**
 * Ändert sich Tag oder Uhrzeit eines Kopfschmerzes, rücken seine Mittel mit.
 *
 * Sonst stünde nach „war doch gestern" der Kopfschmerz gestern und das
 * Ibuprofen heute – zwei falsche Tage in der Zählung der Akutmittel-Tage, an
 * denen die Kopfschmerzklassifikation zusammen mit den Kopfschmerztagen
 * einen Kopfschmerz durch Medikamentenübergebrauch festmacht (ICHD-3, 8.2:
 * „Headache occurring on 15 or more days/month … regular overuse of acute or
 * symptomatic headache medication (on 10 or more or 15 or more days/month,
 * depending on the medication)"). Stand das Mittel zur selben Zeit
 * wie der Kopfschmerz, übernimmt es dessen neue Zeit samt Tageszeit; hatte es
 * eine eigene, behält es sie und wechselt nur den Tag. Ein Mittel, das schon
 * an einem anderen Tag steht, hat jemand selbst dorthin gelegt – es bleibt.
 *
 * Zurück kommen die Namen der Mittel, die mitgerückt sind.
 */
function mittelMitnehmen(alt, neu) {
  if (!alt || !neu || (alt.am === neu.am && alt.um === neu.um)) return [];
  const namen = [];
  mittelZumKopf(store.zustandLesen(), alt).forEach((m) => {
    if (m.am !== alt.am) return;
    const gleichzeitig = m.um === alt.um;
    if (!gleichzeitig && alt.am === neu.am) return;
    store.eintragAendern(m.id, gleichzeitig
      ? {
        am: neu.am,
        um: neu.um,
        ungefaehr: !!neu.ungefaehr,
        tageszeit: neu.ungefaehr ? neu.tageszeit || null : null,
        bezug: null,
        bezugMahlzeit: null,
        zuKopf: alt.id,
      }
      : { am: neu.am, zuKopf: alt.id });
    // Eine eigene Zeit „vor dem Essen" hängt an der Mahlzeit des alten Tages.
    const jetzt = store.eintragVon(m.id);
    if (!gleichzeitig && jetzt.ungefaehr && ESSENSBEZUG.some((x) => x.id === jetzt.bezug)) {
      store.eintragAendern(m.id, zeitNeu(store.zustandLesen(), jetzt));
    }
    namen.push(m.mittel);
  });
  return namen;
}

/** „Ibuprofen 400 mg um 14:30" */
const mittelZeile = (m) => `${mittelName(m)} um ${m.ungefaehr ? '≈' : ''}${m.um}`;

/** „Ibuprofen" – „Ibuprofen und Sumatriptan" */
const undListe = (namen) => [...new Set(namen)].join(' und ');

/** „abends, nach dem Essen" – in der Liste unter dem Eintrag. */
function zeitWorte(e) {
  if (!e.ungefaehr) return '';
  const teile = [
    (TAGESZEITEN.find((x) => x.id === e.tageszeit) || {}).name,
    (ESSENSBEZUG.find((x) => x.id === e.bezug) || {}).name,
  ].filter(Boolean);
  return `<span class="zeile-tags">${esc(teile.length ? teile.join(', ') : 'ungefähre Zeit')}</span>`;
}

function bogenHTML(s) {
  const b = ui.bogen;
  if (!b) return '';
  const e = b.entwurf;
  // Beim Ändern sagt die Überschrift das – „Kopfschmerz ändern", nicht nur
  // „Kopfschmerz": Derselbe Bogen sieht sonst aus wie ein neuer Eintrag, und
  // wer unsicher ist, ob er gerade einen zweiten anlegt, bricht ab.
  const titel = b.id ? `${ART_NAME[b.art]} ändern` : ART_NAME[b.art];
  const kopf = `<div class="bogen-kopf">
    <h2 id="bogenTitel">${ART_ICON[b.art]} ${esc(titel)}</h2>
    <button type="button" class="bogen-zu" data-act="bogen-zu" aria-label="Schließen">×</button>
  </div>`;

  const zeit = `<div class="reihe reihe-zeit">
    <label class="feld-name" for="bogenUhr">Uhrzeit</label>
    <input type="time" class="feld" id="bogenUhr" data-act="uhr" value="${esc(e.um)}">
    <label class="feld-name" for="bogenTag">am</label>
    <input type="date" class="feld" id="bogenTag" data-act="bogen-datum" value="${esc(e.am)}" max="${heuteISO()}">
  </div>
  ${zeitKnoepfe(b.art, e)}`;

  let mitte = '';
  if (b.art === 'essen') {
    const eigene = s.eigeneAusloeser.map((a) => ({ ...a, icon: '•' }));
    /*
     * Die Auswahl steht nach Häufigkeit, das Meistbenutzte oben.
     *
     * Sechzehn Marken plus eigene sind zu viele zum Suchen, und gesucht wird
     * jeden Tag mehrmals. Bei gleicher Häufigkeit bleibt die Reihenfolge des
     * Katalogs – sonst springt die Liste bei jedem Eintrag neu, und man greift
     * ins Leere, weil die Hand sich die Stelle gemerkt hat.
     */
    const zaehler = haeufigeZutaten(s.eintraege);
    const nachHaeufigkeit = [...AUSLOESER, ...eigene]
      .map((m, i) => ({ m, i, n: zaehler.get(m.id) || 0 }))
      .sort((x, y) => (y.n - x.n) || (x.i - y.i))
      .map((x) => x.m);

    const gewaehlt = (e.zutaten || []).map((z) => z.id);
    const vorlagen = haeufigeMahlzeiten(s.eintraege, 6);

    const zutatZeile = (z) => `<div class="zutat">
      <span class="zutat-name">${esc(ausloeserName(z.id, s.eigeneAusloeser))}</span>
      <select class="feld zutat-rolle" data-act="rolle" data-id="${esc(z.id)}"
              aria-label="Rolle von ${esc(ausloeserName(z.id, s.eigeneAusloeser))}">
        ${ROLLEN.map((r) => `<option value="${r.id}"${z.rolle === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select>
    </div>`;

    mitte = `
      <label class="feld-name" for="bogenWas">Was?</label>
      <input type="text" class="feld feld-breit" id="bogenWas" data-act="was"
             value="${esc(e.was || '')}" placeholder="Haferbrei mit Banane" autocomplete="off">
      ${vorlagen.length ? `<p class="feld-name">Noch mal wie letztes Mal</p>
      <div class="marken marken-eng">${vorlagen.map((g, i) => `
        <button type="button" class="marke" data-act="vorlage" data-i="${i}">
          ${esc(kuerze(g.text, 24))}${g.anzahl > 1 ? ` <span class="marke-zahl">${g.anzahl}×</span>` : ''}
        </button>`).join('')}</div>` : ''}

      <p class="feld-name">Portion</p>
      <div class="wahl">${PORTIONEN.map((p) => `
        <button type="button" class="wahl-btn${e.portion === p.id ? ' an' : ''}"
                data-act="portion" data-id="${p.id}">${p.name}</button>`).join('')}</div>
      <div class="wahl wahl-auswaerts">
        <button type="button" class="wahl-btn${e.auswaerts === true ? ' an' : ''}" data-act="auswaerts"
                aria-pressed="${e.auswaerts === true}"><span aria-hidden="true">🍴</span> Auswärts gegessen</button>
      </div>

      <p class="feld-name">Was war drin?</p>
      ${marken(nachHaeufigkeit, gewaehlt, 'zutat')}

      ${e.zutaten && e.zutaten.length ? `
        <p class="feld-name">Wie viel davon? Keine Gramm – die Rolle genügt.</p>
        <div class="zutaten">${e.zutaten.map(zutatZeile).join('')}</div>` : ''}`;
  } else if (b.art === 'beschwerde') {
    mitte = `
      <p class="feld-name">Wie stark?</p>
      ${skala(e.staerke)}
      <p class="feld-name">Wie fühlt es sich an?</p>
      ${marken(BESCHWERDEN, e.arten || [], 'beschwerdeart')}
      <p class="feld-name">Und nach dem Stuhlgang?</p>
      <div class="wahl wahl-vier">${STUHLBEZUG.map((x) => `
        <button type="button" class="wahl-btn${e.stuhlbezug === x.id ? ' an' : ''}"
                data-act="stuhlbezug" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
      <p class="klein">Eine der drei Fragen, an denen ein Reizdarmsyndrom
      festgemacht wird – und die einzige, die sich nicht ausrechnen lässt.
      Freiwillig; wer sie überspringt, verliert nur diese eine Auswertung.</p>
      <label class="feld-name" for="bogenNotiz">Notiz</label>
      <input type="text" class="feld feld-breit" id="bogenNotiz" data-act="notiz"
             value="${esc(e.notiz || '')}" placeholder="optional" autocomplete="off">
      <details class="warnbogen"${(e.warnzeichen || []).length ? ' open' : ''}>
        <summary>War etwas davon dabei?</summary>
        <p class="klein">Selten, aber wichtig. Was hier angekreuzt wird, taucht
        nicht in der Statistik auf, sondern ganz oben unter „Muster" – mit dem
        Hinweis, wie eilig es ist.</p>
        ${marken(WARNZEICHEN.filter((w) => w.bereich !== 'kopf'), e.warnzeichen || [], 'warnzeichen')}
      </details>`;
  } else if (b.art === 'kopf') {
    /*
     * Derselbe Aufbau wie der Beschwerdebogen – Stärke, Merkmale, Notiz,
     * Warnzeichen –, aber eine eigene Art. Dazu, was die Kopfschmerz-
     * sprechstunde fragt: Dauer, wie der Tag weiterging, ob ein Mittel
     * geholfen hat. Pflicht ist nur die Stärke, und die ist nicht vorbelegt:
     * Wer im Anfall einträgt, tippt zweimal und ist fertig; eine vorbelegte 4
     * zählte als eingetragen und zöge jede Statistik in die Mitte.
     *
     * „Dazu genommen?" legt das Medikament mit an – ein Tipp statt eines
     * zweiten Bogens. Während einer Attacke ist der zweite Bogen genau der
     * Schritt, der wegfällt, und an den Akutmittel-Tagen macht die
     * Kopfschmerzklassifikation, zusammen mit den Kopfschmerztagen, einen
     * Kopfschmerz durch Medikamentenübergebrauch fest (ICHD-3, 8.2). Bis zur
     * Fassung 29 hieß es „die wichtigste Zahl für die Neurologie" – eine
     * Rangfolge, die keine Quelle aufstellt. Angeboten werden nur Mittel, die schon einmal
     * eingetragen wurden: Die App schlägt kein Schmerzmittel vor.
     *
     * Auch beim Ändern – wer erst im Nachhinein weiß, dass er etwas genommen
     * hat, ändert den Kopfschmerz und nicht den Medikamenten-Bogen. Was dort
     * schon steht, steht dann darüber und wird nicht noch einmal angeboten.
     */
    // Auch die eigenen Mittel: Wer sein Migränemittel dort mit Dosis angelegt
    // hat, soll es hier finden, selbst wenn es unter den fünf zuletzt
    // benutzten Namen gerade nicht steht. Die Dosis kommt von dort mit.
    const dazuNamen = [...(s.zuletztMittel || []), ...s.standardMittel.map((m) => m.mittel)]
      .filter((n, i, alle) => alle.findIndex((x) => gleichText(x, n)) === i);
    const akutNamen = dazuNamen.filter(istAkutmittel);
    const alt = b.id ? store.eintragVon(b.id) : null;
    const schon = alt ? mittelSchonDa(s, alt, e.am) : [];
    const mitDiesem = alt ? mittelZumKopf(s, alt) : [];
    const dazuWahl = akutNamen.filter((n) => !schon.some((x) => gleichText(x.mittel, n)));
    const schonTeil = schon.length ? `<p class="klein kopf-schon">Schon eingetragen:
      ${schon.map((x) => esc(mittelZeile(x))).join(', ')}.${mitDiesem.length
  ? ` Änderst du hier Tag oder Uhrzeit, ${mitDiesem.length === 1 ? 'rückt es' : 'rücken sie'} mit.` : ''}</p>` : '';
    const wahlReihe = (liste, feld, act, klasse = '') => `<div class="wahl${klasse}">${liste.map((x) => `
        <button type="button" class="wahl-btn${e[feld] === x.id ? ' an' : ''}"
                data-act="${act}" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>`;
    const uebel = (e.kopfArten || []).some((a) => a === 'kopfuebel' || a === 'kopferbrechen');
    /*
     * Die Merkmale: das alte „Licht oder Lärm stören" nur bei einem Eintrag,
     * der es trägt (siehe KOPF_ARTEN); die drei zu Kiefer und Nacken als
     * eigene Gruppe, nur mit eingeschaltetem Schalter – oder wenn dieser
     * Eintrag eines davon schon trägt, damit es sich abwählen lässt.
     *
     * „Trägt" heißt: der gespeicherte Eintrag oder der Entwurf. Nur am
     * Entwurf gemessen, verschwände der Knopf mit dem ersten Tipp – ein
     * Fehltipp neben „Lärm stört" löschte dann eine frühere Angabe, die sich
     * im Bogen nicht wieder wählen ließe. So bleibt er stehen, bis abgewählt
     * gespeichert ist; erst beim nächsten Öffnen fehlt er.
     */
    const traegt = (a) => (e.kopfArten || []).includes(a.id)
      || !!(alt && (alt.kopfArten || []).includes(a.id));
    const grundArten = KOPF_ARTEN.filter((a) => !a.nurMit && (!a.alt || traegt(a)));
    const spannungArten = KOPF_ARTEN.filter((a) => a.nurMit === 'spannung' && (s.spannungAn === true || traegt(a)));
    // Mit „ADHS": wann an diesem Tag ein ADHS-Mittel steht – nur, wenn eins steht.
    const adhsZeile = (() => {
      if (s.adhsAn !== true) return '';
      const nachName = new Map();
      adhsAm(s, e.am).forEach(({ e: x }) => {
        const k = String(x.mittel).trim();
        nachName.set(k, [...(nachName.get(k) || []), uhrText(x)]);
      });
      if (!nachName.size) return '';
      return `<p class="klein kopf-adhs">ADHS-Mittel an diesem Tag: ${[...nachName.entries()]
        .map(([name, zeiten]) => `${esc(undListe(zeiten))} (${esc(name)})`).join('; ')}</p>`;
    })();
    mitte = `
      ${adhsZeile}
      <p class="feld-name">Wie stark?</p>
      ${skala(e.staerke)}
      <p class="feld-name">Wie ist er?</p>
      ${marken(grundArten, e.kopfArten || [], 'kopfart')}
      ${spannungArten.length ? `<p class="feld-name">Kiefer und Nacken</p>
      ${marken(spannungArten, e.kopfArten || [], 'kopfart')}` : ''}
      ${uebel ? `<p class="klein">Die Übelkeit des Anfalls gehört hier zum Kopf. Bitte
      nicht noch einmal als Bauchbeschwerde eintragen – sonst wird aus dem
      Kopfschmerz ein Magentag.</p>` : ''}
      <p class="feld-name">Dazu genommen? Ein Tipp legt das Medikament mit an.</p>
      ${schonTeil}
      ${dazuWahl.length ? `<div class="marken">${dazuWahl.map((n) => {
        const dosis = dosisAusMeinenMitteln(s, n);
        const an = (e.dazuMittel || []).includes(n);
        return `<button type="button" class="marke${an ? ' an' : ''}" aria-pressed="${an}"
                data-act="kopf-dazu" data-id="${esc(n)}">${esc(n)}${dosis ? ` <span class="marke-zahl">${esc(dosis)}</span>` : ''}</button>`;
      }).join('')}</div>`
    : akutNamen.length ? '' : `<p class="klein">Dein Schmerz- oder Migränemittel einmal als Medikament
      eintragen – danach steht es hier als Tipp. Daran hängt die Zählung der
      Tage mit Akutmittel. Zusammen mit den Kopfschmerztagen gehört sie zu den
      Zahlen, nach denen die internationale Kopfschmerzklassifikation
      Kopfschmerzen einordnet.</p>`}
      <p class="feld-name">Wie lange – mit oder ohne Mittel?</p>
      ${wahlReihe(KOPF_DAUER, 'dauer', 'kopfdauer', ' wahl-vier')}
      <p class="klein">Hält er bis morgen an, trag ihn morgen noch einmal ein:
      Gezählt werden Kopfschmerztage. Die Dauer lässt sich auch morgen
      nachtragen.</p>
      <p class="feld-name">Wie ging der Tag weiter?</p>
      ${wahlReihe(KOPF_VERLAUF, 'verlauf', 'kopf-verlauf', ' wahl-spalte')}
      <p class="feld-name">Falls du ein Mittel genommen hast: Hat es geholfen? Nach etwa zwei Stunden.</p>
      ${wahlReihe(MITTEL_WIRKUNG, 'mittelWirkung', 'kopf-wirkung')}
      <label class="feld-name" for="bogenNotiz">Notiz</label>
      <input type="text" class="feld feld-breit" id="bogenNotiz" data-act="notiz"
             value="${esc(e.notiz || '')}" placeholder="optional" autocomplete="off">
      <details class="warnbogen"${(e.warnzeichen || []).length ? ' open' : ''}>
        <summary>War etwas davon dabei?</summary>
        <p class="klein">Selten, aber wichtig. Was hier angekreuzt wird, taucht
        nicht in der Statistik auf, sondern ganz oben unter „Muster" – mit dem
        Hinweis, wie eilig es ist.</p>
        ${marken(WARNZEICHEN.filter((w) => w.bereich === 'kopf' || w.id === 'bluterbrechen'),
    e.warnzeichen || [], 'warnzeichen')}
      </details>`;
  } else if (b.art === 'stuhl') {
    /*
     * Die Bristol-Skala als sieben Knöpfe mit Zeichnung.
     *
     * Ohne Bild wird das nicht ausgefüllt: „Wurstförmig mit Rissen" ist keine
     * Beschreibung, die jemand auf sein eigenes Klo überträgt, und eine Frage,
     * die peinlich *und* umständlich ist, wird gar nicht beantwortet. Die
     * Striche rechts sind grob, aber sie tun, was ein Bild tun soll: Man
     * erkennt in zwei Sekunden die Zeile, die passt.
     *
     * Der Satz darunter: gesund.bund.de, Verstopfung bei Erwachsenen (Stand
     * 02.10.2023, Symptome): „Ein Stuhl vom Typ 6 und 7 spricht für
     * Durchfall, Stuhl vom Typ 3 bis 5 für normalen Stuhlgang und Stuhl vom
     * Typ 1 und 2 deutet auf Verstopfung", und die Skala „kann dabei eine
     * gute Hilfe sein" beim Stuhltagebuch. Zur Passagezeit Lewis und Heaton,
     * Scand J Gastroenterol 1997;32(9):920-4 (PMID 9299672, Abstract): die
     * Passagezeit korrelierte „best with stool form (r = -0.54)", und „Such
     * scales have utility in both clinical practice and research". Bis zur
     * Fassung 29 stand „1 und 2 heißen zu lange gelegen, 6 und 7 zu kurz"
     * (eindeutiger als die Quellen) und „seit dreißig Jahren das Maß, mit dem
     * in der Sprechstunde darüber geredet wird – die Zahl allein sagt dort
     * genug" – das trägt keine Quelle; 1997 hieß es noch „not widely used in
     * clinical practice or research".
     *
     * Und zu den Warnzeichen unten: gesund.bund.de, Reizdarmsyndrom (Stand
     * 28.08.2024): „Bei Blut im Stuhl ist in jedem Fall eine Untersuchung
     * durch eine Ärztin oder einen Arzt erforderlich"; Magengeschwür (Stand
     * 07.01.2022): „schwarz gefärbter Stuhl" unter den Zeichen, die
     * „zeitnah ärztlich" abzuklären sind. „Die zwei wichtigsten Warnzeichen
     * überhaupt" – eine Rangfolge, die keine Quelle aufstellt – stand hier
     * bis zur Fassung 29.
     */
    mitte = `
      <p class="feld-name">Wie sah es aus?</p>
      <div class="bristol">${BRISTOL.map((x) => `
        <button type="button" class="bristol-btn g-${x.gruppe}${e.form === x.id ? ' an' : ''}"
                data-act="bristol" data-n="${x.id}" aria-pressed="${e.form === x.id}">
          <span class="bristol-n">${x.id}</span>
          <span class="bristol-bild" aria-hidden="true">${x.bild}</span>
          <span class="bristol-name">${esc(x.name)}</span>
        </button>`).join('')}</div>
      <p class="klein">Nach der Bristol-Skala deuten 1 und 2 auf Verstopfung,
      3 bis 5 gelten als normaler Stuhlgang, 6 und 7 sprechen für Durchfall. Die
      Form hängt auch damit zusammen, wie lange der Stuhl im Darm bleibt. Die
      Skala wird in Praxis und Studien benutzt und kann beim Führen eines
      Stuhltagebuchs helfen.</p>
      ${huelleDa(s) ? `<p class="klein huellen-satz">${esc(huellenSatz())}</p>` : ''}
      <p class="feld-name">War sonst etwas?</p>
      <div class="wahl">
        <button type="button" class="wahl-btn${e.dringend ? ' an' : ''}"
                data-act="stuhl-dringend">Musste dringend</button>
        <button type="button" class="wahl-btn${e.unvollstaendig ? ' an' : ''}"
                data-act="stuhl-unfertig">Gefühl, nicht fertig</button>
      </div>
      <details class="warnbogen"${(e.warnzeichen || []).length ? ' open' : ''}>
        <summary>War Blut dabei oder war es schwarz?</summary>
        <p class="klein">Blut im Stuhl und schwarzer Stuhl gehören zu den
        Warnzeichen, die ärztlich abgeklärt gehören – deshalb stehen sie hier und
        nicht im Beschwerdebogen. Was hier angekreuzt wird, taucht in keiner
        Statistik auf, sondern ganz oben unter „Muster".</p>
        ${marken(WARNZEICHEN.filter((w) => ['teerstuhl', 'blutstuhl'].includes(w.id)),
    e.warnzeichen || [], 'warnzeichen')}
      </details>`;
  } else if (b.art === 'medikament') {
    const vorschlaege = [...new Set([...s.zuletztMittel, ...MITTEL_VORSCHLAEGE])].slice(0, 8);
    /*
     * Die eigenen Mittel stehen oben, mit Dosis: ein Tipp füllt Name, Dosis
     * und – wenn gemerkt – die übliche Zeit. Darunter wie bisher die
     * zuletzt benutzten Namen, ohne Dosis.
     */
    const eigene = s.standardMittel.length ? `
      <p class="feld-name">Meine Mittel</p>
      <div class="marken">${s.standardMittel.map((m) => {
        const z = entwurfZeit(e);
        const an = gleichText(e.mittel, m.mittel) && gleichText(e.dosis, m.dosis) && (b.vorlage === m.id
          || (z.tageszeit === (m.tageszeit || null) && z.bezug === (m.bezug || null)));
        return `<button type="button" class="marke${an ? ' an' : ''}" data-act="standard-waehlen"
                data-id="${esc(m.id)}" aria-pressed="${an}">${esc(mittelName(m))}${vorlageText(m)
  ? ` <span class="marke-zahl">${esc(vorlageText(m))}</span>` : ''}</button>`;
      }).join('')}</div>` : '';
    // Immer da, nicht erst mit einem Namen im Feld – und beim Tippen von
    // merkenAuffrischen() nachgeführt, ohne den Bogen neu zu zeichnen.
    b.merkenStand = merkenTeil(s, b);
    const merken = `<div class="standard-zeile" id="bogenMerken">${b.merkenStand}</div>`;
    mitte = `${eigene}
      <label class="feld-name" for="bogenMittel">Mittel</label>
      <input type="text" class="feld feld-breit" id="bogenMittel" data-act="mittel"
             value="${esc(e.mittel || '')}" placeholder="Name" autocomplete="off">
      <div class="marken">${vorschlaege.map((m) => `
        <button type="button" class="marke${e.mittel === m ? ' an' : ''}"
                data-act="mittel-vorschlag" data-id="${esc(m)}">${esc(m)}</button>`).join('')}</div>
      ${wissenBehaelter(s, b)}
      <label class="feld-name" for="bogenDosis">Dosis</label>
      <input type="text" class="feld feld-breit" id="bogenDosis" data-act="dosis"
             value="${esc(e.dosis || '')}" placeholder="z. B. 20 mg" autocomplete="off">
      ${merken}`;
  } else if (b.art === 'aktivitaet') {
    /*
     * Wie die Zutaten: nach Häufigkeit, das Meistbenutzte oben, bei gleicher
     * Zahl in der Reihenfolge des Katalogs – sonst spränge die Auswahl bei
     * jedem Eintrag, und die Hand griffe ins Leere. Mehrere dürfen an sein:
     * „Unterwegs" und „Feier" am selben Abend sind ein Eintrag, nicht zwei.
     *
     * Was dieser Eintrag trägt, aber nicht mehr zur Auswahl steht – eine
     * unter „Mehr" entfernte eigene –, bleibt sichtbar und lässt sich
     * abwählen. Sonst verschwände es beim Ändern still aus dem Eintrag.
     *
     * „Dazu" trägt eine Kennung: Daran hält das Neuzeichnen den Fokus, der
     * sonst an den Anfang der Seite fiele.
     */
    const zaehler = aktivitaetHaeufigkeit(s.eintraege);
    const eigene = sichtbareEigene(s.eigeneAktivitaeten).map((a) => ({ ...a, icon: '•' }));
    const auswahl = [...AKTIVITAETEN, ...eigene]
      .map((m, i) => ({ m, i, n: zaehler.get(m.id) || 0 }))
      .sort((x, y) => (y.n - x.n) || (x.i - y.i))
      .map((x) => x.m);
    const gewaehlt = e.aktivitaeten || [];
    const fremd = gewaehlt.filter((id) => !auswahl.some((m) => m.id === id))
      .map((id) => aktivitaetVon(id, s.eigeneAktivitaeten));
    const voll = sichtbareEigene(s.eigeneAktivitaeten).length >= store.AKTIV_HOECHSTENS;
    /*
     * Der Herstellerhinweis auch bei einer eigenen „Massagepistole" aus einer
     * älteren Fassung: Sie steht im Bogen neben der eingebauten, oft sogar
     * zuerst – welcher der beiden Knöpfe es war, darf über den Hinweis nicht
     * entscheiden. Gerechnet wird weiter nur mit der eingebauten.
     */
    const pistole = gewaehlt.some((id) => {
      if (id === 'massagepistole') return true;
      const da = String(id).startsWith('a:') ? eingebauteGleichnamig(aktivitaetName(id, s.eigeneAktivitaeten)) : null;
      return !!da && da.id === 'massagepistole';
    });
    mitte = `
      <p class="feld-name">Was hast du gemacht, wo warst du?</p>
      ${marken([...auswahl, ...fremd], gewaehlt, 'aktiv-wahl')}
      ${pistole ? `<div class="massage-hinweis">
        <p class="klein">${esc(MASSAGE_HINWEIS.satz)}</p>
        <details><summary>Mehr dazu</summary>
          <p class="klein">${esc(MASSAGE_HINWEIS.details)}</p>
        </details>
      </div>` : ''}
      ${voll ? `<p class="klein">Mehr als ${store.AKTIV_HOECHSTENS} eigene passen nicht. Unter
        „Mehr“ kannst du eine entfernen.</p>` : `<div class="reihe aktiv-eigen">
        <input type="text" class="feld" id="bogenAktivNeu" data-act="aktiv-name"
               maxlength="${store.AKTIV_NAME_MAX}" value="${esc(b.aktivName || '')}"
               placeholder="Eigene, z. B. Klettern" autocomplete="off" aria-label="Eigene Aktivität">
        ${knopf('aktiv-eigen', 'Dazu', '', 'id="bogenAktivDazu"')}
      </div>`}
      ${b.id ? '' : `<p class="klein">Auswärts gegessen?
        <button type="button" class="link-knopf" data-act="aktiv-auswaerts">Als Mahlzeit eintragen</button>
        – dort zählt es bei den Auslösern.</p>`}
      <p class="feld-name">Wie anstrengend? Wenn du magst.</p>
      <div class="wahl">${INTENSITAETEN.map((x) => `
        <button type="button" class="wahl-btn${e.intensitaet === x.id ? ' an' : ''}"
                data-act="aktiv-intensitaet" data-id="${x.id}"
                aria-pressed="${e.intensitaet === x.id}">${esc(x.name)}</button>`).join('')}</div>
      <label class="feld-name" for="bogenNotiz">Notiz</label>
      <input type="text" class="feld feld-breit" id="bogenNotiz" data-act="notiz"
             value="${esc(e.notiz || '')}" placeholder="optional" autocomplete="off">
      <p class="klein">Eine Aktivität allein macht keinen Tag ohne Beschwerden. Was
      danach kam, steht nach ein paar Wochen unter „Muster“.</p>`;
  } else {
    mitte = `
      <label class="feld-name" for="bogenText">Notiz</label>
      <textarea class="feld feld-breit" id="bogenText" data-act="text" rows="4"
                placeholder="Was sonst noch war">${esc(e.text || '')}</textarea>`;
  }

  // Löschen auch von hier aus, mit derselben Rückfrage wie in der Zeile.
  // Unten und schlicht, unter „Ändern" – so wie „Ereignis löschen" im
  // Kalender des iPhones: der seltenere Weg, aber dort, wo man ihn sucht.
  const weg = b.id ? loeschKnopf('bogen-loeschen', b.id, {
    normal: 'Eintrag löschen',
    frage: 'Wirklich löschen?',
    sagt: `${zeileWorte(store.eintragVon(b.id) || e, s.eigeneAktivitaeten)} löschen`,
    klasse: 'btn btn-ghost btn-block bogen-weg',
  }) : '';
  return `<div class="bogen-hg" data-act="bogen-zu"></div>
    <div class="bogen" role="dialog" aria-modal="true" aria-label="${esc(b.id ? titel : `${ART_NAME[b.art]} eintragen`)}">
      ${kopf}
      <div class="bogen-inhalt">${zeit}${mitte}</div>
      <div class="bogen-fuss">
        ${knopf('bogen-speichern', b.id ? 'Ändern' : 'Eintragen', 'btn-primary btn-block')}
        ${weg}
      </div>
    </div>`;
}

/* ==================== Willkommen ==================== */

/*
 * Die Begrüßung ist der erste Bildschirm, den jemand sieht, der den Link
 * bekommen hat. Auf dem iPhone steht hier gleich, wie Body Check auf den
 * Home-Bildschirm kommt – vor dem ersten Eintrag. Wer in Safari anfängt, muss
 * später umziehen; wer gleich in der App anfängt, nie.
 */
function willkommen() {
  const g = geraet();
  const app = laeuftAlsApp();
  const ding = geraetName(g);
  const zuerst = g.ios && !app
    ? g.inApp
      ? `<div class="karte karte-merk"><h3>Zuerst in Safari öffnen</h3>${anleitung(g)}</div>`
      // Die Frage vor die Schritte: Wer von oben abarbeitet, soll nicht erst
      // ein zweites Symbol anlegen und dann lesen, dass es schon eins gibt.
      : `<div class="karte karte-merk">
        <h3>Zuerst auf den Home-Bildschirm</h3>
        <p class="klein"><b>Liegt Body Check schon auf deinem Home-Bildschirm?</b>
        Vielleicht noch unter dem alten Namen „Bauchbuch“? Dann öffne die App
        dort und leg sie nicht noch einmal an – ein zweites Symbol hat deine
        Einträge nicht.</p>
        <p class="klein"><b>Noch nicht?</b> Leg Body Check als App auf deinen
        Home-Bildschirm, bevor du etwas einträgst. Dann öffnest du die App mit
        einem Tipp, und dein ${ding} löscht deine Einträge dort nicht, nur weil du ein
        paar Wochen nicht reinschaust.</p>
        ${anleitung(g)}
        <p class="klein">Danach öffnest du Body Check nur noch über das neue
        Symbol auf deinem Home-Bildschirm.</p>
      </div>`
    /*
     * In der App: sagen, dass es geklappt hat – und das eine, was man jetzt
     * noch falsch machen kann. Der Link aus der Nachricht öffnet nicht diese
     * App, sondern Safari oder den Browser der Nachrichten-App; was dort
     * landet, kommt hier nicht an.
     */
    : g.ios && app
      ? `<div class="karte karte-merk"><h3>Geschafft</h3>
        <p class="klein">Body Check liegt jetzt als App auf deinem
        Home-Bildschirm. Öffne die App ab jetzt nur noch über dieses Symbol. Der
        Link, den du bekommen hast, öffnet nicht diese App – was du dort
        einträgst, kommt hier nicht an.</p></div>`
      : '';
  return `<div class="willkommen">
    <h2>Body Check</h2>
    <p>Ein Tagebuch für den Magen: was gegessen wurde, wann es zwickt, was
    hilft. Nach ein paar Wochen zeigt es, was zusammenfällt – und macht daraus
    einen Zettel für den nächsten Arzttermin.</p>
    ${zuerst}
    <ul class="punkte">
      <li><b>Bleibt hier.</b> Kein Konto, kein Server. Was du über deinen
        Bauch einträgst, liegt auf diesem Gerät und geht nirgendwo hin. Einzige Ausnahme: Verbesserungsvorschläge unter „Ideen" – die
        gehen an den, der die App gebaut hat, und dort steht das auch.</li>
      <li><b>Läuft ohne Netz.</b> Einmal geöffnet, funktioniert die App auch
        im Flugzeug und im Keller.</li>
      <li><b>Sichern nicht vergessen.</b> Was nur auf einem Gerät liegt, ist
        mit dem Gerät weg. ${g.ios
    ? 'Wie du sicherst, steht unter „Mehr“ › „Anleitung“.'
    : 'Unter „Mehr" gibt es eine Sicherungsdatei.'}</li>
      ${g.ios && app ? `<li><b>Das Symbol behalten.</b> Lösch es nicht – sonst
        sind deine Einträge wahrscheinlich weg.</li>` : ''}
    </ul>
    <p class="klein">Die App zählt mit, sie diagnostiziert nicht. Was sie
    „auffällig" nennt, ist eine Häufigkeit – die Einordnung gehört in die
    Praxis.</p>
    ${g.ios && !app
    ? knopf('los', 'Erst mal hier anschauen', 'btn-block')
    : knopf('los', 'Anfangen', 'btn-primary btn-block')}
    ${app ? `
      <p class="klein willkommen-umzug">Schon in Safari eingetragen? Diese App
      hat ihren eigenen Speicher – hol deine Einträge herein. Gleich erscheint
      oben ein kleines Feld <b>Einsetzen</b>, darauf tippen.</p>
      ${knopf('umzug-holen', 'Einträge aus Safari holen', 'btn-block')}
      ${g.ios ? `<p class="klein willkommen-umzug">Neues ${ding}? Oder Body Check
      gelöscht und wieder auf den Home-Bildschirm gelegt? Hast du eine
      Sicherung als Datei, hol sie hier herein. ${SICHERUNGSNAMEN} Nimm die
      mit dem neuesten Datum.</p>
      ${knopf('import', 'Datei einlesen', 'btn-block')}` : ''}` : ''}
  </div>`;
}

/* ==================== Zeichnen ==================== */

function male() {
  // Was „Tag" diesmal als gezeigt meldet – siehe gezeigtStempeln().
  ui.gezeigt = null;
  const s = store.zustandLesen();
  document.documentElement.dataset.theme = s.theme || 'rosa';

  if (!s.begruesst) {
    viewEl.innerHTML = willkommen();
    tabbarEl.hidden = true;
    return;
  }
  tabbarEl.hidden = false;

  const warnung = !store.kannSpeichern() ? `<div class="karte warn">
    <h3>${store.speicherGrund() === 'voll' ? 'Der Speicher ist voll' : 'Es kann nicht gespeichert werden'}</h3>
    <p class="klein">${store.speicherGrund() === 'voll'
    ? 'Neue Eintragungen kommen nicht mehr dazu. Jetzt unter „Mehr" sichern, danach ältere Einträge löschen.'
    : 'Dieser Browser lässt keine Website-Daten zu – ein privates Fenster oder eine eingebettete Ansicht. Alles Eingetragene ist nach dem Schließen weg.'}</p>
  </div>` : '';

  const tab = REITER.some((r) => r.id === s.tab) ? s.tab : 'heute';
  const inhalt = {
    heute: tagAnsicht, verlauf: verlaufAnsicht, muster: musterAnsicht,
    ruhe: ruheAnsicht, ideen: ideenAnsicht, mehr: mehrAnsicht,
  }[tab];

  /*
   * Wer gerade tippt, soll weitertippen können. Neu gezeichnet wird auch,
   * wenn im Hintergrund etwas passiert – eine Idee kommt an, eine Suche ist
   * fertig –, und dabei wird das Feld ersetzt. Der Text steht im neuen
   * wieder drin; Fokus und Cursor kämen ohne das hier nicht mit, und auf dem
   * Telefon ginge mitten im Satz die Tastatur zu.
   */
  const fokus = document.activeElement;
  const fokusId = fokus && fokus.id && viewEl.contains(fokus) ? fokus.id : null;
  let auswahl = null;
  try {
    if (fokusId && typeof fokus.selectionStart === 'number') {
      auswahl = [fokus.selectionStart, fokus.selectionEnd, fokus.selectionDirection || 'none'];
    }
  } catch { /* Felder ohne Cursor, etwa Zahlen in älterem Safari */ }
  // Aufgeklappt bleibt aufgeklappt – für Abschnitte mit id, etwa in der
  // Anleitung: Wer „Neues iPhone?" liest und dabei sichert, verliert sonst
  // die Stelle.
  const offenIds = [...viewEl.querySelectorAll('details[id][open]')].map((d) => d.id);

  viewEl.innerHTML = warnung + umzugHinweis(s, tab) + inhalt(s) + bogenHTML(s);
  gezeigtStempeln();

  offenIds.forEach((id) => {
    const d = document.getElementById(id);
    if (d && viewEl.contains(d)) d.open = true;
  });

  const wieder = fokusId ? document.getElementById(fokusId) : null;
  if (wieder && wieder !== fokus && viewEl.contains(wieder)) {
    wieder.focus({ preventScroll: true });
    try {
      if (auswahl && typeof wieder.setSelectionRange === 'function') wieder.setSelectionRange(...auswahl);
    } catch { /* dito */ }
  }

  tabbarEl.innerHTML = REITER.map((r) => `
    <button type="button" class="tab${r.id === tab ? ' an' : ''}" id="tab-${r.id}"
            data-act="tab" data-tab="${r.id}" role="tab" aria-selected="${r.id === tab}"
            aria-controls="view"><span class="ti">${r.icon}</span><span>${r.name}</span></button>`).join('');

  // Der Bogen soll benutzbar sein, ohne dass die Seite dahinter mitscrollt.
  document.body.classList.toggle('bogen-auf', !!ui.bogen);
  // Eine abfangende Meldung fängt nur auf „Tag“ ohne Bogen ab (siehe decktHier).
  toastEl.classList.toggle('deckt', decktHier());
}

/*
 * Neu zeichnen, aber höchstens einmal je Durchlauf.
 *
 * Eine Aktion ändert oft beides: den Speicher und den flüchtigen Zustand hier.
 * Der Speicher meldet sich von selbst (store.horche), die Aktion zeichnet
 * danach ihre eigene Änderung – das wären zwei Durchgänge und ein sichtbares
 * Flackern. Die Sammelstelle hier macht daraus einen.
 */
let gemeldet = false;
function zeichne() {
  if (gemeldet) return;
  gemeldet = true;
  queueMicrotask(() => { gemeldet = false; male(); });
}

/* ==================== Eingaben ==================== */

function bogenOeffnen(art, id) {
  const vorlage = {
    essen: { was: '', zutaten: [], portion: 'normal', auswaerts: false },
    beschwerde: { staerke: 4, arten: [], notiz: '', stuhlbezug: null },
    // Keine Vorgabe für die Form: Eine vorausgewählte 4 wäre die bequemste
    // Antwort und würde als eingetragen zählen. Ein Stuhlgang ohne Form ist
    // für jede Auswertung wertlos, also wird er gar nicht erst gespeichert.
    stuhl: { form: null, dringend: false, unvollstaendig: false, warnzeichen: [] },
    // `kopfArten`, nicht `arten`: Das Feld der Bauchbeschwerden wird an zwei
    // Stellen über alle Einträge hinweg gelesen; ein Kopfmerkmal darin wäre
    // ein Bauchmerkmal.
    // Keine Vorgabe für die Stärke – wie beim Stuhlgang: Eine vorbelegte 4
    // wäre die bequemste Antwort und zählte als eingetragen.
    kopf: {
      staerke: null, kopfArten: [], dauer: null, verlauf: null, mittelWirkung: null,
      dazuMittel: [], notiz: '', warnzeichen: [],
    },
    medikament: { mittel: '', dosis: '' },
    notiz: { text: '' },
    // Nichts vorgewählt: Eine vorbelegte Aktivität wäre die bequemste und
    // stünde dann in jedem eilig gespeicherten Eintrag.
    aktivitaet: { aktivitaeten: [], intensitaet: null, notiz: '' },
  }[art];
  const alt = id ? store.eintragVon(id) : null;
  ui.bogen = {
    art,
    id: id || null,
    entwurf: alt
      ? { ...vorlage, ...alt, ...grundzeitVon(alt) }
      : { ...vorlage, art, am: ui.tag, um: ui.tag === heuteISO() ? jetztUhr() : '12:00' },
    // Steht die Zeit schon fest – von Hand gesetzt oder, beim Ändern, die
    // des Eintrags? Dann überschreibt die Wahl eines eigenen Mittels sie nicht.
    zeitGesetzt: !!alt,
    // Die Form des Eintrags gehört zu seinem Namen (siehe formImBogen).
    ...(alt && art === 'medikament' ? { formFuer: String(alt.mittel || '') } : {}),
  };
  frageEnde();
  zeichne();
}

/*
 * Die Grundzeit eines ungefähren Eintrags mit Bezug zum Essen – für den Bogen
 * beim Ändern.
 *
 * Gespeichert wird sie nicht (bogenSpeichern() wirft sie weg), gerechnet wird
 * aber von ihr aus: „vor dem Essen" ist eine halbe Stunde vor der Grundzeit,
 * nicht vor der schon verschobenen Uhrzeit. Ohne sie wanderte ein Eintrag
 * ohne Mahlzeit beim Ändern von „nach" auf „vor" nur um eine halbe Stunde
 * statt um eine ganze. Zurückgerechnet wird wie in zeitFuerNeuenTag().
 */
function grundzeitVon(e) {
  const bezug = ESSENSBEZUG.find((x) => x.id === e.bezug);
  if (!e.ungefaehr || !bezug || !MIT_ESSENSBEZUG.includes(e.art)) return {};
  const t = TAGESZEITEN.find((x) => x.id === e.tageszeit);
  return { bezugBasis: t ? t.um : uhrVon(minutenVon(e.um) - bezug.minuten) };
}

/**
 * Was an Datum und Uhrzeit im Bogen nicht stimmt – { feld, text } oder null.
 *
 * Ein geleertes Datumsfeld liefert '', und über das späteste Datum hinaus
 * lässt sich trotzdem tippen. Beides ergab einen Eintrag, den man nicht mehr
 * fand: Mit '' stand er an keinem Tag, und der Tageskopf, der nach dem
 * Speichern dorthin sprang, zeigte „undefined, NaN"; mit einem künftigen
 * Datum stand er an einem Tag, zu dem man nicht blättern kann. Eine geleerte
 * Uhrzeit stand leer in der Liste und wurde wie Mittag einsortiert. Gesagt
 * wird, was fehlt, und gespeichert wird nichts – beim Anlegen wie beim
 * Ändern.
 */
function zeitFehler(e) {
  if (!istISO(e.am)) return { feld: 'bogenTag', text: 'Welcher Tag? Bitte ein Datum wählen.' };
  if (e.am > heuteISO()) {
    return { feld: 'bogenTag', text: 'Das Datum liegt in der Zukunft. Bitte heute oder einen früheren Tag wählen.' };
  }
  if (!istUhr(e.um)) {
    return { feld: 'bogenUhr', text: 'Um wie viel Uhr? Bitte eine Uhrzeit wählen oder „morgens“, „mittags“ oder „abends“ antippen.' };
  }
  return null;
}

/** Ein Feld als falsch markieren – oder die Markierung wieder abnehmen. */
function feldFehler(el, falsch) {
  if (!el) return;
  el.classList.toggle('feld-fehler', falsch);
  if (falsch) el.setAttribute('aria-invalid', 'true');
  else el.removeAttribute('aria-invalid');
}

function bogenSpeichern() {
  const b = ui.bogen;
  if (!b) return;
  const e = { ...b.entwurf, art: b.art };
  const falsch = zeitFehler(e);
  if (falsch) {
    feldFehler(document.getElementById(falsch.feld), true);
    melden(falsch.text);
    return;
  }
  if (b.art === 'essen' && !String(e.was || '').trim() && !(e.zutaten || []).length) {
    melden('Bitte etwas eintragen oder ankreuzen.');
    return;
  }
  if (b.art === 'medikament' && !String(e.mittel || '').trim()) {
    melden('Welches Mittel?');
    return;
  }
  if (b.art === 'stuhl' && !e.form) {
    melden('Bitte eine Form von 1 bis 7 wählen.');
    return;
  }
  if (b.art === 'notiz' && !String(e.text || '').trim()) {
    melden('Die Notiz ist leer.');
    return;
  }
  if (b.art === 'aktivitaet') {
    // Ein eigener Name, der getippt, aber nicht mit „Dazu" übernommen wurde,
    // ist trotzdem gemeint. Ihn still zu verwerfen, hieße einen Eintrag ohne
    // das, weswegen er angelegt wurde.
    if (String(b.aktivName || '').trim() && aktivEigenDazu() === 'voll') return;
    e.aktivitaeten = [...(b.entwurf.aktivitaeten || [])];
    if (!e.aktivitaeten.length) {
      melden('Was hast du gemacht? Bitte etwas antippen.');
      return;
    }
  }
  // Nur ein ausdrückliches „auswärts" wird gespeichert. Beim Ändern muss das
  // Abwählen ausdrücklich zurück, sonst bliebe es im alten Eintrag stehen.
  if (b.art === 'essen' && e.auswaerts !== true) {
    if (b.id) e.auswaerts = false;
    else delete e.auswaerts;
  }
  // Ein Kopfschmerz mit Stärke 0 ist keiner – und ein Tag ohne Kopfeintrag
  // zählt ohnehin als kopfschmerzfrei. Gespeichert würde nur ein Eintrag, der
  // in jeder Zählung als „Kopfschmerztag" liefe und keiner war.
  if (b.art === 'kopf' && !(Number(e.staerke) >= 1)) {
    melden(e.staerke === null || e.staerke === undefined
      ? 'Wie stark? Eine Stufe antippen.' : 'Wie stark? Bei 0 wäre es kein Kopfschmerz.');
    return;
  }
  // „Dazu genommen": je Marke ein Medikament-Eintrag zur selben Zeit, mit
  // der Kennung des Kopfschmerzes. Die Liste selbst bleibt nicht am
  // Kopfeintrag hängen.
  const dazu = b.art === 'kopf' ? (e.dazuMittel || []) : [];
  if (b.art === 'kopf') delete e.dazuMittel;
  delete e.bezugBasis;
  if (!e.ungefaehr) {
    // Beim Ändern mischt der Speicher den Bogen in den alten Eintrag. Ein
    // bloß gelöschtes Feld bliebe dort stehen – und eine von Hand genau
    // gesetzte Uhrzeit hieße weiter „ungefähr". Also ausdrücklich zurück.
    if (b.id) {
      Object.assign(e, { ungefaehr: false, tageszeit: null, bezug: null, bezugMahlzeit: null });
    } else {
      delete e.ungefaehr;
      delete e.tageszeit;
      delete e.bezug;
      delete e.bezugMahlzeit;
    }
  }
  /*
   * Die Form gehört zu Methylphenidat, die Essensangabe zu einem ADHS-Mittel.
   * Wird ein Eintrag umbenannt – aus einem Methylphenidat wird ein
   * Säureblocker –, müssen beide ausdrücklich zurück: Beim Ändern mischt der Speicher den Bogen in
   * den alten Eintrag, und ein Säureblocker mit einer Freisetzungsform wäre
   * ein Hinweis auf ein Paar, das es nicht gibt.
   */
  const wechselVorher = wechselStand();
  if (b.art === 'medikament') {
    // Die vorgewählte Form gilt, wie sie im Bogen zu sehen war; „ausdrücklich
    // keine" steht bei einem neuen Eintrag gar nicht erst drin.
    // Eine mitgebrachte Form, die zu einem anderen Namen gehört (siehe
    // formImBogen), zählt dabei nicht als gewählt.
    const f = formImBogen(store.zustandLesen(), b);
    if (f.quelle !== 'gewaehlt') e.form = f.form || undefined;
    if (e.form === null && !b.id) delete e.form;
    // Beim Ändern auch „keine Form" ausdrücklich: Wer ein anderes eigenes
    // Mittel gewählt hat, hat die Form des alten Eintrags verworfen (siehe
    // 'standard-waehlen'), und ein bloß fehlendes Feld ließe sie dort stehen.
    if (e.form === undefined && b.id) e.form = null;
    if (e.form === undefined) delete e.form;
    /*
     * Zum Essen: Ein Bezug („vor dem Essen" an einer Mahlzeit) sagt es schon,
     * dann gilt keine eigene Angabe. Hat sich die Angabe geändert, bekommt
     * sie den Zeitpunkt von jetzt – eine Angabe, die erst nach dem Ergebnis
     * kam, darf in keinem Vergleich zählen (siehe essenZurEinnahme).
     */
    const alt = b.id ? store.eintragVon(b.id) : null;
    const essenAlt = (alt && alt.essen) || null;
    const essenNeu = e.bezug ? null : (e.essen || null);
    e.essen = essenNeu;
    if (essenNeu !== essenAlt) e.essenGesetzt = essenNeu ? Date.now() : null;
    // Weder vorher noch jetzt eine Angabe: das Feld gar nicht erst anlegen.
    if (!e.essen && !essenAlt) {
      delete e.essen;
      delete e.essenGesetzt;
    }
    const weg = (felder) => felder.forEach((k) => {
      if (b.id) e[k] = null;
      else delete e[k];
    });
    const gruppe = wissenZu(e.mittel);
    if (!gruppe || gruppe.id !== 'mph') weg(['form']);
    if (!istAdhsMittel(e.mittel)) weg(['essen', 'essenGesetzt']);
  }
  if (b.art === 'medikament') store.mittelMerken(e.mittel);
  /*
   * Merken oder das eigene Mittel anpassen – und in der Meldung sagen, was
   * davon geklappt hat. Ein Mittel, das wegen der Höchstzahl still nicht
   * gemerkt wird, fehlt sonst erst Tage später auf dem Tag-Reiter.
   */
  let gemerkt = '';
  if (b.art === 'medikament' && (b.alsStandard || b.vorlageAendern)) {
    const ref = b.vorlageAendern ? mittelVorlageVon(store.zustandLesen(), b) : null;
    // Mit genauer Uhrzeit behält das geänderte Mittel seine übliche Zeit –
    // siehe gemerktGenau(). „Als mein Mittel merken" merkt dann ohne Zeit.
    const zeit = ref && !e.ungefaehr
      ? { tageszeit: ref.tageszeit || null, bezug: ref.bezug || null } : entwurfZeit(e);
    // Die Form nur, wenn der Bogen eine hat: Ohne sie behält das eigene
    // Mittel seine (siehe standardSauber in js/store.js), statt sie zu
    // verlieren, weil hier nur die Dosis geändert wurde.
    const vorlage = {
      mittel: e.mittel, dosis: e.dosis, ...zeit, ...(e.form !== undefined ? { form: e.form } : {}),
    };
    const r = ref ? store.standardAendern(ref.id, vorlage) : store.standardMerken(vorlage);
    if (r.fehler === 'voll') gemerkt = 'voll';
    else if (r.schon || r.fehler === 'doppelt') gemerkt = 'schon';
    else if (!r.fehler) gemerkt = ref ? 'geaendert' : 'gemerkt';
  }
  const vorher = b.id ? store.eintragVon(b.id) : null;
  if (b.id && !vorher) {
    ui.bogen = null;
    melden('Diesen Eintrag gibt es nicht mehr.');
    zeichne();
    return;
  }
  let neueId = b.id;
  if (b.id) store.eintragAendern(b.id, e);
  else neueId = store.eintragen(e);
  /*
   * Ein geänderter Kopfschmerz nimmt seine Mittel mit auf den neuen Tag, und
   * „Dazu genommen?" legt nichts an, was für ihn schon dasteht – auch dann
   * nicht, wenn der Bogen das wegen eines neuen Datums noch nicht wusste.
   */
  const geaendertKopf = b.art === 'kopf' && b.id ? store.eintragVon(b.id) : null;
  const mitgerueckt = geaendertKopf ? mittelMitnehmen(vorher, geaendertKopf) : [];
  const schon = geaendertKopf ? mittelSchonDa(store.zustandLesen(), geaendertKopf, e.am) : [];
  const dazuNeu = dazu.filter((n) => !schon.some((x) => gleichText(x.mittel, n)));
  const dazuDa = dazu.filter((n) => !dazuNeu.includes(n));
  dazuNeu.forEach((name) => {
    store.eintragen({
      art: 'medikament', am: e.am, um: e.um, mittel: name,
      dosis: dosisAusMeinenMitteln(store.zustandLesen(), name),
      ...(e.ungefaehr ? { ungefaehr: true, tageszeit: e.tageszeit || null } : {}),
      zuKopf: neueId,
    });
    store.mittelMerken(name);
  });
  // Eine Mahlzeit dazu, verschoben oder geändert: was an ihr hängt, rückt mit.
  const nachgezogen = b.art === 'essen' ? nachziehen(neueId, vorher, store.eintragVon(neueId)) : '';
  // Eine Stimulans-Einnahme hebt den Tag ohne Mittel auf; ein Paar der Stufe
  // A, das gerade vollständig geworden ist, bekommt einen Satz.
  const ohneMittel = b.art === 'medikament' ? pauseAufheben(e.mittel, e.am).trim() : '';
  const paar = wechselZusatz(wechselVorher).trim();
  ui.tag = e.am;
  ui.bogen = null;
  const getan = b.id ? 'Geändert' : 'Eingetragen';
  const satz = {
    gemerkt: `${getan} und bei deinen Mitteln gemerkt.`,
    geaendert: `${getan} und dein Mittel angepasst.`,
    schon: `${getan}. So steht es schon bei deinen Mitteln.`,
    voll: vollBeimEintragen(getan),
  }[gemerkt] || (dazuNeu.length ? `${getan}, mit ${undListe(dazuNeu)}.` : `${getan}.`);
  const zusatz = [
    dazuDa.length ? `${undListe(dazuDa)} ${dazuDa.length === 1 ? 'stand' : 'standen'} schon da.` : '',
    mitgerueckt.length
      ? `${undListe(mitgerueckt)} ${new Set(mitgerueckt).size === 1 ? 'ist' : 'sind'} mitgerückt.` : '',
    nachgezogen,
    ohneMittel,
    paar,
  ].filter(Boolean).join(' ');
  melden(zusatz ? `${satz} ${zusatz}` : satz);
  zeichne();
}

/**
 * Einen Eintrag löschen – und merken, wie es vorher war, für „Rückgängig".
 *
 * Gemerkt wird nicht nur der Eintrag. Eine gelöschte Mahlzeit zieht die
 * ungefähren Einträge des Tages an eine andere Mahlzeit oder an die Tageszeit
 * (siehe nachziehen()); zurückgeholt wird beides, und von den mitgerückten
 * nur, was seitdem noch genau so dasteht. Was jemand in der Zwischenzeit
 * selbst geändert hat, überschreibt „Rückgängig" nicht.
 *
 * Hängen an einem Kopfschmerz Mittel, bleiben sie, und die Meldung sagt das:
 * Genommen ist genommen, auch wenn der Kopfschmerz doppelt eingetragen war.
 *
 * Die Rückgängig-Mechanik des Einlesens (store.rueckgaengig) passt hier
 * nicht: Sie holt den ganzen Stand von vor dem letzten Einlesen zurück, und
 * ein Löschen, das diesen Stand ersetzte, nähme genau diesen Weg zurück.
 */
function eintragWeg(id) {
  const alt = store.eintragVon(id);
  if (!alt) return;
  const vorher = JSON.parse(JSON.stringify(alt));
  const davor = new Map(store.zustandLesen().eintraege
    .filter((x) => x.am === alt.am && x.id !== id).map((x) => [x.id, JSON.stringify(x)]));
  const mittel = alt.art === 'kopf' ? mittelZumKopf(store.zustandLesen(), alt).map((m) => m.mittel) : [];
  store.eintragLoeschen(id);
  const nachgezogen = alt.art === 'essen' ? nachziehen(alt.id, alt, null) : '';
  const mitgerueckt = store.zustandLesen().eintraege
    .filter((x) => davor.has(x.id) && davor.get(x.id) !== JSON.stringify(x));
  ui.geloescht = {
    eintraege: [vorher, ...mitgerueckt.map((x) => JSON.parse(davor.get(x.id)))],
    nachher: Object.fromEntries(mitgerueckt.map((x) => [x.id, JSON.stringify(x)])),
  };
  melden([
    'Gelöscht.',
    mittel.length ? `${undListe(mittel)} ${new Set(mittel).size === 1 ? 'bleibt' : 'bleiben'} eingetragen.` : '',
    nachgezogen,
  ].filter(Boolean).join(' '), { act: 'loeschen-zurueck', text: 'Rückgängig' });
  zeichne();
}

/** Ein Wert im Entwurf, ohne dass der Bogen dabei den Fokus verliert. */
function entwurf(patch, neuZeichnen = true) {
  if (!ui.bogen) return;
  Object.assign(ui.bogen.entwurf, patch);
  if (neuZeichnen) zeichne();
}

function umschalten(feld, id) {
  if (!ui.bogen) return;
  const liste = ui.bogen.entwurf[feld] || [];
  entwurf({ [feld]: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id] });
}

/**
 * Den im Bogen getippten Namen als eigene Aktivität anlegen und auswählen.
 *
 * Heißt er wie eine, die es schon gibt – im Katalog oder bei den eigenen,
 * gleich wie geschrieben –, wird die ausgewählt statt einer zweiten „Laufen".
 * Zurück kommt die Kennung, 'leer' oder 'voll'.
 */
function aktivEigenDazu() {
  const b = ui.bogen;
  if (!b) return 'leer';
  const feld = document.getElementById('bogenAktivNeu');
  const name = String(b.aktivName || (feld && feld.value) || '').trim().slice(0, store.AKTIV_NAME_MAX);
  if (!name) {
    melden('Wie heißt die Aktivität?');
    return 'leer';
  }
  const s = store.zustandLesen();
  const gleich = (a) => a.name.toLowerCase() === name.toLowerCase();
  const da = [...AKTIVITAETEN, ...sichtbareEigene(s.eigeneAktivitaeten)].find(gleich);
  let id = da ? da.id : null;
  if (!id) {
    // Eine früher entfernte mit diesem Namen kommt mit ihrer Kennung zurück –
    // ihre alten Einträge gehören dann wieder zu ihr. Sonst eine Kennung, die
    // noch keinem anderen Namen gehört (siehe freieAktivitaetId).
    const weg = (s.eigeneAktivitaeten || []).find((a) => a.ausgeblendet && gleich(a));
    const r = store.aktivitaetAnlegen(weg ? weg.id : freieAktivitaetId(name, s.eigeneAktivitaeten), name);
    if (r.fehler === 'voll') {
      melden(`Mehr als ${store.AKTIV_HOECHSTENS} eigene Aktivitäten passen nicht. Unter „Mehr“ kannst du eine entfernen.`);
      return 'voll';
    }
    if (r.fehler) return 'leer';
    id = r.id;
  }
  b.aktivName = '';
  const liste = b.entwurf.aktivitaeten || [];
  entwurf({ aktivitaeten: liste.includes(id) ? liste : [...liste, id] });
  const hiess = aktivitaetName(id, store.zustandLesen().eigeneAktivitaeten);
  melden(da ? `„${da.name}“ gibt es schon – ausgewählt.` : `„${hiess}“ steht jetzt in deiner Auswahl.`);
  return id;
}

/* ---------- Sicherung ---------- */

function datenAusgeben(text, name, typ) {
  const blob = new Blob([text], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Nicht sofort freigeben: Manche Browser holen die Datei erst danach ab.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * In die Zwischenablage – und wenn der Browser das nicht erlaubt, wenigstens
 * das Feld markieren. Von Hand kopieren kann man immer.
 */
/** Gibt zurück, ob der Text wirklich in der Zwischenablage gelandet ist. */
async function kopiere(text, wahl) {
  try {
    await navigator.clipboard.writeText(text || '');
    melden('Kopiert.');
    return true;
  } catch {
    const feld = viewEl.querySelector(wahl);
    if (feld) { feld.focus(); feld.select(); }
    melden('Bitte von Hand kopieren.');
    return false;
  }
}

/*
 * Eine Sicherung einlesen – offen oder verschlüsselt.
 *
 * Welche von beiden es ist, steht in der Datei; gefragt wird deshalb erst,
 * wenn es etwas zu fragen gibt. Ein Passwortfeld, das bei jeder offenen
 * Sicherung erscheint, brächte nur die Frage mit, ob man hier eins vergeben
 * *soll*.
 *
 * Die Abfrage läuft über window.prompt. Das ist die eine Stelle, an der ein
 * eigener Dialog schöner wäre und trotzdem falsch: Beim Einlesen ist der
 * Bildschirm gerade beim Dateiauswahldialog des Systems gewesen, und ein
 * Feld, das man erst suchen muss, verliert man dort.
 */
async function sicherungEinlesen(text, { umzug = false } = {}) {
  // Beim Umzug aus Safari kommen auch die gezeigten Tage mit (store.umzugJSON).
  if (!istTresor(text)) return store.einlesen(text, { umzug });
  if (!tresorMoeglich()) {
    throw new Error('Diese Sicherung ist verschlüsselt. Zum Öffnen brauchst du '
      + 'die App über ihre Adresse (https), nicht als einzelne Datei.');
  }
  const wort = window.prompt('Passwort dieser Sicherung:');
  // Abgebrochen ist nicht dasselbe wie falsch – dann passiert einfach nichts.
  if (wort === null) return null;
  return store.einlesen(await entschluesseln(text, wort));
}

/** Was nach dem Einlesen gesagt wird – mit „zusammengeführt", wenn es so war. */
function eingelesenText(e) {
  return e.zusammengefuehrt
    ? `Zusammengeführt: jetzt ${mehrzahl(e.anzahl, 'Eintrag', 'Einträge')}, vorher ${e.vorher}.`
    : `${mehrzahl(e.anzahl, 'Eintrag', 'Einträge')} eingelesen.`;
}

/*
 * Das Dateifeld hängt für die Dauer der Auswahl im Dokument, unsichtbar, aber
 * nicht mit display:none. Ein Feld, das nirgends hängt, kommt auf dem iPhone
 * nicht immer mit seinem change-Ereignis zurück (WebKit-Fehlerbericht
 * 201289) – gerade bei einer Datei aus iCloud Drive. Dann täte „Datei
 * einlesen" still nichts, und die Sicherung sähe kaputt aus.
 */
function sicherungLaden() {
  const alt = document.getElementById('sicherung-datei');
  if (alt) alt.remove();
  const feld = document.createElement('input');
  feld.type = 'file';
  feld.accept = 'application/json,.json';
  feld.id = 'sicherung-datei';
  feld.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
  feld.addEventListener('cancel', () => feld.remove());
  feld.addEventListener('change', () => {
    const datei = feld.files && feld.files[0];
    feld.remove();
    if (!datei) return;
    const leser = new FileReader();
    leser.onload = async () => {
      try {
        const ergebnis = await sicherungEinlesen(String(leser.result));
        if (ergebnis !== null) {
          // Aus der Begrüßung heraus eingelesen: danach gleich ins Tagebuch.
          store.einstellen('begruesst', true);
          melden(eingelesenText(ergebnis));
        }
      } catch (fehler) {
        melden(lesbarerFehler(fehler, true));
      }
      zeichne();
    };
    leser.readAsText(datei);
  });
  document.body.appendChild(feld);
  feld.click();
}

/* ==================== Ein Empfänger für alles ==================== */

const AKTION = {
  los: () => { store.einstellen('begruesst', true); zeichne(); },
  tab: (el) => {
    // Eine laufende Atemübung endet beim Wechseln. Sie im Hintergrund
    // weiterpiepsen zu lassen, während jemand im Tagebuch blättert, wäre
    // das Gegenteil dessen, wozu sie da ist.
    atemStopp();
    store.einstellen('tab', el.dataset.tab);
    ui.bericht = null;
    ui.sicherung = null;
    ui.mittel = false;
    // Ein Tipp auf „Mehr" führt zu „Mehr", auch aus der Anleitung heraus.
    ui.anleitung = false;
    ui.mittelForm = null;
    frageEnde();
    // Wer auf „Ideen" wechselt, gibt einem gescheiterten Versand einen
    // neuen Anlauf – genau einen, nicht einen je Neuzeichnen.
    if (el.dataset.tab === 'ideen') sendenAnstossen();
    zeichne();
  },

  neu: (el) => bogenOeffnen(el.dataset.art),
  bearbeiten: (el) => {
    const e = store.eintragVon(el.dataset.id);
    if (e) bogenOeffnen(e.art, e.id);
  },
  // Erster Tipp fragt, zweiter löscht – siehe zweiterTipp(). Eine gelöschte
  // Mahlzeit nimmt nichts mit: Was an ihr hing, rastet an einer anderen
  // Mahlzeit dieser Tageszeit ein oder rechnet mit der Tageszeit selbst.
  loeschen: (el) => {
    if (!zweiterTipp(el)) return;
    const fokus = document.activeElement === el;
    eintragWeg(el.dataset.id);
    fokusNachEntfernen(fokus);
  },
  'bogen-loeschen': (el) => {
    if (!zweiterTipp(el)) return;
    const fokus = document.activeElement === el;
    ui.bogen = null;
    eintragWeg(el.dataset.id);
    fokusNachEntfernen(fokus);
  },
  // Den gelöschten Eintrag zurück, und was beim Löschen mitgerückt ist, wenn
  // es seitdem noch so dasteht. Der Tag springt dorthin, wo er wieder steht.
  'loeschen-zurueck': () => {
    const g = ui.geloescht;
    if (!g) return;
    ui.geloescht = null;
    const [eintrag, ...mitgerueckt] = g.eintraege;
    const unberuehrt = mitgerueckt.filter((x) => {
      const jetzt = store.eintragVon(x.id);
      return jetzt && JSON.stringify(jetzt) === g.nachher[x.id];
    });
    store.eintraegeZurueck([eintrag, ...unberuehrt]);
    ui.tag = eintrag.am;
    melden('Zurückgeholt.');
    zeichne();
    // Der Fokus auf die zurückgeholte Zeile – dort ist man gerade.
    setTimeout(() => {
      const z = viewEl.querySelector(`[data-act="bearbeiten"][data-id="${CSS.escape(eintrag.id)}"]`);
      if (z) z.focus({ preventScroll: true });
    }, 0);
  },
  'bogen-zu': () => { ui.bogen = null; frageEnde(); zeichne(); },
  /*
   * Ein eigenes Mittel im Bogen wählen: Name und Dosis, und die übliche Zeit
   * nur, wenn noch keine gewählt ist. Wer schon „abends" getippt hat und dann
   * sein Morgenmittel antippt, hat es abends genommen – die Vorlage weiß das
   * nicht besser. Weicht es dann ab, sagt der Bogen das darunter.
   *
   * Die Form dagegen gehört zum Mittel, nicht zum Bogen: Eine schon gewählte
   * (oder vom vorigen Mittel übernommene) Form fällt weg, und formImBogen()
   * nimmt die des gewählten Mittels oder die, die sein Name nennt. Sonst
   * stünde nach „Concerta" und dann „Medikinet retard" die Hülle von Concerta
   * im Eintrag – und der Hinweis zum Säureblocker fehlte.
   */
  'standard-waehlen': (el) => {
    const s = store.zustandLesen();
    const m = s.standardMittel.find((x) => x.id === el.dataset.id);
    const b = ui.bogen;
    const e = b && b.entwurf;
    if (!m || !e) return;
    Object.assign(b, { vorlage: m.id, alsStandard: false, vorlageAendern: false, formSelbst: false });
    delete e.form;
    const zeitSchon = !!(e.tageszeit || e.bezug || b.zeitGesetzt);
    entwurf({
      mittel: m.mittel,
      dosis: m.dosis,
      ...(zeitSchon ? {} : zeitAusVorlage(s, e.am, e.um, m.tageszeit, m.bezug)),
    });
  },
  // Die beiden Schalter unter der Dosis schließen einander aus: Ein Mittel
  // wird entweder zusätzlich gemerkt oder ersetzt das alte, nicht beides.
  'standard-umschalten': () => {
    if (!ui.bogen) return;
    ui.bogen.alsStandard = !ui.bogen.alsStandard;
    if (ui.bogen.alsStandard) ui.bogen.vorlageAendern = false;
    zeichne();
  },
  // Die im Bogen gewählte Form beim eigenen Mittel übernehmen – sonst nichts
  // daran ändern.
  'standard-form': (el) => {
    const s = store.zustandLesen();
    const m = s.standardMittel.find((x) => x.id === el.dataset.id);
    const b = ui.bogen;
    if (!m || !b) return;
    const f = formImBogen(s, b);
    if (!f.form) return;
    const wechselVorher = wechselStand();
    store.standardAendern(m.id, { form: f.form });
    melden(`Bei deinen Mitteln steht jetzt „${mphForm(f.form).kurzname}“.${wechselZusatz(wechselVorher)}`);
    zeichne();
  },
  'bogen-form': (el) => {
    const b = ui.bogen;
    if (!b) return;
    const f = formImBogen(store.zustandLesen(), b);
    // Hier selbst angetippt: Die Form gilt, auch wenn danach der Name noch
    // geändert wird.
    b.formSelbst = true;
    entwurf({ form: f.form === el.dataset.id ? null : el.dataset.id });
  },
  'bogen-essen': (el) => {
    const b = ui.bogen;
    if (!b || !ESSEN_WAHL.some((w) => w.id === el.dataset.id)) return;
    entwurf({ essen: b.entwurf.essen === el.dataset.id ? null : el.dataset.id });
  },
  'standard-anpassen': () => {
    if (!ui.bogen) return;
    ui.bogen.vorlageAendern = !ui.bogen.vorlageAendern;
    if (ui.bogen.vorlageAendern) ui.bogen.alsStandard = false;
    zeichne();
  },
  'standard-entfernen': (el) => {
    if (!zweiterTipp(el)) return;
    const weg = store.standardEntfernen(el.dataset.id);
    ui.entfernt = weg ? { art: 'mittel', weg } : null;
    melden('Aus deinen Mitteln genommen. Die Einträge bleiben.',
      weg ? { act: 'entfernt-zurueck', text: 'Rückgängig' } : null);
    zeichne();
  },
  /*
   * Ein Tipp auf dem Tag-Reiter: das Mittel mit Dosis und üblicher Zeit an
   * diesem Tag eintragen. Fehlt eine übliche Tageszeit und ist der Tag nicht
   * heute, öffnet sich stattdessen der Bogen – eine erfundene Mittagszeit
   * für gestern wäre schlechter als ein Tipp auf „morgens". Die Uhrzeit
   * bleibt dort leer: Eine vorbelegte 12:00 wäre die bequemste Antwort, mit
   * einem Tipp gespeichert, und zwar als genaue Zeit (siehe zeitFehler).
   */
  'standard-eintragen': (el) => {
    const s = store.zustandLesen();
    const m = s.standardMittel.find((x) => x.id === el.dataset.id);
    if (!m) return;
    const am = ui.tag;
    // Die Form des eigenen Mittels geht mit, wenn eine angegeben ist – sie
    // steht auf der Packung und ändert sich nicht von Tag zu Tag. Nur bei
    // Methylphenidat: Dieser Weg läuft an bogenSpeichern() vorbei, und eine
    // Form an einem Säureblocker (etwa aus einem älteren Stand) wäre ein
    // Hinweis auf ein Paar, das es nicht gibt.
    const gruppe = wissenZu(m.mittel);
    const form = m.form && gruppe && gruppe.id === 'mph' ? { form: m.form } : {};
    const wechselVorher = wechselStand();
    /*
     * „jetzt genommen" (siehe jetztModus): genau jetzt, ein Tipp. Liegt die
     * letzte Einnahme keine zwei Stunden zurück, fragt der Knopf erst nach.
     * Die Meldung nennt die Uhrzeit und bietet an, sie zu ändern – wer den
     * Knopf erst nach dem Frühstück findet, korrigiert mit einem Tipp.
     */
    if (jetztModus(s, m, am)) {
      if (einnahmeFrage(s, m) && !zweiterTipp(el)) return;
      frageEnde();
      const vorher = s.eintraege.filter((x) => x.art === 'medikament' && x.am === am && gleichText(x.mittel, m.mittel));
      const um = jetztUhr();
      const id = store.eintragen({
        art: 'medikament', am, um, mittel: m.mittel, dosis: m.dosis, ...form,
      });
      store.mittelMerken(m.mittel);
      const n = vorher.length + 1;
      const satz = n === 1 ? `${mittelName(m)} um ${um} eingetragen.`
        : (n === 2 ? `Zweite Einnahme heute eingetragen (erste ${uhrText(vorher[0])}).`
          : `${n}. Einnahme heute eingetragen (zuletzt davor ${uhrText(vorher[vorher.length - 1])}).`);
      melden(satz + pauseAufheben(m.mittel, am) + wechselZusatz(wechselVorher),
        { act: 'uhrzeit-aendern', id, text: 'Uhrzeit ändern' });
      zeichne();
      return;
    }
    if (mittelImBogen(m, am)) {
      bogenOeffnen('medikament');
      ui.bogen.vorlage = m.id;
      // Die Form des eigenen Mittels gehört zu seinem Namen (siehe formImBogen).
      ui.bogen.formFuer = m.mittel;
      entwurf({ mittel: m.mittel, dosis: m.dosis, um: '', bezug: m.bezug || null, ...form });
      melden('An welchem Teil des Tages? Unter der Uhrzeit antippen.');
      return;
    }
    const zeit = zeitAusVorlage(s, am, am === heuteISO() ? jetztUhr() : '', m.tageszeit, m.bezug);
    delete zeit.bezugBasis;
    store.eintragen({
      art: 'medikament', am, um: zeit.um || jetztUhr(), mittel: m.mittel, dosis: m.dosis, ...zeit, ...form,
    });
    store.mittelMerken(m.mittel);
    melden(`${mittelName(m)} eingetragen${zeit.ungefaehr ? ` (≈${zeit.um})` : ''}.`
      + pauseAufheben(m.mittel, am) + wechselZusatz(wechselVorher));
    zeichne();
  },
  // Aus der Meldung nach „jetzt genommen": den Bogen dieses Eintrags öffnen,
  // den Finger gleich an der Uhrzeit.
  'uhrzeit-aendern': (el) => {
    const e = store.eintragVon(el.dataset.id);
    if (!e) return;
    ui.tag = e.am;
    store.einstellen('tab', 'heute');
    bogenOeffnen(e.art, e.id);
    setTimeout(() => {
      const uhr = document.getElementById('bogenUhr');
      if (uhr) uhr.focus({ preventScroll: true });
    }, 0);
  },
  /*
   * Ein Tag ohne ADHS-Mittel: ein Tipp, der Grund freiwillig dazu. Ein
   * zweiter Tipp auf denselben Grund nimmt nur den Grund zurück, das × den
   * ganzen Tag ohne Mittel.
   */
  'adhs-pause': () => {
    const iso = ui.tag;
    store.tagSetzen(iso, { adhsPause: 'pause' });
    ui.pauseZurueck = iso;
    melden('Als Tag ohne ADHS-Mittel notiert.', { act: 'adhs-pause-zurueck', text: 'Rückgängig' });
    zeichne();
  },
  'adhs-pause-zurueck': () => {
    if (!ui.pauseZurueck) return;
    store.tagSetzen(ui.pauseZurueck, { adhsPause: null });
    ui.pauseZurueck = null;
    melden('Zurückgenommen.');
    zeichne();
  },
  'adhs-pause-grund': (el) => {
    const jetzt = (store.tagLesen(ui.tag) || {}).adhsPause;
    if (!PAUSE_GRUENDE.includes(el.dataset.id) || !jetzt) return;
    store.tagSetzen(ui.tag, { adhsPause: jetzt === el.dataset.id ? 'pause' : el.dataset.id });
    zeichne();
  },
  'adhs-pause-weg': () => {
    store.tagSetzen(ui.tag, { adhsPause: null });
    melden('Der Tag ohne Mittel ist zurückgenommen.');
    zeichne();
  },
  // „Zum Essen?" – mit dem Zeitpunkt der Angabe, damit eine später gemachte
  // in keinem Vergleich zählt (siehe essenZurEinnahme in js/adhs.js).
  'adhs-essen': (el) => {
    const e = store.eintragVon(el.dataset.id);
    const wahl = ESSEN_WAHL.find((w) => w.id === el.dataset.wert);
    if (!e || !wahl) return;
    store.eintragAendern(e.id, { essen: wahl.id, essenGesetzt: Date.now() });
    melden(`${e.mittel} ${e.um}: ${wahl.name}.`);
    zeichne();
  },
  'wechsel-gelesen': (el) => {
    const s = store.zustandLesen();
    const alt = Array.isArray(s.wechselGelesen) ? s.wechselGelesen : [];
    store.einstellen('wechselGelesen', [...alt.filter((x) => x !== el.dataset.id), el.dataset.id].slice(-50));
    melden('Gelesen. Unter „Mehr“ › „Meine Mittel“ steht der Hinweis weiter.');
    zeichne();
  },
  'adhs-angebot-ja': () => {
    store.einstellen('adhsAn', true);
    melden(SCHALTER_AN);
    zeichne();
  },
  'adhs-angebot-nein': () => {
    store.einstellen('adhsAn', false);
    melden('Gut. Unter „Mehr“ lässt es sich jederzeit einschalten.');
    zeichne();
  },
  'spannung-angebot-ja': () => {
    spannungStellen(true);
    melden(SCHALTER_AN);
    zeichne();
  },
  'spannung-angebot-nein': () => {
    store.einstellen('spannungAn', false);
    melden('Gut. Unter „Mehr“ lässt es sich jederzeit einschalten.');
    zeichne();
  },
  'adhs-schalter': () => {
    const an = store.zustandLesen().adhsAn === true;
    store.einstellen('adhsAn', !an);
    melden(an ? SCHALTER_AUS : SCHALTER_AN);
    zeichne();
  },
  'spannung-schalter': () => {
    const an = store.zustandLesen().spannungAn === true;
    spannungStellen(!an);
    melden(an ? SCHALTER_AUS : SCHALTER_AN);
    zeichne();
  },
  'v28-gelesen': () => {
    store.einstellen('v28Gesagt', true);
    zeichne();
  },
  // Die Karte „Neu" (Fassung 29): gelesen, oder gleich zu „Meine Mittel".
  'v29-gelesen': () => {
    store.einstellen('v29Gesagt', true);
    zeichne();
  },
  // Bei vollem „Meine Mittel" die Liste ohne Formular – wie bei der Rückfrage.
  'v29-meine-mittel': () => {
    store.einstellen('v29Gesagt', true);
    meineMittelZeigen({ formular: store.zustandLesen().standardMittel.length < store.STANDARD_HOECHSTENS });
  },
  /*
   * Die Rückfrage zu Methylphenidat (siehe rueckfrageKarte). Jede Antwort
   * prüft zuerst, ob die Frage noch offen ist – ein zweiter Tipp auf
   * denselben Knopf ändert nichts –, aber nicht, ob sie heute dran ist. Dass
   * ein Doppeltipp nicht gleich den Knopf des nächsten Schritts trifft, der
   * an derselben Stelle steht, regelt nachtippSperren().
   *
   * Die Form landet dort, wo formZu sie liest: Steht der Name unter „Meine
   * Mittel", dort (bei jedem Mittel dieses Namens) – das ist der dauerhafte
   * Ort, von dem aus Knopf und Bogen sie weitertragen. Sonst an der jüngsten
   * Einnahme der letzten WECHSEL_TAGE Tage; dort gilt sie ab dieser Einnahme
   * WECHSEL_TAGE Tage lang, auch für weitere Einnahmen ohne Formangabe, und
   * die Karte bietet danach an, das Mittel unter „Meine Mittel" zu merken –
   * wenn dort Platz ist, auch für den Säureblocker, falls nach ihm noch
   * gefragt wird (merkenPlatz).
   */
  'rueckfrage-form': (el) => {
    const s = store.zustandLesen();
    const k = el.dataset.schluessel;
    const x = rueckfrageOffen(s, k);
    const f = MPH_FORMEN.find((m) => m.id === el.dataset.id);
    if (!x || !f || x.frage !== 'form') { zeichne(); return; }
    ui.rueckfrage = null;
    // Jede Meldung nennt das Mittel, und springt die Karte danach zu einem
    // anderen Namen, sagt sie das (rueckfrageWeiter).
    if (f.id === 'unbekannt') {
      // „Weiß ich nicht" ändert keine Mitteldaten – nur die Rückfrage merkt es sich.
      const meins = s.standardMittel.some((m) => gleichText(m.mittel, x.name));
      store.rueckfrageSetzen([k], { form: 'weissnicht' });
      melden(`Gemerkt. Die Form von ${x.name} steht auf der Packung – angeben kannst du sie jederzeit `
        + `${meins ? 'bei deinem Mittel unter „Meine Mittel“' : 'beim Eintragen im Bogen'}.${rueckfrageWeiter(k)}`);
      rueckfrageFokus();
      zeichne();
      return;
    }
    const vorher = wechselStand();
    const vorherAlle = wechselAlle();
    const eigene = s.standardMittel.filter((m) => gleichText(m.mittel, x.name));
    if (eigene.length) {
      eigene.forEach((m) => store.standardAendern(m.id, { form: f.id }));
      melden(`Form von ${x.name}: ${f.kurzname}. Steht jetzt bei deinem Mittel unter „Meine Mittel“.`
        + `${hinweisZusatz(vorher, vorherAlle)}${rueckfrageWeiter(k)}`);
    } else {
      const e = juengsteEinnahme(s, x.name);
      if (!e) { zeichne(); return; }
      store.eintragAendern(e.id, { form: f.id });
      // Angeboten wird MERKEN unter denselben Bedingungen, unter denen es
      // danach stehen bleibt (merkenEinnahme) – mit dem Stand nach der Antwort.
      const u = { schluessel: k, schritt: 'merken', einnahme: e.id, form: f.id };
      const nachher = store.zustandLesen();
      const y = rueckfrageOffen(nachher, k);
      if (y && merkenEinnahme(nachher, y, u)) rueckfrageSchritt(u);
      melden(`Form von ${x.name}: ${f.kurzname}. Bei deiner Einnahme ${wannText(e.am)} vermerkt.`
        + `${hinweisZusatz(vorher, vorherAlle)}${rueckfrageWeiter(k)}`);
    }
    rueckfrageFokus();
    zeichne();
  },
  // Gelegt wird die Form, die jetzt an der Einnahme steht – und nur, solange
  // sie die beantwortete ist (merkenEinnahme). Sonst ist der Schritt vorbei.
  'rueckfrage-merken': () => {
    const u = ui.rueckfrage;
    const s = store.zustandLesen();
    ui.rueckfrage = null;
    const x = u && u.schritt === 'merken' ? rueckfrageOffen(s, u.schluessel) : null;
    const e = x ? merkenEinnahme(s, x, u) : null;
    const f = e ? MPH_FORMEN.find((m) => m.id === e.form) : null;
    if (!f) { zeichne(); return; }
    const res = store.standardMerken({
      mittel: x.name, dosis: e.dosis || '', tageszeit: null, bezug: null, form: f.id,
    });
    if (res.fehler === 'voll') {
      melden(vollMeldung(store.zustandLesen()));
      zeichne();
      return;
    }
    if (res.fehler) { zeichne(); return; }
    melden((res.schon ? `${x.name} steht schon bei deinen Mitteln.`
      : `${x.name} steht jetzt bei deinen Mitteln, mit der Form „${f.kurzname}“.`) + rueckfrageWeiter(x.schluessel));
    rueckfrageFokus();
    zeichne();
  },
  // Die Form bleibt an der Einnahme – und gilt dort so, wie formZu sie liest.
  // Gilt sie inzwischen nicht mehr (merkenEinnahme), sagt die Meldung das
  // nicht: Der Knopf stand nur noch, weil das Neuzeichnen ihn nicht erreicht hatte.
  'rueckfrage-nicht-merken': () => {
    const u = ui.rueckfrage;
    const s = store.zustandLesen();
    ui.rueckfrage = null;
    const x = u && u.schritt === 'merken' ? rueckfrageOffen(s, u.schluessel) : null;
    if (!x || !merkenEinnahme(s, x, u)) { zeichne(); return; }
    melden(`Gut. Die Form von ${x.name} gilt ab dieser Einnahme ${WECHSEL_TAGE} Tage lang, auch für weitere ohne Formangabe. `
      + `Eine andere kannst du beim Eintragen im Bogen angeben.${rueckfrageWeiter(x.schluessel)}`);
    rueckfrageFokus();
    zeichne();
  },
  /*
   * „Ja" führt zur Wahl. Ist „Meine Mittel" voll, steht dort der Satz dazu
   * und der Weg hin. Der Tag zählt trotzdem (siehe tagAnsicht): Den Weg gibt
   * es gleich, und WELCHES bleibt für den Rest des Tages stehen – wer so
   * viele entfernt, wie der Satz sagt (meist eins, nach dem Zusammenführen
   * auch mehr, siehe zuVieleMittel), und zurückkommt, findet die Wahl.
   */
  'rueckfrage-saeure-ja': (el) => {
    const s = store.zustandLesen();
    const k = el.dataset.schluessel;
    const x = rueckfrageOffen(s, k);
    if (!x || x.frage !== 'saeure') { zeichne(); return; }
    rueckfrageSchritt({ schluessel: k, schritt: 'welches', eigen: '' });
    rueckfrageFokus();
    zeichne();
  },
  /*
   * „Nein" gilt für jeden Methylphenidat-Namen, der bis jetzt dasteht – auch
   * für einen ohne offene Säurefrage (alleMphSchluessel): gefragt ist nach
   * dem Menschen, nicht nach dem einzelnen Mittel. Ein Methylphenidat, das
   * später unter einem neuen Namen dazukommt, ist ein neues Mittel und wird
   * noch einmal gefragt – genau das sagt die Meldung, und sie nennt die
   * Frage beim Namen: Folgt gleich die Formfrage zu einem zweiten Namen,
   * widerspricht sie ihr nicht.
   */
  'rueckfrage-saeure-nein': (el) => {
    const s = store.zustandLesen();
    const x = rueckfrageOffen(s, el.dataset.schluessel);
    if (!x || x.frage !== 'saeure') { zeichne(); return; }
    store.rueckfrageSetzen([...new Set([...alleOffenSaeure(s), ...alleMphSchluessel(s)])], { saeure: 'nein' });
    ui.rueckfrage = null;
    melden('Gemerkt. Nach einem Mittel gegen Magensäure fragt Body Check erst bei einem neuen Methylphenidat-Namen '
      + 'wieder. Kommt eins dazu, trag es beim Eintragen oder unter „Meine Mittel“ ein.'
      + rueckfrageWeiter(x.schluessel));
    rueckfrageFokus();
    zeichne();
  },
  'rueckfrage-name': (el) => saeureAnlegen(el.dataset.name, false),
  'rueckfrage-eigen': () => {
    const feld = document.getElementById('rueckfrageName');
    saeureAnlegen(feld ? feld.value : (ui.rueckfrage || {}).eigen, false);
  },
  'rueckfrage-trotzdem': () => saeureAnlegen((ui.rueckfrage || {}).eigen, true),
  'rueckfrage-aendern': () => {
    if (!ui.rueckfrage) { zeichne(); return; }
    rueckfrageSchritt({ ...ui.rueckfrage, schritt: 'welches' });
    rueckfrageFokus('rueckfrageName');
    zeichne();
  },
  'rueckfrage-zurueck': () => {
    ui.rueckfrage = null;
    rueckfrageFokus();
    zeichne();
  },
  // „Meine Mittel" ist voll: dorthin, zur Liste mit den Knöpfen zum Entfernen –
  // ohne ein Formular für ein neues Mittel, das sich ohnehin nicht speichern
  // ließe. Ist danach Platz, steht beim Zurückkommen (am selben Tag) die Wahl
  // da; sonst sagt der Satz, wie viele noch weg müssen.
  'rueckfrage-meine-mittel': () => meineMittelZeigen({ formular: false }),
  /*
   * „Später" und „Nicht mehr fragen": für heute keine Rückfrage mehr, auch
   * nicht zu einem zweiten Namen. Die Meldung nennt das Mittel, wie jede
   * Meldung zu einem einzelnen Namen: Die Woche gilt diesem Namen. Ein
   * Methylphenidat, das an einem späteren Tag unter einem anderen Namen
   * dazukommt, hat eigene Tage – ohne den Namen läse sich die Meldung wie
   * eine Zusage für die ganze Rückfrage.
   */
  'rueckfrage-spaeter': (el) => {
    const x = rueckfrageOffen(store.zustandLesen(), el.dataset.schluessel);
    if (!x) { zeichne(); return; }
    store.rueckfrageZu(heuteISO());
    ui.rueckfrage = null;
    melden(`Gut. Zu ${x.name} fragt Body Check frühestens in einer Woche noch ein letztes Mal.`);
    zeichne();
  },
  /*
   * „Rückgängig" ist der einzige Weg zurück und steht acht Sekunden. Hatte
   * der Knopf den Fokus (Tastatur, Schaltersteuerung, VoiceOver), geht er
   * dorthin und nicht mit der verschwundenen Karte an den Seitenanfang –
   * wie beim Entfernen unter „Meine Mittel".
   */
  'rueckfrage-nie': (el) => {
    const k = el.dataset.schluessel;
    const x = rueckfrageOffen(store.zustandLesen(), k);
    if (!x) { zeichne(); return; }
    const fokus = document.activeElement === el;
    store.rueckfrageSetzen([k], { nie: true });
    store.rueckfrageZu(heuteISO());
    ui.rueckfrage = null;
    melden(`Gut. Zu ${x.name} fragt Body Check nicht mehr.`, { act: 'rueckfrage-nie-zurueck', id: k, text: 'Rückgängig' });
    zeichne();
    fokusNachEntfernen(fokus);
  },
  'rueckfrage-nie-zurueck': (el) => {
    const k = el.dataset.id;
    if (!k) return;
    store.rueckfrageSetzen([k], { nie: false });
    store.rueckfrageZu(null);
    melden('Gut. Die Frage steht wieder auf „Tag“.');
    rueckfrageFokus();
    zeichne();
  },
  /*
   * Die Form eines eigenen Mittels unter „Mehr" › „Meine Mittel". Ein
   * zweiter Tipp nimmt sie zurück („nicht angegeben").
   */
  'mph-form': (el) => {
    const s = store.zustandLesen();
    const m = s.standardMittel.find((x) => x.id === el.dataset.mittel);
    if (!m) return;
    const wechselVorher = wechselStand();
    const form = m.form === el.dataset.id ? null : el.dataset.id;
    store.standardAendern(m.id, { form });
    melden((form ? `Form: ${mphForm(form).kurzname}.` : 'Form nicht angegeben.') + wechselZusatz(wechselVorher));
    zeichne();
  },
  // Vom Satz auf dem Tag-Reiter direkt zur Karte unter „Mehr" (siehe meineMittelZeigen).
  'meine-mittel-zeigen': () => meineMittelZeigen(),
  'meinmittel-neu': () => {
    ui.mittelForm = { id: null, mittel: '', dosis: '', tageszeit: null, bezug: null };
    zeichne();
    mittelFeldFokus();
  },
  'meinmittel-aendern': (el) => {
    const m = store.zustandLesen().standardMittel.find((x) => x.id === el.dataset.id);
    if (!m) return;
    ui.mittelForm = {
      id: m.id, mittel: m.mittel, dosis: m.dosis || '', tageszeit: m.tageszeit || null, bezug: m.bezug || null,
    };
    zeichne();
    mittelFeldFokus();
  },
  // Zwei Tipps und „Rückgängig", wie bei den eigenen Aktivitäten.
  'meinmittel-weg': (el) => {
    if (!zweiterTipp(el)) return;
    const fokus = document.activeElement === el;
    const weg = store.standardEntfernen(el.dataset.id);
    if (ui.mittelForm && ui.mittelForm.id === el.dataset.id) ui.mittelForm = null;
    ui.entfernt = weg ? { art: 'mittel', weg } : null;
    melden('Aus deinen Mitteln genommen. Die Einträge bleiben.',
      weg ? { act: 'entfernt-zurueck', text: 'Rückgängig' } : null);
    zeichne();
    fokusNachEntfernen(fokus);
  },
  // Ein zweiter Tipp nimmt die Wahl zurück – „ohne feste Zeit" ist eine
  // zulässige Antwort.
  'mm-tageszeit': (el) => {
    if (!ui.mittelForm) return;
    ui.mittelForm.tageszeit = ui.mittelForm.tageszeit === el.dataset.id ? null : el.dataset.id;
    zeichne();
  },
  'mm-bezug': (el) => {
    if (!ui.mittelForm) return;
    ui.mittelForm.bezug = ui.mittelForm.bezug === el.dataset.id ? null : el.dataset.id;
    zeichne();
  },
  'mm-abbrechen': () => { ui.mittelForm = null; zeichne(); },
  /*
   * Merken, ohne einzutragen: Wer seine Tabletten einmal anlegt, hat sie
   * damit noch nicht genommen. Eine Einnahme entsteht erst mit dem Tipp auf
   * dem Tag-Reiter.
   */
  'mm-speichern': () => {
    const f = ui.mittelForm;
    if (!f) return;
    const wechselVorher = wechselStand();
    const r = f.id ? store.standardAendern(f.id, f) : store.standardMerken(f);
    if (r.fehler === 'leer') { melden('Wie heißt das Mittel?'); return; }
    if (r.fehler === 'voll') {
      melden(vollMeldung(store.zustandLesen()));
      return;
    }
    if (r.schon || r.fehler === 'doppelt') { melden('Genau so steht es schon bei deinen Mitteln.'); return; }
    ui.mittelForm = null;
    melden((f.id
      ? 'Geändert. Was schon eingetragen ist, bleibt, wie es war.'
      : 'Bei deinen Mitteln gemerkt. Eingetragen ist damit noch nichts – das macht ein Tipp auf dem Tag-Reiter.')
      + wechselZusatz(wechselVorher));
    zeichne();
  },
  'zeit-tageszeit': (el) => {
    const t = TAGESZEITEN.find((x) => x.id === el.dataset.id);
    const e = ui.bogen && ui.bogen.entwurf;
    if (!t || !e) return;
    const patch = { tageszeit: t.id, ungefaehr: true, um: t.um, bezugBasis: t.um, bezugMahlzeit: null };
    // Steht schon ein Bezug zum Essen, gilt er jetzt für die Mahlzeit dieser
    // Tageszeit: „nach dem Essen" und dann „mittags" heißt nach dem Mittagessen.
    if (e.bezug && MIT_ESSENSBEZUG.includes(ui.bogen.art)) {
      Object.assign(patch, zeitMitBezug(store.zustandLesen(), e.am, t.um, e.bezug, t.id));
    }
    entwurf(patch);
  },
  'zeit-bezug': (el) => {
    const e = ui.bogen && ui.bogen.entwurf;
    if (!e || !ESSENSBEZUG.some((x) => x.id === el.dataset.id)) return;
    // Noch einmal getippt: der Bezug fällt weg, die Zeit bleibt.
    if (e.bezug === el.dataset.id) {
      entwurf({ bezug: null, bezugMahlzeit: null, ungefaehr: !!e.tageszeit });
      return;
    }
    // Gerechnet wird von der Zeit vor dem ersten Bezug aus. Sonst wanderte die
    // Uhrzeit bei „vor" und dann „nach" jedes Mal eine halbe Stunde weiter.
    // Mit gewählter Tageszeit nur an einer Mahlzeit dieser Tageszeit, sonst
    // an einer der Tageszeit der Uhrzeit (siehe bezugsMahlzeit).
    const t = TAGESZEITEN.find((x) => x.id === e.tageszeit);
    const basis = e.bezugBasis || (t ? t.um : e.um);
    // Ohne Tageszeit und ohne Uhrzeit gibt es nichts, wovon aus „vor dem
    // Essen" gälte – aus dem leeren Feld würde sonst 00:30.
    if (!t && !istUhr(basis)) {
      melden('Erst „morgens“, „mittags“ oder „abends“ antippen oder eine Uhrzeit wählen – dann vor, beim oder nach dem Essen.');
      return;
    }
    entwurf({
      bezug: el.dataset.id,
      ungefaehr: true,
      bezugBasis: basis,
      ...zeitMitBezug(store.zustandLesen(), e.am, basis, el.dataset.id, t ? t.id : null),
    });
  },
  'bogen-speichern': bogenSpeichern,
  staerke: (el) => entwurf({ staerke: Number(el.dataset.n) }),
  portion: (el) => entwurf({ portion: el.dataset.id }),
  zutat: (el) => {
    if (!ui.bogen) return;
    const id = el.dataset.id;
    const liste = ui.bogen.entwurf.zutaten || [];
    entwurf({
      zutaten: liste.some((z) => z.id === id)
        ? liste.filter((z) => z.id !== id)
        : [...liste, { id, rolle: ROLLE_VORGABE }],
    });
  },
  /*
   * Eine frühere Mahlzeit vollständig übernehmen – Text, Zutaten samt Rollen,
   * Portion. Die Liste wird hier neu gerechnet statt beim Zeichnen gemerkt:
   * gleiche Eingabe, gleiche Reihenfolge, und das Zeichnen bleibt frei von
   * Nebenwirkungen.
   */
  vorlage: (el) => {
    const liste = haeufigeMahlzeiten(store.zustandLesen().eintraege, 6);
    const v = liste[Number(el.dataset.i)];
    if (!v) return;
    entwurf({
      was: v.text, zutaten: v.zutaten.map((z) => ({ ...z })), portion: v.portion, auswaerts: !!v.auswaerts,
    });
  },
  /*
   * Dasselbe, aber ohne Bogen: eintragen und fertig.
   *
   * Die Liste wird hier neu gerechnet statt beim Zeichnen gemerkt – gleiche
   * Eingabe, gleiche Reihenfolge, und das Zeichnen bleibt frei von
   * Nebenwirkungen. Die Meldung nennt, was eingetragen wurde: Ein Tipp, der
   * still etwas anlegt, ist ein Tipp, dem man nicht traut.
   */
  schnell: (el) => {
    const s = store.zustandLesen();
    const liste = haeufigeMahlzeiten(s.eintraege, 12).filter((v) => v.anzahl >= 2);
    const v = liste[Number(el.dataset.i)];
    if (!v) return;
    const mahlzeit = {
      was: v.text, zutaten: v.zutaten.map((z) => ({ ...z })), portion: v.portion,
      ...(v.auswaerts ? { auswaerts: true } : {}),
    };
    // Für einen vergangenen Tag kein „jetzt": der Bogen, vorgefüllt, und die
    // Zeit mit einem Knopf. Leer, nicht 12:00 – sonst stünde nach einem
    // eiligen „Eintragen" ein Frühstück genau um zwölf da.
    if (ui.tag !== heuteISO()) {
      bogenOeffnen('essen');
      entwurf({ ...mahlzeit, um: '' });
      melden('Wann war das? Unter der Uhrzeit antippen.');
      return;
    }
    const id = store.eintragen({ art: 'essen', am: heuteISO(), um: jetztUhr(), ...mahlzeit });
    const nachgezogen = nachziehen(id, null, store.eintragVon(id));
    ui.tag = heuteISO();
    melden(`${kuerze(v.text, 24)} eingetragen.${nachgezogen ? ` ${nachgezogen}` : ''}`);
    zeichne();
  },
  beschwerdeart: (el) => umschalten('arten', el.dataset.id),
  // „Einseitig" und „Beidseitig" schließen sich aus: Wer das eine antippt,
  // nimmt das andere zurück.
  kopfart: (el) => {
    const id = el.dataset.id;
    const b = ui.bogen;
    if (b && KOPF_SEITE.includes(id) && !(b.entwurf.kopfArten || []).includes(id)) {
      b.entwurf.kopfArten = (b.entwurf.kopfArten || []).filter((x) => !KOPF_SEITE.includes(x));
    }
    umschalten('kopfArten', id);
  },
  // Ein zweites Tippen nimmt die Dauer zurück – „weiß ich nicht mehr" ist eine
  // zulässige Antwort und etwas anderes als die kürzeste Stufe.
  kopfdauer: (el) => entwurf({
    dauer: ui.bogen.entwurf.dauer === el.dataset.id ? null : el.dataset.id,
  }),
  'kopf-verlauf': (el) => entwurf({
    verlauf: ui.bogen.entwurf.verlauf === el.dataset.id ? null : el.dataset.id,
  }),
  'kopf-wirkung': (el) => entwurf({
    mittelWirkung: ui.bogen.entwurf.mittelWirkung === el.dataset.id ? null : el.dataset.id,
  }),
  'kopf-dazu': (el) => umschalten('dazuMittel', el.dataset.id),
  // Nachtragen von der Tageskarte aus: ein Tipp, kein Bogen.
  'kopf-nachtrag': (el) => {
    const feld = el.dataset.feld;
    if (!['dauer', 'verlauf'].includes(feld)) return;
    store.eintragAendern(el.dataset.id, { [feld]: el.dataset.wert });
    melden(el.dataset.wert === UNBEKANNT ? 'In Ordnung – bleibt offen.' : 'Nachgetragen.');
    zeichne();
  },
  warnzeichen: (el) => umschalten('warnzeichen', el.dataset.id),
  'mittel-vorschlag': (el) => entwurf({ mittel: el.dataset.id }),
  auswaerts: () => { if (ui.bogen) entwurf({ auswaerts: ui.bogen.entwurf.auswaerts !== true }); },

  /* ---------- Aktivitäten ---------- */

  'aktiv-wahl': (el) => umschalten('aktivitaeten', el.dataset.id),
  // Ein zweiter Tipp nimmt die Stufe zurück – „ohne Angabe" ist zulässig.
  'aktiv-intensitaet': (el) => {
    if (!ui.bogen) return;
    entwurf({ intensitaet: ui.bogen.entwurf.intensitaet === el.dataset.id ? null : el.dataset.id });
  },
  'aktiv-eigen': () => { aktivEigenDazu(); },
  /*
   * Auswärts gegessen gehört zur Mahlzeit (siehe js/aktivitaet.js, warum).
   * Der Weg dorthin nimmt Tag und Zeit mit, damit niemand sie zweimal wählt.
   *
   * Was im Aktivitätsbogen schon gewählt oder getippt ist – „Feier/Ausgehen"
   * und auswärts essen fallen oft zusammen –, wird vorher eingetragen, auf
   * demselben Weg wie mit „Eintragen", und die Meldung sagt das. Früher
   * verschwand es still mit dem Bogen. Scheitert das Eintragen (keine Zeit,
   * Liste voll), bleibt der Bogen mit seiner Meldung stehen.
   */
  'aktiv-auswaerts': () => {
    const b = ui.bogen;
    if (!b) return;
    const { am, um, ungefaehr, tageszeit } = b.entwurf;
    const zeitGesetzt = b.zeitGesetzt;
    let namen = [];
    if ((b.entwurf.aktivitaeten || []).length || String(b.aktivName || '').trim()) {
      bogenSpeichern();
      if (ui.bogen) return;
      // Der Entwurf trägt danach auch den getippten Namen (aktivEigenDazu).
      const eigene = store.zustandLesen().eigeneAktivitaeten;
      namen = (b.entwurf.aktivitaeten || []).map((id) => aktivitaetName(id, eigene));
    }
    bogenOeffnen('essen');
    entwurf({ am, um, auswaerts: true, ...(ungefaehr ? { ungefaehr: true, tageszeit: tageszeit || null } : {}) });
    ui.bogen.zeitGesetzt = !!zeitGesetzt;
    melden(namen.length
      ? `${namen.join(' · ')} eingetragen – jetzt die Mahlzeit, mit „Auswärts gegessen“.`
      : 'Als Mahlzeit, mit „Auswärts gegessen“ – so zählt es bei den Auslösern.');
  },
  /*
   * Ein Tipp in der Reihe „Zuletzt gemacht": heute mit der jetzigen Uhrzeit
   * eingetragen, an einem anderen Tag der Bogen, vorgefüllt. Die Meldung
   * nennt, was eingetragen wurde, samt Uhrzeit – ein Tipp, der still etwas
   * anlegt, ist einer, dem man nicht traut.
   */
  'aktiv-schnell': (el) => {
    const s = store.zustandLesen();
    const id = el.dataset.id;
    if (!id) return;
    const a = aktivitaetVon(id, s.eigeneAktivitaeten);
    if (ui.tag !== heuteISO()) {
      bogenOeffnen('aktivitaet');
      // Ohne Uhrzeit, wie bei „Noch mal wie immer" – siehe dort.
      entwurf({ aktivitaeten: [id], um: '' });
      melden('Wann war das? Unter der Uhrzeit antippen.');
      return;
    }
    const um = jetztUhr();
    store.eintragen({ art: 'aktivitaet', am: heuteISO(), um, aktivitaeten: [id] });
    melden(`${a.name} eingetragen (${um}).`);
    zeichne();
  },
  'aktiv-neu': () => {
    const feld = document.getElementById('neueAktivitaet');
    const name = String((feld && feld.value) || '').trim().slice(0, store.AKTIV_NAME_MAX);
    if (!name) { melden('Kein Name eingegeben.'); return; }
    const s = store.zustandLesen();
    const gleich = (a) => a.name.toLowerCase() === name.toLowerCase();
    const da = [...AKTIVITAETEN, ...sichtbareEigene(s.eigeneAktivitaeten)].find(gleich);
    if (da) { melden(`„${da.name}“ steht schon in der Auswahl.`); return; }
    const weg = (s.eigeneAktivitaeten || []).find((a) => a.ausgeblendet && gleich(a));
    const r = store.aktivitaetAnlegen(weg ? weg.id : freieAktivitaetId(name, s.eigeneAktivitaeten), name);
    if (r.fehler === 'voll') {
      melden(`Mehr als ${store.AKTIV_HOECHSTENS} eigene Aktivitäten passen nicht. Entferne erst eine.`);
      return;
    }
    if (r.fehler) { melden('Kein Name eingegeben.'); return; }
    if (feld) feld.value = '';
    melden(`„${aktivitaetName(r.id, store.zustandLesen().eigeneAktivitaeten)}“ steht jetzt zur Auswahl.`);
    zeichne();
  },
  /*
   * Entfernen wie Löschen im Strang: Der erste Tipp fragt, der zweite nimmt
   * aus der Auswahl – und „Rückgängig" holt zurück. Das × steht gleich neben
   * anderen Knöpfen, ein Tipp daneben hätte sonst still etwas entfernt.
   */
  'aktiv-weg': (el) => {
    if (!zweiterTipp(el)) return;
    const id = el.dataset.id;
    const fokus = document.activeElement === el;
    store.aktivitaetEntfernen(id);
    ui.entfernt = { art: 'aktiv', id };
    melden('Aus der Auswahl genommen. Die Einträge damit bleiben.', { act: 'entfernt-zurueck', text: 'Rückgängig' });
    zeichne();
    fokusNachEntfernen(fokus);
  },
  'entfernt-zurueck': () => {
    const w = ui.entfernt;
    if (!w) return;
    ui.entfernt = null;
    const ok = w.art === 'aktiv' ? store.aktivitaetZurueck(w.id) : store.standardZurueck(w.weg);
    melden(ok ? 'Zurückgeholt.' : 'Ging nicht – die Liste ist inzwischen voll oder es steht schon da.');
    zeichne();
  },

  bristol: (el) => entwurf({ form: Number(el.dataset.n) }),
  'stuhl-dringend': () => entwurf({ dringend: !ui.bogen.entwurf.dringend }),
  'stuhl-unfertig': () => entwurf({ unvollstaendig: !ui.bogen.entwurf.unvollstaendig }),
  // Ein zweites Tippen nimmt die Antwort zurück: „nicht beantwortet" und
  // „unverändert" sind verschiedene Dinge, und nur das zweite zählt in der
  // Rom-Prüfung als Antwort.
  stuhlbezug: (el) => entwurf({
    stuhlbezug: ui.bogen.entwurf.stuhlbezug === el.dataset.id ? null : el.dataset.id,
  }),

  'versuch-start': (el) => {
    const s = store.zustandLesen();
    if (s.versuch && !s.versuch.beendet && phase(s.versuch, heuteISO()) !== 'fertig'
        && !window.confirm('Es läuft schon ein Versuch. Der neue ersetzt ihn – das Ergebnis des alten ist dann weg. Trotzdem?')) return;
    store.versuchStarten(el.dataset.art, el.dataset.id, Number(el.dataset.n) || 14);
    store.einstellen('tab', 'heute');
    melden('Versuch gestartet. Er steht ab jetzt auf dem Tagesreiter.');
    zeichne();
  },
  'versuch-provokation': () => {
    store.versuchProvozieren(heuteISO());
    melden('Notiert. Jetzt drei Tage weiter eintragen wie sonst.');
    zeichne();
  },
  'versuch-beenden': () => {
    if (!window.confirm('Versuch abbrechen? Er bleibt mit dem stehen, was bis jetzt zusammengekommen ist.')) return;
    store.versuchBeenden();
    zeichne();
  },
  'versuch-ablegen': () => {
    store.versuchAblegen();
    melden('Abgehakt – bleibt unter „Schon geprüft" stehen.');
    zeichne();
  },
  'versuch-alt-weg': (el) => { store.versuchLoeschen(el.dataset.id); zeichne(); },

  'prov-start': (el) => {
    const x = PRUEFBAR.find((k) => k.id === el.dataset.id);
    if (!x) return;
    const s = store.zustandLesen();
    if (s.provokation && !s.provokation.beendet
        && !window.confirm('Es läuft schon ein Test. Der neue ersetzt ihn – die bisherigen Durchgänge sind dann weg. Trotzdem?')) return;
    store.provokationStarten('klasse', x.id, x.was);
    store.einstellen('tab', 'heute');
    melden('Angelegt. Der erste Durchgang ist morgen früh, nüchtern.');
    zeichne();
  },
  /*
   * Der Durchgang wird mit der *jetzigen* Uhrzeit festgehalten und nicht
   * nachträglich gesetzt. Daran hängt das ganze Beobachtungsfenster: Ein
   * Durchgang „irgendwann am Dienstag" ließe die Rechnung auf Mittag raten und
   * damit Beschwerden mitzählen, die Stunden davor kamen.
   */
  'prov-lauf': () => {
    store.provokationLauf(false);
    melden(`Notiert. Jetzt nichts essen und eintragen, wie es dir geht.`);
    zeichne();
  },
  'prov-leer': () => {
    store.provokationLauf(true);
    melden('Leerdurchgang notiert – derselbe Ablauf, nur ohne die Sache.');
    zeichne();
  },
  'prov-lauf-weg': (el) => {
    store.provokationLaufWeg(el.dataset.am, el.dataset.um);
    zeichne();
  },
  'prov-beenden': () => {
    if (!window.confirm('Test abbrechen? Er bleibt mit den bisherigen Durchgängen stehen.')) return;
    store.provokationBeenden();
    zeichne();
  },
  'prov-ablegen': () => {
    store.provokationAblegen();
    melden('Abgehakt – bleibt unter „Schon getestet" stehen.');
    zeichne();
  },
  'prov-alt-weg': (el) => { store.provokationLoeschen(el.dataset.id); zeichne(); },

  /*
   * Die Auswahl der Gruppen lebt in `ui` und nicht im Speicher: Sie gilt nur
   * für den Moment, in dem jemand vor der Liste sitzt und überlegt. Erst der
   * Start schreibt etwas fest.
   */
  'plan-gruppe': (el) => {
    const alle = FODMAP_GRUPPEN.map((g) => g.id);
    const jetzt = ui.planGruppen || alle;
    ui.planGruppen = jetzt.includes(el.dataset.id)
      ? jetzt.filter((g) => g !== el.dataset.id)
      : alle.filter((g) => jetzt.includes(g) || g === el.dataset.id);
    zeichne();
  },
  'plan-start': (el) => {
    const gruppen = ui.planGruppen || FODMAP_GRUPPEN.map((g) => g.id);
    if (!gruppen.length) { melden('Wähle mindestens eine Gruppe aus.'); return; }
    if (!window.confirm('Der Plan dauert mehrere Wochen. Vorher geklärt: Ist Zöliakie schon einmal ausgeschlossen worden? Der Bluttest geht nur, solange noch Gluten gegessen wird.')) return;
    store.planStarten(gruppen, Number(el.dataset.n) || 21);
    store.einstellen('tab', 'heute');
    melden('Karenz läuft. Was heute dran ist, steht ab jetzt oben auf dem Tagesreiter.');
    zeichne();
  },
  'stufe-los': () => {
    const s = store.zustandLesen();
    const b = planBild(s.stufenplan, s.eintraege, s.tage, heuteISO());
    const naechste = (b && b.stand.naechste) || (b && b.offen[0]);
    if (!naechste) return;
    const g = GRUPPE_VON[naechste] || {};
    store.stufeStarten(naechste);
    melden(`${g.name || naechste}: heute ${(g.mengen || [])[0] || 'die erste Menge'} `
      + `${g.womit || ''}, sonst weiter wie in der Karenz.`);
    zeichne();
  },
  /*
   * Eine Stufe verwerfen ist kein Schönmachen, sondern Notwehr gegen das
   * wirkliche Leben: Kommt mitten in der Weizenstufe ein Infekt oder eine
   * Feier dazwischen, messen diese drei Tage nicht die Gruppe. Sie stehen zu
   * lassen hieße, die Gruppe zu Unrecht durchfallen zu lassen – und jemand
   * striche dann jahrelang Brot.
   */
  'stufe-weg': (el) => {
    if (!window.confirm('Diese Stufe verwerfen? Sie zählt dann nicht mehr und kann noch einmal gemacht werden.')) return;
    store.stufeVerwerfen(el.dataset.id);
    zeichne();
  },
  'plan-beenden': () => {
    if (!window.confirm('Stufenplan beenden? Was bisher herauskam, bleibt stehen.')) return;
    store.planBeenden();
    zeichne();
  },
  'plan-ablegen': () => {
    store.planAblegen();
    melden('Abgehakt – bleibt unter „Frühere Stufenpläne" stehen.');
    zeichne();
  },
  'plan-alt-weg': (el) => { store.planLoeschen(el.dataset.id); zeichne(); },

  'erinnern-zeit': (el) => { ui.erinnerungZeit = el.dataset.z; zeichne(); },
  /*
   * Ein einzelner Termin, kein wiederkehrender: Ein Wecker, der nach dem
   * Durchgang weiter jeden Tag klingelt, wird gelöscht – und meistens der
   * tägliche gleich mit.
   */
  'termin-kalender': (el) => {
    const text = terminEintrag({
      am: el.dataset.am,
      uhr: '09:00',
      titel: el.dataset.titel,
      text: el.dataset.text,
    });
    if (!text) { melden('Für diesen Tag geht das nicht.'); return; }
    datenAusgeben(text, `body-check-${el.dataset.am}.ics`, 'text/calendar;charset=utf-8');
    melden('Termin erzeugt – dein Kalender fragt gleich, ob er ihn übernehmen soll.');
  },
  'erinnern-datei': () => {
    datenAusgeben(erinnerungsTermin(ui.erinnerungZeit || '20:00'),
      KALENDER_NAME, 'text/calendar;charset=utf-8');
    melden('Datei erzeugt – dein Kalender fragt gleich, ob er sie übernehmen soll.');
  },
  /*
   * Der zweite Weg, und er ist kein Beiwerk: In einer eingebetteten Fassung
   * unterbindet der Rahmen jeden Download, den die Seite selbst auslöst –
   * derselbe Grund, aus dem es die Sicherung auch als Text gibt. Dann ist das
   * Teilen-Menü der einzige Ausgang.
   */
  'erinnern-teilen': async () => {
    const text = erinnerungsTermin(ui.erinnerungZeit || '20:00');
    try {
      const datei = new File([text], KALENDER_NAME, { type: 'text/calendar' });
      if (navigator.canShare && navigator.canShare({ files: [datei] })) {
        await navigator.share({ files: [datei], title: 'Body Check – Erinnerung' });
        return;
      }
      throw new Error('kein Teilen von Dateien');
    } catch {
      // Auch das kann scheitern (abgebrochen, nicht erlaubt) – dann bleibt der
      // gewöhnliche Weg, und der wird hier genannt statt verschwiegen.
      melden('Das Teilen ging nicht. Nimm „In den Kalender legen".');
    }
  },

  'tag-blaettern': (el) => {
    ui.tag = plusTage(ui.tag, Number(el.dataset.d));
    zeichne();
  },
  'tag-waehlen': (el) => {
    ui.tag = el.dataset.iso;
    store.einstellen('tab', 'heute');
    zeichne();
  },
  'monat-blaettern': (el) => {
    ui.monat = plusMonate(ui.monat, Number(el.dataset.d));
    zeichne();
  },
  zeitraum: (el) => { ui.zeitraum = Number(el.dataset.n); zeichne(); },

  tagfrage: (el) => {
    const id = el.dataset.id;
    const n = Number(el.dataset.n);
    const jetzt = store.tagLesen(ui.tag)[id];
    store.tagSetzen(ui.tag, { [id]: jetzt === n ? null : n });
    zeichne();
  },
  wasser: (el) => {
    const iso = ui.tag;
    const dazu = Number(el.dataset.d) > 0;
    const vorher = wasserVon(store.tagLesen(iso));
    const n = store.wasserZaehlen(iso, dazu ? 1 : -1);
    if (n === null) return;
    const tag = Math.abs(tageDazwischen(iso, heuteISO())) <= 1 ? fmtTag(iso) : fmtDatum(iso);
    const stand = `${tag.charAt(0).toUpperCase()}${tag.slice(1)}: ${n ? mehrzahl(n, 'Glas', 'Gläser') : 'keins mehr'}.`;
    if (dazu && n === vorher) {
      melden(`Mehr als ${WASSER_HOECHSTENS} Gläser an einem Tag zählt Body Check nicht.`);
    } else {
      melden(`${dazu ? 'Ein Glas dazu.' : 'Ein Glas zurückgenommen.'} ${stand}`);
    }
    zeichne();
    // Bei null ist das Minus aus und kann den Fokus nicht halten. Dann
    // wandert er zum Plus, statt an den Anfang der Seite zu fallen.
    if (!n && document.activeElement === el) {
      setTimeout(() => { const plus = document.getElementById('wasserMehr'); if (plus) plus.focus(); }, 0);
    }
  },
  'wasser-zeigen': () => {
    const an = store.zustandLesen().wasserZeigen !== false;
    store.einstellen('wasserZeigen', !an);
    melden(an ? 'Wasser steht nicht mehr auf „Tag“. Schon Gezähltes bleibt.' : 'Wasser steht wieder auf „Tag“.');
    zeichne();
  },
  'wasser-glas': (el) => { store.einstellen('wasserGlas', glasMl(el.dataset.n)); zeichne(); },
  'seit-weg': () => { store.einstellen('beschwerdenSeit', null); zeichne(); },
  frageAn: (el) => {
    const gewaehlt = store.zustandLesen().tagesfragen || [];
    const id = el.dataset.id;
    store.einstellen('tagesfragen', gewaehlt.includes(id)
      ? gewaehlt.filter((x) => x !== id) : [...gewaehlt, id]);
    zeichne();
  },
  ton: () => {
    store.einstellen('ton', !store.zustandLesen().ton);
    zeichne();
  },

  'atem-uebung': (el) => { store.einstellen('atemUebung', el.dataset.id); zeichne(); },
  'atem-runden': (el) => { store.einstellen('atemRunden', Number(el.dataset.n)); zeichne(); },
  'atem-start': () => atemStart(store.zustandLesen()),
  'atem-stopp': atemStopp,

  fenster: (el) => { store.einstellen('fenster', Number(el.dataset.n)); zeichne(); },
  mindest: (el) => { store.einstellen('mindestFaelle', Number(el.dataset.n)); zeichne(); },
  theme: (el) => { store.einstellen('theme', el.dataset.id); zeichne(); },

  'ausloeser-neu': () => {
    const feld = document.getElementById('neuerAusloeser');
    const name = (feld.value || '').trim();
    if (!name) { melden('Kein Name eingegeben.'); return; }
    store.ausloeserAnlegen(eigeneId(name), name);
    feld.value = '';
    melden(`„${name}" steht jetzt zur Auswahl.`);
    zeichne();
  },
  'ausloeser-weg': (el) => { store.ausloeserLoeschen(el.dataset.id); zeichne(); },

  /*
   * In Safari: das Tagebuch in die Zwischenablage, für die App auf dem
   * Startbildschirm.
   *
   * writeText() wird ohne vorheriges await aufgerufen: Safari erlaubt die
   * Zwischenablage nur innerhalb des Tipps, und jedes await davor beendet
   * ihn. Zählt nicht als Sicherung – die Zwischenablage ist beim nächsten
   * Kopieren weg.
   *
   * In der Zwischenablage liegen auch die Tage, an denen die Rückfrage und
   * die Karte „Neu" standen (store.umzugJSON): Es ist dasselbe Telefon. Der
   * Text zum Markieren unter „Sicherung", falls die Zwischenablage nicht
   * geht, ist dagegen eine Sicherung und trägt sie nicht.
   */
  'umzug-mitnehmen': () => {
    const text = store.umzugJSON();
    let kopiert;
    try { kopiert = navigator.clipboard.writeText(text); } catch (e) { kopiert = Promise.reject(e); }
    beschaeftigt += 1;
    kopiert
      .then(() => {
        // Erst jetzt vermerken: Ein „Mitgenommen am …" über einem Tagebuch,
        // das nie in der Zwischenablage war, schickte sie in eine leere App.
        store.umzugMerken();
        ui.umzugKopiert = true;
        store.einstellen('tab', 'heute');
        melden('Kopiert. Jetzt auf den Home-Bildschirm.');
      })
      .catch(() => {
        // Ohne Zwischenablage bleibt der Text zum Markieren – unter „Mehr".
        ui.sicherung = store.alsJSON();
        ui.anleitung = false;
        store.einstellen('tab', 'mehr');
        melden('Bitte den Text unter „Sicherung" markieren und kopieren.');
      })
      .finally(() => { beschaeftigt -= 1; zeichne(); });
  },
  /*
   * In der App: aus der Zwischenablage holen.
   *
   * readText() ebenfalls ohne await davor. Auf dem iPhone erscheint dann die
   * kleine Blase „Einsetzen"; wer daneben tippt, bekommt einen Fehler – und
   * statt einer Fehlermeldung das Feld, in das man von Hand einsetzen kann.
   */
  'umzug-holen': () => {
    let gelesen;
    try { gelesen = navigator.clipboard.readText(); } catch (e) { gelesen = Promise.reject(e); }
    beschaeftigt += 1;
    // Zwei verschiedene Lagen, zwei verschiedene Sätze: Die Zwischenablage
    // ließ sich nicht lesen (dann von Hand einsetzen) – oder sie ließ sich
    // lesen, und der Inhalt passte nicht (falsches Passwort, keine Sicherung).
    const vonHand = (satz) => {
      store.einstellen('begruesst', true);
      store.einstellen('tab', 'mehr');
      // Das Einsetzfeld steht unter „Mehr", nicht in der Anleitung.
      ui.anleitung = false;
      ui.einfuegen = '';
      ui.einfuegenUmzug = true;
      melden(satz);
    };
    gelesen
      .then(async (text) => {
        const roh = String(text || '').trim();
        if (!roh.startsWith('{') && !istTresor(roh)) {
          vonHand('In der Zwischenablage liegt gerade kein Tagebuch. Öffne Body Check in Safari, tippe dort auf „Einträge mitnehmen" und komm dann hierher zurück.');
          return;
        }
        try {
          const ergebnis = await sicherungEinlesen(roh, { umzug: true });
          if (ergebnis !== null) umzugAbschliessen(ergebnis);
        } catch (fehler) {
          vonHand(lesbarerFehler(fehler));
        }
      }, () => vonHand('Bitte von Hand einsetzen: ins Feld lange tippen, „Einsetzen".'))
      .finally(() => { beschaeftigt -= 1; zeichne(); });
  },
  'umzug-holen-nein': () => { ui.umzugHolenZu = true; zeichne(); },
  'umzug-fertig': () => { ui.umzug = null; zeichne(); },
  'ablage-leeren': () => {
    // Ein Leerzeichen statt eines leeren Textes: Manche Browser lassen die
    // Zwischenablage bei '' einfach unverändert.
    try {
      navigator.clipboard.writeText(' ')
        .then(() => melden('Zwischenablage geleert.'))
        .catch(() => melden('Ging nicht – kopier einfach irgendein Wort, dann ist es weg.'));
    } catch {
      melden('Ging nicht – kopier einfach irgendein Wort, dann ist es weg.');
    }
  },
  rueckgaengig: () => {
    if (!window.confirm('Den Stand von vor dem letzten Einlesen zurückholen? Was seitdem dazukam, ist dann weg.')) return;
    try {
      const anzahl = store.rueckgaengig();
      ui.umzug = null;
      melden(`Zurückgeholt: ${mehrzahl(anzahl, 'Eintrag', 'Einträge')}.`);
    } catch (fehler) {
      melden(fehler.message);
    }
    zeichne();
  },
  'startbildschirm-spaeter': () => { ui.startbildschirmZu = true; zeichne(); },
  'startbildschirm-weg': () => { store.einstellen('startbildschirmWeg', true); zeichne(); },
  'alter-name-weg': () => { store.einstellen('alterName', 'gesehen'); zeichne(); },

  installieren: async () => {
    if (!installEreignis) return;
    installEreignis.prompt();
    try { await installEreignis.userChoice; } catch { /* abgebrochen */ }
    // Das Ereignis lässt sich nur einmal auslösen; danach ist es verbraucht.
    installEreignis = null;
    zeichne();
  },

  'unterleib-an': () => {
    const gewaehlt = store.zustandLesen().tagesfragen || [];
    store.einstellen('tagesfragen', [...new Set([...gewaehlt,
      'sexschmerz', 'sextief', 'regelschmerz'])]);
    melden('Eingeschaltet. Die Fragen stehen ab jetzt beim Tageseintrag.');
    zeichne();
  },
  // „Nein danke" heißt nein und nicht „später nochmal": Der Hinweis kommt
  // nicht wieder. Etwas, das man dreimal wegtippen muss, ist keine Frage.
  'unterleib-nein': () => {
    store.einstellen('unterleibGefragt', true);
    melden('Gut. Ich frage nicht noch einmal.');
    zeichne();
  },

  mittel: () => { ui.mittel = !ui.mittel; zeichne(); },

  'idee-neu': () => {
    const feld = document.getElementById('ideeText');
    if (!store.ideeAnlegen(feld.value)) { melden('Da steht noch nichts.'); return; }
    feld.value = '';
    ui.ideeEntwurf = '';
    // „Notiert" wäre die falsche Auskunft: Notiert ist sie, aber gelesen hat
    // sie niemand, und das ist der Unterschied, um den es hier geht.
    melden('Notiert. Geht raus.');
    zeichne();
  },
  'kueche-neu': (el) => {
    const art = el.dataset.art;
    const feld = document.getElementById(`kueche-${art}`);
    // Offen bleiben, egal wie es ausgeht: Auch nach „Da steht noch nichts"
    // soll das Feld dastehen, in das man gerade tippen wollte.
    ui.kuecheOffen = true;
    if (!store.kuecheNotieren(feld.value, art)) {
      // Zwei Gründe, und der zweite will erklärt werden: ein leeres Feld, oder
      // die Liste ist voll. „Ging nicht" ohne Grund wäre hier besonders
      // ärgerlich, weil der Text dann einfach stehen bleibt.
      melden(feld.value.trim() ? 'Die Liste ist voll – nimm erst etwas heraus.' : 'Da steht noch nichts.');
      return;
    }
    feld.value = '';
    zeichne();
  },
  'befund-neu': (el) => { store.befundNotieren(el.dataset.id); zeichne(); },
  'befund-weg': (el) => { store.befundLoeschen(el.dataset.id); zeichne(); },
  'kueche-dreh': (el) => { store.kuecheUmschalten(el.dataset.id); zeichne(); },
  'kueche-weg': (el) => { store.kuecheLoeschen(el.dataset.id); zeichne(); },
  'idee-haken': (el) => { store.ideeUmschalten(el.dataset.id); zeichne(); },
  'idee-weg': (el) => { store.ideeLoeschen(el.dataset.id); zeichne(); },
  /*
   * Der direkte Weg.
   *
   * Die einzige Stelle, an der diese App etwas verschickt – und sie tut es
   * nur hier, nur auf diesen Druck, und nur mit dem Ideentext. Was schiefgeht,
   * wird gesagt und nicht im Hintergrund noch einmal versucht: Ein Programm,
   * das von selbst weitersendet, ist etwas anderes als eines, das auf einen
   * Knopf wartet.
   */
  'ideen-senden': async (el) => {
    el.disabled = true;
    melden('Wird geschickt …');
    // Abgehakt wird je Idee erst nach dem Erfolg. Wer es nicht rausbekommen
    // hat, soll den Hinweis behalten, statt zu glauben, es sei angekommen.
    // „Angekommen" nur, wenn danach wirklich nichts mehr offen ist.
    const { fehler } = await ideenVerschicken();
    melden(fehler || (store.ideenOffen()
      ? 'Noch nicht alle angekommen – es geht gleich weiter.'
      : 'Angekommen. Jetzt hat sie jemand.'));
    if (!fehler) sendenAnstossen();
    el.disabled = false;
    zeichne();
  },

  'ideen-kopieren': async () => {
    await kopiere(ideenText(store.zustandLesen()), '#ideeText');
    store.ideenGeschicktMerken();
    zeichne();
  },
  /*
   * Teilen über das Menü des Geräts. Das ist kein Widerspruch zu „die App
   * schickt nichts": Hier wird nichts gesendet, sondern der Text an das
   * Betriebssystem übergeben, das daraufhin *den Nutzer* fragen lässt, wohin.
   * Ohne diese Schnittstelle bleibt der gewöhnliche Weg über die
   * Zwischenablage.
   */
  'ideen-teilen': async () => {
    const text = ideenText(store.zustandLesen());
    if (!navigator.share) {
      await kopiere(text, '#ideeText');
      store.ideenGeschicktMerken();
      zeichne();
      return;
    }
    try {
      await navigator.share({ title: 'Body Check – Ideen', text });
      /*
       * Erst nach dem Teilen abhaken, nicht davor.
       *
       * navigator.share löst erst auf, wenn wirklich geteilt wurde; ein
       * Abbruch wirft. Deshalb steht das Merken *hier* und nicht oben: Wer das
       * Menü wieder zumacht, soll den Hinweis behalten, statt zu glauben, es
       * sei raus.
       */
      store.ideenGeschicktMerken();
      melden('Raus. Jetzt hat sie jemand.');
      zeichne();
    } catch {
      // Abgebrochen oder nicht erlaubt – dann bleibt der Hinweis stehen.
    }
  },

  /*
   * Auf dem iPhone über das Teilen-Blatt statt über einen Download.
   *
   * In der App auf dem Startbildschirm kann ein Download still ins Leere
   * gehen (WebKit-Fehlerberichte 209407 und 275288) – und die App vermerkte
   * trotzdem „gesichert". Das Teilen-Blatt sagt, ob es geklappt hat, und
   * bietet „In Dateien sichern" an. Vermerkt wird erst danach.
   */
  export: () => {
    const text = store.alsJSON();
    const name = `body-check-${heuteISO()}.json`;
    let datei = null;
    if (istApfel() && navigator.canShare) {
      try { datei = new File([text], name, { type: 'application/json' }); } catch { datei = null; }
    }
    if (datei && navigator.canShare({ files: [datei] })) {
      beschaeftigt += 1;
      navigator.share({ files: [datei], title: 'Body-Check-Sicherung' })
        .then(() => {
          store.sicherungNotiert();
          // Vorsichtig: Ob ein Abbruch erst in der Ortsauswahl hier als
          // Erfolg ankommt, ist nicht geprüft. Und „Auf meinem iPhone" ist
          // mit dem iPhone weg – deshalb kein Rat mehr dorthin.
          melden('Gesichert, wenn du zum Schluss auf „Sichern“ getippt hast. Sonst sichere einfach noch einmal.');
        })
        .catch(() => melden('Nicht gesichert – abgebrochen.'))
        .finally(() => { beschaeftigt -= 1; zeichne(); });
      return;
    }
    datenAusgeben(text, name, 'application/json');
    store.sicherungNotiert();
    melden('Sicherung erstellt.');
    zeichne();
  },
  import: sicherungLaden,
  'sicherung-spaeter': () => {
    store.sicherungVerschieben();
    melden('In einer Woche frage ich wieder.');
    zeichne();
  },
  /*
   * Die Textfläche gibt es nur unter „Mehr". Vom Tag-Reiter aus vermerkte der
   * Knopf früher „gesichert" und zeigte nichts – jetzt geht er dorthin, wo der
   * Text steht, und rollt ihn ins Bild. Vermerkt wird erst beim Kopieren.
   */
  'sicherung-text': () => {
    ui.sicherung = store.alsJSON();
    ui.anleitung = false;
    store.einstellen('tab', 'mehr');
    zeichne();
    requestAnimationFrame(() => {
      const feld = document.getElementById('sicherungsText');
      if (feld) feld.scrollIntoView({ block: 'center' });
    });
  },
  'sicherung-zu': () => { ui.sicherung = null; zeichne(); },
  // Die Anleitung lebt unter „Mehr" – auch wenn der Hinweis von woanders kommt.
  anleitung: () => {
    store.einstellen('tab', 'mehr');
    ui.anleitung = true;
    zeichne();
    requestAnimationFrame(() => window.scrollTo(0, 0));
  },
  'anleitung-zu': () => {
    ui.anleitung = false;
    zeichne();
    requestAnimationFrame(() => window.scrollTo(0, 0));
  },
  'gewicht-los': () => {
    const feld = viewEl.querySelector('[data-act="gewicht-neu"]');
    const kg = Number(String(feld && feld.value).replace(',', '.'));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      melden('Bitte ein Gewicht zwischen 20 und 400 kg.');
      return;
    }
    store.gewichtNotieren(heuteISO(), kg);
    melden('Notiert.');
    zeichne();
  },
  'gewicht-weg': (el) => {
    store.gewichtLoeschen(el.dataset.iso);
    zeichne();
  },
  abnehmen: (el) => {
    store.einstellen('abnehmenGewollt', el.dataset.n === 'ja');
    zeichne();
  },
  'einfuegen-auf': () => { ui.einfuegen = ''; zeichne(); },
  'einfuegen-zu': () => { ui.einfuegen = null; zeichne(); },
  'einfuegen-los': async () => {
    const text = String(ui.einfuegen || '').trim();
    if (!text) { melden('Da ist noch nichts eingefügt.'); return; }
    try {
      // Von Hand eingesetzt beim Umzug: wie aus der Zwischenablage (siehe 'umzug-holen').
      const ergebnis = await sicherungEinlesen(text, { umzug: ui.einfuegenUmzug });
      if (ergebnis !== null) {
        ui.einfuegen = null;
        if (ui.einfuegenUmzug) {
          ui.einfuegenUmzug = false;
          umzugAbschliessen(ergebnis);
        } else {
          melden(eingelesenText(ergebnis));
        }
      }
    } catch (fehler) {
      melden(lesbarerFehler(fehler));
    }
    zeichne();
  },
  /*
   * Erst hier gilt als gesichert, nicht schon beim Aufmachen des Textes. Wer
   * „Als Text" antippt und wieder schließt, hat nichts gesichert – und soll
   * weiter erinnert werden. Wer von Hand kopiert, weil die Zwischenablage
   * nicht ging, tippt danach auf „Kopieren" noch einmal oder bekommt die
   * Erinnerung, und das ist der ehrlichere Fehler.
   */
  'sicherung-kopieren': async () => {
    if (!(await kopiere(ui.sicherung, '.bericht'))) return;
    store.sicherungNotiert();
    melden('Kopiert. Jetzt in eine Notiz einsetzen.');
    zeichne();
  },

  'schloss-auf': () => { ui.schloss = true; ui.tresorWort = ''; zeichne(); },
  'schloss-zu': () => { ui.schloss = false; ui.tresorWort = ''; zeichne(); },
  'tresor-export': async () => {
    // Acht Zeichen sind keine Sicherheit, aber eine Grenze, unter der es
    // ehrlicher wäre, gar nicht erst zu verschlüsseln.
    if (ui.tresorWort.length < 8) { melden('Mindestens acht Zeichen.'); return; }
    melden('Wird verschlüsselt …');
    try {
      const text = await verschluesseln(store.alsJSON(), ui.tresorWort);
      datenAusgeben(text, `body-check-${heuteISO()}.json`, 'application/json');
      store.sicherungNotiert();
      ui.schloss = false;
      ui.tresorWort = '';
      melden('Verschlüsselt gesichert.');
    } catch (fehler) {
      melden(`Ging nicht: ${fehler.message}`);
    }
    zeichne();
  },

  bericht: (el) => {
    const s = store.zustandLesen();
    const bis = heuteISO();
    ui.bericht = arztBericht(s, plusTage(bis, -(Number(el.dataset.n) - 1)), bis);
    zeichne();
  },
  // Der Bericht seit dem letzten Termin. Genau das fragt eine Ärztin beim
  // zweiten Mal: was seitdem war – nicht die letzten dreißig Tage, die
  // zufällig ein Stück davor mit abdecken oder ein Stück davon abschneiden.
  'bericht-seit': () => {
    const bis = heuteISO();
    const seit = store.letzterTermin(bis);
    if (!seit) return;
    ui.bericht = arztBericht(store.zustandLesen(), seit, bis);
    zeichne();
  },
  'bericht-zu': () => { ui.bericht = null; zeichne(); },
  'termin-weg': (el) => { store.terminLoeschen(el.dataset.iso); zeichne(); },
  drucken: () => {
    store.einstellen('tab', 'muster');
    zeichne();
    // Erst zeichnen lassen, dann drucken – window.print() hält das Programm
    // an, und ein noch nicht gezeichneter Reiter käme leer aufs Papier.
    setTimeout(() => window.print(), 120);
  },
  'bericht-kopieren': () => kopiere(ui.bericht, '.bericht'),
  'bericht-laden': () => {
    const bis = heuteISO();
    datenAusgeben(ui.bericht || '', berichtName(plusTage(bis, -29), bis), 'text/plain');
  },

  'alles-weg': () => {
    // Zwei Fragen sind eine zu viel, keine ist eine zu wenig: Der Knopf steht
    // unter „Mehr" und löscht Monate.
    if (!window.confirm('Wirklich alles löschen? Das lässt sich nicht rückgängig machen.')) return;
    store.allesLoeschen();
    // Auch, was davon noch im Speicher der Seite liegt: der Bericht, die
    // Sicherung als Text und was ein „Rückgängig" zurückholen würde – ein
    // gelöschter Eintrag, ein entferntes Mittel.
    Object.assign(ui, {
      bericht: null, sicherung: null, geloescht: null, entfernt: null, pauseZurueck: null, rueckfrage: null,
    });
    melden('Alles gelöscht.');
    zeichne();
  },
};

/*
 * Eine abfangende Meldung gehört zu sich selbst (meldungNr) und zu „Tag“ ohne
 * offenen Bogen: Nur dort stehen die Rückfrage und die Karte „Neu“, und nur
 * dort liegt unter ihr, was noch niemand gesehen hat – auch wenn die Antwort
 * selbst woandershin führt („Zu ‚Meine Mittel‘“) oder „Rückgängig“ unter
 * „Mehr“ getippt wurde. Auf einem anderen Reiter oder mit offenem Bogen lässt
 * sie Tipps durch wie jede Meldung – sonst schlösse der erste Tipp unter
 * „Mehr“ nur sie, etwa über „Tagebuch löschen“. Zurück auf „Tag“, solange sie
 * noch steht, fängt sie wieder ab (siehe male).
 */
let decktNr = -1;
function decktHier() {
  const t = store.zustandLesen().tab;
  return decktNr === meldungNr && !ui.bogen && (REITER.some((r) => r.id === t) ? t : 'heute') === 'heute';
}

/*
 * Nach einer Antwort auf die Rückfrage oder die Karte „Neu" steht an
 * derselben Stelle sofort etwas anderes: der nächste Schritt, dessen Knöpfe
 * genau dort liegen, wo eben der Finger war, der Hinweis, der jetzt
 * erscheint, oder – wenn die Karte schließt – das, was darunter stand. Ein
 * Doppeltipp oder ein nachgesetzter Finger beantwortete sonst gleich die
 * nächste Frage, legte ein Mittel an, das niemand gewählt hat, speicherte
 * ein „Nein" auf eine Frage, die nie zu sehen war, oder tippte einen Hinweis
 * weg. Darum zählt danach NACHTIPP_MS lang kein Tipp im Inhalt der Seite –
 * so lange braucht ohnehin, wer die neue Frage liest. Die Reiter liegen
 * außerhalb und bleiben antippbar.
 *
 * Ebenso lang zählt kein Finger auf dem Knopf der Meldung: Nach „Nicht mehr
 * fragen" bringt sie „Rückgängig", und bei 320 Pixeln – oder wenn das
 * Kartenende knapp über den Reitern steht – genau unter den Finger. Der
 * zweite Tipp nähme die endgültige Antwort sonst gleich wieder zurück. Ein
 * Tastendruck zählt dort sofort: Der Fokus geht ausdrücklich auf
 * „Rückgängig" (fokusNachEntfernen), und ein Finger, der liegen bliebe, ist
 * nicht im Spiel. Danach steht „Rückgängig" noch fast acht Sekunden.
 */
const NACHTIPP_MS = 500;
const NACH_ANTWORT = /^(rueckfrage-|v29-)/;
let nachtippUhr = 0;
function nachtippSperren(umfang = 'inhalt') {
  // Eine laufende Sperre des ganzen Inhalts wird nie zu einer engeren.
  ui.nachtipp = ui.nachtipp === 'inhalt' ? 'inhalt' : umfang;
  // Was jetzt unter der Meldung liegt, hat noch niemand gesehen: Bis zur
  // nächsten Meldung fängt sie Tipps ab (siehe beim Klick auf #toast) –
  // auf „Tag“ ohne Bogen (decktHier).
  decktNr = meldungNr;
  toastEl.classList.toggle('deckt', decktHier());
  clearTimeout(nachtippUhr);
  nachtippUhr = setTimeout(() => { ui.nachtipp = false; }, NACHTIPP_MS);
}

/*
 * Dasselbe von oben: Nach „Gelesen" bei W1/W1u, „Später" bei der Sicherung,
 * einer Antwort auf ein Angebot oder dem Eintragen im Bogen rückt die
 * Rückfrage oder die Karte „Neu" nach oben oder erscheint erst – und liegt
 * dann dort, wo eben der Finger war. Ein Doppeltipp auf „Gelesen" wählte
 * sonst eine Form, die niemand gewählt hat. Deshalb sperrt auch ein Tipp im
 * Inhalt, nach dem eine dieser Karten neu dasteht oder sich verschoben hat
 * und jetzt unter dem Finger liegt (NACHTIPP_RAND Pixel Spielraum) – aber
 * nur die Knöpfe dieser Karten ('karte'): Was sonst auf „Tag" steht, war
 * vorher schon da und bleibt sofort antippbar. Gar nicht gesperrt wird nach
 * einem Tipp, der die Karten nicht bewegt, nach einem, nach dem ein Bogen
 * offen ist – dann liegt der Finger auf dem Bogen –, und nach einem
 * Tastendruck.
 */
const NACHTIPP_RAND = 24;
const V29_KARTEN = '.rueckfrage-karte, .neu-karte';
const v29Lagen = () => [...viewEl.querySelectorAll(V29_KARTEN)].map((k) => {
  const r = k.getBoundingClientRect();
  return { neu: k.classList.contains('neu-karte'), oben: Math.round(r.top), r };
});
function v29UnterDemFinger(vorher, x, y) {
  return v29Lagen().some((k) => !vorher.some((v) => v.neu === k.neu && v.oben === k.oben)
    && x >= k.r.left - NACHTIPP_RAND && x <= k.r.right + NACHTIPP_RAND
    && y >= k.r.top - NACHTIPP_RAND && y <= k.r.bottom + NACHTIPP_RAND);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = AKTION[el.dataset.act];
  if (!fn) return;
  // Textfelder tragen ebenfalls data-act, ihre Werte kommen über 'input'.
  if (el.matches('input, textarea')) return;
  ev.preventDefault();
  const imInhalt = viewEl.contains(el);
  if (imInhalt && (ui.nachtipp === 'inhalt' || (ui.nachtipp === 'karte' && el.closest(V29_KARTEN)))) return;
  const inMeldung = toastEl.contains(el);
  if ((ui.nachtipp === 'inhalt' || meldungRuhe) && ev.detail > 0 && inMeldung) return;
  // Nur bei Tipp oder Klick (detail > 0): Ein Tastendruck hat keinen Finger,
  // der liegen bliebe, und keinen Klickpunkt.
  const vorher = imInhalt && ev.detail > 0 ? v29Lagen() : null;
  const zeichen = imInhalt && ev.detail > 0 ? knopfZeichen(el) : null;
  const nr = meldungNr;
  // Über Mitternacht beantwortet: Rückfrage und Karte „Neu" stehen nur auf
  // dem Tag, der beim Zeichnen heute war. Danach zeigt „Tag" den neuen Tag,
  // wie nach dem Wiederöffnen – sonst bliebe er auf gestern, und der
  // Hinweis, auf den die Meldung zeigt („oben auf „Tag““), stünde nicht da.
  if (el.closest(V29_KARTEN)) tagNachRueckkehr(ui.tag, true);
  fn(el);
  // Ein Finger auf „Rückgängig" in der Meldung: Der zweite Tipp eines
  // Doppeltipps endet an der Stelle der Meldung (meldungNachlauf).
  if (inMeldung && ev.detail > 0) meldungNachlauf(NACHTIPP_MS);
  // Hat der Tipp eine Meldung gebracht: Liegt sie über dem Knopf, der noch
  // unter dem Finger steht, weicht sie ihm aus – nach dem Neuzeichnen.
  if (zeichen && meldungNr !== nr) {
    const { clientX: mx, clientY: my } = ev;
    queueMicrotask(() => meldungAusweichen(zeichen, mx, my));
  }
  if (NACH_ANTWORT.test(el.dataset.act)) {
    nachtippSperren();
  } else if (vorher) {
    // zeichne() malt in einer Mikroaufgabe; diese hier kommt danach dran.
    const { clientX: x, clientY: y } = ev;
    queueMicrotask(() => {
      if (!ui.bogen && v29UnterDemFinger(vorher, x, y)) nachtippSperren('karte');
    });
  }
});

/*
 * Eine Meldung verdeckt, was unter ihr steht. Meist stand es vorher schon
 * da – das nächste eigene Mittel, „−" beim Wasser –, und ein Tipp geht durch
 * sie hindurch auf den Knopf, wie seit jeher. Nach einer Antwort auf die
 * Rückfrage oder die Karte „Neu" (und wenn eine dieser Karten nach einem
 * Tipp unter den Finger rückt) liegt dort aber oft schon die nächste Frage,
 * mit denselben Knöpfen, und wer die lange Meldung wegtippen wollte,
 * beantwortete sie, ohne sie gesehen zu haben. Dann fängt die Meldung jeden
 * Tipp ab, bis die nächste kommt (nachtippSperren, css/styles.css .deckt),
 * und ein Tipp auf sie schließt sie. Eine Meldung mit Knopf („Rückgängig")
 * bleibt dabei stehen – ein Tipp neben den Knopf nähme sonst den einzigen
 * Weg zurück –, und kurz nach einer Antwort bewirkt ein Finger auch hier
 * nichts.
 *
 * Nach dem Schließen fängt sie noch einen Augenblick weiter ab
 * (meldungNachlauf): Der zweite Tipp eines Doppeltipps endet hier, statt
 * durch die eben verschwundene Meldung den Knopf darunter zu treffen.
 */
toastEl.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-act]')) return;
  if (!toastEl.classList.contains('an') || (meldungRuhe && ev.detail > 0)) return;
  if (toastEl.classList.contains('mit-knopf')) return;
  if (ui.nachtipp === 'inhalt' && ev.detail > 0) return;
  meldungZu();
  if (ev.detail > 0) meldungNachlauf(NACHTIPP_MS);
});

/*
 * Texteingaben laufen über 'input' und zeichnen *nicht* neu – ein Neuzeichnen
 * bei jedem Tastendruck nähme dem Feld den Fokus und die Schreibmarke.
 */
function eingabe(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const wert = el.value;
  switch (el.dataset.act) {
    case 'rolle': {
      const liste = (ui.bogen && ui.bogen.entwurf.zutaten) || [];
      entwurf({
        zutaten: liste.map((z) => (z.id === el.dataset.id ? { ...z, rolle: wert } : z)),
      }, false);
      break;
    }
    case 'was': entwurf({ was: wert }, false); break;
    case 'notiz': entwurf({ notiz: wert }, false); break;
    // Der Name einer neuen eigenen Aktivität, solange sie nicht übernommen ist:
    // Ein Tipp auf eine Marke zeichnet den Bogen neu, und das Feld verlöre ihn.
    case 'aktiv-name': if (ui.bogen) ui.bogen.aktivName = wert; break;
    // Name und Dosis: der Teil „Steht bei deinen Mitteln" zieht beim Tippen
    // mit – nur bei 'input', siehe merkenAuffrischen().
    case 'mittel':
      entwurf({ mittel: wert }, false);
      if (ev.type === 'input') { merkenAuffrischen(); wissenAuffrischen(); }
      break;
    case 'dosis':
      entwurf({ dosis: wert }, false);
      if (ev.type === 'input') merkenAuffrischen();
      break;
    case 'text': entwurf({ text: wert }, false); break;
    // Von Hand gesetzt ist die Zeit wieder genau – die Knöpfe gelten dann
    // nicht mehr. Ohne Neuzeichnen, sonst verlöre das Feld beim Tippen den
    // Fokus; die Markierung der Knöpfe stimmt beim nächsten Zeichnen.
    // Wer das Feld anfasst, das beim Speichern als falsch markiert wurde,
    // bekommt die Markierung abgenommen – geprüft wird beim nächsten Speichern.
    case 'uhr':
      entwurf({
        um: wert, ungefaehr: false, tageszeit: null, bezug: null, bezugMahlzeit: null, bezugBasis: null,
      }, false);
      if (ui.bogen) ui.bogen.zeitGesetzt = true;
      feldFehler(el, false);
      // Was unter der Dosis steht, hängt an der Zeit (siehe gemerktGenau) –
      // es soll nicht erst beim nächsten Neuzeichnen stimmen.
      if (ev.type === 'input') merkenAuffrischen();
      break;
    case 'bogen-datum':
      entwurf({ am: wert }, false);
      if (istISO(wert)) zeitFuerNeuenTag();
      feldFehler(el, false);
      break;
    // Das Formular unter „Meine Mittel": wie der Bogen ohne Neuzeichnen.
    case 'mm-name': if (ui.mittelForm) ui.mittelForm.mittel = wert; break;
    // Der Name in der Rückfrage – wie oben ohne Neuzeichnen.
    case 'rueckfrage-feld': if (ui.rueckfrage) ui.rueckfrage.eigen = wert; break;
    case 'mm-dosis': if (ui.mittelForm) ui.mittelForm.dosis = wert; break;
    case 'tag-datum':
      if (istISO(wert)) { ui.tag = wert; zeichne(); }
      break;
    // Das Passwort zeichnet *nicht* neu – ein Neuzeichnen bei jedem Zeichen
    // nähme dem Feld den Fokus, und ein Passwortfeld, das nach drei Zeichen
    // wegspringt, ist unbenutzbar.
    case 'tresor-wort': ui.tresorWort = wert; break;
    // Wie das Passwort: kein Neuzeichnen, sonst verliert das Feld beim
    // Einfügen eines langen Textes den Fokus.
    case 'einfuegen-text': ui.einfuegen = wert; break;
    /*
     * Der Ideenentwurf lebt nicht nur im Feld. Das Feld wird bei jedem
     * Neuzeichnen ersetzt – und neu gezeichnet wird auch dann, wenn im
     * Hintergrund eine ältere Idee angekommen ist. Wer gerade die nächste
     * schrieb, hätte sie verloren.
     */
    case 'idee-entwurf': ui.ideeEntwurf = wert; break;
    case 'termin-neu':
      if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) {
        store.terminAnlegen(wert);
        el.value = '';
        zeichne();
      }
      break;
    // Der Monatsregler meldet sich bei jedem halben Tippen; erst ein
    // vollständiges 'YYYY-MM' wird übernommen, sonst stünde zwischendurch
    // „seit 0002".
    case 'seit':
      if (!wert) store.einstellen('beschwerdenSeit', null);
      else if (/^\d{4}-\d{2}$/.test(wert)) store.einstellen('beschwerdenSeit', wert);
      break;
    default: break;
  }
}

/*
 * Texteingaben melden sich über 'input', Auswahlmenüs je nach Browser über
 * 'input' *oder* nur über 'change'. Beide auf denselben Empfänger, damit die
 * Rolle einer Zutat nirgends verlorengeht – das ist eine Angabe, die man genau
 * einmal macht und dann nie wieder kontrolliert.
 */
document.addEventListener('input', eingabe);
document.addEventListener('change', eingabe);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && ui.bogen) { ui.bogen = null; frageEnde(); zeichne(); }
  // Enter im Namensfeld der Rückfrage legt an wie der Knopf daneben.
  if (ev.key === 'Enter' && !ev.isComposing && ev.target && ev.target.id === 'rueckfrageName') {
    ev.preventDefault();
    tagNachRueckkehr(ui.tag, true);
    AKTION['rueckfrage-eigen']();
    nachtippSperren();
  }
});

/*
 * Vor dem Verschwinden schreiben. Mobile Browser verwerfen die Seite im
 * Hintergrund ohne Vorwarnung, und der letzte Eintrag hängt bis zu 120 ms in
 * der Warteschlange.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.sofortSchreiben();
});
window.addEventListener('pagehide', () => store.sofortSchreiben());

/*
 * Der neue Tag nach dem Wiederöffnen.
 *
 * Eine App auf dem Home-Bildschirm wird selten beendet. Wer sie abends offen
 * lässt und morgens wieder aufmacht, stand bisher auf gestern – und trug das
 * Frühstück am falschen Tag ein. Jetzt springt „Tag" auf heute, wenn beim
 * Verlassen heute angezeigt war und inzwischen ein neuer Tag ist. Wer von
 * Hand einen anderen Tag gewählt hatte, bleibt dort; ein offener Bogen auch.
 *
 * `warHeute` ist der Tag, der beim Verlassen „heute" war; ob die Anzeige dort
 * stand, sagt `standDort`. Nach einem Neuladen kommt beides aus NACH_NEULADEN.
 */
function tagNachRueckkehr(warHeute, standDort) {
  const heute = heuteISO();
  if (ui.bogen || !standDort || !warHeute || heute === warHeute) return false;
  ui.tag = heute;
  // Der Monat rückt mit, wenn er der von damals war.
  if (ui.monat === monatsStart(warHeute)) ui.monat = monatsStart(heute);
  return true;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    ui.heuteBeimVerlassen = { heute: heuteISO(), standDort: ui.tag === heuteISO() };
    return;
  }
  const v = ui.heuteBeimVerlassen;
  ui.heuteBeimVerlassen = null;
  const gewechselt = !!v && tagNachRueckkehr(v.heute, v.standDort);
  // Die Jetzt-Zeile soll beim Zurückkommen stimmen – neu gezeichnet wird
  // aber nicht unter den Fingern: nicht mit offenem Bogen oder halb
  // getipptem Feld.
  if (gewechselt || (!inArbeit() && store.zustandLesen().adhsAn === true)) zeichne();
  // Was unsichtbar gezeichnet wurde, gilt erst jetzt als gezeigt.
  gezeigtStempeln();
});

/*
 * Dauerhaften Speicher anfordern.
 *
 * Ohne das darf ein Browser den localStorage jederzeit wegräumen: bei
 * Platzmangel, beim „Browserdaten löschen", und auf iOS schon dann, wenn eine
 * Seite sieben Tage lang nicht besucht wurde. Für ein Lesezeichen ist das
 * verschmerzbar. Für ein Tagebuch, das über Monate entsteht und von dem es nur
 * diese eine Kopie gibt, wäre es das Ende – und zwar eines, das niemand
 * kommen sieht.
 *
 * `persist()` bittet den Browser, diesen Speicher davon auszunehmen. Chrome
 * gewährt das stillschweigend, sobald eine Seite installiert ist oder
 * regelmäßig benutzt wird; Safari kennt es erst seit iOS 17 und sagt meist
 * nein. Deshalb
 * ist die Bitte kein Ersatz für die Sicherung, sondern eine zweite Sicherung –
 * und was dabei herauskam, steht unter „Mehr", damit niemand sich auf etwas
 * verlässt, das gar nicht zugesagt wurde.
 */
async function speicherFestnageln() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    ui.speicher = await navigator.storage.persisted();
    if (!ui.speicher) ui.speicher = await navigator.storage.persist();
  } catch {
    // Manche Browser werfen hier statt abzulehnen. Dann bleibt es bei null,
    // und die Anzeige sagt „unbekannt" statt etwas zu behaupten.
    ui.speicher = null;
  }
  zeichne();
}

speicherFestnageln();

/*
 * Beim Start nachsehen, ob noch ein Vorschlag liegen geblieben ist.
 *
 * Der zweite Teil desselben Fehlers: Angestoßen wurde bisher nur beim
 * Zeichnen des Ideenreiters. Wer die App aufmacht und – wie üblich – auf dem
 * Tagesbogen landet, stieß nie an. Zusammen mit der Uhr, die das Zumachen
 * nicht überlebte, hieß das: Ein Vorschlag ging nur hinaus, wenn jemand nach
 * dem Eintippen noch eine Minute auf dem Ideenreiter stehen blieb. Das tut
 * niemand.
 *
 * Hier gilt dieselbe Bedenkzeit wie überall – sendenAnstossen() rechnet sie
 * aus dem gespeicherten Zeitpunkt aus. Ist noch etwas von der Minute übrig,
 * wartet es die ab.
 */
sendenAnstossen();

window.addEventListener('beforeinstallprompt', (ev) => {
  // Ohne preventDefault zeigt der Browser seinen eigenen Streifen und das
  // Ereignis ist verbraucht, bevor der Knopf in der App überhaupt dasteht.
  ev.preventDefault();
  installEreignis = ev;
  zeichne();
});
window.addEventListener('appinstalled', () => { installEreignis = null; zeichne(); });

/*
 * Vor dem Drucken alle aufklappbaren Abschnitte öffnen.
 *
 * Was zugeklappt ist, druckt der Browser nicht mit – und ausgerechnet die
 * Mittelübersicht und die Warnzeichen stehen in solchen Abschnitten. Auf dem
 * Papier wären sie dann weg, ohne dass es jemand merkt.
 */
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
});

/*
 * Startparameter – dahin zeigen die Verknüpfungen des Startbildschirms.
 *
 * Wer das Symbol lange gedrückt hält, bekommt „Mahlzeit eintragen" und
 * „Beschwerden eintragen" (siehe shortcuts in manifest.webmanifest) und landet
 * mit einem Tipp im offenen Bogen statt auf der Startseite.
 */
try {
  const start = new URLSearchParams(location.search);
  const wohin = start.get('tab');
  const neuArt = start.get('neu');
  if (wohin && REITER.some((r) => r.id === wohin)) store.einstellen('tab', wohin);
  if (neuArt && ART_NAME[neuArt]) {
    store.einstellen('tab', 'heute');
    bogenOeffnen(neuArt);
  }
  // Die Adresse wieder sauber machen: Ein Neuladen soll nicht denselben Bogen
  // ein zweites Mal aufreißen.
  if (wohin || neuArt) window.history.replaceState(null, '', location.pathname);
} catch { /* file:// erlaubt kein replaceState – dann eben nicht */ }

// Auch Änderungen, die keine Aktion ausgelöst hat, müssen ankommen – allen
// voran der Wechsel auf „kann nicht mehr speichern", den der Schreibvorgang
// selbst feststellt.
store.horche(zeichne);

/*
 * Nach einem Neuladen wegen einer neuen Fassung: derselbe Tag, derselbe
 * Monat, dieselbe Stelle. Ohne das stünde der Tag-Reiter wieder auf heute –
 * und wer gerade gestern nachgetragen hat, trüge den nächsten Eintrag am
 * falschen Tag ein.
 */
let nachNeuladen = null;
try {
  const roh = sessionStorage.getItem(NACH_NEULADEN);
  if (roh) {
    sessionStorage.removeItem(NACH_NEULADEN);
    const z = JSON.parse(roh);
    if (z && Date.now() - Number(z.zeit) < 120000) {
      nachNeuladen = z;
      if (istISO(z.tag)) ui.tag = z.tag;
      if (z.monat) ui.monat = z.monat;
      // Stand die Anzeige beim Verlassen auf „heute" und ist inzwischen ein
      // neuer Tag, gilt der neue – siehe tagNachRueckkehr().
      if (z.tagWarHeute === true && istISO(z.tag)) tagNachRueckkehr(z.tag, true);
      if (z.zeitraum) ui.zeitraum = z.zeitraum;
      ui.kuecheOffen = !!z.kuecheOffen;
      ui.umzug = z.umzug || null;
      ui.anleitung = !!z.anleitung;
    }
  }
} catch { /* dann eben von vorn */ }

// Im Hintergrund geladen – etwa nach dem Neuladen für eine neue Fassung beim
// Verlassen –, fehlt der Moment des Verlassens. Dann zählt dieser hier, sonst
// bliebe der Tageswechsel beim nächsten Öffnen aus.
if (document.visibilityState === 'hidden') {
  ui.heuteBeimVerlassen = { heute: heuteISO(), standDort: ui.tag === heuteISO() };
}

male();

if (nachNeuladen) {
  // Erst aufklappen, dann rollen – sonst ist die Seite für die alte Stelle
  // noch zu kurz.
  (Array.isArray(nachNeuladen.offen) ? nachNeuladen.offen : []).forEach((id) => {
    const d = document.getElementById(id);
    if (d && viewEl.contains(d)) d.open = true;
  });
  window.scrollTo(0, Number(nachNeuladen.scrollY) || 0);
  if (nachNeuladen.warum === 'selbst') {
    melden(store.zustandLesen().alterName === 'offen'
      ? 'Bauchbuch wurde gerade erneuert und heißt jetzt Body Check. Deine Einträge sind alle da.'
      : 'Body Check wurde gerade erneuert. Deine Einträge sind alle da.');
  }
}

/* Ohne Netz benutzbar. Aus einer Datei heraus (file://) gibt es keinen
 * Service Worker – dort ist die App ohnehin schon vollständig da. */
if (SW_DA) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* dann eben nicht */ });
  });
}

/* ==================== Neue Fassungen ==================== */

/*
 * WARUM DAS NÖTIG IST
 *
 * Auf dem iPhone wird eine App auf dem Startbildschirm selten wirklich
 * beendet. Sie liegt im Hintergrund, und wer sie antippt, setzt sie fort –
 * das ist kein neues Laden, und nur beim Laden sieht der Browser nach, ob es
 * eine neue Fassung gibt. Eine Verbesserung konnte so tagelang nicht
 * ankommen, obwohl sie längst online stand.
 *
 * Jetzt sieht die App bei jeder Rückkehr nach (höchstens alle fünfzehn
 * Minuten) und, solange sie offen ist, jede halbe Stunde. Liegt eine neue
 * Fassung bereit, lädt sie neu – aber nur in einem Moment, den niemand
 * bemerkt:
 *
 *   * wenn die App gerade verlassen wird, oder
 *   * gleich nach der Rückkehr, bevor etwas angetippt wurde,
 *
 * und in beiden Fällen nur, wenn nichts in Arbeit ist (siehe inArbeit()) und
 * der Speicher schreiben kann. Wer mitten im Benutzen ist, merkt nichts; die
 * neue Fassung kommt beim nächsten Verlassen. Danach steht sie am selben Tag
 * wie vorher, und ein Satz sagt, was passiert ist.
 *
 * Neu geladen wird nur, wenn der Service Worker wirklich eine andere Fassung
 * meldet als die, mit der diese Seite gestartet ist. Ein Byte Unterschied
 * reicht dem Browser für eine Installation; für ein Neuladen reicht es nicht.
 */
const SUCH_ABSTAND_MS = 15 * 60 * 1000;
const SUCH_TAKT_MS = 30 * 60 * 1000;

/** Den Service Worker fragen, welche Fassung er ist. Höchstens zwei Sekunden. */
function fassungFragen() {
  const sw = SW_DA ? navigator.serviceWorker.controller : null;
  if (!sw) return Promise.resolve(null);
  return new Promise((fertig) => {
    const kanal = new MessageChannel();
    const uhr = setTimeout(() => fertig(null), 2000);
    kanal.port1.onmessage = (ev) => { clearTimeout(uhr); fertig(ev.data || null); };
    try {
      sw.postMessage({ frage: 'fassung' }, [kanal.port2]);
    } catch {
      clearTimeout(uhr);
      fertig(null);
    }
  });
}

/**
 * Ist gerade etwas in Arbeit, das ein Neuladen zerstören würde?
 *
 * Nicht nur das Feld mit dem Cursor: Auf dem iPhone verliert ein Feld den
 * Fokus, sobald man „Fertig" über der Tastatur tippt oder scrollt, und der
 * halbe Text steht trotzdem noch darin. Gezählt wird deshalb jedes Feld, in
 * dem etwas anderes steht als beim Zeichnen.
 */
function inArbeit() {
  if (ui.bogen || ui.atem || ui.schloss || ui.sicherung || ui.bericht
      || ui.einfuegen !== null || ui.ideeEntwurf || beschaeftigt > 0) return true;
  const aktiv = document.activeElement;
  if (aktiv && /^(INPUT|TEXTAREA|SELECT)$/.test(aktiv.tagName) && viewEl.contains(aktiv)) return true;
  for (const feld of viewEl.querySelectorAll('input, textarea')) {
    if (feld.readOnly || feld.type === 'hidden') continue;
    if (feld.type === 'checkbox' || feld.type === 'radio') {
      if (feld.checked !== feld.defaultChecked) return true;
    } else if (feld.value !== feld.defaultValue) {
      return true;
    }
  }
  return false;
}

/** Den flüchtigen Zustand mitnehmen und neu laden. */
function neuLaden(warum) {
  try {
    sessionStorage.setItem(NEULADEN_MERK, String(Date.now()));
    sessionStorage.setItem(NACH_NEULADEN, JSON.stringify({
      zeit: Date.now(),
      warum,
      tag: ui.tag,
      // Stand die Anzeige auf heute? Dann springt sie nach dem Neuladen auf
      // den neuen Tag, falls Mitternacht dazwischen lag.
      tagWarHeute: ui.tag === heuteISO(),
      monat: ui.monat,
      zeitraum: ui.zeitraum,
      kuecheOffen: ui.kuecheOffen,
      umzug: ui.umzug,
      // Wer gerade die Anleitung liest und kurz zu Safari wechselt – wozu sie
      // selbst auffordert –, soll danach an derselben Stelle stehen.
      anleitung: ui.anleitung,
      offen: [...viewEl.querySelectorAll('details[id][open]')].map((d) => d.id),
      scrollY: window.scrollY,
    }));
  } catch {
    // Ohne sessionStorage gibt es keinen Schleifenschutz – dann lieber gar
    // nicht von selbst neu laden. Die neue Fassung kommt beim nächsten Start.
    if (warum === 'selbst') return;
  }
  store.sofortSchreiben();
  window.location.reload();
}

/** Ist jetzt ein Moment, in dem niemand ein Neuladen bemerkt? */
function vielleichtNeuladen() {
  if (!bereit) return;
  if (!store.kannSpeichern() || inArbeit()) return;
  const sichtbar = document.visibilityState === 'visible';
  if (sichtbar && angefasst && Date.now() >= ausdruecklichBis) return;
  try {
    const zuletzt = Number(sessionStorage.getItem(NEULADEN_MERK) || 0);
    if (Date.now() - zuletzt < 30000) return;
  } catch {
    return;
  }
  neuLaden('selbst');
}

/** Eine neue Fassung hat übernommen – aber ist sie wirklich eine andere? */
async function neueFassungPruefen() {
  if (!startController) return;
  const f = await fassungFragen();
  const jetzt = SW_DA ? navigator.serviceWorker.controller : null;
  const anders = f && ui.fassung
    ? (f.stand !== ui.fassung.stand || f.version !== ui.fassung.version)
    : !!jetzt && jetzt !== startController;
  if (!anders) return;
  bereit = f || { version: '?', stand: '?' };
  fassungAnzeigen();
  vielleichtNeuladen();
}

/** Nachsehen, ob es eine neue Fassung gibt. */
async function nachFassungSehen(erzwingen = false) {
  if (!SW_DA) return 'ohne';
  if (!erzwingen && Date.now() - ui.gesucht < SUCH_ABSTAND_MS) return 'gedrosselt';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'ohne';
    await reg.update();
    ui.gesucht = Date.now();
    fassungAnzeigen();
    /*
     * Das zweite Signal neben controllerchange. Auf dem iPhone kommt das
     * Ereignis nicht immer an, wenn die App gerade eingefroren war; dass der
     * neue Service Worker aktiv wurde, lässt sich hier direkt beobachten.
     */
    const neu = reg.installing || reg.waiting;
    if (neu) {
      neu.addEventListener('statechange', () => {
        if (neu.state === 'activated') neueFassungPruefen();
      });
      return 'gefunden';
    }
    return 'aktuell';
  } catch {
    // Ohne Netz wirft update(). Dann eben beim nächsten Mal.
    return 'offline';
  }
}

// Eine Funktionsdeklaration und keine Konstante: Die Karte unter „Mehr"
// wird schon beim ersten Zeichnen gebraucht, und das passiert weiter oben in
// dieser Datei. Eine Konstante gäbe es dann noch gar nicht.
function zeitSeit(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${mehrzahl(min, 'Minute', 'Minuten')}`;
  const d = new Date(ms);
  return `um ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;
}

function fassungText() {
  if (!SW_DA) {
    return location.protocol === 'file:'
      ? 'Einzeldatei – sie aktualisiert sich nicht von selbst. Eine neue Fassung ist eine neue Datei.'
      : 'Ohne Service Worker – dieser Browser lädt bei jedem Öffnen frisch.';
  }
  if (!ui.fassung) return 'Wird gerade eingerichtet …';
  return `Läuft: ${esc(ui.fassung.version)} · Stand ${esc(ui.fassung.stand)}`;
}

/** Die Karte unter „Mehr". */
function fassungKarte() {
  return `<div class="karte">
    <h3>Fassung</h3>
    <p class="klein" id="fassung-text">${fassungText()}</p>
    ${SW_DA ? `<p class="klein" id="fassung-gesucht">Zuletzt nach einer neueren gesucht: ${zeitSeit(ui.gesucht)}.</p>` : ''}
    ${bereit ? `<p class="klein"><b>Eine neue Fassung liegt bereit (${esc(bereit.version)} · ${esc(bereit.stand)}).</b>
      ${store.kannSpeichern()
    ? 'Sie kommt, sobald du die App verlässt – oder jetzt gleich.'
    : 'Sie kommt beim nächsten Start. Gerade wird nichts gespeichert – sichere vorher unter „Sicherung“, sonst ist weg, was du seit dem Start eingetragen hast.'}</p>` : ''}
    ${SW_DA ? `<div class="reihe">
      ${bereit ? knopf('neu-laden', 'Jetzt laden', 'btn-primary') : knopf('fassung-suchen', 'Nach neuer Fassung suchen')}
      ${bereit ? '' : knopf('neu-laden', 'Neu laden', 'btn-ghost')}
    </div>` : ''}
  </div>`;
}

/*
 * Die Anzeige auffrischen, ohne neu zu zeichnen. Ein Neuzeichnen ersetzt den
 * ganzen Reiter – mitsamt dem, was gerade in einem Feld steht. Eine Suche im
 * Hintergrund darf das nie auslösen.
 */
function fassungAnzeigen() {
  const text = document.getElementById('fassung-text');
  if (text) text.innerHTML = fassungText();
  const wann = document.getElementById('fassung-gesucht');
  if (wann) wann.textContent = `Zuletzt nach einer neueren gesucht: ${zeitSeit(ui.gesucht)}.`;
}

Object.assign(AKTION, {
  'fassung-suchen': async (el) => {
    el.disabled = true;
    // Schon vor der Suche: Die neue Fassung kann übernehmen, während sie läuft.
    ausdruecklichBis = Date.now() + 60 * 1000;
    melden('Suche …');
    const ergebnis = await nachFassungSehen(true);
    // Gefunden heißt: Sie wird jetzt geholt, das kann im Funkloch dauern.
    if (ergebnis === 'gefunden') ausdruecklichBis = Date.now() + 5 * 60 * 1000;
    if (ergebnis === 'offline') ausdruecklichBis = 0;
    if (ergebnis === 'offline') melden('Gerade kein Netz – später noch einmal.');
    else if (ergebnis === 'gefunden') melden('Neue Fassung gefunden – wird geladen …');
    else if (!bereit) melden('Du hast die neueste Fassung.');
    el.disabled = false;
    vielleichtNeuladen();
    zeichne();
  },
  'neu-laden': () => {
    if (!store.kannSpeichern()
      && !window.confirm('Gerade wird nichts gespeichert. Was du seit dem Start eingetragen hast, ist nach dem Neuladen weg. Trotzdem neu laden?')) return;
    neuLaden('knopf');
  },
});

if (SW_DA) {
  navigator.serviceWorker.addEventListener('controllerchange', () => { neueFassungPruefen(); });
  fassungFragen().then((f) => { ui.fassung = f; fassungAnzeigen(); });
}

// Jede Berührung zählt: Ab dann wird nicht mehr unter den Fingern neu
// geladen, sondern erst beim nächsten Verlassen.
['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((art) => {
  window.addEventListener(art, () => { angefasst = true; }, { capture: true, passive: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    vielleichtNeuladen();
    return;
  }
  angefasst = false;
  if (startController && navigator.serviceWorker.controller
      && navigator.serviceWorker.controller !== startController) {
    neueFassungPruefen();
  }
  vielleichtNeuladen();
  nachFassungSehen();
});

setInterval(() => {
  if (document.visibilityState === 'visible') nachFassungSehen();
}, SUCH_TAKT_MS);
