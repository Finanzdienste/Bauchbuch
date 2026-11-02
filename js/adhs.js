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
 * Daten da sind; ob etwas davon zu sehen ist, entscheidet js/app.js.
 */
import { tageszeitVon, zeitpunkt } from './datum.js';
import { STIMULANZIEN, adhsGruppe, istAdhsMittel } from './mittel.js';
import { formZu } from './zusammen.js';

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
      const form = gruppe === 'mph' ? (e.form || formVon(e.mittel)) : null;
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
