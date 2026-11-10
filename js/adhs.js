/*
 * ADHS-Mittel im Tagebuch: welche Einnahmen es gibt, wann sie waren und ob
 * sie zum Essen waren.
 *
 * Hier wird nur gezählt und eingeordnet, nicht geurteilt. Ein ADHS-Mittel wird
 * nach Plan genommen und nicht wegen des Bauchs; was es mit dem Bauch, dem
 * Kopf oder dem Schlaf zu tun haben könnte, lässt sich nur mit Einnahmen
 * fragen, deren Zeit und Bezug zum Essen feststehen. Deshalb trägt jede
 * Einnahme mit, wie sicher ihre Zeit ist (`zeitArt`), und die Angabe zum
 * Essen, wann sie gemacht wurde.
 *
 * Rein: alles kommt als Argument herein, nichts wird gespeichert, nichts geht
 * hinaus. Wer diese Datei liest, liest auch ihre Grenze – sie weiß nichts von
 * der Anzeige und nichts von den Schaltern. Gerechnet wird immer, sobald
 * Daten da sind; ob etwas davon zu sehen ist, entscheidet js/app.js (R0).
 *
 * DIE RECHNUNGEN (Familie „ADHS", siehe adhsAuswertung)
 *
 *   A1  Bauch in den vier Stunden nach der ersten Einnahme des Tages: ohne
 *       gegen mit Essen – je Mittel und Form. Getrennt nach Form, weil sich
 *       die Formen laut Fachinformation darin unterscheiden, wie sie zum
 *       Essen eingenommen werden und welche Spiegel sie erreichen
 *       (Medikinet adult, FI 013066, Stand 09/2025, 4.4 „Auswahl der
 *       Methylphenidat Darreichungsform"). Dass Bauchbeschwerden durch die
 *       Einnahme mit einer Mahlzeit gelindert werden können, steht in
 *       Fachinformationen von Methylphenidat (ebenda 4.8); ob eine Form den
 *       Bauch besser verträgt, steht dort nicht.
 *   A2  Tage mit gegen Tage ohne Stimulans: Bauch, Kopf, Schlaf, Kiefer,
 *       Pressen, dazu harter oder knolliger Stuhl als Beschreibung. Welche
 *       dieser Beschwerden eine Fachinformation unter den Nebenwirkungen
 *       nennt, ist je Wirkstoff verschieden (etwa Bruxismus und Verstopfung
 *       bei Medikinet adult, FI 013066, 4.8, nicht bei Attentin 5 mg, FI
 *       013378, 4.8); verglichen werden nur die eigenen Einträge.
 *   A3  Schlaf nach späterer gegen früherer letzter Einnahme.
 *   A4  Wann ein Kopfschmerz nach der ersten Einnahme beginnt – nur
 *       beschrieben, ohne Vergleich und ohne Frage.
 *   A5  Der Essensrhythmus an Einnahmetagen – nur beschrieben, für den
 *       Bericht.
 *
 * Was alle gemeinsam haben, steht in js/vergleich.js: wann ein Tag zählt,
 * und wann ein Vergleich kein Urteil bekommt, weil die Seiten verschieden
 * liegen. Zwei Dinge gelten hier besonders streng, weil das Weglassen eines
 * Mittels nie wie eine Einladung aussehen darf:
 *
 *   * „Ohne" zählt nur, wenn es jemand angegeben hat (R2) – ein Tag ohne
 *     Einnahme im Tagebuch ist kein Tag ohne Mittel, ein fehlendes Frühstück
 *     kein leerer Magen.
 *   * Auf der Seite „ohne" steht nie, wie viele noch fehlen (R9). Es steht
 *     die bisherige Zahl, und dass ein Vergleich nur entsteht, wenn es das
 *     ohnehin gibt.
 */
import {
  fmtDatum, knopfTageszeit, plusTage, tageszeitVon, zeitpunkt, fachVon, minutenAmTag,
} from './datum.js';
import { fmtZahl } from './text.js';
import {
  ADHS_MITTEL, STIMULANZIEN, adhsGruppe, formAusName, istAdhsMittel, mphForm,
} from './mittel.js';
import { formZu } from './zusammen.js';
import { zaehltFuerBauch } from './wasser.js';
import { reihenfolgeUnklar, stundenSeitEssen, tagesWert } from './auswertung.js';
import {
  ZIEL_BAUCH, ZIEL_KOPF, blockUngleich, eintraegeNachTag, familienVergleiche, grenzeText,
  nachweisSatz, tagNotiertOhne, vergleichRoh, vergleichUrteilen, wochenendeUngleich,
} from './vergleich.js';
import { herueberreichend, kopfEintraege } from './kopf.js';
import { stuhlgaenge } from './stuhl.js';
import { bristolVon } from './daten.js';

const MINUTE = 60 * 1000;

/** Die drei Antworten auf „Zum Essen?" – so, wie sie gespeichert werden. */
export const ESSEN_ARTEN = ['mit', 'vor', 'ohne'];

/**
 * Bis wann nach der Einnahme eine Angabe zum Essen zählt: eine Stunde.
 *
 * Später gemacht, weiß man schon, wie es dem Bauch danach ging – und eine
 * Angabe, die nach dem Ergebnis kommt, darf nicht darüber entscheiden, auf
 * welcher Seite eines Vergleichs der Fall landet. „Ohne Essen" fiele sonst
 * gerade dann, wenn es danach schlecht ging, und das Mittel sähe nüchtern
 * schlechter aus, als es war.
 */
export const ESSEN_GILT_MIN = 60;

/** Die Gründe für einen Tag ohne Mittel. Der vierte ist 'pause' ohne Grund. */
export const PAUSE_GRUENDE = ['geplant', 'vergessen', 'beschwerden'];
export const PAUSE_WERTE = ['pause', ...PAUSE_GRUENDE];

/** Gehört dieser Name zu einem Stimulans (Methylphenidat, Lisdexamfetamin, Dexamfetamin)? */
export const istStimulans = (name) => STIMULANZIEN.includes(adhsGruppe(name));

const BEZUG_MIT = ['beim', 'nach'];

/**
 * Wie sicher die Zeit einer Einnahme ist:
 *
 *   'genau'      von Hand oder mit „jetzt" – keine ungefähre Zeit
 *   'gebunden'   ungefähr, aber vor, beim oder nach einer Mahlzeit mit
 *                genauer Zeit: die Reihenfolge steht fest
 *   'ungefaehr'  nur „morgens" o. Ä. – für Stunden nicht zu gebrauchen
 */
function zeitArtVon(e, mahlzeiten) {
  if (!e.ungefaehr) return 'genau';
  const m = e.bezugMahlzeit ? mahlzeiten.get(e.bezugMahlzeit) : null;
  return m && !m.ungefaehr && ['vor', ...BEZUG_MIT].includes(e.bezug) ? 'gebunden' : 'ungefaehr';
}

/**
 * Alle Einnahmen von ADHS-Mitteln, nach der Zeit sortiert.
 *
 * Je Einnahme { e, gruppe, form, schluessel, t, zeitArt }: `t` ist der
 * Zeitpunkt in Millisekunden (Ortszeit), `schluessel` die Gruppe – bei
 * Methylphenidat mit der Form ('mph:pellet'), denn zwei Formen sind für den
 * Magen zwei verschiedene Mittel. Die Form ist die des Eintrags, sonst die,
 * die js/zusammen.js für diesen Namen kennt (zuletzt eingetragen, „Meine
 * Mittel", der Name selbst, sonst 'unbekannt').
 *
 * „Weiß ich nicht" im Eintrag zählt dabei wie keine Angabe: Es ist keine
 * eigene Form, sondern eine fehlende. Wer die Form später nachträgt – wozu
 * der Hinweis W1u ausdrücklich auffordert –, nimmt dasselbe Mittel weiter;
 * als eigene Form gezählt, begänne der Abschnitt (adhsAbschnitt) an diesem
 * Tag neu, und A1 zerfiele in zwei Schlüssel. Ein Wechsel ist erst der
 * Übergang zwischen zwei angegebenen Formen.
 *
 * Bupropion steht nicht dabei (siehe ADHS_GRUPPEN in js/mittel.js).
 */
export function adhsEinnahmen(eintraege, standardMittel = []) {
  const liste = Array.isArray(eintraege) ? eintraege.filter((x) => x && typeof x === 'object') : [];
  const mahlzeiten = new Map(liste.filter((x) => x.art === 'essen').map((x) => [x.id, x]));
  // Die Form je Name nur einmal suchen: formZu() geht alle Einträge durch,
  // und ein Jahr Tagebuch hat Hunderte Einnahmen desselben Mittels.
  const formNachName = new Map();
  const formVon = (name) => {
    const k = String(name || '').trim().toLowerCase();
    if (!formNachName.has(k)) formNachName.set(k, formZu(name, standardMittel, liste));
    return formNachName.get(k);
  };
  return liste
    .filter((e) => e.art === 'medikament' && istAdhsMittel(e.mittel))
    .map((e) => {
      const gruppe = adhsGruppe(e.mittel);
      const angegeben = e.form && e.form !== 'unbekannt' ? e.form : null;
      const form = gruppe === 'mph' ? (angegeben || formVon(e.mittel)) : null;
      return {
        e,
        gruppe,
        form,
        schluessel: gruppe === 'mph' ? `mph:${form}` : gruppe,
        t: zeitpunkt(e.am, e.um),
        zeitArt: zeitArtVon(e, mahlzeiten),
      };
    })
    .sort((a, b) => a.t - b.t);
}

