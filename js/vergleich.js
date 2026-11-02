/*
 * Gemeinsame Bausteine für die Vergleiche von Tagen und Fällen, die mit der
 * Fassung 28 dazukommen: ADHS-Mittel (js/adhs.js) und Kiefer, Nacken,
 * Schiene (js/spannung.js).
 *
 * Diese Vergleiche sind gefährlicher als die Auslöserbilanz, und zwar aus
 * einem Grund, der in keiner Zahl steht: Die Seiten sind nicht zufällig
 * verteilt. Ein Mittel lässt man eher am Wochenende weg, im Urlaub, an einem
 * Tag, an dem es einem ohnehin schlecht geht; eine Schiene vergisst man eher
 * nach einer Feier; und wer eine Pause macht, trägt an diesem Tag oft auch
 * weniger ein. Jede dieser Ungleichheiten macht aus einem Tagebuch, in dem
 * nichts steckt, einen „Fund". Die Regeln hier stellen sie fest, bevor ein
 * Urteil fällt – und wenn eine greift, fällt keines, nur die Zahlen bleiben:
 *
 *   R1   Nur notierte Tage. Eine Lücke ist nie „ohne" und nie „gut".
 *   R6   Liegen die Tage der beiden Seiten verschieden in der Woche?
 *   R6b  Liegen die Tage der kleineren Seite in wenigen Blöcken?
 *   R6c  Ist auf einer Seite deutlich weniger eingetragen?
 *   R5   Fällt kein Urteil, steht da, ab welchem Unterschied eines gefallen
 *        wäre – sonst liest sich „kein Unterschied" wie „keine Wirkung".
 *   R10  Ob ein Tag zählt, wird ohne die Zielgröße bestimmt
 *        (tagNotiertOhne): Ein Tag, an dem nur die Beschwerde steht, ist nur
 *        durch das Ergebnis notiert – und würde nur dann gezählt, wenn es
 *        schlecht ging.
 *
 * Rein: alles kommt als Argument herein, nichts wird gespeichert.
 */
import { ausISO, tageDazwischen } from './datum.js';
import { fmtZahl } from './text.js';
import { eintragZaehlt, tagZaehlt } from './wasser.js';
import { zufallsSpielraum } from './zufall.js';
import { einstufung } from './auswertung.js';

/*
 * Die Zielgrößen als Prädikat über einen Eintrag – das, was ein Vergleich
 * messen will und was deshalb nicht darüber entscheiden darf, ob ein Tag
 * zählt (R10).
 *
 * Für den Bauch auch der Kopfschmerz und das Mittel, das an ihm hängt: Sie
 * machen einen Tag schon heute nicht zu einem notierten Bauchtag (siehe
 * zaehltFuerBauch in js/wasser.js), und hier soll dasselbe gelten.
 */
export const ZIEL_BAUCH = (e) => !!e && (e.art === 'beschwerde' || e.art === 'kopf'
  || (e.art === 'medikament' && !!e.zuKopf));
export const ZIEL_KOPF = (e) => !!e && (e.art === 'kopf' || (e.art === 'medikament' && !!e.zuKopf));

/*
 * Die Einträge nach Tag – einmal je Liste und dann gemerkt. Die Vergleiche
 * fragen Tag für Tag, und ein Jahr Tagebuch hat ein paar tausend Einträge.
 */
const VGL_NACH_TAG = new WeakMap();
export function eintraegeNachTag(eintraege) {
  const liste = Array.isArray(eintraege) ? eintraege : [];
  if (VGL_NACH_TAG.has(liste)) return VGL_NACH_TAG.get(liste);
  const karte = new Map();
  liste.forEach((e) => {
    if (!e || typeof e.am !== 'string') return;
    if (!karte.has(e.am)) karte.set(e.am, []);
    karte.get(e.am).push(e);
  });
  VGL_NACH_TAG.set(liste, karte);
  return karte;
}

