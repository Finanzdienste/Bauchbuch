/*
 * Datum und Uhrzeit – die unterste Schicht. Hängt von nichts ab.
 *
 * Ein Tagebuch rechnet dauernd mit Zeit, und zwar mit *örtlicher* Zeit: Wer um
 * halb elf abends isst und um eins nachts Beschwerden bekommt, hat einen
 * Zusammenhang erlebt, den keine Tagesgrenze zerschneiden darf. Deshalb steht
 * hier neben dem Datum auch der Zeitpunkt – Datum plus Uhrzeit, zusammen
 * gerechnet.
 *
 * Alles in Ortszeit, nichts in UTC. Die Alternative wäre ein Eintrag, der nach
 * einer Reise oder der Zeitumstellung auf einem anderen Tag steht als dem, an
 * dem er gemacht wurde.
 */

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
  'August', 'September', 'Oktober', 'November', 'Dezember'];

/** Kürzel der Wochentage, montags zuerst – so steht ein Kalender hierzulande. */
export const WOCHE_KOPF = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const pad2 = (n) => String(n).padStart(2, '0');

export function zuISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function heuteISO() {
  return zuISO(new Date());
}

/** Aktuelle Uhrzeit als "HH:MM". */
export function jetztUhr() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Ist das ein Tag, den es gibt, als 'YYYY-MM-DD'?
 *
 * Ein geleertes Datumsfeld liefert '', und ein Eintrag mit diesem Datum steht
 * an keinem Tag: In der Liste fehlt er, und der Tageskopf, der danach auf ihn
 * springt, zeigt „undefined, NaN". Auch einen 31. Februar gibt es nicht –
 * Date rechnete ihn still in den März um.
 */
export function istISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === 'string' ? iso : '');
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1
    && d.getDate() === Number(m[3]);
}

/** Ist das eine Uhrzeit von 0:00 bis 23:59 – so, wie minutenAmTag() sie liest? */
export function istUhr(uhr) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof uhr === 'string' ? uhr : '');
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function ausISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function plusTage(iso, tage) {
  if (!tage) return iso;
  const d = ausISO(iso);
  d.setDate(d.getDate() + tage);
  return zuISO(d);
}

/** Ganze Tage von isoA bis isoB; positiv, wenn isoB später liegt. */
export function tageDazwischen(isoA, isoB) {
  return Math.round((ausISO(isoB) - ausISO(isoA)) / 86400000);
}

/**
 * Ein Zeitpunkt aus Datum und Uhrzeit, als Millisekunden.
 *
 * Fehlt die Uhrzeit oder ist sie unbrauchbar, gilt Mittag statt Mitternacht:
 * Ein Eintrag ohne Uhrzeit soll innerhalb seines Tages liegen und nicht am
 * Rand, wo er beim Rechnen mit Zeitfenstern in den Vortag rutscht.
 */
export function zeitpunkt(iso, uhr) {
  const d = ausISO(iso);
  const m = /^(\d{1,2}):(\d{2})$/.exec(uhr || '');
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  else d.setHours(12, 0, 0, 0);
  return d.getTime();
}

/** Stunden von a nach b; positiv, wenn b später liegt. */
export function stundenDazwischen(a, b) {
  return (b - a) / 3600000;
}

/** Minuten seit Mitternacht – zum Sortieren innerhalb eines Tages. */
export function minutenAmTag(uhr) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(uhr || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : 12 * 60;
}

export function fmtDatum(iso, lang) {
  const d = ausISO(iso);
  const wd = WOCHENTAGE[d.getDay()];
  if (lang) return `${wd}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
  return `${wd}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
}

export function fmtMonat(iso) {
  const d = ausISO(iso);
  return `${MONATE[d.getMonth()]} ${d.getFullYear()}`;
}

/** "heute", "gestern" oder das Datum – für Überschriften. */
export function fmtTag(iso) {
  const abstand = tageDazwischen(iso, heuteISO());
  if (abstand === 0) return 'heute';
  if (abstand === 1) return 'gestern';
  if (abstand === -1) return 'morgen';
  return fmtDatum(iso, true);
}

/** Erster Tag des Monats, in dem `iso` liegt. */
export function monatsStart(iso) {
  return `${iso.slice(0, 7)}-01`;
}

/** `n` Monate weiter, immer auf den Ersten. Über Jahresgrenzen hinweg. */
export function plusMonate(iso, n) {
  const d = ausISO(monatsStart(iso));
  d.setMonth(d.getMonth() + n);
  return zuISO(d);
}

/**
 * Alle Tage, die ein Monatsraster zeigt: ganze Wochen von Montag bis Sonntag,
 * vorn und hinten mit den Nachbarmonaten aufgefüllt.
 */