/**
 * War diese Einnahme zum Essen? → { art, quelle }
 *
 *   'mit'          eine Mahlzeit mit genauer Zeit von einer Stunde davor bis
 *                  eine Viertelstunde danach, „beim" oder „nach dem Essen" an
 *                  einer solchen Mahlzeit, oder die Angabe „mit/nach Essen"
 *   'vor'          eine Mahlzeit eine Viertelstunde bis eine Stunde danach,
 *                  „vor dem Essen" an einer solchen, oder die Angabe
 *   'ohne'         nur aus der Angabe – und nur, wenn von einer Stunde davor
 *                  bis zwei Stunden danach keine Mahlzeit steht, auch keine
 *                  ungefähre derselben Tageszeit
 *   'widerspruch'  „ohne Essen" angegeben, aber da steht eine Mahlzeit
 *   'unklar'       nur eine ungefähre Mahlzeit derselben Tageszeit, sonst nichts
 *   'spaet'        die Angabe kam erst nach ESSEN_GILT_MIN Minuten
 *   null           nichts davon
 *
 * Ein fehlendes Frühstück ist kein nüchterner Magen: „ohne" gibt es nur, wenn
 * es jemand angetippt hat. Was sich aus den Mahlzeiten ergibt, geht der
 * Angabe vor – außer, beides widerspricht sich; dann zählt keins von beiden.
 * Abgeleitet wird nur bei einer genauen oder gebundenen Einnahmezeit: Bei
 * „morgens" ist offen, ob die Tablette vor oder nach dem Frühstück kam.
 *
 * `quelle` ist 'mahlzeit', 'bezug' oder 'angabe' – oder null.
 */
export function essenZurEinnahme(eintraege, einnahme) {
  const nichts = { art: null, quelle: null };
  if (!einnahme || !einnahme.e) return nichts;
  const { e, t, zeitArt } = einnahme;
  const liste = Array.isArray(eintraege) ? eintraege : [];
  const mahlzeiten = liste.filter((x) => x && x.art === 'essen');
  const abstand = (m) => (zeitpunkt(m.am, m.um) - t) / MINUTE;
  const genau = mahlzeiten.filter((m) => !m.ungefaehr);
  const tageszeit = tageszeitVon(e);
  const ungefaehrDabei = (m) => m.ungefaehr && m.am === e.am && tageszeitVon(m) === tageszeit;

  let abgeleitet = null;
  if (zeitArt === 'gebunden') {
    abgeleitet = { art: BEZUG_MIT.includes(e.bezug) ? 'mit' : 'vor', quelle: 'bezug' };
  } else if (zeitArt === 'genau') {
    if (genau.some((m) => abstand(m) >= -60 && abstand(m) <= 15)) abgeleitet = { art: 'mit', quelle: 'mahlzeit' };
    else if (genau.some((m) => abstand(m) > 15 && abstand(m) <= 60)) abgeleitet = { art: 'vor', quelle: 'mahlzeit' };
  }

  const angabe = ESSEN_ARTEN.includes(e.essen) ? e.essen : null;
  const gesetzt = Number(e.essenGesetzt);
  const mitZeit = Number.isFinite(gesetzt) && gesetzt > 0;
  const gueltig = !!angabe && mitZeit && gesetzt <= t + ESSEN_GILT_MIN * MINUTE;

  if (angabe === 'ohne' && gueltig) {
    const doch = mahlzeiten.some((m) => (m.ungefaehr ? ungefaehrDabei(m)
      : abstand(m) >= -60 && abstand(m) <= 120));
    return { art: doch ? 'widerspruch' : 'ohne', quelle: 'angabe' };
  }
  if (abgeleitet) return abgeleitet;
  if (angabe && gueltig) return { art: angabe, quelle: 'angabe' };
  if (angabe && mitZeit) return { art: 'spaet', quelle: 'angabe' };
  if (mahlzeiten.some(ungefaehrDabei)) return { art: 'unklar', quelle: 'mahlzeit' };
  return nichts;
}

/* ==================== Die Rechnungen ==================== */

const STUNDE = 60 * MINUTE;

/** Das Zählfenster nach einer Einnahme: fest vier Stunden. Kein Wirkfenster. */
export const ADHS_FENSTER_STD = 4;

/** Mindestfälle je Seite: Tage (A2, A3) und Fälle (A1 mindestens 5). */
export const ADHS_MINDEST = { a1: 5, bauch: 8, kopf: 12, schlaf: 8, kiefer: 8, gepresst: 8, stuhl: 8, a3: 8 };

/** Eine Mahlzeit ab dieser Stunde ist spät – dieselbe Grenze wie SPAET_AB in js/auswertung.js. */
const ADHS_SPAET_AB = 20;

/*
 * Wo eine Einnahme oder Beschwerde liegt, die an eine Mahlzeit gebunden ist –
 * dieselben Versätze, mit denen der Bogen sie einträgt (ESSENSBEZUG in
 * js/app.js). Sind beide an dieselbe Mahlzeit gebunden, folgt ihre
 * Reihenfolge allein daraus.
 */
const ADHS_VERSATZ = { vor: -30, beim: 10, nach: 30 };

/** Der Satz, der auf der Seite „ohne" steht, wo sonst eine Zielzahl stünde (R9). */
export const WEGLASS_SATZ = 'Ein Vergleich entsteht nur, wenn es das ohnehin gibt. Kein Grund, '
  + 'dafür etwas wegzulassen oder anders einzunehmen: Änderungen am Mittel gehören in die Praxis.';

const adhsSchnitt = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);
const adhsUhr = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
/** Der untere Median – damit „nach 12:45" eine Zeit ist, die es gab. */
const adhsMedian = (l) => {
  if (!l.length) return null;
  const s = [...l].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};
/** Ein Quantil mit linearer Zwischenrechnung. */
const adhsQuantil = (l, p) => {
  const s = [...l].sort((a, b) => a - b);
  if (!s.length) return null;
  const pos = p * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
};
const adhsIqr = (l) => (l.length >= 2 ? adhsQuantil(l, 0.75) - adhsQuantil(l, 0.25) : 0);
/** Minuten seit Mitternacht des Tages `iso` – über Mitternacht hinaus größer als 1440. */
const adhsMinuten = (t, iso) => (t - zeitpunkt(iso, '00:00')) / MINUTE;