/**
 * Ist an diesem Tag etwas eingetragen, das nicht die Zielgröße ist?
 *
 * Wie die Frage „notiert?" in js/auswertung.js (tagesWert) und js/kopf.js
 * (kopfTagesWert), nur ohne das, was der Vergleich messen soll. Ein
 * Eintrag, für den `istZiel` wahr ist, macht den Tag nicht zu einem
 * notierten; eine Tagesfrage oder eine Notiz im Tagesspeicher schon.
 */
export function tagNotiertOhne(eintraege, tage, iso, istZiel = () => false) {
  const amTag = eintraegeNachTag(eintraege).get(iso) || [];
  return amTag.some((e) => eintragZaehlt(e) && !istZiel(e)) || tagZaehlt((tage || {})[iso]);
}

/* ---------- R6: Wochentag ---------- */

/** Mehr als so viel Unterschied im Wochenendanteil, und es gibt kein Urteil. */
export const WOCHENENDE_ABSTAND = 0.3;

const vglWochenende = (iso) => {
  const t = ausISO(iso).getDay();
  return t === 0 || t === 6;
};

/** Der Anteil der Tage an Samstag oder Sonntag. */
export function wochenendAnteil(isos) {
  const liste = isos || [];
  return liste.length ? liste.filter(vglWochenende).length / liste.length : 0;
}

/**
 * R6: Liegen die Wochenendanteile beider Seiten mehr als 30 Prozentpunkte
 * auseinander? Wer sein Mittel am Wochenende weglässt, vergleicht sonst
 * Wochenenden mit Werktagen – mit anderem Essen, anderem Schlaf, anderem
 * Kopf – und schreibt den Unterschied dem Mittel zu.
 */
export function wochenendeUngleich(isosA, isosB) {
  if (!(isosA || []).length || !(isosB || []).length) return false;
  return Math.abs(wochenendAnteil(isosA) - wochenendAnteil(isosB)) > WOCHENENDE_ABSTAND;
}

/* ---------- R6b: Blöcke ---------- */

/**
 * Die Tage als zusammenhängende Blöcke. Eine Lücke von einem Tag trennt
 * nicht – wer im Urlaub einen Tag nichts einträgt, ist trotzdem im Urlaub.
 */
export function bloeckeVon(isos) {
  const sortiert = [...new Set(isos || [])].sort();
  const bloecke = [];
  sortiert.forEach((iso, i) => {
    if (i && tageDazwischen(sortiert[i - 1], iso) <= 2) bloecke[bloecke.length - 1].push(iso);
    else bloecke.push([iso]);
  });
  return bloecke;
}

/**
 * R6b: Liegt mehr als die Hälfte dieser Tage in einem einzigen Block, oder
 * verteilen sie sich auf weniger als vier? Dann vergleicht man eine Zeit mit
 * einer anderen – zwei Wochen Urlaub mit dem Rest des Jahres –, und was in
 * dieser Zeit sonst anders war, steckt im Unterschied.
 */
export function blockUngleich(isos) {
  const n = new Set(isos || []).size;
  if (!n) return { ungleich: false, bloecke: 0, groesster: 0 };
  const b = bloeckeVon(isos);
  const groesster = Math.max(...b.map((x) => x.length));
  return { ungleich: groesster * 2 > n || b.length < 4, bloecke: b.length, groesster };
}

/* ---------- R6c: Eintragsdichte ---------- */

/*
 * Felder des Tagesspeichers, die bei der Dichte nicht mitzählen: das Wasser
 * (keine Frage, sondern eine Zählung) und der Tag ohne Mittel (er bestimmt
 * eine Seite und stünde nur auf ihr).
 */
const VGL_NICHT_DICHTE = ['wasser', 'adhsPause'];

const vglLeer = (v) => v === null || v === undefined || v === ''
  || (typeof v === 'string' && !v.trim());

/**
 * Wie viel an einem Tag eingetragen ist: zählende Einträge, die nicht
 * Zielgröße sind, plus beantwortete Tagesfragen.
 */