export function monatsRaster(iso) {
  const erster = ausISO(monatsStart(iso));
  const vorlauf = (erster.getDay() + 6) % 7;          // Mo = 0
  // Monatslänge über den Abstand zum nächsten Ersten. Math.round, weil eine
  // Zeitumstellung im Monat sonst eine Stunde fehlen ließe.
  const laenge = Math.round((ausISO(plusMonate(iso, 1)) - erster) / 86400000);
  const felder = Math.ceil((vorlauf + laenge) / 7) * 7;
  const raus = [];
  for (let i = 0; i < felder; i++) {
    const d = new Date(erster);
    d.setDate(d.getDate() - vorlauf + i);
    raus.push(zuISO(d));
  }
  return raus;
}

/**
 * Grobe Tageszeit einer Uhrzeit. Für die Frage, wann die Beschwerden kommen –
 * nachts ist eine andere Auskunft als nach dem Mittagessen.
 */
export function tageszeit(uhr) {
  const m = minutenAmTag(uhr);
  if (m < 5 * 60) return 'nacht';
  if (m < 11 * 60) return 'morgen';
  if (m < 15 * 60) return 'mittag';
  if (m < 19 * 60) return 'nachmittag';
  return 'abend';
}

export const TAGESZEIT_NAME = {
  nacht: 'nachts',
  morgen: 'morgens',
  mittag: 'mittags',
  nachmittag: 'nachmittags',
  abend: 'abends',
};

/*
 * Die drei Tageszeiten der Zeitknöpfe im Bogen – „morgens, mittags, abends".
 *
 * Sie stehen hier und nicht bei den Knöpfen, weil zwei Stellen dieselbe
 * Einteilung brauchen und sie sich nicht widersprechen dürfen: der Bogen, der
 * aus „abends" eine Uhrzeit macht, und die Auswertung, die Beschwerden nach
 * Tageszeit zählt. Stand „abends" auf 18:30 und zählte die Auswertung erst ab
 * 19 Uhr als Abend, landete jede Beschwerde, die jemand ausdrücklich „abends"
 * nannte, unter „nachmittags".
 *
 *   fach   Das Fach der Auswertung (tageszeit() oben), in das ein Eintrag mit
 *          dieser gewählten Tageszeit gehört – unabhängig von der Minute, die
 *          der Knopf dafür eingetragen hat.
 *   um     Die Uhrzeit, die der Knopf einträgt. Sie liegt mitten im Fach, so
 *          dass auch eine halbe Stunde davor oder danach noch darin liegt.
 *   von,   Das Fenster, in dem eine Mahlzeit als Mahlzeit dieser Tageszeit
 *   bis    gilt, in Minuten seit Mitternacht. Die Grenzen sind die von
 *          tageszeit(). Weil es keinen Knopf „nachmittags" gibt, gehört der
 *          Nachmittag zum Abend: Das Abendbrot um sechs muss „abends, nach dem
 *          Essen" finden, sonst stünde dort „noch keine Mahlzeit", während es
 *          zwei Zeilen darüber in der Liste steht.
 */
export const KNOPF_TAGESZEIT = {
  morgens: { fach: 'morgen', um: '08:00', von: 5 * 60, bis: 11 * 60 },
  mittags: { fach: 'mittag', um: '12:30', von: 11 * 60, bis: 15 * 60 },
  abends: { fach: 'abend', um: '19:30', von: 15 * 60, bis: 24 * 60 },
};

/** Zu welcher Knopf-Tageszeit eine Uhrzeit gehört – oder null (nachts). */
export function knopfTageszeit(uhr) {
  const m = minutenAmTag(uhr);
  const treffer = Object.entries(KNOPF_TAGESZEIT).find(([, t]) => m >= t.von && m < t.bis);
  return treffer ? treffer[0] : null;
}

/**
 * Die Knopf-Tageszeit eines Eintrags: die gewählte, wenn er mit einem
 * Zeitknopf eingetragen ist, sonst die seiner Uhrzeit.
 */
export function tageszeitVon(e) {
  if (e && e.ungefaehr && KNOPF_TAGESZEIT[e.tageszeit]) return e.tageszeit;
  return knopfTageszeit(e && e.um);
}

/**
 * Das Fach der Auswertung für einen Eintrag. Wer „abends" gewählt hat, meint
 * abends – auch wenn der Knopf die Zeit an einer Mahlzeit um sechs
 * eingerastet hat.
 */
export function fachVon(e) {
  if (e && e.ungefaehr && KNOPF_TAGESZEIT[e.tageszeit]) return KNOPF_TAGESZEIT[e.tageszeit].fach;
  return tageszeit(e && e.um);
}