/** Der Name eines Schlüssels: der eingetragene, der am häufigsten vorkommt. */
function adhsNamen(einnahmen) {
  const zaehler = new Map();
  einnahmen.forEach((x) => {
    const name = String(x.e.mittel || '').trim();
    if (!name) return;
    if (!zaehler.has(x.schluessel)) zaehler.set(x.schluessel, new Map());
    const z = zaehler.get(x.schluessel);
    z.set(name, (z.get(name) || 0) + 1);
  });
  return (schluessel) => {
    const z = zaehler.get(schluessel);
    if (!z || !z.size) {
      const g = ADHS_MITTEL.find((m) => m.id === String(schluessel).split(':')[0]);
      return g ? g.gruppe : String(schluessel);
    }
    return [...z.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };
}

/**
 * Ein Schlüssel in Worten – Gruppe und bei Methylphenidat die Form:
 * „Methylphenidat (Kapsel mit zweierlei Kügelchen)".
 */
export function schluesselText(schluessel) {
  const [gruppe, form] = String(schluessel).split(':');
  const g = ADHS_MITTEL.find((m) => m.id === gruppe);
  const name = g ? g.gruppe : gruppe;
  if (gruppe !== 'mph') return name;
  const f = mphForm(form);
  return `${name} (${f ? f.kurzname : 'Form nicht angegeben'})`;
}

/**
 * Der Name eines Schlüssels für A1: der eingetragene, bei Methylphenidat mit
 * der Form, wenn der Name sie nicht schon festlegt – „Medikinet (Kapsel mit
 * zweierlei Kügelchen)", aber „Concerta" allein. A1 trennt nach Form, und
 * zwei Formen unter demselben Namen sähen sonst wie ein Mittel aus.
 */
function a1Anzeige(schluessel, name) {
  const [gruppe, form] = String(schluessel).split(':');
  if (gruppe !== 'mph' || formAusName(name) === form) return name;
  const f = mphForm(form);
  return `${name} (${f ? f.kurzname : 'Form nicht angegeben'})`;
}

/**
 * Wann liegen Einnahme und Beschwerde, wenn beide an derselben Mahlzeit
 * hängen? Dann aus den Versätzen – sonst die eingetragenen Zeiten.
 */
function adhsZeiten(x, b, mahlzeiten) {
  const e = x.e;
  if (e.ungefaehr && b.ungefaehr && e.bezugMahlzeit && e.bezugMahlzeit === b.bezugMahlzeit
    && ADHS_VERSATZ[e.bezug] !== undefined && ADHS_VERSATZ[b.bezug] !== undefined) {
    const m = mahlzeiten.get(e.bezugMahlzeit);
    if (m && !m.ungefaehr) {
      const tm = zeitpunkt(m.am, m.um);
      return { tE: tm + ADHS_VERSATZ[e.bezug] * MINUTE, tB: tm + ADHS_VERSATZ[b.bezug] * MINUTE, gebunden: true };
    }
  }
  return { tE: x.t, tB: zeitpunkt(b.am, b.um), gebunden: false };
}

/**
 * Ist offen, ob diese Beschwerde vor oder nach der Einnahme kam?
 *
 * Offen ist sie, wenn beide am selben Tag in derselben Tageszeit liegen und
 * eine Seite nur ungefähr ist, ohne dass beide an derselben Mahlzeit hängen
 * – wie reihenfolgeUnklar() in js/auswertung.js für eine Mahlzeit. Gleiche
 * Versätze an derselben Mahlzeit („nach dem Essen" beide) sind ebenso offen.
 */
export function reihenfolgeOffen(x, b, mahlzeiten) {
  if (!x || !b || b.am !== x.e.am) return false;
  const z = adhsZeiten(x, b, mahlzeiten);
  if (z.gebunden) return z.tE === z.tB;
  const bezugFest = (y) => !!(y.bezug && y.bezugMahlzeit && mahlzeiten.get(y.bezugMahlzeit)
    && !mahlzeiten.get(y.bezugMahlzeit).ungefaehr);
  const bOffen = !!b.ungefaehr && !bezugFest(b);
  const eOffen = x.zeitArt === 'ungefaehr';
  if (!bOffen && !eOffen) return false;
  const tz = tageszeitVon(b);
  return tz !== null && tz === tageszeitVon(x.e);
}

/* ---------- Vorbereitung ---------- */

function adhsVorbereiten({ eintraege, tage, heute, standardMittel }) {
  const liste = (Array.isArray(eintraege) ? eintraege : [])
    .filter((e) => e && typeof e === 'object' && typeof e.am === 'string' && (!heute || e.am <= heute));
  const einnahmen = adhsEinnahmen(liste, standardMittel || []);
  const mahlzeiten = new Map(liste.filter((e) => e.art === 'essen').map((e) => [e.id, e]));
  const nachTag = eintraegeNachTag(liste);
  const beschwerden = liste.filter((e) => e.art === 'beschwerde')
    .map((b) => ({ b, t: zeitpunkt(b.am, b.um) }));
  const einnahmenNachTag = new Map();
  einnahmen.forEach((x) => {
    if (!einnahmenNachTag.has(x.e.am)) einnahmenNachTag.set(x.e.am, []);
    einnahmenNachTag.get(x.e.am).push(x);
  });
  return {
    liste, tage: tage || {}, einnahmen, mahlzeiten, nachTag, beschwerden, einnahmenNachTag,
    name: adhsNamen(einnahmen),
  };
}

/** Die Einträge des Tages – schneller als die ganze Liste. */
const adhsTagListe = (p, iso) => p.nachTag.get(iso) || [];

/** Ist dieser Schlüssel ein Stimulans? ('mph:pellet', 'lisdex', 'dex') */
const adhsStimSchluessel = (k) => STIMULANZIEN.includes(String(k).split(':')[0]);

/**
 * Ab wie vielen Tagen ohne Stimulans ein neues Mittel ohne Stimulans als
 * Wechsel zählt. Ein Wochenende ohne Stimulans ist keiner – auch dann nicht,
 * wenn an so einem Tag ein Zusatzmittel zum ersten Mal genommen wird.
 */
const ADHS_WEG_TAGE = 3;

/**
 * Ab wie vielen Tagen ohne Stimulans es als abgesetzt gilt, auch wenn ein
 * zweites Mittel weiterläuft und nichts Neues dazukommt. Zwei Wochen: Eine
 * Woche ohne – Ferien, ein Infekt – ist noch kein Absetzen.
 */
const ADHS_ABGESETZT_TAGE = 14;

/**
 * Der Wechselpunkt nach der bisherigen Regel: der erste Tag nach dem
 * letzten, an dem keiner der Bezugsschlüssel stand.
 */
function adhsAbschnittVon(isos, schluesselAm, bezug) {
  for (let i = isos.length - 1; i >= 0; i--) {
    if (!schluesselAm(isos[i]).some((k) => bezug.has(k))) return isos[i + 1];
  }
  return isos[0];
}

/**
 * Der aktuelle Abschnitt: seit wann das Mittel genommen wird, das jetzt
 * genommen wird.
 *
 * Ein zusätzliches Mittel setzt nicht zurück, ein Wechsel schon: Wer im
 * Sommer von einer Form auf eine andere gewechselt hat, vergleicht seine
 * Tage nicht mit denen davor.
 *
 * Gibt es ein Stimulans, bestimmt es den Abschnitt – nur darum geht es in A2
 * und A3. Bezug sind die Stimulans-Schlüssel des letzten Tages mit einem
 * Stimulans; der Abschnitt beginnt am ersten Tag mit einem davon nach dem
 * letzten Tag, an dem ein anderes Stimulans stand. Tage nur mit einem Mittel
 * ohne Stimulans setzen nie zurück. Der Bezug darf nicht einfach der letzte
 * Einnahmetag sein: Wer morgens ein Stimulans nimmt und abends ein zweites
 * Mittel, hätte mittags nur das Stimulans eingetragen – jeder frühere Tag
 * nur mit dem Abendmittel (ein Tag ohne Stimulans, genau die Tage, die A2
 * vergleicht) sähe dann wie ein Wechsel aus, und Karte und Bericht sprängen
 * im Lauf des Tages. Umgekehrt setzte ein Wechsel des Stimulans nie zurück,
 * solange das zweite Mittel durchläuft.
 *
 * Vom Stimulans weg ist, wer seit mindestens ADHS_WEG_TAGE Tagen keines
 * eingetragen hat und seither ein Mittel ohne Stimulans nimmt, das im
 * Abschnitt des letzten Stimulans nicht vorkam – auch eines, das schon früher
 * einmal genommen wurde (zurück auf das alte Mittel). Ebenso, wer seit
 * ADHS_ABGESETZT_TAGE Tagen keines eingetragen hat, auch wenn ein zweites
 * Mittel weiterläuft. Sonst bliebe ein seit Monaten abgesetztes Stimulans in
 * Karte und Bericht das laufende Mittel, und A2 und A3 rechneten über seine
 * alten Tage. Dann – und ohne jedes Stimulans – gilt die Regel über alle
 * Mittel, über die Tage nach dem letzten Stimulans: Bezug sind die Mittel des
 * letzten Einnahmetags. Kommt dasselbe Stimulans nach einer Pause wieder,
 * bestimmt es den Abschnitt wieder, von seinem Beginn an.
 *
 * `schluessel` sind die Mittel des Abschnitts in der Kopfzeile: der Bezug und
 * was in den letzten sieben Tagen bis zum letzten Einnahmetag dazukam – damit
 * mittags dieselben Namen dastehen wie abends.
 */
export function adhsAbschnitt(einnahmen, heute) {
  const tageKeys = new Map();
  (einnahmen || []).forEach((x) => {
    if (heute && x.e.am > heute) return;
    if (!tageKeys.has(x.e.am)) tageKeys.set(x.e.am, new Set());
    tageKeys.get(x.e.am).add(x.schluessel);
  });
  const isos = [...tageKeys.keys()].sort();
  if (!isos.length) return null;
  const letzter = isos[isos.length - 1];
  const alleAm = (iso) => [...tageKeys.get(iso)];
  const stimAm = (iso) => alleAm(iso).filter(adhsStimSchluessel);
  const stimTage = isos.filter((iso) => stimAm(iso).length);
  const letzterStim = stimTage.length ? stimTage[stimTage.length - 1] : null;
  const stimBezug = letzterStim !== null ? new Set(stimAm(letzterStim)) : null;
  const stimVon = letzterStim !== null ? adhsAbschnittVon(stimTage, stimAm, stimBezug) : null;
  /*
   * Weg vom Stimulans: seit mindestens ADHS_WEG_TAGE Tagen keines, und danach
   * ein Mittel ohne Stimulans, das im Abschnitt des letzten Stimulans nicht
   * vorkam – oder seit ADHS_ABGESETZT_TAGE Tagen keines.
   */
  let weg = false;
  if (letzterStim !== null && letzterStim <= plusTage(letzter, -ADHS_WEG_TAGE)) {
    const vorher = new Set();
    isos.filter((iso) => iso >= stimVon && iso <= letzterStim).forEach((iso) => alleAm(iso).forEach((k) => vorher.add(k)));
    weg = letzterStim <= plusTage(letzter, -ADHS_ABGESETZT_TAGE)
      || isos.some((iso) => iso > letzterStim && alleAm(iso).some((k) => !adhsStimSchluessel(k) && !vorher.has(k)));
  }
  let von;
  let bezug;
  if (letzterStim !== null && !weg) {
    bezug = stimBezug;
    von = stimVon;
  } else {
    const nachher = letzterStim !== null ? isos.filter((iso) => iso > letzterStim) : isos;
    bezug = new Set(alleAm(letzter));
    von = adhsAbschnittVon(nachher, alleAm, bezug);
  }
  const tage = isos.filter((iso) => iso >= von);
  const ab = plusTage(letzter, -6);
  const schluessel = new Set(bezug);
  tage.filter((iso) => iso >= ab).forEach((iso) => tageKeys.get(iso).forEach((k) => schluessel.add(k)));
  return { von, schluessel: [...schluessel].sort(), tage };
}

/** Die Tage ohne Mittel (R2): nur angegebene, und nur ohne Stimulans-Einnahme. */
function adhsPausen(p, von, bis) {
  const raus = { ohne: [], beschwerden: [], gruende: { pause: 0, geplant: 0, vergessen: 0, beschwerden: 0 } };
  Object.keys(p.tage).sort().forEach((iso) => {
    if ((von && iso < von) || (bis && iso >= bis)) return;
    const grund = p.tage[iso] && p.tage[iso].adhsPause;
    if (!PAUSE_WERTE.includes(grund)) return;
    if ((p.einnahmenNachTag.get(iso) || []).some((x) => STIMULANZIEN.includes(x.gruppe))) return;
    raus.gruende[grund] += 1;
    // „Wegen Beschwerden" ist keine Zufallsauswahl, sondern das Ergebnis:
    // Es zählt nie in einem Vergleich (Pflichtvorbehalt in A2).
    if (grund === 'beschwerden') raus.beschwerden.push(iso);
    else raus.ohne.push(iso);
  });
  return raus;
}

/* ---------- A1 ---------- */

/**
 * A1: der Bauch in den vier Stunden nach der ersten Einnahme des Tages – je
 * Mittel (bei Methylphenidat je Form), ohne gegen mit Essen.
 *
 * Ein Fall ist die erste Einnahme eines Tages; eine zweite Einnahme am
 * selben Tag ist keiner, sie läge im Fenster der ersten. Gezählt wird nur,
 * was eine feste Reihenfolge hat (R3): eine genaue oder an eine Mahlzeit
 * gebundene Zeit, keine Beschwerde in den zwei Stunden davor (die wäre schon
 * da gewesen), keine Beschwerde, bei der offen ist, ob sie davor oder danach
 * kam. Und der Tag muss durch etwas außerhalb des Fensters oder durch eine
 * Tagesfrage notiert sein (R10) – sonst stünde ein Tag nur dann in der
 * Rechnung, wenn es danach wehtat, oder nur auf einer Seite schon durch die
 * Mahlzeit, die die Seite bestimmt.
 */
function a1Faelle(p, { jetzt }) {
  const jeSchluessel = new Map();
  const leer = () => ({
    mit: [], ohne: [], vor: 0, ohneAngabe: 0, widerspruch: 0, unklar: 0, spaet: 0,
    nichtZuzuordnen: 0, davor: 0, offen: 0, nichtNotiert: 0, nuechtern: 0, fensterBeschwerden: 0,
  });
  const erste = new Map();
  p.einnahmen.forEach((x) => {
    const k = `${x.schluessel}|${x.e.am}`;
    if (!erste.has(k)) erste.set(k, x);
  });
  erste.forEach((x) => {
    if (!jeSchluessel.has(x.schluessel)) jeSchluessel.set(x.schluessel, leer());
    const z = jeSchluessel.get(x.schluessel);
    const iso = x.e.am;
    if (x.zeitArt === 'ungefaehr') { z.nichtZuzuordnen += 1; return; }
    const ende = x.t + ADHS_FENSTER_STD * STUNDE;
    if (ende > jetzt) return;
    const imFenster = (e) => {
      const t = zeitpunkt(e.am, e.um);
      return t >= x.t - 60 * MINUTE && t <= ende;
    };
    // Notiert ohne die Zielgröße (R10): Was im Fenster steht, macht den Tag
    // nicht zu einem gezählten – nur etwas davor oder danach oder eine
    // Tagesfrage. Nicht nur die Beschwerden dort: Auch die Mahlzeit im
    // Fenster zählt nicht, denn bei „mit Essen“ ist sie es, die die Seite
    // bestimmt. Sonst wäre jeder Fall „mit“ durch sein Frühstück notiert, ein
    // Fall „ohne“ aber nur durch etwas Späteres – oft eine Beschwerde, die an
    // einem schlechten Morgen hängt –, und ruhige Morgen ohne Essen fielen
    // heraus, ruhige mit Essen nicht. Kopfschmerz und sein Mittel sagen über
    // den Bauch wie überall nichts (zaehltFuerBauch).
    if (!tagNotiertOhne(p.liste, p.tage, iso, (e) => imFenster(e) || (ZIEL_BAUCH(e) && e.art !== 'beschwerde'))) {
      z.nichtNotiert += 1;
      return;
    }
    const nahe = [plusTage(iso, -1), iso, plusTage(iso, 1)]
      .flatMap((d) => adhsTagListe(p, d)).filter((e) => e.art === 'beschwerde');
    const zeiten = nahe.map((b) => ({ b, ...adhsZeiten(x, b, p.mahlzeiten) }));
    if (zeiten.some(({ tE, tB }) => tB >= tE - 2 * STUNDE && tB <= tE)) { z.davor += 1; return; }
    if (nahe.some((b) => reihenfolgeOffen(x, b, p.mahlzeiten))) { z.offen += 1; return; }
    const essen = essenZurEinnahme(p.liste, x);
    if (essen.art === 'vor') { z.vor += 1; return; }
    if (essen.art === 'widerspruch') { z.widerspruch += 1; return; }
    if (essen.art === 'unklar') { z.unklar += 1; return; }
    if (essen.art === 'spaet') { z.spaet += 1; return; }
    if (essen.art !== 'mit' && essen.art !== 'ohne') { z.ohneAngabe += 1; return; }
    const imFall = zeiten.filter(({ tE, tB }) => tB > tE && tB <= tE + ADHS_FENSTER_STD * STUNDE);
    const wert = imFall.reduce((m, { b }) => Math.max(m, Number(b.staerke) || 0), 0);
    // Dieselben Beschwerden in der Lesart „wie lange nach dem Essen": Wie
    // viele zählen dort als nüchtern? Gemeint ist die Zählregel der App
    // (essensbezug in js/auswertung.js: vier Stunden und mehr seit der
    // letzten eingetragenen Mahlzeit), keine medizinische Festlegung.
    const umfeld = [plusTage(iso, -1), iso, plusTage(iso, 1)].flatMap((d) => adhsTagListe(p, d));
    imFall.forEach(({ b }) => {
      z.fensterBeschwerden += 1;
      const std = stundenSeitEssen(umfeld, b);
      if (std !== null && std >= 4) z.nuechtern += 1;
    });
    const stress = p.tage[iso] ? Number(p.tage[iso].stress) : NaN;
    z[essen.art].push({ iso, wert, stress: Number.isFinite(stress) ? stress : null });
  });
  return jeSchluessel;
}

function a1Saetze(v, z, anspannung) {
  const saetze = [];
  const a = fmtZahl(v.ohne.schnitt);
  const b = fmtZahl(v.mit.schnitt);
  const zahlen = `Nach Einnahmen ohne Essen lag der Bauch in den vier Stunden danach im Mittel bei ${a}, `
    + `nach Einnahmen mit Essen bei ${b} (${v.ohne.n} gegen ${v.mit.n} Mal).`;
  if (!v.genug) {
    saetze.push(`Bisher ${v.mit.n}-mal mit, ${v.ohne.n}-mal ohne Essen angegeben – zu wenige `
      + `Einnahmen ${v.ohne.n < v.mindest ? 'ohne' : 'mit'} Essen für einen Vergleich.`);
    if (v.ohne.n < v.mindest) {
      saetze.push(WEGLASS_SATZ);
      saetze.push('Bei manchen Präparaten steht in der Fachinformation, dass sie mit oder nach '
        + 'einer Mahlzeit genommen werden.');
    }
  } else if (['auffaellig', 'moeglich', 'unauffaellig'].includes(v.art)) {
    saetze.push(`${zahlen} Das liegt über dem Zufallsspielraum (±${fmtZahl(v.urteil.spielraum)}). `
      + 'Ob es am leeren Magen liegt oder an dem, was an solchen Morgen sonst anders ist, zeigt das '
      + 'Tagebuch nicht. Zahlen, keine Einnahmeregel – wie dein Präparat zum Essen gehört, steht in '
      + 'der Packungsbeilage.');
  } else if (v.art === 'neutral') {
    saetze.push(`${zahlen} ${nachweisSatz(grenzeText(v.urteil.grenze, 'bauch'))}`);
  } else {
    saetze.push(zahlen, ...v.saetze);
  }
  if (v.mit.n) saetze.push('Bei „mit Essen“ zählt die Mahlzeit selbst mit.');
  // Daneben, nicht darin: War es an den Morgen ohne Essen auch sonst anders?
  if (v.genug && anspannung.ohne !== null && anspannung.mit !== null) {
    saetze.push(`Anspannung an diesen Tagen: ${fmtZahl(anspannung.ohne)} gegen ${fmtZahl(anspannung.mit)}.`);
  }
  if (z.nuechtern) {
    saetze.push(`${z.nuechtern} dieser Beschwerden zählen unter „Wie lange nach dem Essen“ auch als `
      + 'nüchtern – dieselben Beschwerden, zwei Lesarten.');
  }
  return saetze;
}

/* ---------- A2 ---------- */

/**
 * Die Bezugszeit eines Tages für den Kopf: die erste Stimulans-Einnahme, wenn
 * ihre Zeit feststeht – sonst und an Tagen ohne Mittel die mittlere Uhrzeit
 * der ersten Einnahmen mit fester Zeit. Ein Kopfschmerz, der schon davor
 * begann, kann nicht von der Einnahme dieses Tages ausgelöst sein – ein
 * Kopfschmerz als Folge eines Mittels beginnt nach der Einnahme (ICHD-3,
 * 2018, 8.1 „with onset immediately or within hours"; 8.1.9 Kriterium C1).
 * Ob er mit dem Mittel überhaupt zusammenhängt, etwa bei längerer Einnahme
 * (8.1.10), lässt die Reihenfolge offen; deshalb zählt er hier nur nicht
 * mit.
 */
function a2KopfWert(p, iso, bezugMin) {
  if (bezugMin === null) return { grund: 'ohneBezug' };
  if (herueberreichend(p.liste, iso)) return { grund: 'herueber' };
  const bezug = zeitpunkt(iso, '00:00') + bezugMin * MINUTE;
  const bezugTz = knopfTageszeit(adhsUhr(bezugMin));
  const koepfe = kopfEintraege(adhsTagListe(p, iso));
  if (koepfe.some((k) => k.ungefaehr && tageszeitVon(k) !== null && tageszeitVon(k) === bezugTz)) {
    return { grund: 'offen' };
  }
  if (koepfe.some((k) => zeitpunkt(k.am, k.um) <= bezug)) return { grund: 'davor' };
  return { wert: koepfe.length ? 1 : 0 };
}

function a2Zeilen(p, abschnitt, pausen, heute) {
  const stim = (iso) => (p.einnahmenNachTag.get(iso) || []).filter((x) => STIMULANZIEN.includes(x.gruppe));
  const mitTage = abschnitt.tage.filter((iso) => iso < heute && stim(iso).length);
  const ohneTage = pausen.ohne;
  // Die mittlere Uhrzeit der ersten Stimulans-Einnahme mit fester Zeit.
  const ersteMin = mitTage.map((iso) => stim(iso)[0]).filter((x) => x.zeitArt !== 'ungefaehr')
    .map((x) => adhsMinuten(x.t, x.e.am));
  const median = adhsMedian(ersteMin);
  const zaehl = { ohneBezug: 0, herueber: 0, offen: 0, davor: 0 };
  const zahl = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const seiten = (wert) => ({
    mit: mitTage.map((iso) => ({ iso, wert: wert(iso, true) })).filter((x) => x.wert !== null),
    ohne: ohneTage.map((iso) => ({ iso, wert: wert(iso, false) })).filter((x) => x.wert !== null),
  });
  const dichte = (ohneFelder = []) => ({ eintraege: p.liste, tage: p.tage, istZiel: ZIEL_BAUCH, ohneFelder });
  const name = 'ADHS-Mittel';

  const bauch = seiten((iso) => (tagNotiertOhne(p.liste, p.tage, iso, ZIEL_BAUCH)
    ? tagesWert(adhsTagListe(p, iso), iso, p.tage).wert : null));
  const kopf = seiten((iso, mit) => {
    if (!tagNotiertOhne(p.liste, p.tage, iso, ZIEL_KOPF)) return null;
    const erste = mit ? stim(iso)[0] : null;
    const bezugMin = erste && erste.zeitArt !== 'ungefaehr' ? adhsMinuten(erste.t, iso) : median;
    const r = a2KopfWert(p, iso, bezugMin);
    if (r.grund) { zaehl[r.grund] += 1; return null; }
    return r.wert;
  });
  const schlaf = seiten((iso) => zahl((p.tage[plusTage(iso, 1)] || {}).schlaf));
  const kiefer = seiten((iso) => zahl((p.tage[plusTage(iso, 1)] || {}).kiefer));
  const gepresst = seiten((iso) => zahl((p.tage[iso] || {}).gepresst));

  // Harter oder knolliger Stuhl: nur beschrieben. Anteil der Tage mit
  // Stuhlgang, an denen einer davon Typ 1 oder 2 der Bristol-Skala war – der
  // Bereich, der laut gesund.bund.de auf Verstopfung deutet
  // (verstopfung-bei-erwachsenen, Stand 02.10.2023).
  const stuhl = seiten((iso) => {
    const s = stuhlgaenge(adhsTagListe(p, iso));
    if (!s.length) return null;
    return s.some((e) => bristolVon(e.form).gruppe === 'hart') ? 1 : 0;
  });
  const roh = {
    bauch: vergleichRoh({ ...bauch, mindest: ADHS_MINDEST.bauch, name, dichte: dichte() }),
    kopf: vergleichRoh({ ...kopf, mindest: ADHS_MINDEST.kopf, name, dichte: dichte() }),
    schlaf: vergleichRoh({ ...schlaf, mindest: ADHS_MINDEST.schlaf, name, dichte: dichte() }),
    kiefer: vergleichRoh({ ...kiefer, mindest: ADHS_MINDEST.kiefer, name, dichte: dichte() }),
    gepresst: vergleichRoh({ ...gepresst, mindest: ADHS_MINDEST.gepresst, name, dichte: dichte(['gepresst']) }),
  };
  const stuhlRoh = vergleichRoh({ ...stuhl, mindest: ADHS_MINDEST.stuhl, name });
  return {
    roh, stuhlRoh, zaehl, median, mitTage: mitTage.length,
  };
}

const A2_SKALA = {
  bauch: { skala: 'bauch' },
  kopf: { skala: 'anteil', schwelle: 0.2 },
  schlaf: { skala: 'skala', schwelle: 0.5 },
  kiefer: { skala: 'skala', schwelle: 0.5 },
  gepresst: { skala: 'anteil', schwelle: 0.2 },
};

const A2_NAME = {
  bauch: 'Bauch am Tag (0–10)',
  kopf: 'Kopfschmerz nach der Einnahmezeit',
  schlaf: 'Schlaf in der Nacht danach (0 gut – 4 kaum)',
  kiefer: 'Kiefer am Morgen danach (0–4)',
  gepresst: 'Tagsüber gepresst/geknirscht',
};

function a2Satz(id, v) {
  const prozent = (x) => `${Math.round(x * 100)} %`;
  const wert = (x) => (A2_SKALA[id].skala === 'anteil' ? prozent(x) : fmtZahl(x));
  const zahlen = `${A2_NAME[id]}: an Tagen mit Mittel ${wert(v.mit.schnitt)}, an Tagen ohne `
    + `${wert(v.ohne.schnitt)} (${v.mit.n} gegen ${v.ohne.n} Tage).`;
  if (!v.genug) return '';
  if (['auffaellig', 'moeglich', 'unauffaellig'].includes(v.art)) {
    const s = A2_SKALA[id].skala === 'anteil'
      ? `${Math.round(v.urteil.spielraum * 100)} Prozentpunkte` : fmtZahl(v.urteil.spielraum);
    return `${zahlen} Das liegt über dem Zufallsspielraum (±${s}).`;
  }
  return `${zahlen} ${v.saetze.join(' ')}`;
}

/**
 * R9 für A2: der Satz „zu wenige für einen Vergleich“ samt WEGLASS_SATZ – oder
 * nichts.
 *
 * „zu wenige“ hängt an den Vergleichen, nicht an der Zahl der angegebenen
 * Tage: Gewertet wird nur ein Tag mit einem Wert (R1, R10), und zehn Tage, an
 * denen nur „ohne Mittel“ steht, ergeben keinen Vergleich. Der Satz steht nur,
 * wenn KEINE der gezeigten Zeilen (`ids`) auf der Seite „ohne“ genug Tage hat:
 * Schlaf, Kiefer und gepresst brauchen keinen für Bauch oder Kopf notierten
 * Tag, nur einen Wert – sonst stünde „zu wenige“ neben einem Vergleich
 * derselben Tage. Welche Zeilen gezeigt werden, wissen nur Karte und Bericht
 * (Kiefer und gepresst mit dem Schalter); eine verdeckte Zeile darf den Satz
 * nicht unterdrücken. „Davon gewertet“ ist das Höchste über dieselben Zeilen.
 * Fehlen Tage nur auf der Seite „mit“, meinte der Satz die falsche Seite.
 * Genannt wird nur, was es bisher gibt, nie eine Mindestzahl.
 */
export function a2ZuWenig(a2, ids) {
  if (!a2 || !a2.zuWenigOhne) return [];
  const da = (ids || []).filter((id) => id in a2.zuWenigOhne);
  if (!da.length || !da.every((id) => a2.zuWenigOhne[id])) return [];
  const gewertet = Math.max(...da.map((id) => a2.ohneGewertet[id]));
  return [gewertet === a2.ohneTage
    ? `Tage ohne ADHS-Mittel bisher: ${a2.ohneTage} – zu wenige für einen Vergleich.`
    : `Tage ohne ADHS-Mittel bisher: ${a2.ohneTage}, davon gewertet ${gewertet} – zu wenige für einen Vergleich.`,
  WEGLASS_SATZ];
}

/* ---------- A3 ---------- */

function a3Faelle(p, abschnitt, heute) {
  const tageListe = abschnitt.tage.filter((iso) => iso < heute);
  const faelle = [];
  let nichtZuzuordnen = 0;
  tageListe.forEach((iso) => {
    const liste = (p.einnahmenNachTag.get(iso) || []).filter((x) => STIMULANZIEN.includes(x.gruppe));
    if (!liste.length) return;
    // R8: Innerhalb von vier Stunden nach einer Einnahme desselben Mittels
    // ist es dieselbe Gabe.
    let gaben = 0;
    const zuletzt = new Map();
    liste.forEach((x) => {
      const vorher = zuletzt.get(x.schluessel);
      if (vorher === undefined || x.t - vorher > ADHS_FENSTER_STD * STUNDE) gaben += 1;
      zuletzt.set(x.schluessel, x.t);
    });
    const letzte = liste[liste.length - 1];
    if (letzte.zeitArt === 'ungefaehr') { nichtZuzuordnen += 1; return; }
    const schlaf = Number((p.tage[plusTage(iso, 1)] || {}).schlaf);
    const raw = (p.tage[plusTage(iso, 1)] || {}).schlaf;
    if (raw === undefined || raw === null || raw === '' || !Number.isFinite(schlaf)) return;
    const vor = (p.tage[iso] || {}).schlaf;
    const stress = (p.tage[iso] || {}).stress;
    faelle.push({
      iso,
      gaben,
      min: adhsMinuten(letzte.t, iso),
      wert: schlaf,
      vorNacht: vor === undefined || vor === null || vor === '' ? null : Number(vor),
      stress: stress === undefined || stress === null || stress === '' ? null : Number(stress),
    });
  });
  // Nur Tage mit der häufigsten Gabenzahl: Wer an manchen Tagen zweimal
  // nimmt, nimmt dann auch später – und hat dann auch mehr vom Mittel.
  const haeufig = new Map();
  faelle.forEach((f) => haeufig.set(f.gaben, (haeufig.get(f.gaben) || 0) + 1));
  const gaben = [...haeufig.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))[0];
  const gleich = gaben ? faelle.filter((f) => f.gaben === gaben[0]) : [];
  const iqr = adhsIqr(gleich.map((f) => f.min));
  const median = adhsMedian(gleich.map((f) => f.min));
  const dicht = gleich.length >= 2 && iqr < 60;
  const spaeter = dicht ? [] : gleich.filter((f) => f.min > median);
  const sonst = dicht ? [] : gleich.filter((f) => f.min <= median);
  const roh = vergleichRoh({
    mit: spaeter,
    ohne: sonst,
    mindest: ADHS_MINDEST.a3,
    name: 'späte Einnahme',
    seiten: { mit: 'Die Tage mit späterer letzter Einnahme', ohne: 'Die Tage mit früherer letzter Einnahme' },
  });
  // Die Nacht davor: War sie auf beiden Seiten schon verschieden, misst der
  // Vergleich das mit. Eine Seite ohne jede Angabe hat keinen Mittelwert –
  // eine Lücke ist nie 0 = „gut geschlafen“ (R1). Fehlen die Angaben nur auf
  // einer Seite, lässt sich die Nacht davor nicht vergleichen, und es gibt
  // vorsichtshalber kein Urteil; fehlen sie auf beiden, gibt es nichts zu
  // prüfen.
  const vor = (l) => {
    const w = l.map((f) => f.vorNacht).filter((x) => x !== null && Number.isFinite(x));
    return w.length ? adhsSchnitt(w) : null;
  };
  const vorNacht = { spaeter: vor(spaeter), sonst: vor(sonst) };
  if (roh.genug && !roh.stoerung) {
    const da = [vorNacht.spaeter, vorNacht.sonst].filter((x) => x !== null).length;
    if (da === 2 && Math.abs(vorNacht.spaeter - vorNacht.sonst) >= 0.5) roh.stoerung = 'vornacht';
    else if (da === 1) roh.stoerung = 'vornachtLeer';
  }
  const st = (l) => {
    const w = l.map((f) => f.stress).filter((x) => x !== null && Number.isFinite(x));
    return w.length ? adhsSchnitt(w) : null;
  };
  return {
    roh,
    dicht,
    iqr,
    median,
    gaben: gaben ? gaben[0] : 0,
    faelle: gleich.length,
    nichtZuzuordnen,
    vorNacht,
    stress: { spaeter: st(spaeter), sonst: st(sonst) },
  };
}