export function dichteAm(eintraege, tage, iso, istZiel = () => false, ohneFelder = []) {
  const amTag = eintraegeNachTag(eintraege).get(iso) || [];
  const tag = (tage || {})[iso];
  const fragen = tag && typeof tag === 'object'
    ? Object.entries(tag).filter(([k, v]) => !VGL_NICHT_DICHTE.includes(k) && !ohneFelder.includes(k)
      && !vglLeer(v)).length
    : 0;
  return amTag.filter((e) => eintragZaehlt(e) && !istZiel(e)).length + fragen;
}

/** Ist die kleinere Dichte unter zwei Dritteln der größeren, ist sie ungleich. */
export const DICHTE_ANTEIL = 2 / 3;

/**
 * R6c: Ist auf einer Seite im Mittel deutlich weniger eingetragen?
 *
 * Wer an Tagen ohne Mittel nur das Nötigste einträgt, hat dort auch weniger
 * Beschwerden stehen – und das Mittel sähe schlechter aus, als es war.
 */
export function dichteUngleich(eintraege, tage, isosA, isosB, istZiel = () => false, ohneFelder = []) {
  const mittel = (liste) => (liste.length
    ? liste.reduce((s, iso) => s + dichteAm(eintraege, tage, iso, istZiel, ohneFelder), 0) / liste.length
    : 0);
  const a = mittel(isosA || []);
  const b = mittel(isosB || []);
  const gross = Math.max(a, b);
  return { ungleich: gross > 0 && Math.min(a, b) < gross * DICHTE_ANTEIL, a, b };
}

/* ---------- R4: Familien ---------- */

/**
 * Wie viele Vergleiche eine Familie für den Zufallsspielraum angibt: so viele,
 * wie es mit genug Fällen gibt – aber nie weniger als neun. Das ist die
 * Stufe 2,5 in strenge() (js/zufall.js) und gilt, weil zu jeder Familie mehr
 * Fragen gehören, als gerade gerechnet werden können: Wer heute eine Zeile
 * hat und morgen sechs, soll heute nicht milder geprüft werden.
 */
export function familienVergleiche(n) {
  return Math.max(Number(n) || 0, 9);
}

/* ---------- Urteile ---------- */

const vglSchnitt = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);

function vglUrteil(a, b, schwelle, vergleiche) {
  const differenz = vglSchnitt(a) - vglSchnitt(b);
  const { spielraum } = zufallsSpielraum(a, b, vergleiche);
  if (!Number.isFinite(spielraum)) return { differenz, spielraum, grenze: Infinity, art: 'zuwenig' };
  const grenze = Math.max(schwelle, spielraum);
  let art = 'neutral';
  if (differenz >= grenze) art = 'auffaellig';
  else if (differenz <= -grenze) art = 'unauffaellig';
  return { differenz, spielraum, grenze, art };
}

/**
 * Ein Anteil (Kopfschmerz ja oder nein, gepresst ja oder nein) als 0/1-Reihen
 * beider Seiten. `differenz` ist a minus b; „auffällig" heißt: auf der Seite
 * a deutlich mehr – ab `schwelle` und über dem Zufallsspielraum.
 */
export function urteilAnteil(a, b, schwelle = 0.2, vergleiche = 9) {
  return vglUrteil(a, b, schwelle, vergleiche);
}

/** Dasselbe für eine Skala von 0 bis 4 (Schlaf, Kiefer), Schwelle eine halbe Stufe. */
export function urteilSkala(a, b, schwelle = 0.5, vergleiche = 9) {
  return vglUrteil(a, b, schwelle, vergleiche);
}

/**
 * Der Bauch von 0 bis 10 – mit den Wörtern und Schwellen der Auslöser
 * (einstufung in js/auswertung.js): ab einer Stufe „möglich", ab zwei
 * „auffällig", und beides nur über dem Spielraum.
 */