const A3_VORNACHT_LEER = 'Zur Nacht davor fehlen auf einer Seite die Angaben – ob sie schon verschieden war, '
  + 'kann der Vergleich nicht prüfen.';

/*
 * Derselbe Wortlaut wie im Bericht (js/bericht.js, A3); unter „Mehr"
 * (WISSEN_ADHS in js/app.js) steht nur der erste Satz zu den Studien, mit
 * eigener Fortsetzung. Belegt ist nur der Zusammenhang, keine Ursache: Biol Psychiatry
 * 2010;67(11):1091-6 (PMID 20163790, Abstract), 40 Erwachsene mit ADHS:
 * „Compared with control subjects, both groups of ADHD adults had longer
 * sleep-onset latency"; Neurosci Biobehav Rev 2018;89:61-71 (PMID 29477617,
 * Abstract), Metaanalyse zu Erwachsenen: mit Bewegungsmessung „sleep onset
 * latency: 0.80 (0.46-1.14)", im Schlaflabor dagegen „No significant
 * differences were detected for polysomnographic parameters" – deshalb
 * „manche Studien". Diese Studien vergleichen Erwachsene mit und ohne ADHS;
 * die Rechnung hier vergleicht Tage derselben Person nach der Einnahmezeit,
 * und zwar die Schlafbewertung, nicht die Einschlafzeit. ADHS steht dabei auf
 * beiden Seiten. Bis zur Fassung 30 hieß es deshalb fälschlich, ein
 * Unterschied lasse sich nicht trennen „an der Einnahmezeit … oder an ADHS
 * selbst"; bis zur Fassung 29: „Späteres Einschlafen gehört oft auch zu ADHS
 * selbst".
 */
export const A3_STUDIEN = 'Manche Studien finden bei Erwachsenen mit ADHS im Mittel eine längere Einschlafzeit '
  + 'als bei anderen. Ob ein Unterschied hier an der Einnahmezeit liegt oder an etwas, das mit ihr '
  + 'zusammenfällt, trennt dieser Vergleich nicht.';

function a3Saetze(a3, v) {
  if (a3.dicht) return ['Deine Einnahmezeiten liegen zu dicht beieinander für diesen Vergleich.'];
  if (!v.genug) {
    return [`Bisher ${a3.faelle} Tage mit einer Schlafangabe in der Nacht danach – zu wenige für einen `
      + 'Vergleich.'];
  }
  const zahlen = `Nach Tagen mit späterer letzter Einnahme (nach ${adhsUhr(a3.median)}) hast du den Schlaf `
    + `im Mittel mit ${fmtZahl(v.mit.schnitt)} bewertet, sonst mit ${fmtZahl(v.ohne.schnitt)} `
    + `(${v.mit.n} gegen ${v.ohne.n} Nächte; Spielraum ±${fmtZahl(v.urteil.spielraum)}).`
    + `${a3.stress.spaeter !== null && a3.stress.sonst !== null ? ` Anspannung an diesen Tagen: `
      + `${fmtZahl(a3.stress.spaeter)} gegen ${fmtZahl(a3.stress.sonst)}.` : ''} ${A3_STUDIEN}`;
  if (v.stoerung === 'vornacht') {
    return [zahlen, `Schon die Nacht davor war auf beiden Seiten verschieden (${fmtZahl(a3.vorNacht.spaeter)} `
      + `gegen ${fmtZahl(a3.vorNacht.sonst)}) – der Vergleich misst das mit.`];
  }
  if (v.stoerung === 'vornachtLeer') return [zahlen, A3_VORNACHT_LEER];
  return [zahlen, ...v.saetze];
}