export function urteilBauch(a, b, vergleiche = 9) {
  const differenz = vglSchnitt(a) - vglSchnitt(b);
  const { spielraum } = zufallsSpielraum(a, b, vergleiche);
  const genug = Number.isFinite(spielraum);
  const art = einstufung({ genug, differenz, spielraum });
  return { differenz, spielraum, grenze: genug ? Math.max(1, spielraum) : Infinity, art };
}

/* ---------- Die Sätze ---------- */

/** R6 */
export function wochentagSatz(name) {
  return `Die Tage ohne ${name} liegen meist anders in der Woche als die mit – ein `
    + 'Unterschied kann genauso vom Wochentag kommen.';
}

/** R6b */
export function bloeckeSatz(name, n) {
  const wo = n === 1 ? 'einem zusammenhängenden Zeitraum' : `${n} zusammenhängenden Zeiträumen`;
  return `Die Tage ohne ${name} liegen fast alle in ${wo} – was dort sonst anders war, `
    + 'misst der Vergleich mit.';
}

/** R6c */
export const DICHTE_SATZ = 'Auf einer Seite ist im Mittel deutlich weniger eingetragen – ein '
  + 'Unterschied kann auch daher kommen.';

/** R5 – `grenze` schon als Text mit Einheit („1,4 Stufen", „32 Prozentpunkten"). */
export function nachweisSatz(grenze) {
  return `Kein Unterschied über dem Zufall – unter ${grenze} wäre hier keiner zu sehen.`;
}

/** Eine Grenze als Text: Stufen bei Bauch und Skalen, Prozentpunkte bei Anteilen. */
export function grenzeText(grenze, art) {
  if (!Number.isFinite(grenze)) return '';
  if (art === 'anteil') return `${Math.round(grenze * 100)} Prozentpunkten`;
  const zahl = fmtZahl(grenze);
  return `${zahl} ${zahl === '1' ? 'Stufe' : 'Stufen'}`;
}

/* ---------- Ein Vergleich von Tagen ---------- */

/**
 * Die Seiten eines Vergleichs, bevor geurteilt wird.
 *
 * `mit` und `ohne` sind Listen von { iso, wert } – nur Tage oder Fälle, die
 * nach R1 überhaupt zählen. Festgestellt werden hier die Fallzahlen und die
 * Störungen (R6, R6b, und mit `dichte` R6c); geurteilt wird erst, wenn die
 * Familie weiß, wie viele Vergleiche sie hat (vergleichUrteilen).
 *
 * @param {object} o
 *   mit, ohne    [{ iso, wert }]
 *   mindest      Fälle je Seite
 *   name         was auf der „ohne"-Seite fehlt, für die Sätze („ADHS-Mittel")
 *   dichte       { eintraege, tage, istZiel, ohneFelder } – ohne: kein R6c
 */
export function vergleichRoh({ mit = [], ohne = [], mindest = 8, name = '', dichte = null } = {}) {
  const isosMit = mit.map((x) => x.iso);
  const isosOhne = ohne.map((x) => x.iso);
  const werteMit = mit.map((x) => x.wert);
  const werteOhne = ohne.map((x) => x.wert);
  const genug = mit.length >= mindest && ohne.length >= mindest;
  let stoerung = null;
  let bloecke = 0;
  if (genug) {
    // Die kleinere Seite ist die, deren Tage etwas Besonderes sein könnten –
    // bei gleich vielen beide.
    const kleiner = isosMit.length === isosOhne.length ? [isosMit, isosOhne]
      : [isosMit.length < isosOhne.length ? isosMit : isosOhne];
    const block = kleiner.map((l) => blockUngleich(l)).find((b) => b.ungleich);
    if (wochenendeUngleich(isosMit, isosOhne)) stoerung = 'wochentag';
    else if (block) {
      stoerung = 'bloecke';
      bloecke = block.bloecke;
    } else if (dichte && dichteUngleich(dichte.eintraege, dichte.tage, isosMit, isosOhne,
      dichte.istZiel, dichte.ohneFelder || []).ungleich) {
      stoerung = 'dichte';
    }
  }
  return {
    genug,
    mindest,
    name,
    mit: { n: mit.length, schnitt: vglSchnitt(werteMit), isos: isosMit, werte: werteMit },
    ohne: { n: ohne.length, schnitt: vglSchnitt(werteOhne), isos: isosOhne, werte: werteOhne },
    stoerung,
    bloecke,
  };
}