/* ---------- A4 ---------- */

/**
 * A4: Wann beginnt ein Kopfschmerz, gezählt ab der ersten Einnahme? Nur eine
 * Beschreibung in gleich breiten Fächern – ohne Schwerpunkt, ohne Vergleich
 * und ohne Frage. Manche Kopfschmerzarten sind auch ohne Mittel an bestimmte
 * Tageszeiten gebunden – der hypnische Kopfschmerz an den Schlaf (ICHD-3,
 * 2018, 4.9), der bei Schlafapnoe an das Aufwachen (10.1.4), der
 * Cluster-Kopfschmerz häufig an dieselbe Uhrzeit, früh am Morgen oder kurz
 * nach dem Einschlafen (gesund.bund.de/cluster-kopfschmerzen, Stand
 * 21.10.2022, Verlauf). Und wer jeden Tag zur selben Zeit einnimmt, für den
 * heißen Stunden nach der Einnahme fast dasselbe wie Uhrzeit.
 *
 * Ein Kopfschmerz vor der Einnahme ist nicht von dieser Einnahme ausgelöst
 * (siehe a2KopfWert, ICHD-3 8.1); ob er mit dem Mittel insgesamt zu tun
 * hat, zeigt diese Beschreibung nicht.
 */
function a4Zaehlung(p, abschnitt, heute) {
  const faecher = [0, 0, 0];
  let vorher = 0;
  let spaeter = 0;
  let weg = 0;
  let nichtZuzuordnen = 0;
  const ersteMin = [];
  abschnitt.tage.filter((iso) => iso < heute).forEach((iso) => {
    const x = (p.einnahmenNachTag.get(iso) || [])[0];
    if (!x) return;
    if (x.zeitArt === 'ungefaehr') { nichtZuzuordnen += 1; return; }
    ersteMin.push(adhsMinuten(x.t, iso));
    const koepfe = kopfEintraege(adhsTagListe(p, iso))
      .sort((a, b) => zeitpunkt(a.am, a.um) - zeitpunkt(b.am, b.um));
    if (!koepfe.length) return;
    const k = koepfe[0];
    if (k.ungefaehr || herueberreichend(p.liste, iso)) { weg += 1; return; }
    const std = (zeitpunkt(k.am, k.um) - x.t) / STUNDE;
    if (std <= 0) vorher += 1;
    else if (std <= 4) faecher[0] += 1;
    else if (std <= 8) faecher[1] += 1;
    else if (std <= 12) faecher[2] += 1;
    else spaeter += 1;
  });
  const n = faecher[0] + faecher[1] + faecher[2] + vorher + spaeter;
  const dicht = ersteMin.length >= 2 && adhsIqr(ersteMin) < 60;
  const saetze = [];
  if (dicht) {
    saetze.push('Die Einnahme liegt fast jeden Tag zur selben Zeit – Stunden nach der Einnahme heißen '
      + 'hier fast dasselbe wie Uhrzeit.');
  }
  saetze.push('Eine Beschreibung, kein Vergleich: Manche Kopfschmerzarten sind auch ohne Mittel an bestimmte '
    + 'Tageszeiten gebunden, etwa an den Schlaf oder das Aufwachen. Ein Kopfschmerz, der schon vor der '
    + 'Einnahme begann, ist nicht von dieser Einnahme ausgelöst; ob er mit dem Mittel insgesamt zu tun hat, '
    + 'zeigt diese Beschreibung nicht – das kann die Praxis einordnen.');
  return {
    n, sichtbar: n >= 10, faecher, vorher, spaeter, weg, nichtZuzuordnen, dicht, saetze,
  };
}

/* ---------- A5 ---------- */

/**
 * A5: der Essensrhythmus – nur beschrieben, mit benannten Nennern.
 *
 * Ob eine Mahlzeit ausgefallen ist oder nur nicht eingetragen wurde, weiß
 * niemand; deshalb steht jede Zahl mit dem, worüber gezählt wurde. Ohne
 * Einnahmen (`einnahmeTage` leer) dieselben Zeilen über alle Bauch-Tage, ohne
 * Bezug zu einem Mittel und ohne Vergleich.
 */
function a5Zeilen(p, isos, mitEinnahme) {
  const zeilen = {};
  const mahlzeitenAm = (iso) => adhsTagListe(p, iso).filter((e) => e.art === 'essen');
  if (mitEinnahme) {
    const std = [];
    isos.forEach((iso) => {
      const x = (p.einnahmenNachTag.get(iso) || [])[0];
      if (!x || x.zeitArt === 'ungefaehr') return;
      const tz = tageszeitVon(x.e);
      const m = mahlzeitenAm(iso);
      if (m.some((e) => e.ungefaehr && tageszeitVon(e) === tz)) return;
      const danach = m.map((e) => (zeitpunkt(e.am, e.um) - x.t) / STUNDE).filter((h) => h > 0 && h <= 12);
      if (danach.length) std.push(Math.min(...danach));
    });
    zeilen.ersteMahlzeit = { tage: std.length, median: std.length ? adhsQuantil(std, 0.5) : null };
  }
  const zweiPlus = isos.filter((iso) => mahlzeitenAm(iso).length >= 2);
  zeilen.ohneMittag = {
    k: zweiPlus.filter((iso) => !mahlzeitenAm(iso).some((e) => fachVon(e) === 'mittag')).length,
    n: zweiPlus.length,
  };
  const abends = isos.filter((iso) => adhsTagListe(p, iso).some((e) => zaehltFuerBauch(e) && minutenAmTag(e.um) >= 15 * 60));
  zeilen.spaet = {
    k: abends.filter((iso) => mahlzeitenAm(iso).some((e) => minutenAmTag(e.um) >= ADHS_SPAET_AB * 60)).length,
    n: abends.length,
  };
  const bauchTage = isos.filter((iso) => tagesWert(adhsTagListe(p, iso), iso, p.tage).notiert);
  zeilen.appetit = {
    k: bauchTage.filter((iso) => adhsTagListe(p, iso).some((e) => e.art === 'beschwerde'
      && (e.arten || []).includes('appetit'))).length,
    n: bauchTage.length,
  };
  return zeilen;
}

/**
 * Der Essensrhythmus für einen Zeitraum – mit Einnahmen ihre Tage, sonst alle
 * Tage mit Bauch-Angaben. Exportiert für den Bericht.
 *
 * Gezählt werden nur abgeschlossene Tage, also vor `heute` – wie in A2 bis
 * A4. Wer vormittags schon zwei Mahlzeiten eingetragen hat, hätte sonst einen
 * Tag „ohne Mittagessen“, und eine Mahlzeit ab 20 Uhr könnte heute noch gar
 * nicht dastehen, während der Tag im Nenner schon mitzählt.
 */
export function essensRhythmus({
  eintraege, tage, von = null, bis = null, heute = null, standardMittel = [], gewicht = [],
} = {}) {
  const p = adhsVorbereiten({ eintraege, tage, heute: bis, standardMittel });
  const imZeitraum = (iso) => (!von || iso >= von) && (!bis || iso <= bis) && (!heute || iso < heute);
  const einnahmeTage = [...p.einnahmenNachTag.keys()].filter(imZeitraum).sort();
  const mitEinnahme = einnahmeTage.length > 0;
  const isos = mitEinnahme ? einnahmeTage
    : [...new Set([...p.liste.map((e) => e.am), ...Object.keys(p.tage)])].filter(imZeitraum).sort();
  const zeilen = a5Zeilen(p, isos, mitEinnahme);
  let ohne = null;
  if (mitEinnahme) {
    // adhsPausen nimmt das Ende ausschließlich: der Tag nach `bis`, höchstens heute.
    const ende = [bis ? plusTage(bis, 1) : null, heute].filter(Boolean).sort()[0] || null;
    const pausen = adhsPausen(p, von, ende).ohne;
    const kleiner = pausen.length < einnahmeTage.length ? pausen : einnahmeTage;
    if (pausen.length && !wochenendeUngleich(einnahmeTage, pausen) && !blockUngleich(kleiner).ungleich) {
      ohne = a5Zeilen(p, pausen, false);
    }
  }
  return {
    mitEinnahme,
    tage: isos.length,
    zeilen,
    ohne,
    gewicht: Array.isArray(gewicht) && gewicht.length > 0,
    satz: 'Ob eine Mahlzeit ausgefallen ist oder nur nicht eingetragen wurde, weiß Body Check nicht.',
  };
}

/* ---------- Die ganze Familie ---------- */

/**
 * Alle Rechnungen der Familie „ADHS" auf einmal.
 *
 * Erst werden alle Seiten gefüllt, dann gezählt, wie viele Vergleiche genug
 * Fälle haben (R4), und erst dann geurteilt – mit mindestens strenge 2,5
 * (familienVergleiche in js/vergleich.js). A4 und A5 zählen nicht mit: Sie
 * vergleichen nichts.
 *
 * @param {object} d  { eintraege, tage, heute, jetzt, mindestFaelle, standardMittel, gewicht }
 */
export function adhsAuswertung({
  eintraege, tage, heute, jetzt = Date.now(), mindestFaelle = 5, standardMittel = [], gewicht = [],
} = {}) {
  const p = adhsVorbereiten({ eintraege, tage, heute, standardMittel });
  const abschnitt = adhsAbschnitt(p.einnahmen, heute);
  const leer = {
    einnahmen: p.einnahmen.length, abschnitt: null, a1: null, a2: null, a3: null, a4: null, a5: null,
    vergleiche: 0, fragen: [],
  };
  if (!p.einnahmen.length || !abschnitt) return leer;
  const bisHeute = heute || p.einnahmen[p.einnahmen.length - 1].e.am;

  /* --- A1: Seiten je Schlüssel --- */
  const a1Mindest = Math.max(Number(mindestFaelle) || 0, ADHS_MINDEST.a1);
  const a1 = [];
  a1Faelle(p, { jetzt }).forEach((z, schluessel) => {
    const roh = vergleichRoh({
      mit: z.mit,
      ohne: z.ohne,
      mindest: a1Mindest,
      name: 'Essen zur Einnahme',
      seiten: { mit: 'Die Einnahmen mit Essen', ohne: 'Die Einnahmen ohne Essen' },
    });
    a1.push({ schluessel, z, roh });
  });

  /* --- A2, A3 im aktuellen Abschnitt --- */
  const pausen = adhsPausen(p, abschnitt.von, bisHeute);
  const stimDa = abschnitt.tage.some((iso) => (p.einnahmenNachTag.get(iso) || [])
    .some((x) => STIMULANZIEN.includes(x.gruppe)));
  const a2 = stimDa ? a2Zeilen(p, abschnitt, pausen, bisHeute) : null;
  const a3 = stimDa ? a3Faelle(p, abschnitt, bisHeute) : null;

  /* --- R4: wie viele Vergleiche hat die Familie? --- */
  const genug = [
    ...a1.map((x) => x.roh.genug),
    ...(a2 ? Object.values(a2.roh).map((r) => r.genug) : []),
    ...(a3 && !a3.dicht ? [a3.roh.genug] : []),
  ].filter(Boolean).length;
  const vergleiche = familienVergleiche(genug);

  /* --- Urteile --- */
  // Der letzte Einnahmetag je Schlüssel: A1 rechnet über das ganze Tagebuch,
  // und nach einem Wechsel stammen die Zahlen womöglich vom früheren Mittel.
  const letzteNach = new Map();
  p.einnahmen.forEach((x) => {
    if (!letzteNach.has(x.schluessel) || x.e.am > letzteNach.get(x.schluessel)) letzteNach.set(x.schluessel, x.e.am);
  });
  const a1Raus = a1.map(({ schluessel, z, roh }) => {
    const v = vergleichUrteilen(roh, { skala: 'bauch', vergleiche, richtung: 'ohne' });
    const st = (l) => {
      const w = l.map((f) => f.stress).filter((x) => x !== null);
      return w.length ? adhsSchnitt(w) : null;
    };
    const anspannung = { ohne: st(z.ohne), mit: st(z.mit) };
    const name = p.name(schluessel);
    return {
      schluessel,
      name,
      anzeige: a1Anzeige(schluessel, name),
      text: schluesselText(schluessel),
      letzte: letzteNach.get(schluessel) || null,
      imAbschnitt: abschnitt.schluessel.includes(schluessel),
      faelle: v.mit.n + v.ohne.n,
      vergleich: v,
      zaehl: {
        vor: z.vor, ohneAngabe: z.ohneAngabe, widerspruch: z.widerspruch, unklar: z.unklar, spaet: z.spaet,
        nichtZuzuordnen: z.nichtZuzuordnen, davor: z.davor, offen: z.offen, nichtNotiert: z.nichtNotiert,
      },
      anspannung,
      nuechtern: z.nuechtern,
      fensterBeschwerden: z.fensterBeschwerden,
      saetze: a1Saetze(v, z, anspannung),
    };
  }).sort((a, b) => (b.faelle - a.faelle) || (a.schluessel < b.schluessel ? -1 : 1));

  let a2Raus = null;
  if (a2) {
    const zeilen = Object.fromEntries(Object.entries(a2.roh).map(([id, roh]) => {
      const v = vergleichUrteilen(roh, { ...A2_SKALA[id], vergleiche, richtung: 'mit' });
      return [id, { ...v, satz: a2Satz(id, v) }];
    }));
    const stuhl = vergleichUrteilen(a2.stuhlRoh, { skala: 'anteil', vergleiche, richtung: 'mit' });
    const saetze = [];
    const ohneZahl = pausen.ohne.length;
    // „zu wenige“ entscheiden Karte und Bericht nach den Zeilen, die sie
    // zeigen (a2ZuWenig) – hier stehen nur die Zahlen dafür.
    if (ohneZahl || pausen.beschwerden.length) {
      saetze.push('Tage ohne Mittel sind keine Zufallsauswahl. Wer an einem schlechten Tag das Mittel '
        + 'weglässt, macht die Tage ohne schlechter, ohne dass das Mittel etwas getan hat – deshalb '
        + `zählen Tage „wegen Beschwerden“ nicht mit (${pausen.beschwerden.length === 1 ? 'ein solcher Tag'
          : `${pausen.beschwerden.length} solche Tage`}).`);
    }
    a2Raus = {
      mitTage: a2.mitTage,
      ohneTage: ohneZahl,
      // Alle angegebenen Tage ohne Mittel, auch „wegen Beschwerden“ – die Zahl
      // vor der Aufschlüsselung nach Gründen, die sie zusammen ergeben.
      alleTage: ohneZahl + pausen.beschwerden.length,
      gruende: pausen.gruende,
      zeilen,
      // Je Zeile, wie viele Tage ohne Mittel gewertet sind und ob das unter
      // ihrer Mindestzahl liegt – für a2ZuWenig().
      ohneGewertet: Object.fromEntries(Object.entries(zeilen).map(([id, v]) => [id, v.ohne.n])),
      zuWenigOhne: Object.fromEntries(Object.entries(zeilen).map(([id, v]) => [id, v.ohne.n < v.mindest])),
      // Harter oder knolliger Stuhl (Typ 1 oder 2) nur beschrieben – ohne
      // Urteil, auch wenn es eines gäbe.
      stuhl: {
        genug: stuhl.genug, mit: stuhl.mit, ohne: stuhl.ohne, stoerung: stuhl.stoerung,
      },
      kopfZaehl: a2.zaehl,
      bezugUhr: a2.median === null ? null : adhsUhr(a2.median),
      saetze,
    };
  }

  let a3Raus = null;
  if (a3) {
    const v = vergleichUrteilen(a3.roh, { skala: 'skala', schwelle: 0.5, vergleiche, richtung: 'mit' });
    a3Raus = {
      ...v,
      art: a3.dicht ? 'dicht' : v.art,
      dicht: a3.dicht,
      iqr: a3.iqr,
      uhr: a3.median === null ? null : adhsUhr(a3.median),
      gaben: a3.gaben,
      faelle: a3.faelle,
      nichtZuzuordnen: a3.nichtZuzuordnen,
      vorNacht: a3.vorNacht,
      stress: a3.stress,
      saetze: a3Saetze(a3, v),
    };
  }

  const a4 = a4Zaehlung(p, abschnitt, bisHeute);
  const a5 = essensRhythmus({
    eintraege: p.liste, tage: p.tage, von: abschnitt.von, bis: bisHeute, heute: bisHeute, standardMittel, gewicht,
  });

  /* --- Fragen für die Sprechstunde (Muster und Bericht) --- */
  const fragen = [];
  const haupt = a1Raus[0];
  if (haupt && ['auffaellig', 'moeglich'].includes(haupt.vergleich.art)) {
    // Mit dem Namen: A1 rechnet je Mittel über das ganze Tagebuch, und die
    // Frage soll auch nach einem Wechsel beim richtigen Mittel landen.
    fragen.push({
      id: 'a1',
      text: `Nach Einnahmen von ${haupt.anzeige} ohne Essen ging es meinem Bauch in den Stunden danach `
        + 'schlechter. Was heißt das für die Einnahme?',
    });
  }
  if (a2Raus && a2Raus.zeilen.kopf.art === 'auffaellig') {
    fragen.push({
      id: 'a2-kopf',
      text: 'An Tagen mit dem ADHS-Mittel hatte ich öfter Kopfschmerzen. Kann das zusammenhängen?',
    });
  }
  if (a3Raus && a3Raus.art === 'auffaellig') {
    fragen.push({ id: 'a3', text: 'Nach späterer Einnahme habe ich schlechter geschlafen. Kann das zusammenhängen?' });
  }
  // Pressen oder Knirschen an Einnahmetagen eines Stimulans – angezeigt nur
  // mit „Kiefer, Nacken, Schiene".
  if (stimDa) {
    const stimTage = abschnitt.tage.filter((iso) => (p.einnahmenNachTag.get(iso) || [])
      .some((x) => STIMULANZIEN.includes(x.gruppe)));
    const gepresst = stimTage.filter((iso) => Number((p.tage[iso] || {}).gepresst) === 1).length;
    const kiefer = stimTage.filter((iso) => Number((p.tage[plusTage(iso, 1)] || {}).kiefer) >= 2).length;
    if (gepresst >= 3 || kiefer >= 5) {
      fragen.push({
        id: 'pressen',
        nurMitSpannung: true,
        text: 'Mir fällt Pressen oder Knirschen auf. Kann das mit meinem ADHS-Mittel zusammenhängen?',
      });
    }
  }

  return {
    einnahmen: p.einnahmen.length,
    abschnitt: {
      von: abschnitt.von,
      datum: fmtDatum(abschnitt.von),
      schluessel: abschnitt.schluessel,
      namen: abschnitt.schluessel.map((k) => p.name(k)),
      tage: abschnitt.tage.length,
    },
    a1: a1Raus.length ? { haupt: a1Raus[0], auch: a1Raus.slice(1), alle: a1Raus } : null,
    a2: a2Raus,
    a3: a3Raus,
    a4,
    a5,
    vergleiche: genug,
    familie: vergleiche,
    fragen,
  };
}