/**
 * Das Urteil zu einem Vergleich – mit der Zahl der Vergleiche der Familie.
 *
 * `richtung` 'mit' heißt: auffällig ist, wenn es auf der Seite „mit" mehr
 * ist (Kopfschmerz an Tagen mit dem Mittel); 'ohne' das Umgekehrte
 * (Bauch nach Einnahmen ohne Essen). `art` am Ende ist das Urteil, das
 * zählt – 'gestoert', wenn eine der Regeln R6 bis R6c greift.
 */
export function vergleichUrteilen(roh, { skala = 'bauch', schwelle, vergleiche = 9, richtung = 'mit' } = {}) {
  const [a, b] = richtung === 'ohne' ? [roh.ohne.werte, roh.mit.werte] : [roh.mit.werte, roh.ohne.werte];
  let urteil = null;
  if (roh.genug) {
    if (skala === 'bauch') urteil = urteilBauch(a, b, vergleiche);
    else if (skala === 'anteil') urteil = urteilAnteil(a, b, schwelle ?? 0.2, vergleiche);
    else urteil = urteilSkala(a, b, schwelle ?? 0.5, vergleiche);
  }
  let art = 'zuwenig';
  if (roh.genug) art = roh.stoerung ? 'gestoert' : urteil.art;
  const saetze = [];
  if (roh.stoerung === 'wochentag') saetze.push(wochentagSatz(roh.name));
  if (roh.stoerung === 'bloecke') saetze.push(bloeckeSatz(roh.name, roh.bloecke));
  if (roh.stoerung === 'dichte') saetze.push(DICHTE_SATZ);
  if (roh.genug && !roh.stoerung && art === 'neutral') {
    saetze.push(nachweisSatz(grenzeText(urteil.grenze, skala)));
  }
  const { werte: wm, ...mit } = roh.mit;
  const { werte: wo, ...ohne } = roh.ohne;
  return {
    genug: roh.genug,
    mindest: roh.mindest,
    mit,
    ohne,
    stoerung: roh.stoerung,
    urteil,
    art,
    skala,
    richtung,
    vergleiche,
    saetze,
  };
}

/** Hat dieser Vergleich ein Urteil, das als Fund gilt? */
export const hatUrteil = (v) => !!v && ['auffaellig', 'moeglich', 'unauffaellig'].includes(v.art);

/**
 * Ein ganzer Tagesvergleich in einem Zug: Werte holen (R1), Seiten prüfen
 * (R6, R6b, R6c), urteilen (R5) – für eine einzelne Zeile, deren Familie
 * die Zahl der Vergleiche schon kennt.
 *
 * `wert(iso)` gibt den Wert eines Tages oder null, wenn der Tag nicht zählt.
 */
export function tagesVergleich({
  mitTage = [], ohneTage = [], wert, mindest = 8, schwelle, vergleiche = 9, istZiel = () => false,
  name = '', skala = 'bauch', richtung = 'mit', eintraege = [], tage = {},
} = {}) {
  const seite = (liste) => liste.map((iso) => ({ iso, wert: wert(iso) }))
    .filter((x) => x.wert !== null && x.wert !== undefined && Number.isFinite(Number(x.wert)))
    .map((x) => ({ iso: x.iso, wert: Number(x.wert) }));
  const roh = vergleichRoh({
    mit: seite(mitTage), ohne: seite(ohneTage), mindest, name, dichte: { eintraege, tage, istZiel },
  });
  return vergleichUrteilen(roh, { skala, schwelle, vergleiche, richtung });
}