/* ---------- Vorbehalte an Rechnungen, die es schon gab (Ebene 0) ---------- */

const ADHS_NAH_CACHE = new WeakMap();

/** Die Zeitpunkte aller Einnahmen mit fester Zeit, sortiert. */
function festeEinnahmen(eintraege) {
  const liste = Array.isArray(eintraege) ? eintraege : [];
  if (!ADHS_NAH_CACHE.has(liste)) {
    ADHS_NAH_CACHE.set(liste, adhsEinnahmen(liste).filter((x) => x.zeitArt !== 'ungefaehr').map((x) => x.t));
  }
  return ADHS_NAH_CACHE.get(liste);
}

/** Liegt `t` in [Einnahme − vor, Einnahme + nach] für eine der Einnahmen? */
function naheEinnahme(zeiten, t, vorMin, nachMin) {
  // Binäre Suche nach der ersten Einnahme ab t − nach.
  let lo = 0;
  let hi = zeiten.length;
  const ab = t - nachMin * MINUTE;
  while (lo < hi) {
    const mitte = (lo + hi) >> 1;
    if (zeiten[mitte] < ab) lo = mitte + 1;
    else hi = mitte;
  }
  return lo < zeiten.length && zeiten[lo] <= t + vorMin * MINUTE;
}

/**
 * Wie viele Mahlzeiten mit einem Auslöser lagen nahe an einer ADHS-Einnahme –
 * von einer halben Stunde davor bis vier Stunden danach –, verglichen mit
 * den übrigen Mahlzeiten?
 *
 * Der Unterschied ist die Auskunft, nicht der Anteil: Wer sein Mittel zum
 * Frühstück nimmt, hat fast jedes Frühstück nahe am Mittel – mit und ohne
 * Kaffee. Erst wenn der Auslöser deutlich öfter dort liegt als der Rest,
 * misst die Auslöserbilanz womöglich das Mittel mit.
 *
 * @returns {{ n, m, k, l, differenz, zeigen }}
 */
export function ausloeserNahAmMittel(bewertet, eintraege, id) {
  const zeiten = festeEinnahmen(eintraege);
  let n = 0;
  let m = 0;
  let k = 0;
  let l = 0;
  (bewertet || []).forEach((b) => {
    const nah = zeiten.length > 0 && naheEinnahme(zeiten, zeitpunkt(b.m.am, b.m.um), 30, ADHS_FENSTER_STD * 60);
    if (b.merkmale.has(id)) {
      m += 1;
      if (nah) n += 1;
    } else {
      l += 1;
      if (nah) k += 1;
    }
  });
  const differenz = (m ? n / m : 0) - (l ? k / l : 0);
  return { n, m, k, l, differenz, zeigen: n >= 3 && differenz >= 0.25 };
}

/** Der Satz dazu – nur, wenn der Vorbehalt greift. */
export function ausloeserNahSatz(r, name) {
  if (!r || !r.zeigen) return '';
  return `${r.n} von ${r.m} Mahlzeiten mit ${name} lagen in den 4 Stunden nach einem ADHS-Mittel, `
    + `von den übrigen ${r.k} von ${r.l} – ob es am Essen oder am Mittel liegt, trennt diese Rechnung nicht.`;
}

/**
 * Nennt das Zeitprofil einen Schwerpunkt – liegen dessen Beschwerden zugleich
 * in den vier Stunden nach einem ADHS-Mittel?
 *
 * Zugeordnet wird wie in js/zeitprofil.js (zeitBild): jede Beschwerde der
 * letzten Mahlzeit davor, höchstens acht Stunden, ohne ungefähre Zeiten.
 * `fensterListe` ist FENSTER aus js/zeitprofil.js (das hier im Bündel weiter
 * hinten steht und deshalb hereingereicht wird).
 *
 * @returns {{ n, m, zeigen, satz } | null}
 */
export function zeitprofilNahAmMittel(eintraege, zeit, fensterListe) {
  if (!zeit || !zeit.schwerpunkt) return null;
  const f = (fensterListe || []).find((x) => x.id === zeit.schwerpunkt);
  if (!f) return null;
  const liste = Array.isArray(eintraege) ? eintraege : [];
  const essen = liste.filter((e) => e.art === 'essen')
    .map((e) => ({ e, t: zeitpunkt(e.am, e.um) }))
    .sort((a, b) => a.t - b.t);
  const zeiten = festeEinnahmen(liste);
  let n = 0;
  let m = 0;
  liste.filter((e) => e.art === 'beschwerde').forEach((b) => {
    const t = zeitpunkt(b.am, b.um);
    let letzte = null;
    for (let i = essen.length - 1; i >= 0; i--) {
      if (essen[i].t < t) { letzte = essen[i]; break; }
    }
    if (!letzte) return;
    const std = (t - letzte.t) / STUNDE;
    if (std > 8) return;
    if (b.ungefaehr || letzte.e.ungefaehr || essen.some((x) => x.e.am === b.am && reihenfolgeUnklar(x.e, b))) return;
    if (!(std > f.von && std <= f.bis)) return;
    m += 1;
    // In (Einnahme, Einnahme + 4 h]: wie im Zählfenster von A1.
    if (zeiten.length && naheEinnahme(zeiten, t - 1, 0, ADHS_FENSTER_STD * 60)) n += 1;
  });
  const zeigen = n >= 6 && n * 2 >= m;
  return {
    n,
    m,
    zeigen,
    satz: zeigen ? `${n} dieser ${m} Beschwerden lagen zugleich in den 4 Stunden nach einem ADHS-Mittel – `
      + 'das Zeitfenster nach dem Essen und das nach dem Mittel fallen hier zusammen.' : '',
  };
}
